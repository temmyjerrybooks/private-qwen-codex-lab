# Docker

Phase 3 includes a local-development Docker Compose file for LiteLLM:

```text
infra/docker/docker-compose.litellm.yml
```

## Start LiteLLM

From the repository root:

```powershell
$env:LITELLM_MASTER_KEY="sk-private-local-key"
$env:BORGER_MODAL_API_BASE="https://YOUR_MODAL_ENDPOINT.modal.run/v1"
$env:BORGER_MODAL_API_KEY="dummy-key"
docker compose -f infra/docker/docker-compose.litellm.yml up
```

The proxy listens on:

```text
http://localhost:4000/v1
```

`LITELLM_MASTER_KEY` is the private local key Borger uses when calling LiteLLM. In VS Code or smoke tests, use the same value as `BORGER_LITELLM_API_KEY`.

## Stop LiteLLM

```powershell
docker compose -f infra/docker/docker-compose.litellm.yml down
```

This stops the local gateway only. It does not deploy, stop, or delete the Modal app.
