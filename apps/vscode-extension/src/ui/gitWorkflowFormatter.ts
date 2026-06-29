import { GitWorkflowState } from "../git/gitTypes";

export function formatGitWorkflowStateForOutput(state: GitWorkflowState): string {
  if (!state.available) {
    return `Git workflow unavailable: ${state.lastError || "not a git workspace or git command failed"}`;
  }

  const files = state.files
    .map((file) => {
      const protection = file.protected ? ` protected: ${file.protectedReason}` : "";
      return `- ${file.indexStatus}${file.workingTreeStatus} ${file.path}${protection}`;
    })
    .join("\n");
  const lastCommand = state.lastCommand
    ? [
        state.lastCommand.command,
        `Status: ${state.lastCommand.status}`,
        `Exit: ${state.lastCommand.exitCode}`,
        state.lastCommand.stdout ? `STDOUT:\n${state.lastCommand.stdout}` : "",
        state.lastCommand.stderr ? `STDERR:\n${state.lastCommand.stderr}` : ""
      ]
        .filter(Boolean)
        .join("\n")
    : "none";
  const pr = state.pullRequest
    ? [
        `Title: ${state.pullRequest.title}`,
        `GitHub CLI: ${state.pullRequest.ghAvailable ? "available" : "not available"}`,
        state.pullRequest.manualInstructions || "",
        state.pullRequest.command ? `Command: ${state.pullRequest.command}` : ""
      ]
        .filter(Boolean)
        .join("\n")
    : "none";

  return [
    "Borger Git Workflow",
    `Branch: ${state.branch || "unknown"}`,
    `Remote: ${state.remote || "unknown"}`,
    `Upstream: ${state.upstream || "none"}`,
    `Clean: ${state.clean ? "yes" : "no"}`,
    `Staged: ${state.stagedFiles.length}`,
    `Unstaged: ${state.unstagedFiles.length}`,
    `Untracked: ${state.untrackedFiles.length}`,
    "",
    "Changed files:",
    files || "- none",
    "",
    "Diff stat:",
    state.diffStat || "none",
    "",
    "Generated commit message:",
    state.generatedCommitMessage || "none",
    "",
    "Pull request:",
    pr,
    "",
    "Last command:",
    lastCommand
  ].join("\n");
}
