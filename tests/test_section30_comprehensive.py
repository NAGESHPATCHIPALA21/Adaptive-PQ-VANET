"""
Section 30 Comprehensive Test Suite
Validates all requirements specified in MASTER PROJECT GUIDELINES Section 30:
1. Authentication (valid, invalid identity, invalid response, expired timestamp, replay)
2. Session (valid session, authentication required, key fingerprint)
3. Group Key (initial key, join update, leave update, revoke update, version increment)
4. Mobility (stable, boundary, high mobility, handover)
5. Trust (successful behavior, suspicious event, failed authentication, trust degradation)
6. MT-AGKM (KEEP, PREPARE, UPDATE security, UPDATE trust, UPDATE join, UPDATE revoke)
7. Post-Quantum KEM (key generation, encapsulation, decapsulation, shared secret equality, algorithm info)
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
from backend.app.services.mobility_service import MobilityService
from backend.app.services.trust_service import TrustService
from backend.app.services.mt_agkm_service import MTAGKMService
from backend.app.crypto.authentication import compute_auth_response
from backend.app.crypto.pq_interface import PQProviderRegistry, NativeMLKEM768Provider, DemoMLKEMPlaceholder
from backend.app.crypto.random_source import SecureRandomSource
from backend.app.config import settings

TEST_DB_URL = "sqlite:///:memory:"

@pytest.fixture
def db():
    engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()

    # Pre-populate RSU-01
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

    # Create initial GSK v1
    GroupKeyService.generate_initial_gsk(session, "RSU-01")

    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


# ============================================================================
# 1. AUTHENTICATION TESTS
# ============================================================================

def test_auth_valid(db):
    """Test 1a: Valid authentication flow."""
    reg = RegistrationService.register_vehicle(db, "V_AUTH_1", "RSU-01")
    ch = AuthenticationService.request_challenge("RSU-01")
    sig = compute_auth_response(
        vehicle_secret=reg["secret_credential"],
        anonymous_id=reg["anonymous_id"],
        challenge_nonce=ch["challenge_nonce"],
        timestamp=ch["timestamp"]
    )
    res = AuthenticationService.authenticate_vehicle(
        db, reg["anonymous_id"], ch["challenge_nonce"], ch["timestamp"], sig, "RSU-01"
    )
    assert res["success"] is True
    assert res["status"] == "AUTHENTICATED"


def test_auth_invalid_identity(db):
    """Test 1b: Rejection of unregistered / unknown anonymous identity."""
    ch = AuthenticationService.request_challenge("RSU-01")
    res = AuthenticationService.authenticate_vehicle(
        db, "ANON-UNKNOWN9999", ch["challenge_nonce"], ch["timestamp"], "bogussig", "RSU-01"
    )
    assert res["success"] is False
    assert res["status"] == "REJECTED"
    assert "not found" in res["message"].lower()


def test_auth_invalid_response(db):
    """Test 1c: Rejection of invalid response signature (wrong secret)."""
    reg = RegistrationService.register_vehicle(db, "V_AUTH_BAD", "RSU-01")
    ch = AuthenticationService.request_challenge("RSU-01")
    sig = compute_auth_response(
        vehicle_secret="COMPLETELY_WRONG_SECRET",
        anonymous_id=reg["anonymous_id"],
        challenge_nonce=ch["challenge_nonce"],
        timestamp=ch["timestamp"]
    )
    res = AuthenticationService.authenticate_vehicle(
        db, reg["anonymous_id"], ch["challenge_nonce"], ch["timestamp"], sig, "RSU-01"
    )
    assert res["success"] is False
    assert res["status"] == "REJECTED"


def test_auth_expired_timestamp(db):
    """Test 1d: Rejection of stale/expired challenge timestamp."""
    reg = RegistrationService.register_vehicle(db, "V_AUTH_STALE", "RSU-01")
    expired_ts = time.time() - (settings.AUTH_CHALLENGE_TIMEOUT_SECONDS + 100)
    nonce = SecureRandomSource.get_nonce()
    sig = compute_auth_response(
        vehicle_secret=reg["secret_credential"],
        anonymous_id=reg["anonymous_id"],
        challenge_nonce=nonce,
        timestamp=expired_ts
    )
    res = AuthenticationService.authenticate_vehicle(
        db, reg["anonymous_id"], nonce, expired_ts, sig, "RSU-01"
    )
    assert res["success"] is False
    assert "expired" in res["message"].lower()


def test_auth_replay(db):
    """Test 1e: Replay attack detection on identical challenge nonce."""
    reg = RegistrationService.register_vehicle(db, "V_AUTH_REPLAY", "RSU-01")
    ch = AuthenticationService.request_challenge("RSU-01")
    sig = compute_auth_response(
        vehicle_secret=reg["secret_credential"],
        anonymous_id=reg["anonymous_id"],
        challenge_nonce=ch["challenge_nonce"],
        timestamp=ch["timestamp"]
    )
    # First attempt: succeeds
    res1 = AuthenticationService.authenticate_vehicle(
        db, reg["anonymous_id"], ch["challenge_nonce"], ch["timestamp"], sig, "RSU-01"
    )
    assert res1["success"] is True

    # Replay attempt: rejected
    res2 = AuthenticationService.authenticate_vehicle(
        db, reg["anonymous_id"], ch["challenge_nonce"], ch["timestamp"], sig, "RSU-01"
    )
    assert res2["success"] is False
    assert "replay" in res2["message"].lower()


# ============================================================================
# 2. SESSION KEY ESTABLISHMENT TESTS
# ============================================================================

def test_session_valid(db):
    """Test 2a: Valid session key derivation via ML-KEM + HKDF."""
    reg = RegistrationService.register_vehicle(db, "V_SESS_1", "RSU-01")
    ch = AuthenticationService.request_challenge("RSU-01")
    sig = compute_auth_response(reg["secret_credential"], reg["anonymous_id"], ch["challenge_nonce"], ch["timestamp"])
    AuthenticationService.authenticate_vehicle(db, reg["anonymous_id"], ch["challenge_nonce"], ch["timestamp"], sig, "RSU-01")

    sess = SessionService.establish_session(db, "V_SESS_1", "RSU-01")
    assert sess["success"] is True
    assert sess["status"] == "ACTIVE"
    assert sess["key_id"].startswith("SK-")
    assert sess["key_length_bits"] == 256
    # Raw key MUST NOT be exposed in output
    assert "raw_session_key" not in sess


def test_session_authentication_required(db):
    """Test 2b: Session cannot be established without prior authentication."""
    RegistrationService.register_vehicle(db, "V_UNAUTH", "RSU-01")
    # Vehicle has NOT been authenticated
    sess = SessionService.establish_session(db, "V_UNAUTH", "RSU-01")
    assert sess["success"] is False
    assert "not authenticated" in sess["message"].lower()


def test_session_key_fingerprint(db):
    """Test 2c: Session key fingerprint is a valid 64-char SHA-256 hex string."""
    reg = RegistrationService.register_vehicle(db, "V_FP", "RSU-01")
    ch = AuthenticationService.request_challenge("RSU-01")
    sig = compute_auth_response(reg["secret_credential"], reg["anonymous_id"], ch["challenge_nonce"], ch["timestamp"])
    AuthenticationService.authenticate_vehicle(db, reg["anonymous_id"], ch["challenge_nonce"], ch["timestamp"], sig, "RSU-01")

    sess = SessionService.establish_session(db, "V_FP", "RSU-01")
    fp = sess["key_fingerprint"]
    assert len(fp) == 64
    assert all(c in "0123456789abcdef" for c in fp.lower())


# ============================================================================
# 3. GROUP KEY LIFECYCLE TESTS
# ============================================================================

def test_group_key_initial(db):
    """Test 3a: Initial group session key v1 setup."""
    gsk = GroupKeyService.get_current_gsk(db, "RSU-01")
    assert gsk is not None
    assert gsk.version == 1
    assert gsk.status == "ACTIVE"
    assert len(gsk.key_fingerprint) == 64


def test_group_key_join_update(db):
    """Test 3b: Backward security on vehicle join increments GSK version."""
    gsk_v1 = GroupKeyService.get_current_gsk(db, "RSU-01")
    v1_id = gsk_v1.gsk_id

    gsk_v2 = GroupKeyService.handle_vehicle_join(db, "RSU-01", "V_NEW_JOIN")
    assert gsk_v2.version == 2
    assert "V_NEW_JOIN" in gsk_v2.get_authorized_members_list()

    # Old GSK must be superseded
    old_gsk = db.query(GroupSessionKey).filter(GroupSessionKey.gsk_id == v1_id).first()
    assert old_gsk.status == "SUPERSEDED"


def test_group_key_leave_update(db):
    """Test 3c: Forward security on vehicle leave removes vehicle and updates GSK."""
    GroupKeyService.handle_vehicle_join(db, "RSU-01", "V_LEAVER")
    gsk_before = GroupKeyService.get_current_gsk(db, "RSU-01")
    ver_before = gsk_before.version

    gsk_after = GroupKeyService.handle_vehicle_leave(db, "RSU-01", "V_LEAVER")
    assert gsk_after.version == ver_before + 1
    assert "V_LEAVER" not in gsk_after.get_authorized_members_list()


def test_group_key_revoke_update(db):
    """Test 3d: Revocation immediately rotates GSK and marks vehicle REVOKED."""
    reg = RegistrationService.register_vehicle(db, "V_MALICIOUS", "RSU-01")
    GroupKeyService.handle_vehicle_join(db, "RSU-01", "V_MALICIOUS")
    gsk_before = GroupKeyService.get_current_gsk(db, "RSU-01")

    gsk_after = GroupKeyService.revoke_vehicle(db, "RSU-01", "V_MALICIOUS", reason="MALICIOUS_FLOODING")
    assert gsk_after.version > gsk_before.version
    assert "V_MALICIOUS" not in gsk_after.get_authorized_members_list()

    veh = db.query(Vehicle).filter(Vehicle.vehicle_id == "V_MALICIOUS").first()
    assert veh.vehicle_status == "REVOKED"
    assert veh.authentication_status == "REJECTED"


def test_group_key_version_increment(db):
    """Test 3e: Consecutive actions increment GSK monotonically."""
    v_start = GroupKeyService.get_current_gsk(db, "RSU-01").version
    gsk_j1 = GroupKeyService.handle_vehicle_join(db, "RSU-01", "V10")
    assert gsk_j1.version == v_start + 1
    gsk_j2 = GroupKeyService.handle_vehicle_join(db, "RSU-01", "V20")
    assert gsk_j2.version == v_start + 2
    gsk_l1 = GroupKeyService.handle_vehicle_leave(db, "RSU-01", "V10")
    assert gsk_l1.version == v_start + 3


# ============================================================================
# 4. MOBILITY MODEL TESTS
# ============================================================================

def test_mobility_stable(db):
    """Test 4a: Stable vehicle near RSU center has low mobility score and low handover probability."""
    RegistrationService.register_vehicle(db, "V_STAB", "RSU-01", position_x=505.0, position_y=505.0, speed=25.0)
    mob = MobilityService.evaluate_mobility(db, "V_STAB", "RSU-01")
    assert mob["mobility_score"] < 0.40
    assert mob["handover_probability"] < 0.25
    assert mob["predicted_state"] == "STABLE"


def test_mobility_boundary(db):
    """Test 4b: Vehicle near boundary heading outward has high boundary proximity factor and handover probability."""
    RegistrationService.register_vehicle(db, "V_BOUND", "RSU-01", position_x=860.0, position_y=500.0, speed=60.0)
    MobilityService.update_vehicle_kinematics(db, "V_BOUND", 860.0, 500.0, speed=60.0, direction=0.0)
    mob = MobilityService.evaluate_mobility(db, "V_BOUND", "RSU-01")
    assert mob["dist_boundary_m"] <= 50.0
    assert mob["handover_probability"] >= 0.50
    assert mob["predicted_state"] in ["APPROACHING_BOUNDARY", "IMMINENT_HANDOVER"]


def test_mobility_high_speed_and_handover(db):
    """Test 4c & 4d: High speed vehicle moving outward triggers high mobility score and high handover probability."""
    RegistrationService.register_vehicle(db, "V_FAST", "RSU-01", position_x=870.0, position_y=500.0, speed=110.0)
    MobilityService.update_vehicle_kinematics(db, "V_FAST", 870.0, 500.0, speed=110.0, direction=0.0)
    mob = MobilityService.evaluate_mobility(db, "V_FAST", "RSU-01")
    assert mob["mobility_score"] > 0.65
    assert mob["handover_probability"] >= 0.60
    assert mob["predicted_state"] in ["APPROACHING_BOUNDARY", "IMMINENT_HANDOVER"]


# ============================================================================
# 5. BEHAVIORAL TRUST MODEL TESTS
# ============================================================================

def test_trust_successful_behavior(db):
    """Test 5a: Initial trust is 1.0 (NORMAL)."""
    RegistrationService.register_vehicle(db, "V_TRUST_OK", "RSU-01")
    t = TrustService.evaluate_trust(db, "V_TRUST_OK")
    assert t["trust_score"] == 1.0
    assert t["risk_level"] == "NORMAL"


def test_trust_suspicious_event_penalty(db):
    """Test 5b: Suspicious event triggers measurable trust penalty."""
    RegistrationService.register_vehicle(db, "V_SUSP_EVT", "RSU-01")
    TrustService.record_behavior_event(db, "V_SUSP_EVT", "UNUSUAL_BEHAVIOR", "Anomalous beacon rate", penalty=0.45)
    t = TrustService.evaluate_trust(db, "V_SUSP_EVT")
    assert t["trust_score"] == 0.55
    assert t["risk_level"] == "WARNING"


def test_trust_failed_auth_degradation(db):
    """Test 5c: Failed authentication degrades trust automatically."""
    reg = RegistrationService.register_vehicle(db, "V_FAIL_AUTH", "RSU-01")
    ch = AuthenticationService.request_challenge("RSU-01")
    AuthenticationService.authenticate_vehicle(
        db, reg["anonymous_id"], ch["challenge_nonce"], ch["timestamp"], "INVALIDSIG", "RSU-01"
    )
    t = TrustService.evaluate_trust(db, "V_FAIL_AUTH")
    assert t["trust_score"] <= 0.80


def test_trust_critical_degradation(db):
    """Test 5d: Severe penalties drop trust below critical threshold."""
    RegistrationService.register_vehicle(db, "V_CRIT", "RSU-01")
    TrustService.record_behavior_event(db, "V_CRIT", "REPLAY_ATTACK", "Repeated replay", penalty=0.65)
    t = TrustService.evaluate_trust(db, "V_CRIT")
    assert t["trust_score"] <= 0.40
    assert t["risk_level"] == "CRITICAL"
    assert t["recommended_action"] == "ISOLATE_AND_REVOKE"


# ============================================================================
# 6. MT-AGKM DECISION ENGINE TESTS
# ============================================================================

def test_mt_agkm_keep(db):
    """Test 6a: Stable, trusted vehicle triggers KEEP; GSK does NOT rotate."""
    RegistrationService.register_vehicle(db, "V_K", "RSU-01", position_x=510.0, position_y=510.0, speed=20.0)
    dec = MTAGKMService.evaluate(db, "V_K", "RSU-01")
    assert dec["decision"] == "KEEP"
    assert dec["gsk_changed"] is False
    assert dec["gsk_version_before"] == dec["gsk_version_after"]


def test_mt_agkm_prepare(db):
    """Test 6b: Approaching boundary triggers PREPARE; GSK does NOT rotate (unnecessary update avoided)."""
    RegistrationService.register_vehicle(db, "V_P", "RSU-01", position_x=860.0, position_y=500.0, speed=85.0)
    MobilityService.update_vehicle_kinematics(db, "V_P", 860.0, 500.0, speed=85.0, direction=0.0)
    dec = MTAGKMService.evaluate(db, "V_P", "RSU-01")
    assert dec["decision"] == "PREPARE"
    assert dec["gsk_changed"] is False
    assert dec["gsk_version_before"] == dec["gsk_version_after"]
    assert "prepare" in dec["action"].lower()


def test_mt_agkm_update_security_event(db):
    """Test 6c: Security event triggers UPDATE; GSK rotates immediately."""
    RegistrationService.register_vehicle(db, "V_U_SEC", "RSU-01")
    dec = MTAGKMService.evaluate(db, "V_U_SEC", "RSU-01", security_event="REPLAY_ATTACK")
    assert dec["decision"] == "UPDATE"
    assert dec["gsk_changed"] is True
    assert dec["gsk_version_after"] > dec["gsk_version_before"]


def test_mt_agkm_update_critical_trust(db):
    """Test 6d: Critical trust degradation triggers UPDATE; GSK rotates."""
    RegistrationService.register_vehicle(db, "V_U_TRU", "RSU-01")
    TrustService.record_behavior_event(db, "V_U_TRU", "FLOODING", "Bogus packet flood", penalty=0.75)
    dec = MTAGKMService.evaluate(db, "V_U_TRU", "RSU-01")
    assert dec["decision"] == "UPDATE"
    assert dec["gsk_changed"] is True
    assert dec["gsk_version_after"] > dec["gsk_version_before"]


def test_mt_agkm_update_join(db):
    """Test 6e: Explicit vehicle join event triggers UPDATE."""
    RegistrationService.register_vehicle(db, "V_U_JOIN", "RSU-01")
    dec = MTAGKMService.evaluate(db, "V_U_JOIN", "RSU-01", event_type="JOIN")
    assert dec["decision"] == "UPDATE"
    assert dec["gsk_changed"] is True
    assert dec["gsk_version_after"] > dec["gsk_version_before"]


def test_mt_agkm_update_revoke(db):
    """Test 6f: Vehicle revoke event triggers UPDATE."""
    RegistrationService.register_vehicle(db, "V_U_REV", "RSU-01")
    dec = MTAGKMService.evaluate(db, "V_U_REV", "RSU-01", event_type="REVOKE")
    assert dec["decision"] == "UPDATE"
    assert dec["gsk_changed"] is True
    assert dec["gsk_version_after"] > dec["gsk_version_before"]


# ============================================================================
# 7. POST-QUANTUM KEM TESTS
# ============================================================================

def test_pq_kem_key_generation_and_encapsulation():
    """Test 7a: Verify ML-KEM provider keypair generation, encapsulation, decapsulation, and secret equality."""
    kem = PQProviderRegistry.get_kem()
    info = kem.get_algorithm_info()

    assert "ML-KEM" in info["algorithm"]
    assert "security_level" in info
    assert "public_key_bytes" in info
    assert "ciphertext_bytes" in info
    assert "shared_secret_bytes" in info

    pk, sk = kem.generate_keypair()
    assert len(pk) == info["public_key_bytes"]
    assert len(sk) == info["secret_key_bytes"]

    ct, ss_enc = kem.encapsulate(pk)
    assert len(ct) == info["ciphertext_bytes"]
    assert len(ss_enc) == info["shared_secret_bytes"]

    # Decapsulate using private key
    ss_dec = kem.decapsulate(sk, ct)
    assert len(ss_dec) == 32
    assert ss_dec == ss_enc, "Decapsulated shared secret MUST exactly match encapsulated shared secret"


def test_pq_kem_placeholder_explicit_testing():
    """Test 7b: Explicitly test DemoMLKEMPlaceholder interface and verify placeholder transparency."""
    placeholder = DemoMLKEMPlaceholder()
    info = placeholder.get_algorithm_info()
    assert info["is_native_pq"] is False
    assert "DEMO" in info["security_mode"]

    pk, sk = placeholder.generate_keypair()
    ct, ss_enc = placeholder.encapsulate(pk)
    ss_dec = placeholder.decapsulate(sk, ct)
    assert ss_dec == ss_enc
    assert len(ss_dec) == 32
