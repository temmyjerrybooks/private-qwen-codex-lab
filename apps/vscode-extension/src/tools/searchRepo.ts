import * as vscode from "vscode";

export async function searchWorkspaceFiles(pattern: string): Promise<vscode.Uri[]> {
  return vscode.workspace.findFiles(pattern, "{**/node_modules/**,**/.git/**,**/dist/**,**/build/**}");
}
