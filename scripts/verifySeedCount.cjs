const fs = require('fs');

const seedText = fs.readFileSync('src/data/seedData.ts', 'utf-8');
const allMercantil = [...seedText.matchAll(/makeAuditedTx\('([^']*)',\s*'mercantil'/g)];

console.log(`Total Mercantil transactions in seedData.ts: ${allMercantil.length}`);

const byMonth = {};
allMercantil.forEach(m => {
  const line = m.input.substring(m.index, m.index + 200);
  const dateMatch = line.match(/'2026-(\d{2})-\d{2}'/);
  if (dateMatch) {
    const mo = `2026-${dateMatch[1]}`;
    byMonth[mo] = (byMonth[mo] || 0) + 1;
  }
});

console.log("By month:", byMonth);
