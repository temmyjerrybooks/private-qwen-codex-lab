import * as vscode from "vscode";
import { getApiKey, getBorgerConfig, promptForApiKey } from "../config";
import { loadProviderConfigs } from "./providerConfig";
import { refreshProviderStates, markProviderActivated, markProviderUsed, resetProviderState } from "./providerState";
import { appendUsageLedgerEntry } from "./usageLedger";
import { ProviderConfig, ProviderSelection, ProviderStatusReport } from "./types";

export class ProviderRouter {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async selectProvider(operation: string): Promise<ProviderSelection> {
    const reports = await this.getStatusReports();
    const eligible = reports.filter((report) => report.eligible);

    if (eligible.length === 0) {
      throw new Error("No Borger provider is available. All configured providers are paused, failed, disabled, or over budget.");
    }

    const preferredProviderId = getBorgerConfig().providerRouting.defaultProviderId;
    eligible.sort((a, b) => compareProviderReports(a, b, preferredProviderId));
    const selected = eligible[0];
    await markProviderActivated(selected.provider);
    const apiKey = await this.getProviderApiKey(selected.provider, operation === "test");
    return {
      provider: selected.provider,
      state: selected.state,
      apiKey
    };
  }

  async getStatusReports(): Promise<ProviderStatusReport[]> {
    const providers = (await loadProviderConfigs()).filter((provider) => provider.enabled);
    const states = await refreshProviderStates(providers);

    return providers.map((provider) => {
      const record = states.get(provider.id);
      if (!record) {
        throw new Error(`Missing provider state for ${provider.id}.`);
      }
      const reason = getIneligibleReason(provider, record.state);
      return {
        provider,
        state: record.state,
        budget: record.budget,
        eligible: !reason,
        reason
      };
    });
  }

  async recordRequest(selection: ProviderSelection, operation: string, elapsedMs: number, success: boolean, error?: string): Promise<void> {
    if (getBorgerConfig().providerRouting.ledgerEnabled) {
      await appendUsageLedgerEntry(selection.provider, operation, elapsedMs, success, error);
    }
    await markProviderUsed(selection.provider, success, error);
    await refreshProviderStates([selection.provider]);
  }

  async resetProvider(provider: ProviderConfig): Promise<void> {
    await resetProviderState(provider);
  }

  async getProviders(): Promise<ProviderConfig[]> {
    return loadProviderConfigs();
  }

  async getProviderApiKey(provider: ProviderConfig, promptIfMissing: boolean): Promise<string | undefined> {
    const existing = await this.context.secrets.get(provider.apiKeySecret);
    if (existing || !promptIfMissing) {
      return existing;
    }

    if (provider.apiKeySecret === "borger.litellmApiKey") {
      return promptIfMissing ? promptForApiKey(this.context) : getApiKey(this.context);
    }

    const entered = await vscode.window.showInputBox({
      title: `Borger API Key: ${provider.label}`,
      prompt: "Enter this provider's API key, or leave blank if the endpoint does not require one.",
      password: true,
      ignoreFocusOut: true
    });

    if (entered) {
      await this.context.secrets.store(provider.apiKeySecret, entered);
      return entered;
    }
    return undefined;
  }
}

function getIneligibleReason(provider: ProviderConfig, state: ProviderStatusReport["state"]): string | undefined {
  if (!provider.enabled) {
    return "disabled";
  }
  if (state.status === "failed") {
    return state.lastError || "failed";
  }
  if (state.status === "paused") {
    return state.pauseReason || "paused";
  }
  if (state.currentUsagePercent >= provider.stopPercent) {
    return `over stop threshold (${provider.stopPercent}%)`;
  }
  return undefined;
}

function compareProviderReports(a: ProviderStatusReport, b: ProviderStatusReport, preferredProviderId: string): number {
  const usage = a.state.currentUsagePercent - b.state.currentUsagePercent;
  if (usage !== 0) {
    return usage;
  }

  if (preferredProviderId) {
    if (a.provider.id === preferredProviderId && b.provider.id !== preferredProviderId) {
      return -1;
    }
    if (b.provider.id === preferredProviderId && a.provider.id !== preferredProviderId) {
      return 1;
    }
  }

  const statusRank = rankStatus(a.state.status) - rankStatus(b.state.status);
  if (statusRank !== 0) {
    return statusRank;
  }

  const aLastUsed = a.state.lastUsedAt ? new Date(a.state.lastUsedAt).getTime() : 0;
  const bLastUsed = b.state.lastUsedAt ? new Date(b.state.lastUsedAt).getTime() : 0;
  return bLastUsed - aLastUsed;
}

function rankStatus(status: ProviderStatusReport["state"]["status"]): number {
  if (status === "active") {
    return 0;
  }
  if (status === "reset_pending") {
    return 1;
  }
  if (status === "warning") {
    return 2;
  }
  return 3;
}
