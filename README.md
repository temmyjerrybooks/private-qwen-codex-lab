# Borger

Borger is a private VS Code coding-agent extension for planning, inspecting, and eventually editing software projects from inside Visual Studio Code.

Phase 1 implements the repository foundation and a working VS Code extension shell. Later phases add model hosting, LiteLLM deployment, richer context gathering, diff preview, edit mode, terminal execution, fix mode, auto mode, git workflow, memory, and packaging.

## Architecture

```text
VS Code Extension
  -> Borger Agent Core
  -> Workspace Tools
  -> LiteLLM Gateway
  -> Modal H200:2 Endpoint
  -> SGLang
```

Phase 1 includes only the VS Code extension shell, read-only workspace inspection, a LiteLLM client skeleton, and plan-mode prompting.

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

Model hosting and LiteLLM deployment are planned for later phases. Phase 1 does not start Modal, SGLang, vLLM, Docker, or production infrastructure.

## Phase Status

- Phase 1: Repository scaffold and VS Code extension shell - implemented
- Phase 2: Modal H200:2 SGLang deployment - not started
- Phase 3: LiteLLM gateway - not started
- Phase 4+: Not started
