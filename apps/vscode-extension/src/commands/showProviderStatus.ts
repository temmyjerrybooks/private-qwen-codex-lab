import * as vscode from "vscode";
import { formatProviderReports } from "../providers/format";
import { ProviderRouter } from "../providers/providerRouter";

export function registerShowProviderStatusCommand(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel
): vscode.Disposable {
  return vscode.commands.registerCommand("borger.showProviderStatus", async () => {
    const router = new ProviderRouter(context);
    const reports = await router.getStatusReports();
    const formatted = formatProviderReports(reports);
    output.show(true);
    output.appendLine("Borger provider status:");
    output.appendLine(formatted);
    await vscode.window.showInformationMessage(reports.length > 0 ? formatted.split("\n")[0] : "No providers configured.");
  });
}
