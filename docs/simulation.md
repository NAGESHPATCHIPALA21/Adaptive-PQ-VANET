# Simulation & Empirical Evaluation Engine

## 1. Arterial Highway Topology
The simulation models a 2.6 km arterial roadway serviced by 4 Roadside Units / Fog Nodes:
- **RSU-01 (West Gateway):** $(x = 400\text{m}, y = 400\text{m})$
- **RSU-02 (Central Hub):** $(x = 1000\text{m}, y = 400\text{m})$
- **RSU-03 (Tech Corridor):** $(x = 1600\text{m}, y = 400\text{m})$
- **RSU-04 (East Terminal):** $(x = 2200\text{m}, y = 400\text{m})$

Coverage radius for each RSU: $R = 400\text{m}$ (with overlapping handover zones).

---

## 2. Predefined Research Scenarios

- **Scenario 1 (Normal Stable Traffic):** Vehicle cruising in central cell zone. Expected decision: `KEEP`.
- **Scenario 2 (Boundary Proximity):** Vehicle approaching cell perimeter with high speed. Expected decision: `PREPARE` (prepares handover ticket, defers re-keying).
- **Scenario 3 (Cell Departure):** Vehicle departs coverage cell. Expected decision: `UPDATE` (enforces forward security).
- **Scenario 4 (Suspicious Threat Injection):** Injects challenge replay and beacon flooding. Expected decision: `UPDATE` (isolates malicious node).
- **Scenario 5 (Low Trust Containment):** Trust score degrades below critical threshold (0.40). Expected decision: `UPDATE`.
- **Scenario 6 (New Member Admission):** New vehicle joins cell group. Expected decision: `UPDATE` (enforces backward security).
- **Scenario 7 (High-Density Normal Traffic):** Multiple vehicles cruising simultaneously. Expected decision: `KEEP`.
- **Scenario 8 (High Mobility Trusted Vehicle):** Demonstrates the central research advantage: even under elevated speed, trusted vehicles generate `PREPARE` rather than triggering disruptive group re-keying.
