import * as vscode from "vscode";
import { getApiKey, getBorgerConfig } from "../config";
import { LiteLLMClient } from "../model/litellmClient";
import { inspectWorkspace } from "../tools/workspace";
import { buildPlanPrompt, systemPrompt } from "./prompts";

export async function planTask(task: string, context: vscode.ExtensionContext): Promise<string> {
  const trimmedTask = task.trim();
  if (!trimmedTask) {
    return "Enter a task for Borger to plan.";
  }

  const config = getBorgerConfig();
  const apiKey = await getApiKey(context);
  const summary = await inspectWorkspace();
  const client = new LiteLLMClient(config, apiKey);

  return client.chat([
    { role: "system", content: systemPrompt },
    { role: "user", content: buildPlanPrompt(trimmedTask, summary) }
  ]);
}
