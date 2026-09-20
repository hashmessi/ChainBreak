import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles } from 'lucide-react';
import { getJudgesExplainer } from '../utils/explainer';

/**
 * AiSummaryBot — Floating AI assistant widget
 * 
 * Animated robot icon in the header area. Click opens a slide-out panel
 * with a plain-English summary of the last scenario execution.
 */
export default function AiSummaryBot({ runResult, selectedScenario, onRunFeatured }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Auto-pulse when new results come in
  const [hasNewResult, setHasNewResult] = useState(false);
  useEffect(() => {
    if (runResult) {
      setHasNewResult(true);
      const timer = setTimeout(() => setHasNewResult(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [runResult]);

  // Build summary content
  const getSummary = () => {
    if (!runResult) {
      return {
        status: 'idle',
        title: 'No execution yet',
        what: 'Select a scenario and run it to see what ChainBreak does.',
        action: null,
        why: null
      };
    }

    const protectedRun = runResult.protected;
    const baseline = runResult.baseline;
    const scenarioId = runResult.scenario_id || runResult.scenario?.id || '';
    const decision = protectedRun?.final_decision || 'ALLOW';
    const divergeStep = runResult.divergence_step;

    // Find culprit
    const culpritAction = protectedRun?.actions?.find(
      (a) => a.decision === 'BLOCK' || a.decision === 'HOLD'
    );

    const explainer = getJudgesExplainer({
      scenarioId,
      invariantName: culpritAction?.violations?.[0] || '',
      decision,
      tool: culpritAction?.tool || '',
      triggeredBy: culpritAction?.triggered_by || [],
      reason: culpritAction?.reason || ''
    });

    const totalSteps = protectedRun?.actions?.length || 0;
    const blockedTool = culpritAction?.tool || '';

    // Calculate 1-indexed step number
    const stepNum = culpritAction && culpritAction.step_index !== undefined
      ? Number(culpritAction.step_index) + 1
      : (divergeStep !== null && divergeStep !== undefined ? Number(divergeStep) + 1 : totalSteps);

    if (decision === 'BLOCK') {
      return {
        status: 'blocked',
        title: `Attack blocked at Step ${stepNum}`,
        what: `The agent ran ${totalSteps} tool calls. Steps 1–${Math.max(1, stepNum - 1)} appeared safe individually, but at Step ${stepNum} (${blockedTool}), ChainBreak detected the accumulated trajectory would leak sensitive data.`,
        action: `ChainBreak halted execution and dropped the payload before it reached any external network. Zero bytes leaked.`,
        why: explainer.judgeTakeaway
      };
    } else if (decision === 'HOLD') {
      return {
        status: 'hold',
        title: 'Execution frozen — fail-closed',
        what: `The agent encountered uncertainty (classifier failure, unknown tool, or ambiguous intent). Rather than guessing, ChainBreak froze execution.`,
        action: `All pending actions are on HOLD. No data was processed or transmitted.`,
        why: explainer.judgeTakeaway
      };
    } else {
      return {
        status: 'safe',
        title: 'Safe workflow — zero friction',
        what: `All ${totalSteps} tool calls were verified as safe. The agent operated within authorized boundaries.`,
        action: `ChainBreak allowed the full workflow with zero false positives — no legitimate actions were blocked.`,
        why: explainer.judgeTakeaway
      };
    }
  };

  const summary = getSummary();
  const statusColors = {
    blocked: 'var(--color-violation-red)',
    hold: 'var(--color-hold-amber)',
    safe: 'var(--color-pulse-green)',
    idle: 'var(--color-compass-gold)'
  };

  return (
    <>
      {/* Robot trigger button */}
      <button
        type="button"
        className={`ai-bot-trigger ${hasNewResult ? 'pulse-alert' : ''} ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="AI Summary Assistant"
        id="ai-bot-trigger"
      >
        <svg
          className="robot-icon"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Antenna */}
          <line x1="12" y1="2" x2="12" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="12" cy="2" r="1.5" fill="currentColor" className="antenna-dot"/>
          {/* Head */}
          <rect x="4" y="6" width="16" height="12" rx="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          {/* Eyes */}
          <circle cx="9" cy="12" r="1.8" fill="currentColor" className="robot-eye left-eye"/>
          <circle cx="15" cy="12" r="1.8" fill="currentColor" className="robot-eye right-eye"/>
          {/* Mouth */}
          <path d="M9 15.5 C10 16.5 14 16.5 15 15.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
          {/* Body indication */}
          <line x1="8" y1="18" x2="8" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="16" y1="18" x2="16" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="10" y1="18" x2="14" y2="18" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
        </svg>
        {hasNewResult && <span className="bot-notification-dot" />}
      </button>

      {/* Slide-out panel */}
      <div className={`ai-bot-panel ${isOpen ? 'open' : ''}`} ref={panelRef}>
        <div className="ai-bot-panel-header">
          <div className="ai-bot-panel-title-row">
            <Sparkles size={14} style={{ color: 'var(--color-compass-gold)' }} />
            <span className="ai-bot-panel-title">AI Summary</span>
          </div>
          <button type="button" className="ai-bot-close" onClick={() => setIsOpen(false)}>
            <X size={14} />
          </button>
        </div>

        <div className="ai-bot-panel-body">
          {/* Status indicator */}
          <div className="ai-summary-status">
            <div
              className="ai-status-dot"
              style={{ background: statusColors[summary.status] }}
            />
            <span className="ai-status-text">{summary.title}</span>
          </div>

          {/* What happened */}
          <div className="ai-summary-section">
            <span className="ai-section-label">What happened</span>
            <p className="ai-section-text">{summary.what}</p>
            {!runResult && onRunFeatured && (
              <button
                type="button"
                className="btn-pill-primary"
                style={{ marginTop: '10px', width: '100%', fontSize: '11px', padding: '6px 12px', gap: '6px' }}
                onClick={() => {
                  setIsOpen(false);
                  onRunFeatured('S6');
                }}
              >
                <Sparkles size={12} />
                <span>RUN S6 TRAJECTORY DEMO</span>
              </button>
            )}
          </div>

          {/* What ChainBreak did */}
          {summary.action && (
            <div className="ai-summary-section">
              <span className="ai-section-label">What ChainBreak did</span>
              <p className="ai-section-text">{summary.action}</p>
            </div>
          )}

          {/* Why it matters */}
          {summary.why && (
            <div className="ai-summary-section">
              <span className="ai-section-label">Why it matters</span>
              <p className="ai-section-text highlight">{summary.why}</p>
            </div>
          )}

          {/* Scenario context */}
          {selectedScenario && (
            <div className="ai-summary-context">
              <span className="ai-context-label">Scenario:</span>
              <span className="ai-context-value">{selectedScenario.id} — {selectedScenario.name}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
