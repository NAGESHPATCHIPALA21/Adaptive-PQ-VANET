"""
Simulation and Benchmark REST API Router
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.database import get_db, SessionLocal
from backend.app.services.simulation_service import SimulationService
from backend.app.schemas.simulation import (
    SimulationStartRequest,
    ScenarioRunRequest,
    BenchmarkRunRequest
)

router = APIRouter(prefix="/api/simulation", tags=["Simulation & Scenarios"])

@router.post("/start")
def start_simulation(payload: SimulationStartRequest, db: Session = Depends(get_db)):
    vehicles = SimulationService.populate_fleet(db, count=payload.vehicle_count or 15)
    return {
        "success": True,
        "message": f"Simulation initiated with {len(vehicles)} vehicles across 4 RSUs.",
        "vehicles": vehicles
    }

@router.post("/step")
def step_simulation(db: Session = Depends(get_db)):
    result = SimulationService.step_simulation(db, dt=1.0)
    return result

@router.post("/scenario")
def run_scenario(payload: ScenarioRunRequest, db: Session = Depends(get_db)):
    result = SimulationService.execute_scenario(db, scenario_id=payload.scenario_id)
    return result

@router.post("/benchmark")
def run_benchmark(payload: BenchmarkRunRequest, db: Session = Depends(get_db)):
    result = SimulationService.run_comparative_benchmark(
        db,
        duration_steps=payload.duration_steps or 50,
        seed=payload.seed if payload.seed is not None else 42
    )
    return result

@router.get("/results")
def get_benchmark_results():
    results = SimulationService.get_last_benchmark_results()
    if not results:
        # Run a quick run if not yet executed
        db = SessionLocal()
        try:
            results = SimulationService.run_comparative_benchmark(db, duration_steps=30)
        finally:
            db.close()
    return results

@router.post("/reset")
def reset_simulation(db: Session = Depends(get_db)):
    from backend.app.database import engine, Base, init_db
    Base.metadata.drop_all(bind=engine)
    init_db()
    SimulationService.setup_topology(db)
    return {"success": True, "message": "Simulation and database reset successfully."}
