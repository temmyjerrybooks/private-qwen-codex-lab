import * as vscode from "vscode";
import { AgentPanel } from "../panels/AgentPanel";

export function registerClearProjectMemoryCommand(output: vscode.OutputChannel, agentPanel: AgentPanel): vscode.Disposable {
  return vscode.commands.registerCommand("borger.clearProjectMemory", async () => {
    try {
      await agentPanel.focus();
      await agentPanel.clearProjectMemory();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`Clear project memory failed: ${message}`);
      await vscode.window.showErrorMessage(`Borger Clear Project Memory failed: ${message}`);
    }
  });
}
