import ignore from "ignore";
import * as path from "node:path";
import * as vscode from "vscode";
import { isSecretPath, normalizeRelativePath } from "./readFile";

export const importantProjectFiles = [
  "package.json",
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "tsconfig.json",
  "vite.config.ts",
  "vite.config.js",
  "next.config.js",
  "next.config.ts",
  "tailwind.config.js",
  "tailwind.config.ts",
  "README.md",
  "PROJECT_SCOPE.md",
  "TASKS.md",
  "ACCEPTANCE_CRITERIA.md",
  "pyproject.toml",
  "requirements.txt",
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  ".env.example"
] as const;

const alwaysIgnoredFolders = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "out",
  "coverage",
  ".turbo",
  ".cache",
  ".venv",
  "__pycache__"
] as const;

const excludeGlob =
  "{**/node_modules/**,**/.git/**,**/dist/**,**/build/**,**/.next/**,**/out/**,**/coverage/**,**/.turbo/**,**/.cache/**,**/.venv/**,**/__pycache__/**,**/*pycache*/**}";

export interface FileTreeResult {
  files: string[];
  importantFilesFound: string[];
  totalDiscovered: number;
  truncated: boolean;
  ignoredPatterns: string[];
  gitignoreLoaded: boolean;
}

export async function buildFileTree(workspaceFolder: vscode.WorkspaceFolder, maxFiles: number): Promise<FileTreeResult> {
  const gitignore = await loadGitignore(workspaceFolder);
  const discovered = await vscode.workspace.findFiles("**/*", excludeGlob, Math.max(maxFiles * 6, maxFiles));
  const importantFilesFound = await findImportantFiles(workspaceFolder);
  const ordered = dedupe([
    ...importantFilesFound,
    ...discovered.map((uri) => toWorkspaceRelativePath(workspaceFolder, uri)).sort((a, b) => a.localeCompare(b))
  ]);

  const filtered = ordered.filter((file) => isContextSafePath(file, gitignore.matcher));
  const files = filtered.slice(0, maxFiles);

  return {
    files,
    importantFilesFound: importantFilesFound.filter((file) => filtered.includes(file)),
    totalDiscovered: filtered.length,
    truncated: filtered.length > maxFiles,
    ignoredPatterns: [
      ...alwaysIgnoredFolders,
      ".gitignore rules where practical",
      "secret-like files except .env.example",
      "binary files before reading"
    ],
    gitignoreLoaded: gitignore.loaded
  };
}

export function toWorkspaceRelativePath(workspaceFolder: vscode.WorkspaceFolder, uri: vscode.Uri): string {
  return normalizeRelativePath(path.relative(workspaceFolder.uri.fsPath, uri.fsPath));
}

export function shouldAlwaysIgnore(relativePath: string): boolean {
  const normalized = normalizeRelativePath(relativePath).toLowerCase();
  return normalized.split("/").some((part) => alwaysIgnoredFolders.includes(part as (typeof alwaysIgnoredFolders)[number]));
}

async function findImportantFiles(workspaceFolder: vscode.WorkspaceFolder): Promise<string[]> {
  const found: string[] = [];
  for (const file of importantProjectFiles) {
    const uri = vscode.Uri.joinPath(workspaceFolder.uri, ...file.split("/"));
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      if (stat.type !== vscode.FileType.Directory) {
        found.push(file);
      }
    } catch {
      // Missing important files are expected in mixed project types.
    }
  }
  return found;
}

async function loadGitignore(workspaceFolder: vscode.WorkspaceFolder): Promise<{
  matcher: ReturnType<typeof ignore>;
  loaded: boolean;
}> {
  const matcher = ignore();
  const uri = vscode.Uri.joinPath(workspaceFolder.uri, ".gitignore");

  try {
    const bytes = await vscode.workspace.fs.readFile(uri);
    const raw = Buffer.from(bytes).toString("utf8");
    matcher.add(raw.split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith("#")));
    return { matcher, loaded: true };
  } catch {
    return { matcher, loaded: false };
  }
}

function isContextSafePath(relativePath: string, gitignore: ReturnType<typeof ignore>): boolean {
  const normalized = normalizeRelativePath(relativePath);
  if (!normalized || shouldAlwaysIgnore(normalized)) {
    return false;
  }

  if (isSecretPath(normalized)) {
    return false;
  }

  return !gitignore.ignores(normalized);
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}
