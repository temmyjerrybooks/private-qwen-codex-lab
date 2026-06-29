import * as vscode from "vscode";
import { AgentPanel } from "../panels/AgentPanel";

export function registerFixDiagnosticsCommand(output: vscode.OutputChannel, agentPanel: AgentPanel): vscode.Disposable {
  return vscode.commands.registerCommand("borger.fixDiagnostics", async () => {
    const task = await vscode.window.showInputBox({
      title: "Borger Fix Diagnostics",
      prompt: "Optional: add constraints or context for the diagnostic fix proposal.",
      ignoreFocusOut: true
    });

    if (task === undefined) {
      return;
    }

    try {
      await agentPanel.focus();
      await agentPanel.fixDiagnostics(task);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`Fix diagnostics failed: ${message}`);
      await vscode.window.showErrorMessage(`Borger Fix Diagnostics failed: ${message}`);
    }
  });
}
