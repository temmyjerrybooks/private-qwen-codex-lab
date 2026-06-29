import * as vscode from "vscode";
import { AgentPanel } from "../panels/AgentPanel";

export function registerCreateGitBranchCommand(output: vscode.OutputChannel, agentPanel: AgentPanel): vscode.Disposable {
  return vscode.commands.registerCommand("borger.createGitBranch", async () => {
    const branchName = await vscode.window.showInputBox({
      title: "Borger Create Git Branch",
      prompt: "Enter a safe new branch name.",
      ignoreFocusOut: true
    });
    if (!branchName) {
      return;
    }
    try {
      await agentPanel.focus();
      await agentPanel.createGitBranch(branchName);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`Create git branch failed: ${message}`);
      await vscode.window.showErrorMessage(`Borger Create Git Branch failed: ${message}`);
    }
  });
}
