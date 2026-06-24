import * as vscode from "vscode";
import { inspectWorkspace } from "../tools/workspace";

export function registerInspectWorkspaceCommand(output: vscode.OutputChannel): vscode.Disposable {
  return vscode.commands.registerCommand("borger.inspectWorkspace", async () => {
    const summary = await inspectWorkspace();
    output.show(true);
    output.appendLine("Workspace summary:");
    output.appendLine(JSON.stringify(summary, null, 2));
    await vscode.window.showInformationMessage(`Borger inspected ${summary.workspaceName}: ${summary.fileCount} files sampled.`);
  });
}
