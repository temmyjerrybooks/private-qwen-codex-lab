import { RemoteCommandResult, RemoteInspectionResult, RemoteOpsState } from "../remote/remoteTypes";

export function formatRemoteOpsStateForOutput(state: RemoteOpsState): string {
  const hosts = state.config.config.hosts
    .map((host) => `- ${host.enabled ? "enabled" : "disabled"} ${host.id}: ${host.label} (${host.username ? `${host.username}@` : ""}${host.host}:${host.port}) cwd=${host.defaultRemoteCwd}`)
    .join("\n");
  const history = state.history.slice(0, 8).map(formatRemoteResultSummary).join("\n");
  const inspection = state.latestInspection ? formatRemoteInspectionForOutput(state.latestInspection) : "none";

  return [
    "Borger Remote Ops",
    `Config: ${state.config.uri}`,
    `Source: ${state.config.source}${state.config.warning ? ` (${state.config.warning})` : ""}`,
    "",
    "Hosts:",
    hosts || "- none configured",
    "",
    "Latest Result:",
    state.latestResult ? formatRemoteCommandResultForOutput(state.latestResult) : "none",
    "",
    "Latest Inspection:",
    inspection,
    "",
    "History:",
    history || "none"
  ].join("\n");
}

export function formatRemoteCommandResultForOutput(result: RemoteCommandResult): string {
  return [
    `Remote command: ${result.command}`,
    `Host: ${result.hostLabel} (${result.sshHost})`,
    `Remote cwd: ${result.remoteCwd}`,
    `Status: ${result.status}`,
    `Exit: ${result.exitCode ?? "n/a"}`,
    `Duration: ${result.durationMs ?? 0}ms`,
    `Reason: ${result.reason}`,
    result.stdout ? `STDOUT:\n${result.stdout}` : "STDOUT: none",
    result.stderr ? `STDERR:\n${result.stderr}` : "STDERR: none",
    result.suggestedNextStep ? `Next: ${result.suggestedNextStep}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatRemoteHistoryForOutput(history: RemoteCommandResult[]): string {
  if (history.length === 0) {
    return "No remote commands run this session.";
  }
  return history.map(formatRemoteResultSummary).join("\n");
}

export function formatRemoteInspectionForOutput(inspection: RemoteInspectionResult): string {
  return [
    `Remote inspection: ${inspection.hostLabel}`,
    `Remote cwd: ${inspection.remoteCwd}`,
    `Inspected: ${inspection.inspectedAt}`,
    inspection.summary,
    "",
    inspection.results.map(formatRemoteResultSummary).join("\n")
  ].join("\n");
}

function formatRemoteResultSummary(result: RemoteCommandResult): string {
  return `- ${result.status} ${result.hostId}:${result.remoteCwd}$ ${result.command}${result.exitCode === undefined ? "" : ` (exit ${result.exitCode})`}`;
}
