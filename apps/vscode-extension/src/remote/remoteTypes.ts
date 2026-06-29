import { AuthorizationDecision } from "../permissions/authorization";

export type RemoteAuthMode = "ssh-agent" | "ssh-config" | "private-key-path";
export type RemoteCommandStatus = "pending" | "running" | "succeeded" | "failed" | "blocked" | "cancelled";

export interface RemoteHostConfig {
  id: string;
  label: string;
  host: string;
  port: number;
  username?: string;
  authMode: RemoteAuthMode;
  privateKeyPath?: string;
  defaultRemoteCwd: string;
  allowedRemoteCwds: string[];
  enabled: boolean;
}

export interface RemoteHostsLocalConfig {
  hosts: RemoteHostConfig[];
}

export interface RemoteConfigLoadResult {
  config: RemoteHostsLocalConfig;
  source: "default" | "local" | "malformed";
  uri: string;
  warning?: string;
}

export type RemotePolicyClassification = "safe" | "needs_confirmation" | "blocked";

export interface RemotePolicyResult {
  classification: RemotePolicyClassification;
  reason: string;
  matchedPattern?: string;
  destructive?: boolean;
}

export interface RemoteCommandResult {
  id: string;
  hostId: string;
  hostLabel: string;
  sshHost: string;
  command: string;
  remoteCwd: string;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  exitCode?: number;
  stdout: string;
  stderr: string;
  status: RemoteCommandStatus;
  authorizationDecision: AuthorizationDecision;
  reason: string;
  suggestedNextStep?: string;
}

export interface RemoteInspectionResult {
  hostId: string;
  hostLabel: string;
  remoteCwd: string;
  inspectedAt: string;
  results: RemoteCommandResult[];
  summary: string;
}

export interface RemoteOpsState {
  config: RemoteConfigLoadResult;
  history: RemoteCommandResult[];
  latestResult?: RemoteCommandResult;
  latestInspection?: RemoteInspectionResult;
}
