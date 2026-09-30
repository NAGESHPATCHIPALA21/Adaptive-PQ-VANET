"""
Security Event Log Model
Records authentication failures, replay attacks, trust violations, and key rotation triggers.
"""

from sqlalchemy import Column, String, Float, Integer
from backend.app.database import Base
import time

class SecurityEvent(Base):
    __tablename__ = "security_events"

    event_id = Column(String(64), primary_key=True, index=True)
    event_type = Column(String(64), nullable=False, index=True)
    severity = Column(String(32), default="INFO")  # INFO, WARNING, CRITICAL
    vehicle_id = Column(String(32), index=True, nullable=True)
    rsu_id = Column(String(32), index=True, nullable=True)
    description = Column(String(256), nullable=False)
    action_taken = Column(String(128), default="LOGGED")
    timestamp = Column(Float, default=time.time, index=True)

    def to_dict(self) -> dict:
        return {
            "event_id": self.event_id,
            "event_type": self.event_type,
            "severity": self.severity,
            "vehicle_id": self.vehicle_id,
            "rsu_id": self.rsu_id,
            "description": self.description,
            "action_taken": self.action_taken,
            "timestamp": self.timestamp
        }
