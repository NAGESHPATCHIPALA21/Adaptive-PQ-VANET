# System Architecture: Adaptive PQ-VANET

## 1. High-Level Topology

Adaptive PQ-VANET implements a three-tier **Vehicle–Fog–Cloud** hierarchical architecture designed for low-latency, post-quantum safe, and adaptive vehicular group communication:

```
                    ┌──────────────────────────────┐
                    │     Trusted Authority (TA)   │
                    │         / Cloud Layer        │
                    │                              │
                    │ • Vehicle Registration       │
                    │ • Anonymous Identity Mapping │
                    │ • Master Credential Storage  │
                    │ • Security Audit Policies    │
                    └──────────────┬───────────────┘
                                   │
                                   │ Secure Backhaul
                                   │
             ┌─────────────────────┴─────────────────────┐
             │                                           │
       ┌─────▼──────────┐                         ┌──────▼─────────┐
       │   Fog / RSU 1  │                         │   Fog / RSU 2  │
       │                │                         │                │
       │ • Challenge-   │                         │ • Challenge-   │
       │   Response Auth│                         │   Response Auth│
       │ • Mobility     │                         │ • Mobility     │
       │   Monitoring   │                         │   Monitoring   │
       │ • Trust Engine │                         │ • Trust Engine │
       │ • MT-AGKM      │                         │ • MT-AGKM      │
       │ • GSK Cell Mgr │                         │ • GSK Cell Mgr │
       └───────┬────────┘                         └───────┬────────┘
               │                                          │
       ┌───────┼───────┐                          ┌───────┼────────┐
       │       │       │                          │       │        │
     V001    V002    V003                       V004    V005     V006
```

---

## 2. Core Entities

### 2.1 Trusted Authority (Cloud Tier)
- **Role:** Offline / semi-online authoritative root of trust.
- **Responsibilities:**
  - Vehicle registration and issuance of symmetric master credentials.
  - Generating cryptographically isolated pseudonyms (`ANON-XXXX...`).
  - Maintaining private mapping `Anonymous_ID <-> Vehicle_ID` for lawful interception / non-repudiation.
  - Real identities are **never transmitted** across open vehicular wireless channels.

### 2.2 Fog Nodes / Roadside Units (RSUs)
- **Role:** Localized edge computing nodes situated along arterial roadways (coverage radius: 400m).
- **Responsibilities:**
  - Generating fresh, non-replayable challenges with time-window validity.
  - Pairwise unicast session key derivation using HKDF-SHA256.
  - Multi-dimensional kinematic mobility tracking (distance to boundary, heading, dwell time).
  - Dynamic behavioral trust score calculation.
  - **MT-AGKM Decision Execution:** Deciding whether to **KEEP**, **PREPARE**, or **UPDATE** cell Group Session Keys.

### 2.3 On-Board Units (Vehicles)
- **Role:** Highly mobile nodes communicating via Vehicle-to-Infrastructure (V2I) and Vehicle-to-Vehicle (V2V).
- **Parameters:** Position $(x, y)$, speed $v$, heading $\theta$, acceleration $a$, trust score $T$, anonymous pseudonym $AID$, session key $SK$, group key version $GSK_v$.
