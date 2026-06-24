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

inspectButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "inspectWorkspace" });
});

planButton?.addEventListener("click", () => {
  vscode.postMessage({ type: "planTask", task: taskInputEl?.value ?? "" });
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
});

interface WebviewResponse {
  type: "state" | "plan";
  status?: string;
  body?: unknown;
  plan?: string;
}

function isWorkspaceSummary(value: unknown): value is { workspaceName: string } {
  return Boolean(value && typeof value === "object" && "workspaceName" in value);
}
