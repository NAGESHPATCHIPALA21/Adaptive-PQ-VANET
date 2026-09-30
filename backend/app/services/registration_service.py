"""
Vehicle Registration Service (Trusted Authority / Cloud Layer)
Implements:
1. Registration of vehicles by the Trusted Authority (TA).
2. Generation of anonymous identities (pseudonyms) preventing real ID exposure in VANET broadcast messages.
3. Cryptographic credential generation.
4. Secure mapping storage (anonymous_id <-> vehicle_id).
"""

import time
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.models.vehicle import Vehicle
from backend.app.models.security_event import SecurityEvent
from backend.app.crypto.authentication import generate_anonymous_id
from backend.app.crypto.random_source import SecureRandomSource
from backend.app.crypto.hashing import sha256_hash

class RegistrationService:
    """Handles vehicle identity lifecycle at the Trusted Authority."""

    @staticmethod
    def register_vehicle(
        db: Session,
        vehicle_id: str,
        initial_rsu: str = "RSU-01",
        position_x: float = 100.0,
        position_y: float = 100.0,
        speed: float = 45.0
    ) -> Dict[str, Any]:
        """
        Registers a vehicle with the TA.
        Generates pseudonym and returns credential package.
        """
        # Check if already registered
        existing = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id).first()
        if existing:
            return {
                "success": False,
                "message": f"Vehicle {vehicle_id} is already registered.",
                "vehicle": existing.to_dict(include_secret=False)
            }

        # 1. Generate anonymous ID using TA master secret
        anon_id, nonce, ts = generate_anonymous_id(
            ta_master_key=settings.TA_MASTER_SECRET,
            vehicle_id=vehicle_id
        )

        # 2. Generate secret credential for mutual authentication
        vehicle_secret = SecureRandomSource.get_random_hex(24)

        # 3. Create vehicle database record
        new_vehicle = Vehicle(
            vehicle_id=vehicle_id,
            anonymous_id=anon_id,
            secret_credential=vehicle_secret,
            current_rsu=initial_rsu,
            position_x=position_x,
            position_y=position_y,
            speed=speed,
            acceleration=0.0,
            direction=90.0,
            handover_probability=0.0,
            trust_score=1.0,
            behavior_score=1.0,
            authentication_status="UNAUTHENTICATED",
            vehicle_status="REGISTERED",
            registered_at=time.time(),
            last_seen=time.time()
        )
        db.add(new_vehicle)

        # 4. Log registration audit event
        audit_event = SecurityEvent(
            event_id=f"EVT-REG-{SecureRandomSource.get_random_hex(6)}",
            event_type="VEHICLE_REGISTRATION",
            severity="INFO",
            vehicle_id=vehicle_id,
            rsu_id=initial_rsu,
            description=f"Vehicle {vehicle_id} registered with pseudonym {anon_id}",
            action_taken="CREDENTIAL_ISSUED",
            timestamp=time.time()
        )
        db.add(audit_event)
        db.commit()
        db.refresh(new_vehicle)

        return {
            "success": True,
            "message": "Vehicle registered successfully with Trusted Authority",
            "vehicle_id": vehicle_id,
            "anonymous_id": anon_id,
            "secret_credential": vehicle_secret,  # Provided securely only upon registration return
            "current_rsu": initial_rsu,
            "status": new_vehicle.vehicle_status
        }

    @staticmethod
    def resolve_anonymous_id(db: Session, anonymous_id: str) -> Optional[Vehicle]:
        """
        Only the authorized Trusted Authority can de-anonymize a vehicle if required by security audit.
        Normal RSU and vehicle entities communicate solely using anonymous_id.
        """
        return db.query(Vehicle).filter(Vehicle.anonymous_id == anonymous_id).first()
