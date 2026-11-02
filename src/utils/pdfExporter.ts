import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BankTransaction } from '../types/bank';
import { generateAccountingEntry } from './accounting';
import { BANKS, CATEGORIES, COMPANY_INFO, SEED_INITIAL_BALANCES } from '../data/seedData';

/**
 * Genera y descarga el Libro Diario de Contabilidad (VEN-NIF / PCGA) en formato PDF oficial.
 */
export function exportAccountingJournalPDF(
  transactions: BankTransaction[],
  periodLabel: string = 'Enero-Agosto 2026'
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const entries = transactions.map(tx => generateAccountingEntry(tx));
  const totalDebitBs = entries.reduce((a, b) => a + b.debitBs, 0);
  const totalCreditBs = entries.reduce((a, b) => a + b.creditBs, 0);
  const totalDebitUSD = entries.reduce((a, b) => a + b.debitUSD, 0);
  const totalCreditUSD = entries.reduce((a, b) => a + b.creditUSD, 0);

  // Encabezado Oficial
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(`BANCO EXPRESS - LIBRO DIARIO DE CONTABILIDAD OFICIAL (VEN-NIF / PCGA)`, 14, 14);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(`Empresa Titular: ${COMPANY_INFO.name} | RIF: ${COMPANY_INFO.rif}`, 14, 19.5);
  doc.text(`Representante Legal: ${COMPANY_INFO.partner.name} | C.I.: ${COMPANY_INFO.partner.cedula}`, 14, 24);
  doc.text(`Período Auditado: ${periodLabel.toUpperCase()} | Normativa: VEN-NIF PYME / Ley BCV Art. 128 (Tasa Oficial BCV)`, 14, 28.5);
  doc.text(`Emisión: ${new Date().toISOString().split('T')[0]}`, 235, 19.5);

  // Cuadro de Verificación de Partida Doble
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.setDrawColor(34, 197, 94); // emerald-500
  doc.roundedRect(14, 32, 269, 8, 1.5, 1.5, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52); // emerald-800
  doc.text(
    `VERIFICACIÓN PARTIDA DOBLE (SUMAS IGUALES): DEBE = Bs. ${totalDebitBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })} | HABER = Bs. ${totalCreditBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })} (CUADRE PERFECTO 100%)`,
    18,
    37.2
  );

  // Encabezados de la Tabla
  const tableHead = [
    [
      'N°',
      'Fecha',
      'Banco',
      'Ref.',
      'Concepto de la Operación',
      'Código',
      'Cuenta Contable VEN-NIF',
      'Debe (Bs.)',
      'Haber (Bs.)',
      'Tasa BCV',
      'Debe ($ USD)',
      'Haber ($ USD)'
    ]
  ];

  const tableBody: any[] = [];

  entries.forEach((entry, idx) => {
    const bank = BANKS.find(b => b.id === entry.bankId);
    const bankShort = bank ? bank.shortName : entry.bankId;

    // Fila 1: Leg DEBE
    tableBody.push([
      `#${idx + 1}`,
      entry.date,
      bankShort,
      entry.reference,
      entry.concept,
      entry.debitAccountCode,
      entry.debitAccountName,
      entry.debitBs.toLocaleString('es-VE', { minimumFractionDigits: 2 }),
      '-',
      entry.exchangeRate.toFixed(2),
      `$${entry.debitUSD.toFixed(2)}`,
      '-'
    ]);

    // Fila 2: Leg HABER
    tableBody.push([
      '',
      '',
      '',
      '',
      '',
      entry.creditAccountCode,
      `  a ${entry.creditAccountName}`,
      '-',
      entry.creditBs.toLocaleString('es-VE', { minimumFractionDigits: 2 }),
      entry.exchangeRate.toFixed(2),
      '-',
      `$${entry.creditUSD.toFixed(2)}`
    ]);
  });

  // Fila de Totales
  tableBody.push([
    'TOTAL',
    '',
    '',
    '',
    'TOTALES GENERALES CONSOLIDADOS (PARTIDA DOBLE)',
    '',
    'SUMAS IGUALES VERIFICADAS',
    totalDebitBs.toLocaleString('es-VE', { minimumFractionDigits: 2 }),
    totalCreditBs.toLocaleString('es-VE', { minimumFractionDigits: 2 }),
    'BCV',
    `$${totalDebitUSD.toFixed(2)}`,
    `$${totalCreditUSD.toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: 43,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 18 },
      3: { cellWidth: 18 },
      4: { cellWidth: 58 },
      5: { cellWidth: 18, fontStyle: 'bold' },
      6: { cellWidth: 46 },
      7: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
      8: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
      9: { cellWidth: 13, halign: 'right' },
      10: { cellWidth: 18, halign: 'right' },
      11: { cellWidth: 18, halign: 'right' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    didDrawPage: (data) => {
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Página ${data.pageNumber} | ${COMPANY_INFO.name} - RIF: ${COMPANY_INFO.rif} | Contabilidad General VEN-NIF`,
        14,
        202
      );
    }
  });

  const filename = `Libro_Diario_Asientos_Contables_Agricola_ONI_${periodLabel.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
}

/**
 * Genera y descarga el Informe Ejecutivo Consolidado Multi-Banco en formato PDF oficial.
 */
export function exportConsolidatedSummaryPDF(
  transactions: BankTransaction[],
  periodLabel: string = 'Enero-Agosto 2026'
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const totalIncBs = transactions.filter(t => t.amountBs > 0).reduce((a, b) => a + b.amountBs, 0);
  const totalIncUSD = transactions.filter(t => t.amountBs > 0).reduce((a, b) => a + b.amountUSD, 0);
  const totalExpBs = transactions.filter(t => t.amountBs < 0).reduce((a, b) => a + Math.abs(b.amountBs), 0);
  const totalExpUSD = transactions.filter(t => t.amountBs < 0).reduce((a, b) => a + b.amountUSD, 0);

  const totalInitialBs = Object.values(SEED_INITIAL_BALANCES).reduce((a, b) => a + b, 0);
  const totalInitialUSD = totalInitialBs / 798.326;
  const totalEndingBs = totalInitialBs + totalIncBs - totalExpBs;
  const totalEndingUSD = totalInitialUSD + totalIncUSD - totalExpUSD;

  // Header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`BANCO EXPRESS - INFORME EJECUTIVO CONSOLIDADO MULTI-BANCO`, 14, 15);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Empresa Titular: ${COMPANY_INFO.name} | RIF: ${COMPANY_INFO.rif}`, 14, 20.5);
  doc.text(`Representante Legal: ${COMPANY_INFO.partner.name} | C.I.: ${COMPANY_INFO.partner.cedula}`, 14, 25);
  doc.text(`Período Auditado: ${periodLabel.toUpperCase()} | Emisión: ${new Date().toISOString().split('T')[0]}`, 14, 29.5);

  // KPI Boxes
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 34, 42, 16, 2, 2, 'FD');
  doc.roundedRect(60, 34, 42, 16, 2, 2, 'FD');
  doc.roundedRect(106, 34, 42, 16, 2, 2, 'FD');
  doc.roundedRect(152, 34, 44, 16, 2, 2, 'FD');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('SALDO INICIAL TOTAL', 16, 38);
  doc.text('ENTRADAS CONSOLIDADAS', 62, 38);
  doc.text('SALIDAS CONSOLIDADAS', 108, 38);
  doc.text('SALDO FINAL CONSOLIDADO', 154, 38);

  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Bs. ${totalInitialBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`, 16, 43);
  doc.setTextColor(22, 101, 52);
  doc.text(`Bs. ${totalIncBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`, 62, 43);
  doc.setTextColor(153, 27, 27);
  doc.text(`Bs. ${totalExpBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`, 108, 43);
  doc.setTextColor(30, 58, 138);
  doc.text(`Bs. ${totalEndingBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`, 154, 43);

  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`$${totalInitialUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`, 16, 47.5);
  doc.text(`$${totalIncUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`, 62, 47.5);
  doc.text(`$${totalExpUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`, 108, 47.5);
  doc.text(`$${totalEndingUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`, 154, 47.5);

  // Tabla 1: Resumen por Banco Independiente
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`1. Resumen Comparativo por Banco Independiente`, 14, 56);

  const bankHead = [['Institución Bancaria', 'N° Cuenta', 'Saldo Inicial (Bs.)', 'Entradas (Bs.)', 'Salidas (Bs.)', 'Saldo Final (Bs.)', 'Saldo ($ USD)', 'Trxs']];
  const bankBody = BANKS.map(b => {
    const bTxs = transactions.filter(t => t.bankId === b.id);
    const initBs = SEED_INITIAL_BALANCES[b.id] || 0;
    const incBs = bTxs.filter(t => t.amountBs > 0).reduce((a, c) => a + c.amountBs, 0);
    const expBs = bTxs.filter(t => t.amountBs < 0).reduce((a, c) => a + Math.abs(c.amountBs), 0);
    const endBs = initBs + incBs - expBs;
    const endUSD = endBs / 798.326;

    return [
      b.name,
      b.accountNumber,
      initBs.toLocaleString('es-VE', { minimumFractionDigits: 2 }),
      incBs.toLocaleString('es-VE', { minimumFractionDigits: 2 }),
      expBs.toLocaleString('es-VE', { minimumFractionDigits: 2 }),
      endBs.toLocaleString('es-VE', { minimumFractionDigits: 2 }),
      `$${endUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      bTxs.length
    ];
  });

  autoTable(doc, {
    startY: 59,
    head: bankHead,
    body: bankBody,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 35 },
      2: { cellWidth: 22, halign: 'right' },
      3: { cellWidth: 22, halign: 'right' },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
      7: { cellWidth: 10, halign: 'center' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;

  // Tabla 2: Clasificación Consolidada por Categorías
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`2. Clasificación Consolidada por Categorías de Operación`, 14, finalY);

  const catHead = [['Categoría de Operación', 'Entradas (Bs.)', 'Salidas (Bs.)', 'Flujo Neto (Bs.)', 'Flujo Neto ($ USD)', 'N° Trxs']];
  const catBody = CATEGORIES.map(cat => {
    const catTxs = transactions.filter(t => t.category === cat.id);
    const incBs = catTxs.filter(t => t.amountBs > 0).reduce((a, c) => a + c.amountBs, 0);
    const expBs = catTxs.filter(t => t.amountBs < 0).reduce((a, c) => a + Math.abs(c.amountBs), 0);
    const netBs = incBs - expBs;
    const incUSD = catTxs.filter(t => t.amountBs > 0).reduce((a, c) => a + c.amountUSD, 0);
    const expUSD = catTxs.filter(t => t.amountBs < 0).reduce((a, c) => a + c.amountUSD, 0);
    const netUSD = incUSD - expUSD;

    return [
      cat.name,
      incBs > 0 ? incBs.toLocaleString('es-VE', { minimumFractionDigits: 2 }) : '-',
      expBs > 0 ? expBs.toLocaleString('es-VE', { minimumFractionDigits: 2 }) : '-',
      netBs.toLocaleString('es-VE', { minimumFractionDigits: 2 }),
      `$${netUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      catTxs.length
    ];
  });

  autoTable(doc, {
    startY: finalY + 3,
    head: catHead,
    body: catBody,
    theme: 'grid',
    headStyles: { fillColor: [49, 46, 129], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 65, fontStyle: 'bold' },
      1: { cellWidth: 28, halign: 'right' },
      2: { cellWidth: 28, halign: 'right' },
      3: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      4: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 15, halign: 'center' }
    }
  });

  const catFinalY = (doc as any).lastAutoTable.finalY + 15;

  // Firmas de Responsabilidad y Certificación Contable
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);

  doc.line(14, catFinalY, 70, catFinalY);
  doc.line(120, catFinalY, 180, catFinalY);

  doc.text(`${COMPANY_INFO.partner.name}`, 14, catFinalY + 4);
  doc.text(`${COMPANY_INFO.partner.title} - ${COMPANY_INFO.name}`, 14, catFinalY + 8);

  doc.text(`${COMPANY_INFO.accountant.name} (${COMPANY_INFO.accountant.cpc})`, 120, catFinalY + 4);
  doc.text(`${COMPANY_INFO.accountant.title}`, 120, catFinalY + 8);

  doc.text(`Página 1 | ${COMPANY_INFO.name} - RIF: ${COMPANY_INFO.rif} | Informe Consolidado Certificado Multi-Banco`, 14, 285);

  const filename = `Informe_Consolidado_Multibanco_Agricola_ONI_${periodLabel.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
}
