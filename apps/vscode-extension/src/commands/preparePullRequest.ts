import * as vscode from "vscode";
import { AgentPanel } from "../panels/AgentPanel";

export function registerPreparePullRequestCommand(output: vscode.OutputChannel, agentPanel: AgentPanel): vscode.Disposable {
  return vscode.commands.registerCommand("borger.preparePullRequest", async () => {
    try {
      await agentPanel.focus();
      await agentPanel.preparePullRequest();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`Prepare pull request failed: ${message}`);
      await vscode.window.showErrorMessage(`Borger Prepare Pull Request failed: ${message}`);
    }
  });
}
