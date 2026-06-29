import * as vscode from "vscode";
import { AuthorizationDecision, authorizeAction } from "../permissions/authorization";
import { logAction } from "../permissions/actionLogger";
import { loadPermissionState } from "../permissions/permissionState";
import {
  findRemoteHost,
  loadRemoteHostsConfig,
  validateRemoteCwd
} from "./remoteConfig";
import {
  addRemoteHistoryEntry,
  getLatestRemoteHistoryEntry,
  getLatestRemoteInspection,
  getRemoteHistory,
  setLatestRemoteInspection,
  updateRemoteHistoryEntry
} from "./remoteHistory";
import { classifyRemoteCommand } from "./remotePolicy";
import { RemoteCommandResult, RemoteHostConfig, RemoteInspectionResult, RemoteOpsState } from "./remoteTypes";

const maxBufferBytes = 5 * 1024 * 1024;
const timeoutMs = 10 * 60 * 1000;

export async function getRemoteOpsState(): Promise<RemoteOpsState> {
  return {
    config: await loadRemoteHostsConfig(),
    history: getRemoteHistory(),
    latestResult: getLatestRemoteHistoryEntry(),
    latestInspection: getLatestRemoteInspection()
  };
}

export async function runRemoteCommand(input: {
  hostId?: string;
  command: string;
  remoteCwd?: string;
  reason?: string;
  preConfirmed?: boolean;
  eventPrefix?: "remote_command" | "ssh_connection_test";
}): Promise<RemoteCommandResult> {
  const loaded = await loadRemoteHostsConfig();
  const host = findRemoteHost(loaded.config, input.hostId);
  const remoteCwd = validateRemoteCwd(host, input.remoteCwd);
  const command = input.command.trim();
  const eventPrefix = input.eventPrefix ?? "remote_command";
  const startedAt = new Date();

  const sshDecision = await authorizeAction("ssh_command", {
    command,
    sshHost: host.host,
    remoteHostAllowlisted: true,
    cwd: remoteCwd
  });

  if (!sshDecision.allowed) {
    return await blockRemoteCommand(host, command, remoteCwd, startedAt, sshDecision, sshDecision.reason);
  }

  const permissionState = await loadPermissionState();
  const policy = classifyRemoteCommand(command, permissionState);
  if (policy.destructive) {
    await authorizeAction("destructive_command", {
      command,
      sshHost: host.host,
      remoteHostAllowlisted: true,
      cwd: remoteCwd
    });
  }
  if (policy.classification === "blocked") {
    return await blockRemoteCommand(host, command, remoteCwd, startedAt, sshDecision, policy.reason);
  }

  const sshArgs = buildSshArgs(host, remoteCwd, command);
  const displayCommand = renderSshDisplayCommand(host, remoteCwd, command);
  const terminalDecision = await authorizeAction("run_terminal", {
    command: displayCommand,
    sshHost: host.host,
    cwd: remoteCwd
  });
  if (!terminalDecision.allowed) {
    return await blockRemoteCommand(host, command, remoteCwd, startedAt, terminalDecision, terminalDecision.reason);
  }

  await logRemoteEvent("remote_command_authorized", true, input.reason ?? policy.reason, sshDecision, host, command, remoteCwd);

  const requiresConfirmation =
    !input.preConfirmed &&
    (sshDecision.requiresConfirmation ||
      terminalDecision.requiresConfirmation ||
      policy.classification === "needs_confirmation");
  const confirmed = await confirmRemoteCommand(host, command, remoteCwd, policy.reason, requiresConfirmation);
  if (!confirmed) {
    const cancelled = buildResult({
      host,
      command,
      remoteCwd,
      startedAt,
      decision: sshDecision,
      status: "cancelled",
      reason: "User cancelled the remote command before execution.",
      suggestedNextStep: "Run the command again if you still want Borger to execute it."
    });
    addRemoteHistoryEntry(cancelled);
    await logRemoteEvent("remote_command_blocked", false, cancelled.reason, sshDecision, host, command, remoteCwd, cancelled);
    return cancelled;
  }

  const running = buildResult({
    host,
    command,
    remoteCwd,
    startedAt,
    decision: sshDecision,
    status: "running",
    reason: input.reason ?? policy.reason
  });
  addRemoteHistoryEntry(running);
  await logRemoteEvent(
    eventPrefix === "ssh_connection_test" ? "ssh_connection_test_started" : "remote_command_started",
    true,
    running.reason,
    sshDecision,
    host,
    command,
    remoteCwd,
    running
  );

  const captured = await runSshCommand(sshArgs);
  const endedAt = new Date();
  const durationMs = endedAt.getTime() - startedAt.getTime();
  const succeeded = captured.exitCode === 0;
  const finalResult =
    updateRemoteHistoryEntry(running.id, {
      endedAt: endedAt.toISOString(),
      durationMs,
      exitCode: captured.exitCode,
      stdout: captured.stdout,
      stderr: captured.stderr,
      status: succeeded ? "succeeded" : "failed",
      reason: succeeded ? "Remote command completed successfully." : `Remote command exited with code ${captured.exitCode}.`,
      suggestedNextStep: succeeded
        ? "Review the remote output and continue with the planned workflow."
        : "Review remote stderr/stdout before continuing."
    }) ?? running;

  const actionType =
    eventPrefix === "ssh_connection_test"
      ? succeeded
        ? "ssh_connection_test_completed"
        : "ssh_connection_test_failed"
      : succeeded
        ? "remote_command_completed"
        : "remote_command_failed";
  await logRemoteEvent(actionType, succeeded, finalResult.reason, sshDecision, host, command, remoteCwd, finalResult);
  return finalResult;
}

export async function testSshConnection(hostId?: string, remoteCwd?: string): Promise<RemoteCommandResult> {
  return runRemoteCommand({
    hostId,
    remoteCwd,
    command: "pwd",
    reason: "Test SSH connection with a safe pwd command.",
    eventPrefix: "ssh_connection_test"
  });
}

export async function inspectRemoteProject(hostId?: string, remoteCwd?: string): Promise<RemoteInspectionResult> {
  const loaded = await loadRemoteHostsConfig();
  const host = findRemoteHost(loaded.config, hostId);
  const cwd = validateRemoteCwd(host, remoteCwd);
  const decision = await authorizeAction("ssh_command", {
    command: "remote project inspection",
    sshHost: host.host,
    remoteHostAllowlisted: true,
    cwd
  });
  if (!decision.allowed) {
    throw new Error(decision.reason);
  }

  const confirmed = await confirmRemoteCommand(
    host,
    "Remote project inspection",
    cwd,
    "Inspect remote project with safe read-only commands.",
    decision.requiresConfirmation
  );
  if (!confirmed) {
    throw new Error("User cancelled remote project inspection.");
  }

  const commands = [
    "pwd",
    "ls -la",
    "git status --short",
    "git branch --show-current",
    "git log --oneline -5",
    "ls package.json",
    "cat package.json",
    "ls Dockerfile docker-compose.yml compose.yml compose.yaml ecosystem.config.js ecosystem.config.cjs ecosystem.config.mjs"
  ];
  const results: RemoteCommandResult[] = [];
  for (const command of commands) {
    results.push(
      await runRemoteCommand({
        hostId: host.id,
        remoteCwd: cwd,
        command,
        reason: "Remote project inspection safe read-only command.",
        preConfirmed: true
      })
    );
  }

  const inspection: RemoteInspectionResult = {
    hostId: host.id,
    hostLabel: host.label,
    remoteCwd: cwd,
    inspectedAt: new Date().toISOString(),
    results,
    summary: buildInspectionSummary(results)
  };
  setLatestRemoteInspection(inspection);
  await logRemoteEvent("remote_project_inspected", true, inspection.summary, decision, host, "remote project inspection", cwd);
  return inspection;
}

interface CapturedSshExecution {
  exitCode: number;
  stdout: string;
  stderr: string;
}

async function runSshCommand(args: string[]): Promise<CapturedSshExecution> {
  const { execa } = await import("execa");
  try {
    const result = await execa("ssh", args, {
      reject: false,
      timeout: timeoutMs,
      maxBuffer: maxBufferBytes
    });
    return {
      exitCode: result.exitCode ?? 0,
      stdout: normalizeOutput(result.stdout),
      stderr: normalizeOutput(result.stderr)
    };
  } catch (error) {
    const sshError = error as {
      exitCode?: number;
      stdout?: unknown;
      stderr?: unknown;
      shortMessage?: string;
      message?: string;
      timedOut?: boolean;
    };
    return {
      exitCode: sshError.timedOut ? 124 : sshError.exitCode ?? 1,
      stdout: normalizeOutput(sshError.stdout),
      stderr: normalizeOutput(sshError.stderr) || sshError.shortMessage || sshError.message || String(error)
    };
  }
}

async function blockRemoteCommand(
  host: RemoteHostConfig,
  command: string,
  remoteCwd: string,
  startedAt: Date,
  decision: AuthorizationDecision,
  reason: string
): Promise<RemoteCommandResult> {
  const blocked = buildResult({
    host,
    command,
    remoteCwd,
    startedAt,
    decision,
    status: "blocked",
    reason,
    suggestedNextStep: "Review remote host config, permission profile, cwd allowlist, or command policy before retrying."
  });
  addRemoteHistoryEntry(blocked);
  await logRemoteEvent("remote_command_blocked", false, reason, decision, host, command, remoteCwd, blocked);
  return blocked;
}

function buildResult(input: {
  host: RemoteHostConfig;
  command: string;
  remoteCwd: string;
  startedAt: Date;
  decision: AuthorizationDecision;
  status: RemoteCommandResult["status"];
  reason: string;
  suggestedNextStep?: string;
}): RemoteCommandResult {
  const ended = input.status === "blocked" || input.status === "cancelled";
  const endedAt = ended ? new Date() : undefined;
  return {
    id: createId(),
    hostId: input.host.id,
    hostLabel: input.host.label,
    sshHost: input.host.host,
    command: input.command,
    remoteCwd: input.remoteCwd,
    startedAt: input.startedAt.toISOString(),
    endedAt: endedAt?.toISOString(),
    durationMs: endedAt ? endedAt.getTime() - input.startedAt.getTime() : undefined,
    stdout: "",
    stderr: "",
    status: input.status,
    authorizationDecision: input.decision,
    reason: input.reason,
    suggestedNextStep: input.suggestedNextStep
  };
}

function buildSshArgs(host: RemoteHostConfig, remoteCwd: string, command: string): string[] {
  const args = ["-o", "BatchMode=yes", "-p", String(host.port || 22)];
  if (host.authMode === "private-key-path" && host.privateKeyPath) {
    args.push("-i", host.privateKeyPath);
  }
  args.push(getSshTarget(host), `cd ${quoteRemoteShellArg(remoteCwd)} && ${command}`);
  return args;
}

function renderSshDisplayCommand(host: RemoteHostConfig, remoteCwd: string, command: string): string {
  const port = host.port || 22;
  return `ssh -o BatchMode=yes -p ${port} ${getSshTarget(host)} ${JSON.stringify(`cd ${remoteCwd} && ${command}`)}`;
}

function getSshTarget(host: RemoteHostConfig): string {
  return host.username ? `${host.username}@${host.host}` : host.host;
}

function quoteRemoteShellArg(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

async function confirmRemoteCommand(
  host: RemoteHostConfig,
  command: string,
  remoteCwd: string,
  reason: string,
  requiresConfirmation: boolean
): Promise<boolean> {
  if (!requiresConfirmation) {
    return true;
  }
  const choice = await vscode.window.showWarningMessage(
    `Run remote command?\n\nHost: ${host.label} (${host.host})\nRemote cwd: ${remoteCwd}\nCommand: ${command}\n\n${reason}`,
    { modal: true },
    "Run Remote Command"
  );
  return choice === "Run Remote Command";
}

async function logRemoteEvent(
  actionType: string,
  allowed: boolean,
  reason: string,
  decision: AuthorizationDecision,
  host: RemoteHostConfig,
  command: string,
  remoteCwd: string,
  result?: RemoteCommandResult
): Promise<void> {
  await logAction({
    actionType,
    allowed,
    requiresConfirmation: decision.requiresConfirmation,
    reason,
    profile: decision.profile,
    command,
    sshHost: host.host,
    hostId: host.id,
    hostLabel: host.label,
    remoteCwd,
    cwd: remoteCwd,
    exitCode: result?.exitCode,
    durationMs: result?.durationMs,
    status: result?.status
  });
}

function buildInspectionSummary(results: RemoteCommandResult[]): string {
  const succeeded = results.filter((result) => result.status === "succeeded").length;
  const failed = results.filter((result) => result.status === "failed").length;
  const blocked = results.filter((result) => result.status === "blocked").length;
  return `Remote inspection completed with ${succeeded} succeeded, ${failed} failed, and ${blocked} blocked command(s).`;
}

function normalizeOutput(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Uint8Array) {
    return Buffer.from(value).toString("utf8");
  }
  return value === undefined || value === null ? "" : String(value);
}

function createId(): string {
  return `remote_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
