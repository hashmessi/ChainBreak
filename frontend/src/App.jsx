import React, { useState, useEffect } from 'react';
import { Shield, Compass, Play, AlertCircle, ArrowUpRight, Split, RefreshCw, BarChart2, CheckCircle2 } from 'lucide-react';
import ScenarioSelector from './components/ScenarioSelector';
import RunTimeline from './components/RunTimeline';
import CounterfactualProof from './components/CounterfactualProof';
import BenchmarkModal from './components/BenchmarkModal';

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

  // Benchmark suite evaluation state
  const [evaluationReport, setEvaluationReport] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showBenchmarkModal, setShowBenchmarkModal] = useState(false);

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

  // 2. Run Counterfactual (Dual-track baseline vs protected)
  const handleRunCounterfactual = async (scenarioId) => {
    const id = scenarioId || selectedScenario?.id;
    if (!id) return;

    setIsRunning(true);
    setRunError(null);
    setHighlightedStep(null);

    try {
      const res = await fetch(`/api/counterfactual/${id}`, {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error(`Execution error: HTTP ${res.status}`);
      }
      const data = await res.json();
      setRunResult(data);
      setActiveRunMode('PROTECTED'); // Start in protected view to observe invariant enforcement
    } catch (err) {
      console.error('Counterfactual run failed:', err);
      const isOffline = err.message === 'Failed to fetch' || err.message.includes('NetworkError');
      setRunError(
        isOffline
          ? 'Backend engine unreachable at http://127.0.0.1:8000. Please start the FastAPI backend.'
          : err.message
      );
      if (isOffline) {
        setBackendHealth({ status: 'offline' });
      }
    } finally {
      setIsRunning(false);
    }
  };

  // 3. Run Single Mode (Baseline or Protected)
  const handleRunSingle = async (scenarioId, mode = 'PROTECTED') => {
    const id = scenarioId || selectedScenario?.id;
    if (!id) return;

    setIsRunning(true);
    setRunError(null);
    setHighlightedStep(null);

    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario_id: id,
          run_mode: mode.toUpperCase(),
        }),
      });
      if (!res.ok) {
        throw new Error(`Run error: HTTP ${res.status}`);
      }
      const chainState = await res.json();
      // Synthesize a counterfactual shape so the UI renders seamlessly
      setRunResult((prev) => ({
        scenario_id: id,
        baseline: mode === 'BASELINE' ? chainState : prev?.baseline || chainState,
        protected: mode === 'PROTECTED' ? chainState : prev?.protected || chainState,
        attack_prevented: chainState.final_decision === 'BLOCK',
        proof_statement: `Executed single trajectory in ${mode} mode.`,
        divergence_step: chainState.blocked_at_step,
      }));
      setActiveRunMode(mode);
    } catch (err) {
      console.error('Single run failed:', err);
      const isOffline = err.message === 'Failed to fetch' || err.message.includes('NetworkError');
      setRunError(
        isOffline
          ? 'Backend engine unreachable at http://127.0.0.1:8000. Please start the FastAPI backend.'
          : err.message
      );
      if (isOffline) {
        setBackendHealth({ status: 'offline' });
      }
    } finally {
      setIsRunning(false);
    }
  };

  // 4. Run 20-Scenario Benchmark Suite
  const handleRunBenchmark = async () => {
    setIsEvaluating(true);
    setShowBenchmarkModal(true);

    try {
      const res = await fetch('/api/evaluate', { method: 'POST' });
      if (!res.ok) {
        throw new Error(`Evaluation error: HTTP ${res.status}`);
      }
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
      if (isOffline) {
        setBackendHealth({ status: 'offline' });
      }
    } finally {
      setIsEvaluating(false);
    }
  };

  const isConnected = backendHealth && backendHealth.status === 'ok';

  // Get active chain state according to chosen run mode
  const activeChainState = runResult
    ? activeRunMode === 'PROTECTED'
      ? runResult.protected
      : runResult.baseline
    : null;

  return (
    <div className="app-canvas">
      {/* Top Navigation Bar */}
      <header className="top-nav">
        <div className="cockpit-container top-nav-inner">
          <a href="#" className="brand-mark" id="brand-logo">
            <div className="brand-symbol">
              <Compass size={14} />
            </div>
            <span>ChainBreak</span>
          </a>

          <div className="nav-actions">
            <div className="badge-pill" id="backend-status-badge">
              <div className={`pulse-dot ${isConnected ? '' : 'error'}`} />
              <span>
                {loadingHealth
                  ? 'CONNECTING...'
                  : isConnected
                  ? 'ENGINE LIVE / 8000'
                  : 'BACKEND OFFLINE'}
              </span>
            </div>

            <button
              type="button"
              className="btn-pill-primary"
              id="run-benchmark-cta"
              onClick={handleRunBenchmark}
            >
              <span>RUN BENCHMARK</span>
              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Cockpit Content Column (1200px max-width) */}
      <main className="cockpit-container">
        {/* Offline Banner if Backend Unreachable */}
        {!loadingHealth && !isConnected && (
          <div
            style={{
              margin: '24px 0 0',
              padding: '16px 20px',
              border: '1px solid var(--color-violation-red)',
              background: 'rgba(255, 69, 58, 0.08)',
              borderRadius: 'var(--radius-cards)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertCircle size={16} style={{ color: 'var(--color-violation-red)' }} />
              <span>
                BACKEND NOT CONNECTED AT <code>http://127.0.0.1:8000</code>. Start engine with:{' '}
                <code>python -m uvicorn main:app --host 127.0.0.1 --port 8000</code>
              </span>
            </div>
            <button
              type="button"
              className="btn-ghost-outline"
              style={{ fontSize: '11px', padding: '4px 10px' }}
              onClick={() => window.location.reload()}
            >
              RETRY
            </button>
          </div>
        )}

        {/* Editorial Hero Display */}
        <section className="hero-section">
          <div className="badge-pill" style={{ marginBottom: '24px' }}>
            <span style={{ color: 'var(--color-compass-gold)' }}>INVARIANT ENGINE V1.0</span>
            <span style={{ color: 'var(--color-graphite)' }}>|</span>
            <span>FAIL-CLOSED TRAJECTORY INTERCEPTOR</span>
          </div>

          <h1 className="display-headline" id="main-headline">
            Runtime security invariants for autonomous agent trajectories.
          </h1>

          <p className="sub-headline">
            Individual tool calls appear benign in isolation. ChainBreak monitors the full cumulative
            data lineage, mathematically enforcing deterministic boundaries to halt unauthorized egress.
          </p>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-pill-primary"
              id="hero-run-s6-cta"
              onClick={() => handleRunCounterfactual(selectedScenario?.id || 'S6')}
              disabled={isRunning}
            >
              <Play size={14} fill="currentColor" />
              <span>
                {isRunning
                  ? 'INTERCEPTING TRAJECTORY...'
                  : `RUN ${selectedScenario ? selectedScenario.id : 'S6'} COUNTERFACTUAL`}
              </span>
            </button>
            <button
              type="button"
              className="btn-ghost-outline"
              onClick={handleRunBenchmark}
              id="hero-benchmark-btn"
            >
              <BarChart2 size={14} />
              <span>20-SCENARIO SUITE REPORT</span>
            </button>
          </div>
        </section>

        <hr className="hairline-divider" />

        {/* Error Notification if Run Failed */}
        {runError && (
          <div
            style={{
              margin: '24px 0 0',
              padding: '12px 18px',
              border: '1px solid var(--color-violation-red)',
              background: 'rgba(255, 69, 58, 0.08)',
              borderRadius: 'var(--radius-cards)',
              color: 'var(--color-violation-red)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
            }}
          >
            RUN EXECUTION FAILED: {runError}
          </div>
        )}

        {/* Workbench Grid: Left = Scenarios Deck, Right = Live Telemetry Timeline */}
        <section className="workbench-grid" id="workbench-framework">
          {/* Left Column: Scenario Deck */}
          <div className="wireframe-card" id="frame-scenario-selector">
            <div className="card-header">
              <span className="card-title">01 / EVALUATION SUITE</span>
              <span className="meta-label">
                {scenarios.length > 0 ? `${scenarios.length} SCENARIOS LOADED` : 'LOADING...'}
              </span>
            </div>
            <p style={{ color: 'var(--color-smoke)', fontSize: '14px', marginBottom: '20px' }}>
              Select an agent trajectory to run side-by-side counterfactual execution:
              Unprotected Baseline vs Protected ChainBreak.
            </p>

            <ScenarioSelector
              scenarios={scenarios}
              selectedScenario={selectedScenario}
              onSelectScenario={(scen) => {
                setSelectedScenario(scen);
                // If this scenario hasn't been run yet, clear previous results or auto-run
              }}
              onRunCounterfactual={(id) => handleRunCounterfactual(id)}
              onRunSingle={(id, mode) => handleRunSingle(id, mode)}
              isLoading={isRunning}
            />
          </div>

          {/* Right Column: Live Interceptor Timeline */}
          <div className="wireframe-card" id="frame-run-timeline">
            <div className="card-header">
              <span className="card-title">02 / INTERCEPTION TIMELINE</span>
              <span className="meta-label">
                {isRunning ? 'EVALUATING INVARIANTS...' : activeRunMode}
              </span>
            </div>
            <p style={{ color: 'var(--color-smoke)', fontSize: '14px', marginBottom: '20px' }}>
              Step-by-step semantic extraction and deterministic invariant evaluation with
              ALLOW, HOLD, and BLOCK enforcement.
            </p>

            <RunTimeline
              chainState={activeChainState}
              scenarioId={selectedScenario?.id || runResult?.scenario_id}
              runMode={activeRunMode}
              onModeToggle={(mode) => setActiveRunMode(mode)}
              isCounterfactualAvailable={!!runResult?.baseline && !!runResult?.protected}
              divergenceStep={runResult?.divergence_step}
              highlightedStep={highlightedStep}
              onStepRefClick={(stepNum) => setHighlightedStep(stepNum)}
            />
          </div>
        </section>

        <hr className="hairline-divider" />

        {/* Bottom Full-Width Frame: Counterfactual Proof */}
        <section style={{ padding: '60px 0 80px' }} id="frame-counterfactual-proof">
          <div className="card-header">
            <span className="card-title">03 / COUNTERFACTUAL PROOF & AUDIT RECORD</span>
            <span className="meta-label">DETERMINISTIC VERIFICATION</span>
          </div>

          <p style={{ color: 'var(--color-smoke)', fontSize: '14px', marginBottom: '24px' }}>
            Mathematical proof demonstrating that the baseline trajectory leaks sensitive data
            while ChainBreak's invariant boundary enforces zero egress.
          </p>

          <CounterfactualProof
            counterfactualResult={runResult}
            onRunAgain={() => handleRunCounterfactual(selectedScenario?.id)}
          />
        </section>
      </main>

      {/* 20-Scenario Benchmark Modal */}
      <BenchmarkModal
        isOpen={showBenchmarkModal}
        onClose={() => setShowBenchmarkModal(false)}
        report={evaluationReport}
        isLoading={isEvaluating}
        onRunBenchmark={handleRunBenchmark}
      />

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--color-graphite)', padding: '32px 0' }}>
        <div
          className="cockpit-container"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-smoke)' }}>
            CHAINBREAK RUNTIME ENGINE // ARCHITECTURAL RESTRAINT
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-iron)' }}>
            DESIGN SYSTEM: HYPERSTUDIO (OBSIDIAN BLUEPRINT)
          </span>
        </div>
      </footer>
    </div>
  );
}
