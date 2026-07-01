# Local Setup Quickstart

## Prerequisites

- Node.js and npm
- Visual Studio Code
- Docker Desktop if using local LiteLLM
- Modal CLI if deploying the H200 SGLang endpoint

## Install And Build

```powershell
cd apps/vscode-extension
npm.cmd install
npm.cmd run check-types
npm.cmd run compile
```

## Run In VS Code

1. Open the repository root in VS Code.
2. Press `F5`.
3. In the Extension Development Host, open the Borger activity bar item.
4. Run `Borger: Inspect Workspace`.
5. Run `Borger: Show Permissions`.
6. Run `Borger: Plan Task`.

## Configure LiteLLM

Start LiteLLM locally after Modal is deployed:

```powershell
$env:LITELLM_MASTER_KEY="sk-private-local-key"
$env:BORGER_MODAL_API_BASE="https://YOUR_MODAL_ENDPOINT.modal.run/v1"
$env:BORGER_MODAL_API_KEY="dummy-key"
docker compose -f infra/docker/docker-compose.litellm.yml up
```

Point Borger at LiteLLM:

```json
{
  "borger.litellmBaseUrl": "http://localhost:4000/v1",
  "borger.model": "qwen3-coder-next-abliterated-h200"
}
```

## Conservative Defaults

Auto Mode is disabled by default. Git push and SSH are disabled unless the active permission profile or local config allows them.
