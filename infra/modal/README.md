# Modal Infrastructure

Phase 2 deploys Borger's primary model on Modal using two H200 GPUs and SGLang.

## Target

- App name: `borger-qwen3-coder-next-h200`
- Model: `huihui-ai/Huihui-Qwen3-Coder-Next-abliterated`
- GPU: `H200:2`
- Serving engine: SGLang
- Endpoint style: OpenAI-compatible HTTP API
- Port inside container: `30000`
- Tensor parallelism: `--tp-size 2`
- Hugging Face cache volume: `borger-qwen-cache`
- Modal secret: `huggingface-secret`
- Secret key: `HF_TOKEN`

## Install and Authenticate

```powershell
python -m pip install -r infra/modal/requirements.txt
modal setup
```

## Create Hugging Face Secret

```powershell
modal secret create huggingface-secret HF_TOKEN=your_huggingface_token
```

## Deploy

```powershell
modal deploy infra/modal/modal_qwen_h200_sglang.py
```

Modal prints a deployed `*.modal.run` URL. Use that root URL as `BORGER_MODAL_ENDPOINT`.

## Smoke Test

```powershell
$env:BORGER_MODAL_ENDPOINT="https://your-workspace--borger-qwen3-coder-next-h200-serve.modal.run"
python scripts/smoke_test_modal_endpoint.py
```

If the endpoint is protected by an API key later:

```powershell
$env:BORGER_MODAL_API_KEY="your_key"
python scripts/smoke_test_modal_endpoint.py
```

## First Run

The first request can be slow because Modal may need to pull the SGLang image, allocate two H200s, download the model from Hugging Face, and warm up SGLang. The model cache is stored in the `borger-qwen-cache` Modal Volume, so later cold starts should avoid re-downloading the full model.

## Cost Notes

The function uses `scaledown_window=10 * 60`, `min_containers=0`, and `max_containers=1`. This keeps one H200 pair warm briefly after requests, then lets Modal scale to zero.

## Troubleshooting

- Download stalls: confirm `huggingface-secret` exists and contains `HF_TOKEN`.
- Slow startup: expected on first run; watch Modal logs and wait for model cache population.
- GPU memory errors: lower `--mem-fraction-static` or reduce request concurrency.
- Endpoint 404: confirm you copied the root `*.modal.run` URL and the smoke test appends `/v1`.
- SGLang flag errors: run `python -m sglang.launch_server --help` inside an equivalent SGLang image and adjust the relevant argument.
