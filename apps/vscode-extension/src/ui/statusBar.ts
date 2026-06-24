import * as vscode from "vscode";

export function createStatusBar(): vscode.StatusBarItem {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  item.text = "$(hubot) Borger";
  item.tooltip = "Open Borger";
  item.command = "borger.openAgent";
  item.show();
  return item;
}
