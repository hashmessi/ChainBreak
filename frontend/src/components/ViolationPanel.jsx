import React from 'react';
import { ShieldAlert, AlertOctagon, CheckCircle, Lock, ArrowRight, Scale, Sparkles } from 'lucide-react';
import { getJudgesExplainer } from '../utils/explainer';

/**
 * ViolationPanel — Streamlined inline alert (not a multi-section wall).
 * Shows: invariant name + halted step + compact reason + lineage chain.
 * Judge's explainer is REMOVED from here — it lives only in CounterfactualProof.
 */
export default function ViolationPanel({ chainState, scenarioId = '', onHighlightStep }) {
  if (!chainState) return null;

  const isBlocked = chainState.final_decision === 'BLOCK' || chainState.blocked_at_step !== null;
  const isHold = chainState.final_decision === 'HOLD';

  const culpritAction = chainState.actions?.find(
    (a) => a.decision === 'BLOCK' || a.decision === 'HOLD' || a.step_index === chainState.blocked_at_step
  ) || chainState.actions?.[chainState.actions.length - 1];

  const invariantName = culpritAction?.violations?.[0] || (isHold ? 'FAIL_CLOSED_UNCERTAINTY' : 'INVARIANT_BOUNDARY_BREACH');
  const reasonText = culpritAction?.reason || 'Deterministic security boundary violated.';
  const triggeredSteps = culpritAction?.triggered_by || [];

  const rawHalted = chainState.blocked_at_step !== null && chainState.blocked_at_step !== undefined
    ? chainState.blocked_at_step
    : culpritAction?.step_index;
  const haltedStepNum = rawHalted !== null && rawHalted !== undefined ? Number(rawHalted) + 1 : 1;

  const validTriggeredSteps = triggeredSteps
    .map((s) => Number(s) + 1)
    .filter((s) => s !== haltedStepNum)
    .sort((a, b) => a - b);

  const isSafe = !isBlocked && !isHold;

  const explainer = getJudgesExplainer({
    scenarioId,
    invariantName,
    decision: chainState.final_decision,
    tool: culpritAction?.tool || '',
    destination: culpritAction?.destination || '',
    triggeredBy: validTriggeredSteps,
    reason: reasonText,
  });

  const briefingType = isBlocked ? 'danger' : isSafe ? 'success' : 'hold';

  if (isSafe) {
    return (
      <div className="violation-panel clean" id="violation-panel-safe">
        <div className="violation-header">
          <div className="violation-icon-wrap safe">
            <CheckCircle size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="violation-status-pill safe">TRAJECTORY VERIFIED SAFE</div>
            <h3 className="violation-title">No Invariant Breaches</h3>
            <p className="violation-subtitle">
              All {chainState.actions?.length || 0} actions within authorized boundaries.
            </p>
          </div>
        </div>
        <div className="violation-body">
          <div className="judges-briefing-card success" style={{ marginTop: '4px' }}>
            <div className="judges-briefing-header">
              <Scale size={13} style={{ color: 'var(--color-pulse-green)' }} />
              <span className="judges-tag">{explainer.title}</span>
              <span className="judges-badge-pill">{explainer.badge}</span>
            </div>
            <div className="judges-headline" style={{ fontSize: '13px' }}>{explainer.headline}</div>
            <p className="judges-body-text" style={{ fontSize: '12px' }}>{explainer.explanation}</p>
            <div className="judges-takeaway-strip">
              <Sparkles size={12} style={{ color: 'var(--color-compass-gold)', flexShrink: 0 }} />
              <span>
                <strong>Judge Takeaway:</strong> {explainer.judgeTakeaway}
              </span>
            </div>
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
          {isBlocked ? <ShieldAlert size={18} /> : <AlertOctagon size={18} />}
        </div>
        <div style={{ flex: 1 }}>
          <div className="violation-status-pill">
            {isBlocked ? 'INVARIANT ENFORCEMENT: HALT' : 'FAIL-CLOSED: HOLD'}
          </div>
          <h3 className="violation-title">
            {invariantName.replace(/_/g, ' ')}
          </h3>
          <p className="violation-subtitle">
            Step <strong>{String(haltedStepNum).padStart(2, '0')}</strong> · <code>{culpritAction?.tool || 'unknown'}</code>
          </p>
        </div>
      </div>

      <div className="violation-body">
        {/* Compact reason */}
        <p className="reason-content" style={{ fontSize: '13px' }}>
          {reasonText.length > 200 ? reasonText.substring(0, 200) + '...' : reasonText}
        </p>

        {/* Judge's Executive Verdict Banner */}
        <div className={`judges-briefing-card ${briefingType}`} style={{ marginTop: '8px', marginBottom: '8px' }}>
          <div className="judges-briefing-header">
            <Scale size={13} style={{ color: isBlocked ? 'var(--color-violation-red)' : 'var(--color-hold-amber)' }} />
            <span className="judges-tag">{explainer.title}</span>
            <span className="judges-badge-pill">{explainer.badge}</span>
          </div>
          <div className="judges-headline" style={{ fontSize: '13px' }}>{explainer.headline}</div>
          <p className="judges-body-text" style={{ fontSize: '12px' }}>{explainer.explanation}</p>
          <div className="judges-takeaway-strip">
            <Sparkles size={12} style={{ color: 'var(--color-compass-gold)', flexShrink: 0 }} />
            <span>
              <strong>Judge Takeaway:</strong> {explainer.judgeTakeaway}
            </span>
          </div>
        </div>

        {/* Lineage chain */}
        {validTriggeredSteps.length > 0 && (
          <div className="violation-lineage-trace">
            <span className="section-label">CHAIN ANTECEDENTS:</span>
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
                  <ArrowRight size={9} />
                </button>
              ))}
              <div className="lineage-trace-badge culprit">
                <span>STEP {String(haltedStepNum).padStart(2, '0')} [HALTED]</span>
              </div>
            </div>
          </div>
        )}

        {/* Guarantee */}
        <div className="violation-guarantee-box">
          <Lock size={13} style={{ color: 'var(--color-compass-gold)', flexShrink: 0 }} />
          <span>
            <strong>Zero egress.</strong> Payload dropped before reaching any external network.
          </span>
        </div>
      </div>
    </div>
  );
}
