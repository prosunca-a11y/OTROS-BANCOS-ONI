import React, { useState } from 'react';
import { 
  BookOpen, 
  CheckCircle2, 
  Scale, 
  Download, 
  Search, 
  Filter,
  FileSpreadsheet,
  FileType
} from 'lucide-react';
import { BankTransaction } from '../types/bank';
import { generateAccountingEntry } from '../utils/accounting';
import { BANKS, CATEGORIES, COMPANY_INFO } from '../data/seedData';
import { formatBs, formatUSD } from '../utils/exchangeRates';
import { exportAccountingJournalExcel } from '../utils/excelExporter';
import { exportAccountingJournalPDF } from '../utils/pdfExporter';

interface AccountingJournalViewProps {
  transactions: BankTransaction[];
  onExportExcel: () => void;
}

export const AccountingJournalView: React.FC<AccountingJournalViewProps> = ({
  transactions,
  onExportExcel
}) => {
  const [filterBank, setFilterBank] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Generar asientos contables
  const entries = transactions.map(tx => generateAccountingEntry(tx));

  // Filtrar asientos
  const filteredEntries = entries.filter(entry => {
    if (filterBank && entry.bankId !== filterBank) return false;
    if (filterCategory && entry.category !== filterCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        entry.concept.toLowerCase().includes(q) ||
        entry.reference.toLowerCase().includes(q) ||
        entry.debitAccountName.toLowerCase().includes(q) ||
        entry.creditAccountName.toLowerCase().includes(q) ||
        entry.date.includes(q)
      );
    }
    return true;
  });

  // Totales de Debe y Haber
  const totalDebitBs = filteredEntries.reduce((a, b) => a + b.debitBs, 0);
  const totalCreditBs = filteredEntries.reduce((a, b) => a + b.creditBs, 0);
  const totalDebitUSD = filteredEntries.reduce((a, b) => a + b.debitUSD, 0);
  const totalCreditUSD = filteredEntries.reduce((a, b) => a + b.creditUSD, 0);

  const isBalancedBs = Math.abs(totalDebitBs - totalCreditBs) < 0.01;
  const isBalancedUSD = Math.abs(totalDebitUSD - totalCreditUSD) < 0.01;

  const handleDownloadPDF = () => {
    exportAccountingJournalPDF(transactions, 'Enero-Agosto 2026');
  };

  const handleDownloadExcelJournal = () => {
    exportAccountingJournalExcel(transactions, 'Enero-Agosto 2026');
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner Contable */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-semibold mb-2">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Libro Diario de Contabilidad (VEN-NIF / PCGA)</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            Control de Asientos Contables - {COMPANY_INFO.name}
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Registro automático en partida doble (Debe y Haber) para todas las operaciones bancarias con conversión oficial en divisas BCV.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
            isBalancedBs ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
          }`}>
            <Scale className="w-4 h-4" />
            <span>{isBalancedBs ? 'Partida Doble Cuadrada (Debe = Haber)' : 'Desbalance en Contabilidad'}</span>
          </div>

          {/* Botón Descargar PDF */}
          <button
            onClick={handleDownloadPDF}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            title="Descargar Libro Diario de Asientos Contables en PDF listo para imprimir o enviar"
          >
            <FileType className="w-4 h-4" />
            <span>Descargar PDF (.pdf)</span>
          </button>

          {/* Botón Descargar Excel */}
          <button
            onClick={handleDownloadExcelJournal}
            className="px-4 py-2.5 rounded-xl bg-[#00C814] hover:bg-[#00B012] text-white font-black text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            title="Descargar Asientos Contables en Excel (.xlsx) con formato profesional para auditoría / banco"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Descargar Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Banner de Verificación de Cuadre */}
      <div className="bg-emerald-50 p-4 rounded-xl border-2 border-emerald-400 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#00C814] text-white rounded-lg shadow-2xs">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase text-emerald-900 tracking-wider">
              VERIFICACIÓN Y AUDITORÍA DE ASIENTOS CONTABLES
            </h4>
            <p className="text-xs text-emerald-800 font-semibold mt-0.5">
              Todos los asientos contables están listos para ser importados o contabilizados directamente en el sistema contable de la empresa.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono font-black border-t sm:border-t-0 sm:border-l border-emerald-300 pt-2 sm:pt-0 sm:pl-4">
          <div>
            <span className="text-slate-500 font-sans block text-[10px]">TOTAL DEBE</span>
            <span className="text-emerald-700">{formatBs(totalDebitBs)}</span>
          </div>
          <div>
            <span className="text-slate-500 font-sans block text-[10px]">TOTAL HABER</span>
            <span className="text-rose-700">{formatBs(totalCreditBs)}</span>
          </div>
          <div>
            <span className="text-slate-500 font-sans block text-[10px]">DIFERENCIA</span>
            <span className="text-emerald-800">0.00 Bs.</span>
          </div>
        </div>
      </div>

      {/* Filtros Contables */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por concepto, cuenta contable, referencia..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-medium"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterBank}
            onChange={(e) => setFilterBank(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium"
          >
            <option value="">Todos los Bancos</option>
            {BANKS.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium"
          >
            <option value="">Todas las Categorías</option>
            {CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <button
            onClick={handleDownloadPDF}
            className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FileType className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>

          <button
            onClick={handleDownloadExcelJournal}
            className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* Tabla del Libro Diario Contable */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-3">Asiento N°</th>
                <th className="py-3 px-3">Fecha</th>
                <th className="py-3 px-3">Banco</th>
                <th className="py-3 px-3">Ref</th>
                <th className="py-3 px-4">Concepto de la Operación</th>
                <th className="py-3 px-3">Código Cuenta</th>
                <th className="py-3 px-4">Cuenta Contable (VEN-NIF)</th>
                <th className="py-3 px-3 text-right">Debe (Bs.)</th>
                <th className="py-3 px-3 text-right">Haber (Bs.)</th>
                <th className="py-3 px-3 text-right">Tasa ($)</th>
                <th className="py-3 px-3 text-right">Debe ($ USD)</th>
                <th className="py-3 px-3 text-right">Haber ($ USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {filteredEntries.map((entry, idx) => {
                const bank = BANKS.find(b => b.id === entry.bankId);

                return (
                  <React.Fragment key={entry.id}>
                    {/* Fila del DEBE */}
                    <tr className="bg-emerald-50/20 hover:bg-emerald-50/50 transition-colors">
                      <td rowSpan={2} className="py-3 px-3 font-bold text-slate-700 border-r border-slate-200 text-center font-sans">
                        #{idx + 1}
                      </td>
                      <td rowSpan={2} className="py-3 px-3 text-slate-600 border-r border-slate-200 text-center font-sans">
                        {entry.date}
                      </td>
                      <td rowSpan={2} className="py-3 px-3 border-r border-slate-200 font-sans">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800">
                          {bank?.shortName}
                        </span>
                      </td>
                      <td rowSpan={2} className="py-3 px-3 border-r border-slate-200 text-slate-500 font-sans">
                        {entry.reference}
                      </td>
                      <td rowSpan={2} className="py-3 px-4 border-r border-slate-200 font-sans font-medium text-slate-900 max-w-xs">
                        {entry.concept}
                      </td>

                      {/* DEBE */}
                      <td className="py-2 px-3 text-slate-700 font-bold">{entry.debitAccountCode}</td>
                      <td className="py-2 px-4 text-slate-900 font-bold font-sans">{entry.debitAccountName}</td>
                      <td className="py-2 px-3 text-right text-emerald-700 font-bold">{formatBs(entry.debitBs)}</td>
                      <td className="py-2 px-3 text-right text-slate-300">-</td>
                      <td className="py-2 px-3 text-right text-slate-500">{entry.exchangeRate}</td>
                      <td className="py-2 px-3 text-right text-indigo-900 font-bold">{formatUSD(entry.debitUSD)}</td>
                      <td className="py-2 px-3 text-right text-slate-300">-</td>
                    </tr>

                    {/* Fila del HABER */}
                    <tr className="bg-rose-50/20 hover:bg-rose-50/50 transition-colors border-b border-slate-300">
                      <td className="py-2 px-3 text-slate-700 font-bold pl-6">{entry.creditAccountCode}</td>
                      <td className="py-2 px-4 text-slate-800 font-sans pl-6 italic">a {entry.creditAccountName}</td>
                      <td className="py-2 px-3 text-right text-slate-300">-</td>
                      <td className="py-2 px-3 text-right text-rose-700 font-bold">{formatBs(entry.creditBs)}</td>
                      <td className="py-2 px-3 text-right text-slate-500">{entry.exchangeRate}</td>
                      <td className="py-2 px-3 text-right text-slate-300">-</td>
                      <td className="py-2 px-3 text-right text-indigo-900 font-bold">{formatUSD(entry.creditUSD)}</td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
            {/* Totales de Cierre Contable */}
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold font-mono text-xs">
                <td colSpan={7} className="py-3.5 px-4 text-right font-sans uppercase">TOTALES GENERALES DE CONTABILIDAD:</td>
                <td className="py-3.5 px-3 text-right text-emerald-300 font-bold">{formatBs(totalDebitBs)}</td>
                <td className="py-3.5 px-3 text-right text-rose-300 font-bold">{formatBs(totalCreditBs)}</td>
                <td className="py-3.5 px-3 text-right text-slate-400">BCV</td>
                <td className="py-3.5 px-3 text-right text-sky-300 font-bold">{formatUSD(totalDebitUSD)}</td>
                <td className="py-3.5 px-3 text-right text-sky-300 font-bold">{formatUSD(totalCreditUSD)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
