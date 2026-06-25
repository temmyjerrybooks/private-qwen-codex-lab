import * as vscode from "vscode";
import { z } from "zod";
import {
  defaultAllowedCommands,
  defaultBlockedCommandPatterns,
  defaultPermissionProfile,
  isPermissionProfileId,
  PermissionCapabilities,
  PermissionProfileId
} from "./permissionProfiles";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const capabilitySchema = z
  .object({
    canReadWorkspace: z.boolean().optional(),
    canWriteWorkspace: z.boolean().optional(),
    canRunTerminal: z.boolean().optional(),
    canUseGit: z.boolean().optional(),
    canPushGitHub: z.boolean().optional(),
    canUseSSH: z.boolean().optional(),
    canDeploy: z.boolean().optional(),
    canRunDestructiveCommands: z.boolean().optional(),
    requireConfirmationForDestructive: z.boolean().optional(),
    requireConfirmationForGitPush: z.boolean().optional(),
    requireConfirmationForSSH: z.boolean().optional(),
    maxAutoFixLoops: z.number().int().min(0).max(50).optional()
  })
  .strict();

const localConfigSchema = z
  .object({
    profile: z
      .string()
      .refine(isPermissionProfileId, "Unknown permission profile")
      .optional(),
    capabilities: capabilitySchema.optional(),
    allowedCommands: z.array(z.string().min(1)).optional(),
    blockedCommandPatterns: z.array(z.string().min(1)).optional(),
    allowedSshHosts: z.array(z.string().min(1)).optional()
  })
  .strict();

export interface PermissionLocalConfig {
  profile?: PermissionProfileId;
  capabilities?: Partial<PermissionCapabilities>;
  allowedCommands?: string[];
  blockedCommandPatterns?: string[];
  allowedSshHosts?: string[];
}

export interface PermissionConfigLoadResult {
  config: PermissionLocalConfig;
  source: "default" | "local" | "malformed";
  uri: vscode.Uri;
  warning?: string;
}

export function getWorkspaceRoot(): vscode.Uri | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri;
}

export function requireWorkspaceRoot(): vscode.Uri {
  const root = getWorkspaceRoot();
  if (!root) {
    throw new Error("Open a workspace folder before using Borger permissions.");
  }
  return root;
}

export function getBorgerDirUri(): vscode.Uri {
  return vscode.Uri.joinPath(requireWorkspaceRoot(), ".borger");
}

export function getPermissionConfigUri(): vscode.Uri {
  return vscode.Uri.joinPath(getBorgerDirUri(), "permissions.local.json");
}

export function getActionLogUri(): vscode.Uri {
  return vscode.Uri.joinPath(getBorgerDirUri(), "action-log.jsonl");
}

export async function ensureBorgerDir(): Promise<void> {
  await vscode.workspace.fs.createDirectory(getBorgerDirUri());
}

export async function fileExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

export async function loadPermissionLocalConfig(): Promise<PermissionConfigLoadResult> {
  const uri = getPermissionConfigUri();
  if (!(await fileExists(uri))) {
    return {
      config: getDefaultLocalConfig(),
      source: "default",
      uri
    };
  }

  try {
    const raw = decoder.decode(await vscode.workspace.fs.readFile(uri));
    const parsed = localConfigSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      return {
        config: getDefaultLocalConfig(),
        source: "malformed",
        uri,
        warning: parsed.error.issues.map((issue) => issue.message).join("; ")
      };
    }
    return {
      config: normalizeLocalConfig(parsed.data),
      source: "local",
      uri
    };
  } catch (error) {
    return {
      config: getDefaultLocalConfig(),
      source: "malformed",
      uri,
      warning: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function createPermissionConfigTemplateIfMissing(): Promise<vscode.Uri> {
  await ensureBorgerDir();
  const uri = getPermissionConfigUri();
  if (await fileExists(uri)) {
    return uri;
  }
  await writePermissionLocalConfig(getDefaultLocalConfig());
  return uri;
}

export async function writePermissionLocalConfig(config: PermissionLocalConfig): Promise<void> {
  await ensureBorgerDir();
  const uri = getPermissionConfigUri();
  const normalized = normalizeLocalConfig(config);
  await vscode.workspace.fs.writeFile(uri, encoder.encode(`${JSON.stringify(normalized, null, 2)}\n`));
}

export async function updatePermissionProfile(profile: PermissionProfileId): Promise<vscode.Uri> {
  const loaded = await loadPermissionLocalConfig();
  await writePermissionLocalConfig({
    ...loaded.config,
    profile
  });
  return loaded.uri;
}

function getDefaultLocalConfig(): PermissionLocalConfig {
  const capabilities = getConfiguredCapabilityOverrides();
  return {
    profile: getConfiguredDefaultProfile(),
    ...(Object.keys(capabilities).length > 0 ? { capabilities } : {}),
    allowedCommands: defaultAllowedCommands,
    blockedCommandPatterns: defaultBlockedCommandPatterns,
    allowedSshHosts: []
  };
}

function normalizeLocalConfig(config: PermissionLocalConfig): PermissionLocalConfig {
  return {
    profile: config.profile ?? getConfiguredDefaultProfile(),
    ...(config.capabilities ? { capabilities: config.capabilities } : {}),
    allowedCommands: dedupe(config.allowedCommands ?? defaultAllowedCommands),
    blockedCommandPatterns: dedupe(config.blockedCommandPatterns ?? defaultBlockedCommandPatterns),
    allowedSshHosts: dedupe(config.allowedSshHosts ?? [])
  };
}

function getConfiguredDefaultProfile(): PermissionProfileId {
  const rawProfile = vscode.workspace.getConfiguration("borger").get("permissionProfile", defaultPermissionProfile);
  return isPermissionProfileId(rawProfile) ? rawProfile : defaultPermissionProfile;
}

function getConfiguredCapabilityOverrides(): Partial<PermissionCapabilities> {
  const config = vscode.workspace.getConfiguration("borger");
  const keys: Array<[keyof PermissionCapabilities, string]> = [
    ["canReadWorkspace", "canReadWorkspace"],
    ["canWriteWorkspace", "canWriteWorkspace"],
    ["canRunTerminal", "canRunTerminal"],
    ["canUseGit", "canUseGit"],
    ["canPushGitHub", "canPushGitHub"],
    ["canUseSSH", "canUseSSH"],
    ["canDeploy", "canDeploy"],
    ["canRunDestructiveCommands", "canRunDestructiveCommands"],
    ["requireConfirmationForDestructive", "requireConfirmationForDestructive"],
    ["requireConfirmationForGitPush", "requireConfirmationForGitPush"],
    ["requireConfirmationForSSH", "requireConfirmationForSSH"],
    ["maxAutoFixLoops", "maxAutoFixLoops"]
  ];

  const overrides: Partial<PermissionCapabilities> = {};
  for (const [capabilityKey, settingKey] of keys) {
    const inspection = config.inspect<boolean | number>(settingKey);
    const configuredValue =
      inspection?.workspaceFolderValue ?? inspection?.workspaceValue ?? inspection?.globalValue ?? undefined;
    if (configuredValue !== undefined) {
      (overrides as Record<string, boolean | number>)[capabilityKey] = configuredValue;
    }
  }
  return overrides;
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
