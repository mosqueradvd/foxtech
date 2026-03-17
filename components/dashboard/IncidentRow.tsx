/**
 * components/dashboard/IncidentRow.tsx
 * Table row for incident list on the consultant dashboard
 */
import React from "react";
import { ChevronRight } from "lucide-react";
import { StatusBadge, type StatusVariant } from "@/components/ui/StatusBadge";
import type { Incident } from "@/lib/supabase";

interface IncidentRowProps {
    incident: Incident & { company_name?: string; company_location?: string };
    onClick?: () => void;
}

function getEventBadge(eventType?: string): StatusVariant {
    if (eventType === "accidente") return "accidente";
    if (eventType === "accidente_grave") return "accidente_grave";
    if (eventType === "casi_accidente") return "casi_accidente";
    if (eventType === "condicion_insegura") return "condicion_insegura";
    if (eventType === "enfermedad_laboral") return "enfermedad_laboral";
    if (eventType === "impacto_ambiental") return "impacto_ambiental";
    return "otro";
}

function getSyncBadge(incident: Incident): StatusVariant {
    if (incident.synced_at) return "synced";
    return "pending";
}

function formatTime(dateStr?: string): string {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    const now = new Date();
    const diffH = (now.getTime() - d.getTime()) / 3600000;

    if (diffH < 24) {
        return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
    } else if (diffH < 48) {
        return "Ayer";
    } else {
        return `${Math.floor(diffH / 24)} días`;
    }
}

function ClassificationBadge({ status }: { status?: string }) {
    const map: Record<string, { label: string; cls: string }> = {
        pending: { label: "Pendiente", cls: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-700/30" },
        classified: { label: "Clasificado", cls: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-700/30" },
        investigated: { label: "Investigado", cls: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-400 dark:border-green-700/30" },
    };
    const s = map[status ?? "pending"] ?? map.pending;
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wide ${s.cls}`}>
            {s.label}
        </span>
    );
}

export function IncidentRow({ incident, onClick }: IncidentRowProps) {
    return (
        <tr
            className="border-b border-[var(--border)] hover:bg-[#F1F5F9] dark:hover:bg-white/5 cursor-pointer transition-colors"
            onClick={onClick}
        >
            <td className="py-4 px-4">
                <p className="text-[var(--text-primary)] font-semibold text-sm">{incident.company_name ?? "—"}</p>
                <p className="text-[var(--text-muted)] text-xs mt-0.5">{incident.company_location ?? ""}</p>
            </td>
            <td className="py-4 px-4">
                <StatusBadge variant={getEventBadge(incident.event_type)} />
            </td>
            <td className="py-4 px-4 text-[var(--text-muted)] text-sm">{formatTime(incident.created_at)}</td>
            <td className="py-4 px-4">
                <ClassificationBadge status={(incident as Incident & { classification_status?: string }).classification_status} />
            </td>
            <td className="py-4 px-4">
                <StatusBadge
                    variant={getSyncBadge(incident)}
                    label={incident.synced_at ? "Sync" : "Pendiente"}
                />
            </td>
            <td className="py-4 px-4">
                <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
            </td>
        </tr>
    );
}
