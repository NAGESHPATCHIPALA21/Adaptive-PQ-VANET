"""
Integration Tests for Phase 4 REST API Endpoints
Uses FastAPI TestClient to verify end-to-end HTTP request handling.
"""

import pytest
import time
import random
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.database import init_db
from backend.app.crypto.authentication import compute_auth_response

@pytest.fixture(autouse=True)
def setup_db():
    init_db()

def test_api_root():
    with TestClient(app) as client:
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["project"] == "Adaptive PQ-VANET"
        assert data["status"] == "OPERATIONAL"

def test_dashboard_summary():
    with TestClient(app) as client:
        response = client.get("/api/dashboard/summary")
        assert response.status_code == 200
        data = response.json()
        assert "system_status" in data
        assert "kpis" in data
        assert "topology" in data
        assert "ML-KEM" in data["system_status"]["pq_security_mode"]
        assert isinstance(data["system_status"]["is_native_pq"], bool)

def test_vehicle_registration_and_auth_flow():
    with TestClient(app) as client:
        vid = f"V_API_{int(time.time() * 1000)}_{random.randint(100, 999)}"
        # 1. Register vehicle
        reg_resp = client.post("/api/vehicles/register", json={
            "vehicle_id": vid,
            "initial_rsu": "RSU-01",
            "position_x": 300.0,
            "position_y": 400.0,
            "speed": 55.0
        })
        assert reg_resp.status_code == 201
        reg_data = reg_resp.json()
        assert reg_data["success"] is True
        anon_id = reg_data["anonymous_id"]
        secret = reg_data["secret_credential"]

        # 2. Get challenge from RSU
        ch_resp = client.post("/api/auth/challenge", json={"rsu_id": "RSU-01"})
        assert ch_resp.status_code == 200
        ch_data = ch_resp.json()
        assert ch_data["success"] is True

        # 3. Calculate response and verify
        sig = compute_auth_response(
            vehicle_secret=secret,
            anonymous_id=anon_id,
            challenge_nonce=ch_data["challenge_nonce"],
            timestamp=ch_data["timestamp"]
        )
        auth_resp = client.post("/api/auth/verify", json={
            "anonymous_id": anon_id,
            "challenge_nonce": ch_data["challenge_nonce"],
            "timestamp": ch_data["timestamp"],
            "response_signature": sig,
            "rsu_id": "RSU-01"
        })
        assert auth_resp.status_code == 200
        assert auth_resp.json()["status"] == "AUTHENTICATED"

        # 4. Create Session
        sess_resp = client.post("/api/session/create", json={
            "vehicle_id": vid,
            "rsu_id": "RSU-01"
        })
        assert sess_resp.status_code == 200
        assert sess_resp.json()["status"] == "ACTIVE"

def test_mt_agkm_endpoint():
    with TestClient(app) as client:
        # Register a vehicle first
        vid = f"V_AGKM_{int(time.time() * 1000)}_{random.randint(100, 999)}"
        client.post("/api/vehicles/register", json={
            "vehicle_id": vid,
            "initial_rsu": "RSU-01",
            "position_x": 350.0,
            "position_y": 400.0,
            "speed": 35.0
        })

        resp = client.post("/api/mt-agkm/evaluate", json={
            "vehicle_id": vid,
            "rsu_id": "RSU-01"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["decision"] in ["KEEP", "PREPARE", "UPDATE"]
        assert len(data["reason"]) > 0

def test_benchmark_endpoint():
    with TestClient(app) as client:
        resp = client.post("/api/simulation/benchmark", json={"duration_steps": 10})
        assert resp.status_code == 200
        data = resp.json()
        assert "traditional_scheme" in data
        assert "proposed_mt_agkm" in data
