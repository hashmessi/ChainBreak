import React from 'react';
import { ShieldAlert, AlertOctagon, Terminal, ArrowRight, CheckCircle, Lock, Sparkles, Scale, Info } from 'lucide-react';
import { getJudgesExplainer } from '../utils/explainer';

export default function ViolationPanel({ chainState, scenarioId = '', onHighlightStep }) {
  if (!chainState) return null;

  const isBlocked = chainState.final_decision === 'BLOCK' || chainState.blocked_at_step !== null;
  const isHold = chainState.final_decision === 'HOLD';

  // Find culprit action
  const culpritAction = chainState.actions?.find(
    (a) => a.decision === 'BLOCK' || a.decision === 'HOLD' || a.step_index === chainState.blocked_at_step
  ) || chainState.actions?.[chainState.actions.length - 1];

  const invariantName = culpritAction?.violations?.[0] || (isHold ? 'FAIL_CLOSED_UNCERTAINTY' : 'INVARIANT_BOUNDARY_BREACH');
  const reasonText = culpritAction?.reason || 'Deterministic security boundary violated.';
  const triggeredSteps = culpritAction?.triggered_by || [];

  // Robust step index calculation (1-indexed for clear human presentation)
  const rawHalted = chainState.blocked_at_step !== null && chainState.blocked_at_step !== undefined
    ? chainState.blocked_at_step
    : culpritAction?.step_index;
  const haltedStepNum = rawHalted !== null && rawHalted !== undefined ? Number(rawHalted) + 1 : 1;

  // Filter triggered steps to valid positive predecessor steps (1-indexed)
  const validTriggeredSteps = triggeredSteps
    .map((s) => Number(s) + 1)
    .filter((s) => s !== haltedStepNum)
    .sort((a, b) => a - b);

  // Generate Judge's Plain-English Executive Summary
  const explainer = getJudgesExplainer({
    scenarioId: scenarioId || chainState.scenario_id,
    invariantName,
    decision: chainState.final_decision,
    tool: culpritAction?.tool || '',
    destination: culpritAction?.semantics?.destination || '',
    triggeredBy: validTriggeredSteps,
    reason: reasonText
  });

  if (!isBlocked && !isHold) {
    return (
      <div className="violation-panel clean" id="violation-panel-safe">
        <div className="violation-header">
          <div className="violation-icon-wrap safe">
            <CheckCircle size={20} />
          </div>
          <div>
            <div className="violation-status-pill safe">TRAJECTORY VERIFIED SAFE</div>
            <h3 className="violation-title">No Invariant Breaches Detected</h3>
            <p className="violation-subtitle">
              All {chainState.actions?.length || 0} tool calls evaluated within deterministic security invariants.
            </p>
          </div>
        </div>

        {/* Judge's Explainer for Safe Trajectory */}
        <div className="judges-explainer-card safe">
          <div className="judges-explainer-header">
            <Scale size={14} style={{ color: 'var(--color-pulse-green)' }} />
            <span className="judges-tag">{explainer.title}</span>
          </div>
          <p className="judges-headline">{explainer.headline}</p>
          <p className="judges-body-text">{explainer.explanation}</p>
          <div className="judges-takeaway-strip">
            <strong>Key Takeaway for Evaluators:</strong> {explainer.judgeTakeaway}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`violation-panel ${isBlocked ? 'blocked' : 'hold'}`} id="violation-panel-active">
      {/* Header */}
      <div className="violation-header">
        <div className={`violation-icon-wrap ${isBlocked ? 'blocked' : 'hold'}`}>
          {isBlocked ? <ShieldAlert size={22} /> : <AlertOctagon size={22} />}
        </div>
        <div style={{ flex: 1 }}>
          <div className="violation-status-pill">
            {isBlocked ? 'INVARIANT ENFORCEMENT: HALT' : 'FAIL-CLOSED POLICY: HOLD'}
          </div>
          <h3 className="violation-title">
            {invariantName.replace(/_/g, ' ')}
          </h3>
          <p className="violation-subtitle">
            Halted at <strong>Step {String(haltedStepNum).padStart(2, '0')}</strong>: Tool{' '}
            <code>{culpritAction?.tool || 'unknown_action'}</code>
          </p>
        </div>
      </div>

      <div className="violation-body">
        {/* JUDGE'S EXECUTIVE EXPLAINER CARD */}
        <div className={`judges-explainer-card ${explainer.badgeType}`}>
          <div className="judges-explainer-header">
            <Scale size={15} style={{ color: isBlocked ? 'var(--color-violation-red)' : 'var(--color-hold-amber)' }} />
            <span className="judges-tag">{explainer.title}</span>
            <span className="judges-badge-pill">{explainer.badge}</span>
          </div>

          <h4 className="judges-headline">{explainer.headline}</h4>
          <p className="judges-body-text">{explainer.explanation}</p>

          <div className="judges-takeaway-strip">
            <Sparkles size={13} style={{ color: 'var(--color-compass-gold)', flexShrink: 0 }} />
            <span>
              <strong>Judge's Key Takeaway:</strong> {explainer.judgeTakeaway}
            </span>
          </div>
        </div>

        {/* Technical Causal Invariant Reason */}
        <div className="violation-detail-section">
          <span className="section-label">TECHNICAL INVARIANT REASON:</span>
          <p className="reason-content">{reasonText}</p>
        </div>

        {/* Lineage Step Trace (Only when valid predecessor steps exist) */}
        {validTriggeredSteps.length > 0 && (
          <div className="violation-lineage-trace">
            <span className="section-label">ACCUMULATED CHAIN ANTECEDENTS:</span>
            <div className="lineage-steps-grid">
              {validTriggeredSteps.map((stepNum) => (
                <button
                  key={stepNum}
                  type="button"
                  className="lineage-trace-badge"
                  onClick={() => onHighlightStep && onHighlightStep(stepNum)}
                  title={`Focus Step ${stepNum}`}
                >
                  <span>STEP {String(stepNum).padStart(2, '0')}</span>
                  <ArrowRight size={10} />
                </button>
              ))}
              <div className="lineage-trace-badge culprit">
                <span>STEP {String(haltedStepNum).padStart(2, '0')} [HALTED]</span>
              </div>
            </div>
            <p className="lineage-hint">
              Each predecessor step was individually permitted. The aggregate composition triggered an invariant violation.
            </p>
          </div>
        )}

        {/* Security Invariant Guarantee */}
        <div className="violation-guarantee-box">
          <Lock size={14} style={{ color: 'var(--color-compass-gold)', flexShrink: 0 }} />
          <span>
            <strong>Fail-Closed Guarantee:</strong> The intercepted action was dropped before reaching any external
            network interface. Zero bytes transmitted to untrusted destinations.
          </span>
        </div>
      </div>
    </div>
  );
}
