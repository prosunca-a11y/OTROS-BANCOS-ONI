const fs = require('fs');

// Read Mercantil Agosto 2026 transactions from seedData
const seedContent = fs.readFileSync('src/data/seedData.ts', 'utf-8');
const mercantilSeedMatches = [...seedContent.matchAll(/makeAuditedTx\('[^']+',\s*'mercantil',\s*'2026-08-[0-9]+',\s*'[^']+',\s*[^,]+,\s*([0-9.-]+)/g)];
let agostoNet = 0;
mercantilSeedMatches.forEach(m => {
  agostoNet += parseFloat(m[1]);
});

// Read Mercantil Ene-Jul
const seedText = fs.readFileSync('scripts/mercantilSeedCode.txt', 'utf-8');
let totalEneJulNet = 0;

const lines = seedText.split('\n');
lines.forEach(l => {
  const match = l.match(/makeAuditedTx\('([^']+)',\s*'mercantil',\s*'([^']+)',\s*'([^']+)',\s*.*,\s*([0-9.-]+),\s*'([^']+)'/);
  if (match) {
    const amountBs = parseFloat(match[4]);
    totalEneJulNet += amountBs;
  }
});

const totalNetEneAug = totalEneJulNet + agostoNet;
const targetAugostClosing = 36508.16;
const exactInitialBalance = targetAugostClosing - totalNetEneAug;

console.log(`Total Net Ene-Jul:  ${totalEneJulNet.toFixed(2)} Bs.`);
console.log(`Total Net Agosto:   ${agostoNet.toFixed(2)} Bs.`);
console.log(`Total Net Ene-Aug:  ${totalNetEneAug.toFixed(2)} Bs.`);
console.log(`Target Closing Aug: ${targetAugostClosing.toFixed(2)} Bs.`);
console.log(`Calculated Initial Balance (01/01/2026): ${exactInitialBalance.toFixed(2)} Bs.`);
