"""
Anonymous Authentication and Challenge-Response Verification Module
Implements:
1. Cryptographic pseudonym (Anonymous ID) generation by Trusted Authority (TA).
2. Fresh challenge generation with nonce and timestamp protection.
3. Vehicle response calculation using vehicle credential.
4. Nonce cache and time-window replay protection.
5. Timing-attack resistant verification.
"""

import time
from typing import Tuple, Dict, Set, Optional
from backend.app.crypto.hashing import hmac_sha256, verify_hmac, sha256_hash
from backend.app.crypto.random_source import SecureRandomSource
from backend.app.config import settings

# In-memory replay cache tracking used nonces with timestamps
_USED_NONCES: Dict[str, float] = {}

def clean_expired_nonces():
    """Removes nonces older than challenge timeout to prevent memory unbounded growth."""
    now = time.time()
    expired = [nonce for nonce, ts in _USED_NONCES.items() if now - ts > settings.AUTH_CHALLENGE_TIMEOUT_SECONDS * 2]
    for nonce in expired:
        _USED_NONCES.pop(nonce, None)

def generate_anonymous_id(
    ta_master_key: str,
    vehicle_id: str,
    nonce: Optional[str] = None,
    timestamp: Optional[float] = None
) -> Tuple[str, str, float]:
    """
    Generates a cryptographically secure pseudonym (Anonymous ID) for a vehicle.
    
    Formula:
        pseudo_raw = HMAC(ta_master_key, vehicle_id || nonce || timestamp)
        anonymous_id = "ANON-" + pseudo_raw[:16].upper()
        
    Returns:
        (anonymous_id, nonce, timestamp)
    """
    if nonce is None:
        nonce = SecureRandomSource.get_nonce()
    if timestamp is None:
        timestamp = time.time()

    payload = f"{vehicle_id}:{nonce}:{timestamp:.4f}"
    pseudo_hash = hmac_sha256(ta_master_key, payload)
    anonymous_id = f"ANON-{pseudo_hash[:16].upper()}"
    return anonymous_id, nonce, timestamp

def create_auth_challenge(rsu_id: str) -> Dict[str, any]:
    """
    Generates a fresh authentication challenge from an RSU.
    Includes fresh 128-bit nonce, timestamp, and challenge token.
    """
    clean_expired_nonces()
    challenge_nonce = SecureRandomSource.get_nonce()
    timestamp = time.time()
    challenge_token = sha256_hash(f"{rsu_id}:{challenge_nonce}:{timestamp:.4f}")

    return {
        "rsu_id": rsu_id,
        "challenge_nonce": challenge_nonce,
        "timestamp": timestamp,
        "challenge_token": challenge_token
    }

def compute_auth_response(
    vehicle_secret: str,
    anonymous_id: str,
    challenge_nonce: str,
    timestamp: float
) -> str:
    """
    Computes challenge response on the vehicle side using its secret credential.
    
    Formula:
        response = HMAC(vehicle_secret, challenge_nonce || anonymous_id || timestamp)
    """
    message = f"{challenge_nonce}:{anonymous_id}:{timestamp:.4f}"
    return hmac_sha256(vehicle_secret, message)

def verify_auth_response(
    vehicle_secret: str,
    anonymous_id: str,
    challenge_nonce: str,
    timestamp: float,
    response: str
) -> Tuple[bool, str]:
    """
    Verifies authentication response on RSU/TA side.
    Performs:
    1. Timestamp freshness check (within AUTH_CHALLENGE_TIMEOUT_SECONDS)
    2. Replay protection (checks if challenge_nonce was already processed)
    3. Cryptographic HMAC response matching
    
    Returns:
        (is_valid: bool, reason: str)
    """
    now = time.time()
    # 1. Freshness check
    time_diff = abs(now - timestamp)
    if time_diff > settings.AUTH_CHALLENGE_TIMEOUT_SECONDS:
        return False, f"Challenge expired: time difference {time_diff:.1f}s exceeds limit {settings.AUTH_CHALLENGE_TIMEOUT_SECONDS}s"

    # 2. Replay check
    if challenge_nonce in _USED_NONCES:
        return False, "Replay attack detected: challenge nonce already used"

    # 3. Cryptographic HMAC verification
    expected_response = compute_auth_response(vehicle_secret, anonymous_id, challenge_nonce, timestamp)
    if not verify_hmac(vehicle_secret, f"{challenge_nonce}:{anonymous_id}:{timestamp:.4f}", response):
        return False, "Invalid authentication response signature"

    # Record nonce to prevent future replay
    _USED_NONCES[challenge_nonce] = now
    return True, "Authentication verified successfully"
