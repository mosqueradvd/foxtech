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
    if (eventType === "casi_accidente") return "casi_accidente";
    if (eventType === "accidente") return "accidente";
    return "condicion_insegura";
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
                <StatusBadge variant={getEventBadge(incident.event_type)} />
            </td>
            <td className="py-4 px-4 text-[#64748B] text-sm">{formatTime(incident.created_at)}</td>
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
