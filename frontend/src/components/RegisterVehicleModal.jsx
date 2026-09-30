import React, { useState } from 'react';
import { X, UserPlus, CheckCircle2, AlertTriangle, Car } from 'lucide-react';

import { registerVehicle } from '../api';

export default function RegisterVehicleModal({ isOpen, onClose, onRegisterSuccess }) {
  const [vehicleId, setVehicleId] = useState('');
  const [initialRsu, setInitialRsu] = useState('RSU-01');
  const [speed, setSpeed] = useState(60);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vehicleId.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await registerVehicle({
        vehicle_id: vehicleId.trim().toUpperCase(),
        initial_rsu: initialRsu,
        position_x: initialRsu === 'RSU-01' ? 300 : initialRsu === 'RSU-02' ? 900 : initialRsu === 'RSU-03' ? 1500 : 2100,
        position_y: 400,
        speed: Number(speed)
      });
      setResult(res);
      if (onRegisterSuccess) onRegisterSuccess();
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
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
            <UserPlus size={18} color="var(--accent-cyan)" />
            <span style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC' }}>
              Register Vehicle with Trusted Authority
            </span>
          </div>
          <button onClick={onClose} className="btn-icon" title="Close">
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--status-red-light)'
              }}
            >
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 8,
                fontSize: 12,
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: 'var(--status-emerald-light)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                <CheckCircle2 size={16} />
                <span>Vehicle Registered Successfully!</span>
              </div>
              <div className="mono" style={{ color: '#F8FAFC', fontSize: 11 }}>
                Vehicle ID: {result.vehicle_id}
              </div>
              <div className="mono text-cyan" style={{ fontSize: 11 }}>
                Issued Pseudonym: {result.anonymous_id}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                * Symmetric secret credential generated & protected in TA registry.
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              Vehicle Identifier (VID):
            </label>
            <input
              type="text"
              placeholder="e.g. V022"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="input-control mono"
              style={{ width: '100%' }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                Initial Entry RSU:
              </label>
              <select
                value={initialRsu}
                onChange={(e) => setInitialRsu(e.target.value)}
                className="select-control mono"
                style={{ width: '100%' }}
              >
                <option value="RSU-01">RSU-01 (West)</option>
                <option value="RSU-02">RSU-02 (Central)</option>
                <option value="RSU-03">RSU-03 (Corridor)</option>
                <option value="RSU-04">RSU-04 (East)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                Initial Speed (km/h):
              </label>
              <input
                type="number"
                min="20"
                max="140"
                value={speed}
                onChange={(e) => setSpeed(e.target.value)}
                className="input-control mono"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            The Trusted Authority (TA) maps the real vehicle identifier to a post-quantum pseudorandom
            Anonymous ID (PID) via HMAC-SHA256, guaranteeing location and trajectory privacy across V2X channels.
          </div>

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 12,
              marginTop: 10,
              paddingTop: 16,
              borderTop: '1px solid var(--border-subtle)'
            }}
          >
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              <Car size={14} />
              <span>{loading ? 'Registering...' : 'Register Vehicle'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
