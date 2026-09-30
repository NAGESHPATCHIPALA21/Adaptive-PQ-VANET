# REST API Reference

The backend exposes a full RESTful API under prefix `/api` powered by FastAPI with interactive Swagger UI at `http://localhost:8000/docs`.

---

## Summary & Dashboard
- `GET /api/dashboard/summary`
  - Returns complete KPI counters, system status, active GSK version, connected RSUs, and vehicle telemetry.

---

## Vehicles & Identity
- `POST /api/vehicles/register`
  - Body: `{ vehicle_id, initial_rsu, position_x, position_y, speed }`
  - Registers vehicle with Trusted Authority and generates pseudonym (`ANON-XXXX`).
- `GET /api/vehicles`
  - Returns array of all registered vehicles with pseudonyms and trust ratings.
- `GET /api/vehicles/{id}`
  - Returns single vehicle state.
- `DELETE /api/vehicles/{id}`
  - Removes vehicle from registry.

---

## Authentication & Sessions
- `POST /api/auth/challenge`
  - Body: `{ rsu_id }`
  - Issues fresh 128-bit challenge nonce and timestamp token.
- `POST /api/auth/verify`
  - Body: `{ anonymous_id, challenge_nonce, timestamp, response_signature, rsu_id }`
  - Verifies challenge response and enforces replay protection.
- `POST /api/session/create`
  - Body: `{ vehicle_id, rsu_id, vehicle_nonce }`
  - Establishes pairwise 256-bit session key via HKDF-SHA256.

---

## MT-AGKM & Group Keys
- `POST /api/mt-agkm/evaluate`
  - Body: `{ vehicle_id, rsu_id, membership_event, security_event }`
  - Evaluates multi-dimensional state and returns `KEEP`, `PREPARE`, or `UPDATE` with explanation.
- `GET /api/mt-agkm/history`
  - Audit trail of past decisions.
- `GET /api/gsk/current?rsu_id=RSU-01`
  - Current active GSK version and member count.
- `POST /api/gsk/update`
  - Rotates GSK to next version.

---

## Simulation & Benchmarks
- `POST /api/simulation/start`
  - Initializes highway fleet.
- `POST /api/simulation/step`
  - Advances kinematics by 1 step.
- `POST /api/simulation/scenario`
  - Body: `{ scenario_id: 1..8 }`
  - Executes one of 8 explicit research scenarios.
- `POST /api/simulation/benchmark`
  - Body: `{ duration_steps: 40 }`
  - Runs empirical head-to-head comparison between Traditional and MT-AGKM schemes.
