import * as vscode from "vscode";
import {
  ActiveProviderSummary,
  buildWorkspaceContext,
  RelevantFileRanking,
  selectedProviderToSummary
} from "./contextBuilder";
import { LiteLLMClient } from "../model/litellmClient";
import { assertAuthorized, authorizeAction } from "../permissions/authorization";
import { ProviderRouter } from "../providers/providerRouter";
import { buildPlanPrompt, systemPrompt } from "./prompts";

export type PlanComplexity = "low" | "medium" | "high" | "very high";

export interface ComplexityEstimate {
  level: PlanComplexity;
  reason: string;
}

export interface PlanTaskResult {
  task: string;
  title: string;
  generatedAt: string;
  workspaceName: string;
  provider: ActiveProviderSummary;
  complexity: ComplexityEstimate;
  relevantFiles: RelevantFileRanking[];
  suggestedVerificationCommands: string[];
  commandsLikelyNeeded: string[];
  editingRequired: boolean;
  modelPlan: string;
}

export async function planTask(task: string, context: vscode.ExtensionContext): Promise<PlanTaskResult | string> {
  const trimmedTask = task.trim();
  if (!trimmedTask) {
    return "Enter a task for Borger to plan.";
  }

  const decision = await authorizeAction("read_workspace");
  assertAuthorized(decision);
  const workspaceContext = await buildWorkspaceContext(context, trimmedTask);
  const router = new ProviderRouter(context);
  const selection = await router.selectProvider("plan");
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
    const result = await client.chat([
      { role: "system", content: systemPrompt },
      { role: "user", content: buildPlanPrompt(trimmedTask, promptContext) }
    ]);
    await router.recordRequest(selection, "plan", Date.now() - startedAt, true);
    return {
      task: trimmedTask,
      title: buildTaskTitle(trimmedTask, result),
      generatedAt: new Date().toISOString(),
      workspaceName: workspaceContext.workspaceName,
      provider: selectedProvider,
      complexity: estimateComplexity(trimmedTask, workspaceContext.relevantFiles, workspaceContext.diagnostics.total),
      relevantFiles: workspaceContext.relevantFiles,
      suggestedVerificationCommands: workspaceContext.likelyVerificationCommands,
      commandsLikelyNeeded: workspaceContext.likelyVerificationCommands,
      editingRequired: inferEditingRequired(trimmedTask, result),
      modelPlan: result
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await router.recordRequest(selection, "plan", Date.now() - startedAt, false, message);
    throw error;
  }
}

export function formatPlanResultForOutput(result: PlanTaskResult | string): string {
  if (typeof result === "string") {
    return result;
  }

  return [
    `Plan: ${result.title}`,
    `Workspace: ${result.workspaceName}`,
    `Provider: ${result.provider.label} (${result.provider.model})`,
    `Complexity: ${result.complexity.level} - ${result.complexity.reason}`,
    `Editing required: ${result.editingRequired ? "yes" : "no"}`,
    `Relevant files: ${
      result.relevantFiles.length > 0
        ? result.relevantFiles.map((file) => `${file.path} (${file.reasons.join("; ")})`).join(", ")
        : "none ranked"
    }`,
    `Suggested verification commands: ${result.suggestedVerificationCommands.join(", ") || "none"}`,
    "",
    result.modelPlan
  ].join("\n");
}

function buildTaskTitle(task: string, modelPlan: string): string {
  const titleMatch = modelPlan.match(/^#\s*Plan:\s*(.+)$/im);
  const title = titleMatch?.[1]?.trim() || task;
  return title.length > 90 ? `${title.slice(0, 87)}...` : title;
}

function estimateComplexity(task: string, relevantFiles: RelevantFileRanking[], diagnosticsCount: number): ComplexityEstimate {
  const lowerTask = task.toLowerCase();
  let score = 0;
  const reasons: string[] = [];

  if (relevantFiles.length >= 8) {
    score += 2;
    reasons.push("many likely relevant files");
  } else if (relevantFiles.length >= 4) {
    score += 1;
    reasons.push("several likely relevant files");
  }

  if (diagnosticsCount > 0) {
    score += 1;
    reasons.push("workspace diagnostics are present");
  }

  const highSignals = ["auth", "database", "migration", "deploy", "routing", "refactor", "architecture", "provider", "permission"];
  const veryHighSignals = ["rewrite", "multi-provider", "auto", "terminal", "git workflow", "ssh", "end-to-end"];
  if (highSignals.some((signal) => lowerTask.includes(signal))) {
    score += 1;
    reasons.push("task touches cross-cutting behavior");
  }
  if (veryHighSignals.some((signal) => lowerTask.includes(signal))) {
    score += 2;
    reasons.push("task wording suggests broad system changes");
  }

  if (score >= 4) {
    return { level: "very high", reason: reasons.join("; ") || "broad, uncertain implementation scope" };
  }
  if (score === 3) {
    return { level: "high", reason: reasons.join("; ") || "multiple moving pieces" };
  }
  if (score >= 1) {
    return { level: "medium", reason: reasons.join("; ") || "moderate implementation scope" };
  }
  return { level: "low", reason: "focused task with limited obvious blast radius" };
}

function inferEditingRequired(task: string, modelPlan: string): boolean {
  const text = `${task}\n${modelPlan}`.toLowerCase();
  if (/whether editing is required\s*\n+\s*(no|not required)/i.test(modelPlan)) {
    return false;
  }
  return ["add", "create", "implement", "update", "change", "modify", "fix", "refactor", "wire", "build"].some((word) =>
    text.includes(word)
  );
}
