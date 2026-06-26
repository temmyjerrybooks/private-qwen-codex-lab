import * as vscode from "vscode";
import { AgentPanel } from "../panels/AgentPanel";
import { getPendingChanges } from "../agent/pendingChanges";
import { formatPendingChangesForOutput } from "../ui/diffProvider";

export function registerShowPendingChangesCommand(
  output: vscode.OutputChannel,
  agentPanel: AgentPanel
): vscode.Disposable {
  return vscode.commands.registerCommand("borger.showPendingChanges", async () => {
    await agentPanel.focus();
    const pending = getPendingChanges();
    output.show(true);
    output.appendLine(formatPendingChangesForOutput(pending));
    agentPanel.postPendingChanges(pending);
  });
}
