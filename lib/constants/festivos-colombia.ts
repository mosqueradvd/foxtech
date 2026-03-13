/**
 * lib/constants/festivos-colombia.ts
 * Festivos legales de Colombia para 2025 y 2026.
 * Fuente: Ley 51 de 1983 + Decreto anual del Gobierno Nacional.
 * Se usa para calcular días hábiles restantes para la notificación a Mintrabajo.
 * Plazo legal: 2 días hábiles desde el accidente (Dec. 1072/2015 Art. 2.2.4.1.6)
 */

/**
 * Festivos Colombia 2025 y 2026 en formato YYYY-MM-DD.
 * Los festivos que caen en domingo se trasladan al lunes siguiente (Ley 51/1983).
 */
export const FESTIVOS_COLOMBIA: readonly string[] = [
    // ── 2025 ──────────────────────────────────────────────────────────────
    '2025-01-01', // Año Nuevo
    '2025-01-06', // Reyes Magos (trasladado)
    '2025-03-24', // San José (trasladado)
    '2025-04-17', // Jueves Santo
    '2025-04-18', // Viernes Santo
    '2025-05-01', // Día del Trabajo
    '2025-06-02', // Ascensión del Señor (trasladado)
    '2025-06-23', // Corpus Christi (trasladado)
    '2025-06-30', // Sagrado Corazón de Jesús (trasladado)
    '2025-07-07', // San Pedro y San Pablo (trasladado)
    '2025-07-20', // Independencia de Colombia
    '2025-08-07', // Batalla de Boyacá
    '2025-08-18', // Asunción de la Virgen (trasladado)
    '2025-10-13', // Día de la Raza (trasladado)
    '2025-11-03', // Todos los Santos (trasladado)
    '2025-11-17', // Independencia de Cartagena (trasladado)
    '2025-12-08', // Inmaculada Concepción
    '2025-12-25', // Navidad

    // ── 2026 ──────────────────────────────────────────────────────────────
    '2026-01-01', // Año Nuevo
    '2026-01-12', // Reyes Magos (trasladado)
    '2026-03-23', // San José (trasladado)
    '2026-04-02', // Jueves Santo
    '2026-04-03', // Viernes Santo
    '2026-05-01', // Día del Trabajo
    '2026-05-18', // Ascensión del Señor (trasladado)
    '2026-06-08', // Corpus Christi (trasladado)
    '2026-06-15', // Sagrado Corazón de Jesús (trasladado)
    '2026-06-29', // San Pedro y San Pablo
    '2026-07-20', // Independencia de Colombia
    '2026-08-07', // Batalla de Boyacá
    '2026-08-17', // Asunción de la Virgen (trasladado)
    '2026-10-12', // Día de la Raza
    '2026-11-02', // Todos los Santos
    '2026-11-16', // Independencia de Cartagena (trasladado)
    '2026-12-08', // Inmaculada Concepción
    '2026-12-25', // Navidad
] as const;

const festivoSet = new Set(FESTIVOS_COLOMBIA);

/** Whether a given date (YYYY-MM-DD) is a Colombian public holiday */
export function isFestivo(dateStr: string): boolean {
    return festivoSet.has(dateStr);
}

/** Whether a Date object falls on a weekend (Sat or Sun) */
export function isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // 0=Sunday, 6=Saturday
}

function toDateStr(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/** Whether a date is a business day (Mon–Fri, not a festivo) */
export function isBusinessDay(date: Date): boolean {
    return !isWeekend(date) && !isFestivo(toDateStr(date));
}

/**
 * Count business days elapsed from `from` (inclusive) to today.
 * Used to check if the 2-day notification deadline has passed.
 */
export function businessDaysElapsed(fromIso: string): number {
    const start = new Date(fromIso.split('T')[0] + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let count = 0;
    const cursor = new Date(start);
    while (cursor <= today) {
        if (isBusinessDay(cursor)) count++;
        cursor.setDate(cursor.getDate() + 1);
    }
    // subtract 1: the day itself is day 0 (the accident day doesn't count as elapsed)
    return Math.max(0, count - 1);
}

/**
 * Business days remaining before the 2-day Mintrabajo deadline expires.
 * Negative means overdue.
 * Legal basis: Dec. 1072/2015 Art. 2.2.4.1.6
 * Falls back to accidentDateIso if startDateIso is empty.
 */
export function businessDaysRemaining(accidentDateIso: string, startDateIso?: string): number {
    const referenceDate = startDateIso || accidentDateIso;
    return 2 - businessDaysElapsed(referenceDate);
}

/** Urgency level based on remaining business days */
export function urgencyLevel(remaining: number): 'ok' | 'warning' | 'overdue' {
    if (remaining > 1) return 'ok';
    if (remaining === 1) return 'warning';
    return 'overdue';
}
