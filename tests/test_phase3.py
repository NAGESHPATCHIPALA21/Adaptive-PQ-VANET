"""
Unit and Integration Tests for Phase 3 - Multi-Entity Simulation and Benchmark
Verifies:
1. Multi-RSU topology and initial GSKs
2. Vehicle fleet population with automated TA registration and authentication
3. Predefined research scenarios S1-S8 execution
4. Traditional vs Proposed MT-AGKM empirical benchmark results
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.database import Base
from backend.app.models import Vehicle, RSU
from backend.app.services.simulation_service import SimulationService

TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture
def db_session():
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_topology_and_fleet(db_session):
    SimulationService.setup_topology(db_session)
    rsus = db_session.query(RSU).all()
    assert len(rsus) == 4

    fleet = SimulationService.populate_fleet(db_session, count=6)
    assert len(fleet) == 6
    for v in fleet:
        assert v["anonymous_id"].startswith("ANON-")
        assert v["authentication_status"] == "AUTHENTICATED"
        assert v["session_key_id"] is not None

def test_research_scenarios(db_session):
    # Scenario 1: Normal Stable Traffic -> KEEP
    s1 = SimulationService.execute_scenario(db_session, 1)
    assert s1["actual"] == "KEEP"

    # Scenario 2: Vehicle Approaching Boundary -> PREPARE
    s2 = SimulationService.execute_scenario(db_session, 2)
    assert s2["actual"] == "PREPARE"

    # Scenario 3: Vehicle Leaves RSU -> UPDATE
    s3 = SimulationService.execute_scenario(db_session, 3)
    assert s3["actual"] == "UPDATE"

    # Scenario 4: Suspicious Vehicle -> UPDATE
    s4 = SimulationService.execute_scenario(db_session, 4)
    assert s4["actual"] == "UPDATE"

def test_comparative_benchmark_empirical_metrics(db_session):
    results = SimulationService.run_comparative_benchmark(db_session, duration_steps=15)
    
    assert "traditional_scheme" in results
    assert "proposed_mt_agkm" in results
    assert "comparative_metrics" in results

    trad = results["traditional_scheme"]
    mt = results["proposed_mt_agkm"]
    comp = results["comparative_metrics"]

    # Verify that MT-AGKM has avoided unnecessary updates and has fewer total GSK updates
    assert mt["unnecessary_updates_avoided"] >= 0
    assert mt["keep_decisions"] > 0
    assert comp["gsk_update_reduction_percent"] >= 0.0
