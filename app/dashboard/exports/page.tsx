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
    Edit3,
    Search,
    ChevronLeft,
    ChevronRight,
    Filter,
} from "lucide-react";
import { supabase, type Event, type Inspection } from "@/lib/supabase";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
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
        mortal: { label: "Mortal", cls: "bg-red-800/20 text-red-500 border-red-500/20" },
        grave: { label: "Grave", cls: "bg-red-800/20 text-red-500 border-red-500/20" },
        leve: { label: "Leve", cls: "bg-green-800/20 text-green-500 border-green-500/20" },
        incidente: { label: "Incidente", cls: "bg-amber-800/20 text-amber-500 border-amber-500/20" },
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
    const [pdfStates, setPdfStates] = useState<Record<string, DownloadState>>({ });

    // Profile edit state
    const [isEditingProfile, setIsEditingProfile] = useState(false);

    // PDF Center states
    const [inspections, setInspections] = useState<Inspection[]>([]);
    const [pdfFilter, setPdfFilter] = useState < "all" | "incidentes" | "inspecciones" > ("all");
    const [pdfPage, setPdfPage] = useState(1);
    const pageSize = 5;

    // Load Supabase incidents + saved profile
    useEffect(() => {
        setIsMounted(true);
        const loadData = async () => {
            const [{ data: incData }, { data: insData }] = await Promise.all([
                supabase.from("incidents").select("*").order("created_at", { ascending: false }),
                supabase.from("inspections").select("*").order("created_at", { ascending: false })
            ]);
            setIncidents(incData || []);
            setInspections((insData as Inspection[]) || []);
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
    const rucStats = calcIndicators(rucPeriodEvents, rucHHT * 12, rucWorkersCount, 240000);
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
            kConstant: 240000,
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

    // ── Reports logic for PDF Center ──
    const allReports = [
        ...incidents.map(inc => ({
            id: inc.id,
            type: 'incident' as const,
            title: inc.event_type === 'accidente' ? 'Accidente de Trabajo' : 'Incidente Laboral',
            dateStr: new Date(inc.event_date || inc.created_at || "").toLocaleDateString("es-CO", { day: '2-digit', month: 'short', year: 'numeric' }),
            location: inc.location_name || "",
            tag: <SeverityBadge severity={
                inc.classification === 'ACCIDENTE_TRABAJO_FATAL' ? 'mortal' :
                inc.classification === 'ACCIDENTE_TRABAJO_GRAVE' ? 'grave' :
                inc.classification?.startsWith('ACCIDENTE_TRABAJO') ? 'leve' : 'incidente'
            } />,
            status: inc.classification_status === "classified" ? "Sincronizado" : "Sin Clasificar",
            onDownload: () => handlePDFExport(inc)
        })),
        ...inspections.map(ins => ({
            id: ins.id,
            type: 'inspection' as const,
            title: ins.template_name || "Inspección",
            dateStr: new Date(ins.created_at || "").toLocaleDateString("es-CO", { day: '2-digit', month: 'short', year: 'numeric' }),
            location: ins.location_name || "",
            tag: <span className="text-[10px] bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded border border-blue-800/30 font-bold uppercase tracking-tight">Inspección</span>,
            status: ins.status === "cerrada" ? "Cerrada" : "Abierta",
            onDownload: () => alert("La descarga de PDF de inspecciones estará disponible pronto.")
        }))
    ].sort((a, b) => {
        const dateA = new Date(a.id.includes("-") ? (incidents.find(i => i.id === a.id)?.created_at || "") : (inspections.find(i => i.id === a.id)?.created_at || ""));
        const dateB = new Date(b.id.includes("-") ? (incidents.find(i => i.id === b.id)?.created_at || "") : (inspections.find(i => i.id === b.id)?.created_at || ""));
        return dateB.getTime() - dateA.getTime();
    });

    const filteredReports = allReports.filter(r => {
        if (pdfFilter === "all") return true;
        if (pdfFilter === "incidentes") return r.type === "incident";
        if (pdfFilter === "inspecciones") return r.type === "inspection";
        return true;
    });

    const paginatedReports = filteredReports.slice((pdfPage - 1) * pageSize, pdfPage * pageSize);

    if (!isMounted) return null;

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0F1219]">
            {/* ── Top bar ── */}
            <DashboardHeader onRefresh={() => window.location.reload()} loading={loading}>
                <div className="flex items-center gap-4 flex-1">
                    <div>
                        <h1 className="text-white font-black text-xl tracking-tight leading-none uppercase">Exportaciones</h1>
                        <p className="text-[#64748B] text-[10px] font-bold uppercase tracking-wider mt-1">
                            Excel RUC/CCS y PDF de eventos laborales
                        </p>
                    </div>
                </div>
            </DashboardHeader>

            <div className="flex-1 max-w-7xl mx-auto px-10 py-10 space-y-8 w-full overflow-y-auto">

                {/* ── Compact Company Profile ── */}
                <section className="bg-[#1A1F2E] border border-[#1E2A3B] rounded-2xl overflow-hidden shadow-xl">
                    <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center text-[#F59E0B] shadow-inner">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h2 className="text-white font-black text-lg tracking-tight uppercase leading-none">
                                        {profile.name || "Empresa No Configurada"}
                                    </h2>
                                    <span className="px-2 py-0.5 rounded bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B] text-[10px] font-black tracking-widest uppercase">
                                        NIT: {profile.nit || "—"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 mt-2 text-[#64748B] text-[11px] font-bold uppercase tracking-wider">
                                    <span className="flex items-center gap-1">
                                        <Info className="w-3 h-3" />
                                        {profile.address || "Dirección no definida"} · {profile.city}
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-[#1E2A3B]" />
                                    <span>CIIU: {profile.ciiu || "—"}</span>
                                    <span className="w-1 h-1 rounded-full bg-[#1E2A3B]" />
                                    <span>Riesgo {profile.riskClass}</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsEditingProfile(!isEditingProfile)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B] text-xs font-black rounded-xl hover:bg-[#F59E0B]/20 transition-all cursor-pointer uppercase tracking-tight group"
                        >
                            <Edit3 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                            Editar Perfil
                        </button>
                    </div>

                    {/* Inline Edit Form */}
                    {isEditingProfile && (
                        <div className="border-t border-[#1E2A3B] bg-[#0F1219]/50 p-6 animate-in slide-in-from-top duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[
                                    { key: "consultantName", label: "Empresa Consultora", placeholder: "Ej. FOXTECH SAS" },
                                    { key: "name", label: "Razón Social Cliente", placeholder: "Acero del Norte S.A." },
                                    { key: "nit", label: "NIT (sin DV)", placeholder: "900123456" },
                                    { key: "arl", label: "ARL", placeholder: "Positiva" },
                                    { key: "ciiu", label: "Código CIIU", placeholder: "2410" },
                                    { key: "address", label: "Dirección", placeholder: "Calle 13 # 37-20" },
                                    { key: "city", label: "Municipio", placeholder: "Bogotá D.C." },
                                ].map(({ key, label, placeholder }) => (
                                    <div key={key}>
                                        <label className="text-[#64748B] text-[10px] font-black uppercase tracking-widest mb-2 block">
                                            {label}
                                        </label>
                                        <input
                                            type="text"
                                            placeholder={placeholder}
                                            value={(profile as any)[key]}
                                            onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
                                            className="w-full bg-[#0F1219] border border-[#1E2A3B] rounded-xl px-4 py-2 text-white text-xs font-bold placeholder:text-[#334155] outline-none focus:border-[#F59E0B] transition-colors"
                                        />
                                    </div>
                                ))}
                                <div>
                                    <label className="text-[#64748B] text-[10px] font-black uppercase tracking-widest mb-2 block">
                                        Riesgo (1–5)
                                    </label>
                                    <select
                                        value={profile.riskClass}
                                        onChange={(e) => setProfile((p) => ({ ...p, riskClass: Number(e.target.value) }))}
                                        className="w-full bg-[#0F1219] border border-[#1E2A3B] rounded-xl px-4 py-2 text-white text-xs font-bold outline-none focus:border-[#F59E0B] transition-colors"
                                    >
                                        {[1, 2, 3, 4, 5].map((r) => (
                                            <option key={r} value={r}>Clase {r}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end mt-6">
                                <button
                                    onClick={() => {
                                        saveProfile();
                                        setIsEditingProfile(false);
                                    }}
                                    className="px-8 py-2.5 bg-[#F59E0B] text-black text-xs font-black rounded-xl hover:bg-amber-400 transition-colors uppercase tracking-tight shadow-lg shadow-amber-500/10"
                                >
                                    Guardar Cambios
                                </button>
                            </div>
                        </div>
                    )}
                </section>

                {/* ── Main Grid ── */}
                <div className="grid grid-cols-[400px_1fr] gap-10 items-start">

                    {/* COLUMNA IZQUIERDA: RUC–CCS */}
                    <div className="space-y-6">
                        <section className="bg-[#1A1F2E] border border-[#1E2A3B] rounded-2xl p-6 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-5">
                                <FileSpreadsheet className="w-20 h-20 text-white" />
                            </div>
                            
                            <SectionHeader
                                icon={<FileSpreadsheet className="w-5 h-5" />}
                                title="Archivo Plano RUC — CCS"
                                subtitle="Configuración mensual de indicadores SST"
                            />

                            <InfoBadge>
                                Este generador cumple con los estándares regulatorios del CCS para la presentación mensual de indicadores de SST.
                            </InfoBadge>

                            <div className="grid grid-cols-2 gap-4 mt-6">
                                <div>
                                    <label className="text-[#64748B] text-[10px] font-black uppercase tracking-widest mb-2 block">Mes</label>
                                    <div className="relative">
                                        <select
                                            value={rucMonth}
                                            onChange={(e) => setRucMonth(Number(e.target.value))}
                                            className="w-full bg-[#0F1219] border border-[#1E2A3B] rounded-xl px-4 py-2.5 text-white text-xs font-bold outline-none focus:border-[#F59E0B] appearance-none"
                                        >
                                            {MONTHS.map((m, i) => (
                                                <option key={i} value={i + 1}>{m}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] pointer-events-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[#64748B] text-[10px] font-black uppercase tracking-widest mb-2 block">Año</label>
                                    <input
                                        type="number"
                                        value={rucYear}
                                        onChange={(e) => setRucYear(Number(e.target.value))}
                                        className="w-full bg-[#0F1219] border border-[#1E2A3B] rounded-xl px-4 py-2.5 text-white text-xs font-bold outline-none focus:border-[#F59E0B]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div>
                                    <label className="text-[#64748B] text-[10px] font-black uppercase tracking-widest mb-2 block">Trabajadores</label>
                                    <input
                                        type="number"
                                        value={rucWorkersCount}
                                        onChange={(e) => setRucWorkersCount(Number(e.target.value))}
                                        className="w-full bg-[#0F1219] border border-[#1E2A3B] rounded-xl px-4 py-2.5 text-white text-xs font-bold outline-none focus:border-[#F59E0B]"
                                    />
                                </div>
                                <div>
                                    <label className="text-[#64748B] text-[10px] font-black uppercase tracking-widest mb-2 block">HHT</label>
                                    <input
                                        type="number"
                                        value={rucHHT}
                                        onChange={(e) => setRucHHT(Number(e.target.value))}
                                        className="w-full bg-[#0F1219] border border-[#1E2A3B] rounded-xl px-4 py-2.5 text-white text-xs font-bold outline-none focus:border-[#F59E0B]"
                                    />
                                </div>
                            </div>

                            <div className="mt-6 p-5 bg-[#0F1219] rounded-2xl border border-[#1E2A3B] space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-white font-black text-[10px] uppercase tracking-widest">
                                        Resumen Periodo: {MONTHS[rucMonth - 1].slice(0, 3)} {rucYear}
                                    </span>
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-[9px] font-black">
                                        K=240.000
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {[
                                        { label: "AT Mortales", val: rucStats.atFatal },
                                        { label: "AT con Incapacidad", val: atConIncap },
                                        { label: "Indice Frecuencia (IF)", val: rucStats.IF.toFixed(2), highlight: true },
                                        { label: "Indice Severidad (IS)", val: rucStats.IS.toFixed(2), highlight: true },
                                    ].map((s) => (
                                        <div key={s.label} className="flex items-center justify-between text-[11px] font-bold">
                                            <span className="text-[#64748B] uppercase tracking-wider">{s.label}</span>
                                            <span className={s.highlight ? "text-emerald-400" : "text-white"}>{s.val}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-8">
                                <DownloadButton
                                    onClick={handleRUCExport}
                                    state={rucState}
                                    label="Exportar RUC (Excel)"
                                    icon={<FileSpreadsheet className="w-4 h-4" />}
                                />
                            </div>
                        </section>
                    </div>

                    {/* COLUMNA DERECHA: Centro de Reportes PDF */}
                    <div className="space-y-6">
                        <section className="bg-[#1A1F2E] border border-[#1E2A3B] rounded-2xl flex flex-col h-full shadow-xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-[#1E2A3B] flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center text-[#F59E0B]">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <h2 className="text-white font-black text-lg uppercase tracking-tight">Centro de Reportes PDF</h2>
                                </div>

                                <div className="flex gap-2 p-1.5 bg-[#0F1219] rounded-xl border border-[#1E2A3B]">
                                    {[
                                        { id: "all", label: "TODOS" },
                                        { id: "incidentes", label: "INCIDENTES" },
                                        { id: "inspecciones", label: "INSPECCIONES" },
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => {
                                                setPdfFilter(tab.id as any);
                                                setPdfPage(1);
                                            }}
                                            className={[
                                                "px-6 py-2.5 rounded-lg text-xs font-black tracking-widest transition-all cursor-pointer",
                                                pdfFilter === tab.id
                                                    ? "bg-[#F59E0B] text-black shadow-lg shadow-amber-500/10"
                                                    : "text-[#64748B] hover:text-white"
                                            ].join(" ")}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-[1fr_120px_180px_80px] px-8 py-5 border-b border-[#1E2A3B] bg-[#1E2A3B]/10">
                                <span className="text-[#64748B] text-sm font-black uppercase tracking-widest">Evento / Fecha</span>
                                <span className="text-[#64748B] text-sm font-black uppercase tracking-widest text-center">Severidad</span>
                                <span className="text-[#64748B] text-sm font-black uppercase tracking-widest text-center">Estado</span>
                                <span className="text-[#64748B] text-sm font-black uppercase tracking-widest text-right">Acción</span>
                            </div>

                            {/* Reports List */}
                            <div className="flex-1 overflow-y-auto min-h-[500px]">
                                {loading ? (
                                    <div className="flex items-center justify-center py-20 text-[#64748B]">
                                        <Loader2 className="w-8 h-8 animate-spin" />
                                    </div>
                                ) : paginatedReports.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-[#64748B]">
                                        <FileText className="w-12 h-12 mb-4 opacity-20" />
                                        <p className="text-sm font-bold uppercase tracking-widest">No se encontraron reportes</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-[#1E2A3B]">
                                {paginatedReports.map((report) => (
                                    <div key={report.id} className="grid grid-cols-[1fr_120px_180px_80px] items-center px-8 py-6 hover:bg-white/[0.02] transition-colors group">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-bold text-lg truncate uppercase tracking-tight mb-1.5">
                                                {report.title}
                                            </p>
                                            <p className="text-[#64748B] text-sm font-bold uppercase tracking-wider">
                                                {report.dateStr} — <span className="opacity-60">{report.location || (report.type === 'incident' ? 'Incidente' : 'Inspección')}</span>
                                            </p>
                                        </div>

                                        <div className="flex justify-center">
                                            {report.tag}
                                        </div>

                                        <div className="flex items-center justify-center gap-3">
                                            <span className={`w-2.5 h-2.5 rounded-full ${
                                                report.status === 'Sincronizado' || report.status === 'Cerrada' ? 'bg-emerald-400' :
                                                report.status === 'Sin Clasificar' || report.status === 'Abierta' ? 'bg-amber-400' : 'bg-[#64748B]'
                                            }`} />
                                            <span className={`text-sm font-black uppercase tracking-widest ${
                                                report.status === 'Sincronizado' || report.status === 'Cerrada' ? 'text-emerald-400' :
                                                report.status === 'Sin Clasificar' || report.status === 'Abierta' ? 'text-amber-400' : 'text-[#64748B]'
                                            }`}>
                                                {report.status}
                                            </span>
                                        </div>

                                        <div className="flex justify-end">
                                            <button
                                                onClick={() => report.onDownload()}
                                                disabled={pdfStates[report.id]?.status === "generating"}
                                                className="w-10 h-10 flex items-center justify-center bg-[#0F1219] border border-[#1E2A3B] text-[#64748B] rounded-xl hover:border-[#F59E0B]/50 hover:text-[#F59E0B] transition-all cursor-pointer disabled:opacity-50"
                                            >
                                                {pdfStates[report.id]?.status === "generating" ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Download className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer / Pagination */}
                    <div className="px-10 py-8 bg-[#1E2A3B]/30 border-t border-[#1E2A3B] flex items-center justify-between">
                        <span className="text-[#64748B] text-sm font-black uppercase tracking-widest">
                            MOSTRANDO {filteredReports.length > 0 ? (pdfPage - 1) * pageSize + 1 : 0} DE {filteredReports.length} REPORTES
                        </span>
                        <div className="flex gap-2">
                            <button
                                disabled={pdfPage === 1}
                                onClick={() => setPdfPage(p => p - 1)}
                                className="w-10 h-10 rounded-xl bg-[#0F1219] border border-[#1E2A3B] flex items-center justify-center text-white disabled:opacity-30 hover:border-[#F59E0B]/30 transition-all cursor-pointer"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                disabled={pdfPage >= Math.ceil(filteredReports.length / pageSize)}
                                onClick={() => setPdfPage(p => p + 1)}
                                className="w-10 h-10 rounded-xl bg-[#0F1219] border border-[#1E2A3B] flex items-center justify-center text-white disabled:opacity-30 hover:border-[#F59E0B]/30 transition-all cursor-pointer"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    </div>
</div>
    );
}

// ── Helpers ──

function ClipboardList({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <path d="M12 11h4" />
            <path d="M12 16h4" />
            <path d="M8 11h.01" />
            <path d="M8 16h.01" />
        </svg>
    );
}
