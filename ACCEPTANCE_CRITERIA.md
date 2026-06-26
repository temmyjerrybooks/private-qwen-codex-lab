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

## Phase 4

- `Borger: Inspect Workspace` returns a richer workspace summary
- Workspace scanning respects `.gitignore` where practical
- Workspace scanning always ignores common heavy folders
- Workspace scanning avoids secret-like files and allows `.env.example`
- Project type and framework detection exists
- Important project files are summarized
- Package scripts and likely verification commands are included
- Current active file can be included when safe
- Selected text can be included when present
- VS Code diagnostics summary is included
- Git branch and `git status --short` are read only when permitted
- Permission checks remain active
- Provider router remains active
- LiteLLM support remains active
- Sidebar shows richer workspace context status
- `npm run compile` passes
- `npm run check-types` passes

## Phase 5

- `Borger: Plan Task` returns a structured professional plan
- Plan output includes task understanding and repo observations
- Plan output includes relevant files ranked by likely importance
- Plan output includes implementation steps
- Plan output includes files likely to change
- Plan output includes commands likely needed, without running them
- Plan output includes verification plan
- Plan output includes risks, unknowns, assumptions, complexity, and recommended next action
- Plan Mode remains read-only
- No file edits are made
- No terminal commands are run
- Permission checks remain active
- Provider routing remains active
- Budget checks remain active
- LiteLLM support remains active
- Workspace context from Phase 4 is used
- Sidebar renders plan sections, relevant files, verification commands, and complexity
- `npm run compile` passes
- `npm run check-types` passes

## Phase 6

- Borger can request proposed edits from the model
- Model response is parsed into structured pending changes
- Invalid or malformed edit responses fail gracefully
- Pending changes are shown in the webview
- Diffs are readable
- User can approve or reject pending file changes
- User can approve or reject all valid pending changes
- User can clear pending changes
- Secret-like files are blocked
- Paths outside the workspace are blocked
- Delete is preview-only
- Commands suggested by the model are shown but not run
- Permission checks are used for approval intent
- Provider routing remains active
- Budget checks remain active
- LiteLLM support remains active
- Workspace context is used
- Plan Mode still works
- No actual file writes are performed
- `npm run compile` passes
- `npm run check-types` passes

## Phase 7

- Borger can apply approved `create` pending changes
- Borger can apply approved `modify` pending changes
- Delete proposals remain disabled and fail safely if applied
- Pending changes can become `applied` or `failed`
- Failed apply attempts show readable reasons
- File writes are constrained to the open workspace
- Absolute paths and path escapes are blocked
- Secret-like files are blocked, while `.env.example` remains allowed
- Binary-looking content is not written
- Existing files are backed up before modification
- `.borger/backups/` is ignored by git
- `Borger: Revert Last Apply` can restore the latest modify backup when possible
- Apply actions check and log `apply_patch`
- Create actions check and log `create_file`
- Modify actions check and log `write_file`
- Delete attempts check and log `delete_file` but do not delete files
- Sidebar controls include apply-approved and per-file apply actions
- Commands exist for apply approved, apply current pending change, show pending changes, clear pending changes, and revert last apply
- Provider routing remains active
- Budget checks remain active
- Permission checks remain active
- LiteLLM support remains active
- Workspace context and plan mode still work
- Terminal execution, GitHub push, SSH, deploy, and auto mode are not implemented
- `npm run compile` passes
- `npm run check-types` passes

Later phase acceptance criteria remain defined in `PROJECT_SCOPE.md`.
