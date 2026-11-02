import React from 'react';
import { 
  UserCheck, 
  X, 
  Building2, 
  CreditCard, 
  ShieldAlert, 
  ArrowUpRight, 
  ArrowDownLeft,
  FileSpreadsheet
} from 'lucide-react';
import { BankTransaction } from '../types/bank';
import { COMPANY_INFO, BANKS } from '../data/seedData';
import { formatBs, formatUSD } from '../utils/exchangeRates';

interface PartnerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: BankTransaction[];
}

export const PartnerProfileModal: React.FC<PartnerProfileModalProps> = ({
  isOpen,
  onClose,
  transactions
}) => {
  if (!isOpen) return null;

  // Filtrar todas las transacciones vinculadas a Elías Trías
  const partnerTxs = transactions.filter(t => {
    const desc = t.description.toUpperCase();
    return (
      desc.includes('ELIAS') ||
      desc.includes('V23997829') ||
      desc.includes('23997829') ||
      t.category === 'aporte_socio'
    );
  });

  const totalInflowBs = partnerTxs.filter(t => t.amountBs > 0).reduce((a, b) => a + b.amountBs, 0);
  const totalInflowUSD = partnerTxs.filter(t => t.amountBs > 0).reduce((a, b) => a + b.amountUSD, 0);

  const totalOutflowBs = partnerTxs.filter(t => t.amountBs < 0).reduce((a, b) => a + Math.abs(b.amountBs), 0);
  const totalOutflowUSD = partnerTxs.filter(t => t.amountBs < 0).reduce((a, b) => a + b.amountUSD, 0);

  const netBalanceBs = totalInflowBs - totalOutflowBs;
  const netBalanceUSD = totalInflowUSD - totalOutflowUSD;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full p-6 space-y-6 my-8">
        
        {/* Header con Perfil del Socio */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
              ET
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold text-slate-900">
                  {COMPANY_INFO.partner.name}
                </h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800 border border-teal-200">
                  Socio Agrícola ONI C.A.
                </span>
              </div>
              <p className="text-xs text-slate-600 font-mono mt-0.5 flex items-center gap-2">
                <span>Cédula de Identidad: <strong>{COMPANY_INFO.partner.cedula}</strong></span>
                <span>·</span>
                <span>Empresa: {COMPANY_INFO.name} ({COMPANY_INFO.rif})</span>
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

        {/* Tarjetas KPI del Socio */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Aportes Recibidos del Socio</span>
            <div className="text-lg font-bold font-mono text-emerald-950 mt-1">
              {formatBs(totalInflowBs)}
            </div>
            <div className="text-xs font-bold font-mono text-emerald-700">
              {formatUSD(totalInflowUSD)}
            </div>
          </div>

          <div className="bg-teal-50 p-3.5 rounded-xl border border-teal-200">
            <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider">Pagos / Retiros al Socio</span>
            <div className="text-lg font-bold font-mono text-teal-950 mt-1">
              {formatBs(totalOutflowBs)}
            </div>
            <div className="text-xs font-bold font-mono text-teal-700">
              {formatUSD(totalOutflowUSD)}
            </div>
          </div>

          <div className="bg-slate-100 p-3.5 rounded-xl border border-slate-300">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Saldo Neto Operaciones</span>
            <div className="text-lg font-bold font-mono text-slate-900 mt-1">
              {formatBs(netBalanceBs)}
            </div>
            <div className="text-xs font-bold font-mono text-slate-700">
              {formatUSD(netBalanceUSD)}
            </div>
          </div>

        </div>

        {/* Listado de Operaciones Auditeables del Socio */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Historial de Transferencias y Pagos ({partnerTxs.length} operaciones)
            </h4>
          </div>

          <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl text-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                <tr>
                  <th className="py-2.5 px-3 border-b">Fecha</th>
                  <th className="py-2.5 px-3 border-b">Banco Origen</th>
                  <th className="py-2.5 px-3 border-b">Referencia</th>
                  <th className="py-2.5 px-3 border-b">Descripción de la Operación</th>
                  <th className="py-2.5 px-3 border-b text-right">Monto (Bs.)</th>
                  <th className="py-2.5 px-3 border-b text-right">Monto ($ USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {partnerTxs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No hay transacciones registradas para este socio.
                    </td>
                  </tr>
                ) : (
                  partnerTxs.map(tx => {
                    const bank = BANKS.find(b => b.id === tx.bankId);
                    const isIncome = tx.amountBs > 0;

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">{tx.date}</td>
                        <td className="py-2.5 px-3 font-medium whitespace-nowrap">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${bank?.badgeBg} ${bank?.badgeText}`}>
                            {bank?.shortName}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">{tx.reference}</td>
                        <td className="py-2.5 px-3 text-slate-900 font-medium max-w-xs">{tx.description}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                          <span className={isIncome ? 'text-emerald-700' : 'text-slate-900'}>
                            {formatBs(tx.amountBs)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-900 whitespace-nowrap">
                          {formatUSD(tx.amountUSD)}
                        </td>
                      </tr>
                    );
                  })
                )}
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
