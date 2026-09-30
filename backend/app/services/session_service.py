"""
Session Key Management Service (Vehicle <-> RSU/Fog)
Implements:
1. Mutual post-authentication key establishment.
2. Genuine ML-KEM-768 (NIST FIPS 203) Key Encapsulation Mechanism (KEM)
   deriving a fresh 32-byte post-quantum shared secret.
3. HKDF-SHA256 (RFC 5869) key expansion binding:
   - Post-Quantum Shared Secret
   - Ephemeral Vehicle Nonce
   - Ephemeral RSU Nonce
   - Domain Context Identifier
4. Strict Security Rule: Raw session key material is retained exclusively in
   ephemeral volatile memory; only key identifiers, algorithm tags, and SHA-256
   fingerprints are persisted and exposed to API/UI.
"""

import time
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.models.vehicle import Vehicle
from backend.app.models.session import SessionKey
from backend.app.models.security_event import SecurityEvent
from backend.app.crypto.key_derivation import derive_key_hkdf
from backend.app.crypto.hashing import sha256_hash
from backend.app.crypto.random_source import SecureRandomSource
from backend.app.crypto.pq_interface import PQProviderRegistry

# Ephemeral runtime cache for raw keys during active demonstration session
# Purged upon service termination; never persisted to disk or sent across unauthenticated endpoints
_EPHEMERAL_SESSION_KEYS: Dict[str, str] = {}

class SessionService:
    """Handles V2I Pairwise Session Key establishment using ML-KEM and HKDF."""

    @staticmethod
    def establish_session(
        db: Session,
        vehicle_id: str,
        rsu_id: str = "RSU-01",
        vehicle_nonce: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Derives an authenticated post-quantum session key between vehicle and RSU.
        Requires vehicle to be in AUTHENTICATED state.
        """
        vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id).first()
        if not vehicle:
            return {"success": False, "message": f"Vehicle {vehicle_id} not found."}

        if vehicle.authentication_status != "AUTHENTICATED":
            return {
                "success": False,
                "message": f"Cannot establish session: vehicle {vehicle_id} is not authenticated (status: {vehicle.authentication_status})."
            }

        # 1. Generate fresh nonces
        v_nonce = vehicle_nonce or SecureRandomSource.get_nonce()
        r_nonce = SecureRandomSource.get_nonce()

        # 2. Post-Quantum Key Encapsulation (ML-KEM-768)
        kem = PQProviderRegistry.get_kem()
        kem_info = kem.get_algorithm_info()

        # RSU generates ephemeral ML-KEM keypair
        pk_rsu, sk_rsu = kem.generate_keypair()

        # Vehicle encapsulates to RSU's public key
        ciphertext, pq_shared_secret = kem.encapsulate(pk_rsu)

        # RSU decapsulates ciphertext with secret key
        recovered_pq_secret = kem.decapsulate(sk_rsu, ciphertext)

        # Sanity verification of KEM integrity
        if pq_shared_secret != recovered_pq_secret:
            return {"success": False, "message": "ML-KEM shared secret recovery mismatch."}

        # 3. Derive 256-bit Session Key via HKDF-SHA256
        # Combine PQ shared secret with authenticated credential material for hybrid defense
        combined_keying_material = pq_shared_secret + vehicle.secret_credential.encode('utf-8')
        combined_salt = f"{v_nonce}:{r_nonce}".encode('utf-8')
        context_info = f"VANET-V2I-MLKEM-SESSION-{vehicle_id}-{rsu_id}"

        raw_session_key_bytes = derive_key_hkdf(
            shared_secret=combined_keying_material,
            salt=combined_salt,
            info=context_info,
            length_bytes=32
        )
        raw_session_key_hex = raw_session_key_bytes.hex()

        # 4. Generate Metadata (never expose raw key)
        session_uuid = f"SESS-{SecureRandomSource.get_random_hex(6).upper()}"
        key_id = f"SK-{SecureRandomSource.get_random_hex(4).upper()}"
        fingerprint = sha256_hash(raw_session_key_hex)

        now = time.time()
        expires_at = now + settings.SESSION_KEY_LIFETIME_SECONDS

        # 5. Invalidate any prior active session for this vehicle-RSU pair
        db.query(SessionKey).filter(
            SessionKey.vehicle_id == vehicle_id,
            SessionKey.rsu_id == rsu_id,
            SessionKey.status == "ACTIVE"
        ).update({"status": "SUPERSEDED"})

        # 6. Persist session metadata
        new_session = SessionKey(
            session_id=session_uuid,
            key_id=key_id,
            vehicle_id=vehicle_id,
            rsu_id=rsu_id,
            key_fingerprint=fingerprint,
            key_length_bits=settings.KEY_LENGTH_BITS,
            established_at=now,
            expires_at=expires_at,
            status="ACTIVE"
        )
        db.add(new_session)

        # Update vehicle reference
        vehicle.session_key_id = key_id
        vehicle.last_seen = now

        # Ephemeral volatile storage
        _EPHEMERAL_SESSION_KEYS[key_id] = raw_session_key_hex

        # Security Audit Log
        evt = SecurityEvent(
            event_id=f"EVT-SESS-{SecureRandomSource.get_random_hex(6)}",
            event_type="SESSION_KEY_ESTABLISHED",
            severity="INFO",
            vehicle_id=vehicle_id,
            rsu_id=rsu_id,
            description=f"Session established via {kem_info['algorithm']}: Key ID {key_id}, length {settings.KEY_LENGTH_BITS}-bit",
            action_taken="SESSION_ACTIVE",
            timestamp=now
        )
        db.add(evt)
        db.commit()

        return {
            "success": True,
            "message": "Session Established",
            "session_id": session_uuid,
            "key_id": key_id,
            "key_length_bits": settings.KEY_LENGTH_BITS,
            "key_fingerprint": fingerprint,
            "key_establishment": kem_info["security_mode"],
            "is_native_pq": kem_info["is_native_pq"],
            "status": "ACTIVE",
            "vehicle_id": vehicle_id,
            "rsu_id": rsu_id,
            "expires_in_seconds": settings.SESSION_KEY_LIFETIME_SECONDS
        }

    @staticmethod
    def get_session(db: Session, session_id: str) -> Optional[Dict[str, Any]]:
        sess = db.query(SessionKey).filter(SessionKey.session_id == session_id).first()
        return sess.to_dict() if sess else None
