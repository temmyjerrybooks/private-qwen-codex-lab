import * as vscode from "vscode";
import { createProviderConfigTemplateIfMissing, loadProviderConfigs } from "../providers/providerConfig";
import { ProviderRouter } from "../providers/providerRouter";

export function registerManageProvidersCommand(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand("borger.manageProviders", async () => {
    const uri = await createProviderConfigTemplateIfMissing();
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);

    const setSecret = "Set Provider API Key";
    const choice = await vscode.window.showInformationMessage(
      "Edit .borger/providers.local.json here. Provider API keys belong in VS Code SecretStorage, not this file.",
      setSecret
    );

    if (choice === setSecret) {
      const providers = await loadProviderConfigs();
      const selected = await vscode.window.showQuickPick(
        providers.map((provider) => ({
          label: provider.label,
          description: provider.id,
          provider
        })),
        { title: "Select provider for API key storage" }
      );
      if (!selected) {
        return;
      }
      const router = new ProviderRouter(context);
      await router.getProviderApiKey(selected.provider, true);
    }
  });
}
