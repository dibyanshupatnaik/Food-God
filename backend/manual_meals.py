"""Manual meal logging powered by OpenAI nutrition estimation."""

from __future__ import annotations

from .database import log_meal
from .openai_utils import estimate_manual_nutrition
from .schemas import ManualMealRequest, MealLogRequest


async def log_manual_meal(payload: ManualMealRequest) -> dict:
    estimate = await estimate_manual_nutrition(
        meal_name=payload.meal_name,
        meal_type=payload.meal_type,
        description=payload.description,
        approximate_weight=payload.approximate_weight,
    )

    nutrition_profile = estimate.get("nutrition", {})
    calories = float(nutrition_profile.get("calories", 0))

    log_payload = MealLogRequest(
        meal_name=payload.meal_name,
        meal_type=payload.meal_type,
        calories=calories,
        nutrition=nutrition_profile,
        meal_date=payload.meal_date,
        meal_time=payload.meal_time,
        was_suggested=False,
        notes=f"Manual entry: {payload.description} | Portion: {payload.approximate_weight}",
    )

    record_id = log_meal(log_payload)
    return {
        "success": True,
        "id": record_id,
        "meal_name": payload.meal_name,
        "nutrition": nutrition_profile,
    }
