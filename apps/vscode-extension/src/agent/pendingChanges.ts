import { ActiveProviderSummary } from "./contextBuilder";
import { ParsedEditCommand } from "./patchParser";

export type PendingChangeStatus = "pending" | "approved" | "rejected" | "invalid";
export type PendingChangeAction = "create" | "modify" | "delete";

export interface PendingFileChange {
  id: string;
  path: string;
  action: PendingChangeAction;
  reason: string;
  status: PendingChangeStatus;
  originalContent: string;
  proposedContent: string;
  diff: string;
  warning?: string;
  invalidReason?: string;
}

export interface PendingChangeSet {
  id: string;
  task: string;
  summary: string;
  generatedAt: string;
  provider: ActiveProviderSummary;
  changes: PendingFileChange[];
  commandsToRunLater: ParsedEditCommand[];
  risks: string[];
  rawModelResponse: string;
}

let currentPendingChanges: PendingChangeSet | undefined;

export function createPendingChangeSet(input: Omit<PendingChangeSet, "id" | "generatedAt">): PendingChangeSet {
  return {
    ...input,
    id: createId(),
    generatedAt: new Date().toISOString()
  };
}

export function setPendingChanges(changeSet: PendingChangeSet): PendingChangeSet {
  currentPendingChanges = changeSet;
  return changeSet;
}

export function getPendingChanges(): PendingChangeSet | undefined {
  return currentPendingChanges;
}

export function clearPendingChanges(): void {
  currentPendingChanges = undefined;
}

export function markPendingChange(changeId: string, status: PendingChangeStatus): PendingChangeSet | undefined {
  if (!currentPendingChanges) {
    return undefined;
  }

  currentPendingChanges = {
    ...currentPendingChanges,
    changes: currentPendingChanges.changes.map((change) =>
      change.id === changeId && change.status !== "invalid" ? { ...change, status } : change
    )
  };
  return currentPendingChanges;
}

export function markAllPendingChanges(status: PendingChangeStatus): PendingChangeSet | undefined {
  if (!currentPendingChanges) {
    return undefined;
  }

  currentPendingChanges = {
    ...currentPendingChanges,
    changes: currentPendingChanges.changes.map((change) => (change.status !== "invalid" ? { ...change, status } : change))
  };
  return currentPendingChanges;
}

export function getPendingChange(changeId: string): PendingFileChange | undefined {
  return currentPendingChanges?.changes.find((change) => change.id === changeId);
}

function createId(): string {
  return `chg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
