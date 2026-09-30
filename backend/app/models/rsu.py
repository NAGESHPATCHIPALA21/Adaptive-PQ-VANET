"""
RSU / Fog Node Model
Represents Roadside Units acting as localized fog edge controllers.
RSUs manage localized authentication, mobility monitoring, trust evaluation, and GSK distribution.
"""

from sqlalchemy import Column, String, Float, Integer
from backend.app.database import Base

class RSU(Base):
    __tablename__ = "rsus"

    rsu_id = Column(String(32), primary_key=True, index=True)
    name = Column(String(64), nullable=False)
    position_x = Column(Float, default=500.0)
    position_y = Column(Float, default=500.0)
    coverage_radius = Column(Float, default=400.0)  # meters
    status = Column(String(32), default="ACTIVE")   # ACTIVE, DEGRADED, OFFLINE
    current_gsk_version = Column(Integer, default=0)

    def to_dict(self) -> dict:
        return {
            "rsu_id": self.rsu_id,
            "name": self.name,
            "position_x": self.position_x,
            "position_y": self.position_y,
            "coverage_radius": self.coverage_radius,
            "status": self.status,
            "current_gsk_version": self.current_gsk_version
        }
