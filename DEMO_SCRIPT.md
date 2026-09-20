# ChainBreak — 3-Minute Hackathon Judging & Demo Script

**Target Audience**: Hackathon Judges, Security Evaluators, AI Engineers  
**Duration**: 2.5 – 3.0 minutes  
**Flagship Scenario**: **S6 (Cumulative Context Exfiltration)**

---

## Act 1: The Problem (0:00 – 0:45) — "Why Firewalls Fail Autonomous Agents"

**Visual**: Home Page / Scenarios Tab (`http://localhost:5173/`). Point to the top Flagship Demo Banner.

> **Spoken Script**:  
> *"Judges, today's AI agent security tools evaluate tool calls one by one at the perimeter. They ask: Is reading public data allowed? Yes. Is loading customer context allowed? Yes. Is generating a summary allowed? Yes. Is sending an external summary allowed? Yes.*  
>  
> *Every single tool call is individually benign. But when autonomous agents chain them together, they form **multi-step trajectory attacks** that steal confidential data without ever triggering a point-in-time firewall.*  
>  
> *Meet **ChainBreak**: a deterministic runtime invariant engine that treats an agent's execution not as isolated actions, but as a stateful, evolving causal trajectory."*

---

## Act 2: The Golden Path Demo — Scenario S6 (0:45 – 1:45)

**Visual**: Click `[▶ RUN S6 DUAL PROOF]` directly from the Flagship Hero Banner.

> **Spoken Script**:  
> *"Let's test this live with Scenario S6. In one click, ChainBreak executes a dual-track counterfactual test: Baseline without protection vs Protected with ChainBreak.*  
>  
> *(Pointing to Interception tab)*  
> *Look at the trajectory:*  
> - *Step 1: The agent reads public data. Permitted.*  
> - *Step 2: The agent reads internal customer CRM context. Permitted.*  
> - *Step 3: The agent generates an executive content summary. Permitted.*  
> - *Step 4: Now the agent attempts `send_external_summary`.*  
>  
> *Notice what happened! ChainBreak did not wait for an anomaly score. It deterministically evaluated its mathematical security invariants, identified that the accumulated lineage contains sensitive customer records destined for an external recipient, and **severed execution immediately at Step 04** under reason code `TRAJECTORY_ESCALATION`.*  
>  
> *Zero network egress. The payload was dropped before ever hitting the wire."*

---

## Act 3: The Counterfactual Proof & Baseline Breach (1:45 – 2:20)

**Visual**: Toggle to `BASELINE` mode in the Interception Tab, then switch to the `Proof` tab.

> **Spoken Script**:  
> *(Toggling to Baseline)*  
> *"What would have happened without ChainBreak? Look at the Baseline view. All 4 steps executed unchecked. This was an unmitigated security breach where customer PII was exfiltrated to an external server.*  
>  
> *(Switching to Proof tab)*  
> *Now click the Proof tab. Here is our mathematical counterfactual proof:  
> Steps 1 through 3 are 100% concordant between Baseline and Protected. But at Step 04, the trajectories diverge completely. ChainBreak caught the breach at the exact inflection point where benign reads transitioned into external theft."*

---

## Act 4: Quantitative Verification & Fail-Closed Resilience (2:20 – 3:00)

**Visual**: Click `BENCHMARK` top-right button, show the 20-scenario suite.

> **Spoken Script**:  
> *"This isn't a hardcoded demo. Let's open our Verification Suite.*  
>  
> *ChainBreak runs across 20 rigorous benchmark scenarios:  
> - 6 malicious attack chains — **100% caught, 100% prevented.**  
> - 9 safe and near-miss workflows — **0% false positive block rate.**  
> - 5 failure and unknown tool cases — **strict fail-closed containment to HOLD (never silently failing open).**  
> - And the mean invariant overhead is **less than 1 millisecond**.*  
>  
> *Single-action firewalls can't protect autonomous agents. Security is a property of the full trajectory. Thank you."*

---

## Quick Demo Checklist Before Hitting Record
- [ ] Backend running on `http://127.0.0.1:8000` (`python -m uvicorn backend.main:app --port 8000`)
- [ ] Frontend running on `http://localhost:5173/` (`npm run dev`)
- [ ] Status badge in top nav reads `ENGINE LIVE / 8000`
- [ ] Browser zoom set to 100% for crisp display typography
