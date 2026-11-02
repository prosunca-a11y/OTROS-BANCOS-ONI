import { BankTransaction, BankId } from '../types/bank';

export interface BalanceValidationResult {
  bankId: BankId | 'all';
  initialBalanceBs: number;
  totalIncomeBs: number;
  totalExpenseBs: number;
  calculatedEndingBalanceBs: number;
  statementClosingBalanceBs: number;
  differenceBs: number;
  differenceUSD: number;
  isBalanced: boolean;
  status: 'reconciled' | 'discrepancy' | 'unspecified';
  message: string;
}

/**
 * Valida y compara el saldo final calculado en la aplicación contra el saldo de cierre del estado de cuenta
 * Fórmula de Conciliación: Saldo Final Calculado = Saldo Inicial + Total Créditos - Total Débitos
 * Discrepancia = Saldo Final Calculado - Saldo de Cierre del Estado de Cuenta
 */
export function validateEndingBalance(
  bankId: BankId | 'all',
  initialBalanceBs: number,
  transactions: BankTransaction[],
  statementClosingBalanceBs?: number | null,
  refRate: number = 798.326
): BalanceValidationResult {
  // Filtrar si es un banco específico
  const relevantTxs = bankId === 'all' 
    ? transactions 
    : transactions.filter(t => t.bankId === bankId);

  const totalIncomeBs = relevantTxs
    .filter(t => t.amountBs > 0)
    .reduce((sum, t) => sum + t.amountBs, 0);

  const totalExpenseBs = relevantTxs
    .filter(t => t.amountBs < 0)
    .reduce((sum, t) => sum + Math.abs(t.amountBs), 0);

  const calculatedEndingBalanceBs = initialBalanceBs + totalIncomeBs - totalExpenseBs;

  if (statementClosingBalanceBs === undefined || statementClosingBalanceBs === null || isNaN(statementClosingBalanceBs)) {
    return {
      bankId,
      initialBalanceBs,
      totalIncomeBs,
      totalExpenseBs,
      calculatedEndingBalanceBs,
      statementClosingBalanceBs: calculatedEndingBalanceBs,
      differenceBs: 0,
      differenceUSD: 0,
      isBalanced: true,
      status: 'unspecified',
      message: 'Saldo calculado en base a transacciones registradas (sin saldo de cierre de referencia cargado).'
    };
  }

  // Diferencia con tolerancia para centavos (< 0.01)
  const differenceBs = calculatedEndingBalanceBs - statementClosingBalanceBs;
  const isBalanced = Math.abs(differenceBs) < 0.01;
  const differenceUSD = Math.abs(differenceBs) / (refRate || 798.326);

  let message = '';
  if (isBalanced) {
    message = 'Conciliación bancaria exacta: El saldo final calculado coincide perfectamente con el saldo de cierre del estado de cuenta bancario.';
  } else if (differenceBs > 0) {
    message = `El saldo calculado en la aplicación es superior por Bs. ${Math.abs(differenceBs).toLocaleString('es-VE', { minimumFractionDigits: 2 })} al saldo de cierre del estado de cuenta. Posibles causas: comisiones bancarias no registradas, IGTF, débitos automáticos o cheques no asentados.`;
  } else {
    message = `El saldo calculado en la aplicación es inferior por Bs. ${Math.abs(differenceBs).toLocaleString('es-VE', { minimumFractionDigits: 2 })} al saldo de cierre del estado de cuenta. Posibles causas: notas de crédito omitidas, depósitos pendientes o diferencias en el saldo inicial.`;
  }

  return {
    bankId,
    initialBalanceBs,
    totalIncomeBs,
    totalExpenseBs,
    calculatedEndingBalanceBs,
    statementClosingBalanceBs,
    differenceBs,
    differenceUSD,
    isBalanced,
    status: isBalanced ? 'reconciled' : 'discrepancy',
    message
  };
}
