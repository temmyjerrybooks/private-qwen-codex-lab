# Borger

Borger is a private VS Code coding-agent extension for planning, inspecting, and eventually editing software projects from inside Visual Studio Code.

Phase 1 implements the repository foundation and a working VS Code extension shell. Phase 2 adds the Modal H200:2 SGLang deployment for the primary model. Phase 2.5 adds a private multi-provider budget router for authorized group endpoints. Phase 3 wires LiteLLM as the local gateway in front of the Modal endpoint. Phase 4 adds workspace context intelligence for repo-aware planning. Phase 5 upgrades Plan Mode into a structured senior-engineer planning workflow. Later phases add diff preview, edit mode, terminal execution, fix mode, auto mode, git workflow, memory, and packaging.

## Architecture

```text
VS Code Extension
  -> Borger Agent Core
  -> Provider Router
  -> LiteLLM Gateway
  -> Modal H200:2 Endpoint
  -> SGLang
```

Phase 1 includes the VS Code extension shell, read-only workspace inspection, a LiteLLM client skeleton, and plan-mode prompting. Phase 2 adds the Modal-hosted SGLang endpoint. Phase 2.5 lets Borger route model calls across pre-authorized provider endpoints based on local budget state. Phase 3 provides the local LiteLLM config, Docker Compose runner, smoke test, and provider examples. Phase 4 builds structured workspace context before inspection and planning. Phase 5 adds relevant-file ranking, complexity estimation, structured plan prompts, and richer plan rendering.

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
  "borger.confirmBeforeTerminal": true
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
- Phase 6+: Not started
