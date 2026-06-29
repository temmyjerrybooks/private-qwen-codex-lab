import { TerminalCommandResult } from "./commandTypes";

let commandHistory: TerminalCommandResult[] = [];

export function addCommandHistoryEntry(result: TerminalCommandResult): TerminalCommandResult {
  commandHistory = [result, ...commandHistory.filter((entry) => entry.id !== result.id)].slice(0, 50);
  return result;
}

export function updateCommandHistoryEntry(
  id: string,
  updates: Partial<Omit<TerminalCommandResult, "id">>
): TerminalCommandResult | undefined {
  let updated: TerminalCommandResult | undefined;
  commandHistory = commandHistory.map((entry) => {
    if (entry.id !== id) {
      return entry;
    }
    updated = { ...entry, ...updates };
    return updated;
  });
  return updated;
}

export function getCommandHistory(): TerminalCommandResult[] {
  return [...commandHistory];
}

export function clearCommandHistory(): void {
  commandHistory = [];
}
