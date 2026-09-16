import React from 'react';
import { User, Shield, Clock, LogOut, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, isAdmin, logout } = useAuth();

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-6">
      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm text-center">
        <div className="w-20 h-20 bg-primary-100 text-primary-800 rounded-full flex items-center justify-center mx-auto mb-4 font-black text-2xl shadow-inner">
          {user?.name ? user.name[0].toUpperCase() : 'U'}
        </div>

        <h2 className="text-xl font-black text-gray-900">{user?.name}</h2>
        <p className="text-xs font-mono text-gray-500 mt-0.5">@{user?.username}</p>

        <div className="mt-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
              isAdmin
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            }`}
          >
            {user?.role}
          </span>
        </div>
      </div>

      {/* Rules Notice */}
      <div className="bg-primary-50 p-4 rounded-2xl border border-primary-200 text-xs text-primary-950 space-y-2">
        <div className="flex items-center gap-2 font-bold text-sm text-primary-900">
          <Info className="w-4 h-4 text-primary-700" />
          <span>Reglas de Seguridad y Permisos</span>
        </div>

        {isAdmin ? (
          <p className="text-primary-800">
            Como <strong>Administrador</strong>, tienes control total sobre el inventario, catálogo
            de cortes, creación de vendedores, reportes analíticos y ajustes de inventario.
          </p>
        ) : (
          <div className="space-y-1.5 text-primary-900">
            <p>
              Como <strong>Vendedor</strong>, puedes registrar ventas, consultar existencias y crear
              lotes o productos.
            </p>
            <div className="p-2.5 bg-white rounded-xl border border-primary-200 flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Ventana de Edición:</strong> Tienes 30 minutos para corregir registros de
                reses, cerdos o productos recién creados. Tras ese tiempo, solo el administrador
                podrá modificarlos.
              </span>
            </div>
            <p className="text-[11px] text-gray-600 italic">
              Los vendedores no pueden eliminar registros ni anular ventas históricas.
            </p>
          </div>
        )}
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        className="w-full touch-btn bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold rounded-2xl shadow-sm transition-colors"
      >
        <LogOut className="w-5 h-5" />
        Cerrar Sesión Activa
      </button>
    </div>
  );
}
