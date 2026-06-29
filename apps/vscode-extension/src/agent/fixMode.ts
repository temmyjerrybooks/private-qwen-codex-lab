import * as vscode from "vscode";
import { getBorgerConfig } from "../config";
import { LiteLLMClient } from "../model/litellmClient";
import { assertAuthorized, authorizeAction } from "../permissions/authorization";
import { ProviderRouter } from "../providers/providerRouter";
import { getCommandHistoryEntry, getLatestFailedCommand } from "../terminal/commandHistory";
import { TerminalCommandResult } from "../terminal/commandTypes";
import { createPendingFileChangePreview } from "../tools/applyPatch";
import { collectDiagnostics, collectDiagnosticsForPath, DiagnosticsSummary, prioritizeDiagnostics } from "../tools/diagnostics";
import { createPendingChangeSet, PendingChangeSet } from "./pendingChanges";
import { parseEditProposalFromModel } from "./patchParser";
import { buildWorkspaceContext, selectedProviderToSummary } from "./contextBuilder";
import { buildExplainLastErrorPrompt, buildFixProposalPrompt, FixModeSource } from "./fixPrompts";
import { systemPrompt } from "./prompts";

export interface FixModeStatus {
  diagnostics: DiagnosticsSummary;
  latestFailedCommand?: TerminalCommandResult;
}

export interface FixModeResult {
  source: FixModeSource | "explain_last_error";
  title: string;
  summary: string;
  generatedAt: string;
  diagnostics: DiagnosticsSummary;
  failedCommand?: TerminalCommandResult;
  changeSet?: PendingChangeSet;
  explanation?: string;
}

export async function getFixModeStatus(): Promise<FixModeStatus> {
  return {
    diagnostics: collectDiagnostics(vscode.workspace.workspaceFolders?.[0]),
    latestFailedCommand: getLatestFailedCommand()
  };
}

export async function generateDiagnosticsFix(
  context: vscode.ExtensionContext,
  userTask?: string
): Promise<FixModeResult> {
  await assertReadWorkspaceAccess();
  const diagnostics = collectDiagnostics(vscode.workspace.workspaceFolders?.[0], 40);
  if (diagnostics.total === 0) {
    throw new Error("No VS Code diagnostics are available to fix.");
  }
  return generateFixProposal("diagnostics", context, diagnostics, undefined, userTask);
}

export async function generateLastFailedCommandFix(
  context: vscode.ExtensionContext,
  commandId?: string,
  userTask?: string
): Promise<FixModeResult> {
  await assertReadWorkspaceAccess();
  const failedCommand = commandId ? getCommandHistoryEntry(commandId) : getLatestFailedCommand();
  if (!failedCommand || failedCommand.status !== "failed") {
    throw new Error("No failed Borger terminal command is available to fix.");
  }
  const diagnostics = collectDiagnostics(vscode.workspace.workspaceFolders?.[0], 40);
  return generateFixProposal("last_failed_command", context, diagnostics, failedCommand, userTask);
}

export async function generateCurrentFileFix(
  context: vscode.ExtensionContext,
  userTask?: string
): Promise<FixModeResult> {
  await assertReadWorkspaceAccess();
  const workspaceFolder = requireWorkspaceFolder();
  const workspaceContext = await buildFixWorkspaceContext(context, userTask || "Fix current file");
  const currentFile = workspaceContext.currentFile;
  if (!currentFile) {
    throw new Error("Open a workspace file before running Fix Current File.");
  }
  if (currentFile.skippedReason) {
    throw new Error(`Current file cannot be used for Fix Mode: ${currentFile.skippedReason}.`);
  }

  const diagnostics = collectDiagnosticsForPath(workspaceFolder, currentFile.path, 30);
  return generateFixProposal("current_file", context, diagnostics, undefined, userTask, workspaceContext);
}

export async function explainLastError(context: vscode.ExtensionContext, userTask?: string): Promise<FixModeResult> {
  await assertReadWorkspaceAccess();
  const failedCommand = getLatestFailedCommand();
  const diagnostics = collectDiagnostics(vscode.workspace.workspaceFolders?.[0], 40);
  if (!failedCommand && diagnostics.total === 0) {
    throw new Error("No failed command or VS Code diagnostics are available to explain.");
  }

  const workspaceContext = await buildFixWorkspaceContext(context, userTask || "Explain last error");
  const router = new ProviderRouter(context);
  const selection = await router.selectProvider("explain_error");
  const client = new LiteLLMClient(
    {
      baseUrl: selection.provider.baseUrl,
      model: selection.provider.model,
      label: selection.provider.label
    },
    selection.apiKey
  );

  const startedAt = Date.now();
  try {
    const explanation = await client.chat([
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: buildExplainLastErrorPrompt({
          source: failedCommand ? "last_failed_command" : "diagnostics",
          userTask,
          workspaceContext,
          diagnostics: normalizeDiagnosticsForFix(diagnostics),
          failedCommand
        })
      }
    ]);
    await router.recordRequest(selection, "explain_error", Date.now() - startedAt, true);
    return {
      source: "explain_last_error",
      title: "Explain Last Error",
      summary: "Explanation generated from the latest failed command or diagnostics.",
      generatedAt: new Date().toISOString(),
      diagnostics,
      failedCommand,
      explanation
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await router.recordRequest(selection, "explain_error", Date.now() - startedAt, false, message);
    throw error;
  }
}

async function generateFixProposal(
  source: FixModeSource,
  context: vscode.ExtensionContext,
  diagnostics: DiagnosticsSummary,
  failedCommand?: TerminalCommandResult,
  userTask?: string,
  existingWorkspaceContext?: Awaited<ReturnType<typeof buildWorkspaceContext>>
): Promise<FixModeResult> {
  const workspaceFolder = requireWorkspaceFolder();
  const workspaceContext =
    existingWorkspaceContext ?? (await buildFixWorkspaceContext(context, userTask || buildDefaultTask(source)));
  const router = new ProviderRouter(context);
  const selection = await router.selectProvider("fix_mode");
  const selectedProvider = selectedProviderToSummary(selection);
  const client = new LiteLLMClient(
    {
      baseUrl: selection.provider.baseUrl,
      model: selection.provider.model,
      label: selection.provider.label
    },
    selection.apiKey
  );

  const startedAt = Date.now();
  try {
    const rawResponse = await client.chat([
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: buildFixProposalPrompt({
          source,
          userTask,
          workspaceContext: {
            ...workspaceContext,
            activeProvider: selectedProvider
          },
          diagnostics: normalizeDiagnosticsForFix(diagnostics),
          failedCommand
        })
      }
    ]);
    const parsed = parseEditProposalFromModel(rawResponse);
    const config = getBorgerConfig();
    const changes = await Promise.all(
      parsed.changes.map((change) => createPendingFileChangePreview(workspaceFolder, change, config.maxFileSizeKb))
    );

    const changeSet = createPendingChangeSet({
      source: "fix_mode",
      task: buildPendingTask(source, userTask),
      summary: parsed.summary,
      provider: selectedProvider,
      changes,
      commandsToRunLater: parsed.commandsToRunLater,
      risks: parsed.risks,
      rawModelResponse: rawResponse
    });

    await router.recordRequest(selection, "fix_mode", Date.now() - startedAt, true);
    return {
      source,
      title: buildTitle(source),
      summary: parsed.summary,
      generatedAt: new Date().toISOString(),
      diagnostics,
      failedCommand,
      changeSet
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await router.recordRequest(selection, "fix_mode", Date.now() - startedAt, false, message);
    throw error;
  }
}

async function buildFixWorkspaceContext(context: vscode.ExtensionContext, task: string) {
  return buildWorkspaceContext(context, task);
}

async function assertReadWorkspaceAccess(): Promise<void> {
  const readDecision = await authorizeAction("read_workspace");
  assertAuthorized(readDecision);
}

function normalizeDiagnosticsForFix(diagnostics: DiagnosticsSummary): DiagnosticsSummary {
  return {
    ...diagnostics,
    items: prioritizeDiagnostics(diagnostics.items).slice(0, 40),
    truncated: diagnostics.truncated || diagnostics.items.length > 40
  };
}

function requireWorkspaceFolder(): vscode.WorkspaceFolder {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    throw new Error("Open a workspace folder before using Fix Mode.");
  }
  return workspaceFolder;
}

function buildDefaultTask(source: FixModeSource): string {
  switch (source) {
    case "diagnostics":
      return "Fix current VS Code diagnostics";
    case "last_failed_command":
      return "Fix the latest failed terminal command";
    case "current_file":
      return "Fix the current file";
  }
}

function buildPendingTask(source: FixModeSource, userTask: string | undefined): string {
  return `${buildTitle(source)}${userTask?.trim() ? `: ${userTask.trim()}` : ""}`;
}

function buildTitle(source: FixModeSource): string {
  switch (source) {
    case "diagnostics":
      return "Fix Diagnostics";
    case "last_failed_command":
      return "Fix Last Failed Command";
    case "current_file":
      return "Fix Current File";
  }
}
