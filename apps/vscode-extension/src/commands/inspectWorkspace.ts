import * as vscode from "vscode";
import { buildWorkspaceContext, formatWorkspaceContextForOutput } from "../agent/contextBuilder";
import { assertAuthorized, authorizeAction } from "../permissions/authorization";

export function registerInspectWorkspaceCommand(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel
): vscode.Disposable {
  return vscode.commands.registerCommand("borger.inspectWorkspace", async () => {
    try {
      const decision = await authorizeAction("read_workspace");
      assertAuthorized(decision);
      const summary = await buildWorkspaceContext(context);
      output.show(true);
      output.appendLine("Workspace context:");
      output.appendLine(formatWorkspaceContextForOutput(summary));
      await vscode.window.showInformationMessage(
        `Borger inspected ${summary.workspaceName}: ${summary.fileCount} safe files, ${summary.diagnosticsCount} diagnostics.`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.show(true);
      output.appendLine(`Workspace inspection blocked: ${message}`);
      await vscode.window.showErrorMessage(`Borger workspace inspection blocked: ${message}`);
    }
  });
}
