/**
 * app/dashboard/inspections/page.tsx
 * Módulo 6 — Lista de inspecciones con filtros y semáforo de cumplimiento.
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft, Search, ClipboardList, AlertCircle,
    CheckCircle2, Clock, ChevronRight, Plus, Filter
} from "lucide-react";
import { supabase, type Inspection, type Company } from "@/lib/supabase";
import { INSPECTION_TEMPLATES } from "@/lib/inspection-templates";
import * as LucideIcons from "lucide-react";

function DynamicIcon({ name, className }: { name: string; className?: string }) {
    const IconComponent = (LucideIcons as any)[name?.split("-").map(p => p.charAt(0).toUpperCase() + p.slice(1)).join("")] || LucideIcons.ClipboardList;
    return <IconComponent className={className} />;
}

// ── Score semaphore ────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
    const cfg = score >= 80
        ? { cls: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20", label: `${score}%` }
        : score >= 60
            ? { cls: "bg-amber-400/10 text-amber-400 border-amber-400/20", label: `${score}%` }
            : { cls: "bg-red-400/10 text-red-400 border-red-400/20", label: `${score}%` };
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.cls}`}>
            {cfg.label}
        </span>
    );
}

function StatusBadge({ status }: { status?: string }) {
    return status === "cerrada"
        ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"><CheckCircle2 className="w-3 h-3" />Cerrada</span>
        : <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400/10 text-amber-400 border border-amber-400/20"><Clock className="w-3 h-3" />Abierta</span>;
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function InspectionsListPage() {
    const router = useRouter();
    const [inspections, setInspections] = useState<Inspection[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterTemplate, setFilterTemplate] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterCompany, setFilterCompany] = useState("all");

    const load = useCallback(async () => {
        setLoading(true);
        const [{ data: insp }, { data: cos }] = await Promise.all([
            supabase.from("inspections").select("*").order("created_at", { ascending: false }),
            supabase.from("companies").select("id, name"),
        ]);
        setInspections((insp ?? []) as Inspection[]);
        setCompanies((cos ?? []) as Company[]);
        setLoading(false);
    }, []);

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
        const matchCompany = filterCompany === "all" || i.company_id === filterCompany;
        return matchText && matchTemplate && matchStatus && matchCompany;
    });

    // ── Counters ───────────────────────────────────────────────────────────────
    const openCount = inspections.filter((i) => i.status !== "cerrada").length;
    const critCount = inspections.filter((i) => (i.score_percent ?? 100) < 60).length;

    // ── Company name helper ────────────────────────────────────────────────────
    const companyName = (id?: string) => companies.find((c) => c.id === id)?.name ?? "—";

    return (
        <div className="min-h-screen bg-[#0F1420]" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* HEADER */}
            <header className="bg-[#141824] border-b border-[#1E2A3B] px-4 sm:px-6 py-4 flex items-center gap-3 sticky top-0 z-30">
                <button onClick={() => router.push("/dashboard")} className="p-2 rounded-lg text-[#64748B] hover:text-white hover:bg-white/5 transition-all cursor-pointer">
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-white font-bold text-sm sm:text-base leading-none">INSPECCIONES</h1>
                    <p className="text-[#64748B] text-xs mt-0.5">Dec. 1072/2015 — Res. 4272/2021 — RETIE</p>
                </div>
                <button onClick={() => router.push("/inspection")}
                    className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-[#F59E0B] text-black text-xs sm:text-sm font-bold rounded-xl hover:bg-amber-400 transition-colors cursor-pointer">
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Nueva Inspección</span>
                    <span className="sm:hidden">Nueva</span>
                </button>
            </header>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 space-y-5">
                {/* KPI strip */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: "Total", value: inspections.length, color: "text-white" },
                        { label: "Abiertas", value: openCount, color: "text-amber-400" },
                        { label: "Críticas (<60%)", value: critCount, color: "text-red-400" },
                    ].map((k) => (
                        <div key={k.label} className="bg-[#141824] border border-[#1E2A3B] rounded-2xl p-3 sm:p-4 text-center">
                            <p className={`text-xl sm:text-2xl font-black ${k.color}`}>{k.value}</p>
                            <p className="text-[#64748B] text-xs mt-0.5">{k.label}</p>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="bg-[#141824] border border-[#1E2A3B] rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2 bg-[#0F1420] border border-[#1E2A3B] rounded-xl px-3 py-2">
                        <Search className="w-4 h-4 text-[#64748B] flex-shrink-0" />
                        <input value={search} onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por inspector, template, ubicación..."
                            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-[#334155]" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <select value={filterTemplate} onChange={(e) => setFilterTemplate(e.target.value)}
                            className="bg-[#0F1420] border border-[#1E2A3B] rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[#F59E0B]/50">
                            <option value="all">Todos los templates</option>
                            {INSPECTION_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                            className="bg-[#0F1420] border border-[#1E2A3B] rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[#F59E0B]/50">
                            <option value="all">Todos los estados</option>
                            <option value="abierta">Abiertas</option>
                            <option value="cerrada">Cerradas</option>
                        </select>
                        <select value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)}
                            className="bg-[#0F1420] border border-[#1E2A3B] rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[#F59E0B]/50">
                            <option value="all">Todas las empresas</option>
                            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                </div>

                {/* List */}
                {loading ? (
                    <div className="text-center py-12 text-[#64748B]">Cargando inspecciones...</div>
                ) : filtered.length === 0 ? (
                    <div className="bg-[#141824] border border-[#1E2A3B] rounded-2xl p-12 text-center">
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
                                    className="w-full text-left bg-[#141824] border border-[#1E2A3B] rounded-2xl p-4 hover:border-[#F59E0B]/30 hover:bg-[#141824]/80 transition-all flex items-center gap-4 cursor-pointer">
                                    {/* Template icon */}
                                    <div className="w-10 h-10 rounded-xl bg-[#0F1420] border border-[#1E2A3B] flex items-center justify-center text-lg flex-shrink-0">
                                        <DynamicIcon name={template?.icon ?? "clipboard-list"} className="w-5 h-5 text-current" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center flex-wrap gap-2 mb-1">
                                            <span className="text-white font-semibold text-sm truncate">
                                                {insp.template_name ?? template?.name ?? "Inspección"}
                                            </span>
                                            <StatusBadge status={insp.status} />
                                            {openFindings > 0 && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-400/10 text-red-400 border border-red-400/20">
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
                                        <ScoreBadge score={score} />
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
