export type ProviderStatus = "active" | "warning" | "paused" | "failed" | "reset_pending";

export type ProviderStopAction = "soft_stop" | "hard_stop";

export interface ProviderRoutingSettings {
  enabled: boolean;
  mode: "budget_aware";
  defaultProviderId: string;
  warnPercent: number;
  stopPercent: number;
  stopAction: ProviderStopAction;
  autoSwitch: boolean;
  resetDay: number;
  monthlyResetEnabled: boolean;
  lazyActivation: boolean;
  autoWarmOnReset: boolean;
  ledgerEnabled: boolean;
  h200PairHourlyCostUsd: number;
}

export interface ProviderConfig {
  id: string;
  label: string;
  owner: string;
  baseUrl: string;
  model: string;
  monthlyBudgetUsd: number;
  warnPercent: number;
  stopPercent: number;
  enabled: boolean;
  autoSwitchFrom: boolean;
  allowSoftStop: boolean;
  allowHardStop: boolean;
  resetDay: number;
  monthlyResetEnabled: boolean;
  lazyActivation: boolean;
  autoWarmOnReset: boolean;
  apiKeySecret: string;
  modalAppName?: string;
}

export interface ProvidersLocalFile {
  providers: ProviderConfig[];
}

export interface ProviderState {
  providerId: string;
  status: ProviderStatus;
  currentEstimatedSpendUsd: number;
  currentUsagePercent: number;
  pausedAt?: string;
  pausedUntil?: string;
  pauseReason?: string;
  lastUsedAt?: string;
  lastError?: string;
  resetDay: number;
  lastResetAt?: string;
  nextResetAt: string;
}

export interface ProviderStateFile {
  providers: Record<string, ProviderState>;
}

export interface UsageLedgerEntry {
  timestamp: string;
  providerId: string;
  providerLabel: string;
  baseUrl: string;
  model: string;
  operation: string;
  elapsedMs: number;
  estimatedCostUsd: number;
  success: boolean;
  error?: string;
}

export interface BudgetSnapshot {
  strategy: "exact" | "estimated";
  spendUsd: number;
  usagePercent: number;
}

export interface ProviderSelection {
  provider: ProviderConfig;
  state: ProviderState;
  apiKey?: string;
}

export interface ProviderStatusReport {
  provider: ProviderConfig;
  state: ProviderState;
  budget: BudgetSnapshot;
  eligible: boolean;
  reason?: string;
}
