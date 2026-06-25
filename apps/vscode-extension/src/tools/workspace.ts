import * as vscode from "vscode";
import { getBorgerConfig } from "../config";
import { buildFileTree, FileTreeResult } from "./fileTree";
import { collectDiagnostics, DiagnosticsSummary } from "./diagnostics";
import { ActiveFileContext, getActiveEditorContext, SelectionContext } from "./selection";
import { readSafeWorkspaceFile, SafeFileReadResult } from "./readFile";

export interface ImportantFileSummary {
  path: string;
  sizeBytes: number;
  summary: string;
  excerpt?: string;
  skippedReason?: string;
  truncated: boolean;
}

export interface WorkspaceSummary {
  workspaceName: string;
  rootPath?: string;
  projectName: string;
  projectTypes: string[];
  likelyFrameworks: string[];
  packageManagers: string[];
  packageScripts: Record<string, string>;
  likelyVerificationCommands: string[];
  fileCount: number;
  fileLimit: number;
  sampleFiles: string[];
  fileTree: FileTreeResult;
  importantFiles: ImportantFileSummary[];
  openFile?: string;
  currentFile?: ActiveFileContext;
  selectedText?: SelectionContext & { path: string };
  diagnosticsCount: number;
  diagnostics: DiagnosticsSummary;
  ignoredBehavior: string[];
  contextStatus: string;
  secretsNote: string;
}

export async function inspectWorkspace(): Promise<WorkspaceSummary> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  const config = getBorgerConfig();
  const diagnostics = collectDiagnostics(workspaceFolder);

  if (!workspaceFolder) {
    return {
      workspaceName: "No workspace open",
      projectName: "No workspace open",
      projectTypes: [],
      likelyFrameworks: [],
      packageManagers: [],
      packageScripts: {},
      likelyVerificationCommands: [],
      fileCount: 0,
      fileLimit: config.maxContextFiles,
      sampleFiles: [],
      fileTree: {
        files: [],
        importantFilesFound: [],
        totalDiscovered: 0,
        truncated: false,
        ignoredPatterns: [],
        gitignoreLoaded: false
      },
      importantFiles: [],
      diagnosticsCount: diagnostics.total,
      diagnostics,
      ignoredBehavior: getIgnoredBehavior(false),
      contextStatus: "No VS Code workspace folder is open.",
      secretsNote: "Secret-like files are not read. .env.example is allowed when present."
    };
  }

  const fileTree = await buildFileTree(workspaceFolder, config.maxContextFiles);
  const importantFiles = await readImportantFileSummaries(workspaceFolder, fileTree.importantFilesFound, config.maxFileSizeKb);
  const packageScripts = extractPackageScripts(importantFiles);
  const packageManagers = detectPackageManagers(fileTree.files);
  const projectTypes = detectProjectTypes(fileTree.files, importantFiles);
  const likelyFrameworks = detectFrameworks(fileTree.files, importantFiles);
  const currentFile = getActiveEditorContext(workspaceFolder, config.maxFileSizeKb);
  const selectedText = currentFile?.selection ? { path: currentFile.path, ...currentFile.selection } : undefined;

  return {
    workspaceName: workspaceFolder.name,
    rootPath: workspaceFolder.uri.fsPath,
    projectName: detectProjectName(workspaceFolder, importantFiles),
    projectTypes,
    likelyFrameworks,
    packageManagers,
    packageScripts,
    likelyVerificationCommands: detectVerificationCommands(packageManagers, packageScripts, fileTree.files, projectTypes),
    fileCount: fileTree.files.length,
    fileLimit: config.maxContextFiles,
    sampleFiles: fileTree.files,
    fileTree,
    importantFiles,
    openFile: currentFile?.path,
    currentFile,
    selectedText,
    diagnosticsCount: diagnostics.total,
    diagnostics,
    ignoredBehavior: getIgnoredBehavior(fileTree.gitignoreLoaded),
    contextStatus: fileTree.truncated
      ? `Sampled ${fileTree.files.length} of ${fileTree.totalDiscovered} safe files.`
      : `Collected ${fileTree.files.length} safe files.`,
    secretsNote: "Secret-like files are not read. .env.example is allowed when present."
  };
}

async function readImportantFileSummaries(
  workspaceFolder: vscode.WorkspaceFolder,
  paths: string[],
  maxFileSizeKb: number
): Promise<ImportantFileSummary[]> {
  const summaries: ImportantFileSummary[] = [];
  for (const filePath of paths) {
    const read = await readSafeWorkspaceFile(workspaceFolder, filePath, {
      maxFileSizeKb,
      maxCharacters: 7000
    });
    summaries.push(toImportantFileSummary(read));
  }
  return summaries;
}

function toImportantFileSummary(read: SafeFileReadResult): ImportantFileSummary {
  if (!read.content) {
    return {
      path: read.path,
      sizeBytes: read.sizeBytes,
      summary: read.skippedReason ? `Skipped: ${read.skippedReason}.` : "No readable content.",
      skippedReason: read.skippedReason,
      truncated: read.truncated
    };
  }

  return {
    path: read.path,
    sizeBytes: read.sizeBytes,
    summary: summarizeImportantFile(read.path, read.content),
    excerpt: buildSafeExcerpt(read.path, read.content),
    truncated: read.truncated
  };
}

function summarizeImportantFile(filePath: string, content: string): string {
  if (filePath === "package.json") {
    const parsed = parseJsonRecord(content);
    if (!parsed) {
      return "package.json present but could not be parsed.";
    }
    const scripts = getRecordKeys(parsed.scripts).slice(0, 12);
    const dependencies = [...getRecordKeys(parsed.dependencies), ...getRecordKeys(parsed.devDependencies)].slice(0, 12);
    const name = typeof parsed.name === "string" ? parsed.name : "unnamed package";
    return `Package ${name}. Scripts: ${scripts.join(", ") || "none"}. Dependencies: ${dependencies.join(", ") || "none"}.`;
  }

  if (filePath === ".env.example") {
    const variables = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => line.split("=")[0])
      .slice(0, 20);
    return `Example environment variables: ${variables.join(", ") || "none found"}.`;
  }

  if (filePath.endsWith("lock.yaml") || filePath.endsWith("lock.json") || filePath.endsWith(".lock") || filePath === "yarn.lock") {
    return "Dependency lockfile present.";
  }

  const headings = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^#{1,4}\s/.test(line))
    .slice(0, 8);

  if (headings.length > 0) {
    return `Headings: ${headings.join(" | ")}.`;
  }

  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5);
  return lines.length > 0 ? lines.join(" ") : "File is present but mostly empty.";
}

function buildSafeExcerpt(filePath: string, content: string): string | undefined {
  if (filePath === ".env.example") {
    return content
      .split(/\r?\n/)
      .map((line) => (line.includes("=") ? `${line.split("=")[0]}=` : line))
      .slice(0, 40)
      .join("\n");
  }

  if (filePath.endsWith("lock.yaml") || filePath.endsWith("lock.json") || filePath === "yarn.lock") {
    return undefined;
  }

  return content.slice(0, 2500);
}

function detectProjectName(workspaceFolder: vscode.WorkspaceFolder, importantFiles: ImportantFileSummary[]): string {
  const packageJson = getImportantFileContent(importantFiles, "package.json");
  const parsed = packageJson ? parseJsonRecord(packageJson) : undefined;
  return typeof parsed?.name === "string" ? parsed.name : workspaceFolder.name;
}

function detectPackageManagers(files: string[]): string[] {
  const managers: string[] = [];
  if (files.includes("package-lock.json") || files.includes("package.json")) {
    managers.push("npm");
  }
  if (files.includes("pnpm-lock.yaml")) {
    managers.push("pnpm");
  }
  if (files.includes("yarn.lock")) {
    managers.push("yarn");
  }
  return [...new Set(managers)];
}

function detectFrameworks(files: string[], importantFiles: ImportantFileSummary[]): string[] {
  const packageJson = getImportantFileContent(importantFiles, "package.json");
  const dependencies = packageJson ? getPackageDependencies(packageJson) : new Set<string>();
  const frameworks: string[] = [];

  if (files.includes("next.config.js") || files.includes("next.config.ts") || dependencies.has("next")) {
    frameworks.push("Next.js");
  }
  if (files.includes("vite.config.ts") || files.includes("vite.config.js") || dependencies.has("vite")) {
    frameworks.push(dependencies.has("react") ? "React/Vite" : "Vite");
  }
  if (dependencies.has("react") && !frameworks.some((framework) => framework.includes("React"))) {
    frameworks.push("React");
  }
  if (files.some((file) => file.startsWith("infra/modal/")) || files.some((file) => file.includes("modal_"))) {
    frameworks.push("Modal app");
  }
  if (files.some((file) => file.startsWith("infra/litellm/")) || files.some((file) => file.includes("litellm"))) {
    frameworks.push("LiteLLM setup");
  }
  if (files.includes("Dockerfile") || files.includes("docker-compose.yml") || files.includes("docker-compose.yaml")) {
    frameworks.push("Dockerized app");
  }
  if (hasFastApiSignal(importantFiles)) {
    frameworks.push("FastAPI");
  }
  return [...new Set(frameworks)];
}

function detectProjectTypes(files: string[], importantFiles: ImportantFileSummary[]): string[] {
  const packageJson = getImportantFileContent(importantFiles, "package.json");
  const dependencies = packageJson ? getPackageDependencies(packageJson) : new Set<string>();
  const types: string[] = [];

  if (files.includes("package.json")) {
    types.push("Node/TypeScript");
  }
  if (files.includes("tsconfig.json")) {
    types.push("TypeScript");
  }
  if (isVsCodeExtension(packageJson)) {
    types.push("VS Code Extension");
  }
  if (files.includes("pyproject.toml") || files.includes("requirements.txt") || files.some((file) => file.endsWith(".py"))) {
    types.push("Python");
  }
  if (hasFastApiSignal(importantFiles)) {
    types.push("FastAPI");
  }
  if (dependencies.has("next")) {
    types.push("Next.js");
  }
  if (dependencies.has("vite") || files.some((file) => file.startsWith("vite.config."))) {
    types.push("React/Vite");
  }
  if (files.includes("Dockerfile") || files.some((file) => file.startsWith("infra/docker/"))) {
    types.push("Dockerized app");
  }
  if (files.some((file) => file.startsWith("infra/modal/"))) {
    types.push("Modal app");
  }
  if (files.some((file) => file.startsWith("infra/litellm/"))) {
    types.push("LiteLLM setup");
  }

  return [...new Set(types)];
}

function detectVerificationCommands(
  packageManagers: string[],
  scripts: Record<string, string>,
  files: string[],
  projectTypes: string[]
): string[] {
  const commands: string[] = [];
  const packageManager = packageManagers.includes("pnpm") ? "pnpm" : packageManagers.includes("yarn") ? "yarn" : "npm";
  const scriptNames = Object.keys(scripts);

  for (const preferred of ["check-types", "typecheck", "compile", "build", "lint", "test"]) {
    if (scriptNames.includes(preferred)) {
      commands.push(`${packageManager} run ${preferred}`);
    }
  }

  if (projectTypes.includes("Python")) {
    if (files.some((file) => file.startsWith("tests/") || file.includes("/tests/"))) {
      commands.push("python -m pytest");
    }
    if (files.includes("requirements.txt")) {
      commands.push("python -m pip install -r requirements.txt");
    }
  }

  if (projectTypes.includes("Modal app")) {
    commands.push("python scripts/smoke_test_modal_endpoint.py");
  }
  if (projectTypes.includes("LiteLLM setup")) {
    commands.push("python scripts/smoke_test_litellm.py");
  }

  return [...new Set(commands)].slice(0, 8);
}

function extractPackageScripts(importantFiles: ImportantFileSummary[]): Record<string, string> {
  const packageJson = getImportantFileContent(importantFiles, "package.json");
  const parsed = packageJson ? parseJsonRecord(packageJson) : undefined;
  if (!isRecord(parsed?.scripts)) {
    return {};
  }

  const scripts: Record<string, string> = {};
  for (const [name, command] of Object.entries(parsed.scripts)) {
    if (typeof command === "string") {
      scripts[name] = command;
    }
  }
  return scripts;
}

function getImportantFileContent(importantFiles: ImportantFileSummary[], filePath: string): string | undefined {
  return importantFiles.find((file) => file.path === filePath)?.excerpt;
}

function getPackageDependencies(content: string): Set<string> {
  const parsed = parseJsonRecord(content);
  return new Set([...getRecordKeys(parsed?.dependencies), ...getRecordKeys(parsed?.devDependencies)]);
}

function hasFastApiSignal(importantFiles: ImportantFileSummary[]): boolean {
  const requirements = getImportantFileContent(importantFiles, "requirements.txt")?.toLowerCase() ?? "";
  const pyproject = getImportantFileContent(importantFiles, "pyproject.toml")?.toLowerCase() ?? "";
  return requirements.includes("fastapi") || pyproject.includes("fastapi");
}

function isVsCodeExtension(packageJson: string | undefined): boolean {
  const parsed = packageJson ? parseJsonRecord(packageJson) : undefined;
  return Boolean(isRecord(parsed?.contributes) || isRecord(parsed?.engines) && typeof parsed?.engines?.vscode === "string");
}

function parseJsonRecord(content: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(content) as unknown;
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function getRecordKeys(value: unknown): string[] {
  return isRecord(value) ? Object.keys(value) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getIgnoredBehavior(gitignoreLoaded: boolean): string[] {
  return [
    "Always ignores node_modules, .git, dist, build, .next, out, coverage, .turbo, .cache, .venv, and __pycache__.",
    gitignoreLoaded ? "Applied root .gitignore rules where practical." : "No root .gitignore was loaded.",
    "Skips secret-like files, private keys, token files, and credential files.",
    "Allows .env.example because it is intended as safe documentation.",
    "Skips binary files and files above the configured size limit before reading."
  ];
}
