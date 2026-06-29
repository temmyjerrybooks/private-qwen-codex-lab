import * as vscode from "vscode";
import { AgentPanel } from "../panels/AgentPanel";

export function registerShowRemoteHistoryCommand(output: vscode.OutputChannel, agentPanel: AgentPanel): vscode.Disposable {
  return vscode.commands.registerCommand("borger.showRemoteHistory", async () => {
    try {
      await agentPanel.focus();
      await agentPanel.showRemoteHistory();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`Show remote history failed: ${message}`);
      await vscode.window.showErrorMessage(`Borger Show Remote History failed: ${message}`);
    }
  });
}
