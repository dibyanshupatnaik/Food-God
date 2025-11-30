"""Pydantic schemas shared by the FastAPI handlers."""

from __future__ import annotations

from datetime import date
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class PreferencesPayload(BaseModel):
    preferred_ingredients: List[str] = Field(default_factory=list)
    dietary_restrictions: List[str] = Field(default_factory=list)
    cooking_time_preference: int = 30
    meal_complexity: str = "simple"


class MealLogRequest(BaseModel):
    meal_name: str
    meal_type: str
    calories: float
    nutrition: Dict[str, float] = Field(default_factory=dict)
    meal_date: Optional[date] = None
    meal_time: Optional[str] = None
    was_suggested: bool = False
    notes: Optional[str] = None


class MealGenerationRequest(BaseModel):
    weekly_progress: Optional[Dict[str, Any]] = None
    preferences: List[str] = Field(default_factory=list)
    restrictions: List[str] = Field(default_factory=list)


class ManualMealRequest(BaseModel):
    meal_name: str
    meal_type: str = "dinner"
    description: str
    approximate_weight: str
    meal_date: Optional[date] = None
    meal_time: Optional[str] = None


class MealOverrideRequest(BaseModel):
    override_nutrition: Dict[str, float]


class CustomMealRequest(BaseModel):
    name: str
    base_description: str = Field(
        default="",
        description="Short description of the meal concept or flavor profile.",
    )
    meal_type: str = "dinner"
    preferred_ingredients: List[str] = Field(default_factory=list)
    avoid_ingredients: List[str] = Field(default_factory=list)
    cooking_time: int = 30
    cuisine: Optional[str] = None
    nutrition_focus: List[str] = Field(
        default_factory=list,
        description="Specific nutrients or goals this meal should emphasize.",
    )
    dietary_notes: Optional[str] = None
