import * as vscode from "vscode";
import { AgentPanel } from "../panels/AgentPanel";

export function registerOpenAgentCommand(agentPanel: AgentPanel): vscode.Disposable {
  return vscode.commands.registerCommand("borger.openAgent", async () => {
    await agentPanel.focus();
  });
}
