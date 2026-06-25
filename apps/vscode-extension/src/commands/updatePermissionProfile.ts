import * as vscode from "vscode";
import { createPermissionConfigTemplateIfMissing, updatePermissionProfile } from "../permissions/permissionConfig";
import { permissionProfileIds, permissionProfiles } from "../permissions/permissionProfiles";

export function registerUpdatePermissionProfileCommand(): vscode.Disposable {
  return vscode.commands.registerCommand("borger.updatePermissionProfile", async () => {
    await createPermissionConfigTemplateIfMissing();
    const selected = await vscode.window.showQuickPick(
      permissionProfileIds.map((id) => ({
        label: permissionProfiles[id].label,
        description: id,
        detail: permissionProfiles[id].description,
        id
      })),
      {
        title: "Update Borger Permission Profile",
        placeHolder: "Choose the local permission profile for this workspace"
      }
    );

    if (!selected) {
      return;
    }

    const uri = await updatePermissionProfile(selected.id);
    await vscode.window.showInformationMessage(`Borger permission profile set to ${selected.description}.`);
    const open = "Open Config";
    const choice = await vscode.window.showInformationMessage(`Updated ${uri.fsPath}`, open);
    if (choice === open) {
      const document = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(document);
    }
  });
}
