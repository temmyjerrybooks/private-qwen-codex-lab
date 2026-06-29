import * as vscode from "vscode";
import { AgentPanel } from "../panels/AgentPanel";

export function registerGitStatusCommand(output: vscode.OutputChannel, agentPanel: AgentPanel): vscode.Disposable {
  return vscode.commands.registerCommand("borger.gitStatus", async () => {
    try {
      await agentPanel.focus();
      await agentPanel.refreshGitStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`Git status failed: ${message}`);
      await vscode.window.showErrorMessage(`Borger Git Status failed: ${message}`);
    }
  });
}
