import { ProviderStatusReport } from "./types";

export function formatProviderReport(report: ProviderStatusReport): string {
  const state = report.state;
  const budget = report.budget;
  const paused = state.pauseReason ? `, reason: ${state.pauseReason}` : "";
  const eligible = report.eligible ? "eligible" : `blocked: ${report.reason ?? "unknown"}`;
  return [
    `${report.provider.label} (${report.provider.id})`,
    `  owner: ${report.provider.owner}`,
    `  status: ${state.status} (${eligible})`,
    `  usage: ${state.currentUsagePercent.toFixed(2)}% / ${report.provider.stopPercent}% stop`,
    `  spend: $${budget.spendUsd.toFixed(4)} / $${report.provider.monthlyBudgetUsd.toFixed(2)} (${budget.strategy})`,
    `  reset: ${state.nextResetAt}`,
    `  lazy activation: ${report.provider.lazyActivation ? "enabled" : "disabled"}${paused}`
  ].join("\n");
}

export function formatProviderReports(reports: ProviderStatusReport[]): string {
  if (reports.length === 0) {
    return "No enabled Borger providers are configured.";
  }
  return reports.map(formatProviderReport).join("\n\n");
}
