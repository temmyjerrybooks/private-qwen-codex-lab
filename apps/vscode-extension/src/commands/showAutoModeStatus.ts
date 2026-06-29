import * as vscode from "vscode";
import { getAutoModeState } from "../agent/autoMode";
import { AgentPanel } from "../panels/AgentPanel";
import { formatAutoModeStateForOutput } from "../ui/autoModeFormatter";

export function registerShowAutoModeStatusCommand(
  output: vscode.OutputChannel,
  agentPanel: AgentPanel
): vscode.Disposable {
  return vscode.commands.registerCommand("borger.showAutoModeStatus", async () => {
    await agentPanel.focus();
    agentPanel.postAutoModeState();
    output.show(true);
    output.appendLine(formatAutoModeStateForOutput(getAutoModeState()));
  });
}
