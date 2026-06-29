import * as vscode from "vscode";
import { AgentPanel } from "../panels/AgentPanel";

export function registerInspectRemoteProjectCommand(output: vscode.OutputChannel, agentPanel: AgentPanel): vscode.Disposable {
  return vscode.commands.registerCommand("borger.inspectRemoteProject", async () => {
    try {
      await agentPanel.focus();
      await agentPanel.inspectRemoteProject();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`Inspect remote project failed: ${message}`);
      await vscode.window.showErrorMessage(`Borger Inspect Remote Project failed: ${message}`);
    }
  });
}
