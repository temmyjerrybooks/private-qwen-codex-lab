import * as vscode from "vscode";
import {
  getAutoModeState,
  onAutoModeStateChanged,
  runAutoMode as runAutoModeLoop,
  stopAutoMode as stopAutoModeLoop
} from "../agent/autoMode";
import { AutoModeRunState } from "../agent/autoTypes";
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
import { logAction } from "../permissions/actionLogger";
import { loadPermissionState } from "../permissions/permissionState";
import { ProviderRouter } from "../providers/providerRouter";
import { clearCommandHistory, getCommandHistory } from "../terminal/commandHistory";
import { TerminalExecutionMode } from "../terminal/commandTypes";
import { formatCommandResultForOutput, formatCommandHistoryForOutput } from "../ui/commandOutputFormatter";
import { formatPendingChangesForOutput } from "../ui/diffProvider";
import { formatFixModeResultForOutput } from "../ui/fixResultFormatter";
import { formatAutoModeStateForOutput } from "../ui/autoModeFormatter";
import { generateCommitMessageWithModel } from "../git/commitMessage";
import { preparePullRequestWithGitHubCli } from "../git/githubCli";
import {
  createGitBranch as createGitBranchWorkflow,
  createGitCommit as createGitCommitWorkflow,
  getGitWorkflowState,
  pushGitBranch as pushGitBranchWorkflow,
  refreshGitWorkflowState,
  setGeneratedCommitMessage,
  setPullRequestPreparation,
  stageGitFiles
} from "../git/gitWorkflow";
import { formatGitWorkflowStateForOutput } from "../ui/gitWorkflowFormatter";
import { getEnabledRemoteHosts, loadRemoteHostsConfig, openRemoteHostsConfig } from "../remote/remoteConfig";
import { getRemoteHistory } from "../remote/remoteHistory";
import {
  getRemoteOpsState,
  inspectRemoteProject as inspectRemoteProjectRunner,
  runRemoteCommand as runRemoteCommandRunner,
  testSshConnection as testSshConnectionRunner
} from "../remote/sshRunner";
import { RemoteHostConfig } from "../remote/remoteTypes";
import {
  formatRemoteCommandResultForOutput,
  formatRemoteHistoryForOutput,
  formatRemoteInspectionForOutput,
  formatRemoteOpsStateForOutput
} from "../ui/remoteOpsFormatter";
import { addProjectNote as addProjectNoteToStore } from "../memory/projectNotes";
import { clearProjectMemory as clearProjectMemoryStore, getProjectMemoryState, updateProjectSummaryFromContext } from "../memory/projectMemory";
import { ProjectNoteType } from "../memory/memoryTypes";
import { formatProjectMemoryStateForOutput, formatProjectNoteForOutput } from "../memory/memoryFormatter";

export class AgentPanel implements vscode.WebviewViewProvider {
  static readonly viewType = "borger.agentView";

  private view?: vscode.WebviewView;
  private readonly autoModeSubscription: vscode.Disposable;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly context: vscode.ExtensionContext,
    private readonly output: vscode.OutputChannel
  ) {
    this.autoModeSubscription = onAutoModeStateChanged((state) => this.postAutoModeState(state));
  }

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
    this.postAutoModeState();
    this.postGitWorkflowState();
    void this.postRemoteOpsState();
    void this.postProjectMemoryState();
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

  postAutoModeState(state: AutoModeRunState = getAutoModeState()): void {
    this.view?.webview.postMessage({ type: "autoModeState", autoMode: state });
  }

  postGitWorkflowState(): void {
    this.view?.webview.postMessage({ type: "gitWorkflowState", git: getGitWorkflowState() });
  }

  async postRemoteOpsState(): Promise<void> {
    try {
      const remoteOps = await getRemoteOpsState();
      this.view?.webview.postMessage({ type: "remoteOpsState", remoteOps });
    } catch (error) {
      this.view?.webview.postMessage({
        type: "remoteOpsState",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async postProjectMemoryState(): Promise<void> {
    try {
      const projectMemory = await getProjectMemoryState();
      this.view?.webview.postMessage({ type: "projectMemoryState", projectMemory });
    } catch (error) {
      this.view?.webview.postMessage({
        type: "projectMemoryState",
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

  async runAutoMode(task: string): Promise<void> {
    this.postState("Running Auto Mode...");
    const result = await runAutoModeLoop(task, this.context);
    this.output.show(true);
    this.output.appendLine(formatAutoModeStateForOutput(result));
    this.postAutoModeState(result);
    this.postPendingChanges(getPendingChanges());
    this.postCommandHistory();
    await this.postFixStatus();
    await this.postProviderStatus();
    await this.postPermissionStatus();
  }

  async stopAutoMode(): Promise<void> {
    const result = await stopAutoModeLoop();
    this.output.show(true);
    this.output.appendLine(formatAutoModeStateForOutput(result));
    this.postAutoModeState(result);
    this.postState("Auto Mode stop requested");
  }

  async refreshGitStatus(): Promise<void> {
    this.postState("Refreshing Git status...");
    const state = await refreshGitWorkflowState();
    this.output.show(true);
    this.output.appendLine(formatGitWorkflowStateForOutput(state));
    this.postGitWorkflowState();
  }

  async createGitBranch(branchName?: string): Promise<void> {
    const name =
      branchName ||
      (await vscode.window.showInputBox({
        title: "Borger Create Git Branch",
        prompt: "Enter a safe new branch name.",
        ignoreFocusOut: true
      }));
    if (!name) {
      return;
    }
    this.postState("Creating Git branch...");
    const state = await createGitBranchWorkflow(name);
    this.output.show(true);
    this.output.appendLine(formatGitWorkflowStateForOutput(state));
    this.postGitWorkflowState();
  }

  async stageAllSafeGitChanges(): Promise<void> {
    this.postState("Staging all safe Git changes...");
    const state = await refreshGitWorkflowState();
    const updated = await stageGitFiles(state.safeStageableFiles.map((file) => file.path));
    this.output.show(true);
    this.output.appendLine(formatGitWorkflowStateForOutput(updated));
    this.postGitWorkflowState();
  }

  async stageSelectedGitChanges(): Promise<void> {
    const state = await refreshGitWorkflowState();
    const selected = await vscode.window.showQuickPick(
      state.safeStageableFiles.map((file) => ({
        label: file.path,
        description: `${file.indexStatus}${file.workingTreeStatus}`,
        file
      })),
      {
        title: "Borger Stage Git Changes",
        placeHolder: "Select safe files to stage",
        canPickMany: true
      }
    );
    if (!selected || selected.length === 0) {
      this.postGitWorkflowState();
      return;
    }
    this.postState("Staging selected Git changes...");
    const updated = await stageGitFiles(selected.map((item) => item.file.path));
    this.output.show(true);
    this.output.appendLine(formatGitWorkflowStateForOutput(updated));
    this.postGitWorkflowState();
  }

  async generateGitCommitMessage(): Promise<void> {
    this.postState("Generating commit message...");
    const workspaceFolder = this.requireWorkspaceFolder();
    const state = await refreshGitWorkflowState();
    const message = await generateCommitMessageWithModel(this.context, workspaceFolder, state);
    const updated = setGeneratedCommitMessage(message);
    const permissionState = await loadPermissionState();
    await logAction({
      actionType: "git_commit_message_generated",
      allowed: true,
      requiresConfirmation: false,
      reason: "Generated commit message through provider router.",
      profile: permissionState.profile.id,
      status: "succeeded"
    });
    this.output.show(true);
    this.output.appendLine(formatGitWorkflowStateForOutput(updated));
    this.postGitWorkflowState();
  }

  async setGitCommitMessage(message: string): Promise<void> {
    const updated = setGeneratedCommitMessage(message);
    this.output.show(true);
    this.output.appendLine(formatGitWorkflowStateForOutput(updated));
    this.postGitWorkflowState();
  }

  async createGitCommit(message?: string): Promise<void> {
    const commitMessage =
      message ||
      getGitWorkflowState().generatedCommitMessage ||
      (await vscode.window.showInputBox({
        title: "Borger Create Git Commit",
        prompt: "Enter a commit message.",
        ignoreFocusOut: true
      }));
    if (!commitMessage) {
      return;
    }
    this.postState("Creating Git commit...");
    const state = await createGitCommitWorkflow(commitMessage);
    this.output.show(true);
    this.output.appendLine(formatGitWorkflowStateForOutput(state));
    this.postGitWorkflowState();
  }

  async pushGitBranch(): Promise<void> {
    this.postState("Pushing Git branch...");
    const state = await pushGitBranchWorkflow();
    this.output.show(true);
    this.output.appendLine(formatGitWorkflowStateForOutput(state));
    this.postGitWorkflowState();
  }

  async preparePullRequest(): Promise<void> {
    this.postState("Preparing pull request...");
    const workspaceFolder = this.requireWorkspaceFolder();
    const state = await refreshGitWorkflowState();
    const pullRequest = await preparePullRequestWithGitHubCli(workspaceFolder, state);
    const updated = setPullRequestPreparation(pullRequest);
    this.output.show(true);
    this.output.appendLine(formatGitWorkflowStateForOutput(updated));
    this.postGitWorkflowState();
  }

  async showRemoteHosts(): Promise<void> {
    this.postState("Opening remote hosts config...");
    await openRemoteHostsConfig();
    const state = await getRemoteOpsState();
    this.output.show(true);
    this.output.appendLine(formatRemoteOpsStateForOutput(state));
    await this.postRemoteOpsState();
  }

  async testSshConnection(hostId?: string, remoteCwd?: string): Promise<void> {
    const host = await this.resolveRemoteHost(hostId);
    const cwd = remoteCwd || (await this.promptRemoteCwd(host, "Borger Test SSH Connection"));
    if (!cwd) {
      return;
    }
    this.postState("Testing SSH connection...");
    const result = await testSshConnectionRunner(host.id, cwd);
    this.output.show(true);
    this.output.appendLine(formatRemoteCommandResultForOutput(result));
    await this.postRemoteOpsState();
    await this.postPermissionStatus();
  }

  async runRemoteCommand(hostId?: string, command?: string, remoteCwd?: string): Promise<void> {
    const host = await this.resolveRemoteHost(hostId);
    const cwd = remoteCwd || (await this.promptRemoteCwd(host, "Borger Run Remote Command"));
    if (!cwd) {
      return;
    }
    const remoteCommand =
      command ||
      (await vscode.window.showInputBox({
        title: "Borger Run Remote Command",
        prompt: "Enter a safe remote command for the selected allowlisted host.",
        placeHolder: "git status --short",
        ignoreFocusOut: true
      }));
    if (!remoteCommand?.trim()) {
      return;
    }

    this.postState("Running remote command...");
    const result = await runRemoteCommandRunner({
      hostId: host.id,
      command: remoteCommand,
      remoteCwd: cwd
    });
    this.output.show(true);
    this.output.appendLine(formatRemoteCommandResultForOutput(result));
    await this.postRemoteOpsState();
    await this.postPermissionStatus();
  }

  async inspectRemoteProject(hostId?: string, remoteCwd?: string): Promise<void> {
    const host = await this.resolveRemoteHost(hostId);
    const cwd = remoteCwd || (await this.promptRemoteCwd(host, "Borger Inspect Remote Project"));
    if (!cwd) {
      return;
    }
    this.postState("Inspecting remote project...");
    const inspection = await inspectRemoteProjectRunner(host.id, cwd);
    this.output.show(true);
    this.output.appendLine(formatRemoteInspectionForOutput(inspection));
    await this.postRemoteOpsState();
    await this.postPermissionStatus();
  }

  async showRemoteHistory(): Promise<void> {
    const history = getRemoteHistory();
    this.output.show(true);
    this.output.appendLine(formatRemoteHistoryForOutput(history));
    await this.postRemoteOpsState();
    this.postState("Remote history shown");
  }

  async showProjectMemory(): Promise<void> {
    this.postState("Loading project memory...");
    const state = await getProjectMemoryState();
    const permissionState = await loadPermissionState();
    await logAction({
      actionType: "project_memory_loaded",
      allowed: true,
      requiresConfirmation: false,
      reason: "Loaded local project memory and notes.",
      profile: permissionState.profile.id,
      status: "succeeded"
    });
    this.output.show(true);
    this.output.appendLine(formatProjectMemoryStateForOutput(state));
    await this.postProjectMemoryState();
  }

  async addProjectNote(): Promise<void> {
    const title = await vscode.window.showInputBox({
      title: "Borger Add Project Note",
      prompt: "Short note title. Do not include secrets.",
      ignoreFocusOut: true
    });
    if (!title) {
      return;
    }

    const typePick = await vscode.window.showQuickPick<NoteTypePick>(
      projectNoteTypePicks,
      {
        title: "Borger Project Note Type",
        placeHolder: "Choose what kind of memory this is"
      }
    );
    if (!typePick) {
      return;
    }

    const body = await vscode.window.showInputBox({
      title: "Borger Add Project Note",
      prompt: "Note body. Do not include secrets, tokens, private keys, or .env contents.",
      ignoreFocusOut: true
    });
    if (body === undefined) {
      return;
    }

    const tagsInput = await vscode.window.showInputBox({
      title: "Borger Project Note Tags",
      prompt: "Optional comma-separated tags.",
      placeHolder: "phase-12b, architecture",
      ignoreFocusOut: true
    });

    this.postState("Adding project note...");
    const note = await addProjectNoteToStore({
      title,
      type: typePick.type,
      body,
      tags: splitTags(tagsInput)
    });
    this.output.show(true);
    this.output.appendLine(formatProjectNoteForOutput(note));
    await this.postProjectMemoryState();
  }

  async updateProjectSummary(): Promise<void> {
    this.postState("Updating project summary...");
    const workspaceContext = await buildWorkspaceContext(this.context, "Update local project memory summary");
    const memory = await updateProjectSummaryFromContext(this.context, workspaceContext);
    this.output.show(true);
    this.output.appendLine(`Updated project memory summary for ${memory.projectName}.\n\n${memory.summary}`);
    await this.postProjectMemoryState();
    await this.postProviderStatus();
    await this.postPermissionStatus();
  }

  async clearProjectMemory(): Promise<void> {
    this.postState("Clearing project memory...");
    await clearProjectMemoryStore();
    this.output.show(true);
    this.output.appendLine("Cleared Borger project memory and notes.");
    await this.postProjectMemoryState();
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

    if (message.type === "runAutoMode" && typeof message.task === "string") {
      try {
        await this.runAutoMode(message.task);
      } catch (error) {
        this.postState("Auto Mode failed", {
          error: error instanceof Error ? error.message : String(error)
        });
        this.postAutoModeState();
      }
      return;
    }

    if (message.type === "stopAutoMode") {
      try {
        await this.stopAutoMode();
      } catch (error) {
        this.postState("Stop Auto Mode failed", {
          error: error instanceof Error ? error.message : String(error)
        });
      }
      return;
    }

    if (message.type === "refreshAutoModeStatus") {
      this.postAutoModeState();
      return;
    }

    if (message.type === "refreshGitStatus") {
      try {
        await this.refreshGitStatus();
      } catch (error) {
        this.postState("Git status failed", {
          error: error instanceof Error ? error.message : String(error)
        });
      }
      return;
    }

    if (message.type === "createGitBranch") {
      try {
        await this.createGitBranch();
      } catch (error) {
        this.postState("Create Git branch failed", {
          error: error instanceof Error ? error.message : String(error)
        });
      }
      return;
    }

    if (message.type === "stageSelectedGitChanges") {
      try {
        await this.stageSelectedGitChanges();
      } catch (error) {
        this.postState("Stage Git changes failed", {
          error: error instanceof Error ? error.message : String(error)
        });
      }
      return;
    }

    if (message.type === "stageAllGitChanges") {
      try {
        await this.stageAllSafeGitChanges();
      } catch (error) {
        this.postState("Stage all Git changes failed", {
          error: error instanceof Error ? error.message : String(error)
        });
      }
      return;
    }

    if (message.type === "generateCommitMessage") {
      try {
        await this.generateGitCommitMessage();
      } catch (error) {
        this.postState("Generate commit message failed", {
          error: error instanceof Error ? error.message : String(error)
        });
      }
      return;
    }

    if (message.type === "createGitCommit") {
      try {
        await this.createGitCommit();
      } catch (error) {
        this.postState("Create Git commit failed", {
          error: error instanceof Error ? error.message : String(error)
        });
      }
      return;
    }

    if (message.type === "pushGitBranch") {
      try {
        await this.pushGitBranch();
      } catch (error) {
        this.postState("Push Git branch failed", {
          error: error instanceof Error ? error.message : String(error)
        });
      }
      return;
    }

    if (message.type === "preparePullRequest") {
      try {
        await this.preparePullRequest();
      } catch (error) {
        this.postState("Prepare pull request failed", {
          error: error instanceof Error ? error.message : String(error)
        });
      }
      return;
    }

    if (message.type === "showRemoteHosts") {
      try {
        await this.showRemoteHosts();
      } catch (error) {
        this.postState("Show remote hosts failed", {
          error: error instanceof Error ? error.message : String(error)
        });
      }
      return;
    }

    if (message.type === "refreshRemoteOps") {
      await this.postRemoteOpsState();
      return;
    }

    if (message.type === "testSshConnection") {
      try {
        await this.testSshConnection(message.hostId, message.remoteCwd);
      } catch (error) {
        this.postState("Test SSH connection failed", {
          error: error instanceof Error ? error.message : String(error)
        });
        await this.postRemoteOpsState();
      }
      return;
    }

    if (message.type === "runRemoteCommand" && typeof message.command === "string") {
      try {
        await this.runRemoteCommand(message.hostId, message.command, message.remoteCwd);
      } catch (error) {
        this.postState("Remote command failed", {
          error: error instanceof Error ? error.message : String(error)
        });
        await this.postRemoteOpsState();
      }
      return;
    }

    if (message.type === "inspectRemoteProject") {
      try {
        await this.inspectRemoteProject(message.hostId, message.remoteCwd);
      } catch (error) {
        this.postState("Inspect remote project failed", {
          error: error instanceof Error ? error.message : String(error)
        });
        await this.postRemoteOpsState();
      }
      return;
    }

    if (message.type === "showRemoteHistory") {
      await this.showRemoteHistory();
      return;
    }

    if (message.type === "showProjectMemory") {
      try {
        await this.showProjectMemory();
      } catch (error) {
        this.postState("Show project memory failed", {
          error: error instanceof Error ? error.message : String(error)
        });
        await this.postProjectMemoryState();
      }
      return;
    }

    if (message.type === "addProjectNote") {
      try {
        await this.addProjectNote();
      } catch (error) {
        this.postState("Add project note failed", {
          error: error instanceof Error ? error.message : String(error)
        });
        await this.postProjectMemoryState();
      }
      return;
    }

    if (message.type === "updateProjectSummary") {
      try {
        await this.updateProjectSummary();
      } catch (error) {
        this.postState("Update project summary failed", {
          error: error instanceof Error ? error.message : String(error)
        });
        await this.postProjectMemoryState();
      }
      return;
    }

    if (message.type === "clearProjectMemory") {
      try {
        await this.clearProjectMemory();
      } catch (error) {
        this.postState("Clear project memory failed", {
          error: error instanceof Error ? error.message : String(error)
        });
        await this.postProjectMemoryState();
      }
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
      <div class="section-title">
        <h2>Auto Mode</h2>
        <button id="autoRefreshButton">Refresh</button>
      </div>
      <div class="actions">
        <button id="runAutoModeButton">Run Auto Mode</button>
        <button id="stopAutoModeButton">Stop Auto Mode</button>
      </div>
      <div id="autoModeOutput" class="auto-output empty">Auto Mode is idle.</div>
    </section>

    <section class="output">
      <div class="section-title">
        <h2>Git Workflow</h2>
        <button id="gitRefreshButton">Refresh</button>
      </div>
      <div class="actions">
        <button id="createBranchButton">Create Branch</button>
        <button id="stageSelectedButton">Stage Selected</button>
        <button id="stageAllButton">Stage All Safe Files</button>
        <button id="generateCommitMessageButton">Generate Commit Message</button>
        <button id="createCommitButton">Commit</button>
        <button id="pushBranchButton">Push</button>
        <button id="preparePrButton">Prepare Pull Request</button>
      </div>
      <div id="gitWorkflowOutput" class="git-output empty">Git status has not been loaded.</div>
    </section>

    <section class="output">
      <div class="section-title">
        <h2>Remote Ops</h2>
        <button id="remoteRefreshButton">Refresh</button>
      </div>
      <div class="remote-input-grid">
        <label>
          Host
          <select id="remoteHostSelect"></select>
        </label>
        <label>
          Remote cwd
          <input id="remoteCwdInput" type="text" placeholder="/var/www/app">
        </label>
      </div>
      <div class="terminal-input-row">
        <input id="remoteCommandInput" type="text" placeholder="git status --short">
        <button id="runRemoteCommandButton">Run Remote Command</button>
      </div>
      <div class="actions">
        <button id="showRemoteHostsButton">Show Remote Hosts</button>
        <button id="testSshButton">Test SSH Connection</button>
        <button id="inspectRemoteButton">Inspect Remote Project</button>
        <button id="showRemoteHistoryButton">Show Remote History</button>
      </div>
      <div id="remoteOpsOutput" class="remote-output empty">Remote hosts have not been loaded.</div>
    </section>

    <section class="output">
      <div class="section-title">
        <h2>Project Memory</h2>
        <button id="memoryRefreshButton">Refresh</button>
      </div>
      <div class="actions">
        <button id="showMemoryButton">Show Project Memory</button>
        <button id="addNoteButton">Add Project Note</button>
        <button id="updateSummaryButton">Update Project Summary</button>
        <button id="clearMemoryButton">Clear Project Memory</button>
      </div>
      <div id="projectMemoryOutput" class="memory-output empty">No project memory loaded.</div>
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

  private async resolveRemoteHost(hostId?: string): Promise<RemoteHostConfig> {
    const loaded = await loadRemoteHostsConfig();
    const enabledHosts = getEnabledRemoteHosts(loaded.config);
    if (enabledHosts.length === 0) {
      await openRemoteHostsConfig();
      throw new Error("No enabled remote host is configured. Update .borger/remote-hosts.local.json and set enabled to true.");
    }

    if (hostId) {
      const selected = enabledHosts.find((host) => host.id === hostId);
      if (!selected) {
        throw new Error(`Remote host '${hostId}' is not enabled or not configured.`);
      }
      return selected;
    }

    if (enabledHosts.length === 1) {
      return enabledHosts[0];
    }

    const picked = await vscode.window.showQuickPick(
      enabledHosts.map((host) => ({
        label: host.label,
        description: host.id,
        detail: `${host.username ? `${host.username}@` : ""}${host.host}:${host.port} cwd=${host.defaultRemoteCwd}`,
        host
      })),
      {
        title: "Borger Remote Host",
        placeHolder: "Select an enabled allowlisted SSH host"
      }
    );
    if (!picked) {
      throw new Error("No remote host selected.");
    }
    return picked.host;
  }

  private async promptRemoteCwd(host: RemoteHostConfig, title: string): Promise<string | undefined> {
    return vscode.window.showInputBox({
      title,
      prompt: `Remote working directory for ${host.label}. Must be inside allowedRemoteCwds.`,
      value: host.defaultRemoteCwd,
      ignoreFocusOut: true
    });
  }

  private requireWorkspaceFolder(): vscode.WorkspaceFolder {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error("Open a workspace folder before using Borger workflow.");
    }
    return workspaceFolder;
  }
}

interface WebviewMessage {
  type: string;
  task?: string;
  changeId?: string;
  commandId?: string;
  command?: string;
  mode?: string;
  hostId?: string;
  remoteCwd?: string;
}

interface NoteTypePick extends vscode.QuickPickItem {
  type: ProjectNoteType;
}

const projectNoteTypePicks: NoteTypePick[] = [
  { label: "Decision", type: "decision" },
  { label: "Todo", type: "todo" },
  { label: "Warning", type: "warning" },
  { label: "Architecture", type: "architecture" },
  { label: "Command", type: "command" },
  { label: "Limitation", type: "limitation" },
  { label: "General", type: "general" }
];

function normalizeTerminalMode(value: string | undefined): TerminalExecutionMode {
  return value === "interactive" ? "interactive" : "captured";
}

function splitTags(value: string | undefined): string[] {
  return value
    ? value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];
}
