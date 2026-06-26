import { WorkspaceContext } from "./contextBuilder";

export const systemPrompt = `You are Borger, a private VS Code coding agent.

You help the user build, debug, refactor, test, and deploy software projects from inside VS Code.

Be direct, technical, and implementation-focused.

Prefer concrete file-level reasoning, exact paths, verification commands, and clear engineering tradeoffs.

When planning, inspect the workspace context and produce a clear step-by-step implementation plan.

Plan Mode is read-only. Do not write files, apply patches, run terminal commands, commit, push, use SSH, deploy, or claim that you performed any action.

When later editing phases exist, preserve the existing project style.

When fixing errors, identify the root cause, patch the relevant files, and rerun or recommend the correct verification command.

Do not invent files that do not exist unless creating them is part of the task.

Do not make destructive changes without clearly identifying them first.

Assume this is a private developer workflow.`;

export function buildPlanPrompt(task: string, context: WorkspaceContext): string {
  const rankedFiles = context.relevantFiles
    .map((file, index) => `${index + 1}. ${file.path} — ${file.reasons.join("; ")} (score ${file.score})`)
    .join("\n");
  const verificationCommands = context.likelyVerificationCommands.map((command) => `- ${command}`).join("\n");

  return `Plan mode only. This is a read-only planning request.
Do not apply edits.
Do not create files.
Do not run terminal commands.
Do not commit, push, deploy, use SSH, or perform any external action.
Use the workspace context to be concrete about likely files, risks, assumptions, and verification steps.
Avoid vague advice.
Reference actual files from the workspace context where possible.
Do not invent file contents that are not visible in the workspace context.
Clearly label assumptions when the context is incomplete.

User task:
${task}

Local relevant-file ranking:
${rankedFiles || "No local relevant files were ranked."}

Likely verification commands from workspace context, for recommendation only:
${verificationCommands || "- None detected"}

Workspace context:
${JSON.stringify(context, null, 2)}

Return Markdown in exactly this structure:

# Plan: <short task title>

## Task Understanding

Explain what the user is asking for and what Borger should accomplish.

## Repo Observations

Summarize concrete facts from the workspace context.

## Relevant Files

Rank files by likely importance. Use this format:
1. path/to/file — reason

## Implementation Steps

Give a step-by-step plan. Keep steps actionable and ordered.

## Files Likely To Change

List exact paths likely to be created or modified, with expected change. If no edits are needed, say so.

## Commands Likely Needed

List commands that may be useful for verification only. Do not say you ran them.

## Verification Plan

List command or manual check — reason.

## Risks / Unknowns

List concrete risks, missing information, or areas to inspect before editing.

## Assumptions

List assumptions, or say "None beyond the provided workspace context."

## Complexity

Low / Medium / High / Very High — one-sentence reason.

## Whether Editing Is Required

Yes or No — one-sentence reason.

## Recommended Next Action

State the next action the user should approve or take.`;
}

export function buildEditProposalPrompt(task: string, context: WorkspaceContext): string {
  const rankedFiles = context.relevantFiles
    .map((file, index) => `${index + 1}. ${file.path} — ${file.reasons.join("; ")} (score ${file.score})`)
    .join("\n");
  const verificationCommands = context.likelyVerificationCommands.map((command) => `- ${command}`).join("\n");

  return `Phase 7 proposed-change generation.
Return proposed file changes only. Borger applies approved changes in a separate reviewed step.
Do not claim to edit files or say changes have been applied.
Do not run commands.
Do not commit, push, deploy, use SSH, or perform external actions.

User task:
${task}

Workspace context:
${JSON.stringify(context, null, 2)}

Relevant ranked files:
${rankedFiles || "No local relevant files were ranked."}

Commands that may be useful later, for recommendation only:
${verificationCommands || "- None detected"}

Return a single strict JSON object. You may wrap it in one \`\`\`json fenced block, but do not include prose outside the JSON.

Required shape:
{
  "summary": "Short summary of intended changes",
  "changes": [
    {
      "path": "relative/path/to/file.ts",
      "action": "create | modify | delete",
      "reason": "Why this file should change",
      "content": "Full updated file content for create/modify. Omit or use empty string for delete."
    }
  ],
  "commandsToRunLater": [
    {
      "command": "npm run build",
      "reason": "Verify TypeScript build"
    }
  ],
  "risks": [
    "Possible risk or unknown"
  ]
}

Rules:
- Use workspace-relative paths only.
- Use only actions: create, modify, delete.
- For modify and create, content must be the full proposed file content, not a partial patch.
- For delete, include a clear reason. Delete proposals remain disabled by default and will not be applied in Phase 7.
- Do not propose changes to .env, private keys, tokens, credential files, or secret-like files.
- .env.example is allowed if it is genuinely relevant.
- Do not invent unknown file contents. If you cannot safely produce full file content, return no change for that file and mention the limitation in risks.
- Prefer small, focused changes that match the existing project style.`;
}
