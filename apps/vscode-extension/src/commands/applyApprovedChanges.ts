import * as vscode from "vscode";
import { AgentPanel } from "../panels/AgentPanel";

export function registerApplyApprovedChangesCommand(
  output: vscode.OutputChannel,
  agentPanel: AgentPanel
): vscode.Disposable {
  return vscode.commands.registerCommand("borger.applyApprovedChanges", async () => {
    try {
      await agentPanel.focus();
      await agentPanel.applyApprovedChanges();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`Apply approved changes failed: ${message}`);
      await vscode.window.showErrorMessage(`Borger apply approved changes failed: ${message}`);
    }
  });
}
