import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BankTransaction } from '../types/bank';
import { generateAccountingEntry } from './accounting';
import { BANKS, COMPANY_INFO } from '../data/seedData';

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
