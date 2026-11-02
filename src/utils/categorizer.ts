import { CategoryId, BankId } from '../types/bank';

const COMPANY_DETAILS = {
  name: 'AGRICOLA ONI, C.A.',
  rif: 'J-50145638-0',
  partnerName: 'ELIAS RAFAEL TRIAS ABREU',
  partnerCedula: 'V-23997829'
};

export interface ExtractedEntityInfo {
  entityName: string;
  entityDoc: string;
  personType: 'Persona Natural' | 'Persona Jurídica';
  bankAccountDetail: string;
}

/**
 * Motor de Clasificación Automática de Transacciones Bancarias
 * Diseñado específicamente para Agrícola ONI C.A. y el socio Elías Trías Abreu
 */
export function categorizeTransaction(description: string, rawAmount: number): CategoryId {
  const desc = (description || '').toUpperCase();
  const isIncome = rawAmount > 0;

  // 1. Verificación Socio Elías Trías (C.I. V-23997829 / V23997829)
  const eliasKeywords = [
    'ELIAS TRIAS',
    'ELIAS RAFAEL TRIAS',
    'V23997829',
    'V-23997829',
    '23997829',
    'PAGO ELIAS',
    'COMPRA ELIAS',
    'REINTEGRO COMPRA ELIAS',
    'COMBUSTIBLE ELIAS'
  ];
  if (eliasKeywords.some(kw => desc.includes(kw))) {
    return 'aporte_socio';
  }

  // 2. Verificación Compra de Dólares / Divisas / Intervención Digital
  const usdKeywords = [
    'COMPRA USD',
    'INTERVENCION DIGITAL',
    'INTERVENCION DIGITAL BS',
    'ND COMPRA USD',
    'COMPRA DIVISAS',
    'MESA DE CAMBIO USD',
    'MESA DE CAMBIO',
    'SALIDA DE FONDOS BCV'
  ];
  if (usdKeywords.some(kw => desc.includes(kw))) {
    return 'compra_dolares';
  }

  // 3. Verificación Transferencias Internas (Misma Empresa Agrícola ONI C.A.)
  const internalKeywords = [
    'J501456380',
    'J-50145638',
    'AGRICOLA ONI',
    'AGRICOLA ONI C.A.',
    'AGRICOLA ONI CA',
    'MISMO CLIENTE',
    'REINTEGRO BANESCO'
  ];
  if (internalKeywords.some(kw => desc.includes(kw))) {
    return 'transferencia_interna';
  }

  // 4. Comisiones bancarias, servicios y mantenimiento
  const commissionKeywords = [
    'COMISION',
    'COM TRF',
    'COM.MTTO',
    'MANTENIMIENTO CTA',
    'MANTENIMIENTO DE CUENTA',
    'EMISION EDO DE CUENTA',
    'EMISION EDO. DE CTA',
    'COM.EM.EDO.CTA',
    'ENVIO DE SMS',
    'TARIFA MANTENIMIENTO',
    'COMISION INTERVENCION',
    'CARGO POR MANTENIMIENTO',
    'CARGO EMISION',
    'COBRO DISTRIBUCION',
    'TARJETA DEBITO EMPRES',
    'LBTR',
    'IGTF',
    'IMPUESTO'
  ];
  if (commissionKeywords.some(kw => desc.includes(kw))) {
    return 'comision_servicio';
  }

  // 5. Pagos a proveedores o Ingresos generales
  if (isIncome) {
    return 'otra_entrada';
  } else {
    return 'pago_proveedor';
  }
}

/**
 * Extrae y detecta la información del Ordenante / Remitente / Beneficiario, RIF o Cédula,
 * Tipo de Persona (Natural vs Jurídica) y detalle de Banco de Origen/Destino.
 */
export function extractEntityDetails(
  description: string,
  bankId: BankId,
  amountBs: number
): ExtractedEntityInfo {
  const desc = (description || '').toUpperCase();
  const isIncome = amountBs > 0;

  // 1. Transferencia Interna / Agrícola ONI C.A.
  if (
    desc.includes('AGRICOLA ONI') ||
    desc.includes('J501456380') ||
    desc.includes('J-50145638') ||
    desc.includes('MISMO CLIENTE')
  ) {
    let account = 'Cuenta Interna / Banesco 0134-0401-13-4011117562';
    if (desc.includes('BANESCO') || desc.includes('1340401134011117562')) {
      account = 'Banesco (Cta 0134-0401-13-4011117562)';
    } else if (desc.includes('PLAZA')) {
      account = 'Banco Plaza (Cta 0138-****-1332)';
    } else if (desc.includes('MERCANTIL')) {
      account = 'Banco Mercantil (Cta 0105-0110-55-1110393865)';
    } else if (desc.includes('BANCAMIGA')) {
      account = 'Bancamiga (Cta 0172-****-**-*****7319)';
    }

    return {
      entityName: COMPANY_DETAILS.name,
      entityDoc: COMPANY_DETAILS.rif,
      personType: 'Persona Jurídica',
      bankAccountDetail: account
    };
  }

  // 2. Socio Elías Trías Abreu
  if (
    desc.includes('ELIAS TRIAS') ||
    desc.includes('ELIAS RAFAEL TRIAS') ||
    desc.includes('V23997829') ||
    desc.includes('V-23997829') ||
    desc.includes('23997829') ||
    desc.includes('PAGO ELIAS') ||
    desc.includes('COMBUSTIBLE ELIAS')
  ) {
    let bankDetail = 'Cta Personal / Banco de Venezuela (1020103920000763554)';
    if (desc.includes('PLAZA') || desc.includes('1380013870130201340')) {
      bankDetail = 'Banco Plaza Personal (Cta 0138-0013-87-0130201340)';
    } else if (desc.includes('MERCANTIL')) {
      bankDetail = 'Banco Mercantil Personal';
    }

    return {
      entityName: COMPANY_DETAILS.partnerName,
      entityDoc: COMPANY_DETAILS.partnerCedula,
      personType: 'Persona Natural',
      bankAccountDetail: bankDetail
    };
  }

  // 3. Omar Alonso Moreno
  if (desc.includes('OMAR ALONSO MORENO') || desc.includes('V19293866') || desc.includes('V-19293866')) {
    return {
      entityName: 'OMAR ALONSO MORENO',
      entityDoc: 'V-19293866',
      personType: 'Persona Natural',
      bankAccountDetail: 'Banco de Origen/Destino Inmediato'
    };
  }

  // 4. Roberto Oliva
  if (desc.includes('ROBERTO OLIVA')) {
    return {
      entityName: 'ROBERTO OLIVA',
      entityDoc: 'V-14892015',
      personType: 'Persona Natural',
      bankAccountDetail: 'Mercantil Cta ***3935'
    };
  }

  // 5. Jeanette Moya
  if (desc.includes('JEANETTE MOYA')) {
    return {
      entityName: 'JEANETTE MOYA',
      entityDoc: 'V-12948102',
      personType: 'Persona Natural',
      bankAccountDetail: 'Mercantil Cta ***3382'
    };
  }

  // 6. Grupo Tecnolife C.A.
  if (desc.includes('GRUPO TECNOLIFE')) {
    return {
      entityName: 'GRUPO TECNOLIFE C.A.',
      entityDoc: 'J-40192837-1',
      personType: 'Persona Jurídica',
      bankAccountDetail: 'Mercantil Cta ***1676'
    };
  }

  // 7. Residencias Galería
  if (desc.includes('RESIDENCIAS GALERIA')) {
    return {
      entityName: 'RESIDENCIAS GALERIA',
      entityDoc: 'J-30918274-5',
      personType: 'Persona Jurídica',
      bankAccountDetail: 'Mercantil Cta ***8891 / ***7946'
    };
  }

  // 8. Distribuidora / Plaza
  if (desc.includes('DISTRIBU') || desc.includes('J306437037')) {
    return {
      entityName: 'DISTRIBUIDORA DE ALIMENTOS Y BIENES C.A.',
      entityDoc: 'J-30643703-7',
      personType: 'Persona Jurídica',
      bankAccountDetail: 'Banco Plaza Cta Origen'
    };
  }

  // 9. Becerra / Plaza
  if (desc.includes('BECERRA') || desc.includes('V024224176')) {
    return {
      entityName: 'CARLOS BECERRA',
      entityDoc: 'V-024224176',
      personType: 'Persona Natural',
      bankAccountDetail: 'Banco Plaza Cta Origen'
    };
  }

  // 10. Compra USD / Intervención Digital / Mesa Cambio / BCV
  if (
    desc.includes('COMPRA USD') || 
    desc.includes('INTERVENCION DIGITAL') || 
    desc.includes('DIVISAS') || 
    desc.includes('SALIDA DE FONDOS BCV')
  ) {
    return {
      entityName: 'BANCO CENTRAL DE VENEZUELA (BCV) / MESA DE CAMBIO',
      entityDoc: 'G-20000001-0',
      personType: 'Persona Jurídica',
      bankAccountDetail: 'Operación Intervención Digital USD'
    };
  }

  // 11. Comisiones y Servicios Bancarios
  if (
    desc.includes('COMISION') ||
    desc.includes('COM TRF') ||
    desc.includes('MANTENIMIENTO') ||
    desc.includes('EMISION EDO') ||
    desc.includes('SMS') ||
    desc.includes('COBRO DISTRIBUCION') ||
    desc.includes('TARJETA DEBITO') ||
    desc.includes('LBTR') ||
    desc.includes('IGTF')
  ) {
    const bankNames: Record<BankId, string> = {
      bancamiga: 'Bancamiga Banco Universal (RIF: J-31628759-9)',
      mercantil: 'Banco Mercantil C.A. (RIF: J-00002961-0)',
      plaza: 'Banco Plaza Banco Universal (RIF: J-00297055-3)',
      provincial: 'BBVA Banco Provincial (RIF: J-00002967-9)',
      banesco: 'Banesco Banco Universal (RIF: J-00079703-2)',
      otro: 'Institución Financiera'
    };
    return {
      entityName: bankNames[bankId] || 'Institución Bancaria',
      entityDoc: bankId === 'bancamiga' ? 'J-31628759-9' : bankId === 'mercantil' ? 'J-00002961-0' : bankId === 'plaza' ? 'J-00297055-3' : 'J-00002967-9',
      personType: 'Persona Jurídica',
      bankAccountDetail: 'Cobro de Comisión Bancaria Oficial'
    };
  }

  // 12. Extracción por Expresión Regular para RIF / Cédula genéricos
  const docMatch = desc.match(/([JVEGP])[-]?(\d{6,9})[-]?(\d)?/);
  if (docMatch) {
    const letter = docMatch[1];
    const num = docMatch[2];
    const digit = docMatch[3] ? `-${docMatch[3]}` : '';
    const formattedDoc = `${letter}-${num}${digit}`;
    const isJuridica = letter === 'J' || letter === 'G';

    return {
      entityName: isIncome ? `Ordenante / Cliente (${formattedDoc})` : `Beneficiario / Proveedor (${formattedDoc})`,
      entityDoc: formattedDoc,
      personType: isJuridica ? 'Persona Jurídica' : 'Persona Natural',
      bankAccountDetail: 'Transferencia Bancaria Registrada'
    };
  }

  // Fallback por defecto según si es entrada o salida
  return {
    entityName: isIncome ? 'Ordenante Tercero No Identificado' : 'Beneficiario Tercero No Identificado',
    entityDoc: 'N/A',
    personType: desc.includes('C.A.') || desc.includes('CA') ? 'Persona Jurídica' : 'Persona Natural',
    bankAccountDetail: 'Transferencia Bancaria'
  };
}
