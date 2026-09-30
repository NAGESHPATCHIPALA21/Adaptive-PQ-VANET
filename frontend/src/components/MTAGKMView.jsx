import React, { useState } from 'react';
import {
  Cpu,
  ArrowRight,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

import { evaluateMTAGKM } from '../api';

export default function MTAGKMView({
  vehicles = [],
  currentGSKVersion = 2,
  onDecisionExecuted
}) {
  const [selectedVid, setSelectedVid] = useState(vehicles[0]?.vehicle_id || 'V001');
  const [membershipEvent, setMembershipEvent] = useState('');
  const [securityEvent, setSecurityEvent] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [decisionResult, setDecisionResult] = useState(null);

  const selectedVehicle = vehicles.find((v) => v.vehicle_id === selectedVid) || vehicles[0];

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      const res = await evaluateMTAGKM(
        selectedVid,
        selectedVehicle?.current_rsu || 'RSU-01',
        membershipEvent || null,
        securityEvent || null
      );
      setDecisionResult(res);
      if (onDecisionExecuted) onDecisionExecuted();
    } catch (err) {
      alert(`MT-AGKM evaluation failed: ${err.message}`);
    } finally {
      setEvaluating(false);
    }
  };

  const decision = decisionResult?.decision || (
    selectedVehicle?.handover_probability >= 0.60
      ? 'PREPARE'
      : selectedVehicle?.trust_score < 0.40
      ? 'UPDATE'
      : 'KEEP'
  );

  const isKeep = decision === 'KEEP';
  const isPrepare = decision === 'PREPARE';
  const isUpdate = decision === 'UPDATE';

  const gskBefore = decisionResult?.gsk_version_before || currentGSKVersion;
  const gskAfter = decisionResult?.gsk_version_after || (isUpdate ? currentGSKVersion + 1 : currentGSKVersion);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em' }}>
          Adaptive Group Key Management
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          Mobility–Trust-Aware Group Key Management (MT-AGKM) Decision Engine.
        </p>
      </div>

      {/* Visual Architectural Flow Diagram */}
      <div
        className="cyber-card"
        style={{
          background: 'linear-gradient(135deg, rgba(17, 25, 39, 0.95) 0%, rgba(13, 19, 29, 0.95) 100%)',
          padding: '24px 20px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          {/* Stage 1: Mobility + Trust + Security Context */}
          <div
            style={{
              flex: '1 1 200px',
              background: '#0D131D',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              padding: 14,
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: 4 }}>
              Input Vectors
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>
              Mobility &bull; Trust &bull; Context
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Velocity, boundary proximity, trust score, threat telemetry
            </div>
          </div>

          <ArrowRight size={20} color="var(--border-medium)" style={{ flexShrink: 0 }} />

          {/* Stage 2: Decision Engine */}
          <div
            style={{
              flex: '1 1 200px',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid var(--border-active)',
              borderRadius: 8,
              padding: 14,
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: 4 }}>
              Policy Evaluation
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-cyan)' }}>
              MT-AGKM Decision Engine
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
              Threshold matrix &amp; adaptive state machine
            </div>
          </div>

          <ArrowRight size={20} color="var(--border-medium)" style={{ flexShrink: 0 }} />

          {/* Stage 3: Three Decisions */}
          <div
            style={{
              flex: '1 1 220px',
              background: '#0D131D',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              State Action
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span className={`badge ${isKeep ? 'badge-emerald' : 'badge-muted'}`} style={{ padding: '4px 8px', fontSize: 11 }}>
                KEEP
              </span>
              <span className={`badge ${isPrepare ? 'badge-amber' : 'badge-muted'}`} style={{ padding: '4px 8px', fontSize: 11 }}>
                PREPARE
              </span>
              <span className={`badge ${isUpdate ? 'badge-red' : 'badge-muted'}`} style={{ padding: '4px 8px', fontSize: 11 }}>
                UPDATE
              </span>
            </div>
          </div>

          <ArrowRight size={20} color="var(--border-medium)" style={{ flexShrink: 0 }} />

          {/* Stage 4: Group Key State */}
          <div
            style={{
              flex: '1 1 200px',
              background: '#0D131D',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              padding: 14,
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--status-emerald-light)', textTransform: 'uppercase', marginBottom: 4 }}>
              Cryptographic State
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>
              Group Key State
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Retain GSK or rotate v(k) &rarr; v(k+1)
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Command Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1.95fr', gap: 20 }}>
        {/* Left: Input Evaluation Form */}
        <div className="cyber-card">
          <div className="cyber-card-header">
            <div className="card-title-group">
              <Cpu size={16} color="var(--accent-cyan)" />
              <span className="card-title">Evaluation Configuration</span>
            </div>
          </div>

          <div className="cyber-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Target Vehicle */}
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Target Vehicle Node:
              </label>
              <select
                value={selectedVid}
                onChange={(e) => {
                  setSelectedVid(e.target.value);
                  setDecisionResult(null);
                }}
                className="select-control mono"
                style={{ width: '100%', fontSize: 12 }}
              >
                {vehicles.map((v) => (
                  <option key={v.vehicle_id} value={v.vehicle_id}>
                    {v.vehicle_id} ({v.anonymous_id}) | Trust: {v.trust_score}
                  </option>
                ))}
              </select>
            </div>

            {/* Current Kinematic Summary Box */}
            {selectedVehicle && (
              <div
                style={{
                  background: '#0D131D',
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid var(--border-subtle)',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                  fontSize: 12
                }}
              >
                <div>
                  <span className="text-dim">Current RSU:</span>
                  <div className="mono font-semibold text-cyan">{selectedVehicle.current_rsu}</div>
                </div>
                <div>
                  <span className="text-dim">Velocity:</span>
                  <div className="mono font-semibold" style={{ color: '#F8FAFC' }}>{selectedVehicle.speed} km/h</div>
                </div>
                <div>
                  <span className="text-dim">Mobility Score:</span>
                  <div className="mono font-semibold" style={{ color: selectedVehicle.mobility_score >= 0.7 ? 'var(--status-amber-light)' : '#F8FAFC' }}>
                    {selectedVehicle.mobility_score}
                  </div>
                </div>
                <div>
                  <span className="text-dim">Trust Score:</span>
                  <div className="mono font-bold" style={{ color: selectedVehicle.trust_score < 0.4 ? 'var(--status-red-light)' : 'var(--status-emerald-light)' }}>
                    {selectedVehicle.trust_score}
                  </div>
                </div>
              </div>
            )}

            {/* Membership Event Injector */}
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Membership State Transition:
              </label>
              <select
                value={membershipEvent}
                onChange={(e) => setMembershipEvent(e.target.value)}
                className="select-control mono"
                style={{ width: '100%', fontSize: 12 }}
              >
                <option value="">No Membership Event (Continuous Flow)</option>
                <option value="JOIN">VEHICLE_JOIN (Enforce Backward Security)</option>
                <option value="LEAVE">VEHICLE_LEAVE (Enforce Forward Security)</option>
                <option value="REVOKE">REVOCATION (Security Compromise)</option>
              </select>
            </div>

            {/* Security Context Injector */}
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Security Violation Context:
              </label>
              <select
                value={securityEvent}
                onChange={(e) => setSecurityEvent(e.target.value)}
                className="select-control mono"
                style={{ width: '100%', fontSize: 12 }}
              >
                <option value="">No Security Violation (Benign Behavior)</option>
                <option value="REPLAY_ATTEMPT">REPLAY_ATTEMPT (Repeated Nonce)</option>
                <option value="INVALID_SIGNATURE">INVALID_SIGNATURE (HMAC Mismatch)</option>
                <option value="PACKET_FLOODING">PACKET_FLOODING (DoS Flooding Attack)</option>
              </select>
            </div>

            {/* Evaluate Button */}
            <button
              onClick={handleEvaluate}
              disabled={evaluating}
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px 16px', marginTop: 6 }}
            >
              {evaluating ? <RefreshCw size={14} className="spin" /> : <Zap size={14} />}
              <span>Execute MT-AGKM Evaluation</span>
            </button>
          </div>
        </div>

        {/* Right: Visual Hero Decision Outcome Card */}
        <div
          className="cyber-card"
          style={{
            border: `1px solid ${
              isKeep
                ? 'rgba(16, 185, 129, 0.4)'
                : isPrepare
                ? 'rgba(245, 158, 11, 0.4)'
                : 'rgba(239, 68, 68, 0.4)'
            }`,
            background: isKeep
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.04) 0%, rgba(17, 25, 39, 0.95) 100%)'
              : isPrepare
              ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.04) 0%, rgba(17, 25, 39, 0.95) 100%)'
              : 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(17, 25, 39, 0.95) 100%)'
          }}
        >
          <div className="cyber-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="card-title">Live Decision Outcome</span>
              <span className="badge badge-cyan mono font-bold">NODE {selectedVid}</span>
            </div>
            <span
              className={`badge ${
                isKeep ? 'badge-emerald' : isPrepare ? 'badge-amber' : 'badge-red'
              }`}
              style={{ fontSize: 13, padding: '4px 14px', letterSpacing: '0.04em' }}
            >
              {decision}
            </span>
          </div>

          <div className="cyber-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Visual Node Context Display */}
            <div
              style={{
                background: '#0D131D',
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                padding: '14px 18px'
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                <div>
                  <span className="text-dim" style={{ fontSize: 11 }}>Mobility</span>
                  <div className="mono font-bold" style={{ fontSize: 18, color: '#F8FAFC', marginTop: 2 }}>
                    {decisionResult?.mobility_score ?? selectedVehicle?.mobility_score ?? 0.30}
                  </div>
                  <span style={{ fontSize: 10, color: (decisionResult?.mobility_score ?? selectedVehicle?.mobility_score ?? 0.3) >= 0.7 ? 'var(--status-amber-light)' : 'var(--text-muted)' }}>
                    {(decisionResult?.mobility_score ?? selectedVehicle?.mobility_score ?? 0.3) >= 0.7 ? 'HIGH' : 'LOW'}
                  </span>
                </div>

                <div>
                  <span className="text-dim" style={{ fontSize: 11 }}>Trust</span>
                  <div
                    className="mono font-bold"
                    style={{
                      fontSize: 18,
                      marginTop: 2,
                      color: (decisionResult?.trust_score ?? selectedVehicle?.trust_score ?? 0.9) < 0.4 ? 'var(--status-red-light)' : 'var(--status-emerald-light)'
                    }}
                  >
                    {decisionResult?.trust_score ?? selectedVehicle?.trust_score ?? 0.90}
                  </div>
                  <span style={{ fontSize: 10, color: (decisionResult?.trust_score ?? selectedVehicle?.trust_score ?? 0.9) < 0.4 ? 'var(--status-red-light)' : 'var(--status-emerald-light)' }}>
                    {(decisionResult?.trust_score ?? selectedVehicle?.trust_score ?? 0.9) < 0.4 ? 'DEGRADED' : 'HEALTHY'}
                  </span>
                </div>

                <div>
                  <span className="text-dim" style={{ fontSize: 11 }}>Handover</span>
                  <div
                    className="mono font-bold"
                    style={{
                      fontSize: 18,
                      marginTop: 2,
                      color: (decisionResult?.handover_probability ?? selectedVehicle?.handover_probability ?? 0.25) >= 0.6 ? 'var(--status-amber-light)' : '#F8FAFC'
                    }}
                  >
                    {(decisionResult?.handover_probability ?? selectedVehicle?.handover_probability ?? 0.25) >= 0.6 ? 'HIGH' : 'LOW'}
                  </div>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {decisionResult?.handover_probability ?? selectedVehicle?.handover_probability ?? 0.25}
                  </span>
                </div>

                <div>
                  <span className="text-dim" style={{ fontSize: 11 }}>Threat Level</span>
                  <div
                    className="mono font-bold"
                    style={{
                      fontSize: 18,
                      marginTop: 2,
                      color: securityEvent || (decisionResult?.trust_score ?? selectedVehicle?.trust_score ?? 0.9) < 0.4 ? 'var(--status-red-light)' : 'var(--status-emerald-light)'
                    }}
                  >
                    {securityEvent ? 'CRITICAL' : (decisionResult?.trust_score ?? selectedVehicle?.trust_score ?? 0.9) < 0.4 ? 'ELEVATED' : 'LOW'}
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {securityEvent ? securityEvent : 'Nominal Traffic'}
                  </span>
                </div>
              </div>
            </div>

            {/* Central Decision Flow Indicator */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                borderRadius: 8,
                background: isKeep
                  ? 'rgba(16, 185, 129, 0.08)'
                  : isPrepare
                  ? 'rgba(245, 158, 11, 0.08)'
                  : 'rgba(239, 68, 68, 0.08)',
                border: `1px solid ${
                  isKeep
                    ? 'rgba(16, 185, 129, 0.25)'
                    : isPrepare
                    ? 'rgba(245, 158, 11, 0.25)'
                    : 'rgba(239, 68, 68, 0.25)'
                }`
              }}
            >
              <div>
                <span className="text-dim" style={{ fontSize: 11 }}>Group Session Key State</span>
                <div className="mono font-bold" style={{ fontSize: 18, color: '#F8FAFC', marginTop: 2 }}>
                  GSK v{gskBefore} &rarr; v{gskAfter}
                </div>
                <div style={{ fontSize: 11, color: isKeep || isPrepare ? 'var(--status-emerald-light)' : 'var(--status-red-light)', marginTop: 2 }}>
                  {isKeep || isPrepare ? 'No immediate rotation required' : 'Immediate rotation enforced'}
                </div>
              </div>

              <div>
                {isKeep || isPrepare ? (
                  <span className="badge badge-emerald" style={{ padding: '6px 14px' }}>
                    <CheckCircle2 size={14} />
                    <span>No Unnecessary Re-Key</span>
                  </span>
                ) : (
                  <span className="badge badge-red" style={{ padding: '6px 14px' }}>
                    <AlertTriangle size={14} />
                    <span>Group Key Rotated</span>
                  </span>
                )}
              </div>
            </div>

            {/* ACTION & WHY Sections */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
              {/* ACTION Section */}
              <div style={{ background: '#0D131D', padding: 14, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                  ACTION
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: isKeep ? 'var(--status-emerald-light)' : isPrepare ? 'var(--status-amber-light)' : 'var(--status-red-light)', lineHeight: 1.5 }}>
                  {isKeep && 'Retain active Group Session Key (GSK). Unnecessary re-key computational and wireless broadcast overhead is 100% avoided.'}
                  {isPrepare && 'Prepare handover credentials and proactive tickets for adjacent RSU target without rotating active cell Group Session Key.'}
                  {isUpdate && 'Increment Group Session Key version and distribute to legitimate cell nodes to isolate threat and maintain forward/backward security.'}
                </div>
              </div>

              {/* WHY Section */}
              <div style={{ background: '#0D131D', padding: 14, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                  WHY
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#F8FAFC', lineHeight: 1.5 }}>
                  {decisionResult?.reason || (
                    isKeep
                      ? 'Stable vehicle kinematics: Trust score is healthy and cell boundary distance is sufficient.'
                      : isPrepare
                      ? 'High velocity or cell boundary proximity detected while vehicle trust score remains within healthy bounds.'
                      : 'Security compromise, degraded trust score, or membership transition requires immediate key isolation.'
                  )}
                </div>
              </div>

              {/* SECURITY CONTEXT & GSK COMPARISON Section */}
              <div
                style={{
                  background: '#0D131D',
                  padding: 14,
                  borderRadius: 8,
                  border: '1px solid var(--border-subtle)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 12
                }}
              >
                <div>
                  <span className="text-dim" style={{ fontSize: 11 }}>GSK Before:</span>
                  <div className="mono font-bold" style={{ fontSize: 15, color: '#F8FAFC', marginTop: 2 }}>
                    v{gskBefore}
                  </div>
                </div>

                <div>
                  <span className="text-dim" style={{ fontSize: 11 }}>GSK After:</span>
                  <div className="mono font-bold text-cyan" style={{ fontSize: 15, marginTop: 2 }}>
                    v{gskAfter}
                  </div>
                </div>

                <div>
                  <span className="text-dim" style={{ fontSize: 11 }}>Security Context:</span>
                  <div className="mono font-semibold" style={{ fontSize: 12, color: 'var(--status-emerald-light)', marginTop: 2 }}>
                    {membershipEvent ? `Membership (${membershipEvent})` : securityEvent ? `Threat (${securityEvent})` : 'Benign Telemetry'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
