# VS Code Extension Usage

## Run in Development Mode

```powershell
cd apps/vscode-extension
npm install
npm run compile
```

Open the repository in VS Code and press `F5` to launch an Extension Development Host.
The included root launch configuration uses `apps/vscode-extension` as the extension development path.

## Configure Borger

Set these values in VS Code settings:

```json
{
  "borger.litellmBaseUrl": "http://localhost:4000/v1",
  "borger.model": "qwen3-coder-next-abliterated-h200",
  "borger.mode": "plan"
}
```

API keys are stored through VS Code SecretStorage when prompted by `Borger: Test Model Connection`.

For Phase 3, `borger.litellmBaseUrl` should point at the local LiteLLM gateway, not directly at Modal. LiteLLM then forwards the alias to the Modal SGLang endpoint.

## Sidebar

Open the Borger activity bar item. The sidebar shows context, permission, provider, task input, and plan output sections. Tasks, Changes, Memory, and Settings sections exist as placeholders for later phases.

## Workspace Context

Run:

```text
Borger: Inspect Workspace
```

Borger collects a read-only context snapshot with:

- workspace root and project name
- detected project types and frameworks
- safe file tree sample
- important file summaries
- package scripts and likely verification commands
- current active file and selected text when available
- VS Code diagnostics summary
- read-only git branch and `git status --short` summary when permitted
- permission profile and active provider summary

Workspace scans respect `.gitignore` where practical and always ignore `node_modules`, `.git`, `dist`, `build`, `.next`, `out`, `coverage`, `.turbo`, `.cache`, `.venv`, and `__pycache__`. Borger skips secret-like files, private keys, token files, and credential files. `.env.example` is read because it is intended as safe documentation.

`Borger: Plan Task` checks `read_workspace`, builds the same workspace context, ranks relevant files, selects an eligible provider through the budget router, and sends the context through LiteLLM. It does not edit files or run terminal commands.

## Plan Mode

Run:

```text
Borger: Plan Task
```

Plan Mode returns a structured plan with:

- task understanding
- repo observations
- relevant files ranked by likely importance
- implementation steps
- files likely to change
- commands likely needed later, without running them
- verification plan
- risks and unknowns
- assumptions
- complexity estimate
- recommended next action

The sidebar renders the plan as sections with a complexity badge and relevant-file list. The output channel also receives the full model plan plus local metadata.

## Proposed Changes and Diff Preview

Run:

```text
Borger: Generate Proposed Changes
```

Or use the sidebar button:

```text
Generate Proposed Changes
```

Borger asks the model for a strict JSON edit proposal, parses it, validates each file path, reads original content safely, and shows pending diffs in the sidebar.

Phase 7 supports reviewed file application:

- `Approve File Change` marks one pending change as approved after authorization.
- `Reject File Change` marks one pending change as rejected.
- `Approve All` authorizes and marks all valid pending changes as approved.
- `Reject All` marks all valid pending changes as rejected.
- `Apply This File` applies one approved create/modify change.
- `Apply Approved Changes` applies all approved create/modify changes.
- `Show Applied Changes` refreshes the pending set with applied/failed statuses.
- `Revert Last Apply` restores the latest modify backup when possible.
- `Regenerate` asks the model for a fresh proposal for the current task.
- `Clear` removes the in-memory pending changes.

Applying a change checks `apply_patch` and then `create_file` or `write_file`. Borger writes only inside the open workspace, rejects path escapes, blocks secret-like files, blocks binary-looking content, and keeps delete proposals disabled. `.env.example` is allowed; `.env`, private keys, token files, and credential files are blocked.

Before modifying an existing file, Borger stores a backup snapshot in:

```text
.borger/backups/
```

The backup folder is ignored by git. Created-file reverts are intentionally disabled because Phase 7 does not perform automatic file deletion.

## Terminal Execution

Phase 8 adds controlled local terminal execution. Use the Terminal section in the Borger sidebar or run:

```text
Borger: Run Terminal Command
```

Borger runs commands from the workspace root. Captured mode is the default and captures stdout, stderr, exit code, start/end time, duration, command status, and authorization details. Interactive mode opens a VS Code terminal and sends the command, but output capture may be limited.

Suggested commands from pending proposed changes appear under `Commands Suggested For Later`. Click `Run` on a suggested command or use:

```text
Borger: Run Suggested Command
```

Running a suggested command is always manual. Applying approved edits never runs commands automatically.

Use these commands for history:

```text
Borger: Show Command History
Borger: Clear Command History
```

Command history is kept in memory for the current VS Code session. Command authorization decisions and lifecycle events are logged to `.borger/action-log.jsonl`.

Examples that can run when terminal permission is enabled:

- `npm run build`
- `npm test`
- `npm run lint`
- `npm run typecheck`
- `python -m py_compile path/to/file.py`
- `git status`
- `git diff`
- `modal app list`

Examples that require confirmation or stronger permissions:

- `npm install`
- `pnpm install`
- `yarn install`
- `pip install`
- `docker compose up`
- `docker compose down`
- `modal deploy`
- `modal app stop`
- `git commit`
- `git push`
- migration commands
- commands containing `--force`

Examples blocked by default:

- `rm -rf`
- `git reset --hard`
- `git push --force`
- `shutdown`
- `del /s`
- recursive forced `Remove-Item`
- commands attempting to delete `.git`
- commands attempting to escape the workspace root

## Fix Mode

Phase 9 adds repair workflows that use existing context instead of guessing from a blank prompt.

Run:

```text
Borger: Fix Diagnostics
Borger: Fix Last Failed Command
Borger: Fix Current File
Borger: Explain Last Error
```

The sidebar also includes a Fix Mode section with the same actions and a status summary for diagnostics plus the latest failed Borger command.

Fix Diagnostics reads VS Code diagnostics, prioritizes errors before warnings, asks the active provider for a strict JSON repair proposal, and creates pending diffs for review.

Fix Last Failed Command uses the latest failed captured terminal result, including stdout, stderr, exit code, duration, and reason. If multiple failed commands exist, the command palette flow lets you choose one.

Fix Current File focuses on the active editor file, selected text when present, and diagnostics for that file.

Explain Last Error sends the same context to the model but returns explanation-only Markdown. It does not create pending changes.

Fix Mode remains review-first:

- it checks `read_workspace` before collecting context
- it uses ProviderRouter and budget checks before model calls
- it does not write files directly
- it does not run terminal commands automatically
- all generated file changes appear as pending diffs
- applying fixes still requires Phase 7 approval and safe apply
- suggested verification commands must be run manually through Phase 8 terminal execution

The dedicated GitHub push workflow, SSH, deployment automation, and Auto Mode come later.

## Commands

- `Borger: Open Agent`
- `Borger: Inspect Workspace`
- `Borger: Test Model Connection`
- `Borger: Plan Task`
- `Borger: Generate Proposed Changes`
- `Borger: Fix Diagnostics`
- `Borger: Fix Last Failed Command`
- `Borger: Fix Current File`
- `Borger: Explain Last Error`
- `Borger: Show Pending Changes`
- `Borger: Clear Pending Changes`
- `Borger: Apply Approved Changes`
- `Borger: Apply Current Pending Change`
- `Borger: Revert Last Apply`
- `Borger: Run Terminal Command`
- `Borger: Run Suggested Command`
- `Borger: Show Command History`
- `Borger: Clear Command History`
- `Borger: Manage Providers`
- `Borger: Check Provider Budgets`
- `Borger: Switch Provider`
- `Borger: Show Provider Status`
- `Borger: Reset Provider State`
- `Borger: Show Permissions`
- `Borger: Update Permission Profile`

## Provider Routing

Phase 2.5 routes model calls through a local provider pool before calling any OpenAI-compatible endpoint. In Phase 3, that endpoint is usually LiteLLM:

```text
http://localhost:4000/v1
```

Run:

```text
Borger: Manage Providers
```

This opens `.borger/providers.local.json`, which is ignored by git.

Example LiteLLM provider:

```json
{
  "providers": [
    {
      "id": "local-litellm",
      "label": "Local LiteLLM Gateway",
      "owner": "Local",
      "baseUrl": "http://localhost:4000/v1",
      "model": "qwen3-coder-next-abliterated-h200",
      "monthlyBudgetUsd": 30,
      "warnPercent": 90,
      "stopPercent": 95,
      "enabled": true,
      "autoSwitchFrom": true,
      "allowSoftStop": true,
      "allowHardStop": false,
      "resetDay": 1,
      "monthlyResetEnabled": true,
      "lazyActivation": true,
      "autoWarmOnReset": false,
      "apiKeySecret": "borger.provider.local-litellm.apiKey"
    }
  ]
}
```

Provider API keys should be stored in VS Code SecretStorage. Use provider-specific secret keys such as:

```text
borger.provider.temmy.apiKey
```

Before `Borger: Test Model Connection` or `Borger: Plan Task`, Borger:

1. loads enabled providers
2. applies monthly reset logic without calling endpoints
3. calculates estimated budget usage
4. pauses providers at or above the stop threshold
5. picks the best eligible provider automatically

`Plan Task` also checks the current permission profile before reading workspace context.

If every provider is paused, failed, disabled, or over budget, the model call is blocked with a clear error.

Monthly reset uses lazy activation by default. A renewed provider does not consume Modal credit until a real task or manual connection test calls it.

## Permissions

Borger uses a local permission profile before actions that read the workspace or, in future phases, edit files, run commands, use git, deploy, or connect through SSH.

Profiles:

- `read_only`
- `plan_only`
- `edit_with_review`
- `trusted_workspace`
- `full_auto`
- `remote_ops`

Default profile:

```text
edit_with_review
```

Run `Borger: Show Permissions` to view the active profile, capabilities, command policy, local config location, and recent authorization decisions.

Run `Borger: Update Permission Profile` to create or update:

```text
.borger/permissions.local.json
```

Authorization decisions are logged to:

```text
.borger/action-log.jsonl
```

Both files are ignored by git. By default, destructive command patterns such as `rm -rf`, `git reset --hard`, `git push --force`, `shutdown`, `del /s`, and `remove-item -recurse -force` are blocked.
