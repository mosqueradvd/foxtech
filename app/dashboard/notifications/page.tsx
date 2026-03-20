"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft, Bell, AlertTriangle, CheckCircle2,
    FileText, Download, Building2, Send, Mail
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useTheme } from "next-themes";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { NotificationListSkeleton } from "@/components/dashboard/skeletons";
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

// ── Types ─────────────────────────────────────────────────────────────────

type UrgencyLevel = "ok" | "warning" | "overdue";
type DownloadState = "idle" | "generating" | "done" | "error";

interface EnrichedIncident extends LocalIncident {
    notifications: LocalNotification[];
    daysRemaining: number;
    urgency: UrgencyLevel;
}

// ── Urgency pill ──────────────────────────────────────────────────────────

const URGENCY_CONFIG: Record<
    UrgencyLevel,
    { label: string; color: string; dot: string; bg: string }
> = {
    ok: {
        label: "En plazo",
        color: "text-emerald-400",
        dot: "bg-emerald-400",
        bg: "bg-emerald-400/10 border-emerald-400/20",
    },
    warning: {
        label: "Hoy vence",
        color: "text-amber-400",
        dot: "bg-amber-400",
        bg: "bg-amber-400/10 border-amber-400/20",
    },
    overdue: {
        label: "Vencido",
        color: "text-red-400",
        dot: "bg-red-400",
        bg: "bg-red-400/10 border-red-400/20",
    },
};

function UrgencyBadge({ level, days }: { level: UrgencyLevel; days: number }) {
    const c = URGENCY_CONFIG[level];
    const label =
        level === "overdue"
            ? `Vencido hace ${Math.abs(days)} día${Math.abs(days) !== 1 ? "s" : ""}`
            : level === "ok"
                ? `${days} día${days !== 1 ? "s" : ""} hábil${days !== 1 ? "es" : ""}`
                : c.label;
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${c.bg} ${c.color}`}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
            {label}
        </span>
    );
}

// ── Notification status badge ─────────────────────────────────────────────

function NotifiedBadge({ type }: { type: NotificationType }) {
    const labels: Record<NotificationType, string> = {
        mintrabajo: "Mintrabajo ✓",
        arl: "ARL ✓",
        eps: "EPS ✓",
    };
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
            {labels[type]}
        </span>
    );
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

function SeverityBadge({ severity }: { severity: string }) {
    if (!severity) return null;
    const isFatal = severity.toLowerCase() === "mortal" || severity.toLowerCase() === "fatal";
    const label = SEVERITY_LABEL[severity] || severity;
    const color = isFatal ? "text-red-400" : "text-amber-500";
    const dot = isFatal ? "bg-red-400" : "bg-amber-500";
    const bg = isFatal ? "bg-red-400/10 border-red-400/20" : "bg-amber-500/10 border-amber-500/20";

    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${bg} ${color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
            {label}
        </span>
    );
}

const COMPANY_STORAGE_KEY = "foxtech_company_profile";

function loadCompanyProfile(): Partial<CompanyLegal> {
    try {
        const raw = localStorage.getItem(COMPANY_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function NotificationsPage() {
    const router = useRouter();
    const { theme, resolvedTheme } = useTheme();
    const isLight = resolvedTheme === "light";

    const s = {
        bg: isLight ? "bg-[#F8FAFC]" : "bg-[#0A0D14]",
        cardBg: isLight ? "bg-white border-gray-200/80 shadow-sm" : "bg-[#131A26] border-slate-800/40",
        hoverCardBg: isLight ? "hover:bg-gray-50 hover:border-gray-200" : "hover:border-amber-500/30 hover:bg-[#161F2E]",
        emptyBg: isLight ? "bg-white border-gray-200 shadow-sm" : "bg-[#131A26]/30 border-slate-800/50",
    };

    // All grave/mortal incidents
    const [incidents, setIncidents] = useState<EnrichedIncident[]>([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const { activeCompany } = useActiveCompany();

    // Selected incident
    const [selected, setSelected] = useState<EnrichedIncident | null>(null);

    // Company form (reuse from exports if saved)
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

    // Download states
    const [dlMintra, setDlMintra] = useState<DownloadState>("idle");
    const [dlARL, setDlARL] = useState<DownloadState>("idle");
    const [dlEPS, setDlEPS] = useState<DownloadState>("idle");

    // ── Load incidents ──────────────────────────────────────────────────────

    const loadData = useCallback(async () => {
        if (!activeCompany) return;
        setLoading(true);
        try {
            // Module 2 saves to Supabase with classification = "ACCIDENTE_TRABAJO_GRAVE" | "ACCIDENTE_TRABAJO_FATAL"
            const { data, error } = await supabase
                .from("incidents")
                .select("*, investigations(event_narrative)")
                .in("classification", ["ACCIDENTE_TRABAJO_GRAVE", "ACCIDENTE_TRABAJO_FATAL"])
                .eq("company_id", activeCompany.id)
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Error loading serious incidents:", error);
                return;
            }

            const rawIncidents = (data ?? []) as any[];

            // Map Supabase classification → severity for the notification logic
            const mappedIncidents: LocalIncident[] = rawIncidents.map((inc) => {
                const invData = inc.investigations;
                let narrative = undefined;
                if (Array.isArray(invData) && invData.length > 0) {
                    narrative = invData[0]?.event_narrative;
                } else if (invData && !Array.isArray(invData)) {
                    narrative = invData.event_narrative;
                }

                return {
                    ...inc,
                    description: narrative || inc.description, // Use investigation narrative if available
                    severity: inc.classification === "ACCIDENTE_TRABAJO_FATAL"
                        ? "mortal"
                        : "grave",
                    // Map worker_job_title → worker_position (used in letters)
                    worker_position: inc.worker_job_title || inc.worker_position,
                    worker_id_number: inc.worker_cedula || inc.worker_id_number,
                    injury_type: inc.injury_nature || inc.injury_type,
                    body_part_description: inc.body_part || inc.body_part_description,
                    // Map worker_arl from Supabase field
                    worker_arl: inc.worker_arl || inc.worker_arl,
                    worker_eps: inc.worker_eps || inc.worker_eps,
                    // Map location from event_city/event_address
                    location_name: inc.location_name
                        || [inc.event_address, inc.event_city].filter(Boolean).join(", ")
                        || "",
                };
            });

            const enriched: EnrichedIncident[] = await Promise.all(
                mappedIncidents.map(async (inc) => {
                    const notifications = await getNotificationsForIncident(inc.id);
                    // Check local overrides in IndexedDB
                    const localInc = await db.incidents.get(inc.id);
                    const finalInc = {
                        ...inc,
                        diagnosis_date: localInc?.diagnosis_date || inc.diagnosis_date,
                        furat_number: localInc?.furat_number || inc.furat_number,
                        mintrabajo_include_description: localInc?.mintrabajo_include_description !== undefined 
                            ? localInc.mintrabajo_include_description 
                            : (inc.mintrabajo_include_description !== undefined ? inc.mintrabajo_include_description : true)
                    };

                    const days = businessDaysRemaining(finalInc.created_at, finalInc.diagnosis_date);
                    const urgency = urgencyLevel(days);
                    return { ...finalInc, notifications, daysRemaining: days, urgency };
                })
            );

            // Sort: overdue first, then warning, then ok, then by date desc
            enriched.sort((a, b) => {
                const order = { overdue: 0, warning: 1, ok: 2 };
                if (order[a.urgency] !== order[b.urgency]) {
                    return order[a.urgency] - order[b.urgency];
                }
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });

            setIncidents(enriched);

            // Count incidents without Mintrabajo notification
            const notifiedIds = new Set(
                (await db.notifications
                    .where("type").equals("mintrabajo")
                    .filter((n) => n.status === "sent" || n.status === "filed")
                    .toArray()
                ).map((n) => n.incident_id)
            );
            setPendingCount(enriched.filter((i) => !notifiedIds.has(i.id)).length);

        } finally {
            setLoading(false);
        }
    }, [activeCompany]);


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
        } else {
            // Load company profile from localStorage (shared with exports page)
            const saved: any = loadCompanyProfile();
            if (saved && saved.name) {
                setCompany((c) => ({
                    ...c,
                    name: saved.name || c.name,
                    nitWithDv: saved.nit || c.nitWithDv,
                    city: saved.city || c.city,
                    department: saved.department || c.department,
                    address: saved.address || c.address,
                    legalRep: {
                        name: saved.consultantName || c.legalRep.name,
                        phone: c.legalRep.phone,
                        email: c.legalRep.email
                    },
                }));
            }
        }
    }, [activeCompany, loadData]);

    const [activeTab, setActiveTab] = useState<"pendientes" | "enviadas" | "archivadas">("pendientes");

    const filteredIncidents = incidents.filter((inc) => {
        const notifiedMintrabajo = inc.notifications.some(
            (n) => n.type === "mintrabajo" && (n.status === "sent" || n.status === "filed")
        );
        const isArchived = new Date(inc.created_at).getTime() < Date.now() - 30 * 24 * 60 * 60 * 1000;

        if (activeTab === "archivadas") return isArchived;
        if (activeTab === "enviadas") return notifiedMintrabajo && !isArchived;
        return !notifiedMintrabajo && !isArchived; // pendientes
    });

    return (
        <div className={`flex-1 flex flex-col h-full overflow-hidden ${s.bg}`} style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* ── HEADER ────────────────────────────────────────────────── */}
            <DashboardHeader onRefresh={loadData} loading={loading}>
                <div className="flex items-center gap-6 flex-1">
                    <div>
                        <h1 className={`${isLight ? "text-[#1E293B]" : "text-white"} font-black text-2xl tracking-tight leading-none uppercase`}>Notificaciones Legales</h1>
                        <p className="text-[#475569] text-xs font-bold uppercase tracking-wider mt-1">
                            Cartas Mintrabajo · ARL · EPS
                        </p>
                    </div>
                    {pendingCount > 0 && (
                        <span className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg shadow-red-500/5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                            {pendingCount} sin notificar a Mintrabajo
                        </span>
                    )}
                </div>
            </DashboardHeader>

            {/* ── TABS ─────────────────────────────────────────────────── */}
            <div className={`px-6 border-b ${isLight ? "border-gray-200 bg-white" : "border-slate-800/50 bg-[#0A0D14]"} flex gap-4`}>
                {(["pendientes", "enviadas", "archivadas"] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={[
                            "px-4 py-3 text-xs font-black uppercase tracking-wider transition-all relative cursor-pointer",
                            activeTab === tab 
                                ? "text-amber-500" 
                                : "text-slate-500 hover:text-slate-300"
                        ].join(" ")}
                    >
                        {tab.toUpperCase()}
                        {activeTab === tab && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* ── LISTA ─────────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {loading ? (
                    <p className="text-slate-500 text-sm">Cargando...</p>
                ) : filteredIncidents.length === 0 ? (
                    <div className={`flex flex-col items-center justify-center h-48 text-center ${s.emptyBg} rounded-2xl border`}>
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2 opacity-60" />
                        <p className="text-slate-300 text-sm font-semibold">Sin notificaciones en esta categoría</p>
                    </div>
                ) : (
                    filteredIncidents.map((inc) => {
                        const isFatal = inc.severity === "mortal";
                        const notified = inc.notifications.some(
                            (n) => n.type === "mintrabajo" && (n.status === "sent" || n.status === "filed")
                        );
                        
                        return (
                            <div
                                key={inc.id}
                                onClick={() => router.push(`/dashboard/notifications/${inc.id}`)}
                                className={`group ${s.cardBg} rounded-xl p-4 flex items-center justify-between ${s.hoverCardBg} transition-all cursor-pointer shadow-lg hover:shadow-black/20`}
                            >
                                <div className="space-y-2 flex-1">
                                    <div className="flex items-center gap-2">
                                        {/* Urgency Badge */}
                                        <span className={[
                                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider border",
                                            notified ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                                            inc.urgency === "overdue" ? "bg-red-500/10 border-red-500/20 text-red-400" :
                                            inc.urgency === "warning" ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                                            "bg-slate-500/10 border-slate-500/20 text-slate-400"
                                        ].join(" ")}>
                                            {notified ? "ENVIADO" : inc.urgency === "overdue" ? "VENCE HOY" : `${inc.daysRemaining} DÍAS RESTANTES`}
                                        </span>
                                        {/* Classification Badge */}
                                        <span className={[
                                            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border",
                                            isFatal ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                        ].join(" ")}>
                                            {incidentTitle(inc).toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <h3 className={`${isLight ? "text-[#1E293B]" : "text-white"} font-bold text-sm group-hover:text-amber-500 transition-colors`}>
                                            {incidentTitle(inc)} — {formatDate(inc.created_at)}
                                        </h3>
                                        <p className="text-slate-500 text-xs mt-0.5">
                                            {inc.worker_name || "Trabajador"} · {inc.location_name || "Ubicación"}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        {notified ? (
                                            <p className="text-emerald-400 font-black text-xl flex items-center gap-1">
                                                ✓ NOTIFICADO
                                            </p>
                                        ) : (
                                            <div>
                                                <p className={[
                                                    "font-black text-2xl leading-none",
                                                    inc.urgency === "overdue" ? "text-red-500" : "text-amber-500"
                                                ].join(" ")}>
                                                    {inc.urgency === "overdue" ? "1 día hábil" : `${inc.daysRemaining} días`}
                                                </p>
                                                <p className="text-[#475569] text-[10px] font-bold">para notificar</p>
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-slate-600 group-hover:text-amber-500 transition-colors">→</span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

