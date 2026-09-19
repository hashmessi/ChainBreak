# ChainBreak — Final Locked Winning Product Ideation

**Hackathon:** TLN Cybersecurity Challenge 2026  
**Build Window:** September 19–20, 2026  
**Project:** ChainBreak  
**Status:** LOCKED — no concept drift during the hackathon

---

## 1. Product Thesis

### ChainBreak
**Runtime enforcement of security invariants for AI-agent action trajectories.**

> An AI agent can perform a sequence of individually legitimate actions that collectively crosses a forbidden security boundary. ChainBreak detects the boundary crossing before the violating action executes and proves the difference against an identical unprotected run.

The product is **not** a generic AI firewall, MCP gateway, prompt-injection detector, risk dashboard, or agent monitor.

The product is a focused security mechanism:

> **Track the evolving security state of an agent and prevent forbidden state transitions.**

---

## 2. Why This Problem

An individual tool call can appear legitimate:

```text
read_customer()           -> allowed
read_internal_notes()     -> allowed
generate_summary()        -> allowed
send_external()           -> allowed individually
```

But collectively:

```text
TRUSTED INTERNAL DATA
        ↓
AGENT CONTEXT
        ↓
GENERATED CONTENT
        ↓
UNTRUSTED EXTERNAL DESTINATION
```

The security problem is therefore not only:

> “Is this action allowed?”

It is:

> **“Did the agent's evolving trajectory cross a forbidden security boundary?”**

---

## 3. Killer Feature

# Trajectory Invariant Breaker

Instead of relying on an arbitrary risk score, ChainBreak evaluates explicit security invariants.

### Example

> Sensitive data originating inside a trusted boundary must not reach an untrusted destination without an explicit authorization transition.

Example runtime:

```text
Action 1   ✓
Action 2   ✓
Action 3   ✓
Action 4   ⚠

SECURITY INVARIANT VIOLATED

Source:
Internal customer database

Data:
PII

Destination:
External endpoint

Authorization transition:
None

           ↓

      █ BLOCKED █
```

The security decision is deterministic and explainable.

---

# 4. Killer Proof

## Counterfactual Security Replay

The exact same attack trajectory is executed twice.

### Run A — Unprotected

```text
Same agent
Same tools
Same permissions
        ↓
Forbidden trajectory
        ↓
Attack completes
```

### Run B — ChainBreak protected

```text
Same agent
Same tools
Same permissions
        ↓
Same trajectory
        ↓
Invariant evaluated
        ↓
Violation detected
        ↓
Execution blocked
        ↓
Forbidden state never reached
```

The judge sees evidence rather than a claim.

### Example result

| Security Outcome | Baseline | ChainBreak |
|---|---:|---:|
| PII reaches egress | YES | NO |
| Secret exposed | YES | NO |
| Invariant violated | YES | NO |
| Attack completed | YES | NO |
| Block point | — | Before egress |

---

# 5. Competitive Positioning

Existing agent-security systems and MCP gateways already provide capabilities such as interception, policy enforcement, approvals, auditing, and contextual controls.

Therefore, ChainBreak must **not** position itself as:

> “Another AI-agent security gateway.”

The sharper proposition is:

> **Security invariant + data lineage + trajectory enforcement + counterfactual proof.**

The differentiation is demonstrated, not merely claimed.

### Core distinction

Traditional approach:

```text
Is this individual action allowed?
```

ChainBreak:

```text
Has the evolving action/data trajectory crossed
a forbidden security boundary?
```

---

# 6. Target User

### Primary

Developers building tool-using AI agents with access to sensitive data and external destinations.

### Secondary

Security engineers evaluating whether an AI agent can cause unintended data exposure or privilege escalation.

### Not targeting

- General consumers
- Enterprise SOC platforms
- Full SIEM replacement
- General-purpose agent orchestration
- Enterprise IAM

---

# 7. Three Security Invariants

Keep exactly three for the MVP.

## Invariant 01 — Sensitive Data Boundary

```text
Trusted sensitive data
        ↓
Untrusted destination
```

Without an explicit authorization transition:

> **BLOCK**

## Invariant 02 — Secret Boundary

```text
Credential / secret
        ↓
Externally visible agent output
```

> **BLOCK**

## Invariant 03 — Privilege Boundary

```text
Current privilege
        ↓
Higher privilege
```

Without an authorized transition:

> **BLOCK**

---

# 8. Flagship Attack Scenario

## Silent Exfiltration

The main demo should make the entire product obvious.

```text
1. read_customer()
        ↓
2. read_internal_notes()
        ↓
3. generate_summary()
        ↓
4. construct_external_message()
        ↓
5. send_external()
```

The important property:

> Every individual step can appear legitimate.

The dangerous transition occurs when trusted data crosses into an untrusted destination.

### ChainBreak behavior

```text
READ CUSTOMER          ✓
READ NOTES             ✓
GENERATE SUMMARY       ✓
CONSTRUCT MESSAGE      ✓
SEND EXTERNAL          ⚠

SECURITY INVARIANT:
Sensitive data boundary violated

████ EXECUTION BLOCKED ████
```

---

# 9. Architecture

```text
                     AI AGENT
                        │
                        ▼
                ┌───────────────┐
                │ Tool Interceptor
                └───────┬───────┘
                        │
                        ▼
              ┌───────────────────┐
              │ Semantic Extractor│
              │       LLM         │
              └─────────┬─────────┘
                        │
              intent / sensitivity /
              source / destination
                        │
                        ▼
              ┌───────────────────┐
              │   Chain State     │
              │   + Data Lineage  │
              └─────────┬─────────┘
                        │
                        ▼
              ┌───────────────────┐
              │ Invariant Engine  │
              └─────────┬─────────┘
                        │
                 ┌──────┼──────┐
                 ▼      ▼      ▼
               ALLOW   HOLD   BLOCK
                               │
                               ▼
                         Audit / Explain
                               │
                               ▼
                     Counterfactual Runner
```

### Critical architecture rule

**The LLM does not decide security.**

The LLM performs only:

```text
Raw tool action
      ↓
Structured semantic attributes
```

The deterministic engine performs:

```text
State
+
Lineage
+
Invariant
      ↓
ALLOW / HOLD / BLOCK
```

This keeps security decisions reproducible and testable.

---

# 10. Sandbox Environment

Everything is synthetic.

### Demo tools

```text
read_customer()
read_internal_notes()
read_secret()
generate_content()
send_external()
request_privilege()
```

### Synthetic data

```text
CUSTOMER_PII_001
INTERNAL_NOTE_001
DEMO_SECRET_001
```

No real credentials, real customer data, real external services, or unauthorized systems.

All attack scenarios execute inside a controlled sandbox.

---

# 11. Core Product Flow

```text
Developer opens ChainBreak
        ↓
Selects scenario
        ↓
Runs baseline
        ↓
Attack completes
        ↓
Runs protected version
        ↓
Actions execute normally
        ↓
Security state evolves
        ↓
Invariant becomes violated
        ↓
ChainBreak interrupts execution
        ↓
Violation explanation shown
        ↓
Baseline vs protected proof shown
```

---

# 12. Core Features

## F1 — Tool Interception

Intercept every agent tool request before execution.

**Input**
- tool
- arguments
- chain_id

**Process**
- normalize request
- validate registered tool

**Output**
- structured ActionEvent

**Success**
- every executable call passes through ChainBreak

**Failure**
- a tool executes without inspection

---

## F2 — Chain State and Data Lineage

Track:

```text
identity/context
data classes
secrets observed
privilege state
sources
destinations
previous actions
chain ID
```

Data lineage:

```text
SOURCE → DATA → TRANSFORMATION → DESTINATION
```

**Input**
- previous chain state
- new action

**Process**
- update trajectory state

**Output**
- updated ChainState

**Success**
- the system can explain where sensitive information originated and where it is moving

**Failure**
- history is lost or source/destination cannot be reconstructed

---

## F3 — Security Invariant Engine

Evaluate exactly three invariants.

**Input**
- current ChainState
- candidate action

**Process**
- evaluate invariant predicates

**Output**

```json
{
  "decision": "ALLOW | HOLD | BLOCK",
  "violations": [],
  "reason": "..."
}
```

**Success**
- dangerous trajectory blocked before the violating operation executes

**Failure**
- known invariant violation executes

---

## F4 — Semantic Action Classifier

The LLM converts ambiguous actions into structured metadata.

**Input**
- tool
- arguments
- limited relevant context

**Output**

```json
{
  "intent": "send_customer_information",
  "data_sensitivity": "HIGH",
  "destination": "EXTERNAL",
  "contains_secret": false,
  "confidence": 0.94
}
```

**Success**
- valid structured output

**Failure**
- timeout, malformed response, or low confidence

**Failure behavior**
- `HOLD`; never silently allow unknown semantics

---

## F5 — Runtime Enforcement

```text
ALLOW → execute
HOLD  → pause
BLOCK → do not execute
```

**Success**
- blocked action never reaches the underlying sandbox tool

**Failure**
- blocked operation executes

---

## F6 — Counterfactual Attack Runner

Run:

```text
WITHOUT ChainBreak
WITH ChainBreak
```

against the identical scenario.

**Success**
- baseline reaches forbidden state
- protected run prevents the forbidden state

---

# 13. MVP Scope

### Must ship

```text
Tool interception
Chain state
Data lineage
3 invariants
LLM semantic extraction
ALLOW / HOLD / BLOCK
Sandbox tools
Counterfactual runner
Automated evaluation
Minimal visual timeline
```

### Evaluation set

Minimum:

```text
3 dangerous scenarios
2 safe scenarios
```

Target:

```text
5–8 scenarios total
```

Metrics:

```text
Invariant detection rate
Prevention rate
False-block rate
Detection latency
```

Primary metric:

> **Forbidden-state prevention rate**

---

# 14. Out of Scope

Do not build:

- authentication
- multi-tenancy
- user accounts
- billing
- real customer data
- real external email
- real credentials
- real exploitation
- malware
- browser extensions
- mobile app
- cloud-native microservices
- custom model training
- RAG
- vector database
- distributed workers
- Kafka
- Redis
- Celery
- enterprise policy management
- SIEM integration
- large-scale threat intelligence
- large attack libraries
- Hugging Face model integration for MVP

---

# 15. User States

```text
IDLE
  ↓
SCENARIO_SELECTED
  ↓
RUNNING_BASELINE
  ↓
BASELINE_COMPLETE
  ↓
RUNNING_PROTECTED
  ↓
CHAIN_INTERRUPTED
  ↓
RESULT
```

Optional:

```text
ERROR
```

---

# 16. System States

```text
READY

EXECUTING
  ↓
ACTION_INSPECTED
  ↓
STATE_UPDATED
  ↓
INVARIANT_EVALUATED
  ↓
  ┌───────────────┐
  ↓               ↓
ALLOW          VIOLATION
  ↓               ↓
EXECUTE       HOLD/BLOCK
```

---

# 17. Failure States

### LLM failure

```text
Unknown semantics
      ↓
HOLD
```

### Unknown tool

```text
Unknown tool
      ↓
HOLD
```

### State inconsistency

```text
Invalid state
      ↓
BLOCK
```

### Tool failure

Record failure and stop the current trajectory.

### Evaluation mismatch

Mark the scenario failed; never manipulate the evaluation result.

---

# 18. Data Model

## ActionEvent

```json
{
  "id": "evt_001",
  "chain_id": "chain_001",
  "timestamp": "...",
  "tool": "read_customer",
  "intent": "...",
  "data_class": "PII",
  "sensitivity": "HIGH",
  "source": "internal_crm",
  "destination": "internal",
  "contains_secret": false
}
```

## ChainState

```json
{
  "chain_id": "chain_001",
  "actions": [],
  "sources": [],
  "data_classes": [],
  "destinations": [],
  "privilege_level": "STANDARD",
  "secrets_observed": false,
  "invariant_status": "SAFE"
}
```

## ViolationEvent

```json
{
  "invariant": "SENSITIVE_DATA_BOUNDARY",
  "trigger_action": "send_external",
  "reason": "...",
  "decision": "BLOCK"
}
```

## Scenario

```json
{
  "id": "scenario_001",
  "name": "PII Exfiltration",
  "actions": [],
  "expected_result": "BLOCK"
}
```

---

# 19. AI Requirements

AI has exactly one job:

> **Convert ambiguous agent actions into structured security metadata.**

### AI must not

- decide final authorization
- generate security policy
- directly execute tools
- modify invariant state
- override a block

### Architecture

```text
LLM = semantic interpretation

Code = security enforcement
```

---

# 20. Integrations

## Required

### OpenAI API

Use only for semantic extraction.

## Optional

### MCP SDK

Only add if integration is straightforward and does not threaten the core build.

The core runtime must remain independent of a large MCP ecosystem.

---

# 21. Security Requirements

### SR1 — Sandbox only
All scenarios run in a controlled environment.

### SR2 — No real credentials
Use synthetic secrets only.

### SR3 — No real exfiltration
External destinations are simulated.

### SR4 — Fail closed
Unknown state must not automatically produce execution.

### SR5 — Deterministic policy
Invariant evaluation must be independently testable.

### SR6 — Audit
Every ALLOW/HOLD/BLOCK becomes an event.

### SR7 — Reproducibility
Every scenario can be replayed exactly.

---

# 22. Acceptance Criteria

## AC1 — Interception

Every tool request is evaluated before execution.

## AC2 — State tracking

The complete trajectory is retained across multiple actions.

## AC3 — Data lineage

The system can trace sensitive data from source to destination.

## AC4 — Invariant violation

A known forbidden transition returns `BLOCK`.

## AC5 — Enforcement

A blocked action never reaches the sandbox tool.

## AC6 — AI failure safety

Semantic-analysis failure causes `HOLD`, not `ALLOW`.

## AC7 — Counterfactual proof

The same attack succeeds in the unprotected baseline and is prevented with ChainBreak.

## AC8 — Safe-path behavior

Safe scenarios execute without unnecessary blocking.

## AC9 — Evaluation

The system reports:

```text
Detection rate
Prevention rate
False-block rate
Decision latency
```

## AC10 — Explainability

Every block states:

```text
Triggering action
Violated invariant
Affected data
Destination
Reason for interruption
```

---

# 23. 48-Hour Build Boundary

The product is DONE when this exact story works:

```text
             BASELINE

Agent
 ↓
Read customer PII
 ↓
Read internal notes
 ↓
Generate content
 ↓
Attempt external transmission
 ↓
✓ Forbidden state reached


             CHAINBREAK

Agent
 ↓
Read customer PII       ✓
 ↓
Read internal notes     ✓
 ↓
Generate content        ✓
 ↓
External transmission   ⚠
 ↓
INVARIANT VIOLATION
 ↓
████ BLOCKED ████
```

Then show:

```text
WHY?

Sensitive data originated
inside a trusted boundary.

The trajectory attempted to
cross into an untrusted
destination without authorization.
```

That is the product.

---

# 24. Demo Structure

The final video should be under five minutes.

## 0:00–0:25 — Problem

“Individually legitimate agent actions can collectively violate a security boundary.”

## 0:25–0:55 — Baseline

Run the attack without ChainBreak.

## 0:55–1:40 — Protected Run

Run the identical attack with ChainBreak.

## 1:40–2:15 — Violation

Show:

- source
- data
- destination
- violated invariant
- block point

## 2:15–3:00 — Counterfactual Proof

Show baseline vs protected.

## 3:00–3:45 — Evaluation

Show scenarios and measurable results.

## 3:45–4:30 — Architecture

Explain only the parts that matter:

```text
semantic extraction
→ state/lineage
→ invariant engine
→ enforcement
```

## 4:30–5:00 — Impact

Explain who benefits and why trajectory-level enforcement matters.

---

# 25. Final Positioning

### Do not say

> “ChainBreak is an AI firewall.”

### Say

> **“ChainBreak enforces security invariants over the evolving data and privilege trajectory of an AI agent.”**

### Do not say

> “Our AI predicts risk.”

### Say

> **“The model extracts semantic context; deterministic security invariants make the enforcement decision.”**

### Do not say

> “We detect attacks.”

### Say

> **“We prevent forbidden security states from being reached.”**

---

# 26. Locked Product Definition

> **ChainBreak is a runtime security system that tracks an AI agent’s evolving data and privilege state and blocks execution when the trajectory violates a defined security invariant—even when each individual tool call is independently permitted. It proves the security effect by replaying the identical scenario with and without protection.**

---

# 27. Non-Negotiable Build Rules

1. **One core thesis.**
2. **One flagship attack.**
3. **Three invariants maximum.**
4. **Five to eight evaluation scenarios.**
5. **LLM interprets; deterministic code enforces.**
6. **No fake metrics.**
7. **No real-world attacks or data.**
8. **No feature expansion after the core proof works.**
9. **Every new feature must strengthen the central security proof.**
10. **The final demo must be understandable without an architecture lecture.**

---

## Final Strategic Objective

We are not trying to build the largest cybersecurity project.

We are trying to build the **clearest, most technically defensible demonstration of one important security mechanism** in the 48-hour window:

> **An AI agent can cross a forbidden security boundary through individually legitimate actions. ChainBreak detects the trajectory-level violation and prevents the forbidden state from being reached.**

**This concept is LOCKED.**
