import * as vscode from "vscode";
import { AgentPanel } from "../panels/AgentPanel";

export function registerPushGitBranchCommand(output: vscode.OutputChannel, agentPanel: AgentPanel): vscode.Disposable {
  return vscode.commands.registerCommand("borger.pushGitBranch", async () => {
    try {
      await agentPanel.focus();
      await agentPanel.pushGitBranch();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`Push git branch failed: ${message}`);
      await vscode.window.showErrorMessage(`Borger Push Git Branch failed: ${message}`);
    }
  });
}
