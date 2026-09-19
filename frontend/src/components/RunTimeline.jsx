import React from 'react';
import ActionCard from './ActionCard';
import ViolationPanel from './ViolationPanel';
import { Activity, ShieldCheck, ShieldAlert, Cpu, Layers } from 'lucide-react';

export default function RunTimeline({
  chainState,
  scenarioId = '',
  runMode = 'PROTECTED',
  onModeToggle = null,
  isCounterfactualAvailable = false,
  divergenceStep = null,
  highlightedStep = null,
  onStepRefClick = null
}) {
  if (!chainState || !chainState.actions || chainState.actions.length === 0) {
    return (
      <div className="timeline-empty-state">
        <Activity size={24} style={{ color: 'var(--color-compass-gold)', marginBottom: '12px' }} />
        <div className="empty-title">NO EXECUTION TELEMETRY</div>
        <p className="empty-desc">
          Select a scenario and run counterfactual execution to inspect real-time action interception.
        </p>
      </div>
    );
  }

  const { actions, privilege_level, sensitive_data_observed, secrets_observed, destinations, final_decision, blocked_at_step } = chainState;

  return (
    <div className="run-timeline-container" id="run-timeline-panel">
      {/* Mode Switcher & Telemetry Header */}
      <div className="timeline-control-header">
        <div className="timeline-title-wrap">
          <Layers size={16} style={{ color: 'var(--color-compass-gold)' }} />
          <span className="timeline-section-title">INTERCEPTION TELEMETRY</span>
          <span className="badge-pill" style={{ padding: '2px 8px', fontSize: '11px' }}>
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
              PROTECTED (CHAINBREAK)
            </button>
            <button
              type="button"
              className={`mode-toggle-btn ${runMode === 'BASELINE' ? 'active baseline' : ''}`}
              onClick={() => onModeToggle('BASELINE')}
            >
              BASELINE (UNPROTECTED)
            </button>
          </div>
        )}
      </div>

      {/* Cumulative Security Lineage State Bar */}
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

      {/* Violation Panel Banner if Blocked or Hold */}
      {(final_decision === 'BLOCK' || final_decision === 'HOLD') && (
        <ViolationPanel
          chainState={chainState}
          scenarioId={scenarioId}
          onHighlightStep={(stepNum) => onStepRefClick && onStepRefClick(stepNum)}
        />
      )}

      {/* Vertical Action Timeline */}
      <div className="action-cards-stack">
        {actions.map((act) => {
          const isDivergence = runMode === 'PROTECTED' && act.step_index === divergenceStep;
          const isHighlight = act.step_index === highlightedStep;
          return (
            <ActionCard
              key={act.id || `${act.step_index}-${act.tool}`}
              action={act}
              isDivergenceStep={isDivergence}
              isHighlighted={isHighlight}
              onStepRefClick={onStepRefClick}
            />
          );
        })}
      </div>
    </div>
  );
}
