"""Handlers for user-submitted meals completed via OpenAI."""

from __future__ import annotations

import json
from typing import Dict, List

from .database import save_custom_meal
from .openai_utils import complete_custom_recipe
from .schemas import CustomMealRequest


async def generate_and_store_custom_meal(payload: CustomMealRequest) -> Dict[str, object]:
    messages = _build_messages(payload)
    recipe = await complete_custom_recipe(messages)
    recipe.setdefault("meal_type", payload.meal_type)
    recipe.setdefault("prepTime", payload.cooking_time)
    recipe.setdefault("tags", [])
    stored = save_custom_meal(recipe, payload.model_dump())
    stored["recipe"] = recipe
    return stored


def _build_messages(payload: CustomMealRequest) -> List[Dict[str, str]]:
    data_blob = json.dumps(
        {
            "name": payload.name,
            "meal_type": payload.meal_type,
            "base_description": payload.base_description,
            "preferred_ingredients": payload.preferred_ingredients,
            "avoid_ingredients": payload.avoid_ingredients,
            "cuisine": payload.cuisine,
            "cooking_time": payload.cooking_time,
            "nutrition_focus": payload.nutrition_focus,
            "dietary_notes": payload.dietary_notes,
        },
        indent=2,
    )
    return [
        {
            "role": "system",
            "content": (
                "You are a culinary R&D chef and registered dietitian. "
                "Transform rough meal ideas into complete, well-balanced recipes "
                "with precise nutrition data."
            ),
        },
        {
            "role": "user",
            "content": (
                "Convert this user meal concept into a ready-to-cook recipe. "
                "Keep ingredients accessible, minimize prep complexity, and describe "
                "clear cooking instructions. Output only JSON matching the schema."
                f"\n\nDATA:\n{data_blob}"
            ),
        },
    ]

