import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Search,
  SlidersHorizontal,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  History,
  X,
  Plus,
  Minus,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function InventoryView() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' or 'movements'
  const [inventory, setInventory] = useState({ lot_cuts: [], products: [] });
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [movementFilter, setMovementFilter] = useState('ALL');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Adjustment Modal (Admin only)
  const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [adjType, setAdjType] = useState('MERMA'); // MERMA or AJUSTE
  const [isAddition, setIsAddition] = useState(false);
  const [adjQuantity, setAdjQuantity] = useState('');
  const [adjNotes, setAdjNotes] = useState('');
  const [submittingAdj, setSubmittingAdj] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [invRes, movRes] = await Promise.all([
        api.get('/inventory'),
        api.get('/inventory/movements'),
      ]);

      if (invRes.success) {
        setInventory({
          lot_cuts: invRes.lot_cuts || [],
          products: invRes.products || [],
        });
      }
      if (movRes.success) {
        setMovements(movRes.movements || []);
      }
    } catch (err) {
      setError(err.message || 'Error al cargar inventario');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAdjustmentModal = (item) => {
    setSelectedItem(item);
    setAdjType('MERMA');
    setIsAddition(false);
    setAdjQuantity('');
    setAdjNotes('');
    setIsAdjModalOpen(true);
  };

  const handleAdjustmentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    setError('');
    setSuccessMsg('');
    setSubmittingAdj(true);

    try {
      const payload = {
        movement_type: adjType,
        lot_cut_id: selectedItem.item_type === 'LOT_CUT' ? selectedItem.id : null,
        product_id: selectedItem.item_type === 'PRODUCT' ? selectedItem.id : null,
        quantity: Number(adjQuantity),
        is_addition: isAddition,
        notes: adjNotes.trim(),
      };

      const res = await api.post('/inventory/adjustments', payload);
      if (res.success) {
        setSuccessMsg(res.message);
        setIsAdjModalOpen(false);
        loadData();
      }
    } catch (err) {
      setError(err.message || 'No fue posible registrar el ajuste.');
    } finally {
      setSubmittingAdj(false);
    }
  };

  // Combine items for stock view
  const allItems = [
    ...inventory.lot_cuts.map((c) => ({ ...c, type: 'CORTE' })),
    ...inventory.products.map((p) => ({ ...p, type: 'PRODUCTO' })),
  ];

  const filteredItems = allItems.filter((i) => {
    if (
      search &&
      !i.name.toLowerCase().includes(search.toLowerCase()) &&
      !(i.lot_code || '').toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const filteredMovements = movements.filter((m) => {
    if (movementFilter !== 'ALL' && m.movement_type !== movementFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const cutName = m.lot_cut?.cut_catalog?.name || '';
      const prodName = m.product?.name || '';
      const lotCode = m.lot_cut?.lot?.lot_code || '';
      const ref = m.reference_id || '';
      if (
        !cutName.toLowerCase().includes(q) &&
        !prodName.toLowerCase().includes(q) &&
        !lotCode.toLowerCase().includes(q) &&
        !ref.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 pb-24 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2">
            <Boxes className="w-7 h-7 text-indigo-600" />
            Inventario y Movimientos
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Existencias disponibles y registro inmutable de entradas, ventas y mermas
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'stock'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Existencias ({allItems.length})
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'movements'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <History className="w-4 h-4" />
            Movimientos ({movements.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-xs flex items-center gap-2">
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder={
              activeTab === 'stock'
                ? 'Buscar por corte, producto o código de lote...'
                : 'Buscar en movimientos...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white"
          />
        </div>

        {activeTab === 'movements' && (
          <select
            value={movementFilter}
            onChange={(e) => setMovementFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:ring-1 focus:ring-indigo-600"
          >
            <option value="ALL">Todos los Movimientos</option>
            <option value="ENTRADA">ENTRADAS</option>
            <option value="VENTA">VENTAS</option>
            <option value="MERMA">MERMAS</option>
            <option value="AJUSTE">AJUSTES</option>
          </select>
        )}
      </div>

      {/* Tab Content: Stock Overview */}
      {activeTab === 'stock' && (
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white p-8 rounded-3xl border border-gray-200 text-center text-gray-400">
              Cargando existencias...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-gray-200 text-center text-gray-400">
              No se encontraron registros de inventario.
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                    <tr>
                      <th className="p-3">Ítem / Origen</th>
                      <th className="p-3">Tipo</th>
                      <th className="p-3 text-right">Precio</th>
                      <th className="p-3 text-right">Stock Disponible</th>
                      {isAdmin && <th className="p-3 text-center">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="p-3">
                          <span className="font-bold text-gray-900 block">{item.name}</span>
                          {item.lot_code && (
                            <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded inline-block mt-0.5">
                              Lote: {item.lot_code}
                            </span>
                          )}
                          {item.category && (
                            <span className="text-[11px] text-gray-400 block">{item.category}</span>
                          )}
                        </td>

                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.type === 'CORTE'
                                ? item.meat_type === 'BEEF'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-pink-100 text-pink-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.type === 'CORTE' ? `CORTE (${item.meat_type})` : 'PRODUCTO'}
                          </span>
                        </td>

                        <td className="p-3 text-right font-semibold text-gray-800">
                          ${Number(item.price).toLocaleString()}
                          <span className="text-[10px] text-gray-400 font-normal">
                            /{item.unit_measure}
                          </span>
                        </td>

                        <td className="p-3 text-right">
                          <span
                            className={`px-2.5 py-1 rounded-xl font-black text-xs sm:text-sm ${
                              item.current_stock === 0
                                ? 'bg-red-100 text-red-700 border border-red-200'
                                : item.current_stock <= 5
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {item.current_stock} {item.unit_measure}
                          </span>
                        </td>

                        {isAdmin && (
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => openAdjustmentModal(item)}
                              className="px-3 py-1.5 bg-gray-100 hover:bg-indigo-50 text-indigo-700 hover:text-indigo-800 rounded-xl text-xs font-bold border border-gray-200 transition-colors"
                            >
                              Ajustar / Merma
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Movements History */}
      {activeTab === 'movements' && (
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white p-8 rounded-3xl border border-gray-200 text-center text-gray-400">
              Cargando movimientos...
            </div>
          ) : filteredMovements.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-gray-200 text-center text-gray-400">
              No se encontraron movimientos.
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                    <tr>
                      <th className="p-3">Fecha y Hora</th>
                      <th className="p-3">Tipo</th>
                      <th className="p-3">Ítem / Lote</th>
                      <th className="p-3 text-right">Cantidad</th>
                      <th className="p-3 text-right">Stock Anterior → Nuevo</th>
                      <th className="p-3">Responsable</th>
                      <th className="p-3">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {filteredMovements.map((mov) => {
                      const isOutgoing = mov.movement_type === 'VENTA' || mov.movement_type === 'MERMA';
                      const itemName =
                        mov.lot_cut?.cut_catalog?.name || mov.product?.name || 'Ítem';
                      const lotCode = mov.lot_cut?.lot?.lot_code;

                      return (
                        <tr key={mov.id} className="hover:bg-gray-50">
                          <td className="p-3 text-gray-500 whitespace-nowrap text-xs">
                            {new Date(mov.created_at).toLocaleString()}
                          </td>

                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                mov.movement_type === 'ENTRADA'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : mov.movement_type === 'VENTA'
                                  ? 'bg-blue-100 text-blue-800'
                                  : mov.movement_type === 'MERMA'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {mov.movement_type}
                            </span>
                          </td>

                          <td className="p-3 font-bold text-gray-900">
                            {itemName}
                            {lotCode && (
                              <span className="block text-[11px] font-mono text-gray-500 font-normal">
                                {lotCode}
                              </span>
                            )}
                          </td>

                          <td className="p-3 text-right font-black">
                            <span
                              className={isOutgoing ? 'text-red-600' : 'text-emerald-600'}
                            >
                              {isOutgoing ? '-' : '+'}
                              {mov.quantity}
                            </span>
                          </td>

                          <td className="p-3 text-right text-xs text-gray-600 font-mono">
                            {mov.previous_stock} →{' '}
                            <strong className="text-gray-900">{mov.new_stock}</strong>
                          </td>

                          <td className="p-3 text-gray-700 text-xs">
                            {mov.user?.name || mov.user?.username}
                          </td>

                          <td className="p-3 text-xs text-gray-500 max-w-xs truncate">
                            {mov.notes || mov.reference_id}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin Adjustment Modal */}
      {isAdjModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-scaleUp">
            <div className="p-4 sm:p-5 bg-indigo-700 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Ajuste de Inventario</h3>
                <p className="text-xs text-indigo-200">{selectedItem.name}</p>
              </div>
              <button
                onClick={() => setIsAdjModalOpen(false)}
                className="p-1.5 hover:bg-indigo-600 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustmentSubmit} className="p-4 sm:p-6 space-y-4">
              <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200 text-xs flex justify-between">
                <span>Stock Actual:</span>
                <strong className="text-indigo-900 text-sm">
                  {selectedItem.current_stock} {selectedItem.unit_measure}
                </strong>
              </div>

              {/* Adjustment Type */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAdjType('MERMA');
                    setIsAddition(false);
                  }}
                  className={`py-2 px-3 rounded-xl font-bold text-xs border transition-colors ${
                    adjType === 'MERMA'
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-gray-50 text-gray-700 border-gray-200'
                  }`}
                >
                  Merma (Deterioro)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdjType('AJUSTE');
                  }}
                  className={`py-2 px-3 rounded-xl font-bold text-xs border transition-colors ${
                    adjType === 'AJUSTE'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-gray-50 text-gray-700 border-gray-200'
                  }`}
                >
                  Ajuste Administrativo
                </button>
              </div>

              {/* Addition or Deduction if AJUSTE */}
              {adjType === 'AJUSTE' && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddition(false)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border flex items-center justify-center gap-1 ${
                      !isAddition
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}
                  >
                    <Minus className="w-3.5 h-3.5" /> Descontar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddition(true)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border flex items-center justify-center gap-1 ${
                      isAddition
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar
                  </button>
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Cantidad ({selectedItem.unit_measure})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  required
                  placeholder="0.0"
                  value={adjQuantity}
                  onChange={(e) => setAdjQuantity(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Motivo / Observación
                </label>
                <textarea
                  rows="2"
                  required
                  placeholder="Ej. Producto deteriorado / Corrección de pesaje"
                  value={adjNotes}
                  onChange={(e) => setAdjNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingAdj}
                  className="flex-1 touch-btn bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl text-sm shadow-md shadow-indigo-700/20 disabled:opacity-50"
                >
                  {submittingAdj ? 'Guardando...' : 'Aplicar Ajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
