# PROJECT AUDIT REPORT: ADAPTIVE PQ-VANET

**Project Title:** Adaptive Post-Quantum Anonymous Authentication and Mobility–Trust-Aware Group Key Management for Vehicle–Fog–Cloud VANETs  
**Short Name:** Adaptive PQ-VANET  
**Institution:** Chaitanya Bharathi Institute of Technology (CBIT), Hyderabad  
**Department:** Computer Science and Engineering – IoT, Cybersecurity and Blockchain Technology  
**Academic Year:** 2026–27  
**Team Members:** B.Tech CSE Research Group  
**Project Guide:** Department Faculty Supervisor  
**Date of Audit:** September 2026  

---

## A. Implemented (Genuinely Working Functionality)

1. **Hierarchical 3-Tier Architecture:**
   - **Cloud / Trusted Authority (TA):** Master secret management, pseudonym (Anonymous ID) derivation, credential issuing, and identity resolution.
   - **Fog / Roadside Units (RSU):** 4 active fog nodes (`RSU-01` to `RSU-04`) along a 3200-meter highway corridor, running localized authentication, mobility tracking, behavioral trust evaluation, MT-AGKM decision logic, and group key distribution.
   - **Vehicular Nodes:** Active vehicles tracking spatial coordinates, speed, heading, trust scores, session keys, and active group keys.

2. **Native NIST FIPS 203 ML-KEM-768 Post-Quantum Key Encapsulation:**
   - Integrated `kyber-py` (v1.2.0) pure-Python implementation of NIST FIPS 203 `ML_KEM_768`.
   - Real keypair generation (1184-byte public key, 2400-byte private key), encapsulation (1088-byte ciphertext, 32-byte shared secret), and decapsulation (recovering exact 32-byte shared secret).
   - Dynamic provider registry (`PQProviderRegistry`) exposing native vs placeholder status.

3. **Anonymous Authentication & Challenge-Response Protocol:**
   - TA-issued HMAC pseudonyms ($PID$) preventing real vehicular ID exposure in broadcast channels.
   - Mutual challenge-response protocol with 128-bit cryptographic nonces and timestamps.
   - Constant-time verification using `hmac.compare_digest` to prevent timing side-channel attacks.

4. **Cryptographic Replay Protection:**
   - In-memory sliding replay cache with automatic expired nonce purging.
   - Detection and instant rejection of repeated challenge nonces with security event logging and automated behavioral trust degradation.

5. **Pairwise Session Key Establishment (Hybrid Authenticated + Post-Quantum):**
   - Binding of post-quantum shared secret ($SS_{PQ}$ from ML-KEM-768), vehicular secret credential ($S_V$), vehicle nonce, RSU nonce, and domain separation info via **HKDF-SHA256 (RFC 5869)** into a 256-bit pairwise session key.
   - Session key identification via 64-character SHA-256 fingerprint; raw session key strictly isolated to volatile memory.

6. **Group Session Key (GSK) Lifecycle & Forward/Backward Security:**
   - Cell bootstrap initializes GSK v1.
   - **Backward Security:** Vehicle join triggers monotonic increment to GSK $v+1$; new vehicle cannot decrypt prior broadcasts.
   - **Forward Security:** Vehicle leave or revocation triggers monotonic increment to GSK $v+1$; evicted vehicle cannot decrypt subsequent broadcasts.
   - Ephemeral volatile storage of raw group keys with SHA-256 fingerprinting.

7. **Kinematic Mobility Model:**
   - 2D Euclidean distance to RSU center and cell boundary.
   - Radial vector heading dot-product calculating directional factor (inward vs outward).
   - Normalized mobility score $M \in [0.0, 1.0]$ factoring proximity (45%), speed (30%), and directional heading (25%).
   - Handover probability $P_{HO} \in [0.0, 1.0]$ and predicted state (`STABLE`, `APPROACHING_BOUNDARY`, `IMMINENT_HANDOVER`).

8. **Behavioral Trust Model (Prototype Simulation-Based):**
   - Dynamic rating in $[0.0, 1.0]$.
   - Tracks authentication reliability, beacon consistency, protocol compliance, replay attempts, and bogus flooding.
   - Dynamic risk categorization: `NORMAL` ($\ge 0.65$), `WARNING` ($0.40 \le T < 0.65$), and `CRITICAL` ($< 0.40$).

9. **MT-AGKM State Machine:**
   - Deterministic 6-tier priority hierarchy: Priority 1 (Security Threat $\rightarrow$ `UPDATE`) > Priority 2 (Critical Trust $\rightarrow$ `UPDATE`) > Priority 3 (Leave/Revoke $\rightarrow$ `UPDATE`) > Priority 4 (Join $\rightarrow$ `UPDATE`) > Priority 5 (High Mobility / Boundary Proximity $\rightarrow$ `PREPARE`) > Default (Benign Stability $\rightarrow$ `KEEP`).
   - Generates human-readable explanations, audit trail entries, before/after GSK versions, and recommended actions.

10. **Cybersecurity Research Dashboard (React 19 + Vite):**
    - Live highway canvas with 4 RSU fog cells, vehicles, and real-time animation.
    - Interactive 8-step Viva stepper guiding evaluators through the complete research scenario.
    - Interactive MT-AGKM Decision Lab allowing custom scenario evaluation.
    - Cryptography transparency panel displaying real runtime algorithms and hardware status.
    - Live empirical benchmark runner displaying real comparative metrics.

---

## B. Improved (Refactorings & Fixes Applied)

1. **Native Post-Quantum Cryptography Integration:**
   - Replaced pure mock/demo placeholder with genuine NIST FIPS 203 `ML-KEM-768` via `kyber-py`.
   - Updated `PQProviderRegistry` to dynamically report `"ML-KEM-768 — NATIVE (kyber-py FIPS 203)"` with `is_native_pq: True`.
   - Retained modular interface design with clean fallback to `DemoMLKEMPlaceholder` when dependencies are unavailable.

2. **Secrets & Credentials Sanitization:**
   - Eliminated hardcoded master secrets from source code, configuration files, and `docker-compose.yml`.
   - Introduced `.env` and `.env.example` using environment-driven configuration via `python-dotenv`.
   - Added `.gitignore` preventing secrets, databases, node_modules, and cache files from being committed.
   - Sanitized `Vehicle.__repr__` to prevent accidental credential leakage into debug logs.
   - Ensured `to_dict(include_secret=False)` is used across all API serialization routes.

3. **Academic Transparency Labels:**
   - Renamed random source to `"CSPRNG-based QRNG abstraction (OS Entropy Placeholder)"`.
   - Set `IS_TRUE_QUANTUM = False` and `QUANTUM_HARDWARE_CONNECTED = False` across backend configuration and UI.
   - Prevented any false claims of "quantum secure" or "production-grade cryptography".

4. **Deterministic MT-AGKM Engine:**
   - Enforced strict priority ordering in `MTAGKMService.evaluate`.
   - Added `gsk_changed: bool`, `current_rsu`, `action`, and `recommended_action` keys to decision dictionary.
   - Supported both `membership_event` and `event_type` keyword arguments.

5. **Empirical Benchmark Rigor:**
   - Refactored `SimulationService` to accept fixed pseudo-random seeds (`seed=42`) for reproducibility.
   - Implemented real empirical metrics tracking: GSK updates, unnecessary updates avoided, broadcast counts, and measured host KEM latency.
   - Created standalone benchmark runner `scripts/run_benchmark.py` generating `benchmark_results.json`.

6. **Comprehensive Automated Test Suite:**
   - Expanded test suite from 19 to **47 automated tests** covering Authentication, Session, Group Key, Mobility, Trust, MT-AGKM, and Post-Quantum KEM.
   - Achieved **100% pass rate (47/47 passing)**.

7. **Docker Configuration:**
   - Created `backend/requirements.txt` containing all runtime dependencies (`kyber-py`, `python-dotenv`, `fastapi`, `uvicorn`, `sqlalchemy`, `cryptography`, `pydantic`, `pytest`, `httpx`).
   - Updated `backend/Dockerfile` to install directly from `requirements.txt`.
   - Updated `docker-compose.yml` to consume environment variables.

---

## C. Verified (Execution & Test Log)

1. **Automated Unit & Integration Test Suite (`pytest`):**
   ```
   Command: python -m pytest tests/ -v
   Result: 47 passed, 1 warning in 3.81s (100% pass rate)
   ```
   Verified coverage:
   - `test_phase1.py` (6/6 passing): Registration, challenge-response, replay rejection, invalid credential rejection, forward/backward security, PQ KEM interface.
   - `test_phase2.py` (5/5 passing): Kinematic mobility, behavioral trust penalties, MT-AGKM KEEP, PREPARE, and UPDATE decisions.
   - `test_phase3.py` (3/3 passing): 4-RSU topology, research scenarios S1-S8, empirical benchmark.
   - `test_phase4.py` (5/5 passing): API root, dashboard summary, registration/auth flow, MT-AGKM endpoint, benchmark endpoint.
   - `test_section30_comprehensive.py` (28/28 passing): Valid auth, invalid identity, invalid signature, expired timestamp, replay attack, session key fingerprint, unauthenticated session rejection, GSK join/leave/revoke lifecycle, mobility models, trust degradation, MT-AGKM priorities, ML-KEM keygen/encaps/decaps/equality, and placeholder fallback.

2. **Phase 1 CLI Demo (`demo_phase1.py`):**
   ```
   Command: python demo_phase1.py
   Result: Success (Code 0) — Register -> Authenticate -> Session Key -> GSK v1 -> Join -> GSK v2
   ```

3. **Standalone Empirical Benchmark Runner (`run_benchmark.py`):**
   ```
   Command: python scripts/run_benchmark.py --steps 30 --seed 42
   Result: Success (Code 0) — 390 evaluations, 99.1% GSK update reduction, saved to benchmark_results.json
   ```

4. **Frontend Production Build (`vite build`):**
   ```
   Command: npm run build (in frontend/)
   Result: Success (Code 0) — 1891 modules transformed in 748ms, zero build errors
   ```

5. **Backend Server Startup (`uvicorn`):**
   ```
   Command: python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
   Result: Success (Code 0) — Verified live responses from / (HTTP 200) and /api/dashboard/summary (HTTP 200)
   ```

---

## D. Benchmark Results (Measured Empirically)

> **Important Disclosure:** Under the defined simulation configuration and baseline policy, MT-AGKM reduced the number of modeled GSK updates by 99.1% and communication broadcasts by 88.9%. These figures reflect the comparative evaluation against the aggressive traditional handover baseline modeled below and are not presented as universal real-world performance guarantees.

**Configuration:** Steps = 30, Fleet = 13 vehicles, RSUs = 4, Random Seed = 42.

| Metric | Traditional Baseline | Proposed MT-AGKM | Measured Difference |
| :--- | :--- | :--- | :--- |
| **Total State Evaluations** | 390 | 390 | Identical workload |
| **GSK Updates** | 221 | 2 | **99.1% Reduction** |
| **Unnecessary Updates Avoided** | 0 | 220 | **220 updates eliminated** |
| **KEEP Decisions** | 0 | 169 | Zero-overhead intervals |
| **PREPARE Decisions** | 0 | 219 | Proactive handover tickets |
| **Broadcast Messages** | 5,915 | 659 | **88.9% Reduction** |
| **Estimated Key-Mgmt Time** | 3,052.01 ms | 27.62 ms | **Modeled latency reduction** |
| **Host ML-KEM-768 Op Latency** | — | 12.61 ms | Measured via `time.perf_counter()` |
| **Execution Wall Clock Time** | — | 2.723 s | Total benchmark runtime |

---

## E. Benchmark Methodology

### 1. Experimental Configuration
- **Number of Vehicles:** 13 active vehicles populated across the highway.
- **Number of Fog RSUs:** 4 roadside units (`RSU-01` to `RSU-04`) spaced at 800-meter intervals along a 3200-meter highway corridor, each with a 400-meter coverage radius.
- **Simulation Duration:** 30 discrete simulation time steps ($dt = 1.5\text{s}$ effective displacement per step).
- **Total State Evaluations:** $13 \text{ vehicles} \times 30 \text{ steps} = 390$ individual evaluations.
- **Pseudo-Random Seed:** `seed = 42` (ensures exact mathematical determinism and reproducibility across runs).

### 2. Evaluated Policies
- **Traditional Baseline Policy (Aggressive / Unconditional Rekeying):**
  - Triggers a full Group Session Key (GSK) rotation whenever a vehicle approaches a cell boundary ($d_{boundary} < 80.0\text{ m}$), initiates a handover, joins, leaves, or triggers a security alert.
  - Models the traditional reactionary paradigm where mobility boundary transitions force immediate group rekeying.
- **Proposed MT-AGKM Policy:**
  - Evaluates multi-dimensional kinematics and trust history.
  - When $d_{boundary} < 80.0\text{ m}$ and behavior is trusted: issues **`PREPARE`**, generating lightweight unicast handover tickets without rotating the cell GSK.
  - When stable: issues **`KEEP`**, eliminating all re-key overhead.
  - Only when a genuine security incident or membership departure occurs: issues **`UPDATE`**, rotating the GSK to preserve forward/backward security.

### 3. Metric Definitions
- **GSK Update:** Generation of fresh 256-bit group session key material, version increment ($v \rightarrow v+1$), and invalidation of the previous active key.
- **Broadcast Message Definition:**
  - In a cell with $N$ active vehicles, rotating the group key requires distributing the new encrypted key material to all authorized members, modeled as $2 \times N$ messages (key broadcast block + delivery acknowledgment per member).
  - In `PREPARE`, only 2 pairwise unicast control messages (handover ticket request + target cell token) are exchanged between the vehicle and RSU, completely avoiding the $2 \times N$ broadcast storm.
  - In `KEEP`, only 1 periodic broadcast beacon message is exchanged.
- **Latency Separation:**
  - *ML-KEM-768 Latency ($t_{kem}$):* Empirically measured time required on host CPU to execute `generate_keypair()`, `encapsulate()`, and `decapsulate()` via `time.perf_counter()`.
  - *GSK Generation Latency ($t_{gsk\_gen}$):* Modeled as $t_{kem} + 1.2\text{ ms}$ (representing key wrapping and distribution overhead).
  - *Handover Ticket Latency ($t_{prep}$):* Modeled as $0.85\text{ ms}$ for ticket generation.
  - *Key Management Time:* $N_{updates} \times t_{gsk\_gen}$.
  - *Simulation Wall Clock Time:* Total execution time of the 30-step benchmark script measured by Python's monotonic clock.

### 4. Hardware & Software Environment
- **Host CPU:** AMD Ryzen / Intel x86_64, Windows 11.
- **Python Version:** Python 3.14.3 (CPython).
- **Libraries:** `kyber-py` 1.2.0, `cryptography` 46.0.5, `fastapi` 0.135.1, `sqlalchemy` 2.0.48.

---

## F. Cryptography Status Summary

| Layer | Algorithm / Standard | Implementation Status | Academic Label |
| :--- | :--- | :--- | :--- |
| **V2I Authentication** | HMAC-SHA256 | Implemented & Verified | Classical Challenge-Response |
| **Key Derivation** | HKDF-SHA256 (RFC 5869) | Implemented & Verified | Standard HKDF Expansion |
| **PQ Key Encapsulation** | ML-KEM-768 (NIST FIPS 203) | Implemented & Verified | Native Post-Quantum (`kyber-py`) |
| **Fallback KEM** | DemoMLKEMPlaceholder | Implemented & Verified | Interface Fallback Placeholder |
| **Randomness Source** | `secrets.token_bytes` | Implemented & Verified | CSPRNG / OS Entropy Placeholder |
| **Physical QRNG Hardware**| None | Not Connected | `IS_TRUE_QUANTUM = False` |
| **Group Key Format** | 256-bit symmetric key | Implemented & Verified | SHA-256 Fingerprinted |

---

## G. Security Limitations (Honest Academic Disclosure)

1. **Pure-Python Post-Quantum Performance:**
   `kyber-py` executes pure Python bytecode. The measured key generation and encapsulation time (~12.6 ms) is adequate for prototyping and demonstration, but exceeds the sub-millisecond envelope required for production V2X networks. Production deployment requires C-optimized extensions (such as `liboqs`).
2. **CSPRNG vs Physical QRNG:**
   Randomness originates from the host operating system's cryptographic pool (`/dev/urandom` or Windows CryptoAPI). It is not physical quantum entropy.
3. **Simulation-Based Behavioral Trust:**
   The behavioral trust model is a heuristic evaluation engine designed for simulation and demonstration. It has not been formally validated against real-world adversarial vehicular datasets.
4. **Broadcast Encryption Abstraction:**
   Group session key distribution is modeled via broadcast count estimation rather than physical IEEE 802.11bd / C-V2X PC5 RF packet injection.

---

## H. Remaining Research Work

1. Integration of compiled C/Rust post-quantum implementations (`liboqs`) to benchmark sub-millisecond encapsulation latencies.
2. Integration of NIST FIPS 204 (ML-DSA / Dilithium) for post-quantum anonymous digital signatures to replace HMAC challenge-response.
3. Hardware-in-the-loop (HIL) testing using physical automotive CAN-bus nodes and dedicated QRNG hardware modules.
4. Large-scale trace validation using SUMO (Simulation of Urban MObility) and NS-3 vehicular network simulators.

---

## Final Verification Status

- **ML-KEM-768 Integration:** **PASS** (Pure-Python NIST FIPS 203 via `kyber-py`, keygen, encaps, decaps, and shared secret equality verified)
- **Authentication Protocol:** **PASS** (HMAC-SHA256 challenge-response, fresh nonce, constant-time verification)
- **Session Key Establishment:** **PASS** (Hybrid ML-KEM-768 + authenticated credential + nonces expanded via HKDF-SHA256)
- **Group Session Key (GSK):** **PASS** (Backward security on join, forward security on leave/revocation, fingerprinting)
- **MT-AGKM State Machine:** **PASS** (Priority hierarchy enforced: KEEP, PREPARE, UPDATE verified live)
- **Kinematic Mobility Model:** **PASS** (Euclidean distance, proximity, directional dot product, predicted state verified)
- **Behavioral Trust Model:** **PASS** (Dynamic penalty scoring, risk tiers: NORMAL $\ge 0.65$, WARNING $0.40-0.65$, CRITICAL $< 0.40$)
- **Replay Protection:** **PASS** (Sliding nonce cache, stale timestamp rejection, repeat rejection verified)
- **Benchmark Reproducibility:** **PASS** (Deterministic execution under `seed=42`, outputs verified via `run_benchmark.py`)
- **Benchmark Fairness:** **PASS** (Identical fleet, identical kinematics, identical events; only key management policy differs)
- **Backend Tests:** **47/47 PASSED (100% pass rate in 3.81s)**
- **Frontend Build:** **PASS** (Vite build completed in 748ms, 0 errors, production bundle generated)
- **Docker Readiness:** **NOT VERIFIED** (Docker CLI / engine is not installed on host machine; Dockerfile and docker-compose.yml configuration files are prepared and validated)
