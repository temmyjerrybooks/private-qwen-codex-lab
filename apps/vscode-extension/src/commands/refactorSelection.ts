import * as vscode from "vscode";

export function registerRefactorSelectionCommand(): vscode.Disposable {
  return vscode.commands.registerCommand("borger.refactorSelection", async () => {
    await vscode.window.showInformationMessage("Refactor Selection is reserved for Edit Mode.");
  });
}
