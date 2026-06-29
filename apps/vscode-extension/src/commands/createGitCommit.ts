import * as vscode from "vscode";
import { getGitWorkflowState } from "../git/gitWorkflow";
import { AgentPanel } from "../panels/AgentPanel";

export function registerCreateGitCommitCommand(output: vscode.OutputChannel, agentPanel: AgentPanel): vscode.Disposable {
  return vscode.commands.registerCommand("borger.createGitCommit", async () => {
    const existing = getGitWorkflowState().generatedCommitMessage;
    const message = await vscode.window.showInputBox({
      title: "Borger Create Git Commit",
      prompt: "Confirm or enter the commit message.",
      value: existing,
      ignoreFocusOut: true
    });
    if (!message) {
      return;
    }
    try {
      await agentPanel.focus();
      await agentPanel.createGitCommit(message);
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      output.appendLine(`Create git commit failed: ${text}`);
      await vscode.window.showErrorMessage(`Borger Create Git Commit failed: ${text}`);
    }
  });
}
