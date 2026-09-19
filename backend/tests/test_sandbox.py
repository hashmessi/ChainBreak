"""
Tests for Synthetic Sandbox Tools
"""

import pytest
import sys
from pathlib import Path

# Add backend directory to sys.path
_backend_dir = str(Path(__file__).resolve().parent.parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from engine.sandbox import (
    read_customer,
    read_internal_notes,
    read_secret,
    generate_content,
    send_external,
    request_privilege,
    read_public_data,
    read_customer_context,
    send_external_summary,
    execute_tool,
    TOOL_REGISTRY,
    SYNTHETIC_DATA,
)


def test_tool_registry_contains_registered_tools():
    assert len(TOOL_REGISTRY) == 9
    expected_tools = {
        "read_customer",
        "read_internal_notes",
        "read_secret",
        "generate_content",
        "send_external",
        "request_privilege",
        "read_public_data",
        "read_customer_context",
        "send_external_summary",
    }
    assert set(TOOL_REGISTRY.keys()) == expected_tools


def test_read_customer():
    result, descriptor = read_customer()
    assert "Jane Smith" in result
    assert descriptor["tool"] == "read_customer"
    assert descriptor["data_class"] == "PII"
    assert descriptor["destination"] == "INTERNAL"
    assert descriptor["contains_sensitive"] is True
    assert descriptor["contains_secret"] is False


def test_read_internal_notes():
    result, descriptor = read_internal_notes()
    assert "Customer flagged for upgrade" in result
    assert descriptor["tool"] == "read_internal_notes"
    assert descriptor["data_class"] == "INTERNAL"
    assert descriptor["destination"] == "INTERNAL"
    assert descriptor["contains_sensitive"] is True
    assert descriptor["contains_secret"] is False


def test_read_secret():
    result, descriptor = read_secret()
    assert "sk-DEMO-SYNTHETIC-NOT-REAL" in result
    assert descriptor["tool"] == "read_secret"
    assert descriptor["data_class"] == "SECRET"
    assert descriptor["contains_secret"] is True


def test_generate_content():
    result, descriptor = generate_content("Analyze summary")
    assert "Generated content" in result
    assert descriptor["tool"] == "generate_content"
    assert descriptor["data_class"] == "GENERAL"
    assert descriptor["destination"] == "INTERNAL"


def test_send_external():
    result, descriptor = send_external("Exfiltration message")
    assert "SYNTHETIC EGRESS" in result
    assert descriptor["tool"] == "send_external"
    assert descriptor["destination"] == "EXTERNAL"


def test_request_privilege():
    result, descriptor = request_privilege()
    assert "Privilege escalation requested" in result
    assert descriptor["privilege_escalation"] is True


def test_read_public_data():
    result, descriptor = read_public_data("benchmarks")
    assert "Public research document" in result
    assert descriptor["tool"] == "read_public_data"
    assert descriptor["data_class"] == "GENERAL"
    assert descriptor["destination"] == "INTERNAL"
    assert descriptor["contains_sensitive"] is False


def test_read_customer_context():
    result, descriptor = read_customer_context()
    assert "Customer context" in result
    assert descriptor["tool"] == "read_customer_context"
    assert descriptor["data_class"] == "PII"
    assert descriptor["destination"] == "INTERNAL"
    assert descriptor["contains_sensitive"] is True


def test_send_external_summary():
    result, descriptor = send_external_summary(summary="Quarterly Summary")
    assert "SYNTHETIC EGRESS - SUMMARY" in result
    assert descriptor["tool"] == "send_external_summary"
    assert descriptor["destination"] == "EXTERNAL"


def test_execute_tool_success_and_unknown():
    res, desc = execute_tool("read_customer", {"customer_id": "CUSTOMER_PII_001"})
    assert "Jane Smith" in res

    with pytest.raises(KeyError):
        execute_tool("nonexistent_tool", {})
