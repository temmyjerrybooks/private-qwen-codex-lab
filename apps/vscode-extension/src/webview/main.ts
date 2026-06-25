declare const acquireVsCodeApi: () => {
  postMessage(message: unknown): void;
};

const vscode = acquireVsCodeApi();

const statusEl = document.getElementById("status");
const workspaceEl = document.getElementById("workspace");
const contextStatusEl = document.getElementById("contextStatus");
const planOutputEl = document.getElementById("planOutput");
const taskInputEl = document.getElementById("taskInput") as HTMLTextAreaElement | null;
const inspectButton = document.getElementById("inspectButton");
const planButton = document.getElementById("planButton");
const providerRefreshButton = document.getElementById("providerRefreshButton");
const providerStatusEl = document.getElementById("providerStatus");
const permissionRefreshButton = document.getElementById("permissionRefreshButton");
const permissionStatusEl = document.getElementById("permissionStatus");

inspectButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "inspectWorkspace" });
});

planButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "planTask", task: taskInputEl?.value ?? "" });
});

providerRefreshButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "refreshProviderStatus" });
});

permissionRefreshButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "refreshPermissionStatus" });
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
      planOutputEl.textContent = JSON.stringify(message.body, null, 2);
    }
  }

  if (message.type === "plan" && planOutputEl) {
    planOutputEl.textContent = message.plan ?? "";
  }

  if (message.type === "providerStatus" && providerStatusEl) {
    providerStatusEl.innerHTML = renderProviderStatus(message.reports ?? []);
  }

  if (message.type === "permissionStatus" && permissionStatusEl) {
    permissionStatusEl.innerHTML = renderPermissionStatus(message.state, message.error);
  }
});

interface WebviewResponse {
  type: "state" | "plan" | "providerStatus" | "permissionStatus";
  status?: string;
  body?: unknown;
  plan?: string;
  reports?: ProviderStatusReport[];
  state?: PermissionState;
  error?: string;
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
    ["Git", git]
  ];

  return rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
