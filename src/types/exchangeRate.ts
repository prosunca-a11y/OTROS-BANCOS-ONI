/**
 * Gestión de Tasas de Cambio USD/VES para Venezuela (BCV / Mercado)
 */

export interface DailyExchangeRate {
  date: string; // YYYY-MM-DD
  rate: number; // Bolívares por Dólar (Bs / USD)
  source?: 'BCV' | 'Intervencion' | 'Manual';
}

export interface MonthAvgRate {
  monthKey: string; // YYYY-MM
  avgRate: number;
}
