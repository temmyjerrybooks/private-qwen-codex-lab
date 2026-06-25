# Hugging Face Setup

Borger's Phase 2 Modal deployment downloads model weights from Hugging Face:

```text
huihui-ai/Huihui-Qwen3-Coder-Next-abliterated
```

## Create a Token

1. Open Hugging Face in your browser.
2. Go to account settings.
3. Create an access token with read permissions.
4. Keep the token private.

## Store the Token in Modal

Borger expects a Modal Secret named `huggingface-secret` with key `HF_TOKEN`:

```powershell
modal secret create huggingface-secret HF_TOKEN=your_huggingface_token
```

Do not put real Hugging Face tokens in `.env.example`, source files, docs, commits, or screenshots.

## Why the Token Is Needed

Modal injects `HF_TOKEN` into the remote container at runtime. SGLang and Hugging Face libraries use it to download the model files into the persistent Modal Volume mounted at:

```text
/root/.cache/huggingface
```

## Cache Behavior

The first download may be slow. The deployment uses Modal Volume `borger-qwen-cache`, so successful downloads persist across later cold starts.

## Common Problems

- Token missing: Modal logs may show authentication or repository access errors.
- Token lacks access: create a new read token or accept any required model terms on Hugging Face.
- Cache partially populated: retry deployment or delete/recreate the Modal Volume only if the cache is corrupted.
