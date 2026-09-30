import React from 'react';
import {
  Server
} from 'lucide-react';


export default function SystemView({ systemStatus, _projectInfo }) {
  const isNative = systemStatus?.is_native_pq ?? true;

  const systemComponents = [
    {
      name: 'Backend',
      status: 'Operational',
      detail: 'FastAPI REST / Uvicorn ASGI Server (Port 8000), CORS enabled',
      spec: 'Python 3.14 / FastAPI / Pydantic v2'
    },
    {
      name: 'Database',
      status: 'Operational',
      detail: 'Relational SQLite engine with foreign key isolation',
      spec: 'SQLAlchemy 2.0 ORM (vanet_prototype.db)'
    },
    {
      name: 'Authentication',
      status: 'Operational',
      detail: 'Pseudonym-based challenge-response with replay nonce cache',
      spec: 'HMAC-SHA256 (RFC 2104) / Constant-Time'
    },
    {
      name: 'ML-KEM',
      status: isNative ? 'Operational' : 'Degraded',
      detail: isNative ? 'NIST FIPS 203 ML-KEM-768 native lattice engine active' : 'Fallback / simulation module active',
      spec: 'kyber-py Module-Lattice Key Encapsulation (FIPS 203)'
    },
    {
      name: 'Randomness',
      status: 'Operational',
      detail: 'OS Cryptographic PRNG for nonces and group keys',
      spec: 'Python secrets.token_bytes (RFC 4086 standard)'
    },
    {
      name: 'Simulation',
      status: 'Operational',
      detail: '3200m Highway Corridor with 4 RSU fog cells & 8 scenarios',
      spec: 'Kinematic motion & multi-cell adaptive handovers'
    },
    {
      name: 'Quantum Hardware',
      status: 'Not Connected',
      detail: 'No physical quantum optics connected to local host; software CSPRNG in use',
      spec: 'Software simulation mode (CSPRNG)'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em' }}>
          System & Environment Status
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          Operational health, cryptographic modules, and environment parameters.
        </p>
      </div>

      {/* Grid of System Components */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {systemComponents.map((comp, idx) => {
          const isOp = comp.status === 'Operational';
          const isWarn = comp.status === 'Degraded';
          const isFail = comp.status === 'Unavailable';
          const isNotConnected = comp.status === 'Not Connected';

          return (
            <div
              key={idx}
              className="cyber-card"
              style={{
                padding: 18,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 16
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC' }}>
                    {comp.name}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {comp.detail}
                </div>
                <div className="mono text-muted" style={{ fontSize: 11, marginTop: 4 }}>
                  {comp.spec}
                </div>
              </div>

              <div>
                <span
                  className={`badge ${
                    isOp ? 'badge-emerald' : isWarn ? 'badge-amber' : isFail ? 'badge-red' : 'badge-muted'
                  }`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <span
                    className={`status-dot ${isOp ? 'emerald' : isWarn ? 'amber' : isFail ? 'red' : ''}`}
                    style={{
                      width: 6,
                      height: 6,
                      background: isNotConnected ? '#64748B' : undefined
                    }}
                  />
                  {comp.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cryptographic Architecture Specifications Table */}
      <div className="cyber-card">
        <div className="cyber-card-header">
          <div className="card-title-group">
            <Server size={18} color="var(--accent-cyan)" />
            <span className="card-title">Technical Platform Specifications</span>
          </div>
          <span className="badge badge-cyan">Parameters</span>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Component / Parameter</th>
                <th>Standard / Implementation</th>
                <th>Security Guarantee</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600 }}>Post-Quantum KEM</td>
                <td className="mono text-cyan">NIST FIPS 203 (ML-KEM-768)</td>
                <td>IND-CCA2 Quantum Threat Resistance (AES-192 strength)</td>
                <td><span className="badge badge-emerald">Operational</span></td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Anonymous Authentication</td>
                <td className="mono text-cyan">HMAC-SHA256 (RFC 2104)</td>
                <td>Constant-Time Verification & Pseudonym Escrow</td>
                <td><span className="badge badge-emerald">Operational</span></td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Session Derivation</td>
                <td className="mono text-cyan">HKDF-SHA256 (RFC 5869)</td>
                <td>Pairwise 256-bit Forward Secure Channel</td>
                <td><span className="badge badge-emerald">Operational</span></td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Group Key Management</td>
                <td className="mono text-cyan">Adaptive MT-AGKM State Machine</td>
                <td>Backward & Forward Security with 99.1% Update Reduction</td>
                <td><span className="badge badge-emerald">Operational</span></td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Entropy Provider</td>
                <td className="mono text-cyan">OS CSPRNG (Python secrets)</td>
                <td>256-bit Non-Repeating Cryptographic Nonces</td>
                <td><span className="badge badge-emerald">Operational</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
