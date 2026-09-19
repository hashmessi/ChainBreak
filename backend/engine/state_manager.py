"""
ChainBreak — Chain State Manager

Tracks the evolving security state of an agent trajectory.
Updates are purely additive — each action extends state; nothing is lost.
"""

from __future__ import annotations
from .models import (
    ActionEvent, ChainState, DataClass, DestinationType,
    InvariantStatus, PrivilegeLevel, RunMode
)


def create_chain_state(chain_id: str, run_mode: RunMode) -> ChainState:
    """Initialize a fresh chain state."""
    return ChainState(chain_id=chain_id, run_mode=run_mode)


def update_chain_state(state: ChainState, event: ActionEvent) -> ChainState:
    """
    Immutably extend the chain state with a new action event.
    Propagates data lineage and security flags.
    """
    # We mutate a copy conceptually — in practice FastAPI re-serializes
    # so we just update in-place (state is a fresh object per run anyway)
    state.actions.append(event)

    semantics = event.semantics
    if semantics is None:
        return state

    # Track destinations
    if semantics.destination not in state.destinations:
        state.destinations.append(semantics.destination)

    # Track data classes observed in this run
    for dc in semantics.data_classes:
        if dc not in state.data_classes:
            state.data_classes.append(dc)

    # Track cumulative flags and step indices
    if semantics.contains_secret:
        state.secrets_observed = True
        if event.step_index not in state.secret_steps:
            state.secret_steps.append(event.step_index)

    if DataClass.PII in semantics.data_classes or DataClass.INTERNAL in semantics.data_classes:
        state.sensitive_data_observed = True
        if event.step_index not in state.sensitive_steps:
            state.sensitive_steps.append(event.step_index)

    # Track source
    # We derive source from tool name convention
    source = _infer_source(event.tool)
    if source and source not in state.sources:
        state.sources.append(source)

    # Privilege escalation tracking
    if semantics.privilege_escalation:
        state.privilege_level = PrivilegeLevel.ELEVATED
        if event.step_index not in state.privilege_steps:
            state.privilege_steps.append(event.step_index)

    return state


def _infer_source(tool: str) -> str:
    """Map tool name to logical data source."""
    sources = {
        "read_customer": "internal_crm",
        "read_customer_context": "internal_crm",
        "read_internal_notes": "internal_notes_db",
        "read_secret": "secrets_vault",
        "generate_content": "agent_context",
        "send_external": "external_endpoint",
        "send_external_summary": "external_endpoint",
        "request_privilege": "privilege_system",
        "read_public_data": "public_web",
    }
    return sources.get(tool, "unknown")
