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
