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
6. Treat likely verification commands as recommendations only. Phase 4 does not run commands.
