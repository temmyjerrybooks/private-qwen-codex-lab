import * as vscode from "vscode";
import { planTask } from "../agent/planner";
import { AgentPanel } from "../panels/AgentPanel";

export function registerPlanTaskCommand(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
  agentPanel: AgentPanel
): vscode.Disposable {
  return vscode.commands.registerCommand("borger.planTask", async () => {
    const task = await vscode.window.showInputBox({
      title: "Borger Plan Task",
      prompt: "Describe the task Borger should plan.",
      ignoreFocusOut: true
    });

    if (!task) {
      return;
    }

    try {
      await agentPanel.focus();
      const plan = await planTask(task, context);
      output.appendLine("Plan task response:");
      output.appendLine(plan);
      agentPanel.postPlan(plan);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`Plan task failed: ${message}`);
      await vscode.window.showErrorMessage(`Borger plan failed: ${message}`);
    }
  });
}
