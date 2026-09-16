import React from 'react';
import { Menu, LogOut, User, Shield, Store } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';

export default function Navbar({ onToggleSidebar, activeTab }) {
  const { user, logout, isAdmin } = useAuth();
  const { settings, currentTheme } = useSettings();

  return (
    <header className={`sticky top-0 z-30 ${currentTheme?.navBg || 'bg-red-800'} text-white shadow-md transition-colors duration-200`}>
      <div className="flex items-center justify-between px-3 sm:px-6 py-2.5">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 -ml-1 text-white hover:bg-white/10 active:bg-white/20 rounded-xl focus:outline-none transition-colors"
            title="Abrir menú"
            aria-label="Abrir menú"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-2">
            <Store className="w-6 h-6 text-white/80" />
            <span className="font-black text-lg sm:text-xl tracking-tight uppercase">
              {settings.business_name || 'CARNICERÍA'}
            </span>
          </div>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 bg-black/20 px-2.5 py-1.5 rounded-xl border border-white/10 text-xs sm:text-sm">
            {isAdmin ? (
              <Shield className="w-4 h-4 text-amber-400" />
            ) : (
              <User className="w-4 h-4 text-emerald-400" />
            )}
            <span className="font-semibold hidden xs:inline">{user?.name || user?.username}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                isAdmin
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                  : 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
              }`}
            >
              {user?.role}
            </span>
          </div>

          <button
            onClick={logout}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 active:bg-white/20 rounded-xl transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
