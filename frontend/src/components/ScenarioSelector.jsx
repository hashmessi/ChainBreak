import React, { useState, useMemo } from 'react';
import { Play, Split, ShieldCheck, ShieldAlert, ArrowRight, Filter, AlertTriangle, HelpCircle } from 'lucide-react';

const CATEGORIES = [
  { key: 'ALL', label: 'ALL' },
  { key: 'ATTACK', label: 'ATTACKS' },
  { key: 'SAFE', label: 'SAFE' },
  { key: 'NEAR_MISS', label: 'NEAR-MISS' },
  { key: 'FAILURE_MODE', label: 'FAILURES' },
  { key: 'UNKNOWN_TOOL', label: 'UNKNOWN' },
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

  // Filter scenarios
  const filteredScenarios = useMemo(() => {
    if (activeCategory === 'ALL') return scenarios;
    return scenarios.filter((s) => s.category === activeCategory);
  }, [scenarios, activeCategory]);

  // Counts by category
  const categoryCounts = useMemo(() => {
    const counts = { ALL: scenarios.length };
    scenarios.forEach((s) => {
      counts[s.category] = (counts[s.category] || 0) + 1;
    });
    return counts;
  }, [scenarios]);

  const getCategoryBadgeClass = (category) => {
    switch (category) {
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
      {/* Category Filter Tabs */}
      <div className="category-filter-tabs">
        {CATEGORIES.map((tab) => {
          const count = categoryCounts[tab.key] || 0;
          return (
            <button
              key={tab.key}
              type="button"
              className={`cat-tab-btn ${activeCategory === tab.key ? 'active' : ''}`}
              onClick={() => setActiveCategory(tab.key)}
            >
              <span>{tab.label}</span>
              <span className="tab-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Scenario Deck List */}
      <div className="scenario-deck-list" id="scenario-deck-list">
        {filteredScenarios.length === 0 ? (
          <div className="no-scenarios-msg">
            No scenarios found in this category.
          </div>
        ) : (
          filteredScenarios.map((scen) => {
            const isSelected = selectedScenario && selectedScenario.id === scen.id;
            const actionCount = scen.actions?.length || 0;

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
                      {scen.category.replace(/_/g, ' ')}
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
                      EXP BASELINE: <strong>{scen.expected_baseline}</strong>
                    </span>
                    <span className="outcome-sep">→</span>
                    <span className="outcome-tag">
                      PROTECTED: <strong>{scen.expected_protected}</strong>
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
                        <Split size={13} />
                        <span>{isLoading ? 'RUNNING DUAL-TRACK...' : 'RUN COUNTERFACTUAL'}</span>
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
