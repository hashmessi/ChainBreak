"""
ChainBreak — FastAPI Backend

API routes:
  GET  /api/scenarios          → list all scenarios
  POST /api/run                → run a single scenario (baseline or protected)
  POST /api/counterfactual     → run both modes and return comparison
  POST /api/evaluate           → run all scenarios and return metrics
  GET  /api/health             → health check
"""

import os
import sys
import time
from pathlib import Path

# Ensure backend directory is in sys.path
_backend_dir = str(Path(__file__).resolve().parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load .env from backend/ or project root before importing engine modules
load_dotenv(Path(_backend_dir) / ".env")
load_dotenv(Path(_backend_dir).parent / ".env")

try:
    from engine.models import (
        Decision, RunMode, RunRequest,
        CounterfactualResult, EvaluationReport
    )
    from engine.runner import run_scenario, run_counterfactual
    from scenarios import get_scenario, get_all_scenarios
except ImportError:
    from backend.engine.models import (
        Decision, RunMode, RunRequest,
        CounterfactualResult, EvaluationReport
    )
    from backend.engine.runner import run_scenario, run_counterfactual
    from backend.scenarios import get_scenario, get_all_scenarios


import logging

_START_TIME = time.time()

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("chainbreak")


# ─── App Setup ────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("ChainBreak production engine starting up on environment: %s", os.getenv("ENVIRONMENT", "production"))
    yield
    logger.info("ChainBreak engine shutting down gracefully.")


app = FastAPI(
    title="ChainBreak API",
    description="Runtime AI agent security invariant enforcement",
    version="1.0.0",
    lifespan=lifespan,
)

allowed_origins_raw = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = [o.strip() for o in allowed_origins_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "product": "ChainBreak",
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "production"),
        "uptime_seconds": round(time.time() - _START_TIME, 2),
        "database": "in-memory (deterministic causal invariant graph)",
        "openrouter_configured": bool(
            os.getenv("OPENROUTER_API_KEY", "").startswith("sk-or")
        ),
    }


@app.get("/api/scenarios")
async def list_scenarios():
    scenarios = get_all_scenarios()
    return {"scenarios": [s.model_dump() for s in scenarios]}


@app.post("/api/run")
async def run_single(request: RunRequest):
    """
    Run a single scenario in either BASELINE or PROTECTED mode.
    Returns the full chain state including all action events.
    """
    try:
        scenario = get_scenario(request.scenario_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))

    state = await run_scenario(scenario, request.run_mode)
    return state.model_dump()


@app.post("/api/counterfactual/{scenario_id}")
async def counterfactual(scenario_id: str):
    """
    Run both BASELINE and PROTECTED for the given scenario.
    Returns side-by-side proof.
    """
    try:
        scenario = get_scenario(scenario_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))

    result = await run_counterfactual(scenario)
    return result.model_dump()


@app.post("/api/evaluate")
async def evaluate_all():
    """
    Run all scenarios in counterfactual mode and compute evaluation metrics.
    Returns EvaluationReport with detection_rate, prevention_rate, false_block_rate.
    """
    scenarios = get_all_scenarios()
    results: List[CounterfactualResult] = []
    total_latency = 0.0

    for scenario in scenarios:
        result = await run_counterfactual(scenario)
        results.append(result)
        total_latency += result.detection_latency_ms

    dangerous = [r for r in results if r.scenario.expected_result == Decision.BLOCK]
    safe = [r for r in results if r.scenario.expected_result == Decision.ALLOW]
    near_miss = [r for r in results if r.scenario.category == "near_miss"]
    failure = [r for r in results if r.scenario.category == "failure"]
    unknown = [r for r in results if r.scenario.category == "unknown_tool"]

    # Detection rate: dangerous scenarios where protected mode detected violation
    detection_count = sum(
        1 for r in dangerous
        if r.protected.invariant_status.value == "VIOLATED"
    )
    detection_rate = detection_count / len(dangerous) if dangerous else 0.0

    # Prevention rate: dangerous scenarios where attack was successfully blocked
    prevention_count = sum(1 for r in dangerous if r.correctly_blocked)
    prevention_rate = prevention_count / len(dangerous) if dangerous else 0.0

    # False block rate: safe scenarios that were incorrectly blocked
    false_block_count = sum(
        1 for r in safe
        if r.protected.final_decision == Decision.BLOCK
    )
    false_block_rate = false_block_count / len(safe) if safe else 0.0

    # False allow rate: dangerous scenarios that were incorrectly allowed
    false_allow_count = sum(
        1 for r in dangerous
        if r.protected.final_decision == Decision.ALLOW
    )
    false_allow_rate = false_allow_count / len(dangerous) if dangerous else 0.0

    # Hold rate: scenarios resulting in HOLD in protected mode
    hold_count = sum(
        1 for r in results
        if r.protected.final_decision == Decision.HOLD
    )
    hold_rate = hold_count / len(results) if results else 0.0

    avg_latency = total_latency / len(results) if results else 0.0

    report = EvaluationReport(
        total_scenarios=len(results),
        dangerous_scenarios=len(dangerous),
        safe_scenarios=len(safe),
        near_miss_scenarios=len(near_miss),
        failure_scenarios=len(failure),
        unknown_tool_scenarios=len(unknown),
        detection_rate=detection_rate,
        prevention_rate=prevention_rate,
        false_block_rate=false_block_rate,
        false_allow_rate=false_allow_rate,
        hold_rate=hold_rate,
        avg_latency_ms=avg_latency,
        results=results,
    )
    return report.model_dump()


# ─── Production Static Serving & SPA Fallback ──────────────────────────────────
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

_frontend_dist = Path(_backend_dir).parent / "frontend" / "dist"

if _frontend_dist.exists():
    _assets_dir = _frontend_dist / "assets"
    if _assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa_app(full_path: str):
        # Never swallow API routes with 404s
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="API route not found")

        target_file = _frontend_dist / full_path
        if full_path and target_file.is_file():
            return FileResponse(target_file)

        index_file = _frontend_dist / "index.html"
        if index_file.is_file():
            return FileResponse(index_file)

        raise HTTPException(status_code=404, detail="Frontend bundle not found")

