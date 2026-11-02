const fs = require('fs');

// Read BCV Rates
const ratesContent = fs.readFileSync('src/data/bcvRates2026.ts', 'utf-8');
const ratesMap = {};
const rateMatches = ratesContent.matchAll(/date:\s*'([^']+)',\s*rate:\s*([0-9.]+)/g);
for (const match of rateMatches) {
  ratesMap[match[1]] = parseFloat(match[2]);
}

function getRateForDate(dateStr) {
  let normalized = dateStr.trim();
  if (normalized.includes('/')) {
    const p = normalized.split('/');
    if (p.length === 3) {
      normalized = `${p[2].length === 2 ? '20' + p[2] : p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
    }
  }
  if (ratesMap[normalized]) return ratesMap[normalized];
  const sortedDates = Object.keys(ratesMap).sort();
  let lastRate = 798.326;
  for (const d of sortedDates) {
    if (d <= normalized) lastRate = ratesMap[d];
    else break;
  }
  return lastRate;
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseAmount(valStr) {
  if (!valStr) return 0;
  let clean = valStr.replace(/"/g, '').replace(/\s/g, '');
  if (!clean || clean === '-') return 0;
  if (clean.includes(',') && clean.includes('.')) {
    if (clean.indexOf(',') < clean.indexOf('.')) {
      clean = clean.replace(/,/g, '');
    } else {
      clean = clean.replace(/\./g, '').replace(/,/g, '.');
    }
  } else if (clean.includes(',')) {
    const parts = clean.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      clean = clean.replace(/,/g, '.');
    } else {
      clean = clean.replace(/,/g, '');
    }
  }
  return parseFloat(clean) || 0;
}

function formatIsoDate(dateStr) {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
    return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return dateStr;
}

const files = [
  { path: 'public/assets/aistudio/5_Edo_Cta_Provincial_ONI_Mayo_2026_329ed90f.csv', monthCode: 'may', monthName: 'Mayo' },
  { path: 'public/assets/aistudio/6_Edo_Cta_Provincial_ONI_Junio_2026_2b8952f1.csv', monthCode: 'jun', monthName: 'Junio' },
  { path: 'public/assets/aistudio/7__Edo_Cta_Provincial_ONI_julio_2026_63ee41e1.csv', monthCode: 'jul', monthName: 'Julio' }
];

function classifyProvincialTx(concept, opType, destBank, isIncome) {
  const text = `${concept} ${opType} ${destBank || ''}`.toUpperCase();
  
  if (text.includes('COMIS') || text.includes('COM.MTTO') || text.includes('COM.EM.EDO')) {
    return 'comision_servicio';
  }

  if (text.includes('ONI BANESCO') || text.includes('J501456380') || text.includes('AGRICOLA ONI')) {
    return 'transferencia_interna';
  }

  if (text.includes('ELIAS RAFAEL TRIA') || text.includes('ELIAS TRIAS')) {
    return 'aporte_socio';
  }

  if (text.includes('INVERSIONES MONTI') || text.includes('INVERSIOES MONT') || text.includes('DISTRIBUIDORA NACION') || text.includes('GUSTAVO ARMANDO MONT') || text.includes('ROBERTO OLIVA') || text.includes('SRA CRISTINA MERC') || text.includes('REINTEGRO OMAR') || text.includes('PAGO INTERNET ALT')) {
    return isIncome ? 'otra_entrada' : 'pago_proveedor';
  }

  return isIncome ? 'otra_entrada' : 'pago_proveedor';
}

function extractProvincialEntity(concept, opType, destBank, category, isIncome) {
  const text = `${concept} ${opType} ${destBank || ''}`.toUpperCase();

  if (category === 'comision_servicio') {
    return {
      name: 'BBVA BANCO PROVINCIAL, S.A.',
      doc: 'J-00002967-9',
      pType: 'Persona Jurídica',
      detail: 'Comisión por Operación / Mantenimiento Bancario'
    };
  }

  if (text.includes('ONI BANESCO') || text.includes('J501456380') || text.includes('AGRICOLA ONI')) {
    return {
      name: 'AGRICOLA ONI, C.A.',
      doc: 'J-50145638-0',
      pType: 'Persona Jurídica',
      detail: 'Cuenta Empresa Banesco (0134-0401-13-4011117562)'
    };
  }

  if (text.includes('ELIAS RAFAEL TRIA') || text.includes('ELIAS TRIAS')) {
    return {
      name: 'ELIAS RAFAEL TRIAS ABREU',
      doc: 'V-23997829',
      pType: 'Persona Natural',
      detail: 'Socio Principal (Cuenta Mercantil 0105)'
    };
  }

  if (text.includes('INVERSIONES MONTI') || text.includes('INVERSIOES MONT')) {
    return {
      name: 'INVERSIONES MONTILLA PALACIOS C.A.',
      doc: 'J-29753143-2',
      pType: 'Persona Jurídica',
      detail: 'Proveedor Comercial (Banesco 0134)'
    };
  }

  if (text.includes('DISTRIBUIDORA NACION')) {
    return {
      name: 'DISTRIBUIDORA NACIONAL 2000 C.A.',
      doc: 'J-30643703-7',
      pType: 'Persona Jurídica',
      detail: 'Cliente / Traspaso Comercial Especial'
    };
  }

  if (text.includes('GUSTAVO ARMANDO MONT')) {
    return {
      name: 'GUSTAVO ARMANDO MONTILLA',
      doc: 'V-15892341',
      pType: 'Persona Natural',
      detail: 'Contratista / Traspaso Teleservicios'
    };
  }

  if (text.includes('ROBERTO OLIVA')) {
    return {
      name: 'ROBERTO OLIVA',
      doc: 'V-12345678',
      pType: 'Persona Natural',
      detail: 'Proveedor / Servicios (Mercantil 0105)'
    };
  }

  if (text.includes('SRA CRISTINA MERC')) {
    return {
      name: 'CRISTINA TRIAS / ABREU',
      doc: 'V-11223344',
      pType: 'Persona Natural',
      detail: 'Relacionada / Servicios (Mercantil 0105)'
    };
  }

  if (text.includes('REINTEGRO OMAR')) {
    return {
      name: 'OMAR ALONSO MORENO',
      doc: 'V-19293866',
      pType: 'Persona Natural',
      detail: 'Reintegro de Gastos (Banco de Venezuela 0102)'
    };
  }

  if (text.includes('PAGO INTERNET ALT')) {
    return {
      name: 'PROVEEDOR DE INTERNET / TELECOM',
      doc: 'J-30129876-5',
      pType: 'Persona Jurídica',
      detail: 'Pago Servicio de Internet Alta Velocidad'
    };
  }

  if (text.includes('TRA776112') || text.includes('TRA120000') || text.includes('TRAV002776')) {
    return {
      name: 'AGRICOLA ONI, C.A.',
      doc: 'J-50145638-0',
      pType: 'Persona Jurídica',
      detail: 'Transferencia / Traspaso Recibido de Cuenta Propia'
    };
  }

  return {
    name: isIncome ? 'CLIENTE COMERCIAL' : 'PROVEEDOR / TERCERO',
    doc: 'J-00000000-0',
    pType: 'Persona Jurídica',
    detail: 'Operación Bancaria Registrada'
  };
}

let generatedCode = [];

files.forEach(({ path: filePath, monthCode, monthName }) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);

  let fileTxCount = 0;

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('F. Operación') || trimmed.startsWith('﻿F. Operación') || trimmed.includes('SALDO ANTERIOR') || trimmed.includes('TOTALES') || trimmed.includes('N° de movimientos')) return;

    const cols = parseCsvLine(trimmed);
    if (cols.length >= 8 && cols[0].match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      fileTxCount++;
      const dateRaw = cols[0];
      const dateIso = formatIsoDate(dateRaw);
      const ref = cols[1];
      const concept = cols[2];
      const dateVal = cols[3];
      const opType = cols[4];
      const destBank = cols[5];
      const charges = parseAmount(cols[6]);
      const credits = parseAmount(cols[7]);

      const isIncome = credits > 0;
      const amountBs = isIncome ? credits : -charges;
      const category = classifyProvincialTx(concept, opType, destBank, isIncome);
      const entity = extractProvincialEntity(concept, opType, destBank, category, isIncome);
      const txId = `pv-${monthCode}-${fileTxCount}`;

      generatedCode.push(`  makeAuditedTx('${txId}', 'provincial', '${dateIso}', '${ref}', ${JSON.stringify(concept)}, ${amountBs}, '${category}', ${JSON.stringify('Edo. Cta. Provincial ' + monthName)}, ${JSON.stringify(entity.name)}, ${JSON.stringify(entity.doc)}, '${entity.pType}', ${JSON.stringify(entity.detail)}),`);
    }
  });
});

console.log(`Generated ${generatedCode.length} Provincial seed transaction statements.`);
fs.writeFileSync('scripts/provincialSeedCode.txt', generatedCode.join('\n'));
