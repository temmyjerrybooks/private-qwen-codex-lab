declare const acquireVsCodeApi: () => {
  postMessage(message: unknown): void;
};

const vscode = acquireVsCodeApi();

const statusEl = document.getElementById("status");
const workspaceEl = document.getElementById("workspace");
const contextStatusEl = document.getElementById("contextStatus");
const planOutputEl = document.getElementById("planOutput");
const autoModeOutputEl = document.getElementById("autoModeOutput");
const runAutoModeButton = document.getElementById("runAutoModeButton");
const stopAutoModeButton = document.getElementById("stopAutoModeButton");
const autoRefreshButton = document.getElementById("autoRefreshButton");
const gitWorkflowOutputEl = document.getElementById("gitWorkflowOutput");
const gitRefreshButton = document.getElementById("gitRefreshButton");
const createBranchButton = document.getElementById("createBranchButton");
const stageSelectedButton = document.getElementById("stageSelectedButton");
const stageAllButton = document.getElementById("stageAllButton");
const generateCommitMessageButton = document.getElementById("generateCommitMessageButton");
const createCommitButton = document.getElementById("createCommitButton");
const pushBranchButton = document.getElementById("pushBranchButton");
const preparePrButton = document.getElementById("preparePrButton");
const remoteOpsOutputEl = document.getElementById("remoteOpsOutput");
const remoteRefreshButton = document.getElementById("remoteRefreshButton");
const remoteHostSelectEl = document.getElementById("remoteHostSelect") as HTMLSelectElement | null;
const remoteCwdInputEl = document.getElementById("remoteCwdInput") as HTMLInputElement | null;
const remoteCommandInputEl = document.getElementById("remoteCommandInput") as HTMLInputElement | null;
const showRemoteHostsButton = document.getElementById("showRemoteHostsButton");
const testSshButton = document.getElementById("testSshButton");
const inspectRemoteButton = document.getElementById("inspectRemoteButton");
const runRemoteCommandButton = document.getElementById("runRemoteCommandButton");
const showRemoteHistoryButton = document.getElementById("showRemoteHistoryButton");
const projectMemoryOutputEl = document.getElementById("projectMemoryOutput");
const memoryRefreshButton = document.getElementById("memoryRefreshButton");
const showMemoryButton = document.getElementById("showMemoryButton");
const addNoteButton = document.getElementById("addNoteButton");
const updateSummaryButton = document.getElementById("updateSummaryButton");
const clearMemoryButton = document.getElementById("clearMemoryButton");
const fixStatusEl = document.getElementById("fixStatus");
const fixOutputEl = document.getElementById("fixOutput");
const fixRefreshButton = document.getElementById("fixRefreshButton");
const fixDiagnosticsButton = document.getElementById("fixDiagnosticsButton");
const fixLastCommandButton = document.getElementById("fixLastCommandButton");
const fixCurrentFileButton = document.getElementById("fixCurrentFileButton");
const explainLastErrorButton = document.getElementById("explainLastErrorButton");
const taskInputEl = document.getElementById("taskInput") as HTMLTextAreaElement | null;
const inspectButton = document.getElementById("inspectButton");
const planButton = document.getElementById("planButton");
const generateButton = document.getElementById("generateButton");
const providerRefreshButton = document.getElementById("providerRefreshButton");
const providerStatusEl = document.getElementById("providerStatus");
const permissionRefreshButton = document.getElementById("permissionRefreshButton");
const permissionStatusEl = document.getElementById("permissionStatus");
const pendingChangesOutputEl = document.getElementById("pendingChangesOutput");
const approveAllButton = document.getElementById("approveAllButton");
const rejectAllButton = document.getElementById("rejectAllButton");
const applyApprovedButton = document.getElementById("applyApprovedButton");
const showAppliedButton = document.getElementById("showAppliedButton");
const revertLastApplyButton = document.getElementById("revertLastApplyButton");
const regenerateButton = document.getElementById("regenerateButton");
const clearPendingButton = document.getElementById("clearPendingButton");
const commandInputEl = document.getElementById("commandInput") as HTMLInputElement | null;
const runCommandButton = document.getElementById("runCommandButton");
const showCommandHistoryButton = document.getElementById("showCommandHistoryButton");
const clearCommandHistoryButton = document.getElementById("clearCommandHistoryButton");
const commandOutputEl = document.getElementById("commandOutput");

let currentRemoteHosts: RemoteHostConfigMessage[] = [];

inspectButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "inspectWorkspace" });
});

planButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "planTask", task: taskInputEl?.value ?? "" });
});

generateButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "generateProposedChanges", task: taskInputEl?.value ?? "" });
});

runAutoModeButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "runAutoMode", task: taskInputEl?.value ?? "" });
});

stopAutoModeButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "stopAutoMode" });
});

autoRefreshButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "refreshAutoModeStatus" });
});

gitRefreshButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "refreshGitStatus" });
});

createBranchButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "createGitBranch" });
});

stageSelectedButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "stageSelectedGitChanges" });
});

stageAllButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "stageAllGitChanges" });
});

generateCommitMessageButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "generateCommitMessage" });
});

createCommitButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "createGitCommit" });
});

pushBranchButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "pushGitBranch" });
});

preparePrButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "preparePullRequest" });
});

remoteRefreshButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "refreshRemoteOps" });
});

showRemoteHostsButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "showRemoteHosts" });
});

testSshButton?.addEventListener("click", () => {
  vscode.postMessage({
    type: "testSshConnection",
    hostId: remoteHostSelectEl?.value || undefined,
    remoteCwd: remoteCwdInputEl?.value || undefined
  });
});

inspectRemoteButton?.addEventListener("click", () => {
  vscode.postMessage({
    type: "inspectRemoteProject",
    hostId: remoteHostSelectEl?.value || undefined,
    remoteCwd: remoteCwdInputEl?.value || undefined
  });
});

runRemoteCommandButton?.addEventListener("click", () => {
  vscode.postMessage({
    type: "runRemoteCommand",
    hostId: remoteHostSelectEl?.value || undefined,
    remoteCwd: remoteCwdInputEl?.value || undefined,
    command: remoteCommandInputEl?.value ?? ""
  });
});

remoteCommandInputEl?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    vscode.postMessage({
      type: "runRemoteCommand",
      hostId: remoteHostSelectEl?.value || undefined,
      remoteCwd: remoteCwdInputEl?.value || undefined,
      command: remoteCommandInputEl.value
    });
  }
});

showRemoteHistoryButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "showRemoteHistory" });
});

memoryRefreshButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "showProjectMemory" });
});

showMemoryButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "showProjectMemory" });
});

addNoteButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "addProjectNote" });
});

updateSummaryButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "updateProjectSummary" });
});

clearMemoryButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "clearProjectMemory" });
});

remoteHostSelectEl?.addEventListener("change", () => {
  const selected = currentRemoteHosts.find((host) => host.id === remoteHostSelectEl.value);
  if (selected && remoteCwdInputEl) {
    remoteCwdInputEl.value = selected.defaultRemoteCwd;
  }
});

fixRefreshButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "refreshFixStatus" });
});

fixDiagnosticsButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "fixDiagnostics", task: taskInputEl?.value ?? "" });
});

fixLastCommandButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "fixLastFailedCommand", task: taskInputEl?.value ?? "" });
});

fixCurrentFileButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "fixCurrentFile", task: taskInputEl?.value ?? "" });
});

explainLastErrorButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "explainLastError", task: taskInputEl?.value ?? "" });
});

providerRefreshButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "refreshProviderStatus" });
});

permissionRefreshButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "refreshPermissionStatus" });
});

approveAllButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "approveAllPendingChanges" });
});

rejectAllButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "rejectAllPendingChanges" });
});

applyApprovedButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "applyApprovedChanges" });
});

showAppliedButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "showAppliedChanges" });
});

revertLastApplyButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "revertLastApply" });
});

regenerateButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "generateProposedChanges", task: taskInputEl?.value ?? "" });
});

clearPendingButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "clearPendingChanges" });
});

runCommandButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "runTerminalCommand", command: commandInputEl?.value ?? "", mode: "captured" });
});

commandInputEl?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    vscode.postMessage({ type: "runTerminalCommand", command: commandInputEl.value, mode: "captured" });
  }
});

showCommandHistoryButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "showCommandHistory" });
});

clearCommandHistoryButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "clearCommandHistory" });
});

pendingChangesOutputEl?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  const commandAction = target.dataset.commandAction;
  const command = target.dataset.command;
  if (commandAction === "runSuggested" && command) {
    vscode.postMessage({ type: "runTerminalCommand", command, mode: "captured" });
    return;
  }

  const action = target.dataset.action;
  const changeId = target.dataset.changeId;
  if (!action || !changeId) {
    return;
  }
  const messageTypeByAction: Record<string, string> = {
    approve: "approvePendingChange",
    reject: "rejectPendingChange",
    apply: "applyPendingChange"
  };
  const type = messageTypeByAction[action];
  if (type) {
    vscode.postMessage({ type, changeId });
  }
});

window.addEventListener("message", (event: MessageEvent<WebviewResponse>) => {
  const message = event.data;
  if (message.type === "state") {
    if (statusEl) {
      statusEl.textContent = message.status ?? "Ready";
    }
    if (workspaceEl && isWorkspaceContext(message.body)) {
      const frameworks = message.body.likelyFrameworks.length > 0 ? message.body.likelyFrameworks.join(", ") : "No framework detected";
      workspaceEl.textContent = `${message.body.workspaceName} - ${frameworks}`;
    }
    if (contextStatusEl) {
      contextStatusEl.innerHTML = renderContextStatus(message.body);
    }
    if (planOutputEl && message.body) {
      planOutputEl.classList.remove("empty");
      planOutputEl.textContent = JSON.stringify(message.body, null, 2);
    }
  }

  if (message.type === "plan" && planOutputEl) {
    planOutputEl.classList.toggle("empty", !message.plan);
    planOutputEl.innerHTML = renderPlan(message.plan);
  }

  if (message.type === "providerStatus" && providerStatusEl) {
    providerStatusEl.innerHTML = renderProviderStatus(message.reports ?? []);
  }

  if (message.type === "permissionStatus" && permissionStatusEl) {
    permissionStatusEl.innerHTML = renderPermissionStatus(message.state, message.error);
  }

  if (message.type === "pendingChanges" && pendingChangesOutputEl) {
    pendingChangesOutputEl.classList.toggle("empty", !message.changeSet);
    pendingChangesOutputEl.innerHTML = renderPendingChanges(message.changeSet);
  }

  if (message.type === "autoModeState" && autoModeOutputEl) {
    autoModeOutputEl.classList.toggle("empty", !message.autoMode || message.autoMode.status === "idle");
    autoModeOutputEl.innerHTML = renderAutoModeState(message.autoMode);
  }

  if (message.type === "gitWorkflowState" && gitWorkflowOutputEl) {
    gitWorkflowOutputEl.classList.toggle("empty", !message.git || !message.git.available);
    gitWorkflowOutputEl.innerHTML = renderGitWorkflowState(message.git);
  }

  if (message.type === "remoteOpsState" && remoteOpsOutputEl) {
    remoteOpsOutputEl.classList.toggle("empty", !message.remoteOps || message.remoteOps.history.length === 0);
    remoteOpsOutputEl.innerHTML = renderRemoteOpsState(message.remoteOps, message.error);
  }

  if (message.type === "projectMemoryState" && projectMemoryOutputEl) {
    projectMemoryOutputEl.classList.toggle("empty", !message.projectMemory || !message.projectMemory.context.available);
    projectMemoryOutputEl.innerHTML = renderProjectMemoryState(message.projectMemory, message.error);
  }

  if (message.type === "fixStatus" && fixStatusEl) {
    fixStatusEl.innerHTML = renderFixStatus(message.fixStatus, message.error);
  }

  if (message.type === "fixResult" && fixOutputEl) {
    fixOutputEl.classList.toggle("empty", !message.result);
    fixOutputEl.innerHTML = renderFixResult(message.result);
  }

  if (message.type === "commandHistory" && commandOutputEl) {
    commandOutputEl.classList.toggle("empty", !message.history || message.history.length === 0);
    commandOutputEl.innerHTML = renderCommandHistory(message.history ?? []);
  }
});

interface WebviewResponse {
  type:
    | "state"
    | "plan"
    | "providerStatus"
    | "permissionStatus"
    | "pendingChanges"
    | "autoModeState"
    | "gitWorkflowState"
    | "remoteOpsState"
    | "projectMemoryState"
    | "fixStatus"
    | "fixResult"
    | "commandHistory";
  status?: string;
  body?: unknown;
  plan?: PlanTaskResultMessage | string;
  reports?: ProviderStatusReport[];
  state?: PermissionState;
  error?: string;
  changeSet?: PendingChangeSetMessage;
  autoMode?: AutoModeRunStateMessage;
  git?: GitWorkflowStateMessage;
  remoteOps?: RemoteOpsStateMessage;
  projectMemory?: ProjectMemoryStateMessage;
  result?: FixModeResultMessage;
  fixStatus?: FixModeStatusMessage;
  history?: TerminalCommandResultMessage[];
}

interface PlanTaskResultMessage {
  task: string;
  title: string;
  generatedAt: string;
  workspaceName: string;
  provider: {
    id: string;
    label: string;
    model: string;
  };
  complexity: {
    level: "low" | "medium" | "high" | "very high";
    reason: string;
  };
  relevantFiles: Array<{
    path: string;
    score: number;
    reasons: string[];
  }>;
  suggestedVerificationCommands: string[];
  commandsLikelyNeeded: string[];
  editingRequired: boolean;
  modelPlan: string;
}

function isWorkspaceContext(value: unknown): value is WorkspaceContextMessage {
  return Boolean(value && typeof value === "object" && "workspaceName" in value);
}

interface WorkspaceContextMessage {
  workspaceName: string;
  projectName?: string;
  projectTypes?: string[];
  likelyFrameworks: string[];
  contextStatus?: string;
  openFile?: string;
  diagnostics?: {
    total: number;
    errorCount: number;
    warningCount: number;
  };
  gitStatus?: {
    available: boolean;
    branch?: string;
    clean?: boolean;
    entries: unknown[];
    error?: string;
    permission?: {
      allowed: boolean;
      reason: string;
    };
  };
  selectedText?: {
    text: string;
  };
  importantFiles?: Array<{ path: string }>;
  projectMemory?: ProjectMemoryContextMessage;
}

interface ProviderStatusReport {
  provider: {
    id: string;
    label: string;
    lazyActivation: boolean;
  };
  state: {
    status: string;
    currentUsagePercent: number;
    nextResetAt: string;
    pauseReason?: string;
  };
  eligible: boolean;
  reason?: string;
}

interface PermissionState {
  profile: {
    id: string;
    label: string;
  };
  capabilities: {
    canReadWorkspace: boolean;
    canWriteWorkspace: boolean;
    canRunTerminal: boolean;
    canUseGit: boolean;
    canPushGitHub: boolean;
    canUseSSH: boolean;
    canDeploy: boolean;
  };
  source: string;
  warning?: string;
}

interface PendingChangeSetMessage {
  id: string;
  source?: "proposed_changes" | "fix_mode";
  task: string;
  summary: string;
  generatedAt: string;
  provider: {
    label: string;
    model: string;
  };
  changes: PendingFileChangeMessage[];
  commandsToRunLater: Array<{
    command: string;
    reason: string;
  }>;
  risks: string[];
}

interface PendingFileChangeMessage {
  id: string;
  path: string;
  action: "create" | "modify" | "delete";
  reason: string;
  status: PendingChangeStatusMessage;
  diff: string;
  warning?: string;
  invalidReason?: string;
  appliedAt?: string;
  failedReason?: string;
  backupId?: string;
  backupPath?: string;
}

type PendingChangeStatusMessage = "pending" | "approved" | "rejected" | "applied" | "failed" | "invalid";

interface DiagnosticContextItemMessage {
  path: string;
  severity: "error" | "warning" | "information" | "hint";
  message: string;
  source?: string;
  range: {
    startLine: number;
    startCharacter: number;
    endLine: number;
    endCharacter: number;
  };
}

interface DiagnosticsSummaryMessage {
  total: number;
  errorCount: number;
  warningCount: number;
  informationCount: number;
  hintCount: number;
  items: DiagnosticContextItemMessage[];
  truncated: boolean;
}

interface FixModeStatusMessage {
  diagnostics: DiagnosticsSummaryMessage;
  latestFailedCommand?: TerminalCommandResultMessage;
}

interface FixModeResultMessage {
  source: "diagnostics" | "last_failed_command" | "current_file" | "explain_last_error";
  title: string;
  summary: string;
  generatedAt: string;
  diagnostics: DiagnosticsSummaryMessage;
  failedCommand?: TerminalCommandResultMessage;
  changeSet?: PendingChangeSetMessage;
  explanation?: string;
}

type AutoModeStatusMessage =
  | "idle"
  | "planning"
  | "generating_changes"
  | "waiting_for_approval"
  | "applying_changes"
  | "running_verification"
  | "collecting_errors"
  | "fixing"
  | "succeeded"
  | "failed"
  | "blocked"
  | "cancelled"
  | "max_loops_reached";

interface AutoModeTimelineEntryMessage {
  id: string;
  timestamp: string;
  loop: number;
  state: AutoModeStatusMessage;
  title: string;
  detail?: string;
  status: "started" | "completed" | "blocked" | "failed" | "cancelled";
}

interface AutoModeFinalSummaryMessage {
  task: string;
  startedAt: string;
  endedAt: string;
  loops: number;
  filesChanged: string[];
  commandsRun: Array<{
    command: string;
    status: TerminalCommandResultMessage["status"];
    exitCode?: number;
  }>;
  errorsFixed: number;
  remainingErrors: number;
  skippedOrBlockedActions: string[];
  finalStatus: AutoModeStatusMessage;
  recommendedNextAction: string;
}

interface PendingChangeStatsMessage {
  pending: number;
  approved: number;
  rejected: number;
  applied: number;
  failed: number;
  invalid: number;
  reviewable: number;
  applyable: number;
}

interface AutoModeRunStateMessage {
  id: string;
  task: string;
  status: AutoModeStatusMessage;
  currentLoop: number;
  maxLoops: number;
  startedAt?: string;
  endedAt?: string;
  timeline: AutoModeTimelineEntryMessage[];
  plan?: PlanTaskResultMessage;
  pendingChangeSet?: PendingChangeSetMessage;
  pendingStats?: PendingChangeStatsMessage;
  latestCommand?: TerminalCommandResultMessage;
  diagnostics?: DiagnosticsSummaryMessage;
  fixResult?: FixModeResultMessage;
  changedFiles: string[];
  commandsRun: TerminalCommandResultMessage[];
  errorsFixed: number;
  initialErrorCount: number;
  blockedReasons: string[];
  skippedActions: string[];
  summary?: AutoModeFinalSummaryMessage;
  recommendedNextAction?: string;
}

interface GitChangedFileMessage {
  path: string;
  indexStatus: string;
  workingTreeStatus: string;
  staged: boolean;
  unstaged: boolean;
  untracked: boolean;
  protected: boolean;
  protectedReason?: string;
}

interface GitCommandResultMessage {
  command: string;
  cwd: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  exitCode: number;
  stdout: string;
  stderr: string;
  status: TerminalCommandResultMessage["status"];
  reason: string;
}

interface PullRequestPreparationMessage {
  title: string;
  body: string;
  ghAvailable: boolean;
  command?: string;
  manualInstructions?: string;
  result?: GitCommandResultMessage;
}

interface GitWorkflowStateMessage {
  available: boolean;
  branch?: string;
  remote?: string;
  upstream?: string;
  clean: boolean;
  files: GitChangedFileMessage[];
  stagedFiles: GitChangedFileMessage[];
  unstagedFiles: GitChangedFileMessage[];
  untrackedFiles: GitChangedFileMessage[];
  safeStageableFiles: GitChangedFileMessage[];
  protectedFiles: GitChangedFileMessage[];
  diffStat: string;
  diffNameOnly: string[];
  generatedCommitMessage?: string;
  pullRequest?: PullRequestPreparationMessage;
  lastCommand?: GitCommandResultMessage;
  lastError?: string;
}

interface RemoteHostConfigMessage {
  id: string;
  label: string;
  host: string;
  port: number;
  username?: string;
  authMode: "ssh-agent" | "ssh-config" | "private-key-path";
  privateKeyPath?: string;
  defaultRemoteCwd: string;
  allowedRemoteCwds: string[];
  enabled: boolean;
}

interface RemoteConfigLoadResultMessage {
  config: {
    hosts: RemoteHostConfigMessage[];
  };
  source: "default" | "local" | "malformed";
  uri: string;
  warning?: string;
}

interface RemoteCommandResultMessage {
  id: string;
  hostId: string;
  hostLabel: string;
  sshHost: string;
  command: string;
  remoteCwd: string;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  exitCode?: number;
  stdout: string;
  stderr: string;
  status: "pending" | "running" | "succeeded" | "failed" | "blocked" | "cancelled";
  reason: string;
  suggestedNextStep?: string;
  authorizationDecision: {
    allowed: boolean;
    requiresConfirmation: boolean;
    reason: string;
  };
}

interface RemoteInspectionResultMessage {
  hostId: string;
  hostLabel: string;
  remoteCwd: string;
  inspectedAt: string;
  results: RemoteCommandResultMessage[];
  summary: string;
}

interface RemoteOpsStateMessage {
  config: RemoteConfigLoadResultMessage;
  history: RemoteCommandResultMessage[];
  latestResult?: RemoteCommandResultMessage;
  latestInspection?: RemoteInspectionResultMessage;
}

interface ProjectMemoryMessage {
  projectName: string;
  summary: string;
  architecture: string[];
  importantDecisions: string[];
  knownLimitations: string[];
  preferredCommands: string[];
  lastUpdatedAt: string;
}

interface ProjectNoteMessage {
  id: string;
  createdAt: string;
  updatedAt: string;
  type: "decision" | "todo" | "warning" | "architecture" | "command" | "limitation" | "general";
  title: string;
  body: string;
  tags: string[];
}

interface ProjectMemoryContextMessage {
  available: boolean;
  summary?: string;
  architecture: string[];
  importantDecisions: string[];
  knownLimitations: string[];
  preferredCommands: string[];
  recentNotes: Array<Pick<ProjectNoteMessage, "id" | "type" | "title" | "body" | "tags" | "updatedAt">>;
  source: string;
  warning?: string;
}

interface ProjectMemoryStateMessage {
  memory: {
    memory?: ProjectMemoryMessage;
    source: "default" | "local" | "malformed";
    uri: string;
    warning?: string;
  };
  notes: {
    notes: ProjectNoteMessage[];
    source: "default" | "local" | "malformed";
    uri: string;
    warning?: string;
  };
  context: ProjectMemoryContextMessage;
}

interface TerminalCommandResultMessage {
  id: string;
  command: string;
  cwd: string;
  mode: "captured" | "interactive";
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  exitCode?: number;
  stdout: string;
  stderr: string;
  status: "pending" | "running" | "succeeded" | "failed" | "blocked" | "cancelled";
  reason: string;
  suggestedNextStep?: string;
  authorizationDecision: {
    allowed: boolean;
    requiresConfirmation: boolean;
    reason: string;
  };
}

function renderProviderStatus(reports: ProviderStatusReport[]): string {
  if (reports.length === 0) {
    return "<div><dt>Active</dt><dd>No providers configured</dd></div>";
  }

  const active = reports.find((report) => report.eligible) ?? reports[0];
  const fallback = reports.find((report) => report.eligible && report.provider.id !== active.provider.id);
  const pausedReason = active.state.pauseReason || active.reason || "none";
  const rows = [
    ["Active", `${active.provider.label} (${active.provider.id})`],
    ["Status", `${active.state.status}${active.eligible ? "" : " - blocked"}`],
    ["Usage", `${active.state.currentUsagePercent.toFixed(2)}%`],
    ["Fallback", fallback ? `${fallback.provider.label} (${fallback.provider.id})` : "none"],
    ["Reset", active.state.nextResetAt],
    ["Lazy", active.provider.lazyActivation ? "enabled" : "disabled"],
    ["Reason", pausedReason]
  ];

  return rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
}

function renderPermissionStatus(state: PermissionState | undefined, error: string | undefined): string {
  if (error) {
    return `<div><dt>Profile</dt><dd>${escapeHtml(error)}</dd></div>`;
  }
  if (!state) {
    return "<div><dt>Profile</dt><dd>No permission state loaded</dd></div>";
  }

  const risky = [
    state.capabilities.canRunTerminal ? "terminal" : "",
    state.capabilities.canPushGitHub ? "GitHub push" : "",
    state.capabilities.canUseSSH ? "SSH" : "",
    state.capabilities.canDeploy ? "deploy" : ""
  ].filter(Boolean);

  const rows = [
    ["Profile", `${state.profile.label} (${state.profile.id})`],
    ["Source", state.source],
    ["Read", state.capabilities.canReadWorkspace ? "allowed" : "blocked"],
    ["Write", state.capabilities.canWriteWorkspace ? "allowed" : "blocked"],
    ["Risk", risky.length > 0 ? risky.join(", ") : "none"],
    ["Command", "Borger: Show Permissions"],
    ["Warning", state.warning || "none"]
  ];

  return rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
}

function renderContextStatus(body: unknown): string {
  if (!body) {
    return "<div><dt>Status</dt><dd>Not inspected</dd></div>";
  }
  if (!isWorkspaceContext(body)) {
    if (typeof body === "object" && body && "error" in body) {
      return `<div><dt>Error</dt><dd>${escapeHtml(String((body as { error?: unknown }).error ?? "unknown"))}</dd></div>`;
    }
    return "<div><dt>Status</dt><dd>Waiting</dd></div>";
  }

  const diagnostics = body.diagnostics
    ? `${body.diagnostics.errorCount} errors, ${body.diagnostics.warningCount} warnings, ${body.diagnostics.total} total`
    : "not loaded";
  const git = body.gitStatus
    ? body.gitStatus.available
      ? `${body.gitStatus.branch || "branch unknown"}; ${body.gitStatus.clean ? "clean" : `${body.gitStatus.entries.length} changed`}`
      : body.gitStatus.permission?.allowed === false
        ? `blocked: ${body.gitStatus.permission.reason}`
        : body.gitStatus.error || "not available"
    : "not loaded";
  const rows = [
    ["Project", body.projectName || body.workspaceName],
    ["Types", body.projectTypes?.join(", ") || "none"],
    ["Files", body.contextStatus || "not sampled"],
    ["Important", body.importantFiles?.map((file) => file.path).join(", ") || "none"],
    ["Current", body.openFile || "none"],
    ["Selection", body.selectedText ? `${body.selectedText.text.length} chars` : "none"],
    ["Diagnostics", diagnostics],
    ["Git", git],
    [
      "Memory",
      body.projectMemory?.available
        ? `${body.projectMemory.summary || "saved"}; ${body.projectMemory.recentNotes.length} recent notes`
        : "none saved"
    ]
  ];

  return rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
}

function renderPlan(plan: PlanTaskResultMessage | string | undefined): string {
  if (!plan) {
    return '<div class="empty">Ask Borger to inspect the workspace or plan a task.</div>';
  }

  if (typeof plan === "string") {
    return `<pre class="plan-markdown">${escapeHtml(plan)}</pre>`;
  }

  const sections = parsePlanSections(plan.modelPlan);
  const relevantFiles = plan.relevantFiles.length > 0
    ? `<ol class="plan-list">${plan.relevantFiles
        .slice(0, 8)
        .map((file) => `<li><strong>${escapeHtml(file.path)}</strong><span>${escapeHtml(file.reasons.join("; "))}</span></li>`)
        .join("")}</ol>`
    : '<p class="muted">No relevant files ranked.</p>';
  const verification = plan.suggestedVerificationCommands.length > 0
    ? `<ul class="plan-list">${plan.suggestedVerificationCommands
        .map((command) => `<li><code>${escapeHtml(command)}</code></li>`)
        .join("")}</ul>`
    : '<p class="muted">No verification commands detected.</p>';

  return `
    <article class="plan-card">
      <header class="plan-header">
        <div>
          <h3>${escapeHtml(plan.title)}</h3>
          <p>${escapeHtml(plan.workspaceName)} via ${escapeHtml(plan.provider.label)}</p>
        </div>
        <span class="complexity ${plan.complexity.level.replace(" ", "-")}">${escapeHtml(plan.complexity.level)}</span>
      </header>
      <dl class="plan-meta">
        <div><dt>Editing</dt><dd>${plan.editingRequired ? "Likely required later" : "Not required"}</dd></div>
        <div><dt>Reason</dt><dd>${escapeHtml(plan.complexity.reason)}</dd></div>
      </dl>
      <section class="plan-section">
        <h4>Relevant Files</h4>
        ${relevantFiles}
      </section>
      ${renderNamedSection(sections, "Task Understanding")}
      ${renderNamedSection(sections, "Repo Observations")}
      ${renderNamedSection(sections, "Implementation Steps")}
      ${renderNamedSection(sections, "Files Likely To Change")}
      <section class="plan-section">
        <h4>Verification Commands</h4>
        ${verification}
      </section>
      ${renderNamedSection(sections, "Verification Plan")}
      ${renderNamedSection(sections, "Risks / Unknowns")}
      ${renderNamedSection(sections, "Assumptions")}
      ${renderNamedSection(sections, "Recommended Next Action")}
      <details class="plan-raw">
        <summary>Full Model Plan</summary>
        <pre class="plan-markdown">${escapeHtml(plan.modelPlan)}</pre>
      </details>
    </article>`;
}

function renderPendingChanges(changeSet: PendingChangeSetMessage | undefined): string {
  if (!changeSet) {
    return '<div class="empty">No pending changes.</div>';
  }

  const counts = countPendingStatuses(changeSet.changes);
  const files = changeSet.changes
    .map((change) => {
      const reviewDisabled = change.status === "invalid" || change.status === "applied";
      const applyDisabled = change.status !== "approved";
      return `
      <article class="change-card ${change.status}">
        <header class="change-header">
          <div>
            <h3>${escapeHtml(change.path)}</h3>
            <p>${escapeHtml(change.reason)}</p>
          </div>
          <span class="change-pill ${change.action}">${escapeHtml(change.action)}</span>
          <span class="change-status ${change.status}">${escapeHtml(change.status)}</span>
        </header>
        ${change.warning ? `<p class="warning">${escapeHtml(change.warning)}</p>` : ""}
        ${change.invalidReason ? `<p class="warning">${escapeHtml(change.invalidReason)}</p>` : ""}
        ${change.failedReason ? `<p class="warning">${escapeHtml(change.failedReason)}</p>` : ""}
        ${change.appliedAt ? `<p class="muted">Applied ${escapeHtml(change.appliedAt)}</p>` : ""}
        ${change.backupPath ? `<p class="muted">Backup: <code>${escapeHtml(change.backupPath)}</code></p>` : ""}
        <pre class="diff-block">${escapeHtml(change.diff || "No diff available.")}</pre>
        <div class="actions">
          <button data-action="approve" data-change-id="${escapeHtml(change.id)}" ${reviewDisabled ? "disabled" : ""}>Approve File Change</button>
          <button data-action="reject" data-change-id="${escapeHtml(change.id)}" ${reviewDisabled ? "disabled" : ""}>Reject File Change</button>
          <button data-action="apply" data-change-id="${escapeHtml(change.id)}" ${applyDisabled ? "disabled" : ""}>Apply This File</button>
        </div>
      </article>`;
    })
    .join("");

  const commands = changeSet.commandsToRunLater.length > 0
    ? `<ul class="plan-list">${changeSet.commandsToRunLater
        .map(
          (command) => `<li>
            <code>${escapeHtml(command.command)}</code>
            <span>${escapeHtml(command.reason)}</span>
            <button class="inline-command-button" data-command-action="runSuggested" data-command="${escapeHtml(command.command)}">Run</button>
          </li>`
        )
        .join("")}</ul>`
    : '<p class="muted">No commands suggested.</p>';
  const risks = changeSet.risks.length > 0
    ? `<ul class="plan-list">${changeSet.risks.map((risk) => `<li>${escapeHtml(risk)}</li>`).join("")}</ul>`
    : '<p class="muted">No risks reported.</p>';

  return `
    <section class="changes-summary">
      <h3>${escapeHtml(changeSet.summary)}</h3>
      <p>${escapeHtml(changeSet.task)} via ${escapeHtml(changeSet.provider.label)}${changeSet.source ? ` - ${escapeHtml(changeSet.source)}` : ""}</p>
      <p>${counts.pending} pending, ${counts.approved} approved, ${counts.applied} applied, ${counts.failed} failed, ${counts.rejected} rejected, ${counts.invalid} invalid</p>
    </section>
    ${files}
    <section class="plan-section">
      <h4>Commands Suggested For Later</h4>
      ${commands}
    </section>
    <section class="plan-section">
      <h4>Risks</h4>
      ${risks}
    </section>`;
}

function renderAutoModeState(state: AutoModeRunStateMessage | undefined): string {
  if (!state || state.status === "idle") {
    return '<div class="empty">Auto Mode is idle.</div>';
  }

  const pending = state.pendingStats
    ? `${state.pendingStats.pending} pending, ${state.pendingStats.approved} approved, ${state.pendingStats.applied} applied, ${state.pendingStats.invalid} invalid`
    : "none";
  const diagnostics = state.diagnostics
    ? `${state.diagnostics.errorCount} errors, ${state.diagnostics.warningCount} warnings, ${state.diagnostics.total} total`
    : "not collected";
  const latestCommand = state.latestCommand
    ? `<code>${escapeHtml(state.latestCommand.command)}</code><span>${escapeHtml(`${state.latestCommand.status}${state.latestCommand.exitCode === undefined ? "" : ` (${state.latestCommand.exitCode})`}`)}</span>`
    : '<span class="muted">No command run yet.</span>';
  const timeline = state.timeline.length > 0
    ? `<ol class="auto-timeline">${state.timeline
        .slice(-10)
        .map(
          (entry) =>
            `<li class="${escapeHtml(entry.status)}"><strong>${escapeHtml(entry.title)}</strong><span>${escapeHtml(
              `loop ${entry.loop} - ${entry.state} - ${entry.status}${entry.detail ? ` - ${entry.detail}` : ""}`
            )}</span></li>`
        )
        .join("")}</ol>`
    : '<p class="muted">No steps yet.</p>';
  const plan = state.plan
    ? `<p>${escapeHtml(state.plan.title)} <span class="muted">${escapeHtml(state.plan.complexity.level)}</span></p>`
    : '<p class="muted">No plan generated yet.</p>';
  const fix = state.fixResult
    ? `<p>${escapeHtml(state.fixResult.title)}: ${escapeHtml(state.fixResult.summary)}</p>`
    : '<p class="muted">No fix proposal used yet.</p>';
  const summary = state.summary
    ? `<dl class="auto-summary">
        <div><dt>Final</dt><dd>${escapeHtml(state.summary.finalStatus)}</dd></div>
        <div><dt>Files</dt><dd>${escapeHtml(state.summary.filesChanged.join(", ") || "none")}</dd></div>
        <div><dt>Commands</dt><dd>${escapeHtml(String(state.summary.commandsRun.length))}</dd></div>
        <div><dt>Errors</dt><dd>${escapeHtml(`${state.summary.errorsFixed} fixed, ${state.summary.remainingErrors} remaining`)}</dd></div>
        <div><dt>Next</dt><dd>${escapeHtml(state.summary.recommendedNextAction)}</dd></div>
      </dl>`
    : '<p class="muted">Final summary appears when the run stops.</p>';

  return `
    <article class="auto-card">
      <header class="plan-header">
        <div>
          <h3>${escapeHtml(state.task)}</h3>
          <p>${escapeHtml(state.startedAt || "not started")}</p>
        </div>
        <span class="change-status ${escapeHtml(statusClass(state.status))}">${escapeHtml(state.status)}</span>
      </header>
      <dl class="auto-summary">
        <div><dt>Loop</dt><dd>${state.currentLoop}/${state.maxLoops}</dd></div>
        <div><dt>Pending</dt><dd>${escapeHtml(pending)}</dd></div>
        <div><dt>Diagnostics</dt><dd>${escapeHtml(diagnostics)}</dd></div>
        <div><dt>Changed</dt><dd>${escapeHtml(state.changedFiles.join(", ") || "none")}</dd></div>
      </dl>
      <section class="plan-section">
        <h4>Latest Plan</h4>
        ${plan}
      </section>
      <section class="plan-section">
        <h4>Latest Command</h4>
        <p>${latestCommand}</p>
      </section>
      <section class="plan-section">
        <h4>Fix Summary</h4>
        ${fix}
      </section>
      <section class="plan-section">
        <h4>Step Timeline</h4>
        ${timeline}
      </section>
      <section class="plan-section">
        <h4>Final Summary</h4>
        ${summary}
      </section>
    </article>`;
}

function renderGitWorkflowState(state: GitWorkflowStateMessage | undefined): string {
  if (!state) {
    return '<div class="empty">Git status has not been loaded.</div>';
  }
  if (!state.available) {
    return `<div class="empty">Git unavailable: ${escapeHtml(state.lastError || "status not loaded")}</div>`;
  }

  const changed = state.files.length > 0
    ? `<ul class="git-file-list">${state.files
        .slice(0, 16)
        .map(
          (file) =>
            `<li class="${file.protected ? "protected" : ""}"><code>${escapeHtml(file.indexStatus + file.workingTreeStatus)}</code> ${escapeHtml(
              file.path
            )}${file.protected ? `<span>${escapeHtml(file.protectedReason || "protected")}</span>` : ""}</li>`
        )
        .join("")}</ul>`
    : '<p class="muted">No changed files.</p>';
  const generated = state.generatedCommitMessage
    ? `<pre class="git-message">${escapeHtml(state.generatedCommitMessage)}</pre>`
    : '<p class="muted">No generated commit message.</p>';
  const last = state.lastCommand
    ? `<p><code>${escapeHtml(state.lastCommand.command)}</code></p><p class="${state.lastCommand.status === "succeeded" ? "muted" : "warning"}">${escapeHtml(
        `${state.lastCommand.status} (${state.lastCommand.exitCode}) - ${state.lastCommand.reason}`
      )}</p>`
    : '<p class="muted">No Git workflow command run.</p>';
  const pr = state.pullRequest
    ? `<dl class="git-summary">
        <div><dt>Title</dt><dd>${escapeHtml(state.pullRequest.title)}</dd></div>
        <div><dt>gh</dt><dd>${state.pullRequest.ghAvailable ? "available" : "not available"}</dd></div>
        <div><dt>Command</dt><dd>${escapeHtml(state.pullRequest.command || "manual")}</dd></div>
        <div><dt>Note</dt><dd>${escapeHtml(state.pullRequest.manualInstructions || state.pullRequest.result?.reason || "prepared")}</dd></div>
      </dl>`
    : '<p class="muted">No pull request prepared.</p>';

  return `
    <article class="git-card">
      <dl class="git-summary">
        <div><dt>Branch</dt><dd>${escapeHtml(state.branch || "unknown")}</dd></div>
        <div><dt>Remote</dt><dd>${escapeHtml(state.remote || "unknown")}</dd></div>
        <div><dt>Upstream</dt><dd>${escapeHtml(state.upstream || "none")}</dd></div>
        <div><dt>Files</dt><dd>${state.stagedFiles.length} staged, ${state.unstagedFiles.length} unstaged, ${state.untrackedFiles.length} untracked</dd></div>
        <div><dt>Protected</dt><dd>${state.protectedFiles.length}</dd></div>
      </dl>
      <section class="plan-section">
        <h4>Changed Files</h4>
        ${changed}
      </section>
      <section class="plan-section">
        <h4>Diff Stat</h4>
        <pre class="git-message">${escapeHtml(state.diffStat || "No unstaged diff stat.")}</pre>
      </section>
      <section class="plan-section">
        <h4>Generated Commit Message</h4>
        ${generated}
      </section>
      <section class="plan-section">
        <h4>Pull Request</h4>
        ${pr}
      </section>
      <section class="plan-section">
        <h4>Last Git Command</h4>
        ${last}
      </section>
    </article>`;
}

function renderRemoteOpsState(state: RemoteOpsStateMessage | undefined, error: string | undefined): string {
  if (error) {
    return `<div class="empty">Remote Ops unavailable: ${escapeHtml(error)}</div>`;
  }
  if (!state) {
    updateRemoteHostSelect([]);
    return '<div class="empty">Remote hosts have not been loaded.</div>';
  }

  updateRemoteHostSelect(state.config.config.hosts);
  const enabledHosts = state.config.config.hosts.filter((host) => host.enabled);
  const hostList = state.config.config.hosts.length > 0
    ? `<ul class="remote-host-list">${state.config.config.hosts
        .map(
          (host) =>
            `<li class="${host.enabled ? "enabled" : "disabled"}"><strong>${escapeHtml(host.label)}</strong><span>${escapeHtml(
              `${host.id} - ${host.username ? `${host.username}@` : ""}${host.host}:${host.port} - ${host.enabled ? "enabled" : "disabled"}`
            )}</span><span>${escapeHtml(`cwd ${host.defaultRemoteCwd}`)}</span></li>`
        )
        .join("")}</ul>`
    : '<p class="muted">No remote hosts configured. Use Show Remote Hosts to create the local config.</p>';
  const latest = state.latestResult ? renderRemoteResult(state.latestResult) : '<p class="muted">No remote command run this session.</p>';
  const inspection = state.latestInspection
    ? `<article class="remote-card">
        <h4>Latest Inspection</h4>
        <p>${escapeHtml(state.latestInspection.summary)}</p>
        <p class="muted">${escapeHtml(`${state.latestInspection.hostLabel} - ${state.latestInspection.remoteCwd} - ${state.latestInspection.inspectedAt}`)}</p>
        <ul class="remote-history">${state.latestInspection.results
          .slice(0, 8)
          .map((result) => `<li class="${escapeHtml(result.status)}">${escapeHtml(`${result.status}: ${result.command}${result.exitCode === undefined ? "" : ` (${result.exitCode})`}`)}</li>`)
          .join("")}</ul>
      </article>`
    : '<p class="muted">No remote inspection run.</p>';
  const history = state.history.length > 0
    ? `<ul class="remote-history">${state.history
        .slice(0, 10)
        .map(
          (result) =>
            `<li class="${escapeHtml(result.status)}"><code>${escapeHtml(result.command)}</code><span>${escapeHtml(
              `${result.hostId}:${result.remoteCwd} - ${result.status}${result.exitCode === undefined ? "" : ` (${result.exitCode})`}`
            )}</span></li>`
        )
        .join("")}</ul>`
    : '<p class="muted">No remote history yet.</p>';

  return `
    <article class="remote-card">
      <dl class="git-summary">
        <div><dt>Config</dt><dd>${escapeHtml(state.config.uri)}</dd></div>
        <div><dt>Source</dt><dd>${escapeHtml(state.config.source)}</dd></div>
        <div><dt>Hosts</dt><dd>${enabledHosts.length} enabled / ${state.config.config.hosts.length} configured</dd></div>
        <div><dt>Warning</dt><dd>${escapeHtml(state.config.warning || "none")}</dd></div>
      </dl>
      <section class="plan-section">
        <h4>Hosts</h4>
        ${hostList}
      </section>
      <section class="plan-section">
        <h4>Latest Output</h4>
        ${latest}
      </section>
      <section class="plan-section">
        <h4>Inspection</h4>
        ${inspection}
      </section>
      <section class="plan-section">
        <h4>History</h4>
        ${history}
      </section>
    </article>`;
}

function updateRemoteHostSelect(hosts: RemoteHostConfigMessage[]): void {
  currentRemoteHosts = hosts;
  if (!remoteHostSelectEl) {
    return;
  }
  const previous = remoteHostSelectEl.value;
  const enabled = hosts.filter((host) => host.enabled);
  remoteHostSelectEl.innerHTML = enabled
    .map((host) => `<option value="${escapeHtml(host.id)}">${escapeHtml(`${host.label} (${host.id})`)}</option>`)
    .join("");
  const selected = enabled.find((host) => host.id === previous) ?? enabled[0];
  if (selected) {
    remoteHostSelectEl.value = selected.id;
    if (remoteCwdInputEl && !remoteCwdInputEl.value) {
      remoteCwdInputEl.value = selected.defaultRemoteCwd;
    }
  }
}

function renderRemoteResult(result: RemoteCommandResultMessage): string {
  return `
    <article class="remote-result ${escapeHtml(result.status)}">
      <header class="command-header">
        <div>
          <h3>${escapeHtml(result.command)}</h3>
          <p>${escapeHtml(`${result.hostLabel} - ${result.remoteCwd}`)}</p>
        </div>
        <span class="change-status ${escapeHtml(result.status)}">${escapeHtml(result.status)}</span>
      </header>
      <dl class="command-meta">
        <div><dt>Exit</dt><dd>${result.exitCode === undefined ? "n/a" : String(result.exitCode)}</dd></div>
        <div><dt>Duration</dt><dd>${result.durationMs ?? 0}ms</dd></div>
        <div><dt>Reason</dt><dd>${escapeHtml(result.reason)}</dd></div>
      </dl>
      ${result.stdout ? `<pre class="terminal-block">${escapeHtml(result.stdout)}</pre>` : '<p class="muted">No stdout.</p>'}
      ${result.stderr ? `<pre class="terminal-block stderr">${escapeHtml(result.stderr)}</pre>` : ""}
    </article>`;
}

function renderProjectMemoryState(state: ProjectMemoryStateMessage | undefined, error: string | undefined): string {
  if (error) {
    return `<div class="empty">Project Memory unavailable: ${escapeHtml(error)}</div>`;
  }
  if (!state || !state.context.available) {
    return `<article class="memory-card">
      <p class="muted">No project memory saved yet. Add a note or update the project summary.</p>
      <dl class="git-summary">
        <div><dt>Memory</dt><dd>${escapeHtml(state?.memory.uri || ".borger/project-memory.local.json")}</dd></div>
        <div><dt>Notes</dt><dd>${escapeHtml(state?.notes.uri || ".borger/project-notes.local.jsonl")}</dd></div>
      </dl>
    </article>`;
  }

  const context = state.context;
  const notes = context.recentNotes.length > 0
    ? `<ul class="memory-list">${context.recentNotes
        .map(
          (note) =>
            `<li><strong>${escapeHtml(`[${note.type}] ${note.title}`)}</strong><span>${escapeHtml(
              note.body || note.tags.join(", ") || note.updatedAt
            )}</span></li>`
        )
        .join("")}</ul>`
    : '<p class="muted">No notes saved yet.</p>';

  return `
    <article class="memory-card">
      <dl class="git-summary">
        <div><dt>Source</dt><dd>${escapeHtml(context.source)}</dd></div>
        <div><dt>Memory</dt><dd>${escapeHtml(state.memory.uri)}</dd></div>
        <div><dt>Notes</dt><dd>${state.notes.notes.length} saved</dd></div>
        <div><dt>Warning</dt><dd>${escapeHtml(context.warning || state.memory.warning || state.notes.warning || "none")}</dd></div>
      </dl>
      <section class="plan-section">
        <h4>Summary</h4>
        <p>${escapeHtml(context.summary || "No summary saved yet.")}</p>
      </section>
      <section class="plan-section">
        <h4>Architecture</h4>
        ${renderMemoryList(context.architecture)}
      </section>
      <section class="plan-section">
        <h4>Important Decisions</h4>
        ${renderMemoryList(context.importantDecisions)}
      </section>
      <section class="plan-section">
        <h4>Known Limitations</h4>
        ${renderMemoryList(context.knownLimitations)}
      </section>
      <section class="plan-section">
        <h4>Preferred Commands</h4>
        ${renderMemoryList(context.preferredCommands, true)}
      </section>
      <section class="plan-section">
        <h4>Recent Notes</h4>
        ${notes}
      </section>
    </article>`;
}

function renderMemoryList(values: string[], code = false): string {
  if (values.length === 0) {
    return '<p class="muted">None saved.</p>';
  }
  return `<ul class="memory-list">${values.map((value) => `<li>${code ? `<code>${escapeHtml(value)}</code>` : escapeHtml(value)}</li>`).join("")}</ul>`;
}

function renderFixStatus(status: FixModeStatusMessage | undefined, error: string | undefined): string {
  if (error) {
    return `<div><dt>Status</dt><dd>${escapeHtml(error)}</dd></div>`;
  }
  if (!status) {
    return "<div><dt>Status</dt><dd>No Fix Mode status loaded</dd></div>";
  }

  const diagnostics = status.diagnostics;
  const failedCommand = status.latestFailedCommand
    ? `${status.latestFailedCommand.command} (${status.latestFailedCommand.reason})`
    : "none";
  const rows = [
    ["Diagnostics", `${diagnostics.errorCount} errors, ${diagnostics.warningCount} warnings, ${diagnostics.total} total`],
    ["Latest Failed", failedCommand],
    ["Behavior", "Proposes pending changes only"]
  ];

  return rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
}

function renderFixResult(result: FixModeResultMessage | undefined): string {
  if (!result) {
    return '<div class="empty">No fix proposal generated.</div>';
  }

  const diagnostics = result.diagnostics.items.length > 0
    ? `<ul class="plan-list">${result.diagnostics.items
        .slice(0, 8)
        .map(
          (item) =>
            `<li><strong>${escapeHtml(item.path)}</strong><span>${escapeHtml(
              `${item.severity} ${item.range.startLine}:${item.range.startCharacter} - ${item.message}`
            )}</span></li>`
        )
        .join("")}</ul>`
    : '<p class="muted">No diagnostics included.</p>';
  const command = result.failedCommand
    ? `<p><code>${escapeHtml(result.failedCommand.command)}</code></p><p class="muted">${escapeHtml(result.failedCommand.reason)}</p>`
    : '<p class="muted">No failed command attached.</p>';
  const pending = result.changeSet
    ? `<p>${result.changeSet.changes.length} pending file change${result.changeSet.changes.length === 1 ? "" : "s"} generated for review.</p>`
    : '<p class="muted">No pending file changes were generated.</p>';
  const commands = result.changeSet && result.changeSet.commandsToRunLater.length > 0
    ? `<ul class="plan-list">${result.changeSet.commandsToRunLater
        .map((commandToRun) => `<li><code>${escapeHtml(commandToRun.command)}</code><span>${escapeHtml(commandToRun.reason)}</span></li>`)
        .join("")}</ul>`
    : '<p class="muted">No verification commands suggested.</p>';
  const explanation = result.explanation
    ? `<section class="plan-section"><h4>Explanation</h4><div class="plan-copy">${renderPlanMarkdownFragment(result.explanation)}</div></section>`
    : "";

  return `
    <article class="fix-card">
      <header class="plan-header">
        <div>
          <h3>${escapeHtml(result.title)}</h3>
          <p>${escapeHtml(result.source)} - ${escapeHtml(result.generatedAt)}</p>
        </div>
        <span class="change-status ${result.changeSet ? "pending" : "succeeded"}">${result.changeSet ? "review" : "explain"}</span>
      </header>
      <section class="plan-section">
        <h4>Summary</h4>
        <p>${escapeHtml(result.summary)}</p>
      </section>
      ${explanation}
      <section class="plan-section">
        <h4>Diagnostics Used</h4>
        ${diagnostics}
      </section>
      <section class="plan-section">
        <h4>Failed Command</h4>
        ${command}
      </section>
      <section class="plan-section">
        <h4>Pending Fix Diffs</h4>
        ${pending}
      </section>
      <section class="plan-section">
        <h4>Suggested Verification Commands</h4>
        ${commands}
      </section>
    </article>`;
}

function renderCommandHistory(history: TerminalCommandResultMessage[]): string {
  if (history.length === 0) {
    return '<div class="empty">No terminal commands run this session.</div>';
  }

  return history
    .slice(0, 12)
    .map((result) => {
      const stdout = result.stdout ? `<pre class="terminal-block stdout">${escapeHtml(truncateOutput(result.stdout))}</pre>` : "";
      const stderr = result.stderr ? `<pre class="terminal-block stderr">${escapeHtml(truncateOutput(result.stderr))}</pre>` : "";
      return `
        <article class="command-card ${result.status}">
          <header class="command-header">
            <div>
              <h3><code>${escapeHtml(result.command)}</code></h3>
              <p>${escapeHtml(result.cwd)}</p>
            </div>
            <span class="change-status ${result.status}">${escapeHtml(result.status)}</span>
          </header>
          <dl class="command-meta">
            <div><dt>Mode</dt><dd>${escapeHtml(result.mode)}</dd></div>
            <div><dt>Exit</dt><dd>${result.exitCode === undefined ? "unknown" : String(result.exitCode)}</dd></div>
            <div><dt>Duration</dt><dd>${result.durationMs === undefined ? "unknown" : `${result.durationMs}ms`}</dd></div>
            <div><dt>Auth</dt><dd>${result.authorizationDecision.allowed ? "allowed" : "blocked"}${result.authorizationDecision.requiresConfirmation ? "; confirmation" : ""}</dd></div>
          </dl>
          <p class="${result.status === "failed" || result.status === "blocked" ? "warning" : "muted"}">${escapeHtml(result.reason)}</p>
          ${result.suggestedNextStep ? `<p class="muted">${escapeHtml(result.suggestedNextStep)}</p>` : ""}
          ${stdout}
          ${stderr}
        </article>`;
    })
    .join("");
}

function truncateOutput(value: string): string {
  const max = 8000;
  return value.length > max ? `${value.slice(0, max)}\n\n... output truncated in webview ...` : value;
}

function statusClass(status: AutoModeStatusMessage): string {
  if (status === "succeeded") {
    return "succeeded";
  }
  if (status === "failed" || status === "blocked" || status === "max_loops_reached") {
    return "failed";
  }
  if (status === "cancelled" || status === "waiting_for_approval") {
    return "cancelled";
  }
  return "running";
}

function countPendingStatuses(changes: PendingFileChangeMessage[]): Record<PendingChangeStatusMessage, number> {
  return changes.reduce(
    (counts, change) => ({
      ...counts,
      [change.status]: counts[change.status] + 1
    }),
    { pending: 0, approved: 0, rejected: 0, applied: 0, failed: 0, invalid: 0 }
  );
}

function parsePlanSections(markdown: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = markdown.split(/\r?\n/);
  let current = "Summary";
  let buffer: string[] = [];

  for (const line of lines) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      if (buffer.join("\n").trim()) {
        sections.set(current, buffer.join("\n").trim());
      }
      current = heading[1].trim();
      buffer = [];
    } else if (!/^#\s+Plan:/i.test(line)) {
      buffer.push(line);
    }
  }

  if (buffer.join("\n").trim()) {
    sections.set(current, buffer.join("\n").trim());
  }
  return sections;
}

function renderNamedSection(sections: Map<string, string>, name: string): string {
  const content = findSection(sections, name);
  if (!content) {
    return "";
  }
  return `
    <section class="plan-section">
      <h4>${escapeHtml(name)}</h4>
      <div class="plan-copy">${renderPlanMarkdownFragment(content)}</div>
    </section>`;
}

function findSection(sections: Map<string, string>, target: string): string | undefined {
  const normalizedTarget = normalizeSectionName(target);
  for (const [name, content] of sections) {
    if (normalizeSectionName(name) === normalizedTarget) {
      return content;
    }
  }
  return undefined;
}

function normalizeSectionName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function renderPlanMarkdownFragment(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const html: string[] = [];
  let listOpen = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const bullet = trimmed.match(/^([-*]|\d+\.)\s+(.+)$/);
    if (bullet) {
      if (!listOpen) {
        html.push("<ul>");
        listOpen = true;
      }
      html.push(`<li>${escapeInlineMarkdown(bullet[2])}</li>`);
      continue;
    }

    if (listOpen) {
      html.push("</ul>");
      listOpen = false;
    }

    if (!trimmed) {
      continue;
    }
    html.push(`<p>${escapeInlineMarkdown(trimmed)}</p>`);
  }

  if (listOpen) {
    html.push("</ul>");
  }
  return html.join("");
}

function escapeInlineMarkdown(value: string): string {
  return escapeHtml(value).replace(/`([^`]+)`/g, "<code>$1</code>");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
