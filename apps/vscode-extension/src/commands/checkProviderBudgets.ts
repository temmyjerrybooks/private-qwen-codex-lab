import * as vscode from "vscode";
import { formatProviderReports } from "../providers/format";
import { ProviderRouter } from "../providers/providerRouter";

export function registerCheckProviderBudgetsCommand(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel
): vscode.Disposable {
  return vscode.commands.registerCommand("borger.checkProviderBudgets", async () => {
    const router = new ProviderRouter(context);
    const reports = await router.getStatusReports();
    const formatted = formatProviderReports(reports);
    output.show(true);
    output.appendLine("Borger provider budget report:");
    output.appendLine(formatted);
    await vscode.window.showInformationMessage(`Borger checked ${reports.length} provider budget${reports.length === 1 ? "" : "s"}.`);
  });
}
