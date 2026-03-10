/**
 * lib/stats/indicators.ts
 * Cálculo de indicadores de accidentalidad según Decreto 1072/2015, Art. 2.2.4.6.32
 * y formatos del RUC/CCS (Consejo Colombiano de Seguridad).
 *
 * HHT = Horas-Hombre Trabajadas en el período
 * Constante CCS: 240,000 (base anual = 120 trabajadores × 2,000 h/año)
 */

import type { Event } from "@/lib/supabase";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Base for Colombian SST rate calculations per CCS/RUC standard */
export const HHT_CONSTANT = 240_000;

/** Hours per working day (standard) */
const HOURS_PER_DAY = 8;

/** Working days per month estimate (22 days) */
const WORKING_DAYS_PER_MONTH = 22;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StatsIndicators {
    /** Número de Accidentes de Trabajo (AT) en el período */
    totalAT: number;
    /** AT Graves en el período */
    atGrave: number;
    /** AT Fatales en el período */
    atFatal: number;
    /** Incidentes / Casi-accidentes */
    incidentes: number;
    /** Condiciones inseguras */
    condicionesInseguras: number;
    /** Total días de incapacidad reales */
    totalDisabilityDays: number;
    /** Días cargados por severidad (AT Fatal/Invalidez, etc.) según CCS */
    diasCargadosAT: number;
    /** Horas-Hombre Trabajadas */
    hht: number;
    /** IF — Índice de Frecuencia */
    IF: number;
    /** IS — Índice de Severidad */
    IS: number;
    /** TA — Tasa de Accidentalidad (%) */
    TA: number;
    /** IM — Índice de Mortalidad (%) */
    mortalidadPct: number;
    /** Variation vs previous period (-1 to undefined if unavailable) */
    ifVariation?: number;
    isVariation?: number;
}

export interface MonthlyPoint {
    /** "2025-01" */
    month: string;
    /** Label legible: "ene 25" */
    label: string;
    at: number;
    grave: number;
    fatal: number;
    incidentes: number;
    disabilityDays: number;
}

export interface ClassificationPoint {
    label: string;
    value: number;
    color: string;
}

// ─── AT classifier ────────────────────────────────────────────────────────────

const AT_CLASSES = new Set([
    "ACCIDENTE_TRABAJO",
    "ACCIDENTE_TRABAJO_GRAVE",
    "ACCIDENTE_TRABAJO_FATAL",
]);

function isAT(e: Event): boolean {
    return AT_CLASSES.has(e.classification ?? "");
}

export function isFatal(e: Event): boolean {
    return e.classification === "ACCIDENTE_TRABAJO_FATAL";
}

export function isGrave(e: Event): boolean {
    return e.classification === "ACCIDENTE_TRABAJO_GRAVE";
}

// ─── HHT estimator ────────────────────────────────────────────────────────────

/**
 * Calculate "días cargados" (charged days) according to CCS/OIT standard.
 */
export function calculateDiasCargados(
    classification: string,
    disabilityDays: number = 0,
    hasInvalidez: boolean = false,
    hasIPP: boolean = false,
    pclPercent?: number
): number {
    if (classification === "ACCIDENTE_TRABAJO_FATAL" || hasInvalidez) {
        return 6000;
    }
    if (hasIPP) {
        if (pclPercent && pclPercent > 0 && pclPercent < 50) {
            return Math.round((pclPercent / 100) * 6000);
        }
        return 600; // estimated default for IPP <50% without exact %
    }
    if (classification === "ACCIDENTE_TRABAJO_GRAVE" || classification === "ACCIDENTE_TRABAJO") {
        return disabilityDays; // Real days (0 for AT Sin Tiempo Perdido)
    }
    return 0;
}

/**
 * Estimate HHT from worker count and number of months in the period.
 * Used as a fallback when the user hasn't entered a manual HHT.
 */
export function estimateHHT(workerCount: number, months: number): number {
    return workerCount * HOURS_PER_DAY * WORKING_DAYS_PER_MONTH * months;
}

// ─── Core indicator calculators ───────────────────────────────────────────────

function safe(n: number): number {
    return isFinite(n) && !isNaN(n) ? n : 0;
}

/** Índice de Frecuencia: (N° AT / HHT) × K */
export function calcIF(atCount: number, hht: number, kConstant: number): number {
    if (hht <= 0) return 0;
    return safe((atCount / hht) * kConstant);
}

/** Índice de Severidad: (días perdidos / HHT) × K */
export function calcIS(lostDays: number, hht: number, kConstant: number): number {
    if (hht <= 0) return 0;
    return safe((lostDays / hht) * kConstant);
}

/** Tasa de Accidentalidad: (N° AT / N° trabajadores) × 100 */
export function calcTA(atCount: number, workerCount: number): number {
    if (workerCount <= 0) return 0;
    return safe((atCount / workerCount) * 100);
}

// ─── Main aggregator ─────────────────────────────────────────────────────────

export function calcIndicators(
    events: Event[],
    hht: number,
    workerCount: number,
    kConstant: number
): StatsIndicators {
    const atEvents = events.filter(isAT);
    const totalAT = atEvents.length;
    const atGrave = events.filter(isGrave).length;
    const atFatal = events.filter(isFatal).length;
    const incidentes = events.filter(
        (e) => e.classification === "INCIDENTE_SIN_LESION" || e.classification === "CASI_ACCIDENTE"
    ).length;
    const condicionesInseguras = events.filter(
        (e) => e.classification === "CONDICION_INSEGURA"
    ).length;

    const totalDisabilityDays = atEvents.reduce(
        (sum, e) => sum + (e.disability_days ?? 0),
        0
    );

    const diasCargadosAT = atEvents.reduce((sum, e) => {
        // En un futuro el backend podría enviar hasInvalidez, hasIPP y pclPercent.
        // Por ahora usamos lo que tenemos en classification y disability_days.
        return sum + calculateDiasCargados(e.classification ?? "", e.disability_days ?? 0);
    }, 0);

    const IF = calcIF(totalAT, hht, kConstant);
    // Para el IS, el RUC exige usar los DIAS_CARGADOS_AT, no solo los días de incapacidad
    const IS = calcIS(diasCargadosAT, hht, kConstant);
    const TA = calcTA(totalAT, workerCount);
    const mortalidadPct = totalAT > 0 ? safe((atFatal / totalAT) * 100) : 0;

    return {
        totalAT, atGrave, atFatal, incidentes, condicionesInseguras,
        totalDisabilityDays, diasCargadosAT, hht,
        IF, IS, TA, mortalidadPct,
    };
}

// ─── Trend data (monthly) ─────────────────────────────────────────────────────

const MONTH_LABELS = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
];

export function groupByMonth(events: Event[], months: number = 12): MonthlyPoint[] {
    const now = new Date();
    const points: MonthlyPoint[] = [];

    for (let i = months - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = `${MONTH_LABELS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;

        const monthEvents = events.filter((e) => {
            const date = (e.event_date || e.created_at || "").slice(0, 7);
            return date === key;
        });

        points.push({
            month: key,
            label,
            at: monthEvents.filter(isAT).length,
            grave: monthEvents.filter(isGrave).length,
            fatal: monthEvents.filter(isFatal).length,
            incidentes: monthEvents.filter(
                (e) => e.classification === "INCIDENTE_SIN_LESION" || e.classification === "CASI_ACCIDENTE"
            ).length,
            disabilityDays: monthEvents.reduce((s, e) => s + (e.disability_days ?? 0), 0),
        });
    }

    return points;
}

// ─── Classification breakdown ─────────────────────────────────────────────────

export function groupByClassification(events: Event[]): ClassificationPoint[] {
    let atConTP = 0;
    let atSinTP = 0;
    let atGrave = 0;
    let atFatal = 0;
    let casiAccidente = 0;
    let incidente = 0;
    let condicion = 0;
    let enfermedad = 0;

    events.forEach(e => {
        if (e.classification === "ACCIDENTE_TRABAJO_FATAL") atFatal++;
        else if (e.classification === "ACCIDENTE_TRABAJO_GRAVE") atGrave++;
        else if (e.classification === "ACCIDENTE_TRABAJO") {
            if ((e.disability_days ?? 0) > 0) atConTP++;
            else atSinTP++;
        }
        else if (e.classification === "CASI_ACCIDENTE") casiAccidente++;
        else if (e.classification === "INCIDENTE_SIN_LESION") incidente++;
        else if (e.classification === "CONDICION_INSEGURA") condicion++;
        else if (e.classification === "ENFERMEDAD_LABORAL") enfermedad++;
    });

    const groups = [
        { label: "AT Con Tiempo Perdido", value: atConTP, color: "#F59E0B" },
        { label: "AT Sin Tiempo Perdido", value: atSinTP, color: "#FCD34D" },
        { label: "AT Grave", value: atGrave, color: "#F97316" },
        { label: "AT Fatal", value: atFatal, color: "#EF4444" },
        { label: "Casi-Accidente", value: casiAccidente, color: "#3B82F6" },
        { label: "Enfermedad Laboral", value: enfermedad, color: "#EC4899" },
        { label: "Condición Insegura", value: condicion, color: "#22C55E" },
        { label: "Incidente sin Lesión", value: incidente, color: "#8B5CF6" },
    ];

    return groups.filter((g) => g.value > 0);
}

// ─── Period filter helpers ────────────────────────────────────────────────────

export type PeriodPreset = "month" | "quarter" | "year" | "custom";

export interface DateRange {
    from: Date;
    to: Date;
}

export function periodToRange(preset: PeriodPreset, custom?: DateRange): DateRange {
    const now = new Date();

    switch (preset) {
        case "month":
            return {
                from: new Date(now.getFullYear(), now.getMonth(), 1),
                to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
            };
        case "quarter": {
            const q = Math.floor(now.getMonth() / 3);
            return {
                from: new Date(now.getFullYear(), q * 3, 1),
                to: new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59),
            };
        }
        case "year":
            return {
                from: new Date(now.getFullYear(), 0, 1),
                to: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
            };
        case "custom":
            return custom ?? periodToRange("year");
    }
}

export function filterByPeriod(events: Event[], range: DateRange): Event[] {
    return events.filter((e) => {
        const d = new Date(e.event_date || e.created_at || "");
        return d >= range.from && d <= range.to;
    });
}

/** Number of full months in a date range (minimum 1) */
export function monthsInRange(range: DateRange): number {
    const diff =
        (range.to.getFullYear() - range.from.getFullYear()) * 12 +
        (range.to.getMonth() - range.from.getMonth()) + 1;
    return Math.max(1, diff);
}
