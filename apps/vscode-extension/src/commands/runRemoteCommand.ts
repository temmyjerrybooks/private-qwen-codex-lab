import * as vscode from "vscode";
import { AgentPanel } from "../panels/AgentPanel";

export function registerRunRemoteCommandCommand(output: vscode.OutputChannel, agentPanel: AgentPanel): vscode.Disposable {
  return vscode.commands.registerCommand("borger.runRemoteCommand", async () => {
    try {
      await agentPanel.focus();
      await agentPanel.runRemoteCommand();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`Run remote command failed: ${message}`);
      await vscode.window.showErrorMessage(`Borger Run Remote Command failed: ${message}`);
    }
  });
}
