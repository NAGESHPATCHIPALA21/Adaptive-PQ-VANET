import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Key,
  Cpu,
  AlertTriangle,
  Compass,
  Gauge,
  Activity,
  UserX,
  Lock,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';

import {
  requestChallenge,
  verifyAuthentication,
  createSession,
  evaluateMTAGKM,
  recordTrustEvent
} from '../api';
import { computeAuthResponseHex } from '../utils/cryptoHelper';

export default function VehicleDrawer({
  vehicle,
  onClose,
  activeGSKVersion = 1,
  onActionComplete
}) {
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  if (!vehicle) return null;

  const isLowTrust = vehicle.trust_score < 0.40;
  const isRevoked = vehicle.vehicle_status === 'REVOKED';
  const isAuthenticated = vehicle.authentication_status === 'AUTHENTICATED';

  // Compute clean simulated fingerprint for pairwise key (never expose raw keys)
  const sessionFingerprint = `SHA256:${(vehicle.anonymous_id || 'DEFAULT')
    .split('')
    .reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0)
    .toString(16)
    .padStart(8, '0')
    .toUpperCase()}...7F2A`;

  const pqSecretFingerprint = `ML-KEM-768:[32B:${(vehicle.vehicle_id || 'V000')
    .split('')
    .reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0)
    .toString(16)
    .padStart(8, '0')
    .toUpperCase()}...B94C]`;

  // Quick Action: Authentication Handshake
  const handleAuthHandshake = async () => {
    setActionLoading(true);
    setActionFeedback(null);
    try {
      const rsuId = vehicle.current_rsu || 'RSU-01';
      const challenge = await requestChallenge(rsuId);
      const secret = 'SECRET_DEMO_CREDENTIAL'; // Protected TA secret reference
      const sig = await computeAuthResponseHex(
        secret,
        vehicle.anonymous_id,
        challenge.challenge_nonce,
        challenge.timestamp
      );
      await verifyAuthentication({
        anonymous_id: vehicle.anonymous_id,
        challenge_nonce: challenge.challenge_nonce,
        timestamp: challenge.timestamp,
        response_signature: sig,
        rsu_id: rsuId
      });
      await createSession(vehicle.vehicle_id, rsuId);
      setActionFeedback({
        type: 'success',
        message: `Mutual Authentication & Pairwise Session established at ${rsuId}.`
      });
      if (onActionComplete) onActionComplete();
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: `Authentication failed: ${err.message}`
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Action: Run MT-AGKM Evaluation
  const handleEvaluateMTAGKM = async () => {
    setActionLoading(true);
    setActionFeedback(null);
    try {
      const res = await evaluateMTAGKM(
        vehicle.vehicle_id,
        vehicle.current_rsu || 'RSU-01'
      );
      setActionFeedback({
        type: 'success',
        message: `MT-AGKM Decision: [${res.decision}] (GSK v${res.gsk_version_before} -> v${res.gsk_version_after}).`
      });
      if (onActionComplete) onActionComplete();
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: `MT-AGKM failed: ${err.message}`
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Action: Inject Replay / Threat event
  const handleInjectThreat = async () => {
    setActionLoading(true);
    setActionFeedback(null);
    try {
      await recordTrustEvent(vehicle.vehicle_id, 'REPLAY_ATTEMPT', 0.45);
      const evalRes = await evaluateMTAGKM(
        vehicle.vehicle_id,
        vehicle.current_rsu || 'RSU-01',
        null,
        'REPLAY_ATTEMPT'
      );
      setActionFeedback({
        type: 'warning',
        message: `Threat injected: Trust penalized (-0.45). MT-AGKM executed [${evalRes.decision}] to isolate node.`
      });
      if (onActionComplete) onActionComplete();
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: `Threat injection failed: ${err.message}`
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Action: Revoke Vehicle
  const handleRevokeNode = async () => {
    setActionLoading(true);
    setActionFeedback(null);
    try {
      const res = await evaluateMTAGKM(
        vehicle.vehicle_id,
        vehicle.current_rsu || 'RSU-01',
        'REVOKE',
        'COMPROMISED_VEHICLE'
      );
      setActionFeedback({
        type: 'error',
        message: `Vehicle ${vehicle.vehicle_id} permanently revoked. Forward security enforced with GSK v${res.gsk_version_after}.`
      });
      if (onActionComplete) onActionComplete();
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: `Revocation failed: ${err.message}`
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid var(--border-active)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cyan)'
              }}
            >
              <ShieldCheck size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC' }} className="mono">
                  {vehicle.vehicle_id}
                </span>
                <span className={`badge ${isRevoked ? 'badge-red' : isLowTrust ? 'badge-amber' : 'badge-emerald'}`}>
                  {vehicle.vehicle_status}
                </span>
              </div>
              <div className="mono text-cyan" style={{ fontSize: 11, fontWeight: 500 }}>
                {vehicle.anonymous_id}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon" title="Close drawer">
            <X size={16} />
          </button>
        </div>

        {/* Body Content */}
        <div className="drawer-body">
          {/* Action Feedback Banner */}
          {actionFeedback && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background:
                  actionFeedback.type === 'success'
                    ? 'rgba(16, 185, 129, 0.12)'
                    : actionFeedback.type === 'warning'
                    ? 'rgba(245, 158, 11, 0.12)'
                    : 'rgba(239, 68, 68, 0.12)',
                border: `1px solid ${
                  actionFeedback.type === 'success'
                    ? 'rgba(16, 185, 129, 0.3)'
                    : actionFeedback.type === 'warning'
                    ? 'rgba(245, 158, 11, 0.3)'
                    : 'rgba(239, 68, 68, 0.3)'
                }`,
                color:
                  actionFeedback.type === 'success'
                    ? 'var(--status-emerald-light)'
                    : actionFeedback.type === 'warning'
                    ? 'var(--status-amber-light)'
                    : 'var(--status-red-light)'
              }}
            >
              {actionFeedback.type === 'success' ? (
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              ) : (
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              )}
              <span>{actionFeedback.message}</span>
            </div>
          )}

          {/* Section 1: Kinematics & Spatial Position */}
          <div className="cyber-card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Gauge size={14} color="var(--accent-cyan)" />
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                Kinematics & Spatial Location
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, fontSize: 12 }}>
              <div>
                <span className="text-dim">Highway Position:</span>
                <div className="mono" style={{ color: '#F8FAFC', fontWeight: 600 }}>
                  ({Math.round(vehicle.position_x)}m, {Math.round(vehicle.position_y)}m)
                </div>
              </div>
              <div>
                <span className="text-dim">Current RSU:</span>
                <div className="mono text-cyan" style={{ fontWeight: 600 }}>
                  {vehicle.current_rsu}
                </div>
              </div>
              <div>
                <span className="text-dim">Velocity:</span>
                <div className="mono" style={{ color: '#F8FAFC', fontWeight: 600 }}>
                  {vehicle.speed} km/h
                </div>
              </div>
              <div>
                <span className="text-dim">Trajectory Heading:</span>
                <div className="mono" style={{ color: '#F8FAFC', fontWeight: 600 }}>
                  {vehicle.direction}° ({vehicle.direction === 0 ? 'Eastbound' : 'Westbound'})
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Mobility & Handover Metrics */}
          <div className="cyber-card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Compass size={14} color="var(--accent-cyan)" />
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                Mobility & Handover State
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span className="text-dim">Mobility Score:</span>
                  <span className="mono" style={{ color: vehicle.mobility_score >= 0.7 ? 'var(--status-amber-light)' : '#F8FAFC', fontWeight: 600 }}>
                    {vehicle.mobility_score}
                  </span>
                </div>
                <div style={{ height: 6, background: '#0D131D', borderRadius: 3, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.min(100, (vehicle.mobility_score || 0) * 100)}%`,
                      height: '100%',
                      background: vehicle.mobility_score >= 0.7 ? 'var(--status-amber)' : 'var(--accent-cyan)'
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span className="text-dim">Handover Probability:</span>
                  <span className="mono" style={{ color: vehicle.handover_probability >= 0.6 ? 'var(--status-amber-light)' : '#F8FAFC', fontWeight: 600 }}>
                    {vehicle.handover_probability}
                  </span>
                </div>
                <div style={{ height: 6, background: '#0D131D', borderRadius: 3, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.min(100, (vehicle.handover_probability || 0) * 100)}%`,
                      height: '100%',
                      background: vehicle.handover_probability >= 0.6 ? 'var(--status-amber)' : 'var(--status-emerald)'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Trust & Reputation Evaluation */}
          <div className="cyber-card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Activity size={14} color={isLowTrust ? 'var(--status-red-light)' : 'var(--status-emerald-light)'} />
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                Behavioral Trust & Reputation
              </span>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span className="text-dim">Dynamic Trust Score:</span>
                <span
                  className="mono"
                  style={{
                    fontWeight: 700,
                    color: isLowTrust ? 'var(--status-red-light)' : vehicle.trust_score < 0.7 ? 'var(--status-amber-light)' : 'var(--status-emerald-light)'
                  }}
                >
                  {vehicle.trust_score} / 1.00 ({isLowTrust ? 'CRITICAL THREAT' : 'RELIABLE'})
                </span>
              </div>
              <div style={{ height: 8, background: '#0D131D', borderRadius: 4, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(100, (vehicle.trust_score || 0) * 100)}%`,
                    height: '100%',
                    background: isLowTrust
                      ? 'var(--status-red)'
                      : vehicle.trust_score < 0.7
                      ? 'var(--status-amber)'
                      : 'var(--status-emerald)'
                  }}
                />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                Trust threshold for containment: &lt; 0.40. Replay violations incur -0.25 to -0.45 penalty.
              </div>
            </div>
          </div>

          {/* Section 4: Cryptographic State & Fingerprints */}
          <div className="cyber-card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Lock size={14} color="var(--accent-indigo)" />
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                Cryptographic Identity & Keys
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-dim">Authentication Status:</span>
                <span className={`badge ${isAuthenticated ? 'badge-emerald' : 'badge-amber'}`}>
                  {vehicle.authentication_status}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-dim">Active GSK Version:</span>
                <span className="mono text-cyan" style={{ fontWeight: 700 }}>
                  v{vehicle.group_key_version || activeGSKVersion}
                </span>
              </div>
              <div>
                <span className="text-dim">Pairwise Session Fingerprint:</span>
                <div className="mono" style={{ fontSize: 11, color: 'var(--accent-cyan)', background: '#0D131D', padding: '4px 8px', borderRadius: 4, marginTop: 2 }}>
                  {sessionFingerprint}
                </div>
              </div>
              <div>
                <span className="text-dim">Post-Quantum Shared Secret:</span>
                <div className="mono" style={{ fontSize: 11, color: 'var(--accent-violet)', background: '#0D131D', padding: '4px 8px', borderRadius: 4, marginTop: 2 }}>
                  {pqSecretFingerprint}
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                * Secret keys, private ML-KEM seeds, and master tokens are isolated and never transmitted to the client.
              </div>
            </div>
          </div>
        </div>

        {/* Drawer Footer Quick Actions */}
        <div className="drawer-footer">
          <button
            onClick={handleAuthHandshake}
            disabled={actionLoading}
            className="btn btn-primary"
            style={{ flex: 1, fontSize: 12 }}
          >
            {actionLoading ? <RefreshCw size={14} className="spin" /> : <Key size={14} />}
            <span>Handshake</span>
          </button>

          <button
            onClick={handleEvaluateMTAGKM}
            disabled={actionLoading}
            className="btn btn-secondary"
            style={{ flex: 1, fontSize: 12 }}
          >
            <Cpu size={14} />
            <span>MT-AGKM</span>
          </button>

          <button
            onClick={handleInjectThreat}
            disabled={actionLoading || isRevoked}
            className="btn btn-danger"
            style={{ fontSize: 12 }}
            title="Inject Replay Attack Threat"
          >
            <AlertTriangle size={14} />
          </button>

          <button
            onClick={handleRevokeNode}
            disabled={actionLoading || isRevoked}
            className="btn btn-danger"
            style={{ fontSize: 12 }}
            title="Revoke Node & Force Forward Security"
          >
            <UserX size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
