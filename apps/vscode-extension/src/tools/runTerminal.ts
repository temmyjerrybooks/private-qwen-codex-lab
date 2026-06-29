import * as vscode from "vscode";
import { getBorgerConfig } from "../config";
import { AuthorizationDecision, authorizeAction } from "../permissions/authorization";
import { logAction } from "../permissions/actionLogger";
import { addCommandHistoryEntry, updateCommandHistoryEntry } from "../terminal/commandHistory";
import { TerminalCommandResult, TerminalCommandRunOptions, TerminalExecutionMode } from "../terminal/commandTypes";
import { runCapturedCommand } from "../terminal/terminalRunner";

export async function runAuthorizedTerminalCommand(
  command: string,
  options: TerminalCommandRunOptions = {}
): Promise<TerminalCommandResult> {
  const normalizedCommand = command.trim();
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    throw new Error("Open a workspace folder before running terminal commands.");
  }

  const cwd = workspaceFolder.uri.fsPath;
  const mode = options.mode ?? "captured";
  const startedAt = new Date();
  const authorizationDecision = await authorizeAction("run_terminal", {
    command: normalizedCommand,
    cwd
  });

  if (!authorizationDecision.allowed) {
    const blocked = buildResult({
      command: normalizedCommand,
      cwd,
      mode,
      startedAt,
      authorizationDecision,
      status: "blocked",
      reason: authorizationDecision.reason,
      suggestedNextStep: "Review the active permission profile or command policy before trying again."
    });
    addCommandHistoryEntry(blocked);
    await logTerminalEvent("terminal_blocked", blocked, false);
    return blocked;
  }

  const confirmed = await confirmCommandIfNeeded(normalizedCommand, cwd, authorizationDecision);
  if (!confirmed) {
    const cancelled = buildResult({
      command: normalizedCommand,
      cwd,
      mode,
      startedAt,
      authorizationDecision,
      status: "cancelled",
      reason: "User cancelled the command before execution.",
      suggestedNextStep: "Run the command again if you still want Borger to execute it."
    });
    addCommandHistoryEntry(cancelled);
    await logTerminalEvent("terminal_cancelled", cancelled, false);
    return cancelled;
  }

  const running = buildResult({
    command: normalizedCommand,
    cwd,
    mode,
    startedAt,
    authorizationDecision,
    status: "running",
    reason: options.reason ?? authorizationDecision.reason
  });
  addCommandHistoryEntry(running);
  await logTerminalEvent("terminal_started", running, true);

  if (mode === "interactive") {
    openInteractiveTerminal(normalizedCommand, cwd);
    const interactive = updateCommandHistoryEntry(running.id, {
      reason: "Command sent to an interactive VS Code terminal. Output capture is not available for this mode.",
      suggestedNextStep: "Inspect the VS Code terminal for live output."
    });
    return interactive ?? running;
  }

  const captured = await runCapturedCommand(normalizedCommand, cwd);
  const endedAt = new Date();
  const durationMs = endedAt.getTime() - startedAt.getTime();
  const succeeded = captured.exitCode === 0;
  const finalResult = updateCommandHistoryEntry(running.id, {
    endedAt: endedAt.toISOString(),
    durationMs,
    exitCode: captured.exitCode,
    stdout: captured.stdout,
    stderr: captured.stderr,
    status: succeeded ? "succeeded" : "failed",
    reason: succeeded ? "Command completed successfully." : `Command exited with code ${captured.exitCode}.`,
    suggestedNextStep: succeeded
      ? "Review the output and continue with the planned workflow."
      : "Review stderr/stdout before asking Borger to propose fixes in a later phase."
  });

  const result = finalResult ?? {
    ...running,
    endedAt: endedAt.toISOString(),
    durationMs,
    exitCode: captured.exitCode,
    stdout: captured.stdout,
    stderr: captured.stderr,
    status: succeeded ? "succeeded" : "failed",
    reason: succeeded ? "Command completed successfully." : `Command exited with code ${captured.exitCode}.`
  };

  await logTerminalEvent(succeeded ? "terminal_completed" : "terminal_failed", result, succeeded);
  return result;
}

function buildResult(input: {
  command: string;
  cwd: string;
  mode: TerminalExecutionMode;
  startedAt: Date;
  authorizationDecision: AuthorizationDecision;
  status: TerminalCommandResult["status"];
  reason: string;
  suggestedNextStep?: string;
}): TerminalCommandResult {
  const ended = input.status === "blocked" || input.status === "cancelled";
  const endedAt = ended ? new Date() : undefined;
  return {
    id: createId(),
    command: input.command,
    cwd: input.cwd,
    mode: input.mode,
    startedAt: input.startedAt.toISOString(),
    endedAt: endedAt?.toISOString(),
    durationMs: endedAt ? endedAt.getTime() - input.startedAt.getTime() : undefined,
    stdout: "",
    stderr: "",
    status: input.status,
    authorizationDecision: input.authorizationDecision,
    reason: input.reason,
    suggestedNextStep: input.suggestedNextStep
  };
}

async function confirmCommandIfNeeded(
  command: string,
  cwd: string,
  decision: AuthorizationDecision
): Promise<boolean> {
  const config = getBorgerConfig();
  if (!decision.requiresConfirmation && !config.confirmBeforeTerminal) {
    return true;
  }

  const choice = await vscode.window.showWarningMessage(
    `Run terminal command?\n\n${command}\n\nWorking directory:\n${cwd}\n\n${decision.reason}`,
    { modal: true },
    "Run Command"
  );
  return choice === "Run Command";
}

function openInteractiveTerminal(command: string, cwd: string): void {
  const terminal = vscode.window.createTerminal({
    name: "Borger",
    cwd
  });
  terminal.show(true);
  terminal.sendText(command, true);
}

async function logTerminalEvent(
  actionType: string,
  result: TerminalCommandResult,
  allowed: boolean
): Promise<void> {
  await logAction({
    actionType,
    allowed,
    requiresConfirmation: result.authorizationDecision.requiresConfirmation,
    reason: result.reason,
    profile: result.authorizationDecision.profile,
    command: result.command,
    cwd: result.cwd,
    exitCode: result.exitCode,
    durationMs: result.durationMs,
    status: result.status
  });
}

function createId(): string {
  return `cmd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
