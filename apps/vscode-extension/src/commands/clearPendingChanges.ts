import * as vscode from "vscode";
import { clearPendingChanges } from "../agent/pendingChanges";
import { AgentPanel } from "../panels/AgentPanel";

export function registerClearPendingChangesCommand(agentPanel: AgentPanel): vscode.Disposable {
  return vscode.commands.registerCommand("borger.clearPendingChanges", async () => {
    clearPendingChanges();
    await agentPanel.focus();
    agentPanel.postPendingChanges(undefined);
    await vscode.window.showInformationMessage("Borger pending changes cleared.");
  });
}
