# ChainBreak Cloud Deployment Guide 🌐

This guide covers deploying **ChainBreak** to the cloud via **Render** (Recommended: Single-Service Unified Deployment) or **Vercel + Backend**.

---

## Architecture Overview

ChainBreak supports two cloud deployment models:

| Deployment Model | Frontend | Backend | Best For | CORS Config |
|---|---|---|---|---|
| **Option 1: Render (Recommended)** | Served from FastAPI ASGI | FastAPI on Uvicorn | Easiest, 1 single domain, 1 service | **None needed** (Same origin) |
| **Option 2: Vercel + Render/Railway** | Vercel Edge Network | Render Web Service | Custom domain for frontend | Rewrite rule or CORS origin |
| **Option 3: Docker Container** | Baked into container | Uvicorn ASGI | Any Cloud VM / ECS / Fly.io / GCP | **None needed** (Same origin) |

---

## Option 1: 1-Click Unified Deployment on Render (Recommended)

Render deploys both the compiled React frontend and the FastAPI backend in a single web service using our declarative Infrastructure-as-Code manifest ([render.yaml](file:///c:/Users/Hashvanth/chain-break-dev/ChainBreak/render.yaml)).

### Prerequisites
- A free account on [Render.com](https://render.com)
- Fork or push this repository to GitHub: `https://github.com/hashmessi/ChainBreak`
- An OpenRouter API key from [openrouter.ai](https://openrouter.ai) (optional for base fallback rules, recommended for live LLM semantic classification)

### Step-by-Step Instructions

1. **Log in to Render Dashboard:**
   - Go to [dashboard.render.com](https://dashboard.render.com/).

2. **Create New Blueprint:**
   - Click **New +** in the top right.
   - Select **Blueprint** (Infrastructure as Code).
   - Connect your GitHub repository: `hashmessi/ChainBreak`.

4. **Render Automatically Reads `render.yaml` & `.python-version`:**
   Render will parse `render.yaml` and `.python-version` to configure:
   - **Service Name:** `chainbreak-engine`
   - **Python Version:** `3.12.8` (pinned via [.python-version](file:///c:/Users/Hashvanth/chain-break-dev/ChainBreak/.python-version) and [runtime.txt](file:///c:/Users/Hashvanth/chain-break-dev/ChainBreak/runtime.txt))
   - **Build Command:**
     ```bash
     export CARGO_HOME=/tmp/cargo && npm --prefix frontend install && npm --prefix frontend run build && pip install --upgrade pip && pip install -r requirements.txt
     ```
   - **Start Command:**
     ```bash
     uvicorn backend.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Health Check Path:** `/api/health`

5. **Set Environment Variables in Render Dashboard:**
   Under the Environment Variables section in Render, confirm/add:
   - `PYTHON_VERSION`: `3.12.8` *(Critical: prevents Render from defaulting to experimental Python 3.14)*
   - `OPENROUTER_API_KEY`: Your OpenRouter key (e.g. `sk-or-v1-...`)
   - `OPENROUTER_MODEL`: `liquid/lfm-2.5-2.6b:free`
   - `ENVIRONMENT`: `production`

6. **Deploy:**
   - Click **Apply** or **Manual Deploy ➔ Clear build cache & deploy**.
   - Render will use Python 3.12.8, install pre-built wheels instantly with zero compilation, build the React SPA, start Uvicorn, and run healthchecks.
   - Once deployed, your app will be live at `https://chainbreak-engine.onrender.com`.

> [!NOTE]
> **Why Python 3.12?**
> Render's newest build images can default to experimental Python 3.14. Because packages with native extensions (such as `pydantic-core`) do not have pre-built wheels for Python 3.14 yet, `pip` attempts to compile Rust code via `maturin`, which fails on Render's read-only cargo directory. Pinning `PYTHON_VERSION=3.12.8` resolves this instantly by downloading pre-compiled binary wheels in 2 seconds.

---

## Option 2: Frontend on Vercel + Backend on Render

If you prefer hosting the React frontend on Vercel's Edge CDN while hosting the FastAPI backend on Render:

### Step 1: Deploy Backend to Render First
1. Create a **New +** ➔ **Web Service** on Render.
2. Connect `https://github.com/hashmessi/ChainBreak`.
3. Set:
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
4. Add Environment Variables:
   - `OPENROUTER_API_KEY`: `your-key`
   - `ALLOWED_ORIGINS`: `https://your-app.vercel.app,http://localhost:5173`
5. Note your backend URL (e.g., `https://chainbreak-api.onrender.com`).

### Step 2: Deploy Frontend to Vercel
1. Go to [vercel.com](https://vercel.com) and click **Add New...** ➔ **Project**.
2. Import the `hashmessi/ChainBreak` repository.
3. Vercel automatically detects [vercel.json](file:///c:/Users/Hashvanth/chain-break-dev/ChainBreak/vercel.json):
   - **Framework Preset:** `Vite`
   - **Root Directory:** `./`
   - **Build Command:** `cd frontend && npm install && npm run build`
   - **Output Directory:** `frontend/dist`
4. Add Environment Variable in Vercel:
   - `BACKEND_HOST`: `chainbreak-api.onrender.com` (your Render backend domain without `https://`)
5. Click **Deploy**.
   Vercel will proxy all `/api/*` requests directly to your Render backend via edge rewrites.

---

## Option 3: Docker Container Deployment (Railway, Fly.io, GCP, AWS)

ChainBreak includes an optimized multi-stage [Dockerfile](file:///c:/Users/Hashvanth/chain-break-dev/ChainBreak/Dockerfile).

```bash
# 1. Build and run locally with Docker
docker build -t chainbreak-engine .
docker run -d -p 8000:8000 -e OPENROUTER_API_KEY="your-key" chainbreak-engine

# 2. Or using Docker Compose
docker compose up --build -d
```

### Deploying with Fly.io
```bash
fly launch --name chainbreak-engine --dockerfile Dockerfile
fly secrets set OPENROUTER_API_KEY="your-key"
fly deploy
```

### Deploying with Railway
```bash
railway init
railway up
```

---

## Post-Deployment Automated Verification

Once your deployment is live on the cloud, run the built-in verification suite against your live URL:

```bash
# Replace with your deployed cloud domain:
DEPLOYMENT_URL="https://chainbreak-engine.onrender.com" python scripts/verify_deployment.py
```

The script will automatically execute all 8 verification protocols:
1. ✓ Verify build artifacts
2. ✓ Verify application startup & liveness
3. ✓ Verify frontend SPA serving
4. ✓ Verify backend scenario catalog (20 scenarios)
5. ✓ Verify state architecture (0 migrations required)
6. ✓ Verify critical API (`POST /api/counterfactual/S6`)
7. ✓ Verify AI flow & invariant enforcement
8. ✓ Execute the complete 20-scenario benchmark suite
