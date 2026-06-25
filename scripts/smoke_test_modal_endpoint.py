#!/usr/bin/env python3
"""Smoke test Borger's Modal-hosted SGLang OpenAI-compatible endpoint."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from typing import Any


DEFAULT_MODEL = "huihui-ai/Huihui-Qwen3-Coder-Next-abliterated"
REQUEST_TIMEOUT_SECONDS = 180


def main() -> int:
    endpoint = os.getenv("BORGER_MODAL_ENDPOINT", "").strip()
    if not endpoint:
        print("FAIL: BORGER_MODAL_ENDPOINT is not set.")
        print("Example: $env:BORGER_MODAL_ENDPOINT='https://your-workspace--borger-qwen3-coder-next-h200-serve.modal.run'")
        return 2

    api_base = normalize_api_base(endpoint)
    api_key = os.getenv("BORGER_MODAL_API_KEY", "").strip()
    model = os.getenv("BORGER_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL

    print(f"Endpoint base: {api_base}")
    print(f"Model: {model}")

    models_ok = test_models(api_base, api_key)
    chat_ok = test_chat_completion(api_base, api_key, model)

    if chat_ok:
        if models_ok:
            print("SUCCESS: /v1/models and /v1/chat/completions responded.")
        else:
            print("SUCCESS: /v1/chat/completions responded. /v1/models was unavailable or skipped.")
        return 0

    print("FAIL: chat completion smoke test did not succeed.")
    return 1


def normalize_api_base(endpoint: str) -> str:
    cleaned = endpoint.rstrip("/")
    if cleaned.endswith("/v1"):
        return cleaned
    return f"{cleaned}/v1"


def test_models(api_base: str, api_key: str) -> bool:
    url = f"{api_base}/models"
    print(f"\nTesting GET {url}")
    try:
        status, body = request_json("GET", url, api_key=api_key)
    except urllib.error.HTTPError as error:
        details = read_error_body(error)
        if error.code in {404, 405, 501}:
            print(f"SKIP: /v1/models is not available on this endpoint ({error.code}).")
            return False
        print(f"FAIL: /v1/models returned HTTP {error.code}: {details}")
        return False
    except Exception as error:
        print(f"FAIL: /v1/models request failed: {error}")
        return False

    print(f"OK: /v1/models returned HTTP {status}.")
    model_ids = extract_model_ids(body)
    if model_ids:
        print("Models:")
        for model_id in model_ids[:10]:
            print(f"  - {model_id}")
    else:
        print("No model IDs found in response body.")
    return True


def test_chat_completion(api_base: str, api_key: str, model: str) -> bool:
    url = f"{api_base}/chat/completions"
    print(f"\nTesting POST {url}")
    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": "Write a tiny TypeScript function named add that returns the sum of two numbers.",
            }
        ],
        "temperature": 0,
        "max_tokens": 96,
    }

    try:
        status, body = request_json("POST", url, payload=payload, api_key=api_key)
    except urllib.error.HTTPError as error:
        print(f"FAIL: /v1/chat/completions returned HTTP {error.code}: {read_error_body(error)}")
        return False
    except Exception as error:
        print(f"FAIL: /v1/chat/completions request failed: {error}")
        return False

    content = extract_chat_content(body)
    if not content:
        print(f"FAIL: HTTP {status}, but no assistant content was found.")
        print(json.dumps(body, indent=2)[:2000])
        return False

    print(f"OK: /v1/chat/completions returned HTTP {status}.")
    print("Assistant response:")
    print(content.strip())
    return True


def request_json(method: str, url: str, *, payload: dict[str, Any] | None = None, api_key: str = "") -> tuple[int, Any]:
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
        raw = response.read().decode("utf-8")
        try:
            body = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            body = {"raw": raw}
        return response.status, body


def read_error_body(error: urllib.error.HTTPError) -> str:
    try:
        return error.read().decode("utf-8")[:2000]
    except Exception:
        return "<unable to read response body>"


def extract_model_ids(body: Any) -> list[str]:
    if not isinstance(body, dict):
        return []
    data = body.get("data")
    if not isinstance(data, list):
        return []
    ids: list[str] = []
    for item in data:
        if isinstance(item, dict) and isinstance(item.get("id"), str):
            ids.append(item["id"])
    return ids


def extract_chat_content(body: Any) -> str:
    if not isinstance(body, dict):
        return ""
    choices = body.get("choices")
    if not isinstance(choices, list) or not choices:
        return ""
    first = choices[0]
    if not isinstance(first, dict):
        return ""
    message = first.get("message")
    if isinstance(message, dict) and isinstance(message.get("content"), str):
        return message["content"]
    text = first.get("text")
    return text if isinstance(text, str) else ""


if __name__ == "__main__":
    sys.exit(main())
