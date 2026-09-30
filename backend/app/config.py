# Adaptive PQ-VANET Environment Configuration
# Project: Adaptive Post-Quantum Anonymous Authentication and Mobility-Trust-Aware Group Key Management for Vehicle-Fog-Cloud VANETs
# Enterprise Cybersecurity Architecture

import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load .env if present
env_path = BASE_DIR / ".env"
if env_path.exists():
    load_dotenv(env_path)

DB_PATH = os.path.join(BASE_DIR, "vanet_prototype.db")

class Settings(BaseModel):
    PROJECT_NAME: str = "Adaptive PQ-VANET"
    PROJECT_VERSION: str = "1.0.0-enterprise"
    PLATFORM_EDITION: str = "Enterprise Post-Quantum Vehicular Security Platform"
    ARCHITECTURE: str = "Vehicle-Fog-Cloud Distributed Security Architecture"

    # Cryptography & Security Labels
    QRNG_MODE: str = "CSPRNG-based QRNG abstraction (OS Entropy Placeholder)"
    QUANTUM_HARDWARE_CONNECTED: bool = False
    HASH_ALGORITHM: str = "SHA-256"
    KDF_ALGORITHM: str = "HKDF-SHA256"
    KEY_LENGTH_BITS: int = 256

    # Master Secrets (Read strictly from environment with dev fallback)
    TA_MASTER_SECRET: str = os.getenv("TA_MASTER_SECRET", "DEV_FALLBACK_TA_SECRET_SEED_DO_NOT_USE_IN_PROD")
    AUTH_CHALLENGE_TIMEOUT_SECONDS: int = int(os.getenv("AUTH_CHALLENGE_TIMEOUT_SECONDS", "60"))
    SESSION_KEY_LIFETIME_SECONDS: int = int(os.getenv("SESSION_KEY_LIFETIME_SECONDS", "3600"))
    GSK_DEFAULT_LIFETIME_SECONDS: int = int(os.getenv("GSK_DEFAULT_LIFETIME_SECONDS", "7200"))

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")

    # Thresholds for MT-AGKM Engine
    TRUST_CRITICAL_THRESHOLD: float = 0.40
    TRUST_WARNING_THRESHOLD: float = 0.65
    MOBILITY_HIGH_THRESHOLD: float = 0.75
    MOBILITY_MEDIUM_THRESHOLD: float = 0.50

settings = Settings()
