import * as vscode from "vscode";
import { AgentPanel } from "../panels/AgentPanel";

export function registerExplainLastErrorCommand(output: vscode.OutputChannel, agentPanel: AgentPanel): vscode.Disposable {
  return vscode.commands.registerCommand("borger.explainLastError", async () => {
    const task = await vscode.window.showInputBox({
      title: "Borger Explain Last Error",
      prompt: "Optional: add what you want Borger to focus on while explaining the latest error.",
      ignoreFocusOut: true
    });

    if (task === undefined) {
      return;
    }

    try {
      await agentPanel.focus();
      await agentPanel.explainLastError(task);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`Explain last error failed: ${message}`);
      await vscode.window.showErrorMessage(`Borger Explain Last Error failed: ${message}`);
    }
  });
}
