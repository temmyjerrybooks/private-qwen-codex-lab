import type { PendingChangeSet, PendingChangeStats } from "./pendingChanges";
import type { PlanTaskResult } from "./planner";
import type { FixModeResult } from "./fixMode";
import type { TerminalCommandResult } from "../terminal/commandTypes";
import type { DiagnosticsSummary } from "../tools/diagnostics";

export type AutoModeStatus =
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

export type AutoModeTimelineEntryStatus = "started" | "completed" | "blocked" | "failed" | "cancelled";

export interface AutoModeTimelineEntry {
  id: string;
  timestamp: string;
  loop: number;
  state: AutoModeStatus;
  title: string;
  detail?: string;
  status: AutoModeTimelineEntryStatus;
}

export interface AutoModeFinalSummary {
  task: string;
  startedAt: string;
  endedAt: string;
  loops: number;
  filesChanged: string[];
  commandsRun: Array<{
    command: string;
    status: TerminalCommandResult["status"];
    exitCode?: number;
  }>;
  errorsFixed: number;
  remainingErrors: number;
  skippedOrBlockedActions: string[];
  finalStatus: AutoModeStatus;
  recommendedNextAction: string;
}

export interface AutoModeRunState {
  id: string;
  task: string;
  status: AutoModeStatus;
  currentLoop: number;
  maxLoops: number;
  startedAt?: string;
  endedAt?: string;
  timeline: AutoModeTimelineEntry[];
  plan?: PlanTaskResult;
  pendingChangeSet?: PendingChangeSet;
  pendingStats?: PendingChangeStats;
  latestCommand?: TerminalCommandResult;
  diagnostics?: DiagnosticsSummary;
  fixResult?: FixModeResult;
  changedFiles: string[];
  commandsRun: TerminalCommandResult[];
  errorsFixed: number;
  initialErrorCount: number;
  blockedReasons: string[];
  skippedActions: string[];
  summary?: AutoModeFinalSummary;
  recommendedNextAction?: string;
}
