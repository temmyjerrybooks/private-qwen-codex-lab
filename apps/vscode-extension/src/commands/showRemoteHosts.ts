import * as vscode from "vscode";
import { AgentPanel } from "../panels/AgentPanel";

export function registerShowRemoteHostsCommand(output: vscode.OutputChannel, agentPanel: AgentPanel): vscode.Disposable {
  return vscode.commands.registerCommand("borger.showRemoteHosts", async () => {
    try {
      await agentPanel.focus();
      await agentPanel.showRemoteHosts();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`Show remote hosts failed: ${message}`);
      await vscode.window.showErrorMessage(`Borger Show Remote Hosts failed: ${message}`);
    }
  });
}
