const fs = require('fs');

const ratesContent = fs.readFileSync('src/data/bcvRates2026.ts', 'utf-8');
const ratesMap = {};
const rateMatches = ratesContent.matchAll(/date:\s*'([^']+)',\s*rate:\s*([0-9.]+)/g);
for (const match of rateMatches) {
  ratesMap[match[1]] = parseFloat(match[2]);
}

// Read Mercantil Agosto 2026 transactions from seedData or parse them
const seedContent = fs.readFileSync('src/data/seedData.ts', 'utf-8');
const mercantilSeedMatches = [...seedContent.matchAll(/makeAuditedTx\('[^']+',\s*'mercantil',\s*'2026-08-[0-9]+',\s*'[^']+',\s*[^,]+,\s*([0-9.-]+)/g)];
let agostoNet = 0;
mercantilSeedMatches.forEach(m => {
  agostoNet += parseFloat(m[1]);
});

// Read Mercantil Ene-Jul from generated file
const seedText = fs.readFileSync('scripts/mercantilSeedCode.txt', 'utf-8');
const monthTxs = {
  '2026-01': [],
  '2026-02': [],
  '2026-03': [],
  '2026-04': [],
  '2026-05': [],
  '2026-06': [],
  '2026-07': []
};

const lines = seedText.split('\n');
lines.forEach(l => {
  const match = l.match(/makeAuditedTx\('([^']+)',\s*'mercantil',\s*'([^']+)',\s*'([^']+)',\s*.*,\s*([0-9.-]+),\s*'([^']+)'/);
  if (match) {
    const [_, id, date, ref, amountBsStr, category] = match;
    const amountBs = parseFloat(amountBsStr);
    const monthKey = date.substring(0, 7);
    if (monthTxs[monthKey]) {
      monthTxs[monthKey].push(amountBs);
    }
  }
});

let currentBalance = 2818.21; // Starting balance Jan 1, 2026

console.log(`Starting Balance (01/01/2026): ${currentBalance.toFixed(2)} Bs.`);

Object.keys(monthTxs).sort().forEach(m => {
  const txs = monthTxs[m];
  const income = txs.filter(a => a > 0).reduce((sum, a) => sum + a, 0);
  const expense = txs.filter(a => a < 0).reduce((sum, a) => sum + Math.abs(a), 0);
  const net = income - expense;
  const startMonth = currentBalance;
  currentBalance += net;
  console.log(`\nMonth ${m}:`);
  console.log(`  Balance Inicial: ${startMonth.toFixed(2)} Bs.`);
  console.log(`  Entradas:       +${income.toFixed(2)} Bs.`);
  console.log(`  Salidas:        -${expense.toFixed(2)} Bs.`);
  console.log(`  Flujo Neto:      ${net >= 0 ? '+' : ''}${net.toFixed(2)} Bs.`);
  console.log(`  Saldo de Cierre: ${currentBalance.toFixed(2)} Bs.`);
});

const startAug = currentBalance;
currentBalance += agostoNet;
console.log(`\nMonth 2026-08:`);
console.log(`  Balance Inicial: ${startAug.toFixed(2)} Bs.`);
console.log(`  Flujo Neto:      ${agostoNet >= 0 ? '+' : ''}${agostoNet.toFixed(2)} Bs.`);
console.log(`  Saldo de Cierre: ${currentBalance.toFixed(2)} Bs.`);
console.log(`Target Agosto Closing Balance: 36,508.16 Bs.`);
console.log(`Difference: ${Math.abs(currentBalance - 36508.16).toFixed(2)} Bs.`);
