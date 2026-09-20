import React from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, Split, Lock, Scale, Sparkles } from 'lucide-react';
import { getJudgesExplainer } from '../utils/explainer';

/**
 * CounterfactualProof — Primary "Proof" view
 * 
 * Shows: verdict card → judge's briefing (SINGLE instance) → 
 * metrics row → visual divergence diagram
 */
export default function CounterfactualProof({ counterfactualResult, onRunAgain = null, onRunFeatured = null }) {
  if (!counterfactualResult) {
    return (
      <div className="proof-empty-state">
        <Split size={24} style={{ color: 'var(--color-compass-gold)', marginBottom: '12px' }} />
        <div className="empty-title">AWAITING COUNTERFACTUAL EXECUTION</div>
        <p className="empty-desc">
          Run any scenario to see dual-track proof: Baseline (unprotected) vs Protected (ChainBreak).
        </p>
        {(onRunFeatured || onRunAgain) && (
          <button
            type="button"
            className="btn-pill-primary"
            style={{ marginTop: '14px', gap: '6px' }}
            onClick={() => onRunFeatured ? onRunFeatured('S6') : onRunAgain('S6')}
            id="btn-proof-run-s6"
          >
            <Sparkles size={13} />
            <span>RUN S6 TRAJECTORY ATTACK PROOF</span>
          </button>
        )}
      </div>
    );
  }

  const {
    scenario_id: rawScenarioId,
    scenario,
    baseline,
    protected: protectedRun,
    attack_prevented: rawAttackPrevented,
    correctly_blocked,
    proof_statement,
    divergence_step: rawDivergenceStep
  } = counterfactualResult;

  const scenario_id = rawScenarioId || scenario?.id || 'UNKNOWN';
  const attack_prevented = rawAttackPrevented ?? correctly_blocked ?? (protectedRun?.final_decision === 'BLOCK');
  const divergence_step = rawDivergenceStep ?? protectedRun?.blocked_at_step ?? null;

  const totalBaselineSteps = baseline?.actions?.length || 0;
  const totalProtectedSteps = protectedRun?.actions?.length || 0;

  const culpritAction = protectedRun?.actions?.find(
    (a) => a.decision === 'BLOCK' || a.decision === 'HOLD' || a.step_index === divergence_step
  );

  // 1-indexed step number for human display
  const divergenceStepNum = culpritAction && culpritAction.step_index !== undefined
    ? Number(culpritAction.step_index) + 1
    : (divergence_step !== null && divergence_step !== undefined ? Number(divergence_step) + 1 : null);

  const explainer = getJudgesExplainer({
    scenarioId: scenario_id,
    invariantName: culpritAction?.violations?.[0] || '',
    decision: protectedRun?.final_decision,
    tool: culpritAction?.tool || '',
    triggeredBy: culpritAction?.triggered_by || [],
    reason: culpritAction?.reason || ''
  });

  // Determine card type
  const isBlocked = attack_prevented;
  const isSafe = protectedRun?.final_decision === 'ALLOW';
  const cardType = isBlocked ? 'blocked' : isSafe ? 'safe' : 'hold';
  const briefingType = isBlocked ? 'danger' : isSafe ? 'success' : 'hold';

  // Build comparison rows
  const maxSteps = Math.max(totalBaselineSteps, totalProtectedSteps);
  const rows = [];
  for (let i = 0; i < maxSteps; i++) {
    const stepNum = i + 1;
    const baseAct = baseline?.actions?.[i] || baseline?.actions?.find((a) => a.step_index === i || a.step_index === stepNum);
    const protAct = protectedRun?.actions?.[i] || protectedRun?.actions?.find((a) => a.step_index === i || a.step_index === stepNum);
    const isDivergence = stepNum === divergenceStepNum || (protAct && (protAct.decision === 'BLOCK' || protAct.decision === 'HOLD'));

    rows.push({
      stepNum,
      tool: protAct?.tool || baseAct?.tool || 'N/A',
      baseDecision: baseAct ? baseAct.decision : 'SKIPPED',
      baseExecuted: baseAct ? baseAct.executed : false,
      protDecision: protAct ? protAct.decision : 'HALTED',
      protExecuted: protAct ? protAct.executed : false,
      isDivergence
    });
  }

  return (
    <div className="counterfactual-proof-container" id="counterfactual-proof-deck">
      {/* Verdict Card */}
      <div className={`proof-verdict-card ${cardType}`}>
        <div className="proof-badge-wrap">
          {isBlocked ? (
            <div className="attack-prevented-pill success">
              <ShieldCheck size={13} />
              <span>ATTACK NEUTRALIZED</span>
            </div>
          ) : isSafe ? (
            <div className="attack-prevented-pill safe">
              <CheckCircle2 size={13} />
              <span>BENIGN TRAJECTORY</span>
            </div>
          ) : (
            <div className="attack-prevented-pill hold">
              <ShieldAlert size={13} />
              <span>EVALUATION COMPLETE</span>
            </div>
          )}
          <span className="scenario-tag">SCENARIO {scenario_id}</span>
        </div>

        <h3 className="proof-headline">
          {isBlocked
            ? `ChainBreak intercepted at Step ${divergenceStepNum ? String(divergenceStepNum).padStart(2, '0') : '04'} (${culpritAction?.tool || 'action'})`
            : isSafe
            ? 'All actions completed — zero false positives'
            : 'Deterministic enforcement completed'}
        </h3>

        {proof_statement && (
          <p className="proof-statement-text">{proof_statement}</p>
        )}
      </div>

      {/* Judge's Briefing — SINGLE authoritative instance */}
      <div className={`judges-briefing-card ${briefingType}`}>
        <div className="judges-briefing-header">
          <Scale size={14} style={{ color: isBlocked ? 'var(--color-violation-red)' : isSafe ? 'var(--color-pulse-green)' : 'var(--color-hold-amber)' }} />
          <span className="judges-tag">{explainer.title}</span>
          <span className="judges-badge-pill">{explainer.badge}</span>
        </div>
        <h4 className="judges-headline">{explainer.headline}</h4>
        <p className="judges-body-text">{explainer.explanation}</p>
        <div className="judges-takeaway-strip">
          <Sparkles size={12} style={{ color: 'var(--color-compass-gold)', flexShrink: 0, marginTop: '2px' }} />
          <span>
            <strong>Key Takeaway:</strong> {explainer.judgeTakeaway}
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="proof-metrics-row">
        <div className="metric-cell">
          <span className="metric-label">DIVERGENCE STEP</span>
          <span className="metric-value">
            {divergenceStepNum ? `Step ${String(divergenceStepNum).padStart(2, '0')}` : '—'}
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

      {/* Visual Divergence Diagram */}
      <div className="divergence-diagram">
        {/* Baseline Track */}
        <div className="divergence-track">
          <div className="divergence-track-header">BASELINE (UNPROTECTED)</div>
          {rows.map((row) => (
            <div key={`base-${row.stepNum}`} className={`divergence-step-row ${row.isDivergence ? 'is-break' : ''}`}>
              <span className="divergence-step-num">{String(row.stepNum).padStart(2, '0')}</span>
              <span className="divergence-step-tool">{row.tool}</span>
              <span className="divergence-step-decision">
                <span className={`status-pill ${row.baseDecision.toLowerCase()}`}>
                  {row.baseDecision}
                </span>
              </span>
            </div>
          ))}
        </div>

        {/* Center divergence indicators */}
        <div className="divergence-center">
          {rows.map((row) => (
            <div key={`center-${row.stepNum}`} className="divergence-break-indicator">
              {row.isDivergence ? (
                <div className="break-line" />
              ) : (
                <div className="concordant-line" />
              )}
            </div>
          ))}
        </div>

        {/* Protected Track */}
        <div className="divergence-track">
          <div className="divergence-track-header">CHAINBREAK (PROTECTED)</div>
          {rows.map((row) => (
            <div key={`prot-${row.stepNum}`} className={`divergence-step-row ${row.isDivergence ? 'is-break' : ''}`}>
              <span className="divergence-step-num">{String(row.stepNum).padStart(2, '0')}</span>
              <span className="divergence-step-tool">{row.tool}</span>
              <span className="divergence-step-decision">
                <span className={`status-pill ${row.protDecision.toLowerCase()}`}>
                  {row.protDecision}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
