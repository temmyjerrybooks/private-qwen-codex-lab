import { RemoteCommandResult, RemoteInspectionResult } from "./remoteTypes";

let remoteHistory: RemoteCommandResult[] = [];
let latestInspection: RemoteInspectionResult | undefined;

export function addRemoteHistoryEntry(result: RemoteCommandResult): RemoteCommandResult {
  remoteHistory = [result, ...remoteHistory.filter((entry) => entry.id !== result.id)].slice(0, 50);
  return result;
}

export function updateRemoteHistoryEntry(
  id: string,
  updates: Partial<Omit<RemoteCommandResult, "id">>
): RemoteCommandResult | undefined {
  let updated: RemoteCommandResult | undefined;
  remoteHistory = remoteHistory.map((entry) => {
    if (entry.id !== id) {
      return entry;
    }
    updated = { ...entry, ...updates };
    return updated;
  });
  return updated;
}

export function getRemoteHistory(): RemoteCommandResult[] {
  return [...remoteHistory];
}

export function getLatestRemoteHistoryEntry(): RemoteCommandResult | undefined {
  return remoteHistory[0];
}

export function clearRemoteHistory(): void {
  remoteHistory = [];
  latestInspection = undefined;
}

export function setLatestRemoteInspection(result: RemoteInspectionResult): RemoteInspectionResult {
  latestInspection = result;
  return result;
}

export function getLatestRemoteInspection(): RemoteInspectionResult | undefined {
  return latestInspection;
}
