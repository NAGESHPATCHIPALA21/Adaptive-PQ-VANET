# Security Analysis & Academic Limitations

## 1. Security Properties Addressed

### 1.1 Anonymity and Pseudonymity
Vehicle real identities ($V_i$) are never transmitted over the wireless broadcast channel. Vehicles transmit only pseudonyms ($\text{AID}_i$) generated via HMAC with the Trusted Authority's master key. Only the TA can de-anonymize a vehicle during lawful audit.

### 1.2 Mutual Authentication & Replay Protection
RSU challenges contain fresh 128-bit random nonces with generation timestamps. Responses are validated against an in-memory replay cache with time-window expiration. Captured authentication tokens cannot be reused.

### 1.3 Confidentiality & Forward / Backward Security
- Unicast traffic uses 256-bit session keys derived via HKDF-SHA256.
- Multicast group traffic uses Group Session Keys (GSK).
- Backward Security prevents newly joined nodes from decrypting previous traffic.
- Forward Security prevents departed or revoked nodes from decrypting future traffic.

### 1.4 Malicious Node Isolation
Nodes exhibiting protocol violations, replay attacks, or abnormal beacon flooding experience dynamic trust penalties. When trust drops below $0.40$, MT-AGKM immediately isolates the node and rotates the cell GSK.

---

## 2. Academic Limitations & Honest Disclosures
In accordance with academic standards for B.Tech CSE minor projects:
1. **QRNG Source:** Software CSPRNG (`secrets.token_bytes`) serves as a clearly labeled functional placeholder for physical Quantum Random Number Generators.
2. **Post-Quantum Cryptography:** The architecture provides modular interface abstractions conforming to NIST FIPS 203 (ML-KEM/Kyber) and FIPS 204 (ML-DSA/Dilithium). The initial prototype operates in `DEMO / PLACEHOLDER` mode without falsely claiming hardware PQC.
3. **Mobility and Trust Models:** Mobility kinematic tracking and behavioral trust scores are prototype-level simulation formulations designed for empirical validation.
