import * as vscode from "vscode";
import { getBorgerConfig } from "../config";
import { fileExists, getProvidersConfigUri, ensureBorgerDir } from "./paths";
import { ProviderConfig, ProvidersLocalFile } from "./types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function loadProviderConfigs(): Promise<ProviderConfig[]> {
  const settings = getBorgerConfig().providerRouting;
  const uri = getProvidersConfigUri();

  if (!(await fileExists(uri))) {
    return [createDefaultProvider()];
  }

  const raw = decoder.decode(await vscode.workspace.fs.readFile(uri));
  const parsed = JSON.parse(raw) as Partial<ProvidersLocalFile>;
  const providers = Array.isArray(parsed.providers) ? parsed.providers : [];
  const normalized = providers.map((provider, index) => normalizeProvider(provider as Partial<ProviderConfig>, index));

  return normalized.length > 0 ? normalized : [createDefaultProvider()];
}

export async function createProviderConfigTemplateIfMissing(): Promise<vscode.Uri> {
  await ensureBorgerDir();
  const uri = getProvidersConfigUri();
  if (await fileExists(uri)) {
    return uri;
  }

  const template: ProvidersLocalFile = {
    providers: [
      {
        id: "local-litellm",
        label: "Local LiteLLM Gateway",
        owner: "Local",
        baseUrl: "http://localhost:4000/v1",
        model: "qwen3-coder-next-abliterated-h200",
        monthlyBudgetUsd: 30,
        warnPercent: 90,
        stopPercent: 95,
        enabled: true,
        autoSwitchFrom: true,
        allowSoftStop: true,
        allowHardStop: false,
        resetDay: 1,
        monthlyResetEnabled: true,
        lazyActivation: true,
        autoWarmOnReset: false,
        apiKeySecret: "borger.provider.local-litellm.apiKey"
      }
    ]
  };

  await vscode.workspace.fs.writeFile(uri, encoder.encode(`${JSON.stringify(template, null, 2)}\n`));
  return uri;
}

export function createDefaultProvider(): ProviderConfig {
  const config = getBorgerConfig();
  const settings = config.providerRouting;
  return {
    id: "default",
    label: "Default Borger Endpoint",
    owner: "Local",
    baseUrl: normalizeBaseUrl(config.litellmBaseUrl),
    model: config.model,
    monthlyBudgetUsd: 30,
    warnPercent: settings.warnPercent,
    stopPercent: settings.stopPercent,
    enabled: true,
    autoSwitchFrom: true,
    allowSoftStop: true,
    allowHardStop: false,
    resetDay: settings.resetDay,
    monthlyResetEnabled: settings.monthlyResetEnabled,
    lazyActivation: settings.lazyActivation,
    autoWarmOnReset: settings.autoWarmOnReset,
    apiKeySecret: "borger.litellmApiKey"
  };
}

function normalizeProvider(provider: Partial<ProviderConfig>, index: number): ProviderConfig {
  const settings = getBorgerConfig().providerRouting;
  const id = sanitizeProviderId(provider.id || `provider-${index + 1}`);
  return {
    id,
    label: provider.label || id,
    owner: provider.owner || "Unknown",
    baseUrl: normalizeBaseUrl(provider.baseUrl || getBorgerConfig().litellmBaseUrl),
    model: provider.model || getBorgerConfig().model,
    monthlyBudgetUsd: positiveNumber(provider.monthlyBudgetUsd, 30),
    warnPercent: percentage(provider.warnPercent, settings.warnPercent),
    stopPercent: percentage(provider.stopPercent, settings.stopPercent),
    enabled: provider.enabled ?? true,
    autoSwitchFrom: provider.autoSwitchFrom ?? true,
    allowSoftStop: provider.allowSoftStop ?? true,
    allowHardStop: provider.allowHardStop ?? false,
    resetDay: provider.resetDay ?? settings.resetDay,
    monthlyResetEnabled: provider.monthlyResetEnabled ?? settings.monthlyResetEnabled,
    lazyActivation: provider.lazyActivation ?? settings.lazyActivation,
    autoWarmOnReset: provider.autoWarmOnReset ?? settings.autoWarmOnReset,
    apiKeySecret: provider.apiKeySecret || `borger.provider.${id}.apiKey`,
    modalAppName: provider.modalAppName
  };
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "");
}

function sanitizeProviderId(id: string): string {
  return id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-") || "provider";
}

function positiveNumber(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function percentage(value: number | undefined, fallback: number): number {
  const raw = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.max(0, Math.min(100, raw));
}
