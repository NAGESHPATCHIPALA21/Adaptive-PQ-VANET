import React from 'react';
import {
  Play,
  Pause,
  StepForward,
  RefreshCw,
  Bell,
  Settings,
  HelpCircle
} from 'lucide-react';

import { NAV_ITEMS } from '../utils/navigation';


export default function TopNavbar({
  activeTab,
  autoSimulate,
  onToggleAutoSimulate,
  onStepSimulation,
  onRefresh,
  isRefreshing,
  onOpenNotifications,
  unreadAlertCount = 0,
  onOpenSettings,
  onOpenIntro
}) {
  const currentNav = NAV_ITEMS.find((n) => n.id === activeTab) || NAV_ITEMS[0];

  return (
    <header className="top-navbar">
      {/* Left: Section Identity */}
      <div className="navbar-left">
        <div className="page-title-group">
          <span className="page-title">{currentNav.label}</span>
          <span className="page-breadcrumb">// {currentNav.desc}</span>
        </div>
      </div>

      {/* Right: Environment, Operational Status & Action Controls */}
      <div className="navbar-right">
        {/* Environment Badge */}
        <span className="badge badge-indigo">
          RESEARCH SIMULATION
        </span>

        {/* System Status Indicator */}
        <span className="badge badge-emerald">
          <span className="status-dot emerald" style={{ width: 6, height: 6 }} />
          OPERATIONAL
        </span>

        <div style={{ width: 1, height: 24, background: 'var(--border-subtle)', margin: '0 4px' }} />

        {/* Simulation Controls */}
        <button
          onClick={onToggleAutoSimulate}
          className={`btn ${autoSimulate ? 'btn-emerald' : 'btn-secondary'}`}
          style={{ padding: '6px 12px', fontSize: 12 }}
          title={autoSimulate ? 'Pause continuous vehicular movement' : 'Start continuous vehicular movement'}
        >
          {autoSimulate ? (
            <>
              <Pause size={14} />
              <span>Auto-Active</span>
            </>
          ) : (
            <>
              <Play size={14} />
              <span>Auto-Simulate</span>
            </>
          )}
        </button>

        <button
          onClick={onStepSimulation}
          className="btn btn-secondary"
          style={{ padding: '6px 12px', fontSize: 12 }}
          title="Advance simulation by 1 time step"
        >
          <StepForward size={14} />
          <span>Step</span>
        </button>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="btn btn-secondary"
          style={{ padding: '6px 12px', fontSize: 12 }}
          title="Refresh live telemetry from backend"
        >
          <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} />
          <span>Refresh</span>
        </button>

        <div style={{ width: 1, height: 24, background: 'var(--border-subtle)', margin: '0 4px' }} />

        {/* Notification Bell */}
        <button
          onClick={onOpenNotifications}
          className="btn-icon"
          title="Security Events & Decision Alerts"
          style={{ position: 'relative' }}
        >
          <Bell size={16} />
          {unreadAlertCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--status-amber)'
              }}
            />
          )}
        </button>

        {/* Platform Settings */}
        <button
          onClick={onOpenSettings}
          className="btn-icon"
          title="Platform Preferences & Endpoints"
        >
          <Settings size={16} />
        </button>

        {/* Mission Briefing / Intro */}
        <button
          onClick={onOpenIntro}
          className="btn-icon"
          title="Product Identity & Architecture Overview"
        >
          <HelpCircle size={16} />
        </button>
      </div>
    </header>
  );
}
