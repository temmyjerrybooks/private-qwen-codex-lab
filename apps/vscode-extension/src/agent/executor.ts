import * as vscode from "vscode";
import { getBorgerConfig } from "../config";
import { LiteLLMClient } from "../model/litellmClient";
import { assertAuthorized, authorizeAction } from "../permissions/authorization";
import { ProviderRouter } from "../providers/providerRouter";
import { createPendingFileChangePreview } from "../tools/applyPatch";
import { buildWorkspaceContext, selectedProviderToSummary } from "./contextBuilder";
import { createPendingChangeSet, PendingChangeSet } from "./pendingChanges";
import { parseEditProposalFromModel } from "./patchParser";
import { buildEditProposalPrompt, systemPrompt } from "./prompts";

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
