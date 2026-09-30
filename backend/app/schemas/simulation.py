"""
Pydantic Schemas for Simulation and Benchmarks
"""

from pydantic import BaseModel, Field
from typing import Optional

class SimulationStartRequest(BaseModel):
    vehicle_count: Optional[int] = Field(default=15, ge=2, le=50)

class ScenarioRunRequest(BaseModel):
    scenario_id: int = Field(..., ge=1, le=8)

class BenchmarkRunRequest(BaseModel):
    duration_steps: Optional[int] = Field(default=50, ge=10, le=200)
    seed: Optional[int] = Field(default=42)
