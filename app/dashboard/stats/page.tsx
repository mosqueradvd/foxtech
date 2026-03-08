/**
 * app/dashboard/stats/page.tsx
 * Módulo 5 — Estadísticas de Accidentalidad
 * Decreto 1072/2015, Art. 2.2.4.6.32
 * Indicadores: IF, IS, ILI, TA, Mortalidad
 */
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft, BarChart2, TrendingUp, TrendingDown,
    Minus, AlertTriangle, RefreshCw, Settings,
    Activity, Zap, Shield, Users, Skull, ChevronDown
} from "lucide-react";
import {
    LineChart, Line, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    Cell
} from "recharts";
import { supabase, type Event, type Company } from "@/lib/supabase";
import {
    calcIndicators, groupByMonth, groupByClassification,
    filterByPeriod, periodToRange, monthsInRange, estimateHHT,
    type StatsIndicators, type PeriodPreset,
} from "@/lib/stats/indicators";

// ── Types ─────────────────────────────────────────────────────────────────────

interface HHTConfig {
    manual: number | null;
    estimated: number;
}

// ── Period options ─────────────────────────────────────────────────────────────

const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
    { value: "month", label: "Este mes" },
    { value: "quarter", label: "Este trimestre" },
    { value: "year", label: "Este año" },
];

// ── Benchmark ranges (CCS reference) ─────────────────────────────────────────

function ifColor(v: number): string {
    if (v === 0) return "text-emerald-400";
    if (v < 5) return "text-emerald-400";
    if (v < 15) return "text-amber-400";
    return "text-red-400";
}

function isColor(v: number): string {
    if (v === 0) return "text-emerald-400";
    if (v < 50) return "text-emerald-400";
    if (v < 150) return "text-amber-400";
    return "text-red-400";
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPICard({
    icon: Icon, label, value, unit, colorFn, prev, description
}: {
    icon: React.ElementType;
    label: string;
    value: number;
    unit?: string;
    colorFn?: (v: number) => string;
    prev?: number;
    description: string;
}) {
    const color = colorFn ? colorFn(value) : "text-white";
    const diff = prev !== undefined ? value - prev : undefined;
    const hasChange = diff !== undefined && isFinite(diff);

    const formatted =
        value === 0 ? "0" :
            value < 0.01 ? "< 0.01" :
                value < 10 ? value.toFixed(2) :
                    value < 100 ? value.toFixed(1) :
                        Math.round(value).toLocaleString("es-CO");

    return (
        <div className="bg-[#141824] border border-[#1E2A3B] rounded-2xl p-5 flex flex-col gap-3 hover:border-[#F59E0B]/30 transition-colors cursor-pointer">
            <div className="flex items-start justify-between">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color === "text-emerald-400" ? "bg-emerald-400/10" :
                    color === "text-amber-400" ? "bg-amber-400/10" :
                        color === "text-red-400" ? "bg-red-400/10" : "bg-white/5"
                    }`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                </div>
                {hasChange && (
                    <div className="flex flex-col items-end">
                        <div className={`flex items-center gap-1 text-xs font-semibold ${Math.abs(diff) < 0.01 ? "text-[#64748B]" :
                            diff < 0 ? "text-emerald-400" : "text-red-400"
                            }`}>
                            {Math.abs(diff) < 0.01
                                ? <Minus className="w-3 h-3" />
                                : diff < 0
                                    ? <TrendingDown className="w-3 h-3" />
                                    : <TrendingUp className="w-3 h-3" />
                            }
                            {Math.abs(diff).toFixed(1)}
                        </div>
                        <span className="text-[9px] font-normal text-[#64748B] mt-0.5">vs. período anterior</span>
                    </div>
                )}
            </div>
            <div>
                <p className="text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-1">{label}</p>
                <p className={`text-2xl font-black ${color}`}>
                    {formatted}
                    {unit && <span className="text-sm font-normal text-[#64748B] ml-1">{unit}</span>}
                </p>
            </div>
            <p className="text-[#64748B] font-bold text-[10px] leading-relaxed">{description}</p>
        </div>
    );
}

// ── Custom chart tooltip ───────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: {
    active?: boolean; payload?: { color: string; name: string; value: number }[]; label?: string;
}) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[#1E2A3B] border border-[#334155] rounded-xl p-3 text-xs">
            <p className="text-white font-bold mb-2">{label}</p>
            {payload.map((p) => (
                <div key={p.name} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-[#94A3B8]">{p.name}:</span>
                    <span className="text-white font-semibold">{p.value}</span>
                </div>
            ))}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function StatsPage() {
    const router = useRouter();

    // Data
    const [allEvents, setAllEvents] = useState<Event[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [period, setPeriod] = useState<PeriodPreset>("year");
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
    const [hhtOverride, setHhtOverride] = useState<string>("");
    const [workerOverride, setWorkerOverride] = useState<string>("");
    const [showHHTInput, setShowHHTInput] = useState(false);

    // ── Load ────────────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        const [{ data: evData }, { data: coData }] = await Promise.all([
            supabase
                .from("incidents")
                .select("*")
                .order("created_at", { ascending: false }),
            supabase.from("companies").select("*"),
        ]);
        setAllEvents((evData ?? []) as Event[]);
        setCompanies((coData ?? []) as Company[]);
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Derived: filter events ────────────────────────────────────────────
    const range = useMemo(() => periodToRange(period), [period]);
    const prevRange = useMemo(() => {
        const months = monthsInRange(range);
        const fromMs = range.from.getTime() - months * 30.44 * 24 * 3600 * 1000;
        const toMs = range.from.getTime() - 1;
        return { from: new Date(fromMs), to: new Date(toMs) };
    }, [range]);

    const filteredEvents = useMemo(() => {
        let ev = allEvents;
        if (selectedCompanyId !== "all") {
            ev = ev.filter((e) => e.company_id === selectedCompanyId);
        }
        return filterByPeriod(ev, range);
    }, [allEvents, selectedCompanyId, range]);

    const prevEvents = useMemo(() => {
        let ev = allEvents;
        if (selectedCompanyId !== "all") {
            ev = ev.filter((e) => e.company_id === selectedCompanyId);
        }
        return filterByPeriod(ev, prevRange);
    }, [allEvents, selectedCompanyId, prevRange]);

    // ── HHT ──────────────────────────────────────────────────────────────
    const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
    const dbWorkerCount =
        selectedCompany?.employee_count ??
        companies.reduce((s, c) => s + (c.employee_count ?? 0), 0);
    const workerCount = workerOverride !== "" ? Number(workerOverride) : Math.max(dbWorkerCount, 1);
    const monthsInPeriod = monthsInRange(range);
    const estimatedHHT = estimateHHT(workerCount, monthsInPeriod);
    const hhtValue = hhtOverride !== "" ? Number(hhtOverride) : estimatedHHT;

    // ── Indicators ────────────────────────────────────────────────────────
    const stats = useMemo(
        () => calcIndicators(filteredEvents, hhtValue, Math.max(workerCount, 1)),
        [filteredEvents, hhtValue, workerCount]
    );
    const prevStats = useMemo(
        () => calcIndicators(prevEvents, estimateHHT(Math.max(workerCount, 1), monthsInPeriod), Math.max(workerCount, 1)),
        [prevEvents, workerCount, monthsInPeriod]
    );

    // ── Chart data ────────────────────────────────────────────────────────
    const trendData = useMemo(() => groupByMonth(allEvents.filter(
        (e) => selectedCompanyId === "all" || e.company_id === selectedCompanyId
    ), 12), [allEvents, selectedCompanyId]);

    const classData = useMemo(() => groupByClassification(filteredEvents), [filteredEvents]);

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#0F1420]" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* ── HEADER ── */}
            <header className="bg-[#141824] border-b border-[#1E2A3B] px-6 py-4 flex items-center gap-4 sticky top-0 z-30">
                <button
                    onClick={() => router.push("/dashboard")}
                    className="p-2 rounded-lg text-[#64748B] hover:text-white hover:bg-white/5 transition-all"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-3">
                    <BarChart2 className="w-5 h-5 text-[#F59E0B]" />
                    <div>
                        <h1 className="text-white font-bold text-base leading-none">ESTADÍSTICAS</h1>
                        <p className="text-[#64748B] text-xs mt-0.5">Indicadores de accidentalidad — Dec. 1072/2015</p>
                    </div>
                </div>
                <button
                    onClick={fetchData}
                    className="ml-auto p-2 rounded-lg text-[#64748B] hover:text-white hover:bg-white/5 transition-all"
                    title="Actualizar datos"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
                {/* ── FILTERS ── */}
                <section className="bg-[#141824] border border-[#1E2A3B] rounded-2xl p-4 flex flex-wrap items-end gap-4">
                    {/* Period */}
                    <div>
                        <label className="block text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-1.5">
                            Período
                        </label>
                        <div className="flex rounded-xl overflow-hidden border border-[#1E2A3B]">
                            {PERIOD_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setPeriod(opt.value)}
                                    className={[
                                        "px-4 py-2 text-xs font-semibold transition-colors cursor-pointer",
                                        period === opt.value
                                            ? "bg-[#F59E0B] text-black"
                                            : "bg-[#0F1420] text-[#64748B] hover:text-white",
                                    ].join(" ")}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Company */}
                    <div>
                        <label className="block text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-1.5">
                            Empresa
                        </label>
                        <div className="relative">
                            <select
                                value={selectedCompanyId}
                                onChange={(e) => setSelectedCompanyId(e.target.value)}
                                className="appearance-none bg-[#0F1420] border border-[#1E2A3B] rounded-xl pl-3 pr-10 py-2 text-white text-sm focus:outline-none focus:border-[#F59E0B]/50 transition-colors cursor-pointer"
                            >
                                <option value="all">Todas las empresas</option>
                                {companies.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-[#64748B] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>

                    {/* Workers & HHT */}
                    <div className="flex-1 min-w-[320px] flex gap-4">
                        <div className="flex-1">
                            <label className="block text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-1.5">
                                Trabajadores
                            </label>
                            <input
                                type="number"
                                placeholder={dbWorkerCount > 0 ? dbWorkerCount.toString() : "Ej: 150"}
                                value={workerOverride}
                                onChange={(e) => setWorkerOverride(e.target.value)}
                                className="w-full bg-[#0F1420] border border-[#1E2A3B] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F59E0B]/50 transition-colors placeholder:text-[#334155]"
                            />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                                <label className="text-[#64748B] text-xs font-semibold uppercase tracking-wider">
                                    HHT
                                </label>
                                <button
                                    onClick={() => setShowHHTInput(!showHHTInput)}
                                    className="text-[#F59E0B] hover:text-amber-300 transition-colors"
                                    title="Editar HHT manual"
                                >
                                    <Settings className="w-3 h-3" />
                                </button>
                            </div>
                            {showHHTInput ? (
                                <input
                                    type="number"
                                    placeholder={`Est: ${estimatedHHT.toLocaleString("es-CO")}`}
                                    value={hhtOverride}
                                    onChange={(e) => setHhtOverride(e.target.value)}
                                    className="w-full bg-[#0F1420] border border-[#1E2A3B] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F59E0B]/50 transition-colors placeholder:text-[#334155]"
                                />
                            ) : (
                                <div className="bg-[#0F1420] border border-[#1E2A3B] rounded-xl px-3 py-2 text-white text-sm flex items-center h-[38px]">
                                    {hhtValue.toLocaleString("es-CO")} h
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Range display */}
                    <div className="text-right">
                        <p className="text-[#64748B] text-xs">
                            {range.from.toLocaleDateString("es-CO")} → {range.to.toLocaleDateString("es-CO")}
                        </p>
                        <p className="text-[#334155] text-xs">{filteredEvents.length} eventos</p>
                    </div>
                </section>

                {/* ── KPI CARDS ── */}
                {loading ? (
                    <div className="grid grid-cols-5 gap-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="bg-[#141824] border border-[#1E2A3B] rounded-2xl p-5 h-36 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <KPICard
                            icon={Activity}
                            label="IF — Índice de Frecuencia"
                            value={stats.IF}
                            colorFn={ifColor}
                            prev={prevStats.IF}
                            description="Accidentes por cada 240,000 horas trabajadas (base anual CCS)"
                        />
                        <KPICard
                            icon={Zap}
                            label="IS — Índice de Severidad"
                            value={stats.IS}
                            colorFn={isColor}
                            prev={prevStats.IS}
                            description="Días perdidos por cada 240,000 horas trabajadas"
                        />
                        <KPICard
                            icon={Shield}
                            label="ILI — Lesiones Incapacitantes"
                            value={stats.ILI}
                            colorFn={(v) => v === 0 ? "text-emerald-400" : v < 1 ? "text-amber-400" : "text-red-400"}
                            prev={prevStats.ILI}
                            description="(IF × IS) / 1,000 — combina frecuencia y severidad"
                        />
                        <KPICard
                            icon={Users}
                            label="TA — Tasa de Accidentalidad"
                            value={stats.TA}
                            unit="%"
                            colorFn={(v) => v === 0 ? "text-emerald-400" : v < 5 ? "text-amber-400" : "text-red-400"}
                            prev={prevStats.TA}
                            description="% de trabajadores que sufrieron un AT en el período"
                        />
                        <KPICard
                            icon={Skull}
                            label="Mortalidad"
                            value={stats.mortalidadPct}
                            unit="%"
                            colorFn={(v) => v === 0 ? "text-emerald-400" : "text-red-400"}
                            description="Fallecidos sobre total de AT del período"
                        />
                    </div>
                )}

                {/* ── EVENT SUMMARY CHIPS ── */}
                <div className="flex flex-wrap gap-3">
                    {[
                        { label: "Total Accidentes (AT)", value: stats.totalAT, color: "bg-amber-500/15 text-amber-400 border-amber-500/25 text-[16px]" },
                        { label: "AT Grave", value: stats.atGrave, color: "bg-orange-500/15 text-orange-400 border-orange-500/25" },
                        { label: "AT Fatal", value: stats.atFatal, color: "bg-red-500/15 text-red-400 border-red-500/25" },
                        { label: "Incidentes/Casi-acc.", value: stats.incidentes, color: "bg-blue-500/15 text-blue-400 border-blue-500/25" },
                        { label: "Condiciones inseguras", value: stats.condicionesInseguras, color: "bg-purple-500/15 text-purple-400 border-purple-500/25" },
                        { label: "Días de incapacidad", value: stats.totalDisabilityDays, color: "bg-[#1E2A3B] text-[#94A3B8] border-[#334155]" },
                    ].map((chip) => (
                        <span key={chip.label} className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-semibold ${chip.color}`}>
                            <span className="text-xl font-black">{chip.value}</span>
                            {chip.label}
                        </span>
                    ))}
                </div>

                {/* ── CHARTS GRID ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Trend chart */}
                    <section className="bg-[#141824] border border-[#1E2A3B] rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-5">
                            <TrendingUp className="w-4 h-4 text-[#F59E0B]" />
                            <h2 className="text-white font-semibold text-sm">Tendencia mensual — últimos 12 meses</h2>
                        </div>
                        {loading ? (
                            <div className="h-56 bg-[#0F1420] rounded-xl animate-pulse" />
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2A3B" />
                                    <XAxis dataKey="label" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Legend
                                        wrapperStyle={{ fontSize: 11, color: "#64748B", paddingTop: 8 }}
                                    />
                                    <Line
                                        type="monotone" dataKey="at" name="AT"
                                        stroke="#F59E0B" strokeWidth={2} dot={{ fill: "#F59E0B", r: 3 }}
                                        activeDot={{ r: 5 }}
                                    />
                                    <Line
                                        type="monotone" dataKey="grave" name="Grave"
                                        stroke="#F97316" strokeWidth={2} dot={{ fill: "#F97316", r: 3 }}
                                    />
                                    <Line
                                        type="monotone" dataKey="incidentes" name="Incidentes"
                                        stroke="#3B82F6" strokeWidth={2} dot={{ fill: "#3B82F6", r: 3 }}
                                        strokeDasharray="4 2"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </section>

                    {/* Classification breakdown */}
                    <section className="bg-[#141824] border border-[#1E2A3B] rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-5">
                            <BarChart2 className="w-4 h-4 text-[#F59E0B]" />
                            <h2 className="text-white font-semibold text-sm">Distribución por clasificación — período seleccionado</h2>
                        </div>
                        {loading ? (
                            <div className="h-56 bg-[#0F1420] rounded-xl animate-pulse" />
                        ) : classData.length === 0 ? (
                            <div className="h-56 flex items-center justify-center">
                                <p className="text-[#334155] text-sm">Sin eventos en este período</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={classData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2A3B" horizontal={false} />
                                    <XAxis type="number" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <YAxis type="category" dataKey="label" tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={false} tickLine={false} width={130} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Bar dataKey="value" name="Eventos" radius={[0, 6, 6, 0]}>
                                        {classData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </section>
                </div>

                {/* ── EVENTS TABLE ── */}
                <section className="bg-[#141824] border border-[#1E2A3B] rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-[#1E2A3B] flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
                        <h2 className="text-white font-semibold text-sm">Detalle de eventos — período seleccionado</h2>
                        <span className="ml-auto text-[#64748B] text-xs">{filteredEvents.length} eventos</span>
                    </div>
                    {loading ? (
                        <div className="p-5 space-y-2">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-10 bg-[#0F1420] rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : filteredEvents.length === 0 ? (
                        <div className="py-12 text-center">
                            <p className="text-[#64748B] text-sm">Sin eventos en este período</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[#1E2A3B]">
                                        {["Fecha", "Trabajador", "Clasificación", "Lesión", "Días incap.", "Estado"].map((h) => (
                                            <th key={h} className="px-4 py-3 text-left text-[#64748B] text-xs font-semibold uppercase tracking-wider">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredEvents.slice(0, 50).map((ev, i) => {
                                        const isAT = ["ACCIDENTE_TRABAJO", "ACCIDENTE_TRABAJO_GRAVE", "ACCIDENTE_TRABAJO_FATAL"].includes(ev.classification ?? "");
                                        const isFatal = ev.classification === "ACCIDENTE_TRABAJO_FATAL";
                                        const isGrave = ev.classification === "ACCIDENTE_TRABAJO_GRAVE";
                                        return (
                                            <tr
                                                key={ev.id}
                                                className={`border-b border-[#1E2A3B]/50 cursor-pointer hover:bg-white/3 transition-colors ${i % 2 === 0 ? "" : "bg-[#0F1420]/30"}`}
                                                onClick={() => router.push(`/dashboard/events/${ev.id}`)}
                                            >
                                                <td className="px-4 py-3 text-[#94A3B8] text-xs whitespace-nowrap">
                                                    {(ev.event_date || ev.created_at || "").slice(0, 10)}
                                                </td>
                                                <td className="px-4 py-3 text-white text-xs">
                                                    {ev.worker_name || "Sin asignar"}
                                                </td>
                                                <td className="px-4 py-3 text-xs">
                                                    {ev.classification_status === "classified" ? (
                                                        <span className={`px-2 py-0.5 rounded-full font-semibold ${isFatal ? "bg-red-500/20 text-red-400" :
                                                            isGrave ? "bg-orange-500/20 text-orange-400" :
                                                                isAT ? "bg-amber-500/20 text-amber-400" :
                                                                    "bg-blue-500/20 text-blue-400"
                                                            }`}>
                                                            {isFatal ? "AT Fatal" : isGrave ? "AT Grave" : isAT ? "AT" : (ev.classification ?? "—").replace(/_/g, " ")}
                                                        </span>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[#94A3B8] capitalize">{((ev.event_type || "") as string).replace(/_/g, " ")}</span>
                                                            <span className="bg-[#334155]/50 text-[#94A3B8] px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider">Sin clasificar</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-[#94A3B8] text-xs">
                                                    {ev.injury_nature || "—"}
                                                </td>
                                                <td className="px-4 py-3 text-center text-xs">
                                                    {isAT
                                                        ? <span className={`font-bold ${(ev.disability_days ?? 0) > 0 ? "text-amber-400" : "text-[#64748B]"}`}>
                                                            {ev.disability_days ?? 0}
                                                        </span>
                                                        : <span className="text-[#334155]">—</span>
                                                    }
                                                </td>
                                                <td className="px-4 py-3 text-xs">
                                                    <span className={`px-2 py-0.5 rounded-full font-semibold ${ev.classification_status === "classified"
                                                        ? "bg-blue-500/15 text-blue-400"
                                                        : "bg-amber-500/15 text-amber-500"
                                                        }`}>
                                                        {ev.classification_status === "classified" ? "Clasificado" : "Pendiente"}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {filteredEvents.length > 50 && (
                                <p className="px-5 py-3 text-[#64748B] text-xs text-center border-t border-[#1E2A3B]">
                                    Mostrando 50 de {filteredEvents.length} eventos
                                </p>
                            )}
                        </div>
                    )}
                </section>

                {/* ── LEGAL NOTE ── */}
                <p className="text-[#334155] text-xs text-center pb-2">
                    Indicadores calculados según Dec. 1072/2015 Art. 2.2.4.6.32 — Constante 240,000 HHT (base RUC/CCS)
                </p>
            </div>
        </div>
    );
}
