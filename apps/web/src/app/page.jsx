import { useState, useEffect } from "react";
import {
  ChefHat,
  Target,
  Calendar,
  Settings,
  Plus,
  RefreshCw,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import GlobalStyles from "../components/nutrition/GlobalStyles";

const NUTRIENT_SECTIONS = [
  {
    label: "Macronutrients",
    keys: [
      { key: "calories", label: "Calories", unit: "kcal" },
      { key: "protein", label: "Protein", unit: "g" },
      { key: "carbs", label: "Carbs", unit: "g" },
      { key: "fat", label: "Fat", unit: "g" },
      { key: "fiber", label: "Fiber", unit: "g" },
      { key: "sugar", label: "Sugar", unit: "g" },
    ],
  },
  {
    label: "Vitamins",
    keys: [
      { key: "vitamin_a", label: "Vitamin A", unit: "mcg" },
      { key: "vitamin_c", label: "Vitamin C", unit: "mg" },
      { key: "vitamin_d", label: "Vitamin D", unit: "mcg" },
      { key: "vitamin_e", label: "Vitamin E", unit: "mg" },
      { key: "vitamin_k", label: "Vitamin K", unit: "mcg" },
      { key: "vitamin_b6", label: "Vitamin B6", unit: "mg" },
      { key: "vitamin_b12", label: "Vitamin B12", unit: "mcg" },
      { key: "thiamin", label: "Thiamin (B1)", unit: "mg" },
      { key: "riboflavin", label: "Riboflavin (B2)", unit: "mg" },
      { key: "niacin", label: "Niacin (B3)", unit: "mg" },
      { key: "folate", label: "Folate (B9)", unit: "mcg" },
    ],
  },
  {
    label: "Minerals & Electrolytes",
    keys: [
      { key: "calcium", label: "Calcium", unit: "mg" },
      { key: "iron", label: "Iron", unit: "mg" },
      { key: "magnesium", label: "Magnesium", unit: "mg" },
      { key: "phosphorus", label: "Phosphorus", unit: "mg" },
      { key: "potassium", label: "Potassium", unit: "mg" },
      { key: "sodium", label: "Sodium", unit: "mg" },
      { key: "zinc", label: "Zinc", unit: "mg" },
      { key: "copper", label: "Copper", unit: "mg" },
      { key: "selenium", label: "Selenium", unit: "mcg" },
    ],
  },
  {
    label: "Lipids & Other",
    keys: [
      { key: "cholesterol", label: "Cholesterol", unit: "mg" },
      { key: "saturated_fat", label: "Saturated Fat", unit: "g" },
      { key: "trans_fat", label: "Trans Fat", unit: "g" },
      { key: "omega_3", label: "Omega-3", unit: "g" },
      { key: "omega_6", label: "Omega-6", unit: "g" },
    ],
  },
];

export default function NutritionDashboard() {
  const API_BASE =
    import.meta.env.NEXT_PUBLIC_PYTHON_API_BASE_URL || "http://127.0.0.1:8000/api";

  const [weeklyProgress, setWeeklyProgress] = useState({
    calories: { current: 0, target: 14000 },
    protein: { current: 0, target: 700 },
    carbs: { current: 0, target: 1400 },
    fat: { current: 0, target: 466 },
    fiber: { current: 0, target: 175 },
  });

  const [todayMeals, setTodayMeals] = useState({
    lunch: null,
    dinner: null,
    focus: { labels: [], deficits: [] },
    calorie_targets: null,
    remaining: null,
    generated_at: null,
  });

  const [recentLogs, setRecentLogs] = useState([]);
  const [preferences, setPreferences] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [errors, setErrors] = useState({});
  const [showManualLog, setShowManualLog] = useState(false);
  const getDefaultManualMeal = () => {
    const now = new Date();
    return {
      meal_name: "",
      meal_type: "lunch",
      description: "",
      approximate_weight: "",
      meal_date: now.toISOString().split("T")[0],
      meal_time: now.toTimeString().slice(0, 5),
    };
  };

  const [manualMeal, setManualMeal] = useState(getDefaultManualMeal());
  const [isManualSubmitting, setIsManualSubmitting] = useState(false);
  const [isMealDetailOpen, setIsMealDetailOpen] = useState(false);
  const [mealDetail, setMealDetail] = useState(null);
  const [nutritionDraft, setNutritionDraft] = useState({});
  const [isMealDetailLoading, setIsMealDetailLoading] = useState(false);
  const [isSavingOverrides, setIsSavingOverrides] = useState(false);
  const [expandedSections, setExpandedSections] = useState(() =>
    NUTRIENT_SECTIONS.map((section) => section.label === "Macronutrients"),
  );

  // History modal & paging state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyMeals, setHistoryMeals] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [historyHasMore, setHistoryHasMore] = useState(true);

  const showError = (key, message) => {
    setErrors((prev) => ({ ...prev, [key]: message }));
  };

  const clearError = (key) => {
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const activeError = Object.values(errors)[0] || null;

  // Load initial data
  useEffect(() => {
    loadNutritionProgress();
    loadRecentMeals();
    loadPreferences();
  }, []);

  const loadNutritionProgress = async () => {
    try {
      const response = await fetch(`${API_BASE}/nutrition/progress`);
      if (!response.ok) {
        throw new Error("Failed to load nutrition progress");
      }
      const progress = await response.json();
      setWeeklyProgress(progress);
      clearError("progress");
    } catch (error) {
      console.error("Error loading nutrition progress:", error);
      showError("progress", "Could not load nutrition progress");
    }
  };

  const loadRecentMeals = async () => {
    try {
      const response = await fetch(`${API_BASE}/meals/log?limit=5`);
      if (!response.ok) {
        throw new Error("Failed to load recent meals");
      }
      const meals = await response.json();
      setRecentLogs(meals);
      clearError("recentMeals");
    } catch (error) {
      console.error("Error loading recent meals:", error);
      showError("recentMeals", "Could not load recent meals");
    }
  };

  const loadPreferences = async () => {
    try {
      const response = await fetch(`${API_BASE}/preferences`);
      if (!response.ok) {
        throw new Error("Failed to load preferences");
      }
      const prefs = await response.json();
      setPreferences(prefs);
      clearError("preferences");
    } catch (error) {
      console.error("Error loading preferences:", error);
      showError("preferences", "Could not load preferences");
    }
  };

  const generateMealSuggestions = async () => {
    setIsGenerating(true);
    clearError("generate");
    try {
      const response = await fetch(
        `${API_BASE}/meals/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            weeklyProgress,
            preferences: preferences.preferred_ingredients || [],
            restrictions: preferences.dietary_restrictions || [],
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to generate meals");
      }

      const plan = await response.json();
      setTodayMeals({
        lunch: plan.lunch || null,
        dinner: plan.dinner || null,
        focus: plan.focus || { labels: [], deficits: [] },
        calorie_targets: plan.calorie_targets || null,
        remaining: plan.remaining || null,
        generated_at: plan.generated_at || null,
      });
      clearError("generate");
    } catch (error) {
      console.error("Error generating meals:", error);
      showError("generate", "Could not generate meal suggestions");
    } finally {
      setIsGenerating(false);
    }
  };

  const sanitizeNutrition = (raw) => {
    const safe = {};
    if (!raw) return safe;
    Object.entries(raw).forEach(([key, value]) => {
      const numeric = Number(value);
      if (!Number.isNaN(numeric)) {
        safe[key] = numeric;
      }
    });
    return safe;
  };

  const logMeal = async (meal, mealType) => {
    try {
      const resolvedType = meal.meal_type || mealType;
      const nutrition = sanitizeNutrition(meal.nutrition);
      if (!Number.isFinite(nutrition.calories) && Number.isFinite(meal.calories)) {
        nutrition.calories = Number(meal.calories);
      }
      const notesSegments = ["AI plan suggestion"];
      if (Array.isArray(meal.ingredients) && meal.ingredients.length) {
        notesSegments.push(`Ingredients: ${meal.ingredients.join(", ")}`);
      }
      if (Array.isArray(meal.instructions) && meal.instructions.length) {
        notesSegments.push(
          `Instructions: ${meal.instructions.slice(0, 3).join(" | ")}`,
        );
      }
      const response = await fetch(`${API_BASE}/meals/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meal_name: meal.name,
          meal_type: resolvedType,
          calories: Number(meal.calories ?? nutrition.calories ?? 0),
          nutrition,
          was_suggested: true,
          notes: notesSegments.join("\n"),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to log meal");
      }

      // Refresh data after logging
      loadNutritionProgress();
      loadRecentMeals();
      clearError("logMeal");
    } catch (error) {
      console.error("Error logging meal:", error);
      showError("logMeal", "Could not log meal");
    }
  };

  const deleteMeal = async (log) => {
    try {
      const confirmed = window.confirm(
        `Delete "${log.meal}" logged on ${log.date || "today"} at ${log.time}?`,
      );
      if (!confirmed) return;
      const response = await fetch(`${API_BASE}/meals/log/${log.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete meal");
      }
      // Refresh after delete
      loadNutritionProgress();
      loadRecentMeals();
      if (isMealDetailOpen && mealDetail?.id === log.id) {
        closeMealDetail();
      }
    } catch (error) {
      console.error("Error deleting meal:", error);
      showError("deleteMeal", "Could not delete meal");
    }
  };

  // History helpers
  const openHistory = async () => {
    setIsHistoryOpen(true);
    setHistoryMeals([]);
    setHistoryOffset(0);
    setHistoryHasMore(true);
    await loadMoreHistory(true);
  };

  const closeHistory = () => setIsHistoryOpen(false);

  const loadMoreHistory = async (reset = false) => {
    if (historyLoading) return;
    setHistoryLoading(true);
    const pageSize = 20;
    const offset = reset ? 0 : historyOffset;
    try {
      const response = await fetch(
        `${API_BASE}/meals/log?limit=${pageSize}&days=36500&offset=${offset}`,
      );
      if (!response.ok) throw new Error("Failed to load history");
      const rows = await response.json();
      setHistoryMeals((prev) => (reset ? rows : [...prev, ...rows]));
      setHistoryOffset(offset + rows.length);
      setHistoryHasMore(rows.length === pageSize);
      clearError("history");
    } catch (error) {
      console.error("Error loading history:", error);
      showError("history", "Could not load meal history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleManualSubmit = async (event) => {
    event.preventDefault();
    if (
      !manualMeal.meal_name ||
      !manualMeal.description ||
      !manualMeal.approximate_weight
    ) {
      showError(
        "manualLog",
        "Meal name, description, and portion size are required",
      );
      return;
    }
    setIsManualSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/meals/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meal_name: manualMeal.meal_name,
          meal_type: manualMeal.meal_type,
          description: manualMeal.description,
          approximate_weight: manualMeal.approximate_weight,
          meal_date: manualMeal.meal_date,
          meal_time: manualMeal.meal_time,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to log manual meal");
      }

      setManualMeal(getDefaultManualMeal());
      setShowManualLog(false);
      clearError("manualLog");
      loadNutritionProgress();
      loadRecentMeals();
    } catch (error) {
      console.error("Error logging manual meal:", error);
      showError("manualLog", "Could not log manual meal");
    } finally {
      setIsManualSubmitting(false);
    }
  };

  const formatNumber = (value) => {
    if (value === null || value === undefined || value === "") return "—";
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return "—";
    return numeric % 1 === 0 ? numeric.toString() : numeric.toFixed(1);
  };

  const renderMealCard = (meal, label, targetCalories) => {
    if (!meal) return null;
    const nutrition = meal.nutrition || {};
    const ingredients = meal.ingredients || [];
    const instructions = meal.instructions || [];
    const macroMetrics = [
      { key: "calories", label: "Calories", unit: "kcal" },
      { key: "protein", label: "Protein", unit: "g" },
      { key: "carbs", label: "Carbs", unit: "g" },
      { key: "fat", label: "Fat", unit: "g" },
      { key: "fiber", label: "Fiber", unit: "g" },
    ];
    const prepTime = meal.prepTime ?? meal.prep_time ?? meal.cooking_time ?? 30;

    return (
      <div className="border border-gray-100 dark:border-gray-700 rounded-2xl p-4 bg-gray-50 dark:bg-gray-900/40">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {label}
            </p>
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white">
              {meal.name}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {meal.description}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Calories</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {formatNumber(nutrition.calories ?? meal.calories)} kcal
            </p>
            {targetCalories && (
              <p className="text-xs text-gray-400">
                Target ~{formatNumber(targetCalories)} kcal
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Prep time: {formatNumber(prepTime)} min
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
              Ingredients
            </h5>
            <ul className="space-y-1 max-h-40 overflow-y-auto pr-1">
              {ingredients.map((item, idx) => (
                <li
                  key={`${label}-ingredient-${idx}`}
                  className="text-sm text-gray-600 dark:text-gray-300"
                >
                  • {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
              Instructions
            </h5>
            <ol className="space-y-1 max-h-40 overflow-y-auto pr-1 list-decimal list-inside text-sm text-gray-600 dark:text-gray-300">
              {instructions.map((step, idx) => (
                <li key={`${label}-step-${idx}`}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
          <div className="flex flex-wrap gap-2">
            {macroMetrics.map(({ key, label: macroLabel, unit }) => (
              <div
                key={`${meal.name}-${key}`}
                className="px-3 py-1 rounded-full bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
              >
                {macroLabel}: {formatNumber(nutrition[key])} {unit}
              </div>
            ))}
          </div>
          <button
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-semibold hover:opacity-90"
            onClick={() => logMeal(meal, label.toLowerCase())}
          >
            Log {label}
          </button>
        </div>
      </div>
    );
  };

  const openMealDetail = async (logId) => {
    setIsMealDetailOpen(true);
    setIsMealDetailLoading(true);
    try {
      const response = await fetch(`${API_BASE}/meals/log/${logId}`);
      if (!response.ok) {
        throw new Error("Failed to load meal detail");
      }
      const detail = await response.json();
      setMealDetail(detail);
      const initialDraft = {};
      if (detail.override_nutrition) {
        Object.entries(detail.override_nutrition).forEach(([key, value]) => {
          initialDraft[key] = value !== undefined && value !== null ? String(value) : "";
        });
      }
      setNutritionDraft(initialDraft);
      clearError("mealDetail");
    } catch (error) {
      console.error("Error loading meal detail:", error);
      showError("mealDetail", "Could not load meal detail");
      setIsMealDetailOpen(false);
    } finally {
      setIsMealDetailLoading(false);
    }
  };

  const closeMealDetail = () => {
    setIsMealDetailOpen(false);
    setMealDetail(null);
    setNutritionDraft({});
    clearError("mealDetail");
  };

  const handleNutritionDraftChange = (key, value) => {
    setNutritionDraft((prev) => ({ ...prev, [key]: value }));
  };

  const getPreviewValue = (key) => {
    if (nutritionDraft[key] !== undefined && nutritionDraft[key] !== "") {
      const parsed = Number(nutritionDraft[key]);
      return Number.isNaN(parsed) ? undefined : parsed;
    }
    if (mealDetail?.override_nutrition?.[key] !== undefined) {
      return mealDetail.override_nutrition[key];
    }
    return mealDetail?.nutrition?.[key];
  };

  const toggleSection = (index) => {
    setExpandedSections((prev) =>
      prev.map((val, idx) => (idx === index ? !val : val)),
    );
  };

  const saveNutritionOverrides = async () => {
    if (!mealDetail) return;
    setIsSavingOverrides(true);
    try {
      const overrides = {};
      Object.entries(nutritionDraft).forEach(([key, value]) => {
        if (value !== "" && value !== undefined) {
          const parsed = Number(value);
          if (!Number.isNaN(parsed)) {
            overrides[key] = parsed;
          }
        }
      });
      const response = await fetch(`${API_BASE}/meals/log/${mealDetail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ override_nutrition: overrides }),
      });
      if (!response.ok) {
        throw new Error("Failed to save overrides");
      }
      const updated = await response.json();
      setMealDetail(updated);
      const newDraft = {};
      if (updated.override_nutrition) {
        Object.entries(updated.override_nutrition).forEach(([key, value]) => {
          newDraft[key] = value !== undefined && value !== null ? String(value) : "";
        });
      }
      setNutritionDraft(newDraft);
      clearError("mealDetail");
      loadNutritionProgress();
      loadRecentMeals();
    } catch (error) {
      console.error("Error saving overrides:", error);
      showError("mealDetail", "Could not save overrides");
    } finally {
      setIsSavingOverrides(false);
    }
  };

  // Meal generation is triggered manually via the UI button

  const getProgressPercentage = (current, target) => {
    return Math.min((current / target) * 100, 100);
  };

  const getProgressColor = (percentage) => {
    if (percentage < 50) return "bg-red-500";
    if (percentage < 80) return "bg-yellow-500";
    return "bg-green-500";
  };

  const focusDeficits = todayMeals.focus?.deficits || [];
  const focusLabels = todayMeals.focus?.labels || [];

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <GlobalStyles />

      {activeError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 mx-4 mt-4 rounded-2xl">
          {activeError}
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 gradient-royal-indigo rounded-3xl flex items-center justify-center">
                <ChefHat size={20} className="text-white" />
              </div>
              <span className="font-barlow text-xl font-semibold text-black dark:text-white">
                Food God
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-3xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                <Settings size={16} />
                <span className="font-inter text-sm font-medium">
                  Preferences
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Weekly Progress */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Meal Plan */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="font-barlow text-xl font-semibold text-black dark:text-white">
                    AI Meal Plan
                  </h3>
                  <RefreshCw size={20} className="text-gray-500" />
                </div>
                <button
                  onClick={generateMealSuggestions}
                  disabled={isGenerating}
                  className="px-4 py-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-500 text-white text-sm font-semibold disabled:opacity-60"
                >
                  {isGenerating
                    ? "Generating..."
                    : todayMeals.lunch || todayMeals.dinner
                      ? "Regenerate"
                      : "Generate plan"}
                </button>
              </div>
              {focusLabels.length > 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  Focusing on: {focusLabels.join(", ")}
                </p>
              )}
              {focusDeficits.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                  {focusDeficits.map((deficit) => (
                    <div
                      key={deficit.key}
                      className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700"
                    >
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                        {deficit.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatNumber(deficit.remaining)} {deficit.unit} remaining
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {isGenerating && (
                <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                  <RefreshCw size={16} className="animate-spin" />
                  Crunching nutrient data...
                </div>
              )}
              {(todayMeals.lunch || todayMeals.dinner) && (
                <div className="space-y-4">
                  {renderMealCard(
                    todayMeals.lunch,
                    "Lunch",
                    todayMeals.calorie_targets?.lunch,
                  )}
                  {renderMealCard(
                    todayMeals.dinner,
                    "Dinner",
                    todayMeals.calorie_targets?.dinner,
                  )}
                </div>
              )}
              {!todayMeals.lunch && !todayMeals.dinner && !isGenerating && (
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Click "Generate plan" to get lunch and dinner ideas tailored to your
                  biggest nutrient gaps this week.
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="font-barlow text-xl font-semibold text-black dark:text-white">
                    Weekly Nutrition Progress
                  </h2>
                  <Target size={20} className="text-gray-500" />
                </div>
                <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-3xl text-xs font-inter">
                  This Week
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(weeklyProgress)
                  .filter(([nutrient, data]) => data.category === "macro")
                  .map(([nutrient, data]) => {
                    const percentage = getProgressPercentage(
                      data.current,
                      data.target,
                    );
                    const colorClass = getProgressColor(percentage);
                    const displayName =
                      data.name ||
                      nutrient.charAt(0).toUpperCase() + nutrient.slice(1);

                    return (
                      <div
                        key={nutrient}
                        className="p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-inter text-sm font-medium text-gray-700 dark:text-gray-300">
                            {displayName}
                          </span>
                          <span className="font-inter text-xs text-gray-500">
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-2">
                          <div
                            className={`${colorClass} h-2 rounded-full transition-all duration-300`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-inter text-xs text-gray-600 dark:text-gray-400">
                            {data.current} {data.unit}
                          </span>
                          <span className="font-inter text-xs text-gray-500">
                            / {data.target} {data.unit}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Detailed Nutrition Tracking */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-barlow text-xl font-semibold text-black dark:text-white">
                  Detailed Nutrition Tracking
                </h2>
                <div className="flex gap-2">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-xl text-xs font-inter">
                    On Track
                  </span>
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-xl text-xs font-inter">
                    Below Target
                  </span>
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded-xl text-xs font-inter">
                    Need Attention
                  </span>
                </div>
              </div>

              {/* Vitamins Section */}
              <div className="mb-8">
                <h3 className="font-barlow text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                  Vitamins
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Object.entries(weeklyProgress)
                    .filter(([nutrient, data]) => data.category === "vitamin")
                    .map(([nutrient, data]) => {
                      const percentage = getProgressPercentage(
                        data.current,
                        data.target,
                      );
                      const statusColor =
                        percentage >= 80
                          ? "bg-green-500"
                          : percentage >= 50
                            ? "bg-yellow-500"
                            : "bg-red-500";

                      return (
                        <div
                          key={nutrient}
                          className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className={`w-2 h-2 ${statusColor} rounded-full`}
                            ></div>
                            <span className="font-inter text-xs font-medium text-gray-700 dark:text-gray-300">
                              {data.name}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-inter text-xs text-gray-600 dark:text-gray-400">
                                {data.current.toFixed(1)} {data.unit}
                              </span>
                              <span className="font-inter text-xs text-gray-500">
                                {percentage.toFixed(0)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1">
                              <div
                                className={`${statusColor} h-1 rounded-full transition-all duration-300`}
                                style={{
                                  width: `${Math.min(percentage, 100)}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Minerals Section */}
              <div className="mb-8">
                <h3 className="font-barlow text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                  Minerals
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Object.entries(weeklyProgress)
                    .filter(([nutrient, data]) => data.category === "mineral")
                    .map(([nutrient, data]) => {
                      const percentage = data.isLimit
                        ? Math.min((data.current / data.target) * 100, 100)
                        : getProgressPercentage(data.current, data.target);
                      const statusColor = data.isLimit
                        ? percentage <= 80
                          ? "bg-green-500"
                          : percentage <= 100
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        : percentage >= 80
                          ? "bg-green-500"
                          : percentage >= 50
                            ? "bg-yellow-500"
                            : "bg-red-500";

                      return (
                        <div
                          key={nutrient}
                          className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className={`w-2 h-2 ${statusColor} rounded-full`}
                            ></div>
                            <span className="font-inter text-xs font-medium text-gray-700 dark:text-gray-300">
                              {data.name}
                              {data.isLimit && (
                                <span className="text-red-500 ml-1">⚠</span>
                              )}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-inter text-xs text-gray-600 dark:text-gray-400">
                                {data.current.toFixed(1)} {data.unit}
                              </span>
                              <span className="font-inter text-xs text-gray-500">
                                {percentage.toFixed(0)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1">
                              <div
                                className={`${statusColor} h-1 rounded-full transition-all duration-300`}
                                style={{
                                  width: `${Math.min(percentage, 100)}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Lipids & Other Nutrients Section */}
              <div>
                <h3 className="font-barlow text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                  <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                  Lipids & Other Nutrients
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Object.entries(weeklyProgress)
                    .filter(([nutrient, data]) =>
                      ["lipid", "carb"].includes(data.category),
                    )
                    .map(([nutrient, data]) => {
                      const percentage = data.isLimit
                        ? Math.min((data.current / data.target) * 100, 100)
                        : getProgressPercentage(data.current, data.target);
                      const statusColor = data.isLimit
                        ? percentage <= 80
                          ? "bg-green-500"
                          : percentage <= 100
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        : percentage >= 80
                          ? "bg-green-500"
                          : percentage >= 50
                            ? "bg-yellow-500"
                            : "bg-red-500";

                      return (
                        <div
                          key={nutrient}
                          className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className={`w-2 h-2 ${statusColor} rounded-full`}
                            ></div>
                            <span className="font-inter text-xs font-medium text-gray-700 dark:text-gray-300">
                              {data.name}
                              {data.isLimit && (
                                <span className="text-red-500 ml-1">⚠</span>
                              )}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-inter text-xs text-gray-600 dark:text-gray-400">
                                {data.current.toFixed(1)} {data.unit}
                              </span>
                              <span className="font-inter text-xs text-gray-500">
                                {percentage.toFixed(0)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1">
                              <div
                                className={`${statusColor} h-1 rounded-full transition-all duration-300`}
                                style={{
                                  width: `${Math.min(percentage, 100)}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity & Quick Actions */}
          <div className="space-y-6">
            {/* Quick Log Meal */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6">
              <h3 className="font-barlow text-lg font-semibold text-black dark:text-white mb-4">
                Quick Log
              </h3>
              <button
                onClick={() => setShowManualLog(true)}
                className="w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <Plus size={20} className="text-gray-600 dark:text-gray-300" />
                <span className="font-inter text-sm font-medium text-gray-700 dark:text-gray-300">
                  Log a meal manually
                </span>
              </button>
            </div>

            {/* Recent Meal Logs */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="font-barlow text-lg font-semibold text-black dark:text-white">
                    Recent Meals
                  </h3>
                  <Calendar size={16} className="text-gray-500" />
                </div>
                <button
                  onClick={openHistory}
                  className="font-inter text-xs px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
                >
                  View all
                </button>
              </div>

              <div className="space-y-3">
                {recentLogs.length > 0 ? (
                  recentLogs.map((log, index) => (
                    <div
                      key={index}
                      onClick={() => openMealDetail(log.id)}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-2xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <div className="text-right min-w-[80px]">
                        <div className="font-inter text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                          {log.day || ""}
                        </div>
                        <div className="font-inter text-xs text-gray-500 dark:text-gray-400">
                          {log.date || ""}
                        </div>
                        <div className="font-inter text-xs text-gray-700 dark:text-gray-300">
                          {log.time}
                        </div>
                      </div>
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle2 size={16} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-inter text-sm font-medium text-black dark:text-white">
                          {log.meal}
                        </div>
                        <div className="font-inter text-xs text-gray-500 dark:text-gray-400">
                          {log.type}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500"
                          title="Delete meal"
                          aria-label="Delete meal"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMeal(log);
                          }}
                        >
                          <Trash2 size={16} className="text-gray-500" />
                        </button>
                        <div className="text-right">
                        <div className="font-inter text-sm font-semibold text-black dark:text-white">
                          {log.calories}
                        </div>
                        <div className="font-inter text-xs text-gray-500 dark:text-gray-400">
                          cal
                        </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    <p className="font-inter text-sm">No recent meals logged</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
      {showManualLog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Log a meal
              </h3>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => {
                  setShowManualLog(false);
                  clearError("manualLog");
                }}
              >
                ✕
              </button>
            </div>
            {errors.manualLog && (
              <div className="bg-red-100 text-red-700 px-3 py-2 rounded-lg text-sm">
                {errors.manualLog}
              </div>
            )}
            <form className="space-y-4" onSubmit={handleManualSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Meal name
                </label>
                <input
                  type="text"
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={manualMeal.meal_name}
                  onChange={(e) =>
                    setManualMeal((prev) => ({ ...prev, meal_name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Meal type
                  </label>
                  <select
                    className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={manualMeal.meal_type}
                    onChange={(e) =>
                      setManualMeal((prev) => ({ ...prev, meal_type: e.target.value }))
                    }
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Portion / weight (free text)
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={manualMeal.approximate_weight}
                    onChange={(e) =>
                      setManualMeal((prev) => ({
                        ...prev,
                        approximate_weight: e.target.value,
                      }))
                    }
                    placeholder="e.g., ~350g bowl, 1 plate, 2 cups"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={manualMeal.meal_date}
                    onChange={(e) =>
                      setManualMeal((prev) => ({ ...prev, meal_date: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={manualMeal.meal_time}
                    onChange={(e) =>
                      setManualMeal((prev) => ({ ...prev, meal_time: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Description (ingredients, prep, sauces)
                </label>
                <textarea
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={4}
                  value={manualMeal.description}
                  onChange={(e) =>
                    setManualMeal((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="List key ingredients, cooking method, condiments, etc."
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-2xl text-sm text-gray-600 hover:text-gray-800"
                  onClick={() => {
                    setShowManualLog(false);
                    clearError("manualLog");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isManualSubmitting}
                  className="px-5 py-2 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-semibold disabled:opacity-60"
                >
                  {isManualSubmitting ? "Saving..." : "Save meal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isHistoryOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl w-full max-w-3xl mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Meal history</h3>
              <button className="text-gray-500 hover:text-gray-700" onClick={closeHistory}>
                ×
              </button>
            </div>
            {errors.history && (
              <div className="bg-red-100 text-red-700 px-3 py-2 rounded-lg text-sm">{errors.history}</div>
            )}
            <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
              {historyMeals.length > 0 ? (
                historyMeals.map((log, index) => (
                  <div
                    key={`${log.id}-${index}`}
                    onClick={() => {
                      openMealDetail(log.id);
                      closeHistory();
                    }}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-2xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="text-right min-w-[80px]">
                      <div className="font-inter text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                        {log.day || ""}
                      </div>
                      <div className="font-inter text-xs text-gray-500 dark:text-gray-400">
                        {log.date || ""}
                      </div>
                      <div className="font-inter text-xs text-gray-700 dark:text-gray-300">
                        {log.time}
                      </div>
                    </div>
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle2 size={16} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-inter text-sm font-medium text-black dark:text-white">
                        {log.meal}
                      </div>
                      <div className="font-inter text-xs text-gray-500 dark:text-gray-400">
                        {log.type}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500"
                        title="Delete meal"
                        aria-label="Delete meal"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMeal(log);
                        }}
                      >
                        <Trash2 size={16} className="text-gray-500" />
                      </button>
                      <div className="text-right">
                        <div className="font-inter text-sm font-semibold text-black dark:text-white">{log.calories}</div>
                        <div className="font-inter text-xs text-gray-500 dark:text-gray-400">cal</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  <p className="font-inter text-sm">No meal history</p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between pt-2">
              <button
                className="px-4 py-2 rounded-2xl text-sm text-gray-600 hover:text-gray-800"
                onClick={closeHistory}
              >
                Close
              </button>
              {historyHasMore && (
                <button
                  onClick={() => loadMoreHistory(false)}
                  disabled={historyLoading}
                  className="px-5 py-2 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-60"
                >
                  {historyLoading ? "Loading..." : "Load more"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isMealDetailOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl w-full max-w-2xl mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Meal details
              </h3>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={closeMealDetail}
              >
                ×
              </button>
            </div>
            {errors.mealDetail && (
              <div className="bg-red-100 text-red-700 px-3 py-2 rounded-lg text-sm">
                {errors.mealDetail}
              </div>
            )}
            {isMealDetailLoading ? (
              <div className="text-center py-6 text-gray-500">Loading...</div>
            ) : mealDetail ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-xl font-semibold text-gray-900 dark:text-white">
                      {mealDetail.meal_name}
                    </p>
                    {Boolean(mealDetail.was_suggested) ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-200">
                        AI generated
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                        Manual entry
                      </span>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {mealDetail.meal_type?.toUpperCase()} ·{" "}
                      {mealDetail.meal_date} · {mealDetail.meal_time}
                    </p>
                    {mealDetail.notes && (
                      <p className="text-xs text-gray-500 mt-1">{mealDetail.notes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Calories (current)
                    </p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {formatNumber(getPreviewValue("calories"))} kcal
                    </p>
                  </div>
                </div>
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {NUTRIENT_SECTIONS.map((section, index) => (
                    <div
                      key={section.label}
                      className="border border-gray-200 dark:border-gray-700 rounded-2xl"
                    >
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-4 py-2 text-left"
                        onClick={() => toggleSection(index)}
                      >
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                          {section.label}
                        </span>
                        <span className="text-xs text-gray-500">
                          {expandedSections[index] ? "Hide" : "Show"}
                        </span>
                      </button>
                      {expandedSections[index] && (
                        <div className="space-y-3 px-4 pb-4">
                          {section.keys.map(({ key, label, unit }) => {
                            const originalValue = mealDetail.nutrition?.[key];
                            const overrideValue =
                              mealDetail.override_nutrition?.[key];
                            const previewValue = getPreviewValue(key);
                            return (
                              <div
                                key={key}
                                className="border border-gray-100 dark:border-gray-700 rounded-xl p-3"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                      {label}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Original: {formatNumber(originalValue)} {unit}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Current: {formatNumber(previewValue)} {unit}
                                    </p>
                                    {overrideValue !== undefined && (
                                      <p className="text-[11px] text-indigo-500">
                                        Override saved: {formatNumber(overrideValue)}{" "}
                                        {unit}
                                      </p>
                                    )}
                                  </div>
                                  <div className="w-28">
                                    <input
                                      type="number"
                                      step="any"
                                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-2 py-1 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                      value={nutritionDraft[key] ?? ""}
                                      onChange={(e) =>
                                        handleNutritionDraftChange(key, e.target.value)
                                      }
                                      placeholder={
                                        overrideValue !== undefined
                                          ? String(overrideValue)
                                          : ""
                                      }
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="text-xs text-gray-500">
                  Clearing a field returns it to the original suggested value.
                </div>
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    className="text-sm text-gray-600 hover:text-gray-800"
                    onClick={() => setNutritionDraft({})}
                  >
                    Remove overrides
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="px-4 py-2 rounded-2xl text-sm text-gray-600 hover:text-gray-800"
                      onClick={closeMealDetail}
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      disabled={isSavingOverrides}
                      className="px-5 py-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-500 text-white text-sm font-semibold disabled:opacity-60"
                      onClick={saveNutritionOverrides}
                    >
                      {isSavingOverrides ? "Saving..." : "Save overrides"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-6 text-gray-500">
                Meal detail unavailable.
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
