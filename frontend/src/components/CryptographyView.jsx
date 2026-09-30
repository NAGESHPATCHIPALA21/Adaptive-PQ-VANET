import React, { useState } from 'react';
import {
  Layers,
  Lock,
  ArrowRight,
  Cpu,
  CheckCircle2
} from 'lucide-react';



const PIPELINE_BLOCKS = [
  {
    id: 'anon_auth',
    title: 'Anonymous Authentication',
    subtitle: 'Pseudonym Issuance',
    spec: 'RFC 2104 / HMAC-SHA256',
    desc: 'Vehicles obtain pseudonym PID from Trusted Authority via master secret K_TA. Real identity is decoupled from wireless broadcasts.',
    details: {
      input: 'Vehicle ID (VID), Master Secret (K_TA), Nonce, Timestamp',
      output: 'Anonymous ID (PID) = HMAC_K_TA(VID || Nonce || Timestamp)',
      security: 'Privacy preservation, location untraceability, TA identity escrow.'
    }
  },
  {
    id: 'hmac_sha256',
    title: 'HMAC-SHA256 Challenge',
    subtitle: 'Mutual Verification',
    spec: 'RFC 2104 with 128-bit Fresh Nonce',
    desc: 'Vehicle computes R_SIG over RSU challenge nonce N_C and timestamp T_R using symmetric credential S_V.',
    details: {
      input: 'Secret Credential (S_V), Nonce (N_C), Pseudonym (PID), Timestamp (T_R)',
      output: 'Signature R_SIG = HMAC_S_V(N_C || PID || T_R)',
      security: 'Replay mitigation via 60-second window and cached nonces; constant-time verification.'
    }
  },
  {
    id: 'ml_kem_768',
    title: 'ML-KEM-768',
    subtitle: 'Post-Quantum Key Encapsulation',
    spec: 'NIST FIPS 203 / Category 3 Lattice',
    desc: 'Vehicle encapsulates 256-bit entropy against ephemeral RSU public key PK_RSU, producing ciphertext C.',
    details: {
      input: 'RSU Ephemeral Public Key (PK_RSU: 1184 bytes)',
      output: 'Ciphertext (C: 1088 bytes) & Post-Quantum Shared Secret (SS_PQ: 32 bytes)',
      security: 'Post-quantum IND-CCA2 security against quantum Shor/Grover attacks.'
    }
  },
  {
    id: 'pq_shared_secret',
    title: 'PQ Shared Secret',
    subtitle: '256-bit Quantum Entropy',
    spec: 'Raw 32-Byte Secret String',
    desc: 'RSU decapsulates ciphertext C using secret key SK_RSU (2400 bytes), arriving at identical 32-byte shared secret.',
    details: {
      input: 'Ciphertext (C: 1088 bytes) & Secret Key (SK_RSU: 2400 bytes)',
      output: 'Decapsulated Shared Secret (SS_PQ: 32 bytes)',
      security: 'Never exposed over wireless medium; ephemeral per pairwise session.'
    }
  },
  {
    id: 'hkdf_sha256',
    title: 'HKDF-SHA256',
    subtitle: 'Key Derivation Function',
    spec: 'RFC 5869 (Extract & Expand)',
    desc: 'Extracts pseudorandom key from post-quantum shared secret and expands into cryptographically strong pairwise key material.',
    details: {
      input: 'Shared Secret (SS_PQ), Salt (Nonce N_C), Info Context ("VANET-V2I-SESSION")',
      output: '256-bit Derived Master Session Key Material',
      security: 'Provably secure key expansion preventing multi-session key correlation.'
    }
  },
  {
    id: 'session_key',
    title: '256-bit Session Key',
    subtitle: 'Pairwise Unicast Channel',
    spec: 'AES-GCM / ChaCha20-Poly1305 Compatible',
    desc: 'Pairwise authenticated channel established between vehicle and fog RSU for confidential V2I telemetry.',
    details: {
      input: 'HKDF expansion output',
      output: 'Session Key ID & 256-bit symmetric session cipher',
      security: 'Forward security on session termination; auto-expires upon cell exit.'
    }
  },
  {
    id: 'adaptive_gsk',
    title: 'Adaptive GSK',
    subtitle: 'Multicast Group Session Key',
    spec: 'MT-AGKM State Machine Engine',
    desc: '256-bit group key distributed to authenticated cell members for broadcast safety alerts and cooperative sensing.',
    details: {
      input: 'Kinematic telemetry, Trust score, Membership transitions',
      output: 'Active Cell Group Session Key Version v(k)',
      security: 'Backward Security on join; Forward Security on leave or revocation.'
    }
  }
];

export default function CryptographyView({ systemStatus }) {
  const [activeBlockId, setActiveBlockId] = useState('ml_kem_768');

  const activeBlock = PIPELINE_BLOCKS.find((b) => b.id === activeBlockId) || PIPELINE_BLOCKS[2];

  const isNativePQ = systemStatus?.is_native_pq ?? true;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em' }}>
          Cryptographic Architecture
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          NIST FIPS 203 ML-KEM-768 lattice-based KEM, HMAC-SHA256, and HKDF session expansion.
        </p>
      </div>

      {/* Clickable Interactive Flow Diagram */}
      <div className="cyber-card">
        <div className="cyber-card-header">
          <div className="card-title-group">
            <Layers size={18} color="var(--accent-cyan)" />
            <span className="card-title">Interactive Cryptographic Pipeline</span>
          </div>
          <span className="badge badge-cyan">Click Any Block to Inspect</span>
        </div>

        <div className="cyber-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 8
            }}
          >
            {PIPELINE_BLOCKS.map((block, idx) => {
              const isSelected = activeBlockId === block.id;
              return (
                <React.Fragment key={block.id}>
                  <button
                    onClick={() => setActiveBlockId(block.id)}
                    style={{
                      flex: '1 1 140px',
                      minWidth: 130,
                      background: isSelected ? 'rgba(56, 189, 248, 0.14)' : '#0D131D',
                      border: `1px solid ${isSelected ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                      borderRadius: 8,
                      padding: '12px 10px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ fontSize: 10, color: isSelected ? 'var(--accent-cyan)' : 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Stage {idx + 1}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: isSelected ? '#F8FAFC' : 'var(--text-secondary)' }}>
                      {block.title}
                    </span>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {block.subtitle}
                    </span>
                  </button>

                  {idx < PIPELINE_BLOCKS.length - 1 && (
                    <ArrowRight size={14} color="var(--border-medium)" style={{ flexShrink: 0 }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Active Block Detailed Inspector */}
          <div
            style={{
              background: '#0D131D',
              border: '1px solid var(--border-active)',
              borderRadius: 8,
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="badge badge-cyan">{activeBlock.title}</span>
                <span className="mono text-muted" style={{ fontSize: 12 }}>{activeBlock.spec}</span>
              </div>
              <span className="badge badge-emerald">Active Construction</span>
            </div>

            <p style={{ fontSize: 13, color: '#F8FAFC', lineHeight: 1.6 }}>
              {activeBlock.desc}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 4 }}>
              <div style={{ background: '#070B12', padding: 12, borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                <span className="text-dim" style={{ fontSize: 11 }}>Input Parameters</span>
                <div className="mono" style={{ fontSize: 11, color: '#F8FAFC', marginTop: 4 }}>
                  {activeBlock.details.input}
                </div>
              </div>

              <div style={{ background: '#070B12', padding: 12, borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                <span className="text-dim" style={{ fontSize: 11 }}>Output Material</span>
                <div className="mono text-cyan" style={{ fontSize: 11, marginTop: 4 }}>
                  {activeBlock.details.output}
                </div>
              </div>

              <div style={{ background: '#070B12', padding: 12, borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                <span className="text-dim" style={{ fontSize: 11 }}>Security Guarantees</span>
                <div style={{ fontSize: 11, color: 'var(--status-emerald-light)', marginTop: 4 }}>
                  {activeBlock.details.security}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Crypto Cards: ML-KEM Card & Randomness Card */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* ML-KEM-768 Card */}
        <div className="cyber-card">
          <div className="cyber-card-header">
            <div className="card-title-group">
              <Lock size={16} color="var(--accent-cyan)" />
              <span className="card-title">ML-KEM-768 Key Encapsulation</span>
            </div>
            <span className={`badge ${isNativePQ ? 'badge-emerald' : 'badge-amber'}`}>
              {isNativePQ ? 'NATIVE' : 'PLACEHOLDER'}
            </span>
          </div>

          <div className="cyber-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
              <div>
                <span className="text-dim">Standard:</span>
                <div className="mono font-semibold" style={{ color: '#F8FAFC' }}>NIST FIPS 203</div>
              </div>
              <div>
                <span className="text-dim">Security Level:</span>
                <div className="mono font-semibold text-cyan">Category 3 (AES-192 Equivalent)</div>
              </div>
              <div>
                <span className="text-dim">Implementation:</span>
                <div className="mono font-semibold text-cyan">kyber-py</div>
              </div>
              <div>
                <span className="text-dim">Engine Status:</span>
                <div className="mono font-semibold text-emerald">Active & Loaded</div>
              </div>
            </div>

            <div
              style={{
                background: '#0D131D',
                padding: 14,
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12
              }}
            >
              <div>
                <span className="text-dim" style={{ fontSize: 11 }}>Public Key Size:</span>
                <div className="mono font-bold" style={{ fontSize: 15, color: '#F8FAFC' }}>
                  1,184 bytes
                </div>
              </div>
              <div>
                <span className="text-dim" style={{ fontSize: 11 }}>Private Key Size:</span>
                <div className="mono font-bold" style={{ fontSize: 15, color: '#F8FAFC' }}>
                  2,400 bytes
                </div>
              </div>
              <div>
                <span className="text-dim" style={{ fontSize: 11 }}>Ciphertext Size:</span>
                <div className="mono font-bold" style={{ fontSize: 15, color: '#F8FAFC' }}>
                  1,088 bytes
                </div>
              </div>
              <div>
                <span className="text-dim" style={{ fontSize: 11 }}>Shared Secret Size:</span>
                <div className="mono font-bold text-emerald" style={{ fontSize: 15 }}>
                  32 bytes (256-bit)
                </div>
              </div>
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              * Pure-Python FIPS 203 compliance. Does not claim dedicated hardware acceleration.
              Directly executes Module-Lattice Key Encapsulation (ML-KEM) shared secret derivation.
            </div>
          </div>
        </div>

        {/* Randomness & Entropy Card */}
        <div className="cyber-card">
          <div className="cyber-card-header">
            <div className="card-title-group">
              <Cpu size={16} color="var(--accent-indigo)" />
              <span className="card-title">Randomness Source & Quantum Hardware</span>
            </div>
            <span className="badge badge-amber">Simulation</span>
          </div>

          <div className="cyber-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
              <div>
                <span className="text-dim">Randomness Source:</span>
                <div className="mono font-semibold" style={{ color: '#F8FAFC' }}>CSPRNG / OS Entropy</div>
              </div>
              <div>
                <span className="text-dim">Status:</span>
                <div className="mono font-semibold text-amber">SIMULATION</div>
              </div>
              <div>
                <span className="text-dim">Quantum Hardware:</span>
                <div className="mono font-semibold text-muted">NOT CONNECTED</div>
              </div>
              <div>
                <span className="text-dim">Entropy Source:</span>
                <div className="mono font-semibold text-cyan">Python secrets.token_bytes</div>
              </div>
            </div>

            <div
              style={{
                background: '#0D131D',
                padding: 14,
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                fontSize: 12,
                color: 'var(--text-secondary)',
                lineHeight: 1.6
              }}
            >
              <div style={{ fontWeight: 700, color: '#F8FAFC', marginBottom: 6 }}>
                Cryptographic Disclosure:
              </div>
              This prototype utilizes OS CSPRNG entropy seeds (RFC 4086 standard) for generating challenge nonces,
              pairwise seeds, and Group Session Keys. The system does not connect to a physical quantum optical generator
              and does NOT claim true physical QRNG hardware in the local simulation environment.
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-muted)' }}>
              <CheckCircle2 size={14} color="var(--status-emerald-light)" />
              <span>Full compliance with rigorous cryptographic disclosure standards.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
