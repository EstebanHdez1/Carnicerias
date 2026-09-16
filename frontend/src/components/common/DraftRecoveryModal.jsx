import React from 'react';
import { AlertCircle, RotateCcw, Trash2 } from 'lucide-react';

export default function DraftRecoveryModal({ isOpen, onContinue, onDiscard, formName = 'este formulario' }) {
  if (!isOpen) return null;

  return (
    <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm animate-fadeIn">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-amber-900 text-sm sm:text-base">
            Tienes un formulario sin terminar
          </h4>
          <p className="text-amber-800 text-xs sm:text-sm mt-1">
            Se encontraron datos guardados previamente para {formName}. ¿Deseas recuperar la información o comenzar desde cero?
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              onClick={onContinue}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Continuar borrador
            </button>
            <button
              type="button"
              onClick={onDiscard}
              className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-4 h-4 text-gray-500" />
              Descartar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
