import * as vscode from "vscode";
import { AgentPanel } from "../panels/AgentPanel";

export function registerStopAutoModeCommand(output: vscode.OutputChannel, agentPanel: AgentPanel): vscode.Disposable {
  return vscode.commands.registerCommand("borger.stopAutoMode", async () => {
    try {
      await agentPanel.focus();
      await agentPanel.stopAutoMode();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`Stop Auto Mode failed: ${message}`);
      await vscode.window.showErrorMessage(`Borger Stop Auto Mode failed: ${message}`);
    }
  });
}
