import React, { useState } from 'react';
import { 
  Upload, 
  X, 
  FileSpreadsheet, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Sparkles,
  Check,
  ShieldAlert,
  ShieldCheck,
  Scale,
  Edit2
} from 'lucide-react';
import { BankId, BankTransaction } from '../types/bank';
import { BANKS, SEED_INITIAL_BALANCES, SEED_STATEMENT_CLOSING_BALANCES } from '../data/seedData';
import { parseExcelFile, parseStatementWithAI, ParseResult } from '../utils/statementParser';
import { DailyExchangeRate } from '../types/exchangeRate';
import { detectDuplicates, DuplicateAnalysisResult } from '../utils/duplicateDetector';
import { formatBs, formatUSD } from '../utils/exchangeRates';
import { validateEndingBalance } from '../utils/balanceValidation';

interface StatementUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (result: ParseResult, closingBalance?: number) => void;
  rates: DailyExchangeRate[];
  existingTransactions: BankTransaction[];
  initialBalances?: Record<string, number>;
  closingBalances?: Record<string, number>;
}

export const StatementUploaderModal: React.FC<StatementUploaderModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
  rates,
  existingTransactions,
  initialBalances = SEED_INITIAL_BALANCES,
  closingBalances = SEED_STATEMENT_CLOSING_BALANCES
}) => {
  const [selectedBankId, setSelectedBankId] = useState<BankId | 'auto'>('auto');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estado para la revisión de validación y duplicados
  const [pendingResult, setPendingResult] = useState<ParseResult | null>(null);
  const [duplicateAnalysis, setDuplicateAnalysis] = useState<DuplicateAnalysisResult | null>(null);
  
  // Saldo de cierre ingresado o extraído del estado de cuenta
  const [statementClosingInput, setStatementClosingInput] = useState<string>('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMessage(null);
      setPendingResult(null);
      setDuplicateAnalysis(null);
      setStatementClosingInput('');
    }
  };

  const handleProcessFile = async () => {
    if (!file) {
      setErrorMessage('Por favor seleccione un archivo PDF o Excel.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const fileName = file.name.toLowerCase();
      let parseResult: ParseResult;

      // 1. Si es archivo Excel / CSV
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
        parseResult = await parseExcelFile(file, rates);
      } else if (fileName.endsWith('.pdf')) {
        // 2. Si es PDF, convertir a base64 y procesar con Gemini AI backend
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1] || result;
            resolve(base64);
          };
          reader.onerror = reject;
        });
        reader.readAsDataURL(file);
        const base64Content = await base64Promise;

        parseResult = await parseStatementWithAI(file.name, base64Content, undefined, rates);
      } else {
        throw new Error('Formato de archivo no soportado. Cargue un archivo PDF, XLSX, XLS o CSV.');
      }

      if (selectedBankId !== 'auto') {
        parseResult.detectedBank = selectedBankId;
        parseResult.transactions = parseResult.transactions.map(t => ({ ...t, bankId: selectedBankId }));
      }

      // Analizar detección automática de duplicados
      const analysis = detectDuplicates(parseResult.transactions, existingTransactions);
      setDuplicateAnalysis(analysis);

      // Calcular saldo final de las transacciones procesadas
      const bId = parseResult.detectedBank;
      const initBs = parseResult.initialBalance ?? initialBalances[bId] ?? 0;
      const totalInc = parseResult.transactions
        .filter(t => t.amountBs > 0)
        .reduce((sum, t) => sum + t.amountBs, 0);
      const totalExp = parseResult.transactions
        .filter(t => t.amountBs < 0)
        .reduce((sum, t) => sum + Math.abs(t.amountBs), 0);
      const calcEnding = initBs + totalInc - totalExp;

      // Saldo de cierre extraído o predeterminado
      const closingVal = parseResult.endingBalance ?? closingBalances[bId] ?? calcEnding;
      setStatementClosingInput(closingVal.toString());

      setPendingResult(parseResult);
    } catch (err: any) {
      console.error('Error procesando archivo:', err);
      setErrorMessage(err.message || 'Ocurrió un error al procesar el archivo. Verifique el formato e intente de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmOmitDuplicates = () => {
    if (!pendingResult || !duplicateAnalysis) return;

    const closingNum = parseFloat(statementClosingInput);
    const filteredResult: ParseResult = {
      ...pendingResult,
      endingBalance: !isNaN(closingNum) ? closingNum : pendingResult.endingBalance,
      transactions: duplicateAnalysis.uniqueTransactions
    };

    onUploadSuccess(filteredResult, !isNaN(closingNum) ? closingNum : undefined);
    handleResetAndClose();
  };

  const handleConfirmImportAll = () => {
    if (!pendingResult) return;
    const closingNum = parseFloat(statementClosingInput);
    const resultWithClosing: ParseResult = {
      ...pendingResult,
      endingBalance: !isNaN(closingNum) ? closingNum : pendingResult.endingBalance
    };

    onUploadSuccess(resultWithClosing, !isNaN(closingNum) ? closingNum : undefined);
    handleResetAndClose();
  };

  const handleResetAndClose = () => {
    setFile(null);
    setPendingResult(null);
    setDuplicateAnalysis(null);
    setErrorMessage(null);
    setStatementClosingInput('');
    onClose();
  };

  // Cálculo de validación en tiempo real para el paso de revisión
  const getValidationStats = () => {
    if (!pendingResult) return null;

    const bId = pendingResult.detectedBank;
    const initBs = pendingResult.initialBalance ?? initialBalances[bId] ?? 0;
    
    // Considerar transacciones según duplicados
    const activeTxs = (duplicateAnalysis && duplicateAnalysis.hasDuplicates)
      ? duplicateAnalysis.uniqueTransactions
      : pendingResult.transactions;

    const incBs = activeTxs.filter(t => t.amountBs > 0).reduce((sum, t) => sum + t.amountBs, 0);
    const expBs = activeTxs.filter(t => t.amountBs < 0).reduce((sum, t) => sum + Math.abs(t.amountBs), 0);
    const calcEndingBs = initBs + incBs - expBs;

    const userClosingVal = parseFloat(statementClosingInput);
    const closingBs = !isNaN(userClosingVal) ? userClosingVal : calcEndingBs;
    const diffBs = calcEndingBs - closingBs;
    const isBalanced = Math.abs(diffBs) < 0.01;

    return {
      initBs,
      incBs,
      expBs,
      calcEndingBs,
      closingBs,
      diffBs,
      isBalanced
    };
  };

  const valStats = getValidationStats();

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl border-2 border-slate-300 shadow-2xl max-w-2xl w-full p-6 space-y-6 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-200 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-[#7A00F2] text-white rounded-2xl shadow-md">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">
                {pendingResult ? 'Validación y Conciliación del Estado de Cuenta' : 'Cargar Estado de Cuenta Bancario'}
              </h3>
              <p className="text-xs text-slate-600 font-semibold mt-0.5">
                {pendingResult 
                  ? 'Verifique la concordancia del saldo de cierre y la detección de transacciones antes de importar.' 
                  : 'Soporta archivos PDF oficiales y planillas Excel / CSV de bancos en Venezuela.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* PASO 2: VISTA DE VALIDACIÓN DE SALDO Y DUPLICADOS TRAS PROCESAR EL ARCHIVO */}
        {pendingResult && valStats ? (
          <div className="space-y-5">
            
            {/* 1. SECCIÓN DE VALIDACIÓN DEL SALDO DE CIERRE CON ALERTA VISUAL */}
            <div className={`p-4.5 rounded-2xl border-2 shadow-sm transition-all ${
              !valStats.isBalanced 
                ? 'bg-rose-50/95 border-[#E52320] ring-2 ring-[#E52320]/30' 
                : 'bg-emerald-50/95 border-[#00C814]'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2.5 rounded-xl text-white shadow-xs ${
                  !valStats.isBalanced ? 'bg-[#E52320] animate-pulse' : 'bg-[#00C814]'
                }`}>
                  {!valStats.isBalanced ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className={`text-sm font-black uppercase tracking-tight ${
                    !valStats.isBalanced ? 'text-[#900000]' : 'text-[#006009]'
                  }`}>
                    {!valStats.isBalanced
                      ? 'ALERTA: DISCREPANCIA DETECTADA CON EL SALDO DE CIERRE DEL BANCO'
                      : 'CONCILIACIÓN EXITOSA: EL SALDO CALCULADO COINCIDE CON EL CIERRE'}
                  </h4>
                  <p className={`text-xs font-semibold ${
                    !valStats.isBalanced ? 'text-rose-900' : 'text-emerald-900'
                  }`}>
                    {!valStats.isBalanced
                      ? `Existe una diferencia de ${formatBs(Math.abs(valStats.diffBs))} entre el saldo final de las transacciones y el saldo de cierre del estado de cuenta.`
                      : 'El saldo final de las operaciones coincide exactamente con el saldo de cierre del documento.'}
                  </p>
                </div>
              </div>

              {/* Comparador de Cifras en Tarjetas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Saldo Calculado en Operaciones</span>
                  <div className="text-sm font-black text-slate-900 font-mono mt-0.5">
                    {formatBs(valStats.calcEndingBs)}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">Inicial + Entradas - Salidas</span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Saldo Cierre Estado de Cuenta</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <input
                      type="number"
                      step="0.01"
                      value={statementClosingInput}
                      onChange={(e) => setStatementClosingInput(e.target.value)}
                      className="w-full text-sm font-black text-slate-900 font-mono p-1 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-1 focus:ring-[#7A00F2]"
                      placeholder="Saldo de cierre"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">Editable para ajustar al documento</span>
                </div>

                <div className={`p-3 rounded-xl border ${
                  !valStats.isBalanced ? 'bg-rose-100/90 border-[#E52320]' : 'bg-emerald-100/90 border-[#00C814]'
                }`}>
                  <span className={`text-[10px] font-black uppercase block ${
                    !valStats.isBalanced ? 'text-[#900000]' : 'text-[#006009]'
                  }`}>
                    Discrepancia / Descuadre
                  </span>
                  <div className={`text-sm font-black font-mono mt-0.5 ${
                    !valStats.isBalanced ? 'text-[#C11210]' : 'text-[#00800C]'
                  }`}>
                    {valStats.diffBs > 0 ? '+' : ''}{formatBs(valStats.diffBs)}
                  </div>
                  <span className={`text-[10px] font-bold block ${
                    !valStats.isBalanced ? 'text-rose-800' : 'text-emerald-800'
                  }`}>
                    {!valStats.isBalanced ? 'Requiere revisión' : 'Conciliado (0.00 Bs.)'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. SECCIÓN DE DUPLICADOS (SI SE DETECTARON) */}
            {duplicateAnalysis && duplicateAnalysis.hasDuplicates && (
              <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-black text-xs uppercase tracking-wide">
                  <AlertCircle className="w-4 h-4 text-[#FF8800]" />
                  <span>Se detectaron {duplicateAnalysis.duplicateCount} transacciones duplicadas ya existentes</span>
                </div>

                <div className="max-h-36 overflow-y-auto border border-amber-200 rounded-xl text-xs bg-white">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 text-[10px] uppercase font-black text-slate-600 sticky top-0">
                      <tr>
                        <th className="py-1.5 px-2.5">Fecha</th>
                        <th className="py-1.5 px-2.5">Referencia</th>
                        <th className="py-1.5 px-2.5">Descripción</th>
                        <th className="py-1.5 px-2.5 text-right">Monto (Bs.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {duplicateAnalysis.duplicateMatches.map((m, idx) => (
                        <tr key={idx} className="hover:bg-amber-50/60">
                          <td className="py-1.5 px-2.5 whitespace-nowrap">{m.incomingTx.date}</td>
                          <td className="py-1.5 px-2.5 whitespace-nowrap font-bold">{m.incomingTx.reference}</td>
                          <td className="py-1.5 px-2.5 truncate max-w-xs">{m.incomingTx.description}</td>
                          <td className="py-1.5 px-2.5 text-right font-bold text-[#E52320]">{formatBs(m.incomingTx.amountBs)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* BOTONES DE DECISIÓN DE IMPORTACIÓN */}
            <div className="pt-3 border-t-2 border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                {duplicateAnalysis && duplicateAnalysis.hasDuplicates ? (
                  <>
                    <button
                      type="button"
                      onClick={handleConfirmImportAll}
                      className="px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-xl cursor-pointer"
                    >
                      Importar Todas ({duplicateAnalysis.totalIncomingCount})
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmOmitDuplicates}
                      className="px-5 py-2.5 text-xs font-black text-white bg-[#00C814] hover:bg-[#00B012] rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-98"
                    >
                      <Check className="w-4 h-4" />
                      <span>Omitir Duplicados e Importar ({duplicateAnalysis.uniqueTransactions.length} Nuevas)</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmImportAll}
                    className="px-5 py-2.5 text-xs font-black text-white bg-[#00C814] hover:bg-[#00B012] rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-98"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirmar e Importar al Banco ({pendingResult.transactions.length} Operaciones)</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        ) : (
          /* PASO 1: SELECCIÓN Y CARGA DE ARCHIVO */
          <div className="space-y-4">
            
            {/* Selección de Banco */}
            <div>
              <label className="block text-xs font-extrabold text-slate-800 mb-1">
                Seleccionar Banco Destino
              </label>
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value as any)}
                className="w-full text-xs p-3 bg-white border-2 border-slate-300 rounded-xl font-extrabold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#7A00F2]"
              >
                <option value="auto">Detección Automática por Nombre / Formato</option>
                {BANKS.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.accountNumber})</option>
                ))}
              </select>
            </div>

            {/* ÁREA DE CARGA DE ARCHIVOS DRAG & DROP */}
            <div className="border-2 border-dashed border-[#7A00F2]/40 hover:border-[#7A00F2] rounded-2xl p-6 text-center bg-purple-50/40 transition-all cursor-pointer relative">
              <input
                type="file"
                accept=".pdf,.xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />

              <div className="space-y-2">
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-[#7A00F2] font-black text-xs">
                    {file.name.endsWith('.pdf') ? <FileText className="w-6 h-6 text-rose-500" /> : <FileSpreadsheet className="w-6 h-6 text-emerald-600" />}
                    <span>{file.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono font-bold">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-white shadow-xs flex items-center justify-center text-[#7A00F2] border border-purple-200">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-xs text-slate-700">
                      <span className="font-black text-[#7A00F2]">Haga clic aquí</span> para seleccionar o arrastre su archivo PDF/Excel
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold">
                      Formatos Soportados: PDF de Bancamiga, Mercantil, Plaza, Provincial, o Excel / CSV
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Mensaje de Error */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-xl text-rose-900 text-xs flex items-start gap-2 font-bold">
                <AlertCircle className="w-4 h-4 text-[#E52320] shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Nota Informativa de Validación de Saldo */}
            <div className="p-3 bg-emerald-50/80 border-2 border-emerald-300 rounded-xl text-emerald-950 text-xs flex items-center gap-2 font-bold">
              <Sparkles className="w-4 h-4 text-[#00C814] shrink-0" />
              <span>
                Validación de Saldo Automática: Compara el saldo final de las operaciones contra el saldo de cierre del estado de cuenta con alerta visual de discrepancias.
              </span>
            </div>

            {/* Footer */}
            <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                disabled={isProcessing}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleProcessFile}
                disabled={!file || isProcessing}
                className="px-5 py-2.5 text-xs font-black text-white bg-[#7A00F2] hover:bg-[#6800CC] disabled:opacity-50 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-98"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analizando y Validando Saldos...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Procesar y Validar</span>
                  </>
                )}
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
