import * as vscode from "vscode";
import { AgentPanel } from "../panels/AgentPanel";

export function registerStageGitChangesCommand(output: vscode.OutputChannel, agentPanel: AgentPanel): vscode.Disposable {
  return vscode.commands.registerCommand("borger.stageGitChanges", async () => {
    const choice = await vscode.window.showQuickPick(
      [
        { label: "Stage All Safe Files", mode: "all" },
        { label: "Select Files To Stage", mode: "selected" }
      ],
      {
        title: "Borger Stage Git Changes",
        placeHolder: "Choose how to stage safe files"
      }
    );
    if (!choice) {
      return;
    }
    try {
      await agentPanel.focus();
      if (choice.mode === "all") {
        await agentPanel.stageAllSafeGitChanges();
      } else {
        await agentPanel.stageSelectedGitChanges();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`Stage git changes failed: ${message}`);
      await vscode.window.showErrorMessage(`Borger Stage Git Changes failed: ${message}`);
    }
  });
}
