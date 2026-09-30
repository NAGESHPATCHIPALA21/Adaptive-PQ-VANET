"""
Behavioral Trust Evaluation Service
Academic Label: Prototype Behavioral Trust Model (Simulation-Based)

Calculates dynamic vehicular trust scores based on:
1. Authentication reliability (successes vs failures)
2. Communication consistency (valid messages, forwarding)
3. Protocol compliance
4. Suspicious security events (replays, abnormal frequency, malformed packets)

Formula:
  trust_score = (w_auth * auth_success_rate)
              + (w_comm * comm_consistency)
              + (w_proto * protocol_compliance)
              - (w_susp * suspicious_factor)
              - (w_fail * failure_penalty)

Normalized to [0.0, 1.0].
"""

import time
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.models.vehicle import Vehicle
from backend.app.models.trust import TrustRecord
from backend.app.models.security_event import SecurityEvent
from backend.app.crypto.random_source import SecureRandomSource

class TrustService:
    """Computes behavioral trust ratings and maintains temporal audit trail."""

    # Configurable Model Weights
    WEIGHT_AUTH = 0.30
    WEIGHT_COMM = 0.25
    WEIGHT_PROTO = 0.20
    WEIGHT_SUSP = 0.15
    WEIGHT_FAIL = 0.10

    @staticmethod
    def record_behavior_event(
        db: Session,
        vehicle_id: str,
        event_type: str,
        details: str = "",
        penalty: float = 0.0,
        rsu_id: str = "RSU-01"
    ) -> Dict[str, Any]:
        """
        Records an observable network event (e.g. replay attempt, malformed message)
        and adjusts behavioral score accordingly.
        """
        vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id).first()
        if not vehicle:
            return {"success": False, "message": f"Vehicle {vehicle_id} not found"}

        # Apply behavioral penalty
        if penalty > 0:
            vehicle.behavior_score = max(0.0, vehicle.behavior_score - penalty)
            vehicle.trust_score = max(0.0, vehicle.trust_score - penalty)

        # Update vehicle status if below critical thresholds
        if vehicle.trust_score < settings.TRUST_CRITICAL_THRESHOLD:
            vehicle.vehicle_status = "SUSPICIOUS"
        elif vehicle.trust_score < settings.TRUST_WARNING_THRESHOLD:
            vehicle.vehicle_status = "WARNING"

        # Record security event
        severity = "CRITICAL" if penalty >= 0.25 else ("WARNING" if penalty >= 0.10 else "INFO")
        sec_evt = SecurityEvent(
            event_id=f"EVT-BEH-{SecureRandomSource.get_random_hex(6)}",
            event_type=event_type,
            severity=severity,
            vehicle_id=vehicle_id,
            rsu_id=rsu_id,
            description=f"Behavioral event: {event_type} | {details} | Penalty: -{penalty:.2f}",
            action_taken=f"TRUST_ADJUSTED_TO_{vehicle.trust_score:.2f}",
            timestamp=time.time()
        )
        db.add(sec_evt)

        # Store trust record snapshot
        trust_rec = TrustRecord(
            record_id=f"TR-{SecureRandomSource.get_random_hex(6)}",
            vehicle_id=vehicle_id,
            trust_score=vehicle.trust_score,
            behavior_score=vehicle.behavior_score,
            event_trigger=event_type,
            timestamp=time.time()
        )
        db.add(trust_rec)
        db.commit()

        return {
            "success": True,
            "vehicle_id": vehicle_id,
            "current_trust": round(vehicle.trust_score, 3),
            "behavior_score": round(vehicle.behavior_score, 3),
            "status": vehicle.vehicle_status,
            "penalty_applied": penalty
        }

    @staticmethod
    def evaluate_trust(db: Session, vehicle_id: str) -> Dict[str, Any]:
        """
        Evaluates current trust profile of a vehicle, factoring historical audit events.
        """
        vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id).first()
        if not vehicle:
            return {"success": False, "message": f"Vehicle {vehicle_id} not found"}

        # Query recent events associated with this vehicle
        events = db.query(SecurityEvent).filter(
            SecurityEvent.vehicle_id == vehicle_id
        ).order_by(SecurityEvent.timestamp.desc()).limit(15).all()

        suspicious_count = sum(1 for e in events if e.severity in ["WARNING", "CRITICAL"])
        failed_auth_count = sum(1 for e in events if e.event_type in ["FAILED_AUTH", "REPLAY_ATTEMPT"])

        # Determine risk tier
        if vehicle.trust_score < settings.TRUST_CRITICAL_THRESHOLD:
            risk_level = "CRITICAL"
            recommended_action = "ISOLATE_AND_REVOKE"
        elif vehicle.trust_score < settings.TRUST_WARNING_THRESHOLD:
            risk_level = "WARNING"
            recommended_action = "MONITOR_CLOSELY"
        else:
            risk_level = "NORMAL"
            recommended_action = "PERMIT_GROUP_COMMUNICATION"

        return {
            "success": True,
            "vehicle_id": vehicle_id,
            "trust_score": round(vehicle.trust_score, 3),
            "behavior_score": round(vehicle.behavior_score, 3),
            "risk_level": risk_level,
            "suspicious_events_count": suspicious_count,
            "failed_auth_count": failed_auth_count,
            "recommended_action": recommended_action,
            "model_version": "Prototype Behavioral Trust Model v1.0"
        }

    @staticmethod
    def get_trust_history(db: Session, vehicle_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        records = db.query(TrustRecord).filter(
            TrustRecord.vehicle_id == vehicle_id
        ).order_by(TrustRecord.timestamp.desc()).limit(limit).all()
        return [r.to_dict() for r in records]
