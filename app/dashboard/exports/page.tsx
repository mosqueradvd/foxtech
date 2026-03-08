/**
 * app/dashboard/exports/page.tsx
 * Exports page — Excel RUC/CCS y PDF de eventos laborales.
 * Generación 100% client-side desde datos de Dexie (IndexedDB).
 * Skill: legal-exports-colombia, frontend-design (dark SaaS palette)
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    FileSpreadsheet,
    FileText,
    Download,
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    Building2,
    Info,
    Loader2,
} from "lucide-react";
import { supabase, type Event } from "@/lib/supabase";
import {
    generateRUCExport,
    downloadBlob,
    type WorkCenterConfig,
} from "@/lib/exports/ruc-export";
import { calcIndicators } from "@/lib/stats/indicators";

// ── Types ─────────────────────────────────────────────────────────────────

interface DownloadState {
    status: "idle" | "generating" | "done" | "error";
    message?: string;
}

const COMPANY_PROFILE_KEY = "foxtech_company_profile";

interface CompanyProfile {
    name: string;
    nit: string;
    arl: string;
    riskClass: number;
    ciiu: string;
    address: string;
    city: string;
    consultantName?: string;
}

const DEFAULT_PROFILE: CompanyProfile = {
    name: "",
    nit: "",
    arl: "",
    riskClass: 3,
    ciiu: "",
    address: "",
    city: "Bogotá D.C.",
    consultantName: "",
};

// ── Sub-components ────────────────────────────────────────────────────────

function SectionHeader({
    icon,
    title,
    subtitle,
}: {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
}) {
    return (
        <div className="flex items-start gap-4 mb-5">
            <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/20 flex items-center justify-center flex-shrink-0 text-[#F59E0B]">
                {icon}
            </div>
            <div>
                <h2 className="text-white font-bold text-base">{title}</h2>
                <p className="text-[#64748B] text-xs mt-0.5">{subtitle}</p>
            </div>
        </div>
    );
}

function InfoBadge({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-950/50 border border-blue-800/30 text-blue-300 text-xs">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{children}</span>
        </div>
    );
}

function DownloadButton({
    onClick,
    state,
    label,
    icon,
}: {
    onClick: () => void;
    state: DownloadState;
    label: string;
    icon: React.ReactNode;
}) {
    const isGenerating = state.status === "generating";
    const isDone = state.status === "done";
    const isError = state.status === "error";

    return (
        <div className="space-y-2">
            <button
                onClick={onClick}
                disabled={isGenerating}
                className={[
                    "flex items-center justify-center gap-2 w-full h-12 rounded-xl font-bold text-sm transition-all cursor-pointer",
                    isDone
                        ? "bg-green-700 text-white"
                        : isError
                            ? "bg-red-800 text-white"
                            : "bg-[#F59E0B] text-black hover:bg-[#F59E0B]/90 active:scale-[0.98]",
                    isGenerating ? "opacity-70 cursor-wait" : "",
                ].join(" ")}
            >
                {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : isDone ? (
                    <CheckCircle2 className="w-4 h-4" />
                ) : (
                    icon
                )}
                {isGenerating
                    ? "Generando..."
                    : isDone
                        ? "¡Descargado!"
                        : isError
                            ? "Error — reintentar"
                            : label}
            </button>
            {state.message && (
                <p
                    className={`text-xs ${isError ? "text-red-400" : "text-green-400"}`}
                >
                    {state.message}
                </p>
            )}
        </div>
    );
}

// ── Severity badge ────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity?: string }) {
    const map: Record<string, { label: string; cls: string }> = {
        leve: { label: "Leve", cls: "bg-green-800/30 text-green-400 border-green-700/30" },
        grave: { label: "Grave", cls: "bg-yellow-800/30 text-yellow-400 border-yellow-700/30" },
        mortal: { label: "Mortal", cls: "bg-red-800/30 text-red-400 border-red-700/30" },
    };
    const s = map[severity ?? ""] ?? {
        label: "Sin clasificar",
        cls: "bg-[#334155]/30 text-[#64748B] border-[#334155]/30",
    };
    return (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${s.cls}`}>
            {s.label}
        </span>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function ExportsPage() {
    const [incidents, setIncidents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<CompanyProfile>(DEFAULT_PROFILE);
    const [profileSaved, setProfileSaved] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // RUC export period
    const [rucYear, setRucYear] = useState(new Date().getFullYear());
    const [rucMonth, setRucMonth] = useState(new Date().getMonth() + 1);
    const [rucWorkersCount, setRucWorkersCount] = useState(10);
    const [rucHHT, setRucHHT] = useState(1920);

    // Download states
    const [rucState, setRucState] = useState<DownloadState>({ status: "idle" });
    const [pdfStates, setPdfStates] = useState<Record<string, DownloadState>>({});

    // Load Supabase incidents + saved profile
    useEffect(() => {
        setIsMounted(true);
        const loadData = async () => {
            const { data } = await supabase.from("incidents").select("*").order("created_at", { ascending: false });
            setIncidents(data || []);
            setLoading(false);
        };
        loadData();

        const saved = typeof window !== "undefined"
            ? localStorage.getItem(COMPANY_PROFILE_KEY)
            : null;
        if (saved) {
            try { setProfile(JSON.parse(saved) as CompanyProfile); } catch { /* ignore */ }
        }
    }, []);

    // Classified accidents for PDF section
    const classifiedAccidents = incidents.filter(
        (i) => i.classification_status === "classified" && i.event_type === "accidente"
    );

    // Events in selected RUC period
    const rucPeriodEvents = incidents.filter((i) => {
        const d = new Date(i.event_date || i.created_at || "");
        return d.getFullYear() === rucYear && d.getMonth() + 1 === rucMonth;
    });

    const rucAccidents = rucPeriodEvents.filter((i) => i.event_type === "accidente" || i.event_type === "accidente_grave");

    // Compute stats for export UI preview (use annualized HHT for accurate monthly indices)
    const rucStats = calcIndicators(rucPeriodEvents, rucHHT * 12, rucWorkersCount);
    const atConIncap = rucPeriodEvents.filter(e => e.classification !== "ACCIDENTE_TRABAJO_FATAL" && (e.classification?.startsWith("ACCIDENTE_TRABAJO") ?? false) && (e.disability_days ?? 0) > 0).length;
    const atSinIncap = rucPeriodEvents.filter(e => e.classification !== "ACCIDENTE_TRABAJO_FATAL" && (e.classification?.startsWith("ACCIDENTE_TRABAJO") ?? false) && (e.disability_days ?? 0) === 0).length;

    // Save profile
    const saveProfile = useCallback(() => {
        localStorage.setItem(COMPANY_PROFILE_KEY, JSON.stringify(profile));
        setProfileSaved(true);
        setTimeout(() => setProfileSaved(false), 2000);
    }, [profile]);

    // Generate RUC Excel
    const handleRUCExport = useCallback(async () => {
        setRucState({ status: "generating" });

        if (!profile.nit || !profile.name) {
            setRucState({
                status: "error",
                message: "Faltan datos de la empresa. Completa el perfil arriba.",
            });
            return;
        }

        const config: WorkCenterConfig = {
            nit: profile.nit,
            companyName: profile.name,
            workCenter: profile.city || "Principal",
            ciiuCode: profile.ciiu || "0000",
            riskClass: profile.riskClass,
        };

        const result = generateRUCExport(config, {
            year: rucYear,
            month: rucMonth,
            workerCount: rucWorkersCount,
            manHoursWorked: rucHHT,
            accidents: rucAccidents,
            incidents: rucStats.incidentes,
            occupationalDiseases: rucPeriodEvents.filter(e => e.classification === "ENFERMEDAD_LABORAL").length,
        });

        if (result.success && result.blob) {
            downloadBlob(result.blob, result.fileName);
            setRucState({
                status: "done",
                message: `Descargado: ${result.fileName}${result.warnings.length ? " · " + result.warnings[0] : ""}`,
            });
            setTimeout(() => setRucState({ status: "idle" }), 3000);
        } else {
            setRucState({ status: "error", message: result.errors.join(" | ") });
        }
    }, [profile, rucYear, rucMonth, rucWorkersCount, rucHHT, rucAccidents, rucPeriodEvents, rucStats.incidentes]);

    // Generate PDF for single event
    const handlePDFExport = useCallback(async (incident: any) => {
        setPdfStates((prev) => ({ ...prev, [incident.id]: { status: "generating" } }));
        try {
            // Dynamic import to avoid SSR issues with @react-pdf/renderer
            const { downloadEventReportPDF } = await import("@/lib/exports/event-report-pdf");
            await downloadEventReportPDF(incident, {
                name: profile.name || "Empresa no configurada",
                nit: profile.nit || "—",
                arl: profile.arl || "—",
                riskClass: profile.riskClass,
                ciiu: profile.ciiu || "—",
                address: profile.address || "—",
                city: profile.city || "—",
                consultantName: profile.consultantName || "",
            });
            setPdfStates((prev) => ({
                ...prev,
                [incident.id]: { status: "done", message: "PDF descargado" },
            }));
            setTimeout(() => {
                setPdfStates((prev) => ({ ...prev, [incident.id]: { status: "idle" } }));
            }, 3000);
        } catch (err) {
            setPdfStates((prev) => ({
                ...prev,
                [incident.id]: { status: "error", message: "Error al generar el PDF" },
            }));
            console.error(err);
        }
    }, [profile]);

    const MONTHS = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
    ];

    if (!isMounted) return null;

    return (
        <div className="min-h-screen bg-[#1A1F2E]">
            {/* ── Top bar ── */}
            <div className="sticky top-0 z-10 bg-[#1A1F2E]/95 backdrop-blur border-b border-[#334155] px-6 py-4 flex items-center gap-3">
                <Link
                    href="/dashboard"
                    className="w-9 h-9 rounded-xl bg-[#252B3B] border border-[#334155] flex items-center justify-center text-[#64748B] hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <div>
                    <h1 className="text-white font-black text-lg tracking-tight">EXPORTACIONES</h1>
                    <p className="text-[#64748B] text-xs">Excel RUC/CCS y PDF de eventos laborales</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

                {/* ── Company Profile ── */}
                <section className="bg-[#252B3B] border border-[#334155] rounded-2xl p-6">
                    <SectionHeader
                        icon={<Building2 className="w-5 h-5" />}
                        title="Perfil de la Empresa"
                        subtitle="Se usa en todos los documentos exportados. Se guarda en este navegador."
                    />

                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { key: "consultantName", label: "Empresa Consultora (En encabezado)", placeholder: "Ej. FOXTECH SAS" },
                            { key: "name", label: "Razón Social Cliente", placeholder: "Acero del Norte S.A." },
                            { key: "nit", label: "NIT (sin DV)", placeholder: "900123456" },
                            { key: "arl", label: "ARL", placeholder: "Positiva Compañía de Seguros" },
                            { key: "ciiu", label: "Código CIIU (4 dígitos)", placeholder: "2410" },
                            { key: "address", label: "Dirección", placeholder: "Calle 13 # 37-20" },
                            { key: "city", label: "Municipio", placeholder: "Bogotá D.C." },
                        ].map(({ key, label, placeholder }) => (
                            <div key={key}>
                                <label className="text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-1.5 block">
                                    {label}
                                </label>
                                <input
                                    type="text"
                                    placeholder={placeholder}
                                    value={(profile as unknown as Record<string, string>)[key]}
                                    onChange={(e) =>
                                        setProfile((p) => ({ ...p, [key]: e.target.value }))
                                    }
                                    className="w-full bg-[#1A1F2E] border border-[#334155] rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-[#475569] outline-none focus:border-[#F59E0B] transition-colors"
                                />
                            </div>
                        ))}
                        <div>
                            <label className="text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-1.5 block">
                                Clase de Riesgo (1–5)
                            </label>
                            <select
                                value={profile.riskClass}
                                onChange={(e) =>
                                    setProfile((p) => ({ ...p, riskClass: Number(e.target.value) }))
                                }
                                className="w-full bg-[#1A1F2E] border border-[#334155] rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#F59E0B] transition-colors"
                            >
                                {[1, 2, 3, 4, 5].map((r) => (
                                    <option key={r} value={r}>
                                        Clase {r}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={saveProfile}
                        className={[
                            "mt-5 h-10 px-6 rounded-xl font-bold text-sm transition-all cursor-pointer",
                            profileSaved
                                ? "bg-green-700 text-white"
                                : "bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B] hover:bg-[#F59E0B]/25",
                        ].join(" ")}
                    >
                        {profileSaved ? "✓ Guardado" : "Guardar Perfil"}
                    </button>
                </section>

                {/* ── Excel RUC/CCS ── */}
                <section className="bg-[#252B3B] border border-[#334155] rounded-2xl p-6">
                    <SectionHeader
                        icon={<FileSpreadsheet className="w-5 h-5" />}
                        title="Archivo Plano RUC — CCS"
                        subtitle="Formato exacto para el Consejo Colombiano de Seguridad (K=240.000)"
                    />

                    <InfoBadge>
                        El archivo Excel generado cumple el formato CCS: 22 columnas exactas, hoja "Accidentalidad",
                        indicadores calculados en tiempo real (IF, IS, ILI, TA) con K=240.000. Sin formato de celda
                        (CCS rechaza archivos con colores o negrita).
                    </InfoBadge>

                    {/* Period selector */}
                    <div className="grid grid-cols-4 gap-4 mt-5">
                        <div>
                            <label className="text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-1.5 block">
                                Mes
                            </label>
                            <div className="relative">
                                <select
                                    value={rucMonth}
                                    onChange={(e) => setRucMonth(Number(e.target.value))}
                                    className="w-full bg-[#1A1F2E] border border-[#334155] rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#F59E0B] appearance-none pr-8"
                                >
                                    {MONTHS.map((m, i) => (
                                        <option key={i} value={i + 1}>{m}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748B] pointer-events-none" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-1.5 block">
                                Año
                            </label>
                            <input
                                type="number"
                                min="2020"
                                max="2099"
                                value={rucYear}
                                onChange={(e) => setRucYear(Number(e.target.value))}
                                className="w-full bg-[#1A1F2E] border border-[#334155] rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#F59E0B]"
                            />
                        </div>
                        <div>
                            <label className="text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-1.5 block">
                                N.° Trabajadores
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={rucWorkersCount}
                                onChange={(e) => setRucWorkersCount(Number(e.target.value))}
                                className="w-full bg-[#1A1F2E] border border-[#334155] rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#F59E0B]"
                            />
                        </div>
                        <div>
                            <label className="text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-1.5 block">
                                HHT (horas hombre)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={rucHHT}
                                onChange={(e) => setRucHHT(Number(e.target.value))}
                                className="w-full bg-[#1A1F2E] border border-[#334155] rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#F59E0B]"
                            />
                        </div>
                    </div>

                    {/* Summary for selected period */}
                    <div className="mt-4 p-5 bg-[#141824] rounded-xl border border-[#334155] shadow-inner font-mono text-[11px] text-[#94A3B8] leading-relaxed">
                        <div className="flex justify-between items-center mb-3">
                            <span className="font-bold text-white uppercase tracking-wider">
                                PERÍODO: {MONTHS[rucMonth - 1]} {rucYear}
                            </span>
                            <span className="text-[#64748B] tracking-wider text-[10px]">
                                {rucWorkersCount} TRAB. | K=240000 | {rucHHT.toLocaleString("es-CO")} HHT
                            </span>
                        </div>

                        <div className="h-px bg-[#334155] w-full mb-3"></div>

                        <div className="grid grid-cols-2 gap-x-12 gap-y-1">
                            <div className="flex justify-between"><span>Accidentes de trabajo mortales:</span> <span className="text-white">{rucStats.atFatal}</span></div>
                            <div className="flex justify-between"><span>AT con incapacidad:</span> <span className="text-white">{atConIncap}</span></div>
                            <div className="flex justify-between"><span>AT sin incapacidad:</span> <span className="text-white">{atSinIncap}</span></div>
                            <div className="flex justify-between font-bold"><span>Total AT:</span> <span className="text-[#F59E0B]">{rucStats.totalAT}</span></div>
                            <div className="flex justify-between"><span>Días de incapacidad AT:</span> <span className="text-white">{rucStats.totalDisabilityDays}</span></div>
                            <div className="flex justify-between"><span>Días cargados AT:</span> <span className="text-[#F97316]">{rucStats.diasCargadosAT}</span></div>
                            <div className="flex justify-between"><span>Enfermedades laborales:</span> <span className="text-white">{rucPeriodEvents.filter(e => e.classification === "ENFERMEDAD_LABORAL").length}</span></div>
                            <div className="flex justify-between"><span>Incidentes / Casi-accidentes:</span> <span className="text-white">{rucStats.incidentes}</span></div>
                        </div>

                        <div className="h-px bg-[#334155] w-full my-3"></div>

                        <div className="grid grid-cols-2 gap-x-12 gap-y-1">
                            <div className="flex justify-between"><span>IF (Índice de Frecuencia):</span> <span className="text-emerald-400 font-bold">{rucStats.IF.toFixed(2)}</span></div>
                            <div className="flex justify-between"><span>IS (Índice de Severidad):</span> <span className="text-emerald-400 font-bold">{rucStats.IS.toFixed(2)}</span></div>
                            <div className="flex justify-between"><span>ILI (Lesión Incapacitante):</span> <span className="text-emerald-400 font-bold">{rucStats.ILI < 0.01 ? rucStats.ILI > 0 ? "< 0.01" : "0.00" : rucStats.ILI.toFixed(2)}</span></div>
                            <div className="flex justify-between"><span>Tasa de Accidentalidad:</span> <span className="text-white font-bold">{rucStats.TA.toFixed(2)}%</span></div>
                        </div>
                    </div>

                    <div className="mt-4">
                        <DownloadButton
                            onClick={handleRUCExport}
                            state={rucState}
                            label="Exportar RUC (Excel)"
                            icon={<Download className="w-4 h-4" />}
                        />
                    </div>
                </section>

                {/* ── PDF by event ── */}
                <section className="bg-[#252B3B] border border-[#334155] rounded-2xl p-6">
                    <SectionHeader
                        icon={<FileText className="w-5 h-5" />}
                        title="Reporte PDF por Evento"
                        subtitle="Informe individual para ARL, EPS o auditoría SG-SST"
                    />

                    <InfoBadge>
                        El PDF incluye datos del empleador, trabajador, clasificación del accidente y lesión.
                        Generado 100% en el navegador — funciona sin conexión.
                        Todos los eventos aparecen aquí; los clasificados incluyen los datos completos del Módulo 2.
                    </InfoBadge>

                    {loading ? (
                        <div className="mt-6 flex items-center justify-center gap-2 py-12 text-[#64748B]">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm">Cargando eventos...</span>
                        </div>
                    ) : incidents.length === 0 ? (
                        <div className="mt-6 text-center py-12 text-[#64748B]">
                            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No hay eventos registrados aún.</p>
                        </div>
                    ) : (
                        <div className="mt-5 space-y-3">
                            {incidents.map((inc) => {
                                const pdfState = pdfStates[inc.id] ?? { status: "idle" };
                                const classified = inc.classification_status === "classified";
                                const dateStr = new Date(inc.created_at || new Date().toISOString()).toLocaleDateString("es-CO", {
                                    day: "2-digit", month: "short", year: "numeric",
                                });
                                const eventTypeMap: Record<string, string> = {
                                    casi_accidente: "Casi Accidente",
                                    accidente: "Accidente de Trabajo",
                                    condicion_insegura: "Condición Insegura",
                                };

                                return (
                                    <div
                                        key={inc.id}
                                        className="flex items-center gap-4 p-4 bg-[#1A1F2E] rounded-xl border border-[#334155]"
                                    >
                                        {/* Icon */}
                                        <div className={[
                                            "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
                                            inc.event_type === "accidente"
                                                ? "bg-red-800/30 text-red-400"
                                                : inc.event_type === "casi_accidente"
                                                    ? "bg-yellow-800/30 text-yellow-400"
                                                    : "bg-blue-800/30 text-blue-400",
                                        ].join(" ")}>
                                            <AlertTriangle className="w-4 h-4" />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-semibold text-sm truncate">
                                                {eventTypeMap[inc.event_type ?? ""] ?? "Evento"} — {dateStr}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-[#64748B] text-xs truncate">
                                                    {inc.description?.slice(0, 60) || inc.location_name || "Sin descripción"}
                                                </p>
                                                {/* En lugar de usar severity (usado para DB Dexie), mapeamos clasificación Supabase */}
                                                <SeverityBadge severity={
                                                    inc.classification === "ACCIDENTE_TRABAJO_FATAL" ? "mortal"
                                                        : inc.classification === "ACCIDENTE_TRABAJO_GRAVE" ? "grave"
                                                            : inc.classification === "ACCIDENTE_TRABAJO" ? "leve"
                                                                : undefined
                                                } />
                                                {classified && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-blue-800/30 text-blue-400 border-blue-700/30">
                                                        Clasificado
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Download button */}
                                        <button
                                            onClick={() => handlePDFExport(inc)}
                                            disabled={pdfState.status === "generating"}
                                            className={[
                                                "flex items-center gap-1.5 px-4 h-9 rounded-xl text-xs font-bold transition-all flex-shrink-0 cursor-pointer",
                                                pdfState.status === "done"
                                                    ? "bg-green-700 text-white"
                                                    : pdfState.status === "error"
                                                        ? "bg-red-800 text-white"
                                                        : "bg-[#334155] text-white hover:bg-[#475569]",
                                            ].join(" ")}
                                        >
                                            {pdfState.status === "generating" ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : pdfState.status === "done" ? (
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                            ) : (
                                                <Download className="w-3.5 h-3.5" />
                                            )}
                                            {pdfState.status === "done" ? "Listo" : "PDF"}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
