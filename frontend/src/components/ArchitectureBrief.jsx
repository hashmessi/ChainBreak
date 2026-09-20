import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, Code, Cpu, ArrowRight, Zap, Copy, Check } from 'lucide-react';

export default function ArchitectureBrief() {
  const [activeView, setActiveView] = useState('contrast'); // 'contrast' | 'sdk'
  const [copied, setCopied] = useState(false);

  const sdkCode = `# Install: pip install chainbreak
from chainbreak import ChainBreakRuntime, InvariantBreach

runtime = ChainBreakRuntime(policy="strict")

# Drop-in interceptor hook for LangChain / CrewAI / Swarm tool loops
@agent.on_tool_call
async def enforce_trajectory_invariants(tool_call, context):
    decision = await runtime.evaluate_trajectory(tool_call, context)
    if decision.status == "BLOCK":
        # Trajectory halted before socket execution: zero network egress
        raise InvariantBreach(decision.violation, lineage=decision.antecedents)
    return await tool_call.execute()`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sdkCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="arch-brief-container" id="arch-brief-panel">
      {/* View Toggle Bar */}
      <div className="arch-brief-nav">
        <div className="arch-brief-title-cluster">
          <Cpu size={14} style={{ color: 'var(--color-compass-gold)' }} />
          <span className="arch-brief-title">ARCHITECTURAL SPECIFICATION</span>
        </div>
        <div className="arch-brief-toggle-group">
          <button
            type="button"
            className={`arch-toggle-btn ${activeView === 'contrast' ? 'active' : ''}`}
            onClick={() => setActiveView('contrast')}
          >
            <ShieldAlert size={12} />
            <span>WHY FIREWALLS FAIL</span>
          </button>
          <button
            type="button"
            className={`arch-toggle-btn ${activeView === 'sdk' ? 'active' : ''}`}
            onClick={() => setActiveView('sdk')}
          >
            <Code size={12} />
            <span>DROP-IN SDK (6 LINES)</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Contrast Matrix */}
      {activeView === 'contrast' && (
        <div className="arch-contrast-grid">
          {/* Traditional Perimeter / Guardrail */}
          <div className="arch-contrast-col legacy">
            <div className="col-header">
              <div className="col-status-pill danger">PERIMETER / PROMPT GUARDRAILS</div>
              <h4>Point-in-Time Action Inspection</h4>
              <p className="col-subtitle">NeMo Guardrails, Guardrails AI, API Gateways</p>
            </div>
            <div className="col-points">
              <div className="col-point-item">
                <span className="bullet-indicator danger">✕</span>
                <div>
                  <strong>Zero Stateful Lineage:</strong> Evaluates tool calls in strict isolation. Reads, syntheses, and exports are all individually approved.
                </div>
              </div>
              <div className="col-point-item">
                <span className="bullet-indicator danger">✕</span>
                <div>
                  <strong>Blind to Trajectory Escalation:</strong> In Scenario S6, 4/4 benign actions pass security checks. Exfiltration succeeds undetected.
                </div>
              </div>
              <div className="col-point-item">
                <span className="bullet-indicator danger">✕</span>
                <div>
                  <strong>High Latency Penalty:</strong> Re-querying LLM-as-a-judge on every single step adds 1.5s–3.0s per tool call.
                </div>
              </div>
            </div>
            <div className="col-footer-verdict danger">
              FAIL RATE ON MULTI-STEP ATTACKS: 100%
            </div>
          </div>

          {/* ChainBreak Trajectory Invariants */}
          <div className="arch-contrast-col active">
            <div className="col-header">
              <div className="col-status-pill success">CHAINBREAK RUNTIME ENGINE</div>
              <h4>Causal Trajectory Invariants</h4>
              <p className="col-subtitle">Stateful Causal Graph + Deterministic Invariants</p>
            </div>
            <div className="col-points">
              <div className="col-point-item">
                <span className="bullet-indicator success">✓</span>
                <div>
                  <strong>Stateful Causal Provenance:</strong> Tracks lineage across the full chain (<code>triggered_by: [1, 2, 3]</code>) from origin to egress.
                </div>
              </div>
              <div className="col-point-item">
                <span className="bullet-indicator success">✓</span>
                <div>
                  <strong>Deterministic Invariant Interception:</strong> Pure Python invariant logic halts at Step 04 before socket transmission. Zero bytes egress.
                </div>
              </div>
              <div className="col-point-item">
                <span className="bullet-indicator success">✓</span>
                <div>
                  <strong>Sub-Millisecond Overhead:</strong> Mean evaluation latency is &lt; 0.15ms. Zero noticeable latency on agent trajectories.
                </div>
              </div>
            </div>
            <div className="col-footer-verdict success">
              PREVENTION RATE ON S6 ATTACK: 100% (ZERO EGRESS)
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: 6-Line Drop-in SDK */}
      {activeView === 'sdk' && (
        <div className="arch-sdk-view">
          <div className="sdk-header">
            <div>
              <h4 className="sdk-title">Universal Agent Interceptor Middleware</h4>
              <p className="sdk-desc">
                Drops directly into LangChain, CrewAI, AutoGen, or OpenAI Swarm runtime loops with zero architectural rewrites.
              </p>
            </div>
            <button
              type="button"
              className="btn-ghost-outline copy-btn"
              onClick={handleCopy}
            >
              {copied ? <Check size={12} style={{ color: 'var(--color-pulse-green)' }} /> : <Copy size={12} />}
              <span>{copied ? 'COPIED' : 'COPY SNIPPET'}</span>
            </button>
          </div>
          <div className="sdk-code-frame">
            <pre>
              <code>{sdkCode}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
