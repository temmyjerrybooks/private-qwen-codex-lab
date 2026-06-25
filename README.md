# Borger

Borger is a private VS Code coding-agent extension for planning, inspecting, and eventually editing software projects from inside Visual Studio Code.

Phase 1 implements the repository foundation and a working VS Code extension shell. Phase 2 adds the Modal H200:2 SGLang deployment for the primary model. Phase 2.5 adds a private multi-provider budget router for authorized group endpoints. Later phases add LiteLLM deployment, richer context gathering, diff preview, edit mode, terminal execution, fix mode, auto mode, git workflow, memory, and packaging.

## Architecture

```text
VS Code Extension
  -> Borger Agent Core
  -> Workspace Tools
  -> LiteLLM Gateway
  -> Modal H200:2 Endpoint
  -> SGLang
```

Phase 1 includes the VS Code extension shell, read-only workspace inspection, a LiteLLM client skeleton, and plan-mode prompting. Phase 2 adds the Modal-hosted SGLang endpoint. Phase 2.5 lets Borger route model calls across pre-authorized provider endpoints based on local budget state.

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

Model hosting is implemented for Modal/SGLang in Phase 2. LiteLLM deployment is planned for Phase 3.

## Provider Routing

Private provider routing uses an ignored local file:

```text
.borger/providers.local.json
```

Each provider can have its own endpoint, model, budget, warning threshold, stop threshold, reset day, and lazy activation setting. API keys must be stored through VS Code SecretStorage using provider-specific secret keys such as `borger.provider.temmy.apiKey`.

Monthly reset is lazy by default: Borger resets local provider state when the reset date arrives, but it does not warm, smoke test, or call any endpoint until the user runs a real task or manually tests the connection.

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
- Phase 3: LiteLLM gateway - not started
- Phase 4+: Not started
