import * as XLSX from 'xlsx';
import { BankTransaction, BankId } from '../types/bank';
import { categorizeTransaction, extractEntityDetails } from './categorizer';
import { getRateForDate, calculateUSDAmount } from './exchangeRates';
import { DailyExchangeRate } from '../types/exchangeRate';

export interface ParseResult {
  detectedBank: BankId;
  transactions: BankTransaction[];
  initialBalance?: number;
  endingBalance?: number;
  rawText?: string;
  sourceType: 'pdf' | 'excel' | 'ai';
  warnings?: string[];
}

/**
 * Detectar a qué banco corresponde un texto extraído
 */
export function detectBankFromText(text: string): BankId {
  const t = text.toLowerCase();
  if (t.includes('bancamiga')) return 'bancamiga';
  if (t.includes('mercantil')) return 'mercantil';
  if (t.includes('plaza') || t.includes('banco plaza')) return 'plaza';
  if (t.includes('provincial') || t.includes('bbva')) return 'provincial';
  if (t.includes('banesco')) return 'banesco';
  return 'mercantil'; // Predeterminado
}

/**
 * Parsear números en formato venezolano/latino (ej: 1.490.000,00 -> 1490000.00)
 */
export function parseLatAmAmount(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;

  let str = String(val).trim();
  // Quitar símbolos de moneda
  str = str.replace(/Bs\.?/gi, '').replace(/\$/g, '').trim();

  // Si tiene formato latino: 1.234.567,89
  if (str.includes(',') && str.includes('.')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // Formato latino: 1.234.567,89 -> borrar puntos, cambiar coma por punto
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato US: 1,234,567.89 -> borrar comas
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    // Solo tiene coma: 1234,56
    str = str.replace(',', '.');
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Normalizar fecha a formato YYYY-MM-DD
 */
export function normalizeDate(dateStr: string, defaultYear: string = '2026'): string {
  if (!dateStr) return `${defaultYear}-08-01`;
  const clean = dateStr.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

  // DD/MM/YYYY o DD-MM-YYYY
  const matchFull = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (matchFull) {
    const day = matchFull[1].padStart(2, '0');
    const month = matchFull[2].padStart(2, '0');
    const year = matchFull[3];
    return `${year}-${month}-${day}`;
  }

  // DD/MM/YY o DD-MM-YY
  const matchShortYear = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2})$/);
  if (matchShortYear) {
    const day = matchShortYear[1].padStart(2, '0');
    const month = matchShortYear[2].padStart(2, '0');
    const year = `20${matchShortYear[3]}`;
    return `${year}-${month}-${day}`;
  }

  // DD/MM o DD-MM (asumir año 2026)
  const matchDayMonth = clean.match(/^(\d{1,2})[/-](\d{1,2})$/);
  if (matchDayMonth) {
    const day = matchDayMonth[1].padStart(2, '0');
    const month = matchDayMonth[2].padStart(2, '0');
    return `${defaultYear}-${month}-${day}`;
  }

  return `${defaultYear}-08-01`;
}

/**
 * Leer un archivo Excel / CSV cargado por el usuario
 */
export async function parseExcelFile(
  file: File,
  rates: DailyExchangeRate[] = []
): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (jsonRows.length === 0) {
    throw new Error('El archivo Excel está vacío o no tiene un formato válido.');
  }

  let textContent = jsonRows.map(r => r.join(' ')).join('\n');
  const detectedBank = detectBankFromText(file.name + ' ' + textContent);

  const transactions: BankTransaction[] = [];
  let headerRowIndex = -1;

  // Buscar fila de encabezados
  for (let i = 0; i < Math.min(jsonRows.length, 15); i++) {
    const rowStr = (jsonRows[i] || []).join(' ').toLowerCase();
    if (rowStr.includes('fecha') && (rowStr.includes('monto') || rowStr.includes('débito') || rowStr.includes('debito') || rowStr.includes('crédito') || rowStr.includes('credito') || rowStr.includes('descripción') || rowStr.includes('descripcion'))) {
      headerRowIndex = i;
      break;
    }
  }

  const dataRows = headerRowIndex >= 0 ? jsonRows.slice(headerRowIndex + 1) : jsonRows;

  dataRows.forEach((row, idx) => {
    if (!row || row.length < 2) return;

    let dateVal = String(row[0] || '').trim();
    if (!dateVal || dateVal.toLowerCase().includes('total') || dateVal.toLowerCase().includes('saldo')) return;

    const date = normalizeDate(dateVal);
    const reference = String(row[1] || `REF-${idx + 1}`).trim();
    const description = String(row[2] || row[1] || 'Operación Bancaria').trim();

    let amountBs = 0;
    // Evaluar columnas de Débito/Crédito o Monto único
    if (row.length >= 5) {
      const debit = parseLatAmAmount(row[3]);
      const credit = parseLatAmAmount(row[4]);
      if (credit > 0) amountBs = credit;
      else if (debit > 0) amountBs = -debit;
      else amountBs = parseLatAmAmount(row[3] || row[5]);
    } else {
      amountBs = parseLatAmAmount(row[3] || row[2]);
    }

    if (Math.abs(amountBs) === 0) return;

    const category = categorizeTransaction(description, amountBs);
    const rate = getRateForDate(date, rates);
    const amountUSD = calculateUSDAmount(amountBs, rate);
    const entity = extractEntityDetails(description, detectedBank, amountBs);

    transactions.push({
      id: `${detectedBank}-excel-${Date.now()}-${idx}`,
      bankId: detectedBank,
      date,
      reference,
      description,
      amountBs,
      type: amountBs > 0 ? 'income' : 'expense',
      category,
      exchangeRate: rate,
      amountUSD,
      entityName: entity.entityName,
      entityDoc: entity.entityDoc,
      personType: entity.personType,
      bankAccountDetail: entity.bankAccountDetail
    });
  });

  // Extraer saldos iniciales y finales/de cierre si están presentes en el archivo
  let initialBalance: number | undefined;
  let endingBalance: number | undefined;

  for (const row of jsonRows) {
    if (!Array.isArray(row)) continue;
    const rowStr = row.map(c => String(c || '').toLowerCase()).join(' ');

    if ((rowStr.includes('saldo final') || rowStr.includes('saldo de cierre') || rowStr.includes('saldo al corte') || rowStr.includes('saldo disponible')) && endingBalance === undefined) {
      for (let i = row.length - 1; i >= 0; i--) {
        const val = parseLatAmAmount(row[i]);
        if (val !== 0) {
          endingBalance = Math.abs(val);
          break;
        }
      }
    }

    if ((rowStr.includes('saldo inicial') || rowStr.includes('saldo anterior') || rowStr.includes('saldo al inicio')) && initialBalance === undefined) {
      for (let i = row.length - 1; i >= 0; i--) {
        const val = parseLatAmAmount(row[i]);
        if (val !== 0) {
          initialBalance = Math.abs(val);
          break;
        }
      }
    }
  }

  return {
    detectedBank,
    transactions,
    initialBalance,
    endingBalance,
    sourceType: 'excel'
  };
}

/**
 * Enviar el archivo/texto al backend de IA (Gemini API) para estructurar PDFs o imágenes complejas
 */
export async function parseStatementWithAI(
  fileName: string,
  base64Content?: string,
  textContent?: string,
  rates: DailyExchangeRate[] = []
): Promise<ParseResult> {
  const response = await fetch('/api/parse-statement', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName,
      base64Content,
      textContent
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'No se pudo procesar el estado de cuenta con el servidor de IA.');
  }

  const data = await response.json();
  const detectedBank: BankId = data.bankId || detectBankFromText(fileName + ' ' + (textContent || ''));

  const parsedTransactions: BankTransaction[] = (data.transactions || []).map((t: any, idx: number) => {
    const date = normalizeDate(t.date || '2026-08-01');
    const amountBs = parseFloat(t.amountBs) || 0;
    const rate = t.exchangeRate || getRateForDate(date, rates);
    const category = t.category || categorizeTransaction(t.description || '', amountBs);
    const amountUSD = calculateUSDAmount(amountBs, rate);
    const entity = extractEntityDetails(t.description || '', detectedBank, amountBs);

    return {
      id: `${detectedBank}-ai-${Date.now()}-${idx}`,
      bankId: detectedBank,
      date,
      reference: t.reference || `REF-${idx + 1}`,
      description: t.description || 'Operación Bancaria',
      amountBs,
      type: amountBs > 0 ? 'income' : 'expense',
      category,
      exchangeRate: rate,
      amountUSD,
      notes: t.notes,
      entityName: t.entityName || entity.entityName,
      entityDoc: t.entityDoc || entity.entityDoc,
      personType: t.personType || entity.personType,
      bankAccountDetail: t.bankAccountDetail || entity.bankAccountDetail
    };
  });

  return {
    detectedBank,
    transactions: parsedTransactions,
    initialBalance: data.initialBalance,
    endingBalance: data.endingBalance,
    sourceType: 'ai'
  };
}
