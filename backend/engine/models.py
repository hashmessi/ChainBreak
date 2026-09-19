"""
ChainBreak — Core Data Models

Defines the typed contracts for the entire security engine.
The LLM produces SemanticAttributes; deterministic code evaluates invariants.
"""

from __future__ import annotations
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field
import time
import uuid


# ─── Enumerations ────────────────────────────────────────────────────────────

class Decision(str, Enum):
    ALLOW = "ALLOW"
    HOLD = "HOLD"
    BLOCK = "BLOCK"


class DataClass(str, Enum):
    PII = "PII"
    INTERNAL = "INTERNAL"
    SECRET = "SECRET"
    GENERAL = "GENERAL"


class Sensitivity(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class DestinationType(str, Enum):
    INTERNAL = "INTERNAL"
    EXTERNAL = "EXTERNAL"
    UNKNOWN = "UNKNOWN"


class PrivilegeLevel(str, Enum):
    STANDARD = "STANDARD"
    ELEVATED = "ELEVATED"


class InvariantId(str, Enum):
    SENSITIVE_DATA_BOUNDARY = "SENSITIVE_DATA_BOUNDARY"
    SECRET_BOUNDARY = "SECRET_BOUNDARY"
    PRIVILEGE_BOUNDARY = "PRIVILEGE_BOUNDARY"
    TRAJECTORY_ESCALATION = "TRAJECTORY_ESCALATION"


class InvariantStatus(str, Enum):
    SAFE = "SAFE"
    VIOLATED = "VIOLATED"


class RunMode(str, Enum):
    BASELINE = "BASELINE"    # no protection — attack should complete
    PROTECTED = "PROTECTED"  # ChainBreak active — violation should be blocked


# ─── LLM Output ──────────────────────────────────────────────────────────────

class SemanticAttributes(BaseModel):
    """Structured output from the LLM semantic classifier."""
    intent: str = ""
    data_sensitivity: Sensitivity = Sensitivity.LOW
    destination: DestinationType = DestinationType.INTERNAL
    data_classes: List[DataClass] = Field(default_factory=list)
    contains_secret: bool = False
    privilege_escalation: bool = False
    confidence: float = 0.0
    classifier_error: Optional[str] = None  # set on LLM failure


# ─── Action & State ──────────────────────────────────────────────────────────

class ActionEvent(BaseModel):
    """Fully resolved action after semantic extraction."""
    id: str = Field(default_factory=lambda: f"evt_{uuid.uuid4().hex[:8]}")
    chain_id: str
    step_index: int
    timestamp: float = Field(default_factory=time.time)
    tool: str
    arguments: dict = Field(default_factory=dict)
    # Populated by classifier:
    semantics: Optional[SemanticAttributes] = None
    # Populated by invariant engine:
    decision: Decision = Decision.ALLOW
    violations: List[str] = Field(default_factory=list)
    reason: str = ""
    triggered_by: List[int] = Field(default_factory=list)  # step indices of predecessor actions causing violation
    # Whether the underlying sandbox tool actually executed:
    executed: bool = False
    tool_result: Optional[str] = None


class ChainState(BaseModel):
    """Evolving security state of an agent's action trajectory."""
    chain_id: str
    run_mode: RunMode
    actions: List[ActionEvent] = Field(default_factory=list)
    # Cumulative lineage tracking
    sources: List[str] = Field(default_factory=list)          # e.g. ["internal_crm"]
    data_classes: List[DataClass] = Field(default_factory=list)
    destinations: List[DestinationType] = Field(default_factory=list)
    privilege_level: PrivilegeLevel = PrivilegeLevel.STANDARD
    secrets_observed: bool = False
    sensitive_data_observed: bool = False  # PII or INTERNAL
    sensitive_steps: List[int] = Field(default_factory=list)  # step indices where sensitive data was read
    secret_steps: List[int] = Field(default_factory=list)     # step indices where secrets were read
    privilege_steps: List[int] = Field(default_factory=list)  # step indices where privilege escalation occurred
    invariant_status: InvariantStatus = InvariantStatus.SAFE
    blocked_at_step: Optional[int] = None
    final_decision: Decision = Decision.ALLOW


class ViolationEvent(BaseModel):
    """Produced when an invariant is violated."""
    invariant: InvariantId
    trigger_action: str
    trigger_tool: str
    reason: str
    decision: Decision
    source_data: List[str] = Field(default_factory=list)
    destination: str = ""
    triggered_by: List[int] = Field(default_factory=list)


# ─── Scenario ────────────────────────────────────────────────────────────────

class ScenarioAction(BaseModel):
    tool: str
    arguments: dict = Field(default_factory=dict)


class Scenario(BaseModel):
    id: str
    name: str
    description: str
    actions: List[ScenarioAction]
    expected_result: Decision  # BLOCK for dangerous, ALLOW for safe, HOLD for failure/unknown
    expected_invariant: Optional[InvariantId] = None
    category: str = "attack"   # "attack" | "safe" | "near_miss" | "failure" | "unknown_tool"


# ─── API Request / Response ───────────────────────────────────────────────────

class RunRequest(BaseModel):
    scenario_id: str
    run_mode: RunMode


class CounterfactualResult(BaseModel):
    scenario: Scenario
    baseline: ChainState
    protected: ChainState
    correctly_blocked: bool    # protected blocked AND baseline completed
    detection_latency_ms: float


class EvaluationReport(BaseModel):
    total_scenarios: int
    dangerous_scenarios: int
    safe_scenarios: int
    near_miss_scenarios: int = 0
    failure_scenarios: int = 0
    unknown_tool_scenarios: int = 0
    detection_rate: float       # dangerous scenarios where violation was detected
    prevention_rate: float      # dangerous scenarios where attack was blocked in protected mode
    false_block_rate: float     # safe scenarios incorrectly blocked
    false_allow_rate: float = 0.0 # dangerous scenarios incorrectly allowed
    hold_rate: float = 0.0      # scenarios resulting in HOLD
    avg_latency_ms: float
    results: List[CounterfactualResult]
