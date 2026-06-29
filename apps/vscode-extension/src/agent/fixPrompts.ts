import { WorkspaceContext } from "./contextBuilder";
import { DiagnosticsSummary } from "../tools/diagnostics";
import { TerminalCommandResult } from "../terminal/commandTypes";

export type FixModeSource = "diagnostics" | "last_failed_command" | "current_file";

export interface FixPromptInput {
  source: FixModeSource;
  userTask?: string;
  workspaceContext: WorkspaceContext;
  diagnostics: DiagnosticsSummary;
  failedCommand?: TerminalCommandResult;
}

export function buildFixProposalPrompt(input: FixPromptInput): string {
  return `Fix Mode: generate a minimal targeted repair proposal.
Do not write files.
Do not run commands.
Do not commit, push, deploy, use SSH, or perform external actions.
Return strict JSON only.

Fix source:
${input.source}

User request or extra context:
${input.userTask?.trim() || "No extra user context provided."}

Diagnostics:
${JSON.stringify(input.diagnostics, null, 2)}

Failed command, if any:
${JSON.stringify(formatFailedCommandForPrompt(input.failedCommand), null, 2)}

Workspace context:
${JSON.stringify(input.workspaceContext, null, 2)}

Rules:
- Use the diagnostics, command output, current file, selected text, and relevant files to infer the likely cause.
- Make the smallest focused fix that addresses the error.
- Do not rewrite unrelated code.
- Do not invent file contents that are not visible in the workspace context.
- For modify and create actions, return the full updated file content.
- Do not propose changes to .env, private keys, token files, credential files, or secret-like files.
- .env.example is allowed only if genuinely relevant.
- Include commandsToRunLater for manual verification only. Borger will not run them automatically.
- Include risks for uncertainty, assumptions, or missing context.

Required JSON shape:
{
  "summary": "Short explanation of the fix",
  "changes": [
    {
      "path": "relative/path/to/file.ts",
      "action": "create | modify | delete",
      "reason": "Why this file needs to change",
      "content": "Full updated file content for create/modify. Omit or use empty string for delete."
    }
  ],
  "commandsToRunLater": [
    {
      "command": "npm run build",
      "reason": "Verify the fix"
    }
  ],
  "risks": [
    "Possible risk or unknown"
  ]
}`;
}

export function buildExplainLastErrorPrompt(input: FixPromptInput): string {
  return `Explain the latest Borger error context.
Do not propose file changes.
Do not return JSON.
Do not run commands.
Do not claim that you changed anything.

User request or extra context:
${input.userTask?.trim() || "No extra user context provided."}

Diagnostics:
${JSON.stringify(input.diagnostics, null, 2)}

Failed command, if any:
${JSON.stringify(formatFailedCommandForPrompt(input.failedCommand), null, 2)}

Workspace context:
${JSON.stringify(input.workspaceContext, null, 2)}

Return a concise Markdown explanation with:
- likely cause
- evidence from diagnostics or command output
- files likely involved
- manual next steps
- suggested command to run later, if useful`;
}

function formatFailedCommandForPrompt(command: TerminalCommandResult | undefined): unknown {
  if (!command) {
    return undefined;
  }

  return {
    command: command.command,
    cwd: command.cwd,
    exitCode: command.exitCode,
    durationMs: command.durationMs,
    status: command.status,
    reason: command.reason,
    stdout: truncate(command.stdout),
    stderr: truncate(command.stderr)
  };
}

function truncate(value: string, max = 9000): string {
  return value.length > max ? `${value.slice(0, max)}\n\n... truncated ...` : value;
}
