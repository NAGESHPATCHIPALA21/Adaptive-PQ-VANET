"""
Group Session Key (GSK) REST API Router
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.services.group_key_service import GroupKeyService
from backend.app.schemas.group_key import GSKUpdateRequest

router = APIRouter(prefix="/api/gsk", tags=["Group Session Key"])

@router.get("/current")
def get_current_gsk(rsu_id: str = Query("RSU-01"), db: Session = Depends(get_db)):
    gsk = GroupKeyService.get_current_gsk(db, rsu_id)
    if not gsk:
        gsk = GroupKeyService.generate_initial_gsk(db, rsu_id)
    return gsk.to_dict()

@router.post("/update")
def update_gsk(payload: GSKUpdateRequest, db: Session = Depends(get_db)):
    new_gsk = GroupKeyService.update_gsk(
        db=db,
        rsu_id=payload.rsu_id,
        reason=payload.reason,
        active_members=payload.active_members
    )
    return new_gsk.to_dict()

@router.get("/history")
def get_gsk_history(rsu_id: str = Query("RSU-01"), limit: int = Query(20), db: Session = Depends(get_db)):
    return GroupKeyService.get_gsk_history(db, rsu_id, limit)
