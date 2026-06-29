import * as vscode from "vscode";
import { toWorkspaceRelativePath } from "./fileTree";

export interface DiagnosticContextItem {
  path: string;
  severity: "error" | "warning" | "information" | "hint";
  message: string;
  source?: string;
  range: {
    startLine: number;
    startCharacter: number;
    endLine: number;
    endCharacter: number;
  };
}

export interface DiagnosticsSummary {
  total: number;
  errorCount: number;
  warningCount: number;
  informationCount: number;
  hintCount: number;
  items: DiagnosticContextItem[];
  truncated: boolean;
}

export function getDiagnosticsCount(): number {
  return vscode.languages.getDiagnostics().reduce((count, [, diagnostics]) => count + diagnostics.length, 0);
}

export function collectDiagnostics(
  workspaceFolder: vscode.WorkspaceFolder | undefined,
  maxItems = 30
): DiagnosticsSummary {
  const allDiagnostics = vscode.languages.getDiagnostics();
  const items: DiagnosticContextItem[] = [];
  let total = 0;
  let errorCount = 0;
  let warningCount = 0;
  let informationCount = 0;
  let hintCount = 0;

  for (const [uri, diagnostics] of allDiagnostics) {
    const filePath = workspaceFolder ? toWorkspaceRelativePath(workspaceFolder, uri) : uri.fsPath;
    if (workspaceFolder && filePath.startsWith("..")) {
      continue;
    }

    for (const diagnostic of diagnostics) {
      total += 1;
      const severity = mapSeverity(diagnostic.severity);
      if (severity === "error") {
        errorCount += 1;
      } else if (severity === "warning") {
        warningCount += 1;
      } else if (severity === "information") {
        informationCount += 1;
      } else {
        hintCount += 1;
      }

      if (items.length < maxItems) {
        items.push({
          path: filePath,
          severity,
          message: diagnostic.message,
          source: diagnostic.source,
          range: {
            startLine: diagnostic.range.start.line + 1,
            startCharacter: diagnostic.range.start.character + 1,
            endLine: diagnostic.range.end.line + 1,
            endCharacter: diagnostic.range.end.character + 1
          }
        });
      }
    }
  }

  return {
    total,
    errorCount,
    warningCount,
    informationCount,
    hintCount,
    items,
    truncated: total > items.length
  };
}

export function collectDiagnosticsForPath(
  workspaceFolder: vscode.WorkspaceFolder | undefined,
  relativePath: string,
  maxItems = 20
): DiagnosticsSummary {
  const allDiagnostics = collectDiagnostics(workspaceFolder, Number.MAX_SAFE_INTEGER);
  const allItems = prioritizeDiagnostics(allDiagnostics.items.filter((item) => item.path === relativePath));
  return summarizeDiagnosticItems(allItems.slice(0, maxItems), allItems.length, allItems.length > maxItems);
}

export function prioritizeDiagnostics(items: DiagnosticContextItem[]): DiagnosticContextItem[] {
  return [...items].sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || a.path.localeCompare(b.path));
}

export function summarizeDiagnosticsByFile(summary: DiagnosticsSummary): Array<{
  path: string;
  total: number;
  errors: number;
  warnings: number;
}> {
  const byFile = new Map<string, { path: string; total: number; errors: number; warnings: number }>();
  for (const item of summary.items) {
    const current = byFile.get(item.path) ?? { path: item.path, total: 0, errors: 0, warnings: 0 };
    current.total += 1;
    if (item.severity === "error") {
      current.errors += 1;
    }
    if (item.severity === "warning") {
      current.warnings += 1;
    }
    byFile.set(item.path, current);
  }
  return [...byFile.values()].sort((a, b) => b.errors - a.errors || b.warnings - a.warnings || a.path.localeCompare(b.path));
}

function mapSeverity(severity: vscode.DiagnosticSeverity): DiagnosticContextItem["severity"] {
  switch (severity) {
    case vscode.DiagnosticSeverity.Error:
      return "error";
    case vscode.DiagnosticSeverity.Warning:
      return "warning";
    case vscode.DiagnosticSeverity.Information:
      return "information";
    case vscode.DiagnosticSeverity.Hint:
      return "hint";
  }
}

function summarizeDiagnosticItems(items: DiagnosticContextItem[], total: number, truncated: boolean): DiagnosticsSummary {
  return {
    total,
    errorCount: items.filter((item) => item.severity === "error").length,
    warningCount: items.filter((item) => item.severity === "warning").length,
    informationCount: items.filter((item) => item.severity === "information").length,
    hintCount: items.filter((item) => item.severity === "hint").length,
    items,
    truncated
  };
}

function severityRank(severity: DiagnosticContextItem["severity"]): number {
  switch (severity) {
    case "error":
      return 0;
    case "warning":
      return 1;
    case "information":
      return 2;
    case "hint":
      return 3;
  }
}
