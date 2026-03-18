import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export type StatusVariant = "synced" | "pending" | "error" | "scheduled" | "accidente" | "accidente_grave" | "casi_accidente" | "condicion_insegura" | "enfermedad_laboral" | "impacto_ambiental" | "otro";

interface StatusBadgeProps {
    variant: StatusVariant;
    label?: string;
    size?: "sm" | "md";
}

const lightStyles: Record<StatusVariant, { bg: string; text: string; label: string }> = {
    synced: {
        bg: "bg-green-100 border border-green-200",
        text: "text-green-800",
        label: "SINCRONIZADO",
    },
    pending: {
        bg: "bg-amber-100 border border-amber-200",
        text: "text-amber-800",
        label: "PENDIENTE",
    },
    error: {
        bg: "bg-red-100 border border-red-200",
        text: "text-red-800",
        label: "ERROR",
    },
    scheduled: {
        bg: "bg-slate-100 border border-slate-200",
        text: "text-slate-800",
        label: "PROGRAMADO",
    },
    accidente: {
        bg: "bg-red-100 border border-red-200",
        text: "text-red-800",
        label: "Accidente Leve",
    },
    accidente_grave: {
        bg: "bg-red-100 border border-red-200",
        text: "text-red-900",
        label: "Accidente Grave",
    },
    casi_accidente: {
        bg: "bg-amber-100 border border-amber-200",
        text: "text-amber-800",
        label: "Casi Accidente",
    },
    condicion_insegura: {
        bg: "bg-slate-100 border border-slate-200",
        text: "text-slate-800",
        label: "Condición Insegura",
    },
    enfermedad_laboral: {
        bg: "bg-blue-100 border border-blue-200",
        text: "text-blue-800",
        label: "Enfermedad",
    },
    impacto_ambiental: {
        bg: "bg-emerald-100 border border-emerald-200",
        text: "text-emerald-800",
        label: "Impacto Amb.",
    },
    otro: {
        bg: "bg-slate-100 border border-slate-200",
        text: "text-slate-700",
        label: "Desconocido",
    },
};

const darkStyles: Record<StatusVariant, { bg: string; text: string; label: string }> = {
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
    accidente_grave: {
        bg: "bg-red-900/60 border border-red-500/50",
        text: "text-red-500",
        label: "Accidente Grave",
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
    enfermedad_laboral: {
        bg: "bg-blue-900/40 border border-blue-700/40",
        text: "text-blue-400",
        label: "Enfermedad",
    },
    impacto_ambiental: {
        bg: "bg-emerald-900/40 border border-emerald-700/40",
        text: "text-emerald-400",
        label: "Impacto Amb.",
    },
    otro: {
        bg: "bg-slate-800 border border-slate-700",
        text: "text-slate-400",
        label: "Desconocido",
    },
};

export function StatusBadge({ variant, label, size = "sm" }: StatusBadgeProps) {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDark = mounted && resolvedTheme === "dark";
    const styles = isDark ? darkStyles : lightStyles;
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
