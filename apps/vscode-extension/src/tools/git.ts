import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as vscode from "vscode";

const execFileAsync = promisify(execFile);

export interface GitStatusEntry {
  path: string;
  indexStatus: string;
  workingTreeStatus: string;
}

export interface GitStatusSummary {
  available: boolean;
  branch?: string;
  clean?: boolean;
  entries: GitStatusEntry[];
  truncated: boolean;
  error?: string;
  permission?: {
    allowed: boolean;
    reason: string;
  };
}

export function getWorkspaceRoot(): vscode.WorkspaceFolder | undefined {
  return vscode.workspace.workspaceFolders?.[0];
}

export async function readGitStatus(workspaceFolder: vscode.WorkspaceFolder, maxEntries = 40): Promise<GitStatusSummary> {
  try {
    const [branchResult, statusResult] = await Promise.all([
      runGit(workspaceFolder, ["branch", "--show-current"]),
      runGit(workspaceFolder, ["status", "--short"])
    ]);

    const entries = parseShortStatus(statusResult.stdout).slice(0, maxEntries);
    const totalEntries = parseShortStatus(statusResult.stdout).length;

    return {
      available: true,
      branch: branchResult.stdout.trim() || undefined,
      clean: totalEntries === 0,
      entries,
      truncated: totalEntries > maxEntries
    };
  } catch (error) {
    return {
      available: false,
      entries: [],
      truncated: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function parseShortStatus(output: string): GitStatusEntry[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => ({
      indexStatus: line.slice(0, 1).trim() || " ",
      workingTreeStatus: line.slice(1, 2).trim() || " ",
      path: line.slice(3).trim()
    }));
}

async function runGit(
  workspaceFolder: vscode.WorkspaceFolder,
  args: string[]
): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync("git", args, {
    cwd: workspaceFolder.uri.fsPath,
    timeout: 5000,
    maxBuffer: 1024 * 1024
  });

  return {
    stdout: result.stdout,
    stderr: result.stderr
  };
}
