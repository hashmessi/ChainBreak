# ChainBreak — Requirements

## Must Ship (MVP)
- [ ] Tool interception pipeline
- [ ] Chain state + data lineage tracking
- [ ] 3 security invariants (deterministic Python)
- [ ] LLM semantic extraction via OpenRouter
- [ ] ALLOW / HOLD / BLOCK enforcement
- [ ] 6 sandbox tools (synthetic only)
- [ ] Counterfactual runner (baseline vs protected)
- [ ] 5 evaluation scenarios (3 dangerous, 2 safe)
- [ ] FastAPI backend with REST API
- [ ] React frontend: scenario selector + live timeline + violation panel + proof table
- [ ] Evaluation metrics: detection rate, prevention rate, false-block rate, latency

## Security Requirements (non-negotiable)
- SR1: All scenarios run in synthetic sandbox
- SR2: No real credentials
- SR3: No real external transmissions
- SR4: Fail closed — LLM failure → HOLD, not ALLOW
- SR5: Invariant evaluation deterministic and independently testable
- SR6: Every ALLOW/HOLD/BLOCK is recorded as an event
- SR7: Every scenario is replayable exactly

## Out of Scope
- Authentication / multi-tenancy / user accounts
- Real customer data / real credentials / real email
- Browser extensions / mobile app
- Cloud deployment / microservices
- Redis / Kafka / Celery / vector DB
- Enterprise policy management / SIEM integration
- Custom model training / RAG

## Acceptance Criteria
- AC1: Every tool request evaluated before execution (protected mode)
- AC2: Full trajectory retained across actions
- AC3: Sensitive data traceable from source to destination
- AC4: Known invariant violation returns BLOCK
- AC5: Blocked action never reaches sandbox tool
- AC6: LLM failure → HOLD (not ALLOW)
- AC7: Baseline attack succeeds; protected run prevents it
- AC8: Safe scenarios complete without blocking
- AC9: Metrics reported: detection rate, prevention rate, false-block rate, latency
- AC10: Every block explains: trigger, invariant, data, destination, reason
