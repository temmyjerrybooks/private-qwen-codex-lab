import { AuthorizationDecision } from "../permissions/authorization";

export type TerminalExecutionMode = "captured" | "interactive";
export type TerminalCommandStatus = "pending" | "running" | "succeeded" | "failed" | "blocked" | "cancelled";

export interface TerminalCommandResult {
  id: string;
  command: string;
  cwd: string;
  mode: TerminalExecutionMode;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  exitCode?: number;
  stdout: string;
  stderr: string;
  status: TerminalCommandStatus;
  authorizationDecision: AuthorizationDecision;
  reason: string;
  suggestedNextStep?: string;
}

export interface TerminalCommandRunOptions {
  mode?: TerminalExecutionMode;
  reason?: string;
  requireConfirmation?: boolean;
}
