"""Modal H200:2 SGLang deployment for Borger's primary coding model.

Deploy with:
    modal deploy infra/modal/modal_qwen_h200_sglang.py

The deployed web URL exposes SGLang's OpenAI-compatible API, including:
    GET  /v1/models
    POST /v1/chat/completions
"""

import subprocess

import modal


APP_NAME = "borger-qwen3-coder-next-h200"
MODEL_PATH = "huihui-ai/Huihui-Qwen3-Coder-Next-abliterated"
SERVED_MODEL_NAME = MODEL_PATH

SGLANG_PORT = 30000
GPU_CONFIG = "H200:2"
TENSOR_PARALLEL_SIZE = 2

HF_CACHE_DIR = "/root/.cache/huggingface"
HF_VOLUME_NAME = "borger-qwen-cache"

MINUTES = 60
STARTUP_TIMEOUT = 45 * MINUTES
FUNCTION_TIMEOUT = 60 * MINUTES
SCALEDOWN_WINDOW = 10 * MINUTES


# Persist Hugging Face downloads across cold starts. The first deployment can
# take a long time while the 80B-class weights are downloaded; later starts reuse
# this Volume instead of pulling the full model again.
hf_cache_volume = modal.Volume.from_name(HF_VOLUME_NAME, create_if_missing=True)


# Use SGLang's official CUDA image so the deployment starts from a runtime that
# already contains SGLang, PyTorch, CUDA libraries, and the SGLang kernels. The
# entrypoint is cleared so Modal can run the Python function wrapper normally.
sglang_image = (
    modal.Image.from_registry("lmsysorg/sglang:latest-cu129")
    .entrypoint([])
    .env(
        {
            # Put every Hugging Face cache artifact on the mounted Volume.
            "HF_HOME": HF_CACHE_DIR,
            "HUGGINGFACE_HUB_CACHE": f"{HF_CACHE_DIR}/hub",
            "TRANSFORMERS_CACHE": f"{HF_CACHE_DIR}/hub",
            # Speed up large model transfers where the installed HF stack supports it.
            "HF_HUB_ENABLE_HF_TRANSFER": "1",
            "HF_XET_HIGH_PERFORMANCE": "1",
            # Cleaner production logs and fewer background calls.
            "HF_HUB_DISABLE_TELEMETRY": "1",
            "PYTHONUNBUFFERED": "1",
            "NCCL_DEBUG": "WARN",
        }
    )
)


app = modal.App(APP_NAME)


@app.function(
    image=sglang_image,
    # Two H200s are requested on one Modal container; SGLang uses tensor
    # parallelism across them via --tp-size 2.
    gpu=GPU_CONFIG,
    # The Hugging Face token is injected as env var HF_TOKEN at runtime.
    # No token is committed to this repo.
    secrets=[modal.Secret.from_name("huggingface-secret", required_keys=["HF_TOKEN"])],
    # Mount the persistent cache at the exact location used by Hugging Face.
    volumes={HF_CACHE_DIR: hf_cache_volume},
    # Cold starts for this model can include image pull, SGLang init, and a first
    # model download. Give Modal and SGLang enough time before declaring failure.
    timeout=FUNCTION_TIMEOUT,
    startup_timeout=STARTUP_TIMEOUT,
    # Keep the expensive H200 pair alive briefly for iterative testing, then let
    # Modal scale to zero when idle.
    scaledown_window=SCALEDOWN_WINDOW,
    min_containers=0,
    max_containers=1,
)
@modal.concurrent(max_inputs=16)
@modal.web_server(port=SGLANG_PORT, startup_timeout=STARTUP_TIMEOUT)
def serve():
    """Start SGLang's OpenAI-compatible HTTP server inside the Modal container."""

    cmd = [
        "python",
        "-m",
        "sglang.launch_server",
        "--model-path",
        MODEL_PATH,
        "--served-model-name",
        SERVED_MODEL_NAME,
        "--host",
        "0.0.0.0",
        "--port",
        str(SGLANG_PORT),
        "--tp-size",
        str(TENSOR_PARALLEL_SIZE),
        "--download-dir",
        HF_CACHE_DIR,
        # Qwen Coder variants may depend on Hugging Face model code/tokenizer
        # behavior that is safest to load explicitly.
        "--trust-remote-code",
        # Qwen3-style reasoning content can be parsed by SGLang when present.
        "--reasoning-parser",
        "qwen3",
        # Leave VRAM headroom for CUDA/NCCL overhead and startup variance.
        "--mem-fraction-static",
        "0.82",
        # Keep request fan-out modest for a private coding-agent endpoint.
        "--max-running-requests",
        "8",
        "--log-level",
        "info",
    ]

    print("Starting SGLang server:")
    print(" ".join(cmd))
    subprocess.Popen(cmd)


@app.local_entrypoint()
def print_deploy_notes():
    """Print quick local guidance without starting a deployment from this file."""

    print(f"App: {APP_NAME}")
    print("Deploy:")
    print("  modal deploy infra/modal/modal_qwen_h200_sglang.py")
    print("After deploy, copy the printed *.modal.run URL into BORGER_MODAL_ENDPOINT.")
