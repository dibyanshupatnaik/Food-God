## Food God Nutrition Planner

The web client now talks to a Python/FastAPI backend that keeps track of nutrition goals, meal logs, preferences, and AI-free meal suggestions tuned to your weekly targets.

### Backend (FastAPI) on Windows

1. Open PowerShell in the repo root and create/activate a virtual environment:
   ```powershell
   cd backend
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```
2. Install dependencies and launch FastAPI:
   ```powershell
   pip install -r requirements.txt
   uvicorn backend.app:app --reload
   ```

The backend stores its SQLite database under `backend/nutrition.db` (ignored by git). Set your OpenAI credentials before running:

Copy `.env.example` to `.env` and drop in your secrets (PowerShell syntax):

```powershell
Copy-Item .env.example .env
notepad .env   # edit the values
```

Populate `.env` with:

```
OPENAI_API_KEY=sk-your-key
OPENAI_MODEL=gpt-4o-mini   # optional override
```

It exposes routes under `/api`:

- `GET /api/nutrition/progress` - weekly nutrient progress and targets (calories, protein, fiber, cholesterol, vitamins, minerals)
- `POST/GET /api/meals/log` - log what you ate (all nutrient values) and fetch recent meals; future suggestions adapt to these logs
- `POST /api/meals/custom` - send a rough meal idea and the backend will complete the recipe + nutrition using OpenAI, saving it to your library
- `POST /api/meals/generate` - OpenAI-powered lunch/dinner ideas tuned to nutrient gaps, preferences, logged meals, and your saved recipes
- `GET/POST/PUT /api/preferences` - manage preferred ingredients, cooking time, complexity, and restrictions

### Web client (npm)

The React Router web app continues to call `/api/...` endpoints. Those server routes now proxy to the Python service. From a second PowerShell window:

```powershell
cd apps\web
npm install            # first time only
$env:PYTHON_API_BASE_URL="http://127.0.0.1:8000/api"   # optional override
$env:PYTHON_SERVER_ORIGIN="http://127.0.0.1:8000"      # optional (dev proxy)
$env:NEXT_PUBLIC_PYTHON_API_BASE_URL="http://127.0.0.1:8000/api"  # for browser fetches
npm run dev
```

If you leave `PYTHON_API_BASE_URL` unset, the proxy defaults to `http://127.0.0.1:8000/api`. With both processes running you can generate meals, log them, and watch the weekly dashboard update without any extra setup.
