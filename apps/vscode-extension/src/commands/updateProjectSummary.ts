import * as vscode from "vscode";
import { AgentPanel } from "../panels/AgentPanel";

export function registerUpdateProjectSummaryCommand(output: vscode.OutputChannel, agentPanel: AgentPanel): vscode.Disposable {
  return vscode.commands.registerCommand("borger.updateProjectSummary", async () => {
    try {
      await agentPanel.focus();
      await agentPanel.updateProjectSummary();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`Update project summary failed: ${message}`);
      await vscode.window.showErrorMessage(`Borger Update Project Summary failed: ${message}`);
    }
  });
}
