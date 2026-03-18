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
    if (!eventType) return "otro";
    const t = eventType.toLowerCase();
    
    if (t.includes("fatal")) return "accidente_fatal";
    if (t.includes("grave")) return "accidente_grave";
    if (t.includes("accidente")) {
        if (t.includes("casi")) return "casi_accidente";
        return "accidente";
    }
    if (t.includes("condicion") && t.includes("insegura")) return "condicion_insegura";
    if (t.includes("enfermedad")) return "enfermedad_laboral";
    if (t.includes("ambiental")) return "impacto_ambiental";
    if (t.includes("dano") || t.includes("daño") || t.includes("propiedad")) return "dano_propiedad";
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
        pending: { label: "Pendiente", cls: "bg-amber-900/40 text-amber-400 border-amber-700/30" },
        classified: { label: "Clasificado", cls: "bg-blue-900/40 text-blue-400 border-blue-700/30" },
        investigated: { label: "Investigado", cls: "bg-green-900/40 text-green-400 border-green-700/30" },
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
            className="border-b border-[#334155] hover:bg-white/5 cursor-pointer transition-colors"
            onClick={onClick}
        >
            <td className="py-4 px-4">
                <p className="text-white font-semibold text-sm">{incident.company_name ?? "—"}</p>
                <p className="text-[#64748B] text-xs mt-0.5">{incident.company_location ?? ""}</p>
            </td>
            <td className="py-4 px-4">
                <StatusBadge variant={getEventBadge(incident.classification || incident.event_type)} />
            </td>
            <td className="py-4 px-4 text-[#64748B] text-sm">{formatTime(incident.created_at)}</td>
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
                <ChevronRight className="w-4 h-4 text-[#64748B]" />
            </td>
        </tr>
    );
}
