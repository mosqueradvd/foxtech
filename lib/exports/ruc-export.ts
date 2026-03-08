/**
 * lib/exports/ruc-export.ts
 * Generates the RUC Excel flat file for CCS (Consejo Colombiano de Seguridad).
 * 100% client-side using SheetJS. All indicators recalculated at export time.
 * Source: skill legal-exports-colombia §2
 */
"use client";

import * as XLSX from "xlsx";
import { RUC_COLUMNS, CCS_K_FACTOR } from "../constants/ruc-columns";
import { calculateDiasCargados } from "../stats/indicators";
import type { Event } from "../supabase";

// ── Types ───────────────────────────────────────────────────────────────

export interface WorkCenterConfig {
    nit: string;
    companyName: string;
    workCenter: string;
    ciiuCode: string;
    /** Risk class 1–5 */
    riskClass: number;
}

export interface RucPeriodInput {
    year: number;
    month: number;
    workerCount: number;
    /** Total man-hours worked in the period */
    manHoursWorked: number;
    /** Classified accidents for this period */
    accidents: Event[];
    /** Occupational diseases count */
    occupationalDiseases?: number;
    /** Disability days from occupational diseases */
    diseaseDays?: number;
    /** Incidents (casi accidentes) count */
    incidents?: number;
}

export interface RucExportResult {
    success: boolean;
    fileName: string;
    blob?: Blob;
    errors: string[];
    warnings: string[];
}

// ── Helpers ─────────────────────────────────────────────────────────────

function roundTo(value: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}

function sanitizeNit(nit: string): string {
    return nit.replace(/[.\-\s]/g, "").split("-")[0];
}

function padMonth(month: number): string {
    return month.toString().padStart(2, "0");
}

// ── Validation ──────────────────────────────────────────────────────────

function validateInputs(
    config: WorkCenterConfig,
    period: RucPeriodInput
): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const prefix = `${period.year}-${padMonth(period.month)}`;

    if (period.year < 2000 || period.year > 2100)
        errors.push(`${prefix}: AÑO fuera de rango válido (${period.year}).`);

    if (period.month < 1 || period.month > 12)
        errors.push(`${prefix}: MES debe estar entre 1 y 12.`);

    const cleanNit = sanitizeNit(config.nit);
    if (!/^\d{6,10}$/.test(cleanNit))
        errors.push(`${prefix}: NIT inválido "${config.nit}". Debe ser numérico, 6–10 dígitos, sin DV.`);

    if (config.riskClass < 1 || config.riskClass > 5)
        errors.push(`${prefix}: CLASE_RIESGO debe ser 1–5 (recibido: ${config.riskClass}).`);

    if (!config.companyName.trim())
        errors.push(`${prefix}: RAZON_SOCIAL no puede estar vacía.`);

    if (!/^\d{4}$/.test(config.ciiuCode))
        warnings.push(`${prefix}: CODIGO_CIIU "${config.ciiuCode}" no tiene el formato esperado (4 dígitos).`);

    if (period.workerCount > 0 && period.manHoursWorked <= 0)
        errors.push(`${prefix}: HHT debe ser > 0 cuando NUM_TRABAJADORES > 0.`);

    if (period.workerCount <= 0 && period.manHoursWorked > 0)
        warnings.push(`${prefix}: HHT es ${period.manHoursWorked} pero NUM_TRABAJADORES es 0.`);

    return { errors, warnings };
}

// ── Row Calculation ──────────────────────────────────────────────────────

function buildRow(
    config: WorkCenterConfig,
    period: RucPeriodInput
): Record<string, number | string> {
    const { accidents, workerCount: workers, manHoursWorked: hht } = period;

    // Classify accidents
    const fatalAccidents = accidents.filter((a) => a.classification === "ACCIDENTE_TRABAJO_FATAL").length;
    const disablingAccidents = accidents.filter(
        (a) => a.classification !== "ACCIDENTE_TRABAJO_FATAL" && (a.disability_days ?? 0) > 0
    ).length;
    const nonDisablingAccidents = accidents.filter(
        (a) => a.classification !== "ACCIDENTE_TRABAJO_FATAL" && (a.disability_days ?? 0) === 0
    ).length;
    const totalAccidents = fatalAccidents + disablingAccidents + nonDisablingAccidents;

    // Sum disability days
    const disabilityDays = accidents.reduce(
        (sum, a) => sum + (a.disability_days ?? 0),
        0
    );

    // Calculate charged days — each accident independently per CCS standard
    let chargedDaysTotal = 0;
    for (const accident of accidents) {
        chargedDaysTotal += calculateDiasCargados(
            accident.classification ?? "",
            accident.disability_days ?? 0
        );
    }

    const occDiseases = period.occupationalDiseases ?? 0;
    const diseaseDoys = period.diseaseDays ?? 0;
    const incidentCount = period.incidents ?? 0;

    // Indicators — all recalculated, never from stored values (skill P3)
    const accidentRate =
        workers > 0 ? roundTo((totalAccidents / workers) * 100, 2) : 0;
    const frequencyRate =
        hht > 0 ? roundTo((totalAccidents / hht) * CCS_K_FACTOR, 2) : 0;
    const severityRate =
        hht > 0
            ? roundTo((chargedDaysTotal / hht) * CCS_K_FACTOR, 2)
            : 0;
    const ili = roundTo((frequencyRate * severityRate) / 1000, 4);

    return {
        AÑO: period.year,
        MES: period.month,
        NIT: sanitizeNit(config.nit),
        RAZON_SOCIAL: config.companyName.trim(),
        CENTRO_TRABAJO: config.workCenter.trim(),
        CODIGO_CIIU: config.ciiuCode,
        CLASE_RIESGO: config.riskClass,
        NUM_TRABAJADORES: workers,
        HHT: hht,
        NUM_AT_MORTALES: fatalAccidents,
        NUM_AT_CON_INCAPACIDAD: disablingAccidents,
        NUM_AT_SIN_INCAPACIDAD: nonDisablingAccidents,
        TOTAL_AT: totalAccidents,
        DIAS_INCAPACIDAD_AT: disabilityDays,
        DIAS_CARGADOS_AT: chargedDaysTotal,
        NUM_EL: occDiseases,
        DIAS_INCAPACIDAD_EL: diseaseDoys,
        NUM_INCIDENTES: incidentCount,
        TASA_ACCIDENTALIDAD: accidentRate,
        IF_AT: frequencyRate,
        IS_AT: severityRate,
        ILI: ili,
    };
}

// ── Main Export Function ─────────────────────────────────────────────────

/**
 * Generates the RUC Excel flat file for CCS submission.
 *
 * Rules enforced:
 * - Sheet name: "Accidentalidad" (exact)
 * - Headers in row 1 match CCS specification exactly
 * - No cell formatting (no colors, borders, bold) — CCS rejects formatted files
 * - Numbers stored as numeric type, not text
 * - File name: RUC_{NIT}_{YYYY}{MM}.xlsx
 *
 * @param config  Company and work center configuration
 * @param period  Period data including accident records from Dexie
 */
export function generateRUCExport(
    config: WorkCenterConfig,
    period: RucPeriodInput
): RucExportResult {
    // Validate
    const { errors, warnings } = validateInputs(config, period);
    if (errors.length > 0) {
        return { success: false, fileName: "", errors, warnings };
    }

    // Build the data row
    const row = buildRow(config, period);

    // Verify integrity
    const expectedTotal =
        (row.NUM_AT_MORTALES as number) +
        (row.NUM_AT_CON_INCAPACIDAD as number) +
        (row.NUM_AT_SIN_INCAPACIDAD as number);
    if ((row.TOTAL_AT as number) !== expectedTotal) {
        errors.push(`TOTAL_AT (${row.TOTAL_AT}) ≠ suma de componentes (${expectedTotal}).`);
        return { success: false, fileName: "", errors, warnings };
    }

    // Build Excel workbook
    const headers = RUC_COLUMNS.map((col) => col.header);
    const dataRow = RUC_COLUMNS.map((col) => {
        // Map key to the built row
        return row[col.header];
    });

    const sheetData = [headers, dataRow];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    // No styling — CCS rejects workbooks with cell formatting
    XLSX.utils.book_append_sheet(workbook, worksheet, "Accidentalidad");

    const wbOut = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
    }) as ArrayBuffer;

    const blob = new Blob([wbOut], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const cleanNit = sanitizeNit(config.nit);
    const fileName = `RUC_${cleanNit}_${period.year}${padMonth(period.month)}.xlsx`;

    return { success: true, fileName, blob, errors: [], warnings };
}

/**
 * Generates a historical RUC Excel flat file for CCS with multiple rows (e.g. 5 last years).
 * 
 * @param config  Company config
 * @param periods Array of periods to include
 */
export function generateHistoricalRUCExport(
    config: WorkCenterConfig,
    periods: RucPeriodInput[]
): RucExportResult {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    const rowData: any[][] = [];

    // Headers
    rowData.push(RUC_COLUMNS.map((col) => col.header));

    for (const p of periods) {
        const { errors, warnings } = validateInputs(config, p);
        if (errors.length > 0) {
            allErrors.push(...errors);
            continue; // Or fail everything. User wants robust export, we will fail.
        }
        allWarnings.push(...warnings);

        const row = buildRow(config, p);
        rowData.push(RUC_COLUMNS.map((col) => row[col.header]));
    }

    if (allErrors.length > 0) {
        return { success: false, fileName: "", errors: allErrors, warnings: allWarnings };
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rowData);

    // No styling per CCS
    XLSX.utils.book_append_sheet(workbook, worksheet, "Accidentalidad");

    const wbOut = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
    const blob = new Blob([wbOut], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

    const cleanNit = sanitizeNit(config.nit);
    const currentYear = new Date().getFullYear();
    const fileName = `RUC_HISTORICO_${cleanNit}_${currentYear}.xlsx`;

    return { success: true, fileName, blob, errors: [], warnings: allWarnings };
}

/**
 * Trigger browser download of the generated Excel blob.
 */
export function downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}
