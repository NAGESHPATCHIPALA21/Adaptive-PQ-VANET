"""
Trust Record Model
Persists behavioral trust calculation logs and history per vehicle.
"""

from sqlalchemy import Column, String, Float, Integer
from backend.app.database import Base
import time

class TrustRecord(Base):
    __tablename__ = "trust_records"

    record_id = Column(String(64), primary_key=True, index=True)
    vehicle_id = Column(String(32), index=True, nullable=False)
    trust_score = Column(Float, nullable=False)
    behavior_score = Column(Float, nullable=False)
    event_trigger = Column(String(128), default="PERIODIC_CHECK")
    timestamp = Column(Float, default=time.time, index=True)

    def to_dict(self) -> dict:
        return {
            "record_id": self.record_id,
            "vehicle_id": self.vehicle_id,
            "trust_score": round(self.trust_score, 3),
            "behavior_score": round(self.behavior_score, 3),
            "event_trigger": self.event_trigger,
            "timestamp": self.timestamp
        }
