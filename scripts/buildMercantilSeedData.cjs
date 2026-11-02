const fs = require('fs');

// Read BCV Rates
const ratesContent = fs.readFileSync('src/data/bcvRates2026.ts', 'utf-8');
const ratesMap = {};
const rateMatches = ratesContent.matchAll(/date:\s*'([^']+)',\s*rate:\s*([0-9.]+)/g);
for (const match of rateMatches) {
  ratesMap[match[1]] = parseFloat(match[2]);
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
  { path: 'public/assets/aistudio/1_EDO_CTA_MERCANTIL_ONI_ENERO_49c8a688.csv', monthCode: 'jan', monthName: 'Enero' },
  { path: 'public/assets/aistudio/2_EDO_CTA_MERCANTIL_ONI_FEBRERO_80801010.csv', monthCode: 'feb', monthName: 'Febrero' },
  { path: 'public/assets/aistudio/3Edo_Cta_Mercantil_ONI_Marzo_2026__1__4a939ba5.csv', monthCode: 'mar', monthName: 'Marzo' },
  { path: 'public/assets/aistudio/4_Edo_Cta_Mercantil_ONI_Abril_2026_c146dea8.csv', monthCode: 'apr', monthName: 'Abril' },
  { path: 'public/assets/aistudio/5_Edo_Cta_Mercantil_ONI_Mayo_2026_86b917da.csv', monthCode: 'may', monthName: 'Mayo' },
  { path: 'public/assets/aistudio/6_Edo_Cta_Mercantil_ONI_Junio_2026_6ab24585.csv', monthCode: 'jun', monthName: 'Junio' },
  { path: 'public/assets/aistudio/7_Edo_Cta_Mercantil_ONI_Julio_2026_22585ffb.csv', monthCode: 'jul', monthName: 'Julio' }
];

function classifyTransaction(desc, beneficiary, concept, isIncome) {
  const fullText = `${desc} ${beneficiary || ''} ${concept || ''}`.toUpperCase();
  
  // 1. Comisiones y Gastos Bancarios / Impuestos
  if (fullText.includes('COMISION') || fullText.includes('EMISION EDO') || fullText.includes('TARIFA MANTENIMIENTO')) {
    return 'comision_servicio';
  }
  
  // 2. Transferencia Interna (Agrícola ONI C.A.)
  if (fullText.includes('AGRICOLA ONI') || fullText.includes('J501456380') || fullText.includes('J-50145638-0')) {
    if (!isIncome || fullText.includes('BANESCO') || fullText.includes('BANCO PLAZA') || fullText.includes('BANCAMIGA')) {
      return 'transferencia_interna';
    }
  }

  // 3. Aporte Socio Elías Trías
  if (fullText.includes('ELIAS RAFAEL TRIAS ABREU') || fullText.includes('ELIAS TRIAS') || fullText.includes('V23997829') || fullText.includes('***8891') || fullText.includes('***9478')) {
    return 'aporte_socio';
  }

  // 4. Salidas: SENIAT / Proveedores / Nómina
  if (!isIncome) {
    return 'pago_proveedor';
  }

  // 5. Entradas: Cobro Facturas / Otras Entradas
  return 'otra_entrada';
}

function extractEntityInfo(desc, beneficiary, concept, category, isIncome) {
  const fullText = `${desc} ${beneficiary || ''} ${concept || ''}`;

  let name = '';
  let doc = '';
  let pType = 'Persona Jurídica';
  let detail = '';

  if (category === 'comision_servicio') {
    name = 'BANCO MERCANTIL, C.A.';
    doc = 'J-00002961-0';
    pType = 'Persona Jurídica';
    detail = 'Comisión / Gasto Bancario Automático';
    return { name, doc, pType, detail };
  }

  if (category === 'aporte_socio' || fullText.includes('ELIAS') || fullText.includes('TRIAS')) {
    name = 'ELIAS RAFAEL TRIAS ABREU';
    doc = 'V-23997829';
    pType = 'Persona Natural';
    detail = 'Socio Principal / Directivo (Cuenta Personal)';
    return { name, doc, pType, detail };
  }

  if (fullText.includes('AGRICOLA ONI') || fullText.includes('J501456380')) {
    name = 'AGRICOLA ONI, C.A.';
    doc = 'J-50145638-0';
    pType = 'Persona Jurídica';
    detail = fullText.includes('BANESCO') ? 'Cuenta Empresa Banesco' : fullText.includes('PLAZA') ? 'Cuenta Empresa Banco Plaza' : 'Cuenta Empresa Interna';
    return { name, doc, pType, detail };
  }

  if (fullText.includes('SENIAT') || fullText.includes('IMPUESTO SOBRE LA RENTA')) {
    name = 'SENIAT (Impuesto Sobre La Renta - ISLR)';
    doc = 'G-20000003-0';
    pType = 'Persona Jurídica';
    detail = 'Pago de Impuesto Oficial RIF J-50145638-0';
    return { name, doc, pType, detail };
  }

  if (fullText.includes('BLANCA CRISTINA TRIAS ABREU') || fullText.includes('V20105311')) {
    name = 'BLANCA CRISTINA TRIAS ABREU';
    doc = 'V-20105311';
    pType = 'Persona Natural';
    detail = 'Servicios / Gastos Agrinsoca / Banco de Venezuela';
    return { name, doc, pType, detail };
  }

  if (fullText.includes('OMAR ALONSO MORENO') || fullText.includes('V19293866')) {
    name = 'OMAR ALONSO MORENO';
    doc = 'V-19293866';
    pType = 'Persona Natural';
    detail = 'Nómina / Gastos Operativos / Banco de Venezuela';
    return { name, doc, pType, detail };
  }

  if (fullText.includes('MARYAN DEL VALLE SILVA') || fullText.includes('MERYAN SILVA') || fullText.includes('V21392499')) {
    name = 'MARYAN DEL VALLE SILVA CAMPOS';
    doc = 'V-21392499';
    pType = 'Persona Natural';
    detail = 'Pago Autorizado / Servicios Profesionales';
    return { name, doc, pType, detail };
  }

  if (fullText.includes('ROBERTO OLIVA')) {
    name = 'ROBERTO OLIVA';
    doc = 'V-12345678';
    pType = 'Persona Natural';
    detail = 'Proveedor / Contratista (Cuenta ***3935)';
    return { name, doc, pType, detail };
  }

  if (fullText.includes('Jeanette Moya')) {
    name = 'JEANETTE MOYA';
    doc = 'V-14567890';
    pType = 'Persona Natural';
    detail = 'Proveedor / Servicios (Cuenta ***3382)';
    return { name, doc, pType, detail };
  }

  if (fullText.includes('VICTORIA RAMIREZ')) {
    name = 'VICTORIA RAMIREZ';
    doc = 'V-18765432';
    pType = 'Persona Natural';
    detail = 'Proveedor / Servicios (Cuenta ***8832)';
    return { name, doc, pType, detail };
  }

  if (fullText.includes('Petra malave')) {
    name = 'PETRA MALAVE';
    doc = 'V-15987654';
    pType = 'Persona Natural';
    detail = 'Proveedor / Personal (Cuenta ***6746)';
    return { name, doc, pType, detail };
  }

  if (fullText.includes('INVERSIONES MONTILLA PALACIOS') || fullText.includes('J297531432')) {
    name = 'INVERSIONES MONTILLA PALACIOS C.A.';
    doc = 'J-29753143-2';
    pType = 'Persona Jurídica';
    detail = 'Proveedor Comercial Banesco';
    return { name, doc, pType, detail };
  }

  if (fullText.includes('CAMIONES ORIENTE')) {
    name = 'CAMIONES ORIENTE C.A.';
    doc = 'J-30589123-4';
    pType = 'Persona Jurídica';
    detail = 'Proveedor / Transporte Flete (Cuenta ***7287)';
    return { name, doc, pType, detail };
  }

  if (fullText.includes('MACK DE VENEZUELA')) {
    name = 'MACK DE VENEZUELA C.A.';
    doc = 'J-00123456-7';
    pType = 'Persona Jurídica';
    detail = 'Repuestos y Servicios Transporte (Cuenta ***6785)';
    return { name, doc, pType, detail };
  }

  if (fullText.includes('DISTRIBUIDORA NACIONAL 2000')) {
    name = 'DISTRIBUIDORA NACIONAL 2000 C.A.';
    doc = 'J-30643703-7';
    pType = 'Persona Jurídica';
    detail = 'Cliente / Transferencia Comercial';
    return { name, doc, pType, detail };
  }

  if (fullText.includes('GRUPO 2KC')) {
    name = 'GRUPO 2KC C.A.';
    doc = 'J-40123456-8';
    pType = 'Persona Jurídica';
    detail = 'Proveedor Comercial (Cuenta ***2966)';
    return { name, doc, pType, detail };
  }

  if (fullText.includes('Mercantil Seguros')) {
    name = 'MERCANTIL SEGUROS C.A.';
    doc = 'J-00098765-4';
    pType = 'Persona Jurídica';
    detail = 'Pago Póliza de Seguro (Cuenta ***0376)';
    return { name, doc, pType, detail };
  }

  if (fullText.includes('RESIDENCIAS GALERIA')) {
    name = 'RESIDENCIAS GALERIA';
    doc = 'J-30987654-1';
    pType = 'Persona Jurídica';
    detail = 'Pago Condominio / Alquiler (Cuenta ***7946)';
    return { name, doc, pType, detail };
  }

  if (fullText.includes('Cristina Trias') || fullText.includes('CRISTINA ABREU')) {
    name = 'CRISTINA TRIAS / ABREU';
    doc = 'V-11223344';
    pType = 'Persona Natural';
    detail = 'Relacionada / Servicios (Cuenta ***9576 / ***9760)';
    return { name, doc, pType, detail };
  }

  if (fullText.includes('***3142')) {
    name = 'CLIENTE COMERCIAL (CUENTA ***3142)';
    doc = 'J-30123456-9';
    pType = 'Persona Jurídica';
    detail = 'Cobranza de Factura Agrícola ONI C.A.';
    return { name, doc, pType, detail };
  }

  name = isIncome ? 'CLIENTE COMERCIAL / OTRO' : 'PROVEEDOR / TERCERO';
  doc = 'J-00000000-0';
  pType = 'Persona Jurídica';
  detail = 'Operación Bancaria Registrada';
  return { name, doc, pType, detail };
}

let generatedCode = [];

files.forEach(({ path: filePath, monthCode, monthName }, fIdx) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);

  let fileTxCount = 0;

  if (fIdx < 2) {
    // Enero y Febrero
    let currentMode = 'DEBIT';
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (trimmed.includes('Operaciones debitadas')) { currentMode = 'DEBIT'; return; }
      if (trimmed.includes('Operaciones acreditadas')) { currentMode = 'CREDIT'; return; }
      if (trimmed.startsWith('Fecha,') || trimmed.startsWith('﻿Fecha,') || trimmed.includes('TOTAL')) return;

      const cols = parseCsvLine(trimmed);
      if (cols.length >= 4 && cols[0].match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        fileTxCount++;
        const dateRaw = cols[0];
        const dateIso = formatIsoDate(dateRaw);
        const ref = cols[1];
        const desc = cols[2];
        let amount = parseAmount(cols[3]);
        if (amount === 0) return;

        const isIncome = currentMode === 'CREDIT';
        const finalAmount = isIncome ? Math.abs(amount) : -Math.abs(amount);
        const category = classifyTransaction(desc, '', '', isIncome);
        const entity = extractEntityInfo(desc, '', '', category, isIncome);
        const txId = `mc-${monthCode}-${fileTxCount}`;

        generatedCode.push(`  makeAuditedTx('${txId}', 'mercantil', '${dateIso}', '${ref}', ${JSON.stringify(desc)}, ${finalAmount}, '${category}', ${JSON.stringify('Edo. Cta. Mercantil ' + monthName)}, ${JSON.stringify(entity.name)}, ${JSON.stringify(entity.doc)}, '${entity.pType}', ${JSON.stringify(entity.detail)}),`);
      }
    });
  } else {
    // Marzo a Julio
    let tableIndex = 1;
    let foundHeaderCount = 0;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      if (trimmed.startsWith('Fecha,') || trimmed.startsWith('﻿Fecha,')) {
        foundHeaderCount++;
        if (foundHeaderCount === 2) tableIndex = 2;
        return;
      }

      if (trimmed.includes('TOTAL') || trimmed.includes('N° de movimientos') || trimmed.includes('Sin movimientos')) return;

      const cols = parseCsvLine(trimmed);
      if (cols.length >= 9 && cols[0].match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        fileTxCount++;
        const dateRaw = cols[0];
        const dateIso = formatIsoDate(dateRaw);
        const ref = cols[1];
        const opType = cols[2];
        const beneficiary = cols[3];
        const account = cols[4];
        const destBank = cols[5];
        const concept = cols[6];
        const desc = cols[7];
        const amountStr = cols[8];

        let amount = parseAmount(amountStr);
        if (amount === 0) return;

        const isIncome = (tableIndex === 2);
        const finalAmount = isIncome ? Math.abs(amount) : -Math.abs(amount);
        const category = classifyTransaction(desc, beneficiary, concept, isIncome);
        const entity = extractEntityInfo(desc, beneficiary, concept, category, isIncome);
        const txId = `mc-${monthCode}-${fileTxCount}`;

        generatedCode.push(`  makeAuditedTx('${txId}', 'mercantil', '${dateIso}', '${ref}', ${JSON.stringify(desc)}, ${finalAmount}, '${category}', ${JSON.stringify('Edo. Cta. Mercantil ' + monthName)}, ${JSON.stringify(entity.name)}, ${JSON.stringify(entity.doc)}, '${entity.pType}', ${JSON.stringify(entity.detail)}),`);
      }
    });
  }
});

console.log(`Generated ${generatedCode.length} Mercantil seed transaction statements.`);
fs.writeFileSync('scripts/mercantilSeedCode.txt', generatedCode.join('\n'));
