# LiteLLM Gateway

Phase 3 runs LiteLLM locally as the OpenAI-compatible gateway between Borger and the Modal H200:2 SGLang endpoint.

```text
Borger VS Code Extension
  -> Provider Router
  -> LiteLLM Gateway
  -> Modal H200:2 SGLang Endpoint
  -> huihui-ai/Huihui-Qwen3-Coder-Next-abliterated
```

## Model Alias

Borger calls this LiteLLM model alias:

```text
qwen3-coder-next-abliterated-h200
```

LiteLLM forwards that alias to the Modal endpoint configured through:

```text
BORGER_MODAL_API_BASE=https://YOUR_MODAL_ENDPOINT.modal.run/v1
```

Use the endpoint printed by `modal deploy infra/modal/modal_qwen_h200_sglang.py`, and keep the `/v1` suffix.

## Start Locally

From the repository root:

```powershell
$env:LITELLM_MASTER_KEY="sk-private-local-key"
$env:BORGER_MODAL_API_BASE="https://YOUR_MODAL_ENDPOINT.modal.run/v1"
$env:BORGER_MODAL_API_KEY="dummy-key"
docker compose -f infra/docker/docker-compose.litellm.yml up
```

If your Modal endpoint does not require an API key, keep `BORGER_MODAL_API_KEY` as a harmless placeholder. Do not commit real keys.

## Smoke Test

In a second terminal:

```powershell
$env:BORGER_LITELLM_BASE_URL="http://localhost:4000/v1"
$env:BORGER_LITELLM_API_KEY="sk-private-local-key"
$env:BORGER_MODEL="qwen3-coder-next-abliterated-h200"
python scripts/smoke_test_litellm.py
```

## Stop LiteLLM

Press `Ctrl+C` in the Compose terminal, then run:

```powershell
docker compose -f infra/docker/docker-compose.litellm.yml down
```

Stopping LiteLLM does not stop the Modal app. Modal should still scale down according to the Phase 2 deployment settings.
