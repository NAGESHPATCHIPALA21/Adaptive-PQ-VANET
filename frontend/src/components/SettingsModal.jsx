import React, { useState } from 'react';
import { X, Settings, RotateCcw, CheckCircle2, AlertTriangle, Server, Database } from 'lucide-react';
import { resetSimulation } from '../api';

export default function SettingsModal({ isOpen, onClose, onResetComplete }) {
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState(null);

  if (!isOpen) return null;

  const handleReset = async () => {
    if (!window.confirm('Reset all vehicle positions, trust records, and group session keys to initial state?')) {
      return;
    }
    setResetting(true);
    setResetMessage(null);
    try {
      const res = await resetSimulation();
      setResetMessage({ type: 'success', text: res.message || 'Simulation and database successfully reset.' });
      if (onResetComplete) onResetComplete();
    } catch (err) {
      setResetMessage({ type: 'error', text: `Reset failed: ${err.message}` });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-card)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Settings size={18} color="var(--accent-cyan)" />
            <span style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC' }}>
              Platform Configuration & Endpoints
            </span>
          </div>
          <button onClick={onClose} className="btn-icon" title="Close">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {resetMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: resetMessage.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                border: `1px solid ${resetMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                color: resetMessage.type === 'success' ? 'var(--status-emerald-light)' : 'var(--status-red-light)'
              }}
            >
              {resetMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>{resetMessage.text}</span>
            </div>
          )}

          {/* Endpoints & Services */}
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Active Microservices & Endpoints
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              <div
                style={{
                  background: 'rgba(17, 25, 39, 0.6)',
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Server size={16} color="var(--accent-cyan)" />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#F8FAFC' }}>FastAPI Backend Service</div>
                    <div className="mono text-muted" style={{ fontSize: 11 }}>http://127.0.0.1:8000/api</div>
                  </div>
                </div>
                <span className="badge badge-emerald">Online</span>
              </div>

              <div
                style={{
                  background: 'rgba(17, 25, 39, 0.6)',
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Database size={16} color="var(--accent-violet)" />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#F8FAFC' }}>SQLite Cryptographic DB</div>
                    <div className="mono text-muted" style={{ fontSize: 11 }}>vanet_prototype.db (SQLAlchemy 2.0)</div>
                  </div>
                </div>
                <span className="badge badge-emerald">Connected</span>
              </div>
            </div>
          </div>

          {/* Reset Action */}
          <div
            style={{
              padding: 16,
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.06)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>Reset Simulation State</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Purge dynamic sessions, re-seed highway topology and re-initialize GSK v1.
              </div>
            </div>
            <button
              onClick={handleReset}
              disabled={resetting}
              className="btn btn-danger"
              style={{ padding: '8px 16px', fontSize: 12 }}
            >
              <RotateCcw size={14} className={resetting ? 'spin' : ''} />
              <span>Reset State</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
