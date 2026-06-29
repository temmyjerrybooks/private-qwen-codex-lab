import * as vscode from "vscode";
import { ensureBorgerDir, fileExists, getActionLogUri } from "./permissionConfig";
import { PermissionProfileId } from "./permissionProfiles";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export interface ActionLogEntry {
  timestamp: string;
  actionType: string;
  allowed: boolean;
  requiresConfirmation: boolean;
  reason: string;
  profile: PermissionProfileId;
  command?: string;
  filePath?: string;
  sshHost?: string;
  cwd?: string;
  exitCode?: number;
  durationMs?: number;
  status?: string;
}

export async function logAction(entry: Omit<ActionLogEntry, "timestamp">): Promise<ActionLogEntry> {
  await ensureBorgerDir();
  const fullEntry: ActionLogEntry = {
    timestamp: new Date().toISOString(),
    ...entry
  };
  const uri = getActionLogUri();
  const existing = (await fileExists(uri)) ? decoder.decode(await vscode.workspace.fs.readFile(uri)) : "";
  await vscode.workspace.fs.writeFile(uri, encoder.encode(`${existing}${JSON.stringify(fullEntry)}\n`));
  return fullEntry;
}

export async function readRecentActionLogEntries(limit = 5): Promise<ActionLogEntry[]> {
  const uri = getActionLogUri();
  if (!(await fileExists(uri))) {
    return [];
  }

  const raw = decoder.decode(await vscode.workspace.fs.readFile(uri));
  return raw
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .slice(-limit)
    .map((line) => {
      try {
        return JSON.parse(line) as ActionLogEntry;
      } catch {
        return undefined;
      }
    })
    .filter((entry): entry is ActionLogEntry => Boolean(entry));
}
