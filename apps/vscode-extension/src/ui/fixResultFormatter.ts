import { FixModeResult } from "../agent/fixMode";
import { summarizeDiagnosticsByFile } from "../tools/diagnostics";
import { formatPendingChangesForOutput } from "./diffProvider";

export function formatFixModeResultForOutput(result: FixModeResult): string {
  const diagnostics = summarizeDiagnosticsByFile(result.diagnostics)
    .slice(0, 8)
    .map((file) => `- ${file.path}: ${file.errors} errors, ${file.warnings} warnings, ${file.total} total`)
    .join("\n");
  const failedCommand = result.failedCommand
    ? [
        `Command: ${result.failedCommand.command}`,
        `Exit: ${result.failedCommand.exitCode ?? "unknown"}`,
        `Reason: ${result.failedCommand.reason}`
      ].join("\n")
    : "none";

  return [
    `Borger ${result.title}`,
    `Generated: ${result.generatedAt}`,
    `Source: ${result.source}`,
    `Summary: ${result.summary}`,
    "",
    "Diagnostics:",
    diagnostics || "- none",
    "",
    "Failed command:",
    failedCommand,
    "",
    result.explanation ? `Explanation:\n${result.explanation}` : "",
    result.changeSet ? formatPendingChangesForOutput(result.changeSet) : ""
  ]
    .filter(Boolean)
    .join("\n");
}
