import * as vscode from "vscode";

export function getDiagnosticsCount(): number {
  return vscode.languages.getDiagnostics().reduce((count, [, diagnostics]) => count + diagnostics.length, 0);
}
