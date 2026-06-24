import * as vscode from "vscode";

export function registerExplainSelectionCommand(): vscode.Disposable {
  return vscode.commands.registerCommand("borger.explainSelection", async () => {
    await vscode.window.showInformationMessage("Explain Selection is reserved for a later phase.");
  });
}
