import * as vscode from "vscode";
import { planTask } from "../agent/planner";
import { getBorgerConfig } from "../config";
import { ProviderRouter } from "../providers/providerRouter";
import { inspectWorkspace } from "../tools/workspace";

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

  postPlan(plan: string): void {
    this.view?.webview.postMessage({ type: "plan", plan });
  }

  async postProviderStatus(): Promise<void> {
    const router = new ProviderRouter(this.context);
    const reports = await router.getStatusReports();
    this.view?.webview.postMessage({ type: "providerStatus", reports });
  }

  private async handleMessage(message: WebviewMessage): Promise<void> {
    if (message.type === "inspectWorkspace") {
      const summary = await inspectWorkspace();
      this.postState("Workspace inspected", summary);
      await this.postProviderStatus();
      return;
    }

    if (message.type === "planTask" && typeof message.task === "string") {
      this.postState("Planning...");
      const result = await planTask(message.task, this.context);
      this.postPlan(result);
      await this.postProviderStatus();
      return;
    }

    if (message.type === "refreshProviderStatus") {
      await this.postProviderStatus();
      return;
    }

    this.output.appendLine(`Unhandled webview message: ${JSON.stringify(message)}`);
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
      </div>
    </section>

    <section class="output">
      <h2>Plan</h2>
      <pre id="planOutput">Ask Borger to inspect the workspace or plan a task.</pre>
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
}
