import * as vscode from "vscode";
import { calculateBudgetSnapshot } from "./budgetStrategies";
import { calculateCurrentCycleStart, calculateNextResetAt, hasResetDatePassed } from "./dates";
import { ensureBorgerDir, fileExists, getProviderStateUri } from "./paths";
import { BudgetSnapshot, ProviderConfig, ProviderState, ProviderStateFile } from "./types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function loadProviderStateFile(): Promise<ProviderStateFile> {
  const uri = getProviderStateUri();
  if (!(await fileExists(uri))) {
    return { providers: {} };
  }

  const raw = decoder.decode(await vscode.workspace.fs.readFile(uri));
  try {
    const parsed = JSON.parse(raw) as ProviderStateFile;
    return parsed.providers ? parsed : { providers: {} };
  } catch {
    return { providers: {} };
  }
}

export async function saveProviderStateFile(stateFile: ProviderStateFile): Promise<void> {
  await ensureBorgerDir();
  await vscode.workspace.fs.writeFile(getProviderStateUri(), encoder.encode(`${JSON.stringify(stateFile, null, 2)}\n`));
}

export function createInitialProviderState(provider: ProviderConfig, now = new Date()): ProviderState {
  const cycleStart = calculateCurrentCycleStart(provider.resetDay, now);
  return {
    providerId: provider.id,
    status: "active",
    currentEstimatedSpendUsd: 0,
    currentUsagePercent: 0,
    resetDay: provider.resetDay,
    lastResetAt: cycleStart.toISOString(),
    nextResetAt: calculateNextResetAt(provider.resetDay, now).toISOString()
  };
}

export async function refreshProviderStates(providers: ProviderConfig[]): Promise<Map<string, { state: ProviderState; budget: BudgetSnapshot }>> {
  const stateFile = await loadProviderStateFile();
  const now = new Date();
  const refreshed = new Map<string, { state: ProviderState; budget: BudgetSnapshot }>();

  for (const provider of providers) {
    const state = stateFile.providers[provider.id] ?? createInitialProviderState(provider, now);
    state.resetDay = provider.resetDay;
    applyMonthlyReset(provider, state, now);

    const budget = await calculateBudgetSnapshot(provider, state);
    state.currentEstimatedSpendUsd = budget.spendUsd;
    state.currentUsagePercent = budget.usagePercent;

    applyThresholds(provider, state, now);
    stateFile.providers[provider.id] = state;
    refreshed.set(provider.id, { state, budget });
  }

  await saveProviderStateFile(stateFile);
  return refreshed;
}

export async function markProviderActivated(provider: ProviderConfig): Promise<void> {
  const stateFile = await loadProviderStateFile();
  const state = stateFile.providers[provider.id] ?? createInitialProviderState(provider);
  if (state.status === "reset_pending") {
    state.status = "active";
  }
  stateFile.providers[provider.id] = state;
  await saveProviderStateFile(stateFile);
}

export async function markProviderUsed(provider: ProviderConfig, success: boolean, error?: string): Promise<void> {
  const stateFile = await loadProviderStateFile();
  const state = stateFile.providers[provider.id] ?? createInitialProviderState(provider);
  state.lastUsedAt = new Date().toISOString();
  if (success) {
    state.lastError = undefined;
    if (state.status === "reset_pending") {
      state.status = "active";
    }
  } else {
    state.status = "failed";
    state.lastError = error || "Provider request failed.";
  }
  stateFile.providers[provider.id] = state;
  await saveProviderStateFile(stateFile);
}

export async function resetProviderState(provider: ProviderConfig): Promise<ProviderState> {
  const stateFile = await loadProviderStateFile();
  const now = new Date();
  const state = createInitialProviderState(provider, now);
  state.status = provider.lazyActivation ? "reset_pending" : "active";
  state.lastResetAt = now.toISOString();
  state.nextResetAt = calculateNextResetAt(provider.resetDay, now).toISOString();
  stateFile.providers[provider.id] = state;
  await saveProviderStateFile(stateFile);
  return state;
}

function applyMonthlyReset(provider: ProviderConfig, state: ProviderState, now: Date): void {
  if (!provider.monthlyResetEnabled || !hasResetDatePassed(state.nextResetAt, now)) {
    return;
  }

  const wasBudgetPaused = state.status === "paused" && state.pauseReason?.includes("budget");
  if (state.status === "paused" && !wasBudgetPaused) {
    return;
  }

  state.status = provider.lazyActivation ? "reset_pending" : "active";
  state.currentEstimatedSpendUsd = 0;
  state.currentUsagePercent = 0;
  state.pausedAt = undefined;
  state.pausedUntil = undefined;
  state.pauseReason = undefined;
  state.lastError = undefined;
  state.lastResetAt = now.toISOString();
  state.nextResetAt = calculateNextResetAt(provider.resetDay, now).toISOString();
}

function applyThresholds(provider: ProviderConfig, state: ProviderState, now: Date): void {
  if (state.status === "failed") {
    return;
  }

  if (state.currentUsagePercent >= provider.stopPercent) {
    state.status = "paused";
    state.pausedAt = state.pausedAt || now.toISOString();
    state.pausedUntil = state.nextResetAt;
    state.pauseReason = `budget_stop_threshold_${provider.stopPercent}`;
    return;
  }

  if (state.currentUsagePercent >= provider.warnPercent) {
    state.status = "warning";
    return;
  }

  if (state.status === "warning" || state.status === "paused") {
    state.status = "active";
    state.pausedAt = undefined;
    state.pausedUntil = undefined;
    state.pauseReason = undefined;
  }
}
