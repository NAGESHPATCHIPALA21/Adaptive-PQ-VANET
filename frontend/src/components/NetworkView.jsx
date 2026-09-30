import React, { useState } from 'react';
import {
  Radio,
  Compass,
  Maximize2
} from 'lucide-react';


const RSUS = [
  { id: 'RSU-01', name: 'West Gateway', x: 190, y: 190, radius: 150, ip: '10.0.1.1' },
  { id: 'RSU-02', name: 'Central Hub', x: 470, y: 190, radius: 150, ip: '10.0.2.1' },
  { id: 'RSU-03', name: 'Tech Corridor', x: 750, y: 190, radius: 150, ip: '10.0.3.1' },
  { id: 'RSU-04', name: 'East Terminal', x: 1030, y: 190, radius: 150, ip: '10.0.4.1' },
];

export default function NetworkView({
  vehicles = [],
  selectedVehicle,
  onSelectVehicle,
  currentGSKVersion = 2,
  onOpenDrawer
}) {
  const [filterMode, setFilterMode] = useState('ALL');
  const [showCoverage, setShowCoverage] = useState(true);
  const [showBackhauls, setShowBackhauls] = useState(true);

  // Map world coordinate (0 -> 2600m) to SVG width (1200px)
  const mapX = (x) => 80 + (x / 2600) * 1040;
  const mapY = (y) => 260 + ((y - 400) / 100) * 45;

  const filteredVehicles = vehicles.filter((v) => {
    if (filterMode === 'NORMAL') return v.trust_score >= 0.70 && v.handover_probability < 0.60;
    if (filterMode === 'HANDOVER') return v.handover_probability >= 0.60;
    if (filterMode === 'THREAT') return v.trust_score < 0.40 || v.vehicle_status === 'REVOKED';
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Topology Header & Controls */}
      <div className="cyber-card">
        <div className="cyber-card-header">
          <div className="card-title-group">
            <Radio size={18} color="var(--accent-cyan)" />
            <div>
              <span className="card-title">Hierarchical V2X Network Architecture</span>
              <span className="card-subtitle" style={{ marginLeft: 8 }}>
                Cloud Trusted Authority → Fog RSUs → Multi-Cell Highway Nodes
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* View Layer Toggles */}
            <button
              onClick={() => setShowCoverage(!showCoverage)}
              className={`badge ${showCoverage ? 'badge-cyan' : 'badge-muted'}`}
              style={{ cursor: 'pointer', padding: '5px 10px' }}
            >
              Fog Coverage (400m)
            </button>
            <button
              onClick={() => setShowBackhauls(!showBackhauls)}
              className={`badge ${showBackhauls ? 'badge-indigo' : 'badge-muted'}`}
              style={{ cursor: 'pointer', padding: '5px 10px' }}
            >
              TA Backhaul Links
            </button>

            {/* Filter mode */}
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              className="select-control mono"
              style={{ fontSize: 11, padding: '4px 8px' }}
            >
              <option value="ALL">Show All Vehicles</option>
              <option value="NORMAL">Normal / Trusted</option>
              <option value="HANDOVER">Handover (PREPARE)</option>
              <option value="THREAT">Threat Nodes (UPDATE)</option>
            </select>
          </div>
        </div>

        {/* Large SVG Network Canvas */}
        <div style={{ position: 'relative', width: '100%', height: 460, background: '#070B12', overflow: 'hidden' }}>
          <svg width="100%" height="100%" viewBox="0 0 1200 440" preserveAspectRatio="none">
            <defs>
              {/* Backhaul Gradient */}
              <linearGradient id="backhaulGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#6366F1" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.2" />
              </linearGradient>

              {/* Fog Coverage Gradient */}
              <radialGradient id="fogGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.08" />
                <stop offset="70%" stopColor="#38BDF8" stopOpacity="0.02" />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* ============================================================= */}
            {/* LEVEL 1: CLOUD / TRUSTED AUTHORITY (TA)                      */}
            {/* ============================================================= */}
            <g transform="translate(600, 36)">
              {/* Central TA Node */}
              <rect x="-140" y="-22" width="280" height="44" rx="8" fill="#111927" stroke="#6366F1" strokeWidth="1.5" />
              <circle cx="-110" cy="0" r="12" fill="rgba(99, 102, 241, 0.2)" />
              <text x="-110" y="4" textAnchor="middle" fill="#818CF8" fontSize="12" fontWeight="bold">TA</text>
              <text x="-85" y="-3" fill="#F8FAFC" fontSize="12" fontWeight="700">Central Cloud / Trusted Authority</text>
              <text x="-85" y="12" fill="#94A3B8" fontSize="10">Root Master Secrets & Anonymous ID Registry</text>
            </g>

            {/* Secure Backhaul Links from TA to RSUs */}
            {showBackhauls && RSUS.map((rsu) => (
              <g key={`link-${rsu.id}`}>
                <path
                  d={`M 600,58 C 600,95 ${rsu.x},95 ${rsu.x},130`}
                  fill="none"
                  stroke="url(#backhaulGrad)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                >
                  <animate attributeName="stroke-dashoffset" from="16" to="0" dur="2s" repeatCount="indefinite" />
                </path>
              </g>
            ))}

            {/* ============================================================= */}
            {/* LEVEL 2: HIGHWAY ROAD BED                                     */}
            {/* ============================================================= */}
            <rect x="30" y="225" width="1140" height="90" fill="#0D131D" rx="8" />
            <line x1="30" y1="270" x2="1170" y2="270" stroke="#1D2939" strokeWidth="2" strokeDasharray="14 14" />
            <line x1="30" y1="225" x2="1170" y2="225" stroke="#2A3B4F" strokeWidth="1" />
            <line x1="30" y1="315" x2="1170" y2="315" stroke="#2A3B4F" strokeWidth="1" />

            {/* Mile markers */}
            {[0, 600, 1200, 1800, 2400].map((m, idx) => (
              <g key={`marker-${idx}`} transform={`translate(${80 + (idx * 260)}, 332)`}>
                <line x1="0" y1="-17" x2="0" y2="-10" stroke="#475569" strokeWidth="1" />
                <text x="0" y="0" textAnchor="middle" fill="#64748B" fontSize="9" fontFamily="monospace">
                  {m}m
                </text>
              </g>
            ))}

            {/* ============================================================= */}
            {/* LEVEL 3: FOG ROADSIDE UNITS (RSU 01 - 04)                     */}
            {/* ============================================================= */}
            {RSUS.map((rsu) => (
              <g key={rsu.id}>
                {/* 400m Wireless Coverage Circle */}
                {showCoverage && (
                  <circle
                    cx={rsu.x}
                    cy={rsu.y + 70}
                    r={rsu.radius}
                    fill="url(#fogGrad)"
                    stroke="rgba(56, 189, 248, 0.2)"
                    strokeWidth="1.2"
                    strokeDasharray="5 5"
                  />
                )}

                {/* Vertical Support Mast to Road */}
                <line x1={rsu.x} y1={rsu.y} x2={rsu.x} y2={225} stroke="rgba(56, 189, 248, 0.3)" strokeWidth="1.2" />

                {/* RSU Tower Base & Node */}
                <g transform={`translate(${rsu.x}, ${rsu.y - 20})`}>
                  <rect x="-38" y="-20" width="76" height="38" rx="6" fill="#111927" stroke="var(--accent-cyan)" strokeWidth="1.5" />
                  <circle cx="-20" cy="0" r="4" fill="var(--status-emerald-light)">
                    <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <text x="6" y="-3" textAnchor="middle" fill="#F8FAFC" fontSize="11" fontWeight="bold">
                    {rsu.id}
                  </text>
                  <text x="6" y="11" textAnchor="middle" fill="var(--accent-cyan)" fontSize="9" fontFamily="monospace">
                    GSK v{currentGSKVersion}
                  </text>

                  {/* Antenna Pulse Wave */}
                  <circle cx="0" cy="-20" r="6" fill="none" stroke="var(--accent-cyan)" strokeWidth="1" opacity="0.6">
                    <animate attributeName="r" values="4;18" dur="2.4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0" dur="2.4s" repeatCount="indefinite" />
                  </circle>
                </g>
              </g>
            ))}

            {/* ============================================================= */}
            {/* LEVEL 4: MOVING VEHICLES (NODES)                              */}
            {/* ============================================================= */}
            {filteredVehicles.map((v) => {
              const vx = mapX(v.position_x);
              const vy = mapY(v.position_y);
              const isSelected = selectedVehicle && selectedVehicle.vehicle_id === v.vehicle_id;
              const isThreat = v.trust_score < 0.40 || v.vehicle_status === 'REVOKED';
              const isHandover = v.handover_probability >= 0.60;

              let nodeBorder = 'var(--status-emerald-light)';
              if (isThreat) nodeBorder = 'var(--status-red-light)';
              else if (isHandover) nodeBorder = 'var(--status-amber-light)';

              // Find closest RSU for animated uplink
              const closestRsu = RSUS.reduce((prev, curr) =>
                Math.abs(curr.x - vx) < Math.abs(prev.x - vx) ? curr : prev
              );

              return (
                <g
                  key={v.vehicle_id}
                  onClick={() => {
                    onSelectVehicle(v);
                    if (onOpenDrawer) onOpenDrawer();
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {/* PREPARE Mode: Handover Anticipation Vector */}
                  {isHandover && (
                    <line
                      x1={vx}
                      y1={vy}
                      x2={closestRsu.x}
                      y2={closestRsu.y + 10}
                      stroke="rgba(245, 158, 11, 0.4)"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                    >
                      <animate attributeName="stroke-dashoffset" from="12" to="0" dur="1s" repeatCount="indefinite" />
                    </line>
                  )}

                  {/* Threat Mode: Red Isolation Pulse */}
                  {isThreat && (
                    <circle cx={vx} cy={vy} r="22" fill="rgba(239, 68, 68, 0.2)" stroke="var(--status-red-light)" strokeWidth="1.2">
                      <animate attributeName="r" values="16;28;16" dur="1.4s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.8;0.1;0.8" dur="1.4s" repeatCount="indefinite" />
                    </circle>
                  )}

                  {/* Selection Indicator Ring */}
                  {isSelected && (
                    <circle cx={vx} cy={vy} r="24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2" strokeDasharray="4 4">
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from={`0 ${vx} ${vy}`}
                        to={`360 ${vx} ${vy}`}
                        dur="6s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}

                  {/* Vehicle Body Rectangle */}
                  <rect
                    x={vx - 15}
                    y={vy - 9}
                    width="30"
                    height="18"
                    rx="4"
                    fill="#111927"
                    stroke={nodeBorder}
                    strokeWidth={isSelected ? '2.2' : '1.6'}
                  />

                  {/* Heading Vector Arrow */}
                  <polygon
                    points={
                      v.direction === 180
                        ? `${vx - 19},${vy} ${vx - 14},${vy - 4} ${vx - 14},${vy + 4}`
                        : `${vx + 19},${vy} ${vx + 14},${vy - 4} ${vx + 14},${vy + 4}`
                    }
                    fill={nodeBorder}
                  />

                  {/* Vehicle ID Label */}
                  <text
                    x={vx}
                    y={vy - 14}
                    textAnchor="middle"
                    fill={isSelected ? 'var(--accent-cyan)' : '#F8FAFC'}
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {v.vehicle_id}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Interactive Legend Bar */}
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              left: 16,
              right: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(13, 19, 29, 0.92)',
              backdropFilter: 'blur(8px)',
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              fontSize: 11
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--status-emerald-light)' }}>
                <span className="status-dot emerald" />
                Trusted Node (MT-AGKM KEEP)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--status-amber-light)' }}>
                <span className="status-dot amber" />
                Cell Boundary Vector (MT-AGKM PREPARE)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--status-red-light)' }}>
                <span className="status-dot red" />
                Security Threat Isolated (MT-AGKM UPDATE)
              </span>
            </div>

            <div className="mono text-muted" style={{ fontSize: 11 }}>
              Click any vehicular node to inspect real-time cryptographic state
            </div>
          </div>
        </div>
      </div>

      {/* Selected Vehicle Context Snapshot */}
      {selectedVehicle && (
        <div className="cyber-card">
          <div className="cyber-card-header">
            <div className="card-title-group">
              <Compass size={16} color="var(--accent-cyan)" />
              <span className="card-title">Active Node Telemetry: {selectedVehicle.vehicle_id}</span>
            </div>
            <button
              onClick={onOpenDrawer}
              className="btn btn-primary"
              style={{ fontSize: 12, padding: '4px 10px' }}
            >
              <span>Open Security Drawer</span>
              <Maximize2 size={12} />
            </button>
          </div>
          <div className="cyber-card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
            <div>
              <div className="text-dim" style={{ fontSize: 11 }}>Anonymous ID</div>
              <div className="mono text-cyan" style={{ fontSize: 13, fontWeight: 600 }}>{selectedVehicle.anonymous_id}</div>
            </div>
            <div>
              <div className="text-dim" style={{ fontSize: 11 }}>RSU Cell</div>
              <div className="mono font-semibold" style={{ fontSize: 13, color: '#F8FAFC' }}>{selectedVehicle.current_rsu}</div>
            </div>
            <div>
              <div className="text-dim" style={{ fontSize: 11 }}>Velocity & Heading</div>
              <div className="mono font-semibold" style={{ fontSize: 13, color: '#F8FAFC' }}>
                {selectedVehicle.speed} km/h @ {selectedVehicle.direction}°
              </div>
            </div>
            <div>
              <div className="text-dim" style={{ fontSize: 11 }}>Trust Score</div>
              <div
                className="mono font-bold"
                style={{
                  fontSize: 13,
                  color: selectedVehicle.trust_score < 0.4 ? 'var(--status-red-light)' : 'var(--status-emerald-light)'
                }}
              >
                {selectedVehicle.trust_score}
              </div>
            </div>
            <div>
              <div className="text-dim" style={{ fontSize: 11 }}>Handover Prob</div>
              <div
                className="mono font-bold"
                style={{
                  fontSize: 13,
                  color: selectedVehicle.handover_probability >= 0.6 ? 'var(--status-amber-light)' : '#F8FAFC'
                }}
              >
                {selectedVehicle.handover_probability}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
