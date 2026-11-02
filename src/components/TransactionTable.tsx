import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownLeft,
  FileText,
  User,
  Building2,
  CreditCard,
  FileSpreadsheet
} from 'lucide-react';
import { BankTransaction, BankId, CategoryId } from '../types/bank';
import { BANKS, CATEGORIES } from '../data/seedData';
import { formatBs, formatUSD } from '../utils/exchangeRates';
import { extractEntityDetails } from '../utils/categorizer';
import { exportBankMonthlyCategoryReport } from '../utils/excelExporter';

interface TransactionTableProps {
  transactions: BankTransaction[];
  selectedBankId: BankId | 'all';
  selectedCategoryFilter: string;
  onCategoryFilterChange: (catId: string) => void;
  onUpdateTransaction: (updatedTx: BankTransaction) => void;
  onDeleteTransaction: (id: string) => void;
  onAddTransaction: (newTx: Omit<BankTransaction, 'id'>) => void;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  selectedBankId,
  selectedCategoryFilter,
  onCategoryFilterChange,
  onUpdateTransaction,
  onDeleteTransaction,
  onAddTransaction
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [personTypeFilter, setPersonTypeFilter] = useState<'all' | 'juridica' | 'natural'>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState('');
  const [isAddingModalOpen, setIsAddingModalOpen] = useState(false);

  // Formulario manual
  const [newBankId, setNewBankId] = useState<BankId>('mercantil');
  const [newDate, setNewDate] = useState('2026-08-15');
  const [newRef, setNewRef] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAmountBs, setNewAmountBs] = useState('');
  const [newCategory, setNewCategory] = useState<CategoryId>('pago_proveedor');
  const [newRate, setNewRate] = useState('787.5');
  const [newNotes, setNewNotes] = useState('');

  // Nuevos campos de entidad manual
  const [newEntityName, setNewEntityName] = useState('');
  const [newEntityDoc, setNewEntityDoc] = useState('');
  const [newPersonType, setNewPersonType] = useState<'Persona Natural' | 'Persona Jurídica'>('Persona Jurídica');
  const [newBankAccountDetail, setNewBankAccountDetail] = useState('');

  // Meses disponibles
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach(t => {
      if (t.date && t.date.length >= 7) {
        months.add(t.date.slice(0, 7));
      }
    });
    return Array.from(months).sort();
  }, [transactions]);

  const formatMonthLabel = (m: string) => {
    const map: Record<string, string> = {
      '2026-01': 'Enero 2026',
      '2026-02': 'Febrero 2026',
      '2026-03': 'Marzo 2026',
      '2026-04': 'Abril 2026',
      '2026-05': 'Mayo 2026',
      '2026-06': 'Junio 2026',
      '2026-07': 'Julio 2026',
      '2026-08': 'Agosto 2026'
    };
    return map[m] || m;
  };

  // Transacciones filtradas
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (selectedBankId !== 'all' && t.bankId !== selectedBankId) return false;
      if (selectedCategoryFilter && t.category !== selectedCategoryFilter) return false;
      if (monthFilter !== 'all' && !t.date.startsWith(monthFilter)) return false;
      if (typeFilter === 'income' && t.amountBs <= 0) return false;
      if (typeFilter === 'expense' && t.amountBs >= 0) return false;

      if (personTypeFilter === 'juridica' && t.personType !== 'Persona Jurídica') return false;
      if (personTypeFilter === 'natural' && t.personType !== 'Persona Natural') return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchDesc = t.description.toLowerCase().includes(query);
        const matchRef = t.reference.toLowerCase().includes(query);
        const matchNotes = (t.notes || '').toLowerCase().includes(query);
        const matchDate = t.date.includes(query);
        const matchCat = CATEGORIES.find(c => c.id === t.category)?.name.toLowerCase().includes(query);
        const matchEntityName = (t.entityName || '').toLowerCase().includes(query);
        const matchEntityDoc = (t.entityDoc || '').toLowerCase().includes(query);
        const matchBankDetail = (t.bankAccountDetail || '').toLowerCase().includes(query);

        return (
          matchDesc || 
          matchRef || 
          matchNotes || 
          matchDate || 
          matchCat || 
          matchEntityName || 
          matchEntityDoc || 
          matchBankDetail
        );
      }

      return true;
    });
  }, [transactions, selectedBankId, selectedCategoryFilter, typeFilter, personTypeFilter, searchQuery]);

  // Cambio de categoría
  const handleCategoryChange = (tx: BankTransaction, newCat: CategoryId) => {
    onUpdateTransaction({
      ...tx,
      category: newCat,
      manuallyCategorized: true
    });
  };

  // Cambio de tasa
  const handleRateChange = (tx: BankTransaction, newRateVal: number) => {
    if (isNaN(newRateVal) || newRateVal <= 0) return;
    onUpdateTransaction({
      ...tx,
      exchangeRate: newRateVal,
      amountUSD: Math.abs(tx.amountBs) / newRateVal
    });
  };

  // Guardar notas
  const handleSaveNotes = (tx: BankTransaction) => {
    onUpdateTransaction({
      ...tx,
      notes: editingNotes
    });
    setEditingTxId(null);
  };

  // Crear manual
  const handleCreateNewTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(newAmountBs);
    const rateVal = parseFloat(newRate) || 787.5;

    if (!newDesc.trim() || isNaN(amountVal) || amountVal === 0) {
      alert('Por favor ingrese una descripción y un monto válido.');
      return;
    }

    const autoEntity = extractEntityDetails(newDesc, newBankId, amountVal);

    onAddTransaction({
      bankId: newBankId,
      date: newDate,
      reference: newRef || `MAN-${Date.now().toString().slice(-6)}`,
      description: newDesc,
      amountBs: amountVal,
      type: amountVal > 0 ? 'income' : 'expense',
      category: newCategory,
      exchangeRate: rateVal,
      amountUSD: Math.abs(amountVal) / rateVal,
      notes: newNotes,
      manuallyCategorized: true,
      entityName: newEntityName || autoEntity.entityName,
      entityDoc: newEntityDoc || autoEntity.entityDoc,
      personType: newPersonType || autoEntity.personType,
      bankAccountDetail: newBankAccountDetail || autoEntity.bankAccountDetail
    });

    setIsAddingModalOpen(false);
    setNewDesc('');
    setNewAmountBs('');
    setNewRef('');
    setNewNotes('');
    setNewEntityName('');
    setNewEntityDoc('');
    setNewBankAccountDetail('');
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
      
      {/* Barra de Filtros y Búsqueda Superior */}
      <div className="p-4 border-b-2 border-slate-200 bg-slate-100/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Input Búsqueda */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por Ordenante, RIF/Cédula, descripción, ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border-2 border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#7A00F2] font-bold"
          />
        </div>

        {/* Filtros de la Imagen y Tipo de Persona */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Dropdown de Categorías */}
          <select
            value={selectedCategoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value)}
            className="px-3.5 py-2 text-xs bg-white border-2 border-slate-300 rounded-xl text-slate-900 font-black focus:outline-hidden focus:ring-2 focus:ring-[#7A00F2] cursor-pointer"
          >
            <option value="">Todas las Categorías</option>
            {CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Filtro por Mes */}
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border-2 border-slate-300 rounded-xl text-slate-900 font-black focus:outline-hidden focus:ring-2 focus:ring-[#7A00F2] cursor-pointer"
          >
            <option value="all">Mes: Todos (Ene - Ago 2026)</option>
            {availableMonths.map(m => (
              <option key={m} value={m}>
                {formatMonthLabel(m)}
              </option>
            ))}
          </select>

          {/* Filtro Tipo Persona */}
          <select
            value={personTypeFilter}
            onChange={(e) => setPersonTypeFilter(e.target.value as any)}
            className="px-3 py-2 text-xs bg-white border-2 border-slate-300 rounded-xl text-slate-900 font-black focus:outline-hidden focus:ring-2 focus:ring-[#7A00F2] cursor-pointer"
          >
            <option value="all">Persona: Todas</option>
            <option value="juridica">Persona Jurídica (RIF)</option>
            <option value="natural">Persona Natural (Cédula)</option>
          </select>

          {/* Segmented Buttons (Todos, Entradas, Salidas) */}
          <div className="flex items-center p-1 bg-slate-200/90 rounded-xl">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
                typeFilter === 'all' ? 'bg-[#111827] text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setTypeFilter('income')}
              className={`px-3 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
                typeFilter === 'income' ? 'bg-[#00C814] text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Entradas
            </button>
            <button
              onClick={() => setTypeFilter('expense')}
              className={`px-3 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
                typeFilter === 'expense' ? 'bg-[#E52320] text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Salidas
            </button>
          </div>

          {/* + Agregar Manual (#7A00F2 Purple Button) */}
          <button
            onClick={() => setIsAddingModalOpen(true)}
            className="px-3.5 py-2 text-xs font-black rounded-xl bg-[#7A00F2] text-white hover:bg-[#6300C7] transition-all flex items-center gap-1.5 shadow-md cursor-pointer active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Manual</span>
          </button>

          {/* Exportar Excel de Este Banco con Categorías, Bs, Tasa del día y USD */}
          <button
            onClick={() => exportBankMonthlyCategoryReport(selectedBankId, transactions)}
            className="px-3.5 py-2 text-xs font-black rounded-xl bg-[#00C814] text-white hover:bg-[#00B012] transition-all flex items-center gap-1.5 shadow-md cursor-pointer active:scale-98"
            title="Descargar informe contable oficial con Categorías clasificadas una por una, Monto en Bolívares (Bs.), Tasa de Cambio Oficial BCV del día, y Monto en Dólares ($ USD)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel Categorías (Bs / Tasa / USD)</span>
          </button>
        </div>
      </div>

      {/* Contador de Registros */}
      <div className="px-4 py-2.5 bg-slate-200/50 border-b border-slate-300 text-xs font-extrabold text-slate-700 flex items-center justify-between">
        <span>Mostrando {filteredTransactions.length} transacciones de {transactions.length} cargadas</span>
        {selectedCategoryFilter && (
          <span className="text-white font-extrabold bg-[#7A00F2] px-3 py-0.5 rounded-full shadow-2xs">
            Filtro: {CATEGORIES.find(c => c.id === selectedCategoryFilter)?.name}
          </span>
        )}
      </div>

      {/* Tabla de Movimientos Bancarios */}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#111827] text-white text-[11px] font-black uppercase tracking-wider">
              <th className="py-3.5 px-3">Fecha</th>
              <th className="py-3.5 px-3">Banco</th>
              <th className="py-3.5 px-3">Referencia</th>
              <th className="py-3.5 px-4 bg-[#1E1B4B]">Ordenante / Beneficiario & RIF/C.I.</th>
              <th className="py-3.5 px-4">Descripción de la Operación</th>
              <th className="py-3.5 px-4">Categoría</th>
              <th className="py-3.5 px-3 text-right">Monto (Bs.)</th>
              <th className="py-3.5 px-3 text-right">Tasa BCV ($)</th>
              <th className="py-3.5 px-3 text-right">Monto ($ USD)</th>
              <th className="py-3.5 px-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="font-extrabold text-slate-700">No se encontraron movimientos bancarios</p>
                </td>
              </tr>
            ) : (
              filteredTransactions.map((tx) => {
                const bank = BANKS.find(b => b.id === tx.bankId);
                const categoryInfo = CATEGORIES.find(c => c.id === tx.category);
                const isIncome = tx.amountBs > 0;
                
                const isElias = tx.description.toUpperCase().includes('ELIAS') || tx.category === 'aporte_socio';
                const isInternal = tx.category === 'transferencia_interna';
                const isUSD = tx.category === 'compra_dolares';

                return (
                  <tr key={tx.id} className="hover:bg-slate-100/70 transition-colors">
                    
                    {/* Fecha */}
                    <td className="py-3.5 px-3 font-mono text-slate-800 whitespace-nowrap font-bold">
                      {tx.date}
                    </td>

                    {/* Banco Badge con Colores de la Paleta */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black text-white shadow-2xs ${
                        tx.bankId === 'bancamiga' ? 'bg-[#00C814]' :
                        tx.bankId === 'mercantil' ? 'bg-[#0033FF]' :
                        tx.bankId === 'plaza' ? 'bg-[#FF8800]' :
                        'bg-[#7A00F2]'
                      }`}>
                        {bank?.logoInitial} · {bank?.shortName}
                      </span>
                    </td>

                    {/* Referencia */}
                    <td className="py-3.5 px-3 font-mono text-slate-700 whitespace-nowrap font-bold">
                      {tx.reference}
                    </td>

                    {/* NUEVA COLUMNA: ORDENANTE / BENEFICIARIO & DOCUMENTO (RIF/C.I.) */}
                    <td className="py-3.5 px-4 bg-slate-50/70 border-x border-slate-200">
                      <div className="flex flex-col gap-1">
                        <div className="font-black text-slate-900 leading-tight">
                          {tx.entityName || 'No Identificado'}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black ${
                            tx.personType === 'Persona Jurídica'
                              ? 'bg-[#7A00F2]/15 text-[#7A00F2] border border-[#7A00F2]/30'
                              : 'bg-[#0033FF]/15 text-[#0033FF] border border-[#0033FF]/30'
                          }`}>
                            {tx.personType === 'Persona Jurídica' ? (
                              <Building2 className="w-3 h-3" />
                            ) : (
                              <User className="w-3 h-3" />
                            )}
                            {tx.personType || 'Desconocido'}
                          </span>
                          <span className="font-mono text-[10px] font-extrabold bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded">
                            {tx.entityDoc || 'RIF/CI N/A'}
                          </span>
                        </div>
                        {tx.bankAccountDetail && (
                          <div className="text-[10px] text-slate-500 font-medium truncate max-w-[200px]" title={tx.bankAccountDetail}>
                            {tx.bankAccountDetail}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Descripción de la Operación */}
                    <td className="py-3.5 px-4 max-w-xs break-words">
                      <div className="font-extrabold text-slate-900 leading-snug">
                        {tx.description}
                      </div>

                      {/* Destacados Especiales */}
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {isElias && (
                          <span className="text-[10px] font-black bg-[#0033FF]/15 text-[#0033FF] px-2 py-0.2 rounded-md border border-[#0033FF]/30">
                            Socio Elías Trías V-23997829
                          </span>
                        )}
                        {isInternal && (
                          <span className="text-[10px] font-black bg-[#7A00F2]/15 text-[#7A00F2] px-2 py-0.2 rounded-md border border-[#7A00F2]/30">
                            Trf. Interna Empresa
                          </span>
                        )}
                        {isUSD && (
                          <span className="text-[10px] font-black bg-[#00C814]/15 text-[#00C814] px-2 py-0.2 rounded-md border border-[#00C814]/30">
                            Compra USD / BCV
                          </span>
                        )}
                        {tx.notes && (
                          <span className="text-[10px] text-slate-600 italic bg-slate-100 px-1.5 py-0.2 rounded">
                            Nota: {tx.notes}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Selector de Categoría Interactiva */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <select
                        value={tx.category}
                        onChange={(e) => handleCategoryChange(tx, e.target.value as CategoryId)}
                        className={`text-xs font-black px-3 py-1.5 rounded-xl border-2 focus:outline-hidden focus:ring-2 focus:ring-[#7A00F2] cursor-pointer ${
                          tx.category === 'transferencia_interna' ? 'bg-[#7A00F2]/10 text-[#7A00F2] border-[#7A00F2]/40' :
                          tx.category === 'aporte_socio' ? 'bg-[#0033FF]/10 text-[#0033FF] border-[#0033FF]/40' :
                          tx.category === 'compra_dolares' ? 'bg-[#00C814]/10 text-[#00800C] border-[#00C814]/40' :
                          tx.category === 'pago_proveedor' ? 'bg-[#FF8800]/10 text-[#CC6D00] border-[#FF8800]/40' :
                          tx.category === 'comision_servicio' ? 'bg-[#E52320]/10 text-[#E52320] border-[#E52320]/40' :
                          'bg-slate-100 text-slate-800 border-slate-300'
                        }`}
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Monto en Bolívares (Bs.) */}
                    <td className="py-3.5 px-3 text-right whitespace-nowrap">
                      <div className={`font-mono font-black text-xs flex items-center justify-end gap-1 ${
                        isIncome ? 'text-[#00C814]' : 'text-[#E52320]'
                      }`}>
                        {isIncome ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                        <span>{formatBs(tx.amountBs)}</span>
                      </div>
                    </td>

                    {/* Tasa Dólar BCV ($) Editable */}
                    <td className="py-3.5 px-3 text-right whitespace-nowrap">
                      <input
                        type="number"
                        step="0.1"
                        value={tx.exchangeRate}
                        onChange={(e) => handleRateChange(tx, parseFloat(e.target.value))}
                        className="w-20 text-right text-xs bg-slate-100 border-2 border-slate-300 rounded-lg px-2 py-1 focus:bg-white focus:ring-2 focus:ring-[#7A00F2] font-mono font-black text-slate-900"
                      />
                    </td>

                    {/* Monto en Dólares ($ USD) */}
                    <td className="py-3.5 px-3 text-right font-mono font-black text-sm whitespace-nowrap text-[#0033FF]">
                      {formatUSD(tx.amountUSD)}
                    </td>

                    {/* Acciones */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setEditingTxId(editingTxId === tx.id ? null : tx.id);
                            setEditingNotes(tx.notes || '');
                          }}
                          className="p-1.5 text-slate-400 hover:text-[#7A00F2] rounded-lg hover:bg-slate-200 cursor-pointer transition-colors"
                          title="Agregar/Editar Nota"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            if (confirm('¿Está seguro de eliminar esta transacción?')) {
                              onDeleteTransaction(tx.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-[#E52320] rounded-lg hover:bg-slate-200 cursor-pointer transition-colors"
                          title="Eliminar Transacción"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {editingTxId === tx.id && (
                        <div className="mt-2 p-2 bg-slate-100 rounded-xl border border-slate-300 text-left">
                          <input
                            type="text"
                            placeholder="Escriba una observación..."
                            value={editingNotes}
                            onChange={(e) => setEditingNotes(e.target.value)}
                            className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded-lg mb-1.5 font-medium"
                          />
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => setEditingTxId(null)}
                              className="px-2 py-1 text-[10px] bg-slate-200 text-slate-700 rounded-md font-bold"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleSaveNotes(tx)}
                              className="px-2 py-1 text-[10px] bg-[#7A00F2] text-white rounded-md font-extrabold"
                            >
                              Guardar
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Agregar Transacción Manual */}
      {isAddingModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-2xl max-w-lg w-full p-6 my-8">
            <h3 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#7A00F2]" />
              <span>Agregar Transacción Manual</span>
            </h3>

            <form onSubmit={handleCreateNewTransaction} className="space-y-3.5">
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">Banco</label>
                <select
                  value={newBankId}
                  onChange={(e) => setNewBankId(e.target.value as BankId)}
                  className="w-full text-xs p-2.5 bg-white border-2 border-slate-300 rounded-xl font-extrabold"
                >
                  {BANKS.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border-2 border-slate-300 rounded-xl font-mono font-extrabold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1">Referencia</label>
                  <input
                    type="text"
                    placeholder="ej: 00082369"
                    value={newRef}
                    onChange={(e) => setNewRef(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border-2 border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* Campos de Entidad / Ordenante */}
              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 space-y-2.5">
                <span className="text-xs font-black text-[#7A00F2] block">Identificación de Ordenante / Beneficiario</span>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nombre o Razón Social</label>
                  <input
                    type="text"
                    placeholder="ej: AGRICOLA ONI C.A. o ELIAS TRIAS ABREU"
                    value={newEntityName}
                    onChange={(e) => setNewEntityName(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Documento (RIF / C.I.)</label>
                    <input
                      type="text"
                      placeholder="ej: J-50145638-0 o V-23997829"
                      value={newEntityDoc}
                      onChange={(e) => setNewEntityDoc(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Tipo de Persona</label>
                    <select
                      value={newPersonType}
                      onChange={(e) => setNewPersonType(e.target.value as any)}
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-bold"
                    >
                      <option value="Persona Jurídica">Persona Jurídica</option>
                      <option value="Persona Natural">Persona Natural</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Detalle Banco Origen / Destino</label>
                  <input
                    type="text"
                    placeholder="ej: Banesco 0134-0401-13-4011117562"
                    value={newBankAccountDetail}
                    onChange={(e) => setNewBankAccountDetail(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">Descripción en Estado de Cuenta</label>
                <input
                  type="text"
                  placeholder="ej: Transferencia a Banesco Agrícola ONI C.A."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border-2 border-slate-300 rounded-xl font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1">
                    Monto (Bs.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="ej: -1500000.00"
                    value={newAmountBs}
                    onChange={(e) => setNewAmountBs(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border-2 border-slate-300 rounded-xl font-mono font-black text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1">Tasa Dólar BCV ($)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border-2 border-slate-300 rounded-xl font-mono font-extrabold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">Categoría</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as CategoryId)}
                  className="w-full text-xs p-2.5 bg-white border-2 border-slate-300 rounded-xl font-extrabold"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">Notas</label>
                <input
                  type="text"
                  placeholder="Observación opcional"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border-2 border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddingModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-black text-white bg-[#7A00F2] hover:bg-[#6800CC] rounded-xl cursor-pointer shadow-md"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
