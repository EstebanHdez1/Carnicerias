import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Receipt,
  RotateCcw,
  Sparkles,
  CreditCard,
  Banknote,
  Smartphone,
  Layers,
  Beef,
} from 'lucide-react';
import { api } from '../services/api';
import ThermalReceiptModal from '../components/common/ThermalReceiptModal';

export default function POSSales() {
  const [inventory, setInventory] = useState({ lot_cuts: [], products: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // ALL, BEEF, PORK, PRODUCTS
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [completedSale, setCompletedSale] = useState(null);

  // Load inventory from server
  const loadInventory = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.get('/inventory?available_only=true');
      if (data.success) {
        setInventory({
          lot_cuts: data.lot_cuts || [],
          products: data.products || [],
        });
      }
    } catch (err) {
      setError(err.message || 'No se pudo cargar el inventario');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  // Filtered list of items
  const filteredItems = useMemo(() => {
    const q = search.toLowerCase().trim();
    const result = [];

    // Filter cuts
    if (activeFilter === 'ALL' || activeFilter === 'BEEF' || activeFilter === 'PORK') {
      inventory.lot_cuts.forEach((cut) => {
        if (activeFilter !== 'ALL' && cut.meat_type !== activeFilter) return;
        if (
          !q ||
          cut.name.toLowerCase().includes(q) ||
          cut.lot_code.toLowerCase().includes(q)
        ) {
          result.push(cut);
        }
      });
    }

    // Filter products
    if (activeFilter === 'ALL' || activeFilter === 'PRODUCTS') {
      inventory.products.forEach((prod) => {
        if (
          !q ||
          prod.name.toLowerCase().includes(q) ||
          prod.category.toLowerCase().includes(q)
        ) {
          result.push(prod);
        }
      });
    }

    return result;
  }, [inventory, search, activeFilter]);

  // Cart operations
  const addToCart = (item, qtyToAdd = 1) => {
    setError('');
    setCart((prev) => {
      const existingIndex = prev.findIndex((i) => i.id === item.id);
      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        const newQty = Number((existing.quantity + qtyToAdd).toFixed(3));
        if (newQty > item.current_stock) {
          setError(`No puedes agregar más de ${item.current_stock} ${item.unit_measure} disponibles.`);
          return prev;
        }
        const updated = [...prev];
        updated[existingIndex] = {
          ...existing,
          quantity: newQty,
          subtotal: Number((newQty * existing.price).toFixed(2)),
        };
        return updated;
      } else {
        const initialQty = qtyToAdd > item.current_stock ? item.current_stock : qtyToAdd;
        return [
          ...prev,
          {
            id: item.id,
            item_type: item.item_type,
            lot_cut_id: item.item_type === 'LOT_CUT' ? item.id : null,
            product_id: item.item_type === 'PRODUCT' ? item.id : null,
            name: item.name,
            lot_code: item.lot_code || null,
            current_stock: item.current_stock,
            unit_measure: item.unit_measure,
            price: item.price,
            quantity: initialQty,
            subtotal: Number((initialQty * item.price).toFixed(2)),
          },
        ];
      }
    });
  };

  const updateQuantity = (id, newQty) => {
    const qty = Number(newQty);
    if (isNaN(qty) || qty <= 0) return;

    setCart((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          if (qty > item.current_stock) {
            setError(`Stock máximo disponible para ${item.name}: ${item.current_stock} ${item.unit_measure}`);
            return item;
          }
          return {
            ...item,
            quantity: qty,
            subtotal: Number((qty * item.price).toFixed(2)),
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setError('');
  };

  const totalAmount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.subtotal, 0);
  }, [cart]);

  // Generate unique idempotency key
  const generateIdempotencyKey = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `sale_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  };

  // Submit sale
  const handleConfirmSale = async () => {
    if (cart.length === 0) return;
    setError('');
    setSubmitting(true);

    const idempotencyKey = generateIdempotencyKey();

    const payload = {
      idempotency_key: idempotencyKey,
      payment_method: paymentMethod,
      notes: notes.trim() || undefined,
      items: cart.map((item) => ({
        lot_cut_id: item.lot_cut_id,
        product_id: item.product_id,
        quantity: item.quantity,
      })),
    };

    try {
      const res = await api.post('/sales', payload);
      if (res.success && res.sale) {
        setCompletedSale(res.sale);
        setCart([]);
        setNotes('');
        // Reload inventory in background
        loadInventory();
      }
    } catch (err) {
      setError(err.message || 'Ocurrió un error al procesar la venta. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-24 max-w-7xl mx-auto px-2 sm:px-4 pt-3">
      {/* Top Banner / Error */}
      {error && (
        <div className="mb-3 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm flex items-start gap-2 shadow-sm animate-shake">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Atención: </span>
            {error}
          </div>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 font-bold ml-2">
            ×
          </button>
        </div>
      )}

      {/* Sales Workspace: Responsive 2-column on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Product/Cut Catalog & Search */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-3">
          {/* Search bar & Type filter pills */}
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-200">
            <div className="relative mb-2.5">
              <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar corte o producto (ej. Chatas, RES 001, Pollo)..."
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm sm:text-base outline-none focus:ring-2 focus:ring-primary-600 focus:bg-white transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 font-bold text-sm"
                >
                  Limpiar
                </button>
              )}
            </div>

            {/* Meat Category Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs sm:text-sm">
              <button
                type="button"
                onClick={() => setActiveFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors ${
                  activeFilter === 'ALL'
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Todos ({inventory.lot_cuts.length + inventory.products.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('BEEF')}
                className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                  activeFilter === 'BEEF'
                    ? 'bg-red-700 text-white shadow-sm'
                    : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                }`}
              >
                <Beef className="w-3.5 h-3.5" />
                Res ({inventory.lot_cuts.filter((c) => c.meat_type === 'BEEF').length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('PORK')}
                className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                  activeFilter === 'PORK'
                    ? 'bg-pink-700 text-white shadow-sm'
                    : 'bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200'
                }`}
              >
                Cerdo ({inventory.lot_cuts.filter((c) => c.meat_type === 'PORK').length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('PRODUCTS')}
                className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                  activeFilter === 'PRODUCTS'
                    ? 'bg-amber-700 text-white shadow-sm'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Generales ({inventory.products.length})
              </button>
            </div>
          </div>

          {/* Items Grid */}
          {loading ? (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-500 border border-gray-200">
              Cargando cortes y productos disponibles...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-200">
              <p className="text-gray-500 font-medium">No se encontraron productos disponibles</p>
              <p className="text-xs text-gray-400 mt-1">Verifica el término de búsqueda o registra nuevos lotes</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
              {filteredItems.map((item) => {
                const inCart = cart.find((i) => i.id === item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => addToCart(item, 1)}
                    className={`bg-white rounded-2xl p-3 border text-left transition-all cursor-pointer select-none flex flex-col justify-between active:scale-[0.98] ${
                      inCart
                        ? 'border-primary-500 ring-2 ring-primary-500/20 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="font-bold text-gray-900 text-sm sm:text-base leading-tight">
                          {item.name}
                        </span>
                        {item.item_type === 'LOT_CUT' && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              item.meat_type === 'BEEF'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-pink-100 text-pink-800'
                            }`}
                          >
                            {item.meat_type === 'BEEF' ? 'RES' : 'CERDO'}
                          </span>
                        )}
                        {item.item_type === 'PRODUCT' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            {item.category}
                          </span>
                        )}
                      </div>

                      {/* Origin lot badge for traceability */}
                      {item.lot_code && (
                        <div className="text-[11px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded inline-block mb-1.5">
                          {item.lot_code}
                        </div>
                      )}

                      <div className="text-xs text-gray-500">
                        Disponible:{' '}
                        <span
                          className={`font-semibold ${
                            item.current_stock <= 5 ? 'text-amber-600' : 'text-emerald-700'
                          }`}
                        >
                          {item.current_stock} {item.unit_measure}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between">
                      <span className="font-black text-gray-900 text-sm sm:text-base">
                        ${Number(item.price).toLocaleString()}
                        <span className="text-[10px] text-gray-500 font-normal">/{item.unit_measure}</span>
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(item, 1);
                        }}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm transition-colors ${
                          inCart
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 hover:bg-primary-50 text-gray-700 hover:text-primary-700'
                        }`}
                      >
                        {inCart ? inCart.quantity : <Plus className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Shopping Cart & Checkout */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sticky top-16 flex flex-col h-[calc(100vh-5rem)] max-h-[750px]">
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary-700" />
                <h3 className="font-bold text-gray-900 text-base">Carrito de Venta</h3>
                <span className="bg-primary-100 text-primary-800 text-xs font-bold px-2 py-0.5 rounded-full">
                  {cart.length}
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Vaciar
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto py-2 divide-y divide-gray-100">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 p-6">
                  <ShoppingCart className="w-12 h-12 text-gray-300 mb-2 stroke-[1.5]" />
                  <p className="font-semibold text-gray-600 text-sm">El carrito está vacío</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Selecciona cortes o productos a la izquierda para armar la venta
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="py-2.5 flex flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-gray-900 text-sm">{item.name}</span>
                        {item.lot_code && (
                          <span className="block text-[11px] font-mono text-gray-500">
                            Lote: {item.lot_code}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          ${Number(item.price).toLocaleString()} / {item.unit_measure}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-gray-900 text-sm">
                          ${item.subtotal.toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="text-gray-400 hover:text-red-600 block ml-auto p-0.5 mt-0.5"
                          title="Eliminar item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Quantity Touch Controls with decimals support */}
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center bg-gray-100 rounded-xl p-0.5 border border-gray-200">
                        <button
                          type="button"
                          onClick={() => {
                            const step = item.unit_measure === 'kg' ? 0.5 : 1;
                            const nextVal = Math.max(0.1, Number((item.quantity - step).toFixed(3)));
                            updateQuantity(item.id, nextVal);
                          }}
                          className="w-7 h-7 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-200 rounded-lg flex items-center justify-center font-bold shadow-sm"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        <input
                          type="number"
                          step={item.unit_measure === 'kg' ? '0.1' : '1'}
                          min="0.01"
                          max={item.current_stock}
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.id, e.target.value)}
                          className="w-16 text-center font-bold text-sm bg-transparent outline-none py-1 no-spin"
                        />

                        <button
                          type="button"
                          onClick={() => {
                            const step = item.unit_measure === 'kg' ? 0.5 : 1;
                            const nextVal = Number((item.quantity + step).toFixed(3));
                            updateQuantity(item.id, nextVal);
                          }}
                          className="w-7 h-7 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-200 rounded-lg flex items-center justify-center font-bold shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="text-xs text-gray-500 font-medium">
                        {item.unit_measure} (máx: {item.current_stock})
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Checkout Options & Confirm Button */}
            {cart.length > 0 && (
              <div className="pt-3 border-t border-gray-200 space-y-3 bg-white">
                {/* Payment Method Selector */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Método de Pago
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('EFECTIVO')}
                      className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border ${
                        paymentMethod === 'EFECTIVO'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                      }`}
                    >
                      <Banknote className="w-4 h-4" />
                      Efectivo
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('TRANSFERENCIA')}
                      className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border ${
                        paymentMethod === 'TRANSFERENCIA'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                      }`}
                    >
                      <Smartphone className="w-4 h-4" />
                      Transferencia
                    </button>
                  </div>
                </div>

                {/* Notes (Optional) */}
                <input
                  type="text"
                  placeholder="Observaciones de venta (opcional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-primary-600"
                />

                {/* Total & Confirm Button */}
                <div className="bg-primary-50 p-3 rounded-xl border border-primary-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-primary-900 uppercase">Total a Pagar</span>
                  <span className="text-xl sm:text-2xl font-black text-primary-900">
                    ${totalAmount.toLocaleString()}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={submitting || cart.length === 0}
                  onClick={handleConfirmSale}
                  className="w-full touch-btn bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-base rounded-xl shadow-lg shadow-emerald-700/20 disabled:opacity-50"
                >
                  {submitting ? (
                    'Procesando Venta...'
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      CONFIRMAR VENTA
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sale Receipt Confirmation Modal */}
      <ThermalReceiptModal
        isOpen={Boolean(completedSale)}
        onClose={() => setCompletedSale(null)}
        sale={completedSale}
        actionLabel="Nueva Venta"
      />
    </div>
  );
}
