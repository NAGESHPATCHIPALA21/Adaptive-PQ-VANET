import React, { useState } from 'react';
import {
  Car,
  Search,
  UserPlus,
  Maximize2,
  Shield
} from 'lucide-react';

export default function VehiclesView({
  vehicles = [],
  onSelectVehicle,
  onOpenDrawer,
  onOpenRegisterModal
}) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterTrust, setFilterTrust] = useState('ALL');
  const [filterMobility, setFilterMobility] = useState('ALL');

  const filtered = vehicles.filter((v) => {
    // 1. Text Search
    const matchesQuery =
      v.vehicle_id.toLowerCase().includes(search.toLowerCase()) ||
      v.anonymous_id.toLowerCase().includes(search.toLowerCase()) ||
      v.current_rsu.toLowerCase().includes(search.toLowerCase());

    if (!matchesQuery) return false;

    // 2. Status Filter
    if (filterStatus === 'AUTHENTICATED' && v.authentication_status !== 'AUTHENTICATED') return false;
    if (filterStatus === 'UNAUTHENTICATED' && v.authentication_status === 'AUTHENTICATED') return false;
    if (filterStatus === 'SUSPICIOUS' && (v.vehicle_status !== 'SUSPICIOUS' && v.trust_score >= 0.40)) return false;
    if (filterStatus === 'REVOKED' && v.vehicle_status !== 'REVOKED') return false;

    // 3. Trust Filter
    if (filterTrust === 'HIGH' && v.trust_score < 0.70) return false;
    if (filterTrust === 'WARNING' && (v.trust_score < 0.40 || v.trust_score >= 0.70)) return false;
    if (filterTrust === 'CRITICAL' && v.trust_score >= 0.40) return false;

    // 4. Mobility Filter
    if (filterMobility === 'HIGH' && v.handover_probability < 0.60) return false;
    if (filterMobility === 'LOW' && v.handover_probability >= 0.60) return false;

    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header & Advanced Filter Bar */}
      <div className="cyber-card">
        <div className="cyber-card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div className="card-title-group">
            <Car size={18} color="var(--accent-cyan)" />
            <div>
              <span className="card-title">Trusted Authority Vehicle Registry & Anonymous Identifiers</span>
              <span className="card-subtitle" style={{ marginLeft: 8 }}>
                Privacy-Preserving Pseudonym Management ({filtered.length} of {vehicles.length} nodes)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search VID, Pseudonym, RSU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-control mono"
                style={{ paddingLeft: 30, width: 230, fontSize: 12 }}
                aria-label="Search vehicles"
              />
              <Search
                size={14}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
                aria-hidden="true"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="select-control mono"
              style={{ fontSize: 12 }}
              aria-label="Filter by vehicle state"
            >
              <option value="ALL">Status: All Nodes</option>
              <option value="AUTHENTICATED">Status: Authenticated</option>
              <option value="UNAUTHENTICATED">Status: Unauthenticated</option>
              <option value="SUSPICIOUS">Status: Suspicious</option>
              <option value="REVOKED">Status: Revoked</option>
            </select>

            {/* Trust Filter */}
            <select
              value={filterTrust}
              onChange={(e) => setFilterTrust(e.target.value)}
              className="select-control mono"
              style={{ fontSize: 12 }}
              aria-label="Filter by trust score"
            >
              <option value="ALL">Trust: All</option>
              <option value="HIGH">Trust: High (&ge; 0.70)</option>
              <option value="WARNING">Trust: Warning (0.40 - 0.69)</option>
              <option value="CRITICAL">Trust: Critical (&lt; 0.40)</option>
            </select>

            {/* Mobility Filter */}
            <select
              value={filterMobility}
              onChange={(e) => setFilterMobility(e.target.value)}
              className="select-control mono"
              style={{ fontSize: 12 }}
              aria-label="Filter by mobility handover probability"
            >
              <option value="ALL">Mobility: All</option>
              <option value="LOW">Mobility: Stable Cruise (&lt; 0.60)</option>
              <option value="HIGH">Mobility: Boundary Approaching (&ge; 0.60)</option>
            </select>

            {/* Register New Vehicle Button */}
            <button
              onClick={onOpenRegisterModal}
              className="btn btn-primary"
              style={{ fontSize: 12, padding: '7px 14px' }}
              aria-label="Register new vehicle with Trusted Authority"
            >
              <UserPlus size={14} />
              <span>Register Node</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vehicle ID (TA Archive)</th>
                <th>Anonymous Identity (PID Broadcast)</th>
                <th>Fog RSU Cell</th>
                <th>Kinematics & Location</th>
                <th>Trust Score</th>
                <th>Handover Probability</th>
                <th>Authentication</th>
                <th>Active GSK</th>
                <th>Node State</th>
                <th>Investigation</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div className="text-muted" style={{ fontSize: 13 }}>
                      No vehicles matched the specified filter or search criteria.
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((v) => {
                  const isThreat = v.trust_score < 0.40 || v.vehicle_status === 'REVOKED';
                  const isAuth = v.authentication_status === 'AUTHENTICATED';
                  const isHighMobility = v.handover_probability >= 0.60;

                  return (
                    <tr
                      key={v.vehicle_id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        onSelectVehicle(v);
                        onOpenDrawer();
                      }}
                    >
                      <td className="mono" style={{ fontWeight: 700, color: '#F8FAFC' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Shield size={13} color="var(--accent-cyan)" />
                          <span>{v.vehicle_id}</span>
                        </div>
                      </td>

                      <td className="mono text-cyan" style={{ fontSize: 12 }}>
                        {v.anonymous_id}
                      </td>

                      <td className="mono font-semibold">
                        {v.current_rsu}
                      </td>

                      <td className="mono" style={{ fontSize: 12 }}>
                        {v.speed} km/h @ ({Math.round(v.position_x)}m, {Math.round(v.position_y)}m)
                      </td>

                      {/* Visual Trust Indicator Bar */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 80 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                            <span
                              className="mono font-bold"
                              style={{
                                color: isThreat
                                  ? 'var(--status-red-light)'
                                  : v.trust_score < 0.70
                                  ? 'var(--status-amber-light)'
                                  : 'var(--status-emerald-light)'
                              }}
                            >
                              {v.trust_score}
                            </span>
                          </div>
                          <div style={{ height: 4, background: '#0D131D', borderRadius: 2, overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${Math.min(100, (v.trust_score || 0) * 100)}%`,
                                height: '100%',
                                background: isThreat
                                  ? 'var(--status-red)'
                                  : v.trust_score < 0.70
                                  ? 'var(--status-amber)'
                                  : 'var(--status-emerald)'
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Handover Probability */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 80 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                            <span
                              className="mono font-bold"
                              style={{ color: isHighMobility ? 'var(--status-amber-light)' : '#F8FAFC' }}
                            >
                              {v.handover_probability}
                            </span>
                          </div>
                          <div style={{ height: 4, background: '#0D131D', borderRadius: 2, overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${Math.min(100, (v.handover_probability || 0) * 100)}%`,
                                height: '100%',
                                background: isHighMobility ? 'var(--status-amber)' : 'var(--accent-cyan)'
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className={`badge ${isAuth ? 'badge-emerald' : 'badge-amber'}`}>
                          {v.authentication_status}
                        </span>
                      </td>

                      <td className="mono text-emerald font-bold">
                        v{v.group_key_version}
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            v.vehicle_status === 'REVOKED'
                              ? 'badge-red'
                              : v.vehicle_status === 'SUSPICIOUS'
                              ? 'badge-amber'
                              : 'badge-cyan'
                          }`}
                        >
                          {v.vehicle_status}
                        </span>
                      </td>

                      <td>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectVehicle(v);
                            onOpenDrawer();
                          }}
                          className="btn-icon"
                          title={`Investigate ${v.vehicle_id}`}
                          aria-label={`Investigate ${v.vehicle_id}`}
                        >
                          <Maximize2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
