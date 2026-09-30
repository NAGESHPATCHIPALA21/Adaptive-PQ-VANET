"""
MT-AGKM Decision Engine REST API Router
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.services.mt_agkm_service import MTAGKMService
from backend.app.schemas.group_key import MTAGKMEvaluateRequest

router = APIRouter(prefix="/api/mt-agkm", tags=["MT-AGKM Decision Engine"])

@router.post("/evaluate")
def evaluate_mt_agkm(payload: MTAGKMEvaluateRequest, db: Session = Depends(get_db)):
    result = MTAGKMService.evaluate(
        db=db,
        vehicle_id=payload.vehicle_id,
        rsu_id=payload.rsu_id,
        membership_event=payload.membership_event,
        security_event=payload.security_event
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@router.get("/history")
def get_decision_history(limit: int = Query(25), db: Session = Depends(get_db)):
    return MTAGKMService.get_decision_history(db, limit)
