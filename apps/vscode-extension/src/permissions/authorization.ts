import { logAction } from "./actionLogger";
import { classifyCommand, isObviousDestructiveCommand, isReadOnlyGitInspectionCommand } from "./commandPolicy";
import { loadPermissionState, PermissionState } from "./permissionState";
import { PermissionProfileId } from "./permissionProfiles";

export type AuthorizationActionType =
  | "read_workspace"
  | "write_file"
  | "create_file"
  | "delete_file"
  | "apply_patch"
  | "run_terminal"
  | "git_status"
  | "git_commit"
  | "git_push"
  | "deploy"
  | "ssh_command"
  | "destructive_command";

export interface AuthorizationContext {
  command?: string;
  filePath?: string;
  sshHost?: string;
  cwd?: string;
}

export interface AuthorizationDecision {
  actionType: AuthorizationActionType;
  allowed: boolean;
  requiresConfirmation: boolean;
  reason: string;
  profile: PermissionProfileId;
  command?: string;
  filePath?: string;
  sshHost?: string;
  cwd?: string;
}

export async function authorizeAction(
  actionType: AuthorizationActionType,
  context: AuthorizationContext = {}
): Promise<AuthorizationDecision> {
  const state = await loadPermissionState();
  const decision = evaluateAuthorization(state, actionType, context);
  await logAction(decision);
  return decision;
}

export function assertAuthorized(decision: AuthorizationDecision): void {
  if (!decision.allowed) {
    throw new Error(decision.reason);
  }
}

export function evaluateAuthorization(
  state: PermissionState,
  actionType: AuthorizationActionType,
  context: AuthorizationContext = {}
): AuthorizationDecision {
  const profile = state.profile.id;
  const capabilities = state.capabilities;
  const base = {
    actionType,
    profile,
    command: context.command,
    filePath: context.filePath,
    sshHost: context.sshHost,
    cwd: context.cwd
  };

  switch (actionType) {
    case "read_workspace":
      return {
        ...base,
        allowed: capabilities.canReadWorkspace,
        requiresConfirmation: false,
        reason: capabilities.canReadWorkspace ? "Workspace read is allowed." : "Current permission profile cannot read the workspace."
      };
    case "write_file":
    case "create_file":
    case "apply_patch":
      return {
        ...base,
        allowed: capabilities.canWriteWorkspace,
        requiresConfirmation: profile === "edit_with_review",
        reason: capabilities.canWriteWorkspace
          ? "Workspace write is allowed by the current profile."
          : "Current permission profile cannot write workspace files."
      };
    case "delete_file":
      return {
        ...base,
        allowed: capabilities.canWriteWorkspace,
        requiresConfirmation: true,
        reason: capabilities.canWriteWorkspace
          ? "File deletion requires explicit confirmation."
          : "Current permission profile cannot delete workspace files."
      };
    case "run_terminal":
      return evaluateTerminalAuthorization(state, context);
    case "git_status":
      return {
        ...base,
        allowed: capabilities.canUseGit || capabilities.canReadWorkspace,
        requiresConfirmation: false,
        reason:
          capabilities.canUseGit || capabilities.canReadWorkspace
            ? "Git status inspection is allowed."
            : "Current permission profile cannot inspect git state."
      };
    case "git_commit":
      return {
        ...base,
        allowed: capabilities.canUseGit && capabilities.canWriteWorkspace,
        requiresConfirmation: true,
        reason:
          capabilities.canUseGit && capabilities.canWriteWorkspace
            ? "Git commit requires confirmation."
            : "Current permission profile cannot perform git commits."
      };
    case "git_push":
      return {
        ...base,
        allowed: capabilities.canUseGit && capabilities.canPushGitHub,
        requiresConfirmation: capabilities.requireConfirmationForGitPush,
        reason:
          capabilities.canUseGit && capabilities.canPushGitHub
            ? "GitHub push is allowed with configured confirmation policy."
            : "Current permission profile cannot push to GitHub."
      };
    case "deploy":
      return {
        ...base,
        allowed: capabilities.canDeploy,
        requiresConfirmation: true,
        reason: capabilities.canDeploy ? "Deployment action requires confirmation." : "Current permission profile cannot deploy."
      };
    case "ssh_command":
      return evaluateSshAuthorization(state, context);
    case "destructive_command":
      return {
        ...base,
        allowed: capabilities.canRunDestructiveCommands,
        requiresConfirmation: capabilities.requireConfirmationForDestructive,
        reason: capabilities.canRunDestructiveCommands
          ? "Destructive command is allowed by profile and confirmation policy."
          : "Destructive commands are blocked by the current permission profile."
      };
  }
}

function evaluateTerminalAuthorization(state: PermissionState, context: AuthorizationContext): AuthorizationDecision {
  const profile = state.profile.id;
  const base = {
    actionType: "run_terminal" as const,
    profile,
    command: context.command,
    filePath: context.filePath,
    sshHost: context.sshHost,
    cwd: context.cwd
  };
  const command = context.command ?? "";

  if (isReadOnlyGitInspectionCommand(command) && (state.capabilities.canUseGit || state.capabilities.canReadWorkspace)) {
    const policy = classifyCommand(command, state);
    return {
      ...base,
      allowed: policy.classification !== "blocked",
      requiresConfirmation: false,
      reason: policy.classification === "blocked" ? policy.reason : "Read-only git inspection is allowed."
    };
  }

  if (!state.capabilities.canRunTerminal) {
    return {
      ...base,
      allowed: false,
      requiresConfirmation: false,
      reason: "Current permission profile cannot run terminal commands."
    };
  }

  if (isObviousDestructiveCommand(command) && !state.capabilities.canRunDestructiveCommands) {
    return {
      ...base,
      allowed: false,
      requiresConfirmation: false,
      reason: "Destructive terminal command is blocked by the current permission profile."
    };
  }

  const policy = classifyCommand(command, state);
  if (policy.classification === "blocked") {
    return {
      ...base,
      allowed: false,
      requiresConfirmation: false,
      reason: policy.reason
    };
  }

  const conservativeProfile = profile === "edit_with_review";
  return {
    ...base,
    allowed: true,
    requiresConfirmation: policy.classification === "needs_confirmation" || conservativeProfile,
    reason: policy.reason
  };
}

function evaluateSshAuthorization(state: PermissionState, context: AuthorizationContext): AuthorizationDecision {
  const allowedHost = context.sshHost ? state.allowedSshHosts.includes(context.sshHost) : false;
  const allowed = state.capabilities.canUseSSH && allowedHost;
  return {
    actionType: "ssh_command",
    profile: state.profile.id,
    command: context.command,
    filePath: context.filePath,
    sshHost: context.sshHost,
    allowed,
    requiresConfirmation: state.capabilities.requireConfirmationForSSH,
    reason: allowed
      ? "SSH command is allowed for configured host with confirmation policy."
      : "SSH is blocked or host is not in allowedSshHosts."
  };
}
