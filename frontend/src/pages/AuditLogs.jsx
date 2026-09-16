import React, { useState, useEffect } from 'react';
import { FileText, Search, Shield, User, Clock, CheckCircle } from 'lucide-react';
import { api } from '../services/api';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError('');
      let url = '/audit?';
      if (entityFilter !== 'ALL') url += `entity=${entityFilter}&`;
      const data = await api.get(url);
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (err) {
      setError(err.message || 'Error al cargar logs de auditoría');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [entityFilter]);

  const filteredLogs = logs.filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const user = (log.user?.name || log.user?.username || '').toLowerCase();
    const act = (log.action || '').toLowerCase();
    const ent = (log.entity || '').toLowerCase();
    const det = (log.details || '').toLowerCase();
    return user.includes(q) || act.includes(q) || ent.includes(q) || det.includes(q);
  });

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 py-4 pb-24 space-y-4">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2">
            <FileText className="w-7 h-7 text-primary-700" />
            Registro de Auditoría
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Historial de eventos críticos, creaciones, modificaciones y ajustes de inventario
          </p>
        </div>

        <span className="bg-primary-50 text-primary-800 font-bold px-3 py-1.5 rounded-xl text-xs border border-primary-200 self-start sm:self-auto">
          {filteredLogs.length} eventos auditados
        </span>
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar en auditoría (usuario, acción, detalle)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:ring-1 focus:ring-primary-600 focus:bg-white"
          />
        </div>

        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:ring-1 focus:ring-primary-600"
        >
          <option value="ALL">Todas las Entidades</option>
          <option value="BEEF_LOT">Lotes de Res</option>
          <option value="PORK_LOT">Lotes de Cerdo</option>
          <option value="PRODUCT">Productos Generales</option>
          <option value="SALE">Ventas</option>
          <option value="USER">Usuarios</option>
          <option value="CUT">Cortes</option>
        </select>
      </div>

      {/* Log Entries */}
      {loading ? (
        <div className="bg-white p-8 rounded-3xl border border-gray-200 text-center text-gray-400">
          Cargando logs...
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl border border-gray-200 text-center text-gray-400">
          No hay registros de auditoría que coincidan con la búsqueda.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredLogs.map((log) => {
            let detailsObj = null;
            try {
              if (log.details) detailsObj = JSON.parse(log.details);
            } catch (e) {
              detailsObj = log.details;
            }

            return (
              <div
                key={log.id}
                className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        log.action === 'CREATE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.action === 'UPDATE'
                          ? 'bg-blue-100 text-blue-800'
                          : log.action === 'ADJUSTMENT'
                          ? 'bg-amber-100 text-amber-800'
                          : log.action === 'DELETE'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {log.action}
                    </span>

                    <span className="font-mono text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                      {log.entity}
                    </span>
                  </div>

                  <span className="text-xs text-gray-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="text-xs text-gray-700">
                  Responsable:{' '}
                  <strong className="text-gray-900 font-bold">
                    {log.user?.name || log.user?.username}
                  </strong>{' '}
                  <span className="text-[11px] text-gray-500">({log.user?.role})</span>
                </div>

                {/* Details snippet */}
                {detailsObj && (
                  <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 font-mono text-[11px] text-gray-600 overflow-x-auto">
                    {typeof detailsObj === 'object' ? (
                      <pre className="whitespace-pre-wrap">{JSON.stringify(detailsObj, null, 2)}</pre>
                    ) : (
                      <span>{detailsObj}</span>
                    )}
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
