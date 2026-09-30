"""
Vehicle Entity Model
Represents a vehicle in the Vehicle-Fog-Cloud VANET system.
Supports pseudonymous privacy, mobility parameters, trust metrics, and group key tracking.
"""

from sqlalchemy import Column, String, Float, Integer
from backend.app.database import Base
import time

class Vehicle(Base):
    __tablename__ = "vehicles"

    vehicle_id = Column(String(32), primary_key=True, index=True)
    anonymous_id = Column(String(64), unique=True, index=True, nullable=False)
    secret_credential = Column(String(128), nullable=False)  # Known only to TA & Vehicle OBU
    current_rsu = Column(String(32), default="RSU-01", index=True)
    
    # Kinematics / Mobility
    position_x = Column(Float, default=100.0)
    position_y = Column(Float, default=100.0)
    speed = Column(Float, default=45.0)  # km/h
    acceleration = Column(Float, default=0.0)  # m/s^2
    direction = Column(Float, default=90.0)  # degrees [0, 360)
    handover_probability = Column(Float, default=0.0)  # [0.0, 1.0]

    # Behavioral Trust
    trust_score = Column(Float, default=1.0)  # [0.0, 1.0]
    behavior_score = Column(Float, default=1.0)
    
    # Security State
    authentication_status = Column(String(32), default="UNAUTHENTICATED")  # UNAUTHENTICATED, AUTHENTICATED, REJECTED
    session_key_id = Column(String(64), nullable=True)
    group_key_version = Column(Integer, default=0)
    vehicle_status = Column(String(32), default="REGISTERED")  # REGISTERED, ACTIVE, WARNING, SUSPICIOUS, REVOKED
    
    # Timestamps
    registered_at = Column(Float, default=time.time)
    last_seen = Column(Float, default=time.time)

    def __repr__(self) -> str:
        return f"<Vehicle {self.vehicle_id} (AID: {self.anonymous_id}) status={self.vehicle_status}>"

    def to_dict(self, include_secret: bool = False) -> dict:
        """Serializes vehicle state. By default, hides cryptographic secret from UI/APIs."""
        data = {
            "vehicle_id": self.vehicle_id,
            "anonymous_id": self.anonymous_id,
            "current_rsu": self.current_rsu,
            "position_x": round(self.position_x, 2),
            "position_y": round(self.position_y, 2),
            "speed": round(self.speed, 2),
            "acceleration": round(self.acceleration, 2),
            "direction": round(self.direction, 2),
            "handover_probability": round(self.handover_probability, 3),
            "trust_score": round(self.trust_score, 3),
            "behavior_score": round(self.behavior_score, 3),
            "authentication_status": self.authentication_status,
            "session_key_id": self.session_key_id,
            "group_key_version": self.group_key_version,
            "vehicle_status": self.vehicle_status,
            "last_seen": self.last_seen,
            "registered_at": self.registered_at
        }
        if include_secret:
            data["secret_credential"] = self.secret_credential
        return data
