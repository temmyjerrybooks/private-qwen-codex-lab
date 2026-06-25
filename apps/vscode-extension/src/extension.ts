import * as vscode from "vscode";
import { registerAskAboutFileCommand } from "./commands/askAboutFile";
import { registerExplainSelectionCommand } from "./commands/explainSelection";
import { registerFixSelectionCommand } from "./commands/fixSelection";
import { registerGenerateTestsCommand } from "./commands/generateTests";
import { registerCheckProviderBudgetsCommand } from "./commands/checkProviderBudgets";
import { registerInspectWorkspaceCommand } from "./commands/inspectWorkspace";
import { registerManageProvidersCommand } from "./commands/manageProviders";
import { registerOpenAgentCommand } from "./commands/openAgent";
import { registerPlanTaskCommand } from "./commands/planTask";
import { registerRefactorSelectionCommand } from "./commands/refactorSelection";
import { registerResetProviderStateCommand } from "./commands/resetProviderState";
import { registerRunAgentTaskCommand } from "./commands/runAgentTask";
import { registerShowPermissionsCommand } from "./commands/showPermissions";
import { registerShowProviderStatusCommand } from "./commands/showProviderStatus";
import { registerSwitchProviderCommand } from "./commands/switchProvider";
import { registerTestModelConnectionCommand } from "./commands/testModelConnection";
import { registerUpdatePermissionProfileCommand } from "./commands/updatePermissionProfile";
import { AgentPanel } from "./panels/AgentPanel";
import { SidebarTreeProvider } from "./panels/SidebarTreeProvider";
import { createOutputChannel } from "./ui/outputChannel";
import { createStatusBar } from "./ui/statusBar";

export function activate(context: vscode.ExtensionContext): void {
  const output = createOutputChannel();
  const statusBar = createStatusBar();
  const agentPanel = new AgentPanel(context.extensionUri, context, output);

  context.subscriptions.push(
    output,
    statusBar,
    vscode.window.registerWebviewViewProvider(AgentPanel.viewType, agentPanel),
    vscode.window.registerTreeDataProvider("borger.tasksView", SidebarTreeProvider.tasks()),
    vscode.window.registerTreeDataProvider("borger.changesView", SidebarTreeProvider.changes()),
    vscode.window.registerTreeDataProvider("borger.memoryView", SidebarTreeProvider.memory()),
    vscode.window.registerTreeDataProvider("borger.settingsView", SidebarTreeProvider.settings()),
    registerOpenAgentCommand(agentPanel),
    registerInspectWorkspaceCommand(context, output),
    registerTestModelConnectionCommand(context, output),
    registerPlanTaskCommand(context, output, agentPanel),
    registerAskAboutFileCommand(),
    registerExplainSelectionCommand(),
    registerFixSelectionCommand(),
    registerGenerateTestsCommand(),
    registerRefactorSelectionCommand(),
    registerRunAgentTaskCommand(),
    registerManageProvidersCommand(context),
    registerCheckProviderBudgetsCommand(context, output),
    registerSwitchProviderCommand(context),
    registerShowProviderStatusCommand(context, output),
    registerResetProviderStateCommand(context),
    registerShowPermissionsCommand(output),
    registerUpdatePermissionProfileCommand()
  );

  output.appendLine("Borger extension activated.");
}

export function deactivate(): void {
  // Registered disposables handle Phase 1 cleanup.
}
