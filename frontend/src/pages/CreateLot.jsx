import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Beef,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Calculator,
  Save,
  Info,
  Banknote,
} from 'lucide-react';
import { api } from '../services/api';

// Helper to verbalize Colombian pesos
function verbalizeCOP(amount) {
  const num = Number(amount);
  if (isNaN(num) || num <= 0) return '';

  if (num >= 1000000000) {
    const b = (num / 1000000000).toLocaleString('es-CO', { maximumFractionDigits: 2 });
    return `${b} mil millones de pesos`;
  }
  if (num >= 1000000) {
    const m = (num / 1000000).toLocaleString('es-CO', { maximumFractionDigits: 2 });
    return `${m} millón${num >= 2000000 ? 'es' : ''} de pesos`;
  }
  if (num >= 1000) {
    const k = (num / 1000).toLocaleString('es-CO', { maximumFractionDigits: 1 });
    return `${k} mil pesos`;
  }
  return `${num.toLocaleString('es-CO')} pesos`;
}

export default function CreateLot({ onLotCreated }) {
  const [lotType, setLotType] = useState('BEEF'); // BEEF or PORK
  const [codePreview, setCodePreview] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [cutsCatalog, setCutsCatalog] = useState([]);
  const [cuts, setCuts] = useState([]);
  const [loadingCuts, setLoadingCuts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Per-type draft storage helpers
  const getDraftKey = (type) => `carniceria_draft_lot_${type}`;

  const loadDraftForType = (type) => {
    try {
      const raw = localStorage.getItem(getDraftKey(type));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const saveDraftForType = (type, data) => {
    try {
      localStorage.setItem(getDraftKey(type), JSON.stringify(data));
    } catch {}
  };

  const clearDraftForType = (type) => {
    try {
      localStorage.removeItem(getDraftKey(type));
    } catch {}
  };

  // Silently apply initial saved draft on mount
  useEffect(() => {
    const initialDraft = loadDraftForType('BEEF');
    if (initialDraft) {
      if (initialDraft.date) setDate(initialDraft.date);
      if (initialDraft.description) setDescription(initialDraft.description);
      if (initialDraft.purchasePrice) setPurchasePrice(initialDraft.purchasePrice);
      if (initialDraft.cuts && Array.isArray(initialDraft.cuts) && initialDraft.cuts.length > 0) {
        setCuts(initialDraft.cuts);
      }
    }
  }, []);

  // Safe lot type switching preserving drafts independently
  const handleSwitchLotType = (newType) => {
    if (newType === lotType) return;

    // 1. Save whatever is in form right now for the CURRENT type
    saveDraftForType(lotType, {
      date,
      description,
      purchasePrice,
      cuts,
    });

    // 2. Load draft for the NEW type
    const draftNew = loadDraftForType(newType);
    if (draftNew) {
      setDate(draftNew.date || new Date().toISOString().slice(0, 10));
      setDescription(draftNew.description || '');
      setPurchasePrice(draftNew.purchasePrice || '');
      setCuts(draftNew.cuts || []);
    } else {
      setDate(new Date().toISOString().slice(0, 10));
      setDescription('');
      setPurchasePrice('');
      setCuts([]);
    }

    // 3. Switch active lot type
    setLotType(newType);
    setError('');
    setSuccessMsg('');
  };

  // Load preview code and cuts catalog for the selected lot type
  useEffect(() => {
    async function loadData() {
      try {
        setLoadingCuts(true);
        const [codeRes, cutsRes] = await Promise.all([
          api.get(`/lots/preview-code?type=${lotType}`),
          api.get(`/cuts?meat_type=${lotType}&status=ACTIVE`),
        ]);

        if (codeRes.success) {
          setCodePreview(codeRes.lotCode);
        }
        if (cutsRes.success) {
          setCutsCatalog(cutsRes.cuts || []);
          // Pre-populate only if form cuts are truly empty
          setCuts((prev) => {
            if (prev.length === 0 && cutsRes.cuts && cutsRes.cuts.length > 0) {
              return [{ cut_catalog_id: cutsRes.cuts[0].id, initial_weight: '', price_per_kg: '' }];
            }
            return prev;
          });
        }
      } catch (err) {
        setError('Error al cargar cortes del catálogo');
      } finally {
        setLoadingCuts(false);
      }
    }

    loadData();
  }, [lotType]);

  // Auto-save form draft silently for the CURRENT lot type
  useEffect(() => {
    if (description || purchasePrice || cuts.some((c) => c.initial_weight || c.price_per_kg)) {
      saveDraftForType(lotType, {
        date,
        description,
        purchasePrice,
        cuts,
      });
    }
  }, [lotType, date, description, purchasePrice, cuts]);

  // Cuts manipulation
  const addCutRow = () => {
    if (cutsCatalog.length === 0) return;
    const unusedCut = cutsCatalog.find((cat) => !cuts.some((c) => c.cut_catalog_id === cat.id));
    const defaultCutId = unusedCut ? unusedCut.id : cutsCatalog[0].id;
    setCuts([...cuts, { cut_catalog_id: defaultCutId, initial_weight: '', price_per_kg: '' }]);
  };

  const updateCutRow = (index, field, value) => {
    const updated = [...cuts];
    updated[index] = { ...updated[index], [field]: value };
    setCuts(updated);
  };

  const removeCutRow = (index) => {
    if (cuts.length <= 1) return;
    setCuts(cuts.filter((_, i) => i !== index));
  };

  // Yield & financial calculations
  const calculations = useMemo(() => {
    const pPrice = Number(purchasePrice) || 0;
    let totalWeight = 0;
    let totalCutsValue = 0;

    const rowDetails = cuts.map((c) => {
      const w = Number(c.initial_weight) || 0;
      const p = Number(c.price_per_kg) || 0;
      const val = w * p;
      totalWeight += w;
      totalCutsValue += val;
      return { val };
    });

    const difference = totalCutsValue - pPrice;
    const yieldRatio = pPrice > 0 ? totalCutsValue / pPrice : 0;
    const yieldPercentage = yieldRatio * 100;

    return {
      totalWeight: Number(totalWeight.toFixed(3)),
      totalCutsValue,
      difference,
      yieldPercentage: Number(yieldPercentage.toFixed(2)),
      rowDetails,
    };
  }, [purchasePrice, cuts]);

  // Live formatted price preview
  const formattedPurchasePrice = useMemo(() => {
    const num = Number(purchasePrice);
    if (!purchasePrice || isNaN(num) || num <= 0) return null;
    return {
      formatted: `$ ${num.toLocaleString('es-CO')} COP`,
      words: verbalizeCOP(num),
    };
  }, [purchasePrice]);

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const pPrice = Number(purchasePrice);
    if (!pPrice || pPrice <= 0) {
      setError('El precio de compra debe ser un valor válido mayor a 0');
      return;
    }

    if (cuts.length === 0) {
      setError('Debes registrar al menos un corte para el lote');
      return;
    }

    for (let i = 0; i < cuts.length; i++) {
      const c = cuts[i];
      const w = Number(c.initial_weight);
      const p = Number(c.price_per_kg);
      if (!c.cut_catalog_id || !w || w <= 0 || !p || p <= 0) {
        setError(`Fila de corte #${i + 1}: Ingresa un peso y precio por kg válidos.`);
        return;
      }
    }

    setSubmitting(true);

    const payload = {
      lot_type: lotType,
      date,
      description: description.trim() || undefined,
      purchase_price: pPrice,
      cuts: cuts.map((c) => ({
        cut_catalog_id: c.cut_catalog_id,
        initial_weight: Number(c.initial_weight),
        price_per_kg: Number(c.price_per_kg),
      })),
    };

    try {
      const res = await api.post('/lots', payload);
      if (res.success && res.lot) {
        setSuccessMsg(`Lote ${res.lot.lot_code} creado exitosamente con sus cortes.`);
        // Clear ONLY this lot type's draft upon success; the other type's draft remains intact
        clearDraftForType(lotType);
        // Reset form
        setDescription('');
        setPurchasePrice('');
        setCuts([]);
        if (onLotCreated) onLotCreated(res.lot);
      }
    } catch (err) {
      setError(err.message || 'No se pudo crear el lote. Tus datos fueron conservados.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 py-4 pb-24">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-primary-900 text-white p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-primary-300 text-xs font-bold uppercase tracking-wider">
                Recepción y Desposte
              </span>
              <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2 mt-0.5">
                <Beef className="w-7 h-7 text-primary-300" />
                Registrar Nuevo Lote
              </h2>
            </div>

            {/* Animal Type Toggle */}
            <div className="flex bg-primary-950/60 p-1 rounded-2xl border border-primary-700/50 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => handleSwitchLotType('BEEF')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  lotType === 'BEEF'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-primary-200 hover:text-white'
                }`}
              >
                Res (Vacuno)
              </button>
              <button
                type="button"
                onClick={() => handleSwitchLotType('PORK')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  lotType === 'PORK'
                    ? 'bg-pink-600 text-white shadow-md'
                    : 'text-primary-200 hover:text-white'
                }`}
              >
                Cerdo (Porcino)
              </button>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-3 sm:p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Identification & General Info (Fixed responsive wrapping) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 bg-gray-50 p-3 sm:p-4 rounded-2xl border border-gray-200">
            {/* Lote Code */}
            <div className="min-w-0">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 truncate">
                Código de Lote
              </label>
              <div className="font-mono font-bold text-primary-800 bg-white px-3 py-2.5 rounded-xl border border-gray-300 text-xs sm:text-sm truncate shadow-inner">
                {codePreview || 'Generando código...'}
              </div>
              <span className="text-[10px] text-gray-500 mt-1 block">
                Consecutivo + MMDDYY
              </span>
            </div>

            {/* Fecha de Recepción (Fixed overflow on phones) */}
            <div className="min-w-0">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 truncate">
                Fecha de Recepción
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full max-w-full min-w-0 box-border block px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary-600 font-semibold text-gray-900"
              />
            </div>

            {/* Precio de Compra (Fixed step validation error & added Colombian Currency Preview) */}
            <div className="min-w-0">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 truncate">
                Precio Compra Animal ($)
              </label>
              <input
                type="number"
                required
                min="0"
                step="any"
                placeholder="Ej. 4000000"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="w-full max-w-full min-w-0 box-border block px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm font-black text-gray-900 outline-none focus:ring-2 focus:ring-primary-600"
              />

              {/* Live formatted Colombian Pesos Preview */}
              {formattedPurchasePrice && (
                <div className="mt-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 animate-fadeIn">
                  <div className="font-black text-sm text-emerald-800 flex items-center gap-1">
                    <Banknote className="w-4 h-4" />
                    <span>{formattedPurchasePrice.formatted}</span>
                  </div>
                  <div className="text-[11px] font-medium text-emerald-700 capitalize mt-0.5">
                    {formattedPurchasePrice.words}
                  </div>
                </div>
              )}
            </div>

            {/* Descripción */}
            <div className="sm:col-span-3 min-w-0">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Descripción / Observaciones
              </label>
              <textarea
                rows="2"
                placeholder="Ej. Res comprada en subasta / Proveedor Ganadería XYZ. Buena masa muscular."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full box-border block px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary-600"
              />
            </div>
          </div>

          {/* Cuts Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-black text-gray-900 text-base">Cortes del Lote</h3>
                <p className="text-xs text-gray-500">
                  Agrega cada corte despostado con su peso en kg y precio por kg
                </p>
              </div>

              <button
                type="button"
                onClick={addCutRow}
                className="touch-btn bg-gray-900 hover:bg-black text-white text-xs font-bold py-2 px-3 rounded-xl shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Agregar Corte
              </button>
            </div>

            {loadingCuts ? (
              <p className="text-sm text-gray-400 py-4">Cargando catálogo de cortes...</p>
            ) : (
              <div className="space-y-2.5">
                {cuts.map((cut, index) => {
                  const cutVal = calculations.rowDetails[index]?.val || 0;
                  return (
                    <div
                      key={index}
                      className="bg-gray-50 p-3 rounded-2xl border border-gray-200 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                    >
                      {/* Cut selector */}
                      <div className="sm:col-span-5 min-w-0">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase sm:hidden mb-0.5">
                          Corte
                        </label>
                        <select
                          value={cut.cut_catalog_id}
                          onChange={(e) => updateCutRow(index, 'cut_catalog_id', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:ring-1 focus:ring-primary-600"
                        >
                          {cutsCatalog.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Weight (Fixed pointer-events-none on kg so PC spinners work!) */}
                      <div className="sm:col-span-3 min-w-0">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase sm:hidden mb-0.5">
                          Peso (kg)
                        </label>
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            required
                            placeholder="0.0"
                            value={cut.initial_weight}
                            onChange={(e) => updateCutRow(index, 'initial_weight', e.target.value)}
                            className="w-full pr-10 pl-3 py-2 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:ring-1 focus:ring-primary-600"
                          />
                          <span className="absolute right-3 text-xs text-gray-400 font-bold pointer-events-none select-none">
                            kg
                          </span>
                        </div>
                      </div>

                      {/* Price / kg (Fixed step="any" and min="0") */}
                      <div className="sm:col-span-3 min-w-0">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase sm:hidden mb-0.5">
                          Precio/kg ($)
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          required
                          placeholder="Precio / kg"
                          value={cut.price_per_kg}
                          onChange={(e) => updateCutRow(index, 'price_per_kg', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:ring-1 focus:ring-primary-600"
                        />
                      </div>

                      {/* Subtotal & Delete */}
                      <div className="sm:col-span-1 flex items-center justify-between sm:justify-end gap-2">
                        <div className="sm:hidden text-xs text-gray-600 font-bold">
                          Subtotal: ${cutVal.toLocaleString('es-CO')}
                        </div>
                        <button
                          type="button"
                          disabled={cuts.length <= 1}
                          onClick={() => removeCutRow(index)}
                          className="p-2 text-gray-400 hover:text-red-600 rounded-lg disabled:opacity-30 transition-colors"
                          title="Eliminar fila"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Performance & Calculations Summary Box */}
          <div className="bg-primary-50 rounded-2xl p-3 sm:p-5 border border-primary-200 space-y-3">
            <div className="flex items-center gap-2 text-primary-900 font-bold text-sm">
              <Calculator className="w-5 h-5 text-primary-700" />
              <span>Indicadores de Rendimiento del Lote</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs sm:text-sm">
              <div className="bg-white p-3 rounded-xl border border-primary-100 shadow-sm">
                <span className="text-gray-500 block text-[11px]">Precio de Compra</span>
                <span className="font-bold text-gray-900 text-xs sm:text-base truncate block">
                  ${(Number(purchasePrice) || 0).toLocaleString('es-CO')}
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-primary-100 shadow-sm">
                <span className="text-gray-500 block text-[11px]">Peso Total Cortes</span>
                <span className="font-bold text-gray-900 text-xs sm:text-base">
                  {calculations.totalWeight} kg
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-primary-100 shadow-sm">
                <span className="text-gray-500 block text-[11px]">Valor Total Cortes</span>
                <span className="font-bold text-gray-900 text-xs sm:text-base truncate block">
                  ${calculations.totalCutsValue.toLocaleString('es-CO')}
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-primary-100 shadow-sm">
                <span className="text-gray-500 block text-[11px]">Rendimiento Est.</span>
                <span
                  className={`font-black text-xs sm:text-base ${
                    calculations.yieldPercentage >= 100 ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {calculations.yieldPercentage}%
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 text-[11px] text-primary-800 bg-white/70 p-2.5 rounded-xl border border-primary-100">
              <Info className="w-4 h-4 flex-shrink-0 text-primary-700 mt-0.5" />
              <span>
                <strong>Nota:</strong> El rendimiento representa el valor estimado de venta de los cortes
                frente al costo de compra del animal. No es margen de ganancia neto.
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full touch-btn bg-primary-700 hover:bg-primary-800 text-white font-black text-base rounded-2xl shadow-lg shadow-primary-700/20 disabled:opacity-50"
            >
              {submitting ? (
                'Guardando Lote en la Base de Datos...'
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  GUARDAR LOTE Y ENTRADA DE CORTES
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
