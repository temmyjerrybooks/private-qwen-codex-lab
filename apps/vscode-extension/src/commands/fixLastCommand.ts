import * as vscode from "vscode";
import { getFailedCommandHistory } from "../terminal/commandHistory";
import { AgentPanel } from "../panels/AgentPanel";

export function registerFixLastCommandCommand(output: vscode.OutputChannel, agentPanel: AgentPanel): vscode.Disposable {
  return vscode.commands.registerCommand("borger.fixLastFailedCommand", async () => {
    const failedCommands = getFailedCommandHistory();
    if (failedCommands.length === 0) {
      await vscode.window.showWarningMessage("No failed Borger terminal command is available to fix.");
      return;
    }

    const selected =
      failedCommands.length === 1
        ? {
            id: failedCommands[0].id,
            label: failedCommands[0].command
          }
        : await vscode.window.showQuickPick(
            failedCommands.map((command) => ({
              id: command.id,
              label: command.command,
              detail: `Exit ${command.exitCode ?? "unknown"} - ${command.reason}`
            })),
            {
              title: "Borger Fix Last Failed Command",
              placeHolder: "Choose the failed command to repair"
            }
          );

    if (!selected) {
      return;
    }

    const task = await vscode.window.showInputBox({
      title: "Borger Fix Last Failed Command",
      prompt: "Optional: add constraints or context for the command failure fix.",
      ignoreFocusOut: true
    });

    if (task === undefined) {
      return;
    }

    try {
      await agentPanel.focus();
      await agentPanel.fixLastFailedCommand(selected.id, task);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`Fix last failed command failed: ${message}`);
      await vscode.window.showErrorMessage(`Borger Fix Last Failed Command failed: ${message}`);
    }
  });
}
