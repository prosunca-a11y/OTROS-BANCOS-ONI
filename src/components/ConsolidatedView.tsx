import { 
  Building2, 
  ArrowLeftRight, 
  UserCheck, 
  DollarSign, 
  ShoppingBag, 
  Receipt, 
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Layers,
  PieChart
} from 'lucide-react';
import { BankTransaction } from '../types/bank';
import { BANKS, CATEGORIES, COMPANY_INFO, SEED_INITIAL_BALANCES } from '../data/seedData';
import { formatBs, formatUSD } from '../utils/exchangeRates';
import { exportConsolidatedSummaryPDF } from '../utils/pdfExporter';

interface ConsolidatedViewProps {
  transactions: BankTransaction[];
  onExportExcel: () => void;
}

export const ConsolidatedView: React.FC<ConsolidatedViewProps> = ({
  transactions,
  onExportExcel
}) => {
  // Totales Generales Consolidados
  const totalIncomeBs = transactions.filter(t => t.amountBs > 0).reduce((a, b) => a + b.amountBs, 0);
  const totalIncomeUSD = transactions.filter(t => t.amountBs > 0).reduce((a, b) => a + b.amountUSD, 0);

  const totalExpenseBs = transactions.filter(t => t.amountBs < 0).reduce((a, b) => a + Math.abs(b.amountBs), 0);
  const totalExpenseUSD = transactions.filter(t => t.amountBs < 0).reduce((a, b) => a + b.amountUSD, 0);

  const totalInitialBs = Object.values(SEED_INITIAL_BALANCES).reduce((a, b) => a + b, 0);
  const totalInitialUSD = totalInitialBs / 798.326;

  const totalEndingBs = totalInitialBs + totalIncomeBs - totalExpenseBs;
  const totalEndingUSD = totalInitialUSD + totalIncomeUSD - totalExpenseUSD;

  return (
    <div className="space-y-6">
      
      {/* Header Banner del Consolidado */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30 text-xs font-semibold mb-2">
            <Layers className="w-3.5 h-3.5 text-purple-300" />
            <span>Sistema Multi-Banco Integrado</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            Resumen Consolidado de Bancos - {COMPANY_INFO.name}
          </h2>
          <p className="text-xs text-purple-200 mt-1">
            Análisis consolidado mes a mes de Bancamiga, Banco Mercantil, Banco Plaza y Banco Provincial.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
          <button
            onClick={() => exportConsolidatedSummaryPDF(transactions, 'Enero-Agosto 2026')}
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            title="Descargar Informe Ejecutvo Consolidado en formato PDF para el banco"
          >
            <FileText className="w-4 h-4" />
            <span>Exportar Consolidado a PDF</span>
          </button>

          <button
            onClick={onExportExcel}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            title="Descargar Informe Ejecutivo Consolidado en formato Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Consolidado a Excel</span>
          </button>
        </div>
      </div>

      {/* Tarjetas KPI de Resumen Global */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Saldo Inicial Total</span>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            {formatBs(totalInitialBs)}
          </div>
          <div className="text-xs font-semibold font-mono text-slate-500">
            ≈ {formatUSD(totalInitialUSD)}
          </div>
        </div>

        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-xs">
          <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Total Entradas Multi-Banco</span>
          <div className="text-xl font-bold font-mono text-emerald-950 mt-1">
            {formatBs(totalIncomeBs)}
          </div>
          <div className="text-xs font-bold font-mono text-emerald-700">
            {formatUSD(totalIncomeUSD)}
          </div>
        </div>

        <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 shadow-xs">
          <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Total Salidas Multi-Banco</span>
          <div className="text-xl font-bold font-mono text-rose-950 mt-1">
            {formatBs(-totalExpenseBs)}
          </div>
          <div className="text-xs font-bold font-mono text-rose-700">
            -{formatUSD(totalExpenseUSD)}
          </div>
        </div>

        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200 shadow-xs">
          <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Saldo Final Consolidado</span>
          <div className="text-xl font-bold font-mono text-indigo-950 mt-1">
            {formatBs(totalEndingBs)}
          </div>
          <div className="text-xs font-bold font-mono text-indigo-800">
            ≈ {formatUSD(totalEndingUSD)}
          </div>
        </div>
      </div>

      {/* Tabla Comparativa de Bancos Independientes */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-purple-600" />
            <span>Resumen por Banco Independiente</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium">Período: Enero - Agosto 2026</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/90 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Banco</th>
                <th className="py-3 px-4">Nro. de Cuenta</th>
                <th className="py-3 px-4 text-right">Saldo Inicial (Bs.)</th>
                <th className="py-3 px-4 text-right">Entradas (Bs.)</th>
                <th className="py-3 px-4 text-right">Salidas (Bs.)</th>
                <th className="py-3 px-4 text-right">Saldo Final (Bs.)</th>
                <th className="py-3 px-4 text-right">Saldo Final ($ USD)</th>
                <th className="py-3 px-4 text-center">N° Trxs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {BANKS.map((bank) => {
                const bankTxs = transactions.filter(t => t.bankId === bank.id);
                const initBs = SEED_INITIAL_BALANCES[bank.id] || 0;
                const incBs = bankTxs.filter(t => t.amountBs > 0).reduce((a, b) => a + b.amountBs, 0);
                const expBs = bankTxs.filter(t => t.amountBs < 0).reduce((a, b) => a + Math.abs(b.amountBs), 0);
                const endBs = initBs + incBs - expBs;
                const endUSD = endBs / 798.326;

                return (
                  <tr key={bank.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          bank.id === 'bancamiga' ? 'bg-emerald-500' :
                          bank.id === 'mercantil' ? 'bg-blue-500' :
                          bank.id === 'plaza' ? 'bg-amber-500' : 'bg-indigo-500'
                        }`} />
                        <span>{bank.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{bank.accountNumber}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700">{formatBs(initBs)}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-700 font-bold">{formatBs(incBs)}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-rose-700 font-bold">{formatBs(-expBs)}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">{formatBs(endBs)}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-indigo-900">{formatUSD(endUSD)}</td>
                    <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-600">{bankTxs.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Desglose Consolidado por Categorías de Operación */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-indigo-600" />
            <span>Clasificación Consolidada por Categorías</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/90 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Categoría de Operación</th>
                <th className="py-3 px-4">Descripción / Tipo</th>
                <th className="py-3 px-4 text-right">Entradas (Bs.)</th>
                <th className="py-3 px-4 text-right">Salidas (Bs.)</th>
                <th className="py-3 px-4 text-right">Neto (Bs.)</th>
                <th className="py-3 px-4 text-right">Neto ($ USD)</th>
                <th className="py-3 px-4 text-center">N° Trxs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {CATEGORIES.map((cat) => {
                const catTxs = transactions.filter(t => t.category === cat.id);
                const incBs = catTxs.filter(t => t.amountBs > 0).reduce((a, b) => a + b.amountBs, 0);
                const expBs = catTxs.filter(t => t.amountBs < 0).reduce((a, b) => a + Math.abs(b.amountBs), 0);
                const netBs = incBs - expBs;
                const incUSD = catTxs.filter(t => t.amountBs > 0).reduce((a, b) => a + b.amountUSD, 0);
                const expUSD = catTxs.filter(t => t.amountBs < 0).reduce((a, b) => a + b.amountUSD, 0);
                const netUSD = incUSD - expUSD;

                return (
                  <tr key={cat.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <span className={`px-2.5 py-1 rounded-md border text-xs ${cat.badgeBg} ${cat.textColor} ${cat.borderColor}`}>
                        {cat.name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs">{cat.description}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-700 font-bold">{formatBs(incBs)}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-rose-700 font-bold">{formatBs(expBs)}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">{formatBs(netBs)}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-indigo-900">{formatUSD(netUSD)}</td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-600 font-bold">{catTxs.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
