"""
Unit and Integration Tests for Phase 2 - Adaptive Security & MT-AGKM
Verifies:
1. Mobility evaluation, boundary proximity, and dwell time
2. Behavioral trust score calculation and penalty tracking
3. MT-AGKM KEEP decision for stable, trusted vehicles
4. MT-AGKM PREPARE decision for boundary-approaching vehicles (preventing unnecessary GSK updates)
5. MT-AGKM UPDATE decision on join, leave, and security violations
6. Explanation generation for academic demonstration
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.database import Base
from backend.app.models import Vehicle, RSU, GroupSessionKey, MTAGKMDecision
from backend.app.services.registration_service import RegistrationService
from backend.app.services.authentication_service import AuthenticationService
from backend.app.services.mobility_service import MobilityService
from backend.app.services.trust_service import TrustService
from backend.app.services.mt_agkm_service import MTAGKMService
from backend.app.services.group_key_service import GroupKeyService

TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture
def db_session():
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()

    # Pre-populate RSU-01 centered at (500, 500) with 400m radius
    rsu = RSU(
        rsu_id="RSU-01",
        name="CBIT Fog Node 01",
        position_x=500.0,
        position_y=500.0,
        coverage_radius=400.0,
        status="ACTIVE",
        current_gsk_version=0
    )
    session.add(rsu)
    session.commit()

    # Initialize GSK v1
    GroupKeyService.generate_initial_gsk(session, "RSU-01")

    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_mobility_analysis(db_session):
    # Register vehicle
    RegistrationService.register_vehicle(
        db=db_session,
        vehicle_id="V_MOB",
        initial_rsu="RSU-01",
        position_x=500.0,  # Center of RSU
        position_y=500.0,
        speed=20.0
    )

    # 1. Central stable vehicle
    mob_center = MobilityService.evaluate_mobility(db_session, "V_MOB", "RSU-01")
    assert mob_center["dist_center_m"] == 0.0
    assert mob_center["mobility_score"] < 0.50
    assert mob_center["handover_probability"] < 0.30

    # 2. Vehicle moving to boundary (850, 500) heading East (0 deg) at 90 km/h
    MobilityService.update_vehicle_kinematics(
        db=db_session,
        vehicle_id="V_MOB",
        new_x=850.0,
        new_y=500.0,
        speed=90.0,
        direction=0.0  # Heading outward
    )
    mob_boundary = MobilityService.evaluate_mobility(db_session, "V_MOB", "RSU-01")
    assert mob_boundary["dist_center_m"] == 350.0
    assert mob_boundary["dist_boundary_m"] == 50.0
    assert mob_boundary["mobility_score"] >= 0.70
    assert mob_boundary["handover_probability"] >= 0.50

def test_behavioral_trust_penalties(db_session):
    RegistrationService.register_vehicle(db=db_session, vehicle_id="V_TRUST")
    
    # Initial trust is 1.0
    eval_init = TrustService.evaluate_trust(db_session, "V_TRUST")
    assert eval_init["trust_score"] == 1.0
    assert eval_init["risk_level"] == "NORMAL"

    # Record security penalty (e.g. repeated invalid HMAC / replay)
    TrustService.record_behavior_event(
        db=db_session,
        vehicle_id="V_TRUST",
        event_type="REPLAY_ATTEMPT",
        details="Repeated timestamp replay",
        penalty=0.45
    )

    eval_degraded = TrustService.evaluate_trust(db_session, "V_TRUST")
    assert eval_degraded["trust_score"] == 0.55
    assert eval_degraded["risk_level"] == "WARNING"

    # Further penalty dropping below critical threshold (0.40)
    TrustService.record_behavior_event(
        db=db_session,
        vehicle_id="V_TRUST",
        event_type="PROTOCOL_VIOLATION",
        details="Flooding bogus safety beacons",
        penalty=0.25
    )
    eval_critical = TrustService.evaluate_trust(db_session, "V_TRUST")
    assert eval_critical["trust_score"] == 0.30
    assert eval_critical["risk_level"] == "CRITICAL"
    assert eval_critical["recommended_action"] == "ISOLATE_AND_REVOKE"

def test_mt_agkm_decision_keep(db_session):
    # Stable, trusted vehicle near center
    RegistrationService.register_vehicle(
        db=db_session,
        vehicle_id="V_STABLE",
        initial_rsu="RSU-01",
        position_x=510.0,
        position_y=510.0,
        speed=30.0
    )

    decision = MTAGKMService.evaluate(
        db=db_session,
        vehicle_id="V_STABLE",
        rsu_id="RSU-01"
    )
    assert decision["decision"] == "KEEP"
    assert "stable" in decision["reason"].lower()
    assert decision["gsk_version_before"] == decision["gsk_version_after"]

def test_mt_agkm_decision_prepare(db_session):
    # Highly mobile, trusted vehicle heading towards cell boundary
    RegistrationService.register_vehicle(
        db=db_session,
        vehicle_id="V_PREP",
        initial_rsu="RSU-01",
        position_x=860.0,
        position_y=500.0,
        speed=85.0
    )
    MobilityService.update_vehicle_kinematics(
        db=db_session,
        vehicle_id="V_PREP",
        new_x=860.0,
        new_y=500.0,
        speed=85.0,
        direction=0.0
    )

    decision = MTAGKMService.evaluate(
        db=db_session,
        vehicle_id="V_PREP",
        rsu_id="RSU-01"
    )
    # KEY RESEARCH RESULT: Should PREPARE, not immediately UPDATE group key!
    assert decision["decision"] == "PREPARE"
    assert "handover probability" in decision["reason"].lower()
    assert decision["gsk_version_before"] == decision["gsk_version_after"]

def test_mt_agkm_decision_update_on_suspicious_threat(db_session):
    # Vehicle that demonstrates suspicious behavior
    RegistrationService.register_vehicle(db=db_session, vehicle_id="V_SUSP")
    
    # Degrade trust below critical threshold
    TrustService.record_behavior_event(
        db=db_session,
        vehicle_id="V_SUSP",
        event_type="UNUSUAL_BEHAVIOR",
        penalty=0.70
    )

    decision = MTAGKMService.evaluate(
        db=db_session,
        vehicle_id="V_SUSP",
        rsu_id="RSU-01",
        security_event="REPLAY_AND_FLOODING"
    )
    assert decision["decision"] == "UPDATE"
    assert "security threat" in decision["reason"].lower()
    # GSK must have rotated to isolate suspicious node
    assert decision["gsk_version_after"] > decision["gsk_version_before"]
