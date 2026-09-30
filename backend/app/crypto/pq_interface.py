"""
Post-Quantum Cryptography (PQC) Abstraction Layer
Academic Disclaimer & NIST Standards Compliance:

This module provides the formal Key Encapsulation Mechanism (KEM) architecture
conforming to NIST FIPS 203 (ML-KEM / CRYSTALS-Kyber-768).

Dynamic Dual-Mode Architecture:
1. NATIVE MODE:
   When `kyber_py` is available, this module binds directly to the NIST FIPS 203
   ML-KEM-768 algorithm:
   - Public Key Size: 1184 bytes
   - Ciphertext Size: 1088 bytes
   - Shared Secret Size: 32 bytes (256-bit post-quantum entropy)

2. PLACEHOLDER / DEMO MODE:
   If the native PQ library is not installed in the target environment, the system
   falls back to `DemoMLKEMPlaceholder` and explicitly labels:
   `is_native_pq: False`, `pq_mode: "DEMO / PLACEHOLDER"`.
   Never falsely labels classical HMAC as post-quantum.
"""

from abc import ABC, abstractmethod
from typing import Tuple, Dict, Any
import hashlib
import secrets

# Attempt import of standard NIST FIPS 203 library
_NATIVE_PQ_AVAILABLE = False
_ML_KEM_768_ENGINE = None

try:
    from kyber_py.ml_kem import ML_KEM_768
    _ML_KEM_768_ENGINE = ML_KEM_768
    _NATIVE_PQ_AVAILABLE = True
except (ImportError, Exception):
    _NATIVE_PQ_AVAILABLE = False
    _ML_KEM_768_ENGINE = None


class PQKeyExchangeInterface(ABC):
    """Abstract Base Class for Post-Quantum Key Encapsulation Mechanisms (KEM)."""

    @abstractmethod
    def generate_keypair(self) -> Tuple[bytes, bytes]:
        """Generates (public_key, secret_key) bytes."""
        pass

    @abstractmethod
    def encapsulate(self, public_key: bytes) -> Tuple[bytes, bytes]:
        """Encapsulates a shared secret under public_key. Returns (ciphertext, shared_secret)."""
        pass

    @abstractmethod
    def decapsulate(self, secret_key: bytes, ciphertext: bytes) -> bytes:
        """Decapsulates ciphertext using secret_key. Returns shared_secret."""
        pass

    @abstractmethod
    def get_algorithm_info(self) -> Dict[str, Any]:
        """Returns metadata regarding algorithm, security level, and implementation status."""
        pass


class NativeMLKEM768Provider(PQKeyExchangeInterface):
    """
    Genuine Post-Quantum Key Encapsulation using NIST FIPS 203 ML-KEM-768.
    Direct integration with kyber_py library.
    """
    ALGORITHM_NAME = "ML-KEM-768 (NIST FIPS 203 / CRYSTALS-Kyber)"
    NIST_SECURITY_CATEGORY = 3
    IS_HARDWARE_PQ = False
    IS_NATIVE_PQ = True

    def __init__(self):
        if not _NATIVE_PQ_AVAILABLE:
            raise RuntimeError("Native ML-KEM engine not installed in Python environment")
        self.engine = _ML_KEM_768_ENGINE

    def generate_keypair(self) -> Tuple[bytes, bytes]:
        pk, sk = self.engine.keygen()
        return pk, sk

    def encapsulate(self, public_key: bytes) -> Tuple[bytes, bytes]:
        # kyber_py encaps returns (shared_secret, ciphertext)
        shared_secret, ciphertext = self.engine.encaps(public_key)
        return ciphertext, shared_secret

    def decapsulate(self, secret_key: bytes, ciphertext: bytes) -> bytes:
        shared_secret = self.engine.decaps(secret_key, ciphertext)
        return shared_secret

    def get_algorithm_info(self) -> Dict[str, Any]:
        return {
            "algorithm": self.ALGORITHM_NAME,
            "nist_category": self.NIST_SECURITY_CATEGORY,
            "security_level": f"NIST Category {self.NIST_SECURITY_CATEGORY} (Post-Quantum, equivalent to AES-192)",
            "security_mode": "ML-KEM-768 — NATIVE (kyber-py FIPS 203)",
            "is_native_pq": True,
            "public_key_length_bytes": 1184,
            "secret_key_length_bytes": 2400,
            "ciphertext_length_bytes": 1088,
            "shared_secret_length_bytes": 32,
            "public_key_bytes": 1184,
            "secret_key_bytes": 2400,
            "ciphertext_bytes": 1088,
            "shared_secret_bytes": 32,
            "status": "OPERATIONAL_NATIVE"
        }


class DemoMLKEMPlaceholder(PQKeyExchangeInterface):
    """
    Fallback Architecture Placeholder when native PQ library is unavailable.
    Explicitly labeled as PLACEHOLDER to maintain scientific honesty.
    """
    ALGORITHM_NAME = "ML-KEM-768 (Interface Placeholder)"
    NIST_SECURITY_CATEGORY = 3
    IS_HARDWARE_PQ = False
    IS_NATIVE_PQ = False

    def __init__(self):
        self.mode = "DEMO / PLACEHOLDER (Native PQC Not Available)"

    def generate_keypair(self) -> Tuple[bytes, bytes]:
        sk = secrets.token_bytes(32)
        pk = hashlib.sha256(sk + b":placeholder_pk").digest()
        return pk, sk

    def encapsulate(self, public_key: bytes) -> Tuple[bytes, bytes]:
        ephemeral = secrets.token_bytes(32)
        shared_secret = hashlib.sha256(ephemeral + public_key).digest()
        ciphertext = hashlib.sha256(ephemeral + b":ct_tag").digest() + ephemeral
        return ciphertext, shared_secret

    def decapsulate(self, secret_key: bytes, ciphertext: bytes) -> bytes:
        if len(ciphertext) < 64:
            raise ValueError("Invalid ciphertext length for KEM decapsulation")
        ephemeral = ciphertext[32:]
        pk_derived = hashlib.sha256(secret_key + b":placeholder_pk").digest()
        shared_secret = hashlib.sha256(ephemeral + pk_derived).digest()
        return shared_secret

    def get_algorithm_info(self) -> Dict[str, Any]:
        return {
            "algorithm": self.ALGORITHM_NAME,
            "nist_category": self.NIST_SECURITY_CATEGORY,
            "security_level": "DEMO / Non-Quantum (Architectural Placeholder)",
            "security_mode": self.mode,
            "is_native_pq": False,
            "public_key_length_bytes": 32,
            "secret_key_length_bytes": 32,
            "ciphertext_length_bytes": 64,
            "shared_secret_length_bytes": 32,
            "public_key_bytes": 32,
            "secret_key_bytes": 32,
            "ciphertext_bytes": 64,
            "shared_secret_bytes": 32,
            "status": "OPERATIONAL_PLACEHOLDER"
        }


class PQProviderRegistry:
    """Registry allowing dynamic discovery between Native ML-KEM and Demo Placeholders."""

    if _NATIVE_PQ_AVAILABLE:
        _current_kem: PQKeyExchangeInterface = NativeMLKEM768Provider()
    else:
        _current_kem: PQKeyExchangeInterface = DemoMLKEMPlaceholder()

    @classmethod
    def get_kem(cls) -> PQKeyExchangeInterface:
        return cls._current_kem

    @classmethod
    def set_kem(cls, provider: PQKeyExchangeInterface):
        cls._current_kem = provider

    @classmethod
    def is_native_available(cls) -> bool:
        return _NATIVE_PQ_AVAILABLE

    @classmethod
    def get_active_status(cls) -> Dict[str, Any]:
        info = cls._current_kem.get_algorithm_info()
        return {
            "pq_mode": info["security_mode"],
            "kem_algorithm": info["algorithm"],
            "is_native_pq": info["is_native_pq"],
            "status": info["status"]
        }
