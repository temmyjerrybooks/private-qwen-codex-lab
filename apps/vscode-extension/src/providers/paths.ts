import * as vscode from "vscode";

export function getWorkspaceRoot(): vscode.Uri | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri;
}

export function requireWorkspaceRoot(): vscode.Uri {
  const root = getWorkspaceRoot();
  if (!root) {
    throw new Error("Open a workspace folder before using Borger provider routing.");
  }
  return root;
}

export function getBorgerDirUri(): vscode.Uri {
  return vscode.Uri.joinPath(requireWorkspaceRoot(), ".borger");
}

export function getProvidersConfigUri(): vscode.Uri {
  return vscode.Uri.joinPath(getBorgerDirUri(), "providers.local.json");
}

export function getProviderStateUri(): vscode.Uri {
  return vscode.Uri.joinPath(getBorgerDirUri(), "provider-state.json");
}

export function getUsageLedgerUri(): vscode.Uri {
  return vscode.Uri.joinPath(getBorgerDirUri(), "usage-ledger.jsonl");
}

export async function ensureBorgerDir(): Promise<void> {
  await vscode.workspace.fs.createDirectory(getBorgerDirUri());
}

export async function fileExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}
