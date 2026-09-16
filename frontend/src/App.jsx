import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';

import POSSales from './pages/POSSales';
import AdminDashboard from './pages/AdminDashboard';
import LotsList from './pages/LotsList';
import CreateLot from './pages/CreateLot';
import ProductsList from './pages/ProductsList';
import CutsManagement from './pages/CutsManagement';
import InventoryView from './pages/InventoryView';
import SalesHistory from './pages/SalesHistory';
import UsersManagement from './pages/UsersManagement';
import BusinessSettings from './pages/BusinessSettings';
import AuditLogs from './pages/AuditLogs';
import Profile from './pages/Profile';

export default function App() {
  const { user, loading, isAdmin, isVendor } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Set default initial tab based on role:
  // Vendedor lands directly on POS (Ventas); Admin lands on Dashboard!
  const [activeTab, setActiveTab] = useState('pos');

  useEffect(() => {
    if (isAdmin) {
      setActiveTab('dashboard');
    } else {
      setActiveTab('pos');
    }
  }, [isAdmin, user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white font-bold text-lg">
        Iniciando sistema de carnicería...
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar onToggleSidebar={() => setSidebarOpen(true)} activeTab={activeTab} />

      {/* Collapsible Sidebar (starts collapsed) */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'dashboard' && isAdmin && <AdminDashboard />}
        {activeTab === 'pos' && <POSSales />}
        {activeTab === 'lots' && (
          <LotsList onNavigateCreate={() => setActiveTab('create-lot')} />
        )}
        {activeTab === 'create-lot' && (
          <CreateLot onLotCreated={() => setActiveTab(isAdmin ? 'lots' : 'pos')} />
        )}
        {activeTab === 'cuts-catalog' && isAdmin && <CutsManagement />}
        {(activeTab === 'products' || activeTab === 'create-product') && <ProductsList />}
        {activeTab === 'inventory' && <InventoryView />}
        {activeTab === 'sales-history' && <SalesHistory />}
        {activeTab === 'users' && isAdmin && <UsersManagement />}
        {activeTab === 'settings' && isAdmin && <BusinessSettings />}
        {activeTab === 'audit' && isAdmin && <AuditLogs />}
        {activeTab === 'profile' && <Profile />}
      </main>

      {/* Mobile Floating Quick-Action POS Shortcut if on another tab */}
      {activeTab !== 'pos' && (
        <div className="fixed bottom-4 right-4 z-20 sm:hidden">
          <button
            type="button"
            onClick={() => setActiveTab('pos')}
            className="touch-btn bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-3 rounded-2xl shadow-xl shadow-emerald-700/30 flex items-center gap-2"
          >
            <span>Punto de Venta</span>
          </button>
        </div>
      )}
    </div>
  );
}
