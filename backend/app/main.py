"""
FastAPI Main Application Entry Point
Adaptive PQ-VANET: Adaptive Post-Quantum Anonymous Authentication & Mobility-Trust-Aware Group Key Management
"""

import sys
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure backend root is in Python path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.app.config import settings
from backend.app.database import init_db, SessionLocal
from backend.app.services.simulation_service import SimulationService

# Import API Routers
from backend.app.api.vehicles import router as vehicles_router
from backend.app.api.authentication import router as auth_router
from backend.app.api.group_keys import router as gsk_router
from backend.app.api.trust import router as trust_router
from backend.app.api.mobility import router as mobility_router
from backend.app.api.mt_agkm import router as mt_agkm_router
from backend.app.api.rsus import router as rsus_router
from backend.app.api.simulation import router as simulation_router
from backend.app.api.dashboard import router as dashboard_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure DB tables exist and seed topology
    init_db()
    db = SessionLocal()
    try:
        SimulationService.setup_topology(db)
    finally:
        db.close()
    yield
    # Shutdown

app = FastAPI(
    title=f"{settings.PROJECT_NAME} API",
    description="Research prototype backend for Vehicle-Fog-Cloud VANET Post-Quantum Anonymous Authentication & Adaptive Group Key Management",
    version=settings.PROJECT_VERSION,
    lifespan=lifespan
)

# Enable CORS for local Vite development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(dashboard_router)
app.include_router(vehicles_router)
app.include_router(auth_router)
app.include_router(gsk_router)
app.include_router(trust_router)
app.include_router(mobility_router)
app.include_router(mt_agkm_router)
app.include_router(rsus_router)
app.include_router(simulation_router)

@app.get("/")
def root():
    return {
        "project": settings.PROJECT_NAME,
        "platform_edition": settings.PLATFORM_EDITION,
        "architecture": settings.ARCHITECTURE,
        "status": "OPERATIONAL",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
