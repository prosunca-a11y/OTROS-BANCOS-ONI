import * as XLSX from 'xlsx';
import { BankTransaction } from '../types/bank';
import { BANKS, COMPANY_INFO } from '../data/seedData';
import { enhanceWorksheetFormatting } from './excelExporter';

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

      // Verificar si la cuenta destino Banesco o interna está a nombre de la EMPRESA o del DUEÑO
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
        month: tx.date.substring(0, 7), // YYYY-MM
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
 * Genera y descarga el reporte Excel especializado de Transferencias Internas y Cuentas Banesco
 */
export function exportInternalTransfersAuditExcel(transactions: BankTransaction[]) {
  const workbook = XLSX.utils.book_new();
  const auditItems = getInternalTransfersAuditList(transactions);

  const rows: any[] = [];
  rows.push(['BANCO EXPRESS - AUDITORÍA ESPECIAL DE TRANSFERENCIAS INTERNAS Y CUENTAS BANESCO']);
  rows.push([`EMPRESA: ${COMPANY_INFO.name}`, `RIF: ${COMPANY_INFO.rif}`]);
  rows.push([`DUEÑO / SOCIO PRINCIPAL: ${COMPANY_INFO.partner.name}`, `C.I.: ${COMPANY_INFO.partner.cedula}`]);
  rows.push(['VERIFICACIÓN SI LA TRANSFERENCIA A BANESCO FUE A NOMBRE DE LA EMPRESA O DEL DUEÑO']);
  rows.push([]);

  rows.push([
    'FECHA',
    'MES',
    'BANCO ORIGEN (EMISOR)',
    'BANCO DESTINO (RECEPTOR)',
    'N° REFERENCIA',
    'DESCRIPCIÓN EN ESTADO DE CUENTA',
    'TITULAR EN CUENTA DESTINO BANESCO',
    'TIPO DE TITULAR DESTINO',
    'N° CUENTA DESTINO',
    'MONTO EN BOLÍVARES (Bs.)',
    'TASA BCV DEL DÍA (Bs/$)',
    'MONTO EN DÓLARES ($ USD)',
    'DIAGNÓSTICO DE AUDITORÍA'
  ]);

  auditItems.forEach(item => {
    rows.push([
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
  });

  const totalBs = auditItems.reduce((acc, item) => acc + Math.abs(item.amountBs), 0);
  const totalUSD = auditItems.reduce((acc, item) => acc + item.amountUSD, 0);

  rows.push([]);
  rows.push([
    'TOTAL OPERACIONES INTERNAS Y BANESCO AUDITADAS',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    totalBs,
    '',
    totalUSD,
    `${auditItems.length} Operaciones Registradas`
  ]);

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = [
    { wch: 12 },
    { wch: 10 },
    { wch: 25 },
    { wch: 25 },
    { wch: 16 },
    { wch: 50 },
    { wch: 45 },
    { wch: 32 },
    { wch: 28 },
    { wch: 22 },
    { wch: 20 },
    { wch: 20 },
    { wch: 45 }
  ];

  enhanceWorksheetFormatting(sheet);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Auditoría Trfs Internas');

  const filename = `BANCO_EXPRESS_Auditoria_Transferencias_Internas_y_Banesco.xlsx`;
  XLSX.writeFile(workbook, filename);
}
