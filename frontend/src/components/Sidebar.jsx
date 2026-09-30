import React from 'react';
import {
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { NAV_GROUPS } from '../utils/navigation';

export default function Sidebar({ activeTab, onSelectTab, collapsed, onToggleCollapse, gskVersion = 1 }) {
  return (
    <aside
      className={`sidebar-container ${collapsed ? 'collapsed' : ''}`}
      aria-label="Application Navigation"
    >
      {/* Header / Logo Lockup */}
      <div className="sidebar-header">
        <div className="logo-lockup" title="Adaptive PQ-VANET">
          <div className="logo-badge" aria-hidden="true">APQ</div>
          {!collapsed && (
            <div className="product-meta">
              <div className="product-name">Adaptive PQ-VANET</div>
              <div className="product-tagline">V2X Security Operations</div>
            </div>
          )}
        </div>
        <button
          onClick={onToggleCollapse}
          className="btn-icon"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          style={{ width: 28, height: 28, padding: 0 }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Main Navigation with Hierarchy Grouping */}
      <nav className="sidebar-nav">
        {NAV_GROUPS.map((group) => (
          <div key={group.category} style={{ marginBottom: collapsed ? 8 : 12 }}>
            {!collapsed && (
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  padding: '6px 12px 4px',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                {group.category}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    title={collapsed ? item.label : undefined}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon size={16} className="nav-item-icon" />
                    {!collapsed && (
                      <span className="nav-item-label">{item.label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Status Pill */}
      <div className="sidebar-footer">
        <div className="status-pill">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="status-dot emerald" aria-hidden="true" />
            {!collapsed && <span style={{ color: 'var(--text-secondary)' }}>System Status</span>}
          </div>
          {!collapsed && (
            <span className="text-emerald mono" style={{ fontWeight: 600 }}>
              Operational
            </span>
          )}
        </div>
        {!collapsed && (
          <div
            style={{
              marginTop: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 11,
              color: 'var(--text-muted)'
            }}
          >
            <span>Active GSK:</span>
            <span className="mono text-cyan" style={{ fontWeight: 700 }}>
              v{gskVersion}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
