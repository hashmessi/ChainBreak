import React from 'react';
import ActionCard from './ActionCard';
import ViolationPanel from './ViolationPanel';
import { Activity, Layers, ShieldAlert, Sparkles, AlertTriangle } from 'lucide-react';

/**
 * RunTimeline — Full-width "Interception" view
 * Shows step-by-step timeline with visual connectors.
 * Steps are collapsed by default (handled by ActionCard).
 */
export default function RunTimeline({
  chainState,
  scenarioId = '',
  runMode = 'PROTECTED',
  onModeToggle = null,
  isCounterfactualAvailable = false,
  divergenceStep = null,
  highlightedStep = null,
  onStepRefClick = null,
  onRunFeatured = null
}) {
  if (!chainState || !chainState.actions || chainState.actions.length === 0) {
    return (
      <div className="timeline-empty-state">
        <Activity size={24} style={{ color: 'var(--color-compass-gold)', marginBottom: '12px' }} />
        <div className="empty-title">NO EXECUTION TELEMETRY</div>
        <p className="empty-desc">
          Select a scenario and run counterfactual execution to inspect action interception.
        </p>
        {onRunFeatured && (
          <button
            type="button"
            className="btn-pill-primary"
            style={{ marginTop: '14px', gap: '6px' }}
            onClick={() => onRunFeatured('S6')}
            id="btn-timeline-run-s6"
          >
            <Sparkles size={13} />
            <span>RUN S6 TRAJECTORY ATTACK DEMO</span>
          </button>
        )}
      </div>
    );
  }

  const { actions, privilege_level, sensitive_data_observed, secrets_observed, destinations, final_decision, blocked_at_step } = chainState;

  // Detect if baseline permitted a dangerous exfiltration
  const isBaselineBreach = runMode === 'BASELINE' && (
    (destinations && destinations.includes('EXTERNAL') && (sensitive_data_observed || secrets_observed)) ||
    (scenarioId && ['S1', 'S2', 'S3', 'S6', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6'].includes(scenarioId.toUpperCase()))
  );

  return (
    <div className="run-timeline-container" id="run-timeline-panel">
      {/* Mode Switcher & Telemetry Header */}
      <div className="timeline-control-header">
        <div className="timeline-title-wrap">
          <Layers size={14} style={{ color: 'var(--color-compass-gold)' }} />
          <span className="timeline-section-title">INTERCEPTION TELEMETRY</span>
          <span className="badge-pill" style={{ padding: '2px 6px', fontSize: '10px' }}>
            {actions.length} {actions.length === 1 ? 'STEP' : 'STEPS'}
          </span>
        </div>

        {isCounterfactualAvailable && onModeToggle && (
          <div className="mode-toggle-group">
            <button
              type="button"
              className={`mode-toggle-btn ${runMode === 'PROTECTED' ? 'active protected' : ''}`}
              onClick={() => onModeToggle('PROTECTED')}
            >
              PROTECTED
            </button>
            <button
              type="button"
              className={`mode-toggle-btn ${runMode === 'BASELINE' ? 'active baseline' : ''}`}
              onClick={() => onModeToggle('BASELINE')}
            >
              BASELINE
            </button>
          </div>
        )}
      </div>

      {/* Baseline Breach Warning Callout */}
      {isBaselineBreach && (
        <div className="baseline-breach-banner" id="baseline-breach-callout">
          <div className="baseline-breach-icon">
            <ShieldAlert size={18} />
          </div>
          <div className="baseline-breach-text">
            <div className="baseline-breach-title">
              UNMITIGATED SECURITY BREACH (BASELINE MODE)
            </div>
            <div className="baseline-breach-sub">
              Without ChainBreak runtime invariants, all {actions.length} actions executed unchecked. Sensitive data was exfiltrated to an untrusted external endpoint.
            </div>
          </div>
        </div>
      )}

      {/* Cumulative Security State Bar */}
      <div className="cumulative-state-bar">
        <div className="state-cell">
          <span className="state-cell-label">PRIVILEGE:</span>
          <span className={`state-cell-val ${privilege_level === 'ELEVATED' ? 'warn' : ''}`}>
            {privilege_level || 'STANDARD'}
          </span>
        </div>
        <div className="state-cell">
          <span className="state-cell-label">SENSITIVE DATA:</span>
          <span className={`state-cell-val ${sensitive_data_observed ? 'warn' : ''}`}>
            {sensitive_data_observed ? 'OBSERVED' : 'NONE'}
          </span>
        </div>
        <div className="state-cell">
          <span className="state-cell-label">SECRETS:</span>
          <span className={`state-cell-val ${secrets_observed ? 'danger' : ''}`}>
            {secrets_observed ? 'OBSERVED' : 'NONE'}
          </span>
        </div>
        <div className="state-cell">
          <span className="state-cell-label">DESTINATIONS:</span>
          <span className={`state-cell-val ${destinations && destinations.includes('EXTERNAL') ? 'danger' : ''}`}>
            {destinations && destinations.length > 0 ? destinations.join(', ') : 'INTERNAL'}
          </span>
        </div>
        <div className="state-cell decision">
          <span className="state-cell-label">VERDICT:</span>
          <span className={`state-cell-val verdict-${(final_decision || 'ALLOW').toLowerCase()}`}>
            {final_decision || 'ALLOW'}
          </span>
        </div>
      </div>

      {/* Violation Panel (compact inline) */}
      {(final_decision === 'BLOCK' || final_decision === 'HOLD') && (
        <ViolationPanel
          chainState={chainState}
          scenarioId={scenarioId}
          onHighlightStep={(stepNum) => onStepRefClick && onStepRefClick(stepNum)}
        />
      )}

      {/* Timeline with visual connectors */}
      <div className="timeline-steps-list">
        {actions.map((act) => {
          const isDivergence = runMode === 'PROTECTED' && (act.decision === 'BLOCK' || act.decision === 'HOLD');
          const isHighlight = highlightedStep !== null && (Number(act.step_index) + 1 === Number(highlightedStep));
          const stepDecisionClass = `step-${(act.decision || 'allow').toLowerCase()}`;

          return (
            <div
              key={act.id || `${act.step_index}-${act.tool}`}
              className={`timeline-step-wrapper ${stepDecisionClass}`}
            >
              <ActionCard
                action={act}
                isDivergenceStep={isDivergence}
                isHighlighted={isHighlight}
                onStepRefClick={onStepRefClick}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
