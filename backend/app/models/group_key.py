"""
Group Session Key (GSK) Model
Represents localized multicast / group keys for secure Vehicle-to-Vehicle (V2V)
and Vehicle-to-Infrastructure (V2I) broadcast communication within an RSU zone.
"""

from sqlalchemy import Column, String, Float, Integer, Text
from backend.app.database import Base
import time
import json

class GroupSessionKey(Base):
    __tablename__ = "group_session_keys"

    gsk_id = Column(String(64), primary_key=True, index=True)
    rsu_id = Column(String(32), index=True, nullable=False)
    version = Column(Integer, nullable=False, index=True)
    key_fingerprint = Column(String(64), nullable=False)  # SHA-256 digest of key material
    member_count = Column(Integer, default=0)
    authorized_members = Column(Text, default="[]")  # JSON list of vehicle_ids authorized for this version
    update_reason = Column(String(128), default="INITIAL_GENERATION")
    previous_version = Column(Integer, nullable=True)
    created_at = Column(Float, default=time.time)
    expires_at = Column(Float, nullable=False)
    status = Column(String(32), default="ACTIVE")  # ACTIVE, SUPERSEDED, REVOKED

    def get_authorized_members_list(self) -> list:
        try:
            return json.loads(self.authorized_members)
        except Exception:
            return []

    def set_authorized_members_list(self, members: list):
        self.authorized_members = json.dumps(members)
        self.member_count = len(members)

    def to_dict(self) -> dict:
        return {
            "gsk_id": self.gsk_id,
            "rsu_id": self.rsu_id,
            "version": self.version,
            "key_fingerprint": self.key_fingerprint,
            "member_count": self.member_count,
            "authorized_members": self.get_authorized_members_list(),
            "update_reason": self.update_reason,
            "previous_version": self.previous_version,
            "created_at": self.created_at,
            "expires_at": self.expires_at,
            "status": self.status
        }
