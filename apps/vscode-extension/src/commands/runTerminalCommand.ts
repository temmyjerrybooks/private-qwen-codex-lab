import * as vscode from "vscode";
import { TerminalExecutionMode } from "../terminal/commandTypes";
import { AgentPanel } from "../panels/AgentPanel";

export function registerRunTerminalCommandCommand(
  output: vscode.OutputChannel,
  agentPanel: AgentPanel
): vscode.Disposable {
  return vscode.commands.registerCommand("borger.runTerminalCommand", async () => {
    const command = await vscode.window.showInputBox({
      title: "Borger Run Terminal Command",
      prompt: "Enter a local workspace command. Borger will authorize it before running.",
      ignoreFocusOut: true
    });

    if (!command) {
      return;
    }

    const mode = await vscode.window.showQuickPick<ModePick>(
      [
        {
          label: "Captured",
          description: "Recommended",
          detail: "Run in the workspace root and capture stdout, stderr, exit code, and duration.",
          mode: "captured"
        },
        {
          label: "Interactive",
          detail: "Open a VS Code terminal and send the command. Output capture is limited.",
          mode: "interactive"
        }
      ],
      {
        title: "Borger Terminal Mode",
        placeHolder: "Choose how Borger should run the command"
      }
    );

    if (!mode) {
      return;
    }

    try {
      await agentPanel.focus();
      await agentPanel.runTerminalCommand(command, mode.mode);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`Run terminal command failed: ${message}`);
      await vscode.window.showErrorMessage(`Borger terminal command failed: ${message}`);
    }
  });
}

interface ModePick extends vscode.QuickPickItem {
  mode: TerminalExecutionMode;
}
