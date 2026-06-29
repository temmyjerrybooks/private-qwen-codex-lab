import * as vscode from "vscode";
import { LiteLLMClient } from "../model/litellmClient";
import { ProviderRouter } from "../providers/providerRouter";
import { selectedProviderToSummary } from "../agent/contextBuilder";
import { systemPrompt } from "../agent/prompts";
import { GitWorkflowState } from "./gitTypes";
import { readGitDiffForCommitMessage } from "./gitStatus";

export async function generateCommitMessageWithModel(
  context: vscode.ExtensionContext,
  workspaceFolder: vscode.WorkspaceFolder,
  state: GitWorkflowState
): Promise<string> {
  const diff = await readGitDiffForCommitMessage(workspaceFolder);
  if (!diff.trim()) {
    throw new Error("No safe staged or unstaged diff is available for commit-message generation.");
  }
  const router = new ProviderRouter(context);
  const selection = await router.selectProvider("commit_message");
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
    const response = await client.chat([
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: buildCommitMessagePrompt(state, diff, `${selectedProvider.label} (${selectedProvider.model})`)
      }
    ]);
    await router.recordRequest(selection, "commit_message", Date.now() - startedAt, true);
    return cleanCommitMessage(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await router.recordRequest(selection, "commit_message", Date.now() - startedAt, false, message);
    throw error;
  }
}

export function buildPullRequestText(state: GitWorkflowState): { title: string; body: string } {
  const title = state.generatedCommitMessage?.split(/\r?\n/)[0]?.trim() || `Update ${state.branch || "workspace"}`;
  const files = state.files
    .filter((file) => !file.protected)
    .map((file) => `- ${file.path} (${file.indexStatus}${file.workingTreeStatus})`)
    .join("\n");
  const body = [
    "## Summary",
    state.generatedCommitMessage ? `- ${state.generatedCommitMessage}` : "- Describe the changes in this branch.",
    "",
    "## Changed Files",
    files || "- No changed files reported.",
    "",
    "## Verification",
    "- Run the relevant Borger verification commands before requesting review."
  ].join("\n");
  return { title, body };
}

function buildCommitMessagePrompt(state: GitWorkflowState, diff: string, provider: string): string {
  const safeFiles = state.files.filter((file) => !file.protected);
  return `Generate one concise professional git commit message.
Return only the commit message. Do not include bullets, commentary, markdown fences, or explanations.
Prefer either:
Phase X: short description
or
type(scope): short description

Provider:
${provider}

Branch:
${state.branch || "unknown"}

Changed files:
${safeFiles.map((file) => `- ${file.path} (${file.indexStatus}${file.workingTreeStatus})`).join("\n") || "- none"}

Diff summary and excerpt:
${diff || "No diff content available."}`;
}

function cleanCommitMessage(message: string): string {
  return message
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/```$/i, "")
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join("\n")
    .slice(0, 240);
}
