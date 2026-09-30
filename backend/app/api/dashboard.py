"""
Dashboard Aggregation REST API Router
Supplies unified state for the frontend command center, KPI counters, topology, and crypto modes.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models.vehicle import Vehicle
from backend.app.models.rsu import RSU
from backend.app.models.group_key import GroupSessionKey
from backend.app.models.security_event import SecurityEvent
from backend.app.models.mt_agkm import MTAGKMDecision
from backend.app.services.simulation_service import SimulationService
from backend.app.crypto.pq_interface import PQProviderRegistry

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    SimulationService.setup_topology(db)

    vehicles = db.query(Vehicle).all()
    rsus = db.query(RSU).all()
    events = db.query(SecurityEvent).order_by(SecurityEvent.timestamp.desc()).limit(15).all()
    decisions = db.query(MTAGKMDecision).order_by(MTAGKMDecision.timestamp.desc()).limit(15).all()
    active_gsk = db.query(GroupSessionKey).filter(GroupSessionKey.status == "ACTIVE").order_by(GroupSessionKey.version.desc()).first()

    total_vehicles = len(vehicles)
    auth_count = sum(1 for v in vehicles if v.authentication_status == "AUTHENTICATED")
    suspicious_count = sum(1 for v in vehicles if v.vehicle_status in ["SUSPICIOUS", "REVOKED", "WARNING"])
    avg_trust = round(sum(v.trust_score for v in vehicles) / max(1, total_vehicles), 3) if total_vehicles > 0 else 1.0

    keep_count = db.query(MTAGKMDecision).filter(MTAGKMDecision.decision == "KEEP").count()
    prep_count = db.query(MTAGKMDecision).filter(MTAGKMDecision.decision == "PREPARE").count()
    update_count = db.query(MTAGKMDecision).filter(MTAGKMDecision.decision == "UPDATE").count()

    total_gsk_updates = db.query(GroupSessionKey).count()
    pq_info = PQProviderRegistry.get_active_status()

    return {
        "project_info": {
            "title": settings.PROJECT_NAME,
            "version": settings.PROJECT_VERSION,
            "platform_edition": settings.PLATFORM_EDITION,
            "architecture": settings.ARCHITECTURE
        },
        "system_status": {
            "network_status": "ONLINE",
            "pq_security_mode": pq_info["pq_mode"],
            "is_native_pq": pq_info["is_native_pq"],
            "qrng_status": settings.QRNG_MODE,
            "quantum_hardware_connected": settings.QUANTUM_HARDWARE_CONNECTED,
            "randomness_source": "CSPRNG / OS Entropy (secrets.token_bytes)",
            "kem_algorithm": pq_info["kem_algorithm"],
            "hash_algorithm": settings.HASH_ALGORITHM,
            "kdf_algorithm": settings.KDF_ALGORITHM,
            "active_gsk_version": active_gsk.version if active_gsk else 1,
            "active_gsk_id": active_gsk.gsk_id if active_gsk else "GSK-RSU-01-V1"
        },
        "kpis": {
            "total_vehicles": total_vehicles,
            "authenticated_vehicles": auth_count,
            "suspicious_vehicles": suspicious_count,
            "total_rsus": len(rsus),
            "average_trust_score": avg_trust,
            "total_gsk_updates": total_gsk_updates,
            "keep_decisions": keep_count,
            "prepare_decisions": prep_count,
            "update_decisions": update_count
        },
        "topology": {
            "trusted_authority": {
                "name": "Central Cloud / Trusted Authority (TA)",
                "status": "OPERATIONAL",
                "registered_vehicles_count": total_vehicles
            },
            "rsus": [r.to_dict() for r in rsus],
            "vehicles": [v.to_dict() for v in vehicles]
        },
        "recent_security_events": [e.to_dict() for e in events],
        "recent_decisions": [d.to_dict() for d in decisions]
    }
