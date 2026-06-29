import * as vscode from "vscode";
import { getBorgerConfig } from "../config";
import { logAction } from "../permissions/actionLogger";
import { isObviousDestructiveCommand } from "../permissions/commandPolicy";
import { loadPermissionState, PermissionState } from "../permissions/permissionState";
import { collectDiagnostics, DiagnosticsSummary } from "../tools/diagnostics";
import { TerminalCommandResult } from "../terminal/commandTypes";
import { applyApprovedPendingChanges, generateProposedChanges, runControlledTerminalCommand } from "./executor";
import { generateDiagnosticsFix, generateLastFailedCommandFix, getFixModeStatus, hasFixableErrorSignals } from "./fixMode";
import { getPendingChanges, getPendingChangeStats, hasSecretLikeInvalidChange, markAllPendingChanges, PendingChangeSet, setPendingChanges } from "./pendingChanges";
import { PlanTaskResult, planTask } from "./planner";
import { AutoModeFinalSummary, AutoModeRunState, AutoModeStatus, AutoModeTimelineEntryStatus } from "./autoTypes";

const autoModeEvents = new vscode.EventEmitter<AutoModeRunState>();

let currentState: AutoModeRunState = createIdleState();
let activeRunId: string | undefined;
let cancelRequested = false;

export const onAutoModeStateChanged = autoModeEvents.event;

export function getAutoModeState(): AutoModeRunState {
  return currentState;
}

export async function runAutoMode(task: string, context: vscode.ExtensionContext): Promise<AutoModeRunState> {
  const trimmedTask = task.trim();
  if (!trimmedTask) {
    throw new Error("Enter a task before running Auto Mode.");
  }
  if (activeRunId) {
    throw new Error(`Auto Mode is already running for: ${currentState.task}`);
  }

  const config = getBorgerConfig().autoMode;
  const permissionState = await loadPermissionState();
  const maxLoops = Math.max(0, Math.min(config.maxLoops, permissionState.capabilities.maxAutoFixLoops));
  const runId = createId("auto");
  activeRunId = runId;
  cancelRequested = false;
  publish({
    ...createIdleState(),
    id: runId,
    task: trimmedTask,
    status: "planning",
    maxLoops,
    startedAt: new Date().toISOString()
  });

  await logAutoEvent(permissionState, "auto_started", true, "Auto Mode run started.");

  try {
    if (!config.enabled) {
      return await finish(permissionState, "blocked", "Auto Mode is disabled. Enable borger.autoModeEnabled or BORGER_AUTO_MODE_ENABLED=true before running it.");
    }
    if (maxLoops < 1 && permissionState.profile.id !== "plan_only" && permissionState.profile.id !== "read_only") {
      return await finish(permissionState, "blocked", "Auto Mode max loop limit is zero for the active configuration or permission profile.");
    }

    const confirmed = await confirmAutoModeStart(trimmedTask, maxLoops, permissionState.profile.label);
    if (!confirmed) {
      cancelRequested = true;
      return await finish(permissionState, "cancelled", "User cancelled Auto Mode before it started.");
    }

    const plan = await runStep(permissionState, "planning", "Create execution plan", 0, async () => {
      const result = await planTask(trimmedTask, context);
      if (typeof result === "string") {
        throw new Error(result);
      }
      return result;
    });
    publish({ plan });

    const initialDiagnostics = collectDiagnostics(vscode.workspace.workspaceFolders?.[0], 40);
    publish({
      diagnostics: initialDiagnostics,
      initialErrorCount: initialDiagnostics.errorCount
    });

    if (permissionState.profile.id === "read_only") {
      return await finish(permissionState, "blocked", "Read Only profile can plan, but Auto Mode will not propose edits or run commands.");
    }
    if (permissionState.profile.id === "plan_only" || !permissionState.capabilities.canWriteWorkspace) {
      return await finish(permissionState, "blocked", "Current profile allows planning only; Auto Mode stopped before proposing or applying edits.");
    }

    let needsFix = false;
    let latestCommand: TerminalCommandResult | undefined;

    for (let loop = 1; loop <= maxLoops; loop += 1) {
      ensureNotCancelled();
      publish({ currentLoop: loop });

      const changeSet = needsFix
        ? await generateFixChangeSet(permissionState, context, trimmedTask, loop, latestCommand)
        : await runStep(permissionState, "generating_changes", "Generate proposed changes", loop, async () =>
            generateProposedChanges(trimmedTask, context)
          );

      setPendingChanges(changeSet);
      publishPending(changeSet);

      if (config.stopOnSecretFile && hasSecretLikeInvalidChange(changeSet)) {
        return await finish(permissionState, "blocked", "A proposed change targeted a secret-like file, so Auto Mode stopped.");
      }

      const approved = await prepareChangesForApply(permissionState, changeSet);
      if (!approved) {
        return await finish(permissionState, "blocked", "No approved changes were available for Auto Mode to apply.");
      }

      const applyResult = await runStep(permissionState, "applying_changes", "Apply approved changes", loop, async () =>
        applyApprovedPendingChanges()
      );
      publishPending(applyResult.changeSet);
      rememberChangedFiles(applyResult.changeSet);

      const verificationCommand = selectVerificationCommand(changeSet, plan, config.allowedVerificationCommands);
      if (!verificationCommand) {
        const diagnostics = await collectErrors(permissionState, loop);
        if (diagnostics.errorCount > 0 && loop < maxLoops) {
          needsFix = true;
          latestCommand = undefined;
          continue;
        }
        if (diagnostics.errorCount > 0) {
          return await finish(permissionState, "max_loops_reached", "Diagnostics still report errors and no loop remains for another fix.");
        }
        return await finish(permissionState, "succeeded", "Changes were applied and no diagnostic errors remain. No allowed verification command was available.");
      }

      if (config.stopOnDestructiveCommand && isObviousDestructiveCommand(verificationCommand)) {
        return await finish(permissionState, "blocked", `Verification command was destructive and was not run: ${verificationCommand}`);
      }

      const commandResult = await runStep(permissionState, "running_verification", `Run verification: ${verificationCommand}`, loop, async () =>
        runControlledTerminalCommand(verificationCommand, "captured", {
          reason: "Auto Mode verification command.",
          requireConfirmation: config.requireApprovalForCommands
        })
      );
      latestCommand = commandResult;
      publish({
        latestCommand: commandResult,
        commandsRun: [...currentState.commandsRun, commandResult]
      });

      if (commandResult.status === "blocked") {
        return await finish(permissionState, "blocked", commandResult.reason);
      }
      if (commandResult.status === "cancelled") {
        return await finish(permissionState, "cancelled", commandResult.reason);
      }

      const diagnostics = await collectErrors(permissionState, loop);
      if (commandResult.status === "succeeded" && diagnostics.errorCount === 0) {
        return await finish(permissionState, "succeeded", "Verification passed and no diagnostic errors remain.");
      }

      if (loop >= maxLoops) {
        return await finish(permissionState, "max_loops_reached", "Verification or diagnostics still failed after the maximum Auto Mode loops.");
      }

      const fixStatus = await getFixModeStatus();
      if (!hasFixableErrorSignals(fixStatus)) {
        return await finish(permissionState, "blocked", "Verification failed, but Fix Mode had no diagnostics or failed command signal to use.");
      }
      needsFix = true;
    }

    return await finish(permissionState, "max_loops_reached", "Auto Mode reached the configured loop limit.");
  } catch (error) {
    if (error instanceof AutoModeCancelledError) {
      return await finish(permissionState, "cancelled", error.message);
    }
    const message = error instanceof Error ? error.message : String(error);
    return await finish(permissionState, "failed", message);
  } finally {
    activeRunId = undefined;
  }
}

export async function stopAutoMode(reason = "User requested Auto Mode stop."): Promise<AutoModeRunState> {
  if (!activeRunId || isTerminalState(currentState.status)) {
    return currentState;
  }
  cancelRequested = true;
  const permissionState = await loadPermissionState();
  addTimeline("cancelled", "Auto Mode stop requested", reason, currentState.currentLoop, "cancelled");
  await logAutoEvent(permissionState, "auto_cancelled", false, reason);
  publish({
    status: "cancelled",
    endedAt: new Date().toISOString(),
    recommendedNextAction: "Review the Auto Mode timeline and pending changes before starting another run."
  });
  return currentState;
}

async function generateFixChangeSet(
  permissionState: PermissionState,
  context: vscode.ExtensionContext,
  task: string,
  loop: number,
  latestCommand: TerminalCommandResult | undefined
): Promise<PendingChangeSet> {
  const fixResult = await runStep(permissionState, "fixing", "Generate fix proposal", loop, async () => {
    if (latestCommand?.status === "failed") {
      return generateLastFailedCommandFix(context, latestCommand.id, task);
    }
    return generateDiagnosticsFix(context, task);
  });
  if (!fixResult.changeSet) {
    throw new Error("Fix Mode did not return pending changes for Auto Mode.");
  }
  publish({ fixResult });
  return fixResult.changeSet;
}

async function prepareChangesForApply(permissionState: PermissionState, changeSet: PendingChangeSet): Promise<boolean> {
  const requireReview = shouldWaitForEditApproval(permissionState);
  if (!requireReview) {
    const approved = markAllPendingChanges("approved") ?? changeSet;
    publishPending(approved);
    return getPendingChangeStats(approved).applyable > 0;
  }

  publish({
    status: "waiting_for_approval"
  });
  addTimeline("waiting_for_approval", "Waiting for approved pending changes", "Approve or reject pending diffs in the sidebar.", currentState.currentLoop, "started");
  await logAutoEvent(permissionState, "auto_waiting_for_approval", true, "Auto Mode is waiting for pending change approval.");

  while (true) {
    ensureNotCancelled();
    const current = getPendingChanges();
    const stats = getPendingChangeStats(current);
    publish({
      pendingChangeSet: current,
      pendingStats: stats
    });

    if (stats.pending === 0) {
      return stats.applyable > 0;
    }
    await delay(1000);
  }
}

async function collectErrors(permissionState: PermissionState, loop: number): Promise<DiagnosticsSummary> {
  return runStep(permissionState, "collecting_errors", "Collect diagnostics and command output", loop, async () => {
    const diagnostics = collectDiagnostics(vscode.workspace.workspaceFolders?.[0], 40);
    publish({ diagnostics });
    return diagnostics;
  });
}

async function runStep<T>(
  permissionState: PermissionState,
  status: AutoModeStatus,
  title: string,
  loop: number,
  work: () => Promise<T>
): Promise<T> {
  ensureNotCancelled();
  publish({ status });
  addTimeline(status, title, undefined, loop, "started");
  await logAutoEvent(permissionState, "auto_step_started", true, title, status);
  try {
    const result = await work();
    ensureNotCancelled();
    addTimeline(status, title, undefined, loop, "completed");
    await logAutoEvent(permissionState, "auto_step_completed", true, title, status);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const cancelled = error instanceof AutoModeCancelledError;
    addTimeline(status, title, message, loop, cancelled ? "cancelled" : "failed");
    await logAutoEvent(permissionState, cancelled ? "auto_cancelled" : "auto_failed", false, message, status);
    throw error;
  }
}

async function finish(
  permissionState: PermissionState,
  status: Extract<AutoModeStatus, "succeeded" | "failed" | "blocked" | "cancelled" | "max_loops_reached">,
  reason: string
): Promise<AutoModeRunState> {
  const endedAt = new Date().toISOString();
  const diagnostics = currentState.diagnostics ?? collectDiagnostics(vscode.workspace.workspaceFolders?.[0], 40);
  const errorsFixed = Math.max(0, currentState.initialErrorCount - diagnostics.errorCount);
  const summary: AutoModeFinalSummary = {
    task: currentState.task,
    startedAt: currentState.startedAt ?? endedAt,
    endedAt,
    loops: currentState.currentLoop,
    filesChanged: currentState.changedFiles,
    commandsRun: currentState.commandsRun.map((command) => ({
      command: command.command,
      status: command.status,
      exitCode: command.exitCode
    })),
    errorsFixed,
    remainingErrors: diagnostics.errorCount,
    skippedOrBlockedActions: [...currentState.skippedActions, ...currentState.blockedReasons, reason].filter(Boolean),
    finalStatus: status,
    recommendedNextAction: buildRecommendedNextAction(status, reason)
  };

  addTimeline(status, buildFinishTitle(status), reason, currentState.currentLoop, status === "succeeded" ? "completed" : status === "cancelled" ? "cancelled" : "blocked");
  publish({
    status,
    endedAt,
    diagnostics,
    errorsFixed,
    summary,
    recommendedNextAction: summary.recommendedNextAction,
    blockedReasons: status === "blocked" || status === "max_loops_reached" ? [...currentState.blockedReasons, reason] : currentState.blockedReasons,
    skippedActions: status === "failed" ? [...currentState.skippedActions, reason] : currentState.skippedActions
  });
  await logAutoEvent(permissionState, autoEventForStatus(status), status === "succeeded", reason, status);
  return currentState;
}

function publishPending(changeSet: PendingChangeSet | undefined): void {
  publish({
    pendingChangeSet: changeSet,
    pendingStats: getPendingChangeStats(changeSet)
  });
}

function rememberChangedFiles(changeSet: PendingChangeSet | undefined): void {
  const applied = changeSet?.changes.filter((change) => change.status === "applied").map((change) => change.path) ?? [];
  publish({
    changedFiles: unique([...currentState.changedFiles, ...applied])
  });
}

function selectVerificationCommand(
  changeSet: PendingChangeSet,
  plan: PlanTaskResult,
  allowedCommands: string[]
): string | undefined {
  const candidates = [
    ...changeSet.commandsToRunLater.map((command) => command.command),
    ...plan.suggestedVerificationCommands,
    ...allowedCommands
  ];
  return candidates.find((command) => isAllowedVerificationCommand(command, allowedCommands));
}

function isAllowedVerificationCommand(command: string, allowedCommands: string[]): boolean {
  const normalized = normalizeCommand(command);
  return allowedCommands.some((allowed) => normalized === normalizeCommand(allowed));
}

function shouldWaitForEditApproval(permissionState: PermissionState): boolean {
  const config = getBorgerConfig().autoMode;
  if (config.requireApprovalForEdits) {
    return true;
  }
  return permissionState.profile.id === "edit_with_review";
}

async function confirmAutoModeStart(task: string, maxLoops: number, profileLabel: string): Promise<boolean> {
  const choice = await vscode.window.showWarningMessage(
    `Run Borger Auto Mode?\n\nTask:\n${task}\n\nProfile: ${profileLabel}\nMax loops: ${maxLoops}\n\nAuto Mode can propose edits, apply approved edits, and run allowed verification commands within strict limits.`,
    { modal: true },
    "Run Auto Mode"
  );
  return choice === "Run Auto Mode";
}

function ensureNotCancelled(): void {
  if (cancelRequested) {
    throw new AutoModeCancelledError("Auto Mode was cancelled.");
  }
}

function publish(next: Partial<AutoModeRunState>): void {
  currentState = {
    ...currentState,
    ...next
  };
  autoModeEvents.fire(currentState);
}

function addTimeline(
  state: AutoModeStatus,
  title: string,
  detail: string | undefined,
  loop: number,
  status: AutoModeTimelineEntryStatus
): void {
  publish({
    timeline: [
      ...currentState.timeline,
      {
        id: createId("step"),
        timestamp: new Date().toISOString(),
        loop,
        state,
        title,
        detail,
        status
      }
    ]
  });
}

async function logAutoEvent(
  permissionState: PermissionState,
  actionType: string,
  allowed: boolean,
  reason: string,
  status = currentState.status
): Promise<void> {
  await logAction({
    actionType,
    allowed,
    requiresConfirmation: false,
    reason,
    profile: permissionState.profile.id,
    status
  });
}

function autoEventForStatus(status: AutoModeStatus): string {
  switch (status) {
    case "succeeded":
      return "auto_succeeded";
    case "cancelled":
      return "auto_cancelled";
    case "blocked":
      return "auto_blocked";
    case "max_loops_reached":
      return "auto_max_loops_reached";
    case "failed":
      return "auto_failed";
    default:
      return "auto_step_completed";
  }
}

function buildFinishTitle(status: AutoModeStatus): string {
  switch (status) {
    case "succeeded":
      return "Auto Mode succeeded";
    case "cancelled":
      return "Auto Mode cancelled";
    case "max_loops_reached":
      return "Auto Mode reached max loops";
    case "blocked":
      return "Auto Mode blocked";
    case "failed":
      return "Auto Mode failed";
    default:
      return "Auto Mode finished";
  }
}

function buildRecommendedNextAction(status: AutoModeStatus, reason: string): string {
  switch (status) {
    case "succeeded":
      return "Review the final diff and command output, then continue manually if more work is needed.";
    case "cancelled":
      return "Review pending changes before starting another Auto Mode run.";
    case "max_loops_reached":
      return "Inspect the remaining diagnostics or command output and run Fix Mode manually if needed.";
    case "blocked":
      return `Resolve the blocker, then rerun Auto Mode if appropriate: ${reason}`;
    case "failed":
      return `Inspect the failure and retry with a narrower task: ${reason}`;
    default:
      return "Review the Auto Mode timeline.";
  }
}

function createIdleState(): AutoModeRunState {
  return {
    id: "auto_idle",
    task: "",
    status: "idle",
    currentLoop: 0,
    maxLoops: 0,
    timeline: [],
    changedFiles: [],
    commandsRun: [],
    errorsFixed: 0,
    initialErrorCount: 0,
    blockedReasons: [],
    skippedActions: []
  };
}

function isTerminalState(status: AutoModeStatus): boolean {
  return ["idle", "succeeded", "failed", "blocked", "cancelled", "max_loops_reached"].includes(status);
}

function normalizeCommand(command: string): string {
  return command.trim().replace(/\s+/g, " ").replace(/^npm\.cmd\b/i, "npm").toLowerCase();
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

class AutoModeCancelledError extends Error {}
