import React, { useState } from 'react';
import { 
  DollarSign, 
  X, 
  Save, 
  Plus, 
  Search, 
  RefreshCw,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { DailyExchangeRate } from '../types/exchangeRate';
import { formatBs } from '../utils/exchangeRates';

interface ExchangeRateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  rates: DailyExchangeRate[];
  onUpdateRate: (date: string, newRate: number) => void;
  onBulkUpdateMonth: (monthKey: string, rate: number) => void;
}

export const ExchangeRateEditorModal: React.FC<ExchangeRateEditorModalProps> = ({
  isOpen,
  onClose,
  rates,
  onUpdateRate,
  onBulkUpdateMonth
}) => {
  const [selectedDate, setSelectedDate] = useState('2026-08-15');
  const [inputRate, setInputRate] = useState('36.88');
  const [bulkMonth, setBulkMonth] = useState('2026-08');
  const [bulkRateInput, setBulkRateInput] = useState('36.90');
  const [searchDate, setSearchDate] = useState('');

  if (!isOpen) return null;

  const handleSingleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const rateVal = parseFloat(inputRate);
    if (!selectedDate || isNaN(rateVal) || rateVal <= 0) {
      alert('Ingrese una fecha y tasa válida.');
      return;
    }
    onUpdateRate(selectedDate, rateVal);
    alert(`Tasa del ${selectedDate} actualizada exitosamente a ${rateVal} Bs/USD.`);
  };

  const handleBulkSave = (e: React.FormEvent) => {
    e.preventDefault();
    const rateVal = parseFloat(bulkRateInput);
    if (!bulkMonth || isNaN(rateVal) || rateVal <= 0) {
      alert('Ingrese un mes y tasa válida.');
      return;
    }
    onBulkUpdateMonth(bulkMonth, rateVal);
    alert(`Todas las fechas del mes ${bulkMonth} fueron actualizadas a ${rateVal} Bs/USD.`);
  };

  const sortedRates = [...rates].sort((a, b) => b.date.localeCompare(a.date));
  const filteredRates = sortedRates.filter(r => searchDate ? r.date.includes(searchDate) : true);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-6 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 text-sky-700 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Gestor de Tasas Oficiales del Dólar (BCV 2026)
              </h3>
              <p className="text-xs text-slate-500">
                Configure la tasa de cambio diaria en Bolívares por Dólar para el cálculo exacto de divisas.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario 1: Actualizar Fecha Específica */}
        <div className="bg-sky-50/60 p-4 rounded-xl border border-sky-200/80">
          <h4 className="text-xs font-bold text-sky-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-sky-600" />
            <span>Actualizar Tasa por Fecha Específica</span>
          </h4>
          <form onSubmit={handleSingleSave} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Fecha (YYYY-MM-DD)</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tasa Bs. por 1 USD</label>
              <input
                type="number"
                step="0.01"
                placeholder="ej: 36.88"
                value={inputRate}
                onChange={(e) => setInputRate(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar Tasa</span>
            </button>
          </form>
        </div>

        {/* Formulario 2: Actualización Masiva por Mes */}
        <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-200/80">
          <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4 text-indigo-600" />
            <span>Actualización Masiva por Mes Completo</span>
          </h4>
          <form onSubmit={handleBulkSave} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Seleccionar Mes</label>
              <select
                value={bulkMonth}
                onChange={(e) => setBulkMonth(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-mono font-medium"
              >
                <option value="2026-01">Enero 2026</option>
                <option value="2026-02">Febrero 2026</option>
                <option value="2026-03">Marzo 2026</option>
                <option value="2026-04">Abril 2026</option>
                <option value="2026-05">Mayo 2026</option>
                <option value="2026-06">Junio 2026</option>
                <option value="2026-07">Julio 2026</option>
                <option value="2026-08">Agosto 2026</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tasa Fija para todo el Mes</label>
              <input
                type="number"
                step="0.01"
                placeholder="ej: 36.90"
                value={bulkRateInput}
                onChange={(e) => setBulkRateInput(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Aplicar al Mes</span>
            </button>
          </form>
        </div>

        {/* Tabla Histórica de Tasas */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Histórico de Tasas Registradas ({rates.length} días)
            </h4>
            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar fecha..."
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="w-full pl-8 pr-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md font-mono"
              />
            </div>
          </div>

          <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-xl text-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                <tr>
                  <th className="py-2 px-3 border-b">Fecha</th>
                  <th className="py-2 px-3 border-b text-right">Tasa (Bs / USD)</th>
                  <th className="py-2 px-3 border-b text-center">Origen</th>
                  <th className="py-2 px-3 border-b text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {filteredRates.map(r => (
                  <tr key={r.date} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-semibold text-slate-800">{r.date}</td>
                    <td className="py-2 px-3 text-right font-bold text-indigo-900">
                      Bs. {r.rate.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-sans">
                        {r.source || 'BCV'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => {
                          setSelectedDate(r.date);
                          setInputRate(r.rate.toString());
                        }}
                        className="text-xs text-indigo-600 hover:underline font-sans cursor-pointer"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Cerrar Ventana
          </button>
        </div>

      </div>
    </div>
  );
};
