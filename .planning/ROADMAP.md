# ChainBreak — Roadmap

## Milestone 1: Working Demo (48-Hour Hackathon Build)
**Target:** September 20, 2026

---

### Phase 1 — Backend Core Engine ✅ IN PROGRESS
**Goal:** Deterministic security invariant enforcement working end-to-end

**Files:**
- `backend/engine/models.py` ✅ Complete
- `backend/engine/sandbox.py` ✅ Complete  
- `backend/engine/classifier.py` ✅ Complete
- `backend/engine/state_manager.py` ✅ Complete
- `backend/engine/invariants.py` ✅ Complete
- `backend/engine/runner.py` ✅ Complete
- `backend/scenarios.py` ✅ Complete
- `backend/main.py` ✅ Complete

**UAT:**
- [x] `python -m pytest backend/` passes (43 tests passed)
- [x] `/api/run` with S1 PROTECTED returns `final_decision: BLOCK`
- [x] `/api/run` with S1 BASELINE returns `final_decision: ALLOW`
- [x] `/api/run` with S4 PROTECTED returns `final_decision: ALLOW`

---

### Phase 2 — Backend Install, Trajectory Hardening + Verification ✅ COMPLETE (FROZEN)
**Goal:** Backend installable, hardened with true trajectory-only attack proof, 20 scenarios, and frozen

**Steps:**
- [x] `pip install -r requirements.txt` (all dependencies confirmed installed)
- [x] Copy `.env.example` → `.env`, configured OpenRouter / fallback
- [x] `uvicorn main:app --reload` starts without errors
- [x] Health endpoint returns `{"status": "ok"}`
- [x] S6 Cumulative Context Exfiltration implemented (true trajectory-only attack)
- [x] `TRAJECTORY_ESCALATION` reason code + `triggered_by` lineage tracking implemented
- [x] 20 evaluation scenarios implemented (6 malicious, 5 safe, 4 near-miss, 3 failure, 2 unknown tool)
- [x] Action-order tests (`A → B → C` vs `C → B → A` and `A → B → C` vs `A → C`) verified
- [x] Chain reset session isolation verified (zero cross-session state leakage)
- [x] Fail-closed uncertainty verified (LLM failure → HOLD, unknown tool → HOLD, no uncertainty → ALLOW)
- [x] Backend frozen; ready for Phase 3 frontend

---

### Phase 3 — Frontend Scaffold ✅ COMPLETE
**Goal:** Vite React app with DESIGN (3).md design system

**Files:**
- `frontend/package.json` ✅ Complete
- `frontend/vite.config.js` ✅ Complete
- `frontend/index.html` ✅ Complete (Google Fonts Inter + JetBrains Mono)
- `frontend/src/main.jsx` ✅ Complete
- `frontend/src/App.jsx` ✅ Complete (Editorial Security Cockpit Shell)
- `frontend/src/index.css` ✅ Complete (Obsidian, Carbon, Graphite, Chalk, Smoke, Signal White, Compass Gold, Pulse Green)

**Verification:**
- [x] `npm install` runs cleanly with 0 errors
- [x] `npm run build` generates production bundle in 1.67s
- [x] Browser verification on `http://localhost:5173/`: live status badge connected to backend (`ENGINE LIVE / 8000`), 63px weight 400 display headline, hairline 1px `#212121` frames rendered

---

### Phase 4 — Frontend Components ✅ COMPLETE
**Goal:** All UI components built and wired adhering to `DESIGN (3).md`
- [x] `ScenarioSelector.jsx` — 20-scenario deck categorized by Attack, Safe, Near-Miss, Failure, Unknown
- [x] `RunTimeline.jsx` — live step-by-step action timeline with cumulative security state bar
- [x] `ActionCard.jsx` — individual action card with status badge (ALLOW/HOLD/BLOCK), semantics, and antecedent lineage links
- [x] `ViolationPanel.jsx` — detailed violation explanation with causal chain and fail-closed guarantee
- [x] `CounterfactualProof.jsx` — baseline vs protected side-by-side comparison table with divergence indicator
- [x] `BenchmarkModal.jsx` — 20-scenario evaluation report dialog with metrics and pass/fail table

---

### Phase 5 — Integration ✅ COMPLETE
**Goal:** Frontend calls backend API; full flow works
- [x] `/api` proxy targeting `http://127.0.0.1:8000` verified
- [x] Scenario selection → counterfactual run (`/api/counterfactual/{id}`) → results rendered
- [x] Single run (`/api/run`) in protected or baseline mode
- [x] Benchmark evaluation (`/api/evaluate`) across all 20 scenarios
- [x] Error states handled (API down banner, execution errors displayed)

---

### Phase 6 — Testing + Metrics ✅ COMPLETE
**Goal:** All acceptance criteria verified
- [x] All 20 scenarios produce expected decisions (100% detection rate, 100% prevention rate, 0% false block rate)
- [x] Interactive browser subagent test passing end-to-end (recorded video and screenshots saved)
- [x] S6 True Trajectory-only attack verified in UI: Steps 1-3 ALLOW, Step 4 BLOCK with `TRAJECTORY_ESCALATION`
- [x] S4 Benign trajectory verified in UI: All steps ALLOW, "TRAJECTORY VERIFIED SAFE"
- [x] Production build clean: `npm run build` succeeds in 1.48s

---

### Phase 7 — Polish + Demo Prep ✅ COMPLETE
**Goal:** Demo-ready for video recording
- [x] Senior Product Designer UX and Visual Hierarchy review conducted
- [x] Harmonized 1-indexed step numbering across Proof, Timeline, and AI Assistant
- [x] Benchmark Modal 20-scenario breakdown and metrics fully wired and verified
- [x] S6 Featured Demo Hero Card implemented with 1-click dual counterfactual execution
- [x] Baseline unmitigated security breach alert banner active
- [x] Scenario category filter keys fixed and outcome badges dynamically rendered
- [x] Comprehensive README.md with architecture, quickstart, and API contracts
- [x] DEMO_SCRIPT.md written for 3-minute hackathon pitch and judging walkthrough
- [x] git commit all work

---

## Backlog (Post-Hackathon)
- 999.1 MCP SDK integration (if straightforward)
- 999.2 Additional attack scenarios (8+ total)
- 999.3 Real-time WebSocket streaming of chain events
- 999.4 Authorization transition mechanism (currently always BLOCK on sensitive→external)
- 999.5 Export PDF report of evaluation run
