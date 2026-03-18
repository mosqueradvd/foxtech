/**
 * app/dashboard/inspections/page.tsx
 * Módulo 6 — Lista de inspecciones con filtros y semáforo de cumplimiento.
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
    ArrowLeft, Search, ClipboardList, AlertCircle,
    CheckCircle2, Clock, ChevronRight, Plus, Filter
} from "lucide-react";
import { supabase, type Inspection, type Company } from "@/lib/supabase";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { INSPECTION_TEMPLATES } from "@/lib/inspection-templates";
import { StatCardSkeleton, InspectionListSkeleton } from "@/components/dashboard/skeletons";
import * as LucideIcons from "lucide-react";

function DynamicIcon({ name, className }: { name: string; className?: string }) {
    const IconComponent = (LucideIcons as any)[name?.split("-").map(p => p.charAt(0).toUpperCase() + p.slice(1)).join("")] || LucideIcons.ClipboardList;
    return <IconComponent className={className} />;
}

// ── Score semaphore ────────────────────────────────────────────────────────────

const lightStyles = {
    bg: "bg-[#F8F9FA]",
    textTitle: "text-[#0F1219]",
    subtitle: "text-[#64748B]",
    containerBg: "bg-white",
    border: "border-[#E2E8F0]",
    cardBg: "bg-white border-[#E2E8F0] hover:bg-slate-50/50",
    itemTitle: "text-[#1B253B]",
    inputBg: "bg-gray-50 border-[#E2E8F0] text-gray-900 focus:border-[#F59E0B]/50",
    selectBg: "bg-gray-50 border-[#E2E8F0] text-gray-900",
    placeholder: "placeholder:text-gray-400",
};

const darkStyles = {
    bg: "bg-[#0F1219]",
    textTitle: "text-white",
    subtitle: "text-[#64748B]",
    containerBg: "bg-[#1A1F2E]",
    border: "border-[#1E2A3B]",
    cardBg: "bg-[#1A1F2E] border-[#1E2A3B] hover:bg-white/[0.02]",
    itemTitle: "text-white",
    inputBg: "bg-[#0F1219] border-[#1E2A3B] text-white focus:border-amber-500/50",
    selectBg: "bg-[#0F1219] border-[#1E2A3B] text-white",
    placeholder: "placeholder:text-[#334155]",
};

function ScoreBadge({ score, isLight }: { score: number; isLight?: boolean }) {
    const cfg = score >= 80
        ? { cls: isLight ? "bg-green-100 text-green-800 border-green-200" : "bg-emerald-400/10 text-emerald-400 border-emerald-400/20", label: `${score}%` }
        : score >= 60
            ? { cls: isLight ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-amber-400/10 text-amber-400 border-amber-400/20", label: `${score}%` }
            : { cls: isLight ? "bg-red-100 text-red-800 border-red-200" : "bg-red-400/10 text-red-400 border-red-400/20", label: `${score}%` };
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.cls}`}>
            {cfg.label}
        </span>
    );
}

function StatusBadge({ status, isLight }: { status?: string; isLight?: boolean }) {
    const classes = status === "cerrada"
        ? (isLight ? "bg-green-100 text-green-800 border-green-200" : "bg-emerald-400/10 text-emerald-400 border-emerald-400/20")
        : (isLight ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-amber-400/10 text-amber-400 border-amber-400/20");

    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${classes}`}>
            {status === "cerrada" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {status === "cerrada" ? "Cerrada" : "Abierta"}
        </span>
    );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function InspectionsListPage() {
    const router = useRouter();
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const [inspections, setInspections] = useState<Inspection[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterTemplate, setFilterTemplate] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");
    const { activeCompany } = useActiveCompany();

    const isLight = resolvedTheme === "light";
    const s = isLight ? lightStyles : darkStyles;

    const load = useCallback(async () => {
        if (!activeCompany) return;
        setLoading(true);
        const { data: insp } = await supabase
            .from("inspections")
            .select("*")
            .eq("company_id", activeCompany.id)
            .order("created_at", { ascending: false });
        
        setInspections((insp ?? []) as Inspection[]);
        setCompanies([activeCompany as Company]);
        setLoading(false);
    }, [activeCompany]);

    useEffect(() => { load(); }, [load]);

    // ── Filtering ──────────────────────────────────────────────────────────────
    const filtered = inspections.filter((i) => {
        const q = search.toLowerCase();
        const matchText = !q ||
            (i.inspector_name ?? "").toLowerCase().includes(q) ||
            (i.template_name ?? "").toLowerCase().includes(q) ||
            (i.location_name ?? "").toLowerCase().includes(q);
        const matchTemplate = filterTemplate === "all" || i.template_id === filterTemplate;
        const matchStatus = filterStatus === "all" || i.status === filterStatus;
        return matchText && matchTemplate && matchStatus;
    });

    if (!mounted) return null;

    // ── Counters ───────────────────────────────────────────────────────────────
    const openCount = inspections.filter((i) => i.status !== "cerrada").length;
    const critCount = inspections.filter((i) => (i.score_percent ?? 100) < 60).length;

    // ── Company name helper ────────────────────────────────────────────────────
    const companyName = (id?: string) => companies.find((c) => c.id === id)?.razon_social ?? "—";

    return (
        <div className={`flex-1 flex flex-col h-full overflow-hidden ${s.bg}`} style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* HEADER */}
            <DashboardHeader onRefresh={load} loading={loading}>
                <div className="flex items-center justify-between flex-1">
                    <div>
                        <h1 className={`${s.textTitle} font-black text-xl tracking-tight leading-none uppercase`}>Inspecciones</h1>
                        <p className="text-[#64748B] text-[10px] font-bold uppercase tracking-wider mt-1">
                            Dec. 1072/2015 — Res. 4272/2021 — RETIE
                        </p>
                    </div>
                    <button
                        onClick={() => router.push("/inspection")}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#F59E0B] text-black text-xs font-black rounded-xl hover:bg-amber-400 transition-colors cursor-pointer uppercase tracking-tight"
                    >
                        <Plus className="w-4 h-4" />
                        Nueva Inspección
                    </button>
                </div>
            </DashboardHeader>

            <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8">
                {/* KPI strip */}
                <div className="grid grid-cols-3 gap-6">
                    {loading ? (
                        <>
                            <StatCardSkeleton />
                            <StatCardSkeleton />
                            <StatCardSkeleton />
                        </>
                    ) : (
                        <>
                            <StatCard
                                title="TOTAL"
                                subtitle="Inspecciones"
                                value={inspections.length}
                                color="#64748B"
                                icon={ClipboardList}
                            />
                            <StatCard
                                title="ABIERTAS"
                                subtitle="Pendientes"
                                value={openCount}
                                color="#F59E0B"
                                icon={Clock}
                            />
                            <StatCard
                                title="CRÍTICAS"
                                subtitle="Cumplimiento < 60%"
                                value={critCount}
                                color="#EF4444"
                                icon={AlertCircle}
                            />
                        </>
                    )}
                </div>

                {/* Filters */}
                <div className={`${s.containerBg} border ${s.border} rounded-2xl p-6 space-y-4`}>
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] pointer-events-none" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por inspector, ubicación..."
                            className={`${s.inputBg} border ${s.border} !pl-[44px] rounded-xl pr-4 py-2.5 text-xs font-bold outline-none font-sans w-full ${s.placeholder}`}
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <select value={filterTemplate} onChange={(e) => setFilterTemplate(e.target.value)}
                            className={`${s.selectBg} border ${s.border} rounded-xl px-4 py-2.5 ${s.textTitle} text-xs font-bold outline-none focus:border-[#F59E0B]/50 appearance-none`}>
                            <option value="all">Todos los templates</option>
                            {INSPECTION_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                            className={`${s.selectBg} border ${s.border} rounded-xl px-4 py-2.5 ${s.textTitle} text-xs font-bold outline-none focus:border-[#F59E0B]/50 appearance-none`}>
                            <option value="all">Todos los estados</option>
                            <option value="abierta">Abiertas</option>
                            <option value="cerrada">Cerradas</option>
                        </select>
                    </div>
                </div>

                {/* List */}
                {loading ? (
                    <InspectionListSkeleton />
                ) : filtered.length === 0 ? (
                    <div className={`${s.containerBg} border ${s.border} rounded-2xl p-12 text-center`}>
                        <ClipboardList className="w-10 h-10 text-[#334155] mx-auto mb-3" />
                        <p className="text-[#64748B] font-semibold">
                            {inspections.length === 0 ? "Sin inspecciones registradas" : "Sin resultados para este filtro"}
                        </p>
                        {inspections.length === 0 && (
                            <button onClick={() => router.push("/inspection")}
                                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#F59E0B] text-black font-bold rounded-xl text-sm hover:bg-amber-400 transition-colors">
                                <Plus className="w-4 h-4" /> Crear primera inspección
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filtered.map((insp) => {
                            const score = insp.score_percent ?? 0;
                            const openFindings = (insp.action_plan ?? []).filter((a) => a.status !== "cerrado").length;
                            const template = INSPECTION_TEMPLATES.find((t) => t.id === insp.template_id);
                            return (
                                <button key={insp.id} onClick={() => router.push(`/dashboard/inspections/${insp.id}`)}
                                    className={`w-full text-left ${s.cardBg} border ${s.border} rounded-2xl p-6 hover:border-[#F59E0B]/30 transition-all flex items-center gap-6 cursor-pointer`}>
                                    {/* Template icon */}
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg flex-shrink-0 border ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"}`}>
                                        <DynamicIcon name={template?.icon ?? "clipboard-list"} className="w-6 h-6 text-[#F59E0B]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center flex-wrap gap-2 mb-1">
                                            <span className={`${s.itemTitle} font-semibold text-sm truncate`}>
                                                {insp.template_name ?? template?.name ?? "Inspección"}
                                            </span>
                                            <StatusBadge status={insp.status} isLight={isLight} />
                                            {openFindings > 0 && (
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${isLight ? "bg-red-100 text-red-800 border-red-200" : "bg-red-400/10 text-red-400 border-red-400/20"}`}>
                                                    <AlertCircle className="w-3 h-3" />
                                                    {openFindings} hallazgo{openFindings > 1 ? "s" : ""}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[#64748B] text-xs truncate">
                                            {insp.inspector_name ? `Inspector: ${insp.inspector_name}` : "Sin inspector"}
                                            {insp.company_id ? ` · ${companyName(insp.company_id)}` : ""}
                                            {" · "}{new Date(insp.created_at ?? "").toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <ScoreBadge score={score} isLight={isLight} />
                                        <ChevronRight className="w-4 h-4 text-[#334155]" />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
