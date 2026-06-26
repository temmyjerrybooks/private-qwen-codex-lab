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
const generateButton = document.getElementById("generateButton");
const providerRefreshButton = document.getElementById("providerRefreshButton");
const providerStatusEl = document.getElementById("providerStatus");
const permissionRefreshButton = document.getElementById("permissionRefreshButton");
const permissionStatusEl = document.getElementById("permissionStatus");
const pendingChangesOutputEl = document.getElementById("pendingChangesOutput");
const approveAllButton = document.getElementById("approveAllButton");
const rejectAllButton = document.getElementById("rejectAllButton");
const regenerateButton = document.getElementById("regenerateButton");
const clearPendingButton = document.getElementById("clearPendingButton");

inspectButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "inspectWorkspace" });
});

planButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "planTask", task: taskInputEl?.value ?? "" });
});

generateButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "generateProposedChanges", task: taskInputEl?.value ?? "" });
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

regenerateButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "generateProposedChanges", task: taskInputEl?.value ?? "" });
});

clearPendingButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "clearPendingChanges" });
});

pendingChangesOutputEl?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  const action = target.dataset.action;
  const changeId = target.dataset.changeId;
  if (!action || !changeId) {
    return;
  }
  vscode.postMessage({
    type: action === "approve" ? "approvePendingChange" : "rejectPendingChange",
    changeId
  });
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
});

interface WebviewResponse {
  type: "state" | "plan" | "providerStatus" | "permissionStatus" | "pendingChanges";
  status?: string;
  body?: unknown;
  plan?: PlanTaskResultMessage | string;
  reports?: ProviderStatusReport[];
  state?: PermissionState;
  error?: string;
  changeSet?: PendingChangeSetMessage;
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
  status: "pending" | "approved" | "rejected" | "invalid";
  diff: string;
  warning?: string;
  invalidReason?: string;
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
    .map((change) => `
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
        <pre class="diff-block">${escapeHtml(change.diff || "No diff available.")}</pre>
        <div class="actions">
          <button data-action="approve" data-change-id="${escapeHtml(change.id)}" ${change.status === "invalid" ? "disabled" : ""}>Approve File Change</button>
          <button data-action="reject" data-change-id="${escapeHtml(change.id)}" ${change.status === "invalid" ? "disabled" : ""}>Reject File Change</button>
        </div>
      </article>`)
    .join("");

  const commands = changeSet.commandsToRunLater.length > 0
    ? `<ul class="plan-list">${changeSet.commandsToRunLater
        .map((command) => `<li><code>${escapeHtml(command.command)}</code><span>${escapeHtml(command.reason)}</span></li>`)
        .join("")}</ul>`
    : '<p class="muted">No commands suggested.</p>';
  const risks = changeSet.risks.length > 0
    ? `<ul class="plan-list">${changeSet.risks.map((risk) => `<li>${escapeHtml(risk)}</li>`).join("")}</ul>`
    : '<p class="muted">No risks reported.</p>';

  return `
    <section class="changes-summary">
      <h3>${escapeHtml(changeSet.summary)}</h3>
      <p>${escapeHtml(changeSet.task)} via ${escapeHtml(changeSet.provider.label)}</p>
      <p>${counts.pending} pending, ${counts.approved} approved, ${counts.rejected} rejected, ${counts.invalid} invalid</p>
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

function countPendingStatuses(changes: PendingFileChangeMessage[]): Record<PendingFileChangeMessage["status"], number> {
  return changes.reduce(
    (counts, change) => ({
      ...counts,
      [change.status]: counts[change.status] + 1
    }),
    { pending: 0, approved: 0, rejected: 0, invalid: 0 }
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
