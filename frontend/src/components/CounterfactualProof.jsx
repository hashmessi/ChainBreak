import React from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, ArrowRight, GitCommit, Split, Lock, Scale, Sparkles } from 'lucide-react';
import { getJudgesExplainer } from '../utils/explainer';

export default function CounterfactualProof({ counterfactualResult, onRunAgain = null }) {
  if (!counterfactualResult) {
    return (
      <div className="proof-empty-state">
        <Split size={24} style={{ color: 'var(--color-compass-gold)', marginBottom: '12px' }} />
        <div className="empty-title">AWAITING COUNTERFACTUAL EXECUTION</div>
        <p className="empty-desc">
          Run any scenario in counterfactual mode to observe dual-track execution:
          Unprotected Baseline (Attack Succeeds) vs Protected ChainBreak (Attack Blocked).
        </p>
      </div>
    );
  }

  const {
    scenario_id,
    baseline,
    protected: protectedRun,
    attack_prevented,
    proof_statement,
    divergence_step
  } = counterfactualResult;

  const totalBaselineSteps = baseline?.actions?.length || 0;
  const totalProtectedSteps = protectedRun?.actions?.length || 0;

  // Find culprit action in protected run
  const culpritAction = protectedRun?.actions?.find(
    (a) => a.decision === 'BLOCK' || a.decision === 'HOLD' || a.step_index === divergence_step
  );

  const explainer = getJudgesExplainer({
    scenarioId: scenario_id,
    invariantName: culpritAction?.violations?.[0] || '',
    decision: protectedRun?.final_decision,
    tool: culpritAction?.tool || '',
    triggeredBy: culpritAction?.triggered_by || [],
    reason: culpritAction?.reason || ''
  });

  // Combine actions for comparative row display
  const maxSteps = Math.max(totalBaselineSteps, totalProtectedSteps);
  const rows = [];
  for (let i = 0; i < maxSteps; i++) {
    const stepNum = i + 1;
    const baseAct = baseline?.actions?.find((a) => a.step_index === stepNum);
    const protAct = protectedRun?.actions?.find((a) => a.step_index === stepNum);
    const isDivergence = stepNum === divergence_step;

    rows.push({
      stepNum,
      tool: protAct?.tool || baseAct?.tool || 'N/A',
      baseDecision: baseAct ? baseAct.decision : 'SKIPPED',
      baseExecuted: baseAct ? baseAct.executed : false,
      protDecision: protAct ? protAct.decision : 'HALTED',
      protExecuted: protAct ? protAct.executed : false,
      isDivergence,
      protReason: protAct?.reason || ''
    });
  }

  return (
    <div className="counterfactual-proof-container" id="counterfactual-proof-deck">
      {/* Proof Header Summary */}
      <div className="proof-summary-banner">
        <div className="proof-status-block">
          <div className="proof-badge-wrap">
            {attack_prevented ? (
              <div className="attack-prevented-pill success">
                <ShieldCheck size={14} />
                <span>ATTACK NEUTRALIZED</span>
              </div>
            ) : protectedRun?.final_decision === 'ALLOW' ? (
              <div className="attack-prevented-pill safe">
                <CheckCircle2 size={14} />
                <span>BENIGN TRAJECTORY (ZERO FALSE BLOCKS)</span>
              </div>
            ) : (
              <div className="attack-prevented-pill hold">
                <ShieldAlert size={14} />
                <span>EVALUATION COMPLETE</span>
              </div>
            )}
            <span className="scenario-tag">SCENARIO {scenario_id}</span>
          </div>

          <h3 className="proof-headline">
            {attack_prevented
              ? `ChainBreak neutralized unauthorized transmission at Step ${divergence_step}`
              : protectedRun?.final_decision === 'ALLOW'
              ? 'Autonomous agent completed all benign actions with zero friction'
              : 'Deterministic invariant enforcement completed'}
          </h3>

          {proof_statement && (
            <p className="proof-statement-text">
              {proof_statement}
            </p>
          )}

          {/* Judge's Briefing Inside Counterfactual Banner */}
          <div className="judges-takeaway-strip" style={{ marginTop: '16px' }}>
            <Scale size={14} style={{ color: 'var(--color-compass-gold)', flexShrink: 0 }} />
            <span>
              <strong>Judge's Briefing:</strong> {explainer.explanation}
            </span>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="proof-metrics-grid">
          <div className="metric-cell">
            <span className="metric-label">DIVERGENCE STEP</span>
            <span className="metric-value">
              {divergence_step ? `STEP ${String(divergence_step).padStart(2, '0')}` : 'NONE'}
            </span>
          </div>
          <div className="metric-cell">
            <span className="metric-label">BASELINE RESULT</span>
            <span className={`metric-value ${baseline?.final_decision === 'ALLOW' && attack_prevented ? 'danger' : ''}`}>
              {baseline?.final_decision || 'UNKNOWN'}
            </span>
          </div>
          <div className="metric-cell">
            <span className="metric-label">PROTECTED RESULT</span>
            <span className={`metric-value ${protectedRun?.final_decision === 'BLOCK' ? 'success' : ''}`}>
              {protectedRun?.final_decision || 'UNKNOWN'}
            </span>
          </div>
        </div>
      </div>

      {/* Comparative Matrix Table */}
      <div className="proof-matrix-wrap">
        <table className="proof-matrix-table">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>STEP</th>
              <th>TOOL CALL</th>
              <th style={{ width: '220px' }}>BASELINE (UNPROTECTED)</th>
              <th style={{ width: '260px' }}>CHAINBREAK (PROTECTED)</th>
              <th style={{ width: '140px' }}>DELTA</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.stepNum} className={row.isDivergence ? 'row-divergence' : ''}>
                <td className="cell-step">
                  <code>{String(row.stepNum).padStart(2, '0')}</code>
                </td>
                <td className="cell-tool">
                  <div className="tool-cell-wrap">
                    <code>{row.tool}</code>
                    {row.isDivergence && (
                      <span className="divergence-tag">CRITICAL INVARIANT BREACH</span>
                    )}
                  </div>
                </td>
                <td className="cell-baseline">
                  <div className="verdict-row">
                    <span className={`status-pill ${row.baseDecision.toLowerCase()}`}>
                      {row.baseDecision}
                    </span>
                    <span className="execution-tag">
                      {row.baseExecuted ? '✓ EXECUTED' : '✗ SKIPPED'}
                    </span>
                  </div>
                </td>
                <td className="cell-protected">
                  <div className="verdict-row">
                    <span className={`status-pill ${row.protDecision.toLowerCase()}`}>
                      {row.protDecision}
                    </span>
                    <span className={`execution-tag ${!row.protExecuted && row.isDivergence ? 'halted' : ''}`}>
                      {row.protExecuted ? '✓ EXECUTED' : '✗ DROPPED'}
                    </span>
                  </div>
                  {row.protReason && row.isDivergence && (
                    <div className="cell-reason">{row.protReason}</div>
                  )}
                </td>
                <td className="cell-delta">
                  {row.isDivergence ? (
                    <span className="delta-pill diverged">DIVERGED</span>
                  ) : (
                    <span className="delta-pill matched">CONCORDANT</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
