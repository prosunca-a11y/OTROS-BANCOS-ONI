import { DailyExchangeRate } from '../types/exchangeRate';
import { OFFICIAL_BCV_RATES_2026 } from '../data/bcvRates2026';

/**
 * Obtener la tasa de cambio del dólar BCV para una fecha dada (YYYY-MM-DD o DD/MM/YYYY)
 * Si no existe tasa exacta para el día (ej: fin de semana o feriado), busca la tasa del día hábil anterior más cercano.
 */
export function getRateForDate(
  dateStr: string, 
  ratesList: DailyExchangeRate[] = OFFICIAL_BCV_RATES_2026
): number {
  if (!dateStr) return 798.326;

  // Formatear la fecha a YYYY-MM-DD
  let normalizedDate = dateStr.trim();
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        normalizedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      } else if (parts[2].length === 2) {
        normalizedDate = `20${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
  }

  // Buscar coincidencia exacta por fecha
  const exact = ratesList.find(r => r.date === normalizedDate);
  if (exact) return exact.rate;

  // Si no hay coincidencia exacta, buscar la fecha previa más cercana
  const sorted = [...ratesList].sort((a, b) => a.date.localeCompare(b.date));
  let fallbackRate = sorted[sorted.length - 1]?.rate || 798.326;
  
  for (const item of sorted) {
    if (item.date <= normalizedDate) {
      fallbackRate = item.rate;
    } else {
      break;
    }
  }

  return fallbackRate;
}

/**
 * Calcular el monto en dólares a partir del monto en Bolívares y la tasa del día
 */
export function calculateUSDAmount(amountBs: number, rate: number): number {
  if (!rate || rate <= 0) return 0;
  return Math.abs(amountBs) / rate;
}

/**
 * Formatear montos en Bolívares (VES)
 */
export function formatBs(amount: number): string {
  const val = Math.abs(amount);
  const formatted = val.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${amount < 0 ? '-' : ''}Bs. ${formatted}`;
}

/**
 * Formatear montos en Dólares (USD)
 */
export function formatUSD(amount: number): string {
  const val = Math.abs(amount);
  const formatted = val.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${amount < 0 ? '-' : ''}$${formatted}`;
}
