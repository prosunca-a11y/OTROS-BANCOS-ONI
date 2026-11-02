const fs = require('fs');

const ratesContent = fs.readFileSync('src/data/bcvRates2026.ts', 'utf-8');
const ratesMap = {};
const rateMatches = ratesContent.matchAll(/date:\s*'([^']+)',\s*rate:\s*([0-9.]+)/g);
for (const match of rateMatches) {
  ratesMap[match[1]] = parseFloat(match[2]);
}

function getRateForDate(dateStr) {
  if (ratesMap[dateStr]) return ratesMap[dateStr];
  const sorted = Object.keys(ratesMap).sort();
  let r = 798.326;
  for (const d of sorted) {
    if (d <= dateStr) r = ratesMap[d];
    else break;
  }
  return r;
}

const seedText = fs.readFileSync('src/data/seedData.ts', 'utf-8');
const mercantilMatches = [...seedText.matchAll(/makeAuditedTx\('([^']+)',\s*'mercantil',\s*'([^']+)',\s*'([^']+)',\s*[^,]+,\s*([0-9.-]+),\s*'([^']+)'/g)];

const monthlyData = {};

mercantilMatches.forEach(m => {
  const [_, id, date, ref, amountBsStr, category] = m;
  const amountBs = parseFloat(amountBsStr);
  const rate = getRateForDate(date);
  const amountUSD = Math.abs(amountBs) / rate;
  const monthKey = date.substring(0, 7);

  if (!monthlyData[monthKey]) {
    monthlyData[monthKey] = {
      incomeBs: 0, incomeUSD: 0,
      expenseBs: 0, expenseUSD: 0,
      count: 0,
      categories: {}
    };
  }

  monthlyData[monthKey].count++;
  if (amountBs > 0) {
    monthlyData[monthKey].incomeBs += amountBs;
    monthlyData[monthKey].incomeUSD += amountUSD;
  } else {
    monthlyData[monthKey].expenseBs += Math.abs(amountBs);
    monthlyData[monthKey].expenseUSD += amountUSD;
  }

  if (!monthlyData[monthKey].categories[category]) {
    monthlyData[monthKey].categories[category] = { bs: 0, usd: 0, count: 0 };
  }
  monthlyData[monthKey].categories[category].bs += amountBs;
  monthlyData[monthKey].categories[category].usd += (amountBs > 0 ? amountUSD : -amountUSD);
  monthlyData[monthKey].categories[category].count++;
});

console.log("=== RESUMEN POR MES BANCO MERCANTIL 2026 ===");
Object.keys(monthlyData).sort().forEach(mk => {
  const data = monthlyData[mk];
  const netBs = data.incomeBs - data.expenseBs;
  const netUSD = data.incomeUSD - data.expenseUSD;
  console.log(`\nMes: ${mk} (${data.count} movs)`);
  console.log(`  Entradas (Créditos): Bs. ${data.incomeBs.toLocaleString('es-VE', {minimumFractionDigits: 2})} ($${data.incomeUSD.toLocaleString('en-US', {minimumFractionDigits: 2})})`);
  console.log(`  Salidas (Débitos):   Bs. ${data.expenseBs.toLocaleString('es-VE', {minimumFractionDigits: 2})} ($${data.expenseUSD.toLocaleString('en-US', {minimumFractionDigits: 2})})`);
  console.log(`  Flujo Neto:          Bs. ${netBs.toLocaleString('es-VE', {minimumFractionDigits: 2})} ($${netUSD.toLocaleString('en-US', {minimumFractionDigits: 2})})`);
});
