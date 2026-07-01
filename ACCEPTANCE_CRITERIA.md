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
- Terminal execution, GitHub push, SSH, deploy, and auto mode were out of Phase 7 scope
- `npm run compile` passes
- `npm run check-types` passes

## Phase 8

- Borger can run authorized local terminal commands
- Commands run from the workspace root by default
- Captured mode records stdout, stderr, exit code, start/end time, and duration
- Interactive mode can send a command to a VS Code terminal with limited capture
- Command policy blocks dangerous commands
- Confirmation is required for risky commands or conservative profiles
- Command status is shown as running, succeeded, failed, blocked, or cancelled
- Command results are displayed in the Borger sidebar
- Command history exists for the current VS Code session
- Suggested commands from proposed changes can be run manually
- Applying approved edits does not automatically run commands
- `run_terminal` authorization checks are used before execution
- Command authorization and lifecycle events are logged
- Existing Plan Mode still works
- Existing proposed change generation still works
- Existing approved file application still works
- Provider routing remains active
- Budget checks remain active
- LiteLLM support remains active
- Fix Mode is not implemented
- Auto Mode was out of Phase 8 scope
- GitHub push workflow is not implemented
- SSH and remote ops are not implemented
- Deployment automation is not implemented
- `npm run compile` passes
- `npm run check-types` passes

## Phase 9

- `Borger: Fix Diagnostics` exists
- `Borger: Fix Last Failed Command` exists
- `Borger: Fix Current File` exists
- `Borger: Explain Last Error` exists
- The Borger sidebar has a Fix Mode section
- Fix Mode reads VS Code diagnostics and prioritizes errors before warnings
- Fix Mode can use the latest captured failed terminal command output
- Fix Mode can focus on the active editor file and selected text
- Fix Mode asks the model for strict JSON repair proposals
- Repair proposals are parsed through the existing edit proposal parser
- Repair proposals create pending diffs for review
- Fix Mode does not apply edits automatically
- Fix Mode does not run commands automatically
- Suggested verification commands remain manual
- `Explain Last Error` is explanation-only and does not create pending changes
- `read_workspace` authorization is checked before context collection
- Provider routing remains active
- Budget checks remain active
- Permission checks remain active
- LiteLLM support remains active
- Workspace context remains active
- Existing Plan Mode still works
- Existing proposed change generation still works
- Existing approved file application still works
- Existing controlled terminal execution still works
- Auto Mode was out of Phase 9 scope
- GitHub push workflow is not implemented
- SSH and remote ops are not implemented
- Deployment automation is not implemented
- `npm run compile` passes
- `npm run check-types` passes

## Phase 10

- `Borger: Run Auto Mode` exists
- `Borger: Stop Auto Mode` exists
- `Borger: Show Auto Mode Status` exists
- Auto Mode is disabled by default and must be enabled deliberately
- Auto Mode asks for confirmation before starting
- Auto Mode has controlled loop state
- Auto Mode respects the configured max loop limit
- Auto Mode can be cancelled
- Auto Mode logs lifecycle events
- Auto Mode uses workspace context through Plan Mode and proposal generation
- Auto Mode can generate proposed changes
- Auto Mode uses the existing pending diff preview
- Auto Mode uses the existing safe apply flow
- Auto Mode never applies rejected, invalid, or unapproved changes
- Auto Mode can run allowed verification commands only through terminal authorization
- Auto Mode can require confirmation before verification commands
- Auto Mode can use Fix Mode when diagnostics or command failures exist
- Auto Mode stops safely on blocked actions
- Auto Mode stops on secret-like file proposals when configured
- Auto Mode stops on destructive-looking verification commands when configured
- UI shows current state, loop, timeline, pending summary, command summary, diagnostics, fix summary, and final summary
- Final summary includes task, start/end time, loops, files changed, commands run, errors fixed, remaining errors, skipped/blocked actions, status, and next action
- Existing Plan Mode still works
- Existing proposed change generation still works
- Existing safe edit application still works
- Existing terminal command execution still works
- Existing Fix Mode still works
- Provider routing remains active
- Budget checks remain active
- Permission checks remain active
- LiteLLM support remains active
- GitHub push workflow is not implemented
- SSH and remote ops are not implemented
- Deployment automation is not implemented
- `npm run compile` passes
- `npm run check-types` passes

## Phase 11

- `Borger: Git Status` exists
- `Borger: Create Git Branch` exists
- `Borger: Stage Git Changes` exists
- `Borger: Generate Commit Message` exists
- `Borger: Create Git Commit` exists
- `Borger: Push Git Branch` exists
- `Borger: Prepare Pull Request` exists
- The sidebar includes a Git Workflow section
- Git status shows current branch, remote/upstream, staged/unstaged/untracked counts, protected files, and latest command output
- Read-only Git status checks `git_status`
- Branch creation, staging, and commit creation check `git_commit`
- Push and GitHub PR creation check `git_push`
- Every Git or GitHub CLI command checks `run_terminal` and command policy first
- Staging blocks `.borger/providers.local.json`, `.borger/secrets.local.json`, `.borger/permissions.local.json`, `.borger/action-log.jsonl`, `.borger/usage-ledger.jsonl`, `.borger/provider-state.json`, `.borger/backups/`, real `.env` files, private keys, tokens, and credentials
- `.env.example` remains allowed
- Commit message generation uses ProviderRouter and budget checks
- Commit message generation has a manual fallback when no provider is available
- Commit creation requires staged files and user confirmation when required by profile or policy
- Push uses the current branch and does not force push
- Push can set upstream for a branch without one
- Pull-request preparation uses GitHub CLI when available and prints manual PR text when `gh` is unavailable
- Git workflow lifecycle events are logged to `.borger/action-log.jsonl`
- Force push, hard reset, rebase, branch deletion, git clean, and deployment automation remain out of scope
- Existing Plan Mode still works
- Existing proposed change generation still works
- Existing safe edit application still works
- Existing terminal command execution still works
- Existing Fix Mode still works
- Existing Auto Mode still works
- Provider routing remains active
- Budget checks remain active
- Permission checks remain active
- LiteLLM support remains active
- `npm run compile` passes
- `npm run check-types` passes

## Phase 12

- `Borger: Show Remote Hosts` exists
- `Borger: Test SSH Connection` exists
- `Borger: Run Remote Command` exists
- `Borger: Inspect Remote Project` exists
- `Borger: Show Remote History` exists
- `.borger/remote-hosts.local.json` is supported
- `.borger/remote-hosts.local.json` is ignored by git
- Remote host config supports id, label, host, port, username, auth mode, default cwd, allowed cwd list, and enabled flag
- Private key contents are never stored, printed, or read into model context
- SSH commands require `canUseSSH`
- Host must be enabled in the local allowlist
- Remote cwd must be inside `allowedRemoteCwds`
- Remote commands check `ssh_command`
- Local SSH transport checks `run_terminal`
- Remote command policy blocks dangerous commands
- Remote command policy blocks secret, token, credential, and private-key reads
- Risky remote commands require confirmation
- Remote command output captures stdout, stderr, exit code, duration, and status
- Remote history exists for the current VS Code session
- Remote actions are logged to `.borger/action-log.jsonl`
- `Borger: Inspect Remote Project` uses safe read-only commands only
- Remote Ops sidebar section shows host config, cwd, command input, output, inspection, and history
- Deployment automation is not implemented
- Remote file editing is not implemented
- Host scanning, brute forcing, credential harvesting, and offensive security behavior are not implemented
- Existing Plan Mode still works
- Existing proposed changes still work
- Existing safe edit application still works
- Existing terminal command execution still works
- Existing Fix Mode still works
- Existing Auto Mode still works
- Existing Git workflow still works
- Provider routing remains active
- Budget checks remain active
- Permission checks remain active
- LiteLLM support remains active
- `npm run compile` passes
- `npm run check-types` passes

## Phase 12B

- `Borger: Show Project Memory` exists
- `Borger: Add Project Note` exists
- `Borger: Update Project Summary` exists
- `Borger: Clear Project Memory` exists
- `.borger/project-memory.local.json` is supported
- `.borger/project-notes.local.jsonl` is supported
- Both memory files are ignored by git
- Memory policy blocks obvious private keys, credentials, tokens, and passwords
- Memory policy redacts secret-like values and paths before prompt use
- `.env.example` remains allowed as documentation
- Project notes are append-only JSONL entries
- Adding a project note does not require a model call
- Updating project summary checks `read_workspace`
- Updating project summary uses ProviderRouter and budget checks
- Updating project summary sanitizes model output before saving
- Clearing project memory requires confirmation
- Clearing project memory only removes the two memory files
- Plan Mode can include safe memory summary
- Fix Mode can include safe memory summary
- Auto Mode can include safe memory summary through workspace context
- Inspect Workspace can show memory status
- UI shows Project Memory section
- Memory actions are logged to `.borger/action-log.jsonl`
- Secrets, private keys, tokens, credentials, provider secrets, remote-host secrets, and sensitive runtime logs are not intentionally stored
- Existing Plan Mode still works
- Existing proposed changes still work
- Existing safe edit application still works
- Existing terminal execution still works
- Existing Fix Mode still works
- Existing Auto Mode still works
- Existing Git workflow still works
- Existing Remote Ops still works
- Provider routing remains active
- Budget checks remain active
- Permission checks remain active
- LiteLLM support remains active
- `npm run compile` passes
- `npm run check-types` passes

## Phase 13

- Package metadata is polished with display name, description, version, publisher placeholder, repository, license, categories, keywords, and icon path
- Command palette entries use the Borger category
- VSIX packaging script exists
- Project-local `@vscode/vsce` packaging support exists
- `apps/vscode-extension/CHANGELOG.md` exists
- `apps/vscode-extension/LICENSE` exists
- `apps/vscode-extension/.vscodeignore` exists
- `docs/release_checklist.md` exists
- `docs/security_privacy.md` exists
- `docs/local_setup_quickstart.md` exists
- `docs/vsix_packaging.md` exists
- README is current and explains architecture, quickstart, LiteLLM/Modal, provider routing, permissions, Plan/Edit/Fix/Auto, Git workflow, Remote Ops, Project Memory, VSIX packaging, and safety
- `.gitignore` protects local Borger runtime files, real `.env` files, secrets, logs, ledgers, backups, and generated VSIX files
- Auto Mode remains disabled by default
- No secrets are added
- No new major agent capability is introduced
- No new SSH behavior, deployment automation, destructive Git behavior, or Marketplace publishing automation is added
- `npm.cmd run check-types` passes
- `npm.cmd run compile` passes
- `npm.cmd run package` produces a local `.vsix` file
