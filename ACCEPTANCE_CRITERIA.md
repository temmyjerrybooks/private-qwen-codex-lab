# Acceptance Criteria

## Phase 1

- `npm install` works inside `apps/vscode-extension`
- `npm run compile` works
- Pressing `F5` launches Extension Development Host
- Borger appears in the VS Code sidebar/activity bar
- `Borger: Open Agent` opens the webview
- `Borger: Inspect Workspace` returns a basic workspace summary
- `Borger: Test Model Connection` attempts a call to LiteLLM
- `Borger: Plan Task` can send a plan prompt to the model
- Extension does not perform workspace edits in Phase 1

## Phase 2

- Modal app deploys successfully
- Model begins loading from Hugging Face
- Model cache persists
- Endpoint exposes OpenAI-compatible routes
- `/v1/models` test works if supported
- `/v1/chat/completions` smoke test works
- Docs explain setup and deployment

## Phase 2.5

- Provider config loader exists
- Provider state manager exists
- Local usage ledger exists
- Estimated budget percentage calculation works
- Exact Modal billing strategy is defensive when unavailable
- Monthly reset logic exists
- Lazy activation is enabled by default
- Budget-paused providers can become eligible after reset
- Borger does not automatically call or warm providers after reset
- Borger can show provider status
- Borger can choose the best available provider
- Borger can pause a provider at or above the stop threshold
- Borger can switch to another healthy provider without asking
- Model calls are blocked when no provider is available
- Provider credentials are not committed
- `npm run compile` passes
- `npm run check-types` passes

## Phase 2.7

- Borger can load permission profile
- Borger can show current permissions
- Borger can check whether an action is allowed
- Borger blocks unauthorized edits, terminal commands, git operations, and SSH actions
- Borger logs allowed actions
- Borger can be configured for trusted personal use
- Secrets and local permission configs are ignored by git
- Workspace inspection respects read permission
- Plan task respects read permission
- `Borger: Show Permissions` exists
- `Borger: Update Permission Profile` exists

## Phase 3

- LiteLLM starts locally
- LiteLLM exposes OpenAI-compatible endpoint
- Model alias `qwen3-coder-next-abliterated-h200` works
- Smoke test sends chat request through LiteLLM to Modal
- Borger extension can test connection through LiteLLM
- Docker Compose runs LiteLLM on port 4000
- LiteLLM config uses environment variables for keys and upstream URL
- Provider examples use `http://localhost:4000/v1`
- Provider budget routing remains active
- Permission checks remain active before workspace-aware planning
- `npm run compile` passes
- `npm run check-types` passes

Later phase acceptance criteria remain defined in `PROJECT_SCOPE.md`.
