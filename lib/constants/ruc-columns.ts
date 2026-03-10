/**
 * lib/constants/ruc-columns.ts
 * Exact CCS RUC column definitions for the Excel flat file.
 * CRITICAL: Column headers must match CCS spec character-by-character.
 * Source: skill legal-exports-colombia §2
 */

export interface RucColumnDef {
    readonly key: string;
    readonly header: string;
    readonly type: 'number' | 'string' | 'decimal2' | 'decimal4';
    readonly description: string;
    readonly formula?: string;
}

export const RUC_COLUMNS: readonly RucColumnDef[] = [
    { key: 'year', header: 'AÑO', type: 'number', description: 'Año del periodo reportado' },
    { key: 'month', header: 'MES', type: 'number', description: 'Mes del periodo (1-12)' },
    { key: 'nit', header: 'NIT', type: 'string', description: 'NIT sin DV, sin puntos' },
    { key: 'companyName', header: 'RAZON_SOCIAL', type: 'string', description: 'Razón social como en Cámara de Comercio' },
    { key: 'workCenter', header: 'CENTRO_TRABAJO', type: 'string', description: 'Nombre del centro de trabajo / proyecto' },
    { key: 'ciiuCode', header: 'CODIGO_CIIU', type: 'string', description: 'Código CIIU de la actividad económica' },
    { key: 'riskClass', header: 'CLASE_RIESGO', type: 'number', description: 'Clase de riesgo (1 a 5)' },
    { key: 'workerCount', header: 'NUM_TRABAJADORES', type: 'number', description: 'Promedio de trabajadores en el mes' },
    { key: 'manHoursWorked', header: 'HHT', type: 'number', description: 'Horas hombre trabajadas en el mes' },
    { key: 'fatalAccidents', header: 'NUM_AT_MORTALES', type: 'number', description: 'Accidentes de trabajo mortales' },
    { key: 'disablingAccidents', header: 'NUM_AT_CON_INCAPACIDAD', type: 'number', description: 'AT con incapacidad' },
    { key: 'nonDisablingAccidents', header: 'NUM_AT_SIN_INCAPACIDAD', type: 'number', description: 'AT sin incapacidad' },
    { key: 'totalAccidents', header: 'TOTAL_AT', type: 'number', description: 'Total AT', formula: 'MORTALES + CON_INCAPACIDAD + SIN_INCAPACIDAD' },
    { key: 'disabilityDays', header: 'DIAS_INCAPACIDAD_AT', type: 'number', description: 'Días de incapacidad por AT' },
    { key: 'chargedDays', header: 'DIAS_CARGADOS_AT', type: 'number', description: 'Días cargados por AT (tabla ANSI Z16)' },
    { key: 'occupationalDiseases', header: 'NUM_EL', type: 'number', description: 'Enfermedades laborales diagnosticadas' },
    { key: 'diseaseDays', header: 'DIAS_INCAPACIDAD_EL', type: 'number', description: 'Días incapacidad por enfermedad laboral' },
    { key: 'incidents', header: 'NUM_INCIDENTES', type: 'number', description: 'Incidentes reportados' },
    { key: 'accidentRate', header: 'TASA_ACCIDENTALIDAD', type: 'decimal2', description: 'Tasa de accidentalidad', formula: '(TOTAL_AT / NUM_TRABAJADORES) × 100' },
    { key: 'frequencyRate', header: 'IF_AT', type: 'decimal2', description: 'Índice de Frecuencia de AT', formula: '(TOTAL_AT / HHT) × 240.000' },
    { key: 'severityRate', header: 'IS_AT', type: 'decimal2', description: 'Índice de Severidad de AT', formula: '((DIAS_INCAPACIDAD_AT + DIAS_CARGADOS_AT) / HHT) × 240.000' },
] as const;

/**
 * K factor for CCS indicator calculations.
 * CRITICAL: Must be 240.000 (100 workers × 48h/week × 50 weeks).
 * NEVER use 200.000 (OSHA) — CCS will reject the file.
 */
export const CCS_K_FACTOR = 240_000;
