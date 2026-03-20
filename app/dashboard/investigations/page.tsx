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
import { useTheme } from "next-themes";
import { supabase, type Investigation, type Event } from "@/lib/supabase";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useActiveCompany } from "@/hooks/useActiveCompany";

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; colorLight: string; bg: string; bgLight: string; dot: string }> = {
    en_proceso: { 
        label: "En Proceso", 
        color: "text-amber-400", colorLight: "text-amber-600",
        bg: "bg-amber-400/10 border-amber-400/20", bgLight: "bg-amber-50 border-amber-200",
        dot: "bg-amber-400" 
    },
    plan_accion_definido: { 
        label: "Plan de Acción", 
        color: "text-blue-400", colorLight: "text-blue-600",
        bg: "bg-blue-400/10 border-blue-400/20", bgLight: "bg-blue-50 border-blue-200",
        dot: "bg-blue-400" 
    },
    en_seguimiento: { 
        label: "En Seguimiento", 
        color: "text-purple-400", colorLight: "text-purple-600",
        bg: "bg-purple-400/10 border-purple-400/20", bgLight: "bg-purple-50 border-purple-200",
        dot: "bg-purple-400" 
    },
    cerrado: { 
        label: "Cerrado", 
        color: "text-emerald-400", colorLight: "text-emerald-600",
        bg: "bg-emerald-400/10 border-emerald-400/20", bgLight: "bg-emerald-50 border-emerald-200",
        dot: "bg-emerald-400" 
    },
};

function StatusBadge({ status, isLight }: { status: string; isLight?: boolean }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.en_proceso;
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${isLight ? cfg.bgLight : cfg.bg} ${isLight ? cfg.colorLight : cfg.color}`}>
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
    const { activeCompany } = useActiveCompany();

    const { theme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const isLight = mounted && (theme === "light" || resolvedTheme === "light");

    const lightStyles = {
        bg: "bg-[#F8FAFC]",
        containerBg: "bg-white",
        cardBg: "bg-white hover:bg-gray-50/50 border-gray-100 p-6 flex items-center gap-6 cursor-pointer rounded-2xl border transition-all hover:border-[#F59E0B]/30",
        border: "border-gray-100",
        inputBg: "bg-gray-50 border-gray-100 text-[#1E293B]",
        selectBg: "bg-gray-50 border-gray-200 text-[#1E293B]",
        textTitle: "text-[#1E293B]",
        placeholder: "placeholder:text-[#64748B]",
        emptyState: "bg-white border-gray-100",
        iconDefault: "text-[#64748B]",
        badgeBg: "bg-amber-500/10 text-amber-600 border-amber-200"
    };

    const darkStyles = {
        bg: "bg-[#0F1219]",
        containerBg: "bg-transparent",
        cardBg: "bg-[#1A1F2E] border-[#1E2A3B] p-6 flex items-center gap-6 cursor-pointer hover:border-[#F59E0B]/30 hover:bg-white/[0.02] transition-all rounded-2xl border",
        border: "border-[#1E2A3B]",
        inputBg: "bg-[#0F1219] border-[#1E2A3B] text-white",
        selectBg: "bg-[#0F1219] border-[#1E2A3B] text-[#64748B]",
        textTitle: "text-white",
        placeholder: "placeholder:text-[#334155]",
        emptyState: "bg-[#1A1F2E] border-[#1E2A3B]",
        iconDefault: "text-white",
        badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/20"
    };

    const s = isLight ? lightStyles : darkStyles;

    const fetchData = useCallback(async () => {
        if (!activeCompany) return;
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
                .in("id", ids)
                .eq("company_id", activeCompany.id);
            const evMap: Record<string, Event> = {};
            (evs ?? []).forEach((e) => { evMap[e.id] = e as Event; });
            setEvents(evMap);
        }
        setInvestigations((invs ?? []) as Investigation[]);
        setLoading(false);
    }, [activeCompany]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filtered = investigations.filter((inv) => {
        const ev = events[inv.incident_id];
        if (!ev) return false; // Filter out if not in this company
        if (filterStatus !== "all" && inv.status !== filterStatus) return false;
        if (search) {
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
        <div className={`flex-1 flex flex-col h-full overflow-hidden ${s.bg}`} style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Header */}
            <DashboardHeader onRefresh={fetchData} loading={loading}>
                <div className="flex items-center gap-6 flex-1">
                    <div>
                        <h1 className={`${s.textTitle} font-black text-xl tracking-tight leading-none uppercase`}>Investigaciones</h1>
                        <p className="text-[#64748B] text-[10px] font-bold uppercase tracking-wider mt-1">
                            Res. 1401/2007 — PROCESO POST-EVENTO
                        </p>
                    </div>
                    {openCount > 0 && (
                        <span className={`px-3 py-1 ${s.badgeBg} rounded-full text-[10px] font-black border uppercase tracking-wider`}>
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
                            className={`w-full ${s.inputBg} border ${s.border} rounded-xl !pl-[44px] pr-4 py-2.5 text-xs font-bold ${s.placeholder} focus:outline-none focus:border-[#F59E0B]/50 transition-colors`}
                        />
                    </div>
                    {/* Status filter */}
                    <div className={`flex rounded-xl overflow-hidden border ${s.border}`}>
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
                                        : `${isLight ? "bg-white text-[#64748B] hover:text-[#0F1219]" : "bg-[#0F1219] text-[#64748B] hover:text-white"}`,
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
                            <div key={i} className={`h-24 ${isLight ? "bg-gray-100" : "bg-[#1A1F2E]"} border ${s.border} rounded-2xl animate-pulse`} />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className={`${s.emptyState} border ${s.border} rounded-2xl p-12 text-center`}>
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
                                    className={s.cardBg}
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
                                            <p className={`${s.textTitle} font-semibold text-sm`}>
                                                {ev?.worker_name ?? ev?.reported_by_name ?? "Trabajador no identificado"}
                                            </p>
                                            <StatusBadge status={inv.status} isLight={isLight} />
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
