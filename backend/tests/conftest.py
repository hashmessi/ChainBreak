import os
import pytest

@pytest.fixture(autouse=True)
def disable_external_openrouter_in_unit_tests(monkeypatch):
    """
    Ensure unit tests run deterministically without hitting external OpenRouter APIs.
    """
    monkeypatch.setenv("OPENROUTER_API_KEY", "")
