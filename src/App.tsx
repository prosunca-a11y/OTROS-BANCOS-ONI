/**
 * Sistema de Conciliación Bancaria y Contabilidad para Agrícola ONI C.A.
 * Bancos: Bancamiga, Banco Mercantil, Banco Plaza y Banco Provincial
 * Con Persistencia Permanente en Base de Datos Local y Tasas BCV 2026.
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BankOverviewCards } from './components/BankOverviewCards';
import { TransactionTable } from './components/TransactionTable';
import { ConsolidatedView } from './components/ConsolidatedView';
import { AccountingJournalView } from './components/AccountingJournalView';
import { FinancialStatementsView } from './components/FinancialStatementsView';
import { ExchangeRateEditorModal } from './components/ExchangeRateEditorModal';
import { PartnerProfileModal } from './components/PartnerProfileModal';
import { InternalTransfersModal } from './components/InternalTransfersModal';
import { StatementUploaderModal } from './components/StatementUploaderModal';

import { BankTransaction, BankId } from './types/bank';
import { DailyExchangeRate } from './types/exchangeRate';
import { COMPANY_INFO } from './data/seedData';
import { exportToExcel } from './utils/excelExporter';
import { ParseResult } from './utils/statementParser';
import { 
  loadTransactionsFromStorage, 
  saveTransactionsToStorage, 
  loadRatesFromStorage, 
  saveRatesToStorage, 
  loadClosingBalancesFromStorage,
  saveClosingBalancesToStorage,
  resetDatabaseToSeed 
} from './utils/localStorage';

export default function App() {
  // Cargar de base de datos permanente
  const [transactions, setTransactions] = useState<BankTransaction[]>(() => loadTransactionsFromStorage());
  const [rates, setRates] = useState<DailyExchangeRate[]>(() => loadRatesFromStorage());
  const [closingBalances, setClosingBalances] = useState<Record<string, number>>(() => loadClosingBalancesFromStorage());

  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('');

  // Estados para Modales
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isRatesOpen, setIsRatesOpen] = useState(false);
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [isInternalTransfersModalOpen, setIsInternalTransfersModalOpen] = useState(false);

  // Guardar transacciones automáticamente en la base de datos local permanente
  useEffect(() => {
    saveTransactionsToStorage(transactions);
  }, [transactions]);

  // Guardar tasas del dólar automáticamente
  useEffect(() => {
    saveRatesToStorage(rates);
  }, [rates]);

  // Guardar saldos de cierre oficiales automáticamente
  useEffect(() => {
    saveClosingBalancesToStorage(closingBalances);
  }, [closingBalances]);

  // Actualizar saldo de cierre oficial de un banco
  const handleUpdateClosingBalance = (bankId: string, newBalance: number) => {
    setClosingBalances(prev => ({
      ...prev,
      [bankId]: newBalance
    }));
  };

  // Manejar actualización de una transacción
  const handleUpdateTransaction = (updatedTx: BankTransaction) => {
    setTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
  };

  // Manejar eliminación de una transacción
  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  // Agregar nueva transacción manual
  const handleAddTransaction = (newTx: Omit<BankTransaction, 'id'>) => {
    const created: BankTransaction = {
      ...newTx,
      id: `tx-manual-${Date.now()}`
    };
    setTransactions(prev => [created, ...prev]);
  };

  // Manejar actualización de tasa individual por fecha
  const handleUpdateRate = (date: string, newRate: number) => {
    setRates(prev => {
      const exists = prev.some(r => r.date === date);
      if (exists) {
        return prev.map(r => r.date === date ? { ...r, rate: newRate } : r);
      } else {
        return [...prev, { date, rate: newRate, source: 'Manual' }];
      }
    });

    // Recalcular montos en USD de las transacciones afectadas por la nueva tasa
    setTransactions(prev => prev.map(t => {
      if (t.date === date) {
        return {
          ...t,
          exchangeRate: newRate,
          amountUSD: Math.abs(t.amountBs) / newRate
        };
      }
      return t;
    }));
  };

  // Manejar actualización masiva de tasa por mes
  const handleBulkUpdateMonth = (monthKey: string, newRate: number) => {
    setTransactions(prev => prev.map(t => {
      if (t.date.startsWith(monthKey)) {
        return {
          ...t,
          exchangeRate: newRate,
          amountUSD: Math.abs(t.amountBs) / newRate
        };
      }
      return t;
    }));
  };

  // Al cargar un nuevo estado de cuenta
  const handleUploadSuccess = (result: ParseResult, closingBalance?: number) => {
    if (result.transactions && result.transactions.length > 0) {
      setTransactions(prev => [...result.transactions, ...prev]);
      setCurrentTab(result.detectedBank);
    }
    if (closingBalance !== undefined && result.detectedBank) {
      handleUpdateClosingBalance(result.detectedBank, closingBalance);
    }
  };

  // Restablecer base de datos completa a los valores por defecto de la semilla
  const handleResetDatabase = () => {
    const res = resetDatabaseToSeed();
    setTransactions(res.transactions);
    setRates(res.rates);
    setClosingBalances(res.closingBalances);
    setSelectedCategoryFilter('');
    alert('La base de datos fue restablecida correctamente a sus valores por defecto.');
  };

  // Exportar archivo Excel completo
  const handleExportExcel = () => {
    exportToExcel(transactions, 'Enero-Agosto 2026');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-[#7A00F2] selection:text-white">
      
      {/* Header Superior */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenRates={() => setIsRatesOpen(true)}
        onOpenPartnerModal={() => setIsPartnerModalOpen(true)}
        onOpenInternalTransfersModal={() => setIsInternalTransfersModalOpen(true)}
        onExportExcel={handleExportExcel}
        onResetDatabase={handleResetDatabase}
        transactionCount={transactions.length}
      />

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* VISTA 1: Visión General / Dashboard */}
        {currentTab === 'overview' && (
          <div className="space-y-6">
            <BankOverviewCards
              bankId="all"
              transactions={transactions}
              onSelectCategoryFilter={setSelectedCategoryFilter}
              selectedCategoryFilter={selectedCategoryFilter}
              closingBalances={closingBalances}
              onUpdateClosingBalance={handleUpdateClosingBalance}
            />

            <TransactionTable
              transactions={transactions}
              selectedBankId="all"
              selectedCategoryFilter={selectedCategoryFilter}
              onCategoryFilterChange={setSelectedCategoryFilter}
              onUpdateTransaction={handleUpdateTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              onAddTransaction={handleAddTransaction}
            />
          </div>
        )}

        {/* VISTA 2: Vista de un Banco Específico (Bancamiga, Mercantil, Plaza, Provincial) */}
        {['bancamiga', 'mercantil', 'plaza', 'provincial', 'banesco'].includes(currentTab) && (
          <div className="space-y-6">
            <BankOverviewCards
              bankId={currentTab as BankId}
              transactions={transactions}
              onSelectCategoryFilter={setSelectedCategoryFilter}
              selectedCategoryFilter={selectedCategoryFilter}
              closingBalances={closingBalances}
              onUpdateClosingBalance={handleUpdateClosingBalance}
            />

            <TransactionTable
              transactions={transactions}
              selectedBankId={currentTab as BankId}
              selectedCategoryFilter={selectedCategoryFilter}
              onCategoryFilterChange={setSelectedCategoryFilter}
              onUpdateTransaction={handleUpdateTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              onAddTransaction={handleAddTransaction}
            />
          </div>
        )}

        {/* VISTA 3: Resumen Consolidado Multi-Banco */}
        {currentTab === 'consolidated' && (
          <ConsolidatedView
            transactions={transactions}
            onExportExcel={handleExportExcel}
          />
        )}

        {/* VISTA 4: Libro Diario (Contabilidad VEN-NIF) */}
        {currentTab === 'accounting' && (
          <AccountingJournalView
            transactions={transactions}
            onExportExcel={handleExportExcel}
          />
        )}

        {/* VISTA 5: Estados Financieros (Balance General, G&P, Comprobación) */}
        {currentTab === 'financials' && (
          <FinancialStatementsView
            transactions={transactions}
            periodLabel="Enero-Agosto 2026"
          />
        )}

      </main>

      {/* Footer del Sistema */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © 2026 <strong>{COMPANY_INFO.name}</strong> · RIF: {COMPANY_INFO.rif}
          </span>
          <span className="font-semibold text-slate-600">
            Base de Datos Permanente de Conciliación y Tasas Oficiales Dólar BCV 2026
          </span>
        </div>
      </footer>

      {/* Modales Interactivos */}
      <StatementUploaderModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
        rates={rates}
        existingTransactions={transactions}
        closingBalances={closingBalances}
      />

      <ExchangeRateEditorModal
        isOpen={isRatesOpen}
        onClose={() => setIsRatesOpen(false)}
        rates={rates}
        onUpdateRate={handleUpdateRate}
        onBulkUpdateMonth={handleBulkUpdateMonth}
      />

      <PartnerProfileModal
        isOpen={isPartnerModalOpen}
        onClose={() => setIsPartnerModalOpen(false)}
        transactions={transactions}
      />

      <InternalTransfersModal
        isOpen={isInternalTransfersModalOpen}
        onClose={() => setIsInternalTransfersModalOpen(false)}
        transactions={transactions}
      />

    </div>
  );
}
