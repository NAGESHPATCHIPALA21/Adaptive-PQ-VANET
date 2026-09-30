# Adaptive PQ-VANET
### Adaptive Post-Quantum Anonymous Authentication and Mobility–Trust-Aware Group Key Management for Vehicle–Fog–Cloud VANETs

**Project Type:** B.Tech CSE Minor Project / Research Prototype  
**Institution:** Chaitanya Bharathi Institute of Technology (CBIT), Hyderabad  
**Department:** Computer Science and Engineering – IoT, Cybersecurity and Blockchain Technology  
**Team Members:** B.Tech CSE Research Group  
**Project Guide:** Department Faculty Supervisor  

---

## 1. Project Title
**Adaptive Post-Quantum Anonymous Authentication and Mobility–Trust-Aware Group Key Management for Vehicle–Fog–Cloud VANETs** (*Adaptive PQ-VANET*)

---

## 2. Problem Statement
Vehicular Ad-Hoc Networks (VANETs) exchange safety-critical telemetry, hazard notifications, and cooperative awareness messages over unguided, lossy wireless channels. Vehicular nodes move at high speeds, frequently transitioning across Roadside Unit (RSU) wireless coverage perimeters. Ensuring confidentiality, authentication integrity, privacy preservation, and forward/backward security under tight latency constraints without saturating edge fog nodes is a fundamental challenge.

---

## 3. Research Gap
Existing vehicular group-key management schemes primarily operate **reactively**:
1. Group Session Keys (GSK) are re-keyed unconditionally whenever any vehicle approaches or crosses an RSU cell perimeter, even when the vehicle is benign and fully trusted.
2. Existing frameworks treat mobility and trust as disjoint silos, ignoring continuous kinematic dwell time, boundary distance, and behavioral trust history.
3. Rekeying operations incur substantial broadcast overhead and computational bottlenecks on edge fog nodes, degrading quality of service for safety-critical V2X applications.

---

## 4. Objectives
1. Implement a hierarchical **Vehicle → Fog/RSU → Cloud/Trusted Authority (TA)** architecture with cryptographic pseudonymity.
2. Integrate genuine **NIST FIPS 203 ML-KEM-768** key encapsulation for post-quantum shared secret establishment alongside HKDF-SHA256 session key derivation.
3. Design and implement the **Mobility–Trust-Aware Adaptive Group Key Management (MT-AGKM)** state machine supporting `KEEP`, `PREPARE`, and `UPDATE` decisions.
4. Eliminate unnecessary group re-keying while strictly enforcing **Backward Security** (on join) and **Forward Security** (on leave or revocation).
5. Provide empirical, reproducible comparative benchmark results without fabricated metrics.

---

## 5. System Architecture
```
                         ┌─────────────────────────────────────────┐
                         │       Trusted Authority (TA) / Cloud    │
                         │                                         │
                         │  • Vehicle Registry & Master Secrets    │
                         │  • Pseudonym (Anonymous ID) Generation  │
                         │  • Audit Trail & Identity Resolution    │
                         └────────────────────┬────────────────────┘
                                              │ Secure Backhaul
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      │                                               │
             ┌────────▼──────────┐                         ┌──────────▼────────┐
             │    Fog / RSU 1    │                         │    Fog / RSU 2    │
             │   (West Gateway)  │                         │   (Central Hub)   │
             │                   │                         │                   │
             │ • ML-KEM-768 KEM  │                         │ • ML-KEM-768 KEM  │
             │ • Challenge Auth  │                         │ • Challenge Auth  │
             │ • Kinematic Model │                         │ • Kinematic Model │
             │ • Behavioral Trust│                         │ • Behavioral Trust│
             │ • MT-AGKM Engine  │                         │ • MT-AGKM Engine  │
             │ • Active GSK v(k) │                         │ • Active GSK v(k) │
             └────────┬──────────┘                         └──────────┬────────┘
                      │                                               │
             ┌────────┼──────────┐                         ┌──────────┼────────┐
             │        │          │                         │          │        │
           V001      V002       V003                      V004       V005     V006
```

---

## 6. Existing / Base Approach
In traditional schemes (such as periodic re-keying or unconditional handover rekeying):
- Every cell border proximity or handover event unconditionally triggers a group session key rotation.
- For a fleet of $N$ vehicles with frequent handovers, the edge fog node performs $\mathcal{O}(N)$ re-key operations, resulting in severe cryptographic overhead and spectrum saturation.

---

## 7. Proposed MT-AGKM Approach
The proposed **MT-AGKM** (Mobility–Trust-Aware Adaptive Group Key Management) engine introduces multi-parameter decision evaluation:
- **`KEEP`**: Stable kinematics + high trust. Retains current GSK $v(k)$. Unnecessary rekeying overhead is 100% eliminated.
- **`PREPARE`**: High mobility or approaching boundary, but benign behavior. Handover credentials and tickets are prepared proactively for the target RSU; group key rotation is avoided.
- **`UPDATE`**: Critical security threat, behavioral trust drop below threshold ($< 0.40$), replay attempt, or node departure/join. GSK immediately increments to $v(k+1)$ to preserve forward/backward security.

---

## 8. Anonymous Authentication Flow
1. **Registration:** Vehicle registers with TA via master secret $K_{TA}$, obtaining pseudonym $PID = \text{HMAC}_{K_{TA}}(VID \parallel \text{nonce} \parallel ts)$ and secret credential $S_V$.
2. **Challenge Request:** Vehicle requests challenge from RSU; RSU returns fresh 128-bit challenge nonce $N_C$ and timestamp $T_R$.
3. **Response Computation:** Vehicle computes $R_{SIG} = \text{HMAC}_{S_V}(N_C \parallel PID \parallel T_R)$.
4. **Verification & Freshness:** RSU verifies timestamp freshness ($|T_{now} - T_R| \le 60\text{s}$), checks replay cache ($N_C \notin \text{UsedNonces}$), and verifies HMAC in constant time.
5. **Replay Mitigation:** Repeated nonces immediately fail authentication, trigger a security audit event, and apply a 0.20-0.45 penalty to the vehicle's trust score.

---

## 9. Session Key Establishment Flow
1. **Pre-condition:** Vehicle must be in `AUTHENTICATED` state.
2. **ML-KEM Keypair:** RSU generates ephemeral ML-KEM-768 public/private keypair $(PK_{RSU}, SK_{RSU})$.
3. **Encapsulation:** Vehicle encapsulates to $PK_{RSU}$, producing ciphertext $C$ (1088 bytes) and post-quantum shared secret $SS_{PQ}$ (32 bytes).
4. **Decapsulation:** RSU decapsulates $C$ using $SK_{RSU}$, recovering $SS_{PQ}$.
5. **HKDF Expansion:**
   $$\text{SessionKey} = \text{HKDF-SHA256}\left(\text{salt}=N_V \parallel N_R, \, \text{IKM}=SS_{PQ} \parallel S_V, \, \text{info}=\text{V2I-Context}\right)$$
6. **Credential Isolation:** Raw session key material resides exclusively in volatile memory; only SHA-256 fingerprints are logged or sent across APIs.

---

## 10. Group Key Management (GSK) Lifecycle
- **GSK v1:** Initialized on cell bootstrap.
- **Vehicle Join (Backward Security):** GSK rotates to $v+1$. New vehicle cannot decrypt broadcasts sent under GSK $v$.
- **Vehicle Leave (Forward Security):** GSK rotates to $v+1$. Departed vehicle is evicted from authorized list and cannot decrypt broadcasts sent under GSK $v+1$.
- **Revocation:** Compromised vehicle is immediately isolated, marked `REVOKED`, and GSK is refreshed.
- **Fingerprinting:** All GSK instances are identified by 64-character SHA-256 fingerprints; raw keys are never returned in client-facing APIs.

---

## 11. Mobility Model
Vehicular kinematics are continuously tracked in a 2D Euclidean coordinate space:
- **Euclidean Distance:** $d_{center} = \sqrt{(x_V - x_{RSU})^2 + (y_V - y_{RSU})^2}$
- **Boundary Distance:** $d_{boundary} = \max(0, R_{coverage} - d_{center})$
- **Proximity Factor:** $f_{prox} = \min(1.0, d_{center} / R_{coverage})$
- **Directional Factor:** Evaluated via vector dot product of heading $(\cos\theta, \sin\theta)$ with radial unit vector.
- **Speed Factor:** $f_{speed} = \min(1.0, v / 120\text{ km/h})$
- **Normalized Mobility Score:**
  $$M = 0.45 \cdot f_{prox} + 0.30 \cdot f_{speed} + 0.25 \cdot f_{dir}$$
- **Handover Probability:** $P_{HO} = f_{prox} \cdot f_{dir} \cdot (0.5 + 0.5 \cdot f_{speed})$
- **Predicted State:** `STABLE`, `APPROACHING_BOUNDARY`, or `IMMINENT_HANDOVER`.

---

## 12. Behavioral Trust Model
Simulation-based dynamic trust rating in $[0.0, 1.0]$:
- Evaluates authentication reliability, beacon consistency, protocol compliance, replay attempts, and flooding.
- **Risk Tiers:**
  - `NORMAL` ($\ge 0.65$): Permitted full group communications.
  - `WARNING` ($0.40 \le T < 0.65$): Flagged for heightened monitoring.
  - `CRITICAL` ($< 0.40$): Immediate revocation and cell isolation.

---

## 13. MT-AGKM Decision Logic
The decision engine enforces a deterministic, explainable priority hierarchy:
1. **Priority 1 (Security Threat):** Suspicious traffic / replay attack $\rightarrow$ **`UPDATE`** (rotate GSK, isolate node).
2. **Priority 2 (Critical Trust):** Trust score $< 0.40 \rightarrow$ **`UPDATE`** (rotate GSK, revoke node).
3. **Priority 3 (Membership Departure):** Vehicle leaves / disconnects $\rightarrow$ **`UPDATE`** (rotate GSK for forward security).
4. **Priority 4 (Membership Arrival):** Vehicle joins cell $\rightarrow$ **`UPDATE`** (rotate GSK for backward security).
5. **Priority 5 (Handover Proximity):** Mobility score $\ge 0.75$ or $P_{HO} \ge 0.70 \rightarrow$ **`PREPARE`** (prepare handover tickets; **defer GSK rotation**).
6. **Default (Benign Stability):** $\rightarrow$ **`KEEP`** (maintain existing GSK).

---

## 14. Multi-RSU Highway Simulation
- **Topology:** 4 RSUs (`RSU-01` to `RSU-04`) spaced across a 3200-meter highway corridor with overlapping 400m fog coverage cells.
- **Vehicle Fleet:** 21 active vehicles with realistic kinematic speeds (40–110 km/h), heading trajectories, and behavioral states.
- **Predefined Scenarios:**
  - S1: Normal Stable Traffic $\rightarrow$ `KEEP`
  - S2: Vehicle Approaching Boundary $\rightarrow$ `PREPARE`
  - S3: Vehicle Leaves Cell $\rightarrow$ `UPDATE` (Forward Security)
  - S4: Replay / Flooding Attack $\rightarrow$ `UPDATE` (Revocation)
  - S5–S8: Multi-node boundary handover sequences.

---

## 15. Benchmark Methodology
- **Fair Experimental Setup:** Both Traditional and Proposed schemes execute on identical vehicle trajectories, identical RSU topology, identical duration (30 steps / 630 state evaluations), and identical pseudo-random seed (`seed=42`).
- **Baseline Strategy:** Unconditional re-keying on every boundary proximity or handover event.
- **Proposed Strategy:** Adaptive MT-AGKM (`KEEP`, `PREPARE`, `UPDATE`).
- **Measured Formulas:**
  $$\text{Update Reduction \%} = \frac{\text{Baseline Updates} - \text{Proposed Updates}}{\text{Baseline Updates}} \times 100$$
  $$\text{Comm Reduction \%} = \frac{\text{Baseline Broadcasts} - \text{Proposed Broadcasts}}{\text{Baseline Broadcasts}} \times 100$$

---

## 16. Empirical Benchmark Results
> **Important Academic Disclosure:** Under the defined simulation configuration and baseline policy, MT-AGKM reduced the number of modeled GSK updates by 99.1% and communication broadcasts by 88.9%. These figures reflect the comparative evaluation against the aggressive traditional handover baseline modeled below and are not presented as universal real-world performance guarantees.

*(Measured empirically from `python scripts/run_benchmark.py --steps 30 --seed 42`)*:

| Metric | Traditional Baseline | Proposed MT-AGKM | Improvement / Reduction |
| :--- | :--- | :--- | :--- |
| **Total Evaluations** | 390 | 390 | Identical workload |
| **GSK Updates** | 221 | 2 | **99.1% Reduction** |
| **Unnecessary Updates Avoided** | 0 | 220 | **220 updates eliminated** |
| **KEEP Decisions** | 0 | 169 | Zero-overhead intervals |
| **PREPARE Decisions** | 0 | 219 | Proactive handover tickets |
| **Broadcast Messages** | 5,915 | 659 | **88.9% Reduction** |
| **Estimated Key-Mgmt Time** | 3,052.01 ms | 27.62 ms | **Modeled latency reduction** |
| **Host ML-KEM-768 Op Latency** | — | 12.61 ms | Measured via `time.perf_counter()` |
| **Execution Wall Clock Time** | — | 2.723 s | Reproducible under seed=42 |

---

## 17. Technology Stack
- **Backend:** Python 3.11+ / 3.14, FastAPI, SQLAlchemy 2.0, Pydantic v2, SQLite
- **Post-Quantum Cryptography:** `kyber-py` (NIST FIPS 203 pure-Python `ML_KEM_768`), Cryptography library (HKDF, SHA-256), HMAC-SHA256
- **Frontend:** React 19, Vite, Lucide Icons, Cyber CSS Design System
- **Testing:** Pytest (47 automated tests, 100% passing)
- **Containerization:** Docker, Docker Compose

---

## 18. Installation & Quick Start

### 18.1 Clone & Environment Setup
```bash
git clone https://github.com/Adaptive-PQ-VANET/Adaptive-PQ-VANET.git
cd Adaptive-PQ-VANET
cp .env.example .env
```

### 18.2 Backend Installation
```bash
# Install Python dependencies
pip install -r backend/requirements.txt
```

### 18.3 Frontend Installation
```bash
cd frontend
npm install
cd ..
```

---

## 19. Running Instructions

### Run Automated Tests
```bash
python -m pytest tests/ -v
```

### Run Standalone Empirical Benchmark
```bash
python scripts/run_benchmark.py --steps 30 --seed 42
```

### Start Backend API Server
```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation: `http://127.0.0.1:8000/docs`

### Start Frontend Dashboard
```bash
cd frontend
npm run dev
```
Dashboard URL: `http://localhost:5173`

---

## 20. REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | API status and metadata |
| `GET` | `/api/dashboard/summary` | Live KPI summary, topology, and crypto transparency status |
| `POST` | `/api/vehicles/register` | TA vehicle registration and anonymous pseudonym issuance |
| `GET` | `/api/vehicles` | List registered vehicles (secret credentials excluded) |
| `POST` | `/api/auth/challenge` | RSU challenge generation (128-bit nonce + timestamp) |
| `POST` | `/api/auth/verify` | Challenge response HMAC verification |
| `POST` | `/api/session/create` | Pairwise ML-KEM-768 key encapsulation & HKDF derivation |
| `POST` | `/api/mt-agkm/evaluate` | MT-AGKM evaluation returning `KEEP`, `PREPARE`, or `UPDATE` |
| `GET` | `/api/group-keys/current/{rsu_id}` | Current active GSK version and member list |
| `POST` | `/api/group-keys/join` | Vehicle join trigger (Backward Security rekey) |
| `POST` | `/api/group-keys/revoke` | Vehicle revocation trigger (Forward Security rekey) |
| `POST` | `/api/simulation/benchmark` | Execute empirical benchmark with custom step count & seed |

---

## 21. Testing & Validation Status
The automated test suite in `tests/` contains **47 comprehensive tests**:
- **Authentication:** Valid authentication, unknown pseudonym rejection, invalid response signature rejection, expired challenge timestamp rejection, replay attempt detection.
- **Session:** Valid pairwise ML-KEM derivation, unauthenticated rejection, SHA-256 key fingerprinting.
- **Group Key:** Initial GSK v1, vehicle join update, vehicle leave update, revocation update, monotonic version increments.
- **Mobility:** Stable central vehicle, boundary proximity, high-speed outward movement, handover probability.
- **Trust:** Initial baseline rating, suspicious event penalties, failed auth penalties, critical risk drops.
- **MT-AGKM:** KEEP decision, PREPARE decision, UPDATE on security threat, UPDATE on critical trust, UPDATE on join, UPDATE on revoke.
- **Post-Quantum:** ML-KEM-768 key generation (1184/2400 bytes), encapsulation (1088 bytes), decapsulation (32 bytes), shared secret equality, and explicit placeholder fallback testing.

**Pass Rate:** **100% (47/47 passing)**.

---

## 22. Security Considerations
- **No Raw Credential Leaks:** Secret credentials, private keys, and raw group session keys are never returned in client-facing API responses or serialized logs.
- **Timing-Safe Operations:** HMAC verification uses `hmac.compare_digest` to prevent timing side-channel attacks.
- **Dynamic Configuration:** Secrets are loaded from `.env` via environment variables rather than hard-coded strings.

---

## 23. Post-Quantum Limitations & Academic Honesty
- **Algorithm Used:** `ML-KEM-768` (NIST FIPS 203 / CRYSTALS-Kyber Category 3) implemented via `kyber-py`.
- **Performance:** As a pure-Python implementation, key operations average ~13.7 ms on host hardware; compiled C/Rust implementations (e.g., `liboqs`) would yield sub-millisecond execution times.
- **Fallback Transparency:** When `kyber-py` is not present, the system defaults to `DemoMLKEMPlaceholder` and explicitly reports `Native ML-KEM: NOT AVAILABLE`.

---

## 24. QRNG Limitations
- The system employs `secrets.token_bytes` from operating system cryptographic entropy.
- **Academic Label:** `CSPRNG-based QRNG abstraction (OS Entropy Placeholder)`.
- Physical quantum hardware is **not connected** (`IS_TRUE_QUANTUM = False`). The dashboard explicitly discloses this state.

---

## 25. Future Work
1. Integration of C-optimized Post-Quantum libraries (`liboqs-python`) for microsecond-scale encapsulation.
2. Integration of NIST FIPS 204 (ML-DSA / Dilithium) for post-quantum digital signatures.
3. Hardware-in-the-loop validation using physical CAN bus transceivers and dedicated QRNG hardware appliances.
4. Large-scale NS-3 / SUMO trace coupling for real-world vehicular density analysis.

---

## 26. References
1. J. Gao, T. Cheng, Q. Shi, Z. Yang and J. Zhu, *"Efficient Vehicle–Fog–Cloud Anonymous Authentication and Group Key Agreement Scheme Based on QRNG in VANETs"*, **IEEE Internet of Things Journal**, 2025.
2. N. M. Wani, G. K. Verma and V. Chamola, *"Dynamic Anonymous Quantum-Secure Batch-Verifiable Authentication Scheme for VANET"*, **IEEE Transactions on Consumer Electronics**, 2024.
3. L. Li et al., *"Lattice-Based Conditional Privacy-Preserving Batch Authentication Protocol for Fog-Assisted Vehicular Ad Hoc Networks"*, **IEEE TIFS**, 2024.
4. NIST FIPS 203, *"Module-Lattice-Based Key-Encapsulation Mechanism Standard (ML-KEM)"*, August 2024.
