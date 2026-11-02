import ExcelJS from 'exceljs';
import { BankTransaction } from '../types/bank';
import { BANKS, COMPANY_INFO } from '../data/seedData';

export interface InternalTransferAuditItem {
  id: string;
  date: string;
  month: string;
  emittingBank: string;
  receivingBank: string;
  reference: string;
  description: string;
  accountHolderName: string;
  accountHolderType: 'EMPRESA (AGRÍCOLA ONI C.A.)' | 'DUEÑO / SOCIO (ELÍAS TRÍAS)' | 'OTRO';
  accountNumberDest: string;
  amountBs: number;
  exchangeRate: number;
  amountUSD: number;
  auditNote: string;
}

/**
 * Analiza y audita todas las transferencias internas y a Banesco
 */
export function getInternalTransfersAuditList(transactions: BankTransaction[]): InternalTransferAuditItem[] {
  const auditList: InternalTransferAuditItem[] = [];

  transactions.forEach(tx => {
    const isInternalCategory = tx.category === 'transferencia_interna';
    const descUpper = tx.description.toUpperCase();
    const isBanescoMention = descUpper.includes('BANESC') || descUpper.includes('BANESCO');

    if (isInternalCategory || isBanescoMention) {
      const bank = BANKS.find(b => b.id === tx.bankId);
      const emittingBankName = bank ? bank.name : tx.bankId;

      let receivingBankName = 'Banesco Banco Universal';
      if (descUpper.includes('PLAZA')) receivingBankName = 'Banco Plaza';
      else if (descUpper.includes('MERCANTIL')) receivingBankName = 'Banco Mercantil';
      else if (descUpper.includes('BANCAMIGA')) receivingBankName = 'Bancamiga';
      else if (descUpper.includes('PROVINCIAL')) receivingBankName = 'BBVA Banco Provincial';
      else if (descUpper.includes('VENEZUELA')) receivingBankName = 'Banco de Venezuela';

      let holderName = `${COMPANY_INFO.name} (RIF: ${COMPANY_INFO.rif})`;
      let holderType: 'EMPRESA (AGRÍCOLA ONI C.A.)' | 'DUEÑO / SOCIO (ELÍAS TRÍAS)' | 'OTRO' = 'EMPRESA (AGRÍCOLA ONI C.A.)';
      let accDest = '0134-0401-13-4011117562';
      let note = 'Transferencia interna hacia cuenta Banesco a nombre de la EMPRESA (Agrícola ONI C.A.)';

      if (descUpper.includes('ELIAS') || descUpper.includes('V23997829') || descUpper.includes('23997829')) {
        holderName = `${COMPANY_INFO.partner.name} (C.I.: ${COMPANY_INFO.partner.cedula})`;
        holderType = 'DUEÑO / SOCIO (ELÍAS TRÍAS)';
        accDest = '0102-0103-92-0000763554 / Personal';
        note = 'Transferencia a cuenta personal del DUEÑO / SOCIO Elías Trías Abreu';
      }

      auditList.push({
        id: tx.id,
        date: tx.date,
        month: tx.date.substring(0, 7),
        emittingBank: emittingBankName,
        receivingBank: receivingBankName,
        reference: tx.reference,
        description: tx.description,
        accountHolderName: holderName,
        accountHolderType: holderType,
        accountNumberDest: accDest,
        amountBs: tx.amountBs,
        exchangeRate: tx.exchangeRate,
        amountUSD: tx.amountUSD,
        auditNote: note
      });
    }
  });

  return auditList.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Genera y descarga el reporte Excel especializado de Transferencias Internas y Cuentas Banesco con ExcelJS
 */
export async function exportInternalTransfersAuditExcel(transactions: BankTransaction[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Auditoría Trfs Internas');
  sheet.views = [{ showGridLines: true }];

  // Banner
  const titleRow = sheet.addRow(['BANCO EXPRESS - AUDITORÍA ESPECIAL DE TRANSFERENCIAS INTERNAS Y CUENTAS BANESCO']);
  sheet.mergeCells(1, 1, 1, 13);
  titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  titleRow.getCell(1).font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
  titleRow.height = 30;

  sheet.addRow([`EMPRESA: ${COMPANY_INFO.name}`, `RIF: ${COMPANY_INFO.rif}`]);
  sheet.addRow([`SOCIO PRINCIPAL: ${COMPANY_INFO.partner.name}`, `C.I.: ${COMPANY_INFO.partner.cedula}`]);
  sheet.addRow(['VERIFICACIÓN AUDITADA SI LA TRANSFERENCIA A BANESCO FUE A NOMBRE DE LA EMPRESA O DEL DUEÑO']);
  sheet.addRow([]);

  const headerRow = sheet.addRow([
    'FECHA', 'MES', 'BANCO ORIGEN', 'BANCO DESTINO', 'REFERENCIA',
    'DESCRIPCIÓN', 'TITULAR EN DESTINO', 'TIPO TITULAR', 'N° CUENTA DESTINO',
    'MONTO (Bs.)', 'TASA BCV', 'MONTO ($ USD)', 'DIAGNÓSTICO AUDITORÍA'
  ]);
  headerRow.height = 24;
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const auditItems = getInternalTransfersAuditList(transactions);

  auditItems.forEach((item, idx) => {
    const row = sheet.addRow([
      item.date,
      item.month,
      item.emittingBank,
      item.receivingBank,
      item.reference,
      item.description,
      item.accountHolderName,
      item.accountHolderType,
      item.accountNumberDest,
      item.amountBs,
      item.exchangeRate,
      item.amountUSD,
      item.auditNote
    ]);

    row.height = 19;
    row.eachCell((cell, colIndex) => {
      cell.font = { name: 'Calibri', size: 9.5 };
      if (idx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      if (colIndex === 10) {
        cell.numFmt = '#,##0.00;[Red](#,##0.00);"-"';
        cell.alignment = { horizontal: 'right' };
      } else if (colIndex === 11) {
        cell.numFmt = '#,##0.0000';
        cell.alignment = { horizontal: 'right' };
      } else if (colIndex === 12) {
        cell.numFmt = '"$"#,##0.00;[Red]("$"#,##0.00);"-"';
        cell.alignment = { horizontal: 'right' };
      }
    });
  });

  const totalBs = auditItems.reduce((acc, item) => acc + Math.abs(item.amountBs), 0);
  const totalUSD = auditItems.reduce((acc, item) => acc + item.amountUSD, 0);

  const totRow = sheet.addRow([
    'TOTAL AUDITADO', '', '', '', '', '', '', '', '',
    totalBs, '', totalUSD, `${auditItems.length} Operaciones`
  ]);
  totRow.height = 24;
  totRow.eachCell((cell, colIndex) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'double' } };
    if (colIndex === 10) cell.numFmt = '#,##0.00';
    if (colIndex === 12) cell.numFmt = '"$"#,##0.00';
  });

  sheet.columns.forEach(col => {
    let maxLen = 12;
    col.eachCell?.({ includeEmpty: false }, cell => {
      const str = cell.value ? String(cell.value) : '';
      if (!str.startsWith('BANCO EXPRESS') && str.length < 80) {
        if (str.length > maxLen) maxLen = str.length;
      }
    });
    col.width = Math.min(60, maxLen + 4);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BANCO_EXPRESS_Auditoria_Transferencias_Internas_y_Banesco.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}
