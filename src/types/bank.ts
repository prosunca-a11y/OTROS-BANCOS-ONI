/**
 * Tipos de datos para el Sistema Bancario de Agrícola ONI C.A.
 */

export type BankId = 'bancamiga' | 'mercantil' | 'plaza' | 'provincial' | 'banesco' | 'otro';

export interface BankInfo {
  id: BankId;
  name: string;
  accountNumber: string;
  shortName: string;
  color: string; // Pastel tailwind color class prefix
  bgColor: string;
  borderColor: string;
  badgeBg: string;
  badgeText: string;
  logoInitial: string;
  rif: string;
}

export type CategoryId = 
  | 'transferencia_interna'
  | 'aporte_socio'
  | 'compra_dolares'
  | 'pago_proveedor'
  | 'comision_servicio'
  | 'otra_entrada'
  | 'otra_salida';

export interface CategoryInfo {
  id: CategoryId;
  name: string;
  description: string;
  type: 'income' | 'expense' | 'both';
  pastelBg: string;
  badgeBg: string;
  textColor: string;
  borderColor: string;
  accountingAccountDebe: string;
  accountingAccountHaber: string;
}

export interface BankTransaction {
  id: string;
  bankId: BankId;
  date: string; // YYYY-MM-DD format
  reference: string;
  description: string;
  amountBs: number; // Positivo para créditos (entradas), negativo para débitos (salidas)
  type: 'income' | 'expense';
  category: CategoryId;
  exchangeRate: number; // Tasa Bs/$ del día
  amountUSD: number; // Calculado: Math.abs(amountBs) / exchangeRate
  accountingAccount?: string;
  notes?: string;
  isInternalTransfer?: boolean;
  linkedInternalTransactionId?: string;
  manuallyCategorized?: boolean;
  // Campos de Identificación de Ordenante / Remitente / Beneficiario
  entityName?: string;         // Nombre o Razón Social (ej: AGRICOLA ONI, C.A., ELIAS TRIAS ABREU)
  entityDoc?: string;          // RIF o Cédula de Identidad (ej: J-50145638-0, V-23997829)
  personType?: 'Persona Natural' | 'Persona Jurídica'; // Tipo de persona
  bankAccountDetail?: string;  // Banco y/o número de cuenta origen o destino
}

export interface MonthlyCategorySummary {
  monthKey: string; // YYYY-MM (ej: "2026-08")
  monthName: string; // ej: "Agosto 2026"
  categories: {
    [key in CategoryId]: {
      amountBs: number;
      amountUSD: number;
      count: number;
    }
  };
  totalIncomeBs: number;
  totalIncomeUSD: number;
  totalExpenseBs: number;
  totalExpenseUSD: number;
  netFlowBs: number;
  netFlowUSD: number;
}

export interface AccountingEntry {
  id: string;
  date: string;
  transactionId: string;
  bankId: BankId;
  reference: string;
  concept: string;
  category: CategoryId;
  debitAccountCode: string;
  debitAccountName: string;
  debitBs: number;
  debitUSD: number;
  creditAccountCode: string;
  creditAccountName: string;
  creditBs: number;
  creditUSD: number;
  exchangeRate: number;
}

export interface BankBalanceSummary {
  bankId: BankId;
  bankName: string;
  accountNumber: string;
  initialBalanceBs: number;
  initialBalanceUSD: number;
  totalDebitsBs: number;
  totalDebitsUSD: number;
  totalCreditsBs: number;
  totalCreditsUSD: number;
  endingBalanceBs: number;
  endingBalanceUSD: number;
  transactionCount: number;
}
