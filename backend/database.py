"""Lightweight SQLite helpers for persisting nutrition data."""

from __future__ import annotations

import json
import sqlite3
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from .constants import DEFAULT_PREFERENCES, DEFAULT_WEEKLY_GOALS, NUTRIENT_KEYS
from .schemas import MealLogRequest, PreferencesPayload


DB_PATH = Path(__file__).resolve().parent / "nutrition.db"


def _get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = _get_connection()
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS meal_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                meal_name TEXT NOT NULL,
                meal_type TEXT NOT NULL,
                calories REAL NOT NULL,
                nutrition TEXT NOT NULL,
                meal_date TEXT NOT NULL,
                meal_time TEXT,
                was_suggested INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                notes TEXT,
                override_nutrition TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS user_preferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                preferred_ingredients TEXT NOT NULL,
                dietary_restrictions TEXT NOT NULL,
                cooking_time_preference INTEGER NOT NULL,
                meal_complexity TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS nutrition_goals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                week_start TEXT UNIQUE NOT NULL,
                data TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS user_meals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                meal_type TEXT NOT NULL,
                cooking_time INTEGER NOT NULL,
                ingredients TEXT NOT NULL,
                instructions TEXT NOT NULL,
                tags TEXT,
                nutrition TEXT NOT NULL,
                source_payload TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()
        # Ensure legacy databases gain new columns
        for column, definition in {
            "notes": "TEXT",
            "override_nutrition": "TEXT",
        }.items():
            try:
                conn.execute(f"ALTER TABLE meal_logs ADD COLUMN {column} {definition}")
                conn.commit()
            except sqlite3.OperationalError:
                pass
    finally:
        conn.close()


def get_week_start(reference: Optional[date] = None) -> date:
    today = reference or date.today()
    weekday = today.weekday()  # Monday = 0
    return today - timedelta(days=weekday)


def ensure_weekly_goal(week_start: date) -> Dict[str, float]:
    conn = _get_connection()
    try:
        row = conn.execute(
            "SELECT data FROM nutrition_goals WHERE week_start = ?",
            (week_start.isoformat(),),
        ).fetchone()
        if row:
            return json.loads(row["data"])

        payload = json.dumps(DEFAULT_WEEKLY_GOALS)
        conn.execute(
            """
            INSERT INTO nutrition_goals (week_start, data, created_at)
            VALUES (?, ?, ?)
            """,
            (week_start.isoformat(), payload, datetime.utcnow().isoformat()),
        )
        conn.commit()
        return DEFAULT_WEEKLY_GOALS.copy()
    finally:
        conn.close()


def save_preferences(payload: PreferencesPayload) -> Dict[str, object]:
    conn = _get_connection()
    try:
        conn.execute(
            """
            INSERT INTO user_preferences (
                preferred_ingredients,
                dietary_restrictions,
                cooking_time_preference,
                meal_complexity,
                updated_at
            ) VALUES (?, ?, ?, ?, ?)
            """,
            (
                json.dumps(payload.preferred_ingredients),
                json.dumps(payload.dietary_restrictions),
                payload.cooking_time_preference,
                payload.meal_complexity,
                datetime.utcnow().isoformat(),
            ),
        )
        conn.commit()
    finally:
        conn.close()
    return get_preferences()


def get_preferences() -> Dict[str, object]:
    conn = _get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM user_preferences ORDER BY updated_at DESC LIMIT 1"
        ).fetchone()
        if not row:
            return DEFAULT_PREFERENCES.copy()
        return {
            "preferred_ingredients": json.loads(row["preferred_ingredients"]),
            "dietary_restrictions": json.loads(row["dietary_restrictions"]),
            "cooking_time_preference": row["cooking_time_preference"],
            "meal_complexity": row["meal_complexity"],
        }
    finally:
        conn.close()


def log_meal(payload: MealLogRequest) -> int:
    meal_date = (payload.meal_date or date.today()).isoformat()
    meal_time = payload.meal_time or datetime.now().strftime("%H:%M")
    nutrition = payload.nutrition.copy()
    nutrition.setdefault("calories", payload.calories)

    conn = _get_connection()
    try:
        cursor = conn.execute(
            """
            INSERT INTO meal_logs (
                meal_name,
                meal_type,
                calories,
                nutrition,
                meal_date,
                meal_time,
                was_suggested,
                created_at,
                notes,
                override_nutrition
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.meal_name,
                payload.meal_type,
                float(payload.calories),
                json.dumps(nutrition),
                meal_date,
                meal_time,
                int(payload.was_suggested),
                datetime.utcnow().isoformat(),
                payload.notes,
                None,
            ),
        )
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()


def fetch_recent_meals(limit: int, days: int, offset: int = 0) -> List[Dict[str, object]]:
    since = date.today() - timedelta(days=days)
    conn = _get_connection()
    try:
        rows = conn.execute(
            """
            SELECT
                id,
                meal_name,
                meal_type,
                calories,
                meal_time,
                meal_date,
                nutrition,
                override_nutrition,
                notes
            FROM meal_logs
            WHERE meal_date >= ?
            ORDER BY meal_date DESC, meal_time DESC
            LIMIT ? OFFSET ?
            """,
            (since.isoformat(), limit, offset),
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def save_custom_meal(
    recipe: Dict[str, object], source_payload: Dict[str, object]
) -> Dict[str, object]:
    conn = _get_connection()
    try:
        cursor = conn.execute(
            """
            INSERT INTO user_meals (
                name,
                description,
                meal_type,
                cooking_time,
                ingredients,
                instructions,
                tags,
                nutrition,
                source_payload,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                recipe.get("name"),
                recipe.get("description", ""),
                recipe.get("meal_type") or source_payload.get("meal_type", "meal"),
                int(recipe.get("prepTime") or source_payload.get("cooking_time", 30)),
                json.dumps(recipe.get("ingredients", [])),
                json.dumps(recipe.get("instructions", [])),
                json.dumps(recipe.get("tags", [])),
                json.dumps(recipe.get("nutrition", {})),
                json.dumps(source_payload),
                datetime.utcnow().isoformat(),
            ),
        )
        conn.commit()
        inserted_id = cursor.lastrowid
        row = conn.execute(
            "SELECT * FROM user_meals WHERE id = ?", (inserted_id,)
        ).fetchone()
        return dict(row)
    finally:
        conn.close()


def list_custom_meals(limit: int = 10) -> List[Dict[str, object]]:
    conn = _get_connection()
    try:
        rows = conn.execute(
            """
            SELECT id, name, description, meal_type, cooking_time, ingredients, instructions, tags, nutrition
            FROM user_meals
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
        meals: List[Dict[str, object]] = []
        for row in rows:
            entry = dict(row)
            for key in ("ingredients", "instructions", "tags"):
                try:
                    entry[key] = json.loads(entry[key]) if entry.get(key) else []
                except json.JSONDecodeError:
                    entry[key] = []
            try:
                entry["nutrition"] = (
                    json.loads(entry["nutrition"]) if entry.get("nutrition") else {}
                )
            except json.JSONDecodeError:
                entry["nutrition"] = {}
            meals.append(entry)
        return meals
    finally:
        conn.close()


def get_weekly_logs(week_start: date) -> List[Dict[str, object]]:
    conn = _get_connection()
    try:
        rows = conn.execute(
            """
            SELECT meal_name, meal_type, calories, nutrition, override_nutrition, meal_date, meal_time, was_suggested
            FROM meal_logs
            WHERE meal_date >= ?
            """,
            (week_start.isoformat(),),
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def fetch_meal_log_by_id(log_id: int) -> Optional[Dict[str, object]]:
    conn = _get_connection()
    try:
        row = conn.execute(
            """
            SELECT
                id,
                meal_name,
                meal_type,
                calories,
                nutrition,
                override_nutrition,
                meal_date,
                meal_time,
                notes,
                was_suggested
            FROM meal_logs
            WHERE id = ?
            """,
            (log_id,),
        ).fetchone()
        if not row:
            return None
        entry = dict(row)
        entry["nutrition"] = json.loads(entry.get("nutrition") or "{}")
        entry["override_nutrition"] = (
            json.loads(entry["override_nutrition"])
            if entry.get("override_nutrition")
            else None
        )
        return entry
    finally:
        conn.close()


def update_meal_override(log_id: int, overrides: Dict[str, float]) -> Optional[Dict[str, object]]:
    conn = _get_connection()
    try:
        override_json = json.dumps(overrides) if overrides else None
        result = conn.execute(
            """
            UPDATE meal_logs
            SET override_nutrition = ?
            WHERE id = ?
            """,
            (override_json, log_id),
        )
        conn.commit()
        if result.rowcount == 0:
            return None
        return fetch_meal_log_by_id(log_id)
    finally:
        conn.close()


def delete_meal_log(log_id: int) -> bool:
    conn = _get_connection()
    try:
        result = conn.execute(
            "DELETE FROM meal_logs WHERE id = ?",
            (log_id,),
        )
        conn.commit()
        return result.rowcount > 0
    finally:
        conn.close()


def get_weekly_snapshot() -> Tuple[Dict[str, float], List[Dict[str, object]], date]:
    week_start = get_week_start()
    targets = ensure_weekly_goal(week_start)
    logs = get_weekly_logs(week_start)
    return targets, logs, week_start


def compute_nutrient_totals(logs: List[Dict[str, object]]) -> Dict[str, float]:
    totals = {key: 0.0 for key in NUTRIENT_KEYS}
    for entry in logs:
        try:
            base = json.loads(entry["nutrition"])
        except (TypeError, json.JSONDecodeError):
            base = {}
        override_raw = entry.get("override_nutrition")
        override = {}
        if override_raw:
            try:
                override = json.loads(override_raw)
            except (TypeError, json.JSONDecodeError):
                override = {}
        combined = base.copy()
        combined.update(override)
        for key in totals:
            totals[key] += float(combined.get(key, 0))
    return totals
