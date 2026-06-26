import * as path from "node:path";
import * as vscode from "vscode";
import { isProbablyBinary, isSecretPath, normalizeRelativePath } from "./readFile";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: false });

export interface WorkspaceWriteTarget {
  path: string;
  uri: vscode.Uri;
}

export async function readWorkspaceTextFileForWrite(
  workspaceFolder: vscode.WorkspaceFolder,
  relativePath: string
): Promise<string> {
  const target = validateWorkspaceWritePath(workspaceFolder, relativePath);
  const stat = await vscode.workspace.fs.stat(target.uri);
  if (stat.type === vscode.FileType.Directory) {
    throw new Error(`${target.path} is a directory, not a text file.`);
  }

  const bytes = await vscode.workspace.fs.readFile(target.uri);
  if (isProbablyBinary(bytes)) {
    throw new Error(`${target.path} appears to be binary and will not be overwritten.`);
  }
  return decoder.decode(bytes);
}

export async function writeWorkspaceTextFile(
  workspaceFolder: vscode.WorkspaceFolder,
  relativePath: string,
  content: string
): Promise<WorkspaceWriteTarget> {
  const target = validateWorkspaceWritePath(workspaceFolder, relativePath);
  assertTextContentIsSafe(target.path, content);

  const parentPath = target.path.split("/").slice(0, -1);
  if (parentPath.length > 0) {
    await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(workspaceFolder.uri, ...parentPath));
  }

  await vscode.workspace.fs.writeFile(target.uri, encoder.encode(content));
  return target;
}

export async function workspaceFileExists(workspaceFolder: vscode.WorkspaceFolder, relativePath: string): Promise<boolean> {
  const target = validateWorkspaceWritePath(workspaceFolder, relativePath);
  try {
    await vscode.workspace.fs.stat(target.uri);
    return true;
  } catch {
    return false;
  }
}

export function validateWorkspaceWritePath(
  workspaceFolder: vscode.WorkspaceFolder,
  relativePath: string
): WorkspaceWriteTarget {
  const rawPath = relativePath.trim();
  if (!rawPath || rawPath === ".") {
    throw new Error("File path is empty.");
  }

  if (path.win32.isAbsolute(rawPath) || path.posix.isAbsolute(rawPath) || /^[a-zA-Z]:[\\/]/.test(rawPath)) {
    throw new Error("Absolute paths are not allowed for workspace writes.");
  }

  const normalizedPath = normalizeRelativePath(rawPath);
  if (!normalizedPath || normalizedPath === "." || normalizedPath === "..") {
    throw new Error("File path is empty after normalization.");
  }

  if (normalizedPath.startsWith("../") || normalizedPath.includes("/../")) {
    throw new Error("File path escapes the workspace.");
  }

  if (isSecretPath(normalizedPath)) {
    throw new Error(`${normalizedPath} is secret-like and cannot be written by Borger.`);
  }

  const uri = vscode.Uri.joinPath(workspaceFolder.uri, ...normalizedPath.split("/"));
  if (!isInsideWorkspace(workspaceFolder, uri)) {
    throw new Error("Resolved file path escapes the workspace.");
  }

  return { path: normalizedPath, uri };
}

export function assertTextContentIsSafe(filePath: string, content: string): void {
  if (isProbablyBinary(encoder.encode(content))) {
    throw new Error(`${filePath} proposed content appears to be binary and will not be written.`);
  }
}

export function writeFileUnavailable(): string {
  return "File writing is available only through Phase 7 approved pending changes with authorization, safe path checks, and backups.";
}

export function isWorkspaceFileWritingEnabled(): boolean {
  return true;
}

function isInsideWorkspace(workspaceFolder: vscode.WorkspaceFolder, uri: vscode.Uri): boolean {
  const relative = path.relative(workspaceFolder.uri.fsPath, uri.fsPath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
