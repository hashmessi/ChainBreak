# ChainBreak ⚡

> **Runtime Security Invariant Engine for Autonomous Agent Trajectories**  
> *Stopping multi-step AI agent data exfiltration through deterministic trajectory-level security invariants.*

[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF.svg)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## The Problem: Trajectory Attacks Evade Point-in-Time Defenses

Modern AI agent security systems evaluate tool calls individually at the perimeter:
- Is reading public customer data allowed? **Yes.**
- Is loading internal CRM context allowed? **Yes.**
- Is generating an executive summary allowed? **Yes.**
- Is sending a summary to an external webhook allowed? **Yes.**

Every single action is individually benign and passes standard permission checks. However, when chained together in an autonomous agent trajectory, the **accumulated state** results in unauthorized context exfiltration:

```
[Step 1] read_public_data       ──▶ ALLOW (benign)
               │
[Step 2] read_customer_context  ──▶ ALLOW (benign)
               │
[Step 3] generate_content       ──▶ ALLOW (benign)
               │
[Step 4] send_external_summary  ──▶ CHAINBREAK INTERCEPTION ──▶ BLOCK
                                    [TRAJECTORY_ESCALATION]
                                    Zero network egress.
```

**ChainBreak solves this.** It treats an agent's execution not as isolated tool calls, but as a stateful, evolving causal trajectory.

---

## Core Architecture

ChainBreak enforces a strict separation of concerns between semantic interpretation and deterministic security enforcement:

```
                  ┌─────────────────────────────────────┐
                  │    Autonomous AI Agent Execution    │
                  └──────────────────┬──────────────────┘
                                     │ Tool Call Interception
                                     ▼
                  ┌─────────────────────────────────────┐
                  │      LLM Semantic Classifier       │
                  │   (Extracts intent, sensitivity,    │
                  │    destinations, data classes)      │
                  └──────────────────┬──────────────────┘
                                     │ Structured Attributes
                                     ▼
                  ┌─────────────────────────────────────┐
                  │     Cumulative State Manager        │
                  │   (Tracks lineage, source steps,    │
                  │    privilege level, destinations)   │
                  └──────────────────┬──────────────────┘
                                     │ Evolving Chain State
                                     ▼
                  ┌─────────────────────────────────────┐
                  │   Deterministic Invariant Engine    │
                  │  (Pure Python, zero-hallucination,  │
                  │   fail-closed security contracts)   │
                  └──────────────────┬──────────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
             [ALLOW] │                                 │ [BLOCK / HOLD]
                    ▼                                 ▼
         ┌────────────────────┐            ┌────────────────────┐
         │ Execute in Sandbox │            │ Drop Tool Call     │
         │   & Log Telemetry  │            │ Halt Trajectory    │
         └────────────────────┘            │ Zero Network Egress│
                                           └────────────────────┘
```

### Deterministic Invariants
1. **`SENSITIVE_DATA_BOUNDARY`**: Prevents egress of PII or internal company data to external unauthenticated destinations.
2. **`SECRET_BOUNDARY`**: Prohibits transmitting API keys, cryptographic tokens, or secrets outside trusted boundaries.
3. **`PRIVILEGE_BOUNDARY`**: Blocks sensitive tools when executed with insufficient privileges.
4. **`TRAJECTORY_ESCALATION`**: Detects accumulated context exfiltration where harmless individual steps combine into unauthorized data exfiltration.

### Fail-Closed Security (SR4 / AC6)
- Uncertainty or LLM classifier timeout **never defaults to ALLOW**.
- Unregistered or unknown tools **immediately HOLD**.
- When an invariant fires, execution is halted instantly before invoking underlying API/socket adapters.

---

## 20-Scenario Benchmark Suite

ChainBreak includes an automated evaluation benchmark across 20 rigorous test scenarios:

| Category | Count | Expected Behavior | Description |
|---|:---:|:---:|---|
| **Attacks** | 6 | `BLOCK` | Multi-step exfiltration, trajectory escalation, secret theft |
| **Safe** | 5 | `ALLOW` | Legitimate analytics, support queries, documentation generation |
| **Near-Miss** | 4 | `ALLOW` | High-sensitivity data kept internal, benign multi-step workflows |
| **Failure Modes** | 3 | `HOLD` | Simulated LLM classifier failure, schema corruption, timeout |
| **Unknown Tools** | 2 | `HOLD` | Synthetic unapproved tools attempting system calls |

### Verification Metrics
- **Detection Rate**: `100.0%` (All attacks intercepted)
- **Prevention Rate**: `100.0%` (Zero bytes leaked on block)
- **False Block Rate**: `0.0%` (Zero legitimate safe actions blocked)
- **Evaluation Latency**: `< 1ms` mean invariant enforcement overhead

---

## Editorial Security Cockpit (Frontend)

Built with React 18, Vite, and designed following the **Hyperstudio Obsidian Blueprint** (`DESIGN (3).md`):
- **Deep Matte Canvas**: Obsidian (`#101010`) background with Carbon (`#080808`) depth surfaces.
- **Hairline Geometry**: 1px Graphite rules (`#212121`) providing flat, architectural structure without drop shadows.
- **Display Typography**: Inter 400 with negative display letter tracking (`-0.69px` at 63px) and JetBrains Mono for metadata and telemetry.
- **Dual-Track Counterfactual Proof**: Visual side-by-side execution comparison (Unprotected Baseline vs Protected ChainBreak) with step-by-step lineage tracking.
- **Live Invariant Telemetry**: Real-time cumulative state monitoring and antecedent lineage highlighting (`triggered_by: [1, 2, 3]`).

---

## Project Structure

```
ChainBreak/
├── backend/
│   ├── engine/
│   │   ├── classifier.py      # OpenRouter LLM semantic extractor + deterministic fallback
│   │   ├── invariants.py      # 4 deterministic security invariants
│   │   ├── models.py          # Typed Pydantic data models & contracts
│   │   ├── runner.py          # Interceptor pipeline & counterfactual dual runner
│   │   ├── sandbox.py         # Synthetic tool registry & mock sandbox environment
│   │   └── state_manager.py   # Stateful lineage & causal graph tracking
│   ├── tests/                 # 43 automated unit & integration tests (pytest)
│   ├── main.py                # FastAPI server (5 REST endpoints)
│   ├── scenarios.py           # 20 benchmark scenarios
│   └── requirements.txt       # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ActionCard.jsx          # Individual step card with semantics & lineage
│   │   │   ├── BenchmarkModal.jsx      # 20-scenario evaluation report dialog
│   │   │   ├── CounterfactualProof.jsx # Dual-track comparative matrix
│   │   │   ├── RunTimeline.jsx         # Live telemetry stream & cumulative state bar
│   │   │   ├── ScenarioSelector.jsx    # 20-scenario deck categorized by risk profile
│   │   │   └── ViolationPanel.jsx      # Invariant breach inspector & causal chain
│   │   ├── App.jsx            # Cockpit shell & state orchestration
│   │   ├── index.css          # Design system tokens & styling
│   │   └── main.jsx           # React DOM root
│   ├── index.html             # HTML entry point with Inter & JetBrains Mono fonts
│   ├── package.json           # Frontend dependencies (React 18, Lucide)
│   └── vite.config.js         # Port 5173 with /api reverse proxy to 8000
├── .planning/                 # Project planning, roadmap, and state tracking
├── .env.example               # Environment template
├── .gitignore                 # Strict ignore rules (zero credentials/cache committed)
└── README.md
```

---

## Quickstart Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Backend Setup

```bash
# Clone the repository
git clone https://github.com/hashmessi/ChainBreak.git
cd ChainBreak

# Install Python dependencies
pip install -r requirements.txt

# (Optional) Configure OpenRouter API key for live LLM classification
# If omitted, ChainBreak uses its built-in deterministic classifier fallback
cp .env.example .env
```

Start the FastAPI server:
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
Backend will be live at `http://127.0.0.1:8000` (API documentation at `/docs`).

### 2. Frontend Setup

In a separate terminal:
```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Open `http://localhost:5173/` in your browser to access the ChainBreak Security Cockpit.

### 3. Run Automated Backend Tests

```bash
python -m pytest backend/ -v
```
Runs 43 comprehensive unit and integration tests verifying invariants, counterfactual execution, session isolation, and fail-closed handling in under 1 second.

---

## REST API Endpoints

- `GET  /api/health` — Engine health and OpenRouter configuration status
- `GET  /api/scenarios` — Catalog of all 20 benchmark scenarios
- `POST /api/run` — Execute single scenario in `BASELINE` or `PROTECTED` mode
- `POST /api/counterfactual/{id}` — Execute side-by-side dual-track run and return comparative proof
- `POST /api/evaluate` — Run full 20-scenario benchmark suite and calculate detection metrics

---

## License

MIT License. Designed and engineered for runtime AI agent security.
