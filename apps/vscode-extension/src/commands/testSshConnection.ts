import * as vscode from "vscode";
import { AgentPanel } from "../panels/AgentPanel";

export function registerTestSshConnectionCommand(output: vscode.OutputChannel, agentPanel: AgentPanel): vscode.Disposable {
  return vscode.commands.registerCommand("borger.testSshConnection", async () => {
    try {
      await agentPanel.focus();
      await agentPanel.testSshConnection();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`Test SSH connection failed: ${message}`);
      await vscode.window.showErrorMessage(`Borger Test SSH Connection failed: ${message}`);
    }
  });
}
