import { AutoModeRunState } from "../agent/autoTypes";

export function formatAutoModeStateForOutput(state: AutoModeRunState): string {
  const timeline = state.timeline
    .slice(-20)
    .map((entry) => `- [${entry.status}] loop ${entry.loop} ${entry.state}: ${entry.title}${entry.detail ? ` - ${entry.detail}` : ""}`)
    .join("\n");
  const pending = state.pendingStats
    ? `${state.pendingStats.pending} pending, ${state.pendingStats.approved} approved, ${state.pendingStats.applied} applied, ${state.pendingStats.invalid} invalid`
    : "none";
  const commands = state.commandsRun
    .map((command) => `- ${command.command}: ${command.status}${command.exitCode === undefined ? "" : ` (${command.exitCode})`}`)
    .join("\n");
  const summary = state.summary
    ? [
        `Final status: ${state.summary.finalStatus}`,
        `Started: ${state.summary.startedAt}`,
        `Ended: ${state.summary.endedAt}`,
        `Loops: ${state.summary.loops}`,
        `Files changed: ${state.summary.filesChanged.join(", ") || "none"}`,
        `Errors fixed: ${state.summary.errorsFixed}`,
        `Remaining errors: ${state.summary.remainingErrors}`,
        `Recommended next action: ${state.summary.recommendedNextAction}`
      ].join("\n")
    : "No final summary yet.";

  return [
    "Borger Auto Mode",
    `Task: ${state.task || "none"}`,
    `State: ${state.status}`,
    `Loop: ${state.currentLoop}/${state.maxLoops}`,
    `Pending changes: ${pending}`,
    `Diagnostics: ${state.diagnostics ? `${state.diagnostics.errorCount} errors, ${state.diagnostics.warningCount} warnings` : "not collected"}`,
    "",
    "Commands run:",
    commands || "- none",
    "",
    "Timeline:",
    timeline || "- none",
    "",
    "Summary:",
    summary
  ].join("\n");
}
