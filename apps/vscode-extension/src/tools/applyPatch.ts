import * as vscode from "vscode";
import { PendingFileChange } from "../agent/pendingChanges";
import { ParsedEditChange } from "../agent/patchParser";
import { buildUnifiedDiff } from "../ui/diffFormatter";
import { createWorkspaceBackup, WorkspaceBackupSnapshot } from "./fileBackups";
import { isSecretPath, normalizeRelativePath, readSafeWorkspaceFile } from "./readFile";
import {
  assertTextContentIsSafe,
  readWorkspaceTextFileForWrite,
  validateWorkspaceWritePath,
  workspaceFileExists,
  writeWorkspaceTextFile
} from "./writeFile";

export interface ApplyPendingFileChangeResult {
  changeId: string;
  path: string;
  action: PendingFileChange["action"];
  applied: boolean;
  message: string;
  backup?: WorkspaceBackupSnapshot;
}

export async function createPendingFileChangePreview(
  workspaceFolder: vscode.WorkspaceFolder,
  change: ParsedEditChange,
  maxFileSizeKb: number
): Promise<PendingFileChange> {
  const path = normalizeRelativePath(change.path);
  const invalid = validatePreviewPath(path);
  if (invalid) {
    return buildInvalidChange(change, path, invalid);
  }

  if (change.action === "create") {
    return previewCreateChange(workspaceFolder, change, path);
  }

  const original = await readSafeWorkspaceFile(workspaceFolder, path, {
    maxFileSizeKb,
    maxCharacters: maxFileSizeKb * 1024
  });

  if (original.skippedReason || original.content === undefined) {
    return buildInvalidChange(change, path, `Could not read original file for ${change.action}: ${original.skippedReason || "no content"}.`);
  }

  if (change.action === "modify") {
    if (change.content === undefined) {
      return buildInvalidChange(change, path, "Modify action requires full updated file content.");
    }
    return {
      id: createId(),
      path,
      action: "modify",
      reason: change.reason,
      status: "pending",
      originalContent: original.content,
      proposedContent: change.content,
      diff: buildUnifiedDiff(path, original.content, change.content)
    };
  }

  return {
    id: createId(),
    path,
    action: "delete",
    reason: change.reason,
    status: "pending",
    originalContent: original.content,
    proposedContent: "",
    diff: buildUnifiedDiff(path, original.content, ""),
    warning: "Delete proposals remain disabled in Phase 7. Actual deletion is reserved for a future authorized phase."
  };
}

export function applyPatchUnavailable(): string {
  return "Patch application is available in Phase 7 only for approved pending changes after authorization and safety checks.";
}

export async function applyApprovedFileChange(
  workspaceFolder: vscode.WorkspaceFolder,
  change: PendingFileChange
): Promise<ApplyPendingFileChangeResult> {
  if (change.status !== "approved") {
    throw new Error(`${change.path} is ${change.status}; only approved changes can be applied.`);
  }

  if (change.action === "delete") {
    throw new Error("Delete proposals remain disabled in Phase 7 and are not applied.");
  }

  validateWorkspaceWritePath(workspaceFolder, change.path);
  assertTextContentIsSafe(change.path, change.proposedContent);

  if (change.action === "create") {
    if (await workspaceFileExists(workspaceFolder, change.path)) {
      throw new Error(`${change.path} already exists; refusing to overwrite during create.`);
    }

    const backup = await createWorkspaceBackup(workspaceFolder, change.path, "create");
    await writeWorkspaceTextFile(workspaceFolder, change.path, change.proposedContent);
    return {
      changeId: change.id,
      path: change.path,
      action: change.action,
      applied: true,
      message: `Created ${change.path}.`,
      backup
    };
  }

  const currentContent = await readWorkspaceTextFileForWrite(workspaceFolder, change.path);
  const backup = await createWorkspaceBackup(workspaceFolder, change.path, "modify", currentContent);
  await writeWorkspaceTextFile(workspaceFolder, change.path, change.proposedContent);

  const changedSincePreview = currentContent !== change.originalContent;
  return {
    changeId: change.id,
    path: change.path,
    action: change.action,
    applied: true,
    message: changedSincePreview
      ? `Modified ${change.path}; current file differed from the preview baseline, so the latest content was backed up.`
      : `Modified ${change.path}.`,
    backup
  };
}

function validatePreviewPath(path: string): string | undefined {
  if (!path || path === ".") {
    return "Path is empty.";
  }
  if (path.startsWith("../") || path.includes("/../")) {
    return "Path escapes the workspace.";
  }
  if (/^[a-zA-Z]:\//.test(path) || path.startsWith("/")) {
    return "Absolute paths are not allowed.";
  }
  if (isSecretPath(path)) {
    return "Secret-like files cannot be edited or previewed by Borger.";
  }
  return undefined;
}

async function previewCreateChange(
  workspaceFolder: vscode.WorkspaceFolder,
  change: ParsedEditChange,
  path: string
): Promise<PendingFileChange> {
  if (change.content === undefined) {
    return buildInvalidChange(change, path, "Create action requires full file content.");
  }

  const uri = vscode.Uri.joinPath(workspaceFolder.uri, ...path.split("/"));
  try {
    await vscode.workspace.fs.stat(uri);
    return buildInvalidChange(change, path, "Create action targets a file that already exists; use modify instead.");
  } catch {
    return {
      id: createId(),
      path,
      action: "create",
      reason: change.reason,
      status: "pending",
      originalContent: "",
      proposedContent: change.content,
      diff: buildUnifiedDiff(path, "", change.content)
    };
  }
}

function buildInvalidChange(change: ParsedEditChange, path: string, invalidReason: string): PendingFileChange {
  return {
    id: createId(),
    path,
    action: change.action,
    reason: change.reason,
    status: "invalid",
    originalContent: "",
    proposedContent: change.content ?? "",
    diff: "",
    invalidReason
  };
}

function createId(): string {
  return `file_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
