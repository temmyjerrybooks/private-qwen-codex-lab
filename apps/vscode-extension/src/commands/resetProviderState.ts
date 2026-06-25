import * as vscode from "vscode";
import { ProviderRouter } from "../providers/providerRouter";

export function registerResetProviderStateCommand(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand("borger.resetProviderState", async () => {
    const router = new ProviderRouter(context);
    const providers = await router.getProviders();
    const choice = await vscode.window.showQuickPick(
      providers.map((provider) => ({
        label: provider.label,
        description: provider.id,
        provider
      })),
      { title: "Reset provider state without calling endpoint" }
    );

    if (!choice) {
      return;
    }

    await router.resetProvider(choice.provider);
    await vscode.window.showInformationMessage(`Borger reset local state for ${choice.provider.label}. No endpoint was called.`);
  });
}
