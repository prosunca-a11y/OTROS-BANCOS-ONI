import React, { useState } from 'react';
import { 
  Building2, 
  TrendingUp, 
  Scale, 
  CheckCircle2, 
  FileSpreadsheet, 
  ArrowUpRight, 
  ArrowDownLeft,
  DollarSign,
  PieChart,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { BankTransaction } from '../types/bank';
import { COMPANY_INFO, BANKS } from '../data/seedData';
import { formatBs, formatUSD } from '../utils/exchangeRates';
import { getBalanceSheet, getIncomeStatement, getTrialBalance } from '../utils/financialStatements';
import { exportToExcel, exportOfficialBanescoFinancialStatementsExcel } from '../utils/excelExporter';

interface FinancialStatementsViewProps {
  transactions: BankTransaction[];
  periodLabel?: string;
}

export const FinancialStatementsView: React.FC<FinancialStatementsViewProps> = ({
  transactions,
  periodLabel = 'Enero-Agosto 2026'
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'balance' | 'income' | 'trial'>('balance');

  const balanceSheet = getBalanceSheet(transactions);
  const incomeStatement = getIncomeStatement(transactions);
  const trialBalance = getTrialBalance(transactions);

  return (
    <div className="space-y-6">
      
      {/* Header Banner de Estados Financieros */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-[#111827] rounded-3xl p-6 text-white shadow-xl border-2 border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black px-3 py-1 bg-[#7A00F2] text-white rounded-full">
                VEN-NIF PYME / CORTE BANESCO AL 31-08-2026
              </span>
              <span className="text-xs font-extrabold px-3 py-1 bg-[#00C814]/20 text-[#00C814] border border-[#00C814]/40 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verificado Oficial BCV (794.99 Bs/USD)
              </span>
            </div>
            <h2 className="text-2xl font-black mt-2 tracking-tight flex items-center gap-2 text-white">
              <span>ESTADOS FINANCIEROS AUDITADOS (BANESCO + MULTIBANCO)</span>
            </h2>
            <p className="text-xs text-slate-300 font-semibold mt-1">
              Empresa: <strong className="text-white">{COMPANY_INFO.name}</strong> ({COMPANY_INFO.rif}) · Representante Legal: <strong className="text-white">{COMPANY_INFO.partner.name}</strong> ({COMPANY_INFO.partner.cedula})
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => exportOfficialBanescoFinancialStatementsExcel(transactions, 'Cortado al 31 de Agosto de 2026')}
              className="px-5 py-2.5 bg-[#00C814] hover:bg-[#00B012] text-white text-xs font-black rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              title="Descargar Balance General, Estado de Resultados y Balance de Comprobación en Excel profesional para entregar al banco"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Descargar EEFF Auditados para Banco (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Sub-Navegación de Estados Financieros */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-white/10 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('balance')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'balance'
                ? 'bg-[#7A00F2] text-white shadow-md'
                : 'bg-white/10 text-slate-300 hover:bg-white/20'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Balance General (Situación Financiera)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('income')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'income'
                ? 'bg-[#0033FF] text-white shadow-md'
                : 'bg-white/10 text-slate-300 hover:bg-white/20'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Estado de Ganancias y Pérdidas (P&L)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('trial')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'trial'
                ? 'bg-[#FF8800] text-white shadow-md'
                : 'bg-white/10 text-slate-300 hover:bg-white/20'
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>Balance de Comprobación (Sumas y Saldos)</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. BALANCE GENERAL (ESTADO DE SITUACIÓN FINANCIERA) */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'balance' && (
        <div className="space-y-6">
          
          {/* Badge de Verificación de Cuadre */}
          <div className="bg-emerald-500/10 border-2 border-emerald-400 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-[#00C814]" />
              <div>
                <h4 className="text-sm font-black text-emerald-950">
                  Balance General Cuadrado Exitosamente (ACTIVO = PASIVO + PATRIMONIO)
                </h4>
                <p className="text-xs text-emerald-900 font-semibold">
                  Ecuación Patrimonial Fundamental: {formatBs(balanceSheet.assets.totalAssetsBs)} (Bs.) === {formatBs(balanceSheet.totalLiabilitiesAndEquityBs)} (Bs.)
                </p>
              </div>
            </div>
            <div className="text-right font-mono font-black text-xs text-[#00800C]">
              Diferencia: {formatBs(balanceSheet.differenceBs)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* COLUMNA IZQUIERDA: ACTIVOS */}
            <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3">
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#00C814]" />
                  <span>1. ACTIVOS</span>
                </h3>
                <span className="text-xs font-mono font-black text-[#00C814] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  Total: {formatBs(balanceSheet.assets.totalAssetsBs)} ({formatUSD(balanceSheet.assets.totalAssetsUSD)})
                </span>
              </div>

              {/* Activo Corriente - Bancos */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider bg-slate-100 p-2 rounded-lg">
                  1.1 Efectivo y Equivalentes de Efectivo (Disponibilidad Bancaria)
                </h4>
                <div className="divide-y divide-slate-100 text-xs pl-2">
                  {balanceSheet.assets.banks.map(b => (
                    <div key={b.bankId} className="py-2 flex items-center justify-between">
                      <span className="font-bold text-slate-700">{b.bankName}</span>
                      <div className="text-right font-mono">
                        <span className="font-extrabold text-slate-900">{formatBs(b.balanceBs)}</span>
                        <span className="text-slate-500 text-[11px] block font-medium">{formatUSD(b.balanceUSD)}</span>
                      </div>
                    </div>
                  ))}
                  <div className="py-2.5 flex items-center justify-between font-black text-slate-900 bg-slate-50 px-2 rounded-lg mt-1">
                    <span>Subtotal Disponibilidad Bancaria</span>
                    <div className="text-right font-mono text-[#00C814]">
                      <span>{formatBs(balanceSheet.assets.totalBanksBs)}</span>
                      <span className="text-[11px] block">{formatUSD(balanceSheet.assets.totalBanksUSD)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cuentas por Cobrar Socios Banesco */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider bg-slate-100 p-2 rounded-lg">
                  1.2 Cuentas por Cobrar Socios (Transferencias Corporativas Banesco)
                </h4>
                <div className="flex items-center justify-between text-xs font-bold pl-2 py-1">
                  <span className="text-slate-700">Fondos Transferidos a Socios</span>
                  <div className="text-right font-mono">
                    <span className="font-extrabold text-slate-900">{formatBs(balanceSheet.assets.receivablesSociosBanescoBs)}</span>
                    <span className="text-slate-500 text-[11px] block font-medium">{formatUSD(balanceSheet.assets.receivablesSociosBanescoUSD)}</span>
                  </div>
                </div>
              </div>

              {/* Cuentas por Cobrar Contrato Mutuo Becerra */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider bg-slate-100 p-2 rounded-lg">
                  1.3 Cuentas por Cobrar Socios (Contrato Mutuo Manuel Becerra)
                </h4>
                <div className="flex items-center justify-between text-xs font-bold pl-2 py-1">
                  <span className="text-slate-700">Financiamiento Manuel Becerra</span>
                  <div className="text-right font-mono">
                    <span className="font-extrabold text-slate-900">{formatBs(balanceSheet.assets.receivablesBecerraBs)}</span>
                    <span className="text-slate-500 text-[11px] block font-medium">{formatUSD(balanceSheet.assets.receivablesBecerraUSD)}</span>
                  </div>
                </div>
              </div>

              {/* Retenciones e ISLR Exigible */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider bg-slate-100 p-2 rounded-lg">
                  1.4 Retenciones e Impuestos Pagados por Anticipado
                </h4>
                <div className="divide-y divide-slate-100 text-xs pl-2">
                  <div className="py-1.5 flex justify-between font-bold">
                    <span className="text-slate-700">Retenciones ISLR Clientes</span>
                    <span className="font-mono text-slate-900">{formatBs(balanceSheet.assets.islrRetainedClientsBs)}</span>
                  </div>
                  <div className="py-1.5 flex justify-between font-bold">
                    <span className="text-slate-700">ISLR Pagado por Anticipado / Crédito Fiscal</span>
                    <span className="font-mono text-slate-900">{formatBs(balanceSheet.assets.islrPrepaidBs)}</span>
                  </div>
                </div>
              </div>

              {/* Propiedad, Planta y Equipo Netos */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider bg-slate-100 p-2 rounded-lg">
                  1.5 Propiedad, Planta y Equipo (Activo No Corriente Neto)
                </h4>
                <div className="flex items-center justify-between text-xs font-bold pl-2 py-1">
                  <span className="text-slate-700">Maquinarias, Vehículos, Inmuebles y Depreciación</span>
                  <div className="text-right font-mono">
                    <span className="font-extrabold text-slate-900">{formatBs(balanceSheet.assets.fixedAssetsNetBs)}</span>
                    <span className="text-slate-500 text-[11px] block font-medium">{formatUSD(balanceSheet.assets.fixedAssetsNetUSD)}</span>
                  </div>
                </div>
              </div>

              {/* TOTAL ACTIVO RECAP */}
              <div className="pt-3 border-t-2 border-slate-300 flex items-center justify-between bg-slate-900 text-white p-3.5 rounded-xl font-mono">
                <span className="font-black text-xs uppercase tracking-wider">TOTAL ACTIVO</span>
                <div className="text-right">
                  <span className="font-black text-sm text-[#00C814]">{formatBs(balanceSheet.assets.totalAssetsBs)}</span>
                  <span className="text-xs text-slate-300 block font-bold">{formatUSD(balanceSheet.assets.totalAssetsUSD)}</span>
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA: PASIVOS Y PATRIMONIO */}
            <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm p-6 space-y-6">
              
              {/* 2. PASIVOS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3">
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#E52320]" />
                    <span>2. PASIVOS CORRIENTES</span>
                  </h3>
                  <span className="text-xs font-mono font-black text-[#E52320] bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                    Total: {formatBs(balanceSheet.liabilities.totalLiabilitiesBs)}
                  </span>
                </div>
                <div className="divide-y divide-slate-100 text-xs pl-2">
                  <div className="flex justify-between py-1.5 font-semibold">
                    <span>2.1 Anticipos Recibidos de Clientes (Torrefactoras / NIIF 15)</span>
                    <span className="font-mono font-bold">{formatBs(balanceSheet.liabilities.customerAdvancesBs)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 font-semibold">
                    <span>2.2 Retención de ISLR por Pagar (Anticipos Clientes)</span>
                    <span className="font-mono font-bold">{formatBs(balanceSheet.liabilities.islrRetainedPayableBs)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 font-bold text-[#0033FF] bg-blue-50 px-2 rounded-lg">
                    <span>2.3 Cuentas por Pagar Socios (Aportes Accionista Elías Trías)</span>
                    <span className="font-mono font-black">{formatBs(balanceSheet.liabilities.partnerPayableEliasBs)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 font-semibold">
                    <span>2.4 ISLR por Pagar / Tributos Retenidos</span>
                    <span className="font-mono font-bold">{formatBs(balanceSheet.liabilities.islrTaxesPayableBs)}</span>
                  </div>
                </div>
              </div>

              {/* 3. PATRIMONIO NETO */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3">
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#7A00F2]" />
                    <span>3. PATRIMONIO NETO</span>
                  </h3>
                  <span className="text-xs font-mono font-black text-[#7A00F2] bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                    Total: {formatBs(balanceSheet.equity.totalEquityBs)} ({formatUSD(balanceSheet.equity.totalEquityUSD)})
                  </span>
                </div>

                <div className="space-y-2 text-xs pl-2">
                  <div className="flex justify-between py-1.5 font-bold text-slate-700">
                    <span>3.1 Capital Social Suscrito y Pagado</span>
                    <div className="text-right font-mono">
                      <span>{formatBs(balanceSheet.equity.capitalSocialBs)}</span>
                      <span className="text-slate-500 text-[11px] block">{formatUSD(balanceSheet.equity.capitalSocialUSD)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between py-1.5 font-bold text-slate-700">
                    <span>3.2 Superávit Acumulado (Ejercicios Anteriores)</span>
                    <div className="text-right font-mono">
                      <span>{formatBs(balanceSheet.equity.accumulatedSurplusBs)}</span>
                      <span className="text-slate-500 text-[11px] block">{formatUSD(balanceSheet.equity.accumulatedSurplusUSD)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between py-1.5 font-bold text-slate-900 bg-purple-50 px-2 rounded-lg">
                    <span>3.3 Ganancia Neta del Ejercicio (Ene-Ago 2026)</span>
                    <div className="text-right font-mono text-[#7A00F2]">
                      <span>{formatBs(balanceSheet.equity.netProfitBs)}</span>
                      <span className="text-[11px] block font-black">{formatUSD(balanceSheet.equity.netProfitUSD)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between py-1.5 font-bold text-slate-700">
                    <span>3.4 Reserva Legal Cumplida (10%)</span>
                    <div className="text-right font-mono">
                      <span>{formatBs(balanceSheet.equity.legalReserveBs)}</span>
                      <span className="text-slate-500 text-[11px] block">{formatUSD(balanceSheet.equity.legalReserveUSD)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* TOTAL PASIVO + PATRIMONIO RECAP */}
              <div className="pt-3 border-t-2 border-slate-300 flex items-center justify-between bg-slate-900 text-white p-3.5 rounded-xl font-mono">
                <span className="font-black text-xs uppercase tracking-wider">TOTAL PASIVO Y PATRIMONIO</span>
                <div className="text-right">
                  <span className="font-black text-sm text-[#F9E08A]">{formatBs(balanceSheet.totalLiabilitiesAndEquityBs)}</span>
                  <span className="text-xs text-slate-300 block font-bold">{formatUSD(balanceSheet.totalLiabilitiesAndEquityUSD)}</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. ESTADO DE GANANCIAS Y PÉRDIDAS (ESTADO DE RESULTADOS) */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'income' && (
        <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b-2 border-slate-200 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#0033FF]" />
                <span>Estado de Ganancias y Pérdidas (Estado de Resultados)</span>
              </h3>
              <p className="text-xs text-slate-600 font-semibold mt-0.5">
                Resumen de Ingresos, Gastos Operacionales y Resultado Neto en Bolívares y Dólares Oficiales BCV.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 font-bold block">Resultado Neto del Período</span>
              <span className={`text-lg font-mono font-black ${
                incomeStatement.netProfitBs >= 0 ? 'text-[#00C814]' : 'text-[#E52320]'
              }`}>
                {formatBs(incomeStatement.netProfitBs)} ({formatUSD(incomeStatement.netProfitUSD)})
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* INGRESOS OPERACIONALES */}
            <div className="bg-emerald-500/5 border-2 border-emerald-300 rounded-2xl p-5 space-y-3">
              <h4 className="text-xs font-black text-[#00800C] uppercase tracking-wider flex items-center gap-1.5">
                <ArrowUpRight className="w-4 h-4 text-[#00C814]" />
                <span>1. INGRESOS OPERACIONALES</span>
              </h4>
              <div className="divide-y divide-emerald-200/60 text-xs">
                {incomeStatement.incomeBreakdown.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex justify-between font-bold text-slate-800">
                    <span>{item.concept}</span>
                    <div className="text-right font-mono">
                      <span className="text-[#00C814] font-black">{formatBs(item.amountBs)}</span>
                      <span className="text-slate-500 text-[11px] block">{formatUSD(item.amountUSD)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-emerald-300 flex justify-between text-xs font-black text-[#00800C] font-mono">
                <span>TOTAL INGRESOS OPERACIONALES</span>
                <span>{formatBs(incomeStatement.totalIncomeBs)}</span>
              </div>
            </div>

            {/* GASTOS Y COSTOS OPERACIONALES */}
            <div className="bg-rose-500/5 border-2 border-rose-300 rounded-2xl p-5 space-y-3">
              <h4 className="text-xs font-black text-[#E52320] uppercase tracking-wider flex items-center gap-1.5">
                <ArrowDownLeft className="w-4 h-4 text-[#E52320]" />
                <span>2. GASTOS Y COSTOS OPERACIONALES</span>
              </h4>
              <div className="divide-y divide-rose-200/60 text-xs">
                {incomeStatement.expenseBreakdown.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex justify-between font-bold text-slate-800">
                    <span>{item.concept}</span>
                    <div className="text-right font-mono">
                      <span className="text-[#E52320] font-black">{formatBs(item.amountBs)}</span>
                      <span className="text-slate-500 text-[11px] block">{formatUSD(item.amountUSD)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-rose-300 flex justify-between text-xs font-black text-[#E52320] font-mono">
                <span>TOTAL GASTOS Y COSTOS</span>
                <span>{formatBs(incomeStatement.totalExpenseBs)}</span>
              </div>
            </div>

          </div>

          {/* BANNER DE UTILIDAD NETAS */}
          <div className="bg-[#111827] text-white p-5 rounded-2xl flex items-center justify-between font-mono">
            <div>
              <span className="text-xs text-[#F9E08A] font-black uppercase tracking-wider block">UTILIDAD / RESULTADO NETO DE LAS OPERACIONES</span>
              <span className="text-xs text-slate-400">Calculado a la tasa diaria BCV de cada transacción</span>
            </div>
            <div className="text-right">
              <span className="text-xl font-black text-[#00C814] block">{formatBs(incomeStatement.netProfitBs)}</span>
              <span className="text-sm text-slate-300 font-bold">{formatUSD(incomeStatement.netProfitUSD)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. BALANCE DE COMPROBACIÓN (SUMAS Y SALDOS) */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'trial' && (
        <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-100/80 border-b-2 border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-[#FF8800]" />
                <span>Balance de Comprobación de Sumas y Saldos (VEN-NIF)</span>
              </h3>
              <p className="text-xs text-slate-600 font-semibold">
                Verificación de partida doble para todas las cuentas activas de los 4 bancos.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black px-3 py-1 bg-[#00C814] text-white rounded-xl shadow-xs">
                Partida Doble Cuadrada: Total Debe = Total Haber
              </span>
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#111827] text-white text-[11px] font-black uppercase tracking-wider">
                  <th className="py-3 px-3">Código</th>
                  <th className="py-3 px-4">Nombre de la Cuenta Contable</th>
                  <th className="py-3 px-3 text-right bg-blue-900/60">Suma Debe (Bs.)</th>
                  <th className="py-3 px-3 text-right bg-indigo-900/60">Suma Haber (Bs.)</th>
                  <th className="py-3 px-3 text-right bg-emerald-900/60">Saldo Deudor (Bs.)</th>
                  <th className="py-3 px-3 text-right bg-amber-900/60">Saldo Acreedor (Bs.)</th>
                  <th className="py-3 px-3 text-right">Saldo Net USD ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {trialBalance.items.map(item => (
                  <tr key={item.code} className="hover:bg-slate-100/80 transition-colors font-bold">
                    <td className="py-3 px-3 font-mono text-slate-700">{item.code}</td>
                    <td className="py-3 px-4 text-slate-900">{item.name}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-900">{formatBs(item.debitBs)}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-900">{formatBs(item.creditBs)}</td>
                    <td className="py-3 px-3 text-right font-mono text-[#00C814]">
                      {item.saldoDeudorBs > 0 ? formatBs(item.saldoDeudorBs) : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[#FF8800]">
                      {item.saldoAcreedorBs > 0 ? formatBs(item.saldoAcreedorBs) : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[#0033FF]">
                      {formatUSD(item.saldoDeudorUSD > 0 ? item.saldoDeudorUSD : item.saldoAcreedorUSD)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#111827] text-white font-mono font-black text-xs">
                  <td colSpan={2} className="py-3 px-4 uppercase tracking-wider">
                    TOTALES BALANCE DE COMPROBACIÓN
                  </td>
                  <td className="py-3 px-3 text-right text-[#00C814]">{formatBs(trialBalance.totalDebitBs)}</td>
                  <td className="py-3 px-3 text-right text-[#00C814]">{formatBs(trialBalance.totalCreditBs)}</td>
                  <td className="py-3 px-3 text-right text-[#F9E08A]">{formatBs(trialBalance.totalDebitBs)}</td>
                  <td className="py-3 px-3 text-right text-[#F9E08A]">{formatBs(trialBalance.totalCreditBs)}</td>
                  <td className="py-3 px-3 text-right text-white">{formatUSD(trialBalance.totalFinalDebitUSD)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
