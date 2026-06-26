import * as vscode from "vscode";
import { PendingFileChange } from "../agent/pendingChanges";
import { ParsedEditChange } from "../agent/patchParser";
import { buildUnifiedDiff } from "../ui/diffFormatter";
import { isSecretPath, normalizeRelativePath, readSafeWorkspaceFile } from "./readFile";

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
    warning: "Delete is preview-only in Phase 6. Actual deletion is reserved for a future authorized phase."
  };
}

export function applyPatchUnavailable(): string {
  return "Patch application is preview-only in Phase 6. Actual workspace writes start in Phase 7.";
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
    return "Secret-like files cannot be edited or previewed in Phase 6.";
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
