import * as vscode from "vscode";
import { AgentPanel } from "../panels/AgentPanel";

export function registerRunAutoModeCommand(output: vscode.OutputChannel, agentPanel: AgentPanel): vscode.Disposable {
  return vscode.commands.registerCommand("borger.runAutoMode", async () => {
    const task = await vscode.window.showInputBox({
      title: "Borger Run Auto Mode",
      prompt: "Describe the local workspace task for Borger to run through the controlled auto loop.",
      ignoreFocusOut: true
    });

    if (!task) {
      return;
    }

    try {
      await agentPanel.focus();
      await agentPanel.runAutoMode(task);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`Run Auto Mode failed: ${message}`);
      await vscode.window.showErrorMessage(`Borger Auto Mode failed: ${message}`);
    }
  });
}
