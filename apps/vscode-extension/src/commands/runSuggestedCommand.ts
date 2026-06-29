import * as vscode from "vscode";
import { getPendingChanges } from "../agent/pendingChanges";
import { AgentPanel } from "../panels/AgentPanel";

export function registerRunSuggestedCommandCommand(
  output: vscode.OutputChannel,
  agentPanel: AgentPanel
): vscode.Disposable {
  return vscode.commands.registerCommand("borger.runSuggestedCommand", async () => {
    const suggestedCommands = getPendingChanges()?.commandsToRunLater ?? [];
    if (suggestedCommands.length === 0) {
      await vscode.window.showWarningMessage("No Borger suggested commands are available from pending changes.");
      return;
    }

    const selected = await vscode.window.showQuickPick(
      suggestedCommands.map((command) => ({
        label: command.command,
        detail: command.reason
      })),
      {
        title: "Borger Run Suggested Command",
        placeHolder: "Choose a suggested command to authorize and run"
      }
    );

    if (!selected) {
      return;
    }

    try {
      await agentPanel.focus();
      await agentPanel.runTerminalCommand(selected.label, "captured");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`Run suggested command failed: ${message}`);
      await vscode.window.showErrorMessage(`Borger suggested command failed: ${message}`);
    }
  });
}
