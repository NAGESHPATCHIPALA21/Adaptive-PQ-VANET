"""
Pydantic Schemas for Authentication and Session Protocols
"""

from pydantic import BaseModel, Field
from typing import Optional

class ChallengeRequest(BaseModel):
    rsu_id: str = Field(default="RSU-01")

class ChallengeResponse(BaseModel):
    success: bool
    rsu_id: str
    challenge_nonce: str
    timestamp: float
    challenge_token: str

class AuthVerifyRequest(BaseModel):
    anonymous_id: str = Field(...)
    challenge_nonce: str = Field(...)
    timestamp: float = Field(...)
    response_signature: str = Field(...)
    rsu_id: str = Field(default="RSU-01")

class SessionCreateRequest(BaseModel):
    vehicle_id: str = Field(...)
    rsu_id: str = Field(default="RSU-01")
    vehicle_nonce: Optional[str] = None
