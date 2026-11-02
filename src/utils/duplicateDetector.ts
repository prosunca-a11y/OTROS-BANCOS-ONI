import { BankTransaction } from '../types/bank';

export interface DuplicateMatchItem {
  incomingTx: BankTransaction;
  existingTx: BankTransaction;
  matchReason: string;
}

export interface DuplicateAnalysisResult {
  uniqueTransactions: BankTransaction[];
  duplicateMatches: DuplicateMatchItem[];
  totalIncomingCount: number;
  duplicateCount: number;
  hasDuplicates: boolean;
}

/**
 * Normalizar cadena de referencia
 */
function normalizeRef(ref: string | undefined): string {
  if (!ref) return '';
  return ref.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Normalizar descripción para comparación cuando la referencia es genérica
 */
function normalizeDesc(desc: string | undefined): string {
  if (!desc) return '';
  return desc.trim().toUpperCase().replace(/\s+/g, ' ');
}

/**
 * Analiza transacciones entrantes para detectar duplicados existentes en la base de datos
 * basado estrictamente en: Fecha, Monto (Bs.), Banco y Número de Referencia (o Descripción).
 */
export function detectDuplicates(
  incomingTransactions: BankTransaction[],
  existingTransactions: BankTransaction[]
): DuplicateAnalysisResult {
  const uniqueTransactions: BankTransaction[] = [];
  const duplicateMatches: DuplicateMatchItem[] = [];

  incomingTransactions.forEach(incomingTx => {
    const incRefClean = normalizeRef(incomingTx.reference);
    const isIncRefGeneric = !incRefClean || incRefClean.startsWith('REF') || incRefClean.startsWith('MAN');
    const incDescClean = normalizeDesc(incomingTx.description);

    // Buscar coincidencia en la base de datos existente
    const match = existingTransactions.find(existingTx => {
      // 1. Mismo Banco
      if (existingTx.bankId !== incomingTx.bankId) return false;

      // 2. Misma Fecha
      if (existingTx.date !== incomingTx.date) return false;

      // 3. Mismo Monto en Bolívares (Tolerancia 0.01)
      if (Math.abs(existingTx.amountBs - incomingTx.amountBs) >= 0.01) return false;

      // 4. Mismo Número de Referencia
      const extRefClean = normalizeRef(existingTx.reference);
      const isExtRefGeneric = !extRefClean || extRefClean.startsWith('REF') || extRefClean.startsWith('MAN');

      if (!isIncRefGeneric && !isExtRefGeneric) {
        return extRefClean === incRefClean;
      }

      // Si las referencias son genéricas, comparar descripción normalizada
      return normalizeDesc(existingTx.description) === incDescClean;
    });

    if (match) {
      const matchReason = !isIncRefGeneric 
        ? `Coincidencia exacta de Banco (${incomingTx.bankId}), Fecha (${incomingTx.date}), Monto (${incomingTx.amountBs} Bs.) y Referencia (${incomingTx.reference})`
        : `Coincidencia de Banco (${incomingTx.bankId}), Fecha (${incomingTx.date}), Monto (${incomingTx.amountBs} Bs.) y Descripción`;

      duplicateMatches.push({
        incomingTx,
        existingTx: match,
        matchReason
      });
    } else {
      uniqueTransactions.push(incomingTx);
    }
  });

  return {
    uniqueTransactions,
    duplicateMatches,
    totalIncomingCount: incomingTransactions.length,
    duplicateCount: duplicateMatches.length,
    hasDuplicates: duplicateMatches.length > 0
  };
}
