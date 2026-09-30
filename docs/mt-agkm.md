# Mobility–Trust-Aware Adaptive Group Key Management (MT-AGKM)

## 1. Research Motivation & Core Contribution
In traditional VANET group key schemes, any vehicle boundary fluctuation or membership change indiscriminately triggers an expensive cell-wide re-keying broadcast. This introduces:
- Heavy communication overhead (multicast/broadcast flooding).
- Unnecessary cryptographic computational load on resource-constrained OBUs and RSUs.
- Handover latency spikes.

**MT-AGKM Core Proposal:** Instead of naive binary re-keying, the Fog/RSU evaluates multi-dimensional state (kinematic mobility, boundary proximity, behavioral trust, security threats, and membership state) to output one of three adaptive decisions:

```
               ┌───────────────────────────────┐
               │         MT-AGKM Engine        │
               │                               │
               │ Inputs:                       │
               │ • Mobility Score (M_i)        │
               │ • Trust Score (T_i)           │
               │ • Handover Probability (H_i)  │
               │ • Security Threat Trigger     │
               │ • Membership Event (Join/Leave│
               └──────────────┬────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
    ┌─────▼─────┐       ┌─────▼─────┐       ┌─────▼─────┐
    │   KEEP    │       │  PREPARE  │       │  UPDATE   │
    └───────────┘       └───────────┘       └───────────┘
```

---

## 2. Decision Logic Matrix

| Condition | Decision | Explanation | Action Taken |
| :--- | :---: | :--- | :--- |
| **Security Threat / Suspicious Activity** | `UPDATE` | Replay attack, bogus flooding, or protocol violation detected. | Immediate GSK rotation; vehicle isolated. |
| **Critical Trust Degradation ($T_i < 0.40$)** | `UPDATE` | Vehicle trust degraded below critical containment threshold. | Vehicle revoked; cell re-keyed. |
| **Vehicle Membership Departure (`LEAVE`)** | `UPDATE` | Vehicle crossed cell boundary or disconnected. | Enforce Forward Security; new GSK generated. |
| **Vehicle Membership Admission (`JOIN`)** | `UPDATE` | New vehicle authenticated and joining cell. | Enforce Backward Security; new GSK generated. |
| **High Mobility ($M_i \ge 0.75$ or $H_i \ge 0.70$)** | `PREPARE` | Vehicle approaching cell boundary with high probability of handover, but is benign. | Prepare target cell handover ticket; **no immediate GSK update!** |
| **Stable Cruise ($M_i < 0.75$ and $T_i \ge 0.65$)** | `KEEP` | Vehicle is stable and trusted. No security incident. | Existing GSK preserved; zero overhead introduced. |

---

## 3. Algorithm Specification

```python
Input: vehicle_id, rsu_id, mobility_state, trust_state, membership_event, security_event

1. current_gsk = get_current_gsk(rsu_id)
2. if security_event is not None:
3.     return Decision(verdict="UPDATE", reason="Security threat detected: " + security_event)
4. elif trust_state.trust_score < TRUST_CRITICAL_THRESHOLD:
5.     return Decision(verdict="UPDATE", reason="Critical trust degradation below 0.40")
6. elif membership_event in ["LEAVE", "REVOKE"]:
7.     return Decision(verdict="UPDATE", reason="Forward security: vehicle departure")
8. elif membership_event == "JOIN":
9.     return Decision(verdict="UPDATE", reason="Backward security: new member joined")
10. elif mobility_state.mobility_score >= MOBILITY_HIGH_THRESHOLD or mobility_state.handover_prob >= 0.70:
11.    return Decision(verdict="PREPARE", reason="Boundary proximity: prepare handover credentials without rekey")
12. else:
13.    return Decision(verdict="KEEP", reason="Vehicle is stable and trusted; existing GSK retained")
```
