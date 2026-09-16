import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const SettingsContext = createContext(null);

export const THEME_PALETTES = {
  red: {
    name: 'Rojo Carnicero',
    navBg: 'bg-red-800',
    navHover: 'hover:bg-red-700',
    primaryBtn: 'bg-red-700 hover:bg-red-800 text-white',
    badge: 'bg-red-100 text-red-800',
    hex: '#b91c1c',
  },
  burgundy: {
    name: 'Borgoña / Vinotinto',
    navBg: 'bg-rose-950',
    navHover: 'hover:bg-rose-900',
    primaryBtn: 'bg-rose-900 hover:bg-rose-950 text-white',
    badge: 'bg-rose-100 text-rose-800',
    hex: '#4c0519',
  },
  slate: {
    name: 'Negro Carbón',
    navBg: 'bg-gray-900',
    navHover: 'hover:bg-gray-800',
    primaryBtn: 'bg-gray-900 hover:bg-black text-white',
    badge: 'bg-gray-200 text-gray-800',
    hex: '#111827',
  },
  emerald: {
    name: 'Verde Esmeralda',
    navBg: 'bg-emerald-850 bg-emerald-900',
    navHover: 'hover:bg-emerald-800',
    primaryBtn: 'bg-emerald-700 hover:bg-emerald-800 text-white',
    badge: 'bg-emerald-100 text-emerald-800',
    hex: '#065f46',
  },
  blue: {
    name: 'Azul Marino',
    navBg: 'bg-blue-900',
    navHover: 'hover:bg-blue-800',
    primaryBtn: 'bg-blue-700 hover:bg-blue-800 text-white',
    badge: 'bg-blue-100 text-blue-800',
    hex: '#1e3a8a',
  },
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({
    business_name: 'Carnicería',
    theme_color: 'red',
    address: '',
    phone: '',
    receipt_note: '¡Gracias por su compra!',
  });
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.success && res.settings) {
        setSettings(res.settings);
        document.title = `${res.settings.business_name} - Inventario y Ventas`;
      }
    } catch (e) {
      console.warn('Could not load settings, using defaults');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateBusinessSettings = async (newSettings) => {
    const res = await api.put('/settings', newSettings);
    if (res.success && res.settings) {
      setSettings(res.settings);
      document.title = `${res.settings.business_name} - Inventario y Ventas`;
      return res.settings;
    }
    throw new Error('Error al actualizar configuración');
  };

  const currentTheme = THEME_PALETTES[settings.theme_color] || THEME_PALETTES.red;

  return (
    <SettingsContext.Provider
      value={{
        settings,
        currentTheme,
        updateBusinessSettings,
        reloadSettings: loadSettings,
        loading,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}
