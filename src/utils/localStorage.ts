import { BankTransaction } from '../types/bank';
import { DailyExchangeRate } from '../types/exchangeRate';
import { SEED_TRANSACTIONS, SEED_STATEMENT_CLOSING_BALANCES } from '../data/seedData';
import { OFFICIAL_BCV_RATES_2026 } from '../data/bcvRates2026';

const TRANSACTIONS_KEY = 'agricola_oni_database_transactions_v8';
const RATES_KEY = 'agricola_oni_database_rates_v3';
const CLOSING_BALANCES_KEY = 'agricola_oni_database_closing_balances_v1';

/**
 * Cargar transacciones desde la base de datos local permanente (localStorage)
 */
export function loadTransactionsFromStorage(): BankTransaction[] {
  try {
    const data = localStorage.getItem(TRANSACTIONS_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error leyendo base de datos de transacciones:', err);
  }

  // Si no existen datos guardados previa o la base de datos está vacía, inicializar semilla
  saveTransactionsToStorage(SEED_TRANSACTIONS);
  return SEED_TRANSACTIONS;
}

/**
 * Guardar transacciones en la base de datos local permanente
 */
export function saveTransactionsToStorage(transactions: BankTransaction[]) {
  try {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
  } catch (err) {
    console.error('Error guardando transacciones en base de datos:', err);
  }
}

/**
 * Cargar tasas oficiales del Dólar BCV desde la base de datos local
 */
export function loadRatesFromStorage(): DailyExchangeRate[] {
  try {
    const data = localStorage.getItem(RATES_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error leyendo base de datos de tasas:', err);
  }

  // Inicializar con la tabla oficial BCV 2026 de enero a agosto
  saveRatesToStorage(OFFICIAL_BCV_RATES_2026);
  return OFFICIAL_BCV_RATES_2026;
}

/**
 * Guardar tasas del dólar en la base de datos local
 */
export function saveRatesToStorage(rates: DailyExchangeRate[]) {
  try {
    localStorage.setItem(RATES_KEY, JSON.stringify(rates));
  } catch (err) {
    console.error('Error guardando tasas en base de datos:', err);
  }
}

/**
 * Cargar saldos de cierre oficiales de los estados de cuenta bancarios
 */
export function loadClosingBalancesFromStorage(): Record<string, number> {
  try {
    const data = localStorage.getItem(CLOSING_BALANCES_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error leyendo base de datos de saldos de cierre:', err);
  }

  saveClosingBalancesToStorage(SEED_STATEMENT_CLOSING_BALANCES);
  return SEED_STATEMENT_CLOSING_BALANCES;
}

/**
 * Guardar saldos de cierre oficiales en la base de datos local
 */
export function saveClosingBalancesToStorage(closingBalances: Record<string, number>) {
  try {
    localStorage.setItem(CLOSING_BALANCES_KEY, JSON.stringify(closingBalances));
  } catch (err) {
    console.error('Error guardando saldos de cierre en base de datos:', err);
  }
}

/**
 * Restablecer base de datos a los valores iniciales por defecto (solo cuando el usuario lo solicite)
 */
export function resetDatabaseToSeed(): { 
  transactions: BankTransaction[]; 
  rates: DailyExchangeRate[];
  closingBalances: Record<string, number>;
} {
  localStorage.removeItem(TRANSACTIONS_KEY);
  localStorage.removeItem(RATES_KEY);
  localStorage.removeItem(CLOSING_BALANCES_KEY);

  saveTransactionsToStorage(SEED_TRANSACTIONS);
  saveRatesToStorage(OFFICIAL_BCV_RATES_2026);
  saveClosingBalancesToStorage(SEED_STATEMENT_CLOSING_BALANCES);

  return {
    transactions: SEED_TRANSACTIONS,
    rates: OFFICIAL_BCV_RATES_2026,
    closingBalances: SEED_STATEMENT_CLOSING_BALANCES
  };
}

