/**
 * components/ui/StatusBadge.tsx
 * FOXTECH sync status badge — Sincronizado | Pendiente | Error | Programado
 */
import React from "react";

export type StatusVariant = "synced" | "pending" | "error" | "scheduled" | "accidente" | "casi_accidente" | "condicion_insegura";

interface StatusBadgeProps {
    variant: StatusVariant;
    label?: string;
    size?: "sm" | "md";
}

const styles: Record<StatusVariant, { bg: string; text: string; label: string }> = {
    synced: {
        bg: "bg-green-900/40 border border-green-700/50",
        text: "text-green-400",
        label: "SINCRONIZADO",
    },
    pending: {
        bg: "bg-amber-900/40 border border-amber-700/40",
        text: "text-amber-400",
        label: "PENDIENTE",
    },
    error: {
        bg: "bg-red-900/40 border border-red-700/40",
        text: "text-red-400",
        label: "ERROR",
    },
    scheduled: {
        bg: "bg-slate-700/60 border border-slate-600/40",
        text: "text-slate-300",
        label: "PROGRAMADO",
    },
    accidente: {
        bg: "bg-red-800/50 border border-red-700/50",
        text: "text-red-400",
        label: "Accidente Leve",
    },
    casi_accidente: {
        bg: "bg-amber-800/50 border border-amber-700/50",
        text: "text-amber-400",
        label: "Casi Accidente",
    },
    condicion_insegura: {
        bg: "bg-slate-700/60 border border-slate-600/40",
        text: "text-slate-300",
        label: "Condición Insegura",
    },
};

export function StatusBadge({ variant, label, size = "sm" }: StatusBadgeProps) {
    const s = styles[variant];
    const displayLabel = label ?? s.label;

    return (
        <span
            className={[
                "inline-flex items-center gap-1 rounded font-bold uppercase tracking-wide whitespace-nowrap",
                size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs",
                s.bg,
                s.text,
            ].join(" ")}
        >
            {displayLabel}
        </span>
    );
}
