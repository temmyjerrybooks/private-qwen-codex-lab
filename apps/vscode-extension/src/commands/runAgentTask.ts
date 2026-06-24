import * as vscode from "vscode";

export function registerRunAgentTaskCommand(): vscode.Disposable {
  return vscode.commands.registerCommand("borger.runAgentTask", async () => {
    await vscode.window.showInformationMessage("Run Agent Task is reserved for Auto Mode.");
  });
}
