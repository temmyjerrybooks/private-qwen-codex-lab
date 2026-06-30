import * as vscode from "vscode";
import { AgentPanel } from "../panels/AgentPanel";

export function registerShowProjectMemoryCommand(output: vscode.OutputChannel, agentPanel: AgentPanel): vscode.Disposable {
  return vscode.commands.registerCommand("borger.showProjectMemory", async () => {
    try {
      await agentPanel.focus();
      await agentPanel.showProjectMemory();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`Show project memory failed: ${message}`);
      await vscode.window.showErrorMessage(`Borger Show Project Memory failed: ${message}`);
    }
  });
}
