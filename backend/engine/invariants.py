"""
ChainBreak — Deterministic Invariant Engine

THE SECURITY ENFORCEMENT LAYER.

This module implements the three security invariants.
No LLM is involved here. Decisions are reproducible, testable, and auditable.

Rules:
  SENSITIVE_DATA_BOUNDARY — sensitive data + external destination = BLOCK
  SECRET_BOUNDARY         — secret observed + external destination = BLOCK
  PRIVILEGE_BOUNDARY      — privilege escalation attempt without auth = BLOCK

Input:  current ChainState + candidate ActionEvent (with semantics attached)
Output: Decision (ALLOW | HOLD | BLOCK) + violations list + reason
"""

from __future__ import annotations
from typing import Tuple, List

from .models import (
    ActionEvent, ChainState, Decision, InvariantId,
    DestinationType, DataClass, ViolationEvent
)


def evaluate_invariants(
    state: ChainState,
    event: ActionEvent,
) -> Tuple[Decision, List[ViolationEvent]]:
    """
    Core invariant evaluation. Called BEFORE the tool executes.
    
    Returns:
        decision: ALLOW | HOLD | BLOCK
        violations: list of ViolationEvent (empty if ALLOW)
    """
    semantics = event.semantics

    # ── Fail Closed: LLM failure → HOLD ──────────────────────────────────────
    if semantics is None or semantics.classifier_error:
        error_reason = (semantics.classifier_error if semantics else "No semantics")
        hold_violation = ViolationEvent(
            invariant=InvariantId.SENSITIVE_DATA_BOUNDARY,  # placeholder
            trigger_action=f"LLM failure: {error_reason}",
            trigger_tool=event.tool,
            reason=f"Semantic analysis failed ({error_reason}). "
                   f"Unknown action semantics → HOLD (fail-closed policy).",
            decision=Decision.HOLD,
            destination="UNKNOWN",
            triggered_by=[event.step_index],
        )
        return Decision.HOLD, [hold_violation]

    violations: List[ViolationEvent] = []

    # ── Invariant: TRAJECTORY_ESCALATION ─────────────────────────────────────
    # When individually permitted actions accumulate into an external exfiltration vector
    is_trajectory_escalation = (
        semantics.destination == DestinationType.EXTERNAL
        and state.sensitive_data_observed
        and (
            event.tool == "send_external_summary"
            or any(a.tool in ("generate_content", "generate_summary") for a in state.actions)
        )
        and not _has_authorization_transition(state)
    )
    if is_trajectory_escalation:
        acc_steps = sorted(list(set(
            state.sensitive_steps
            + [i for i, a in enumerate(state.actions) if a.tool in ("generate_content", "generate_summary")]
            + [event.step_index]
        )))
        v_traj = ViolationEvent(
            invariant=InvariantId.TRAJECTORY_ESCALATION,
            trigger_action="Attempt to transmit externally after multi-step sensitive context accumulation",
            trigger_tool=event.tool,
            reason="The action sequence transformed individually permitted data access into an externally transferable sensitive-data state.",
            decision=Decision.BLOCK,
            source_data=state.sources,
            destination="EXTERNAL",
            triggered_by=acc_steps,
        )
        violations.append(v_traj)

    # ── Invariant 1: SENSITIVE_DATA_BOUNDARY ─────────────────────────────────
    # Sensitive data (PII/INTERNAL) has been observed in this trajectory AND
    # this action targets an EXTERNAL destination → BLOCK
    if (
        semantics.destination == DestinationType.EXTERNAL
        and state.sensitive_data_observed
        and not _has_authorization_transition(state)
    ):
        v = ViolationEvent(
            invariant=InvariantId.SENSITIVE_DATA_BOUNDARY,
            trigger_action=f"Attempt to send to external destination after reading sensitive data",
            trigger_tool=event.tool,
            reason=(
                "Sensitive data originating inside a trusted boundary "
                "attempted to reach an untrusted external destination "
                "without an explicit authorization transition. "
                f"Sensitive data types observed: {[d.value for d in state.data_classes]}. "
                f"Sources: {state.sources}."
            ),
            decision=Decision.BLOCK,
            source_data=state.sources,
            destination="EXTERNAL",
            triggered_by=sorted(list(set(state.sensitive_steps + [event.step_index]))),
        )
        # If tool is send_external (standard direct egress), make SENSITIVE_DATA_BOUNDARY primary
        if event.tool == "send_external" and violations and violations[0].invariant == InvariantId.TRAJECTORY_ESCALATION:
            violations.insert(0, v)
        elif not any(existing.invariant == InvariantId.SENSITIVE_DATA_BOUNDARY for existing in violations):
            violations.append(v)

    # ── Invariant 2: SECRET_BOUNDARY ─────────────────────────────────────────
    # A secret/credential was observed AND this action sends externally → BLOCK
    if (
        semantics.destination == DestinationType.EXTERNAL
        and state.secrets_observed
    ):
        if not any(v.invariant == InvariantId.SECRET_BOUNDARY for v in violations):
            v = ViolationEvent(
                invariant=InvariantId.SECRET_BOUNDARY,
                trigger_action=f"Attempt to send to external destination after observing a secret",
                trigger_tool=event.tool,
                reason=(
                    "A credential or secret was accessed during this trajectory. "
                    "This action attempts to send to an external destination, "
                    "risking secret exposure. No authorized disclosure present."
                ),
                decision=Decision.BLOCK,
                source_data=["secrets_vault"],
                destination="EXTERNAL",
                triggered_by=sorted(list(set(state.secret_steps + [event.step_index]))),
            )
            violations.insert(0 if event.tool == "send_external" else len(violations), v)

    # ── Invariant 3: PRIVILEGE_BOUNDARY ──────────────────────────────────────
    # Privilege escalation attempted without an authorized transition → BLOCK
    if semantics.privilege_escalation and not _has_privilege_authorization(state):
        v = ViolationEvent(
            invariant=InvariantId.PRIVILEGE_BOUNDARY,
            trigger_action=f"Attempt to escalate privilege without authorization",
            trigger_tool=event.tool,
            reason=(
                "This action requests elevated privilege. "
                "No authorized privilege transition exists in this trajectory. "
                "Escalation from STANDARD to ELEVATED requires explicit authorization."
            ),
            decision=Decision.BLOCK,
            source_data=[],
            destination="INTERNAL",
            triggered_by=[event.step_index],
        )
        violations.append(v)

    # ── Final Decision ────────────────────────────────────────────────────────
    if violations:
        # Escalate to BLOCK if any violation says BLOCK
        final = Decision.BLOCK if any(
            v.decision == Decision.BLOCK for v in violations
        ) else Decision.HOLD
        return final, violations

    return Decision.ALLOW, []


def _has_authorization_transition(state: ChainState) -> bool:
    """
    Check whether an explicit authorization transition occurred.
    In the MVP sandbox, no tool grants authorization, so this always returns False.
    A real implementation would check for auth_grant actions.
    """
    return False


def _has_privilege_authorization(state: ChainState) -> bool:
    """
    Check whether privilege escalation was explicitly authorized.
    In the MVP sandbox this always returns False.
    """
    return False
