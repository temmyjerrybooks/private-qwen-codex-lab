import {
  getPermissionProfile,
  mergeCapabilities,
  PermissionCapabilities,
  PermissionProfileDefinition
} from "./permissionProfiles";
import {
  getActionLogUri,
  loadPermissionLocalConfig,
  PermissionConfigLoadResult
} from "./permissionConfig";

export interface PermissionState {
  profile: PermissionProfileDefinition;
  capabilities: PermissionCapabilities;
  allowedCommands: string[];
  blockedCommandPatterns: string[];
  allowedSshHosts: string[];
  configUri: string;
  actionLogUri: string;
  source: PermissionConfigLoadResult["source"];
  warning?: string;
}

export async function loadPermissionState(): Promise<PermissionState> {
  const loaded = await loadPermissionLocalConfig();
  const profile = getPermissionProfile(loaded.config.profile ?? "edit_with_review");
  const capabilities = mergeCapabilities(profile.capabilities, loaded.config.capabilities);

  return {
    profile,
    capabilities,
    allowedCommands: loaded.config.allowedCommands ?? [],
    blockedCommandPatterns: loaded.config.blockedCommandPatterns ?? [],
    allowedSshHosts: loaded.config.allowedSshHosts ?? [],
    configUri: loaded.uri.fsPath,
    actionLogUri: getActionLogUri().fsPath,
    source: loaded.source,
    warning: loaded.warning
  };
}
