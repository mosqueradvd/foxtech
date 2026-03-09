"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft, Bell, AlertTriangle, CheckCircle2,
    FileText, Download, Building2, Send, Mail
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
    db,
    type LocalIncident,
    type LocalNotification,
    type NotificationType,
    getNotificationsForIncident,
    upsertNotification,
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

    // All grave/mortal incidents
    const [incidents, setIncidents] = useState<EnrichedIncident[]>([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [loading, setLoading] = useState(true);

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
    const [furatNumber, setFuratNumber] = useState("");
    const [actions, setActions] = useState<ImmediateAction[]>([
        { description: "Atención médica inmediata al trabajador" },
        { description: "Aseguramiento del área del evento" },
        { description: "Notificación al responsable del SG-SST" },
    ]);
    const [radicado, setRadicado] = useState("");
    const [markingType, setMarkingType] = useState<NotificationType | null>(null);

    // Download states
    const [dlMintra, setDlMintra] = useState<DownloadState>("idle");
    const [dlARL, setDlARL] = useState<DownloadState>("idle");
    const [dlEPS, setDlEPS] = useState<DownloadState>("idle");

    // ── Load incidents ──────────────────────────────────────────────────────

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Module 2 saves to Supabase with classification = "ACCIDENTE_TRABAJO_GRAVE" | "ACCIDENTE_TRABAJO_FATAL"
            const { data, error } = await supabase
                .from("incidents")
                .select("*, investigations(event_narrative)")
                .in("classification", ["ACCIDENTE_TRABAJO_GRAVE", "ACCIDENTE_TRABAJO_FATAL"])
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
                    const days = businessDaysRemaining(inc.created_at);
                    const urgency = urgencyLevel(days);
                    return { ...inc, notifications, daysRemaining: days, urgency };
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

            if (!selected && enriched.length > 0) {
                setSelected(enriched[0]);
            } else if (selected) {
                const refreshed = enriched.find((e) => e.id === selected.id) ?? null;
                setSelected(refreshed);
            }
        } finally {
            setLoading(false);
        }
    }, [selected]);


    useEffect(() => {
        loadData();

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
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Notification marking ────────────────────────────────────────────────

    const markAsSent = async (type: NotificationType) => {
        if (!selected) return;
        setMarkingType(type);
        try {
            const notification: LocalNotification = {
                id: `${selected.id}_${type}`,
                incident_id: selected.id,
                type,
                status: radicado ? "filed" : "sent",
                sent_at: new Date().toISOString(),
                filing_number: radicado || undefined,
                signed_by: company.legalRep.name || undefined,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            await upsertNotification(notification);
            await loadData();
        } finally {
            setMarkingType(null);
        }
    };

    // ── PDF downloads ─────────────────────────────────────────────────────

    const handleMintrabajoDownload = async () => {
        if (!selected) return;
        setDlMintra("generating");
        try {
            await downloadMintrabajoLetterPDF({
                company,
                incident: selected,
                furatNumber: furatNumber || undefined,
                immediateActions: actions.filter((a) => a.description.trim()),
            });
            setDlMintra("done");
            setTimeout(() => setDlMintra("idle"), 3000);
        } catch {
            setDlMintra("error");
            setTimeout(() => setDlMintra("idle"), 4000);
        }
    };

    const handleARLDownload = async () => {
        if (!selected) return;
        setDlARL("generating");
        try {
            await downloadARLLetterPDF(company, selected);
            setDlARL("done");
            setTimeout(() => setDlARL("idle"), 3000);
        } catch {
            setDlARL("error");
            setTimeout(() => setDlARL("idle"), 4000);
        }
    };

    const handleEPSDownload = async () => {
        if (!selected) return;
        setDlEPS("generating");
        try {
            await downloadEPSLetterPDF(company, selected);
            setDlEPS("done");
            setTimeout(() => setDlEPS("idle"), 3000);
        } catch {
            setDlEPS("error");
            setTimeout(() => setDlEPS("idle"), 4000);
        }
    };

    // ── Download button label ─────────────────────────────────────────────

    function dlLabel(state: DownloadState, defaultLabel: string): string {
        if (state === "generating") return "Generando PDF…";
        if (state === "done") return "✓ Descargado";
        if (state === "error") return "Error — Reintentar";
        return defaultLabel;
    }

    const isNotified = (type: NotificationType) =>
        selected?.notifications.some(
            (n) => n.type === type && (n.status === "sent" || n.status === "filed")
        ) ?? false;

    // ── Mailto generators ─────────────────────────────────────────────────

    const buildMailtoMintrabajo = () => {
        if (!selected) return "#";

        // Default mintrabajo emails pattern
        const dept = company.department?.toLowerCase() || "";
        let email = "atencionalciudadano@mintrabajo.gov.co";
        if (dept.includes("bogot") || dept.includes("cundinamarca")) email = "dtbogota@mintrabajo.gov.co";
        else if (dept.includes("antioquia")) email = "dtantioquia@mintrabajo.gov.co";
        else if (dept.includes("valle")) email = "dtvalle@mintrabajo.gov.co";
        else if (dept.includes("atlantico")) email = "dtatlantico@mintrabajo.gov.co";

        const subject = encodeURIComponent(`Notificación AT Grave — ${company.name || "Empresa"} — ${formatDate(selected.created_at)} — Art. 2.2.4.1.7 Dec. 1072/2015`);
        const body = encodeURIComponent(
            `Respetados señores,\n\nAdjunto a este correo remitimos la comunicación formal de notificación de Accidente de Trabajo Grave/Mortal, junto con el reporte FURAT correspondiente.\n\nQuedamos atentos a cualquier requerimiento adicional.\n\nCordialmente,\n${company.legalRep?.name || "Representante de SG-SST"}\n${company.name || "Empresa"}`
        );
        return `mailto:${email}?subject=${subject}&body=${body}`;
    };

    const buildMailtoEPS = () => {
        if (!selected) return "#";

        const epsName = (selected.worker_eps || "").toLowerCase();
        let email = "notificaciones@eps.com.co"; // placeholder
        if (epsName.includes("sura")) email = "notificacioneseps@epssura.com.co";
        else if (epsName.includes("sanitas")) email = "atencionalciudadano@epssanitas.com";
        else if (epsName.includes("compensar")) email = "notificaciones@compensarsalud.com";
        else if (epsName.includes("famisanar")) email = "servicioalcliente@famisanar.com.co";

        const subject = encodeURIComponent(`Reporte AT — ${selected.worker_name || "Trabajador"} — ${formatDate(selected.created_at)} — Art. 62 Dec. Ley 1295/1994`);
        const body = encodeURIComponent(
            `Señores EPS ${selected.worker_eps || ""},\n\nAdjuntamos el reporte de Accidente de Trabajo (FURAT) del trabajador ${selected.worker_name || ""} identificado con documento ${selected.worker_id_number || ""}.\n\nCordialmente,\n${company.legalRep?.name || "Representante de SG-SST"}\n${company.name || "Empresa"}`
        );
        return `mailto:${email}?subject=${subject}&body=${body}`;
    };

    const buildMailtoARL = () => {
        if (!selected) return "#";

        const arlName = (selected.worker_arl || "").toLowerCase();
        let email = "notificaciones@arl.com.co"; // placeholder
        if (arlName.includes("sura")) email = "comunicaciones@arlsura.com.co";
        else if (arlName.includes("positiva")) email = "servicioalcliente@positiva.gov.co";
        else if (arlName.includes("colmena")) email = "notificaciones@colmenaseguros.com";
        else if (arlName.includes("bolivar")) email = "atencion@arlbolivar.com";
        else if (arlName.includes("axa")) email = "notificaciones@axacolpatria.co";

        const subject = encodeURIComponent(`Reporte AT — ${selected.worker_name || "Trabajador"} — ${formatDate(selected.created_at)}`);
        const body = encodeURIComponent(
            `Señores ARL ${selected.worker_arl || ""},\n\nAdjuntamos el reporte de Accidente de Trabajo (FURAT) y la comunicación formal del trabajador ${selected.worker_name || ""} identificado con documento ${selected.worker_id_number || ""}.\n\nCordialmente,\n${company.legalRep?.name || "Representante de SG-SST"}\n${company.name || "Empresa"}`
        );
        return `mailto:${email}?subject=${subject}&body=${body}`;
    };

    // ── Render ────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-[#0F1420]" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Top bar */}
            <header className="bg-[#141824] border-b border-[#1E2A3B] px-6 py-4 flex items-center gap-4 sticky top-0 z-30">
                <button
                    onClick={() => router.push("/dashboard")}
                    className="p-2 rounded-lg text-[#64748B] hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                    aria-label="Volver al dashboard"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-[#F59E0B]" />
                    <div>
                        <h1 className="text-white font-bold text-base leading-none">NOTIFICACIONES LEGALES</h1>
                        <p className="text-[#64748B] text-xs mt-0.5">
                            Cartas Mintrabajo · ARL · EPS para accidentes graves y mortales
                        </p>
                    </div>
                </div>
                {pendingCount > 0 && (
                    <span className="ml-auto flex items-center gap-2 bg-red-500/15 border border-red-500/25 text-red-400 text-xs font-bold px-3 py-1.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                        {pendingCount} sin notificar a Mintrabajo
                    </span>
                )}
            </header>

            <div className="flex h-[calc(100vh-73px)]">
                {/* ── LEFT: event list ────────────────────────────────────────── */}
                <aside className="w-80 flex-shrink-0 border-r border-[#1E2A3B] bg-[#141824] overflow-y-auto">
                    <div className="px-4 pt-4 pb-2">
                        <p className="text-[#64748B] text-xs font-semibold uppercase tracking-wider">
                            Eventos graves / mortales
                        </p>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-6 h-6 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : incidents.length === 0 ? (
                        <div className="px-4 py-12 text-center">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
                            <p className="text-white text-sm font-semibold mb-1">Sin alertas activas</p>
                            <p className="text-[#64748B] text-xs">
                                No hay accidentes graves ni mortales en la base de datos.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1 p-2">
                            {incidents.map((inc) => {
                                const isSelected = selected?.id === inc.id;
                                const notifiedMintrabajo = inc.notifications.some(
                                    (n) => n.type === "mintrabajo" && (n.status === "sent" || n.status === "filed")
                                );
                                return (
                                    <button
                                        key={inc.id}
                                        onClick={() => setSelected(inc)}
                                        className={[
                                            "w-full text-left rounded-xl p-3 transition-all border",
                                            isSelected
                                                ? "bg-[#1E2A3B] border-[#F59E0B]/30"
                                                : "border-transparent hover:bg-white/5 hover:border-white/10",
                                        ].join(" ")}
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-1.5">
                                            <span className="text-white text-sm font-semibold leading-tight">
                                                {incidentTitle(inc)}
                                            </span>
                                            <UrgencyBadge level={inc.urgency} days={inc.daysRemaining} />
                                        </div>
                                        <p className="text-[#64748B] text-xs mb-1.5">
                                            {formatDate(inc.created_at)}
                                        </p>
                                        <div className="flex items-center gap-2 flex-wrap mt-1.5">
                                            <SeverityBadge severity={inc.severity ?? ""} />
                                            {notifiedMintrabajo && (
                                                <span className="text-xs text-emerald-400 font-medium">✓ Notificado</span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </aside>

                {/* ── RIGHT: generator ────────────────────────────────────────── */}
                <main className="flex-1 overflow-y-auto p-6 space-y-5">
                    {!selected ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <Bell className="w-12 h-12 text-[#334155] mb-4" />
                            <p className="text-[#64748B] text-sm">
                                Selecciona un evento de la lista para generar las notificaciones.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Event summary banner */}
                            <div className={[
                                "rounded-xl border p-4 flex items-start gap-4",
                                selected.urgency === "overdue"
                                    ? "bg-red-950/30 border-red-500/25"
                                    : selected.urgency === "warning"
                                        ? "bg-amber-950/30 border-amber-500/25"
                                        : "bg-[#141824] border-[#1E2A3B]",
                            ].join(" ")}>
                                <AlertTriangle className={[
                                    "w-5 h-5 mt-0.5 flex-shrink-0",
                                    selected.urgency === "overdue" ? "text-red-400" :
                                        selected.urgency === "warning" ? "text-amber-400" : "text-[#64748B]",
                                ].join(" ")} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 flex-wrap mb-1">
                                        <h2 className="text-white font-bold text-sm">{incidentTitle(selected)}</h2>
                                        <UrgencyBadge level={selected.urgency} days={selected.daysRemaining} />
                                        <SeverityBadge severity={selected.severity ?? ""} />
                                    </div>
                                    <p className="text-[#64748B] text-xs">
                                        Evento del {formatDate(selected.created_at)}
                                        {selected.worker_name && ` · ${selected.worker_name}`}
                                        {selected.location_name && ` · ${selected.location_name}`}
                                    </p>
                                    {/* Notification status */}
                                    {selected.notifications.length > 0 && (
                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                            {(["mintrabajo", "arl", "eps"] as NotificationType[]).map((t) => {
                                                const n = selected.notifications.find((n) => n.type === t && (n.status === "sent" || n.status === "filed"));
                                                return n ? <NotifiedBadge key={t} type={t} /> : null;
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Company profile */}
                            <section className="bg-[#141824] border border-[#1E2A3B] rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Building2 className="w-4 h-4 text-[#F59E0B]" />
                                    <h3 className="text-white font-semibold text-sm">Datos de la Empresa</h3>
                                    <span className="text-[#64748B] text-xs">(aparecen en todas las cartas)</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { label: "Razón Social", key: "name", placeholder: "Acero del Norte S.A." },
                                        { label: "NIT (con DV)", key: "nitWithDv", placeholder: "900.123.456-7" },
                                        { label: "Ciudad", key: "city", placeholder: "Bogotá D.C." },
                                        { label: "Departamento", key: "department", placeholder: "Bogotá D.C." },
                                        { label: "Dirección (o centro trabajo)", key: "address", placeholder: "Calle 123 #45-67" },
                                    ].map(({ label, key, placeholder }) => (
                                        <div key={key}>
                                            <label className="block text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-1">
                                                {label}
                                            </label>
                                            <input
                                                type="text"
                                                placeholder={placeholder}
                                                value={(company as unknown as Record<string, string>)[key] ?? ""}
                                                onChange={(e) => setCompany((c) => ({ ...c, [key]: e.target.value }))}
                                                className="w-full bg-[#0F1420] border border-[#1E2A3B] rounded-lg px-3 py-2 text-white text-sm placeholder:text-[#334155] focus:outline-none focus:border-[#F59E0B]/50 transition-colors"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3">
                                    <p className="text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-2">
                                        Representante Legal
                                    </p>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { label: "Nombre", key: "name", placeholder: "Juan Pérez" },
                                            { label: "Teléfono", key: "phone", placeholder: "601-123-4567" },
                                            { label: "Correo", key: "email", placeholder: "legal@empresa.com" },
                                        ].map(({ label, key, placeholder }) => (
                                            <div key={key}>
                                                <label className="block text-[#64748B] text-xs mb-1">{label}</label>
                                                <input
                                                    type="text"
                                                    placeholder={placeholder}
                                                    value={(company.legalRep as unknown as Record<string, string>)[key] ?? ""}
                                                    onChange={(e) =>
                                                        setCompany((c) => ({
                                                            ...c,
                                                            legalRep: { ...c.legalRep, [key]: e.target.value },
                                                        }))
                                                    }
                                                    className="w-full bg-[#0F1420] border border-[#1E2A3B] rounded-lg px-3 py-2 text-white text-sm placeholder:text-[#334155] focus:outline-none focus:border-[#F59E0B]/50 transition-colors"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            {/* Mintrabajo extras */}
                            <section className="bg-[#141824] border border-[#1E2A3B] rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <FileText className="w-4 h-4 text-[#F59E0B]" />
                                    <h3 className="text-white font-semibold text-sm">Datos adicionales para Mintrabajo</h3>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-1">
                                            N.° FURAT (si ya se tiene)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Ej: ARL-2026-000123"
                                            value={furatNumber}
                                            onChange={(e) => setFuratNumber(e.target.value)}
                                            className="w-full bg-[#0F1420] border border-[#1E2A3B] rounded-lg px-3 py-2 text-white text-sm placeholder:text-[#334155] focus:outline-none focus:border-[#F59E0B]/50 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-2">
                                            Acciones inmediatas tomadas
                                        </label>
                                        <div className="space-y-2">
                                            {actions.map((action, i) => (
                                                <div key={i} className="flex gap-2">
                                                    <span className="text-[#F59E0B] text-xs font-bold mt-2.5 w-4 flex-shrink-0">{i + 1}.</span>
                                                    <input
                                                        type="text"
                                                        value={action.description}
                                                        onChange={(e) => {
                                                            const updated = [...actions];
                                                            updated[i] = { description: e.target.value };
                                                            setActions(updated);
                                                        }}
                                                        className="flex-1 bg-[#0F1420] border border-[#1E2A3B] rounded-lg px-3 py-2 text-white text-sm placeholder:text-[#334155] focus:outline-none focus:border-[#F59E0B]/50 transition-colors"
                                                    />
                                                    {actions.length > 1 && (
                                                        <button
                                                            onClick={() => setActions(actions.filter((_, j) => j !== i))}
                                                            className="text-[#64748B] hover:text-red-400 text-xs mt-2 transition-colors"
                                                        >
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => setActions([...actions, { description: "" }])}
                                                className="text-[#F59E0B] text-xs font-semibold hover:text-amber-300 transition-colors mt-1"
                                            >
                                                + Agregar acción
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* PDF Download buttons */}
                            <section className="bg-[#141824] border border-[#1E2A3B] rounded-xl p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Download className="w-4 h-4 text-[#F59E0B]" />
                                        <h3 className="text-white font-semibold text-sm">Generar Cartas PDF</h3>
                                    </div>
                                </div>
                                {/* <div className="bg-blue-950/30 border border-blue-900/50 rounded-lg p-3 mb-4 flex gap-3">
                                    <AlertTriangle className="w-5 h-5 text-blue-400 flex-shrink-0" />
                                    <p className="text-blue-300 text-xs leading-relaxed">
                                        <strong>Nota sobre los correos:</strong> Por limitaciones de seguridad de los navegadores, el PDF no se puede adjuntar automáticamente al abrir tu cliente de correo.
                                        Deberás <strong>descargar primero el PDF</strong> y luego <strong>adjuntarlo manualmente</strong> en la ventana de correo que se abrirá con el botón "Abrir en correo".
                                    </p>
                                </div> */}
                                <div className="grid grid-cols-3 gap-3">
                                    {/* Mintrabajo */}
                                    <div className="rounded-xl bg-[#0F1420] border border-[#1E2A3B] p-4 flex flex-col gap-3">
                                        <div>
                                            <p className="text-white text-xs font-bold mb-0.5">Ministerio del Trabajo</p>
                                            <p className="text-[#64748B] text-xs">Art. 2.2.4.1.7 Dec. 1072/2015</p>
                                            <p className="text-[#64748B] text-xs">Plazo: 2 días hábiles</p>
                                        </div>
                                        {isNotified("mintrabajo") && (
                                            <span className="text-xs text-emerald-400 font-semibold">✓ Ya notificado</span>
                                        )}
                                        <div className="mt-auto flex flex-col gap-2">
                                            <button
                                                onClick={handleMintrabajoDownload}
                                                disabled={dlMintra === "generating"}
                                                className={[
                                                    "w-full py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                                                    dlMintra === "done"
                                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                        : dlMintra === "error"
                                                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                                            : "bg-red-500 hover:bg-red-600 text-white",
                                                ].join(" ")}
                                            >
                                                <Download className="w-3 h-3" />
                                                {dlLabel(dlMintra, "Descargar PDF")}
                                            </button>
                                            {/* <a
                                                href={buildMailtoMintrabajo()}
                                                className="w-full py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-red-500 hover:bg-red-600 text-white"
                                            >
                                                <Mail className="w-3 h-3" />
                                                Abrir en correo
                                            </a> */}
                                        </div>
                                    </div>

                                    {/* ARL */}
                                    <div className="rounded-xl bg-[#0F1420] border border-[#1E2A3B] p-4 flex flex-col gap-3">
                                        <div>
                                            <p className="text-white text-xs font-bold mb-0.5">ARL</p>
                                            <p className="text-[#64748B] text-xs">{selected.worker_arl || "Sin ARL registrada"}</p>
                                            <p className="text-[#64748B] text-xs">Aviso + solicitud asesoría</p>
                                        </div>
                                        {isNotified("arl") && (
                                            <span className="text-xs text-emerald-400 font-semibold">✓ Ya notificado</span>
                                        )}
                                        <div className="mt-auto flex flex-col gap-2">
                                            <button
                                                onClick={handleARLDownload}
                                                disabled={dlARL === "generating"}
                                                className={[
                                                    "w-full py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                                                    dlARL === "done"
                                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                        : dlARL === "error"
                                                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                                            : "bg-amber-500 hover:bg-amber-600 text-white",
                                                ].join(" ")}
                                            >
                                                <Download className="w-3 h-3" />
                                                {dlLabel(dlARL, "Descargar PDF")}
                                            </button>
                                            {/* <a
                                                href={buildMailtoARL()}
                                                className="w-full py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-amber-500 hover:bg-amber-600 text-white"
                                            >
                                                <Mail className="w-3 h-3" />
                                                Abrir en correo
                                            </a> */}
                                        </div>
                                    </div>

                                    {/* EPS */}
                                    <div className="rounded-xl bg-[#0F1420] border border-[#1E2A3B] p-4 flex flex-col gap-3">
                                        <div>
                                            <p className="text-white text-xs font-bold mb-0.5">EPS</p>
                                            <p className="text-[#64748B] text-xs">{selected.worker_eps || "Sin EPS registrada"}</p>
                                            <p className="text-[#64748B] text-xs">Aviso + solicitud informe médico</p>
                                        </div>
                                        {isNotified("eps") && (
                                            <span className="text-xs text-emerald-400 font-semibold">✓ Ya notificado</span>
                                        )}
                                        <div className="mt-auto flex flex-col gap-2">
                                            <button
                                                onClick={handleEPSDownload}
                                                disabled={dlEPS === "generating"}
                                                className={[
                                                    "w-full py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                                                    dlEPS === "done"
                                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                        : dlEPS === "error"
                                                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                                            : "bg-blue-500 hover:bg-blue-600 text-white",
                                                ].join(" ")}
                                            >
                                                <Download className="w-3 h-3" />
                                                {dlLabel(dlEPS, "Descargar PDF")}
                                            </button>
                                            {/* <a
                                                href={buildMailtoEPS()}
                                                className="w-full py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-blue-500 hover:bg-blue-600 text-white"
                                            >
                                                <Mail className="w-3 h-3" />
                                                Abrir en correo
                                            </a> */}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Mark as sent */}
                            <section className="bg-[#141824] border border-[#1E2A3B] rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Send className="w-4 h-4 text-[#F59E0B]" />
                                    <h3 className="text-white font-semibold text-sm">Registrar envío</h3>
                                </div>
                                <div className="flex items-end gap-3">
                                    <div className="flex-1">
                                        <label className="block text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-1">
                                            N.° Radicado (opcional)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Ej: MINTRABAJO-2026-0001234"
                                            value={radicado}
                                            onChange={(e) => setRadicado(e.target.value)}
                                            className="w-full bg-[#0F1420] border border-[#1E2A3B] rounded-lg px-3 py-2 text-white text-sm placeholder:text-[#334155] focus:outline-none focus:border-[#F59E0B]/50 transition-colors"
                                        />
                                    </div>
                                    {(["mintrabajo", "arl", "eps"] as NotificationType[]).map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => markAsSent(type)}
                                            disabled={markingType !== null || isNotified(type)}
                                            className={[
                                                "px-3 py-2 rounded-lg text-xs font-bold transition-all border cursor-pointer",
                                                isNotified(type)
                                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 cursor-default"
                                                    : "bg-[#1E2A3B] text-white border-[#334155] hover:bg-[#252B3B] hover:border-[#F59E0B]/30",
                                            ].join(" ")}
                                        >
                                            {markingType === type ? "…" : isNotified(type) ? `✓ ${type.toUpperCase()}` : `Marcar ${type.toUpperCase()}`}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[#334155] text-xs mt-2">
                                    Al marcar como enviado queda constancia en la base de datos local del evento.
                                </p>
                            </section>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
