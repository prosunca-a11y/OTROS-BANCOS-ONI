const fs = require('fs');
const path = require('path');

const seedDataPath = path.join(__dirname, '../src/data/seedData.ts');
let seedContent = fs.readFileSync(seedDataPath, 'utf8');

// Load parsed plaza transactions
const parsedPlaza = JSON.parse(fs.readFileSync(path.join(__dirname, 'plaza_parsed.json'), 'utf8'));

// Format each transaction as code
function formatTx(t) {
  return `  makeAuditedTx('${t.id}', '${t.bankId}', '${t.date}', '${t.reference}', ${JSON.stringify(t.description)}, ${t.amountBs}, '${t.category}', ${JSON.stringify(t.notes || '')}, ${JSON.stringify(t.entityName || '')}, ${JSON.stringify(t.entityDoc || '')}, ${JSON.stringify(t.personType || '')}, ${JSON.stringify(t.bankAccountDetail || '')})`;
}

const plazaCodeLines = parsedPlaza.map(formatTx).join(',\n');

// Find start and end of section 3 in seedData
const section3Start = '// 3. BANCO PLAZA - CUENTA 0138-****-1332 (AGOSTO 2026)';
const section4Start = '// 4. BANCO PROVINCIAL - CUENTA 0108-0281-46-0100333189 (AGOSTO 2026)';

const startIdx = seedContent.indexOf(section3Start);
const endIdx = seedContent.indexOf(section4Start);

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find Plaza section markers in seedData.ts');
  process.exit(1);
}

// Preserve existing August 2026 Plaza transactions as well
const augustPlazaCode = seedContent.slice(startIdx, endIdx);

const newPlazaSection = `// 3. BANCO PLAZA - CUENTA 0138-****-1332 (ENERO - JUNIO 2026 + AGOSTO 2026)
  // ==============================================================
${plazaCodeLines},

  ${augustPlazaCode.trim()}
  `;

seedContent = seedContent.slice(0, startIdx) + newPlazaSection + seedContent.slice(endIdx);

// Update initial balances
seedContent = seedContent.replace(/plaza:\s*[\d.]+/g, (match, offset) => {
  if (seedContent.slice(offset - 30, offset).includes('SEED_INITIAL_BALANCES')) {
    return 'plaza: 363.11';
  } else if (seedContent.slice(offset - 40, offset).includes('SEED_STATEMENT_CLOSING_BALANCES')) {
    return 'plaza: 4903.85';
  }
  return match;
});

// Explicit update for initial balances
seedContent = seedContent.replace(
  /export const SEED_INITIAL_BALANCES: Record<string, number> = \{[\s\S]*?\};/,
  `export const SEED_INITIAL_BALANCES: Record<string, number> = {
  bancamiga: 47200.37,
  mercantil: 2818.21,
  plaza: 363.11,
  provincial: 4101.14
};`
);

seedContent = seedContent.replace(
  /export const SEED_STATEMENT_CLOSING_BALANCES: Record<string, number> = \{[\s\S]*?\};/,
  `export const SEED_STATEMENT_CLOSING_BALANCES: Record<string, number> = {
  bancamiga: 53949.89,
  mercantil: 36508.16,
  plaza: 4903.85,
  provincial: 3993.14
};`
);

fs.writeFileSync(seedDataPath, seedContent);
console.log('Successfully updated seedData.ts with all 272 Plaza transactions + initial/closing balances!');
