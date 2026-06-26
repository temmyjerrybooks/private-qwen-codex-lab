import * as vscode from "vscode";
import { AgentPanel } from "../panels/AgentPanel";

export function registerRunAgentTaskCommand(output: vscode.OutputChannel, agentPanel: AgentPanel): vscode.Disposable {
  return vscode.commands.registerCommand("borger.runAgentTask", async () => {
    const task = await vscode.window.showInputBox({
      title: "Borger Run Agent Task",
      prompt: "Describe the task. Borger will generate proposed changes for review before any approved apply step.",
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
      output.appendLine(`Run Agent Task failed: ${message}`);
      await vscode.window.showErrorMessage(`Borger run task failed: ${message}`);
    }
  });
}
