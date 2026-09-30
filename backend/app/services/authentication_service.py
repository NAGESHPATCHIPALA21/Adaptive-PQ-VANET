"""
Authentication Service (RSU / Fog Layer)
Handles challenge-response mutual verification, replay mitigation, and authentication status updates.
"""

import time
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session

from backend.app.models.vehicle import Vehicle
from backend.app.models.security_event import SecurityEvent
from backend.app.crypto.authentication import (
    create_auth_challenge,
    compute_auth_response,
    verify_auth_response
)
from backend.app.crypto.random_source import SecureRandomSource

class AuthenticationService:
    """Manages challenge-response authentication protocol at the Fog / RSU."""

    @staticmethod
    def request_challenge(rsu_id: str) -> Dict[str, Any]:
        """Vehicle requests fresh challenge from RSU before transmitting credentials."""
        challenge = create_auth_challenge(rsu_id)
        return {
            "success": True,
            "rsu_id": challenge["rsu_id"],
            "challenge_nonce": challenge["challenge_nonce"],
            "timestamp": challenge["timestamp"],
            "challenge_token": challenge["challenge_token"]
        }

    @staticmethod
    def authenticate_vehicle(
        db: Session,
        anonymous_id: str,
        challenge_nonce: str,
        timestamp: float,
        response_signature: str,
        rsu_id: str = "RSU-01"
    ) -> Dict[str, Any]:
        """
        RSU/Fog verifies the vehicle response using TA/RSU secure shared lookup.
        """
        # 1. Lookup vehicle by anonymous identity
        vehicle = db.query(Vehicle).filter(Vehicle.anonymous_id == anonymous_id).first()
        if not vehicle:
            # Unknown pseudonym attempt
            sec_event = SecurityEvent(
                event_id=f"EVT-AUTH-{SecureRandomSource.get_random_hex(6)}",
                event_type="UNAUTHORIZED_VEHICLE",
                severity="CRITICAL",
                vehicle_id=None,
                rsu_id=rsu_id,
                description=f"Authentication attempted with unknown pseudonym: {anonymous_id}",
                action_taken="REJECTED",
                timestamp=time.time()
            )
            db.add(sec_event)
            db.commit()
            return {
                "success": False,
                "status": "REJECTED",
                "message": "Anonymous identity not found or unregistered."
            }

        # Check if already revoked
        if vehicle.vehicle_status == "REVOKED":
            sec_event = SecurityEvent(
                event_id=f"EVT-AUTH-{SecureRandomSource.get_random_hex(6)}",
                event_type="REVOKED_ACCESS_ATTEMPT",
                severity="CRITICAL",
                vehicle_id=vehicle.vehicle_id,
                rsu_id=rsu_id,
                description=f"Revoked vehicle {vehicle.vehicle_id} ({anonymous_id}) attempted authentication",
                action_taken="BLOCKED",
                timestamp=time.time()
            )
            db.add(sec_event)
            db.commit()
            return {
                "success": False,
                "status": "REJECTED",
                "message": f"Vehicle {vehicle.vehicle_id} is permanently REVOKED."
            }

        # 2. Cryptographic verification (checks freshness, replay, HMAC)
        is_valid, reason = verify_auth_response(
            vehicle_secret=vehicle.secret_credential,
            anonymous_id=anonymous_id,
            challenge_nonce=challenge_nonce,
            timestamp=timestamp,
            response=response_signature
        )

        if not is_valid:
            vehicle.authentication_status = "REJECTED"
            # Degrade trust on failed authentication
            vehicle.trust_score = max(0.0, vehicle.trust_score - 0.20)
            
            event_type = "REPLAY_ATTEMPT" if "Replay" in reason else "FAILED_AUTH"
            sec_event = SecurityEvent(
                event_id=f"EVT-AUTH-{SecureRandomSource.get_random_hex(6)}",
                event_type=event_type,
                severity="WARNING" if event_type == "FAILED_AUTH" else "CRITICAL",
                vehicle_id=vehicle.vehicle_id,
                rsu_id=rsu_id,
                description=f"Auth failure for {vehicle.vehicle_id}: {reason}",
                action_taken="AUTHENTICATION_REJECTED",
                timestamp=time.time()
            )
            db.add(sec_event)
            db.commit()
            return {
                "success": False,
                "status": "REJECTED",
                "message": reason,
                "vehicle_id": vehicle.vehicle_id,
                "trust_score": round(vehicle.trust_score, 3)
            }

        # 3. Successful authentication
        vehicle.authentication_status = "AUTHENTICATED"
        vehicle.current_rsu = rsu_id
        vehicle.last_seen = time.time()
        
        # Log successful authentication
        sec_event = SecurityEvent(
            event_id=f"EVT-AUTH-{SecureRandomSource.get_random_hex(6)}",
            event_type="AUTHENTICATION_SUCCESS",
            severity="INFO",
            vehicle_id=vehicle.vehicle_id,
            rsu_id=rsu_id,
            description=f"Vehicle {vehicle.vehicle_id} ({anonymous_id}) authenticated successfully at {rsu_id}",
            action_taken="SESSION_INIT_PERMITTED",
            timestamp=time.time()
        )
        db.add(sec_event)
        db.commit()

        return {
            "success": True,
            "status": "AUTHENTICATED",
            "message": "Authentication successful",
            "vehicle_id": vehicle.vehicle_id,
            "anonymous_id": vehicle.anonymous_id,
            "current_rsu": rsu_id
        }
