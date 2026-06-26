import * as vscode from "vscode";

export class SidebarTreeProvider implements vscode.TreeDataProvider<SidebarItem> {
  private constructor(private readonly items: SidebarItem[]) {}

  static tasks(): SidebarTreeProvider {
    return new SidebarTreeProvider([
      new SidebarItem("No recent tasks", "Phase 1 tracks commands only.", vscode.TreeItemCollapsibleState.None)
    ]);
  }

  static changes(): SidebarTreeProvider {
    return new SidebarTreeProvider([
      new SidebarItem("No pending changes", "Review and apply approved changes from the Agent panel.", vscode.TreeItemCollapsibleState.None)
    ]);
  }

  static memory(): SidebarTreeProvider {
    return new SidebarTreeProvider([
      new SidebarItem("Memory not enabled", "Project memory starts in Phase 12.", vscode.TreeItemCollapsibleState.None)
    ]);
  }

  static settings(): SidebarTreeProvider {
    const settings = new SidebarItem("Open Borger settings", "Configure endpoint, model, and mode.", vscode.TreeItemCollapsibleState.None);
    settings.command = {
      command: "workbench.action.openSettings",
      title: "Open Settings",
      arguments: ["@ext:private.borger-vscode-agent"]
    };
    return new SidebarTreeProvider([settings]);
  }

  getTreeItem(element: SidebarItem): vscode.TreeItem {
    return element;
  }

  getChildren(): SidebarItem[] {
    return this.items;
  }
}

class SidebarItem extends vscode.TreeItem {
  constructor(label: string, tooltip: string, collapsibleState: vscode.TreeItemCollapsibleState) {
    super(label, collapsibleState);
    this.tooltip = tooltip;
  }
}
