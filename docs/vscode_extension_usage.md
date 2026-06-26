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

Phase 6 supports review state only:

- `Approve File Change` marks one pending change as approved after authorization.
- `Reject File Change` marks one pending change as rejected.
- `Approve All` authorizes and marks all valid pending changes as approved.
- `Reject All` marks all valid pending changes as rejected.
- `Regenerate` asks the model for a fresh proposal for the current task.
- `Clear` removes the in-memory pending changes.

No file is written in Phase 6. Terminal execution, GitHub push, SSH, Auto Mode, and real edit application come later.

## Commands

- `Borger: Open Agent`
- `Borger: Inspect Workspace`
- `Borger: Test Model Connection`
- `Borger: Plan Task`
- `Borger: Generate Proposed Changes`
- `Borger: Show Pending Changes`
- `Borger: Clear Pending Changes`
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
