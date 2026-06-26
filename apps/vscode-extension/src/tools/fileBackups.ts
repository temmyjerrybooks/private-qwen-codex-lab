import * as vscode from "vscode";
import { PendingChangeAction } from "../agent/pendingChanges";
import { writeWorkspaceTextFile } from "./writeFile";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: false });

export interface WorkspaceBackupSnapshot {
  id: string;
  path: string;
  action: Extract<PendingChangeAction, "create" | "modify">;
  createdAt: string;
  originalContent?: string;
  backupPath: string;
}

let lastBackup: WorkspaceBackupSnapshot | undefined;

export async function createWorkspaceBackup(
  workspaceFolder: vscode.WorkspaceFolder,
  path: string,
  action: Extract<PendingChangeAction, "create" | "modify">,
  originalContent?: string
): Promise<WorkspaceBackupSnapshot> {
  const id = createBackupId(path);
  const backupPath = `.borger/backups/${id}.json`;
  const snapshot: WorkspaceBackupSnapshot = {
    id,
    path,
    action,
    createdAt: new Date().toISOString(),
    originalContent,
    backupPath
  };

  const backupDir = vscode.Uri.joinPath(workspaceFolder.uri, ".borger", "backups");
  await vscode.workspace.fs.createDirectory(backupDir);
  await vscode.workspace.fs.writeFile(
    vscode.Uri.joinPath(backupDir, `${id}.json`),
    encoder.encode(`${JSON.stringify(snapshot, null, 2)}\n`)
  );

  lastBackup = snapshot;
  return snapshot;
}

export async function getLastWorkspaceBackup(
  workspaceFolder: vscode.WorkspaceFolder
): Promise<WorkspaceBackupSnapshot | undefined> {
  if (lastBackup) {
    return lastBackup;
  }

  const backupDir = vscode.Uri.joinPath(workspaceFolder.uri, ".borger", "backups");
  try {
    const entries = await vscode.workspace.fs.readDirectory(backupDir);
    const backupFiles = entries
      .filter(([name, type]) => type === vscode.FileType.File && name.endsWith(".json"))
      .map(([name]) => name)
      .sort();

    const latest = backupFiles.at(-1);
    if (!latest) {
      return undefined;
    }

    const raw = decoder.decode(await vscode.workspace.fs.readFile(vscode.Uri.joinPath(backupDir, latest)));
    const parsed = JSON.parse(raw) as WorkspaceBackupSnapshot;
    lastBackup = parsed;
    return parsed;
  } catch {
    return undefined;
  }
}

export async function revertLastWorkspaceBackup(
  workspaceFolder: vscode.WorkspaceFolder
): Promise<WorkspaceBackupSnapshot> {
  const backup = await getLastWorkspaceBackup(workspaceFolder);
  if (!backup) {
    throw new Error("No Borger backup is available to revert.");
  }

  if (backup.action === "create") {
    throw new Error("The last backup is for a created file. Automatic delete/revert for created files is disabled in Phase 7.");
  }

  if (backup.originalContent === undefined) {
    throw new Error("The backup does not contain original file content.");
  }

  await writeWorkspaceTextFile(workspaceFolder, backup.path, backup.originalContent);
  return backup;
}

function createBackupId(path: string): string {
  const safePath = path.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
  return `backup_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}_${safePath}`;
}
