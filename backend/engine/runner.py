"""
ChainBreak — Tool Interceptor + Counterfactual Runner

The interceptor wraps every tool call:
  1. Classify action semantics (LLM)
  2. Update chain state with semantics
  3. Evaluate invariants (deterministic)
  4. ALLOW → execute tool | HOLD/BLOCK → halt

The counterfactual runner executes the same scenario twice:
  - BASELINE: no protection, attack completes
  - PROTECTED: ChainBreak active, violation blocked

This produces the side-by-side proof for judges.
"""

from __future__ import annotations
import time
import uuid
from typing import List, Optional

from .models import (
    ActionEvent, ChainState, Decision, InvariantStatus,
    RunMode, ScenarioAction, Scenario,
    CounterfactualResult, SemanticAttributes
)
from .sandbox import execute_tool, TOOL_REGISTRY
from .classifier import classify_action
from .state_manager import create_chain_state, update_chain_state
from .invariants import evaluate_invariants


# ─── Single Action Interception ───────────────────────────────────────────────

async def intercept_action(
    state: ChainState,
    step_index: int,
    tool: str,
    arguments: dict,
) -> ActionEvent:
    """
    Process a single tool call through the full ChainBreak pipeline:
    Classify → State Update → Invariant Check → Execute (if ALLOW)
    """
    event = ActionEvent(
        chain_id=state.chain_id,
        step_index=step_index,
        tool=tool,
        arguments=arguments,
    )

    # ── Step 1: Validate tool is registered ──────────────────────────────────
    if tool not in TOOL_REGISTRY:
        event.semantics = SemanticAttributes(classifier_error=f"Unknown tool: {tool}")
        event.decision = Decision.HOLD
        event.reason = f"Tool '{tool}' is not registered. Unknown tools are held."
        update_chain_state(state, event)
        return event

    # ── Step 2: Semantic Classification ──────────────────────────────────────
    # Run tool first in BASELINE to get output for classification context
    # In PROTECTED: classify BEFORE execution; tool result is only available if ALLOW
    if state.run_mode == RunMode.BASELINE:
        # Baseline: execute regardless, then classify (for record-keeping only)
        try:
            tool_result, _ = execute_tool(tool, arguments)
        except Exception as e:
            tool_result = f"[TOOL ERROR] {e}"
        
        semantics = await classify_action(tool, arguments, tool_result)
        event.semantics = semantics
        event.executed = True
        event.tool_result = tool_result
        event.decision = Decision.ALLOW
        event.reason = "Baseline mode: no protection active."
        update_chain_state(state, event)
        return event

    else:
        # Protected: classify with just tool name + args (no result yet)
        semantics = await classify_action(tool, arguments)
        event.semantics = semantics
        update_chain_state(state, event)

        # ── Step 3: Invariant Evaluation ─────────────────────────────────────
        decision, violations = evaluate_invariants(state, event)
        event.decision = decision

        if violations:
            v = violations[0]  # Primary violation
            event.violations = [v.invariant.value for v in violations]
            event.reason = v.reason
            event.triggered_by = v.triggered_by
            if decision == Decision.BLOCK:
                state.invariant_status = InvariantStatus.VIOLATED
                state.blocked_at_step = step_index
            state.final_decision = decision
            # Tool does NOT execute
            return event

        # ── Step 4: Execute (ALLOW) ───────────────────────────────────────────
        try:
            tool_result, _ = execute_tool(tool, arguments)
            event.executed = True
            event.tool_result = tool_result
            event.reason = "Action passes all security invariants."
        except Exception as e:
            event.reason = f"Tool execution error: {e}"
            event.decision = Decision.HOLD

        return event


# ─── Full Scenario Run ────────────────────────────────────────────────────────

async def run_scenario(
    scenario: Scenario,
    run_mode: RunMode,
) -> ChainState:
    """
    Execute all actions in a scenario sequentially.
    Stops on BLOCK (protected mode only).
    """
    chain_id = f"chain_{uuid.uuid4().hex[:8]}"
    state = create_chain_state(chain_id, run_mode)

    for i, action in enumerate(scenario.actions):
        event = await intercept_action(state, i, action.tool, action.arguments)

        if run_mode == RunMode.PROTECTED and event.decision in (Decision.BLOCK, Decision.HOLD):
            # Halt trajectory immediately
            break

    state.final_decision = _determine_final_decision(state, run_mode)
    return state


def _determine_final_decision(state: ChainState, run_mode: RunMode) -> Decision:
    if any(a.decision == Decision.HOLD for a in state.actions):
        return Decision.HOLD
    if any(a.decision == Decision.BLOCK for a in state.actions) or state.blocked_at_step is not None:
        return Decision.BLOCK
    return Decision.ALLOW


# ─── Counterfactual Runner ────────────────────────────────────────────────────

async def run_counterfactual(scenario: Scenario) -> CounterfactualResult:
    """
    Run identical scenario BASELINE (no protection) + PROTECTED (ChainBreak).
    Returns side-by-side comparison.
    """
    t0 = time.time()

    baseline = await run_scenario(scenario, RunMode.BASELINE)
    protected = await run_scenario(scenario, RunMode.PROTECTED)

    latency_ms = (time.time() - t0) * 1000

    # Correctly blocked = baseline completed attack + protected prevented it
    correctly_blocked = (
        scenario.expected_result == Decision.BLOCK
        and protected.final_decision == Decision.BLOCK
        and baseline.final_decision == Decision.ALLOW
    )

    return CounterfactualResult(
        scenario=scenario,
        baseline=baseline,
        protected=protected,
        correctly_blocked=correctly_blocked,
        detection_latency_ms=latency_ms,
    )
