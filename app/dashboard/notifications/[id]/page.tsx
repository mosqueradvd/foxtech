"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft, Bell, AlertTriangle, CheckCircle2,
    FileText, Download, Building2, Send, Mail, MapPin, Shield, HeartPulse, ExternalLink, User, ChevronDown, Map, Database, Contact
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useTheme } from "next-themes";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import {
    db,
    type LocalIncident,
    type LocalNotification,
    type NotificationType,
    getNotificationsForIncident,
    upsertNotification,
    saveIncidentDraft,
} from "@/lib/db";
import {
    businessDaysRemaining,
    urgencyLevel,
} from "@/lib/constants/festivos-colombia";
import {
    downloadMintrabajoLetterPDF,
    type CompanyLegal,
    type ImmediateAction,
} from "@/lib/exports/mintrabajo-letter";
import { downloadARLLetterPDF } from "@/lib/exports/arl-letter";
import { downloadEPSLetterPDF } from "@/lib/exports/eps-letter";

import dynamic from "next/dynamic";

const EventMiniMap = dynamic(() => import("@/components/dashboard/EventMiniMap"), {
    ssr: false,
    loading: () => <div className="flex-1 flex items-center justify-center bg-white dark:bg-[#232b3d] text-slate-400 dark:text-slate-500 text-xs">Cargando mapa...</div>
});

type UrgencyLevel = "ok" | "warning" | "overdue";
type DownloadState = "idle" | "generating" | "done" | "error";

interface EnrichedIncident extends LocalIncident {
    notifications: LocalNotification[];
    daysRemaining: number;
    urgency: UrgencyLevel;
    synced_at?: string | null;
    classified_at?: string | null;
    classified_by?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function incidentTitle(i: LocalIncident): string {
    if (i.event_type === "accidente") return "Accidente de Trabajo";
    if (i.event_type === "casi_accidente") return "Casi Accidente";
    if (i.event_type === "condicion_insegura") return "Condición Insegura";
    return "Evento";
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

const SEVERITY_LABEL: Record<string, string> = {
    grave: "Grave",
    mortal: "Mortal",
};

const COMPANY_STORAGE_KEY = "foxtech_company_profile";

function loadCompanyProfile(): Partial<CompanyLegal> {
    try {
        const raw = localStorage.getItem(COMPANY_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function calculateSeniority(hireDateISO?: string): string {
    if (!hireDateISO) return "5 años, 2 meses"; // Fallback Mock
    const start = new Date(hireDateISO);
    const end = new Date();
    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    if (months < 0) {
        years--;
        months += 12;
    }
    return `${years} años, ${months} meses`;
}

// ── Main Component ────────────────────────────────────────────────────────

export default function NotificationDetailPage() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();
    const { activeCompany } = useActiveCompany();

    const [incident, setIncident] = useState<EnrichedIncident | null>(null);
    const [loading, setLoading] = useState(true);

    const { theme, resolvedTheme } = useTheme();
    const isLight = resolvedTheme === "light";

    const s = {
        bg: isLight ? "bg-[#F8FAFC] text-[#1E293B]" : "bg-[#0e172a] text-slate-200",
        headerBg: isLight ? "bg-white/95 backdrop-blur-md" : "bg-[#0e172a]/90 backdrop-blur-md",
        cardBg: isLight ? "bg-white border-gray-100 shadow-sm" : "bg-[#232b3d] border-slate-800/40",
        inputBg: isLight ? "bg-white border border-gray-200 text-[#1E293B]" : "bg-[#1C2433] border border-slate-800/40 text-white",
        innerCardBg: isLight ? "bg-gray-50 border border-gray-100/80" : "bg-[#1C2433]/40 border border-slate-800/30",
        footerBg: isLight ? "bg-white border-t border-gray-100" : "bg-[#0F131D] border-t border-slate-800",
        textTitle: isLight ? "text-[#1E293B]" : "text-white",
        iconBoxBg: isLight ? "bg-gray-100 border border-gray-100 text-amber-600" : "bg-[#1A2538] rounded-xl border border-slate-800/60 text-amber-500",
    };

    // Company form
    const [company, setCompany] = useState<CompanyLegal>({
        name: "",
        nitWithDv: "",
        city: "Bogotá D.C.",
        department: "Bogotá D.C.",
        address: "",
        legalRep: { name: "", phone: "", email: "" },
    });

    // Mintrabajo-specific extra fields
    const [diagnosisDate, setDiagnosisDate] = useState("");
    const [furatNumber, setFuratNumber] = useState("");
    const [actions, setActions] = useState<ImmediateAction[]>([
        { description: "Atención médica inmediata al trabajador" },
        { description: "Aseguramiento del área del evento" },
        { description: "Notificación al responsable del SG-SST" },
    ]);
    const [radicado, setRadicado] = useState("");
    const [markingType, setMarkingType] = useState<NotificationType | null>(null);
    const [includeDescription, setIncludeDescription] = useState<boolean>(true);
    const [openMintra, setOpenMintra] = useState(false); // Accordion state

    // Download states
    const [dlMintra, setDlMintra] = useState<DownloadState>("idle");
    const [dlARL, setDlARL] = useState<DownloadState>("idle");
    const [dlEPS, setDlEPS] = useState<DownloadState>("idle");

    // Toast state
    const [toast, setToast] = useState<{ message: string; type: "success" | "info" } | null>(null);

    const showToast = (message: string, type: "success" | "info" = "info") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // ── Load Data ───────────────────────────────────────────────────────────

    const loadData = useCallback(async () => {
        if (!id || !activeCompany) return;
        setLoading(true);
        try {
            const { data: inc, error } = await supabase
                .from("incidents")
                .select("*")
                .eq("id", id)
                .single();

            if (error) {
                console.error("Error loading incident:", error);
                showToast("Error al cargar el evento.", "info");
                return;
            }

            // Cargar investigación por separado
            const { data: invData } = await supabase
                .from("investigations")
                .select("event_narrative")
                .eq("incident_id", id)
                .maybeSingle();

            const narrative = invData?.event_narrative;

            let photoUrl = inc.photo_url;
            if (photoUrl && !photoUrl.startsWith("http")) {
                const { data } = supabase.storage.from("incident-photos").getPublicUrl(photoUrl);
                if (data?.publicUrl) photoUrl = data.publicUrl;
            }

            const mappedIncident: LocalIncident = {
                ...inc,
                description: narrative || inc.description,
                severity: inc.classification === "ACCIDENTE_TRABAJO_FATAL" ? "mortal" : "grave",
                worker_position: inc.worker_job_title || inc.worker_position,
                worker_id_number: inc.worker_cedula || inc.worker_id_number,
                injury_type: inc.injury_nature || inc.injury_type,
                body_part_description: inc.body_part || inc.body_part_description,
                worker_arl: inc.worker_arl,
                worker_eps: inc.worker_eps,
                location_name: inc.location_name || [inc.event_address, inc.event_city].filter(Boolean).join(", ") || "",
                photo_url: photoUrl
            };

            const notifications = await getNotificationsForIncident(id);
            const localInc = await db.incidents.get(id);
            const finalInc = {
                ...mappedIncident,
                diagnosis_date: localInc?.diagnosis_date || mappedIncident.diagnosis_date,
                furat_number: localInc?.furat_number || mappedIncident.furat_number,
                mintrabajo_include_description: localInc?.mintrabajo_include_description !== undefined
                    ? localInc.mintrabajo_include_description
                    : (mappedIncident.mintrabajo_include_description !== undefined ? mappedIncident.mintrabajo_include_description : true)
            };

            const days = businessDaysRemaining(finalInc.created_at, finalInc.diagnosis_date);
            const urgency = urgencyLevel(days);

            setIncident({ ...finalInc, notifications, daysRemaining: days, urgency });
            setFuratNumber(finalInc.furat_number || "");
            setDiagnosisDate(finalInc.diagnosis_date || "");
            setIncludeDescription(finalInc.mintrabajo_include_description !== false);

            // Auto-expand accordion if fields are missing
            const isComplete = !!finalInc.diagnosis_date && !!finalInc.furat_number;
            setOpenMintra(!isComplete);

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [id, activeCompany]);

    useEffect(() => {
        loadData();

        if (activeCompany) {
            setCompany({
                name: activeCompany.razon_social || "",
                nitWithDv: activeCompany.nit_dv ? `${activeCompany.nit}-${activeCompany.nit_dv}` : activeCompany.nit || "",
                city: activeCompany.municipio || "Bogotá D.C.",
                department: activeCompany.departamento || "Bogotá D.C.",
                address: activeCompany.direccion || "",
                legalRep: {
                    name: activeCompany.representante_legal || "",
                    phone: activeCompany.telefono_empresa || "",
                    email: activeCompany.email_empresa || ""
                }
            });
        }
    }, [activeCompany, loadData]);

    // ── Handlers (Saves and Downloads) ───────────────────────────────────────

    const handleToggleDescription = async () => {
        const nextValue = !includeDescription;
        setIncludeDescription(nextValue);

        if (incident) {
            setIncident({ ...incident, mintrabajo_include_description: nextValue });
            await supabase
                .from("incidents")
                .update({ mintrabajo_include_description: nextValue })
                .eq("id", id);
            await saveIncidentDraft(id, { mintrabajo_include_description: nextValue });
        }
    };

    const handleMintrabajoDownload = async () => {
        if (!incident) return;
        setDlMintra("generating");
        try {
            await downloadMintrabajoLetterPDF({
                company,
                incident,
                diagnosisDate: diagnosisDate || undefined,
                furatNumber: furatNumber || undefined,
                immediateActions: actions.filter((a) => a.description.trim()),
                includeDescription,
            });
            setDlMintra("done");
            setTimeout(() => setDlMintra("idle"), 3000);
        } catch {
            setDlMintra("error");
            setTimeout(() => setDlMintra("idle"), 4000);
        }
    };

    const handleARLDownload = async () => {
        if (!incident) return;
        setDlARL("generating");
        try {
            await downloadARLLetterPDF(company, incident);
            setDlARL("done");
            setTimeout(() => setDlARL("idle"), 3000);
        } catch {
            setDlARL("error");
            setTimeout(() => setDlARL("idle"), 4000);
        }
    };

    const handleEPSDownload = async () => {
        if (!incident) return;
        setDlEPS("generating");
        try {
            await downloadEPSLetterPDF(company, incident);
            setDlEPS("done");
            setTimeout(() => setDlEPS("idle"), 3000);
        } catch {
            setDlEPS("error");
            setTimeout(() => setDlEPS("idle"), 4000);
        }
    };

    const markAsSent = async (type: NotificationType) => {
        if (!incident) return;
        setMarkingType(type);
        try {
            const notification: LocalNotification = {
                id: `${id}_${type}`,
                incident_id: id,
                type,
                status: radicado ? "filed" : "sent",
                sent_at: new Date().toISOString(),
                filing_number: radicado || undefined,
                signed_by: company.legalRep.name || undefined,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            await upsertNotification(notification);
            showToast(`Envío registrado para ${type.toUpperCase()}`, "success");
            await loadData();
        } finally {
            setMarkingType(null);
        }
    };

    const isNotified = (type: NotificationType) =>
        incident?.notifications.some(
            (n) => n.type === type && (n.status === "sent" || n.status === "filed")
        ) ?? false;

    // ── Render ────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#0e172a] h-full">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-4 border-slate-700 border-t-amber-500 rounded-full animate-spin" />
                    <p className="text-slate-400 text-sm font-medium">Cargando detalles...</p>
                </div>
            </div>
        );
    }

    if (!incident) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#0e172a] h-full text-slate-400">
                Evento no encontrado o error de carga.
            </div>
        );
    }

    const hasGPS = incident.photo_lat && incident.photo_lng;
    const isFatal = incident.severity === "mortal";

    return (
        <div className={`flex-1 flex flex-col h-full overflow-y-auto ${s.bg}`} style={{ fontFamily: "'Inter', sans-serif" }}>

            {/* ── HEADER FIJO ─────────────────────────────────────────────── */}
            <div className={`sticky top-0 z-10 ${s.headerBg} border-b ${isLight ? "border-gray-100" : "border-slate-800/50"} px-6 py-4 flex items-center justify-between shadow-sm`}>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push("/dashboard/notifications")}
                        className={`p-2 rounded-lg ${isLight ? "hover:bg-gray-100 text-slate-500" : "hover:bg-slate-800/50 text-slate-400"} border border-slate-800/20 hover:text-white transition-colors cursor-pointer`}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className={`text-lg font-black tracking-tight ${s.textTitle} uppercase flex items-center gap-2`}>
                            DETALLE DE EVENTO <span className="text-amber-500">#{id.slice(0, 8).toUpperCase()}</span>
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Urgency Badge */}
                    {incident.urgency === "overdue" ? (
                        <div className="relative inline-flex items-center justify-center">
                            <style>{`
                              @keyframes softPulse {
                                0% { transform: scale(0.95); opacity: 0.8; }
                                80% { transform: scale(1.18); opacity: 0; }
                                100% { transform: scale(1.18); opacity: 0; }
                              }
                              .animate-soft-pulse {
                                animation: softPulse 2.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
                              }
                            `}</style>
                            {/* Expanding Pulse Ring */}
                            <span className="absolute inset-0 rounded-full bg-red-500 h-[26px] w-full animate-soft-pulse" />
                            {/* Solid Badge */}
                            <span className="relative inline-flex items-center px-2 py-1 rounded-full text-[11px] font-black bg-[#EF4444] text-white shadow-lg shadow-red-500/20 uppercase tracking-wide">
                                VENCE HOY
                            </span>
                        </div>
                    ) : (
                        <span className={[
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-sm",
                            incident.urgency === "warning" ? "bg-amber-500/10 border-amber-500/30 text-amber-500" :
                                "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        ].join(" ")}>
                            <span className={`w-1.5 h-1.5 rounded-full ${incident.urgency === "warning" ? "bg-amber-500" : "bg-emerald-400"}`} />
                            {`${incident.daysRemaining} DÍAS RESTANTES`}
                        </span>
                    )}
                    {/* Classification Badge */}
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-[#1C2433] border-slate-700/50 text-slate-300">
                        {incidentTitle(incident).toUpperCase()}
                    </span>
                </div>
            </div>

            {/* ── CONTENT CONTAINER ───────────────────────────────────────── */}
            <div className="p-6 space-y-6 max-w-7xl mx-auto w-full flex-1">

                {/* ── BLOQUE 1: Hero Card ───────────────────────────────────── */}
                <section className={`${s.cardBg} h-[450px] rounded-[4px] p-0 grid grid-cols-1 md:grid-cols-[55fr_45fr] shadow-xl shadow-black/10 overflow-hidden`}>
                    {/* Left: Pre-report Photo */}
                    <div className="bg-[#0A0F1A] h-60 md:h-full flex items-center justify-center relative border-r border-slate-800/20 group">
                        {incident.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={incident.photo_url} alt="Evidencia" className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex flex-col items-center text-slate-600 gap-1">
                                <AlertTriangle className="w-8 h-8 opacity-40" />
                                <span className="text-xs font-semibold">Sin imagen</span>
                            </div>
                        )}
                        {/* Gradient Fade overlay */}
                        <div className={`absolute inset-0 bg-gradient-to-t ${isLight ? "from-[#F8FAFC]/80" : "from-[#232b3d]/60"} via-transparent to-transparent opacity-80 pointer-events-none`} />

                        {hasGPS && (
                            <span className="absolute top-4 left-4 bg-[#10B981] text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" /> GPS VERIFICADO
                            </span>
                        )}
                    </div>

                    {/* Right: State Info */}
                    <div className="flex flex-col justify-between p-6 h-full">
                        <div>
                            <p className="text-amber-500 text-[12px] font-black uppercase tracking-wider mb-4">ESTADO DE ALERTA</p>

                            <div className="flex items-center gap-3 mb-3">
                                <h2 className={`text-3xl font-black ${s.textTitle} leading-none`}>
                                    {incident.urgency === "overdue" ? "VENCE HOY" :
                                        incident.daysRemaining <= 1 ? "24 HORAS RESTANTES" : `${incident.daysRemaining} DÍAS RESTANTES`}
                                </h2>
                            </div>

                            <blockquote className="text-slate-400 mt-10 text-md leading-relaxed border-l-2 border-amber-500 pl-4 mb-5">
                                Notificación legal requerida por Ministerio del Trabajo.
                            </blockquote>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-auto">
                            <div className="${s.innerCardBg} rounded-xl p-4">
                                <p className="text-slate-500 text-[12px] font-bold uppercase mb-1">IMPACTO</p>
                                <p className="text-white text-xs font-bold">Legal / Regulatorio</p>
                            </div>
                            <div className="bg-[#1C2433]/40 rounded-xl p-4 border border-slate-800/30">
                                <p className="text-slate-500 text-[12px] font-bold uppercase mb-1">ASIGNADO A</p>
                                <p className="text-white text-xs font-bold truncate">Profesional</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── BLOQUE 2: Tres Cards Informativas ─────────────────────── */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Card 1: Ubicación */}
                    <div className={`${s.cardBg} rounded-2xl p-5 flex flex-col h-[260px]`}>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-slate-400 text-[12px] font-black uppercase tracking-wider">
                                UBICACIÓN
                            </span>
                            <Map className="w-6 h-6 text-amber-500 opacity-90" />
                        </div>
                        <div className="flex-1 rounded-xl overflow-hidden bg-[#0A0F1A] border border-slate-800/50 mb-4 relative">
                            {hasGPS ? (
                                <EventMiniMap lat={incident.photo_lat!} lng={incident.photo_lng!} type={incident.event_type} />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-1 text-[11px]">
                                    <AlertTriangle className="w-6 h-6 opacity-40" />
                                    <span>Sin coordenadas GPS</span>
                                </div>
                            )}
                        </div>
                        <div>
                            <p className={`text-md font-black truncate mb-1 ${s.textTitle}`}>
                                {incident.location_name || "Planta Norte - Sección 4B"}
                            </p>
                            <p className="text-slate-500 text-[12px] truncate">
                                {hasGPS ? `Coordenadas: ${incident.photo_lat!.toFixed(4)}, ${incident.photo_lng!.toFixed(4)}` : (incident as any).event_address || "Sin dirección"}
                            </p>
                        </div>
                    </div>

                    {/* Card 2: Personal Involucrado */}
                    <div className={`${s.cardBg} rounded-2xl p-5 shadow-lg flex flex-col h-[260px]`}>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-slate-400 text-[12px] font-black uppercase tracking-wider">
                                PERSONAL INVOLUCRADO
                            </span>
                            <Contact className="w-6 h-6 text-amber-500 opacity-90" />
                        </div>

                        <div className="flex-1 flex items-center gap-4">
                            <div className={`w-16 h-16 rounded-full ${isLight ? "bg-gray-100 border-gray-200" : "bg-[#1C2433] border-slate-800/50"} flex items-center justify-center text-amber-500 font-black text-2xl shadow-inner`}>
                                {incident.worker_name ? incident.worker_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() : "—"}
                            </div>
                            <div>
                                <p className={`text-lg font-black leading-tight mb-0.5 ${s.textTitle}`}>{incident.worker_name || "—"}</p>
                                <p className="text-slate-500 text-sm">ID: {incident.worker_id_number || "—"}</p>
                                <p className="text-slate-400 text-sm italic font-medium mt-1 uppercase">{incident.worker_position || "—"}</p>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-slate-800/40 flex justify-between items-center">
                            <span className="text-slate-500 text-[12px] font-medium">Antigüedad:</span>
                            <span className={`text-[12px] font-bold ${s.textTitle}`}>
                                {calculateSeniority((incident as any).worker_hire_date || (incident as any).hire_date)}
                            </span>
                        </div>
                    </div>

                    {/* Card 3: Metadatos */}
                    <div className={`${s.cardBg} rounded-2xl p-5 shadow-lg flex flex-col h-[260px]`}>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-slate-400 text-[12px] font-black uppercase tracking-wider">
                                METADATOS DEL EVENTO
                            </span>
                            <Database className="w-6 h-6 text-amber-500 opacity-90" />
                        </div>
                        <div className="flex-1 flex flex-col justify-center space-y-3.5">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">ID Mintrabajo</span>
                                <span className={`font-bold ${s.textTitle}`}>{furatNumber || "Pendiente"}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Fecha/Hora</span>
                                <span className={`font-bold ${s.textTitle}`}>{formatDate(incident.created_at)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Gravedad</span>
                                <span className={`flex items-center gap-1.5 font-bold ${s.textTitle}`}>
                                    <span className={`w-2 h-2 rounded-full shadow-sm ${isFatal ? "bg-red-500 shadow-red-500/50" : "bg-amber-500 shadow-amber-500/50"}`} />
                                    {isFatal ? "ALTA" : "ALTA"}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Categoría</span>
                                <span className={`font-bold truncate max-w-[60%] text-right ${s.textTitle}`}>{incidentTitle(incident)}</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── BLOQUE 3: Cronología ───────────────────────────────────── */}
                <section className={`${s.cardBg} rounded-2xl p-5`}>
                    <p className={`${s.textTitle} text-[16px] font-black uppercase tracking-wider mb-6`}>CRONOLOGÍA DEL EVENTO</p>
                    <div className="relative pl-6 space-y-7 before:absolute before:left-[14px] before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-emerald-500/20">
                        {(() => {
                            const items = [
                                {
                                    id: 'reportado',
                                    title: "Reportado",
                                    date: incident.created_at,
                                    subtitle: `Usuario: ${incident.reported_by_name || "App móvil"}`,
                                    iconColor: "bg-emerald-500",
                                    active: true
                                },
                                incident.synced_at && {
                                    id: 'sincronizado',
                                    title: "Sincronizado con servidor",
                                    date: incident.synced_at,
                                    subtitle: `Hash: ${id.slice(0, 8).toUpperCase()}`,
                                    iconColor: "bg-emerald-500",
                                    active: true
                                },
                                incident.classified_at && {
                                    id: 'clasificado',
                                    title: "Clasificado",
                                    date: incident.classified_at,
                                    subtitle: `Por: ${incident.classified_by || "Consultor SST"}`,
                                    iconColor: "bg-emerald-500",
                                    active: true
                                },
                                {
                                    id: 'mintrabajo',
                                    title: isNotified('mintrabajo') ? "Enviado a Mintrabajo" : "Pendiente: Envío a Mintrabajo",
                                    date: null,
                                    subtitle: "Fecha límite: Calculado en plazo",
                                    iconColor: isNotified('mintrabajo') ? "bg-emerald-500" : "bg-amber-500",
                                    active: isNotified('mintrabajo')
                                }
                            ].filter(Boolean) as any[];

                            return items.map((item, index) => {
                                const isLast = index === items.length - 1;
                                return (
                                    <div key={item.id} className="relative">
                                        <div className={`absolute left-[-17px] top-1.5 w-3.5 h-3.5 rounded-full ${item.iconColor} shadow-sm ${item.active ? "shadow-emerald-500/50" : "shadow-amber-500/30"}`}>
                                            {isLast && (
                                                <div className={`absolute inset-[-4px] rounded-full border-2 animate-pulse ${item.active ? "border-emerald-500" : "border-amber-500"}`} />
                                            )}
                                        </div>
                                        <div className="ml-1">
                                            <p className={`${s.textTitle} text-sm font-bold mb-1`}>
                                                {item.date ? `${formatDate(item.date)} — ` : ""}{item.title}
                                            </p>
                                            <p className="text-slate-300 text-xs">{item.subtitle}</p>
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </section>

                {/* ── BLOQUE 4: Datos Adicionales Accordion ───────────────────── */}
                <section className={`${s.cardBg} rounded-2xl overflow-hidden`}>
                    <button
                        onClick={() => setOpenMintra(o => !o)}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors cursor-pointer"
                    >
                        <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-amber-500" />
                            <h3 className={`${s.textTitle} font-bold text-sm`}>Datos adicionales Mintrabajo</h3>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openMintra ? "rotate-180" : ""}`} />
                    </button>

                    {openMintra && (
                        <div className={`px-5 pb-5 space-y-4 border-t ${isLight ? "border-gray-100" : "border-slate-800/50"} pt-4`}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Fecha conocimiento diagnóstico</label>
                                    <input
                                        type="date"
                                        value={diagnosisDate}
                                        onChange={async (e) => { setDiagnosisDate(e.target.value); await supabase.from('incidents').update({ diagnosis_date: e.target.value }).eq('id', id); await saveIncidentDraft(id, { diagnosis_date: e.target.value }); }}
                                        className={`w-full ${s.inputBg} rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 transition-colors`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">N.° FURAT (opcional)</label>
                                    <input
                                        type="text"
                                        value={furatNumber}
                                        onChange={async (e) => { setFuratNumber(e.target.value); await supabase.from('incidents').update({ furat_number: e.target.value }).eq('id', id); await saveIncidentDraft(id, { furat_number: e.target.value }); }}
                                        className={`w-full ${s.inputBg} rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 transition-colors`}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Acciones inmediatas tomadas</label>
                                <div className="space-y-2">
                                    {actions.map((action, i) => (
                                        <div key={i} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={action.description}
                                                onChange={(e) => { const updated = [...actions]; updated[i] = { description: e.target.value }; setActions(updated); }}
                                                className={`flex-1 ${s.inputBg} rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50`}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center justify-between border-t border-slate-800/50 pt-3 mt-2">
                                <span className="text-slate-300 text-xs font-semibold">Incluir descripción de hechos</span>
                                <button onClick={handleToggleDescription} className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${includeDescription ? "bg-amber-500" : "bg-slate-700"}`}>
                                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${includeDescription ? "translate-x-5" : "translate-x-0"}`} />
                                </button>
                            </div>
                        </div>
                    )}
                </section>

                {/* ── BLOQUE 4: Documentación Legal ──────────────────────────── */}
                <div>
                    <p className={`${s.textTitle} text-[16px] font-black uppercase tracking-wider mb-4`}>DOCUMENTACIÓN LEGAL</p>
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {/* Card 1: Mintrabajo */}
                        <div className={`\${s.cardBg} rounded-2xl p-5 flex flex-col items-start gap-4 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] group hover:border-amber-500/20 transition-all h-[230px]`}>
                            <div className={`p-3 \${s.iconBoxBg} rounded-xl`}>
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <p className={`\${s.textTitle} text-md font-black`}>Carta Ministerio</p>
                                <p className="text-slate-400 text-[12px] mt-1.5 leading-relaxed">Formato oficial de reporte de accidentes de trabajo según resolución 1401.</p>
                            </div>
                            <button onClick={handleMintrabajoDownload} className={`mt-auto w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-transparent border ${isLight ? "border-gray-200 hover:bg-gray-50 text-[#1E293B]" : "border-slate-700/60 hover:bg-white/5 text-white"} transition-all cursor-pointer flex items-center justify-center gap-2`}>
                                <FileText className="w-4 h-4 opacity-70" /> {dlLabel(dlMintra, "GENERAR PDF")}
                            </button>
                        </div>

                        {/* Card 2: ARL */}
                        <div className={`\${s.cardBg} rounded-2xl p-5 flex flex-col items-start gap-4 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] group hover:border-amber-500/20 transition-all h-[230px]`}>
                            <div className={`p-3 \${s.iconBoxBg} rounded-xl`}>
                                <FileText className="w-5 h-5 flex items-center justify-center" /> {/* Equivalente conceptual de EQ visible */}
                            </div>
                            <div>
                                <p className={`\${s.textTitle} text-md font-black`}>Notificación ARL</p>
                                <p className="text-slate-400 text-[12px] mt-1.5 leading-relaxed">Generación de reporte FURAT listo para cargue en plataforma AXA/Sura.</p>
                            </div>
                            <button onClick={handleARLDownload} className={`mt-auto w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-transparent border ${isLight ? "border-gray-200 hover:bg-gray-50 text-[#1E293B]" : "border-slate-700/60 hover:bg-white/5 text-white"} transition-all cursor-pointer flex items-center justify-center gap-2`}>
                                <FileText className="w-4 h-4 opacity-70" /> {dlLabel(dlARL, "GENERAR PDF")}
                            </button>
                        </div>

                        {/* Card 3: EPS */}
                        <div className={`\${s.cardBg} rounded-2xl p-5 flex flex-col items-start gap-4 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] group hover:border-amber-500/20 transition-all h-[230px]`}>
                            <div className={`p-3 \${s.iconBoxBg} rounded-xl`}>
                                <HeartPulse className="w-5 h-5" />
                            </div>
                            <div>
                                <p className={`\${s.textTitle} text-md font-black`}>Incapacidad EPS</p>
                                <p className="text-slate-400 text-[12px] mt-1.5 leading-relaxed">Solicitud prestacional y reporte de historia clínica inicial del incidente.</p>
                            </div>
                            <button onClick={handleEPSDownload} className={`mt-auto w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-transparent border ${isLight ? "border-gray-200 hover:bg-gray-50 text-[#1E293B]" : "border-slate-700/60 hover:bg-white/5 text-white"} transition-all cursor-pointer flex items-center justify-center gap-2`}>
                                <FileText className="w-4 h-4 opacity-70" /> {dlLabel(dlEPS, "GENERAR PDF")}
                            </button>
                        </div>
                    </section>
                </div>

                {/* ── BLOQUE 5: Registrar Envío ───────────────────────────────── */}
                <section className={`${s.cardBg} rounded-2xl p-5 shadow-lg space-y-4`}>
                    <div className="flex items-center gap-2 mb-2">
                        <Send className="w-4 h-4 text-amber-500" />
                        <h3 className={`${s.textTitle} font-bold text-sm`}>Registrar envío</h3>
                    </div>
                    <div className="flex flex-col md:flex-row items-end gap-3">
                        <div className="flex-1 w-full">
                            <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">N.° Radicado (opcional)</label>
                            <input
                                type="text"
                                placeholder="Ej: MINTRABAJO-2026-000123"
                                value={radicado}
                                onChange={(e) => setRadicado(e.target.value)}
                                className={`w-full ${s.inputBg} rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50`}
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            {(["mintrabajo", "arl", "eps"] as NotificationType[]).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => markAsSent(type)}
                                    disabled={markingType !== null || isNotified(type)}
                                    className={[
                                        "flex-1 md:flex-none px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                                        isNotified(type)
                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 cursor-default"
                                            : `${isLight ? "bg-white border-gray-200 text-[#1E293B] hover:bg-gray-50" : "bg-[#1C2433] text-white border-slate-800 hover:bg-slate-800"}`
                                    ].join(" ")}
                                >
                                    {isNotified(type) ? `✓ ${type.toUpperCase()}` : `Marcar ${type.toUpperCase()}`}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

            </div>

            {/* ── FOOTER FIJO ─────────────────────────────────────────────── */}
            <div className={`sticky bottom-0 ${s.footerBg} px-6 py-4 flex justify-end items-center gap-3`}>
                <button onClick={() => showToast("Función disponible próximamente")} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800/30 transition-all cursor-pointer">
                    VALIDAR EVIDENCIA
                </button>
                <button onClick={() => showToast("Función disponible próximamente")} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-200 border border-slate-700 hover:border-slate-500 transition-all cursor-pointer">
                    SOLICITAR REVISIÓN
                </button>
                <button onClick={() => showToast("Función disponible próximamente")} className="px-5 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-black transition-all cursor-pointer flex items-center gap-1 shadow-lg shadow-amber-500/10">
                    MARCAR COMO COMPLETADO
                </button>
            </div>

            {/* ── TOAST ─────────────────────────────────────────────────── */}
            {toast && (
                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs font-semibold shadow-lg animate-fade-in bg-[#1C2433] border border-slate-800 flex items-center gap-2">
                    {toast.type === "success" ? <CheckCircle2 className="w-3" /> : <Info className="w-3" />}
                    <span>{toast.message}</span>
                </div>
            )}
        </div>
    );
}

function dlLabel(state: DownloadState, defaultLabel: string): string {
    if (state === "generating") return "GENERANDO...";
    if (state === "done") return "DESCARGADO ✓";
    if (state === "error") return "ERROR ✕";
    return defaultLabel;
}

function Info(props: any) {
    return <AlertTriangle {...props} className="text-amber-500" />
}
