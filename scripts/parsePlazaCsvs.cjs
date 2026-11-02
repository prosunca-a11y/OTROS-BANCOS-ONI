const fs = require('fs');
const path = require('path');

// Cargar la tabla oficial de tasas BCV 2026
const bcvContent = fs.readFileSync(path.join(__dirname, '../src/data/bcvRates2026.ts'), 'utf8');
const rateMap = {};
const rateMatches = bcvContent.matchAll(/date:\s*'([^']+)',\s*rate:\s*([\d.]+)/g);
for (const match of rateMatches) {
  rateMap[match[1]] = parseFloat(match[2]);
}

function getRateForDate(dateStr) {
  if (rateMap[dateStr]) return rateMap[dateStr];
  const dates = Object.keys(rateMap).sort();
  let last = dates[0];
  for (const d of dates) {
    if (d <= dateStr) last = d;
    else break;
  }
  return rateMap[last] || 520.00;
}

function parseCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

function processDescription(desc, amount) {
  const d = (desc || '').toUpperCase();
  const isIncome = amount > 0;

  let category = 'pago_proveedor';
  if (d.includes('ELIAS TRIAS') || d.includes('ELIAS RAFAEL') || d.includes('PAGO ELIAS') || d.includes('V23997829') || d.includes('V023997829') || d.includes('REINTEGRO COMPRA ELIAS') || d.includes('COMBUSTIBLE ELIAS')) {
    category = 'aporte_socio';
  } else if (d.includes('AGRICOLA ONI') || d.includes('J501456380') || d.includes('J-50145638')) {
    category = 'transferencia_interna';
  } else if (d.includes('CARGO POR MANTENIMIENTO') || d.includes('CARGO EMISION') || d.includes('COM TRF') || d.includes('COM. TRF') || d.includes('COM.TRF') || d.includes('CARGO DE MANTE')) {
    category = 'comision_servicio';
  } else if (isIncome) {
    category = 'otra_entrada';
  }

  let entityName = '';
  let entityDoc = '';
  let personType = 'Persona Natural';
  let bankAccountDetail = '';

  if (category === 'transferencia_interna') {
    entityName = 'AGRICOLA ONI, C.A.';
    entityDoc = 'J-50145638-0';
    personType = 'Persona Jurídica';
    bankAccountDetail = d.includes('BANESC') ? 'Banesco (Cta 0134-0401-13-4011117562)' : 'Banco Plaza (Cta 0138-****-1332)';
  } else if (category === 'aporte_socio') {
    entityName = 'ELIAS RAFAEL TRIAS ABREU';
    entityDoc = 'V-23997829';
    personType = 'Persona Natural';
    bankAccountDetail = 'Cuenta Personal Socio Elías Trías';
  } else if (category === 'comision_servicio') {
    entityName = 'Banco Plaza Banco Universal';
    entityDoc = 'J-00297055-3';
    personType = 'Persona Jurídica';
    bankAccountDetail = 'Comisión / Cargo por Servicio Bancario';
  } else {
    const rifMatch = d.match(/(J\d{7,9}|V\d{7,9}|E\d{7,9}|G\d{7,9})/);
    if (rifMatch) {
      entityDoc = rifMatch[1].replace(/([JVEG])(\d+)/, '$1-$2');
      if (rifMatch[1].startsWith('J') || rifMatch[1].startsWith('G')) {
        personType = 'Persona Jurídica';
      }
    }
    if (d.includes('MARYAN') || d.includes('MARYAM')) {
      entityName = 'MARYAM SILVA';
      entityDoc = 'V-21392499';
    } else if (d.includes('DISTRIBU')) {
      entityName = 'DISTRIBUIDORA Y COMERCIALIZADORA';
      entityDoc = 'J-306437037';
      personType = 'Persona Jurídica';
    } else if (d.includes('BECERRA')) {
      entityName = 'MANUEL BECERRA';
      entityDoc = 'V-24224176';
    } else if (d.includes('PALACIOS')) {
      entityName = 'EDITH PALACIOS';
      entityDoc = 'V-12858788';
    } else if (d.includes('ROBERTO')) {
      entityName = 'ROBERTO OLIVA';
      entityDoc = 'V-17334453';
    } else if (d.includes('JEANETTE')) {
      entityName = 'JEANETTE MOYA';
      entityDoc = 'V-10298481';
    } else if (d.includes('BLANCA C') || d.includes('BLANCA A')) {
      entityName = 'BLANCA CASTILLO / BLANCA A';
      entityDoc = d.includes('20105311') ? 'V-20105311' : 'V-002114015';
    } else if (d.includes('VICTORIA')) {
      entityName = 'VICTORIA MEDINA';
      entityDoc = 'V-19675159';
    } else if (d.includes('SIMON AS') || d.includes('SIMON')) {
      entityName = 'SIMÓN ASTUDILLO';
      entityDoc = 'V-19365347';
    } else if (d.includes('OMAR MOR') || d.includes('OMAR')) {
      entityName = 'OMAR MORENO';
      entityDoc = 'V-19293866';
    } else if (d.includes('ETMB SPO') || d.includes('ETMB')) {
      entityName = 'ETMB SPORT';
      entityDoc = 'J-506134403';
      personType = 'Persona Jurídica';
    } else if (d.includes('PRODUCTO')) {
      entityName = 'PRODUCTOS Y SERVICIOS C.A.';
      entityDoc = 'J-506638789';
      personType = 'Persona Jurídica';
    } else if (d.includes('CORPORAC')) {
      entityName = 'CORPORACIÓN Y SERVICIOS C.A.';
      entityDoc = 'J-003554987';
      personType = 'Persona Jurídica';
    } else if (!entityName) {
      entityName = desc.slice(0, 35);
    }
  }

  return { category, entityName, entityDoc, personType, bankAccountDetail };
}

function parseCsvFile(filePath, monthPrefix, monthName) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const results = [];

  for (let rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('﻿') && line.includes('Banco Plaza') || line.startsWith('AGRICOLA') || line.startsWith('Cuenta:') || line.startsWith('Fecha de corte:') || line.startsWith('Saldo anterior') || line.startsWith('TOTALES') || line.startsWith('Nota:') || line.startsWith('Valores en azul') || line.startsWith('Notas:')) {
      continue;
    }

    const cols = parseCSVLine(line).map(c => c.replace(/^"|"$/g, '').trim());
    if (cols.length < 4) continue;
    if (cols[0] === '#' || cols[1] === 'Fecha' || cols[2] === 'Descripción') continue;

    let num = cols[0];
    let dateRaw = cols[1];
    if (!dateRaw || !dateRaw.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) continue;

    let ref = '000000000';
    let desc = '';
    let amountRaw = 0;

    if (filePath.includes('JUNIO')) {
      // #,Fecha,Descripción,Débito,Crédito,Balance,Balance cal,Diferencia
      desc = cols[2];
      const debClean = (cols[3] || '0').replace(/,/g, '');
      const credClean = (cols[4] || '0').replace(/,/g, '');
      const deb = parseFloat(debClean) || 0;
      const cred = parseFloat(credClean) || 0;

      if (cred > 0) {
        amountRaw = cred;
      } else {
        amountRaw = deb < 0 ? deb : -Math.abs(deb);
      }

      const refMatch = desc.match(/\b(\d{6,10})\b/);
      if (refMatch) ref = refMatch[1];
    } else {
      // #,Fecha,Hora,Referencia,Descripción,Tipo,Monto,Saldo,Saldo anterior
      ref = cols[3];
      desc = cols[4];
      const montoStr = cols[6].replace(/,/g, '');
      amountRaw = parseFloat(montoStr);
    }

    if (isNaN(amountRaw)) continue;

    const dSplit = dateRaw.split('/');
    const formattedDate = `${dSplit[2]}-${dSplit[1].padStart(2, '0')}-${dSplit[0].padStart(2, '0')}`;

    const rate = getRateForDate(formattedDate);
    const absBs = Math.abs(amountRaw);
    const amountUSD = rate > 0 ? parseFloat((absBs / rate).toFixed(2)) : 0;

    const { category, entityName, entityDoc, personType, bankAccountDetail } = processDescription(desc, amountRaw);

    results.push({
      id: `bp-${monthPrefix}-${num}`,
      bankId: 'plaza',
      date: formattedDate,
      reference: ref,
      description: desc,
      amountBs: amountRaw,
      exchangeRate: rate,
      amountUSD: amountUSD,
      category,
      type: amountRaw > 0 ? 'income' : 'expense',
      entityName,
      entityDoc,
      personType,
      bankAccountDetail,
      notes: `${monthName} 2026 - Estado de Cuenta Banco Plaza`
    });
  }

  return results.reverse();
}

const csvFiles = [
  { path: path.join(__dirname, '../public/assets/aistudio/1_EDO_CTA_PLAZA_ONI_ENERO_76c571f1.csv'), prefix: 'ene', name: 'Enero' },
  { path: path.join(__dirname, '../public/assets/aistudio/2_EDO_CTA_PLAZA_ONI_FEBRERO_6c746c97.csv'), prefix: 'feb', name: 'Febrero' },
  { path: path.join(__dirname, '../public/assets/aistudio/3_EDO_CTA_PLAZA_ONI_MARZO_51039326.csv'), prefix: 'mar', name: 'Marzo' },
  { path: path.join(__dirname, '../public/assets/aistudio/4_EDO_CTA_PLAZA_ONI_ABRIL_dfe328a5.csv'), prefix: 'abr', name: 'Abril' },
  { path: path.join(__dirname, '../public/assets/aistudio/5_EDO_CTA_PLAZA_ONI_MAYO_48ee9ae9.csv'), prefix: 'may', name: 'Mayo' },
  { path: path.join(__dirname, '../public/assets/aistudio/6_EDO_CTA_PLAZA_ONI_JUNIO_5f5ed2a9.csv'), prefix: 'jun', name: 'Junio' }
];

let allPlazaTxs = [];
csvFiles.forEach(f => {
  const txs = parseCsvFile(f.path, f.prefix, f.name);
  console.log(`Parsed ${f.name}: ${txs.length} transactions`);
  allPlazaTxs = allPlazaTxs.concat(txs);
});

console.log(`Total Plaza Txs parsed: ${allPlazaTxs.length}`);

fs.writeFileSync(path.join(__dirname, 'plaza_parsed.json'), JSON.stringify(allPlazaTxs, null, 2));
