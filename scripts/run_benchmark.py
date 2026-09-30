"""
Reproducible Empirical Benchmark CLI Runner
Executes head-to-head comparison between Traditional GSK and Proposed MT-AGKM.
Outputs exact empirical metrics without fabrication.
"""

import sys
import os
import json
import argparse
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.app.database import init_db, SessionLocal
from backend.app.services.simulation_service import SimulationService

def main():
    parser = argparse.ArgumentParser(description="Adaptive PQ-VANET Comparative Benchmark")
    parser.add_argument("--steps", type=int, default=50, help="Number of simulation steps")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    parser.add_argument("--output", type=str, default="benchmark_results.json", help="Path to save output JSON")
    args = parser.parse_args()

    init_db()
    db = SessionLocal()

    print("=" * 60)
    print("ADAPTIVE PQ-VANET: EMPIRICAL BENCHMARK")
    print(f"Configuration: steps={args.steps}, seed={args.seed}")
    print("=" * 60)

    try:
        results = SimulationService.run_comparative_benchmark(
            db=db,
            duration_steps=args.steps,
            seed=args.seed
        )

        trad = results["traditional_scheme"]
        mt = results["proposed_mt_agkm"]
        comp = results["comparative_metrics"]
        cfg = results["experiment_config"]

        print()
        print(f"Fleet Size: {cfg['vehicle_count']} vehicles across {cfg['rsu_count']} RSUs")
        print(f"Total State Evaluations: {results['total_evaluations']}")
        print(f"Measured Host KEM Op Latency: {cfg['measured_kem_latency_ms']} ms")
        print(f"Execution Wall Time: {cfg['measured_duration_seconds']} s")
        print()
        print("TRADITIONAL SCHEME:")
        print(f"  - Total GSK Updates: {trad['total_gsk_updates']}")
        print(f"  - Unnecessary Updates: {trad['unnecessary_updates']}")
        print(f"  - Broadcast Messages: {trad['broadcast_messages']}")
        print(f"  - Estimated Key-Mgmt Time: {trad['estimated_rekey_latency_ms']} ms")
        print()
        print("PROPOSED MT-AGKM SCHEME:")
        print(f"  - Total GSK Updates: {mt['update_decisions']}")
        print(f"  - KEEP Decisions: {mt['keep_decisions']}")
        print(f"  - PREPARE Decisions: {mt['prepare_decisions']}")
        print(f"  - Unnecessary Updates Avoided: {mt['unnecessary_updates_avoided']}")
        print(f"  - Broadcast Messages: {mt['broadcast_messages']}")
        print(f"  - Estimated Key-Mgmt Time: {mt['estimated_rekey_latency_ms']} ms")
        print()
        print("COMPARATIVE IMPROVEMENT:")
        print(f"  - GSK Update Reduction: {comp['gsk_update_reduction_percent']}%")
        print(f"  - Communication Overhead Reduction: {comp['communication_overhead_reduction_percent']}%")
        print(f"  - Forward & Backward Security: {comp['forward_backward_security']}")
        print("=" * 60)

        out_path = Path(args.output)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2)
        print(f"Results saved to: {out_path.resolve()}")

    finally:
        db.close()

if __name__ == "__main__":
    main()
