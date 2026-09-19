import React from 'react';
import { CheckCircle2, AlertTriangle, ShieldAlert, ArrowRight, CornerDownRight, Database, Send, Key, Lock } from 'lucide-react';

export default function ActionCard({
  action,
  isDivergenceStep = false,
  isHighlighted = false,
  onStepRefClick = null
}) {
  const {
    step_index,
    tool,
    arguments: args,
    semantics,
    decision,
    violations,
    reason,
    triggered_by = [],
    executed,
    tool_result
  } = action;

  // Decision badge styling & icon
  const getDecisionBadge = () => {
    switch (decision) {
      case 'ALLOW':
        return (
          <div className="decision-pill allow" title="Action permitted by deterministic invariant engine">
            <div className="pulse-dot" />
            <span>ALLOW</span>
          </div>
        );
      case 'HOLD':
        return (
          <div className="decision-pill hold" title="Action placed on hold (fail-closed due to uncertainty)">
            <AlertTriangle size={12} />
            <span>HOLD</span>
          </div>
        );
      case 'BLOCK':
        return (
          <div className="decision-pill block" title="Action blocked by security invariant enforcement">
            <ShieldAlert size={12} />
            <span>BLOCK</span>
          </div>
        );
      default:
        return (
          <div className="decision-pill">
            <span>{decision}</span>
          </div>
        );
    }
  };

  // Tool category icon
  const getToolIcon = () => {
    if (tool.includes('secret') || tool.includes('privilege')) return <Lock size={14} className="tool-icon" />;
    if (tool.includes('external') || tool.includes('send')) return <Send size={14} className="tool-icon" />;
    return <Database size={14} className="tool-icon" />;
  };

  return (
    <div
      className={`action-card ${decision.toLowerCase()} ${isDivergenceStep ? 'divergence-target' : ''} ${isHighlighted ? 'highlighted-predecessor' : ''}`}
      id={`action-step-${step_index}`}
    >
      {/* Step Header */}
      <div className="action-card-header">
        <div className="step-indicator">
          <span className="step-badge">STEP {String(Number(step_index) + 1).padStart(2, '0')}</span>
          <div className="tool-identity">
            {getToolIcon()}
            <code className="tool-name">{tool}</code>
          </div>
        </div>
        <div className="step-status-cluster">
          {isDivergenceStep && (
            <span className="divergence-pill" title="Execution path diverged from unprotected baseline here">
              INTERCEPTION POINT
            </span>
          )}
          {getDecisionBadge()}
        </div>
      </div>

      {/* Arguments JSON */}
      {args && Object.keys(args).length > 0 && (
        <div className="action-arguments">
          <div className="args-label">PARAMETERS</div>
          <pre className="args-code">
            {JSON.stringify(args, null, 2)}
          </pre>
        </div>
      )}

      {/* Semantics Metadata */}
      {semantics && (
        <div className="semantics-bar">
          <div className="semantic-pill">
            <span className="pill-key">DEST:</span>
            <span className={`pill-val ${semantics.destination === 'EXTERNAL' ? 'warn' : ''}`}>
              {semantics.destination}
            </span>
          </div>
          <div className="semantic-pill">
            <span className="pill-key">SENSITIVITY:</span>
            <span className={`pill-val ${semantics.data_sensitivity === 'HIGH' ? 'danger' : semantics.data_sensitivity === 'MEDIUM' ? 'warn' : ''}`}>
              {semantics.data_sensitivity}
            </span>
          </div>
          {semantics.data_classes && semantics.data_classes.length > 0 && (
            <div className="semantic-pill">
              <span className="pill-key">DATA:</span>
              <span className="pill-val">{semantics.data_classes.join(', ')}</span>
            </div>
          )}
          {semantics.confidence !== undefined && (
            <div className="semantic-pill meta-dim">
              <span className="pill-key">CONF:</span>
              <span className="pill-val">{(semantics.confidence * 100).toFixed(0)}%</span>
            </div>
          )}
        </div>
      )}

      {/* Lineage / Triggered By Reference */}
      {triggered_by && triggered_by.length > 0 && (
        <div className="lineage-indicator">
          <CornerDownRight size={13} style={{ color: 'var(--color-compass-gold)', flexShrink: 0 }} />
          <span className="lineage-label">TRAJECTORY LINEAGE:</span>
          <span className="lineage-text">
            Triggered by accumulated state from{' '}
            {triggered_by.map((stepNum, idx) => (
              <button
                key={stepNum}
                type="button"
                className="step-ref-link"
                onClick={() => onStepRefClick && onStepRefClick(stepNum)}
                title={`Highlight Step ${Number(stepNum) + 1}`}
              >
                Step {Number(stepNum) + 1}
                {idx < triggered_by.length - 1 ? ', ' : ''}
              </button>
            ))}
          </span>
        </div>
      )}

      {/* Violation Reason if Blocked */}
      {reason && decision !== 'ALLOW' && (
        <div className="violation-reason-box">
          <span className="violation-reason-label">ENFORCEMENT REASON:</span>
          <p className="violation-reason-text">{reason}</p>
        </div>
      )}

      {/* Execution Footnote */}
      <div className="action-footer">
        <span className="execution-status">
          SANDBOX EXECUTION:{' '}
          <strong style={{ color: executed ? 'var(--color-pulse-green)' : 'var(--color-violation-red)' }}>
            {executed ? 'EXECUTED' : 'BLOCKED (ZERO EGRESS)'}
          </strong>
        </span>
        {tool_result && (
          <span className="tool-result-preview" title={tool_result}>
            RESULT: {tool_result.length > 40 ? `${tool_result.substring(0, 40)}...` : tool_result}
          </span>
        )}
      </div>
    </div>
  );
}
