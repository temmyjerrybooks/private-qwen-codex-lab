import * as vscode from "vscode";
import { LiteLLMClient } from "../model/litellmClient";
import { ProviderRouter } from "../providers/providerRouter";
import { inspectWorkspace } from "../tools/workspace";
import { buildPlanPrompt, systemPrompt } from "./prompts";

export async function planTask(task: string, context: vscode.ExtensionContext): Promise<string> {
  const trimmedTask = task.trim();
  if (!trimmedTask) {
    return "Enter a task for Borger to plan.";
  }

  const summary = await inspectWorkspace();
  const router = new ProviderRouter(context);
  const selection = await router.selectProvider("plan");
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
    const result = await client.chat([
      { role: "system", content: systemPrompt },
      { role: "user", content: buildPlanPrompt(trimmedTask, summary) }
    ]);
    await router.recordRequest(selection, "plan", Date.now() - startedAt, true);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await router.recordRequest(selection, "plan", Date.now() - startedAt, false, message);
    throw error;
  }
}
