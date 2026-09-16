import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Calendar,
  DollarSign,
  TrendingUp,
  Boxes,
  Beef,
  AlertTriangle,
  Users,
  CreditCard,
  RotateCcw,
  Percent,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { api } from '../services/api';

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('last30days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      let url = `/dashboard/summary?filter=${filter}`;
      if (filter === 'custom' && customStart && customEnd) {
        url += `&start_date=${customStart}&end_date=${customEnd}`;
      }

      const res = await api.get(url);
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      setError(err.message || 'Error al cargar estadísticas del Dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [filter]);

  const handleCustomFilterSubmit = (e) => {
    e.preventDefault();
    if (customStart && customEnd) {
      loadDashboard();
    }
  };

  if (loading && !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-gray-500">
        <LayoutDashboard className="w-10 h-10 mx-auto mb-2 text-gray-400 animate-pulse" />
        <p className="font-bold text-base">Cargando analítica y métricas reales...</p>
      </div>
    );
  }

  const s = data?.sales || {};
  const inv = data?.inventory || {};
  const ym = data?.yield_metrics || {};
  const charts = data?.charts || {};

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 pb-24 space-y-5">
      {/* Dashboard Top Header & Dynamic Time Filter */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2">
            <LayoutDashboard className="w-7 h-7 text-primary-700" />
            Panel de Control y Estadísticas
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Métricas reales de ventas, inventario cárnico y rendimiento por lote
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setFilter('today')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              filter === 'today'
                ? 'bg-primary-700 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => setFilter('last7days')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              filter === 'last7days'
                ? 'bg-primary-700 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            7 Días
          </button>
          <button
            type="button"
            onClick={() => setFilter('thisMonth')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              filter === 'thisMonth'
                ? 'bg-primary-700 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Este Mes
          </button>
          <button
            type="button"
            onClick={() => setFilter('lastMonth')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              filter === 'lastMonth'
                ? 'bg-primary-700 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Mes Anterior
          </button>
          <button
            type="button"
            onClick={() => setFilter('last30days')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              filter === 'last30days'
                ? 'bg-primary-700 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Últimos 30 Días
          </button>
          <button
            type="button"
            onClick={() => setFilter('custom')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              filter === 'custom'
                ? 'bg-primary-700 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Personalizado
          </button>
        </div>
      </div>

      {/* Custom date range form if 'custom' is active */}
      {filter === 'custom' && (
        <form
          onSubmit={handleCustomFilterSubmit}
          className="bg-primary-50 p-4 rounded-2xl border border-primary-100 flex flex-wrap items-center gap-3 text-xs"
        >
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-primary-900">Desde:</span>
            <input
              type="date"
              required
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-white border border-primary-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-primary-900">Hasta:</span>
            <input
              type="date"
              required
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-white border border-primary-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 bg-primary-700 hover:bg-primary-800 text-white font-bold rounded-lg transition-colors"
          >
            Aplicar Filtro
          </button>
        </form>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-center gap-2">
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards: Sales & Money */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-1 text-xs">
            <span className="font-bold uppercase tracking-wider">Ventas de Hoy</span>
            <span className="bg-emerald-50 text-emerald-700 p-1.5 rounded-xl font-bold">
              {s.today?.count || 0} vts
            </span>
          </div>
          <span className="text-xl sm:text-2xl font-black text-gray-900">
            ${(s.today?.total || 0).toLocaleString()}
          </span>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-1 text-xs">
            <span className="font-bold uppercase tracking-wider">Ventas del Mes</span>
            <span className="bg-blue-50 text-blue-700 p-1.5 rounded-xl font-bold">
              {s.this_month?.count || 0} vts
            </span>
          </div>
          <span className="text-xl sm:text-2xl font-black text-gray-900">
            ${(s.this_month?.total || 0).toLocaleString()}
          </span>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-1 text-xs">
            <span className="font-bold uppercase tracking-wider">Últimos 7 Días</span>
            <span className="bg-indigo-50 text-indigo-700 p-1.5 rounded-xl font-bold">
              {s.last_7_days?.count || 0} vts
            </span>
          </div>
          <span className="text-xl sm:text-2xl font-black text-gray-900">
            ${(s.last_7_days?.total || 0).toLocaleString()}
          </span>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-1 text-xs">
            <span className="font-bold uppercase tracking-wider">Ticket Promedio</span>
            <span className="text-gray-400 text-[10px]">Periodo</span>
          </div>
          <span className="text-xl sm:text-2xl font-black text-primary-700">
            ${(s.filtered_period?.ticket_promedio || 0).toLocaleString()}
          </span>
        </div>
      </div>

      {/* KPI Cards: Inventory & Yields */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-sm">
          <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-1">
            Lotes Activos
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900">{inv.active_lots_count || 0}</span>
            <span className="text-xs text-gray-400">lotes con carne</span>
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">
            Res: {inv.beef_stock_kg || 0} kg | Cerdo: {inv.pork_stock_kg || 0} kg
          </span>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-sm">
          <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-1">
            Rendimiento Reses
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">
              {ym.average_beef_yield_percentage || 0}%
            </span>
            <span className="text-xs text-gray-400">promedio</span>
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">
            Compra: ${(ym.total_beef_purchase || 0).toLocaleString()}
          </span>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-sm">
          <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-1">
            Rendimiento Cerdos
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-pink-700">
              {ym.average_pork_yield_percentage || 0}%
            </span>
            <span className="text-xs text-gray-400">promedio</span>
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">
            Compra: ${(ym.total_pork_purchase || 0).toLocaleString()}
          </span>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-sm">
          <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-1">
            Alertas Stock Bajo
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-black ${
                (inv.low_stock_items?.length || 0) > 0 ? 'text-amber-600' : 'text-emerald-700'
              }`}
            >
              {inv.low_stock_items?.length || 0}
            </span>
            <span className="text-xs text-gray-400">items ≤ 5 kg/un</span>
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">
            Requieren reposición pronto
          </span>
        </div>
      </div>

      {/* Chart Row 1: Daily Sales & Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Daily Sales Area Chart */}
        <div className="lg:col-span-8 bg-white p-4 sm:p-5 rounded-3xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Evolución de Ventas Diarias</h3>
              <p className="text-xs text-gray-500">Monto total vendido por día en el periodo</p>
            </div>
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>

          <div className="h-64 sm:h-72">
            {charts.daily_sales && charts.daily_sales.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.daily_sales}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(val) => [`$${Number(val).toLocaleString()}`, 'Ventas']}
                    labelFormatter={(label) => `Fecha: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#salesGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">
                Sin datos de ventas en este rango de fechas.
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods Distribution Pie Chart */}
        <div className="lg:col-span-4 bg-white p-4 sm:p-5 rounded-3xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Métodos de Pago</h3>
              <p className="text-xs text-gray-500">Distribución de ingresos</p>
            </div>
            <CreditCard className="w-5 h-5 text-blue-600" />
          </div>

          <div className="h-64 flex flex-col items-center justify-center">
            {charts.payment_methods && charts.payment_methods.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.payment_methods}
                    dataKey="total_amount"
                    nameKey="payment_method"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={3}
                  >
                    {charts.payment_methods.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-gray-400">No hay pagos registrados</p>
            )}
          </div>
        </div>
      </div>

      {/* Chart Row 2: Top Products Ranking & Lot Yield Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Top Products */}
        <div className="lg:col-span-6 bg-white p-4 sm:p-5 rounded-3xl border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-900 text-base mb-1">Productos y Cortes Más Vendidos</h3>
          <p className="text-xs text-gray-500 mb-4">Ranking descriptivo por cantidad vendida</p>

          <div className="h-64">
            {charts.top_products && charts.top_products.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.top_products} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip
                    formatter={(val, name) => [
                      name === 'quantity' ? `${val} kg/un` : `$${Number(val).toLocaleString()}`,
                      name === 'quantity' ? 'Cantidad' : 'Total',
                    ]}
                  />
                  <Bar dataKey="quantity" fill="#ef4444" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">
                Aún no hay ventas de productos registradas
              </div>
            )}
          </div>
        </div>

        {/* Lot Yield Performance Comparison */}
        <div className="lg:col-span-6 bg-white p-4 sm:p-5 rounded-3xl border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-900 text-base mb-1">Rendimiento por Lote Individual</h3>
          <p className="text-xs text-gray-500 mb-4">
            Indicador (%) de valor estimado de cortes frente a compra
          </p>

          <div className="h-64">
            {charts.lot_yields && charts.lot_yields.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.lot_yields}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="lot_code" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip
                    formatter={(val) => [`${val}%`, 'Rendimiento']}
                    labelFormatter={(l) => `Lote: ${l}`}
                  />
                  <Bar dataKey="yield_percentage" fill="#b91c1c" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">
                No hay lotes con cortes registrados
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Sales by Vendor & Low Stock Alert List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Sales by Vendor */}
        <div className="lg:col-span-6 bg-white p-4 sm:p-5 rounded-3xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Ventas por Vendedor</h3>
              <p className="text-xs text-gray-500">Monto acumulado y número de tickets</p>
            </div>
            <Users className="w-5 h-5 text-indigo-600" />
          </div>

          <div className="space-y-2.5">
            {charts.vendor_sales && charts.vendor_sales.length > 0 ? (
              charts.vendor_sales.map((v) => (
                <div
                  key={v.user_id}
                  className="p-3 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between text-xs sm:text-sm"
                >
                  <div>
                    <span className="font-bold text-gray-900 block">{v.vendor_name}</span>
                    <span className="text-gray-500 text-xs">{v.sales_count} ventas realizadas</span>
                  </div>
                  <span className="font-black text-gray-900 text-base">
                    ${Number(v.total_amount).toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400 py-4 text-center">No hay ventas registradas</p>
            )}
          </div>
        </div>

        {/* Low Stock Items List */}
        <div className="lg:col-span-6 bg-white p-4 sm:p-5 rounded-3xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Cortes y Productos con Bajo Stock</h3>
              <p className="text-xs text-gray-500">Existencias menores o iguales a 5 kg o unidades</p>
            </div>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {inv.low_stock_items && inv.low_stock_items.length > 0 ? (
              inv.low_stock_items.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200 flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-gray-800">{item.name}</span>
                  <span className="font-black text-amber-700 bg-white px-2 py-0.5 rounded-md border border-amber-300">
                    {item.current_stock} {item.unit}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-gray-400">
                Todos los productos tienen niveles adecuados de inventario.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
