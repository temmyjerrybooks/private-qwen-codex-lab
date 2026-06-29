import * as vscode from "vscode";
import { getBorgerConfig } from "../config";
import { LiteLLMClient } from "../model/litellmClient";
import { assertAuthorized, authorizeAction } from "../permissions/authorization";
import { ProviderRouter } from "../providers/providerRouter";
import { applyApprovedFileChange, createPendingFileChangePreview } from "../tools/applyPatch";
import { getLastWorkspaceBackup, revertLastWorkspaceBackup } from "../tools/fileBackups";
import { runAuthorizedTerminalCommand } from "../tools/runTerminal";
import { TerminalCommandResult, TerminalExecutionMode } from "../terminal/commandTypes";
import { buildWorkspaceContext, selectedProviderToSummary } from "./contextBuilder";
import {
  createPendingChangeSet,
  getPendingChange,
  getPendingChanges,
  markPendingChangeApplied,
  markPendingChangeFailed,
  PendingChangeSet,
  PendingFileChange
} from "./pendingChanges";
import { parseEditProposalFromModel } from "./patchParser";
import { buildEditProposalPrompt, systemPrompt } from "./prompts";
export {
  explainLastError,
  generateCurrentFileFix,
  generateDiagnosticsFix,
  generateLastFailedCommandFix,
  getFixModeStatus,
  type FixModeResult,
  type FixModeStatus
} from "./fixMode";

export async function generateProposedChanges(
  task: string,
  context: vscode.ExtensionContext
): Promise<PendingChangeSet> {
  const trimmedTask = task.trim();
  if (!trimmedTask) {
    throw new Error("Enter a task before generating proposed changes.");
  }

  const readDecision = await authorizeAction("read_workspace");
  assertAuthorized(readDecision);

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    throw new Error("Open a workspace folder before generating proposed changes.");
  }

  const workspaceContext = await buildWorkspaceContext(context, trimmedTask);
  const router = new ProviderRouter(context);
  const selection = await router.selectProvider("propose_changes");
  const selectedProvider = selectedProviderToSummary(selection);
  const promptContext = {
    ...workspaceContext,
    activeProvider: selectedProvider
  };

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
      { role: "user", content: buildEditProposalPrompt(trimmedTask, promptContext) }
    ]);
    const parsed = parseEditProposalFromModel(rawResponse);
    const config = getBorgerConfig();
    const changes = await Promise.all(
      parsed.changes.map((change) => createPendingFileChangePreview(workspaceFolder, change, config.maxFileSizeKb))
    );

    const pending = createPendingChangeSet({
      source: "proposed_changes",
      task: trimmedTask,
      summary: parsed.summary,
      provider: selectedProvider,
      changes,
      commandsToRunLater: parsed.commandsToRunLater,
      risks: parsed.risks,
      rawModelResponse: rawResponse
    });

    await router.recordRequest(selection, "propose_changes", Date.now() - startedAt, true);
    return pending;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await router.recordRequest(selection, "propose_changes", Date.now() - startedAt, false, message);
    throw error;
  }
}

export function isExecutorAvailable(): boolean {
  return true;
}

export async function runControlledTerminalCommand(
  command: string,
  mode: TerminalExecutionMode = "captured"
): Promise<TerminalCommandResult> {
  return runAuthorizedTerminalCommand(command, { mode });
}

export interface ApplyPendingChangesResult {
  changeSet: PendingChangeSet | undefined;
  applied: number;
  failed: number;
  messages: string[];
}

export async function applyApprovedPendingChanges(): Promise<ApplyPendingChangesResult> {
  const changeSet = getPendingChanges();
  if (!changeSet) {
    throw new Error("No pending changes are available to apply.");
  }

  const approvedChanges = changeSet.changes.filter((change) => change.status === "approved");
  if (approvedChanges.length === 0) {
    throw new Error("No approved pending changes are available to apply.");
  }

  const workspaceFolder = requireWorkspaceFolder();
  const messages: string[] = [];
  let applied = 0;
  let failed = 0;

  for (const change of approvedChanges) {
    const result = await applyOnePendingChange(workspaceFolder, change);
    messages.push(result.message);
    if (result.applied) {
      applied += 1;
    } else {
      failed += 1;
    }
  }

  return {
    changeSet: getPendingChanges(),
    applied,
    failed,
    messages
  };
}

export async function applyPendingChangeById(changeId: string): Promise<ApplyPendingChangesResult> {
  const change = getPendingChange(changeId);
  if (!change) {
    throw new Error("Pending change was not found.");
  }

  const workspaceFolder = requireWorkspaceFolder();
  const result = await applyOnePendingChange(workspaceFolder, change);
  return {
    changeSet: getPendingChanges(),
    applied: result.applied ? 1 : 0,
    failed: result.applied ? 0 : 1,
    messages: [result.message]
  };
}

export async function revertLastAppliedChange(): Promise<string> {
  const workspaceFolder = requireWorkspaceFolder();
  const backup = await getLastWorkspaceBackup(workspaceFolder);
  if (!backup) {
    throw new Error("No Borger backup is available to revert.");
  }

  const applyDecision = await authorizeAction("apply_patch", { filePath: backup.path });
  assertAuthorized(applyDecision);

  const writeDecision = await authorizeAction(backup.action === "create" ? "delete_file" : "write_file", {
    filePath: backup.path
  });
  assertAuthorized(writeDecision);

  const reverted = await revertLastWorkspaceBackup(workspaceFolder);
  return `Reverted ${reverted.path} from ${reverted.backupPath}.`;
}

async function applyOnePendingChange(
  workspaceFolder: vscode.WorkspaceFolder,
  change: PendingFileChange
): Promise<{ applied: boolean; message: string }> {
  if (change.status !== "approved") {
    return {
      applied: false,
      message: `${change.path} was skipped because it is ${change.status}, not approved.`
    };
  }

  const applyDecision = await authorizeAction("apply_patch", { filePath: change.path });
  if (!applyDecision.allowed) {
    markPendingChangeFailed(change.id, applyDecision.reason);
    return {
      applied: false,
      message: `${change.path} failed: ${applyDecision.reason}`
    };
  }

  const fileAction = change.action === "create" ? "create_file" : change.action === "delete" ? "delete_file" : "write_file";
  const fileDecision = await authorizeAction(fileAction, { filePath: change.path });
  if (!fileDecision.allowed) {
    markPendingChangeFailed(change.id, fileDecision.reason);
    return {
      applied: false,
      message: `${change.path} failed: ${fileDecision.reason}`
    };
  }

  if (change.action === "delete") {
    const reason = "Delete proposals remain disabled in Phase 7 and were not applied.";
    markPendingChangeFailed(change.id, reason);
    return {
      applied: false,
      message: `${change.path} failed: ${reason}`
    };
  }

  try {
    const result = await applyApprovedFileChange(workspaceFolder, change);
    markPendingChangeApplied(
      change.id,
      result.backup
        ? {
            id: result.backup.id,
            path: result.backup.backupPath
          }
        : undefined
    );
    return {
      applied: true,
      message: result.message
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    markPendingChangeFailed(change.id, message);
    return {
      applied: false,
      message: `${change.path} failed: ${message}`
    };
  }
}

function requireWorkspaceFolder(): vscode.WorkspaceFolder {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    throw new Error("Open a workspace folder before applying pending changes.");
  }
  return workspaceFolder;
}
