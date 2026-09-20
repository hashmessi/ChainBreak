import React, { useState, useEffect, useRef } from 'react';
import { Compass, Play, AlertCircle, ArrowUpRight, BarChart2, Layers, Shield, GitCompare } from 'lucide-react';
import ScenarioSelector from './components/ScenarioSelector';
import RunTimeline from './components/RunTimeline';
import CounterfactualProof from './components/CounterfactualProof';
import BenchmarkModal from './components/BenchmarkModal';
import AiSummaryBot from './components/AiSummaryBot';

const TABS = [
  { key: 'scenarios', label: 'Scenarios', icon: Shield },
  { key: 'interception', label: 'Interception', icon: Layers },
  { key: 'proof', label: 'Proof', icon: GitCompare },
];

export default function App() {
  const [backendHealth, setBackendHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);

  // Scenarios & execution state
  const [scenarios, setScenarios] = useState([]);
  const [loadingScenarios, setLoadingScenarios] = useState(true);
  const [selectedScenario, setSelectedScenario] = useState(null);

  // Active run state
  const [runResult, setRunResult] = useState(null);
  const [activeRunMode, setActiveRunMode] = useState('PROTECTED');
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState(null);
  const [highlightedStep, setHighlightedStep] = useState(null);

  // Race condition guard ref
  const activeRequestIdRef = useRef(0);

  // Benchmark suite evaluation state
  const [evaluationReport, setEvaluationReport] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showBenchmarkModal, setShowBenchmarkModal] = useState(false);

  // Tab navigation
  const [activeTab, setActiveTab] = useState('scenarios');

  // 1. Periodic health check & scenario catalog fetch
  useEffect(() => {
    let mounted = true;

    async function loadScenarios() {
      try {
        const scenRes = await fetch('/api/scenarios');
        if (scenRes.ok) {
          const data = await scenRes.json();
          const list = data.scenarios || [];
          if (mounted) {
            setScenarios(list);
            setSelectedScenario((prev) => prev || list.find((s) => s.id === 'S6') || list[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load scenarios:', err);
      } finally {
        if (mounted) setLoadingScenarios(false);
      }
    }

    async function checkHealth() {
      try {
        const healthRes = await fetch('/api/health');
        if (healthRes.ok) {
          const healthData = await healthRes.json();
          if (mounted) {
            setBackendHealth(healthData);
            setRunError((prev) => (prev && prev.includes('Backend engine unreachable') ? null : prev));
            if (scenarios.length === 0) {
              loadScenarios();
            }
          }
        } else {
          if (mounted) setBackendHealth({ status: 'error' });
        }
      } catch (err) {
        if (mounted) setBackendHealth({ status: 'offline', error: err.message });
      } finally {
        if (mounted) setLoadingHealth(false);
      }
    }

    checkHealth();
    loadScenarios();

    const timer = setInterval(checkHealth, 3000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [scenarios.length]);

  // 2. Run Counterfactual
  const handleRunCounterfactual = async (scenarioId) => {
    const id = scenarioId || selectedScenario?.id;
    if (!id) return;

    const reqId = ++activeRequestIdRef.current;
    setIsRunning(true);
    setRunError(null);
    setHighlightedStep(null);

    try {
      const res = await fetch(`/api/counterfactual/${id}`, { method: 'POST' });
      if (!res.ok) throw new Error(`Execution error: HTTP ${res.status}`);
      const data = await res.json();
      if (activeRequestIdRef.current === reqId) {
        setRunResult(data);
        setActiveRunMode('PROTECTED');
        // Auto-switch to Interception tab when results arrive
        setActiveTab('interception');
      }
    } catch (err) {
      if (activeRequestIdRef.current === reqId) {
        console.error('Counterfactual run failed:', err);
        const isOffline = err.message === 'Failed to fetch' || err.message.includes('NetworkError');
        setRunError(
          isOffline
            ? 'Backend engine unreachable at http://127.0.0.1:8000. Please start the FastAPI backend.'
            : err.message
        );
        if (isOffline) setBackendHealth({ status: 'offline' });
      }
    } finally {
      if (activeRequestIdRef.current === reqId) setIsRunning(false);
    }
  };

  // 3. Run Single Mode
  const handleRunSingle = async (scenarioId, mode = 'PROTECTED') => {
    const id = scenarioId || selectedScenario?.id;
    if (!id) return;

    const reqId = ++activeRequestIdRef.current;
    setIsRunning(true);
    setRunError(null);
    setHighlightedStep(null);

    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_id: id, run_mode: mode.toUpperCase() }),
      });
      if (!res.ok) throw new Error(`Run error: HTTP ${res.status}`);
      const chainState = await res.json();
      if (activeRequestIdRef.current === reqId) {
        setRunResult((prev) => ({
          scenario: prev?.scenario || selectedScenario || { id, name: id },
          scenario_id: id,
          baseline: mode === 'BASELINE' ? chainState : prev?.baseline || chainState,
          protected: mode === 'PROTECTED' ? chainState : prev?.protected || chainState,
          attack_prevented: chainState.final_decision === 'BLOCK',
          correctly_blocked: chainState.final_decision === 'BLOCK',
          proof_statement: `Executed single trajectory in ${mode} mode.`,
          divergence_step: chainState.blocked_at_step,
        }));
        setActiveRunMode(mode);
        setActiveTab('interception');
      }
    } catch (err) {
      if (activeRequestIdRef.current === reqId) {
        console.error('Single run failed:', err);
        const isOffline = err.message === 'Failed to fetch' || err.message.includes('NetworkError');
        setRunError(
          isOffline
            ? 'Backend engine unreachable at http://127.0.0.1:8000. Please start the FastAPI backend.'
            : err.message
        );
        if (isOffline) setBackendHealth({ status: 'offline' });
      }
    } finally {
      if (activeRequestIdRef.current === reqId) setIsRunning(false);
    }
  };

  // 4. Run Benchmark Suite
  const handleRunBenchmark = async () => {
    setIsEvaluating(true);
    setShowBenchmarkModal(true);

    try {
      const res = await fetch('/api/evaluate', { method: 'POST' });
      if (!res.ok) throw new Error(`Evaluation error: HTTP ${res.status}`);
      const report = await res.json();
      setEvaluationReport(report);
    } catch (err) {
      console.error('Evaluation run failed:', err);
      const isOffline = err.message === 'Failed to fetch' || err.message.includes('NetworkError');
      setRunError(
        isOffline
          ? 'Backend engine unreachable at http://127.0.0.1:8000. Please start the FastAPI backend.'
          : err.message
      );
      if (isOffline) setBackendHealth({ status: 'offline' });
    } finally {
      setIsEvaluating(false);
    }
  };

  const isConnected = backendHealth && backendHealth.status === 'ok';

  const activeChainState = runResult
    ? activeRunMode === 'PROTECTED'
      ? runResult.protected
      : runResult.baseline
    : null;

  // Count for tab badges
  const scenarioCount = scenarios.length;
  const stepCount = activeChainState?.actions?.length || 0;
  const hasProof = !!runResult;

  return (
    <div className="app-canvas">
      {/* ═══ Compact Header ═══ */}
      <header className="top-nav">
        <div className="cockpit-container top-nav-inner">
          <div className="brand-cluster">
            <a href="#" className="brand-mark" id="brand-logo">
              <div className="brand-symbol">
                <Compass size={13} />
              </div>
              <span>ChainBreak</span>
            </a>
            <span className="brand-subtitle">Runtime Security Invariant Engine</span>
          </div>

          <div className="nav-actions">
            <div className="badge-pill" id="backend-status-badge">
              <div className={`pulse-dot ${isConnected ? '' : 'error'}`} />
              <span>
                {loadingHealth
                  ? 'CONNECTING...'
                  : isConnected
                  ? 'ENGINE LIVE / 8000'
                  : 'OFFLINE'}
              </span>
            </div>

            <AiSummaryBot
              runResult={runResult}
              selectedScenario={selectedScenario}
              onRunFeatured={handleRunCounterfactual}
            />

            <button
              type="button"
              className="btn-pill-primary"
              id="run-benchmark-cta"
              onClick={handleRunBenchmark}
            >
              <span>BENCHMARK</span>
              <ArrowUpRight size={13} />
            </button>
          </div>
        </div>
      </header>

      {/* ═══ Tab Navigation Bar ═══ */}
      <nav className="tab-bar">
        <div className="cockpit-container tab-bar-inner">
          {TABS.map((tab) => {
            const IconComp = tab.icon;
            const badge = tab.key === 'scenarios' ? scenarioCount
              : tab.key === 'interception' ? (stepCount || null)
              : tab.key === 'proof' ? (hasProof ? 'READY' : null)
              : null;

            return (
              <button
                key={tab.key}
                type="button"
                className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
                id={`tab-${tab.key}`}
              >
                <IconComp size={14} />
                <span>{tab.label}</span>
                {badge !== null && (
                  <span className={`tab-badge ${tab.key === 'proof' && hasProof ? 'proof-ready' : ''}`}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ═══ View Content ═══ */}
      <main className="cockpit-container view-content">
        {/* Offline Banner */}
        {!loadingHealth && !isConnected && (
          <div className="offline-banner">
            <div className="offline-banner-content">
              <AlertCircle size={14} style={{ color: 'var(--color-violation-red)' }} />
              <span>
                Backend offline at <code>127.0.0.1:8000</code>
              </span>
            </div>
            <button
              type="button"
              className="btn-ghost-outline"
              style={{ fontSize: '10px', padding: '3px 10px' }}
              onClick={() => window.location.reload()}
            >
              RETRY
            </button>
          </div>
        )}

        {/* Run Error */}
        {runError && (
          <div className="run-error-banner">
            RUN FAILED: {runError}
          </div>
        )}

        {/* ── TAB: Scenarios ── */}
        {activeTab === 'scenarios' && (
          <>
            <div className="compact-hero">
              <h1 id="main-headline">
                Runtime security invariants for autonomous agents.
              </h1>
              <p>
                Select a scenario to run side-by-side counterfactual execution — Baseline vs Protected.
              </p>
            </div>

            {/* Flagship S6 Marquee Hero Card */}
            <div className="flagship-demo-banner" id="flagship-s6-banner">
              <div className="flagship-badge-group">
                <span className="flagship-pill">FLAGSHIP DEMO</span>
                <span className="flagship-tag">SCENARIO S6</span>
              </div>
              <div className="flagship-content">
                <div className="flagship-info">
                  <h3 className="flagship-title">Multi-Step Cumulative Context Exfiltration</h3>
                  <p className="flagship-description">
                    3 individually benign reads + 1 summary tool call = silent sensitive data egress. Single-action perimeter firewalls permit all 4 steps. ChainBreak tracks trajectory lineage and severs execution at Step 04.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-flagship-launch"
                  disabled={isRunning}
                  onClick={() => handleRunCounterfactual('S6')}
                  id="btn-run-flagship-demo"
                >
                  <Play size={13} fill="currentColor" />
                  <span>{isRunning ? 'RUNNING DUAL PROOF...' : 'RUN S6 DUAL PROOF'}</span>
                </button>
              </div>
            </div>

            <ScenarioSelector
              scenarios={scenarios}
              selectedScenario={selectedScenario}
              onSelectScenario={(scen) => setSelectedScenario(scen)}
              onRunCounterfactual={(id) => handleRunCounterfactual(id)}
              onRunSingle={(id, mode) => handleRunSingle(id, mode)}
              isLoading={isRunning}
            />
          </>
        )}

        {/* ── TAB: Interception ── */}
        {activeTab === 'interception' && (
          <RunTimeline
            chainState={activeChainState}
            scenarioId={selectedScenario?.id || runResult?.scenario_id}
            runMode={activeRunMode}
            onModeToggle={(mode) => setActiveRunMode(mode)}
            isCounterfactualAvailable={!!runResult?.baseline && !!runResult?.protected}
            divergenceStep={runResult?.divergence_step}
            highlightedStep={highlightedStep}
            onStepRefClick={(stepNum) => setHighlightedStep(stepNum)}
            onRunFeatured={handleRunCounterfactual}
          />
        )}

        {/* ── TAB: Proof ── */}
        {activeTab === 'proof' && (
          <CounterfactualProof
            counterfactualResult={runResult}
            onRunAgain={() => handleRunCounterfactual(selectedScenario?.id)}
            onRunFeatured={handleRunCounterfactual}
          />
        )}
      </main>

      {/* Benchmark Modal */}
      <BenchmarkModal
        isOpen={showBenchmarkModal}
        onClose={() => setShowBenchmarkModal(false)}
        report={evaluationReport}
        isLoading={isEvaluating}
        onRunBenchmark={handleRunBenchmark}
      />

      {/* Footer */}
      <footer className="app-footer">
        <div className="cockpit-container app-footer-inner">
          <span>CHAINBREAK RUNTIME ENGINE // V1.0</span>
          <span>OBSIDIAN DESIGN SYSTEM</span>
        </div>
      </footer>
    </div>
  );
}
