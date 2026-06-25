import * as vscode from "vscode";
import { authorizeAction } from "../permissions/authorization";
import { loadPermissionState } from "../permissions/permissionState";
import { ProviderRouter } from "../providers/providerRouter";
import { ProviderSelection, ProviderStatusReport } from "../providers/types";
import { readGitStatus, GitStatusSummary } from "../tools/git";
import { inspectWorkspace, WorkspaceSummary } from "../tools/workspace";

export interface PermissionProfileSummary {
  profile: string;
  label: string;
  source: string;
  canReadWorkspace: boolean;
  canUseGit: boolean;
  canRunTerminal: boolean;
  canWriteWorkspace: boolean;
  warning?: string;
}

export interface ActiveProviderSummary {
  id: string;
  label: string;
  baseUrl: string;
  model: string;
  status: string;
  eligible: boolean;
  usagePercent: number;
  reason?: string;
}

export interface WorkspaceContext extends WorkspaceSummary {
  generatedAt: string;
  permissionProfile: PermissionProfileSummary;
  activeProvider?: ActiveProviderSummary;
  gitStatus: GitStatusSummary;
}

export async function buildWorkspaceContext(context: vscode.ExtensionContext): Promise<WorkspaceContext> {
  const [workspace, permissionProfile, activeProvider] = await Promise.all([
    inspectWorkspace(),
    buildPermissionProfileSummary(),
    buildActiveProviderSummary(context)
  ]);

  const gitStatus = await buildGitStatusSummary(workspace);

  return {
    ...workspace,
    generatedAt: new Date().toISOString(),
    permissionProfile,
    activeProvider,
    gitStatus
  };
}

export function selectedProviderToSummary(selection: ProviderSelection): ActiveProviderSummary {
  return {
    id: selection.provider.id,
    label: selection.provider.label,
    baseUrl: selection.provider.baseUrl,
    model: selection.provider.model,
    status: selection.state.status,
    eligible: true,
    usagePercent: selection.state.currentUsagePercent,
    reason: selection.state.pauseReason || selection.state.lastError
  };
}

export function formatWorkspaceContextForOutput(context: WorkspaceContext): string {
  const frameworks = context.likelyFrameworks.length > 0 ? context.likelyFrameworks.join(", ") : "none detected";
  const scripts = Object.keys(context.packageScripts);
  const diagnostics = `${context.diagnostics.errorCount} errors, ${context.diagnostics.warningCount} warnings, ${context.diagnostics.total} total`;
  const git = context.gitStatus.available
    ? `${context.gitStatus.branch || "unknown branch"}; ${context.gitStatus.clean ? "clean" : `${context.gitStatus.entries.length} changed item(s)`}`
    : context.gitStatus.permission?.allowed === false
      ? `blocked: ${context.gitStatus.permission.reason}`
      : context.gitStatus.error || "not available";
  const provider = context.activeProvider
    ? `${context.activeProvider.label} (${context.activeProvider.model})`
    : "none available";

  return [
    `Workspace: ${context.workspaceName}`,
    `Root: ${context.rootPath || "none"}`,
    `Project name: ${context.projectName}`,
    `Detected frameworks: ${frameworks}`,
    `Project types: ${context.projectTypes.join(", ") || "none detected"}`,
    `Important files: ${context.importantFiles.map((file) => file.path).join(", ") || "none"}`,
    `Package scripts: ${scripts.join(", ") || "none"}`,
    `Diagnostics: ${diagnostics}`,
    `Git: ${git}`,
    `Permission profile: ${context.permissionProfile.label} (${context.permissionProfile.profile})`,
    `Active provider: ${provider}`,
    `Current file: ${context.openFile || "none"}`,
    `Selected text: ${context.selectedText ? `${context.selectedText.text.length} characters` : "none"}`,
    `Context status: ${context.contextStatus}`,
    `Ignored behavior: ${context.ignoredBehavior.join(" ")}`,
    `Secrets: ${context.secretsNote}`,
    "",
    "Full context:",
    JSON.stringify(context, null, 2)
  ].join("\n");
}

async function buildPermissionProfileSummary(): Promise<PermissionProfileSummary> {
  const state = await loadPermissionState();
  return {
    profile: state.profile.id,
    label: state.profile.label,
    source: state.source,
    canReadWorkspace: state.capabilities.canReadWorkspace,
    canUseGit: state.capabilities.canUseGit,
    canRunTerminal: state.capabilities.canRunTerminal,
    canWriteWorkspace: state.capabilities.canWriteWorkspace,
    warning: state.warning
  };
}

async function buildActiveProviderSummary(context: vscode.ExtensionContext): Promise<ActiveProviderSummary | undefined> {
  try {
    const router = new ProviderRouter(context);
    const reports = await router.getStatusReports();
    const active = chooseActiveProvider(reports);
    if (!active) {
      return undefined;
    }
    return {
      id: active.provider.id,
      label: active.provider.label,
      baseUrl: active.provider.baseUrl,
      model: active.provider.model,
      status: active.state.status,
      eligible: active.eligible,
      usagePercent: active.state.currentUsagePercent,
      reason: active.reason || active.state.pauseReason || active.state.lastError
    };
  } catch {
    return undefined;
  }
}

async function buildGitStatusSummary(workspace: WorkspaceSummary): Promise<GitStatusSummary> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder || !workspace.rootPath) {
    return {
      available: false,
      entries: [],
      truncated: false,
      error: "No workspace folder open."
    };
  }

  const decision = await authorizeAction("git_status", { command: "git status --short" });
  if (!decision.allowed) {
    return {
      available: false,
      entries: [],
      truncated: false,
      permission: {
        allowed: false,
        reason: decision.reason
      }
    };
  }

  const status = await readGitStatus(workspaceFolder);
  return {
    ...status,
    permission: {
      allowed: true,
      reason: decision.reason
    }
  };
}

function chooseActiveProvider(reports: ProviderStatusReport[]): ProviderStatusReport | undefined {
  const eligible = reports.filter((report) => report.eligible);
  const pool = eligible.length > 0 ? eligible : reports;
  return [...pool].sort((a, b) => {
    const usage = a.state.currentUsagePercent - b.state.currentUsagePercent;
    if (usage !== 0) {
      return usage;
    }
    return rankStatus(a.state.status) - rankStatus(b.state.status);
  })[0];
}

function rankStatus(status: ProviderStatusReport["state"]["status"]): number {
  if (status === "active") {
    return 0;
  }
  if (status === "reset_pending") {
    return 1;
  }
  if (status === "warning") {
    return 2;
  }
  return 3;
}
