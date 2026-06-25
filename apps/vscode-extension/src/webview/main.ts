declare const acquireVsCodeApi: () => {
  postMessage(message: unknown): void;
};

const vscode = acquireVsCodeApi();

const statusEl = document.getElementById("status");
const workspaceEl = document.getElementById("workspace");
const planOutputEl = document.getElementById("planOutput");
const taskInputEl = document.getElementById("taskInput") as HTMLTextAreaElement | null;
const inspectButton = document.getElementById("inspectButton");
const planButton = document.getElementById("planButton");
const providerRefreshButton = document.getElementById("providerRefreshButton");
const providerStatusEl = document.getElementById("providerStatus");

inspectButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "inspectWorkspace" });
});

planButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "planTask", task: taskInputEl?.value ?? "" });
});

providerRefreshButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "refreshProviderStatus" });
});

window.addEventListener("message", (event: MessageEvent<WebviewResponse>) => {
  const message = event.data;
  if (message.type === "state") {
    if (statusEl) {
      statusEl.textContent = message.status ?? "Ready";
    }
    if (workspaceEl && isWorkspaceSummary(message.body)) {
      workspaceEl.textContent = message.body.workspaceName;
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
});

interface WebviewResponse {
  type: "state" | "plan" | "providerStatus";
  status?: string;
  body?: unknown;
  plan?: string;
  reports?: ProviderStatusReport[];
}

function isWorkspaceSummary(value: unknown): value is { workspaceName: string } {
  return Boolean(value && typeof value === "object" && "workspaceName" in value);
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
