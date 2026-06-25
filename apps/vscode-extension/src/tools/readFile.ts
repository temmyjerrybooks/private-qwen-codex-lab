import * as path from "node:path";
import * as vscode from "vscode";

const decoder = new TextDecoder("utf-8", { fatal: false });

const secretFileNames = new Set([
  ".env",
  ".env.local",
  ".env.development.local",
  ".env.test.local",
  ".env.production.local",
  ".npmrc",
  ".pypirc",
  ".netrc",
  "id_rsa",
  "id_dsa",
  "id_ecdsa",
  "id_ed25519"
]);

const secretExtensions = new Set([".pem", ".key", ".p12", ".pfx", ".crt", ".cer"]);

export interface SafeFileReadResult {
  path: string;
  sizeBytes: number;
  content?: string;
  skippedReason?: string;
  truncated: boolean;
}

export interface SafeFileReadOptions {
  maxFileSizeKb: number;
  maxCharacters?: number;
}

export async function readWorkspaceFile(uri: vscode.Uri): Promise<string> {
  const bytes = await vscode.workspace.fs.readFile(uri);
  return Buffer.from(bytes).toString("utf8");
}

export async function readSafeWorkspaceFile(
  workspaceFolder: vscode.WorkspaceFolder,
  relativePath: string,
  options: SafeFileReadOptions
): Promise<SafeFileReadResult> {
  const normalizedPath = normalizeRelativePath(relativePath);
  const uri = vscode.Uri.joinPath(workspaceFolder.uri, ...normalizedPath.split("/"));

  if (!isInsideWorkspace(workspaceFolder, uri)) {
    return {
      path: normalizedPath,
      sizeBytes: 0,
      skippedReason: "outside_workspace",
      truncated: false
    };
  }

  if (isSecretPath(normalizedPath)) {
    return {
      path: normalizedPath,
      sizeBytes: 0,
      skippedReason: "secret_like_file",
      truncated: false
    };
  }

  try {
    const stat = await vscode.workspace.fs.stat(uri);
    const maxBytes = options.maxFileSizeKb * 1024;
    if (stat.type === vscode.FileType.Directory) {
      return {
        path: normalizedPath,
        sizeBytes: stat.size,
        skippedReason: "directory",
        truncated: false
      };
    }

    if (stat.size > maxBytes) {
      return {
        path: normalizedPath,
        sizeBytes: stat.size,
        skippedReason: "over_size_limit",
        truncated: false
      };
    }

    const bytes = await vscode.workspace.fs.readFile(uri);
    if (isProbablyBinary(bytes)) {
      return {
        path: normalizedPath,
        sizeBytes: bytes.byteLength,
        skippedReason: "binary_file",
        truncated: false
      };
    }

    const raw = decoder.decode(bytes);
    const maxCharacters = options.maxCharacters ?? 6000;
    const content = raw.length > maxCharacters ? raw.slice(0, maxCharacters) : raw;
    return {
      path: normalizedPath,
      sizeBytes: bytes.byteLength,
      content,
      truncated: raw.length > maxCharacters
    };
  } catch (error) {
    return {
      path: normalizedPath,
      sizeBytes: 0,
      skippedReason: error instanceof Error ? error.message : String(error),
      truncated: false
    };
  }
}

export function isSecretPath(relativePath: string): boolean {
  const normalizedPath = normalizeRelativePath(relativePath);
  const basename = path.posix.basename(normalizedPath).toLowerCase();
  const extension = path.posix.extname(basename).toLowerCase();

  if (basename === ".env.example") {
    return false;
  }

  if (secretFileNames.has(basename) || secretExtensions.has(extension)) {
    return true;
  }

  if (basename.startsWith(".env.") && basename !== ".env.example") {
    return true;
  }

  return /(^|[-_.])(secret|secrets|token|tokens|credential|credentials|private-key|service-account)([-_.]|$)/i.test(
    basename
  );
}

export function isProbablyBinary(bytes: Uint8Array): boolean {
  const sample = bytes.slice(0, Math.min(bytes.byteLength, 8000));
  if (sample.includes(0)) {
    return true;
  }

  let suspicious = 0;
  for (const byte of sample) {
    if (byte < 7 || (byte > 14 && byte < 32)) {
      suspicious += 1;
    }
  }
  return sample.length > 0 && suspicious / sample.length > 0.08;
}

export function normalizeRelativePath(relativePath: string): string {
  return path.posix.normalize(relativePath.replace(/\\/g, "/")).replace(/^\/+/, "");
}

function isInsideWorkspace(workspaceFolder: vscode.WorkspaceFolder, uri: vscode.Uri): boolean {
  const root = workspaceFolder.uri.fsPath;
  const target = uri.fsPath;
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
