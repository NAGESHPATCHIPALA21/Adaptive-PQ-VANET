"""
Adaptive PQ-VANET - Phase 1 Prototype Execution Script
Demonstrates:
1. Vehicle creation
2. Registration with Trusted Authority (TA)
3. Anonymous ID (pseudonym) generation
4. Challenge-response mutual authentication
5. Unicast Session Key derivation (HKDF-SHA256)
6. Group Session Key (GSK) initial setup (v1)
7. Vehicle join triggering GSK rotation (v2) for Backward Security
"""

import sys
import os
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from backend.app.database import init_db, SessionLocal, engine, Base
from backend.app.models.rsu import RSU
from backend.app.services.registration_service import RegistrationService
from backend.app.services.authentication_service import AuthenticationService
from backend.app.services.session_service import SessionService
from backend.app.services.group_key_service import GroupKeyService
from backend.app.crypto.authentication import compute_auth_response

def run_phase1_demo():
    # Fresh database initialization for clean demo run
    Base.metadata.drop_all(bind=engine)
    init_db()
    db = SessionLocal()

    try:
        # Pre-seed default RSU-01
        rsu1 = RSU(
            rsu_id="RSU-01",
            name="CBIT Fog Node 01",
            position_x=500.0,
            position_y=500.0,
            coverage_radius=400.0,
            status="ACTIVE",
            current_gsk_version=0
        )
        db.add(rsu1)
        db.commit()

        print("==================================================")
        print("ADAPTIVE PQ-VANET")
        print("PHASE 1 PROTOTYPE")
        print("==================================================")
        print()

        # [1] Creating vehicle...
        vehicle_id = "V001"
        print("[1] Creating vehicle...")
        print(f"Vehicle ID: {vehicle_id}")
        print()

        # [2] Registering vehicle with Trusted Authority...
        print("[2] Registering vehicle with Trusted Authority...")
        reg_result = RegistrationService.register_vehicle(
            db=db,
            vehicle_id=vehicle_id,
            initial_rsu="RSU-01",
            position_x=120.0,
            position_y=200.0,
            speed=50.0
        )
        if not reg_result["success"]:
            print(f"Registration: FAILED ({reg_result['message']})")
            return
        print("Registration: SUCCESS")
        print()

        # [3] Anonymous identity generated...
        anon_id = reg_result["anonymous_id"]
        secret_cred = reg_result["secret_credential"]
        print("[3] Anonymous identity generated...")
        print(f"Anonymous ID: {anon_id}")
        print()

        # [4] Authentication...
        print("[4] Authentication...")
        # Step 4a: Vehicle enters RSU-01 coverage and requests challenge
        challenge_info = AuthenticationService.request_challenge(rsu_id="RSU-01")
        print("Challenge generated")

        # Step 4b: Vehicle computes response using its private credential
        vehicle_response = compute_auth_response(
            vehicle_secret=secret_cred,
            anonymous_id=anon_id,
            challenge_nonce=challenge_info["challenge_nonce"],
            timestamp=challenge_info["timestamp"]
        )

        # Step 4c: RSU verifies challenge response
        auth_result = AuthenticationService.authenticate_vehicle(
            db=db,
            anonymous_id=anon_id,
            challenge_nonce=challenge_info["challenge_nonce"],
            timestamp=challenge_info["timestamp"],
            response_signature=vehicle_response,
            rsu_id="RSU-01"
        )
        if auth_result["success"]:
            print("Authentication: SUCCESS")
        else:
            print(f"Authentication: FAILED ({auth_result['message']})")
            return
        print()

        # [5] Session key...
        print("[5] Session key...")
        session_result = SessionService.establish_session(
            db=db,
            vehicle_id=vehicle_id,
            rsu_id="RSU-01"
        )
        if session_result["success"]:
            print("Session established: SUCCESS")
        else:
            print(f"Session established: FAILED ({session_result['message']})")
            return
        print()

        # [6] Group Session Key...
        print("[6] Group Session Key...")
        gsk_v1 = GroupKeyService.generate_initial_gsk(db=db, rsu_id="RSU-01")
        print(f"GSK Version: {gsk_v1.version}")
        print()

        # [7] Vehicle joins group...
        print("[7] Vehicle joins group...")
        gsk_v2 = GroupKeyService.handle_vehicle_join(
            db=db,
            rsu_id="RSU-01",
            vehicle_id=vehicle_id
        )
        print(f"GSK Version: {gsk_v2.version}")
        print("Reason: VEHICLE_JOIN")
        print()

        print("==================================================")
        print("PHASE 1 COMPLETE")
        print("==================================================")

    finally:
        db.close()

if __name__ == "__main__":
    run_phase1_demo()
