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
  // fallback to closest prior date
  const dates = Object.keys(rateMap).sort();
  let last = dates[0];
  for (const d of dates) {
    if (d <= dateStr) last = d;
    else break;
  }
  return rateMap[last] || 520.00;
}

// Map helper to classify and extract entity
function processDescription(desc, amount) {
  const d = (desc || '').toUpperCase();
  const isIncome = amount > 0;

  let category = 'pago_proveedor';
  if (d.includes('ELIAS TRIAS') || d.includes('ELIAS RAFAEL') || d.includes('PAGO ELIAS') || d.includes('V23997829')) {
    category = 'aporte_socio';
  } else if (d.includes('AGRICOLA ONI') || d.includes('J501456380') || d.includes('J-50145638')) {
    category = 'transferencia_interna';
  } else if (d.includes('CARGO POR MANTENIMIENTO') || d.includes('CARGO EMISION') || d.includes('COM TRF') || d.includes('COM.TRF')) {
    category = 'comision_servicio';
  } else if (isIncome) {
    category = 'otra_entrada';
  }

  // Entity details
  let entityName = '';
  let entityDoc = '';
  let personType = 'Persona Natural';
  let bankAccountDetail = '';

  if (category === 'transferencia_interna') {
    entityName = 'AGRICOLA ONI, C.A.';
    entityDoc = 'J-50145638-0';
    personType = 'Persona Jurídica';
    bankAccountDetail = d.includes('BANESC') ? 'Banesco (Cta 0134-0401-13-4011117562)' : 'Banco Plaza';
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
    // Try regex for Vxxxx or Jxxxx or names
    const rifMatch = d.match(/(J\d{7,9}|V\d{7,9}|E\d{7,9}|G\d{7,9})/);
    if (rifMatch) {
      entityDoc = rifMatch[1].replace(/([JVEG])(\d+)/, '$1-$2');
      if (rifMatch[1].startsWith('J') || rifMatch[1].startsWith('G')) {
        personType = 'Persona Jurídica';
      }
    }
    // Extract entity name if possible
    if (d.includes('MARYAN') || d.includes('MARYAM')) {
      entityName = 'MARYAM SILVA / V-21392499';
      entityDoc = 'V-21392499';
    } else if (d.includes('DISTRIBU')) {
      entityName = 'DISTRIBUIDORA / J-306437037';
      entityDoc = 'J-306437037';
      personType = 'Persona Jurídica';
    } else if (d.includes('BECERRA')) {
      entityName = 'MANUEL BECERRA / V-24224176';
      entityDoc = 'V-24224176';
    } else if (d.includes('PALACIOS')) {
      entityName = 'EDITH PALACIOS / V-12858788';
      entityDoc = 'V-12858788';
    } else if (d.includes('ROBERTO')) {
      entityName = 'ROBERTO OLIVA / V-17334453';
      entityDoc = 'V-17334453';
    } else if (d.includes('JEANETTE')) {
      entityName = 'JEANETTE MOYA / V-10298481';
      entityDoc = 'V-10298481';
    } else if (d.includes('BLANCA C')) {
      entityName = 'BLANCA CASTILLO / V-20105311';
      entityDoc = 'V-20105311';
    } else if (d.includes('VICTORIA')) {
      entityName = 'VICTORIA MEDINA / V-19675159';
      entityDoc = 'V-19675159';
    } else if (d.includes('SIMON AS') || d.includes('SIMON')) {
      entityName = 'SIMÓN ASTUDILLO / V-19365347';
      entityDoc = 'V-19365347';
    } else if (d.includes('OMAR MOR') || d.includes('OMAR')) {
      entityName = 'OMAR MORENO / V-19293866';
      entityDoc = 'V-19293866';
    } else if (d.includes('ETMB SPO') || d.includes('ETMB')) {
      entityName = 'ETMB SPORT / J-506134403';
      entityDoc = 'J-506134403';
      personType = 'Persona Jurídica';
    } else if (d.includes('PRODUCTO')) {
      entityName = 'PRODUCTOS Y SERVICIOS C.A. / J-506638789';
      entityDoc = 'J-506638789';
      personType = 'Persona Jurídica';
    } else if (d.includes('CORPORAC')) {
      entityName = 'CORPORACIÓN Y SERVICIOS / J-003554987';
      entityDoc = 'J-003554987';
      personType = 'Persona Jurídica';
    } else if (!entityName) {
      entityName = desc.slice(0, 35);
    }
  }

  return { category, entityName, entityDoc, personType, bankAccountDetail };
}

// Parse function
function parseCsvFile(filePath, monthPrefix, monthName) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const results = [];

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('﻿') && line.includes('Banco Plaza') || line.startsWith('#') || line.startsWith('AGRICOLA') || line.startsWith('Cuenta:') || line.startsWith('Fecha de corte:') || line.startsWith('Saldo anterior') || line.startsWith('TOTALES') || line.startsWith('Nota:') || line.startsWith('Valores en azul')) {
      continue;
    }

    // Split CSV respecting quotes
    const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
    if (!parts || parts.length < 5) continue;

    // Detect structure:
    // Standard format: #,Fecha,Hora,Referencia,Descripción,Tipo,Monto,Saldo,Saldo anterior
    // June format: #,Fecha,Descripción,Débito,Crédito,Balance,Balance cal,Diferencia
    let num, dateRaw, ref = '000000000', desc, type, amountRaw;

    // Check if header line
    if (line.includes('Descripción') || line.includes('Referencia')) continue;

    const cleanParts = parts.map(p => p.replace(/^"|"$/g, '').trim());

    if (filePath.includes('JUNIO')) {
      // June format:
      // #,Fecha,Descripción,Débito,Crédito,...
      num = cleanParts[0];
      dateRaw = cleanParts[1]; // DD/MM/YYYY
      desc = cleanParts[2];
      const deb = parseFloat(cleanParts[3].replace(/\./g, '').replace(',', '.')) || 0;
      const cred = parseFloat(cleanParts[4].replace(/\./g, '').replace(',', '.')) || 0;
      amountRaw = cred > 0 ? cred : deb;
      type = cred > 0 ? 'Crédito' : 'Débito';

      // Extract ref from desc if available (COM TRF 077022069)
      const refMatch = desc.match(/\b(\d{6,10})\b/);
      if (refMatch) ref = refMatch[1];
    } else {
      num = cleanParts[0];
      dateRaw = cleanParts[1];
      // Check if parts[2] is time (e.g. 23:59:15)
      if (cleanParts[2] && cleanParts[2].includes(':')) {
        ref = cleanParts[3];
        desc = cleanParts[4];
        type = cleanParts[5];
        amountRaw = parseFloat(cleanParts[6].replace(/\./g, '').replace(',', '.'));
      } else {
        ref = cleanParts[2];
        desc = cleanParts[3];
        type = cleanParts[4];
        amountRaw = parseFloat(cleanParts[5].replace(/\./g, '').replace(',', '.'));
      }
    }

    if (!dateRaw || isNaN(amountRaw)) continue;

    // Parse date DD/MM/YYYY -> YYYY-MM-DD
    const dSplit = dateRaw.split('/');
    if (dSplit.length !== 3) continue;
    const formattedDate = `${dSplit[2]}-${dSplit[1].padStart(2, '0')}-${dSplit[0].padStart(2, '0')}`;

    // Compute rate and USD
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
      notes: `${monthName} 2026 - Transacción auditada de Estado de Cuenta Banco Plaza`
    });
  }

  return results;
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

// Write JSON output for reference or inspection
fs.writeFileSync(path.join(__dirname, 'plaza_parsed.json'), JSON.stringify(allPlazaTxs, null, 2));
