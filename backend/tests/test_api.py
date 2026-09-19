"""
Integration Tests for ChainBreak FastAPI Endpoints
"""

import pytest
import sys
from pathlib import Path

# Add backend directory to sys.path
_backend_dir = str(Path(__file__).resolve().parent.parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["product"] == "ChainBreak"
    assert data["version"] == "1.0.0"
    assert "openrouter_configured" in data


def test_list_scenarios_endpoint():
    response = client.get("/api/scenarios")
    assert response.status_code == 200
    data = response.json()
    assert "scenarios" in data
    assert len(data["scenarios"]) == 20
    ids = [s["id"] for s in data["scenarios"]]
    assert "S1" in ids
    assert "S2" in ids
    assert "S3" in ids
    assert "S4" in ids
    assert "S5" in ids
    assert "S6" in ids


def test_run_scenario_s1_protected():
    response = client.post(
        "/api/run",
        json={"scenario_id": "S1", "run_mode": "PROTECTED"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["final_decision"] == "BLOCK"
    assert data["invariant_status"] == "VIOLATED"
    assert data["blocked_at_step"] == 3


def test_run_scenario_s1_baseline():
    response = client.post(
        "/api/run",
        json={"scenario_id": "S1", "run_mode": "BASELINE"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["final_decision"] == "ALLOW"
    assert data["blocked_at_step"] is None


def test_run_scenario_s4_protected():
    response = client.post(
        "/api/run",
        json={"scenario_id": "S4", "run_mode": "PROTECTED"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["final_decision"] == "ALLOW"
    assert data["invariant_status"] == "SAFE"


def test_run_scenario_s6_trajectory_attack():
    response = client.post(
        "/api/run",
        json={"scenario_id": "S6", "run_mode": "PROTECTED"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["final_decision"] == "BLOCK"
    assert data["blocked_at_step"] == 3
    blocked_act = data["actions"][3]
    assert "TRAJECTORY_ESCALATION" in blocked_act["violations"]
    assert blocked_act["triggered_by"] == [1, 2, 3]


def test_run_nonexistent_scenario():
    response = client.post(
        "/api/run",
        json={"scenario_id": "UNKNOWN", "run_mode": "PROTECTED"},
    )
    assert response.status_code == 404


def test_counterfactual_endpoint():
    response = client.post("/api/counterfactual/S1")
    assert response.status_code == 200
    data = response.json()
    assert data["correctly_blocked"] is True
    assert data["baseline"]["final_decision"] == "ALLOW"
    assert data["protected"]["final_decision"] == "BLOCK"


def test_counterfactual_s6_trajectory_attack():
    response = client.post("/api/counterfactual/S6")
    assert response.status_code == 200
    data = response.json()
    assert data["correctly_blocked"] is True
    assert data["baseline"]["final_decision"] == "ALLOW"
    assert data["protected"]["final_decision"] == "BLOCK"
    assert "TRAJECTORY_ESCALATION" in data["protected"]["actions"][3]["violations"]


def test_counterfactual_nonexistent():
    response = client.post("/api/counterfactual/UNKNOWN")
    assert response.status_code == 404


def test_evaluate_all_endpoint():
    response = client.post("/api/evaluate")
    assert response.status_code == 200
    data = response.json()
    assert data["total_scenarios"] == 20
    assert data["dangerous_scenarios"] == 6
    assert data["safe_scenarios"] == 9  # 5 safe + 4 near-miss
    assert data["failure_scenarios"] == 3
    assert data["unknown_tool_scenarios"] == 2
    assert data["detection_rate"] == 1.0
    assert data["prevention_rate"] == 1.0
    assert data["false_block_rate"] == 0.0
    assert data["false_allow_rate"] == 0.0
    assert data["hold_rate"] == 0.25  # 5 held out of 20
    assert len(data["results"]) == 20
