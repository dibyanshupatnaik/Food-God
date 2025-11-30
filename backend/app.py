"""FastAPI application powering the nutrition planner backend."""

from __future__ import annotations

import json
from typing import List
from datetime import datetime

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .database import (
    fetch_meal_log_by_id,
    fetch_recent_meals,
    get_preferences,
    init_db,
    log_meal,
    delete_meal_log,
    save_preferences,
    update_meal_override,
)
from .custom_meals import generate_and_store_custom_meal
from .manual_meals import log_manual_meal
from .meal_logic import build_weekly_progress, generate_meal_plan
from .schemas import (
    CustomMealRequest,
    ManualMealRequest,
    MealGenerationRequest,
    MealLogRequest,
    MealOverrideRequest,
    PreferencesPayload,
)


load_dotenv()

app = FastAPI(title="Nutrition Planner API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    init_db()


@app.get("/health")
def healthcheck() -> dict:
    return {"status": "ok"}


@app.get("/api/preferences")
def read_preferences() -> dict:
    return get_preferences()


@app.post("/api/preferences")
def update_preferences(payload: PreferencesPayload) -> dict:
    return save_preferences(payload)


@app.put("/api/preferences")
def replace_preferences(payload: PreferencesPayload) -> dict:
    return save_preferences(payload)


@app.get("/api/nutrition/progress")
def read_weekly_progress() -> dict:
    progress, *_ = build_weekly_progress()
    return progress


@app.post("/api/meals/log")
def create_meal_log(payload: MealLogRequest) -> dict:
    try:
        record_id = log_meal(payload)
        return {"success": True, "id": record_id, "message": "Meal logged successfully"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/meals/log")
def list_meal_logs(
    limit: int = Query(10, ge=1, le=100),
    days: int = Query(7, ge=1, le=36500),
    offset: int = Query(0, ge=0),
) -> List[dict]:
    meals = fetch_recent_meals(limit=limit, days=days, offset=offset)
    formatted = []
    for meal in meals:
        try:
            base_nutrition = json.loads(meal.get("nutrition") or "{}")
        except (TypeError, json.JSONDecodeError):
            base_nutrition = {}
        override_raw = meal.get("override_nutrition")
        override_nutrition = {}
        if override_raw:
            try:
                override_nutrition = json.loads(override_raw)
            except (TypeError, json.JSONDecodeError):
                override_nutrition = {}
        effective_nutrition = base_nutrition.copy()
        effective_nutrition.update(override_nutrition)
        calories = effective_nutrition.get("calories", meal.get("calories", 0))
        meal_date_str = meal.get("meal_date")
        if meal_date_str:
            parsed_date = datetime.strptime(meal_date_str, "%Y-%m-%d")
            day_label = parsed_date.strftime("%a")
            date_label = parsed_date.strftime("%b %d")
        else:
            day_label = ""
            date_label = ""
        formatted.append(
            {
                "id": meal["id"],
                "time": meal.get("meal_time", "00:00"),
                "meal": meal.get("meal_name"),
                "calories": calories,
                "type": (meal.get("meal_type") or "meal").capitalize(),
                "day": day_label,
                "date": date_label,
                "hasOverride": bool(override_nutrition),
            }
        )
    return formatted


@app.post("/api/meals/generate")
async def generate_meals(payload: MealGenerationRequest) -> dict:
    try:
        return await generate_meal_plan(payload)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/meals/custom")
async def create_custom_meal(payload: CustomMealRequest) -> dict:
    try:
        return await generate_and_store_custom_meal(payload)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/meals/manual")
async def create_manual_meal(payload: ManualMealRequest) -> dict:
    try:
        return await log_manual_meal(payload)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/meals/log/{log_id}")
def read_meal_log(log_id: int) -> dict:
    meal = fetch_meal_log_by_id(log_id)
    if meal is None:
        raise HTTPException(status_code=404, detail="Meal not found")
    return meal


@app.patch("/api/meals/log/{log_id}")
def update_meal_log(log_id: int, payload: MealOverrideRequest) -> dict:
    updated = update_meal_override(log_id, payload.override_nutrition)
    if updated is None:
        raise HTTPException(status_code=404, detail="Meal not found")
    return updated


@app.delete("/api/meals/log/{log_id}")
def remove_meal_log(log_id: int) -> dict:
    deleted = delete_meal_log(log_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Meal not found")
    return {"success": True, "id": log_id, "message": "Meal deleted"}
