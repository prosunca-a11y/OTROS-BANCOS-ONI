import { BankTransaction, AccountingEntry, BankId } from '../types/bank';
import { BANKS, CATEGORIES } from '../data/seedData';

/**
 * Genera el asiento contable en partida doble (Debe y Haber) para una transacción dada
 */
export function generateAccountingEntry(tx: BankTransaction): AccountingEntry {
  const bank = BANKS.find(b => b.id === tx.bankId);
  const bankName = bank ? bank.shortName : tx.bankId;
  const isIncome = tx.amountBs > 0;
  const absBs = Math.abs(tx.amountBs);
  const absUSD = Math.abs(tx.amountUSD);

  let debitCode = '1.1.01.01';
  let debitName = `Banco ${bankName} (Bs.)`;
  let creditCode = '4.1.01.01';
  let creditName = 'Ingresos Operacionales';

  switch (tx.category) {
    case 'transferencia_interna':
      if (isIncome) {
        debitCode = `1.1.01.01`;
        debitName = `Banco ${bankName} (Cuenta Receptor)`;
        creditCode = `1.1.02.01`;
        creditName = `Transferencias Internas por Liquidar (Agrícola ONI C.A.)`;
      } else {
        debitCode = `1.1.02.01`;
        debitName = `Transferencias Internas por Liquidar (Agrícola ONI C.A.)`;
        creditCode = `1.1.01.01`;
        creditName = `Banco ${bankName} (Cuenta Emisor)`;
      }
      break;

    case 'aporte_socio':
      if (isIncome) {
        debitCode = `1.1.01.01`;
        debitName = `Banco ${bankName}`;
        creditCode = `3.1.01.02`;
        creditName = `Aportes de Capital / Socio Elías Trías (C.I. V-23997829)`;
      } else {
        debitCode = `3.1.01.02`;
        debitName = `Cuenta por Cobrar / Retiros Socio Elías Trías (C.I. V-23997829)`;
        creditCode = `1.1.01.01`;
        creditName = `Banco ${bankName}`;
      }
      break;

    case 'compra_dolares':
      debitCode = `1.1.03.01`;
      debitName = `Banco Moneda Extranjera (USD Intervención Digital)`;
      creditCode = `1.1.01.01`;
      creditName = `Banco ${bankName} (Bs.)`;
      break;

    case 'pago_proveedor':
      if (isIncome) {
        debitCode = `1.1.01.01`;
        debitName = `Banco ${bankName}`;
        creditCode = `1.1.04.01`;
        creditName = `Reintegro / Devolución de Proveedor`;
      } else {
        debitCode = `2.1.01.01`;
        debitName = `Cuentas por Pagar Proveedores y Servicios`;
        creditCode = `1.1.01.01`;
        creditName = `Banco ${bankName}`;
      }
      break;

    case 'comision_servicio':
      debitCode = `5.1.04.01`;
      debitName = `Gastos por Comisiones y Servicios Bancarios`;
      creditCode = `1.1.01.01`;
      creditName = `Banco ${bankName}`;
      break;

    case 'otra_entrada':
      debitCode = `1.1.01.01`;
      debitName = `Banco ${bankName}`;
      creditCode = `4.1.01.01`;
      creditName = `Cobros a Clientes / Ingresos Operacionales`;
      break;

    case 'otra_salida':
      debitCode = `5.1.09.01`;
      debitName = `Otros Egresos Operacionales`;
      creditCode = `1.1.01.01`;
      creditName = `Banco ${bankName}`;
      break;
  }

  return {
    id: `asiento-${tx.id}`,
    date: tx.date,
    transactionId: tx.id,
    bankId: tx.bankId,
    reference: tx.reference,
    concept: tx.description,
    category: tx.category,
    debitAccountCode: debitCode,
    debitAccountName: debitName,
    debitBs: absBs,
    debitUSD: absUSD,
    creditAccountCode: creditCode,
    creditAccountName: creditName,
    creditBs: absBs,
    creditUSD: absUSD,
    exchangeRate: tx.exchangeRate
  };
}
