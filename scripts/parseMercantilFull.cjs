const fs = require('fs');
const path = require('path');

// Read BCV Rates
const ratesContent = fs.readFileSync('src/data/bcvRates2026.ts', 'utf-8');
const ratesMap = {};
const rateMatches = ratesContent.matchAll(/date:\s*'([^']+)',\s*rate:\s*([0-9.]+)/g);
for (const match of rateMatches) {
  ratesMap[match[1]] = parseFloat(match[2]);
}

function getRateForDate(dateStr) {
  let normalized = dateStr.trim();
  if (normalized.includes('/')) {
    const p = normalized.split('/');
    if (p.length === 3) {
      normalized = `${p[2].length === 2 ? '20' + p[2] : p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
    }
  }
  if (ratesMap[normalized]) return ratesMap[normalized];
  // Fallback to nearest previous date
  const sortedDates = Object.keys(ratesMap).sort();
  let lastRate = 798.326;
  for (const d of sortedDates) {
    if (d <= normalized) lastRate = ratesMap[d];
    else break;
  }
  return lastRate;
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseAmount(valStr) {
  if (!valStr) return 0;
  let clean = valStr.replace(/"/g, '').replace(/\s/g, '');
  if (!clean || clean === '-') return 0;
  // Handle formatted numbers like "1,210,000.00" or "128.425,00" or "20,764.13"
  // If has comma and dot, check position
  if (clean.includes(',') && clean.includes('.')) {
    if (clean.indexOf(',') < clean.indexOf('.')) {
      // 1,210,000.00
      clean = clean.replace(/,/g, '');
    } else {
      // 128.425,00
      clean = clean.replace(/\./g, '').replace(/,/g, '.');
    }
  } else if (clean.includes(',')) {
    // Check if comma is decimal (2 decimal digits at end) or thousands
    const parts = clean.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      clean = clean.replace(/,/g, '.');
    } else {
      clean = clean.replace(/,/g, '');
    }
  }
  return parseFloat(clean) || 0;
}

const files = [
  { path: 'public/assets/aistudio/1_EDO_CTA_MERCANTIL_ONI_ENERO_49c8a688.csv', month: '2026-01' },
  { path: 'public/assets/aistudio/2_EDO_CTA_MERCANTIL_ONI_FEBRERO_80801010.csv', month: '2026-02' },
  { path: 'public/assets/aistudio/3Edo_Cta_Mercantil_ONI_Marzo_2026__1__4a939ba5.csv', month: '2026-03' },
  { path: 'public/assets/aistudio/4_Edo_Cta_Mercantil_ONI_Abril_2026_c146dea8.csv', month: '2026-04' },
  { path: 'public/assets/aistudio/5_Edo_Cta_Mercantil_ONI_Mayo_2026_86b917da.csv', month: '2026-05' },
  { path: 'public/assets/aistudio/6_Edo_Cta_Mercantil_ONI_Junio_2026_6ab24585.csv', month: '2026-06' },
  { path: 'public/assets/aistudio/7_Edo_Cta_Mercantil_ONI_Julio_2026_22585ffb.csv', month: '2026-07' }
];

let globalTransactions = [];

files.forEach(({ path: filePath, month }, fIdx) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);

  let fileTransactions = [];
  
  if (fIdx < 2) {
    // Files 1 & 2: Enero & Febrero
    let currentMode = 'DEBIT'; // DEBIT or CREDIT
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (trimmed.includes('Operaciones debitadas')) {
        currentMode = 'DEBIT';
        return;
      }
      if (trimmed.includes('Operaciones acreditadas')) {
        currentMode = 'CREDIT';
        return;
      }
      if (trimmed.startsWith('Fecha,') || trimmed.startsWith('﻿Fecha,') || trimmed.includes('TOTAL')) return;

      const cols = parseCsvLine(trimmed);
      if (cols.length >= 4 && cols[0].match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const dateRaw = cols[0];
        const ref = cols[1];
        const desc = cols[2];
        let amount = parseAmount(cols[3]);
        if (amount === 0) return;

        const isIncome = currentMode === 'CREDIT';
        const finalAmount = isIncome ? Math.abs(amount) : -Math.abs(amount);

        fileTransactions.push({
          dateRaw,
          ref,
          desc,
          amountBs: finalAmount,
          isIncome,
          sourceCol: currentMode
        });
      }
    });
  } else {
    // Files 3-7: Marzo to Julio
    let tableIndex = 1; // Table 1 = Debits, Table 2 = Credits
    let foundHeaderCount = 0;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      if (trimmed.startsWith('Fecha,') || trimmed.startsWith('﻿Fecha,')) {
        foundHeaderCount++;
        if (foundHeaderCount === 2) {
          tableIndex = 2; // Switch to Credits table
        }
        return;
      }

      if (trimmed.includes('TOTAL') || trimmed.includes('N° de movimientos') || trimmed.includes('Sin movimientos')) return;

      const cols = parseCsvLine(trimmed);
      if (cols.length >= 9 && cols[0].match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const dateRaw = cols[0];
        const ref = cols[1];
        const opType = cols[2];
        const beneficiary = cols[3];
        const account = cols[4];
        const destBank = cols[5];
        const concept = cols[6];
        const desc = cols[7];
        const amountStr = cols[8];

        let amount = parseAmount(amountStr);
        if (amount === 0) return;

        const isIncome = (tableIndex === 2);
        const finalAmount = isIncome ? Math.abs(amount) : -Math.abs(amount);

        fileTransactions.push({
          dateRaw,
          ref,
          opType,
          beneficiary,
          account,
          destBank,
          concept,
          desc,
          amountBs: finalAmount,
          isIncome,
          sourceCol: tableIndex === 1 ? 'DEBIT' : 'CREDIT'
        });
      }
    });
  }

  // Calculate month summary
  const totalIncome = fileTransactions.filter(t => t.isIncome).reduce((sum, t) => sum + t.amountBs, 0);
  const totalExpense = fileTransactions.filter(t => !t.isIncome).reduce((sum, t) => sum + Math.abs(t.amountBs), 0);
  const netFlow = totalIncome - totalExpense;

  console.log(`\nMonth ${month}: ${fileTransactions.length} transactions`);
  console.log(`  Total Entradas (Créditos): ${totalIncome.toFixed(2)} Bs.`);
  console.log(`  Total Salidas (Débitos):  ${totalExpense.toFixed(2)} Bs.`);
  console.log(`  Flujo Neto:                ${netFlow.toFixed(2)} Bs.`);

  globalTransactions.push(...fileTransactions);
});

console.log(`\nTOTAL MERCANTIL TRANSACTIONS (ENE-JUL): ${globalTransactions.length}`);
