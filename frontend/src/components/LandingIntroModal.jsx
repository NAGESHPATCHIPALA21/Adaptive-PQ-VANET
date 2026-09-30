import React from 'react';
import { Cpu, ArrowRight, X, Radio, Lock } from 'lucide-react';


export default function LandingIntroModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: 680, position: 'relative' }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className="btn-icon"
          style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}
          title="Close dialog"
        >
          <X size={16} />
        </button>

        {/* Modal Header */}
        <div
          style={{
            padding: '36px 36px 24px',
            background: 'linear-gradient(180deg, rgba(17, 25, 39, 0.95) 0%, rgba(13, 19, 29, 0.8) 100%)',
            borderBottom: '1px solid var(--border-subtle)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Subtle background glow */}
          <div
            style={{
              position: 'absolute',
              top: -60,
              right: -60,
              width: 180,
              height: 180,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%)',
              pointerEvents: 'none'
            }}
          />

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span className="badge badge-cyan">Platform Briefing</span>
            <span className="badge badge-indigo">NIST FIPS 203 ML-KEM-768</span>
          </div>

          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: '#F8FAFC',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              marginBottom: 8
            }}
          >
            Adaptive PQ-VANET
          </h1>

          <p
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--accent-cyan)',
              marginBottom: 12
            }}
          >
            Post-Quantum Security for Intelligent Vehicular Networks
          </p>

          <p
            style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              lineHeight: 1.6
            }}
          >
            Adaptive authentication, trust-aware mobility management and group-key security
            for Vehicle–Fog–Cloud architectures.
          </p>
        </div>

        {/* Core Capabilities */}
        <div style={{ padding: '24px 36px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            <div
              style={{
                background: 'rgba(17, 25, 39, 0.6)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                padding: 14
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Lock size={16} color="var(--accent-cyan)" />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#F8FAFC' }}>Post-Quantum KEM</span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                ML-KEM-768 lattice-based encapsulation paired with HKDF-SHA256 pairwise sessions.
              </p>
            </div>

            <div
              style={{
                background: 'rgba(17, 25, 39, 0.6)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                padding: 14
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Cpu size={16} color="var(--status-emerald-light)" />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#F8FAFC' }}>MT-AGKM Engine</span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Mobility-Trust-Aware decisions (KEEP, PREPARE, UPDATE) cutting 99.1% of unnecessary re-key operations.
              </p>
            </div>

            <div
              style={{
                background: 'rgba(17, 25, 39, 0.6)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                padding: 14
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Radio size={16} color="var(--accent-violet)" />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#F8FAFC' }}>Edge Fog Cells</span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Hierarchical Vehicle → Fog/RSU → Cloud/TA telemetry with continuous replay mitigation.
              </p>
            </div>
          </div>

          <div
            style={{
              background: 'rgba(56, 189, 248, 0.05)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              borderRadius: 8,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Operational mode: <span className="mono text-cyan" style={{ fontWeight: 600 }}>Multi-RSU Highway Simulation</span>
            </div>
            <span className="badge badge-emerald">Ready for Evaluation</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 36px 24px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 12
          }}
        >
          <button
            onClick={onClose}
            className="btn btn-primary"
            style={{ padding: '10px 24px', fontSize: 14 }}
          >
            <span>Launch Security Console</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
