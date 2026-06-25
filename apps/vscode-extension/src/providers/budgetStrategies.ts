import * as fs from "node:fs/promises";
import { calculateEstimatedSpendUsd } from "./usageLedger";
import { ProviderConfig, ProviderState, BudgetSnapshot } from "./types";

interface ModalBillingReport {
  providers?: Array<{
    id?: string;
    providerId?: string;
    spendUsd?: number;
    usageUsd?: number;
  }>;
}

export async function calculateBudgetSnapshot(provider: ProviderConfig, state: ProviderState): Promise<BudgetSnapshot> {
  const exactSpend = await tryReadExactModalSpendUsd(provider.id);
  if (exactSpend !== undefined) {
    return createSnapshot("exact", exactSpend, provider.monthlyBudgetUsd);
  }

  const estimatedSpend = await calculateEstimatedSpendUsd(provider.id, state.lastResetAt || new Date(0).toISOString());
  return createSnapshot("estimated", estimatedSpend, provider.monthlyBudgetUsd);
}

async function tryReadExactModalSpendUsd(providerId: string): Promise<number | undefined> {
  const reportPath = process.env.BORGER_MODAL_BILLING_REPORT_PATH;
  if (!reportPath) {
    return undefined;
  }

  try {
    const raw = await fs.readFile(reportPath, "utf8");
    const report = JSON.parse(raw) as ModalBillingReport;
    const match = report.providers?.find((provider) => provider.id === providerId || provider.providerId === providerId);
    const spend = match?.spendUsd ?? match?.usageUsd;
    return typeof spend === "number" && Number.isFinite(spend) ? spend : undefined;
  } catch {
    return undefined;
  }
}

function createSnapshot(strategy: "exact" | "estimated", spendUsd: number, budgetUsd: number): BudgetSnapshot {
  const usagePercent = budgetUsd > 0 ? (spendUsd / budgetUsd) * 100 : 100;
  return {
    strategy,
    spendUsd: Number(spendUsd.toFixed(4)),
    usagePercent: Number(Math.max(0, usagePercent).toFixed(2))
  };
}
