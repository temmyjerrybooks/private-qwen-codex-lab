import * as vscode from "vscode";
import { ProviderRouter } from "../providers/providerRouter";

export function registerSwitchProviderCommand(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand("borger.switchProvider", async () => {
    const router = new ProviderRouter(context);
    const reports = await router.getStatusReports();
    const choice = await vscode.window.showQuickPick(
      reports.map((report) => ({
        label: report.provider.label,
        description: `${report.provider.id} - ${report.state.status} - ${report.state.currentUsagePercent.toFixed(2)}%`,
        detail: report.eligible ? "Eligible for routing" : report.reason,
        providerId: report.provider.id
      })),
      { title: "Select preferred Borger provider" }
    );

    if (!choice) {
      return;
    }

    await vscode.workspace.getConfiguration("borger").update("defaultProviderId", choice.providerId, vscode.ConfigurationTarget.Workspace);
    await vscode.window.showInformationMessage(`Borger preferred provider set to ${choice.providerId}.`);
  });
}
