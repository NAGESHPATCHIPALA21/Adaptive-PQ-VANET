"""
Key Derivation Function (KDF) Module
Implements standard HKDF (RFC 5869) using SHA-256 to derive secure session keys
and cryptographically isolated sub-keys from authenticated shared secrets and nonces.
"""

from typing import Union, Optional
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend

def derive_key_hkdf(
    shared_secret: Union[str, bytes],
    salt: Optional[Union[str, bytes]] = None,
    info: Optional[Union[str, bytes]] = None,
    length_bytes: int = 32
) -> bytes:
    """
    Derives cryptographically strong key material using HKDF-SHA256.
    
    Args:
        shared_secret: Input keying material (authenticated shared secret)
        salt: Optional salt value (e.g. combined nonces)
        info: Optional context and application-specific info string
        length_bytes: Desired output key length (default 32 bytes / 256 bits)
        
    Returns:
        Derived raw key bytes of length `length_bytes`.
    """
    if isinstance(shared_secret, str):
        shared_secret = shared_secret.encode('utf-8')
    if isinstance(salt, str):
        salt = salt.encode('utf-8')
    if isinstance(info, str):
        info = info.encode('utf-8')

    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=length_bytes,
        salt=salt,
        info=info,
        backend=default_backend()
    )
    return hkdf.derive(shared_secret)

def derive_session_key_hex(
    shared_secret: str,
    vehicle_nonce: str,
    rsu_nonce: str,
    context: str = "VANET-V2I-SESSION-KEY"
) -> str:
    """
    Convenience function returning derived session key as a 64-char hex string (256-bit).
    """
    combined_salt = f"{vehicle_nonce}:{rsu_nonce}".encode('utf-8')
    derived_bytes = derive_key_hkdf(
        shared_secret=shared_secret,
        salt=combined_salt,
        info=context,
        length_bytes=32
    )
    return derived_bytes.hex()
