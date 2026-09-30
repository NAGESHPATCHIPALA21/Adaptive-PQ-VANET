"""
Mobility Analysis REST API Router
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.services.mobility_service import MobilityService
from backend.app.schemas.vehicle import VehicleKinematicsUpdateRequest

router = APIRouter(prefix="/api/mobility", tags=["Mobility Monitor"])

@router.get("/{vehicle_id}")
def get_vehicle_mobility(
    vehicle_id: str,
    rsu_id: str = Query("RSU-01"),
    db: Session = Depends(get_db)
):
    result = MobilityService.evaluate_mobility(db, vehicle_id, rsu_id)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    return result

@router.post("/update")
def update_kinematics(payload: VehicleKinematicsUpdateRequest, db: Session = Depends(get_db)):
    result = MobilityService.update_vehicle_kinematics(
        db=db,
        vehicle_id=payload.vehicle_id,
        new_x=payload.position_x,
        new_y=payload.position_y,
        speed=payload.speed,
        direction=payload.direction,
        acceleration=payload.acceleration or 0.0
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result
