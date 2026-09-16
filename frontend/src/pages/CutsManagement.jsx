import React, { useState, useEffect } from 'react';
import { Beef, Plus, Edit2, CheckCircle, AlertCircle, X, Power } from 'lucide-react';
import { api } from '../services/api';

export default function CutsManagement() {
  const [cuts, setCuts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMeat, setFilterMeat] = useState('ALL');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCut, setEditingCut] = useState(null);
  const [cutName, setCutName] = useState('');
  const [cutMeatType, setCutMeatType] = useState('BEEF');
  const [cutDescription, setCutDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadCuts = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.get('/cuts');
      if (data.success) {
        setCuts(data.cuts || []);
      }
    } catch (err) {
      setError(err.message || 'Error al cargar catálogo de cortes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCuts();
  }, []);

  const openCreateModal = () => {
    setEditingCut(null);
    setCutName('');
    setCutMeatType('BEEF');
    setCutDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (cut) => {
    setEditingCut(cut);
    setCutName(cut.name);
    setCutMeatType(cut.meat_type);
    setCutDescription(cut.description || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      if (editingCut) {
        const res = await api.put(`/cuts/${editingCut.id}`, {
          name: cutName,
          meat_type: cutMeatType,
          description: cutDescription || undefined,
        });
        if (res.success) {
          setSuccessMsg('Corte actualizado exitosamente');
          setIsModalOpen(false);
          loadCuts();
        }
      } else {
        const res = await api.post('/cuts', {
          name: cutName,
          meat_type: cutMeatType,
          description: cutDescription || undefined,
        });
        if (res.success) {
          setSuccessMsg('Corte registrado exitosamente');
          setIsModalOpen(false);
          loadCuts();
        }
      }
    } catch (err) {
      setError(err.message || 'Error al guardar corte');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (cut) => {
    setError('');
    try {
      const res = await api.patch(`/cuts/${cut.id}/status`);
      if (res.success) {
        setSuccessMsg(res.message);
        loadCuts();
      }
    } catch (err) {
      setError(err.message || 'Error al cambiar estado del corte');
    }
  };

  const filteredCuts = cuts.filter((c) => {
    if (filterMeat !== 'ALL' && c.meat_type !== filterMeat) return false;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 py-4 pb-24 space-y-4">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2">
            <Beef className="w-7 h-7 text-primary-700" />
            Catálogo de Cortes
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Administra los cortes disponibles para Reses y Cerdos
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="touch-btn bg-primary-700 hover:bg-primary-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-primary-700/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nuevo Corte
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1.5 bg-white p-2 rounded-2xl border border-gray-200 self-start sm:self-auto">
        <button
          onClick={() => setFilterMeat('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            filterMeat === 'ALL'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Todos ({cuts.length})
        </button>
        <button
          onClick={() => setFilterMeat('BEEF')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            filterMeat === 'BEEF'
              ? 'bg-red-700 text-white'
              : 'bg-red-50 text-red-700 hover:bg-red-100'
          }`}
        >
          Cortes de Res ({cuts.filter((c) => c.meat_type === 'BEEF').length})
        </button>
        <button
          onClick={() => setFilterMeat('PORK')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            filterMeat === 'PORK'
              ? 'bg-pink-700 text-white'
              : 'bg-pink-50 text-pink-700 hover:bg-pink-100'
          }`}
        >
          Cortes de Cerdo ({cuts.filter((c) => c.meat_type === 'PORK').length})
        </button>
      </div>

      {/* Cuts List */}
      {loading ? (
        <div className="bg-white p-8 rounded-3xl border border-gray-200 text-center text-gray-400">
          Cargando cortes...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {filteredCuts.map((cut) => (
            <div
              key={cut.id}
              className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                cut.status === 'ACTIVE'
                  ? 'bg-white border-gray-200 shadow-sm'
                  : 'bg-gray-50 border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`px-2 py-1 rounded-xl text-[10px] font-black uppercase ${
                    cut.meat_type === 'BEEF'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-pink-100 text-pink-800'
                  }`}
                >
                  {cut.meat_type === 'BEEF' ? 'RES' : 'CERDO'}
                </span>

                <div>
                  <span className="font-bold text-gray-900 text-sm block">{cut.name}</span>
                  <span
                    className={`text-[10px] font-bold ${
                      cut.status === 'ACTIVE' ? 'text-emerald-700' : 'text-gray-400'
                    }`}
                  >
                    {cut.status === 'ACTIVE' ? 'Activo en Catálogo' : 'Desactivado'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => openEditModal(cut)}
                  className="p-2 text-gray-500 hover:text-primary-700 hover:bg-primary-50 rounded-xl transition-colors"
                  title="Editar nombre"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleStatus(cut)}
                  className={`p-2 rounded-xl transition-colors ${
                    cut.status === 'ACTIVE'
                      ? 'text-emerald-600 hover:bg-red-50 hover:text-red-600'
                      : 'text-gray-400 hover:bg-emerald-50 hover:text-emerald-600'
                  }`}
                  title={cut.status === 'ACTIVE' ? 'Desactivar corte' : 'Activar corte'}
                >
                  <Power className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-scaleUp">
            <div className="p-4 sm:p-5 bg-primary-800 text-white flex items-center justify-between">
              <h3 className="font-bold text-lg">
                {editingCut ? 'Editar Corte' : 'Nuevo Corte en Catálogo'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-primary-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Nombre del Corte
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Chatas, Punta de anca, Costilla"
                  value={cutName}
                  onChange={(e) => setCutName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Tipo de Animal
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCutMeatType('BEEF')}
                    className={`py-2 px-3 rounded-xl font-bold text-xs border transition-colors ${
                      cutMeatType === 'BEEF'
                        ? 'bg-red-700 text-white border-red-700'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    Res (Vacuno)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCutMeatType('PORK')}
                    className={`py-2 px-3 rounded-xl font-bold text-xs border transition-colors ${
                      cutMeatType === 'PORK'
                        ? 'bg-pink-700 text-white border-pink-700'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    Cerdo (Porcino)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Descripción (Opcional)
                </label>
                <textarea
                  rows="2"
                  placeholder="Observaciones sobre el corte..."
                  value={cutDescription}
                  onChange={(e) => setCutDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 touch-btn bg-primary-700 hover:bg-primary-800 text-white font-bold rounded-xl text-sm shadow-md shadow-primary-700/20 disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : editingCut ? 'Actualizar' : 'Guardar Corte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
