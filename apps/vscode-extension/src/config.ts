import * as vscode from "vscode";

export type BorgerMode = "ask" | "plan" | "edit" | "fix" | "auto" | "commit";

export interface BorgerConfig {
  litellmBaseUrl: string;
  model: string;
  mode: BorgerMode;
  maxContextFiles: number;
  maxFileSizeKb: number;
  confirmBeforeApply: boolean;
  confirmBeforeTerminal: boolean;
}

const secretKey = "borger.litellmApiKey";

export function getBorgerConfig(): BorgerConfig {
  const config = vscode.workspace.getConfiguration("borger");
  return {
    litellmBaseUrl: config.get("litellmBaseUrl", "http://localhost:4000/v1"),
    model: config.get("model", "qwen3-coder-next-abliterated-h200"),
    mode: config.get<BorgerMode>("mode", "plan"),
    maxContextFiles: config.get("maxContextFiles", 80),
    maxFileSizeKb: config.get("maxFileSizeKb", 300),
    confirmBeforeApply: config.get("confirmBeforeApply", true),
    confirmBeforeTerminal: config.get("confirmBeforeTerminal", true)
  };
}

export async function getApiKey(context: vscode.ExtensionContext): Promise<string | undefined> {
  return context.secrets.get(secretKey);
}

export async function promptForApiKey(context: vscode.ExtensionContext): Promise<string | undefined> {
  const apiKey = await vscode.window.showInputBox({
    title: "Borger LiteLLM API Key",
    prompt: "Enter a LiteLLM API key, or leave blank to call the endpoint without Authorization.",
    password: true,
    ignoreFocusOut: true
  });

  if (apiKey) {
    await context.secrets.store(secretKey, apiKey);
  }

  return apiKey;
}
