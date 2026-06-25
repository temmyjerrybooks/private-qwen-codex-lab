import * as vscode from "vscode";
import { readRecentActionLogEntries } from "../permissions/actionLogger";
import { formatPermissionState } from "../permissions/permissionFormatter";
import { loadPermissionState } from "../permissions/permissionState";

export function registerShowPermissionsCommand(output: vscode.OutputChannel): vscode.Disposable {
  return vscode.commands.registerCommand("borger.showPermissions", async () => {
    const state = await loadPermissionState();
    const recentEntries = await readRecentActionLogEntries();
    const formatted = formatPermissionState(state, recentEntries);
    output.show(true);
    output.appendLine("Borger permission status:");
    output.appendLine(formatted);
    await vscode.window.showInformationMessage(`Borger permissions: ${state.profile.label}`);
  });
}
