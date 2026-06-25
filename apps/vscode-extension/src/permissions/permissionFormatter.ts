import { AuthorizationDecision } from "./authorization";
import { classifyCommand } from "./commandPolicy";
import { PermissionState } from "./permissionState";
import { ActionLogEntry } from "./actionLogger";

export function formatPermissionState(state: PermissionState, recentEntries: ActionLogEntry[] = []): string {
  const warning = state.warning ? `\nWarning: ${state.warning}\n` : "";
  const capabilities = Object.entries(state.capabilities)
    .map(([key, value]) => `  ${key}: ${value}`)
    .join("\n");
  const recent = recentEntries.length
    ? recentEntries
        .map((entry) => `  ${entry.timestamp} ${entry.actionType}: ${entry.allowed ? "allowed" : "blocked"} (${entry.reason})`)
        .join("\n")
    : "  No authorization decisions logged yet.";

  return [
    `Profile: ${state.profile.label} (${state.profile.id})`,
    `Description: ${state.profile.description}`,
    `Source: ${state.source}`,
    `Config: ${state.configUri}`,
    `Action log: ${state.actionLogUri}`,
    warning.trim(),
    "Capabilities:",
    capabilities,
    "",
    "Command Policy:",
    `  Allowed commands: ${state.allowedCommands.join(", ") || "none"}`,
    `  Blocked patterns: ${state.blockedCommandPatterns.join(", ") || "none"}`,
    `  Allowed SSH hosts: ${state.allowedSshHosts.join(", ") || "none"}`,
    "",
    "Command Policy Examples:",
    formatCommandPolicySummary(state),
    "",
    "Recent Authorization:",
    recent
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export function formatAuthorizationDecision(decision: AuthorizationDecision): string {
  return [
    `Action: ${decision.actionType}`,
    `Profile: ${decision.profile}`,
    `Allowed: ${decision.allowed}`,
    `Requires confirmation: ${decision.requiresConfirmation}`,
    `Reason: ${decision.reason}`,
    decision.command ? `Command: ${decision.command}` : "",
    decision.filePath ? `File: ${decision.filePath}` : "",
    decision.sshHost ? `SSH host: ${decision.sshHost}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatCommandPolicySummary(state: PermissionState): string {
  const sampleCommands = ["npm run build", "git push --force", "modal deploy infra/modal/modal_qwen_h200_sglang.py"];
  return sampleCommands
    .map((command) => {
      const result = classifyCommand(command, state);
      return `${command}: ${result.classification} (${result.reason})`;
    })
    .join("\n");
}
