import React from 'react';
import { X, ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw, BarChart3, Clock, Check } from 'lucide-react';

export default function BenchmarkModal({
  isOpen,
  onClose,
  report,
  isLoading = false,
  onRunBenchmark
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="benchmark-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="badge-pill" style={{ padding: '2px 8px' }}>
              <span style={{ color: 'var(--color-compass-gold)' }}>VERIFICATION SUITE</span>
            </div>
            <h2 className="modal-title">20-Scenario Security Benchmark Report</h2>
            <p className="modal-subtitle">
              Comprehensive counterfactual evaluation of attack neutralization, false positive rate, and fail-closed integrity.
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} id="btn-close-modal">
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="modal-body">
          {isLoading ? (
            <div className="modal-loading-state">
              <RefreshCw size={28} className="spin-icon" style={{ color: 'var(--color-chalk)', marginBottom: '16px' }} />
              <div className="loading-title">RUNNING FULL BENCHMARK EVALUATION...</div>
              <p className="loading-sub">
                Executing 20 scenarios through dual-track counterfactual pipeline (Baseline vs Protected).
              </p>
            </div>
          ) : report ? (
            <>
              {/* Metric Highlights Grid */}
              <div className="benchmark-metrics-strip">
                <div className="b-metric-card">
                  <span className="b-metric-label">DETECTION RATE</span>
                  <span className="b-metric-val highlight-green">
                    {(report.detection_rate * 100).toFixed(1)}%
                  </span>
                  <span className="b-metric-sub">
                    {report.attacks_prevented} / {report.attack_scenarios} Attacks Caught
                  </span>
                </div>

                <div className="b-metric-card">
                  <span className="b-metric-label">PREVENTION RATE</span>
                  <span className="b-metric-val highlight-green">
                    {(report.prevention_rate * 100).toFixed(1)}%
                  </span>
                  <span className="b-metric-sub">Zero Exfiltration on Interception</span>
                </div>

                <div className="b-metric-card">
                  <span className="b-metric-label">FALSE BLOCK RATE</span>
                  <span className="b-metric-val highlight-clean">
                    {(report.false_block_rate * 100).toFixed(1)}%
                  </span>
                  <span className="b-metric-sub">
                    {report.false_blocks} False Positives / {report.safe_scenarios} Safe Scenarios
                  </span>
                </div>

                <div className="b-metric-card">
                  <span className="b-metric-label">EVALUATION LATENCY</span>
                  <span className="b-metric-val">
                    {report.mean_latency_ms ? `${report.mean_latency_ms.toFixed(1)}ms` : '<1ms'}
                  </span>
                  <span className="b-metric-sub">Mean Invariant Evaluation Overhead</span>
                </div>
              </div>

              {/* Scenarios Table */}
              <div className="benchmark-table-wrap">
                <table className="benchmark-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>ID</th>
                      <th>SCENARIO</th>
                      <th style={{ width: '130px' }}>CATEGORY</th>
                      <th style={{ width: '100px' }}>BASELINE</th>
                      <th style={{ width: '110px' }}>PROTECTED</th>
                      <th style={{ width: '100px' }}>DIVERGED</th>
                      <th style={{ width: '90px' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.scenario_results?.map((res) => (
                      <tr key={res.scenario_id}>
                        <td><code>{res.scenario_id}</code></td>
                        <td>
                          <div className="bench-scen-name">{res.name}</div>
                        </td>
                        <td>
                          <span className="meta-category-badge">{res.category}</span>
                        </td>
                        <td>
                          <span className={`status-pill ${res.actual_baseline.toLowerCase()}`}>
                            {res.actual_baseline}
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill ${res.actual_protected.toLowerCase()}`}>
                            {res.actual_protected}
                          </span>
                        </td>
                        <td>
                          {res.divergence_step ? (
                            <span className="divergence-text">Step {res.divergence_step}</span>
                          ) : (
                            <span style={{ color: 'var(--color-iron)' }}>—</span>
                          )}
                        </td>
                        <td>
                          {res.passed ? (
                            <span className="status-pass-pill">
                              <Check size={11} /> PASS
                            </span>
                          ) : (
                            <span className="status-fail-pill">FAIL</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="modal-empty-state">
              <BarChart3 size={32} style={{ color: 'var(--color-compass-gold)', marginBottom: '16px' }} />
              <div className="loading-title">NO BENCHMARK REPORT CACHED</div>
              <p className="loading-sub">
                Click below to trigger automated evaluation of all 20 benchmark scenarios.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <div className="footer-meta">
            <span>SUITE V1.0 • 20 SCENARIOS • FAILING-CLOSED DETERMINISTIC ENGINE</span>
          </div>
          <div className="footer-actions">
            <button
              type="button"
              className="btn-pill-primary"
              disabled={isLoading}
              onClick={onRunBenchmark}
              id="btn-trigger-benchmark-run"
            >
              <RefreshCw size={13} className={isLoading ? 'spin-icon' : ''} />
              <span>{isLoading ? 'EVALUATING...' : 'RERUN ALL 20 SCENARIOS'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
