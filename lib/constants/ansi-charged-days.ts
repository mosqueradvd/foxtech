/**
 * lib/constants/ansi-charged-days.ts
 * ANSI Z16.1 charged days table — mandatory for DIAS_CARGADOS_AT in RUC CCS export.
 * Source: skill legal-exports-colombia §1
 */

export interface ChargedDayEntry {
    readonly id: string;
    readonly descriptionEs: string;
    readonly chargedDays: number;
}

export const ANSI_CHARGED_DAYS: readonly ChargedDayEntry[] = [
    { id: 'death', descriptionEs: 'Muerte', chargedDays: 6000 },
    { id: 'total-permanent-disability', descriptionEs: 'Incapacidad permanente total', chargedDays: 6000 },
    { id: 'arm-above-elbow', descriptionEs: 'Pérdida del brazo arriba del codo', chargedDays: 4500 },
    { id: 'arm-at-below-elbow', descriptionEs: 'Pérdida del brazo hasta o debajo del codo', chargedDays: 3600 },
    { id: 'hand', descriptionEs: 'Pérdida de la mano', chargedDays: 3000 },
    { id: 'thumb', descriptionEs: 'Pérdida del pulgar', chargedDays: 600 },
    { id: 'index-finger', descriptionEs: 'Pérdida del dedo índice', chargedDays: 400 },
    { id: 'middle-finger', descriptionEs: 'Pérdida del dedo medio', chargedDays: 300 },
    { id: 'ring-finger', descriptionEs: 'Pérdida del dedo anular', chargedDays: 200 },
    { id: 'little-finger', descriptionEs: 'Pérdida del dedo meñique', chargedDays: 100 },
    { id: 'thumb-and-index', descriptionEs: 'Pérdida del pulgar y dedo índice (misma mano)', chargedDays: 1200 },
    { id: 'two-fingers-other', descriptionEs: 'Pérdida de dos dedos (otras combinaciones)', chargedDays: 750 },
    { id: 'three-fingers', descriptionEs: 'Pérdida de tres dedos', chargedDays: 1200 },
    { id: 'four-fingers', descriptionEs: 'Pérdida de cuatro dedos', chargedDays: 1800 },
    { id: 'thumb-and-four-fingers', descriptionEs: 'Pérdida del pulgar y cuatro dedos (mano completa)', chargedDays: 3000 },
    { id: 'leg-above-knee', descriptionEs: 'Pérdida de la pierna arriba de la rodilla', chargedDays: 4500 },
    { id: 'leg-at-below-knee', descriptionEs: 'Pérdida de la pierna hasta o debajo de la rodilla', chargedDays: 3000 },
    { id: 'foot', descriptionEs: 'Pérdida del pie', chargedDays: 2400 },
    { id: 'great-toe', descriptionEs: 'Pérdida del dedo gordo del pie', chargedDays: 300 },
    { id: 'other-toe', descriptionEs: 'Pérdida de cualquier otro dedo del pie', chargedDays: 150 },
    { id: 'two-or-more-toes', descriptionEs: 'Pérdida de dos o más dedos del pie (mismo pie)', chargedDays: 600 },
    { id: 'one-eye', descriptionEs: 'Pérdida de la visión de un ojo', chargedDays: 1800 },
    { id: 'both-eyes', descriptionEs: 'Pérdida de la visión de ambos ojos', chargedDays: 6000 },
    { id: 'one-ear', descriptionEs: 'Pérdida de la audición de un oído', chargedDays: 600 },
    { id: 'both-ears', descriptionEs: 'Pérdida de la audición de ambos oídos', chargedDays: 3000 },
    { id: 'one-kidney', descriptionEs: 'Incapacidad permanente parcial — un riñón', chargedDays: 3000 },
    { id: 'one-lung', descriptionEs: 'Incapacidad permanente parcial — un pulmón', chargedDays: 1800 },
    { id: 'hernia-unrepaired', descriptionEs: 'Hernia (no reparada)', chargedDays: 50 },
] as const;

/**
 * Lookup charged days by ANSI entry ID.
 * Returns 0 if not found (use actual disability days only).
 */
export function lookupChargedDays(entryId: string): number {
    const entry = ANSI_CHARGED_DAYS.find((e) => e.id === entryId);
    return entry?.chargedDays ?? 0;
}

/**
 * Calculate total charged days for a single accident with multiple injuries.
 * Per ANSI Z16: use the HIGHEST single value (do NOT sum across injuries of same accident).
 * Exception: if death is included, always 6000.
 */
export function calculateChargedDays(entryIds: string[]): number {
    if (entryIds.length === 0) return 0;
    if (entryIds.includes('death')) return 6000;
    const values = entryIds.map(lookupChargedDays);
    return Math.max(...values);
}
