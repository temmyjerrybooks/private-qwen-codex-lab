import * as vscode from "vscode";
import { getPendingChanges } from "../agent/pendingChanges";
import { AgentPanel } from "../panels/AgentPanel";

export function registerApplyCurrentPendingChangeCommand(
  output: vscode.OutputChannel,
  agentPanel: AgentPanel
): vscode.Disposable {
  return vscode.commands.registerCommand("borger.applyCurrentPendingChange", async () => {
    const pending = getPendingChanges();
    const approvedChanges = pending?.changes.filter((change) => change.status === "approved") ?? [];

    if (approvedChanges.length === 0) {
      await vscode.window.showWarningMessage("No approved Borger pending changes are available to apply.");
      return;
    }

    const selected = await vscode.window.showQuickPick(
      approvedChanges.map((change) => ({
        label: change.path,
        description: change.action,
        detail: change.reason,
        changeId: change.id
      })),
      {
        title: "Borger Apply Current Pending Change",
        placeHolder: "Choose one approved pending change to apply"
      }
    );

    if (!selected) {
      return;
    }

    try {
      await agentPanel.focus();
      await agentPanel.applyPendingChange(selected.changeId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`Apply current pending change failed: ${message}`);
      await vscode.window.showErrorMessage(`Borger apply pending change failed: ${message}`);
    }
  });
}
