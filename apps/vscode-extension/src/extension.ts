import * as vscode from "vscode";
import { registerAskAboutFileCommand } from "./commands/askAboutFile";
import { registerExplainSelectionCommand } from "./commands/explainSelection";
import { registerFixSelectionCommand } from "./commands/fixSelection";
import { registerGenerateTestsCommand } from "./commands/generateTests";
import { registerInspectWorkspaceCommand } from "./commands/inspectWorkspace";
import { registerOpenAgentCommand } from "./commands/openAgent";
import { registerPlanTaskCommand } from "./commands/planTask";
import { registerRefactorSelectionCommand } from "./commands/refactorSelection";
import { registerRunAgentTaskCommand } from "./commands/runAgentTask";
import { registerTestModelConnectionCommand } from "./commands/testModelConnection";
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
    registerInspectWorkspaceCommand(output),
    registerTestModelConnectionCommand(context, output),
    registerPlanTaskCommand(context, output, agentPanel),
    registerAskAboutFileCommand(),
    registerExplainSelectionCommand(),
    registerFixSelectionCommand(),
    registerGenerateTestsCommand(),
    registerRefactorSelectionCommand(),
    registerRunAgentTaskCommand()
  );

  output.appendLine("Borger extension activated.");
}

export function deactivate(): void {
  // Registered disposables handle Phase 1 cleanup.
}
