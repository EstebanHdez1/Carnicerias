import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Receipt,
  Calendar,
  DollarSign,
  User,
  X,
  Printer,
  ChevronRight,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ThermalReceiptModal from '../components/common/ThermalReceiptModal';

export default function SalesHistory() {
  const { isAdmin } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState('');

  const loadSales = async () => {
    try {
      setLoading(true);
      setError('');
      let url = '/sales?';
      if (startDate) url += `start_date=${startDate}&`;
      if (endDate) url += `end_date=${endDate}&`;

      const data = await api.get(url);
      if (data.success) {
        setSales(data.sales || []);
      }
    } catch (err) {
      setError(err.message || 'Error al cargar ventas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, [startDate, endDate]);

  const viewSaleDetail = async (id) => {
    try {
      setLoadingDetail(true);
      const res = await api.get(`/sales/${id}`);
      if (res.success && res.sale) {
        setSelectedSale(res.sale);
      }
    } catch (err) {
      setError(err.message || 'Error al obtener detalle de la venta');
    } finally {
      setLoadingDetail(false);
    }
  };

  const filteredSales = sales.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const num = s.sale_number.toLowerCase();
    const vendor = (s.user?.name || '').toLowerCase();
    return num.includes(q) || vendor.includes(q);
  });

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 pb-24 space-y-4">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2">
            <History className="w-7 h-7 text-emerald-600" />
            Historial de Ventas
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            {isAdmin ? 'Registro de todas las ventas del negocio' : 'Tus ventas confirmadas'}
          </p>
        </div>

        <span className="bg-emerald-50 text-emerald-800 font-bold px-3 py-1.5 rounded-xl text-xs border border-emerald-200 self-start sm:self-auto">
          {filteredSales.length} ventas registradas
        </span>
      </div>

      {/* Filters */}
      <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por número de venta (#00001) o vendedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white"
          />
        </div>

        <div className="flex gap-2 text-xs">
          <div className="flex items-center gap-1 bg-gray-50 px-2.5 py-1.5 rounded-xl border border-gray-200">
            <span className="text-gray-500 font-bold">Desde:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent outline-none font-medium"
            />
          </div>

          <div className="flex items-center gap-1 bg-gray-50 px-2.5 py-1.5 rounded-xl border border-gray-200">
            <span className="text-gray-500 font-bold">Hasta:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent outline-none font-medium"
            />
          </div>
        </div>
      </div>

      {/* Sales List */}
      {loading ? (
        <div className="bg-white p-8 rounded-3xl border border-gray-200 text-center text-gray-400">
          Cargando ventas...
        </div>
      ) : filteredSales.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl border border-gray-200 text-center text-gray-400">
          No se encontraron ventas para los filtros seleccionados.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredSales.map((sale) => (
            <div
              key={sale.id}
              onClick={() => viewSaleDetail(sale.id)}
              className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200 shadow-sm hover:border-emerald-300 hover:shadow-md cursor-pointer transition-all flex items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold flex-shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-gray-900 text-sm sm:text-base">
                      {sale.sale_number}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        sale.payment_method === 'EFECTIVO'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {sale.payment_method}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(sale.created_at).toLocaleString()}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {sale.user?.name || sale.user?.username}
                    </span>
                    <span>•</span>
                    <span>{sale.items?.length || 0} ítems</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-black text-emerald-700 text-base sm:text-lg">
                  ${Number(sale.total_amount).toLocaleString()}
                </span>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sale Detail & Ticket Modal */}
      <ThermalReceiptModal
        isOpen={Boolean(selectedSale)}
        onClose={() => setSelectedSale(null)}
        sale={selectedSale}
        actionLabel="Cerrar"
      />
    </div>
  );
}
