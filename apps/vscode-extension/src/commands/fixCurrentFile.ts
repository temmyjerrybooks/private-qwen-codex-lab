import * as vscode from "vscode";
import { AgentPanel } from "../panels/AgentPanel";

export function registerFixCurrentFileCommand(output: vscode.OutputChannel, agentPanel: AgentPanel): vscode.Disposable {
  return vscode.commands.registerCommand("borger.fixCurrentFile", async () => {
    const task = await vscode.window.showInputBox({
      title: "Borger Fix Current File",
      prompt: "Optional: describe what should be fixed in the active file or selection.",
      ignoreFocusOut: true
    });

    if (task === undefined) {
      return;
    }

    try {
      await agentPanel.focus();
      await agentPanel.fixCurrentFile(task);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`Fix current file failed: ${message}`);
      await vscode.window.showErrorMessage(`Borger Fix Current File failed: ${message}`);
    }
  });
}
