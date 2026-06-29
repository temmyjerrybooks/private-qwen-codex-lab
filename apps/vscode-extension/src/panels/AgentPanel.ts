import * as vscode from "vscode";
import { buildWorkspaceContext } from "../agent/contextBuilder";
import {
  applyApprovedPendingChanges,
  applyPendingChangeById,
  explainLastError,
  generateCurrentFileFix,
  generateDiagnosticsFix,
  generateLastFailedCommandFix,
  generateProposedChanges,
  getFixModeStatus,
  runControlledTerminalCommand,
  revertLastAppliedChange
} from "../agent/executor";
import {
  clearPendingChanges,
  getPendingChange,
  getPendingChanges,
  markAllPendingChanges,
  markPendingChange,
  PendingChangeSet,
  setPendingChanges
} from "../agent/pendingChanges";
import { PlanTaskResult, planTask } from "../agent/planner";
import { getBorgerConfig } from "../config";
import { assertAuthorized, authorizeAction } from "../permissions/authorization";
import { loadPermissionState } from "../permissions/permissionState";
import { ProviderRouter } from "../providers/providerRouter";
import { clearCommandHistory, getCommandHistory } from "../terminal/commandHistory";
import { TerminalExecutionMode } from "../terminal/commandTypes";
import { formatCommandResultForOutput, formatCommandHistoryForOutput } from "../ui/commandOutputFormatter";
import { formatPendingChangesForOutput } from "../ui/diffProvider";
import { formatFixModeResultForOutput } from "../ui/fixResultFormatter";

export class AgentPanel implements vscode.WebviewViewProvider {
  static readonly viewType = "borger.agentView";

  private view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly context: vscode.ExtensionContext,
    private readonly output: vscode.OutputChannel
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, "dist", "webview"),
        vscode.Uri.joinPath(this.extensionUri, "src", "webview")
      ]
    };

    webviewView.webview.html = this.getHtml(webviewView.webview);
    webviewView.webview.onDidReceiveMessage((message: WebviewMessage) => {
      void this.handleMessage(message);
    });

    this.postState("Ready");
    void this.postProviderStatus();
    void this.postPermissionStatus();
    this.postPendingChanges(getPendingChanges());
    this.postCommandHistory();
    void this.postFixStatus();
  }

  async focus(): Promise<void> {
    await vscode.commands.executeCommand("workbench.view.extension.borger");
  }

  postState(status: string, body?: unknown): void {
    this.view?.webview.postMessage({
      type: "state",
      status,
      body,
      config: getBorgerConfig()
    });
  }

  postPlan(plan: PlanTaskResult | string): void {
    this.view?.webview.postMessage({ type: "plan", plan });
  }

  postPendingChanges(changeSet: PendingChangeSet | undefined): void {
    this.view?.webview.postMessage({ type: "pendingChanges", changeSet });
  }

  postCommandHistory(): void {
    this.view?.webview.postMessage({ type: "commandHistory", history: getCommandHistory() });
  }

  async postFixStatus(): Promise<void> {
    try {
      const status = await getFixModeStatus();
      this.view?.webview.postMessage({ type: "fixStatus", fixStatus: status });
    } catch (error) {
      this.view?.webview.postMessage({
        type: "fixStatus",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private postFixResult(result: Awaited<ReturnType<typeof generateDiagnosticsFix>>): void {
    this.view?.webview.postMessage({ type: "fixResult", result });
  }

  async generateProposedChanges(task: string): Promise<void> {
    this.postState("Generating proposed changes...");
    const changeSet = await generateProposedChanges(task, this.context);
    setPendingChanges(changeSet);
    this.output.show(true);
    this.output.appendLine(formatPendingChangesForOutput(changeSet));
    this.postPendingChanges(changeSet);
    await this.postProviderStatus();
    await this.postPermissionStatus();
  }

  async fixDiagnostics(userTask?: string): Promise<void> {
    this.postState("Generating diagnostic fix proposal...");
    const result = await generateDiagnosticsFix(this.context, userTask);
    this.handleFixModeResult(result);
    await this.postProviderStatus();
    await this.postPermissionStatus();
    await this.postFixStatus();
  }

  async fixLastFailedCommand(commandId?: string, userTask?: string): Promise<void> {
    this.postState("Generating failed-command fix proposal...");
    const result = await generateLastFailedCommandFix(this.context, commandId, userTask);
    this.handleFixModeResult(result);
    await this.postProviderStatus();
    await this.postPermissionStatus();
    await this.postFixStatus();
  }

  async fixCurrentFile(userTask?: string): Promise<void> {
    this.postState("Generating current-file fix proposal...");
    const result = await generateCurrentFileFix(this.context, userTask);
    this.handleFixModeResult(result);
    await this.postProviderStatus();
    await this.postPermissionStatus();
    await this.postFixStatus();
  }

  async explainLastError(userTask?: string): Promise<void> {
    this.postState("Explaining last error...");
    const result = await explainLastError(this.context, userTask);
    this.handleFixModeResult(result);
    await this.postProviderStatus();
    await this.postPermissionStatus();
    await this.postFixStatus();
  }

  async applyApprovedChanges(): Promise<void> {
    try {
      this.postState("Applying approved changes...");
      const result = await applyApprovedPendingChanges();
      this.output.show(true);
      this.output.appendLine(["Borger apply approved changes:", ...result.messages].join("\n"));
      this.postPendingChanges(result.changeSet);
      this.postState(`Applied ${result.applied}; failed ${result.failed}`);
      await this.postPermissionStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.postState("Apply approved changes failed", { error: message });
      throw error;
    }
  }

  async applyPendingChange(changeId: string): Promise<void> {
    try {
      this.postState("Applying pending change...");
      const result = await applyPendingChangeById(changeId);
      this.output.show(true);
      this.output.appendLine(["Borger apply pending change:", ...result.messages].join("\n"));
      this.postPendingChanges(result.changeSet);
      this.postState(`Applied ${result.applied}; failed ${result.failed}`);
      await this.postPermissionStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.postState("Apply pending change failed", { error: message });
      throw error;
    }
  }

  async revertLastApply(): Promise<void> {
    try {
      this.postState("Reverting last apply...");
      const message = await revertLastAppliedChange();
      this.output.show(true);
      this.output.appendLine(`Borger revert last apply: ${message}`);
      this.postState("Last apply reverted", { message });
      this.postPendingChanges(getPendingChanges());
      await this.postPermissionStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.postState("Revert last apply failed", { error: message });
      throw error;
    }
  }

  async runTerminalCommand(command: string, mode: TerminalExecutionMode = "captured"): Promise<void> {
    const trimmedCommand = command.trim();
    if (!trimmedCommand) {
      this.postState("Enter a command before running terminal execution.");
      return;
    }

    this.postState("Running terminal command...");
    const result = await runControlledTerminalCommand(trimmedCommand, mode);
    this.output.show(true);
    this.output.appendLine(formatCommandResultForOutput(result));
    this.postCommandHistory();
    this.postState(`Command ${result.status}`, {
      command: result.command,
      status: result.status,
      exitCode: result.exitCode,
      durationMs: result.durationMs,
      reason: result.reason
    });
    await this.postPermissionStatus();
  }

  async postProviderStatus(): Promise<void> {
    const router = new ProviderRouter(this.context);
    const reports = await router.getStatusReports();
    this.view?.webview.postMessage({ type: "providerStatus", reports });
  }

  async postPermissionStatus(): Promise<void> {
    try {
      const state = await loadPermissionState();
      this.view?.webview.postMessage({ type: "permissionStatus", state });
    } catch (error) {
      this.view?.webview.postMessage({
        type: "permissionStatus",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async handleMessage(message: WebviewMessage): Promise<void> {
    if (message.type === "inspectWorkspace") {
      try {
        const decision = await authorizeAction("read_workspace");
        assertAuthorized(decision);
        const summary = await buildWorkspaceContext(this.context);
        this.postState("Workspace inspected", summary);
        await this.postProviderStatus();
        await this.postPermissionStatus();
      } catch (error) {
        this.postState("Workspace inspection blocked", {
          error: error instanceof Error ? error.message : String(error)
        });
      }
      return;
    }

    if (message.type === "planTask" && typeof message.task === "string") {
      try {
        this.postState("Planning...");
        const result = await planTask(message.task, this.context);
        this.postPlan(result);
        await this.postProviderStatus();
        await this.postPermissionStatus();
      } catch (error) {
        this.postState("Planning failed", {
          error: error instanceof Error ? error.message : String(error)
        });
      }
      return;
    }

    if (message.type === "generateProposedChanges" && typeof message.task === "string") {
      try {
        await this.generateProposedChanges(message.task);
      } catch (error) {
        this.postState("Proposed changes failed", {
          error: error instanceof Error ? error.message : String(error)
        });
      }
      return;
    }

    if (message.type === "showPendingChanges") {
      this.postPendingChanges(getPendingChanges());
      return;
    }

    if (message.type === "fixDiagnostics") {
      try {
        await this.fixDiagnostics(message.task);
      } catch (error) {
        this.postState("Fix diagnostics failed", {
          error: error instanceof Error ? error.message : String(error)
        });
      }
      return;
    }

    if (message.type === "fixLastFailedCommand") {
      try {
        await this.fixLastFailedCommand(message.commandId, message.task);
      } catch (error) {
        this.postState("Fix last failed command failed", {
          error: error instanceof Error ? error.message : String(error)
        });
      }
      return;
    }

    if (message.type === "fixCurrentFile") {
      try {
        await this.fixCurrentFile(message.task);
      } catch (error) {
        this.postState("Fix current file failed", {
          error: error instanceof Error ? error.message : String(error)
        });
      }
      return;
    }

    if (message.type === "explainLastError") {
      try {
        await this.explainLastError(message.task);
      } catch (error) {
        this.postState("Explain last error failed", {
          error: error instanceof Error ? error.message : String(error)
        });
      }
      return;
    }

    if (message.type === "refreshFixStatus") {
      await this.postFixStatus();
      return;
    }

    if (message.type === "runTerminalCommand" && typeof message.command === "string") {
      try {
        await this.runTerminalCommand(message.command, normalizeTerminalMode(message.mode));
      } catch (error) {
        this.postState("Terminal command failed", {
          error: error instanceof Error ? error.message : String(error)
        });
        this.postCommandHistory();
      }
      return;
    }

    if (message.type === "showCommandHistory") {
      this.postCommandHistory();
      this.output.show(true);
      this.output.appendLine(formatCommandHistoryForOutput(getCommandHistory()));
      return;
    }

    if (message.type === "clearCommandHistory") {
      clearCommandHistory();
      this.postCommandHistory();
      this.postState("Command history cleared");
      return;
    }

    if (message.type === "showAppliedChanges") {
      this.postPendingChanges(getPendingChanges());
      this.postState("Showing applied changes");
      return;
    }

    if (message.type === "clearPendingChanges") {
      clearPendingChanges();
      this.postPendingChanges(undefined);
      return;
    }

    if (message.type === "approvePendingChange" && typeof message.changeId === "string") {
      await this.approvePendingChange(message.changeId);
      return;
    }

    if (message.type === "rejectPendingChange" && typeof message.changeId === "string") {
      this.postPendingChanges(markPendingChange(message.changeId, "rejected"));
      return;
    }

    if (message.type === "applyPendingChange" && typeof message.changeId === "string") {
      try {
        await this.applyPendingChange(message.changeId);
      } catch {
        this.postPendingChanges(getPendingChanges());
      }
      return;
    }

    if (message.type === "approveAllPendingChanges") {
      await this.approveAllPendingChanges();
      return;
    }

    if (message.type === "rejectAllPendingChanges") {
      this.postPendingChanges(markAllPendingChanges("rejected"));
      return;
    }

    if (message.type === "applyApprovedChanges") {
      try {
        await this.applyApprovedChanges();
      } catch {
        this.postPendingChanges(getPendingChanges());
      }
      return;
    }

    if (message.type === "revertLastApply") {
      try {
        await this.revertLastApply();
      } catch {
        this.postPendingChanges(getPendingChanges());
      }
      return;
    }

    if (message.type === "refreshProviderStatus") {
      await this.postProviderStatus();
      return;
    }

    if (message.type === "refreshPermissionStatus") {
      await this.postPermissionStatus();
      return;
    }

    this.output.appendLine(`Unhandled webview message: ${JSON.stringify(message)}`);
  }

  private async approvePendingChange(changeId: string): Promise<void> {
    const change = getPendingChange(changeId);
    if (!change) {
      this.postState("Pending change not found");
      return;
    }

    const action = change.action === "create" ? "create_file" : change.action === "delete" ? "delete_file" : "write_file";
    const decision = await authorizeAction(action, { filePath: change.path });
    if (!decision.allowed) {
      this.postState("Approval blocked", { error: decision.reason });
      return;
    }

    this.postPendingChanges(markPendingChange(changeId, "approved"));
  }

  private handleFixModeResult(result: Awaited<ReturnType<typeof generateDiagnosticsFix>>): void {
    this.output.show(true);
    this.output.appendLine(formatFixModeResultForOutput(result));
    if (result.changeSet) {
      setPendingChanges(result.changeSet);
      this.postPendingChanges(result.changeSet);
    }
    this.postFixResult(result);
    this.postState(result.changeSet ? "Fix proposal generated for review" : "Fix explanation generated");
  }

  private async approveAllPendingChanges(): Promise<void> {
    const changeSet = getPendingChanges();
    if (!changeSet) {
      this.postPendingChanges(undefined);
      return;
    }

    for (const change of changeSet.changes) {
      if (change.status === "invalid" || change.status === "applied") {
        continue;
      }
      const action = change.action === "create" ? "create_file" : change.action === "delete" ? "delete_file" : "write_file";
      const decision = await authorizeAction(action, { filePath: change.path });
      if (!decision.allowed) {
        this.postState("Approve all blocked", { error: `${change.path}: ${decision.reason}` });
        this.postPendingChanges(getPendingChanges());
        return;
      }
    }

    this.postPendingChanges(markAllPendingChanges("approved"));
  }

  private getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, "dist", "webview", "main.js"));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, "src", "webview", "styles.css"));
    const config = getBorgerConfig();

    return String.raw`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${styleUri}">
  <title>Borger</title>
</head>
<body>
  <main class="shell">
    <header class="topbar">
      <div>
        <h1>Borger</h1>
        <p id="workspace">No workspace inspected yet</p>
      </div>
      <span id="status">Ready</span>
    </header>

    <section class="meta">
      <span>Mode: <strong>${config.mode}</strong></span>
      <span>Model: <strong>${config.model}</strong></span>
    </section>

    <section class="provider-box">
      <div class="section-title">
        <h2>Context</h2>
      </div>
      <dl id="contextStatus" class="provider-status">
        <div><dt>Status</dt><dd>Not inspected</dd></div>
      </dl>
    </section>

    <section class="provider-box">
      <div class="section-title">
        <h2>Permissions</h2>
        <button id="permissionRefreshButton">Refresh</button>
      </div>
      <dl id="permissionStatus" class="provider-status">
        <div><dt>Profile</dt><dd>Checking...</dd></div>
      </dl>
    </section>

    <section class="provider-box">
      <div class="section-title">
        <h2>Provider</h2>
        <button id="providerRefreshButton">Refresh</button>
      </div>
      <dl id="providerStatus" class="provider-status">
        <div><dt>Active</dt><dd>Checking...</dd></div>
      </dl>
    </section>

    <section class="task-box">
      <textarea id="taskInput" rows="5" placeholder="Plan a task for this workspace"></textarea>
      <div class="actions">
        <button id="inspectButton">Inspect</button>
        <button id="planButton">Plan</button>
        <button id="generateButton">Generate Proposed Changes</button>
      </div>
    </section>

    <section class="output">
      <h2>Plan</h2>
      <div id="planOutput" class="plan-output empty">Ask Borger to inspect the workspace or plan a task.</div>
    </section>

    <section class="output">
      <div class="section-title">
        <h2>Fix Mode</h2>
        <button id="fixRefreshButton">Refresh</button>
      </div>
      <dl id="fixStatus" class="provider-status">
        <div><dt>Diagnostics</dt><dd>Checking...</dd></div>
      </dl>
      <div class="actions">
        <button id="fixDiagnosticsButton">Fix Diagnostics</button>
        <button id="fixLastCommandButton">Fix Last Failed Command</button>
        <button id="fixCurrentFileButton">Fix Current File</button>
        <button id="explainLastErrorButton">Explain Last Error</button>
      </div>
      <div id="fixOutput" class="fix-output empty">No fix proposal generated.</div>
    </section>

    <section class="output">
      <div class="section-title">
        <h2>Pending Changes</h2>
        <div class="change-actions">
          <button id="approveAllButton">Approve All</button>
          <button id="rejectAllButton">Reject All</button>
          <button id="applyApprovedButton">Apply Approved Changes</button>
          <button id="showAppliedButton">Show Applied Changes</button>
          <button id="revertLastApplyButton">Revert Last Apply</button>
          <button id="regenerateButton">Regenerate</button>
          <button id="clearPendingButton">Clear</button>
        </div>
      </div>
      <div id="pendingChangesOutput" class="pending-output empty">No pending changes.</div>
    </section>

    <section class="output">
      <div class="section-title">
        <h2>Terminal</h2>
        <div class="change-actions">
          <button id="showCommandHistoryButton">Show History</button>
          <button id="clearCommandHistoryButton">Clear History</button>
        </div>
      </div>
      <div class="terminal-input-row">
        <input id="commandInput" type="text" placeholder="npm run build">
        <button id="runCommandButton">Run</button>
      </div>
      <div id="commandOutput" class="command-output empty">No terminal commands run this session.</div>
    </section>
  </main>
  <script src="${scriptUri}"></script>
</body>
</html>`;
  }
}

interface WebviewMessage {
  type: string;
  task?: string;
  changeId?: string;
  commandId?: string;
  command?: string;
  mode?: string;
}

function normalizeTerminalMode(value: string | undefined): TerminalExecutionMode {
  return value === "interactive" ? "interactive" : "captured";
}
