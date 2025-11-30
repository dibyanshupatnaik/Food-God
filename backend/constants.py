"""Static data and helper utilities for nutrition tracking."""

from __future__ import annotations

from typing import Dict, List


NUTRIENT_METADATA: Dict[str, Dict[str, object]] = {
    "calories": {
        "target": 14000,
        "unit": "kcal",
        "category": "macro",
        "name": "Calories",
    },
    "protein": {
        "target": 700,
        "unit": "g",
        "category": "macro",
        "name": "Protein",
    },
    "carbs": {
        "target": 1400,
        "unit": "g",
        "category": "macro",
        "name": "Carbohydrates",
    },
    "fat": {
        "target": 466,
        "unit": "g",
        "category": "macro",
        "name": "Fat",
    },
    "fiber": {
        "target": 175,
        "unit": "g",
        "category": "macro",
        "name": "Fiber",
    },
    "vitamin_a": {
        "target": 3500,
        "unit": "mcg",
        "category": "vitamin",
        "name": "Vitamin A",
    },
    "vitamin_c": {
        "target": 700,
        "unit": "mg",
        "category": "vitamin",
        "name": "Vitamin C",
    },
    "vitamin_d": {
        "target": 70,
        "unit": "mcg",
        "category": "vitamin",
        "name": "Vitamin D",
    },
    "vitamin_e": {
        "target": 105,
        "unit": "mg",
        "category": "vitamin",
        "name": "Vitamin E",
    },
    "vitamin_k": {
        "target": 770,
        "unit": "mcg",
        "category": "vitamin",
        "name": "Vitamin K",
    },
    "thiamin": {
        "target": 10.5,
        "unit": "mg",
        "category": "vitamin",
        "name": "Thiamin (B1)",
    },
    "riboflavin": {
        "target": 12.6,
        "unit": "mg",
        "category": "vitamin",
        "name": "Riboflavin (B2)",
    },
    "niacin": {
        "target": 105,
        "unit": "mg",
        "category": "vitamin",
        "name": "Niacin (B3)",
    },
    "vitamin_b6": {
        "target": 10.5,
        "unit": "mg",
        "category": "vitamin",
        "name": "Vitamin B6",
    },
    "folate": {
        "target": 2800,
        "unit": "mcg",
        "category": "vitamin",
        "name": "Folate (B9)",
    },
    "vitamin_b12": {
        "target": 17.5,
        "unit": "mcg",
        "category": "vitamin",
        "name": "Vitamin B12",
    },
    "calcium": {
        "target": 7000,
        "unit": "mg",
        "category": "mineral",
        "name": "Calcium",
    },
    "iron": {
        "target": 126,
        "unit": "mg",
        "category": "mineral",
        "name": "Iron",
    },
    "magnesium": {
        "target": 2800,
        "unit": "mg",
        "category": "mineral",
        "name": "Magnesium",
    },
    "phosphorus": {
        "target": 4900,
        "unit": "mg",
        "category": "mineral",
        "name": "Phosphorus",
    },
    "potassium": {
        "target": 24500,
        "unit": "mg",
        "category": "mineral",
        "name": "Potassium",
    },
    "sodium": {
        "target": 14000,
        "unit": "mg",
        "category": "mineral",
        "name": "Sodium",
        "is_limit": True,
    },
    "zinc": {
        "target": 70,
        "unit": "mg",
        "category": "mineral",
        "name": "Zinc",
    },
    "copper": {
        "target": 17.5,
        "unit": "mg",
        "category": "mineral",
        "name": "Copper",
    },
    "selenium": {
        "target": 385,
        "unit": "mcg",
        "category": "mineral",
        "name": "Selenium",
    },
    "cholesterol": {
        "target": 1400,
        "unit": "mg",
        "category": "lipid",
        "name": "Cholesterol",
        "is_limit": True,
    },
    "saturated_fat": {
        "target": 140,
        "unit": "g",
        "category": "lipid",
        "name": "Saturated Fat",
        "is_limit": True,
    },
    "trans_fat": {
        "target": 7,
        "unit": "g",
        "category": "lipid",
        "name": "Trans Fat",
        "is_limit": True,
    },
    "omega_3": {
        "target": 17.5,
        "unit": "g",
        "category": "lipid",
        "name": "Omega-3",
    },
    "omega_6": {
        "target": 87.5,
        "unit": "g",
        "category": "lipid",
        "name": "Omega-6",
    },
    "sugar": {
        "target": 210,
        "unit": "g",
        "category": "carb",
        "name": "Sugar",
        "is_limit": True,
    },
    "added_sugar": {
        "target": 140,
        "unit": "g",
        "category": "carb",
        "name": "Added Sugar",
        "is_limit": True,
    },
}

NUTRIENT_KEYS: List[str] = list(NUTRIENT_METADATA.keys())
DEFAULT_WEEKLY_GOALS: Dict[str, float] = {
    key: float(meta["target"]) for key, meta in NUTRIENT_METADATA.items()
}

DEFAULT_PREFERENCES = {
    "preferred_ingredients": ["chicken", "vegetables", "quinoa"],
    "dietary_restrictions": [],
    "cooking_time_preference": 30,
    "meal_complexity": "simple",
}

COMPLEXITY_LEVELS = {"simple": 1, "moderate": 2, "hearty": 3}
SCORING_NUTRIENTS = [
    "calories",
    "protein",
    "fiber",
    "iron",
    "vitamin_c",
    "vitamin_d",
    "calcium",
    "potassium",
    "magnesium",
    "vitamin_b12",
]
