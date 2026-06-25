# Modal Setup

Phase 2 deploys the primary Borger model to Modal on `H200:2` using SGLang.

## 1. Create a Modal Account

Create or log into an account at Modal.

## 2. Install Modal Locally

From the repository root:

```powershell
python -m pip install -r infra/modal/requirements.txt
```

Or install Modal directly:

```powershell
python -m pip install modal
```

## 3. Authenticate Modal

```powershell
modal setup
```

If the `modal` command is not on PATH:

```powershell
python -m modal setup
```

## 4. Create the Hugging Face Secret

Create a Hugging Face token with permission to read the model, then store it in Modal:

```powershell
modal secret create huggingface-secret HF_TOKEN=your_huggingface_token
```

Check that it exists:

```powershell
modal secret list
```

## 5. Deploy the SGLang Server

```powershell
modal deploy infra/modal/modal_qwen_h200_sglang.py
```

The deployment uses:

- `modal.App("borger-qwen3-coder-next-h200")`
- `gpu="H200:2"`
- `modal.Volume.from_name("borger-qwen-cache", create_if_missing=True)`
- `modal.Secret.from_name("huggingface-secret")`
- `python -m sglang.launch_server`
- `--model-path huihui-ai/Huihui-Qwen3-Coder-Next-abliterated`
- `--host 0.0.0.0`
- `--port 30000`
- `--tp-size 2`

## 6. Find the Endpoint URL

After deployment, Modal prints a URL similar to:

```text
https://your-workspace--borger-qwen3-coder-next-h200-serve.modal.run
```

You can also find it in the Modal dashboard under the deployed app's web endpoint.

Set it locally:

```powershell
$env:BORGER_MODAL_ENDPOINT="https://your-workspace--borger-qwen3-coder-next-h200-serve.modal.run"
```

## 7. Smoke Test

```powershell
python scripts/smoke_test_modal_endpoint.py
```

The script tests:

- `GET /v1/models`, when available
- `POST /v1/chat/completions`

## 8. Add Endpoint to Borger Provider Pool

After deployment, run `Borger: Manage Providers` in VS Code. This creates `.borger/providers.local.json` if it does not exist.

Example provider:

```json
{
  "providers": [
    {
      "id": "temmy",
      "label": "Temmy Modal",
      "owner": "Temmy",
      "baseUrl": "https://your-workspace--borger-qwen3-coder-next-h200-serve.modal.run/v1",
      "model": "huihui-ai/Huihui-Qwen3-Coder-Next-abliterated",
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
      "apiKeySecret": "borger.provider.temmy.apiKey"
    }
  ]
}
```

Do not put API keys in this file. Store credentials through VS Code SecretStorage when prompted by `Borger: Manage Providers` or `Borger: Test Model Connection`.

## Expected First-Run Behavior

The first deploy or first request can be slow because Modal must allocate H200 capacity, pull the SGLang image, download the model, write it to the `borger-qwen-cache` volume, and warm up SGLang. This is normal.

## Troubleshooting

- `401` or gated model errors: confirm the Hugging Face token can read the model.
- Secret errors: recreate `huggingface-secret` with key `HF_TOKEN`.
- Very slow model download: leave the request running and watch Modal logs; the cache should make later starts faster.
- GPU memory errors: lower `--mem-fraction-static` in `infra/modal/modal_qwen_h200_sglang.py`.
- SGLang argument errors: confirm the installed SGLang image supports the flags in the deployment file.
- Endpoint failures: verify the URL is the root `*.modal.run` URL, not a dashboard URL.
- Provider budget pauses: run `Borger: Show Provider Status` and confirm the provider is below the stop threshold or past its reset date.
