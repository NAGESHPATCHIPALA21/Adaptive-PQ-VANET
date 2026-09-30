"""
Mobility-Trust-Aware Adaptive Group Key Management (MT-AGKM) Decision Service
The central research contribution of Adaptive PQ-VANET.

Traditional group key management naively triggers re-keying for every membership or mobility fluctuation.
MT-AGKM evaluates multi-dimensional state (kinematic mobility, boundary proximity, behavioral trust,
security threats, and membership state) to output one of three decisions:

1. KEEP:
   Vehicle is stable and trusted. Existing GSK remains valid. Eliminates unnecessary key replacement.

2. PREPARE:
   Vehicle is approaching RSU boundary with high handover probability, but is currently benign.
   Prepares target RSU handover credentials and keys without disrupting current cell communication.

3. UPDATE:
   Vehicle joined, departed, fell below critical trust, or committed a security violation.
   Triggers immediate GSK rotation to enforce forward/backward security.
"""

import time
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.models.vehicle import Vehicle
from backend.app.models.mt_agkm import MTAGKMDecision
from backend.app.models.group_key import GroupSessionKey
from backend.app.services.mobility_service import MobilityService
from backend.app.services.trust_service import TrustService
from backend.app.services.group_key_service import GroupKeyService
from backend.app.crypto.random_source import SecureRandomSource

class MTAGKMService:
    """Core decision engine for Adaptive Group Key Management."""

    @staticmethod
    def evaluate(
        db: Session,
        vehicle_id: str,
        rsu_id: str = "RSU-01",
        membership_event: Optional[str] = None,  # "JOIN", "LEAVE", "REVOKE", or None
        security_event: Optional[str] = None,    # "REPLAY", "INVALID_AUTH", "MALFORMED_PACKET", or None
        event_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Evaluates vehicular state and returns (KEEP | PREPARE | UPDATE) with full explanation.
        """
        if event_type and not membership_event:
            membership_event = event_type
        vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id).first()
        if not vehicle:
            return {"success": False, "message": f"Vehicle {vehicle_id} not found."}

        # 1. Fetch current active GSK
        current_gsk = GroupKeyService.get_current_gsk(db, rsu_id)
        current_gsk_version = current_gsk.version if current_gsk else 1

        # 2. Mobility Evaluation
        mob_eval = MobilityService.evaluate_mobility(db, vehicle_id, rsu_id)
        mobility_score = mob_eval.get("mobility_score", 0.0)
        handover_prob = mob_eval.get("handover_probability", 0.0)

        # 3. Trust Evaluation
        trust_score = vehicle.trust_score
        has_security_event = security_event is not None or vehicle.vehicle_status in ["SUSPICIOUS", "REVOKED"]

        decision: str = "KEEP"
        reason: str = ""
        action_required: str = "NONE"
        new_gsk_version = current_gsk_version

        # 4. MT-AGKM Multi-Branch Decision Logic
        if has_security_event:
            decision = "UPDATE"
            sec_detail = security_event or "Observed anomalous / suspicious activity"
            reason = (
                f"Critical security threat detected: {sec_detail}. "
                f"Vehicle trust score degraded to {trust_score:.2f}. "
                f"Immediate group key rotation required to isolate vehicle and protect cell."
            )
            action_required = "ROTATE_GSK_ISOLATE_VEHICLE"

        elif trust_score < settings.TRUST_CRITICAL_THRESHOLD:
            decision = "UPDATE"
            reason = (
                f"Vehicle {vehicle_id} trust score ({trust_score:.2f}) dropped below critical threshold "
                f"({settings.TRUST_CRITICAL_THRESHOLD}). Immediate group key rotation required for containment."
            )
            action_required = "ROTATE_GSK_REMOVE_VEHICLE"

        elif membership_event in ["LEAVE", "REVOKE"]:
            decision = "UPDATE"
            reason = (
                f"Vehicle membership departure detected ({membership_event}). "
                f"GSK rotation required to enforce FORWARD SECURITY (prevent departed vehicle from reading future traffic)."
            )
            action_required = "ROTATE_GSK_FORWARD_SECURITY"

        elif membership_event == "JOIN":
            decision = "UPDATE"
            reason = (
                f"New vehicle {vehicle_id} joined cell group. "
                f"GSK rotation required to enforce BACKWARD SECURITY (prevent new joiner from decrypting prior traffic)."
            )
            action_required = "ROTATE_GSK_BACKWARD_SECURITY"

        elif mobility_score >= settings.MOBILITY_HIGH_THRESHOLD or handover_prob >= 0.70:
            decision = "PREPARE"
            reason = (
                f"Vehicle {vehicle_id} has high handover probability ({handover_prob:.2f}) "
                f"and elevated mobility score ({mobility_score:.2f}) approaching RSU boundary. "
                f"Target cell handover credentials prepared; immediate GSK rotation deferred to preserve network bandwidth."
            )
            action_required = "PREPARE_HANDOVER_TICKETS"

        else:
            decision = "KEEP"
            reason = (
                f"Vehicle {vehicle_id} is stable (mobility: {mobility_score:.2f}) and highly trusted (trust: {trust_score:.2f}). "
                f"No security incidents or membership departures detected. Existing group key (v{current_gsk_version}) retained."
            )
            action_required = "MAINTAIN_EXISTING_GSK"

        # 5. Execute action if UPDATE is dictated
        if decision == "UPDATE":
            if membership_event == "JOIN":
                updated_gsk = GroupKeyService.handle_vehicle_join(db, rsu_id, vehicle_id)
                new_gsk_version = updated_gsk.version
            elif membership_event in ["LEAVE", "REVOKE"] or has_security_event or trust_score < settings.TRUST_CRITICAL_THRESHOLD:
                if has_security_event or trust_score < settings.TRUST_CRITICAL_THRESHOLD:
                    updated_gsk = GroupKeyService.revoke_vehicle(db, rsu_id, vehicle_id, reason=reason)
                else:
                    updated_gsk = GroupKeyService.handle_vehicle_leave(db, rsu_id, vehicle_id, reason=reason)
                new_gsk_version = updated_gsk.version

        # 6. Audit Trail Recording
        decision_rec = MTAGKMDecision(
            decision_id=f"DEC-{SecureRandomSource.get_random_hex(6).upper()}",
            rsu_id=rsu_id,
            vehicle_id=vehicle_id,
            decision=decision,
            reason=reason,
            trust_score=trust_score,
            mobility_score=mobility_score,
            handover_probability=handover_prob,
            security_event_detected="YES" if has_security_event else "NO",
            membership_change="YES" if membership_event else "NO",
            gsk_version_before=current_gsk_version,
            gsk_version_after=new_gsk_version,
            timestamp=time.time()
        )
        db.add(decision_rec)
        db.commit()

        return {
            "success": True,
            "decision_id": decision_rec.decision_id,
            "vehicle_id": vehicle_id,
            "rsu_id": rsu_id,
            "current_rsu": rsu_id,
            "decision": decision,
            "reason": reason,
            "action": action_required,
            "action_required": action_required,
            "recommended_action": action_required,
            "trust_score": round(trust_score, 3),
            "mobility_score": round(mobility_score, 3),
            "handover_probability": round(handover_prob, 3),
            "gsk_version_before": current_gsk_version,
            "gsk_version_after": new_gsk_version,
            "gsk_changed": (new_gsk_version != current_gsk_version),
            "timestamp": decision_rec.timestamp
        }

    @staticmethod
    def get_decision_history(db: Session, limit: int = 25) -> List[Dict[str, Any]]:
        decisions = db.query(MTAGKMDecision).order_by(MTAGKMDecision.timestamp.desc()).limit(limit).all()
        return [d.to_dict() for d in decisions]
