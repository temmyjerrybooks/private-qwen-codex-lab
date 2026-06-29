import * as vscode from "vscode";
import { AgentPanel } from "../panels/AgentPanel";
import { clearCommandHistory } from "../terminal/commandHistory";

export function registerClearCommandHistoryCommand(agentPanel: AgentPanel): vscode.Disposable {
  return vscode.commands.registerCommand("borger.clearCommandHistory", async () => {
    clearCommandHistory();
    await agentPanel.focus();
    agentPanel.postCommandHistory();
    await vscode.window.showInformationMessage("Borger command history cleared.");
  });
}
