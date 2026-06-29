import { TerminalCommandResult } from "../terminal/commandTypes";

export function formatCommandResultForOutput(result: TerminalCommandResult): string {
  return [
    `${result.status.toUpperCase()} ${result.command}`,
    `CWD: ${result.cwd}`,
    `Mode: ${result.mode}`,
    `Started: ${result.startedAt}`,
    result.endedAt ? `Ended: ${result.endedAt}` : "",
    result.durationMs !== undefined ? `Duration: ${result.durationMs}ms` : "",
    result.exitCode !== undefined ? `Exit code: ${result.exitCode}` : "",
    `Authorization: ${result.authorizationDecision.allowed ? "allowed" : "blocked"} (${result.authorizationDecision.reason})`,
    `Reason: ${result.reason}`,
    result.suggestedNextStep ? `Next: ${result.suggestedNextStep}` : "",
    result.stdout ? `\nSTDOUT:\n${result.stdout}` : "",
    result.stderr ? `\nSTDERR:\n${result.stderr}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatCommandHistoryForOutput(history: TerminalCommandResult[]): string {
  if (history.length === 0) {
    return "No Borger terminal command history for this VS Code session.";
  }

  return history.map(formatCommandResultForOutput).join("\n\n---\n\n");
}
