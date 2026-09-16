import React, { useState, useEffect } from 'react';
import {
  Beef,
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  Calendar,
  AlertCircle,
  TrendingUp,
  Percent,
} from 'lucide-react';
import { api } from '../services/api';

export default function LotsList({ onNavigateCreate }) {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ACTIVE'); // Default to ACTIVE so depleted lots don't clutter view!
  const [expandedLotId, setExpandedLotId] = useState(null);
  const [error, setError] = useState('');

  const loadLots = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.get('/lots');
      if (data.success) {
        setLots(data.lots || []);
      }
    } catch (err) {
      setError(err.message || 'Error al cargar lotes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLots();
  }, []);

  const toggleExpand = (id) => {
    setExpandedLotId((prev) => (prev === id ? null : id));
  };

  const filteredLots = lots.filter((lot) => {
    if (filterType !== 'ALL' && lot.lot_type !== filterType) return false;
    const isAct = lot.metrics?.is_active ?? ((lot.metrics?.total_current_stock ?? 0) > 0);
    if (filterStatus === 'ACTIVE' && !isAct) return false;
    if (filterStatus === 'DEPLETED' && isAct) return false;
    if (
      search &&
      !lot.lot_code.toLowerCase().includes(search.toLowerCase()) &&
      !(lot.description || '').toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 pb-24 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2">
            <Beef className="w-7 h-7 text-primary-700" />
            Lotes de Animales (Reses y Cerdos)
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Trazabilidad completa de desposte, cortes, ventas y rendimientos
          </p>
        </div>

        <button
          type="button"
          onClick={onNavigateCreate}
          className="touch-btn bg-primary-700 hover:bg-primary-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-primary-700/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Registrar Lote
        </button>
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-3">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por código de lote o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:ring-1 focus:ring-primary-600 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-100">
          {/* Status Filter (Activos vs Agotados) */}
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFilterStatus('ACTIVE')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                filterStatus === 'ACTIVE'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Solo Activos ({lots.filter((l) => (l.metrics?.total_current_stock ?? 0) > 0).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('DEPLETED')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                filterStatus === 'DEPLETED'
                  ? 'bg-gray-700 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Agotados ({lots.filter((l) => (l.metrics?.total_current_stock ?? 0) <= 0).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                filterStatus === 'ALL'
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Todos
            </button>
          </div>

          {/* Animal Type Filter */}
          <div className="flex gap-1.5 self-start sm:self-auto">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                filterType === 'ALL'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todas especies
            </button>
            <button
              onClick={() => setFilterType('BEEF')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                filterType === 'BEEF'
                  ? 'bg-red-700 text-white'
                  : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
              }`}
            >
              Reses
            </button>
            <button
              onClick={() => setFilterType('PORK')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                filterType === 'PORK'
                  ? 'bg-pink-700 text-white'
                  : 'bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200'
              }`}
            >
              Cerdos
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Lots List with Tree View */}
      {loading ? (
        <div className="bg-white p-8 rounded-3xl border border-gray-200 text-center text-gray-400">
          Cargando lotes...
        </div>
      ) : filteredLots.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl border border-gray-200 text-center text-gray-400">
          No hay lotes registrados según el filtro.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLots.map((lot) => {
            const isExpanded = expandedLotId === lot.id;
            const m = lot.metrics || {};

            return (
              <div
                key={lot.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all"
              >
                {/* Lot Header Row */}
                <div
                  onClick={() => toggleExpand(lot.id)}
                  className="p-3.5 sm:p-4 cursor-pointer hover:bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2.5 rounded-2xl flex items-center justify-center font-bold text-xs ${
                        lot.lot_type === 'BEEF'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-pink-100 text-pink-800 border border-pink-200'
                      }`}
                    >
                      {lot.lot_type === 'BEEF' ? 'RES' : 'CERDO'}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-black text-gray-900 text-sm sm:text-base">
                          {lot.lot_code}
                        </span>

                        {m.total_current_stock > 0 ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            Activo
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 border border-gray-300">
                            Agotado
                          </span>
                        )}

                        <span className="text-gray-400 text-xs hidden sm:inline">•</span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(lot.date).toLocaleDateString()}
                        </span>
                      </div>

                      {lot.description && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                          {lot.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Summary Badges */}
                  <div className="flex items-center gap-2 sm:gap-4 self-end sm:self-center text-xs">
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 block">Compra</span>
                      <span className="font-bold text-gray-800">
                        ${Number(lot.purchase_price).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 block">Stock Disp.</span>
                      <span className="font-bold text-emerald-700">
                        {m.total_current_stock ?? 0} kg
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 block">Rendimiento</span>
                      <span
                        className={`font-black text-xs px-2 py-0.5 rounded-md ${
                          (m.yield_percentage ?? 0) >= 100
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {m.yield_percentage ?? 0}%
                      </span>
                    </div>

                    <div className="text-gray-400 ml-1">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Tree View: Cuts breakdown */}
                {isExpanded && (
                  <div className="bg-gray-50/70 border-t border-gray-200 p-3 sm:p-4 space-y-3 animate-fadeIn">
                    <div className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                      <span>Desglose de Cortes del Lote</span>
                      <span className="text-gray-400 font-normal">({lot.cuts.length} cortes)</span>
                    </div>

                    {/* Table of cuts */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <thead className="bg-gray-100 text-gray-600 font-bold border-b border-gray-200">
                          <tr>
                            <th className="p-2.5">Corte</th>
                            <th className="p-2.5 text-right">Peso Inicial</th>
                            <th className="p-2.5 text-right">Precio/kg</th>
                            <th className="p-2.5 text-right">Valor Corte</th>
                            <th className="p-2.5 text-right">Stock Disp.</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-medium">
                          {lot.cuts.map((cut) => {
                            const initW = Number(cut.initial_weight);
                            const curStock = Number(cut.current_stock);
                            const pKg = Number(cut.price_per_kg);
                            const cutVal = initW * pKg;

                            return (
                              <tr key={cut.id} className="hover:bg-gray-50">
                                <td className="p-2.5 font-bold text-gray-900">
                                  {cut.cut_catalog.name}
                                </td>
                                <td className="p-2.5 text-right text-gray-600">{initW} kg</td>
                                <td className="p-2.5 text-right text-gray-600">
                                  ${pKg.toLocaleString()}
                                </td>
                                <td className="p-2.5 text-right font-bold text-gray-900">
                                  ${cutVal.toLocaleString()}
                                </td>
                                <td className="p-2.5 text-right">
                                  <span
                                    className={`px-2 py-0.5 rounded-full font-bold ${
                                      curStock === 0
                                        ? 'bg-red-100 text-red-700'
                                        : curStock < initW
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-emerald-100 text-emerald-800'
                                    }`}
                                  >
                                    {curStock} kg
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Summary Footer for this Lot */}
                    <div className="flex flex-wrap items-center justify-between text-xs text-gray-600 bg-white p-3 rounded-xl border border-gray-200 gap-2">
                      <div>
                        Registrado por:{' '}
                        <strong className="text-gray-800">{lot.created_by?.name}</strong>
                      </div>
                      <div>
                        Valor estimado venta:{' '}
                        <strong className="text-gray-900 font-bold">
                          ${m.total_estimated_value?.toLocaleString()}
                        </strong>
                      </div>
                      <div>
                        Diferencia frente a compra:{' '}
                        <strong
                          className={m.difference >= 0 ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}
                        >
                          ${m.difference?.toLocaleString()}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
