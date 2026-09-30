/**
 * API Client for Adaptive PQ-VANET Backend
 * Connects to FastAPI on localhost:8000 with graceful fallback handling.
 */

const API_BASE = "http://127.0.0.1:8000/api";

export async function fetchDashboardSummary() {
  try {
    const res = await fetch(`${API_BASE}/dashboard/summary`);
    if (!res.ok) throw new Error("Backend response error");
    return await res.json();
  } catch (err) {
    console.warn("Backend not reachable, using localized state:", err);
    return null;
  }
}

export async function fetchVehicles() {
  const res = await fetch(`${API_BASE}/vehicles`);
  return await res.json();
}

export async function registerVehicle(data) {
  const res = await fetch(`${API_BASE}/vehicles/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return await res.json();
}

export async function requestChallenge(rsuId = "RSU-01") {
  const res = await fetch(`${API_BASE}/auth/challenge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rsu_id: rsuId })
  });
  return await res.json();
}

export async function verifyAuthentication(payload) {
  const res = await fetch(`${API_BASE}/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return await res.json();
}

export async function createSession(vehicleId, rsuId = "RSU-01") {
  const res = await fetch(`${API_BASE}/session/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vehicle_id: vehicleId, rsu_id: rsuId })
  });
  return await res.json();
}

export async function evaluateMTAGKM(vehicleId, rsuId = "RSU-01", membershipEvent = null, securityEvent = null) {
  const res = await fetch(`${API_BASE}/mt-agkm/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vehicle_id: vehicleId,
      rsu_id: rsuId,
      membership_event: membershipEvent,
      security_event: securityEvent
    })
  });
  return await res.json();
}

export async function recordTrustEvent(vehicleId, eventType, penalty = 0.25) {
  const res = await fetch(`${API_BASE}/trust/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vehicle_id: vehicleId,
      event_type: eventType,
      penalty: penalty
    })
  });
  return await res.json();
}

export async function updateKinematics(vehicleId, x, y, speed, direction) {
  const res = await fetch(`${API_BASE}/mobility/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vehicle_id: vehicleId,
      position_x: x,
      position_y: y,
      speed: speed,
      direction: direction
    })
  });
  return await res.json();
}

export async function runScenario(scenarioId) {
  const res = await fetch(`${API_BASE}/simulation/scenario`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario_id: scenarioId })
  });
  return await res.json();
}

export async function runBenchmark(steps = 40) {
  const res = await fetch(`${API_BASE}/simulation/benchmark`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ duration_steps: steps })
  });
  return await res.json();
}

export async function triggerSimulationStep() {
  const res = await fetch(`${API_BASE}/simulation/step`, {
    method: "POST"
  });
  return await res.json();
}

export async function resetSimulation() {
  const res = await fetch(`${API_BASE}/simulation/reset`, {
    method: "POST"
  });
  return await res.json();
}

export async function fetchBenchmarkResults() {
  const res = await fetch(`${API_BASE}/simulation/results`);
  if (!res.ok) throw new Error("Failed to fetch benchmark results");
  return await res.json();
}

