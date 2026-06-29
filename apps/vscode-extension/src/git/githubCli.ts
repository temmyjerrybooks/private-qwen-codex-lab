import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as vscode from "vscode";
import { logAction } from "../permissions/actionLogger";
import { loadPermissionState } from "../permissions/permissionState";
import { buildPullRequestText } from "./commitMessage";
import { GitWorkflowState, PullRequestPreparation } from "./gitTypes";
import { refreshGitWorkflowState, runAuthorizedGitCommand } from "./gitWorkflow";

const execFileAsync = promisify(execFile);

export async function isGitHubCliAvailable(workspaceFolder: vscode.WorkspaceFolder): Promise<boolean> {
  try {
    await execFileAsync("gh", ["--version"], {
      cwd: workspaceFolder.uri.fsPath,
      timeout: 5000
    });
    return true;
  } catch {
    return false;
  }
}

export async function preparePullRequestWithGitHubCli(
  workspaceFolder: vscode.WorkspaceFolder,
  state: GitWorkflowState
): Promise<PullRequestPreparation> {
  const text = buildPullRequestText(state);
  const ghAvailable = await isGitHubCliAvailable(workspaceFolder);
  const command = `gh pr create --title ${JSON.stringify(text.title)} --body ${JSON.stringify(text.body)}`;

  if (!ghAvailable) {
    const permissionState = await loadPermissionState();
    await logAction({
      actionType: "git_pr_prepared",
      allowed: true,
      requiresConfirmation: false,
      reason: "Prepared manual pull request instructions because GitHub CLI is unavailable.",
      profile: permissionState.profile.id,
      command,
      cwd: workspaceFolder.uri.fsPath
    });
    return {
      ...text,
      ghAvailable,
      command,
      manualInstructions: "GitHub CLI is not available. Push the branch, then create a pull request manually with the generated title/body."
    };
  }

  const result = await runAuthorizedGitCommand({
    executable: "gh",
    args: ["pr", "create", "--title", text.title, "--body", text.body],
    authorizationAction: "git_push",
    requireConfirmation: true,
    startedEvent: "git_pr_prepared",
    completedEvent: "git_pr_prepared",
    failedEvent: "git_action_blocked",
    reason: "Prepare GitHub pull request.",
    workspaceFolder
  });

  await refreshGitWorkflowState();
  return {
    ...text,
    ghAvailable,
    command,
    result
  };
}
