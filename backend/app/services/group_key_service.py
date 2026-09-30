"""
Group Session Key (GSK) Management Service (Fog / RSU Layer)
Implements:
1. Initial generation of Group Session Key for an RSU cell (GSK v1).
2. Backward Security: Rotating GSK when a new vehicle joins so past messages cannot be decrypted.
3. Forward Security: Rotating GSK when a vehicle departs or is revoked so future messages cannot be decrypted.
4. Membership tracking, key version history, and cryptographic rotation logging.
"""

import time
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.models.group_key import GroupSessionKey
from backend.app.models.vehicle import Vehicle
from backend.app.models.security_event import SecurityEvent
from backend.app.crypto.random_source import SecureRandomSource
from backend.app.crypto.hashing import sha256_hash

# Ephemeral runtime cache for raw group keys (never exposed directly via API/UI)
_EPHEMERAL_GROUP_KEYS: Dict[str, str] = {}

class GroupKeyService:
    """Manages Group Session Keys across RSU Fog coverage zones."""

    @staticmethod
    def get_current_gsk(db: Session, rsu_id: str = "RSU-01") -> Optional[GroupSessionKey]:
        """Fetches current ACTIVE Group Session Key for the given RSU."""
        return db.query(GroupSessionKey).filter(
            GroupSessionKey.rsu_id == rsu_id,
            GroupSessionKey.status == "ACTIVE"
        ).order_by(GroupSessionKey.version.desc()).first()

    @staticmethod
    def generate_initial_gsk(db: Session, rsu_id: str = "RSU-01") -> GroupSessionKey:
        """Generates initial GSK version 1 for an RSU cell."""
        existing = GroupKeyService.get_current_gsk(db, rsu_id)
        if existing:
            return existing

        raw_key = SecureRandomSource.get_random_hex(32)  # 256-bit secure randomness
        gsk_id = f"GSK-{rsu_id}-V1-{SecureRandomSource.get_random_hex(4).upper()}"
        fingerprint = sha256_hash(raw_key)

        now = time.time()
        gsk = GroupSessionKey(
            gsk_id=gsk_id,
            rsu_id=rsu_id,
            version=1,
            key_fingerprint=fingerprint,
            member_count=0,
            authorized_members="[]",
            update_reason="INITIAL_CELL_SETUP",
            previous_version=None,
            created_at=now,
            expires_at=now + settings.GSK_DEFAULT_LIFETIME_SECONDS,
            status="ACTIVE"
        )
        db.add(gsk)
        _EPHEMERAL_GROUP_KEYS[gsk_id] = raw_key

        evt = SecurityEvent(
            event_id=f"EVT-GSK-{SecureRandomSource.get_random_hex(6)}",
            event_type="GROUP_KEY_INITIALIZED",
            severity="INFO",
            rsu_id=rsu_id,
            description=f"Initial Group Session Key generated: {gsk_id} (v1)",
            action_taken="GSK_V1_ACTIVE",
            timestamp=now
        )
        db.add(evt)
        db.commit()
        db.refresh(gsk)
        return gsk

    @staticmethod
    def update_gsk(
        db: Session,
        rsu_id: str,
        reason: str,
        active_members: List[str]
    ) -> GroupSessionKey:
        """
        Rotates GSK to next version. Invalidates previous active key.
        Enforces forward and backward security boundaries.
        """
        current_gsk = GroupKeyService.get_current_gsk(db, rsu_id)
        prev_version = current_gsk.version if current_gsk else 0
        new_version = prev_version + 1

        now = time.time()

        # Invalidate old active key
        if current_gsk:
            current_gsk.status = "SUPERSEDED"

        # Generate fresh 256-bit key material
        raw_key = SecureRandomSource.get_random_hex(32)
        gsk_id = f"GSK-{rsu_id}-V{new_version}-{SecureRandomSource.get_random_hex(4).upper()}"
        fingerprint = sha256_hash(raw_key)

        new_gsk = GroupSessionKey(
            gsk_id=gsk_id,
            rsu_id=rsu_id,
            version=new_version,
            key_fingerprint=fingerprint,
            update_reason=reason,
            previous_version=prev_version if prev_version > 0 else None,
            created_at=now,
            expires_at=now + settings.GSK_DEFAULT_LIFETIME_SECONDS,
            status="ACTIVE"
        )
        new_gsk.set_authorized_members_list(active_members)
        db.add(new_gsk)

        # Update vehicles group_key_version
        db.query(Vehicle).filter(Vehicle.vehicle_id.in_(active_members)).update(
            {"group_key_version": new_version},
            synchronize_session=False
        )

        _EPHEMERAL_GROUP_KEYS[gsk_id] = raw_key

        evt = SecurityEvent(
            event_id=f"EVT-GSK-{SecureRandomSource.get_random_hex(6)}",
            event_type="GROUP_KEY_UPDATE",
            severity="INFO",
            rsu_id=rsu_id,
            description=f"GSK rotated v{prev_version} -> v{new_version} | Reason: {reason} | Members: {len(active_members)}",
            action_taken=f"GSK_V{new_version}_DEPLOYED",
            timestamp=now
        )
        db.add(evt)
        db.commit()
        db.refresh(new_gsk)
        return new_gsk

    @staticmethod
    def handle_vehicle_join(db: Session, rsu_id: str, vehicle_id: str) -> GroupSessionKey:
        """
        Vehicle joins RSU group communication.
        Triggers GSK update ensuring BACKWARD SECURITY (new vehicle cannot read prior transmissions).
        """
        current_gsk = GroupKeyService.get_current_gsk(db, rsu_id)
        current_members = current_gsk.get_authorized_members_list() if current_gsk else []

        if vehicle_id not in current_members:
            current_members.append(vehicle_id)

        return GroupKeyService.update_gsk(
            db=db,
            rsu_id=rsu_id,
            reason=f"VEHICLE_JOIN: {vehicle_id}",
            active_members=current_members
        )

    @staticmethod
    def handle_vehicle_leave(db: Session, rsu_id: str, vehicle_id: str, reason: str = "VEHICLE_LEAVE") -> GroupSessionKey:
        """
        Vehicle departs RSU boundary or disconnects.
        Triggers GSK update ensuring FORWARD SECURITY (departed vehicle cannot read future transmissions).
        """
        current_gsk = GroupKeyService.get_current_gsk(db, rsu_id)
        current_members = current_gsk.get_authorized_members_list() if current_gsk else []

        if vehicle_id in current_members:
            current_members.remove(vehicle_id)

        # Invalidate vehicle's group key version
        veh = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id).first()
        if veh:
            veh.group_key_version = 0

        return GroupKeyService.update_gsk(
            db=db,
            rsu_id=rsu_id,
            reason=f"{reason}: {vehicle_id}",
            active_members=current_members
        )

    @staticmethod
    def revoke_vehicle(db: Session, rsu_id: str, vehicle_id: str, reason: str = "SECURITY_REVOCATION") -> GroupSessionKey:
        """
        Immediate emergency revocation of a suspicious or compromised vehicle.
        Triggers forward security re-keying and sets vehicle status to REVOKED.
        """
        veh = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id).first()
        if veh:
            veh.vehicle_status = "REVOKED"
            veh.authentication_status = "REJECTED"
            veh.trust_score = 0.0

        sec_evt = SecurityEvent(
            event_id=f"EVT-REV-{SecureRandomSource.get_random_hex(6)}",
            event_type="VEHICLE_REVOKED",
            severity="CRITICAL",
            vehicle_id=vehicle_id,
            rsu_id=rsu_id,
            description=f"Vehicle {vehicle_id} permanently REVOKED due to {reason}",
            action_taken="ISOLATED_AND_REKEYED",
            timestamp=time.time()
        )
        db.add(sec_evt)

        return GroupKeyService.handle_vehicle_leave(
            db=db,
            rsu_id=rsu_id,
            vehicle_id=vehicle_id,
            reason=f"REVOKED: {reason}"
        )

    @staticmethod
    def get_gsk_history(db: Session, rsu_id: str = "RSU-01", limit: int = 20) -> List[Dict[str, Any]]:
        records = db.query(GroupSessionKey).filter(
            GroupSessionKey.rsu_id == rsu_id
        ).order_by(GroupSessionKey.version.desc()).limit(limit).all()
        return [record.to_dict() for record in records]
