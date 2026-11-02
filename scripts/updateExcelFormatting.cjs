const fs = require('fs');
const path = require('path');

const excelExporterPath = path.join(__dirname, '../src/utils/excelExporter.ts');
const internalTransfersExporterPath = path.join(__dirname, '../src/utils/internalTransfersExporter.ts');

let code = fs.readFileSync(excelExporterPath, 'utf8');

// Insert enhanceWorksheetFormatting definition at top
const formattingFunc = `
/**
 * Formatea profesionalmente una hoja de trabajo de Excel (XLSX):
 * 1. Formato numérico explícito con separadores de miles y decimales (Bs. #,##0.00, USD $#,##0.00, Tasa #,##0.0000, % 0.00%).
 * 2. Conversión de texto numérico a tipos de celda de número nativo.
 * 3. Ancho de columnas adaptativo (Auto-Fit) para evitar recorte de texto o errores ###.
 * 4. Activación automática de Filtros en Encabezados (AutoFilter).
 * 5. Habilitación explícita de Líneas de Cuadrícula en Excel (GridLines).
 */
export function enhanceWorksheetFormatting(sheet: XLSX.WorkSheet): XLSX.WorkSheet {
  if (!sheet || !sheet['!ref']) return sheet;

  const range = XLSX.utils.decode_range(sheet['!ref']);
  const colWidths: number[] = [];
  const colTypes: Record<number, 'bs' | 'usd' | 'rate' | 'percent' | 'count' | 'general'> = {};

  // Analizar tipos de columna según encabezados
  for (let C = range.s.c; C <= range.e.c; ++C) {
    let type: 'bs' | 'usd' | 'rate' | 'percent' | 'count' | 'general' = 'general';
    for (let R = range.s.r; R <= Math.min(range.s.r + 25, range.e.r); ++R) {
      const cell = sheet[XLSX.utils.encode_cell({ r: R, c: C })];
      if (cell && cell.v !== undefined && cell.v !== null) {
        const str = String(cell.v).toUpperCase();
        if (str.includes('TASA') || str.includes('BCV') || str.includes('BS/$') || str.includes('CAMBIO')) {
          type = 'rate';
          break;
        } else if (
          str.includes('USD') || str.includes('DÓLARES') || str.includes('DEBE (USD') ||
          str.includes('HABER (USD') || str.includes('ENTRADAS ($') || str.includes('SALIDAS ($') ||
          str.includes('EQUIV') || str.includes('MONTO ($') || str.includes('FLUJO NETO ($')
        ) {
          type = 'usd';
          break;
        } else if (
          str.includes('(BS') || str.includes('BOLÍVARES') || str.includes('DEBE (BS') ||
          str.includes('HABER (BS') || str.includes('ENTRADAS (BS') || str.includes('SALIDAS (BS') ||
          str.includes('MONTO (BS') || str.includes('FLUJO NETO (BS') || str.includes('SALDO (BS') ||
          str.includes('MONTO BS') || (str.includes('SUBTOTAL') && !str.includes('USD'))
        ) {
          type = 'bs';
          break;
        } else if (str.includes('%') || str.includes('PARTICIPACIÓN') || str.includes('PORCENTAJE')) {
          type = 'percent';
          break;
        } else if (str.includes('N°') || str.includes('TRXS') || str.includes('OPERACIONES') || str.includes('CANTIDAD')) {
          type = 'count';
        }
      }
    }
    colTypes[C] = type;
  }

  // Buscar fila principal de tabla para colocar AutoFilter
  let headerRowIndex = -1;
  for (let R = range.s.r; R <= Math.min(range.s.r + 25, range.e.r); ++R) {
    const rowFirstCell = sheet[XLSX.utils.encode_cell({ r: R, c: 0 })];
    if (rowFirstCell && rowFirstCell.v) {
      const txt = String(rowFirstCell.v).toUpperCase();
      if (
        txt.includes('FECHA') || txt.includes('CATEGORÍA') || txt.includes('INSTITUCIÓN') ||
        txt.includes('CÓDIGO') || txt.includes('N°') || txt.includes('CONCEPTO') ||
        txt.includes('BANCO ORIGEN') || txt.includes('TOTAL')
      ) {
        headerRowIndex = R;
        break;
      }
    }
  }

  // Iterar y formatear celda por celda
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = sheet[cellAddress];
      let len = 10;

      if (cell) {
        // Convertir strings formateados como porcentajes a números de JS
        if (cell.t === 's' && typeof cell.v === 'string') {
          const rawStr = cell.v.trim();
          if (rawStr.endsWith('%') && !isNaN(parseFloat(rawStr))) {
            cell.t = 'n';
            cell.v = parseFloat(rawStr) / 100;
            cell.z = '0.00%';
          }
        }

        if (cell.t === 'n' && typeof cell.v === 'number') {
          const colType = colTypes[C];
          if (colType === 'bs') {
            cell.z = '#,##0.00;(#,##0.00);"-"';
          } else if (colType === 'usd') {
            cell.z = '"$"#,##0.00;("$"#,##0.00);"-"';
          } else if (colType === 'rate') {
            cell.z = '#,##0.0000';
          } else if (colType === 'percent') {
            cell.z = '0.00%';
          } else if (colType === 'count') {
            cell.z = '#,##0';
          } else {
            cell.z = Number.isInteger(cell.v) ? '#,##0' : '#,##0.00';
          }

          const formattedSample = Math.abs(cell.v).toLocaleString('es-VE', { minimumFractionDigits: 2 });
          len = Math.max(14, formattedSample.length + 5);
        } else if (cell.v !== undefined && cell.v !== null) {
          len = String(cell.v).length + 3;
        }
      }

      if (!colWidths[C] || len > colWidths[C]) {
        colWidths[C] = Math.min(70, Math.max(12, len));
      }
    }
  }

  // Asignar anchos de columna formateados
  sheet['!cols'] = colWidths.map(w => ({ wch: w }));

  // Activar AutoFilter en tabla si existe encabezado reconocido
  if (headerRowIndex >= 0) {
    sheet['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { r: headerRowIndex, c: range.s.c },
        e: { r: range.e.r, c: range.e.c }
      })
    };
  }

  // Activar líneas de cuadrícula para visualización limpia en Excel PC
  sheet['!views'] = [{ showGridLines: true }];

  return sheet;
}
`;

// Insert enhanceWorksheetFormatting before exportToExcel
code = code.replace('export function exportToExcel(', `${formattingFunc}\n\nexport function exportToExcel(`);

// Wrap sheet additions in exportToExcel
code = code.replace(
  "XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen BANCO EXPRESS');",
  "enhanceWorksheetFormatting(summarySheet);\n  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen BANCO EXPRESS');"
);
code = code.replace(
  "XLSX.utils.book_append_sheet(workbook, bsSheet, 'Balance General');",
  "enhanceWorksheetFormatting(bsSheet);\n  XLSX.utils.book_append_sheet(workbook, bsSheet, 'Balance General');"
);
code = code.replace(
  "XLSX.utils.book_append_sheet(workbook, incSheet, 'Estado de Resultados');",
  "enhanceWorksheetFormatting(incSheet);\n  XLSX.utils.book_append_sheet(workbook, incSheet, 'Estado de Resultados');"
);
code = code.replace(
  "XLSX.utils.book_append_sheet(workbook, tbSheet, 'Balance Comprobacion');",
  "enhanceWorksheetFormatting(tbSheet);\n  XLSX.utils.book_append_sheet(workbook, tbSheet, 'Balance Comprobacion');"
);
code = code.replace(
  "XLSX.utils.book_append_sheet(workbook, entitySheet, 'Detalle Ordenantes y RIF');",
  "enhanceWorksheetFormatting(entitySheet);\n  XLSX.utils.book_append_sheet(workbook, entitySheet, 'Detalle Ordenantes y RIF');"
);
code = code.replace(
  "XLSX.utils.book_append_sheet(workbook, accountingSheet, 'Libro Diario');",
  "enhanceWorksheetFormatting(accountingSheet);\n  XLSX.utils.book_append_sheet(workbook, accountingSheet, 'Libro Diario');"
);
code = code.replace(
  "XLSX.utils.book_append_sheet(workbook, bankSheet, bank.shortName);",
  "enhanceWorksheetFormatting(bankSheet);\n    XLSX.utils.book_append_sheet(workbook, bankSheet, bank.shortName);"
);

// Apply to helpers returning sheet
code = code.replace('return sheet;\n  };', 'return enhanceWorksheetFormatting(sheet);\n  };');

fs.writeFileSync(excelExporterPath, code, 'utf8');
console.log('Updated excelExporter.ts with professional formatting!');

// Now update internalTransfersExporter.ts
let itCode = fs.readFileSync(internalTransfersExporterPath, 'utf8');

// Import enhanceWorksheetFormatting from excelExporter
itCode = itCode.replace(
  "import { BANKS, COMPANY_INFO } from '../data/seedData';",
  "import { BANKS, COMPANY_INFO } from '../data/seedData';\nimport { enhanceWorksheetFormatting } from './excelExporter';"
);

itCode = itCode.replace(
  "XLSX.utils.book_append_sheet(workbook, sheet, 'Auditoría Trfs Internas');",
  "enhanceWorksheetFormatting(sheet);\n  XLSX.utils.book_append_sheet(workbook, sheet, 'Auditoría Trfs Internas');"
);

fs.writeFileSync(internalTransfersExporterPath, itCode, 'utf8');
console.log('Updated internalTransfersExporter.ts with professional formatting!');
