import React, { useState, useMemo } from 'react';
import { Split, ShieldAlert, ShieldCheck, AlertTriangle, HelpCircle, Terminal, Flame } from 'lucide-react';

const CATEGORIES = [
  { key: 'ALL', label: 'ALL', icon: Terminal },
  { key: 'ATTACK', label: 'ATTACKS', icon: Flame },
  { key: 'SAFE', label: 'SAFE', icon: ShieldCheck },
  { key: 'NEAR_MISS', label: 'NEAR-MISS', icon: AlertTriangle },
  { key: 'FAILURE', label: 'FAILURES', icon: ShieldAlert },
  { key: 'UNKNOWN_TOOL', label: 'UNKNOWN', icon: HelpCircle },
];

/**
 * ScenarioSelector — Full-width grid layout for Scenarios view
 * Compact cards: ID + name + category + step count + inline CTA
 */
export default function ScenarioSelector({
  scenarios = [],
  selectedScenario = null,
  onSelectScenario,
  onRunCounterfactual,
  onRunSingle,
  isLoading = false
}) {
  const [activeCategory, setActiveCategory] = useState('ALL');

  const filteredScenarios = useMemo(() => {
    if (activeCategory === 'ALL') return scenarios;
    return scenarios.filter((s) => (s.category || '').toUpperCase() === activeCategory);
  }, [scenarios, activeCategory]);

  const categoryCounts = useMemo(() => {
    const counts = { ALL: scenarios.length };
    scenarios.forEach((s) => {
      const catUpper = (s.category || '').toUpperCase();
      counts[catUpper] = (counts[catUpper] || 0) + 1;
    });
    return counts;
  }, [scenarios]);

  const getCategoryBadgeClass = (category) => {
    const cat = (category || '').toUpperCase();
    switch (cat) {
      case 'ATTACK': return 'cat-attack';
      case 'SAFE': return 'cat-safe';
      case 'NEAR_MISS': return 'cat-near-miss';
      case 'FAILURE': return 'cat-failure';
      case 'UNKNOWN_TOOL': return 'cat-unknown';
      default: return '';
    }
  };

  return (
    <div className="scenario-selector-container" id="scenario-selector-panel">
      {/* Category Filter Tabs */}
      <div className="category-filter-tabs">
        {CATEGORIES.map((tab) => {
          const count = categoryCounts[tab.key] || 0;
          const IconComponent = tab.icon;
          const isActive = activeCategory === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              className={`cat-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveCategory(tab.key)}
            >
              <IconComponent size={11} className="tab-icon" />
              <span className="tab-label">{tab.label}</span>
              <span className={`tab-count ${isActive ? 'active-count' : ''}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Scenario Grid */}
      <div className="scenario-grid" id="scenario-deck-list">
        {filteredScenarios.length === 0 ? (
          <div className="no-scenarios-msg">
            <ShieldAlert size={18} style={{ color: 'var(--color-compass-gold)', marginBottom: '8px' }} />
            <div>No scenarios in this category.</div>
          </div>
        ) : (
          filteredScenarios.map((scen) => {
            const isSelected = selectedScenario && selectedScenario.id === scen.id;
            const actionCount = scen.actions?.length || 0;
            const catUpper = (scen.category || '').toUpperCase();

            const isAttack = catUpper === 'ATTACK';
            const isSafe = catUpper === 'SAFE' || catUpper === 'NEAR_MISS';
            const expBaseline = isAttack ? 'ALLOW (BREACH)' : 'ALLOW';
            const expProtected = scen.expected_result === 'BLOCK' ? 'BLOCK' : scen.expected_result === 'HOLD' ? 'HOLD' : 'ALLOW';
            const expBaselineClass = isAttack ? 'val-block' : 'val-allow';
            const expProtectedClass = scen.expected_result === 'BLOCK' ? 'val-block' : scen.expected_result === 'HOLD' ? 'val-hold' : 'val-allow';

            return (
              <div
                key={scen.id}
                className={`scenario-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectScenario(scen)}
                id={`scenario-card-${scen.id}`}
              >
                <div className="scenario-card-top">
                  <div className="scenario-id-tag">
                    <span className="scen-number">{scen.id}</span>
                    <span className={`scen-cat-badge ${getCategoryBadgeClass(scen.category)}`}>
                      {catUpper.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="scen-steps-count">
                    {actionCount} {actionCount === 1 ? 'STEP' : 'STEPS'}
                  </span>
                </div>

                <h4 className="scenario-card-name">{scen.name}</h4>

                {scen.description && (
                  <p className="scenario-card-desc">
                    {scen.description}
                  </p>
                )}

                <div className="scenario-card-footer">
                  <div className="expected-outcomes">
                    <span className="outcome-tag">
                      <strong className={expBaselineClass}>
                        {expBaseline}
                      </strong>
                    </span>
                    <span className="outcome-sep">→</span>
                    <span className="outcome-tag">
                      <strong className={expProtectedClass}>
                        {expProtected}
                      </strong>
                    </span>
                  </div>

                  <div className="scenario-cta-cluster" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="btn-pill-primary run-dual-btn"
                      disabled={isLoading}
                      onClick={() => {
                        onSelectScenario(scen);
                        onRunCounterfactual(scen.id);
                      }}
                      id={`btn-run-counterfactual-${scen.id}`}
                      title="Run Counterfactual Execution (Baseline vs Protected)"
                    >
                      <Split size={11} />
                      <span>{isLoading && isSelected ? 'RUNNING...' : 'RUN PROOF'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
