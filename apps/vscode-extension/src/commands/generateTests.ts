import * as vscode from "vscode";

export function registerGenerateTestsCommand(): vscode.Disposable {
  return vscode.commands.registerCommand("borger.generateTests", async () => {
    await vscode.window.showInformationMessage("Generate Tests is reserved for Edit Mode.");
  });
}
