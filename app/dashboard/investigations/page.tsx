/**
 * app/dashboard/investigations/page.tsx
 * Módulo 3 — Lista de Investigaciones
 * Muestra todas las investigaciones abiertas y cerradas, con estado y acceso rápido.
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft, Search, ClipboardList, Clock, CheckCircle2,
    AlertTriangle, RefreshCw, ChevronRight, User
} from "lucide-react";
import { supabase, type Investigation, type Event } from "@/lib/supabase";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    en_proceso: { label: "En Proceso", color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20", dot: "bg-amber-400" },
    plan_accion_definido: { label: "Plan de Acción", color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20", dot: "bg-blue-400" },
    en_seguimiento: { label: "En Seguimiento", color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/20", dot: "bg-purple-400" },
    cerrado: { label: "Cerrado", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20", dot: "bg-emerald-400" },
};

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.en_proceso;
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}

function daysSince(dateStr?: string): number {
    if (!dateStr) return 0;
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function InvestigationsPage() {
    const router = useRouter();
    const [investigations, setInvestigations] = useState<Investigation[]>([]);
    const [events, setEvents] = useState<Record<string, Event>>({});
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [search, setSearch] = useState("");

    const fetchData = useCallback(async () => {
        setLoading(true);
        const { data: invs } = await supabase
            .from("investigations")
            .select("*")
            .order("created_at", { ascending: false });

        if (invs && invs.length > 0) {
            const ids = [...new Set(invs.map((i) => i.incident_id))];
            const { data: evs } = await supabase
                .from("incidents")
                .select("id, worker_name, reported_by_name, description, classification, event_date, created_at, company_id, event_city, event_department")
                .in("id", ids);
            const evMap: Record<string, Event> = {};
            (evs ?? []).forEach((e) => { evMap[e.id] = e as Event; });
            setEvents(evMap);
        }
        setInvestigations((invs ?? []) as Investigation[]);
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filtered = investigations.filter((inv) => {
        if (filterStatus !== "all" && inv.status !== filterStatus) return false;
        if (search) {
            const ev = events[inv.incident_id];
            const q = search.toLowerCase();
            return (
                (ev?.worker_name ?? "").toLowerCase().includes(q) ||
                (inv.investigator_sst ?? "").toLowerCase().includes(q) ||
                (ev?.event_city ?? "").toLowerCase().includes(q)
            );
        }
        return true;
    });

    const openCount = investigations.filter((i) => i.status !== "cerrado").length;

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0F1219]" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Header */}
            <DashboardHeader onRefresh={fetchData} loading={loading}>
                <div className="flex items-center gap-6 flex-1">
                    <div>
                        <h1 className="text-white font-black text-xl tracking-tight leading-none uppercase">Investigaciones</h1>
                        <p className="text-[#64748B] text-[10px] font-bold uppercase tracking-wider mt-1">
                            Res. 1401/2007 — PROCESO POST-EVENTO
                        </p>
                    </div>
                    {openCount > 0 && (
                        <span className="px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full text-[10px] font-black border border-amber-500/20 uppercase tracking-wider">
                            {openCount} abiertas
                        </span>
                    )}
                </div>
            </DashboardHeader>

            <div className="flex-1 max-w-5xl mx-auto px-8 py-8 space-y-6 w-full overflow-y-auto">
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] pointer-events-none" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por trabajador, ciudad, investigador…"
                            className="w-full bg-[#0F1219] border border-[#1E2A3B] rounded-xl !pl-[44px] pr-4 py-2.5 text-white text-xs font-bold placeholder:text-[#334155] focus:outline-none focus:border-[#F59E0B]/50 transition-colors"
                        />
                    </div>
                    {/* Status filter */}
                    <div className="flex rounded-xl overflow-hidden border border-[#1E2A3B]">
                        {[
                            { value: "all", label: "Todas" },
                            { value: "en_proceso", label: "En proceso" },
                            { value: "cerrado", label: "Cerradas" },
                        ].map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setFilterStatus(opt.value)}
                                className={[
                                    "px-4 py-2 text-xs font-semibold transition-colors cursor-pointer",
                                    filterStatus === opt.value
                                        ? "bg-[#F59E0B] text-black"
                                        : "bg-[#0F1219] text-[#64748B] hover:text-white",
                                ].join(" ")}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Empty state */}
                {loading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-24 bg-[#1A1F2E] border border-[#1E2A3B] rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="bg-[#1A1F2E] border border-[#1E2A3B] rounded-2xl p-12 text-center">
                        <ClipboardList className="w-10 h-10 text-[#334155] mx-auto mb-3" />
                        <p className="text-[#64748B] font-semibold">
                            {investigations.length === 0
                                ? "Sin investigaciones registradas"
                                : "Sin resultados para los filtros aplicados"}
                        </p>
                        <p className="text-[#334155] text-sm mt-1">
                            Las investigaciones se inician desde el detalle de un evento clasificado
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map((inv) => {
                            const ev = events[inv.incident_id];
                            const days = daysSince(ev?.event_date ?? ev?.created_at);
                            const isClosed = inv.status === "cerrado";
                            return (
                                <div
                                    key={inv.id}
                                    onClick={() => router.push(`/dashboard/events/${inv.incident_id}/investigation`)}
                                    className="bg-[#1A1F2E] border border-[#1E2A3B] rounded-2xl p-6 flex items-center gap-6 cursor-pointer hover:border-[#F59E0B]/30 hover:bg-white/[0.02] transition-all group"
                                >
                                    {/* Icon */}
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isClosed ? "bg-emerald-400/10" : "bg-amber-400/10"}`}>
                                        {isClosed
                                            ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                            : <AlertTriangle className="w-5 h-5 text-amber-400" />
                                        }
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-white font-semibold text-sm">
                                                {ev?.worker_name ?? ev?.reported_by_name ?? "Trabajador no identificado"}
                                            </p>
                                            <StatusBadge status={inv.status} />
                                        </div>
                                        <div className="flex items-center gap-4 mt-1 flex-wrap">
                                            {ev?.event_city && (
                                                <span className="text-[#64748B] text-xs">{ev.event_city}{ev.event_department ? `, ${ev.event_department}` : ""}</span>
                                            )}
                                            {inv.investigator_sst && (
                                                <span className="flex items-center gap-1 text-[#64748B] text-xs">
                                                    <User className="w-3 h-3" /> {inv.investigator_sst}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1 text-[#64748B] text-xs">
                                                <Clock className="w-3 h-3" />
                                                {days === 0 ? "Hoy" : `Hace ${days} días`}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions count */}
                                    <div className="text-right flex-shrink-0">
                                        {inv.action_plan.length > 0 && (
                                            <p className="text-[#94A3B8] text-xs">
                                                {inv.action_plan.filter((a) => a.status === "cerrado").length}/{inv.action_plan.length} acciones
                                            </p>
                                        )}
                                    </div>

                                    <ChevronRight className="w-4 h-4 text-[#334155] group-hover:text-[#F59E0B] transition-colors flex-shrink-0" />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
