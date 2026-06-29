import * as vscode from "vscode";
import { AgentPanel } from "../panels/AgentPanel";
import { getCommandHistory } from "../terminal/commandHistory";
import { formatCommandHistoryForOutput } from "../ui/commandOutputFormatter";

export function registerShowCommandHistoryCommand(
  output: vscode.OutputChannel,
  agentPanel: AgentPanel
): vscode.Disposable {
  return vscode.commands.registerCommand("borger.showCommandHistory", async () => {
    await agentPanel.focus();
    agentPanel.postCommandHistory();
    output.show(true);
    output.appendLine(formatCommandHistoryForOutput(getCommandHistory()));
  });
}
