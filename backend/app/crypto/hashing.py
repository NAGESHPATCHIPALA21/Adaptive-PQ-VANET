"""
Hashing and HMAC Cryptographic Primitives
Provides standard hashing (SHA-256) and HMAC functions for message integrity,
pseudonym generation, and challenge-response authentication.
"""

import hmac
import hashlib
from typing import Union

def sha256_hash(data: Union[str, bytes]) -> str:
    """Computes SHA-256 hash returned as hexadecimal string."""
    if isinstance(data, str):
        data = data.encode('utf-8')
    return hashlib.sha256(data).hexdigest()

def sha256_bytes(data: Union[str, bytes]) -> bytes:
    """Computes SHA-256 hash returned as raw bytes."""
    if isinstance(data, str):
        data = data.encode('utf-8')
    return hashlib.sha256(data).digest()

def hmac_sha256(key: Union[str, bytes], message: Union[str, bytes]) -> str:
    """Computes HMAC-SHA256 returned as hexadecimal string."""
    if isinstance(key, str):
        key = key.encode('utf-8')
    if isinstance(message, str):
        message = message.encode('utf-8')
    return hmac.new(key, message, hashlib.sha256).hexdigest()

def verify_hmac(key: Union[str, bytes], message: Union[str, bytes], expected_hmac: str) -> bool:
    """Timing-attack-resistant verification of HMAC."""
    computed = hmac_sha256(key, message)
    return hmac.compare_digest(computed.lower(), expected_hmac.lower())
