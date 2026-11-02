import React from 'react';
import { 
  Building2, 
  FileSpreadsheet, 
  Upload, 
  DollarSign, 
  UserCheck, 
  LayoutDashboard, 
  BookOpen, 
  ArrowLeftRight,
  Database,
  RotateCcw,
  Scale
} from 'lucide-react';
import { BankId } from '../types/bank';
import { BANKS, COMPANY_INFO } from '../data/seedData';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenUpload: () => void;
  onOpenRates: () => void;
  onOpenPartnerModal: () => void;
  onOpenInternalTransfersModal: () => void;
  onExportExcel: () => void;
  onResetDatabase: () => void;
  transactionCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onOpenUpload,
  onOpenRates,
  onOpenPartnerModal,
  onOpenInternalTransfersModal,
  onExportExcel,
  onResetDatabase,
  transactionCount
}) => {
  return (
    <header className="bg-white border-b-2 border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top Banner with Company Info & Global Actions (Clean White Background) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Brand Title: BANCO EXPRESS */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7A00F2] via-[#0033FF] to-[#00C814] flex items-center justify-center text-white shadow-md shrink-0 font-black text-2xl tracking-tighter ring-2 ring-slate-100">
              BE
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span className="bg-gradient-to-r from-[#7A00F2] via-[#0033FF] to-[#E6007E] bg-clip-text text-transparent">
                    BANCO EXPRESS
                  </span>
                </h1>
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-mono">
                  {COMPANY_INFO.name}
                </span>
                <span className="text-[11px] font-extrabold text-[#00800C] bg-[#00C814]/10 px-3 py-0.5 rounded-full border border-[#00C814]/30 flex items-center gap-1 shadow-2xs">
                  <Database className="w-3.5 h-3.5 text-[#00C814]" /> Base de Datos Activa
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 font-semibold">
                <span>RIF: {COMPANY_INFO.rif}</span>
                <span>·</span>
                <span>Bancamiga, Mercantil, Plaza, Provincial</span>
                <span>·</span>
                <span className="font-black text-slate-800 bg-slate-100 px-2 py-0.2 rounded border border-slate-200">{transactionCount} Operaciones</span>
              </p>
            </div>
          </div>

          {/* Quick Action Buttons (Vibrant Telcel Color Palette Buttons on Clean White) */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            
            {/* Socio Elías Trías Badge Button (#0033FF Royal Blue) */}
            <button
              onClick={onOpenPartnerModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-black rounded-xl bg-blue-50 text-[#0033FF] hover:bg-blue-100 border border-blue-200 transition-all shadow-2xs cursor-pointer active:scale-98"
              title="Ver movimientos del socio Elías Trías"
            >
              <UserCheck className="w-4 h-4 text-[#0033FF]" />
              <span>Socio: {COMPANY_INFO.partner.shortName}</span>
              <span className="bg-[#0033FF] text-white text-[10px] px-1.5 py-0.2 rounded font-mono font-extrabold">
                {COMPANY_INFO.partner.cedula}
              </span>
            </button>

            {/* Verification of Internal Transfers (#7A00F2 Deep Purple) */}
            <button
              onClick={onOpenInternalTransfersModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-black rounded-xl bg-purple-50 text-[#7A00F2] hover:bg-purple-100 border border-purple-200 transition-all shadow-2xs cursor-pointer active:scale-98"
              title="Verificar transferencias entre cuentas de la misma empresa"
            >
              <ArrowLeftRight className="w-4 h-4 text-[#7A00F2]" />
              <span>Trfs. Internas</span>
            </button>

            {/* Dólar Rates Manager Button (#FF8800 Sun Orange) */}
            <button
              onClick={onOpenRates}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-black rounded-xl bg-amber-50 text-[#CC6D00] hover:bg-amber-100 border border-amber-200 transition-all shadow-2xs cursor-pointer active:scale-98"
              title="Tasas BCV del Dólar 2026"
            >
              <DollarSign className="w-4 h-4 text-[#FF8800]" />
              <span>Tasas BCV 2026</span>
            </button>

            {/* Statement Upload Button (#E6007E Fuchsia Magenta) */}
            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-black rounded-xl bg-fuchsia-50 text-[#E6007E] hover:bg-fuchsia-100 border border-fuchsia-200 transition-all shadow-2xs cursor-pointer active:scale-98"
            >
              <Upload className="w-4 h-4 text-[#E6007E]" />
              <span>Cargar EDO CTA</span>
            </button>

            {/* Download Excel Summary (#00C814 Emerald Green) */}
            <button
              onClick={onExportExcel}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black rounded-xl bg-[#00C814] text-white hover:bg-[#00B012] transition-all shadow-md cursor-pointer active:scale-98"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Reporte Excel</span>
            </button>

            {/* Reset Database Button */}
            <button
              onClick={() => {
                if (confirm('¿Está seguro de que desea restablecer la base de datos a los valores iniciales?')) {
                  onResetDatabase();
                }
              }}
              className="p-2 text-slate-400 hover:text-[#E52320] rounded-xl hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
              title="Restablecer Base de Datos por Defecto"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar with Clean Soft Background */}
      <div className="bg-slate-100/80 border-t border-slate-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-none">
          
          {/* Visión General Tab (Dark Pill in screenshot) */}
          <button
            onClick={() => onSelectTab('overview')}
            className={`px-4 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              currentTab === 'overview'
                ? 'bg-[#111827] text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-[#00C814]" />
            <span>Visión General</span>
          </button>

          {/* Bancamiga (#00C814 Green) */}
          <button
            onClick={() => onSelectTab('bancamiga')}
            className={`px-4 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              currentTab === 'bancamiga'
                ? 'bg-[#00C814] text-white shadow-xs'
                : 'text-slate-700 bg-white hover:bg-slate-200/80 border border-slate-200'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#00C814]" />
            <span>Bancamiga</span>
          </button>

          {/* Mercantil (#0033FF Blue) */}
          <button
            onClick={() => onSelectTab('mercantil')}
            className={`px-4 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              currentTab === 'mercantil'
                ? 'bg-[#0033FF] text-white shadow-xs'
                : 'text-slate-700 bg-white hover:bg-slate-200/80 border border-slate-200'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#0033FF]" />
            <span>Mercantil</span>
          </button>

          {/* Banco Plaza (#FF8800 Orange) */}
          <button
            onClick={() => onSelectTab('plaza')}
            className={`px-4 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              currentTab === 'plaza'
                ? 'bg-[#FF8800] text-white shadow-xs'
                : 'text-slate-700 bg-white hover:bg-slate-200/80 border border-slate-200'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF8800]" />
            <span>Banco Plaza</span>
          </button>

          {/* Provincial (#7A00F2 Purple) */}
          <button
            onClick={() => onSelectTab('provincial')}
            className={`px-4 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              currentTab === 'provincial'
                ? 'bg-[#7A00F2] text-white shadow-xs'
                : 'text-slate-700 bg-white hover:bg-slate-200/80 border border-slate-200'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#7A00F2]" />
            <span>Provincial</span>
          </button>

          <div className="w-px h-5 bg-slate-300 my-auto mx-1" />

          {/* Resumen Consolidado (#E6007E Fuchsia) */}
          <button
            onClick={() => onSelectTab('consolidated')}
            className={`px-4 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              currentTab === 'consolidated'
                ? 'bg-[#7A00F2] text-white shadow-xs'
                : 'text-[#7A00F2] bg-purple-50 hover:bg-purple-100 border border-purple-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Resumen Consolidado</span>
          </button>

          {/* Libro Diario (Contabilidad) (#FF8800 Orange) */}
          <button
            onClick={() => onSelectTab('accounting')}
            className={`px-4 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              currentTab === 'accounting'
                ? 'bg-[#111827] text-white shadow-xs'
                : 'text-slate-800 bg-slate-200 hover:bg-slate-300 border border-slate-300'
            }`}
          >
            <BookOpen className="w-4 h-4 text-[#FF8800]" />
            <span>Libro Diario</span>
          </button>

          {/* Estados Financieros (Balance, G&P, Comprobación) (#00C814 Green) */}
          <button
            onClick={() => onSelectTab('financials')}
            className={`px-4 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              currentTab === 'financials'
                ? 'bg-[#00C814] text-white shadow-md ring-2 ring-emerald-300'
                : 'text-[#00800C] bg-emerald-50 hover:bg-emerald-100 border border-emerald-300'
            }`}
          >
            <Scale className="w-4 h-4 text-[#00C814]" />
            <span>Estados Financieros (Balance & G&P)</span>
          </button>
        </div>
      </div>
    </header>
  );
};
