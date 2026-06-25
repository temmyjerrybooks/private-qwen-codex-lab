# Deployment Guide

## Current Phase

Phase 3 wires LiteLLM in front of the Phase 2 Modal SGLang endpoint. Borger still selects an authorized provider through the budget router before every model call.

## Modal SGLang Deployment

Install dependencies:

```powershell
python -m pip install -r infra/modal/requirements.txt
modal setup
```

Create the Hugging Face secret:

```powershell
modal secret create huggingface-secret HF_TOKEN=your_huggingface_token
```

Deploy:

```powershell
modal deploy infra/modal/modal_qwen_h200_sglang.py
```

Copy the printed endpoint URL:

```powershell
$env:BORGER_MODAL_ENDPOINT="https://your-workspace--borger-qwen3-coder-next-h200-serve.modal.run"
```

Run smoke test:

```powershell
python scripts/smoke_test_modal_endpoint.py
```

## Expected Endpoint Shape

The Modal endpoint should expose SGLang's OpenAI-compatible API:

```text
GET  https://...modal.run/v1/models
POST https://...modal.run/v1/chat/completions
```

LiteLLM now sits in front of this endpoint and exposes the model alias:

```text
qwen3-coder-next-abliterated-h200
```

## LiteLLM Gateway Deployment

Set the local LiteLLM key and the Modal upstream URL:

```powershell
$env:LITELLM_MASTER_KEY="sk-private-local-key"
$env:BORGER_MODAL_API_BASE="https://YOUR_MODAL_ENDPOINT.modal.run/v1"
$env:BORGER_MODAL_API_KEY="dummy-key"
```

Start LiteLLM:

```powershell
docker compose -f infra/docker/docker-compose.litellm.yml up
```

Run the LiteLLM smoke test in a second terminal:

```powershell
$env:BORGER_LITELLM_BASE_URL="http://localhost:4000/v1"
$env:BORGER_LITELLM_API_KEY="sk-private-local-key"
$env:BORGER_MODEL="qwen3-coder-next-abliterated-h200"
python scripts/smoke_test_litellm.py
```

Point Borger provider config at:

```text
baseUrl: http://localhost:4000/v1
model: qwen3-coder-next-abliterated-h200
```

`Borger: Test Model Connection` and `Borger: Plan Task` use the active routed provider, so provider budget checks and permission checks remain active.

## Operations

- First startup may be slow because the model downloads into `borger-qwen-cache`.
- Later cold starts should reuse the cache.
- The deployment scales down when idle to avoid keeping H200 GPUs active.
- Keep `max_containers=1` unless you intentionally want multiple H200 pairs.
- Stop local LiteLLM with `docker compose -f infra/docker/docker-compose.litellm.yml down`.
- Stopping LiteLLM does not stop Modal; rely on Modal scaledown or stop the Modal app from the Modal dashboard when needed.

## Rollback

Use the Modal dashboard to stop or delete the deployed app, or deploy a previous git revision of `infra/modal/modal_qwen_h200_sglang.py`.
