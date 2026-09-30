"""
Session Key Model
Tracks unicast V2I session keys established between individual vehicles and Fog/RSUs.
Raw cryptographic key material is never exposed in UI; only key identifiers and fingerprints are stored.
"""

from sqlalchemy import Column, String, Float, Integer
from backend.app.database import Base
import time

class SessionKey(Base):
    __tablename__ = "session_keys"

    session_id = Column(String(64), primary_key=True, index=True)
    key_id = Column(String(64), unique=True, index=True, nullable=False)
    vehicle_id = Column(String(32), index=True, nullable=False)
    rsu_id = Column(String(32), index=True, nullable=False)
    key_fingerprint = Column(String(64), nullable=False)  # SHA-256 fingerprint for verification
    key_length_bits = Column(Integer, default=256)
    established_at = Column(Float, default=time.time)
    expires_at = Column(Float, nullable=False)
    status = Column(String(32), default="ACTIVE")  # ACTIVE, EXPIRED, TERMINATED

    def to_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "key_id": self.key_id,
            "vehicle_id": self.vehicle_id,
            "rsu_id": self.rsu_id,
            "key_fingerprint": self.key_fingerprint,
            "key_length_bits": self.key_length_bits,
            "established_at": self.established_at,
            "expires_at": self.expires_at,
            "status": self.status
        }
