"""
Pydantic Schemas for Group Session Key and MT-AGKM
"""

from pydantic import BaseModel, Field
from typing import Optional, List

class GSKUpdateRequest(BaseModel):
    rsu_id: str = Field(default="RSU-01")
    reason: str = Field(default="MANUAL_OPERATOR_ROTATION")
    active_members: List[str] = Field(default=[])

class MTAGKMEvaluateRequest(BaseModel):
    vehicle_id: str = Field(...)
    rsu_id: str = Field(default="RSU-01")
    membership_event: Optional[str] = None
    security_event: Optional[str] = None

class TrustEventRequest(BaseModel):
    vehicle_id: str
    event_type: str = Field(...)
    details: Optional[str] = ""
    penalty: float = Field(default=0.20, ge=0.0, le=1.0)
    rsu_id: Optional[str] = "RSU-01"
