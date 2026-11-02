const fs = require('fs');
const path = require('path');

const files = [
  { file: 'public/assets/aistudio/1_EDO_CTA_MERCANTIL_ONI_ENERO_49c8a688.csv', month: '2026-01' },
  { file: 'public/assets/aistudio/2_EDO_CTA_MERCANTIL_ONI_FEBRERO_80801010.csv', month: '2026-02' },
  { file: 'public/assets/aistudio/3Edo_Cta_Mercantil_ONI_Marzo_2026__1__4a939ba5.csv', month: '2026-03' },
  { file: 'public/assets/aistudio/4_Edo_Cta_Mercantil_ONI_Abril_2026_c146dea8.csv', month: '2026-04' },
  { file: 'public/assets/aistudio/5_Edo_Cta_Mercantil_ONI_Mayo_2026_86b917da.csv', month: '2026-05' },
  { file: 'public/assets/aistudio/6_Edo_Cta_Mercantil_ONI_Junio_2026_6ab24585.csv', month: '2026-06' },
  { file: 'public/assets/aistudio/7_Edo_Cta_Mercantil_ONI_Julio_2026_22585ffb.csv', month: '2026-07' },
];

files.forEach(({ file, month }) => {
  console.log(`\n============================`);
  console.log(`FILE: ${file} (${month})`);
  console.log(`============================`);
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split(/\r?\n/);
  
  let section = 'UNKNOWN';
  let credits = 0;
  let debits = 0;
  let creditSum = 0;
  let debitSum = 0;

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    
    if (trimmed.includes('Operaciones debitadas')) {
      section = 'DEBIT';
      console.log(`LINE ${lineIdx + 1}: Section changed to DEBIT`);
      return;
    }
    if (trimmed.includes('Operaciones acreditadas')) {
      section = 'CREDIT';
      console.log(`LINE ${lineIdx + 1}: Section changed to CREDIT`);
      return;
    }

    // Check header lines
    if (trimmed.startsWith('Fecha,') || trimmed.startsWith('﻿Fecha,')) {
      console.log(`LINE ${lineIdx + 1}: Header: ${trimmed.slice(0, 80)}`);
      return;
    }

    // Check summary lines
    if (trimmed.includes('TOTAL')) {
      console.log(`LINE ${lineIdx + 1}: Total line: ${trimmed}`);
      return;
    }

    // Attempt simple CSV parse
    // Simple regex for CSV splitting considering quotes
    const matches = trimmed.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    console.log(`LINE ${lineIdx + 1} [${section}]: ${trimmed.slice(0, 100)}`);
  });
});
