import { PendingChangeSet } from "../agent/pendingChanges";

export function formatPendingChangesForOutput(changeSet: PendingChangeSet | undefined): string {
  if (!changeSet) {
    return "No pending changes.";
  }

  const files = changeSet.changes
    .map((change) => [
      `${change.status.toUpperCase()} ${change.action.toUpperCase()} ${change.path}`,
      `Reason: ${change.reason}`,
      change.warning ? `Warning: ${change.warning}` : "",
      change.invalidReason ? `Invalid: ${change.invalidReason}` : "",
      change.diff ? `Diff:\n${change.diff}` : "No diff available."
    ].filter(Boolean).join("\n"))
    .join("\n\n---\n\n");

  const commands = changeSet.commandsToRunLater
    .map((command) => `- ${command.command}: ${command.reason}`)
    .join("\n");
  const risks = changeSet.risks.map((risk) => `- ${risk}`).join("\n");

  return [
    `Pending changes for: ${changeSet.task}`,
    `Summary: ${changeSet.summary}`,
    `Generated: ${changeSet.generatedAt}`,
    "",
    files,
    "",
    "Commands suggested for later:",
    commands || "- none",
    "",
    "Risks:",
    risks || "- none"
  ].join("\n");
}

export function diffProviderUnavailable(): string {
  return "Diff preview is available in the Borger webview for pending Phase 6 changes.";
}
