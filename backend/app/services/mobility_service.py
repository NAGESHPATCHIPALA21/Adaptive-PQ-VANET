"""
Mobility Analysis Service
Implements:
1. Kinematic tracking (position_x, position_y, speed, direction, acceleration).
2. Distance-to-boundary computation within RSU circular fog coverage zone.
3. Residence time / dwell time estimation T_res based on velocity vector and boundary distance.
4. Normalized mobility score calculation:
     mobility_score in [0.0, 1.0]
     where 0.0 = completely static / central, 1.0 = imminent cell boundary departure.
5. Handover probability estimation.
"""

import math
import time
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.models.vehicle import Vehicle
from backend.app.models.rsu import RSU

class MobilityService:
    """Evaluates vehicular kinematics and cell boundary proximity."""

    @staticmethod
    def calculate_distance_to_rsu(
        veh_x: float, veh_y: float,
        rsu_x: float, rsu_y: float
    ) -> float:
        """Euclidean distance from vehicle to RSU center."""
        return math.hypot(veh_x - rsu_x, veh_y - rsu_y)

    @staticmethod
    def evaluate_mobility(
        db: Session,
        vehicle_id: str,
        rsu_id: str = "RSU-01"
    ) -> Dict[str, Any]:
        """
        Calculates normalized mobility metrics for a vehicle within its current RSU cell.
        """
        vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id).first()
        rsu = db.query(RSU).filter(RSU.rsu_id == rsu_id).first()

        if not vehicle:
            return {"success": False, "message": f"Vehicle {vehicle_id} not found"}

        # Use default RSU center if RSU record not explicitly positioned
        rsu_x = rsu.position_x if rsu else 500.0
        rsu_y = rsu.position_y if rsu else 500.0
        radius = rsu.coverage_radius if rsu else 400.0

        # Current distance from RSU center
        dist_center = MobilityService.calculate_distance_to_rsu(
            vehicle.position_x, vehicle.position_y, rsu_x, rsu_y
        )

        # Distance to coverage perimeter boundary
        dist_to_boundary = max(0.0, radius - dist_center)

        # Boundary proximity factor [0.0 (center) -> 1.0 (at or outside boundary)]
        proximity_factor = min(1.0, dist_center / radius)

        # Directional factor: determine whether heading is moving outward toward boundary
        # Heading angle in radians (0 = East, 90 = North)
        angle_rad = math.radians(vehicle.direction)
        v_dx = math.cos(angle_rad)
        v_dy = math.sin(angle_rad)

        # Radial vector from RSU center to vehicle
        radial_dx = (vehicle.position_x - rsu_x) / (dist_center + 1e-6)
        radial_dy = (vehicle.position_y - rsu_y) / (dist_center + 1e-6)

        # Dot product: positive = heading outward toward boundary, negative = heading inward toward RSU
        outward_dot = (v_dx * radial_dx) + (v_dy * radial_dy)
        directional_factor = max(0.0, (outward_dot + 1.0) / 2.0)  # normalized [0, 1]

        # Speed factor: speed normalized up to 120 km/h (33.3 m/s)
        speed_factor = min(1.0, vehicle.speed / 120.0)

        # Estimated dwell / residence time in seconds
        # Convert speed to m/s
        speed_mps = max(1.0, vehicle.speed * (1000.0 / 3600.0))
        estimated_residence_time = dist_to_boundary / speed_mps if outward_dot > 0 else 999.0

        # Weighted Normalized Mobility Score in [0.0, 1.0]
        # Formula: w_prox * proximity + w_speed * speed + w_dir * directional
        w_prox = 0.45
        w_speed = 0.30
        w_dir = 0.25
        mobility_score = (w_prox * proximity_factor) + (w_speed * speed_factor) + (w_dir * directional_factor)
        mobility_score = max(0.0, min(1.0, mobility_score))

        # Handover probability: high when close to boundary with outward velocity
        handover_prob = proximity_factor * directional_factor * (0.5 + 0.5 * speed_factor)
        handover_prob = max(0.0, min(1.0, handover_prob))

        # Update vehicle entity
        vehicle.handover_probability = handover_prob
        vehicle.last_seen = time.time()
        db.commit()

        is_imminent_handover = mobility_score >= settings.MOBILITY_HIGH_THRESHOLD or handover_prob >= 0.70

        if is_imminent_handover:
            predicted_state = "IMMINENT_HANDOVER"
        elif dist_to_boundary <= 100.0:
            predicted_state = "APPROACHING_BOUNDARY"
        else:
            predicted_state = "STABLE"

        return {
            "success": True,
            "vehicle_id": vehicle_id,
            "rsu_id": rsu_id,
            "position": {"x": vehicle.position_x, "y": vehicle.position_y},
            "speed_kmh": vehicle.speed,
            "direction_deg": vehicle.direction,
            "dist_center_m": round(dist_center, 1),
            "dist_boundary_m": round(dist_to_boundary, 1),
            "estimated_residence_time_sec": round(estimated_residence_time, 1),
            "mobility_score": round(mobility_score, 3),
            "handover_probability": round(handover_prob, 3),
            "is_imminent_handover": is_imminent_handover,
            "predicted_state": predicted_state
        }

    @staticmethod
    def update_vehicle_kinematics(
        db: Session,
        vehicle_id: str,
        new_x: float,
        new_y: float,
        speed: float,
        direction: float,
        acceleration: float = 0.0
    ) -> Dict[str, Any]:
        """Updates vehicle spatial position and kinematics, then recalculates mobility."""
        vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id).first()
        if not vehicle:
            return {"success": False, "message": f"Vehicle {vehicle_id} not found"}

        vehicle.position_x = new_x
        vehicle.position_y = new_y
        vehicle.speed = speed
        vehicle.direction = direction
        vehicle.acceleration = acceleration
        vehicle.last_seen = time.time()
        db.commit()

        return MobilityService.evaluate_mobility(db, vehicle_id, vehicle.current_rsu)
