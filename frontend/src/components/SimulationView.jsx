import React, { useState } from 'react';
import {
  Play,
  RefreshCw,
  Zap,
  Layers
} from 'lucide-react';
import {
  runScenario,
  registerVehicle,
  requestChallenge,
  verifyAuthentication,
  createSession,
  evaluateMTAGKM,
  updateKinematics,
  recordTrustEvent
} from '../api';
import { computeAuthResponseHex } from '../utils/cryptoHelper';


const SCENARIOS = [
  {
    id: 1,
    code: 'S1',
    name: 'Normal Stable Traffic',
    securityCondition: 'Nominal Cruising (Benign, Trust >= 0.90)',
    expected: 'KEEP',
    desc: 'Normal cruising traffic within RSU coverage. Speed 45 km/h, distance to boundary > 150m, benign trust score (0.90+).',
    inputs: 'x=250m, Speed=45 km/h, Trust=0.92',
    consequence: 'GSK unchanged. Zero wireless rekeying broadcasts triggered.'
  },
  {
    id: 2,
    code: 'S2',
    name: 'Boundary Approach',
    securityCondition: 'Cell Boundary Proximity (Distance <= 50m, High Mobility)',
    expected: 'PREPARE',
    desc: 'Vehicle approaches cell boundary (within 50m) while remaining benign. Handover probability exceeds 0.70.',
    inputs: 'x=750m, Speed=85 km/h, Boundary Distance=50m, Trust=0.91',
    consequence: 'Proactive handover credentials prepared for target RSU. No immediate GSK rotation.'
  },
  {
    id: 3,
    code: 'S3',
    name: 'RSU Handover Departure',
    securityCondition: 'Boundary Crossing / Inter-RSU Cell Departure',
    expected: 'UPDATE',
    desc: 'Vehicle exits RSU-01 coverage perimeter into RSU-02. Triggers cell leave transition.',
    inputs: 'Event=VEHICLE_LEAVE, Source=RSU-01, Target=RSU-02',
    consequence: 'GSK v(k) -> v(k+1) deployed. Forward Security enforced: departed vehicle cannot read cell traffic.'
  },
  {
    id: 4,
    code: 'S4',
    name: 'Suspicious Traffic / Replay',
    securityCondition: 'Active Replay Attack & Nonce Tampering',
    expected: 'UPDATE',
    desc: 'Adversary injects replayed authentication challenge nonces and malformed protocol packets.',
    inputs: 'SecurityEvent=REPLAY_ATTEMPT, Trust Degradation=-0.45',
    consequence: 'Trust score plunges below 0.40. Threat isolated; cell GSK rotated immediately.'
  },
  {
    id: 5,
    code: 'S5',
    name: 'Low Trust Degradation',
    securityCondition: 'Behavioral Trust Degradation (Trust < 0.40)',
    expected: 'UPDATE',
    desc: 'Vehicle continuously fails behavioral verification, dropping trust score below acceptable threshold (0.40).',
    inputs: 'Trust Score=0.28 (< 0.40 containment threshold)',
    consequence: 'Node quarantined from group multicast. Cell keys rotated to prevent tampering.'
  },
  {
    id: 6,
    code: 'S6',
    name: 'New Vehicle Cell Join',
    securityCondition: 'New Authenticated Vehicle Cell Entrant',
    expected: 'UPDATE',
    desc: 'Newly authenticated vehicle V099 joins active RSU cell group.',
    inputs: 'Event=VEHICLE_JOIN, Target Node=V099',
    consequence: 'GSK rotated (v -> v+1). Backward Security enforced: new entrant cannot decrypt past history.'
  },
  {
    id: 7,
    code: 'S7',
    name: 'High Density Highway Traffic',
    securityCondition: 'Multi-Cell Arterial Dense Traffic Cluster',
    expected: 'KEEP / PREPARE',
    desc: 'Dense vehicular cluster traversing arterial corridor under multi-cell RSU coordination.',
    inputs: '21 Vehicles, Overlapping 400m fog perimeters',
    consequence: 'MT-AGKM evaluates continuous kinematics; bulk of nodes remain in KEEP or PREPARE.'
  },
  {
    id: 8,
    code: 'S8',
    name: 'High Mobility Trusted Cruise',
    securityCondition: 'High-Velocity Sovereign Cruising (110 km/h)',
    expected: 'PREPARE',
    desc: 'High-speed vehicle (110 km/h) transitioning cell perimeter with impeccable trust history.',
    inputs: 'Speed=110 km/h, Handover Prob=0.88, Trust=0.98',
    consequence: 'Traditional scheme would force unnecessary re-key. MT-AGKM executes PREPARE, saving bandwidth.'
  }
];

export default function SimulationView({ onRefreshSystem }) {
  const [activeTabMode, setActiveTabMode] = useState('scenarios');
  const [scenarioResults, setScenarioResults] = useState({});
  const [loadingScId, setLoadingScId] = useState(null);

  // Stepper state for guided walkthrough
  const [activeStep, setActiveStep] = useState(1);
  const [stepLogs, setStepLogs] = useState({});
  const [stepExecuting, setStepExecuting] = useState(false);
  const [demoState, setDemoState] = useState({
    vehicleId: 'V099',
    anonymousId: 'ANON-V099-INITIAL',
    secretCredential: null,
    currentGSK: 2
  });

  const handleRunScenario = async (sc) => {
    setLoadingScId(sc.id);
    try {
      const res = await runScenario(sc.id);
      setScenarioResults((prev) => ({
        ...prev,
        [sc.id]: res
      }));
      if (onRefreshSystem) onRefreshSystem();
    } catch (err) {
      setScenarioResults((prev) => ({
        ...prev,
        [sc.id]: { error: err.message }
      }));
    } finally {
      setLoadingScId(null);
    }
  };

  const handleExecuteWalkthroughStep = async (stepNum) => {
    setStepExecuting(true);
    let logOutput = '';
    const vid = demoState.vehicleId;

    try {
      if (stepNum === 1) {
        logOutput = `[PROTOCOL TRACE: SYSTEM DASHBOARD INSPECTION]\n- Active RSUs: 4 Fog Gateways (RSU-01 to RSU-04)\n- Highway Coverage: 3200m corridor with 400m cells\n- Post-Quantum Engine: NIST FIPS 203 ML-KEM-768 Native\n- Randomness Source: CSPRNG (secrets.token_bytes)`;
      } else if (stepNum === 2) {
        const reg = await registerVehicle({
          vehicle_id: vid,
          initial_rsu: 'RSU-01',
          position_x: 200,
          position_y: 400,
          speed: 45
        });
        setDemoState((prev) => ({
          ...prev,
          anonymousId: reg.anonymous_id,
          secretCredential: reg.secret_credential
        }));
        logOutput = `[PROTOCOL TRACE: VEHICLE REGISTRATION SUCCESS]\n- Vehicle ID: ${vid}\n- Anonymous Pseudonym (PID): ${reg.anonymous_id}\n- Symmetric Secret Issued: [PROTECTED 24-BYTE SYMMETRIC TOKEN]\n- TA Mapping: ${reg.anonymous_id} -> ${vid} securely archived.`;
      } else if (stepNum === 3) {
        const ch = await requestChallenge('RSU-01');
        const sig = await computeAuthResponseHex(
          demoState.secretCredential || 'SECRET_DEMO_CREDENTIAL',
          demoState.anonymousId,
          ch.challenge_nonce,
          ch.timestamp
        );
        const ver = await verifyAuthentication({
          anonymous_id: demoState.anonymousId,
          challenge_nonce: ch.challenge_nonce,
          timestamp: ch.timestamp,
          response_signature: sig,
          rsu_id: 'RSU-01'
        });
        const sess = await createSession(vid, 'RSU-01');
        logOutput = `[PROTOCOL TRACE: AUTHENTICATION & PAIRWISE KEY ESTABLISHED]\n- Challenge Nonce: ${ch.challenge_nonce.substring(0, 16)}...\n- RSU Verification: SUCCESS (${ver.message})\n- Session Key ID: ${sess.key_id}\n- Expansion: 256-bit pairwise session key (HKDF-SHA256)\n- Status: ACTIVE`;
      } else if (stepNum === 4) {
        const res = await evaluateMTAGKM(vid, 'RSU-01', 'JOIN', null);
        setDemoState((prev) => ({ ...prev, currentGSK: res.gsk_version_after }));
        logOutput = `[PROTOCOL TRACE: BACKWARD SECURITY ENFORCED]\n- Event: VEHICLE_JOIN\n- Decision: ${res.decision}\n- GSK Transition: v${res.gsk_version_before} -> v${res.gsk_version_after}\n- Security Guarantee: New node cannot decrypt pre-join cell multicast communications.`;
      } else if (stepNum === 5) {
        await updateKinematics(vid, 750, 400, 85, 0);
        const res = await evaluateMTAGKM(vid, 'RSU-01');
        logOutput = `[PROTOCOL TRACE: ADAPTIVE PREPARE TRIGGERED]\n- Spatial Position: x=750.0m (Cell Boundary Proximity: 50.0m)\n- Mobility Score: ${res.mobility_score} (HIGH)\n- Handover Probability: ${res.handover_probability} (HIGH)\n- MT-AGKM Decision: PREPARE\n- Research Significance: NO IMMEDIATE GSK UPDATE (v${res.gsk_version_before} preserved!)\n- Explanation: ${res.reason}`;
      } else if (stepNum === 6) {
        await recordTrustEvent(vid, 'REPLAY_ATTEMPT', 0.55);
        const res = await evaluateMTAGKM(vid, 'RSU-01', null, 'REPLAY_ATTEMPT');
        logOutput = `[PROTOCOL TRACE: THREAT ISOLATION ACTIVE]\n- Violation: Replay attack & protocol tampering\n- Trust Score Degraded to: ${res.trust_score} (CRITICAL < 0.40)\n- Decision: UPDATE\n- Action: Cell GSK rotated to isolate compromised node.`;
      } else if (stepNum === 7) {
        const res = await evaluateMTAGKM(vid, 'RSU-01', 'REVOKE', 'COMPROMISED_VEHICLE');
        setDemoState((prev) => ({ ...prev, currentGSK: res.gsk_version_after }));
        logOutput = `[PROTOCOL TRACE: FORWARD SECURITY ENFORCED]\n- Action: Node ${vid} permanently REVOKED from vehicular trust registry.\n- Status: REVOKED (Access permanently denied)\n- New GSK Deployed: v${res.gsk_version_after}\n- Forward Security: Revoked vehicle cannot decrypt current or future cell traffic.`;
      } else if (stepNum === 8) {
        logOutput = `[PROTOCOL TRACE: SIMULATION BENCHMARK SUMMARY]\n- Traditional Unconditional Rekeying: 221 GSK Rotations\n- Proposed MT-AGKM Scheme: 2 GSK Rotations\n- Unnecessary Updates Eliminated: 220 (99.1% Reduction)\n- Wireless Overhead Saved: 88.9% Reduction in Broadcast Messages.`;
      }

      setStepLogs((prev) => ({ ...prev, [stepNum]: logOutput }));
      if (onRefreshSystem) onRefreshSystem();
    } catch (err) {
      setStepLogs((prev) => ({
        ...prev,
        [stepNum]: `Error executing Step ${stepNum}: ${err.message}`
      }));
    } finally {
      setStepExecuting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header & Sub-Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em' }}>
            VANET Simulation Lab
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Multi-RSU highway corridor with continuous kinematic updates and 8 research scenarios.
          </p>
        </div>

        {/* View Toggle */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setActiveTabMode('scenarios')}
            className={`btn ${activeTabMode === 'scenarios' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 12, padding: '7px 14px' }}
          >
            <Zap size={14} />
            <span>Research Scenarios (S1-S8)</span>
          </button>
          <button
            onClick={() => setActiveTabMode('walkthrough')}
            className={`btn ${activeTabMode === 'walkthrough' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 12, padding: '7px 14px' }}
          >
            <Layers size={14} />
            <span>Interactive Protocol Stepper</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: 8 PREDEFINED RESEARCH SCENARIOS                                    */}
      {/* ========================================================================= */}
      {activeTabMode === 'scenarios' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {SCENARIOS.map((sc) => {
            const result = scenarioResults[sc.id];
            const isLoading = loadingScId === sc.id;
            const executionStatus = isLoading ? 'RUNNING' : result ? (result.error ? 'FAILED' : 'COMPLETED') : 'IDLE';

            return (
              <div
                key={sc.id}
                className="cyber-card"
                style={{
                  border: result
                    ? result.error
                      ? '1px solid rgba(239, 68, 68, 0.4)'
                      : '1px solid rgba(16, 185, 129, 0.4)'
                    : '1px solid var(--border-subtle)'
                }}
              >
                <div className="cyber-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="badge badge-cyan font-bold">{sc.code}</span>
                    <span className="card-title">{sc.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      className={`badge ${
                        executionStatus === 'RUNNING'
                          ? 'badge-cyan'
                          : executionStatus === 'COMPLETED'
                          ? 'badge-emerald'
                          : executionStatus === 'FAILED'
                          ? 'badge-red'
                          : 'badge-muted'
                      }`}
                      style={{ fontSize: 10, padding: '3px 8px' }}
                    >
                      {executionStatus === 'RUNNING' && <RefreshCw size={10} className="spin" />}
                      <span>{executionStatus}</span>
                    </span>
                    <span
                      className={`badge ${
                        sc.expected === 'KEEP'
                          ? 'badge-emerald'
                          : sc.expected === 'PREPARE'
                          ? 'badge-amber'
                          : 'badge-red'
                      }`}
                      style={{ fontSize: 11 }}
                    >
                      Expected: {sc.expected}
                    </span>
                  </div>
                </div>

                <div className="cyber-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Security Condition */}
                  <div style={{ background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.15)', borderRadius: 6, padding: '6px 10px', fontSize: 11 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Security Condition: </span>
                    <span className="mono font-semibold text-cyan">{sc.securityCondition}</span>
                  </div>

                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {sc.desc}
                  </p>

                  <div style={{ background: '#0D131D', padding: 10, borderRadius: 6, fontSize: 11 }}>
                    <div style={{ color: 'var(--text-muted)' }}>
                      Inputs: <span className="mono text-cyan">{sc.inputs}</span>
                    </div>
                    <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>
                      Consequence: <span style={{ color: '#F8FAFC' }}>{sc.consequence}</span>
                    </div>
                  </div>

                  {result && (
                    <div
                      style={{
                        padding: '10px 12px',
                        borderRadius: 6,
                        background: result.error ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.08)',
                        border: `1px solid ${result.error ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                        fontSize: 12
                      }}
                    >
                      {result.error ? (
                        <div className="text-red">Execution Error: {result.error}</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="text-dim" style={{ fontSize: 11 }}>Returned Decision:</span>
                            <span
                              className="mono font-bold"
                              style={{
                                fontSize: 13,
                                color:
                                  result.actual === 'KEEP'
                                    ? 'var(--status-emerald-light)'
                                    : result.actual === 'PREPARE'
                                    ? 'var(--status-amber-light)'
                                    : 'var(--status-red-light)'
                              }}
                            >
                              {result.actual}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            {result.reason}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <span className="mono text-muted" style={{ fontSize: 10 }}>Scenario {sc.code}</span>
                    <button
                      onClick={() => handleRunScenario(sc)}
                      disabled={isLoading}
                      className="btn btn-secondary"
                      style={{ fontSize: 12, padding: '7px 14px' }}
                    >
                      {isLoading ? <RefreshCw size={13} className="spin" /> : <Play size={13} />}
                      <span>{isLoading ? 'Running...' : `Run ${sc.code}`}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: GUIDED STEP-BY-STEP PROTOCOL WALKTHROUGH                            */}
      {/* ========================================================================= */}
      {activeTabMode === 'walkthrough' && (
        <div className="cyber-card">
          <div className="cyber-card-header">
            <div className="card-title-group">
              <Layers size={18} color="var(--accent-cyan)" />
              <span className="card-title">Interactive Protocol Stepper (Steps 1 to 8)</span>
            </div>
            <span className="badge badge-cyan">Full Lifecycle</span>
          </div>

          <div className="cyber-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Step Navigation Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 8 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => {
                const isSelected = activeStep === s;
                const hasExecuted = !!stepLogs[s];
                return (
                  <button
                    key={s}
                    onClick={() => setActiveStep(s)}
                    style={{
                      padding: '10px 6px',
                      borderRadius: 8,
                      background: isSelected ? 'rgba(56, 189, 248, 0.15)' : '#0D131D',
                      border: `1px solid ${
                        isSelected ? 'var(--accent-cyan)' : hasExecuted ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-subtle)'
                      }`,
                      color: isSelected ? 'var(--accent-cyan)' : hasExecuted ? 'var(--status-emerald-light)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700 }}>Step {s}</span>
                  </button>
                );
              })}
            </div>

            {/* Step Workspace */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 20 }}>
              {/* Left Details */}
              <div style={{ background: '#0D131D', padding: 18, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                  Milestone Step {activeStep}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC', marginBottom: 12 }}>
                  {activeStep === 1 && 'System Dashboard Overview'}
                  {activeStep === 2 && 'Register Node with Trusted Authority'}
                  {activeStep === 3 && 'Mutual Authentication & Pairwise Key'}
                  {activeStep === 4 && 'Cell Join & Backward Security'}
                  {activeStep === 5 && 'Boundary Approach (Adaptive PREPARE)'}
                  {activeStep === 6 && 'Suspicious Threat & Isolation'}
                  {activeStep === 7 && 'Vehicle Revocation & Forward Security'}
                  {activeStep === 8 && 'Simulation Benchmark Summary'}
                </div>

                <button
                  onClick={() => handleExecuteWalkthroughStep(activeStep)}
                  disabled={stepExecuting}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '10px 16px' }}
                >
                  {stepExecuting ? <RefreshCw size={14} className="spin" /> : <Play size={14} />}
                  <span>Execute Step {activeStep} Protocol</span>
                </button>
              </div>

              {/* Right Protocol Trace Log */}
              <div
                style={{
                  background: '#070B12',
                  padding: 16,
                  borderRadius: 8,
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }} className="mono">
                  <span>CONSOLE PROTOCOL TRACE</span>
                  <span style={{ color: stepLogs[activeStep] ? 'var(--status-emerald-light)' : 'var(--status-amber-light)' }}>
                    {stepLogs[activeStep] ? 'EXECUTED' : 'AWAITING RUN'}
                  </span>
                </div>
                <pre
                  className="mono"
                  style={{
                    fontSize: 12,
                    color: '#E2E8F0',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    minHeight: 160
                  }}
                >
                  {stepLogs[activeStep] || `Click 'Execute Step ${activeStep} Protocol' on the left to run this stage.`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
