import * as vscode from "vscode";
import { assertAuthorized, authorizeAction } from "../permissions/authorization";
import { inspectWorkspace } from "../tools/workspace";

export function registerInspectWorkspaceCommand(output: vscode.OutputChannel): vscode.Disposable {
  return vscode.commands.registerCommand("borger.inspectWorkspace", async () => {
    try {
      const decision = await authorizeAction("read_workspace");
      assertAuthorized(decision);
      const summary = await inspectWorkspace();
      output.show(true);
      output.appendLine("Workspace summary:");
      output.appendLine(JSON.stringify(summary, null, 2));
      await vscode.window.showInformationMessage(`Borger inspected ${summary.workspaceName}: ${summary.fileCount} files sampled.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.show(true);
      output.appendLine(`Workspace inspection blocked: ${message}`);
      await vscode.window.showErrorMessage(`Borger workspace inspection blocked: ${message}`);
    }
  });
}
