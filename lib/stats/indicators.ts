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
    /** Total días de incapacidad */
    totalDisabilityDays: number;
    /** Horas-Hombre Trabajadas */
    hht: number;
    /** IF — Índice de Frecuencia */
    IF: number;
    /** IS — Índice de Severidad */
    IS: number;
    /** ILI — Índice de Lesiones Incapacitantes */
    ILI: number;
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

/** Índice de Frecuencia: (N° AT / HHT) × 240,000 */
export function calcIF(atCount: number, hht: number): number {
    if (hht <= 0) return 0;
    return safe((atCount / hht) * HHT_CONSTANT);
}

/** Índice de Severidad: (días perdidos / HHT) × 240,000 */
export function calcIS(lostDays: number, hht: number): number {
    if (hht <= 0) return 0;
    return safe((lostDays / hht) * HHT_CONSTANT);
}

/** Índice de Lesiones Incapacitantes: (IF × IS) / 1,000 */
export function calcILI(IF: number, IS: number): number {
    return safe((IF * IS) / 1000);
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
    workerCount: number
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

    const IF = calcIF(totalAT, hht);
    const IS = calcIS(totalDisabilityDays, hht);
    const ILI = calcILI(IF, IS);
    const TA = calcTA(totalAT, workerCount);
    const mortalidadPct = totalAT > 0 ? safe((atFatal / totalAT) * 100) : 0;

    return {
        totalAT, atGrave, atFatal, incidentes, condicionesInseguras,
        totalDisabilityDays, hht,
        IF, IS, ILI, TA, mortalidadPct,
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
    const groups: { label: string; key: string; color: string }[] = [
        { key: "ACCIDENTE_TRABAJO", label: "AT Simple", color: "#F59E0B" },
        { key: "ACCIDENTE_TRABAJO_GRAVE", label: "AT Grave", color: "#F97316" },
        { key: "ACCIDENTE_TRABAJO_FATAL", label: "AT Fatal", color: "#EF4444" },
        { key: "CASI_ACCIDENTE", label: "Casi-Accidente", color: "#3B82F6" },
        { key: "INCIDENTE_SIN_LESION", label: "Incidente sin lesión", color: "#8B5CF6" },
        { key: "CONDICION_INSEGURA", label: "Condición Insegura", color: "#22C55E" },
        { key: "ENFERMEDAD_LABORAL", label: "Enfermedad Laboral", color: "#EC4899" },
    ];

    return groups
        .map(({ key, label, color }) => ({
            label,
            color,
            value: events.filter((e) => e.classification === key).length,
        }))
        .filter((g) => g.value > 0);
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
