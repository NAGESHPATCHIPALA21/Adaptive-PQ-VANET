import React, { useState } from 'react';
import {
  Car,
  Shield,
  Cpu,
  Key,
  Play,
  Zap,
  ArrowRight,
  Radio,
  Layers,
  Activity,
  Clock
} from 'lucide-react';
import { runScenario, requestChallenge, verifyAuthentication, createSession, evaluateMTAGKM } from '../api';
import { computeAuthResponseHex } from '../utils/cryptoHelper';

const RSUS = [
  { id: 'RSU-01', name: 'West Gateway', x: 180, y: 150, radius: 140 },
  { id: 'RSU-02', name: 'Central Hub', x: 440, y: 150, radius: 140 },
  { id: 'RSU-03', name: 'Tech Corridor', x: 700, y: 150, radius: 140 },
  { id: 'RSU-04', name: 'East Terminal', x: 960, y: 150, radius: 140 },
];

export default function OverviewView({
  summaryData,
  selectedVehicle,
  onSelectVehicle,
  onRefresh,
  onNavigateTab
}) {
  const [quickMsg, setQuickMsg] = useState(null);
  const [executingScenario, setExecutingScenario] = useState(null);

  const vehicles = summaryData?.topology?.vehicles || [];
  const events = summaryData?.recent_security_events || [];
  const decisions = summaryData?.recent_decisions || [];

  const kpis = summaryData?.kpis || {
    total_vehicles: 17,
    authenticated_vehicles: 16,
    suspicious_vehicles: 1,
    total_rsus: 4,
    average_trust_score: 0.91,
    total_gsk_updates: 4,
    keep_decisions: 86,
    prepare_decisions: 422,
    update_decisions: 2
  };

  const systemStatus = summaryData?.system_status || {
    network_status: 'ONLINE',
    active_gsk_version: 2
  };

  const primaryVehicle = selectedVehicle || vehicles[0];

  // Real calculated values from telemetry
  const authenticatedCount = vehicles.filter((v) => v.authentication_status === 'AUTHENTICATED').length || kpis.authenticated_vehicles;
  const suspiciousCount = vehicles.filter((v) => v.vehicle_status === 'SUSPICIOUS' || v.trust_score < 0.40).length;
  const revokedCount = vehicles.filter((v) => v.vehicle_status === 'REVOKED').length;
  const activeRsusCount = kpis.total_rsus || 4;
  const currentGsk = systemStatus.active_gsk_version || 1;
  const latestDecision = decisions[0] || { decision: 'KEEP', reason: 'Stable vehicle cruising within RSU cell', gsk_version_before: currentGsk, gsk_version_after: currentGsk };

  const mapX = (x) => 60 + (x / 2600) * 1020;
  const mapY = (y) => 130 + ((y - 400) / 100) * 40;

  // Run Auth Handshake Demo
  const handleRunAuthDemo = async () => {
    try {
      setQuickMsg('Executing Authentication protocol...');
      const targetVid = primaryVehicle?.vehicle_id || 'V001';
      const ch = await requestChallenge('RSU-01');
      const v = vehicles.find((veh) => veh.vehicle_id === targetVid);
      const secret = 'SECRET_DEMO_CREDENTIAL';
      const sig = await computeAuthResponseHex(
        secret,
        v?.anonymous_id || 'ANON-DEFAULT',
        ch.challenge_nonce,
        ch.timestamp
      );
      await verifyAuthentication({
        anonymous_id: v?.anonymous_id || 'ANON-DEFAULT',
        challenge_nonce: ch.challenge_nonce,
        timestamp: ch.timestamp,
        response_signature: sig,
        rsu_id: 'RSU-01'
      });
      await createSession(targetVid, 'RSU-01');
      setQuickMsg(`Authentication & Session key established for ${targetVid}.`);
      if (onRefresh) onRefresh();
    } catch (err) {
      setQuickMsg(`Auth notice: ${err.message}`);
    }
  };

  // Run GSK Update Demo
  const handleSimulateGSKUpdate = async () => {
    try {
      setQuickMsg('Evaluating MT-AGKM & GSK rotation...');
      const targetVid = primaryVehicle?.vehicle_id || 'V001';
      const res = await evaluateMTAGKM(targetVid, 'RSU-01', 'JOIN');
      setQuickMsg(`Decision [${res.decision}] | GSK v${res.gsk_version_before} -> v${res.gsk_version_after}`);
      if (onRefresh) onRefresh();
    } catch (err) {
      setQuickMsg(`GSK notice: ${err.message}`);
    }
  };

  // Run Scenario
  const handleQuickScenario = async (scId) => {
    setExecutingScenario(scId);
    try {
      const res = await runScenario(scId);
      setQuickMsg(`Scenario S${scId} executed -> Decision: [${res.actual}]`);
      if (onRefresh) onRefresh();
    } catch (err) {
      setQuickMsg(`Scenario S${scId} error: ${err.message}`);
    } finally {
      setExecutingScenario(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 1. HERO SOC HEADER BAR — HIGH INFORMATION DENSITY */}
      <div
        className="cyber-card"
        style={{
          background: 'linear-gradient(135deg, rgba(17, 25, 39, 0.95) 0%, rgba(13, 19, 29, 0.95) 100%)',
          padding: '16px 20px',
          borderLeft: '4px solid var(--accent-cyan)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          {/* SOC Title & Live Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid var(--border-active)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cyan)'
              }}
            >
              <Activity size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em' }}>
                  Security Operations Center
                </span>
                <span className="badge badge-emerald">
                  <span className="status-dot emerald" style={{ width: 6, height: 6 }} />
                  LIVE SOC
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                Real-time visibility into connected vehicles, trust, mobility and adaptive key management.
              </div>
            </div>
          </div>

          {/* High-Density Metric Strip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              background: '#070B12',
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              flexWrap: 'wrap'
            }}
          >
            {/* Authenticated Vehicles */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Authenticated
              </div>
              <div className="mono font-bold text-emerald" style={{ fontSize: 16 }}>
                {authenticatedCount} / {vehicles.length}
              </div>
            </div>

            <div style={{ width: 1, height: 28, background: 'var(--border-subtle)' }} />

            {/* Suspicious Nodes */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Suspicious
              </div>
              <div className="mono font-bold text-amber" style={{ fontSize: 16 }}>
                {suspiciousCount}
              </div>
            </div>

            <div style={{ width: 1, height: 28, background: 'var(--border-subtle)' }} />

            {/* Revoked Nodes */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Revoked
              </div>
              <div className="mono font-bold text-red" style={{ fontSize: 16 }}>
                {revokedCount}
              </div>
            </div>

            <div style={{ width: 1, height: 28, background: 'var(--border-subtle)' }} />

            {/* Active RSUs */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Active RSUs
              </div>
              <div className="mono font-bold text-cyan" style={{ fontSize: 16 }}>
                {activeRsusCount}
              </div>
            </div>

            <div style={{ width: 1, height: 28, background: 'var(--border-subtle)' }} />

            {/* Current GSK */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Current GSK
              </div>
              <div className="mono font-bold text-cyan" style={{ fontSize: 16 }}>
                v{currentGsk}
              </div>
            </div>

            <div style={{ width: 1, height: 28, background: 'var(--border-subtle)' }} />

            {/* Recent Decision */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Latest MT-AGKM
              </div>
              <span
                className={`badge ${
                  latestDecision.decision === 'KEEP'
                    ? 'badge-emerald'
                    : latestDecision.decision === 'PREPARE'
                    ? 'badge-amber'
                    : 'badge-red'
                }`}
                style={{ marginTop: 2, padding: '2px 8px' }}
              >
                {latestDecision.decision}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN 2-COLUMN SECTION: LARGE LIVE TOPOLOGY + COMPACT SECURITY POSTURE */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1.1fr', gap: 20 }}>
        {/* Left: Large Live VANET Topology Panel */}
        <div className="cyber-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="cyber-card-header">
            <div className="card-title-group">
              <Radio size={16} color="var(--accent-cyan)" />
              <span className="card-title">VANET Corridor Live Topology</span>
              <span className="card-subtitle">(3200m Arterial Highway, 400m Fog Coverage)</span>
            </div>
            <button
              onClick={() => onNavigateTab('network')}
              className="btn btn-ghost"
              style={{ fontSize: 11, padding: '4px 8px' }}
            >
              <span>Full Topology</span>
              <ArrowRight size={12} />
            </button>
          </div>

          <div style={{ position: 'relative', width: '100%', height: 350, background: '#070B12', overflow: 'hidden' }}>
            <svg width="100%" height="100%" viewBox="0 0 1140 310" preserveAspectRatio="none">
              {/* Road bed */}
              <rect x="20" y="115" width="1100" height="80" fill="#0D131D" rx="6" />
              <line x1="20" y1="155" x2="1120" y2="155" stroke="#1D2939" strokeWidth="2" strokeDasharray="12 12" />

              {/* Fog RSUs with Coverage Circles */}
              {RSUS.map((rsu) => (
                <g key={rsu.id}>
                  <circle
                    cx={rsu.x}
                    cy={rsu.y}
                    r={rsu.radius}
                    fill="rgba(56, 189, 248, 0.03)"
                    stroke="rgba(56, 189, 248, 0.22)"
                    strokeWidth="1.2"
                    strokeDasharray="4 4"
                  />
                  <circle cx={rsu.x} cy={rsu.y - 70} r="16" fill="#111927" stroke="var(--accent-cyan)" strokeWidth="1.5" />
                  <text x={rsu.x} y={rsu.y - 65} textAnchor="middle" fill="var(--accent-cyan)" fontSize="9" fontWeight="bold">
                    RSU
                  </text>
                  <text x={rsu.x} y={rsu.y - 94} textAnchor="middle" fill="#94A3B8" fontSize="10" fontWeight="600">
                    {rsu.id}
                  </text>
                  <line x1={rsu.x} y1={rsu.y - 54} x2={rsu.x} y2={115} stroke="rgba(56, 189, 248, 0.3)" strokeWidth="1" />
                </g>
              ))}

              {/* Moving Vehicle Nodes */}
              {vehicles.map((v) => {
                const vx = mapX(v.position_x);
                const vy = mapY(v.position_y);
                const isSelected = primaryVehicle && primaryVehicle.vehicle_id === v.vehicle_id;

                let nodeColor = 'var(--status-emerald-light)';
                if (v.vehicle_status === 'REVOKED' || v.trust_score < 0.40) {
                  nodeColor = 'var(--status-red-light)';
                } else if (v.handover_probability >= 0.60 || v.vehicle_status === 'WARNING') {
                  nodeColor = 'var(--status-amber-light)';
                }

                return (
                  <g
                    key={v.vehicle_id}
                    onClick={() => onSelectVehicle(v)}
                    style={{ cursor: 'pointer' }}
                  >
                    {isSelected && (
                      <circle cx={vx} cy={vy} r="20" fill="none" stroke="var(--accent-cyan)" strokeWidth="2" strokeDasharray="3 3">
                        <animateTransform
                          attributeName="transform"
                          type="rotate"
                          from={`0 ${vx} ${vy}`}
                          to={`360 ${vx} ${vy}`}
                          dur="6s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    )}

                    <rect
                      x={vx - 14}
                      y={vy - 8}
                      width="28"
                      height="16"
                      rx="3"
                      fill="#111927"
                      stroke={nodeColor}
                      strokeWidth={isSelected ? '2.2' : '1.5'}
                    />

                    {/* Direction Arrow */}
                    <polygon
                      points={
                        v.direction === 180
                          ? `${vx - 17},${vy} ${vx - 13},${vy - 4} ${vx - 13},${vy + 4}`
                          : `${vx + 17},${vy} ${vx + 13},${vy - 4} ${vx + 13},${vy + 4}`
                      }
                      fill={nodeColor}
                    />

                    <text
                      x={vx}
                      y={vy - 12}
                      textAnchor="middle"
                      fill={isSelected ? 'var(--accent-cyan)' : '#E2E8F0'}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {v.vehicle_id}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Quick Legend Overlay */}
            <div
              style={{
                position: 'absolute',
                bottom: 10,
                left: 14,
                display: 'flex',
                gap: 14,
                background: 'rgba(13, 19, 29, 0.9)',
                padding: '5px 12px',
                borderRadius: 6,
                border: '1px solid var(--border-subtle)',
                fontSize: 10
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--status-emerald-light)' }}>
                <span className="status-dot emerald" style={{ width: 6, height: 6 }} />
                Trusted (KEEP)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--status-amber-light)' }}>
                <span className="status-dot amber" style={{ width: 6, height: 6 }} />
                Handover Vector (PREPARE)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--status-red-light)' }}>
                <span className="status-dot red" style={{ width: 6, height: 6 }} />
                Threat Isolated (UPDATE)
              </span>
            </div>
          </div>
        </div>

        {/* Right: Security Posture Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Security Posture Summary Card */}
          <div className="cyber-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield size={16} color="var(--accent-cyan)" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>
                  Network Security Posture
                </span>
              </div>
              <span className="badge badge-emerald">Enforced</span>
            </div>

            {/* Fleet Average Trust Progress */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span className="text-dim">Fleet Trust Average:</span>
                <span className="mono font-bold text-emerald">{kpis.average_trust_score} / 1.00</span>
              </div>
              <div style={{ height: 6, background: '#0D131D', borderRadius: 3, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(100, (kpis.average_trust_score || 0.9) * 100)}%`,
                    height: '100%',
                    background: 'var(--status-emerald)'
                  }}
                />
              </div>
            </div>

            {/* Latest MT-AGKM Decision Snapshot */}
            <div
              style={{
                background: '#0D131D',
                borderRadius: 8,
                padding: 12,
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Active Decision Engine
                </span>
                <span
                  className={`badge ${
                    latestDecision.decision === 'KEEP'
                      ? 'badge-emerald'
                      : latestDecision.decision === 'PREPARE'
                      ? 'badge-amber'
                      : 'badge-red'
                  }`}
                >
                  {latestDecision.decision}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#F8FAFC', fontWeight: 600, lineHeight: 1.4 }}>
                {latestDecision.reason}
              </div>
              <div className="mono text-muted" style={{ fontSize: 11 }}>
                Target: {latestDecision.vehicle_id || primaryVehicle?.vehicle_id} | GSK: v{latestDecision.gsk_version_before} → v{latestDecision.gsk_version_after}
              </div>
            </div>
          </div>

          {/* Quick Monitored Node Action Box */}
          {primaryVehicle && (
            <div className="cyber-card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Car size={15} color="var(--accent-cyan)" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>
                    Node Context: {primaryVehicle.vehicle_id}
                  </span>
                </div>
                <span className="mono text-cyan" style={{ fontSize: 11 }}>{primaryVehicle.current_rsu}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11, marginBottom: 12 }}>
                <div>
                  <span className="text-dim">Trust Rating:</span>{' '}
                  <span className="mono font-bold text-emerald">{primaryVehicle.trust_score}</span>
                </div>
                <div>
                  <span className="text-dim">Handover Prob:</span>{' '}
                  <span className="mono font-bold text-amber">{primaryVehicle.handover_probability}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleRunAuthDemo}
                  className="btn btn-primary"
                  style={{ flex: 1, fontSize: 11, padding: '6px 10px' }}
                >
                  <Key size={13} />
                  <span>Handshake</span>
                </button>
                <button
                  onClick={handleSimulateGSKUpdate}
                  className="btn btn-secondary"
                  style={{ flex: 1, fontSize: 11, padding: '6px 10px' }}
                >
                  <Cpu size={13} />
                  <span>MT-AGKM</span>
                </button>
              </div>

              {quickMsg && (
                <div className="mono text-cyan" style={{ fontSize: 11, marginTop: 8, fontStyle: 'italic' }}>
                  {quickMsg}
                </div>
              )}
            </div>
          )}

          {/* Recent Security Events Stream (3 items) */}
          <div className="cyber-card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} color="var(--text-muted)" />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Recent Security Events
                </span>
              </div>
              <button
                onClick={() => onNavigateTab('events')}
                className="btn btn-ghost"
                style={{ fontSize: 10, padding: '2px 6px' }}
              >
                View Log
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {events.slice(0, 3).map((e, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#0D131D',
                    borderRadius: 6,
                    padding: '8px 10px',
                    fontSize: 11,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8
                  }}
                >
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ color: '#F8FAFC', fontWeight: 600 }}>{e.event_type}</span>{' '}
                    <span className="text-muted">({e.vehicle_id})</span>
                  </div>
                  <span
                    className={`badge ${
                      e.severity === 'CRITICAL' ? 'badge-red' : e.severity === 'WARNING' ? 'badge-amber' : 'badge-cyan'
                    }`}
                    style={{ fontSize: 9, padding: '2px 6px' }}
                  >
                    {e.severity || 'INFO'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. ONE-CLICK RESEARCH SCENARIO DEMONSTRATIONS (S1 to S8) */}
      <div className="cyber-card">
        <div className="cyber-card-header">
          <div className="card-title-group">
            <Zap size={16} color="var(--status-amber-light)" />
            <span className="card-title">Live Research Scenarios (S1 to S8)</span>
          </div>
          <button
            onClick={() => onNavigateTab('simulation')}
            className="btn btn-ghost"
            style={{ fontSize: 12, padding: '4px 8px' }}
          >
            <span>Simulation Lab</span>
            <ArrowRight size={12} />
          </button>
        </div>
        <div className="cyber-card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {[
            { id: 1, label: 'S1: Stable Cruise (KEEP)' },
            { id: 2, label: 'S2: Approach Boundary (PREPARE)' },
            { id: 3, label: 'S3: Vehicle Departure (UPDATE)' },
            { id: 4, label: 'S4: Suspicious Replay Threat (UPDATE)' },
            { id: 5, label: 'S5: Low-Trust Isolation (UPDATE)' },
            { id: 6, label: 'S6: New Vehicle Join (UPDATE)' },
            { id: 8, label: 'S8: High Mobility Cruise (PREPARE vs Trad)' },
          ].map((sc) => (
            <button
              key={sc.id}
              onClick={() => handleQuickScenario(sc.id)}
              disabled={executingScenario !== null}
              className="btn btn-secondary"
              style={{ fontSize: 12 }}
            >
              {executingScenario === sc.id ? <Zap size={12} className="spin text-cyan" /> : <Play size={12} />}
              <span>{sc.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. RESEARCH EXPLANATION PANEL: "WHY ADAPTIVE?" */}
      <div
        className="cyber-card"
        style={{
          borderLeft: '4px solid var(--accent-cyan)',
          background: 'linear-gradient(135deg, rgba(17, 25, 39, 0.9) 0%, rgba(13, 19, 29, 0.7) 100%)'
        }}
      >
        <div className="cyber-card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Layers size={18} color="var(--accent-cyan)" />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#F8FAFC' }}>
              Why Adaptive Group Key Management?
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
            Traditional vehicular key management schemes trigger an unconditional, expensive broadcast re-keying operation
            whenever any vehicle approaches an RSU boundary, resulting in spectrum saturation and severe cryptographic latency.
            Our proposed <b>MT-AGKM</b> engine evaluates continuous kinematics and behavioral trust before deciding key lifecycle actions:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            <div style={{ background: 'rgba(13, 19, 29, 0.6)', padding: 12, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div className="text-emerald font-bold" style={{ fontSize: 13, marginBottom: 2 }}>KEEP</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Stable vehicle state + high trust. Retains current GSK. 100% of unnecessary re-key overhead is avoided.
              </div>
            </div>
            <div style={{ background: 'rgba(13, 19, 29, 0.6)', padding: 12, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div className="text-amber font-bold" style={{ fontSize: 13, marginBottom: 2 }}>PREPARE</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Boundary approached with trusted behavior. Pre-stages handover tickets; zero immediate GSK rotation.
              </div>
            </div>
            <div style={{ background: 'rgba(13, 19, 29, 0.6)', padding: 12, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div className="text-red font-bold" style={{ fontSize: 13, marginBottom: 2 }}>UPDATE</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Security-sensitive state (trust &lt; 0.40, join, leave, revoke). Immediate GSK rotation enforcing forward/backward security.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
