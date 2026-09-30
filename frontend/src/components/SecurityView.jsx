import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Zap,
  CheckCircle2,
  ArrowDown,
  RefreshCw
} from 'lucide-react';
import { requestChallenge, verifyAuthentication, createSession } from '../api';
import { computeAuthResponseHex } from '../utils/cryptoHelper';

export default function SecurityView({ vehicles = [], onRefresh }) {
  const [selectedVid, setSelectedVid] = useState(vehicles[0]?.vehicle_id || 'V001');
  const [selectedRsu, setSelectedRsu] = useState('RSU-01');

  // Step Status Machine: 'IDLE' | 'PROCESSING' | 'SUCCESS' | 'FAILED'
  const [step1State, setStep1State] = useState('IDLE');
  const [step2State, setStep2State] = useState('IDLE');
  const [step3State, setStep3State] = useState('IDLE');
  const [step4State, setStep4State] = useState('IDLE');

  const [challengeData, setChallengeData] = useState(null);
  const [responseSig, setResponseSig] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [sessionResult, setSessionResult] = useState(null);

  const [replayState, setReplayState] = useState('IDLE'); // IDLE | PROCESSING | INTERCEPTED | FAILED
  const [replayFeedback, setReplayFeedback] = useState(null);

  const targetVehicle = vehicles.find((v) => v.vehicle_id === selectedVid) || vehicles[0];

  const resetAllSteps = () => {
    setStep1State('IDLE');
    setStep2State('IDLE');
    setStep3State('IDLE');
    setStep4State('IDLE');
    setChallengeData(null);
    setResponseSig(null);
    setVerificationResult(null);
    setSessionResult(null);
    setReplayState('IDLE');
    setReplayFeedback(null);
  };

  // STEP 01: Challenge Request
  const handleRequestChallenge = async () => {
    setStep1State('PROCESSING');
    try {
      const ch = await requestChallenge(selectedRsu);
      setChallengeData(ch);
      setStep1State('SUCCESS');
      // Reset subsequent steps if re-challenging
      setStep2State('IDLE');
      setStep3State('IDLE');
      setStep4State('IDLE');
      setResponseSig(null);
      setVerificationResult(null);
      setSessionResult(null);
    } catch (err) {
      setStep1State('FAILED');
      alert(`Challenge request failed: ${err.message}`);
    }
  };

  // STEP 02: HMAC-SHA256 Response
  const handleComputeResponse = async () => {
    if (!challengeData) return;
    setStep2State('PROCESSING');
    try {
      const secret = 'SECRET_DEMO_CREDENTIAL';
      const sig = await computeAuthResponseHex(
        secret,
        targetVehicle?.anonymous_id || 'ANON-DEFAULT',
        challengeData.challenge_nonce,
        challengeData.timestamp
      );
      setResponseSig(sig);
      setStep2State('SUCCESS');
      setStep3State('IDLE');
      setStep4State('IDLE');
      setVerificationResult(null);
      setSessionResult(null);
    } catch (err) {
      setStep2State('FAILED');
      alert(`HMAC response computation failed: ${err.message}`);
    }
  };

  // STEP 03: RSU Verification
  const handleVerify = async () => {
    if (!challengeData || !responseSig) return;
    setStep3State('PROCESSING');
    try {
      const res = await verifyAuthentication({
        anonymous_id: targetVehicle?.anonymous_id || 'ANON-DEFAULT',
        challenge_nonce: challengeData.challenge_nonce,
        timestamp: challengeData.timestamp,
        response_signature: responseSig,
        rsu_id: selectedRsu
      });
      setVerificationResult(res);
      setStep3State('SUCCESS');
      if (onRefresh) onRefresh();
    } catch (err) {
      setStep3State('FAILED');
      alert(`RSU verification rejected: ${err.message}`);
    }
  };

  // STEP 04: ML-KEM / HKDF Session Establishment
  const handleEstablishSession = async () => {
    setStep4State('PROCESSING');
    try {
      const res = await createSession(targetVehicle.vehicle_id, selectedRsu);
      setSessionResult(res);
      setStep4State('SUCCESS');
      if (onRefresh) onRefresh();
    } catch (err) {
      setStep4State('FAILED');
      alert(`Session key establishment failed: ${err.message}`);
    }
  };

  // Run Complete Automated Workflow
  const handleRunFullWorkflow = async () => {
    resetAllSteps();
    setStep1State('PROCESSING');
    try {
      // 1. Challenge
      const ch = await requestChallenge(selectedRsu);
      setChallengeData(ch);
      setStep1State('SUCCESS');

      // 2. HMAC Compute
      setStep2State('PROCESSING');
      const secret = 'SECRET_DEMO_CREDENTIAL';
      const sig = await computeAuthResponseHex(
        secret,
        targetVehicle?.anonymous_id || 'ANON-DEFAULT',
        ch.challenge_nonce,
        ch.timestamp
      );
      setResponseSig(sig);
      setStep2State('SUCCESS');

      // 3. RSU Verify
      setStep3State('PROCESSING');
      const ver = await verifyAuthentication({
        anonymous_id: targetVehicle?.anonymous_id || 'ANON-DEFAULT',
        challenge_nonce: ch.challenge_nonce,
        timestamp: ch.timestamp,
        response_signature: sig,
        rsu_id: selectedRsu
      });
      setVerificationResult(ver);
      setStep3State('SUCCESS');

      // 4. Session Derivation
      setStep4State('PROCESSING');
      const sess = await createSession(targetVehicle.vehicle_id, selectedRsu);
      setSessionResult(sess);
      setStep4State('SUCCESS');

      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Authentication sequence failed: ${err.message}`);
    }
  };

  // Replay Attack Mitigation Tester
  const handleTestReplayAttack = async () => {
    if (!challengeData || !responseSig) {
      alert('Execute at least Step 1 and Step 2 first to obtain a valid nonce/signature to replay.');
      return;
    }
    setReplayState('PROCESSING');
    setReplayFeedback(null);
    try {
      await verifyAuthentication({
        anonymous_id: targetVehicle?.anonymous_id || 'ANON-DEFAULT',
        challenge_nonce: challengeData.challenge_nonce,
        timestamp: challengeData.timestamp,
        response_signature: responseSig,
        rsu_id: selectedRsu
      });
      setReplayState('FAILED');
      setReplayFeedback('Unexpected: Replayed nonce was accepted. Inspect nonces cache.');
    } catch (err) {
      setReplayState('INTERCEPTED');
      setReplayFeedback(`REPLAY ATTACK INTERCEPTED & MITIGATED: ${err.message}. Duplicate challenge nonce rejected by ${selectedRsu} replay filter. Security audit event dispatched.`);
      if (onRefresh) onRefresh();
    }
  };

  const renderStatusBadge = (state) => {
    if (state === 'PROCESSING') {
      return (
        <span className="badge badge-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <RefreshCw size={10} className="spin" />
          <span>PROCESSING</span>
        </span>
      );
    }
    if (state === 'SUCCESS') {
      return (
        <span className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <CheckCircle2 size={10} />
          <span>SUCCESS</span>
        </span>
      );
    }
    if (state === 'FAILED') {
      return (
        <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <AlertTriangle size={10} />
          <span>FAILED</span>
        </span>
      );
    }
    return <span className="badge badge-muted">IDLE</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em' }}>
          Security & Anonymous Authentication
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          Cryptographic pseudonymity, sequential SOC verification workflow, and replay attack mitigation.
        </p>
      </div>

      {/* Main 2-Column Console */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20 }}>
        {/* Left: Sequential SOC Authentication Workflow */}
        <div className="cyber-card">
          <div className="cyber-card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
            <div className="card-title-group">
              <ShieldCheck size={18} color="var(--accent-cyan)" />
              <span className="card-title">Sequential SOC Authentication Workflow</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleRunFullWorkflow}
                className="btn btn-primary"
                style={{ fontSize: 11, padding: '5px 12px' }}
              >
                <Zap size={13} />
                <span>Run Full Handshake</span>
              </button>
              <button
                onClick={resetAllSteps}
                className="btn btn-secondary"
                style={{ fontSize: 11, padding: '5px 10px' }}
              >
                Reset
              </button>
            </div>
          </div>

          <div className="cyber-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Target Node & RSU Selectors */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Target Node:
                </label>
                <select
                  value={selectedVid}
                  onChange={(e) => {
                    setSelectedVid(e.target.value);
                    resetAllSteps();
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

              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Authenticating Fog RSU:
                </label>
                <select
                  value={selectedRsu}
                  onChange={(e) => {
                    setSelectedRsu(e.target.value);
                    resetAllSteps();
                  }}
                  className="select-control mono"
                  style={{ width: '100%', fontSize: 12 }}
                >
                  <option value="RSU-01">RSU-01 (West)</option>
                  <option value="RSU-02">RSU-02 (Central)</option>
                  <option value="RSU-03">RSU-03 (Corridor)</option>
                  <option value="RSU-04">RSU-04 (East)</option>
                </select>
              </div>
            </div>

            {/* Workflow Step Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* STEP 01 */}
              <div
                style={{
                  background: '#0D131D',
                  border: `1px solid ${step1State === 'SUCCESS' ? 'rgba(16, 185, 129, 0.4)' : step1State === 'PROCESSING' ? 'var(--border-active)' : 'var(--border-subtle)'}`,
                  borderRadius: 8,
                  padding: 14
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="mono font-bold text-cyan" style={{ fontSize: 11 }}>STEP 01</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>
                      Challenge Nonce Request ($N_C$)
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {renderStatusBadge(step1State)}
                    <button
                      onClick={handleRequestChallenge}
                      disabled={step1State === 'PROCESSING'}
                      className="btn btn-secondary"
                      style={{ fontSize: 11, padding: '4px 10px' }}
                    >
                      Request
                    </button>
                  </div>
                </div>

                {challengeData ? (
                  <div className="mono" style={{ fontSize: 11, color: 'var(--accent-cyan)', background: '#070B12', padding: 8, borderRadius: 4 }}>
                    <div>Nonce: {challengeData.challenge_nonce}</div>
                    <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>Timestamp ($T_R$): {challengeData.timestamp}</div>
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Fog RSU generates fresh 128-bit CSPRNG challenge nonce with 60-second expiration window.
                  </div>
                )}
              </div>

              {/* Animated Connector 1 -> 2 */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0' }}>
                <ArrowDown size={14} color={step1State === 'SUCCESS' ? 'var(--accent-cyan)' : 'var(--border-medium)'} />
              </div>

              {/* STEP 02 */}
              <div
                style={{
                  background: '#0D131D',
                  border: `1px solid ${step2State === 'SUCCESS' ? 'rgba(16, 185, 129, 0.4)' : step2State === 'PROCESSING' ? 'var(--border-active)' : 'var(--border-subtle)'}`,
                  borderRadius: 8,
                  padding: 14
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="mono font-bold text-cyan" style={{ fontSize: 11 }}>STEP 02</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>
                      HMAC-SHA256 Response Computation
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {renderStatusBadge(step2State)}
                    <button
                      onClick={handleComputeResponse}
                      disabled={step1State !== 'SUCCESS' || step2State === 'PROCESSING'}
                      className="btn btn-secondary"
                      style={{ fontSize: 11, padding: '4px 10px' }}
                    >
                      Compute
                    </button>
                  </div>
                </div>

                {responseSig ? (
                  <div className="mono text-emerald" style={{ fontSize: 11, background: '#070B12', padding: 8, borderRadius: 4, wordBreak: 'break-all' }}>
                    Signature: {responseSig}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    $R_{'{'}SIG{'}'} = \text{'{'}HMAC{'}'}_{'{'}S_V{'}'}(N_C \parallel PID \parallel T_R)$ calculated using client Web Crypto API.
                  </div>
                )}
              </div>

              {/* Animated Connector 2 -> 3 */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0' }}>
                <ArrowDown size={14} color={step2State === 'SUCCESS' ? 'var(--accent-cyan)' : 'var(--border-medium)'} />
              </div>

              {/* STEP 03 */}
              <div
                style={{
                  background: '#0D131D',
                  border: `1px solid ${step3State === 'SUCCESS' ? 'rgba(16, 185, 129, 0.4)' : step3State === 'PROCESSING' ? 'var(--border-active)' : 'var(--border-subtle)'}`,
                  borderRadius: 8,
                  padding: 14
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="mono font-bold text-cyan" style={{ fontSize: 11 }}>STEP 03</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>
                      RSU Verification & Freshness Check
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {renderStatusBadge(step3State)}
                    <button
                      onClick={handleVerify}
                      disabled={step2State !== 'SUCCESS' || step3State === 'PROCESSING'}
                      className="btn btn-secondary"
                      style={{ fontSize: 11, padding: '4px 10px' }}
                    >
                      Verify
                    </button>
                  </div>
                </div>

                {verificationResult ? (
                  <div className="mono text-emerald" style={{ fontSize: 11, background: '#070B12', padding: 8, borderRadius: 4 }}>
                    VERIFICATION SUCCESS: {verificationResult.message}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Constant-time comparison with freshness verification ($|T_{'{'}now{'}'} - T_R| \le 60\text{'{'}s{'}'}$).
                  </div>
                )}
              </div>

              {/* Animated Connector 3 -> 4 */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0' }}>
                <ArrowDown size={14} color={step3State === 'SUCCESS' ? 'var(--accent-cyan)' : 'var(--border-medium)'} />
              </div>

              {/* STEP 04 */}
              <div
                style={{
                  background: '#0D131D',
                  border: `1px solid ${step4State === 'SUCCESS' ? 'rgba(16, 185, 129, 0.4)' : step4State === 'PROCESSING' ? 'var(--border-active)' : 'var(--border-subtle)'}`,
                  borderRadius: 8,
                  padding: 14
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="mono font-bold text-cyan" style={{ fontSize: 11 }}>STEP 04</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>
                      ML-KEM / HKDF Session Establishment
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {renderStatusBadge(step4State)}
                    <button
                      onClick={handleEstablishSession}
                      disabled={step3State !== 'SUCCESS' || step4State === 'PROCESSING'}
                      className="btn btn-primary"
                      style={{ fontSize: 11, padding: '4px 10px' }}
                    >
                      Establish
                    </button>
                  </div>
                </div>

                {sessionResult ? (
                  <div className="mono" style={{ fontSize: 11, color: 'var(--accent-cyan)', background: '#070B12', padding: 8, borderRadius: 4 }}>
                    <div>Key ID: {sessionResult.key_id}</div>
                    <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>256-bit HKDF Pairwise Unicast Key Derived (Active)</div>
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Establishes pairwise post-quantum authenticated session key between vehicle and Fog RSU.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Replay Attack Defense & Security Posture */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Distinct Replay Attack Mitigation Tester Card */}
          <div
            className="cyber-card"
            style={{
              borderLeft: '4px solid var(--status-red)',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(17, 25, 39, 0.95) 100%)'
            }}
          >
            <div className="cyber-card-header">
              <div className="card-title-group">
                <AlertTriangle size={18} color="var(--status-red-light)" />
                <span className="card-title">Replay Attack Mitigation Tester</span>
              </div>
              <span className="badge badge-red">Security Defense</span>
            </div>

            <div className="cyber-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Simulate a wireless adversary eavesdropping on the channel, capturing a valid challenge
                response, and re-transmitting it to impersonate node <b>{targetVehicle?.vehicle_id}</b>.
              </p>

              <button
                onClick={handleTestReplayAttack}
                disabled={replayState === 'PROCESSING' || !challengeData}
                className="btn btn-danger"
                style={{ fontSize: 12, padding: '8px 14px' }}
              >
                {replayState === 'PROCESSING' ? (
                  <RefreshCw size={14} className="spin" />
                ) : (
                  <Zap size={14} />
                )}
                <span>Inject Replay Attack (Resend Cached Nonce)</span>
              </button>

              {replayFeedback && (
                <div
                  style={{
                    background: replayState === 'INTERCEPTED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${replayState === 'INTERCEPTED' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: replayState === 'INTERCEPTED' ? 'var(--status-emerald-light)' : 'var(--status-red-light)'
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {replayState === 'INTERCEPTED' ? <ShieldCheck size={16} /> : <AlertTriangle size={16} />}
                    <span>RSU Security Defense Active</span>
                  </div>
                  <div>{replayFeedback}</div>
                </div>
              )}
            </div>
          </div>

          {/* Cryptographic Security Properties Disclosure */}
          <div className="cyber-card">
            <div className="cyber-card-header">
              <span className="card-title">Security Guarantees & Assumptions</span>
              <span className="badge badge-emerald">Verified</span>
            </div>

            <div className="cyber-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <CheckCircle2 size={16} color="var(--status-emerald-light)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 600, color: '#F8FAFC' }}>Pseudonym Privacy</div>
                  <div className="text-muted">Real vehicle identifier is protected by HMAC-SHA256 pseudonymity.</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <CheckCircle2 size={16} color="var(--status-emerald-light)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 600, color: '#F8FAFC' }}>Replay Defenses</div>
                  <div className="text-muted">Per-RSU challenge nonce cache and time freshness check enforce single-use protocol runs.</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <CheckCircle2 size={16} color="var(--status-emerald-light)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 600, color: '#F8FAFC' }}>Constant-Time Verification</div>
                  <div className="text-muted">Prevents timing side-channel attacks during MAC verification.</div>
                </div>
              </div>

              <div style={{ fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: 10, marginTop: 4 }}>
                * Operational note: Security guarantees operate under the defined VANET threat model. No cryptographic implementation claims absolute immunity against side-channel hardware compromise.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
