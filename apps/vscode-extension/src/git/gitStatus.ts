import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as vscode from "vscode";
import { assertAuthorized, authorizeAction } from "../permissions/authorization";
import { isSecretPath, normalizeRelativePath } from "../tools/readFile";
import { GitChangedFile, GitWorkflowState } from "./gitTypes";

const execFileAsync = promisify(execFile);

const protectedExactPaths = new Set([
  ".borger/providers.local.json",
  ".borger/secrets.local.json",
  ".borger/permissions.local.json",
  ".borger/action-log.jsonl",
  ".borger/usage-ledger.jsonl",
  ".borger/provider-state.json"
]);

export async function readGitWorkflowStatus(workspaceFolder: vscode.WorkspaceFolder): Promise<GitWorkflowState> {
  const [branch, status, diffStat, cachedDiffStat, diffNameOnly, cachedDiffNameOnly, remote, upstream] = await Promise.all([
    runGitRead(workspaceFolder, ["branch", "--show-current"]),
    runGitRead(workspaceFolder, ["status", "--short"]),
    runGitRead(workspaceFolder, ["diff", "--stat"]),
    runGitRead(workspaceFolder, ["diff", "--cached", "--stat"]),
    runGitRead(workspaceFolder, ["diff", "--name-only"]),
    runGitRead(workspaceFolder, ["diff", "--cached", "--name-only"]),
    runGitRead(workspaceFolder, ["remote", "get-url", "origin"]).catch(() => ({ stdout: "", stderr: "" })),
    runGitRead(workspaceFolder, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]).catch(() => ({
      stdout: "",
      stderr: ""
    }))
  ]);
  const files = parseShortStatus(status.stdout);
  return {
    available: true,
    branch: branch.stdout.trim() || undefined,
    remote: remote.stdout.trim() || undefined,
    upstream: upstream.stdout.trim() || undefined,
    clean: files.length === 0,
    files,
    stagedFiles: files.filter((file) => file.staged),
    unstagedFiles: files.filter((file) => file.unstaged),
    untrackedFiles: files.filter((file) => file.untracked),
    safeStageableFiles: files.filter((file) => !file.protected),
    protectedFiles: files.filter((file) => file.protected),
    diffStat: [cachedDiffStat.stdout.trim(), diffStat.stdout.trim()].filter(Boolean).join("\n"),
    diffNameOnly: [...cachedDiffNameOnly.stdout.split(/\r?\n/), ...diffNameOnly.stdout.split(/\r?\n/)].filter(Boolean)
  };
}

export async function readGitDiffForCommitMessage(workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
  const state = await readGitWorkflowStatus(workspaceFolder);
  const stagedSafePaths = state.stagedFiles.filter((file) => !file.protected).map((file) => file.path);
  const unstagedSafePaths = state.unstagedFiles.filter((file) => !file.protected).map((file) => file.path);

  if (stagedSafePaths.length > 0) {
    const staged = await runGitRead(workspaceFolder, ["diff", "--cached", "--stat", "--", ...stagedSafePaths]);
    const stagedPatch = await runGitRead(workspaceFolder, ["diff", "--cached", "--", ...stagedSafePaths]);
    return truncateDiff(`${staged.stdout}\n\n${stagedPatch.stdout}`);
  }

  if (unstagedSafePaths.length === 0) {
    return "";
  }

  const unstaged = await runGitRead(workspaceFolder, ["diff", "--stat", "--", ...unstagedSafePaths]);
  const unstagedPatch = await runGitRead(workspaceFolder, ["diff", "--", ...unstagedSafePaths]);
  return truncateDiff(`${unstaged.stdout}\n\n${unstagedPatch.stdout}`);
}

export async function runGitRead(
  workspaceFolder: vscode.WorkspaceFolder,
  args: string[]
): Promise<{ stdout: string; stderr: string }> {
  const command = renderGitCommand(args);
  const decision = await authorizeAction("run_terminal", { command, cwd: workspaceFolder.uri.fsPath });
  assertAuthorized(decision);
  const result = await execFileAsync("git", args, {
    cwd: workspaceFolder.uri.fsPath,
    timeout: 10000,
    maxBuffer: 5 * 1024 * 1024
  });

  return {
    stdout: result.stdout,
    stderr: result.stderr
  };
}

function renderGitCommand(args: string[]): string {
  return ["git", ...args.map((arg) => (/^[a-zA-Z0-9._/@:-]+$/.test(arg) ? arg : JSON.stringify(arg)))].join(" ");
}

export function isProtectedGitPath(filePath: string): string | undefined {
  const normalized = normalizeGitPath(filePath);
  if (protectedExactPaths.has(normalized)) {
    return "Borger local runtime/config file is protected.";
  }
  if (normalized.startsWith(".borger/backups/")) {
    return "Borger backup snapshots are protected.";
  }
  if (isSecretPath(normalized)) {
    return "Secret-like files are protected from staging.";
  }
  return undefined;
}

export function normalizeGitPath(filePath: string): string {
  return normalizeRelativePath(filePath.includes(" -> ") ? filePath.split(" -> ").at(-1) ?? filePath : filePath);
}

function parseShortStatus(output: string): GitChangedFile[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const indexStatus = line.slice(0, 1).trim() || " ";
      const workingTreeStatus = line.slice(1, 2).trim() || " ";
      const path = normalizeGitPath(line.slice(3).trim());
      const protectedReason = isProtectedGitPath(path);
      const untracked = indexStatus === "?" && workingTreeStatus === "?";
      return {
        path,
        indexStatus,
        workingTreeStatus,
        staged: indexStatus !== " " && indexStatus !== "?",
        unstaged: workingTreeStatus !== " " && workingTreeStatus !== "?",
        untracked,
        protected: Boolean(protectedReason),
        protectedReason
      };
    });
}

function truncateDiff(diff: string): string {
  const max = 18000;
  return diff.length > max ? `${diff.slice(0, max)}\n\n... diff truncated for commit-message generation ...` : diff;
}
