import * as vscode from "vscode";

export function showPhaseOneNotice(message: string): Thenable<string | undefined> {
  return vscode.window.showInformationMessage(message);
}
