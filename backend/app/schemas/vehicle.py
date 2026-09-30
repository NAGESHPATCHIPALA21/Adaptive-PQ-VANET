"""
Pydantic Schemas for Vehicle Entity and Kinematics API
"""

from pydantic import BaseModel, Field
from typing import Optional

class VehicleRegisterRequest(BaseModel):
    vehicle_id: str = Field(...)
    initial_rsu: str = Field(default="RSU-01")
    position_x: float = Field(default=100.0)
    position_y: float = Field(default=100.0)
    speed: float = Field(default=45.0)

class VehicleKinematicsUpdateRequest(BaseModel):
    vehicle_id: str
    position_x: float
    position_y: float
    speed: float
    direction: float
    acceleration: Optional[float] = 0.0

class VehicleResponse(BaseModel):
    vehicle_id: str
    anonymous_id: str
    current_rsu: str
    position_x: float
    position_y: float
    speed: float
    acceleration: float
    direction: float
    handover_probability: float
    trust_score: float
    behavior_score: float
    authentication_status: str
    session_key_id: Optional[str]
    group_key_version: int
    vehicle_status: str
    last_seen: float
    registered_at: float
