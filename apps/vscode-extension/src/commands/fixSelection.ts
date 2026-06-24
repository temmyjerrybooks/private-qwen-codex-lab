import * as vscode from "vscode";

export function registerFixSelectionCommand(): vscode.Disposable {
  return vscode.commands.registerCommand("borger.fixSelection", async () => {
    await vscode.window.showInformationMessage("Fix Selection is reserved for Fix Mode.");
  });
}
