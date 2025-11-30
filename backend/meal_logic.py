"""Business logic for computing progress and composing AI-powered meal prompts."""

from __future__ import annotations

import json
from datetime import date, datetime
from typing import Dict, List, Tuple

from .constants import DEFAULT_WEEKLY_GOALS, NUTRIENT_METADATA, SCORING_NUTRIENTS
from .database import (
    compute_nutrient_totals,
    get_preferences,
    get_weekly_snapshot,
    list_custom_meals,
)
from .openai_utils import generate_meal_suggestions
from .schemas import MealGenerationRequest


def build_weekly_progress() -> Tuple[
    Dict[str, Dict[str, float]],
    Dict[str, float],
    Dict[str, float],
    List[Dict[str, object]],
    date,
]:
    targets, logs, week_start = get_weekly_snapshot()
    totals = compute_nutrient_totals(logs)
    progress = {}
    for key, meta in NUTRIENT_METADATA.items():
        target_value = float(targets.get(key, DEFAULT_WEEKLY_GOALS.get(key, 0)))
        current_value = round(float(totals.get(key, 0)), 2)
        progress[key] = {
            "current": current_value,
            "target": target_value,
            "unit": meta["unit"],
            "category": meta["category"],
        }
        if "name" in meta:
            progress[key]["name"] = meta["name"]
        if meta.get("is_limit"):
            progress[key]["isLimit"] = True
    return progress, targets, totals, logs, week_start


async def generate_meal_plan(payload: MealGenerationRequest) -> Dict[str, object]:
    progress, targets, totals, logs, week_start = build_weekly_progress()
    stored_preferences = get_preferences()
    custom_meals = list_custom_meals(limit=12)
    context = _prepare_generation_context(
        payload, progress, targets, totals, logs, week_start, stored_preferences, custom_meals
    )
    messages = _build_generation_messages(context)
    ai_response = await generate_meal_suggestions(messages)
    return {
        "lunch": ai_response.get("lunch"),
        "dinner": ai_response.get("dinner"),
        "focus": {
            "labels": context["focus_labels"],
            "deficits": context["focus_details"],
        },
        "remaining": context["remaining"],
        "calorie_targets": {
            "lunch": context["lunch_calories"],
            "dinner": context["dinner_calories"],
        },
        "generated_at": datetime.utcnow().isoformat(),
    }


def _prepare_generation_context(
    payload: MealGenerationRequest,
    progress: Dict[str, Dict[str, float]],
    targets: Dict[str, float],
    totals: Dict[str, float],
    logs: List[Dict[str, object]],
    week_start: date,
    stored_preferences: Dict[str, object],
    custom_meals: List[Dict[str, object]],
) -> Dict[str, object]:
    preferred_source = (
        payload.preferences or stored_preferences.get("preferred_ingredients") or []
    )
    restriction_source = (
        stored_preferences.get("dietary_restrictions", []) + payload.restrictions
    )
    remaining: Dict[str, float] = {}
    remaining_ratios: Dict[str, float] = {}
    limit_guidance = []
    for key, meta in NUTRIENT_METADATA.items():
        target_value = float(targets.get(key, DEFAULT_WEEKLY_GOALS.get(key, 0)))
        consumed = float(totals.get(key, 0))
        gap = max(target_value - consumed, 0.0)
        remaining[key] = gap
        if meta.get("is_limit"):
            remaining_ratios[key] = -1.0  # never prioritize limits as deficits
            limit_guidance.append(
                {
                    "key": key,
                    "label": meta.get("name", key.replace("_", " ").title()),
                    "unit": meta.get("unit"),
                    "remaining_buffer": round(gap, 2),
                    "max": target_value,
                    "current": round(consumed, 2),
                }
            )
        else:
            ratio = gap / target_value if target_value else 0.0
            remaining_ratios[key] = ratio
    focus_priorities = _identify_focus_labels(remaining_ratios)
    focus_labels = [entry["label"] for entry in focus_priorities]
    focus_details = []
    for entry in focus_priorities:
        key = entry["key"]
        meta = NUTRIENT_METADATA.get(key, {})
        focus_details.append(
            {
                "key": key,
                "label": entry["label"],
                "unit": meta.get("unit"),
                "remaining": round(remaining.get(key, 0.0), 2),
                "target": float(targets.get(key, DEFAULT_WEEKLY_GOALS.get(key, 0.0))),
            }
        )
    lunch_calories, dinner_calories = _daily_calorie_targets(
        targets, totals, week_start
    )
    recent_log_summary = [
        {
            "meal": entry.get("meal_name"),
            "type": entry.get("meal_type"),
            "calories": entry.get("calories", 0),
        }
        for entry in logs[-5:]
    ]
    custom_meal_summary = [
        {
            "name": meal.get("name"),
            "meal_type": meal.get("meal_type"),
            "cooking_time": meal.get("cooking_time"),
            "tags": meal.get("tags", []),
            "nutrition": {
                key: meal.get("nutrition", {}).get(key, 0)
                for key in SCORING_NUTRIENTS
            },
        }
        for meal in custom_meals
    ]
    return {
        "preferences": preferred_source,
        "restrictions": restriction_source,
        "focus_labels": focus_labels,
        "focus_details": focus_details,
        "remaining": remaining,
        "progress": progress,
        "lunch_calories": lunch_calories,
        "dinner_calories": dinner_calories,
        "custom_meals": custom_meal_summary,
        "recent_logs": recent_log_summary,
        "limit_guidance": limit_guidance,
    }


def _build_generation_messages(context: Dict[str, object]) -> List[Dict[str, str]]:
    focus_text = ", ".join(context["focus_labels"]) or "balanced coverage"
    json_blob = json.dumps(
        {
            "remaining_needs": context["remaining"],
            "preferences": context["preferences"],
            "restrictions": context["restrictions"],
            "custom_meals": context["custom_meals"],
            "recent_logs": context["recent_logs"],
            "targets": {
                "lunch_calories": context["lunch_calories"],
                "dinner_calories": context["dinner_calories"],
            },
            "limit_nutrients": context["limit_guidance"],
        },
        indent=2,
    )
    limit_text = (
        ", ".join(
            f"{item['label']} (stay under {item['max']}{item['unit']}, ~{item['remaining_buffer']}{item['unit']} remaining)"
            for item in context["limit_guidance"]
        )
        or "standard upper limits"
    )
    user_prompt = (
        "Plan two nourishing meals (lunch and dinner) for today's nutrition gaps.\n"
        f"Focus especially on: {focus_text}.\n"
        f"Avoid pushing upper-limit nutrients: {limit_text}. Treat their remaining buffers as ceilings, not goals.\n"
        "Use the provided JSON data as the single source of truth and respond with JSON only."
        f"\n\nDATA:\n{json_blob}"
    )
    return [
        {
            "role": "system",
            "content": (
                "You are a clinical nutritionist and chef. Create simple, achievable recipes "
                "with supermarket ingredients, adapting to user preferences, restrictions, "
                "and nutrient deficits. Always provide precise nutrition details."
            ),
        },
        {"role": "user", "content": user_prompt},
    ]


def _daily_calorie_targets(
    targets: Dict[str, float], totals: Dict[str, float], week_start: date
) -> Tuple[float, float]:
    weekly_target = float(targets.get("calories", DEFAULT_WEEKLY_GOALS["calories"]))
    daily_default = weekly_target / 7
    today = date.today()
    days_elapsed = max((today - week_start).days, 0)
    days_elapsed = min(days_elapsed, 6)
    days_remaining = max(7 - (days_elapsed + 1), 1)
    remaining = max(weekly_target - float(totals.get("calories", 0)), 0)

    if remaining <= 0:
        planned_daily = daily_default * 0.75
    else:
        per_day = remaining / days_remaining
        planned_daily = max(per_day, daily_default * 0.85)
        planned_daily = min(planned_daily, daily_default * 1.35)

    lunch = max(round(planned_daily * 0.45, 1), 350)
    dinner = max(round(planned_daily * 0.55, 1), 400)
    return lunch, dinner


def _identify_focus_labels(remaining_ratios: Dict[str, float]) -> List[Dict[str, object]]:
    ranked = sorted(
        (
            (key, ratio)
            for key, ratio in remaining_ratios.items()
            if ratio > 0.08 and key in NUTRIENT_METADATA
        ),
        key=lambda item: item[1],
        reverse=True,
    )
    labels: List[Dict[str, object]] = []
    for nutrient, ratio in ranked[:5]:
        meta = NUTRIENT_METADATA[nutrient]
        labels.append(
            {
                "key": nutrient,
                "label": meta.get("name", nutrient.replace("_", " ").title()),
                "ratio": ratio,
            }
        )
    return labels
