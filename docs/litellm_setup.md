# LiteLLM Setup

LiteLLM is the local gateway/router between Borger and the Modal-hosted SGLang model endpoint.

```text
Borger VS Code Extension
  -> Provider Router
  -> LiteLLM Gateway
  -> Modal H200:2 SGLang Endpoint
  -> huihui-ai/Huihui-Qwen3-Coder-Next-abliterated
```

Borger keeps its provider budget router active before every model call. LiteLLM then maps Borger's model alias to the upstream Modal endpoint.

## 1. Deploy Modal First

Phase 3 assumes the Phase 2 Modal app is already deployed:

```powershell
modal deploy infra/modal/modal_qwen_h200_sglang.py
```

Copy the endpoint URL printed by Modal. LiteLLM needs the OpenAI-compatible `/v1` URL:

```text
https://YOUR_MODAL_ENDPOINT.modal.run/v1
```

## 2. Configure Environment Variables

From the repository root:

```powershell
$env:LITELLM_MASTER_KEY="sk-private-local-key"
$env:BORGER_MODAL_API_BASE="https://YOUR_MODAL_ENDPOINT.modal.run/v1"
$env:BORGER_MODAL_API_KEY="dummy-key"
```

Use a private value for `LITELLM_MASTER_KEY` on your own machine. If your Modal endpoint requires an API key, set `BORGER_MODAL_API_KEY` to that value. Otherwise keep the placeholder out of git.

## 3. Start LiteLLM

```powershell
docker compose -f infra/docker/docker-compose.litellm.yml up
```

LiteLLM listens locally on:

```text
http://localhost:4000/v1
```

The config file is mounted from:

```text
infra/litellm/litellm_config.example.yaml
```

## 4. Run the LiteLLM Smoke Test

In a second terminal:

```powershell
$env:BORGER_LITELLM_BASE_URL="http://localhost:4000/v1"
$env:BORGER_LITELLM_API_KEY="sk-private-local-key"
$env:BORGER_MODEL="qwen3-coder-next-abliterated-h200"
python scripts/smoke_test_litellm.py
```

The script tries `/v1/models` when available, then sends a small `/v1/chat/completions` coding prompt.

## 5. Point Borger at LiteLLM

In VS Code settings:

```json
{
  "borger.litellmBaseUrl": "http://localhost:4000/v1",
  "borger.model": "qwen3-coder-next-abliterated-h200",
  "borger.providerRoutingEnabled": true
}
```

Run:

```text
Borger: Manage Providers
```

Use this provider shape in `.borger/providers.local.json`:

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

Store the LiteLLM master key through VS Code SecretStorage when Borger prompts for the provider API key. Do not put it in `.borger/providers.local.json`.

## Modal Direct vs LiteLLM

Calling Modal directly sends Borger requests straight to the SGLang endpoint. Calling through LiteLLM adds a stable local model alias, a single OpenAI-compatible gateway, and a place to add future routing policy without changing Borger's model client.

## Common Errors

- Wrong Modal endpoint: make sure `BORGER_MODAL_API_BASE` includes the deployed Modal URL and ends with `/v1`.
- Wrong LiteLLM master key: `BORGER_LITELLM_API_KEY` must match `LITELLM_MASTER_KEY`.
- Model alias mismatch: Borger must use `qwen3-coder-next-abliterated-h200`.
- Modal endpoint sleeping: first request may wait while Modal starts H200 GPUs.
- SGLang still loading: first model load can be slow while weights are downloaded or read from cache.
