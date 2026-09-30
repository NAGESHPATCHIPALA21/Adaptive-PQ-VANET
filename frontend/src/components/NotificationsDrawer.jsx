import React, { useState } from 'react';
import { X, Bell, AlertTriangle, ShieldAlert, Cpu, CheckCircle2, Clock } from 'lucide-react';

export default function NotificationsDrawer({
  isOpen,
  onClose,
  events = [],
  decisions = []
}) {
  const [filter, setFilter] = useState('ALL');

  if (!isOpen) return null;

  const combinedItems = [
    ...events.map((e) => ({
      id: `ev-${e.event_id}`,
      type: 'SECURITY_EVENT',
      title: e.event_type,
      desc: e.description,
      vehicleId: e.vehicle_id,
      rsuId: e.rsu_id,
      timestamp: e.timestamp,
      severity: e.severity || 'INFO'
    })),
    ...decisions.map((d) => ({
      id: `dec-${d.decision_id}`,
      type: 'MTAGKM_DECISION',
      title: `MT-AGKM -> ${d.decision}`,
      desc: `${d.reason} (GSK v${d.gsk_version_before} -> v${d.gsk_version_after})`,
      vehicleId: d.vehicle_id,
      rsuId: d.rsu_id,
      timestamp: d.timestamp,
      severity: d.decision === 'UPDATE' ? 'CRITICAL' : d.decision === 'PREPARE' ? 'WARNING' : 'INFO'
    }))
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const filteredItems = combinedItems.filter((item) => {
    if (filter === 'ALL') return true;
    return item.severity === filter;
  });

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bell size={18} color="var(--accent-cyan)" />
            <div>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC' }}>
                Security Alerts & Audit Log
              </span>
              <div className="text-dim" style={{ fontSize: 11 }}>
                Live protocol events and decision telemetry
              </div>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon" title="Close drawer">
            <X size={16} />
          </button>
        </div>

        {/* Filter Bar */}
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-card)',
            display: 'flex',
            gap: 8
          }}
        >
          {['ALL', 'CRITICAL', 'WARNING', 'INFO'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilter(sev)}
              className={`badge ${
                filter === sev
                  ? sev === 'CRITICAL'
                    ? 'badge-red'
                    : sev === 'WARNING'
                    ? 'badge-amber'
                    : 'badge-cyan'
                  : 'badge-muted'
              }`}
              style={{ cursor: 'pointer', padding: '4px 10px' }}
            >
              {sev}
            </button>
          ))}
        </div>

        {/* Body Items */}
        <div className="drawer-body">
          {filteredItems.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <CheckCircle2 size={24} color="var(--status-emerald-light)" />
              </div>
              <div className="empty-state-title">No Security Alerts</div>
              <div className="empty-state-desc">
                All vehicular telemetry and group session keys are operating within normal parameters.
              </div>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isCrit = item.severity === 'CRITICAL';
              const isWarn = item.severity === 'WARNING';
              return (
                <div
                  key={item.id}
                  style={{
                    background: 'rgba(17, 25, 39, 0.7)',
                    border: `1px solid ${
                      isCrit ? 'rgba(239, 68, 68, 0.35)' : isWarn ? 'rgba(245, 158, 11, 0.3)' : 'var(--border-subtle)'
                    }`,
                    borderRadius: 8,
                    padding: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {isCrit ? (
                        <ShieldAlert size={16} color="var(--status-red-light)" />
                      ) : isWarn ? (
                        <AlertTriangle size={16} color="var(--status-amber-light)" />
                      ) : (
                        <Cpu size={16} color="var(--accent-cyan)" />
                      )}
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>
                        {item.title}
                      </span>
                    </div>
                    <span
                      className={`badge ${
                        isCrit ? 'badge-red' : isWarn ? 'badge-amber' : 'badge-cyan'
                      }`}
                    >
                      {item.severity}
                    </span>
                  </div>

                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {item.desc}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      marginTop: 4,
                      paddingTop: 6,
                      borderTop: '1px solid rgba(29, 41, 57, 0.4)'
                    }}
                  >
                    <span className="mono">
                      Target: {item.vehicleId} | {item.rsuId}
                    </span>
                    <span className="mono" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} />
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
