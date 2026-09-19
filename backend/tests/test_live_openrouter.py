"""
Targeted Live Integration Test for OpenRouter
Validates that when OPENROUTER_API_KEY is supplied,
live semantic classification succeeds against OpenRouter API.
"""

import os
import pytest
from dotenv import load_dotenv, dotenv_values
import sys
from pathlib import Path
_backend_dir = str(Path(__file__).resolve().parent.parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from engine.classifier import classify_action
from engine.models import Sensitivity, DestinationType

@pytest.mark.asyncio
async def test_live_openrouter_classification():
    vals = dotenv_values(Path(_backend_dir) / ".env")
    if not vals:
        vals = dotenv_values(Path(_backend_dir).parent / ".env")
    key = vals.get("OPENROUTER_API_KEY")
    if not key or key.startswith("sk-or-v1-your-key"):
        pytest.skip("No live OPENROUTER_API_KEY provided")

    # Force using the live key for this specific test
    os.environ["OPENROUTER_API_KEY"] = key

    result = await classify_action(
        tool="read_customer_data",
        arguments={"customer_id": "cust_123", "fields": ["email", "ssn"]},
        timeout=15.0
    )

    assert result.classifier_error is None, f"Classifier error: {result.classifier_error}"
    assert result.data_sensitivity == Sensitivity.HIGH
    assert result.destination == DestinationType.INTERNAL
    assert result.confidence >= 0.5
