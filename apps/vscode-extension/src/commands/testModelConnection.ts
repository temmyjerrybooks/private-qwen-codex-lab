import * as vscode from "vscode";
import { getApiKey, getBorgerConfig, promptForApiKey } from "../config";
import { LiteLLMClient } from "../model/litellmClient";

export function registerTestModelConnectionCommand(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel
): vscode.Disposable {
  return vscode.commands.registerCommand("borger.testModelConnection", async () => {
    try {
      const config = getBorgerConfig();
      const apiKey = (await getApiKey(context)) ?? (await promptForApiKey(context));
      const client = new LiteLLMClient(config, apiKey);
      const result = await client.testConnection();
      output.appendLine(`Model connection response: ${result}`);
      await vscode.window.showInformationMessage("Borger model connection succeeded.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`Model connection failed: ${message}`);
      await vscode.window.showErrorMessage(`Borger model connection failed: ${message}`);
    }
  });
}
