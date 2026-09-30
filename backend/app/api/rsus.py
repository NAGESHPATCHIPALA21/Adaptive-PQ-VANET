"""
RSU / Fog Nodes REST API Router
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.rsu import RSU
from backend.app.services.simulation_service import SimulationService

router = APIRouter(prefix="/api/rsus", tags=["RSUs / Fog Nodes"])

@router.get("")
def list_rsus(db: Session = Depends(get_db)):
    SimulationService.setup_topology(db)
    rsus = db.query(RSU).all()
    return [r.to_dict() for r in rsus]
