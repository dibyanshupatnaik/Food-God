"""Utilities for calling the OpenAI Responses API."""

from __future__ import annotations

import asyncio
import json
import os
import logging
from typing import Any, Dict, List, Sequence

from datetime import datetime
import httpx

from .constants import NUTRIENT_KEYS, NUTRIENT_METADATA

logger = logging.getLogger("openai_utils")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)


def _write_log(entry: Dict[str, Any]) -> None:
    # Emit structured logs to stdout/stderr so Render/Netlify capture them without disk writes
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        **entry,
    }
    logger.info(json.dumps(log_entry))


_client: httpx.Client | None = None


def _ensure_client() -> httpx.Client:
    global _client
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set for the backend service.")
    if _client is None:
        _client = httpx.Client(
            base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            timeout=60.0,
        )
    return _client


def _nutrition_schema() -> Dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            key: {"type": "number", "description": meta.get("name", key)}
            for key, meta in NUTRIENT_METADATA.items()
        },
        "required": NUTRIENT_KEYS,
        "additionalProperties": False,
    }


async def _call_openai_json(
    messages: Sequence[Dict[str, str]],
    schema: Dict[str, Any],
    response_name: str,
) -> Dict[str, Any]:
    client = _ensure_client()
    model = os.getenv("OPENAI_MODEL", "gpt-5.1")
    # Determinism controls via env
    try:
        temperature = float(os.getenv("OPENAI_TEMPERATURE", "0"))
    except ValueError:
        temperature = 0.0
    try:
        top_p = float(os.getenv("OPENAI_TOP_P", "1"))
    except ValueError:
        top_p = 1.0
    seed_env = os.getenv("OPENAI_SEED")
    seed = None
    if seed_env is not None:
        try:
            seed = int(seed_env)
        except ValueError:
            seed = None

    def _request():
        request_payload = {
            "model": model,
            "input": messages,
            "temperature": temperature,
            "top_p": top_p,
            "text": {
                "format": {
                    "type": "json_schema",
                    "name": response_name,
                    "schema": schema,
                    "strict": True,
                }
            },
        }
        if seed is not None:
            request_payload["seed"] = seed
        _write_log({"direction": "request", "payload": request_payload})
        resp = client.post("/responses", json=request_payload)
        if resp.status_code >= 400:
            try:
                payload = resp.json()
            except Exception:
                payload = resp.text
            _write_log(
                {
                    "direction": "response",
                    "status": resp.status_code,
                    "error": payload,
                }
            )
            raise RuntimeError(
                f"OpenAI request failed: {resp.status_code} {payload}"
            )
        data = resp.json()
        _write_log(
            {"direction": "response", "status": resp.status_code, "payload": data}
        )
        return data

    data = await asyncio.to_thread(_request)

    output = data.get("output", [])
    if not output:
        raise RuntimeError("OpenAI response did not include structured content.")
    first_content = output[0].get("content", [])
    if not first_content:
        raise RuntimeError("OpenAI response missing content.")
    item = first_content[0]

    # Prefer 'json' when using json_schema format
    if "json" in item:
        return item["json"]
    if "text" in item:
        raw = item["text"]
        return json.loads(raw)

    # Fallback – you probably won't hit this
    return item



async def complete_custom_recipe(messages: List[Dict[str, str]]) -> Dict[str, Any]:
    schema = {
        "type": "object",
        "properties": {
            "name": {"type": "string"},
            "description": {"type": "string"},
            "meal_type": {"type": "string"},
            "prepTime": {"type": "number"},
            "ingredients": {
                "type": "array",
                "items": {"type": "string"},
                "minItems": 5,
            },
            "instructions": {
                "type": "array",
                "items": {"type": "string"},
                "minItems": 4,
            },
            "tags": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Short descriptors like high-protein, iron-rich, vegan.",
            },
            "nutrition": _nutrition_schema(),
        },
        "required": [
            "name",
            "description",
            "meal_type",
            "prepTime",
            "ingredients",
            "instructions",
            "nutrition",
        ],
        "additionalProperties": False,
    }
    return await _call_openai_json(messages, schema, "completed_recipe")


async def generate_meal_suggestions(messages: List[Dict[str, str]]) -> Dict[str, Any]:
    meal_schema = {
        "type": "object",
        "properties": {
            "name": {"type": "string"},
            "description": {"type": "string"},
            "meal_type": {"type": "string"},
            "calories": {"type": "number"},
            "prepTime": {"type": "number"},
            "ingredients": {
                "type": "array",
                "items": {"type": "string"},
            },
            "instructions": {
                "type": "array",
                "items": {"type": "string"},
            },
            "nutrition": _nutrition_schema(),
        },
        "required": [
            "name",
            "description",
            "meal_type",
            "calories",
            "prepTime",
            "ingredients",
            "instructions",  # ⬅️ now explicitly required
            "nutrition",
        ],
        "additionalProperties": False,
    }

    schema = {
        "type": "object",
        "properties": {
            "lunch": meal_schema,
            "dinner": meal_schema,
        },
        "required": ["lunch", "dinner"],
        "additionalProperties": False,
    }
    return await _call_openai_json(messages, schema, "meal_suggestions")


async def estimate_manual_nutrition(
    meal_name: str,
    meal_type: str,
    description: str,
    approximate_weight: str,
) -> Dict[str, Any]:
    schema = {
        "type": "object",
        "properties": {
            "nutrition": _nutrition_schema(),
            "ingredients": {"type": "array", "items": {"type": "string"}},
            "estimated_weight_grams": {"type": "number"},
        },
        "required": ["nutrition", "ingredients", "estimated_weight_grams"],
        "additionalProperties": False,
    }
    messages = [
        {
            "role": "system",
            "content": (
                "You are a registered dietitian. Estimate complete nutrition facts for meals "
                "based on a user's description and portion size. Return precise macronutrients, "
                "vitamins, minerals, and calories."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Meal name: {meal_name}\n"
                f"Meal type: {meal_type}\n"
                f"Description: {description}\n"
                f"Approximate portion/weight: {approximate_weight}\n"
                "Respond with JSON only that matches the provided schema."
            ),
        },
    ]
    return await _call_openai_json(messages, schema, "manual_meal_nutrition")
