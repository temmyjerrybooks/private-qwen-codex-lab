import * as vscode from "vscode";
import { AgentPanel } from "../panels/AgentPanel";

export function registerGenerateCommitMessageCommand(
  output: vscode.OutputChannel,
  agentPanel: AgentPanel
): vscode.Disposable {
  return vscode.commands.registerCommand("borger.generateCommitMessage", async () => {
    try {
      await agentPanel.focus();
      await agentPanel.generateGitCommitMessage();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`Generate commit message failed: ${message}`);
      const manual = await vscode.window.showInputBox({
        title: "Manual Commit Message",
        prompt: "Provider-based generation failed. Enter a commit message manually.",
        ignoreFocusOut: true
      });
      if (manual) {
        await agentPanel.setGitCommitMessage(manual);
      } else {
        await vscode.window.showErrorMessage(`Borger commit message generation failed: ${message}`);
      }
    }
  });
}
