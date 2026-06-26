import * as vscode from "vscode";
import { AgentPanel } from "../panels/AgentPanel";

export function registerGenerateProposedChangesCommand(
  output: vscode.OutputChannel,
  agentPanel: AgentPanel
): vscode.Disposable {
  return vscode.commands.registerCommand("borger.generateProposedChanges", async () => {
    const task = await vscode.window.showInputBox({
      title: "Borger Generate Proposed Changes",
      prompt: "Describe the change Borger should propose for review.",
      ignoreFocusOut: true
    });

    if (!task) {
      return;
    }

    try {
      await agentPanel.focus();
      await agentPanel.generateProposedChanges(task);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`Generate proposed changes failed: ${message}`);
      await vscode.window.showErrorMessage(`Borger proposed changes failed: ${message}`);
    }
  });
}
