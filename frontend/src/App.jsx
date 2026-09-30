import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchDashboardSummary,
  triggerSimulationStep
} from './api';

// Shell & Navigation Components
import Sidebar from './components/Sidebar';
import TopNavbar from './components/TopNavbar';
import LandingIntroModal from './components/LandingIntroModal';
import VehicleDrawer from './components/VehicleDrawer';
import NotificationsDrawer from './components/NotificationsDrawer';
import SettingsModal from './components/SettingsModal';
import RegisterVehicleModal from './components/RegisterVehicleModal';

// 10 Section Views
import OverviewView from './components/OverviewView';
import NetworkView from './components/NetworkView';
import VehiclesView from './components/VehiclesView';
import SecurityView from './components/SecurityView';
import MTAGKMView from './components/MTAGKMView';
import SimulationView from './components/SimulationView';
import BenchmarksView from './components/BenchmarksView';
import CryptographyView from './components/CryptographyView';
import EventsView from './components/EventsView';
import SystemView from './components/SystemView';

// Error & Loading Helpers
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Layout & UI Toggles
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isIntroOpen, setIsIntroOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // Auto-Simulation State
  const [autoSimulate, setAutoSimulate] = useState(false);

  // Fetch telemetry data from backend
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      const data = await fetchDashboardSummary();
      if (data) {
        setSummaryData(data);
        setError(null);
        // Retain selected vehicle or select first available
        if (data.topology?.vehicles?.length > 0) {
          setSelectedVehicle((prev) => {
            if (!prev) return data.topology.vehicles[0];
            const updated = data.topology.vehicles.find((v) => v.vehicle_id === prev.vehicle_id);
            return updated || data.topology.vehicles[0];
          });
        }
      } else {
        throw new Error('Backend responded with empty or malformed telemetry payload.');
      }
    } catch (err) {
      console.error('Failed to load dashboard summary:', err);
      setError(err.message || 'Unable to retrieve live VANET telemetry.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const data = await fetchDashboardSummary();
        if (!ignore && data) {
          setSummaryData(data);
          setError(null);
          if (data.topology?.vehicles?.length > 0) {
            setSelectedVehicle((prev) => {
              if (!prev) return data.topology.vehicles[0];
              const updated = data.topology.vehicles.find((v) => v.vehicle_id === prev.vehicle_id);
              return updated || data.topology.vehicles[0];
            });
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load initial dashboard summary:', err);
          setError(err.message || 'Unable to retrieve live VANET telemetry.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, []);

  // Periodic Auto-Simulation Loop
  useEffect(() => {
    let timer = null;
    if (autoSimulate) {
      timer = setInterval(async () => {
        try {
          await triggerSimulationStep();
          await loadData(true);
        } catch (err) {
          console.warn('Auto-simulate step failed:', err);
        }
      }, 2000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [autoSimulate, loadData]);

  // Step simulation once
  const handleStepSimulation = async () => {
    try {
      await triggerSimulationStep();
      loadData(true);
    } catch (err) {
      alert(`Simulation step failed: ${err.message}`);
    }
  };

  const vehicles = summaryData?.topology?.vehicles || [];
  const events = summaryData?.recent_security_events || [];
  const decisions = summaryData?.recent_decisions || [];
  const systemStatus = summaryData?.system_status || {
    network_status: 'ONLINE',
    active_gsk_version: 2,
    is_native_pq: true,
    kem_algorithm: 'ML-KEM-768 (NIST FIPS 203)'
  };
  const projectInfo = summaryData?.project_info || {
    title: 'Adaptive PQ-VANET',
    platform_edition: 'V2X Security Operations Platform'
  };

  // Open drawer for a vehicle
  const handleSelectVehicle = (v) => {
    setSelectedVehicle(v);
  };

  const handleOpenDrawer = () => {
    setIsDrawerOpen(true);
  };

  return (
    <div className="app-shell">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tabId) => setActiveTab(tabId)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        gskVersion={systemStatus.active_gsk_version}
      />

      {/* 2. Main Content Wrapper */}
      <div className="main-wrapper">
        {/* Top Navbar */}
        <TopNavbar
          activeTab={activeTab}
          autoSimulate={autoSimulate}
          onToggleAutoSimulate={() => setAutoSimulate(!autoSimulate)}
          onStepSimulation={handleStepSimulation}
          onRefresh={() => loadData(false)}
          isRefreshing={isRefreshing}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          unreadAlertCount={events.length}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenIntro={() => setIsIntroOpen(true)}
        />

        {/* Page Content Body */}
        <main className="page-container">
          {/* Loading Skeleton */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="skeleton" style={{ height: 40, width: 320 }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16 }}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 100 }} />
                ))}
              </div>
              <div className="skeleton" style={{ height: 320 }} />
            </div>
          )}

          {/* Error Banner with Retry */}
          {error && !loading && (
            <div
              className="cyber-card"
              style={{
                border: '1px solid rgba(239, 68, 68, 0.4)',
                background: 'rgba(239, 68, 68, 0.08)',
                padding: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <AlertTriangle size={24} color="var(--status-red-light)" />
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC' }}>
                    Backend Telemetry Unavailable
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {error} Check that the FastAPI server is running on http://127.0.0.1:8000.
                  </div>
                </div>
              </div>
              <button onClick={() => loadData(false)} className="btn btn-primary">
                <RefreshCw size={14} />
                <span>Retry Connection</span>
              </button>
            </div>
          )}

          {/* 10 Navigation Section Views */}
          {!loading && (
            <>
              {activeTab === 'overview' && (
                <OverviewView
                  summaryData={summaryData}
                  selectedVehicle={selectedVehicle}
                  onSelectVehicle={(v) => {
                    handleSelectVehicle(v);
                    handleOpenDrawer();
                  }}
                  onRefresh={() => loadData(true)}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                />
              )}

              {activeTab === 'network' && (
                <NetworkView
                  vehicles={vehicles}
                  selectedVehicle={selectedVehicle}
                  onSelectVehicle={handleSelectVehicle}
                  currentGSKVersion={systemStatus.active_gsk_version}
                  onOpenDrawer={handleOpenDrawer}
                />
              )}

              {activeTab === 'vehicles' && (
                <VehiclesView
                  vehicles={vehicles}
                  onSelectVehicle={handleSelectVehicle}
                  onOpenDrawer={handleOpenDrawer}
                  onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
                />
              )}

              {activeTab === 'security' && (
                <SecurityView
                  vehicles={vehicles}
                  onRefresh={() => loadData(true)}
                />
              )}

              {activeTab === 'mt_agkm' && (
                <MTAGKMView
                  vehicles={vehicles}
                  currentGSKVersion={systemStatus.active_gsk_version}
                  onDecisionExecuted={() => loadData(true)}
                />
              )}

              {activeTab === 'simulation' && (
                <SimulationView
                  onRefreshSystem={() => loadData(true)}
                />
              )}

              {activeTab === 'benchmarks' && (
                <BenchmarksView
                  onRefresh={() => loadData(true)}
                />
              )}

              {activeTab === 'cryptography' && (
                <CryptographyView
                  systemStatus={systemStatus}
                />
              )}

              {activeTab === 'events' && (
                <EventsView
                  events={events}
                  decisions={decisions}
                  onRefresh={() => loadData(true)}
                />
              )}

              {activeTab === 'system' && (
                <SystemView
                  systemStatus={systemStatus}
                  projectInfo={projectInfo}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* 3. Slide-over Vehicle Detail Drawer */}
      {isDrawerOpen && selectedVehicle && (
        <VehicleDrawer
          vehicle={selectedVehicle}
          onClose={() => setIsDrawerOpen(false)}
          activeGSKVersion={systemStatus.active_gsk_version}
          onActionComplete={() => loadData(true)}
        />
      )}

      {/* 4. Slide-over Notifications & Alerts Drawer */}
      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        events={events}
        decisions={decisions}
      />

      {/* 5. Platform Settings & Endpoints Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onResetComplete={() => loadData(true)}
      />

      {/* 6. Landing Intro / Mission Briefing Modal */}
      <LandingIntroModal
        isOpen={isIntroOpen}
        onClose={() => setIsIntroOpen(false)}
      />

      {/* 7. Register Vehicle Modal */}
      <RegisterVehicleModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onRegisterSuccess={() => loadData(true)}
      />
    </div>
  );
}
