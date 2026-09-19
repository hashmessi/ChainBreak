"""
Tests for Deterministic Security Invariants and State Lineage
"""

import pytest
import sys
from pathlib import Path

# Add backend directory to sys.path
_backend_dir = str(Path(__file__).resolve().parent.parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from engine.models import (
    ActionEvent,
    ChainState,
    Decision,
    InvariantId,
    InvariantStatus,
    DestinationType,
    DataClass,
    Sensitivity,
    PrivilegeLevel,
    RunMode,
    SemanticAttributes,
)
from engine.state_manager import create_chain_state, update_chain_state
from engine.invariants import evaluate_invariants


def test_fail_closed_on_none_semantics():
    state = create_chain_state("chain_test", RunMode.PROTECTED)
    event = ActionEvent(
        chain_id=state.chain_id,
        step_index=0,
        tool="any_tool",
        semantics=None,
    )
    decision, violations = evaluate_invariants(state, event)
    assert decision == Decision.HOLD
    assert len(violations) == 1
    assert "No semantics" in violations[0].reason


def test_fail_closed_on_classifier_error():
    state = create_chain_state("chain_test", RunMode.PROTECTED)
    event = ActionEvent(
        chain_id=state.chain_id,
        step_index=0,
        tool="read_customer",
        semantics=SemanticAttributes(classifier_error="LLM timeout"),
    )
    decision, violations = evaluate_invariants(state, event)
    assert decision == Decision.HOLD
    assert len(violations) == 1
    assert "LLM timeout" in violations[0].reason


def test_sensitive_data_boundary_invariant():
    state = create_chain_state("chain_test", RunMode.PROTECTED)

    # Step 1: Read customer PII
    read_event = ActionEvent(
        chain_id=state.chain_id,
        step_index=0,
        tool="read_customer",
        semantics=SemanticAttributes(
            intent="Read customer PII",
            destination=DestinationType.INTERNAL,
            data_classes=[DataClass.PII],
            data_sensitivity=Sensitivity.HIGH,
        ),
    )
    update_chain_state(state, read_event)
    decision1, violations1 = evaluate_invariants(state, read_event)
    assert decision1 == Decision.ALLOW
    assert violations1 == []
    assert state.sensitive_data_observed is True

    # Step 2: Attempt send external
    send_event = ActionEvent(
        chain_id=state.chain_id,
        step_index=1,
        tool="send_external",
        semantics=SemanticAttributes(
            intent="Send data externally",
            destination=DestinationType.EXTERNAL,
            data_classes=[DataClass.GENERAL],
        ),
    )
    decision2, violations2 = evaluate_invariants(state, send_event)
    assert decision2 == Decision.BLOCK
    assert len(violations2) >= 1
    assert violations2[0].invariant == InvariantId.SENSITIVE_DATA_BOUNDARY


def test_secret_boundary_invariant():
    state = create_chain_state("chain_test", RunMode.PROTECTED)

    # Step 1: Read secret
    read_event = ActionEvent(
        chain_id=state.chain_id,
        step_index=0,
        tool="read_secret",
        semantics=SemanticAttributes(
            intent="Read vault secret",
            destination=DestinationType.INTERNAL,
            data_classes=[DataClass.SECRET],
            contains_secret=True,
        ),
    )
    update_chain_state(state, read_event)
    decision1, violations1 = evaluate_invariants(state, read_event)
    assert decision1 == Decision.ALLOW
    assert state.secrets_observed is True

    # Step 2: Send external
    send_event = ActionEvent(
        chain_id=state.chain_id,
        step_index=1,
        tool="send_external",
        semantics=SemanticAttributes(
            intent="Send API key",
            destination=DestinationType.EXTERNAL,
            data_classes=[DataClass.GENERAL],
        ),
    )
    decision2, violations2 = evaluate_invariants(state, send_event)
    assert decision2 == Decision.BLOCK
    assert any(v.invariant == InvariantId.SECRET_BOUNDARY for v in violations2)


def test_privilege_boundary_invariant():
    state = create_chain_state("chain_test", RunMode.PROTECTED)

    req_event = ActionEvent(
        chain_id=state.chain_id,
        step_index=0,
        tool="request_privilege",
        semantics=SemanticAttributes(
            intent="Request elevated privilege",
            destination=DestinationType.INTERNAL,
            privilege_escalation=True,
        ),
    )
    decision, violations = evaluate_invariants(state, req_event)
    assert decision == Decision.BLOCK
    assert len(violations) == 1
    assert violations[0].invariant == InvariantId.PRIVILEGE_BOUNDARY


def test_safe_public_send_external():
    state = create_chain_state("chain_test", RunMode.PROTECTED)

    event = ActionEvent(
        chain_id=state.chain_id,
        step_index=0,
        tool="send_external",
        semantics=SemanticAttributes(
            intent="Send public announcement",
            destination=DestinationType.EXTERNAL,
            data_classes=[DataClass.GENERAL],
            contains_secret=False,
            privilege_escalation=False,
        ),
    )
    decision, violations = evaluate_invariants(state, event)
    assert decision == Decision.ALLOW
    assert violations == []


def test_trajectory_escalation_invariant():
    state = create_chain_state("chain_traj_test", RunMode.PROTECTED)

    # Step 0: Read public data (Individually ALLOW)
    evt0 = ActionEvent(
        chain_id=state.chain_id,
        step_index=0,
        tool="read_public_data",
        semantics=SemanticAttributes(
            intent="Read public research",
            destination=DestinationType.INTERNAL,
            data_classes=[DataClass.GENERAL],
        ),
    )
    update_chain_state(state, evt0)
    d0, v0 = evaluate_invariants(state, evt0)
    assert d0 == Decision.ALLOW

    # Step 1: Read customer context (Individually ALLOW - internal destination)
    evt1 = ActionEvent(
        chain_id=state.chain_id,
        step_index=1,
        tool="read_customer_context",
        semantics=SemanticAttributes(
            intent="Read customer context",
            destination=DestinationType.INTERNAL,
            data_classes=[DataClass.PII],
            data_sensitivity=Sensitivity.HIGH,
        ),
    )
    update_chain_state(state, evt1)
    d1, v1 = evaluate_invariants(state, evt1)
    assert d1 == Decision.ALLOW

    # Step 2: Generate summary (Individually ALLOW - internal destination)
    evt2 = ActionEvent(
        chain_id=state.chain_id,
        step_index=2,
        tool="generate_content",
        semantics=SemanticAttributes(
            intent="Generate combined summary",
            destination=DestinationType.INTERNAL,
            data_classes=[DataClass.GENERAL],
        ),
    )
    update_chain_state(state, evt2)
    d2, v2 = evaluate_invariants(state, evt2)
    assert d2 == Decision.ALLOW

    # Step 3: Send external summary
    # In isolation this would be ALLOW (just like in test_safe_public_send_external)
    # But because of accumulated chain state, ChainBreak triggers TRAJECTORY_ESCALATION
    evt3 = ActionEvent(
        chain_id=state.chain_id,
        step_index=3,
        tool="send_external_summary",
        semantics=SemanticAttributes(
            intent="Send compiled summary externally",
            destination=DestinationType.EXTERNAL,
            data_classes=[DataClass.GENERAL],
        ),
    )
    d3, v3 = evaluate_invariants(state, evt3)
    assert d3 == Decision.BLOCK
    assert any(v.invariant == InvariantId.TRAJECTORY_ESCALATION for v in v3)
    traj_violation = next(v for v in v3 if v.invariant == InvariantId.TRAJECTORY_ESCALATION)
    assert traj_violation.triggered_by == [1, 2, 3]
    assert "transformed individually permitted data access into an externally transferable sensitive-data state" in traj_violation.reason
