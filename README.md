# Borger

Borger is a private VS Code coding-agent extension for planning, inspecting, and eventually editing software projects from inside Visual Studio Code.

Phase 1 implements the repository foundation and a working VS Code extension shell. Phase 2 adds the Modal H200:2 SGLang deployment for the primary model. Phase 2.5 adds a private multi-provider budget router for authorized group endpoints. Phase 3 wires LiteLLM as the local gateway in front of the Modal endpoint. Phase 4 adds workspace context intelligence for repo-aware planning. Phase 5 upgrades Plan Mode into a structured senior-engineer planning workflow. Phase 6 adds proposed edit parsing and diff preview. Phase 7 applies approved create/modify file changes with safety checks and backups. Phase 8 adds controlled local terminal command execution. Phase 9 adds Fix Mode for diagnostics and captured command failures. Phase 10 adds controlled local Auto Mode. Phase 11 adds controlled Git/GitHub workflow support. Later phases add remote ops, memory, and packaging.

## Architecture

```text
VS Code Extension
  -> Borger Agent Core
  -> Provider Router
  -> LiteLLM Gateway
  -> Modal H200:2 Endpoint
  -> SGLang
```

Phase 1 includes the VS Code extension shell, read-only workspace inspection, a LiteLLM client skeleton, and plan-mode prompting. Phase 2 adds the Modal-hosted SGLang endpoint. Phase 2.5 lets Borger route model calls across pre-authorized provider endpoints based on local budget state. Phase 3 provides the local LiteLLM config, Docker Compose runner, smoke test, and provider examples. Phase 4 builds structured workspace context before inspection and planning. Phase 5 adds relevant-file ranking, complexity estimation, structured plan prompts, and richer plan rendering. Phase 6 asks the model for strict JSON edit proposals, validates them, and shows pending diffs. Phase 7 applies approved create/modify changes only after authorization, safe path validation, binary/secret guards, and backup creation. Phase 8 runs authorized local terminal commands from the workspace root and captures output where practical. Phase 9 uses diagnostics and captured failed-command output to propose reviewed fixes. Phase 10 orchestrates plan, edit proposal, safe apply, verification, diagnostics, and Fix Mode inside a strict local loop. Phase 11 adds reviewed branch, staging, commit, push, and pull-request preparation workflows.

## Quick Start

```powershell
cd apps/vscode-extension
npm install
npm run compile
```

Then open the repository in VS Code and press `F5` to launch an Extension Development Host.
The root `.vscode/launch.json` points VS Code at `apps/vscode-extension`.

## Development Setup

Configure these VS Code settings:

```json
{
  "borger.litellmBaseUrl": "http://localhost:4000/v1",
  "borger.model": "qwen3-coder-next-abliterated-h200",
  "borger.mode": "plan",
  "borger.maxContextFiles": 80,
  "borger.maxFileSizeKb": 300,
  "borger.confirmBeforeApply": true,
  "borger.confirmBeforeTerminal": true,
  "borger.autoModeEnabled": false,
  "borger.autoMaxLoops": 3,
  "borger.autoRequireApprovalForEdits": true,
  "borger.autoRequireApprovalForCommands": true
}
```

API keys are stored in VS Code SecretStorage when supplied through Borger commands.

## Deployment Overview

Model hosting is implemented for Modal/SGLang in Phase 2. LiteLLM runs locally in Phase 3 and forwards Borger's model alias to the Modal OpenAI-compatible endpoint.

```powershell
$env:LITELLM_MASTER_KEY="sk-private-local-key"
$env:BORGER_MODAL_API_BASE="https://YOUR_MODAL_ENDPOINT.modal.run/v1"
$env:BORGER_MODAL_API_KEY="dummy-key"
docker compose -f infra/docker/docker-compose.litellm.yml up
```

Smoke test:

```powershell
$env:BORGER_LITELLM_BASE_URL="http://localhost:4000/v1"
$env:BORGER_LITELLM_API_KEY="sk-private-local-key"
$env:BORGER_MODEL="qwen3-coder-next-abliterated-h200"
python scripts/smoke_test_litellm.py
```

## Provider Routing

Private provider routing uses an ignored local file:

```text
.borger/providers.local.json
```

Each provider can have its own endpoint, model, budget, warning threshold, stop threshold, reset day, and lazy activation setting. For local LiteLLM, use `baseUrl` `http://localhost:4000/v1` and model `qwen3-coder-next-abliterated-h200`. API keys must be stored through VS Code SecretStorage using provider-specific secret keys such as `borger.provider.local-litellm.apiKey`.

Monthly reset is lazy by default: Borger resets local provider state when the reset date arrives, but it does not warm, smoke test, or call any endpoint until the user runs a real task or manually tests the connection.

## Workspace Context

Phase 4 makes `Borger: Inspect Workspace` and `Borger: Plan Task` repo-aware. Borger now collects:

- workspace root, project name, framework and project type detection
- ignored-file-aware file tree sample
- important file summaries, including `package.json`, `README.md`, `PROJECT_SCOPE.md`, config files, lockfiles, Docker files, and `.env.example`
- package scripts and likely verification commands
- active editor file and selected text when safe
- VS Code diagnostics summary
- read-only git branch and `git status --short` summary when allowed
- permission profile and active provider summary

Borger always ignores common heavy folders such as `node_modules`, `.git`, `dist`, `build`, `.next`, `out`, `coverage`, `.turbo`, `.cache`, `.venv`, and `__pycache__`. It avoids reading secret-like files, private keys, tokens, and credential files; `.env.example` is allowed because it is meant to document configuration.

## Plan Mode

Phase 5 makes `Borger: Plan Task` return a structured implementation plan before any editing features exist. Plans include:

- task understanding and repo observations
- relevant files ranked by likely importance
- implementation steps
- exact files likely to change
- commands likely needed for later verification, without running them
- verification plan
- risks, unknowns, assumptions, complexity, and recommended next action

Plan Mode remains read-only. It checks `read_workspace`, builds safe workspace context, selects an eligible provider through the budget router, and sends the plan prompt through LiteLLM. It does not edit files, run commands, push to GitHub, use SSH, or deploy.

## Diff Preview and Safe Apply

Use `Borger: Generate Proposed Changes` or the sidebar button to ask the model for structured JSON edits. Borger parses the response, validates paths, blocks secret-like files, reads original files safely, and displays unified diffs in the sidebar.

Pending changes support:

- `create`, `modify`, and disabled `delete`
- statuses: `pending`, `approved`, `rejected`, `applied`, `failed`, and `invalid`
- per-file approve/reject
- approve all, reject all, apply approved changes, apply one approved file, show applied changes, regenerate, and clear
- commands suggested for later verification, without running them

Phase 7 adds real file application for approved `create` and `modify` changes. Applying a change checks `apply_patch`, then checks `create_file` or `write_file`, logs those authorization decisions, rejects unsafe paths, blocks binary-looking writes, and refuses secret-like files such as `.env`, keys, token files, and credential files. `.env.example` remains allowed.

Before a modify overwrite, Borger writes a local backup snapshot under:

```text
.borger/backups/
```

That directory is ignored by git. `Borger: Revert Last Apply` can restore the latest modify backup. Automatic deletion of created files remains disabled in Phase 7, so reverting a create backup is intentionally refused.

## Controlled Terminal Execution

Phase 8 adds manually triggered terminal execution through:

- `Borger: Run Terminal Command`
- `Borger: Run Suggested Command`
- `Borger: Show Command History`
- `Borger: Clear Command History`
- the Terminal section in the Borger sidebar

Commands run from the workspace root by default. Captured mode is the default and records stdout, stderr, exit code, start/end time, duration, status, authorization decision, and suggested next step. Interactive mode can open a VS Code terminal and send a command, but output capture is limited.

Before running any command, Borger checks `run_terminal`, classifies the command through the local command policy, asks for confirmation when required, and logs authorization plus command lifecycle events to `.borger/action-log.jsonl`.

Allowed examples when terminal permission is enabled include `npm run build`, `npm test`, `npm run lint`, `npm run typecheck`, `python -m py_compile`, `git status`, `git diff`, and `modal app list`.

Riskier commands such as `npm install`, `pip install`, `docker compose up`, `docker compose down`, `modal deploy`, `modal app stop`, `git commit`, commands containing `--force`, and migration commands require confirmation or stronger permissions. Destructive commands such as `rm -rf`, `git reset --hard`, `git push --force`, `shutdown`, `del /s`, recursive forced `Remove-Item`, and commands attempting to delete `.git` or escape the workspace are blocked by default.

Suggested commands from proposed changes are displayed as manual run buttons. Applying file changes never automatically runs commands in Phase 8.

## Fix Mode

Phase 9 adds manually triggered repair workflows:

- `Borger: Fix Diagnostics`
- `Borger: Fix Last Failed Command`
- `Borger: Fix Current File`
- `Borger: Explain Last Error`
- the Fix Mode section in the Borger sidebar

Fix Mode collects VS Code diagnostics, active-file context, selected text, workspace context, and the latest captured failed Borger command when relevant. It asks the active provider for strict JSON repair proposals, parses them through the existing edit proposal parser, and creates pending diffs for review.

Fix Mode does not apply edits automatically. All file writes still go through Phase 7 approval and safe apply. Suggested verification commands are shown for manual execution through Phase 8 terminal controls. `Explain Last Error` is explanation-only and never creates pending changes.

The dedicated GitHub push workflow, SSH, and deployment automation come later.

## Controlled Auto Mode

Phase 10 adds controlled local Auto Mode through:

- `Borger: Run Auto Mode`
- `Borger: Stop Auto Mode`
- `Borger: Show Auto Mode Status`
- the Auto Mode section in the Borger sidebar

Auto Mode is disabled by default. Enable it deliberately with:

```json
{
  "borger.autoModeEnabled": true,
  "borger.autoMaxLoops": 3
}
```

or with environment variables such as:

```powershell
$env:BORGER_AUTO_MODE_ENABLED="true"
$env:BORGER_AUTO_MAX_LOOPS="3"
```

Auto Mode asks for confirmation before starting. It plans the task, generates pending diffs, waits for approval when required, applies only approved changes through the Phase 7 safe-apply path, runs only allowed verification commands through the Phase 8 terminal authorization path, collects diagnostics and command output, and calls Fix Mode when errors remain. It stops on cancellation, blocked actions, malformed proposals, provider budget failures, verification blockers, success, or max loops.

Default allowed verification commands are:

- `npm.cmd run check-types`
- `npm.cmd run compile`
- `npm test`
- `npm run lint`
- `pnpm test`
- `python -m py_compile`

Auto Mode does not commit, push, create PRs, use SSH, run remote operations, or deploy. Git and GitHub actions are still manual Phase 11 workflows.

## Git and GitHub Workflow

Phase 11 adds controlled Git/GitHub actions through:

- `Borger: Git Status`
- `Borger: Create Git Branch`
- `Borger: Stage Git Changes`
- `Borger: Generate Commit Message`
- `Borger: Create Git Commit`
- `Borger: Push Git Branch`
- `Borger: Prepare Pull Request`
- the Git Workflow section in the Borger sidebar

The Git Workflow section shows the current branch, remote/upstream, staged/unstaged/untracked counts, protected files, generated commit message, latest command output, and pull-request preparation text.

Borger protects local/runtime files from staging and commit:

- `.borger/providers.local.json`
- `.borger/secrets.local.json`
- `.borger/permissions.local.json`
- `.borger/action-log.jsonl`
- `.borger/usage-ledger.jsonl`
- `.borger/provider-state.json`
- `.borger/backups/`
- `.env`, `.env.local`, private keys, token files, and credential files

`.env.example` remains allowed because it is documentation. Branch, staging, commit, push, and PR actions use the existing permission checker and command policy before running Git or `gh`. Destructive operations such as force push, hard reset, branch deletion, rebase, and git clean remain blocked by default.

Commit message generation uses the active ProviderRouter and budget checks with the current staged diff when available, or the unstaged diff as a fallback. If no provider is available, write the commit message manually in the command prompt or sidebar flow.

`Prepare Pull Request` creates a PR title/body from the generated commit message and changed files. If the GitHub CLI (`gh`) is available, Borger can run `gh pr create` after `git_push` and terminal authorization. If `gh` is missing, Borger prints manual PR instructions instead.

Phase 11 does not add SSH, remote server operations, deploy automation, force push, history rewriting, or automatic commits from Auto Mode.

## Permission System

Phase 2.7 adds a local capability system for future edit, terminal, git, GitHub, SSH, deploy, and auto-agent workflows.

Default profile:

```text
edit_with_review
```

Local permission config is stored at:

```text
.borger/permissions.local.json
```

Authorization decisions are logged to:

```text
.borger/action-log.jsonl
```

Both files are ignored by git. Use `Borger: Show Permissions` to inspect the active profile and `Borger: Update Permission Profile` to change the local workspace profile.

## Phase Status

- Phase 1: Repository scaffold and VS Code extension shell - implemented
- Phase 2: Modal H200:2 SGLang deployment - implemented
- Phase 2.5: Multi-provider budget router - implemented
- Phase 2.7: Capability and authorization system - implemented
- Phase 3: LiteLLM gateway - implemented
- Phase 4: Workspace context intelligence - implemented
- Phase 5: Plan mode upgrade - implemented
- Phase 6: Diff and patch preview - implemented
- Phase 7: Real edit mode and safe file application - implemented
- Phase 8: Controlled terminal execution - implemented
- Phase 9: Fix mode - implemented
- Phase 10: Controlled Auto Mode - implemented
- Phase 11: Git/GitHub workflow - implemented
- Phase 12+: Not started
