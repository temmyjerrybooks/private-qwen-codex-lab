import * as vscode from "vscode";
import { LiteLLMClient } from "../model/litellmClient";
import { ProviderRouter } from "../providers/providerRouter";

export function registerTestModelConnectionCommand(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel
): vscode.Disposable {
  return vscode.commands.registerCommand("borger.testModelConnection", async () => {
    let router: ProviderRouter | undefined;
    let selection: Awaited<ReturnType<ProviderRouter["selectProvider"]>> | undefined;
    let startedAt = 0;
    try {
      router = new ProviderRouter(context);
      selection = await router.selectProvider("test");
      const client = new LiteLLMClient(
        {
          baseUrl: selection.provider.baseUrl,
          model: selection.provider.model,
          label: selection.provider.label
        },
        selection.apiKey
      );
      startedAt = Date.now();
      const result = await client.testConnection();
      await router.recordRequest(selection, "test", Date.now() - startedAt, true);
      output.appendLine(`Model connection response: ${result}`);
      await vscode.window.showInformationMessage(`Borger model connection succeeded via ${selection.provider.label}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (router && selection && startedAt > 0) {
        await router.recordRequest(selection, "test", Date.now() - startedAt, false, message);
      }
      output.appendLine(`Model connection failed: ${message}`);
      await vscode.window.showErrorMessage(`Borger model connection failed: ${message}`);
    }
  });
}
