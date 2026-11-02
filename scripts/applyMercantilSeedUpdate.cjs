const fs = require('fs');

let seedTs = fs.readFileSync('src/data/seedData.ts', 'utf-8');
const mercantilNewCode = fs.readFileSync('scripts/mercantilSeedCode.txt', 'utf-8');

// Section header to replace
const targetStartHeader = "// ==============================================================\n  // 2. BANCO MERCANTIL - CUENTA 0105-0110-55-1110393865 (AGOSTO 2026)\n  // ==============================================================";

const newSection = `// ==============================================================
  // 2. BANCO MERCANTIL - ENERO A JULIO 2026
  // ==============================================================
${mercantilNewCode}

  // ==============================================================
  // 2.1 BANCO MERCANTIL - AGOSTO 2026
  // ==============================================================`;

if (!seedTs.includes(targetStartHeader)) {
  console.error("Target header not found in src/data/seedData.ts!");
  process.exit(1);
}

seedTs = seedTs.replace(targetStartHeader, newSection);

fs.writeFileSync('src/data/seedData.ts', seedTs, 'utf-8');
console.log('Successfully inserted 367 Mercantil transactions into src/data/seedData.ts!');

// Bump TRANSACTIONS_KEY in src/utils/localStorage.ts
let locStorageTs = fs.readFileSync('src/utils/localStorage.ts', 'utf-8');
locStorageTs = locStorageTs.replace(/agricola_oni_database_transactions_v\d+/g, 'agricola_oni_database_transactions_v6');
fs.writeFileSync('src/utils/localStorage.ts', locStorageTs, 'utf-8');
console.log('Successfully updated localStorage TRANSACTIONS_KEY to v6!');
