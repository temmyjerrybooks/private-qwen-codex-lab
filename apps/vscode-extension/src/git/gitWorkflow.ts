import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as vscode from "vscode";
import { assertAuthorized, authorizeAction, AuthorizationActionType, AuthorizationDecision } from "../permissions/authorization";
import { logAction } from "../permissions/actionLogger";
import { GitCommandResult, GitWorkflowState } from "./gitTypes";
import { isProtectedGitPath, normalizeGitPath, readGitWorkflowStatus } from "./gitStatus";

const execFileAsync = promisify(execFile);

let currentGitState: GitWorkflowState = emptyGitState();

export function getGitWorkflowState(): GitWorkflowState {
  return currentGitState;
}

export async function refreshGitWorkflowState(): Promise<GitWorkflowState> {
  const workspaceFolder = requireWorkspaceFolder();
  const decision = await authorizeAction("git_status", { cwd: workspaceFolder.uri.fsPath });
  assertAuthorized(decision);
  try {
    currentGitState = {
      ...(await readGitWorkflowStatus(workspaceFolder)),
      generatedCommitMessage: currentGitState.generatedCommitMessage,
      pullRequest: currentGitState.pullRequest,
      lastCommand: currentGitState.lastCommand
    };
    await logGitEvent("git_status_checked", true, "Git status checked.", decision);
    return currentGitState;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    currentGitState = {
      ...emptyGitState(),
      available: false,
      lastError: message
    };
    await logGitEvent("git_action_blocked", false, message, decision);
    return currentGitState;
  }
}

export async function createGitBranch(branchName: string): Promise<GitWorkflowState> {
  const workspaceFolder = requireWorkspaceFolder();
  const sanitized = sanitizeBranchName(branchName);
  const result = await runAuthorizedGitCommand({
    executable: "git",
    args: ["checkout", "-b", sanitized],
    authorizationAction: "git_commit",
    requireConfirmation: true,
    startedEvent: "git_branch_created",
    completedEvent: "git_branch_created",
    failedEvent: "git_action_blocked",
    reason: `Create branch ${sanitized}.`,
    workspaceFolder
  });
  currentGitState = {
    ...(await refreshGitWorkflowState()),
    lastCommand: result
  };
  return currentGitState;
}

export async function stageGitFiles(paths: string[]): Promise<GitWorkflowState> {
  const workspaceFolder = requireWorkspaceFolder();
  const state = await refreshGitWorkflowState();
  const safePaths = resolveSafeStagePaths(state, paths);
  if (safePaths.length === 0) {
    throw new Error("No safe files are available to stage.");
  }
  const result = await runAuthorizedGitCommand({
    executable: "git",
    args: ["add", "--", ...safePaths],
    authorizationAction: "git_commit",
    requireConfirmation: true,
    startedEvent: "git_files_staged",
    completedEvent: "git_files_staged",
    failedEvent: "git_action_blocked",
    reason: `Stage ${safePaths.length} safe file(s).`,
    workspaceFolder
  });
  currentGitState = {
    ...(await refreshGitWorkflowState()),
    lastCommand: result
  };
  return currentGitState;
}

export async function createGitCommit(message: string): Promise<GitWorkflowState> {
  const trimmed = message.trim();
  if (!trimmed) {
    throw new Error("Commit message is required.");
  }
  const workspaceFolder = requireWorkspaceFolder();
  const state = await refreshGitWorkflowState();
  if (state.stagedFiles.length === 0) {
    throw new Error("No staged changes are available to commit.");
  }
  const protectedStagedFiles = state.stagedFiles.filter((file) => file.protected);
  if (protectedStagedFiles.length > 0) {
    throw new Error(
      `Refusing to commit protected staged file(s): ${protectedStagedFiles
        .map((file) => `${file.path} (${file.protectedReason ?? "protected"})`)
        .join(", ")}. Unstage those files before committing with Borger.`
    );
  }
  const result = await runAuthorizedGitCommand({
    executable: "git",
    args: ["commit", "-m", trimmed],
    authorizationAction: "git_commit",
    requireConfirmation: true,
    startedEvent: "git_commit_created",
    completedEvent: "git_commit_created",
    failedEvent: "git_action_blocked",
    reason: `Create git commit with staged files: ${state.stagedFiles.map((file) => file.path).join(", ")}.`,
    workspaceFolder
  });
  currentGitState = {
    ...(await refreshGitWorkflowState()),
    generatedCommitMessage: trimmed,
    lastCommand: result
  };
  return currentGitState;
}

export async function pushGitBranch(): Promise<GitWorkflowState> {
  const workspaceFolder = requireWorkspaceFolder();
  const state = await refreshGitWorkflowState();
  if (!state.branch) {
    throw new Error("Current git branch could not be determined.");
  }
  if (state.branch === "HEAD") {
    throw new Error("Refusing to push detached HEAD.");
  }
  const args = state.upstream ? ["push"] : ["push", "-u", "origin", state.branch];
  const result = await runAuthorizedGitCommand({
    executable: "git",
    args,
    authorizationAction: "git_push",
    requireConfirmation: true,
    startedEvent: "git_push_started",
    completedEvent: "git_push_completed",
    failedEvent: "git_push_failed",
    reason: state.upstream ? "Push current branch." : `Push branch ${state.branch} and set upstream.`,
    workspaceFolder
  });
  currentGitState = {
    ...(await refreshGitWorkflowState()),
    lastCommand: result
  };
  return currentGitState;
}

export function setGeneratedCommitMessage(message: string): GitWorkflowState {
  currentGitState = {
    ...currentGitState,
    generatedCommitMessage: message.trim()
  };
  return currentGitState;
}

export function setPullRequestPreparation(pullRequest: GitWorkflowState["pullRequest"]): GitWorkflowState {
  currentGitState = {
    ...currentGitState,
    pullRequest
  };
  return currentGitState;
}

export function resolveSafeStagePaths(state: GitWorkflowState, paths: string[]): string[] {
  const requested = paths.length > 0 ? new Set(paths.map(normalizeGitPath)) : undefined;
  return state.files
    .filter((file) => !requested || requested.has(file.path))
    .filter((file) => !file.protected && !isProtectedGitPath(file.path))
    .map((file) => file.path);
}

export async function runAuthorizedGitCommand(input: {
  executable: "git" | "gh";
  args: string[];
  authorizationAction: AuthorizationActionType;
  requireConfirmation: boolean;
  startedEvent: string;
  completedEvent: string;
  failedEvent: string;
  reason: string;
  workspaceFolder: vscode.WorkspaceFolder;
}): Promise<GitCommandResult> {
  const command = renderCommand(input.executable, input.args);
  const cwd = input.workspaceFolder.uri.fsPath;
  const gitDecision = await authorizeAction(input.authorizationAction, { command, cwd });
  if (!gitDecision.allowed) {
    await logGitEvent("git_action_blocked", false, gitDecision.reason, gitDecision, command);
    throw new Error(gitDecision.reason);
  }

  const terminalDecision = await authorizeAction("run_terminal", { command, cwd });
  if (!terminalDecision.allowed) {
    await logGitEvent("git_action_blocked", false, terminalDecision.reason, terminalDecision, command);
    throw new Error(terminalDecision.reason);
  }

  const confirmed = await confirmGitAction(command, input.reason, input.requireConfirmation || gitDecision.requiresConfirmation || terminalDecision.requiresConfirmation);
  if (!confirmed) {
    await logGitEvent("git_action_blocked", false, "User cancelled Git workflow action.", gitDecision, command);
    throw new Error("User cancelled Git workflow action.");
  }

  await logGitEvent(input.startedEvent, true, input.reason, gitDecision, command);
  const startedAt = new Date();
  try {
    const result = await execFileAsync(input.executable, input.args, {
      cwd,
      timeout: 10 * 60 * 1000,
      maxBuffer: 5 * 1024 * 1024
    });
    const commandResult = buildCommandResult(command, cwd, startedAt, 0, result.stdout, result.stderr);
    await logGitEvent(input.completedEvent, true, commandResult.reason, gitDecision, command, commandResult);
    return commandResult;
  } catch (error) {
    const commandError = error as { stdout?: unknown; stderr?: unknown; message?: string; exitCode?: number };
    const commandResult = buildCommandResult(
      command,
      cwd,
      startedAt,
      commandError.exitCode ?? 1,
      normalizeOutput(commandError.stdout),
      normalizeOutput(commandError.stderr) || commandError.message || String(error)
    );
    await logGitEvent(input.failedEvent, false, commandResult.reason, gitDecision, command, commandResult);
    throw new Error(commandResult.stderr || commandResult.reason);
  }
}

export function sanitizeBranchName(branchName: string): string {
  const sanitized = branchName.trim().replace(/\s+/g, "-");
  if (!sanitized) {
    throw new Error("Branch name is required.");
  }
  if (
    sanitized === "HEAD" ||
    sanitized === "@" ||
    sanitized.startsWith("-") ||
    sanitized.startsWith("/") ||
    sanitized.endsWith("/") ||
    sanitized.endsWith(".") ||
    sanitized.includes("..") ||
    sanitized.includes("@{") ||
    sanitized.startsWith("origin/") ||
    /[~^:?*[\\]/.test(sanitized)
  ) {
    throw new Error("Branch name is blocked because it is unsafe or ambiguous.");
  }
  return sanitized;
}

function requireWorkspaceFolder(): vscode.WorkspaceFolder {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    throw new Error("Open a workspace folder before using Git workflow.");
  }
  return workspaceFolder;
}

async function confirmGitAction(command: string, reason: string, requireConfirmation: boolean): Promise<boolean> {
  if (!requireConfirmation) {
    return true;
  }
  const choice = await vscode.window.showWarningMessage(
    `Run Git workflow command?\n\n${command}\n\n${reason}`,
    { modal: true },
    "Run Git Command"
  );
  return choice === "Run Git Command";
}

async function logGitEvent(
  actionType: string,
  allowed: boolean,
  reason: string,
  decision: AuthorizationDecision,
  command?: string,
  result?: GitCommandResult
): Promise<void> {
  await logAction({
    actionType,
    allowed,
    requiresConfirmation: decision.requiresConfirmation,
    reason,
    profile: decision.profile,
    command,
    cwd: decision.cwd,
    exitCode: result?.exitCode,
    durationMs: result?.durationMs,
    status: result?.status
  });
}

function buildCommandResult(
  command: string,
  cwd: string,
  startedAt: Date,
  exitCode: number,
  stdout: string,
  stderr: string
): GitCommandResult {
  const endedAt = new Date();
  return {
    command,
    cwd,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationMs: endedAt.getTime() - startedAt.getTime(),
    exitCode,
    stdout,
    stderr,
    status: exitCode === 0 ? "succeeded" : "failed",
    reason: exitCode === 0 ? "Git workflow command completed successfully." : `Git workflow command exited with code ${exitCode}.`
  };
}

function renderCommand(executable: string, args: string[]): string {
  return [executable, ...args.map(quoteArg)].join(" ");
}

function quoteArg(arg: string): string {
  return /^[a-zA-Z0-9._/@:-]+$/.test(arg) ? arg : JSON.stringify(arg);
}

function normalizeOutput(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

function emptyGitState(): GitWorkflowState {
  return {
    available: false,
    clean: true,
    files: [],
    stagedFiles: [],
    unstagedFiles: [],
    untrackedFiles: [],
    safeStageableFiles: [],
    protectedFiles: [],
    diffStat: "",
    diffNameOnly: []
  };
}
