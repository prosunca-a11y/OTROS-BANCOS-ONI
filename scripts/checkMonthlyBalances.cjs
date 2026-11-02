const fs = require('fs');
const path = require('path');

const parsed = JSON.parse(fs.readFileSync(path.join(__dirname, 'plaza_parsed.json'), 'utf8'));

let balance = 363.11; // Opening Jan 1 2026

const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];

months.forEach(m => {
  const txs = parsed.filter(t => t.date.startsWith(m));
  let inc = 0;
  let exp = 0;
  txs.forEach(t => {
    if (t.amountBs > 0) inc += t.amountBs;
    else exp += Math.abs(t.amountBs);
    balance += t.amountBs;
  });
  console.log(`Month ${m}: ${txs.length} txs | Inc: ${inc.toFixed(2)} | Exp: ${exp.toFixed(2)} | Net: ${(inc-exp).toFixed(2)} | End Balance: ${balance.toFixed(2)}`);
});
