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
    Minus, AlertTriangle, RefreshCw, Settings, Download, Loader2, CheckCircle2,
    Activity, Zap, Shield, Users, Skull, ChevronDown, FileSpreadsheet,
    LayoutDashboard, User, MoreVertical, Bell, ClipboardList, Building2, FileText,
} from "lucide-react";
import HazardFrequencyWidget from "@/components/dashboard/HazardFrequencyWidget";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import {
    LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { supabase, type Event, type Company } from "@/lib/supabase";
import {
    calcIndicators, groupByMonth, groupByClassification,
    filterByPeriod, periodToRange, monthsInRange, estimateHHT,
    type StatsIndicators, type PeriodPreset,
} from "@/lib/stats/indicators";
import {
    generateHistoricalRUCExport,
    downloadBlob,
    type WorkCenterConfig,
} from "@/lib/exports/ruc-export";

// ── Types ─────────────────────────────────────────────────────────────────────

interface HHTConfig {
    manual: number | null;
    estimated: number;
}

// ── Components ────────────────────────────────────────────────────────────────

const StatCard = ({
    title,
    subtitle,
    value,
    unit = "",
    trend,
    trendIsUp,
    color,
    icon: Icon
}: {
    title: string;
    subtitle: string;
    value: number;
    unit?: string;
    trend: number;
    trendIsUp: boolean;
    color: string;
    icon: any;
}) => (
    <div className="bg-[#1A1F2E] border border-[#1E2A3B] rounded-2xl p-6 transition-all hover:bg-white/[0.02]">
        <div className="flex items-start justify-between mb-4">
            <div>
                <h3 className="text-white text-[10px] font-black tracking-widest leading-none mb-1 uppercase">{title}</h3>
                <p className="text-[#64748B] text-[10px] font-bold uppercase tracking-wider">{subtitle}</p>
            </div>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10">
                <Icon className="w-4 h-4" style={{ color }} />
            </div>
        </div>
        <div className="flex items-end gap-3 mb-4">
            <div className="text-3xl font-black text-white leading-none">
                {value < 0.01 && value > 0 ? "<0.01" : value.toLocaleString("es-CO", { maximumFractionDigits: 2 })}
                <span className="text-base ml-0.5">{unit}</span>
            </div>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${trendIsUp
                    ? "bg-red-500/10 text-red-500 border-red-500/20"
                    : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                }`}>
                {trendIsUp ? <TrendingUp className="w-2 h-2" /> : <TrendingDown className="w-2 h-2" />}
                {trend}%
            </div>
        </div>
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
            <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(value * (title === "TA" ? 10 : 20), 100)}%`, backgroundColor: color }}
            />
        </div>
    </div>
);

const AbsenteeismCard = ({
    label,
    value,
    color
}: {
    label: string,
    value: number,
    color: "orange" | "blue"
}) => {
    const textColor = color === "orange" ? "text-orange-400" : "text-blue-400";
    const barColor = color === "orange" ? "bg-orange-500" : "bg-blue-500";

    return (
        <div className="bg-[#1A1F2E] border border-[#1E2A3B] rounded-2xl p-6 flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-4">
                <div className={`w-1.5 h-1.5 rounded-full ${barColor}`} />
                <span className="text-[#64748B] text-[10px] font-black tracking-widest uppercase">{label}</span>
            </div>
            <div className={`text-4xl font-black ${textColor} leading-none mb-2`}>
                {value < 0.01 && value > 0 ? "< 0.01" : value.toFixed(2)}
            </div>
            <p className="text-[#475569] text-[9px] font-bold uppercase tracking-widest">
                Índice de ausentismo por HHT
            </p>
        </div>
    );
};

const SummaryChip = ({
    label,
    value,
    color
}: {
    label: string,
    value: number,
    color: "amber" | "orange" | "red" | "blue"
}) => {
    const variants = {
        amber: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
        red: "bg-red-500/10 text-red-500 border-red-500/20",
        blue: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
    };

    return (
        <div className={`px-4 py-2.5 rounded-xl border flex items-center gap-3 transition-opacity hover:opacity-80 cursor-default ${variants[color]}`}>
            <span className="text-lg font-black leading-none">{value}</span>
            <span className="text-[10px] font-black tracking-widest uppercase">{label}</span>
        </div>
    );
};

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

export function StatsPage() {
    const router = useRouter();

    // Data
    const [allEvents, setAllEvents] = useState<Event[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [period, setPeriod] = useState<PeriodPreset>("year");
    const { activeCompany } = useActiveCompany();
    const selectedCompanyId = activeCompany?.id || "all";
    const [cieFilter, setCieFilter] = useState<"Todos" | "CIE-10" | "CIE-11">("Todos");
    const [hhtOverride, setHhtOverride] = useState<string>("");
    const [workerOverride, setWorkerOverride] = useState<string>("");
    const [showHHTInput, setShowHHTInput] = useState(false);

    // Settings
    const [kConstant, setKConstant] = useState<number>(200000);
    const [commonIllnessDaysStr, setCommonIllnessDaysStr] = useState<string>("0");

    useEffect(() => {
        const savedK = localStorage.getItem("foxtech_k_constant");
        if (savedK) setKConstant(Number(savedK));
    }, []);

    const handleKChange = (val: number) => {
        setKConstant(val);
        localStorage.setItem("foxtech_k_constant", val.toString());
    };

    // For export
    const [exportState, setExportState] = useState<{ status: string, message?: string }>({ status: "idle" });

    // ── Load ────────────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        const [{ data: evData }, { data: coData }] = await Promise.all([
            supabase
                .from("incidents")
                .select("*, disability_records(*)")
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
        () => calcIndicators(filteredEvents, hhtValue, Math.max(workerCount, 1), kConstant),
        [filteredEvents, hhtValue, workerCount, kConstant]
    );
    const prevStats = useMemo(
        () => calcIndicators(prevEvents, estimateHHT(Math.max(workerCount, 1), monthsInPeriod), Math.max(workerCount, 1), kConstant),
        [prevEvents, workerCount, monthsInPeriod, kConstant]
    );

    // ── Chart data ────────────────────────────────────────────────────────
    const trendData = useMemo(() => groupByMonth(allEvents.filter(
        (e) => selectedCompanyId === "all" || e.company_id === selectedCompanyId
    ), 12), [allEvents, selectedCompanyId]);

    const hazardData = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredEvents.forEach(e => {
            const h = e.hazard_type || "No Especificado";
            counts[h] = (counts[h] || 0) + 1;
        });
        const colors = ["#F59E0B", "#3B82F6", "#EC4899", "#22C55E", "#8B5CF6", "#F97316", "#14B8A6", "#EAB308", "#64748B"];
        return Object.entries(counts)
            .map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }))
            .sort((a, b) => b.value - a.value);
    }, [filteredEvents]);

    // Absenteeism calculations
    const diasPerdidosEL = useMemo(
        () => filteredEvents.filter(e => e.classification === "ENFERMEDAD_LABORAL").reduce((sum, e) => sum + (e.disability_days ?? 0), 0),
        [filteredEvents]
    );
    const ausentismoLaboral = hhtValue > 0 ? ((stats.totalDisabilityDays + diasPerdidosEL) * kConstant) / hhtValue : 0;
    const ausentismoComun = hhtValue > 0 ? ((Number(commonIllnessDaysStr) || 0) * kConstant) / hhtValue : 0;

    const absenteeismByDiagnosis = useMemo(() => {
        const statsMap = new Map<string, {
            code: string;
            description: string;
            version: string | null;
            incapacitiesCount: number;
            totalDays: number;
        }>();

        let totalDaysAll = 0;

        filteredEvents.forEach(e => {
            const records = e.disability_records || [];
            records.forEach(r => {
                if (r.days_count > 0 && r.cie_codes && r.cie_codes.length > 0) {
                    r.cie_codes.forEach(codeItem => {
                        const key = codeItem.code;
                        if (!statsMap.has(key)) {
                            statsMap.set(key, {
                                code: codeItem.code,
                                description: codeItem.description,
                                version: r.cie_version || "CIE-11",
                                incapacitiesCount: 0,
                                totalDays: 0,
                            });
                        }
                        const s = statsMap.get(key)!;
                        s.incapacitiesCount += 1;
                        s.totalDays += r.days_count;
                    });
                    totalDaysAll += r.days_count;
                }
            });
        });

        const filtered = Array.from(statsMap.values()).filter(x =>
            cieFilter === "Todos" || x.version === cieFilter
        ).sort((a, b) => b.totalDays - a.totalDays);

        return { list: filtered, totalDaysAll };
    }, [filteredEvents, cieFilter]);


    // ── Historical 5-year RUC ──────────────────────────────────────────────
    const historicalData = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4];

        return years.map(year => {
            const yearEvents = allEvents.filter(e => {
                const isMatchingCompany = selectedCompanyId === "all" || e.company_id === selectedCompanyId;
                const d = new Date(e.event_date || e.created_at || "");
                return isMatchingCompany && d.getFullYear() === year;
            });
            const hhtForYear = estimateHHT(Math.max(workerCount, 1), 12);
            const yStats = calcIndicators(yearEvents, hhtForYear, Math.max(workerCount, 1), kConstant);

            const atMortales = yStats.atFatal;
            const atConIncap = yearEvents.filter(e => e.classification !== "ACCIDENTE_TRABAJO_FATAL" && (e.classification?.startsWith("ACCIDENTE_TRABAJO") ?? false) && (e.disability_days ?? 0) > 0).length;
            const atSinIncap = yearEvents.filter(e => e.classification !== "ACCIDENTE_TRABAJO_FATAL" && (e.classification?.startsWith("ACCIDENTE_TRABAJO") ?? false) && (e.disability_days ?? 0) === 0).length;
            const totalAT = yStats.totalAT;
            const diasIncap = yStats.totalDisabilityDays;
            const el = yearEvents.filter(e => e.classification === "ENFERMEDAD_LABORAL").length;
            const incidentes = yStats.incidentes;

            return {
                year, events: yearEvents, hhtForYear,
                atMortales, atConIncap, atSinIncap, totalAT, diasIncap, el, incidentes,
                IF: yStats.IF, IS: yStats.IS
            };
        });
    }, [allEvents, selectedCompanyId, workerCount]);

    // Export handler
    const handleExportHistorical = useCallback(() => {
        setExportState({ status: "generating" });

        // Read profile from local storage or use defaults + db fields
        const saved = typeof window !== "undefined" ? localStorage.getItem("foxtech_company_profile") : null;
        let profile = { name: selectedCompany?.razon_social || "Empresa", nit: selectedCompany?.nit || "0000", city: selectedCompany?.direccion || "Bogotá", ciiu: "0000", riskClass: 3 };
        if (saved) {
            try { profile = { ...profile, ...JSON.parse(saved) }; } catch { }
        }

        const config: WorkCenterConfig = {
            companyName: profile.name,
            nit: profile.nit,
            workCenter: profile.city,
            ciiuCode: profile.ciiu,
            riskClass: profile.riskClass,
        };

        const periods = historicalData.map(h => ({
            year: h.year,
            month: 0, // historical uses aggregated full year. We pass 0 as nominal for annual.
            workerCount,
            manHoursWorked: h.hhtForYear,
            accidents: h.events.filter(e => e.event_type === "accidente" || e.event_type === "accidente_grave"),
            incidents: h.incidentes,
            occupationalDiseases: h.el,
            kConstant,
        }));

        const result = generateHistoricalRUCExport(config, periods);

        if (result.success && result.blob) {
            downloadBlob(result.blob, result.fileName);
            setExportState({ status: "done", message: `Descargado: ${result.fileName}` });
            setTimeout(() => setExportState({ status: "idle" }), 3000);
        } else {
            setExportState({ status: "error", message: result.errors.join(" | ") });
        }
    }, [historicalData, selectedCompany, workerCount]);


    // ── Render ────────────────────────────────────────────────────────────
    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* ── TOP HEADER (FILTERS) ── */}
            <DashboardHeader onRefresh={fetchData} loading={loading}>
                <div className="flex items-center gap-8">
                    {/* Period Filter */}
                    <div>
                        <label className="block text-[#64748B] text-[9px] font-black uppercase tracking-[0.2em] mb-2 leading-none">
                            Período
                        </label>
                        <div className="relative">
                            <select
                                value={period}
                                onChange={(e) => setPeriod(e.target.value as PeriodPreset)}
                                className="appearance-none bg-[#0F1219] border border-[#1E2A3B] rounded-lg px-4 py-2 text-white text-xs font-bold focus:outline-none focus:border-amber-500/50 cursor-pointer pr-10"
                            >
                                <option value="year">2026</option>
                                <option value="quarter">Trimestre Actual</option>
                                <option value="month">Marzo 2026</option>
                            </select>
                            <ChevronDown className="w-4 h-4 text-[#64748B] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>

                    {/* Tools Config / Optional slot */}
                    <div className="flex-1" />

                    {/* Workers Filter */}
                    <div>
                        <label className="block text-[#64748B] text-[9px] font-black uppercase tracking-[0.2em] mb-2 leading-none">
                            Trabajadores
                        </label>
                        <input
                            type="number"
                            placeholder={dbWorkerCount.toString()}
                            value={workerOverride}
                            onChange={(e) => setWorkerOverride(e.target.value)}
                            className="bg-[#0F1219] border border-[#1E2A3B] rounded-lg px-4 py-2 text-white text-xs font-bold focus:outline-none focus:border-amber-500/50 w-24"
                        />
                    </div>
                </div>
            </DashboardHeader>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* ── KPI SECTION ── */}
                <div id="kpi-section" className="grid grid-cols-4 gap-6">
                    <StatCard
                        title="IF"
                        subtitle="Frecuencia"
                        value={stats.IF}
                        trend={2.4}
                        trendIsUp={false}
                        color="#F59E0B"
                        icon={Activity}
                    />
                    <StatCard
                        title="IS"
                        subtitle="Severidad"
                        value={stats.IS}
                        trend={1.2}
                        trendIsUp={true}
                        color="#06B6D4"
                        icon={Zap}
                    />
                    <StatCard
                        title="TA"
                        subtitle="Accidentalidad"
                        value={stats.TA}
                        unit="%"
                        trend={0.5}
                        trendIsUp={false}
                        color="#8B5CF6"
                        icon={TrendingUp}
                    />
                    <StatCard
                        title="MORTALIDAD"
                        subtitle="Tasa Fatal"
                        value={stats.mortalidadPct}
                        unit="%"
                        trend={0}
                        trendIsUp={false}
                        color="#EF4444"
                        icon={Skull}
                    />
                </div>

                {/* ── SUMMARY CHIPS ── */}
                <div id="summary-section" className="flex flex-wrap gap-4">
                    <SummaryChip label="AT" value={stats.totalAT} color="amber" />
                    <SummaryChip label="AT GRAVE" value={stats.atGrave} color="orange" />
                    <SummaryChip label="AT FATAL" value={stats.atFatal} color="red" />
                    <SummaryChip label="INCIDENTES REPORTADOS" value={stats.incidentes} color="blue" />
                </div>

                {/* ── CENTRAL SECTION: TREND CHART & ABSENTEEISM ── */}
                <div id="central-section" className="grid grid-cols-12 gap-6">
                    {/* Trend Area Chart (65%) */}
                    <div className="col-span-8 bg-[#1A1F2E] border border-[#1E2A3B] rounded-2xl p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-white text-xs font-black tracking-widest uppercase mb-1">Tendencia de Accidentalidad</h3>
                                <p className="text-[#64748B] text-[10px] font-bold uppercase tracking-wider">Últimos 12 meses</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                    <span className="text-[#64748B] text-[10px] font-black uppercase">AT</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                    <span className="text-[#64748B] text-[10px] font-black uppercase">INCIDENTES</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2A3B" vertical={false} />
                                    <XAxis
                                        dataKey="label"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748B', fontSize: 10, fontWeight: 700 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748B', fontSize: 10, fontWeight: 700 }}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1A1F2E', border: '1px solid #1E2A3B', borderRadius: '12px' }}
                                        itemStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="at"
                                        stroke="#F59E0B"
                                        strokeWidth={3}
                                        dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="incidentes"
                                        stroke="#3B82F6"
                                        strokeWidth={3}
                                        dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Absenteeism (35%) */}
                    <div className="col-span-4 flex flex-col gap-6">
                        <AbsenteeismCard
                            label="Laboral (AT + EL)"
                            value={ausentismoLaboral}
                            color="orange"
                        />
                        <AbsenteeismCard
                            label="Común (EG)"
                            value={ausentismoComun}
                            color="blue"
                        />
                    </div>
                </div>
                {/* ── GTC-45 HAZARD DISTRIBUTION ── */}
                <div id="gtc45-section">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-white text-xs font-black tracking-widest uppercase mb-1">Distribución por Peligros GTC-45</h3>
                            <p className="text-[#64748B] text-[10px] font-bold uppercase tracking-wider">Análisis de criticidad por centro de trabajo</p>
                        </div>
                    </div>
                    <HazardFrequencyWidget hazardData={hazardData} loading={loading} />
                </div>

                {/* ── DIAGNOSIS ABSENTEEISM TABLE ── */}
                <div id="diagnosis-absenteeism-section" className="bg-[#1A1F2E] border border-[#1E2A3B] rounded-2xl overflow-hidden mb-8">
                    <div className="px-8 py-6 border-b border-[#1E2A3B] flex items-center justify-between">
                        <div>
                            <h3 className="text-white text-xs font-black tracking-widest uppercase mb-1">Ausentismo por Diagnóstico</h3>
                            <p className="text-[#64748B] text-[10px] font-bold uppercase tracking-wider">Top diagnósticos (CIE-10 / CIE-11)</p>
                        </div>

                        {/* Toggle filter */}
                        <div className="flex bg-[#0F1219] p-1 rounded-lg border border-[#1E2A3B]">
                            {["Todos", "CIE-10", "CIE-11"].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setCieFilter(f as any)}
                                    className={`px-4 py-1.5 rounded-md text-[10px] font-black tracking-widest uppercase transition-all ${cieFilter === f
                                            ? "bg-[#1E2A3B] text-white shadow"
                                            : "text-[#64748B] hover:text-white"
                                        }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-[#0F1219]">
                                <tr>
                                    {["Código CIE", "Descripción del Diagnóstico", "Nº Incapacidades", "Días Perdidos", "% Ausentismo"].map((h) => (
                                        <th key={h} className="px-8 py-4 text-[#64748B] text-[10px] font-black uppercase tracking-widest border-b border-[#1E2A3B]">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {absenteeismByDiagnosis.list.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-12 text-center text-[#64748B] font-bold italic">
                                            No hay registros de diagnósticos para incapacidades mayores a cero
                                        </td>
                                    </tr>
                                ) : (
                                    absenteeismByDiagnosis.list.map((row) => {
                                        const pct = absenteeismByDiagnosis.totalDaysAll > 0
                                            ? (row.totalDays / absenteeismByDiagnosis.totalDaysAll) * 100
                                            : 0;
                                        return (
                                            <tr key={row.code} className="border-b border-[#1E2A3B]/50 hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-8 py-4">
                                                    <span className="bg-white/5 text-amber-500 px-2 py-1 rounded border border-amber-500/20 font-black tracking-wider">
                                                        {row.code}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-4 text-white font-bold">{row.description}
                                                    <span className="ml-2 text-[9px] text-[#64748B] uppercase px-1.5 py-0.5 border border-[#334155] rounded">{row.version}</span>
                                                </td>
                                                <td className="px-8 py-4 text-[#94A3B8] font-bold text-center w-32">{row.incapacitiesCount}</td>
                                                <td className="px-8 py-4 text-red-400 font-bold text-center w-32">{row.totalDays}</td>
                                                <td className="px-8 py-4 w-48">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 h-1.5 bg-[#0F1219] rounded-full overflow-hidden">
                                                            <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                                                        </div>
                                                        <span className="text-white font-black">{pct.toFixed(1)}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── EVENT DETAILS TABLE ── */}
                <div id="table-section" className="bg-[#1A1F2E] border border-[#1E2A3B] rounded-2xl overflow-hidden">
                    <div className="px-8 py-6 border-b border-[#1E2A3B] flex items-center justify-between">
                        <div>
                            <h3 className="text-white text-xs font-black tracking-widest uppercase mb-1">Registro de Eventos</h3>
                            <p className="text-[#64748B] text-[10px] font-bold uppercase tracking-wider">Período Seleccionado</p>
                        </div>
                        <span className="bg-white/5 text-[#64748B] px-3 py-1 rounded-full text-[10px] font-black border border-white/10 uppercase">
                            {filteredEvents.length} Totales
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[#0F1219]">
                                <tr>
                                    {["Fecha", "Trabajador", "Clasificación", "Días", "Estado"].map((h) => (
                                        <th key={h} className="px-8 py-4 text-[#64748B] text-[10px] font-black uppercase tracking-widest border-b border-[#1E2A3B]">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEvents.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-12 text-center text-[#64748B] font-bold italic">
                                            No se encontraron eventos en este período
                                        </td>
                                    </tr>
                                ) : (
                                    filteredEvents.slice(0, 10).map((ev) => (
                                        <tr key={ev.id} className="border-b border-[#1E2A3B]/50 hover:bg-white/[0.02] cursor-pointer group transition-colors" onClick={() => router.push(`/dashboard/events/${ev.id}`)}>
                                            <td className="px-8 py-4 text-white text-xs font-bold whitespace-nowrap">{(ev.event_date || "").slice(0, 10)}</td>
                                            <td className="px-8 py-4 text-[#94A3B8] text-xs font-bold">{ev.worker_name || "Sin asignar"}</td>
                                            <td className="px-8 py-4">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${ev.classification === "ACCIDENTE_TRABAJO_FATAL" ? "bg-red-500/10 text-red-500" :
                                                        ev.classification === "ACCIDENTE_TRABAJO_GRAVE" ? "bg-orange-500/10 text-orange-400" :
                                                            ev.classification === "ACCIDENTE_TRABAJO" ? "bg-amber-500/10 text-amber-500" :
                                                                "bg-blue-500/10 text-blue-400"
                                                    }`}>
                                                    {ev.classification?.replace(/_/g, " ") || "INCIDENTE"}
                                                </span>
                                            </td>
                                            <td className="px-8 py-4 text-white text-xs font-bold">{ev.disability_days || 0}</td>
                                            <td className="px-8 py-4">
                                                <div className={`w-2 h-2 rounded-full ${ev.classification_status === 'classified' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── RUC HISTORY ──────────────────────────────────────────────────────────── */}
                <div id="ruc-section" className="bg-[#1A1F2E] border border-[#1E2A3B] rounded-2xl overflow-hidden mb-8">
                    <div className="px-8 py-6 border-b border-[#1E2A3B] flex items-center justify-between">
                        <div>
                            <h3 className="text-white text-xs font-black tracking-widest uppercase mb-1">Historial Consolidado RUC / CCS</h3>
                            <p className="text-[#64748B] text-[10px] font-bold uppercase tracking-wider">Últimos 5 años operativos</p>
                        </div>
                        <button
                            onClick={handleExportHistorical}
                            disabled={exportState.status === "generating"}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 text-black font-black text-[10px] tracking-widest uppercase hover:bg-emerald-400 transition-all disabled:opacity-50"
                        >
                            <Download className="w-4 h-4" />
                            {exportState.status === "generating" ? "Exportando..." : "Exportar Excel"}
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-[#0F1219]">
                                <tr>
                                    {["Año", "AT Fatal", "AT Incap", "Total AT", "Días", "IF", "IS"].map((h) => (
                                        <th key={h} className="px-8 py-4 text-[#64748B] text-[10px] font-black uppercase tracking-widest border-b border-[#1E2A3B]">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {historicalData.map((row) => (
                                    <tr key={row.year} className="border-b border-[#1E2A3B]/50 hover:bg-white/[0.02] transition-colors">
                                        <td className="px-8 py-4 text-white font-black">{row.year}</td>
                                        <td className="px-8 py-4 text-[#EF4444] font-bold">{row.atMortales}</td>
                                        <td className="px-8 py-4 text-[#94A3B8]">{row.atConIncap}</td>
                                        <td className="px-8 py-4 text-amber-500 font-bold">{row.totalAT}</td>
                                        <td className="px-8 py-4 text-[#94A3B8]">{row.diasIncap}</td>
                                        <td className="px-8 py-4 text-white font-black">{row.IF.toFixed(2)}</td>
                                        <td className="px-8 py-4 text-white font-black">{row.IS.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );

}

export default StatsPage;
