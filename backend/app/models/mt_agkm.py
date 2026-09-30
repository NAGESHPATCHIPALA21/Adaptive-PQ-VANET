"""
MT-AGKM Decision Audit Model
Stores every decision made by the Mobility-Trust-Aware Group Key Management engine.
"""

from sqlalchemy import Column, String, Float, Integer, Text
from backend.app.database import Base
import time

class MTAGKMDecision(Base):
    __tablename__ = "mt_agkm_decisions"

    decision_id = Column(String(64), primary_key=True, index=True)
    rsu_id = Column(String(32), index=True, nullable=False)
    vehicle_id = Column(String(32), index=True, nullable=True)
    decision = Column(String(16), nullable=False, index=True)  # KEEP, PREPARE, UPDATE
    reason = Column(Text, nullable=False)
    trust_score = Column(Float, nullable=False)
    mobility_score = Column(Float, nullable=False)
    handover_probability = Column(Float, nullable=False)
    security_event_detected = Column(String(8), default="NO")   # YES, NO
    membership_change = Column(String(8), default="NO")        # YES, NO
    gsk_version_before = Column(Integer, default=0)
    gsk_version_after = Column(Integer, default=0)
    timestamp = Column(Float, default=time.time, index=True)

    def to_dict(self) -> dict:
        return {
            "decision_id": self.decision_id,
            "rsu_id": self.rsu_id,
            "vehicle_id": self.vehicle_id,
            "decision": self.decision,
            "reason": self.reason,
            "trust_score": round(self.trust_score, 3),
            "mobility_score": round(self.mobility_score, 3),
            "handover_probability": round(self.handover_probability, 3),
            "security_event_detected": self.security_event_detected,
            "membership_change": self.membership_change,
            "gsk_version_before": self.gsk_version_before,
            "gsk_version_after": self.gsk_version_after,
            "timestamp": self.timestamp
        }
