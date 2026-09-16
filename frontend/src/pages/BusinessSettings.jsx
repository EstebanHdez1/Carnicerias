import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle, AlertCircle, Palette, Store, Phone, MapPin, Receipt } from 'lucide-react';
import { useSettings, THEME_PALETTES } from '../context/SettingsContext';

export default function BusinessSettings() {
  const { settings, updateBusinessSettings } = useSettings();
  const [formData, setFormData] = useState({
    business_name: '',
    theme_color: 'red',
    address: '',
    phone: '',
    receipt_note: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (settings) {
      setFormData({
        business_name: settings.business_name || '',
        theme_color: settings.theme_color || 'red',
        address: settings.address || '',
        phone: settings.phone || '',
        receipt_note: settings.receipt_note || '',
      });
    }
  }, [settings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      await updateBusinessSettings(formData);
      setSuccessMsg('¡Configuración del negocio guardada exitosamente!');
    } catch (err) {
      setError(err.message || 'Error al guardar la configuración');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6 pb-24 space-y-5">
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm flex items-center gap-3">
        <div className="p-3 bg-primary-100 text-primary-800 rounded-2xl">
          <Settings className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900">
            Configuración del Negocio
          </h2>
          <p className="text-xs sm:text-sm text-gray-500">
            Personaliza el nombre, tema de color y datos de comprobantes
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3.5 rounded-2xl text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-200 shadow-sm space-y-5">
        {/* Business Name */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Store className="w-4 h-4 text-gray-500" />
            Nombre de la Carnicería
          </label>
          <input
            type="text"
            required
            placeholder="Ej. Carnicería El Buen Corte"
            value={formData.business_name}
            onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-base font-bold text-gray-900 outline-none focus:ring-2 focus:ring-primary-600 focus:bg-white"
          />
          <span className="text-[11px] text-gray-400 mt-1 block">
            Este nombre se mostrará en el encabezado, tickets de venta y pantalla de inicio.
          </span>
        </div>

        {/* Theme Color Selection */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-gray-500" />
            Tema de Color de la Aplicación
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {Object.entries(THEME_PALETTES).map(([key, pal]) => {
              const isSelected = formData.theme_color === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormData({ ...formData, theme_color: key })}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                    isSelected
                      ? 'border-gray-900 bg-gray-50 ring-2 ring-gray-900/10 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div
                    className="w-7 h-7 rounded-xl shadow-inner flex-shrink-0"
                    style={{ backgroundColor: pal.hex }}
                  />
                  <div>
                    <span className="font-bold text-xs text-gray-900 block">{pal.name}</span>
                    {isSelected && (
                      <span className="text-[10px] font-black text-primary-700 uppercase">
                        Activo
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Contact Info for Tickets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-gray-500" />
              Teléfono / WhatsApp de Contacto
            </label>
            <input
              type="text"
              placeholder="Ej. 312 345 6789"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-600 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-gray-500" />
              Dirección del Local
            </label>
            <input
              type="text"
              placeholder="Ej. Cra 15 # 45-20"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-600 focus:bg-white"
            />
          </div>
        </div>

        {/* Receipt Note */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-gray-500" />
            Mensaje al Pie del Comprobante
          </label>
          <input
            type="text"
            placeholder="Ej. ¡Gracias por preferir carnes de calidad! Vuelva pronto."
            value={formData.receipt_note}
            onChange={(e) => setFormData({ ...formData, receipt_note: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-600 focus:bg-white"
          />
        </div>

        {/* Submit */}
        <div className="pt-3">
          <button
            type="submit"
            disabled={submitting}
            className="w-full touch-btn bg-primary-700 hover:bg-primary-800 text-white font-bold text-base rounded-2xl shadow-md shadow-primary-700/20 disabled:opacity-50"
          >
            {submitting ? (
              'Guardando Cambios...'
            ) : (
              <>
                <Save className="w-5 h-5" />
                Guardar Configuración
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
