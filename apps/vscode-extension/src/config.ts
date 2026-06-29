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
  autoMode: {
    enabled: boolean;
    maxLoops: number;
    requireApprovalForEdits: boolean;
    requireApprovalForCommands: boolean;
    allowedVerificationCommands: string[];
    stopOnDestructiveCommand: boolean;
    stopOnSecretFile: boolean;
  };
  providerRouting: {
    enabled: boolean;
    mode: "budget_aware";
    defaultProviderId: string;
    warnPercent: number;
    stopPercent: number;
    stopAction: "soft_stop" | "hard_stop";
    autoSwitch: boolean;
    resetDay: number;
    monthlyResetEnabled: boolean;
    lazyActivation: boolean;
    autoWarmOnReset: boolean;
    ledgerEnabled: boolean;
    h200PairHourlyCostUsd: number;
  };
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
    confirmBeforeTerminal: config.get("confirmBeforeTerminal", true),
    autoMode: {
      enabled: getBooleanEnv("BORGER_AUTO_MODE_ENABLED", config.get("autoModeEnabled", false)),
      maxLoops: getNumberEnv("BORGER_AUTO_MAX_LOOPS", config.get("autoMaxLoops", 3)),
      requireApprovalForEdits: getBooleanEnv(
        "BORGER_AUTO_REQUIRE_APPROVAL_FOR_EDITS",
        config.get("autoRequireApprovalForEdits", true)
      ),
      requireApprovalForCommands: getBooleanEnv(
        "BORGER_AUTO_REQUIRE_APPROVAL_FOR_COMMANDS",
        config.get("autoRequireApprovalForCommands", true)
      ),
      allowedVerificationCommands: getListEnv(
        "BORGER_AUTO_ALLOWED_VERIFICATION_COMMANDS",
        config.get("autoAllowedVerificationCommands", [
          "npm.cmd run check-types",
          "npm.cmd run compile",
          "npm test",
          "npm run lint",
          "pnpm test",
          "python -m py_compile"
        ])
      ),
      stopOnDestructiveCommand: getBooleanEnv(
        "BORGER_AUTO_STOP_ON_DESTRUCTIVE_COMMAND",
        config.get("autoStopOnDestructiveCommand", true)
      ),
      stopOnSecretFile: getBooleanEnv("BORGER_AUTO_STOP_ON_SECRET_FILE", config.get("autoStopOnSecretFile", true))
    },
    providerRouting: {
      enabled: config.get("providerRoutingEnabled", true),
      mode: config.get<"budget_aware">("providerRoutingMode", "budget_aware"),
      defaultProviderId: config.get("defaultProviderId", ""),
      warnPercent: config.get("providerWarnPercent", 90),
      stopPercent: config.get("providerStopPercent", 95),
      stopAction: config.get<"soft_stop" | "hard_stop">("providerStopAction", "soft_stop"),
      autoSwitch: config.get("providerAutoSwitch", true),
      resetDay: config.get("providerResetDay", 1),
      monthlyResetEnabled: config.get("providerMonthlyResetEnabled", true),
      lazyActivation: config.get("providerLazyActivation", true),
      autoWarmOnReset: config.get("providerAutoWarmOnReset", false),
      ledgerEnabled: config.get("providerLedgerEnabled", true),
      h200PairHourlyCostUsd: config.get("modalH200PairHourlyCostUsd", 9.08)
    }
  };
}

function getBooleanEnv(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function getNumberEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getListEnv(name: string, fallback: string[]): string[] {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    return fallback;
  }
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
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
