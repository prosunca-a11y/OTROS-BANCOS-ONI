const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '../src/data/seedData.ts');
const provincialCodePath = path.join(__dirname, 'provincialSeedCode.txt');
const localStoragePath = path.join(__dirname, '../src/utils/localStorage.ts');

let seedContent = fs.readFileSync(seedPath, 'utf8');
const provincialCode = fs.readFileSync(provincialCodePath, 'utf8');

const targetHeader = '// 4. BANCO PROVINCIAL - CUENTA 0108-0281-46-0100333189 (AGOSTO 2026)';

if (!seedContent.includes(targetHeader)) {
  console.error('Target header not found in seedData.ts');
  process.exit(1);
}

const replacement = `// 4. BANCO PROVINCIAL - MAYO A JULIO 2026
  ${provincialCode},

  ${targetHeader}`;

seedContent = seedContent.replace(targetHeader, replacement);
seedContent = seedContent.replace('provincial: 4101.14', 'provincial: 728785.13');

fs.writeFileSync(seedPath, seedContent, 'utf8');
console.log('Successfully updated seedData.ts with Provincial transactions May-Jul 2026!');

let localContent = fs.readFileSync(localStoragePath, 'utf8');
localContent = localContent.replace("agricola_oni_database_transactions_v6", "agricola_oni_database_transactions_v7");
fs.writeFileSync(localStoragePath, localContent, 'utf8');
console.log('Successfully bumped TRANSACTIONS_KEY to v7 in localStorage.ts!');
