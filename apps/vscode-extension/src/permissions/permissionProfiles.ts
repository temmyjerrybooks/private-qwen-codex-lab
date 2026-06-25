export const permissionProfileIds = [
  "read_only",
  "plan_only",
  "edit_with_review",
  "trusted_workspace",
  "full_auto",
  "remote_ops"
] as const;

export type PermissionProfileId = (typeof permissionProfileIds)[number];

export interface PermissionCapabilities {
  canReadWorkspace: boolean;
  canWriteWorkspace: boolean;
  canRunTerminal: boolean;
  canUseGit: boolean;
  canPushGitHub: boolean;
  canUseSSH: boolean;
  canDeploy: boolean;
  canRunDestructiveCommands: boolean;
  requireConfirmationForDestructive: boolean;
  requireConfirmationForGitPush: boolean;
  requireConfirmationForSSH: boolean;
  maxAutoFixLoops: number;
}

export interface PermissionProfileDefinition {
  id: PermissionProfileId;
  label: string;
  description: string;
  capabilities: PermissionCapabilities;
}

export const defaultPermissionProfile: PermissionProfileId = "edit_with_review";

export const defaultAllowedCommands = [
  "npm",
  "pnpm",
  "yarn",
  "node",
  "python",
  "pip",
  "git",
  "gh",
  "modal",
  "docker"
];

export const defaultBlockedCommandPatterns = [
  "rm -rf",
  "git reset --hard",
  "git push --force",
  "format",
  "shutdown",
  "del /s",
  "remove-item -recurse -force"
];

export const permissionProfiles: Record<PermissionProfileId, PermissionProfileDefinition> = {
  read_only: {
    id: "read_only",
    label: "Read Only",
    description: "Inspect and explain only. No edits, terminal writes, git writes, SSH, or deploys.",
    capabilities: {
      canReadWorkspace: true,
      canWriteWorkspace: false,
      canRunTerminal: false,
      canUseGit: true,
      canPushGitHub: false,
      canUseSSH: false,
      canDeploy: false,
      canRunDestructiveCommands: false,
      requireConfirmationForDestructive: true,
      requireConfirmationForGitPush: true,
      requireConfirmationForSSH: true,
      maxAutoFixLoops: 0
    }
  },
  plan_only: {
    id: "plan_only",
    label: "Plan Only",
    description: "Inspect workspace and create implementation plans without edits or commands.",
    capabilities: {
      canReadWorkspace: true,
      canWriteWorkspace: false,
      canRunTerminal: false,
      canUseGit: true,
      canPushGitHub: false,
      canUseSSH: false,
      canDeploy: false,
      canRunDestructiveCommands: false,
      requireConfirmationForDestructive: true,
      requireConfirmationForGitPush: true,
      requireConfirmationForSSH: true,
      maxAutoFixLoops: 0
    }
  },
  edit_with_review: {
    id: "edit_with_review",
    label: "Edit With Review",
    description: "Default profile. Allows reviewed workspace edits and safe read-only commands.",
    capabilities: {
      canReadWorkspace: true,
      canWriteWorkspace: true,
      canRunTerminal: true,
      canUseGit: true,
      canPushGitHub: false,
      canUseSSH: false,
      canDeploy: false,
      canRunDestructiveCommands: false,
      requireConfirmationForDestructive: true,
      requireConfirmationForGitPush: true,
      requireConfirmationForSSH: true,
      maxAutoFixLoops: 5
    }
  },
  trusted_workspace: {
    id: "trusted_workspace",
    label: "Trusted Workspace",
    description: "Allows workspace edits and safe project commands, with confirmation for risky actions.",
    capabilities: {
      canReadWorkspace: true,
      canWriteWorkspace: true,
      canRunTerminal: true,
      canUseGit: true,
      canPushGitHub: true,
      canUseSSH: false,
      canDeploy: true,
      canRunDestructiveCommands: false,
      requireConfirmationForDestructive: true,
      requireConfirmationForGitPush: true,
      requireConfirmationForSSH: true,
      maxAutoFixLoops: 5
    }
  },
  full_auto: {
    id: "full_auto",
    label: "Full Auto",
    description: "Allows plan/edit/test/fix loops, while still requiring confirmation for destructive actions.",
    capabilities: {
      canReadWorkspace: true,
      canWriteWorkspace: true,
      canRunTerminal: true,
      canUseGit: true,
      canPushGitHub: false,
      canUseSSH: false,
      canDeploy: false,
      canRunDestructiveCommands: false,
      requireConfirmationForDestructive: true,
      requireConfirmationForGitPush: true,
      requireConfirmationForSSH: true,
      maxAutoFixLoops: 5
    }
  },
  remote_ops: {
    id: "remote_ops",
    label: "Remote Ops",
    description: "Allows configured SSH/deploy workflows against allowed hosts, with strict logging.",
    capabilities: {
      canReadWorkspace: true,
      canWriteWorkspace: true,
      canRunTerminal: true,
      canUseGit: true,
      canPushGitHub: true,
      canUseSSH: true,
      canDeploy: true,
      canRunDestructiveCommands: false,
      requireConfirmationForDestructive: true,
      requireConfirmationForGitPush: true,
      requireConfirmationForSSH: true,
      maxAutoFixLoops: 5
    }
  }
};

export function isPermissionProfileId(value: unknown): value is PermissionProfileId {
  return typeof value === "string" && permissionProfileIds.includes(value as PermissionProfileId);
}

export function getPermissionProfile(profileId: PermissionProfileId): PermissionProfileDefinition {
  return permissionProfiles[profileId];
}

export function mergeCapabilities(
  base: PermissionCapabilities,
  overrides?: Partial<PermissionCapabilities>
): PermissionCapabilities {
  return {
    ...base,
    ...removeUndefined(overrides)
  };
}

function removeUndefined<T extends object>(value: T | undefined): Partial<T> {
  if (!value) {
    return {};
  }
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as Partial<T>;
}
