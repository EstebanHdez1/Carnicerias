import React from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';

export default function ThermalReceiptModal({
  isOpen,
  onClose,
  sale,
  actionLabel = 'Cerrar',
}) {
  const { settings } = useSettings();
  const { user: currentUser } = useAuth();

  if (!isOpen || !sale) return null;

  const businessName = (settings?.business_name || 'CARNICERÍA').toUpperCase();
  const address = settings?.address || '';
  const phone = settings?.phone || '';
  const receiptNote = settings?.receipt_note || '¡Gracias por su compra!';
  const sellerName = sale.user?.name || currentUser?.name || 'Caja';
  const saleDate = new Date(sale.created_at || Date.now()).toLocaleString('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const handlePrint = () => {
    window.print();
  };

  const printRoot = document.getElementById('print-root');

  return (
    <>
      {/* 1. Interactive On-Screen Modal (Rendered in normal #root) */}
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 backdrop-blur-sm animate-fadeIn">
        <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-scaleUp flex flex-col max-h-[92vh]">
          {/* Modal Header */}
          <div className="bg-emerald-600 text-white p-4 sm:p-5 text-center relative flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3.5 top-3.5 p-1.5 hover:bg-emerald-700/60 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-wide">{businessName}</h3>
            <p className="text-xs text-emerald-100 font-mono mt-0.5">{sale.sale_number}</p>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1 text-xs">
            <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-gray-600">
              <div>
                <span className="text-gray-400 block text-[11px]">Fecha y Hora:</span>
                <strong className="text-gray-800">{saleDate}</strong>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Atendido por:</span>
                <strong className="text-gray-800">{sellerName}</strong>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Método de Pago:</span>
                <strong className="text-emerald-700 font-bold">{sale.payment_method}</strong>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Estado:</span>
                <strong className="text-emerald-700 font-bold">{sale.status || 'COMPLETADA'}</strong>
              </div>
            </div>

            {/* Items Breakdown with Traceability */}
            <div>
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Cortes y Productos Facturados
              </div>
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl p-2.5 space-y-2 bg-white max-h-48 overflow-y-auto">
                {(sale.items || []).map((it, idx) => (
                  <div key={idx} className="pt-2 first:pt-0">
                    <div className="flex justify-between font-bold text-gray-900 text-xs">
                      <span>{it.item_name}</span>
                      <span>${Number(it.subtotal).toLocaleString('es-CO')}</span>
                    </div>
                    {it.lot_code && (
                      <div className="text-[10px] text-emerald-800 font-mono bg-emerald-50 px-1.5 py-0.5 rounded inline-block mt-0.5 border border-emerald-100">
                        Origen Lote: {it.lot_code}
                      </div>
                    )}
                    <div className="text-gray-500 text-[11px] mt-0.5">
                      {it.quantity} {it.unit_measure || ''} × ${Number(it.unit_price).toLocaleString('es-CO')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 flex items-center justify-between">
              <span className="font-bold text-xs text-emerald-900 uppercase">Total Pagado</span>
              <span className="font-black text-xl text-emerald-800">
                ${Number(sale.total_amount).toLocaleString('es-CO')} <span className="text-xs font-normal">COP</span>
              </span>
            </div>

            {receiptNote && (
              <p className="text-center text-[11px] text-gray-500 italic">
                "{receiptNote}"
              </p>
            )}
          </div>

          {/* Modal Action Buttons */}
          <div className="p-3.5 sm:p-4 bg-gray-50 border-t border-gray-100 flex gap-2.5 flex-shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 py-3 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Imprimir Ticket
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-800 font-bold rounded-xl text-sm transition-colors"
            >
              {actionLabel}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Isolated Print Portal (Rendered strictly inside #print-root) */}
      {printRoot &&
        createPortal(
          <div className="thermal-receipt font-mono text-[11px] leading-tight text-black max-w-[78mm] mx-auto">
            {/* Store Header */}
            <div className="text-center pb-2 border-b border-dashed border-black">
              <h2 className="text-base font-black uppercase tracking-wider">{businessName}</h2>
              {address && <div className="text-[10px] mt-0.5">{address}</div>}
              {phone && <div className="text-[10px]">Tel: {phone}</div>}
              <div className="text-[10px] mt-1 font-bold">COMPROBANTE DE VENTA</div>
              <div className="text-xs font-black mt-0.5 font-mono">{sale.sale_number}</div>
            </div>

            {/* Metadata */}
            <div className="py-1.5 text-[10px] space-y-0.5 border-b border-dashed border-black">
              <div className="flex justify-between">
                <span>Fecha:</span>
                <span>{saleDate}</span>
              </div>
              <div className="flex justify-between">
                <span>Cajero:</span>
                <span>{sellerName}</span>
              </div>
              <div className="flex justify-between">
                <span>Pago:</span>
                <span className="font-bold">{sale.payment_method}</span>
              </div>
            </div>

            {/* Line Items */}
            <div className="py-1.5 border-b border-dashed border-black space-y-1.5">
              {(sale.items || []).map((it, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between font-bold">
                    <span className="truncate pr-1">{it.item_name}</span>
                    <span className="whitespace-nowrap">${Number(it.subtotal).toLocaleString('es-CO')}</span>
                  </div>
                  {it.lot_code && (
                    <div className="text-[9px]">
                      [Lote: {it.lot_code}]
                    </div>
                  )}
                  <div className="text-[9px] text-gray-700">
                    {it.quantity} {it.unit_measure || ''} × ${Number(it.unit_price).toLocaleString('es-CO')}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="py-2 border-b border-dashed border-black">
              <div className="flex justify-between items-center text-xs font-black">
                <span>TOTAL A PAGAR:</span>
                <span>${Number(sale.total_amount).toLocaleString('es-CO')}</span>
              </div>
            </div>

            {/* Ticket Footer */}
            <div className="text-center pt-2 pb-1 space-y-1 text-[10px]">
              {receiptNote && <div className="italic">{receiptNote}</div>}
              <div className="text-[8px] text-gray-500">*** Software Carnicería ***</div>
            </div>
          </div>,
          printRoot
        )}
    </>
  );
}
