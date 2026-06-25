# Troubleshooting

## VS Code Extension Not Appearing

- Run `npm install`
- Run `npm run compile`
- Press `F5` from VS Code with the extension project open

## TypeScript Compile Errors

- Confirm Node.js and npm are installed
- Reinstall dependencies inside `apps/vscode-extension`

## LiteLLM Connection Failures

- Confirm LiteLLM is running:

```powershell
docker compose -f infra/docker/docker-compose.litellm.yml up
```

- Confirm Borger and smoke tests use the local base URL:

```text
http://localhost:4000/v1
```

- Confirm `BORGER_LITELLM_API_KEY` matches `LITELLM_MASTER_KEY`.
- Confirm the model alias matches `qwen3-coder-next-abliterated-h200`.
- If `/v1/models` works but chat fails, check `BORGER_MODAL_API_BASE`.
- If you see 401 or 403, the LiteLLM master key is probably wrong.
- If you see 404, check the model alias and `/v1` suffix.
- If you see 502, 503, or 504, the Modal endpoint may be sleeping or SGLang may still be loading.

## Permission Issues

- Run `Borger: Show Permissions` to inspect the active profile.
- If workspace inspection or planning is blocked, confirm `canReadWorkspace` is true.
- If `.borger/permissions.local.json` is malformed, Borger falls back to safe defaults and reports a warning.
- If command policy blocks a command, check `blockedCommandPatterns` and `allowedCommands`.
- Authorization decisions are logged to `.borger/action-log.jsonl`, which is ignored by git.

## Workspace Context Issues

- If `Borger: Inspect Workspace` shows no workspace, open a folder in VS Code instead of a single file.
- If expected files are missing from context, check `.gitignore`, `borger.maxContextFiles`, and the always-ignored folder list.
- If a file is skipped, it may be over `borger.maxFileSizeKb`, binary, outside the workspace, or secret-like.
- `.env.example` is intentionally allowed, but `.env`, `.env.local`, private keys, token files, and credential files are skipped.
- If git status is unavailable, confirm the workspace is a git repository and that the permission profile allows workspace or git inspection.
- If diagnostics are empty, make sure the relevant VS Code language extension has finished loading.

## Modal and Hugging Face Issues

- Wrong Modal endpoint: copy the URL printed by `modal deploy infra/modal/modal_qwen_h200_sglang.py` and add `/v1` for LiteLLM.
- Slow first request: the H200 app may be cold-starting, downloading weights, or reading the cache volume.
- GPU memory errors: confirm the Modal deployment uses `gpu="H200:2"` and tensor parallelism size 2.
- Endpoint failures: test Modal directly with `python scripts/smoke_test_modal_endpoint.py`, then test LiteLLM with `python scripts/smoke_test_litellm.py`.
- Hugging Face errors: confirm Modal secret `huggingface-secret` contains `HF_TOKEN`.
