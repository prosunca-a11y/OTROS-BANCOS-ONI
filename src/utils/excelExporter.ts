import ExcelJS from 'exceljs';
import { BankTransaction, BankId } from '../types/bank';
import { BANKS, CATEGORIES, COMPANY_INFO, SEED_INITIAL_BALANCES, SEED_STATEMENT_CLOSING_BALANCES } from '../data/seedData';
import { generateAccountingEntry } from './accounting';
import { getBalanceSheet, getIncomeStatement, getTrialBalance } from './financialStatements';

// Color Palette Constants for Executive Bank Spreadsheets
const COLOR_NAVY_TITLE = 'FF0F172A';     // Dark Slate Navy banner fill
const COLOR_INDIGO_HEADER = 'FF1E1B4B';  // Deep Indigo header fill
const COLOR_BLUE_HEADER = 'FF1E3A8A';    // Deep Blue table header fill
const COLOR_SLATE_SECTION = 'FF334155';  // Slate section banner fill
const COLOR_ZEBRA_ROW = 'FFF8FAFC';     // Soft zebra striping fill
const COLOR_GOLD_TOTAL = 'FFFEF3C7';     // Gold/Amber total callout fill
const COLOR_BORDER_LIGHT = 'FFE2E8F0';   // Light gray grid border
const COLOR_BORDER_DARK = 'FF0F172A';    // Dark border for headers/totals

/**
 * Guarda y descarga el libro de trabajo de ExcelJS en el navegador.
 */
async function saveWorkbook(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

/**
 * Aplica formato automático de anchos de columna, bordes y estilos de vista en ExcelJS
 */
function autoFitColumnsAndSetGridlines(sheet: ExcelJS.Worksheet) {
  sheet.views = [{ showGridLines: true }];

  sheet.columns.forEach(column => {
    let maxLen = 12;
    column.eachCell?.({ includeEmpty: false }, cell => {
      const valStr = cell.value ? String(cell.value) : '';
      if (!valStr.startsWith('BANCO EXPRESS') && !valStr.startsWith('Certificamos') && valStr.length < 90) {
        if (valStr.length > maxLen) {
          maxLen = valStr.length;
        }
      }
    });
    column.width = Math.min(65, maxLen + 4);
  });
}

/**
 * Crea la cabecera corporativa estandarizada en la hoja de Excel
 */
function buildHeaderBanner(
  sheet: ExcelJS.Worksheet,
  title: string,
  numCols: number = 8,
  subtitleInfo?: string[]
) {
  // Fila 1: Título de la Aplicación y Reporte
  const titleRow = sheet.addRow([title]);
  sheet.mergeCells(1, 1, 1, numCols);
  const titleCell = titleRow.getCell(1);
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY_TITLE } };
  titleCell.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  titleRow.height = 32;

  // Fila 2: Datos de la Empresa
  const companyRow = sheet.addRow([
    `EMPRESA TITULAR: ${COMPANY_INFO.name}`,
    `RIF: ${COMPANY_INFO.rif}`,
    `REPRESENTANTE LEGAL: ${COMPANY_INFO.partner.name}`,
    `C.I.: ${COMPANY_INFO.partner.cedula}`
  ]);
  companyRow.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF334155' } };

  // Subtítulos opcionales
  if (subtitleInfo) {
    subtitleInfo.forEach(info => {
      const r = sheet.addRow([info]);
      r.font = { name: 'Arial', size: 8.5, italic: true, color: { argb: 'FF64748B' } };
    });
  }

  sheet.addRow([]); // Espaciado
}

/**
 * Agrega el bloque oficial de firmas al final de la hoja
 */
function addSignatureBlock(sheet: ExcelJS.Worksheet, bankName?: string) {
  sheet.addRow([]);
  sheet.addRow([]);

  const rLine = sheet.addRow([
    '________________________________________',
    '',
    '________________________________________',
    '',
    '________________________________________'
  ]);
  rLine.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF64748B' } };

  const rName = sheet.addRow([
    `${COMPANY_INFO.partner.name}`,
    '',
    `${COMPANY_INFO.accountant.name} (${COMPANY_INFO.accountant.cpc})`,
    '',
    bankName ? `${bankName} - Recepción` : 'Entidad Bancaria Receptora'
  ]);
  rName.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0F172A' } };

  const rTitle = sheet.addRow([
    `${COMPANY_INFO.partner.title}`,
    '',
    `${COMPANY_INFO.accountant.title}`,
    '',
    'Conformidad y Recepción Documental'
  ]);
  rTitle.font = { name: 'Arial', size: 8.5, color: { argb: 'FF64748B' } };
}

// ============================================================================
// 1. EXPORTACIÓN PRINCIPAL DEL INFORME CONSOLIDADO EJECUTIVO
// ============================================================================
export async function exportToExcel(
  transactions: BankTransaction[],
  periodLabel: string = 'Enero-Agosto 2026'
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BANCO EXPRESS - AGRÍCOLA ONI C.A.';
  workbook.created = new Date();

  // --------------------------------------------------------------------------
  // HOJA 1: RESUMEN CONSOLIDADO BANCO EXPRESS
  // --------------------------------------------------------------------------
  const sheetSummary = workbook.addWorksheet('Resumen BANCO EXPRESS');
  buildHeaderBanner(
    sheetSummary,
    'BANCO EXPRESS - INFORME EJECUTIVO CONSOLIDADO MULTI-BANCO Y CONCILIACIÓN',
    8,
    [
      `PERÍODO AUDITADO: ${periodLabel.toUpperCase()} | FECHA EMISIÓN: ${new Date().toISOString().split('T')[0]}`,
      `PARIDAD Y CONVERSIÓN DE DIVISAS: Tasa Oficial de Venta del Banco Central de Venezuela (BCV)`
    ]
  );

  // Sección 1: Categorías
  const sec1Row = sheetSummary.addRow(['I. RESUMEN CONSOLIDADO POR CATEGORÍA DE OPERACIÓN']);
  sheetSummary.mergeCells(sec1Row.number, 1, sec1Row.number, 8);
  sec1Row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_INDIGO_HEADER } };
  sec1Row.getCell(1).font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
  sec1Row.height = 24;

  const headerCatRow = sheetSummary.addRow([
    'CATEGORÍA DE OPERACIÓN',
    'ENTRADAS / CRÉDITOS (Bs.)',
    'SALIDAS / DÉBITOS (Bs.)',
    'FLUJO NETO (Bs.)',
    'ENTRADAS ($ USD)',
    'SALIDAS ($ USD)',
    'FLUJO NETO ($ USD)',
    'N° TRXS'
  ]);
  headerCatRow.height = 24;
  headerCatRow.eachCell((cell, colNum) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_BLUE_HEADER } };
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: colNum === 1 ? 'left' : 'right' };
  });

  let totalIncBs = 0, totalExpBs = 0, totalIncUSD = 0, totalExpUSD = 0, totalCount = 0;

  CATEGORIES.forEach((cat, idx) => {
    const catTxs = transactions.filter(t => t.category === cat.id);
    const incBs = catTxs.filter(t => t.amountBs > 0).reduce((a, t) => a + t.amountBs, 0);
    const expBs = catTxs.filter(t => t.amountBs < 0).reduce((a, t) => a + Math.abs(t.amountBs), 0);
    const netBs = incBs - expBs;

    const incUSD = catTxs.filter(t => t.amountBs > 0).reduce((a, t) => a + t.amountUSD, 0);
    const expUSD = catTxs.filter(t => t.amountBs < 0).reduce((a, t) => a + t.amountUSD, 0);
    const netUSD = incUSD - expUSD;

    totalIncBs += incBs;
    totalExpBs += expBs;
    totalIncUSD += incUSD;
    totalExpUSD += expUSD;
    totalCount += catTxs.length;

    const dataRow = sheetSummary.addRow([
      cat.name,
      incBs,
      expBs,
      netBs,
      incUSD,
      expUSD,
      netUSD,
      catTxs.length
    ]);

    dataRow.height = 20;
    dataRow.eachCell((cell, colIndex) => {
      cell.font = { name: 'Calibri', size: 10 };
      if (idx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ZEBRA_ROW } };
      }
      cell.border = {
        top: { style: 'thin', color: { argb: COLOR_BORDER_LIGHT } },
        bottom: { style: 'thin', color: { argb: COLOR_BORDER_LIGHT } },
        left: { style: 'thin', color: { argb: COLOR_BORDER_LIGHT } },
        right: { style: 'thin', color: { argb: COLOR_BORDER_LIGHT } }
      };

      if (colIndex >= 2 && colIndex <= 4) {
        cell.numFmt = '#,##0.00;[Red](#,##0.00);"-"';
        cell.alignment = { horizontal: 'right' };
      } else if (colIndex >= 5 && colIndex <= 7) {
        cell.numFmt = '"$"#,##0.00;[Red]("$"#,##0.00);"-"';
        cell.alignment = { horizontal: 'right' };
      } else if (colIndex === 8) {
        cell.numFmt = '#,##0';
        cell.alignment = { horizontal: 'center' };
      }
    });
  });

  // Totales Categoría
  const totCatRow = sheetSummary.addRow([
    'TOTAL GENERAL CONSOLIDADO EMPRESA',
    totalIncBs,
    totalExpBs,
    totalIncBs - totalExpBs,
    totalIncUSD,
    totalExpUSD,
    totalIncUSD - totalExpUSD,
    totalCount
  ]);
  totCatRow.height = 24;
  totCatRow.eachCell((cell, colIndex) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GOLD_TOTAL } };
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    cell.border = {
      top: { style: 'thin', color: { argb: COLOR_BORDER_DARK } },
      bottom: { style: 'double', color: { argb: COLOR_BORDER_DARK } }
    };
    if (colIndex >= 2 && colIndex <= 4) {
      cell.numFmt = '#,##0.00;[Red](#,##0.00);"-"';
      cell.alignment = { horizontal: 'right' };
    } else if (colIndex >= 5 && colIndex <= 7) {
      cell.numFmt = '"$"#,##0.00;[Red]("$"#,##0.00);"-"';
      cell.alignment = { horizontal: 'right' };
    } else if (colIndex === 8) {
      cell.numFmt = '#,##0';
      cell.alignment = { horizontal: 'center' };
    }
  });

  sheetSummary.addRow([]); // Espacio

  // Sección 2: Bancos
  const sec2Row = sheetSummary.addRow(['II. RESUMEN COMPARATIVO POR BANCO INDEPENDIENTE (CONCILIACIÓN)']);
  sheetSummary.mergeCells(sec2Row.number, 1, sec2Row.number, 8);
  sec2Row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_INDIGO_HEADER } };
  sec2Row.getCell(1).font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
  sec2Row.height = 24;

  const headerBankRow = sheetSummary.addRow([
    'INSTITUCIÓN BANCARIA',
    'NÚMERO DE CUENTA',
    'TOTAL ENTRADAS (Bs.)',
    'TOTAL SALIDAS (Bs.)',
    'SALDO OPERACIONES (Bs.)',
    'ENTRADAS ($ USD)',
    'SALIDAS ($ USD)',
    'SALDO OPERACIONES ($ USD)'
  ]);
  headerBankRow.height = 24;
  headerBankRow.eachCell((cell, colNum) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_BLUE_HEADER } };
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: colNum <= 2 ? 'left' : 'right' };
  });

  BANKS.forEach((bank, idx) => {
    const bankTxs = transactions.filter(t => t.bankId === bank.id);
    const bIncBs = bankTxs.filter(t => t.amountBs > 0).reduce((a, b) => a + b.amountBs, 0);
    const bExpBs = bankTxs.filter(t => t.amountBs < 0).reduce((a, b) => a + Math.abs(b.amountBs), 0);
    const bNetBs = bIncBs - bExpBs;

    const bIncUSD = bankTxs.filter(t => t.amountBs > 0).reduce((a, b) => a + b.amountUSD, 0);
    const bExpUSD = bankTxs.filter(t => t.amountBs < 0).reduce((a, b) => a + b.amountUSD, 0);
    const bNetUSD = bIncUSD - bExpUSD;

    const bRow = sheetSummary.addRow([
      bank.name,
      bank.accountNumber,
      bIncBs,
      bExpBs,
      bNetBs,
      bIncUSD,
      bExpUSD,
      bNetUSD
    ]);
    bRow.height = 20;
    bRow.eachCell((cell, colIndex) => {
      cell.font = { name: 'Calibri', size: 10 };
      if (idx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ZEBRA_ROW } };
      }
      cell.border = {
        top: { style: 'thin', color: { argb: COLOR_BORDER_LIGHT } },
        bottom: { style: 'thin', color: { argb: COLOR_BORDER_LIGHT } },
        left: { style: 'thin', color: { argb: COLOR_BORDER_LIGHT } },
        right: { style: 'thin', color: { argb: COLOR_BORDER_LIGHT } }
      };

      if (colIndex >= 3 && colIndex <= 5) {
        cell.numFmt = '#,##0.00;[Red](#,##0.00);"-"';
        cell.alignment = { horizontal: 'right' };
      } else if (colIndex >= 6 && colIndex <= 8) {
        cell.numFmt = '"$"#,##0.00;[Red]("$"#,##0.00);"-"';
        cell.alignment = { horizontal: 'right' };
      }
    });
  });

  addSignatureBlock(sheetSummary);
  autoFitColumnsAndSetGridlines(sheetSummary);

/**
 * Crea el encabezado oficial estandarizado de 4 líneas para Estados Financieros
 * Línea 1: Nombre de la Empresa
 * Línea 2: RIF
 * Línea 3: Título del Estado Financiero y Período
 * Línea 4: Expresado en Bolívares y en Dólares
 */
function buildOfficial4LineHeader(
  sheet: ExcelJS.Worksheet,
  statementTitle: string,
  periodText: string,
  numCols: number = 4
) {
  // Línea 1: Nombre de la Empresa
  const r1 = sheet.addRow([COMPANY_INFO.name]);
  sheet.mergeCells(r1.number, 1, r1.number, numCols);
  r1.getCell(1).font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FF0F172A' } };
  r1.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  r1.height = 24;

  // Línea 2: RIF
  const r2 = sheet.addRow([`R.I.F.: ${COMPANY_INFO.rif}`]);
  sheet.mergeCells(r2.number, 1, r2.number, numCols);
  r2.getCell(1).font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF334155' } };
  r2.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  r2.height = 20;

  // Línea 3: Título y Período
  const r3 = sheet.addRow([`${statementTitle.toUpperCase()} ${periodText.toUpperCase()}`]);
  sheet.mergeCells(r3.number, 1, r3.number, numCols);
  r3.getCell(1).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E1B4B' } };
  r3.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  r3.height = 22;

  // Línea 4: Expresado en Bolívares y en Dólares
  const r4 = sheet.addRow(['Expresado en Bolívares (Bs.) y en Dólares ($ USD)']);
  sheet.mergeCells(r4.number, 1, r4.number, numCols);
  r4.getCell(1).font = { name: 'Arial', size: 10, italic: true, bold: true, color: { argb: 'FF475569' } };
  r4.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  r4.height = 20;

  sheet.addRow([]); // Espaciado
}

  // --------------------------------------------------------------------------
  // HOJA 2: BALANCE GENERAL (ESTADO DE SITUACIÓN FINANCIERA)
  // --------------------------------------------------------------------------
  const bs = getBalanceSheet(transactions);
  const sheetBS = workbook.addWorksheet('Balance General');
  buildOfficial4LineHeader(
    sheetBS,
    'ESTADO DE SITUACIÓN FINANCIERA (BALANCE GENERAL)',
    'CORTADO AL 31 DE AGOSTO DE 2026',
    4
  );

  const headerBSRow = sheetBS.addRow(['CÓDIGO', 'RUBRO PATRIMONIAL / CUENTA CONTABLE', 'MONTO EN BOLÍVARES (Bs.)', 'EQUIVALENTE EN DÓLARES (USD)']);
  headerBSRow.height = 24;
  headerBSRow.eachCell((cell, colNum) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_BLUE_HEADER } };
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: colNum <= 2 ? 'left' : 'right' };
  });

  const addBsLine = (code: string, concept: string, bsVal: number, usdVal: number, isHeader = false, isTotal = false) => {
    const row = sheetBS.addRow([code, concept, bsVal, usdVal]);
    row.height = isHeader ? 22 : isTotal ? 24 : 19;
    row.eachCell((cell, colNum) => {
      if (isHeader) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      } else if (isTotal) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GOLD_TOTAL } };
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'double' } };
      } else {
        cell.font = { name: 'Calibri', size: 10 };
        cell.border = { top: { style: 'thin', color: { argb: COLOR_BORDER_LIGHT } }, bottom: { style: 'thin', color: { argb: COLOR_BORDER_LIGHT } } };
      }

      if (colNum === 3) {
        cell.numFmt = '#,##0.00;[Red](#,##0.00);"-"';
        cell.alignment = { horizontal: 'right' };
      } else if (colNum === 4) {
        cell.numFmt = '"$"#,##0.00;[Red]("$"#,##0.00);"-"';
        cell.alignment = { horizontal: 'right' };
      }
    });
  };

  addBsLine('1.1', 'ACTIVO CORRIENTE (CIRCULANTE)', 0, 0, true);
  bs.assets.banks.forEach(b => {
    addBsLine('1.1.01', `   Efectivo y Bancos (${b.bankName})`, b.balanceBs, b.balanceUSD);
  });
  addBsLine('1.1.02', '   Cuentas por Cobrar Socios - Transferencias Fondos Banesco', bs.assets.receivablesSociosBanescoBs, bs.assets.receivablesSociosBanescoUSD);
  addBsLine('1.1.03', '   Cuentas por Cobrar Socios - Mutuo Manuel Becerra', bs.assets.receivablesBecerraBs, bs.assets.receivablesBecerraUSD);
  addBsLine('1.1.04', '   Retenciones ISLR Clientes', bs.assets.islrRetainedClientsBs, bs.assets.islrRetainedClientsUSD);
  addBsLine('1.1.05', '   ISLR Pagado por Anticipado / Crédito Fiscal Exigible', bs.assets.islrPrepaidBs, bs.assets.islrPrepaidUSD);
  addBsLine('1.1.99', 'TOTAL ACTIVO CORRIENTE', bs.assets.totalCurrentAssetsBs, bs.assets.totalCurrentAssetsUSD, false, true);

  sheetBS.addRow([]);
  addBsLine('1.2', 'PROPIEDAD, PLANTA Y EQUIPO (NO CORRIENTE)', 0, 0, true);
  addBsLine('1.2.99', 'TOTAL PROPIEDAD, PLANTA Y EQUIPO NETO', bs.assets.fixedAssetsNetBs, bs.assets.fixedAssetsNetUSD, false, true);

  sheetBS.addRow([]);
  addBsLine('1.0.00', 'TOTAL ACTIVO', bs.assets.totalAssetsBs, bs.assets.totalAssetsUSD, false, true);

  sheetBS.addRow([]);
  addBsLine('2.1', 'PASIVO CORRIENTE (CIRCULANTE)', 0, 0, true);
  addBsLine('2.1.01', '   Anticipos Recibidos de Clientes (NIIF 15)', bs.liabilities.customerAdvancesBs, bs.liabilities.customerAdvancesUSD);
  addBsLine('2.1.02', '   Retención de ISLR por Pagar', bs.liabilities.islrRetainedPayableBs, bs.liabilities.islrRetainedPayableUSD);
  addBsLine('2.1.03', '   Cuentas por Pagar Socios (Aportes Accionista Elías Trías)', bs.liabilities.partnerPayableEliasBs, bs.liabilities.partnerPayableEliasUSD);
  addBsLine('2.1.04', '   ISLR por Pagar / Tributos Retenidos', bs.liabilities.islrTaxesPayableBs, bs.liabilities.islrTaxesPayableUSD);
  addBsLine('2.0.00', 'TOTAL PASIVO CORRIENTE', bs.liabilities.totalLiabilitiesBs, bs.liabilities.totalLiabilitiesUSD, false, true);

  sheetBS.addRow([]);
  addBsLine('3.1', 'PATRIMONIO NETO', 0, 0, true);
  addBsLine('3.1.01', '   Capital Social Suscrito y Pagado', bs.equity.capitalSocialBs, bs.equity.capitalSocialUSD);
  addBsLine('3.1.02', '   Resultados Acumulados (Ejercicios Anteriores)', bs.equity.accumulatedSurplusBs, bs.equity.accumulatedSurplusUSD);
  addBsLine('3.1.03', '   Ganancia Neta del Ejercicio (Ene-Ago 2026)', bs.equity.netProfitBs, bs.equity.netProfitUSD);
  addBsLine('3.1.04', '   Reserva Legal (5%)', bs.equity.legalReserveBs, bs.equity.legalReserveUSD);
  addBsLine('3.1.99', 'TOTAL PATRIMONIO NETO', bs.equity.totalEquityBs, bs.equity.totalEquityUSD, false, true);

  sheetBS.addRow([]);
  addBsLine('3.0.00', 'TOTAL PASIVO Y PATRIMONIO NETO', bs.totalLiabilitiesAndEquityBs, bs.totalLiabilitiesAndEquityUSD, false, true);

  addSignatureBlock(sheetBS);
  autoFitColumnsAndSetGridlines(sheetBS);

  // --------------------------------------------------------------------------
  // HOJA 3: ESTADO DE RESULTADOS (P&L)
  // --------------------------------------------------------------------------
  const inc = getIncomeStatement(transactions);
  const sheetInc = workbook.addWorksheet('Estado de Resultados');
  buildOfficial4LineHeader(
    sheetInc,
    'ESTADO DE RESULTADOS INTEGRALES (GANANCIAS Y PÉRDIDAS)',
    'DEL 01 DE ENERO AL 31 DE AGOSTO DE 2026',
    4
  );

  const headerIncRow = sheetInc.addRow(['CÓDIGO', 'CONCEPTO / CUENTA DE INGRESOS Y GASTOS', 'MONTO EN BOLÍVARES (Bs.)', 'EQUIVALENTE EN DÓLARES (USD)']);
  headerIncRow.height = 24;
  headerIncRow.eachCell((cell, colNum) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_BLUE_HEADER } };
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: colNum <= 2 ? 'left' : 'right' };
  });

  inc.incomeBreakdown.forEach(item => {
    const row = sheetInc.addRow(['4.1.01', item.concept, item.amountBs, item.amountUSD]);
    row.getCell(3).numFmt = '#,##0.00;[Red](#,##0.00);"-"';
    row.getCell(4).numFmt = '"$"#,##0.00;[Red]("$"#,##0.00);"-"';
  });

  const totIncRow = sheetInc.addRow(['4.1.99', 'TOTAL INGRESOS OPERACIONALES', inc.totalIncomeBs, inc.totalIncomeUSD]);
  totIncRow.eachCell(c => { c.font = { bold: true }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }; });
  totIncRow.getCell(3).numFmt = '#,##0.00'; totIncRow.getCell(4).numFmt = '"$"#,##0.00';

  sheetInc.addRow([]);
  inc.expenseBreakdown.forEach(item => {
    const row = sheetInc.addRow(['5.1.01', item.concept, item.amountBs, item.amountUSD]);
    row.getCell(3).numFmt = '#,##0.00;[Red](#,##0.00);"-"';
    row.getCell(4).numFmt = '"$"#,##0.00;[Red]("$"#,##0.00);"-"';
  });

  const totExpRow = sheetInc.addRow(['5.1.99', 'TOTAL COSTOS Y GASTOS OPERACIONALES', inc.totalExpenseBs, inc.totalExpenseUSD]);
  totExpRow.eachCell(c => { c.font = { bold: true }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }; });
  totExpRow.getCell(3).numFmt = '#,##0.00'; totExpRow.getCell(4).numFmt = '"$"#,##0.00';

  sheetInc.addRow([]);
  const netProfitRow = sheetInc.addRow(['5.0.00', 'UTILIDAD NETA DEL EJERCICIO (01/01/2026 AL 31/08/2026)', inc.netProfitBs, inc.netProfitUSD]);
  netProfitRow.height = 26;
  netProfitRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GOLD_TOTAL } };
    cell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'double' } };
  });
  netProfitRow.getCell(3).numFmt = '#,##0.00;[Red](#,##0.00);"-"';
  netProfitRow.getCell(4).numFmt = '"$"#,##0.00;[Red]("$"#,##0.00);"-"';

  addSignatureBlock(sheetInc);
  autoFitColumnsAndSetGridlines(sheetInc);

  // --------------------------------------------------------------------------
  // HOJA 4: BALANCE DE COMPROBACIÓN
  // --------------------------------------------------------------------------
  const tb = getTrialBalance(transactions);
  const sheetTB = workbook.addWorksheet('Balance Comprobacion');
  buildOfficial4LineHeader(
    sheetTB,
    'BALANCE DE COMPROBACIÓN DE SUMAS Y SALDOS',
    'AL 31 DE AGOSTO DE 2026',
    7
  );

  const headerTB = sheetTB.addRow(['CÓDIGO', 'NOMBRE DE LA CUENTA CONTABLE', 'DEBE (Bs.)', 'HABER (Bs.)', 'SALDO DEUDOR (Bs.)', 'SALDO ACREEDOR (Bs.)', 'SALDO ($ USD)']);
  headerTB.height = 24;
  headerTB.eachCell((cell, colIndex) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_BLUE_HEADER } };
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: colIndex <= 2 ? 'left' : 'right' };
  });

  tb.items.forEach(item => {
    const row = sheetTB.addRow([
      item.code,
      item.name,
      item.debitBs,
      item.creditBs,
      item.saldoDeudorBs,
      item.saldoAcreedorBs,
      item.saldoDeudorUSD > 0 ? item.saldoDeudorUSD : item.saldoAcreedorUSD
    ]);
    row.height = 19;
    row.eachCell((cell, colIndex) => {
      cell.font = { name: 'Calibri', size: 9.5 };
      if (colIndex >= 3 && colIndex <= 6) {
        cell.numFmt = '#,##0.00;[Red](#,##0.00);"-"';
        cell.alignment = { horizontal: 'right' };
      } else if (colIndex === 7) {
        cell.numFmt = '"$"#,##0.00;[Red]("$"#,##0.00);"-"';
        cell.alignment = { horizontal: 'right' };
      }
    });
  });

  const totTBRow = sheetTB.addRow([
    'TOTALES',
    'TOTALES GENERALES (PARTIDA DOBLE CUADRADA)',
    tb.totalDebitBs,
    tb.totalCreditBs,
    tb.totalFinalDebitBs,
    tb.totalFinalCreditBs,
    tb.totalFinalDebitUSD
  ]);
  totTBRow.height = 24;
  totTBRow.eachCell((cell, colIndex) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GOLD_TOTAL } };
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'double' } };
    if (colIndex >= 3 && colIndex <= 6) {
      cell.numFmt = '#,##0.00';
      cell.alignment = { horizontal: 'right' };
    } else if (colIndex === 7) {
      cell.numFmt = '"$"#,##0.00';
      cell.alignment = { horizontal: 'right' };
    }
  });

  addSignatureBlock(sheetTB);
  autoFitColumnsAndSetGridlines(sheetTB);

  // --------------------------------------------------------------------------
  // HOJA 5: DETALLE ORDENANTES Y RIF
  // --------------------------------------------------------------------------
  const sheetDet = workbook.addWorksheet('Detalle Ordenantes y RIF');
  buildHeaderBanner(
    sheetDet,
    'BANCO EXPRESS - DETALLE DE OPERACIONES, ORDENANTES Y RIF',
    13
  );

  const headerDet = sheetDet.addRow([
    'FECHA', 'BANCO', 'REFERENCIA', 'ORDENANTE / REMITENTE / BENEFICIARIO',
    'TIPO PERSONA', 'DOCUMENTO (RIF/C.I.)', 'BANCO CUENTA ORIGEN/DESTINO',
    'DESCRIPCIÓN OPERACIÓN', 'CATEGORÍA', 'TIPO', 'MONTO (Bs.)', 'TASA BCV', 'MONTO ($ USD)'
  ]);
  headerDet.height = 24;
  headerDet.eachCell((cell, colIndex) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_BLUE_HEADER } };
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  transactions.forEach(tx => {
    const bank = BANKS.find(b => b.id === tx.bankId);
    const cat = CATEGORIES.find(c => c.id === tx.category);

    const row = sheetDet.addRow([
      tx.date,
      bank ? bank.shortName : tx.bankId,
      tx.reference,
      tx.entityName || 'No Identificado',
      tx.personType || 'N/A',
      tx.entityDoc || 'N/A',
      tx.bankAccountDetail || 'N/A',
      tx.description,
      cat ? cat.name : tx.category,
      tx.type === 'income' ? 'ENTRADA' : 'SALIDA',
      tx.amountBs,
      tx.exchangeRate,
      tx.amountUSD
    ]);

    row.getCell(11).numFmt = '#,##0.00;[Red](#,##0.00);"-"';
    row.getCell(12).numFmt = '#,##0.0000';
    row.getCell(13).numFmt = '"$"#,##0.00;[Red]("$"#,##0.00);"-"';
  });

  addSignatureBlock(sheetDet);
  autoFitColumnsAndSetGridlines(sheetDet);

  // --------------------------------------------------------------------------
  // HOJAS INDIVIDUALES POR BANCO
  // --------------------------------------------------------------------------
  BANKS.forEach(bank => {
    const bankTxs = transactions.filter(t => t.bankId === bank.id);
    const sheetB = workbook.addWorksheet(bank.shortName);
    buildHeaderBanner(
      sheetB,
      `BANCO EXPRESS - ESTADO DE CUENTA (${bank.name.toUpperCase()})`,
      12,
      [`CUENTA N°: ${bank.accountNumber}`]
    );

    const headB = sheetB.addRow([
      'N°', 'FECHA', 'REFERENCIA', 'ORDENANTE / BENEFICIARIO', 'RIF / C.I.',
      'DESCRIPCIÓN', 'CATEGORÍA', 'DÉBITO (Bs.)', 'CRÉDITO (Bs.)', 'MONTO NETO (Bs.)', 'TASA BCV', 'MONTO ($ USD)'
    ]);
    headB.height = 24;
    headB.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_BLUE_HEADER } };
      cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    bankTxs.forEach((tx, idx) => {
      const cat = CATEGORIES.find(c => c.id === tx.category);
      const row = sheetB.addRow([
        idx + 1,
        tx.date,
        tx.reference,
        tx.entityName || 'N/A',
        tx.entityDoc || 'N/A',
        tx.description,
        cat ? cat.name : tx.category,
        tx.amountBs < 0 ? Math.abs(tx.amountBs) : 0,
        tx.amountBs > 0 ? tx.amountBs : 0,
        tx.amountBs,
        tx.exchangeRate,
        tx.amountUSD
      ]);

      row.getCell(8).numFmt = '#,##0.00';
      row.getCell(9).numFmt = '#,##0.00';
      row.getCell(10).numFmt = '#,##0.00;[Red](#,##0.00);"-"';
      row.getCell(11).numFmt = '#,##0.0000';
      row.getCell(12).numFmt = '"$"#,##0.00;[Red]("$"#,##0.00);"-"';
    });

    addSignatureBlock(sheetB, bank.name);
    autoFitColumnsAndSetGridlines(sheetB);
  });

  const filename = `BANCO_EXPRESS_Informe_Estados_Financieros_${COMPANY_INFO.name.replace(/\s+/g, '_')}_${periodLabel.replace(/\s+/g, '_')}.xlsx`;
  await saveWorkbook(workbook, filename);
}

// ============================================================================
// 2. EXPORTACIÓN DEL INFORME DE BANCO Y CATEGORÍAS MENSUAL
// ============================================================================
export async function exportBankMonthlyCategoryReport(
  bankId: BankId | 'all',
  transactions: BankTransaction[],
  closingBalances: Record<string, number> = SEED_STATEMENT_CLOSING_BALANCES,
  periodLabel: string = 'Enero-Agosto 2026'
) {
  const workbook = new ExcelJS.Workbook();
  const targetBanks = bankId === 'all' ? BANKS : BANKS.filter(b => b.id === bankId);

  targetBanks.forEach(b => {
    const sheet = workbook.addWorksheet(b.shortName);
    buildHeaderBanner(
      sheet,
      `BANCO EXPRESS - INFORME AUDITADO POR CATEGORÍAS Y MESES (${b.name.toUpperCase()})`,
      12,
      [`CUENTA BANCARIA N°: ${b.accountNumber} | RIF BANCO: ${b.rif || 'N/A'}`]
    );

    const bankTxs = transactions.filter(t => t.bankId === b.id);
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago'];
    const monthKeys = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'];

    const headerRow = sheet.addRow(['CATEGORÍA DE OPERACIÓN', ...months, 'TOTAL BS.', 'TOTAL USD', 'N° TRXS']);
    headerRow.height = 24;
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_BLUE_HEADER } };
      cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    CATEGORIES.forEach(cat => {
      const catTxs = bankTxs.filter(t => t.category === cat.id);
      const monthVals = monthKeys.map(m => {
        return catTxs.filter(t => t.date.startsWith(m)).reduce((s, t) => s + Math.abs(t.amountBs), 0);
      });
      const totBs = catTxs.reduce((s, t) => s + Math.abs(t.amountBs), 0);
      const totUSD = catTxs.reduce((s, t) => s + t.amountUSD, 0);

      const row = sheet.addRow([cat.name, ...monthVals, totBs, totUSD, catTxs.length]);
      row.eachCell((cell, colIndex) => {
        if (colIndex >= 2 && colIndex <= 10) {
          cell.numFmt = '#,##0.00;[Red](#,##0.00);"-"';
          cell.alignment = { horizontal: 'right' };
        } else if (colIndex === 11) {
          cell.numFmt = '"$"#,##0.00;[Red]("$"#,##0.00);"-"';
          cell.alignment = { horizontal: 'right' };
        } else if (colIndex === 12) {
          cell.numFmt = '#,##0';
          cell.alignment = { horizontal: 'center' };
        }
      });
    });

    addSignatureBlock(sheet, b.name);
    autoFitColumnsAndSetGridlines(sheet);
  });

  const filename = `BANCO_EXPRESS_Informe_Mensual_Categorias_${periodLabel.replace(/\s+/g, '_')}.xlsx`;
  await saveWorkbook(workbook, filename);
}

// ============================================================================
// 3. EXPORTACIÓN DE ESTADOS FINANCIEROS AUDITADOS OFICIALES
// ============================================================================
export async function exportOfficialBanescoFinancialStatementsExcel(
  transactions: BankTransaction[],
  periodLabel: string = 'Cortado al 31 de Agosto de 2026'
) {
  await exportToExcel(transactions, periodLabel);
}

// ============================================================================
// 4. EXPORTACIÓN DEL LIBRO DIARIO DE CONTABILIDAD
// ============================================================================
export async function exportAccountingJournalExcel(
  transactions: BankTransaction[],
  periodLabel: string = 'Enero-Agosto 2026'
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Libro Diario');

  buildHeaderBanner(
    sheet,
    'BANCO EXPRESS - LIBRO DIARIO OFICIAL DE CONTABILIDAD (VEN-NIF)',
    12,
    [`PERÍODO: ${periodLabel.toUpperCase()}`]
  );

  const headerRow = sheet.addRow([
    'N° ASIENTO', 'FECHA', 'BANCO', 'REFERENCIA', 'CONCEPTO',
    'CÓDIGO DEBE', 'CUENTA DEBE', 'DEBE (Bs.)', 'CÓDIGO HABER', 'CUENTA HABER', 'HABER (Bs.)', 'TASA BCV'
  ]);
  headerRow.height = 24;
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_BLUE_HEADER } };
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  transactions.forEach((tx, idx) => {
    const entry = generateAccountingEntry(tx);
    const bank = BANKS.find(b => b.id === tx.bankId);

    const row = sheet.addRow([
      idx + 1,
      tx.date,
      bank ? bank.shortName : tx.bankId,
      tx.reference,
      tx.description,
      entry.debitAccountCode,
      entry.debitAccountName,
      entry.debitBs,
      entry.creditAccountCode,
      entry.creditAccountName,
      entry.creditBs,
      tx.exchangeRate
    ]);

    row.getCell(8).numFmt = '#,##0.00';
    row.getCell(11).numFmt = '#,##0.00';
    row.getCell(12).numFmt = '#,##0.0000';
  });

  addSignatureBlock(sheet);
  autoFitColumnsAndSetGridlines(sheet);

  const filename = `Libro_Diario_Asientos_Contables_Agricola_ONI_${periodLabel.replace(/\s+/g, '_')}.xlsx`;
  await saveWorkbook(workbook, filename);
}
