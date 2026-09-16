import React from 'react';
import {
  ShoppingCart,
  PlusCircle,
  History,
  Boxes,
  User,
  LogOut,
  LayoutDashboard,
  Beef,
  Layers,
  Users,
  FileText,
  Settings,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ isOpen, onClose, activeTab, setActiveTab }) {
  const { isAdmin, logout, user } = useAuth();

  const handleSelect = (tab) => {
    setActiveTab(tab);
    onClose();
  };

  // Vendor navigation items
  const vendorItems = [
    { id: 'pos', label: 'Ventas (POS)', icon: ShoppingCart, primary: true },
    { id: 'create-lot', label: 'Crear Res / Cerdo', icon: PlusCircle },
    { id: 'create-product', label: 'Crear Producto General', icon: Layers },
    { id: 'inventory', label: 'Inventario', icon: Boxes },
    { id: 'sales-history', label: 'Historial de ventas', icon: History },
    { id: 'profile', label: 'Mi perfil', icon: User },
  ];

  // Admin navigation items
  const adminItems = [
    { id: 'dashboard', label: 'Dashboard Analítico', icon: LayoutDashboard, primary: true },
    { id: 'pos', label: 'Punto de Venta (POS)', icon: ShoppingCart },
    { id: 'lots', label: 'Lotes (Reses y Cerdos)', icon: Beef },
    { id: 'create-lot', label: 'Registrar Lote Nuevo', icon: PlusCircle },
    { id: 'cuts-catalog', label: 'Catálogo de Cortes', icon: Beef },
    { id: 'products', label: 'Productos Generales', icon: Layers },
    { id: 'inventory', label: 'Inventario y Movimientos', icon: Boxes },
    { id: 'sales-history', label: 'Historial de Ventas', icon: History },
    { id: 'users', label: 'Gestión de Vendedores', icon: Users },
    { id: 'settings', label: 'Configuración del Negocio', icon: Settings },
    { id: 'audit', label: 'Registro de Auditoría', icon: FileText },
    { id: 'profile', label: 'Mi perfil', icon: User },
  ];

  const items = isAdmin ? adminItems : vendorItems;

  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Slide-out drawer */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-72 bg-white z-50 shadow-2xl flex flex-col transform transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 bg-primary-900 text-white flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg">Menú de Opciones</h2>
            <p className="text-xs text-primary-200">
              {isAdmin ? 'Panel de Administración' : 'Panel de Vendedor'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-primary-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-colors touch-btn justify-start ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 border-r-4 border-primary-600 font-bold'
                    : 'text-gray-700 hover:bg-gray-100'
                } ${item.primary && !isActive ? 'bg-amber-50/50 text-amber-900' : ''}`}
              >
                <Icon
                  className={`w-5 h-5 flex-shrink-0 ${
                    isActive ? 'text-primary-700' : 'text-gray-500'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="mb-2 px-2 text-xs text-gray-500">
            Conectado como <strong className="text-gray-700">{user?.username}</strong>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-sm font-semibold transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
