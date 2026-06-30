import * as vscode from "vscode";
import { AgentPanel } from "../panels/AgentPanel";

export function registerAddProjectNoteCommand(output: vscode.OutputChannel, agentPanel: AgentPanel): vscode.Disposable {
  return vscode.commands.registerCommand("borger.addProjectNote", async () => {
    try {
      await agentPanel.focus();
      await agentPanel.addProjectNote();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`Add project note failed: ${message}`);
      await vscode.window.showErrorMessage(`Borger Add Project Note failed: ${message}`);
    }
  });
}
