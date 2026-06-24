import * as vscode from "vscode";

export function registerAskAboutFileCommand(): vscode.Disposable {
  return vscode.commands.registerCommand("borger.askAboutFile", async () => {
    await vscode.window.showInformationMessage("Ask mode is reserved for a later phase.");
  });
}
