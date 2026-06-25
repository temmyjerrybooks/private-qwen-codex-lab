import * as vscode from "vscode";
import { getBorgerConfig } from "../config";
import { ensureBorgerDir, fileExists, getUsageLedgerUri } from "./paths";
import { ProviderConfig, UsageLedgerEntry } from "./types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function readUsageLedger(): Promise<UsageLedgerEntry[]> {
  const uri = getUsageLedgerUri();
  if (!(await fileExists(uri))) {
    return [];
  }

  const raw = decoder.decode(await vscode.workspace.fs.readFile(uri));
  return raw
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      try {
        return JSON.parse(line) as UsageLedgerEntry;
      } catch {
        return undefined;
      }
    })
    .filter((entry): entry is UsageLedgerEntry => Boolean(entry));
}

export async function appendUsageLedgerEntry(
  provider: ProviderConfig,
  operation: string,
  elapsedMs: number,
  success: boolean,
  error?: string
): Promise<UsageLedgerEntry> {
  await ensureBorgerDir();
  const cost = estimateCostUsd(elapsedMs);
  const entry: UsageLedgerEntry = {
    timestamp: new Date().toISOString(),
    providerId: provider.id,
    providerLabel: provider.label,
    baseUrl: provider.baseUrl,
    model: provider.model,
    operation,
    elapsedMs,
    estimatedCostUsd: cost,
    success,
    ...(error ? { error } : {})
  };

  const uri = getUsageLedgerUri();
  const existing = (await fileExists(uri)) ? decoder.decode(await vscode.workspace.fs.readFile(uri)) : "";
  await vscode.workspace.fs.writeFile(uri, encoder.encode(`${existing}${JSON.stringify(entry)}\n`));
  return entry;
}

export async function calculateEstimatedSpendUsd(providerId: string, since: string): Promise<number> {
  const entries = await readUsageLedger();
  const sinceTime = new Date(since).getTime();
  return entries
    .filter((entry) => entry.providerId === providerId)
    .filter((entry) => new Date(entry.timestamp).getTime() >= sinceTime)
    .reduce((sum, entry) => sum + entry.estimatedCostUsd, 0);
}

function estimateCostUsd(elapsedMs: number): number {
  const hourlyCost = getBorgerConfig().providerRouting.h200PairHourlyCostUsd;
  const hours = Math.max(0, elapsedMs) / 3_600_000;
  return Number((hours * hourlyCost).toFixed(6));
}
