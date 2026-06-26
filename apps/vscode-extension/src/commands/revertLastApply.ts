import * as vscode from "vscode";
import { AgentPanel } from "../panels/AgentPanel";

export function registerRevertLastApplyCommand(
  output: vscode.OutputChannel,
  agentPanel: AgentPanel
): vscode.Disposable {
  return vscode.commands.registerCommand("borger.revertLastApply", async () => {
    try {
      await agentPanel.focus();
      await agentPanel.revertLastApply();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`Revert last apply failed: ${message}`);
      await vscode.window.showErrorMessage(`Borger revert last apply failed: ${message}`);
    }
  });
}
