"""
Trust Evaluation REST API Router
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.services.trust_service import TrustService
from backend.app.schemas.group_key import TrustEventRequest

router = APIRouter(prefix="/api/trust", tags=["Trust Monitor"])

@router.get("/{vehicle_id}")
def get_vehicle_trust(vehicle_id: str, db: Session = Depends(get_db)):
    result = TrustService.evaluate_trust(db, vehicle_id)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    return result

@router.post("/event")
def record_trust_event(payload: TrustEventRequest, db: Session = Depends(get_db)):
    result = TrustService.record_behavior_event(
        db=db,
        vehicle_id=payload.vehicle_id,
        event_type=payload.event_type,
        details=payload.details or "",
        penalty=payload.penalty,
        rsu_id=payload.rsu_id or "RSU-01"
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@router.get("/history/{vehicle_id}")
def get_trust_history(vehicle_id: str, limit: int = Query(20), db: Session = Depends(get_db)):
    return TrustService.get_trust_history(db, vehicle_id, limit)
