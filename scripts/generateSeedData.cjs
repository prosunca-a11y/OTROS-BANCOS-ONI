const fs = require('fs');
const path = require('path');

const parsedPlaza = JSON.parse(fs.readFileSync(path.join(__dirname, 'plaza_parsed.json'), 'utf8'));

// Format each transaction as code
function formatTx(t) {
  return `  makeAuditedTx('${t.id}', '${t.bankId}', '${t.date}', '${t.reference}', ${JSON.stringify(t.description)}, ${t.amountBs}, '${t.category}', ${JSON.stringify(t.notes || '')}, ${JSON.stringify(t.entityName || '')}, ${JSON.stringify(t.entityDoc || '')}, ${JSON.stringify(t.personType || '')}, ${JSON.stringify(t.bankAccountDetail || '')})`;
}

const plazaCodeLines = parsedPlaza.map(formatTx);

console.log(`Formatted ${plazaCodeLines.length} Plaza transactions`);

fs.writeFileSync(path.join(__dirname, 'plaza_code.txt'), plazaCodeLines.join(',\n'));
