# Deployment Guide

## Current Phase

Phase 2 deploys the primary SGLang model server on Modal. LiteLLM routing is intentionally deferred to Phase 3.

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

Phase 3 will put LiteLLM in front of this endpoint and expose the model alias:

```text
qwen3-coder-next-abliterated-h200
```

## Operations

- First startup may be slow because the model downloads into `borger-qwen-cache`.
- Later cold starts should reuse the cache.
- The deployment scales down when idle to avoid keeping H200 GPUs active.
- Keep `max_containers=1` unless you intentionally want multiple H200 pairs.

## Rollback

Use the Modal dashboard to stop or delete the deployed app, or deploy a previous git revision of `infra/modal/modal_qwen_h200_sglang.py`.
