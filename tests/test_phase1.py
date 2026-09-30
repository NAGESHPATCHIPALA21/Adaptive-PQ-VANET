"""
Unit and Integration Tests for Phase 1 Prototype
Verifies:
1. Vehicle registration and anonymous identity (pseudonymity)
2. Challenge-response authentication correctness
3. Replay attack rejection
4. Unauthorized / invalid response rejection
5. Session key derivation (HKDF-SHA256)
6. Group Session Key initial state
7. Backward security on Vehicle Join
8. Forward security on Vehicle Leave and Revocation
9. Post-Quantum KEM interface compliance
"""

import pytest
import time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.database import Base
from backend.app.models import Vehicle, RSU, SessionKey, GroupSessionKey, SecurityEvent
from backend.app.services.registration_service import RegistrationService
from backend.app.services.authentication_service import AuthenticationService
from backend.app.services.session_service import SessionService
from backend.app.services.group_key_service import GroupKeyService
from backend.app.crypto.authentication import compute_auth_response
from backend.app.crypto.pq_interface import PQProviderRegistry, DemoMLKEMPlaceholder

TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture
def db_session():
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    
    # Pre-populate RSU
    rsu = RSU(
        rsu_id="RSU-01",
        name="Test Fog Node",
        position_x=500.0,
        position_y=500.0,
        coverage_radius=400.0,
        status="ACTIVE",
        current_gsk_version=0
    )
    session.add(rsu)
    session.commit()
    
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_vehicle_registration(db_session):
    result = RegistrationService.register_vehicle(
        db=db_session,
        vehicle_id="V001",
        initial_rsu="RSU-01"
    )
    assert result["success"] is True
    assert result["vehicle_id"] == "V001"
    assert result["anonymous_id"].startswith("ANON-")
    assert len(result["secret_credential"]) > 0

    # Ensure duplicate registration is prevented
    dup_result = RegistrationService.register_vehicle(
        db=db_session,
        vehicle_id="V001"
    )
    assert dup_result["success"] is False

def test_authentication_success_and_session(db_session):
    # 1. Register vehicle
    reg = RegistrationService.register_vehicle(db=db_session, vehicle_id="V001")
    anon_id = reg["anonymous_id"]
    secret = reg["secret_credential"]

    # 2. RSU generates challenge
    challenge = AuthenticationService.request_challenge("RSU-01")
    assert "challenge_nonce" in challenge

    # 3. Vehicle computes valid HMAC response
    response_sig = compute_auth_response(
        vehicle_secret=secret,
        anonymous_id=anon_id,
        challenge_nonce=challenge["challenge_nonce"],
        timestamp=challenge["timestamp"]
    )

    # 4. RSU verifies
    auth_result = AuthenticationService.authenticate_vehicle(
        db=db_session,
        anonymous_id=anon_id,
        challenge_nonce=challenge["challenge_nonce"],
        timestamp=challenge["timestamp"],
        response_signature=response_sig,
        rsu_id="RSU-01"
    )
    assert auth_result["success"] is True
    assert auth_result["status"] == "AUTHENTICATED"

    # 5. Establish Session Key
    sess_result = SessionService.establish_session(
        db=db_session,
        vehicle_id="V001",
        rsu_id="RSU-01"
    )
    assert sess_result["success"] is True
    assert sess_result["key_id"].startswith("SK-")
    assert sess_result["key_length_bits"] == 256
    assert sess_result["status"] == "ACTIVE"

def test_replay_attack_detection(db_session):
    reg = RegistrationService.register_vehicle(db=db_session, vehicle_id="V002")
    challenge = AuthenticationService.request_challenge("RSU-01")
    
    response_sig = compute_auth_response(
        vehicle_secret=reg["secret_credential"],
        anonymous_id=reg["anonymous_id"],
        challenge_nonce=challenge["challenge_nonce"],
        timestamp=challenge["timestamp"]
    )

    # First attempt: SUCCESS
    first_attempt = AuthenticationService.authenticate_vehicle(
        db=db_session,
        anonymous_id=reg["anonymous_id"],
        challenge_nonce=challenge["challenge_nonce"],
        timestamp=challenge["timestamp"],
        response_signature=response_sig,
        rsu_id="RSU-01"
    )
    assert first_attempt["success"] is True

    # Replay attempt with same challenge nonce: MUST BE REJECTED
    replay_attempt = AuthenticationService.authenticate_vehicle(
        db=db_session,
        anonymous_id=reg["anonymous_id"],
        challenge_nonce=challenge["challenge_nonce"],
        timestamp=challenge["timestamp"],
        response_signature=response_sig,
        rsu_id="RSU-01"
    )
    assert replay_attempt["success"] is False
    assert "Replay attack detected" in replay_attempt["message"]

def test_invalid_credential_failure(db_session):
    reg = RegistrationService.register_vehicle(db=db_session, vehicle_id="V003")
    challenge = AuthenticationService.request_challenge("RSU-01")
    
    # Intentionally bad secret
    bad_response = compute_auth_response(
        vehicle_secret="WRONG_SECRET_CREDENTIAL",
        anonymous_id=reg["anonymous_id"],
        challenge_nonce=challenge["challenge_nonce"],
        timestamp=challenge["timestamp"]
    )

    result = AuthenticationService.authenticate_vehicle(
        db=db_session,
        anonymous_id=reg["anonymous_id"],
        challenge_nonce=challenge["challenge_nonce"],
        timestamp=challenge["timestamp"],
        response_signature=bad_response,
        rsu_id="RSU-01"
    )
    assert result["success"] is False
    assert result["status"] == "REJECTED"

def test_gsk_lifecycle_forward_and_backward_security(db_session):
    # 1. Initial GSK generation
    gsk_v1 = GroupKeyService.generate_initial_gsk(db=db_session, rsu_id="RSU-01")
    assert gsk_v1.version == 1
    assert gsk_v1.status == "ACTIVE"
    assert gsk_v1.member_count == 0

    # 2. Vehicle V001 joins -> Backward Security test
    # (New GSK version generated, V001 authorized for v2, old v1 invalidated)
    gsk_v2 = GroupKeyService.handle_vehicle_join(db=db_session, rsu_id="RSU-01", vehicle_id="V001")
    assert gsk_v2.version == 2
    assert "V001" in gsk_v2.get_authorized_members_list()
    assert gsk_v1.status == "SUPERSEDED"

    # 3. Vehicle V002 joins -> GSK rotates to v3
    gsk_v3 = GroupKeyService.handle_vehicle_join(db=db_session, rsu_id="RSU-01", vehicle_id="V002")
    assert gsk_v3.version == 3
    assert set(gsk_v3.get_authorized_members_list()) == {"V001", "V002"}

    # 4. Vehicle V001 departs -> Forward Security test
    # (New GSK v4 generated, V001 excluded from v4 members)
    gsk_v4 = GroupKeyService.handle_vehicle_leave(db=db_session, rsu_id="RSU-01", vehicle_id="V001")
    assert gsk_v4.version == 4
    assert "V001" not in gsk_v4.get_authorized_members_list()
    assert "V002" in gsk_v4.get_authorized_members_list()

    # 5. Revocation of V002 -> GSK rotates to v5, members become empty
    gsk_v5 = GroupKeyService.revoke_vehicle(db=db_session, rsu_id="RSU-01", vehicle_id="V002", reason="SUSPICIOUS_BEHAVIOR")
    assert gsk_v5.version == 5
    assert gsk_v5.get_authorized_members_list() == []

def test_post_quantum_kem_interface():
    kem = PQProviderRegistry.get_kem()
    info = kem.get_algorithm_info()
    assert "ML-KEM" in info["algorithm"]

    # Key encapsulation test
    pk, sk = kem.generate_keypair()
    ct, ss_enc = kem.encapsulate(pk)
    assert len(ct) > 0
    assert len(ss_enc) == 32

    # Decapsulation test: decapsulate ciphertext using secret key
    ss_dec = kem.decapsulate(sk, ct)
    assert ss_dec == ss_enc
