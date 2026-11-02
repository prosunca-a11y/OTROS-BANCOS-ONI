import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowLeftRight, 
  UserCheck, 
  DollarSign, 
  ShoppingBag, 
  Receipt,
  Scale,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import { BankTransaction, BankId } from '../types/bank';
import { BANKS, CATEGORIES, SEED_INITIAL_BALANCES, SEED_STATEMENT_CLOSING_BALANCES } from '../data/seedData';
import { formatBs, formatUSD } from '../utils/exchangeRates';
import { validateEndingBalance } from '../utils/balanceValidation';
import { exportBankMonthlyCategoryReport } from '../utils/excelExporter';

interface BankOverviewCardsProps {
  bankId: BankId | 'all';
  transactions: BankTransaction[];
  onSelectCategoryFilter?: (catId: string) => void;
  selectedCategoryFilter?: string;
  closingBalances?: Record<string, number>;
  onUpdateClosingBalance?: (bankId: string, newBalance: number) => void;
}

export const BankOverviewCards: React.FC<BankOverviewCardsProps> = ({
  bankId,
  transactions,
  onSelectCategoryFilter,
  selectedCategoryFilter,
  closingBalances = SEED_STATEMENT_CLOSING_BALANCES,
  onUpdateClosingBalance
}) => {
  const [isEditingClosingModal, setIsEditingClosingModal] = useState(false);
  const [customClosingInput, setCustomClosingInput] = useState('');
  const [showComparisonDetails, setShowComparisonDetails] = useState(false);

  // Filtrar transacciones si se selecciona un banco específico
  const filteredTxs = bankId === 'all' 
    ? transactions 
    : transactions.filter(t => t.bankId === bankId);

  const currentBank = BANKS.find(b => b.id === bankId);

  // Determinar saldo inicial según el banco seleccionado
  let initialBalanceBs = 0;
  if (bankId === 'all') {
    initialBalanceBs = Object.values(SEED_INITIAL_BALANCES).reduce((a, b) => a + b, 0);
  } else {
    initialBalanceBs = SEED_INITIAL_BALANCES[bankId] || 0;
  }

  // Determinar saldo de cierre oficial de referencia
  let statementClosingBalanceBs = 0;
  if (bankId === 'all') {
    statementClosingBalanceBs = Object.values(closingBalances).reduce((a, b) => a + b, 0);
  } else {
    statementClosingBalanceBs = closingBalances[bankId] ?? SEED_STATEMENT_CLOSING_BALANCES[bankId] ?? 0;
  }

  // Tasa promedio de referencia para saldos
  const refRate = 798.326;
  const initialBalanceUSD = initialBalanceBs / refRate;

  // Totales de entradas y salidas
  const totalIncomeBs = filteredTxs
    .filter(t => t.amountBs > 0)
    .reduce((acc, t) => acc + t.amountBs, 0);

  const totalIncomeUSD = filteredTxs
    .filter(t => t.amountBs > 0)
    .reduce((acc, t) => acc + t.amountUSD, 0);

  const totalExpenseBs = filteredTxs
    .filter(t => t.amountBs < 0)
    .reduce((acc, t) => acc + Math.abs(t.amountBs), 0);

  const totalExpenseUSD = filteredTxs
    .filter(t => t.amountBs < 0)
    .reduce((acc, t) => acc + t.amountUSD, 0);

  const endingBalanceBs = initialBalanceBs + totalIncomeBs - totalExpenseBs;
  const endingBalanceUSD = initialBalanceUSD + totalIncomeUSD - totalExpenseUSD;

  // Ejecutar validación de conciliación contra saldo de cierre del estado de cuenta
  const validation = validateEndingBalance(
    bankId,
    initialBalanceBs,
    transactions,
    statementClosingBalanceBs,
    refRate
  );

  // Desglose por Categorías Clave
  const getCatSummary = (catId: string) => {
    const catTxs = filteredTxs.filter(t => t.category === catId);
    const bs = catTxs.reduce((acc, t) => acc + Math.abs(t.amountBs), 0);
    const usd = catTxs.reduce((acc, t) => acc + t.amountUSD, 0);
    return { bs, usd, count: catTxs.length };
  };

  const internalTransfers = getCatSummary('transferencia_interna');
  const partnerContributions = getCatSummary('aporte_socio');
  const usdPurchases = getCatSummary('compra_dolares');
  const vendorPayments = getCatSummary('pago_proveedor');
  const bankCommissions = getCatSummary('comision_servicio');

  const handleOpenEditModal = () => {
    setCustomClosingInput(statementClosingBalanceBs.toString());
    setIsEditingClosingModal(true);
  };

  // Función para auto-cuadrar el saldo de cierre con el saldo calculado y eliminar la alerta
  const handleAutoSquare = () => {
    if (!onUpdateClosingBalance) return;
    if (bankId === 'all') {
      BANKS.forEach(b => {
        const bInit = SEED_INITIAL_BALANCES[b.id] || 0;
        const bTxs = transactions.filter(t => t.bankId === b.id);
        const bInc = bTxs.filter(t => t.amountBs > 0).reduce((a, t) => a + t.amountBs, 0);
        const bExp = bTxs.filter(t => t.amountBs < 0).reduce((a, t) => a + Math.abs(t.amountBs), 0);
        const bCalc = bInit + bInc - bExp;
        onUpdateClosingBalance(b.id, bCalc);
      });
    } else {
      onUpdateClosingBalance(bankId, endingBalanceBs);
    }
  };

  const handleSaveCustomClosing = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(customClosingInput);
    if (!isNaN(val) && onUpdateClosingBalance) {
      if (bankId !== 'all') {
        onUpdateClosingBalance(bankId, val);
      } else {
        handleAutoSquare();
      }
    }
    setIsEditingClosingModal(false);
  };

  const handleResetToDefault = () => {
    if (onUpdateClosingBalance && bankId !== 'all') {
      const defaultVal = SEED_STATEMENT_CLOSING_BALANCES[bankId] || 0;
      onUpdateClosingBalance(bankId, defaultVal);
      setCustomClosingInput(defaultVal.toString());
    }
    setIsEditingClosingModal(false);
  };

  return (
    <div className="space-y-5">
      
      {/* 1. Tarjetas de Saldos Principales con Paleta Telcel Intensa */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* SALDO INICIAL */}
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-300 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-600">SALDO INICIAL</span>
            <div className="p-2.5 bg-slate-100 rounded-xl text-slate-700">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-[#111827] font-mono tracking-tight">
              {formatBs(initialBalanceBs)}
            </div>
            <div className="text-xs font-bold text-slate-500 font-mono mt-1">
              ≈ {formatUSD(initialBalanceUSD)}
            </div>
          </div>
        </div>

        {/* TOTAL ENTRADAS (#00C814 Green) */}
        <div className="bg-[#00C814]/15 p-5 rounded-2xl border-2 border-[#00C814] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-[#006009]">TOTAL ENTRADAS (CRÉDITOS)</span>
            <div className="p-2.5 bg-[#00C814] text-white rounded-xl shadow-xs">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-[#005008] font-mono tracking-tight">
              {formatBs(totalIncomeBs)}
            </div>
            <div className="text-xs font-black text-[#00800C] font-mono mt-1">
              {formatUSD(totalIncomeUSD)}
            </div>
          </div>
        </div>

        {/* TOTAL SALIDAS (#E52320 Red) */}
        <div className="bg-[#E52320]/15 p-5 rounded-2xl border-2 border-[#E52320] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-[#900000]">TOTAL SALIDAS (DÉBITOS)</span>
            <div className="p-2.5 bg-[#E52320] text-white rounded-xl shadow-xs">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-[#800000] font-mono tracking-tight">
              {formatBs(-totalExpenseBs)}
            </div>
            <div className="text-xs font-black text-[#C11210] font-mono mt-1">
              -{formatUSD(totalExpenseUSD)}
            </div>
          </div>
        </div>

        {/* SALDO FINAL CALCULADO PERÍODO (#0033FF Royal Blue) */}
        <div className="bg-[#0033FF]/15 p-5 rounded-2xl border-2 border-[#0033FF] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-[#001D99]">SALDO FINAL CALCULADO</span>
            <div className="p-2.5 bg-[#0033FF] text-white rounded-xl shadow-xs">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-[#001580] font-mono tracking-tight">
              {formatBs(endingBalanceBs)}
            </div>
            <div className="text-xs font-black text-[#0028CC] font-mono mt-1">
              ≈ {formatUSD(endingBalanceUSD)}
            </div>
          </div>
        </div>

      </div>

      {/* 2. MÓDULO DE CONCILIACIÓN: CUADRO PEQUEÑO Y COMPACTO DE ALERTA DE CONCILIACIÓN */}
      <div className={`p-3 rounded-2xl border-2 shadow-2xs transition-all ${
        !validation.isBalanced
          ? 'bg-rose-50/95 border-[#E52320]'
          : 'bg-emerald-50/95 border-[#00C814]'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`p-1.5 rounded-lg text-white shadow-2xs shrink-0 ${
              !validation.isBalanced ? 'bg-[#E52320] animate-pulse' : 'bg-[#00C814]'
            }`}>
              {!validation.isBalanced ? (
                <ShieldAlert className="w-4 h-4" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-black uppercase tracking-tight ${
                  !validation.isBalanced ? 'text-[#900000]' : 'text-[#006009]'
                }`}>
                  {!validation.isBalanced 
                    ? `ALERTA: DISCREPANCIA DE ${formatBs(Math.abs(validation.differenceBs))}` 
                    : 'CONCILIACIÓN BANCARIA 100% CUADRADA'}
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                  !validation.isBalanced
                    ? 'bg-[#E52320] text-white'
                    : 'bg-[#00C814] text-white'
                }`}>
                  {!validation.isBalanced ? 'DESCUADRE ACTIVO' : 'CONCILIADO'}
                </span>
              </div>
              <p className={`text-[11px] font-semibold truncate mt-0.5 ${
                !validation.isBalanced ? 'text-rose-900' : 'text-emerald-900'
              }`}>
                {validation.isBalanced 
                  ? 'El saldo calculado en la app coincide perfectamente con el estado de cuenta oficial.'
                  : `Calculado App: ${formatBs(validation.calculatedEndingBalanceBs)} | Edo. Cta.: ${formatBs(validation.statementClosingBalanceBs)}`
                }
              </p>
            </div>
          </div>

          {/* Botones de Acción Directa en Cuadro Pequeño */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            {!validation.isBalanced && (
              <button
                onClick={handleAutoSquare}
                className="px-3 py-1.5 text-[11px] font-black rounded-xl bg-[#00C814] hover:bg-[#00B012] text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                title="Ajustar y cuadrar inmediatamente el saldo del estado de cuenta con el saldo calculated (Eliminar Alerta)"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>⚡ Cuadrar Saldo (Eliminar Alerta)</span>
              </button>
            )}

            <button
              onClick={handleOpenEditModal}
              className="px-2.5 py-1.5 text-[11px] font-black rounded-xl bg-white text-slate-800 border-2 border-slate-300 hover:border-[#7A00F2] hover:text-[#7A00F2] transition-all flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
              title="Ingresar o ajustar manualmente el saldo de cierre del estado de cuenta bancario"
            >
              <Edit2 className="w-3 h-3" />
              <span>Ajustar Manual</span>
            </button>

            <button
              onClick={() => setShowComparisonDetails(!showComparisonDetails)}
              className="px-2.5 py-1.5 text-[11px] font-extrabold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
            >
              {showComparisonDetails ? 'Ocultar Detalle' : 'Ver Detalle'}
            </button>
          </div>
        </div>

        {/* Detalle Desplegable Opcional */}
        {showComparisonDetails && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2.5 mt-2.5 border-t border-slate-300/60">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Saldo Calculado en App</span>
              <div className="text-sm font-black text-slate-900 font-mono mt-0.5">
                {formatBs(validation.calculatedEndingBalanceBs)}
              </div>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Saldo Cierre Estado Cuenta</span>
              <div className="text-sm font-black text-slate-900 font-mono mt-0.5">
                {formatBs(validation.statementClosingBalanceBs)}
              </div>
            </div>
            <div className={`p-2.5 rounded-xl border ${
              !validation.isBalanced ? 'bg-rose-100/80 border-[#E52320]' : 'bg-emerald-100/80 border-[#00C814]'
            }`}>
              <span className="text-[10px] font-black uppercase block">Discrepancia</span>
              <div className="text-sm font-black font-mono mt-0.5">
                {formatBs(validation.differenceBs)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2.5 BANNER DE AUDITORÍA Y REPORTE MENSUAL EN EXCEL */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4.5 text-white shadow-md border-2 border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-[#00C814] text-white rounded-xl shadow-xs shrink-0 mt-0.5">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#7A00F2] text-white uppercase tracking-wider">
                Auditoría Contable VEN-NIF / BCV
              </span>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Formato Oficial de Entrega al Banco
              </span>
            </div>
            <h4 className="text-sm font-black text-white mt-1 tracking-tight flex items-center gap-2">
              <span>Informe de Categorías de Entrada y Salida Mes por Mes: {currentBank ? currentBank.name : 'Todos los Bancos'}</span>
            </h4>
            <p className="text-xs text-slate-300 font-medium mt-0.5 max-w-2xl">
              Reporte formateado con saldo inicial, desglose mensual de créditos y débitos por categoría, flujo neto y saldos de cierre con firmas contables para entrega bancaria.
            </p>
          </div>
        </div>

        <button
          onClick={() => exportBankMonthlyCategoryReport(bankId, transactions, closingBalances, 'Enero-Agosto 2026')}
          className="px-5 py-3 rounded-xl bg-[#00C814] hover:bg-[#00B012] text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-98"
        >
          <Download className="w-4 h-4" />
          <span>Descargar Excel ({currentBank ? currentBank.shortName : 'Todos'})</span>
        </button>
      </div>

      {/* 3. Tarjetas de Categorías con Bordes y Fondos Telcel Resaltados */}
      <div className="bg-white p-4.5 rounded-2xl border-2 border-slate-300 shadow-sm space-y-3">
        <div className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center justify-between px-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#7A00F2]" />
            CATEGORÍAS DE OPERACIÓN (FILTRO RÁPIDO):
          </span>
          {selectedCategoryFilter && (
            <button
              onClick={() => onSelectCategoryFilter && onSelectCategoryFilter('')}
              className="text-xs text-[#0033FF] hover:underline font-extrabold cursor-pointer"
            >
              Mostrar todas las categorías
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Trfs. Internas (#7A00F2 Deep Purple) */}
          <button
            onClick={() => onSelectCategoryFilter && onSelectCategoryFilter('transferencia_interna')}
            className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
              selectedCategoryFilter === 'transferencia_interna'
                ? 'bg-[#7A00F2] text-white border-[#7A00F2] shadow-md ring-2 ring-[#7A00F2]/50'
                : 'bg-[#7A00F2]/10 border-[#7A00F2]/40 hover:bg-[#7A00F2]/20'
            }`}
          >
            <div className={`flex items-center justify-between mb-1.5 ${selectedCategoryFilter === 'transferencia_interna' ? 'text-white' : 'text-[#7A00F2]'}`}>
              <span className="text-xs font-black">Trfs. Internas</span>
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div className={`text-xs font-black font-mono ${selectedCategoryFilter === 'transferencia_interna' ? 'text-white' : 'text-[#400080]'}`}>
              {formatBs(internalTransfers.bs)}
            </div>
            <div className={`text-[11px] font-extrabold font-mono mt-0.5 ${selectedCategoryFilter === 'transferencia_interna' ? 'text-purple-100' : 'text-[#7A00F2]'}`}>
              {formatUSD(internalTransfers.usd)} ({internalTransfers.count})
            </div>
          </button>

          {/* Socio Elías Trías (#0033FF Royal Blue) */}
          <button
            onClick={() => onSelectCategoryFilter && onSelectCategoryFilter('aporte_socio')}
            className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
              selectedCategoryFilter === 'aporte_socio'
                ? 'bg-[#0033FF] text-white border-[#0033FF] shadow-md ring-2 ring-[#0033FF]/50'
                : 'bg-[#0033FF]/10 border-[#0033FF]/40 hover:bg-[#0033FF]/20'
            }`}
          >
            <div className={`flex items-center justify-between mb-1.5 ${selectedCategoryFilter === 'aporte_socio' ? 'text-white' : 'text-[#0033FF]'}`}>
              <span className="text-xs font-black">Socio Elías Trías</span>
              <UserCheck className="w-4 h-4" />
            </div>
            <div className={`text-xs font-black font-mono ${selectedCategoryFilter === 'aporte_socio' ? 'text-white' : 'text-[#001A80]'}`}>
              {formatBs(partnerContributions.bs)}
            </div>
            <div className={`text-[11px] font-extrabold font-mono mt-0.5 ${selectedCategoryFilter === 'aporte_socio' ? 'text-blue-100' : 'text-[#0033FF]'}`}>
              {formatUSD(partnerContributions.usd)} ({partnerContributions.count})
            </div>
          </button>

          {/* Compra USD (#00C814 Lime Green) */}
          <button
            onClick={() => onSelectCategoryFilter && onSelectCategoryFilter('compra_dolares')}
            className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
              selectedCategoryFilter === 'compra_dolares'
                ? 'bg-[#00C814] text-white border-[#00C814] shadow-md ring-2 ring-[#00C814]/50'
                : 'bg-[#00C814]/10 border-[#00C814]/40 hover:bg-[#00C814]/20'
            }`}
          >
            <div className={`flex items-center justify-between mb-1.5 ${selectedCategoryFilter === 'compra_dolares' ? 'text-white' : 'text-[#00800C]'}`}>
              <span className="text-xs font-black">Compra USD</span>
              <DollarSign className="w-4 h-4" />
            </div>
            <div className={`text-xs font-black font-mono ${selectedCategoryFilter === 'compra_dolares' ? 'text-white' : 'text-[#005008]'}`}>
              {formatBs(usdPurchases.bs)}
            </div>
            <div className={`text-[11px] font-extrabold font-mono mt-0.5 ${selectedCategoryFilter === 'compra_dolares' ? 'text-emerald-100' : 'text-[#00800C]'}`}>
              {formatUSD(usdPurchases.usd)} ({usdPurchases.count})
            </div>
          </button>

          {/* Proveedores (#FF8800 Sun Orange) */}
          <button
            onClick={() => onSelectCategoryFilter && onSelectCategoryFilter('pago_proveedor')}
            className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
              selectedCategoryFilter === 'pago_proveedor'
                ? 'bg-[#FF8800] text-white border-[#FF8800] shadow-md ring-2 ring-[#FF8800]/50'
                : 'bg-[#FF8800]/10 border-[#FF8800]/40 hover:bg-[#FF8800]/20'
            }`}
          >
            <div className={`flex items-center justify-between mb-1.5 ${selectedCategoryFilter === 'pago_proveedor' ? 'text-white' : 'text-[#CC6D00]'}`}>
              <span className="text-xs font-black">Proveedores</span>
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className={`text-xs font-black font-mono ${selectedCategoryFilter === 'pago_proveedor' ? 'text-white' : 'text-[#804400]'}`}>
              {formatBs(vendorPayments.bs)}
            </div>
            <div className={`text-[11px] font-extrabold font-mono mt-0.5 ${selectedCategoryFilter === 'pago_proveedor' ? 'text-amber-100' : 'text-[#CC6D00]'}`}>
              {formatUSD(vendorPayments.usd)} ({vendorPayments.count})
            </div>
          </button>

          {/* Comisiones (#E52320 Red / #E6007E Magenta) */}
          <button
            onClick={() => onSelectCategoryFilter && onSelectCategoryFilter('comision_servicio')}
            className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
              selectedCategoryFilter === 'comision_servicio'
                ? 'bg-[#E52320] text-white border-[#E52320] shadow-md ring-2 ring-[#E52320]/50'
                : 'bg-[#E52320]/10 border-[#E52320]/40 hover:bg-[#E52320]/20'
            }`}
          >
            <div className={`flex items-center justify-between mb-1.5 ${selectedCategoryFilter === 'comision_servicio' ? 'text-white' : 'text-[#C11210]'}`}>
              <span className="text-xs font-black">Comisiones</span>
              <Receipt className="w-4 h-4" />
            </div>
            <div className={`text-xs font-black font-mono ${selectedCategoryFilter === 'comision_servicio' ? 'text-white' : 'text-[#700000]'}`}>
              {formatBs(bankCommissions.bs)}
            </div>
            <div className={`text-[11px] font-extrabold font-mono mt-0.5 ${selectedCategoryFilter === 'comision_servicio' ? 'text-rose-100' : 'text-[#C11210]'}`}>
              {formatUSD(bankCommissions.usd)} ({bankCommissions.count})
            </div>
          </button>

        </div>
      </div>

      {/* Modal para Ajustar o Probar Saldo de Cierre Oficial */}
      {isEditingClosingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border-2 border-slate-300 shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-[#7A00F2]" />
              <span>Ajustar Saldo de Cierre según Estado de Cuenta</span>
            </h3>

            <p className="text-xs text-slate-600 font-medium">
              Ingrese el saldo final o saldo de cierre que figura textualmente en el estado de cuenta bancario físico/digital para comparar con el saldo calculado.
            </p>

            <form onSubmit={handleSaveCustomClosing} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">
                  Saldo de Cierre Reportado por el Banco (Bs.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={customClosingInput}
                  onChange={(e) => setCustomClosingInput(e.target.value)}
                  className="w-full text-base p-3 bg-white border-2 border-slate-300 rounded-xl font-mono font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#7A00F2]"
                  required
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-mono">
                <div className="flex justify-between text-slate-600 py-0.5">
                  <span>Saldo Calculado por App:</span>
                  <span className="font-bold text-slate-900">{formatBs(endingBalanceBs)}</span>
                </div>
                <div className="flex justify-between text-slate-600 py-0.5">
                  <span>Saldo a Validar:</span>
                  <span className="font-bold text-slate-900">{formatBs(parseFloat(customClosingInput) || 0)}</span>
                </div>
                <div className="flex justify-between font-black pt-1 border-t border-slate-200 text-slate-900">
                  <span>Diferencia Resultante:</span>
                  <span className={`${
                    Math.abs(endingBalanceBs - (parseFloat(customClosingInput) || 0)) < 0.01
                      ? 'text-[#00C814]'
                      : 'text-[#E52320]'
                  }`}>
                    {formatBs(endingBalanceBs - (parseFloat(customClosingInput) || 0))}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-[#E52320] flex items-center gap-1 cursor-pointer"
                  title="Restablecer al saldo de cierre oficial de semilla"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restablecer Semilla</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingClosingModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-black text-white bg-[#7A00F2] hover:bg-[#6800CC] rounded-xl shadow-md cursor-pointer"
                  >
                    Guardar y Validar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
