import * as path from "node:path";
import * as vscode from "vscode";
import { getBorgerConfig } from "../config";

export interface WorkspaceSummary {
  workspaceName: string;
  rootPath?: string;
  fileCount: number;
  sampleFiles: string[];
  packageManagers: string[];
  likelyFrameworks: string[];
  openFile?: string;
  diagnosticsCount: number;
}

const excludePattern = "{**/node_modules/**,**/.git/**,**/dist/**,**/build/**,**/.next/**,**/coverage/**}";

export async function inspectWorkspace(): Promise<WorkspaceSummary> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  const config = getBorgerConfig();

  if (!workspaceFolder) {
    return {
      workspaceName: "No workspace open",
      fileCount: 0,
      sampleFiles: [],
      packageManagers: [],
      likelyFrameworks: [],
      diagnosticsCount: countDiagnostics()
    };
  }

  const files = await vscode.workspace.findFiles("**/*", excludePattern, config.maxContextFiles);
  const relativeFiles = files.map((file) => toRelativePath(workspaceFolder, file));
  const openFile = vscode.window.activeTextEditor
    ? toRelativePath(workspaceFolder, vscode.window.activeTextEditor.document.uri)
    : undefined;

  return {
    workspaceName: workspaceFolder.name,
    rootPath: workspaceFolder.uri.fsPath,
    fileCount: relativeFiles.length,
    sampleFiles: relativeFiles,
    packageManagers: detectPackageManagers(relativeFiles),
    likelyFrameworks: detectFrameworks(relativeFiles),
    openFile,
    diagnosticsCount: countDiagnostics()
  };
}

function toRelativePath(workspaceFolder: vscode.WorkspaceFolder, uri: vscode.Uri): string {
  return path.posix.normalize(path.relative(workspaceFolder.uri.fsPath, uri.fsPath).replace(/\\/g, "/"));
}

function countDiagnostics(): number {
  return vscode.languages.getDiagnostics().reduce((count, [, diagnostics]) => count + diagnostics.length, 0);
}

function detectPackageManagers(files: string[]): string[] {
  const managers: string[] = [];
  if (files.includes("package-lock.json")) {
    managers.push("npm");
  }
  if (files.includes("pnpm-lock.yaml")) {
    managers.push("pnpm");
  }
  if (files.includes("yarn.lock")) {
    managers.push("yarn");
  }
  return managers;
}

function detectFrameworks(files: string[]): string[] {
  const frameworks: string[] = [];
  if (files.includes("next.config.js") || files.includes("next.config.mjs") || files.includes("next.config.ts")) {
    frameworks.push("Next.js");
  }
  if (files.includes("vite.config.ts") || files.includes("vite.config.js")) {
    frameworks.push("Vite");
  }
  if (files.includes("angular.json")) {
    frameworks.push("Angular");
  }
  if (files.some((file) => file.endsWith(".csproj"))) {
    frameworks.push(".NET");
  }
  if (files.includes("pyproject.toml")) {
    frameworks.push("Python");
  }
  return frameworks;
}
