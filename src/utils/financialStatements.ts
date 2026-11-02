import { BankTransaction } from '../types/bank';
import { BANKS, SEED_INITIAL_BALANCES } from '../data/seedData';

export interface TrialBalanceItem {
  code: string;
  name: string;
  type: 'activo' | 'pasivo' | 'patrimonio' | 'ingreso' | 'egreso';
  initDebitBs: number;
  initCreditBs: number;
  debitBs: number;
  creditBs: number;
  saldoDeudorBs: number;
  saldoAcreedorBs: number;
  saldoDeudorUSD: number;
  saldoAcreedorUSD: number;
}

export interface TrialBalanceSummary {
  items: TrialBalanceItem[];
  totalInitDebitBs: number;
  totalInitCreditBs: number;
  totalDebitBs: number;
  totalCreditBs: number;
  totalFinalDebitBs: number;
  totalFinalCreditBs: number;
  totalFinalDebitUSD: number;
  totalFinalCreditUSD: number;
  isBalanced: boolean;
}

export interface IncomeStatement {
  totalIncomeBs: number;
  totalIncomeUSD: number;
  incomeBreakdown: { concept: string; amountBs: number; amountUSD: number }[];
  totalExpenseBs: number;
  totalExpenseUSD: number;
  expenseBreakdown: { concept: string; amountBs: number; amountUSD: number }[];
  netProfitBs: number;
  netProfitUSD: number;
}

export interface BalanceSheet {
  assets: {
    banks: { bankId: string; bankName: string; balanceBs: number; balanceUSD: number }[];
    totalBanksBs: number;
    totalBanksUSD: number;
    receivablesSociosBanescoBs: number;
    receivablesSociosBanescoUSD: number;
    receivablesBecerraBs: number;
    receivablesBecerraUSD: number;
    islrRetainedClientsBs: number;
    islrRetainedClientsUSD: number;
    islrPrepaidBs: number;
    islrPrepaidUSD: number;
    totalCurrentAssetsBs: number;
    totalCurrentAssetsUSD: number;
    fixedAssetsNetBs: number;
    fixedAssetsNetUSD: number;
    totalAssetsBs: number;
    totalAssetsUSD: number;
  };
  liabilities: {
    customerAdvancesBs: number;
    customerAdvancesUSD: number;
    islrRetainedPayableBs: number;
    islrRetainedPayableUSD: number;
    partnerPayableEliasBs: number;
    partnerPayableEliasUSD: number;
    islrTaxesPayableBs: number;
    islrTaxesPayableUSD: number;
    igtfPayableBs: number;
    igtfPayableUSD: number;
    totalLiabilitiesBs: number;
    totalLiabilitiesUSD: number;
  };
  equity: {
    capitalSocialBs: number;
    capitalSocialUSD: number;
    accumulatedSurplusBs: number;
    accumulatedSurplusUSD: number;
    netProfitBs: number;
    netProfitUSD: number;
    legalReserveBs: number;
    legalReserveUSD: number;
    totalEquityBs: number;
    totalEquityUSD: number;
  };
  totalLiabilitiesAndEquityBs: number;
  totalLiabilitiesAndEquityUSD: number;
  isBalanced: boolean;
  differenceBs: number;
}

// Tasa BCV Oficial de Referencia del Estado Financiero de Banesco
const REF_BCV_RATE = 794.99;

/**
 * Calcula el Estado de Ganancias y Pérdidas (Estado de Resultados)
 * Integrando los Estados Financieros Base Banesco con los 4 nuevos bancos auditados
 */
export function getIncomeStatement(transactions: BankTransaction[]): IncomeStatement {
  // 1. Ingresos Operacionales
  // Base Banesco: 78,717,472.35 Bs. ($99,016.93 USD)
  const baseAgriIncomeBs = 78717472.35;
  const baseAgriIncomeUSD = 99016.93;

  // Base Intereses Mutuo Becerra: 13,924,047.66 Bs. ($17,514.75 USD)
  const baseInterestIncomeBs = 13924047.66;
  const baseInterestIncomeUSD = 17514.75;

  // Entradas adicionales de los 4 nuevos bancos auditados
  const newBankIncomes = transactions.filter(t => t.amountBs > 0 && t.category !== 'transferencia_interna' && t.category !== 'aporte_socio');
  const newIncomeBs = newBankIncomes.reduce((sum, t) => sum + t.amountBs, 0);
  const newIncomeUSD = newBankIncomes.reduce((sum, t) => sum + t.amountUSD, 0);

  const totalIncomeBs = baseAgriIncomeBs + baseInterestIncomeBs + newIncomeBs;
  const totalIncomeUSD = baseAgriIncomeUSD + baseInterestIncomeUSD + newIncomeUSD;

  // 2. Costos y Gastos Operacionales
  // Base Banesco Costos y Gastos: 66,701,894.40 Bs. ($83,902.81 USD)
  const baseCostBs = 66701894.40;
  const baseCostUSD = 83902.81;

  // Comisiones Bancarias de los 4 nuevos bancos
  const commTxs = transactions.filter(t => t.category === 'comision_servicio');
  const commBs = commTxs.reduce((sum, t) => sum + Math.abs(t.amountBs), 0);
  const commUSD = commTxs.reduce((sum, t) => sum + t.amountUSD, 0);

  // Pagos a Proveedores y Egresos Operacionales de los 4 nuevos bancos
  const suppTxs = transactions.filter(t => t.category === 'pago_proveedor' || t.category === 'otra_salida');
  const suppBs = suppTxs.reduce((sum, t) => sum + Math.abs(t.amountBs), 0);
  const suppUSD = suppTxs.reduce((sum, t) => sum + t.amountUSD, 0);

  const totalExpenseBs = baseCostBs + commBs + suppBs;
  const totalExpenseUSD = baseCostUSD + commUSD + suppUSD;

  const netProfitBs = totalIncomeBs - totalExpenseBs;
  const netProfitUSD = totalIncomeUSD - totalExpenseUSD;

  return {
    totalIncomeBs,
    totalIncomeUSD,
    incomeBreakdown: [
      {
        concept: 'Ingresos por Servicios Agrícolas y Procesamiento (Banesco + Multibanco)',
        amountBs: baseAgriIncomeBs + newIncomeBs,
        amountUSD: baseAgriIncomeUSD + newIncomeUSD
      },
      {
        concept: 'Ingresos por Intereses Rendidos (Contrato Mutuo Manuel Becerra)',
        amountBs: baseInterestIncomeBs,
        amountUSD: baseInterestIncomeUSD
      }
    ],
    totalExpenseBs,
    totalExpenseUSD,
    expenseBreakdown: [
      {
        concept: 'Costos de Servicios Agrícolas y Mantenimiento (Operaciones Base Banesco)',
        amountBs: baseCostBs,
        amountUSD: baseCostUSD
      },
      {
        concept: 'Gastos por Comisiones y Mantenimiento de Cuentas (Bancamiga, Mercantil, Plaza, Provincial)',
        amountBs: commBs,
        amountUSD: commUSD
      },
      {
        concept: 'Pagos a Proveedores y Servicios Operacionales Auditados',
        amountBs: suppBs,
        amountUSD: suppUSD
      }
    ],
    netProfitBs,
    netProfitUSD
  };
}

/**
 * Calcula el Balance General (Estado de Situación Financiera VEN-NIF)
 * Tomando como base exacta los Estados Financieros entregados a Banesco al 31-08-2026
 * e integrando los saldos y movimientos auditados de Bancamiga, Mercantil, Plaza y Provincial.
 */
export function getBalanceSheet(
  transactions: BankTransaction[],
  initialBalances: Record<string, number> = SEED_INITIAL_BALANCES
): BalanceSheet {
  // 1. EFECTIVO Y BANCOS (DISPONIBILIDAD BANCARIA CONSOLIDADA)
  const banescoBalanceBs = 12355523.87;
  const banescoBalanceUSD = 15541.73;

  const bankList = [
    { bankId: 'banesco', bankName: 'Banesco Banco Universal (Cta. Cte.)', balanceBs: banescoBalanceBs, balanceUSD: banescoBalanceUSD }
  ];

  BANKS.forEach(bank => {
    const bankTxs = transactions.filter(t => t.bankId === bank.id);
    const incBs = bankTxs.filter(t => t.amountBs > 0).reduce((a, t) => a + t.amountBs, 0);
    const expBs = bankTxs.filter(t => t.amountBs < 0).reduce((a, t) => a + Math.abs(t.amountBs), 0);
    const initBs = initialBalances[bank.id] || 0;
    const finalBs = initBs + incBs - expBs;

    const incUSD = bankTxs.filter(t => t.amountBs > 0).reduce((a, t) => a + t.amountUSD, 0);
    const expUSD = bankTxs.filter(t => t.amountBs < 0).reduce((a, t) => a + t.amountUSD, 0);
    const finalUSD = (initBs / REF_BCV_RATE) + incUSD - expUSD;

    bankList.push({
      bankId: bank.id,
      bankName: `${bank.name}`,
      balanceBs: finalBs,
      balanceUSD: finalUSD
    });
  });

  const totalBanksBs = bankList.reduce((sum, b) => sum + b.balanceBs, 0);
  const totalBanksUSD = bankList.reduce((sum, b) => sum + b.balanceUSD, 0);

  // 2. OTROS ACTIVOS CORRIENTES BASE BANESCO
  const receivablesSociosBanescoBs = 375630000.00;
  const receivablesSociosBanescoUSD = 472496.51;

  const receivablesBecerraBs = 325948652.96;
  const receivablesBecerraUSD = 410003.46;

  const islrRetainedClientsBs = 661181.94;
  const islrRetainedClientsUSD = 831.69;

  const islrPrepaidBs = 787174.72;
  const islrPrepaidUSD = 990.17;

  const totalCurrentAssetsBs = totalBanksBs + receivablesSociosBanescoBs + receivablesBecerraBs + islrRetainedClientsBs + islrPrepaidBs;
  const totalCurrentAssetsUSD = totalBanksUSD + receivablesSociosBanescoUSD + receivablesBecerraUSD + islrRetainedClientsUSD + islrPrepaidUSD;

  // 3. PROPIEDAD, PLANTA Y EQUIPO NETO
  const fixedAssetsNetBs = 28062685.53; // (10000 + 26145094 + 590000 + 1317600 - 8.47)
  const fixedAssetsNetUSD = 35299.42;

  const totalAssetsBs = totalCurrentAssetsBs + fixedAssetsNetBs;
  const totalAssetsUSD = totalCurrentAssetsUSD + fixedAssetsNetUSD;

  // 4. PASIVO CORRIENTE BASE BANESCO Y AJUSTES
  const customerAdvancesBs = 301228750.17;
  const customerAdvancesUSD = 378908.85;

  const islrRetainedPayableBs = 31277261.45;
  const islrRetainedPayableUSD = 39342.96;

  // Aportes de Accionista Elías Trías (Ajustado con movimientos netos de los 4 bancos)
  const partnerTxs = transactions.filter(t => t.category === 'aporte_socio');
  const partnerInBs = partnerTxs.filter(t => t.amountBs > 0).reduce((sum, t) => sum + t.amountBs, 0);
  const partnerOutBs = partnerTxs.filter(t => t.amountBs < 0).reduce((sum, t) => sum + Math.abs(t.amountBs), 0);
  const partnerNetBs = partnerInBs - partnerOutBs;

  const partnerInUSD = partnerTxs.filter(t => t.amountBs > 0).reduce((sum, t) => sum + t.amountUSD, 0);
  const partnerOutUSD = partnerTxs.filter(t => t.amountBs < 0).reduce((sum, t) => sum + t.amountUSD, 0);
  const partnerNetUSD = partnerInUSD - partnerOutUSD;

  const basePartnerPayableBs = 301053109.62;
  const basePartnerPayableUSD = 378687.92;

  const partnerPayableEliasBs = basePartnerPayableBs + partnerNetBs;
  const partnerPayableEliasUSD = basePartnerPayableUSD + partnerNetUSD;

  const islrTaxesPayableBs = 696202.38;
  const islrTaxesPayableUSD = 875.74;

  const igtfPayableBs = 0.00;
  const igtfPayableUSD = 0.00;

  const totalLiabilitiesBs = customerAdvancesBs + islrRetainedPayableBs + partnerPayableEliasBs + islrTaxesPayableBs + igtfPayableBs;
  const totalLiabilitiesUSD = customerAdvancesUSD + islrRetainedPayableUSD + partnerPayableEliasUSD + islrTaxesPayableUSD + igtfPayableUSD;

  // 5. PATRIMONIO NETO
  const capitalSocialBs = 600000.00;
  const capitalSocialUSD = 754.73;

  const accumulatedSurplusBs = 82590269.79;
  const accumulatedSurplusUSD = 103888.44;

  const incomeStatement = getIncomeStatement(transactions);
  const netProfitBs = incomeStatement.netProfitBs;
  const netProfitUSD = incomeStatement.netProfitUSD;

  const legalReserveBs = 60000.00;
  const legalReserveUSD = 75.47;

  const totalEquityBs = capitalSocialBs + accumulatedSurplusBs + netProfitBs + legalReserveBs;
  const totalEquityUSD = capitalSocialUSD + accumulatedSurplusUSD + netProfitUSD + legalReserveUSD;

  const totalLiabilitiesAndEquityBs = totalLiabilitiesBs + totalEquityBs;
  const totalLiabilitiesAndEquityUSD = totalLiabilitiesUSD + totalEquityUSD;

  const differenceBs = totalAssetsBs - totalLiabilitiesAndEquityBs;
  const isBalanced = Math.abs(differenceBs) < 0.05;

  return {
    assets: {
      banks: bankList,
      totalBanksBs,
      totalBanksUSD,
      receivablesSociosBanescoBs,
      receivablesSociosBanescoUSD,
      receivablesBecerraBs,
      receivablesBecerraUSD,
      islrRetainedClientsBs,
      islrRetainedClientsUSD,
      islrPrepaidBs,
      islrPrepaidUSD,
      totalCurrentAssetsBs,
      totalCurrentAssetsUSD,
      fixedAssetsNetBs,
      fixedAssetsNetUSD,
      totalAssetsBs,
      totalAssetsUSD
    },
    liabilities: {
      customerAdvancesBs,
      customerAdvancesUSD,
      islrRetainedPayableBs,
      islrRetainedPayableUSD,
      partnerPayableEliasBs,
      partnerPayableEliasUSD,
      islrTaxesPayableBs,
      islrTaxesPayableUSD,
      igtfPayableBs,
      igtfPayableUSD,
      totalLiabilitiesBs,
      totalLiabilitiesUSD
    },
    equity: {
      capitalSocialBs,
      capitalSocialUSD,
      accumulatedSurplusBs,
      accumulatedSurplusUSD,
      netProfitBs,
      netProfitUSD,
      legalReserveBs,
      legalReserveUSD,
      totalEquityBs,
      totalEquityUSD
    },
    totalLiabilitiesAndEquityBs,
    totalLiabilitiesAndEquityUSD,
    isBalanced,
    differenceBs
  };
}

/**
 * Calcula el Balance de Comprobación de Sumas y Saldos completo
 * Réplica exacta de la estructura de 22 cuentas de Banesco actualizada con los 4 nuevos bancos
 */
export function getTrialBalance(
  transactions: BankTransaction[],
  initialBalances: Record<string, number> = SEED_INITIAL_BALANCES
): TrialBalanceSummary {
  const items: TrialBalanceItem[] = [];

  const addLine = (
    code: string,
    name: string,
    type: 'activo' | 'pasivo' | 'patrimonio' | 'ingreso' | 'egreso',
    initDebitBs: number,
    initCreditBs: number,
    debitBs: number,
    creditBs: number,
    finalDebitBs: number,
    finalCreditBs: number,
    finalUSD: number
  ) => {
    const isDebitType = type === 'activo' || type === 'egreso';
    items.push({
      code,
      name,
      type,
      initDebitBs,
      initCreditBs,
      debitBs,
      creditBs,
      saldoDeudorBs: isDebitType ? finalDebitBs : 0,
      saldoAcreedorBs: !isDebitType ? finalCreditBs : 0,
      saldoDeudorUSD: isDebitType ? finalUSD : 0,
      saldoAcreedorUSD: !isDebitType ? finalUSD : 0
    });
  };

  // Sumas de los 4 nuevos bancos
  const bankTxsBs = transactions.reduce((sum, t) => sum + Math.abs(t.amountBs), 0);

  // 1.1.01 Efectivo y Bancos (Banesco + Bancamiga, Mercantil, Plaza, Provincial)
  const bs = getBalanceSheet(transactions, initialBalances);
  const totalBanksBs = bs.assets.totalBanksBs;
  const totalBanksUSD = bs.assets.totalBanksUSD;

  addLine('1.1.01', 'Efectivo y Bancos (Banesco, Bancamiga, Mercantil, Plaza y Provincial)', 'activo', 2418532.47, 0.00, 1966597105.35 + bankTxsBs, 1956660113.95 + bankTxsBs, totalBanksBs, 0.00, totalBanksUSD);
  addLine('1.1.02', 'Cuentas por Cobrar Comerciales Clientes (Corte 31/12/2025)', 'activo', 53109051.79, 0.00, 0.00, 53109051.79, 0.00, 0.00, 0.00);
  addLine('1.1.03', 'Cuentas por Cobrar Socios - Transferencias Corporativas Banesco', 'activo', 0.00, 0.00, 375630000.00, 0.00, 375630000.00, 0.00, 472496.51);
  addLine('1.1.04', 'Cuentas por Cobrar Socios - Contrato Mutuo y Financiamiento Manuel Becerra', 'activo', 0.00, 0.00, 512324652.96, 186376000.00, 325948652.96, 0.00, 410003.46);
  addLine('1.1.05', 'Retenciones ISLR por Cobrar a Clientes Retenidas', 'activo', 661181.94, 0.00, 0.00, 0.00, 661181.94, 0.00, 831.69);
  addLine('1.1.06', 'ISLR Pagado por Anticipado / Crédito Fiscal Exigible', 'activo', 394563.21, 0.00, 392611.51, 0.00, 787174.72, 0.00, 990.17);
  addLine('1.2.01', 'Maquinarias y Equipos Agrícolas', 'activo', 10000.00, 0.00, 0.00, 0.00, 10000.00, 0.00, 12.58);
  addLine('1.2.02', 'Vehículos y Flota de Carga Agrícola', 'activo', 26145094.00, 0.00, 0.00, 0.00, 26145094.00, 0.00, 32887.32);
  addLine('1.2.03', 'Muebles y Equipos de Oficina', 'activo', 590000.00, 0.00, 0.00, 0.00, 590000.00, 0.00, 742.15);
  addLine('1.2.04', 'Edificaciones e Inmuebles Industriales', 'activo', 1317600.00, 0.00, 0.00, 0.00, 1317600.00, 0.00, 1657.38);
  addLine('1.2.05', 'Depreciación Acumulada Propiedad, Planta y Equipos', 'activo', 0.00, 8.47, 0.00, 0.00, 0.00, 8.47, 0.01);

  addLine('2.1.01', 'Anticipos Recibidos de Clientes (NIIF 15 - Torrefactoras y Clientes)', 'pasivo', 0.00, 0.00, 1262634322.45, 1563863072.62, 0.00, 301228750.17, 378908.85);
  addLine('2.1.02', 'Retención de ISLR por Pagar (Originada por Anticipos de Clientes)', 'pasivo', 0.00, 0.00, 0.00, 31277261.45, 0.00, 31277261.45, 39342.96);

  const partnerPayableEliasBs = bs.liabilities.partnerPayableEliasBs;
  const partnerPayableEliasUSD = bs.liabilities.partnerPayableEliasUSD;
  addLine('2.1.03', 'Cuentas por Pagar Socios (Aportes Accionista Elias Rafael Trías)', 'pasivo', 0.00, 0.00, 0.00, partnerPayableEliasBs, 0.00, partnerPayableEliasBs, partnerPayableEliasUSD);
  addLine('2.1.04', 'ISLR por Pagar / Provisiones Tributarias', 'pasivo', 0.00, 1395745.15, 1395745.15, 696202.38, 0.00, 696202.38, 875.74);
  addLine('2.1.05', 'IGTF 3% Efectivo Divisas por Pagar', 'pasivo', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00);

  addLine('3.1.01', 'Capital Social Suscrito y Pagado', 'patrimonio', 0.00, 600000.00, 0.00, 0.00, 0.00, 600000.00, 754.73);
  addLine('3.2.01', 'Superávit Acumulado (Resultados de Ejercicios Anteriores)', 'patrimonio', 0.00, 79877475.85, 0.00, 2712793.94, 0.00, 82590269.79, 103888.44);
  addLine('3.2.02', 'Ganancia Neta Ejercicio 2025 (Trasladada a Superávit)', 'patrimonio', 0.00, 2712793.94, 2712793.94, 0.00, 0.00, 0.00, 0.00);
  addLine('3.3.01', 'Reserva Legal Cumplida (10% Capital Social)', 'patrimonio', 0.00, 60000.00, 0.00, 0.00, 0.00, 60000.00, 75.47);

  const inc = getIncomeStatement(transactions);
  addLine('4.1.01', 'Ingresos por Servicios Agrícolas y Procesamiento (Consolidado)', 'ingreso', 0.00, 0.00, 0.00, inc.incomeBreakdown[0].amountBs, 0.00, inc.incomeBreakdown[0].amountBs, inc.incomeBreakdown[0].amountUSD);
  addLine('4.1.02', 'Ingresos por Intereses Financieros Contrato Mutuo Becerra', 'ingreso', 0.00, 0.00, 0.00, 13924047.66, 0.00, 13924047.66, 17514.75);

  const commBs = transactions.filter(t => t.category === 'comision_servicio').reduce((sum, t) => sum + Math.abs(t.amountBs), 0);
  const commUSD = transactions.filter(t => t.category === 'comision_servicio').reduce((sum, t) => sum + t.amountUSD, 0);

  const suppBs = transactions.filter(t => t.category === 'pago_proveedor' || t.category === 'otra_salida').reduce((sum, t) => sum + Math.abs(t.amountBs), 0);
  const suppUSD = transactions.filter(t => t.category === 'pago_proveedor' || t.category === 'otra_salida').reduce((sum, t) => sum + t.amountUSD, 0);

  addLine('5.1.01', 'Gastos Financieros y Comisiones Bancarias (Banesco + Multibanco)', 'egreso', 0.00, 0.00, 26751113.95 + commBs, 0.00, 26751113.95 + commBs, 0.00, 33649.62 + commUSD);
  addLine('5.1.02', 'Costos Operacionales y Servicios Agrícolas (Banesco + Proveedores)', 'egreso', 0.00, 0.00, 39950780.45 + suppBs, 0.00, 39950780.45 + suppBs, 0.00, 50253.19 + suppUSD);

  const totalInitDebitBs = items.reduce((sum, i) => sum + i.initDebitBs, 0);
  const totalInitCreditBs = items.reduce((sum, i) => sum + i.initCreditBs, 0);
  const totalDebitBs = items.reduce((sum, i) => sum + i.debitBs, 0);
  const totalCreditBs = items.reduce((sum, i) => sum + i.creditBs, 0);
  const totalFinalDebitBs = items.reduce((sum, i) => sum + i.saldoDeudorBs, 0);
  const totalFinalCreditBs = items.reduce((sum, i) => sum + i.saldoAcreedorBs, 0);
  const totalFinalDebitUSD = items.reduce((sum, i) => sum + i.saldoDeudorUSD, 0);
  const totalFinalCreditUSD = items.reduce((sum, i) => sum + i.saldoAcreedorUSD, 0);

  return {
    items,
    totalInitDebitBs,
    totalInitCreditBs,
    totalDebitBs,
    totalCreditBs,
    totalFinalDebitBs,
    totalFinalCreditBs,
    totalFinalDebitUSD,
    totalFinalCreditUSD,
    isBalanced: Math.abs(totalFinalDebitBs - totalFinalCreditBs) < 0.10
  };
}
