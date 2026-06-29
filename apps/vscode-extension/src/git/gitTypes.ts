import { TerminalCommandStatus } from "../terminal/commandTypes";

export interface GitChangedFile {
  path: string;
  indexStatus: string;
  workingTreeStatus: string;
  staged: boolean;
  unstaged: boolean;
  untracked: boolean;
  protected: boolean;
  protectedReason?: string;
}

export interface GitCommandResult {
  command: string;
  cwd: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  exitCode: number;
  stdout: string;
  stderr: string;
  status: TerminalCommandStatus;
  reason: string;
}

export interface PullRequestPreparation {
  title: string;
  body: string;
  ghAvailable: boolean;
  command?: string;
  manualInstructions?: string;
  result?: GitCommandResult;
}

export interface GitWorkflowState {
  available: boolean;
  branch?: string;
  remote?: string;
  upstream?: string;
  clean: boolean;
  files: GitChangedFile[];
  stagedFiles: GitChangedFile[];
  unstagedFiles: GitChangedFile[];
  untrackedFiles: GitChangedFile[];
  safeStageableFiles: GitChangedFile[];
  protectedFiles: GitChangedFile[];
  diffStat: string;
  diffNameOnly: string[];
  generatedCommitMessage?: string;
  pullRequest?: PullRequestPreparation;
  lastCommand?: GitCommandResult;
  lastError?: string;
}
