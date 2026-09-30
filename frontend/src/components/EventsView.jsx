import React, { useState } from 'react';
import {
  Clock,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Search,
  RefreshCw
} from 'lucide-react';


export default function EventsView({
  events = [],
  decisions = [],
  onRefresh
}) {
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Combine and sort events
  const allTimelineItems = [
    ...events.map((e) => ({
      id: `ev-${e.event_id}`,
      kind: 'EVENT',
      title: e.event_type,
      description: e.description,
      vehicleId: e.vehicle_id,
      rsuId: e.rsu_id,
      timestamp: e.timestamp,
      severity: e.severity || 'INFO'
    })),
    ...decisions.map((d) => ({
      id: `dec-${d.decision_id}`,
      kind: 'DECISION',
      title: `MT-AGKM Decision: ${d.decision}`,
      description: `${d.reason} (GSK Transition: v${d.gsk_version_before} -> v${d.gsk_version_after})`,
      vehicleId: d.vehicle_id,
      rsuId: d.rsu_id,
      timestamp: d.timestamp,
      severity: d.decision === 'UPDATE' ? 'CRITICAL' : d.decision === 'PREPARE' ? 'WARNING' : 'INFO'
    }))
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const filteredItems = allTimelineItems.filter((item) => {
    if (filter !== 'ALL' && item.severity !== filter) return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.vehicleId.toLowerCase().includes(q) ||
      item.rsuId.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em' }}>
          Security Events & Audit Log
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          Real-time audit trail of VANET authentication, mobility transitions, and MT-AGKM decisions.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="cyber-card">
        <div className="cyber-card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div className="card-title-group">
            <Clock size={18} color="var(--accent-cyan)" />
            <span className="card-title">Live Audit Stream ({allTimelineItems.length} records)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search event, VID, or RSU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-control mono"
                style={{ paddingLeft: 30, width: 220, fontSize: 12 }}
              />
              <Search
                size={14}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>

            {/* Severity Filter */}
            <div style={{ display: 'flex', gap: 6 }}>
              {['ALL', 'CRITICAL', 'WARNING', 'INFO'].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`badge ${
                    filter === s
                      ? s === 'CRITICAL'
                        ? 'badge-red'
                        : s === 'WARNING'
                        ? 'badge-amber'
                        : 'badge-cyan'
                      : 'badge-muted'
                  }`}
                  style={{ cursor: 'pointer', padding: '5px 10px' }}
                >
                  {s}
                </button>
              ))}
            </div>

            <button onClick={onRefresh} className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}>
              <RefreshCw size={12} />
              <span>Refresh Log</span>
            </button>
          </div>
        </div>

        {/* Timeline Content */}
        <div className="cyber-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredItems.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <CheckCircle2 size={24} color="var(--status-emerald-light)" />
              </div>
              <div className="empty-state-title">No Events Matched Filter</div>
              <div className="empty-state-desc">
                No events currently match the selected severity or search term.
              </div>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isCrit = item.severity === 'CRITICAL';
              const isWarn = item.severity === 'WARNING';
              const timeStr = new Date(item.timestamp).toLocaleTimeString();
              const dateStr = new Date(item.timestamp).toLocaleDateString();

              return (
                <div
                  key={item.id}
                  style={{
                    background: '#0D131D',
                    border: `1px solid ${
                      isCrit
                        ? 'rgba(239, 68, 68, 0.35)'
                        : isWarn
                        ? 'rgba(245, 158, 11, 0.3)'
                        : 'var(--border-subtle)'
                    }`,
                    borderRadius: 8,
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 16
                  }}
                >
                  {/* Timestamp Box */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      width: 80,
                      flexShrink: 0
                    }}
                  >
                    <span className="mono font-bold text-cyan" style={{ fontSize: 13 }}>
                      {timeStr}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {dateStr}
                    </span>
                  </div>

                  <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--border-subtle)' }} />

                  {/* Icon */}
                  <div style={{ marginTop: 2, flexShrink: 0 }}>
                    {isCrit ? (
                      <ShieldAlert size={18} color="var(--status-red-light)" />
                    ) : isWarn ? (
                      <AlertTriangle size={18} color="var(--status-amber-light)" />
                    ) : (
                      <Cpu size={18} color="var(--accent-cyan)" />
                    )}
                  </div>

                  {/* Event Details */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC' }}>
                        {item.title}
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span className="badge badge-muted mono">{item.vehicleId}</span>
                        <span className="badge badge-cyan mono">{item.rsuId}</span>
                        <span
                          className={`badge ${
                            isCrit ? 'badge-red' : isWarn ? 'badge-amber' : 'badge-emerald'
                          }`}
                        >
                          {item.severity}
                        </span>
                      </div>
                    </div>

                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {item.description}
                    </p>
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
