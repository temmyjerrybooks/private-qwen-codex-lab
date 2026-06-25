import * as vscode from "vscode";
import { shouldAlwaysIgnore, toWorkspaceRelativePath } from "./fileTree";
import { isSecretPath } from "./readFile";

const safeExcludeGlob =
  "{**/node_modules/**,**/.git/**,**/dist/**,**/build/**,**/.next/**,**/out/**,**/coverage/**,**/.turbo/**,**/.cache/**,**/.venv/**,**/__pycache__/**,**/*pycache*/**}";

export async function searchWorkspaceFiles(pattern: string): Promise<vscode.Uri[]> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  const matches = await vscode.workspace.findFiles(pattern, safeExcludeGlob);
  if (!workspaceFolder) {
    return matches;
  }

  return matches.filter((uri) => {
    const relativePath = toWorkspaceRelativePath(workspaceFolder, uri);
    return !relativePath.startsWith("..") && !shouldAlwaysIgnore(relativePath) && !isSecretPath(relativePath);
  });
}
