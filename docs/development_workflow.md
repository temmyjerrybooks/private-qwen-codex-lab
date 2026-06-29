# Development Workflow

1. Work one phase at a time.
2. Keep the extension compiling.
3. Avoid secrets in committed files.
4. Prefer read-only behavior until edit and patch phases are approved.
5. Update documentation after each phase.

## Provider Routing Workflow

1. Run `Borger: Manage Providers` to create or open `.borger/providers.local.json`.
2. Add only explicitly authorized provider endpoints.
3. Store provider API keys in VS Code SecretStorage, not in JSON files.
4. Use `Borger: Show Provider Status` before model-heavy work.
5. Use `Borger: Check Provider Budgets` to refresh local budget state.
6. Let budget-paused providers reset lazily next month; do not warm all providers automatically.

## Permission Workflow

1. Run `Borger: Show Permissions` before enabling stronger agent workflows.
2. Run `Borger: Update Permission Profile` to choose the local workspace profile.
3. Keep `.borger/permissions.local.json` local and uncommitted.
4. Review `.borger/action-log.jsonl` when debugging authorization decisions.
5. Keep destructive commands blocked unless a future task explicitly requires and confirms them.

## Context Workflow

1. Open the target project folder in VS Code.
2. Run `Borger: Inspect Workspace` before planning large work.
3. Review the Borger output channel for detected frameworks, important files, diagnostics, git status, active provider, and ignored-file behavior.
4. Select relevant code in the editor before planning if the task depends on a specific function or component.
5. Run `Borger: Plan Task`; Borger includes the same context snapshot in the model prompt.
6. Review ranked relevant files, complexity, risks, assumptions, and recommended next action.
7. Treat likely verification commands as recommendations until you choose to run one through Phase 8 terminal execution.

## Plan Mode Workflow

1. Inspect the workspace or select relevant code first when the task is file-specific.
2. Run `Borger: Plan Task`.
3. Confirm the plan references real files from the workspace context.
4. Check the complexity badge and risks before approving later edit work.
5. Use the verification plan as a checklist. Borger does not execute it in Phase 5.

## Diff Preview Workflow

1. Run `Borger: Plan Task` first for a structured approach.
2. Run `Borger: Generate Proposed Changes` when you want proposed edits.
3. Review every pending diff in the sidebar.
4. Approve or reject file changes. Approval marks review state and logs the file-intent authorization decision.
5. Use `Borger: Show Pending Changes` to print the current pending set to the output channel.
6. Use `Borger: Clear Pending Changes` before starting a different task.
7. Use `Apply This File` or `Borger: Apply Current Pending Change` for one approved change.
8. Use `Apply Approved Changes` or `Borger: Apply Approved Changes` for all approved changes.
9. Check applied and failed statuses before clearing the pending set.

## Safe Apply Workflow

1. Keep the permission profile at `edit_with_review` or stronger when you intend to apply edits.
2. Apply only after reviewing the unified diff.
3. Borger checks `apply_patch`, then `create_file` or `write_file`, and logs each authorization decision.
4. Borger creates `.borger/backups/` snapshots before modifying existing files.
5. Use `Borger: Revert Last Apply` only for the latest modify backup. Created-file deletion remains disabled.
6. Run verification commands manually through Borger or your own terminal. Phase 8 still does not run git push workflows, deploy automation, SSH, or auto mode.

## Terminal Execution Workflow

1. Keep `canRunTerminal` enabled only for workspaces where Borger should run local commands.
2. Use `Borger: Run Terminal Command` or the sidebar Terminal input for a manual command.
3. Use `Borger: Run Suggested Command` or a suggested-command `Run` button after reviewing pending changes.
4. Review the confirmation prompt when the command is risky or the active profile requires confirmation.
5. Check stdout, stderr, exit code, duration, and status in the sidebar or output channel.
6. Use `Borger: Show Command History` to review commands from the current VS Code session.
7. Use command output as context for Fix Mode or your next request.

## Fix Mode Workflow

1. Run a language server, build, test, or typecheck command manually so diagnostics or command output exist.
2. Use `Borger: Fix Diagnostics` when VS Code diagnostics are the clearest signal.
3. Use `Borger: Fix Last Failed Command` after a captured Borger terminal command fails.
4. Use `Borger: Fix Current File` when the active file or selected text is the repair target.
5. Use `Borger: Explain Last Error` when you want root-cause analysis without pending changes.
6. Review generated pending diffs in the sidebar.
7. Approve and apply fixes through the existing safe apply workflow only.
8. Run suggested verification commands manually through Phase 8 terminal execution.

## Auto Mode Workflow

1. Enable Auto Mode only when you want a controlled local loop: set `borger.autoModeEnabled` or `BORGER_AUTO_MODE_ENABLED=true`.
2. Keep `borger.autoMaxLoops` low. The default is `3`.
3. Keep `borger.autoRequireApprovalForEdits` and `borger.autoRequireApprovalForCommands` enabled for normal work.
4. Run `Borger: Run Auto Mode` with a focused task.
5. Review the generated plan, pending diffs, and timeline in the sidebar.
6. Approve or reject pending changes if Auto Mode enters `waiting_for_approval`.
7. Use `Borger: Stop Auto Mode` whenever the run should halt.
8. Review the final summary for files changed, commands run, remaining errors, blockers, and recommended next action.
9. Do not use Auto Mode for GitHub push, SSH, remote server work, or deployment automation in Phase 10.
