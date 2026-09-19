# ChainBreak — Project Context

## Project Identity
- **Name:** ChainBreak
- **Hackathon:** TLN Cybersecurity Challenge 2026
- **Build Window:** September 19–20, 2026 (48 hours)
- **Status:** IN PROGRESS

## Core Thesis
Runtime enforcement of security invariants for AI-agent action trajectories.

An AI agent can perform individually legitimate actions that collectively cross a forbidden security boundary. ChainBreak detects the boundary crossing **before** the violating action executes and proves the difference against an identical unprotected run.

## Positioning
> ChainBreak enforces security invariants over the evolving data and privilege trajectory of an AI agent.

**Not:** An AI firewall, MCP gateway, risk dashboard, or agent monitor.

## Technology Stack
- **Backend:** Python 3.12 + FastAPI + httpx + python-dotenv
- **Frontend:** React + Vite (vanilla CSS, no Tailwind)
- **LLM:** OpenRouter (free tier) for semantic extraction only
- **No database:** In-memory state per run (reproducible by design)

## Security Invariants (exactly 3)
1. `SENSITIVE_DATA_BOUNDARY` — PII/internal data + external destination = BLOCK
2. `SECRET_BOUNDARY` — Secret observed + external destination = BLOCK
3. `PRIVILEGE_BOUNDARY` — Privilege escalation without auth = BLOCK

## Evaluation Scenarios (5)
| ID | Name | Expected |
|----|------|----------|
| S1 | Silent PII Exfiltration | BLOCK |
| S2 | Secret Credential Leak | BLOCK |
| S3 | Unauthorized Privilege Escalation | BLOCK |
| S4 | Safe Internal Summary | ALLOW |
| S5 | Read Public Data + Send External | ALLOW |

## Key Architecture Rule
**LLM interprets. Deterministic code enforces.**
- LLM → `SemanticAttributes` (structured metadata only)
- Invariant engine → `ALLOW / HOLD / BLOCK` (no LLM involvement)

## Team
Solo developer — Hashvanth

## Repository
`c:\Users\Hashvanth\chain-break-dev\ChainBreak`

## Primary Metric
> Forbidden-state prevention rate (target: 100% on 3 dangerous scenarios)
