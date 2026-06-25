"""Smoke test a local LiteLLM gateway configured for Borger."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from typing import Any


DEFAULT_BASE_URL = "http://localhost:4000/v1"
DEFAULT_MODEL = "qwen3-coder-next-abliterated-h200"
TIMEOUT_SECONDS = 120


class SmokeTestError(Exception):
    """Readable HTTP or connection failure."""

    def __init__(self, message: str, status: int | None = None, body: str | None = None) -> None:
        super().__init__(message)
        self.status = status
        self.body = body


def normalize_base_url(value: str) -> str:
    return value.rstrip("/")


def request_json(method: str, url: str, api_key: str | None, payload: dict[str, Any] | None = None) -> Any:
    body = None
    headers = {"Accept": "application/json"}
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    request = urllib.request.Request(url, data=body, headers=headers, method=method)

    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            raw = response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        raw_body = error.read().decode("utf-8", errors="replace")
        raise SmokeTestError(
            f"{method} {url} failed with HTTP {error.code}.",
            status=error.code,
            body=raw_body,
        ) from error
    except urllib.error.URLError as error:
        raise SmokeTestError(f"Could not reach {url}: {error.reason}") from error
    except TimeoutError as error:
        raise SmokeTestError(f"{method} {url} timed out after {TIMEOUT_SECONDS} seconds.") from error

    if not raw:
        return {}

    try:
        return json.loads(raw)
    except json.JSONDecodeError as error:
        raise SmokeTestError(f"{method} {url} returned non-JSON content.", body=raw[:500]) from error


def test_models(base_url: str, api_key: str | None) -> bool:
    url = f"{base_url}/models"
    print(f"[1/2] GET {url}")
    try:
        data = request_json("GET", url, api_key)
    except SmokeTestError as error:
        if error.status in {404, 405, 501}:
            print(f"[WARN] /v1/models is not available on this gateway: HTTP {error.status}")
            return True
        print_error(error)
        return False

    models = data.get("data", []) if isinstance(data, dict) else []
    if models:
        names = [str(item.get("id", "<unknown>")) for item in models[:5] if isinstance(item, dict)]
        print(f"[OK] /v1/models returned {len(models)} model(s): {', '.join(names)}")
    else:
        print("[OK] /v1/models responded, but no models were listed.")
    return True


def test_chat(base_url: str, api_key: str | None, model: str) -> bool:
    url = f"{base_url}/chat/completions"
    print(f"[2/2] POST {url}")
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a concise coding assistant."},
            {
                "role": "user",
                "content": "Write a TypeScript function named add that returns the sum of two numbers. Keep it under 6 lines.",
            },
        ],
        "temperature": 0,
        "max_tokens": 120,
    }

    try:
        data = request_json("POST", url, api_key, payload)
    except SmokeTestError as error:
        print_error(error)
        return False

    content = ""
    if isinstance(data, dict):
        choices = data.get("choices", [])
        if choices and isinstance(choices[0], dict):
            message = choices[0].get("message", {})
            if isinstance(message, dict):
                content = str(message.get("content", "")).strip()

    if not content:
        print("[FAIL] Chat completion returned no message content.")
        print(json.dumps(data, indent=2)[:1000])
        return False

    print("[OK] Chat completion succeeded.")
    print("----- response preview -----")
    print(content[:800])
    print("----------------------------")
    return True


def print_error(error: SmokeTestError) -> None:
    print(f"[FAIL] {error}")
    if error.status in {401, 403}:
        print("[HINT] Check BORGER_LITELLM_API_KEY. It should match LITELLM_MASTER_KEY for the local proxy.")
    elif error.status == 404:
        print("[HINT] Check BORGER_LITELLM_BASE_URL and the model alias in LiteLLM config.")
    elif error.status in {502, 503, 504}:
        print("[HINT] The Modal endpoint may be cold, sleeping, wrong, or SGLang may still be loading.")
    if error.body:
        print("----- error body -----")
        print(error.body[:1000])
        print("----------------------")


def main() -> int:
    base_url = normalize_base_url(os.environ.get("BORGER_LITELLM_BASE_URL", DEFAULT_BASE_URL))
    api_key = os.environ.get("BORGER_LITELLM_API_KEY") or None
    model = os.environ.get("BORGER_MODEL", DEFAULT_MODEL)

    print("Borger LiteLLM smoke test")
    print(f"Base URL: {base_url}")
    print(f"Model: {model}")
    print(f"API key: {'set' if api_key else 'not set'}")

    models_ok = test_models(base_url, api_key)
    chat_ok = test_chat(base_url, api_key, model)

    if models_ok and chat_ok:
        print("[OK] LiteLLM gateway smoke test passed.")
        return 0

    print("[FAIL] LiteLLM gateway smoke test failed.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
