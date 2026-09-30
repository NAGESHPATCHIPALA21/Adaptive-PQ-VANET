"""
Authentication & Session REST API Router
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.services.authentication_service import AuthenticationService
from backend.app.services.session_service import SessionService
from backend.app.schemas.authentication import (
    ChallengeRequest,
    ChallengeResponse,
    AuthVerifyRequest,
    SessionCreateRequest
)

router = APIRouter(prefix="/api", tags=["Authentication & Sessions"])

@router.post("/auth/challenge", response_model=ChallengeResponse)
def get_challenge(payload: ChallengeRequest):
    return AuthenticationService.request_challenge(rsu_id=payload.rsu_id)

@router.post("/auth/verify")
def verify_authentication(payload: AuthVerifyRequest, db: Session = Depends(get_db)):
    result = AuthenticationService.authenticate_vehicle(
        db=db,
        anonymous_id=payload.anonymous_id,
        challenge_nonce=payload.challenge_nonce,
        timestamp=payload.timestamp,
        response_signature=payload.response_signature,
        rsu_id=payload.rsu_id
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@router.post("/session/create")
def create_session(payload: SessionCreateRequest, db: Session = Depends(get_db)):
    result = SessionService.establish_session(
        db=db,
        vehicle_id=payload.vehicle_id,
        rsu_id=payload.rsu_id,
        vehicle_nonce=payload.vehicle_nonce
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@router.get("/session/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db)):
    sess = SessionService.get_session(db, session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found.")
    return sess
