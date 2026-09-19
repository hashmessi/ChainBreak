import React, { useState, useMemo } from 'react';
import { Play, Split, ShieldAlert, ShieldCheck, AlertTriangle, HelpCircle, Terminal, Flame, CheckCircle2 } from 'lucide-react';

const CATEGORIES = [
  { key: 'ALL', label: 'ALL', icon: Terminal },
  { key: 'ATTACK', label: 'ATTACKS', icon: Flame },
  { key: 'SAFE', label: 'SAFE', icon: ShieldCheck },
  { key: 'NEAR_MISS', label: 'NEAR-MISS', icon: AlertTriangle },
  { key: 'FAILURE_MODE', label: 'FAILURES', icon: ShieldAlert },
  { key: 'UNKNOWN_TOOL', label: 'UNKNOWN', icon: HelpCircle },
];

export default function ScenarioSelector({
  scenarios = [],
  selectedScenario = null,
  onSelectScenario,
  onRunCounterfactual,
  onRunSingle,
  isLoading = false
}) {
  const [activeCategory, setActiveCategory] = useState('ALL');

  // Filter scenarios with case-insensitive normalization
  const filteredScenarios = useMemo(() => {
    if (activeCategory === 'ALL') return scenarios;
    return scenarios.filter((s) => (s.category || '').toUpperCase() === activeCategory);
  }, [scenarios, activeCategory]);

  // Counts by category with case-insensitive normalization
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
      case 'ATTACK':
        return 'cat-attack';
      case 'SAFE':
        return 'cat-safe';
      case 'NEAR_MISS':
        return 'cat-near-miss';
      case 'FAILURE_MODE':
        return 'cat-failure';
      case 'UNKNOWN_TOOL':
        return 'cat-unknown';
      default:
        return '';
    }
  };

  return (
    <div className="scenario-selector-container" id="scenario-selector-panel">
      {/* Category Filter Tabs / Dock */}
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
              <IconComponent size={12} className="tab-icon" />
              <span className="tab-label">{tab.label}</span>
              <span className={`tab-count ${isActive ? 'active-count' : ''}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Scenario Deck List */}
      <div className="scenario-deck-list" id="scenario-deck-list">
        {filteredScenarios.length === 0 ? (
          <div className="no-scenarios-msg">
            <ShieldAlert size={20} style={{ color: 'var(--color-compass-gold)', marginBottom: '8px' }} />
            <div>No scenarios found in this category.</div>
          </div>
        ) : (
          filteredScenarios.map((scen) => {
            const isSelected = selectedScenario && selectedScenario.id === scen.id;
            const actionCount = scen.actions?.length || 0;
            const catUpper = (scen.category || '').toUpperCase();

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
                <p className="scenario-card-desc">{scen.description}</p>

                <div className="scenario-card-footer">
                  <div className="expected-outcomes">
                    <span className="outcome-tag">
                      BASELINE: <strong className={scen.expected_baseline === 'ALLOW' ? 'val-allow' : 'val-block'}>{scen.expected_baseline}</strong>
                    </span>
                    <span className="outcome-sep">➔</span>
                    <span className="outcome-tag">
                      PROTECTED: <strong className={scen.expected_protected === 'BLOCK' ? 'val-block' : scen.expected_protected === 'ALLOW' ? 'val-allow' : 'val-hold'}>{scen.expected_protected}</strong>
                    </span>
                  </div>

                  {isSelected && (
                    <div className="scenario-cta-cluster" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="btn-pill-primary run-dual-btn"
                        disabled={isLoading}
                        onClick={() => onRunCounterfactual(scen.id)}
                        id={`btn-run-counterfactual-${scen.id}`}
                      >
                        <Split size={14} />
                        <span>{isLoading ? 'INTERCEPTING...' : 'RUN COUNTERFACTUAL'}</span>
                      </button>
                      <button
                        type="button"
                        className="btn-ghost-outline run-single-btn"
                        disabled={isLoading}
                        onClick={() => onRunSingle(scen.id, 'PROTECTED')}
                      >
                        <span>PROTECTED ONLY</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
