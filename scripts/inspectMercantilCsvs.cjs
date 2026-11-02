const fs = require('fs');
const path = require('path');

const files = [
  'public/assets/aistudio/1_EDO_CTA_MERCANTIL_ONI_ENERO_49c8a688.csv',
  'public/assets/aistudio/2_EDO_CTA_MERCANTIL_ONI_FEBRERO_80801010.csv',
  'public/assets/aistudio/3Edo_Cta_Mercantil_ONI_Marzo_2026__1__4a939ba5.csv',
  'public/assets/aistudio/4_Edo_Cta_Mercantil_ONI_Abril_2026_c146dea8.csv',
  'public/assets/aistudio/5_Edo_Cta_Mercantil_ONI_Mayo_2026_86b917da.csv',
  'public/assets/aistudio/6_Edo_Cta_Mercantil_ONI_Junio_2026_6ab24585.csv',
  'public/assets/aistudio/7_Edo_Cta_Mercantil_ONI_Julio_2026_22585ffb.csv',
];

files.forEach((filePath, idx) => {
  console.log(`=== FILE ${idx + 1}: ${path.basename(filePath)} ===`);
  if (!fs.existsSync(filePath)) {
    console.log('File does not exist!');
    return;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  console.log(`Total lines: ${lines.length}`);
  console.log(`First 15 lines:\n${lines.slice(0, 15).join('\n')}`);
});
