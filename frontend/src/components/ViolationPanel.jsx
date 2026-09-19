import React from 'react';
import { ShieldAlert, AlertOctagon, Terminal, ArrowRight, CheckCircle, Lock } from 'lucide-react';

export default function ViolationPanel({ chainState, onHighlightStep }) {
  if (!chainState) return null;

  const isBlocked = chainState.final_decision === 'BLOCK' || chainState.blocked_at_step !== null;
  const isHold = chainState.final_decision === 'HOLD';

  if (!isBlocked && !isHold) {
    return (
      <div className="violation-panel clean" id="violation-panel-safe">
        <div className="violation-header">
          <div className="violation-icon-wrap safe">
            <CheckCircle size={18} />
          </div>
          <div>
            <div className="violation-title">TRAJECTORY VERIFIED SAFE</div>
            <div className="violation-subtitle">
              All {chainState.actions?.length || 0} tool calls evaluated within deterministic security invariants.
            </div>
          </div>
        </div>
        <div className="violation-guarantee">
          <span>ZERO INVARIANT VIOLATIONS DETECTED • NO UNAUTHORIZED EGRESS OBSERVED</span>
        </div>
      </div>
    );
  }

  // Find the action that caused the block/hold
  const culpritAction = chainState.actions?.find(
    (a) => a.decision === 'BLOCK' || a.decision === 'HOLD' || a.step_index === chainState.blocked_at_step
  ) || chainState.actions?.[chainState.actions.length - 1];

  const invariantName = culpritAction?.violations?.[0] || (isHold ? 'FAIL_CLOSED_UNCERTAINTY' : 'INVARIANT_BOUNDARY_BREACH');
  const reasonText = culpritAction?.reason || 'Deterministic security boundary violated.';
  const triggeredSteps = culpritAction?.triggered_by || [];

  return (
    <div className={`violation-panel ${isBlocked ? 'blocked' : 'hold'}`} id="violation-panel-active">
      <div className="violation-header">
        <div className={`violation-icon-wrap ${isBlocked ? 'blocked' : 'hold'}`}>
          {isBlocked ? <ShieldAlert size={20} /> : <AlertOctagon size={20} />}
        </div>
        <div style={{ flex: 1 }}>
          <div className="violation-status-pill">
            {isBlocked ? 'INVARIANT ENFORCEMENT: HALT' : 'FAIL-CLOSED: HOLD'}
          </div>
          <h3 className="violation-title">
            {invariantName.replace(/_/g, ' ')}
          </h3>
          <p className="violation-subtitle">
            Halted at Step {chainState.blocked_at_step || culpritAction?.step_index || 'N/A'}: Tool{' '}
            <code>{culpritAction?.tool}</code>
          </p>
        </div>
      </div>

      {/* Causal Chain Explanation */}
      <div className="violation-body">
        <div className="violation-detail-section">
          <span className="section-label">CAUSAL INVARIANT REASON:</span>
          <p className="reason-content">{reasonText}</p>
        </div>

        {/* Lineage Step Trace */}
        {triggeredSteps.length > 0 && (
          <div className="violation-lineage-trace">
            <span className="section-label">ACCUMULATED CHAIN ANTECEDENTS:</span>
            <div className="lineage-steps-grid">
              {triggeredSteps.map((stepNum) => (
                <button
                  key={stepNum}
                  type="button"
                  className="lineage-trace-badge"
                  onClick={() => onHighlightStep && onHighlightStep(stepNum)}
                >
                  <span>STEP {String(stepNum).padStart(2, '0')}</span>
                  <ArrowRight size={10} />
                </button>
              ))}
              <div className="lineage-trace-badge culprit">
                <span>STEP {String(culpritAction?.step_index).padStart(2, '0')} [BLOCKED]</span>
              </div>
            </div>
            <p className="lineage-hint">
              Each predecessor step was individually permitted. The aggregate composition triggered an invariant violation.
            </p>
          </div>
        )}

        {/* Security Invariant Guarantee */}
        <div className="violation-guarantee-box">
          <Lock size={13} style={{ color: 'var(--color-compass-gold)', flexShrink: 0 }} />
          <span>
            <strong>Fail-Closed Guarantee:</strong> The intercepted action was dropped before reaching any external
            network interface. Zero bytes transmitted.
          </span>
        </div>
      </div>
    </div>
  );
}
