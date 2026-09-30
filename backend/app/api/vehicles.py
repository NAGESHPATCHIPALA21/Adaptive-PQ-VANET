"""
Vehicles REST API Router
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from backend.app.database import get_db
from backend.app.models.vehicle import Vehicle
from backend.app.services.registration_service import RegistrationService
from backend.app.schemas.vehicle import VehicleRegisterRequest, VehicleKinematicsUpdateRequest

router = APIRouter(prefix="/api/vehicles", tags=["Vehicles"])

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_vehicle(payload: VehicleRegisterRequest, db: Session = Depends(get_db)):
    result = RegistrationService.register_vehicle(
        db=db,
        vehicle_id=payload.vehicle_id,
        initial_rsu=payload.initial_rsu,
        position_x=payload.position_x,
        position_y=payload.position_y,
        speed=payload.speed
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@router.get("")
def list_vehicles(db: Session = Depends(get_db)):
    vehicles = db.query(Vehicle).all()
    return [v.to_dict() for v in vehicles]

@router.get("/{vehicle_id}")
def get_vehicle(vehicle_id: str, db: Session = Depends(get_db)):
    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail=f"Vehicle {vehicle_id} not found.")
    return vehicle.to_dict()

@router.delete("/{vehicle_id}")
def delete_vehicle(vehicle_id: str, db: Session = Depends(get_db)):
    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail=f"Vehicle {vehicle_id} not found.")
    db.delete(vehicle)
    db.commit()
    return {"success": True, "message": f"Vehicle {vehicle_id} deleted from registry."}
