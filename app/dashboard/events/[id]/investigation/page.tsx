/**
 * app/dashboard/events/[id]/investigation/page.tsx
 * Módulo 3 — Investigación del Accidente (Res. 1401/2007)
 * 4 tabs: Equipo/Narrativa | Árbol de Causas | Plan de Acción | Firmas
 * Desktop-first con soporte móvil funcional.
 * Auto-save + localStorage fallback offline.
 */
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    ArrowLeft, Save, CheckCircle2, AlertTriangle, Users,
    Search, Zap, ClipboardList, Plus, Trash2, Loader2,
    ChevronRight, ChevronDown, Lock, Clock, PenLine, Copy, Check, Share2, FileText,
    Car, TriangleAlert, BookOpen, Camera, CalendarDays, Image, MessageCircle, Mail, Sparkles,
    DollarSign, Info
} from "lucide-react";
import {
    CONDICIONES_SUBESTANDAR,
    ACTOS_SUBESTANDAR,
    FACTORES_PERSONALES,
    FACTORES_TRABAJO,
    PESV_FACTOR_HUMANO,
    PESV_FACTOR_VEHICULO,
    PESV_FACTOR_INFRAESTRUCTURA,
    DEFAULT_CAUSES_SELECTED,
    type CausesSelected,
    type CauseCategory,
} from "@/lib/ntc3701-causes-data";
import {
    supabase,
    type Event,
    type Investigation,
    type ImmediateCause,
    type BasicCause,
    type ActionItem,
    type SignatureRequest,
    type SignerRole,
    type LessonsLearned,
    type EventCost,
} from "@/lib/supabase";
import { useTheme } from "next-themes";

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS = [
    { id: 0, label: "Equipo", icon: Users },
    { id: 1, label: "Causas", icon: Zap },
    { id: 2, label: "Acciones", icon: ClipboardList },
    { id: 3, label: "Costos", icon: DollarSign },
    { id: 4, label: "Lección", icon: BookOpen },
    { id: 5, label: "Firmas", icon: PenLine },
] as const;

// ── Helpers de costos ─────────────────────────────────────────────────────────

const DEFAULT_COST: Omit<EventCost, "event_id"> = {
    costo_atencion_medica: 0,
    costo_incapacidad_salario: 0,
    costo_indemnizacion: 0,
    costo_rehabilitacion: 0,
    costo_danos_propiedad: 0,
    costo_directo_otro: 0,
    costo_directo_descripcion: "",
    costo_tiempo_perdido_accidentado: 0,
    costo_tiempo_perdido_companeros: 0,
    costo_tiempo_perdido_jefes: 0,
    costo_investigacion: 0,
    costo_reemplazo_contratacion: 0,
    costo_entrenamiento_reemplazo: 0,
    costo_horas_extra: 0,
    costo_perdida_productividad: 0,
    costo_danos_materiales_equipos: 0,
    costo_sanciones_multas: 0,
    costo_indirecto_otro: 0,
    costo_indirecto_descripcion: "",
    moneda: "COP",
};

function formatCOP(val: number): string {
    if (val === 0) return "$0";
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(val);
}

const DEFAULT_LESSONS: LessonsLearned = {
    que_ocurrio: "",
    por_que_ocurrio: "",
    que_aprendimos: "",
    como_prevenimos: "",
    foto_cierre: undefined,
    fecha_divulgacion: "",
};

const SIGNER_ROLES: { role: SignerRole; label: string; short: string }[] = [
    { role: "COPASST", label: "Representante COPASST", short: "COPASST" },
    { role: "SUPERVISOR", label: "Jefe Inmediato / Supervisor", short: "Supervisor" },
    { role: "SST_PROFESSIONAL", label: "Profesional SST con Licencia", short: "SST" },
];

const STATUS_LABELS: Record<string, { label: string; color: string; colorLight: string; bg: string; bgLight: string }> = {
    en_proceso: { label: "En Proceso", color: "text-amber-400", colorLight: "text-amber-600", bg: "bg-amber-400/10 border-amber-400/25", bgLight: "bg-amber-50 border-amber-200" },
    plan_accion_definido: { label: "Plan Definido", color: "text-blue-400", colorLight: "text-blue-600", bg: "bg-blue-400/10 border-blue-400/25", bgLight: "bg-blue-50 border-blue-200" },
    en_seguimiento: { label: "En Seguimiento", color: "text-purple-400", colorLight: "text-purple-600", bg: "bg-purple-400/10 border-purple-400/25", bgLight: "bg-purple-50 border-purple-200" },
    cerrado: { label: "Cerrado", color: "text-emerald-400", colorLight: "text-emerald-600", bg: "bg-emerald-400/10 border-emerald-400/25", bgLight: "bg-emerald-50 border-emerald-200" },
};

// ── Reusable field components ─────────────────────────────────────────────────

function FieldLabel({ children, isLight }: { children: React.ReactNode; isLight?: boolean }) {
    return <label className={`block ${isLight ? "text-gray-500" : "text-[#94A3B8]"} text-xs font-semibold uppercase tracking-wider mb-1.5`}>{children}</label>;
}

function FInput({ value, onChange, placeholder, disabled, isLight }: {
    value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean; isLight?: boolean;
}) {
    const ref = useRef<HTMLInputElement>(null);
    return (
        <input
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => ref.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full ${isLight ? "bg-gray-50 border-gray-200 text-[#1E293B]" : "bg-[#0F1420] border border-[#1E2A3B] text-white"} rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#F59E0B]/50 transition-colors ${isLight ? "placeholder:text-[#94A3B8]" : "placeholder:text-[#334155]"} disabled:opacity-50`}
        />
    );
}

function FTextarea({ value, onChange, placeholder, rows = 4, disabled, isLight }: {
    value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; disabled?: boolean; isLight?: boolean;
}) {
    const ref = useRef<HTMLTextAreaElement>(null);
    return (
        <textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => ref.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
            placeholder={placeholder}
            rows={rows}
            disabled={disabled}
            className={`w-full ${isLight ? "bg-gray-50 border-gray-200 text-[#1E293B]" : "bg-[#0F1420] border border-[#1E2A3B] text-white"} rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#F59E0B]/50 transition-colors ${isLight ? "placeholder:text-[#94A3B8]" : "placeholder:text-[#334155]"} resize-none disabled:opacity-50`}
        />
    );
}

function SectionTitle({ icon: Icon, children, action, isLight }: { icon: React.ElementType; children: React.ReactNode; action?: React.ReactNode; isLight?: boolean }) {
    return (
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-[#F59E0B]" />
                <h3 className={`${isLight ? "text-[#1E293B]" : "text-white"} font-semibold text-sm`}>{children}</h3>
            </div>
            {action}
        </div>
    );
}

// ── NTC 3701 cause selector components ────────────────────────────────────────

function CauseCheckbox({ code, label, checked, onChange, disabled, isLight }: {
    code: string; label: string; checked: boolean;
    onChange: (v: boolean) => void; disabled?: boolean; isLight?: boolean;
}) {
    const id = `cause-${code}-${label.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
    return (
        <label htmlFor={id} className={`flex items-center gap-2.5 py-1.5 px-2 rounded-lg cursor-pointer transition-colors ${checked ? (isLight ? "bg-amber-50 border border-amber-200" : "bg-amber-400/8 border border-amber-400/20") : (isLight ? "hover:bg-gray-50 border border-transparent" : "hover:bg-white/3 border border-transparent")
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
            <input id={id} type="checkbox" checked={checked} disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
                className="mt-0.5 max-w-3.5 max-h-3.5 accent-amber-400 flex-shrink-0 cursor-pointer" />
            <span className="text-xs leading-relaxed">
                <span className="text-amber-500 font-mono font-bold mr-1">{code}</span>
                <span className={`${isLight ? "text-[#1E293B]" : "text-[#CBD5E1]"}`}>{label}</span>
            </span>
        </label>
    );
}

function SubCategoryAccordion({ category, selected, onToggle, disabled, isLight }: {
    category: CauseCategory;
    selected: string[];
    onToggle: (key: string) => void;
    disabled?: boolean;
    isLight?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const selectedCount = category.causes.filter(c => selected.includes(`${c.code} ${c.label}`)).length;
    return (
        <div className={`border ${isLight ? "border-gray-100" : "border-[#1E2A3B]"} rounded-xl overflow-hidden mb-2`}>
            <button onClick={() => setOpen(o => !o)}
                className={`w-full flex items-center justify-between px-3 py-2.5 ${isLight ? "bg-gray-50/50 hover:bg-gray-100/50" : "bg-[#0F1420] hover:bg-white/3"} transition-colors cursor-pointer`}>
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-amber-500 font-mono text-[11px] font-bold flex-shrink-0">{category.code}</span>
                    <span className={`${isLight ? "text-gray-600" : "text-[#94A3B8]"} text-xs font-semibold truncate text-left`}>{category.label}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {selectedCount > 0 && (
                        <span className="bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">{selectedCount}</span>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 text-[#64748B] transition-transform ${open ? "rotate-180" : ""}`} />
                </div>
            </button>
            {open && (
                <div className={`px-3 py-2 ${isLight ? "bg-white" : "bg-[#0A0F1A]"} space-y-0.5`}>
                    {category.causes.map(c => {
                        const key = `${c.code} ${c.label}`;
                        return (
                            <CauseCheckbox key={c.code} code={c.code} label={c.label}
                                checked={selected.includes(key)}
                                onChange={() => onToggle(key)}
                                disabled={disabled} isLight={isLight} />
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function CausesAccordion({ title, norm, count, defaultOpen, children, isLight }: {
    title: string; norm: string; count: number; defaultOpen?: boolean; children: React.ReactNode; isLight?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen ?? false);
    return (
        <div className={`${isLight ? "bg-white border border-gray-100" : "bg-[#141824] border border-[#1E2A3B]"} rounded-2xl overflow-hidden`}>
            <button onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-white/2 transition-colors cursor-pointer">
                <div className="flex flex-col items-start gap-0.5">
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-[#F59E0B]" />
                        <span className={`${isLight ? "text-[#1E293B]" : "text-white"} font-semibold text-sm`}>{title}</span>
                        {count > 0 && (
                            <span className="bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {count} seleccionada{count !== 1 ? "s" : ""}
                            </span>
                        )}
                    </div>
                    <span className={`${isLight ? "text-gray-400" : "text-[#475569]"} text-[10px] ml-6`}>{norm}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-[#64748B] transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} />
            </button>
            {open && <div className="px-4 sm:px-6 pb-5">{children}</div>}
        </div>
    );
}

// ── Signature status badge ────────────────────────────────────────────────────

function SigBadge({ status, isLight }: { status: string; isLight?: boolean }) {
    const cfg: Record<string, { label: string; cls: string; clsLight: string }> = {
        PENDING: { label: "Pendiente", cls: "bg-amber-400/10 text-amber-400 border-amber-400/25", clsLight: "bg-amber-50 text-amber-600 border-amber-200" },
        SIGNED: { label: "Firmado ✓", cls: "bg-emerald-400/10 text-emerald-400 border-emerald-400/25", clsLight: "bg-emerald-50 text-emerald-600 border-emerald-200" },
        EXPIRED: { label: "Expirado", cls: "bg-red-400/10 text-red-400 border-red-400/25", clsLight: "bg-red-50 text-red-600 border-red-200" },
    };
    const c = cfg[status] ?? cfg.PENDING;
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${isLight ? c.clsLight : c.cls}`}>
            {c.label}
        </span>
    );
}

// ── Countdown ─────────────────────────────────────────────────────────────────

function Countdown({ expiresAt }: { expiresAt: string }) {
    const [remaining, setRemaining] = useState("");
    useEffect(() => {
        function update() {
            const ms = new Date(expiresAt).getTime() - Date.now();
            if (ms <= 0) { setRemaining("Expirado"); return; }
            const h = Math.floor(ms / 3600000);
            const m = Math.floor((ms % 3600000) / 60000);
            setRemaining(`${h}h ${m}m restantes`);
        }
        update();
        const t = setInterval(update, 60000);
        return () => clearInterval(t);
    }, [expiresAt]);
    return <span className="text-[#64748B] text-xs">{remaining}</span>;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InvestigationPage() {
    const router = useRouter();
    const params = useParams();
    const incidentId = params.id as string;

    const { theme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isLight = mounted && (theme === "light" || resolvedTheme === "light");

    const lightStyles = {
        bg: "bg-[#F8FAFC]",
        containerBg: "bg-white",
        headerBg: "bg-white border-b border-gray-100",
        tabGroup: "bg-gray-100 border border-gray-200",
        cardBg: "bg-white border border-gray-200",
        textTitle: "text-[#1E293B]",
        textSub: "text-[#64748B]",
        divider: "border-gray-200",
    };

    const darkStyles = {
        bg: "bg-[#0F1420]",
        containerBg: "bg-[#0F1420]",
        headerBg: "bg-[#141824] border-b border-[#1E2A3B]",
        tabGroup: "bg-[#141824] border border-[#1E2A3B]",
        cardBg: "bg-[#141824] border border-[#1E2A3B]",
        textTitle: "text-white",
        textSub: "text-[#64748B]",
        divider: "border-[#1E2A3B]",
    };

    const s = isLight ? lightStyles : darkStyles;

    const [incident, setIncident] = useState<Event | null>(null);
    const [investigation, setInv] = useState<Investigation | null>(null);
    const [sigRequests, setSigReqs] = useState<SignatureRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [closing, setClosing] = useState(false);
    const [creating, setCreating] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [genLoadingRole, setGenLoadingRole] = useState<SignerRole | null>(null);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Costs state ────────────────────────────────────────────────────────────
    const [eventCost, setEventCost] = useState<EventCost & { id?: string }>({ ...DEFAULT_COST, event_id: incidentId });
    const [costSaving, setCostSaving] = useState(false);
    const [costSaved, setCostSaved] = useState(false);
    const costSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Form state
    const [team, setTeam] = useState({ sst: "", jefe: "", copasst: "", extra: "" });
    const [narrative, setNarrative] = useState("");
    const [causesSelected, setCausesSelected] = useState<CausesSelected>(DEFAULT_CAUSES_SELECTED);
    const [involucraVehiculo, setInvolucraVehiculo] = useState(false);
    const [controlFails, setControlFails] = useState("");
    const [actionPlan, setActionPlan] = useState<ActionItem[]>([]);
    const [conclusions, setConclusions] = useState("");
    const [lessonsLearned, setLessons] = useState<LessonsLearned>(DEFAULT_LESSONS);
    const [signerNames, setSignerNames] = useState<Record<SignerRole, string>>({
        COPASST: "", SUPERVISOR: "", SST_PROFESSIONAL: "",
    });

    // AI Suggestion states
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [isSuggestSuccess, setIsSuggestSuccess] = useState(false);
    const [isSuggestError, setIsSuggestError] = useState(false);
    const [suggestToast, setSuggestToast] = useState<{ message: string; type: "info" | "error" } | null>(null);

    const isClosed = investigation?.status === "cerrado";
    const allSigned = sigRequests.length === 3 && sigRequests.every((r) => r.status === "SIGNED");

    // ── Load ────────────────────────────────────────────────────────────────
    const load = useCallback(async () => {
        setLoading(true);
        const [{ data: ev }, { data: invs }, { data: costData }] = await Promise.all([
            supabase.from("incidents").select("*").eq("id", incidentId).maybeSingle(),
            supabase.from("investigations").select("*").eq("incident_id", incidentId).maybeSingle(),
            supabase.from("event_costs").select("*").eq("event_id", incidentId).maybeSingle(),
        ]);
        setIncident(ev as Event | null);
        const inv = invs as Investigation | null;
        if (inv) {
            setInv(inv);
            setTeam({ sst: inv.investigator_sst ?? "", jefe: inv.investigator_jefe ?? "", copasst: inv.investigator_copasst ?? "", extra: inv.investigators_extra ?? "" });
            setNarrative(inv.event_narrative ?? "");
            if (inv.causes_selected) {
                setCausesSelected(inv.causes_selected);
                setInvolucraVehiculo(inv.causes_selected.pesv?.aplica ?? false);
            }
            setControlFails(inv.control_failures ?? "");
            setActionPlan(inv.action_plan ?? []);
            setConclusions(inv.conclusions ?? "");
            if (inv.lessons_learned) setLessons(inv.lessons_learned);
            // Load existing signature requests
            const { data: sigs } = await supabase.from("signature_requests").select("*").eq("investigation_id", inv.id);
            if (sigs) {
                setSigReqs(sigs as SignatureRequest[]);
                const names: Record<SignerRole, string> = { COPASST: "", SUPERVISOR: "", SST_PROFESSIONAL: "" };
                sigs.forEach((s) => { if (s.signer_name) names[s.signer_role as SignerRole] = s.signer_name; });
                setSignerNames(names);
            }
        }
        if (costData) {
            setEventCost(costData as EventCost & { id?: string });
        } else {
            setEventCost({ ...DEFAULT_COST, event_id: incidentId });
        }
        setLoading(false);
    }, [incidentId]);

    useEffect(() => { load(); }, [load]);

    // ── Realtime subscription for signature updates ──────────────────────────
    useEffect(() => {
        if (!investigation?.id) return;
        const channel = supabase
            .channel(`investigation-sigs-${investigation.id}`)
            .on("postgres_changes", {
                event: "UPDATE",
                schema: "public",
                table: "signature_requests",
                filter: `investigation_id=eq.${investigation.id}`,
            }, (payload) => {
                setSigReqs((prev) => prev.map((r) => r.id === payload.new.id ? payload.new as SignatureRequest : r));
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [investigation?.id]);

    // ── Autosave to localStorage offline fallback ────────────────────────────
    const persistLocal = useCallback(() => {
        if (!investigation?.id) return;
        try {
            localStorage.setItem(`inv_draft_${investigation.id}`, JSON.stringify({
                team, narrative, causesSelected, controlFails, actionPlan, conclusions, lessonsLearned,
            }));
        } catch { /* quota exceeded ignored */ }
    }, [investigation?.id, team, narrative, causesSelected, controlFails, actionPlan, conclusions, lessonsLearned]);

    // ── Create investigation ─────────────────────────────────────────────────
    const handleCreate = async () => {
        setCreating(true);
        const { data, error } = await supabase.from("investigations").insert({
            incident_id: incidentId,
            company_id: incident?.company_id ?? null,
            status: "en_proceso",
            immediate_causes: [],
            basic_causes: [],
            action_plan: [],
        }).select().single();
        if (!error && data) setInv(data as Investigation);
        setCreating(false);
    };

    // ── Save ─────────────────────────────────────────────────────────────────
    const save = useCallback(async (showFeedback = true) => {
        if (!investigation || isClosed) return;
        if (showFeedback) setSaving(true);
        let newStatus: Investigation["status"] = "en_proceso";
        if (actionPlan.length > 0) newStatus = "plan_accion_definido";
        await supabase.from("investigations").update({
            investigator_sst: team.sst || null,
            investigator_jefe: team.jefe || null,
            investigator_copasst: team.copasst || null,
            investigators_extra: team.extra || null,
            event_narrative: narrative || null,
            causes_selected: { ...causesSelected, pesv: { ...causesSelected.pesv, aplica: involucraVehiculo } },
            control_failures: controlFails || null,
            action_plan: actionPlan,
            conclusions: conclusions || null,
            lessons_learned: lessonsLearned,
            status: newStatus,
            updated_at: new Date().toISOString(),
        }).eq("id", investigation.id);
        setInv((prev) => prev ? { ...prev, status: newStatus } : prev);
        persistLocal();
        if (showFeedback) { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    }, [investigation, isClosed, team, narrative, causesSelected, involucraVehiculo, controlFails, actionPlan, conclusions, lessonsLearned, persistLocal]);

    const scheduleSave = useCallback(() => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => save(false), 3000);
    }, [save]);

    // ── Save costs ────────────────────────────────────────────────────────────
    const saveCosts = useCallback(async (showFeedback = true) => {
        if (isClosed) return;
        if (showFeedback) setCostSaving(true);
        const { id: costId, ...costFields } = eventCost;
        if (costId) {
            await supabase.from("event_costs").update({ ...costFields, updated_at: new Date().toISOString() }).eq("id", costId);
        } else {
            const { data: inserted } = await supabase.from("event_costs").insert({ ...costFields, event_id: incidentId }).select().single();
            if (inserted) setEventCost(prev => ({ ...prev, id: (inserted as EventCost & { id: string }).id }));
        }
        if (showFeedback) { setCostSaving(false); setCostSaved(true); setTimeout(() => setCostSaved(false), 2000); }
    }, [eventCost, isClosed, incidentId]);

    const scheduleCostSave = useCallback(() => {
        if (costSaveTimer.current) clearTimeout(costSaveTimer.current);
        costSaveTimer.current = setTimeout(() => saveCosts(false), 2000);
    }, [saveCosts]);

    const updCost = useCallback(<K extends keyof EventCost>(field: K, value: EventCost[K]) => {
        setEventCost(prev => ({ ...prev, [field]: value }));
        scheduleCostSave();
    }, [scheduleCostSave]);

    // ── Close ────────────────────────────────────────────────────────────────
    const handleClose = async () => {
        if (!investigation) return;
        setClosing(true);
        await save(false);
        await supabase.from("investigations").update({ status: "cerrado", closed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", investigation.id);
        await supabase.from("incidents").update({ classification_status: "investigated", updated_at: new Date().toISOString() }).eq("id", incidentId);
        setInv((prev) => prev ? { ...prev, status: "cerrado" } : prev);
        setClosing(false);
    };

    // ── Generate signature link ───────────────────────────────────────────────
    const generateSignatureLink = async (role: SignerRole) => {
        if (!investigation) return;
        setGenLoadingRole(role);
        // Delete any existing PENDING request for this role
        await supabase.from("signature_requests").delete()
            .eq("investigation_id", investigation.id)
            .eq("signer_role", role)
            .eq("status", "PENDING");

        const token = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
        const { data } = await supabase.from("signature_requests").insert({
            investigation_id: investigation.id,
            signer_role: role,
            signer_name: signerNames[role] || null,
            token,
            expires_at: expiresAt,
            status: "PENDING",
        }).select().single();
        if (data) setSigReqs((prev) => {
            const without = prev.filter((r) => !(r.signer_role === role && r.status === "PENDING"));
            return [...without, data as SignatureRequest];
        });
        setGenLoadingRole(null);
    };

    // ── Copy to clipboard ────────────────────────────────────────────────────
    const copyLink = async (token: string, id: string) => {
        const url = `${window.location.origin}/sign/${token}`;
        await navigator.clipboard.writeText(url);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const whatsappLink = (token: string, rolLabel: string) => {
        const url = encodeURIComponent(`${window.location.origin}/sign/${token}`);
        const msg = encodeURIComponent(`Hola, por favor firma como *${rolLabel}* el documento de investigación de accidente aquí: `);
        return `https://wa.me/?text=${msg}${url}`;
    };

    // ── Cause helpers ────────────────────────────────────────────────────────
    const toggleCause = useCallback((
        section: keyof CausesSelected,
        field: string,
        key: string
    ) => {
        setCausesSelected(prev => {
            const sec = prev[section] as Record<string, unknown>;
            const arr = (sec[field] as string[]) ?? [];
            const next = arr.includes(key) ? arr.filter(x => x !== key) : [...arr, key];
            return { ...prev, [section]: { ...sec, [field]: next } };
        });
        scheduleSave();
    }, [scheduleSave]);

    const addAction = () => { setActionPlan([...actionPlan, { action: "", responsible: "", deadline: "", status: "pendiente" }]); scheduleSave(); };
    const updAction = (i: number, p: Partial<ActionItem>) => { setActionPlan(actionPlan.map((a, idx) => idx === i ? { ...a, ...p } : a)); scheduleSave(); };
    const rmAction = (i: number) => { setActionPlan(actionPlan.filter((_, idx) => idx !== i)); scheduleSave(); };

    // ── Render ────────────────────────────────────────────────────────────────
    if (loading) return (
        <div className={`min-h-screen ${isLight ? "bg-[#F8FAFC]" : "bg-[#0F1420]"} flex items-center justify-center`}>
            <Loader2 className="w-6 h-6 text-[#F59E0B] animate-spin" />
        </div>
    );

    const statusCfg = STATUS_LABELS[investigation?.status ?? "en_proceso"];

    return (
        <div className={`h-full flex flex-col ${s.bg} overflow-hidden`} style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* HEADER */}
            <header className={`${s.headerBg} px-4 sm:px-6 py-4 flex items-center gap-3 sm:gap-4 sticky top-0 z-30`}>
                <button onClick={() => router.push(`/dashboard/events/${incidentId}`)} className={`p-2 rounded-lg ${isLight ? "text-gray-500 hover:bg-gray-100" : "text-[#64748B] hover:text-white hover:bg-white/5"} transition-all flex-shrink-0 cursor-pointer`}>
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className={`${s.textTitle} font-bold text-sm sm:text-base leading-none`}>INVESTIGACIÓN</h1>
                        {investigation && (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${isLight ? statusCfg.bgLight : statusCfg.bg} ${isLight ? statusCfg.colorLight : statusCfg.color}`}>
                                {statusCfg.label}
                            </span>
                        )}
                    </div>
                    <p className="text-[#64748B] text-xs mt-0.5 truncate">
                        {incident?.worker_name ?? incident?.reported_by_name ?? "Evento"} — Res. 1401/2007
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 text-[#F59E0B] animate-spin" />}
                    {saved && !saving && <span className="text-emerald-400 text-xs font-semibold hidden sm:inline">Guardado ✓</span>}
                    {investigation && !isClosed && (
                        <button onClick={() => save(true)} disabled={saving}
                            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-[#F59E0B] hover:bg-amber-400 text-black text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer">
                            <Save className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Guardar</span>
                        </button>
                    )}
                    {isClosed && <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                </div>
            </header>

            <div className="flex-1 overflow-y-auto">

            {/* INCIDENT STRIP */}
            {incident && (
                <div className={`${isLight ? "bg-gray-50/80" : "bg-[#141824]/60"} border-b ${s.divider} px-4 sm:px-6 py-2 flex items-center gap-4 text-xs text-[#64748B] flex-wrap`}>
                    <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        {incident.classification?.replace(/_/g, " ") ?? "Sin clasificar"}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" /> {incident.event_date ?? (incident.created_at ?? "").slice(0, 10)}
                    </span>
                    {incident.event_city && <span>{incident.event_city}</span>}
                </div>
            )}

            {/* NO INVESTIGATION YET */}
            {!investigation ? (
                <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
                    <div className="w-16 h-16 bg-amber-400/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <ClipboardList className="w-8 h-8 text-[#F59E0B]" />
                    </div>
                    <h2 className="text-white font-bold text-xl mb-2">Iniciar Investigación Formal</h2>
                    <p className="text-[#64748B] text-sm mb-2 max-w-md mx-auto">
                        Debe realizarse dentro de los <strong className="text-white">15 días hábiles</strong> siguientes (Res. 1401/2007, Art. 4).
                    </p>
                    <p className="text-[#334155] text-sm mb-8 max-w-md mx-auto">
                        Puedes guardarlo y continuarlo en cualquier momento.
                    </p>
                    <button onClick={handleCreate} disabled={creating}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[#F59E0B] text-black font-bold rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-60 cursor-pointer">
                        {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Iniciar Investigación
                    </button>
                </div>
            ) : (
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
                    {/* TABS */}
                    {(() => {
                        // Compute costs badge total
                        const totalDirectos = (eventCost.costo_atencion_medica ?? 0) + (eventCost.costo_incapacidad_salario ?? 0) + (eventCost.costo_indemnizacion ?? 0) + (eventCost.costo_rehabilitacion ?? 0) + (eventCost.costo_danos_propiedad ?? 0) + (eventCost.costo_directo_otro ?? 0);
                        const totalIndirectos = (eventCost.costo_tiempo_perdido_accidentado ?? 0) + (eventCost.costo_tiempo_perdido_companeros ?? 0) + (eventCost.costo_tiempo_perdido_jefes ?? 0) + (eventCost.costo_investigacion ?? 0) + (eventCost.costo_reemplazo_contratacion ?? 0) + (eventCost.costo_entrenamiento_reemplazo ?? 0) + (eventCost.costo_horas_extra ?? 0) + (eventCost.costo_perdida_productividad ?? 0) + (eventCost.costo_danos_materiales_equipos ?? 0) + (eventCost.costo_sanciones_multas ?? 0) + (eventCost.costo_indirecto_otro ?? 0);
                        const totalCostos = totalDirectos + totalIndirectos;
                        return (
                            <div className={`flex gap-1 ${s.cardBg} rounded-2xl p-1 mb-6 overflow-x-auto`}>
                                {TABS.map((tab) => {
                                    const Icon = tab.icon;
                                    const isCostTab = tab.id === 3;
                                    const hasCostBadge = isCostTab && totalCostos > 0;
                                    return (
                                        <button key={tab.id}
                                            onClick={() => {
                                                // Auto-save costs when leaving cost tab
                                                if (activeTab === 3 && tab.id !== 3) saveCosts(false);
                                                setActiveTab(tab.id);
                                            }}
                                            className={["flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-2.5 rounded-xl text-[10px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap relative",
                                                activeTab === tab.id ? "bg-[#F59E0B] text-black" : `${isLight ? "text-gray-500 hover:text-[#1E293B]" : "text-[#64748B] hover:text-white"}`].join(" ")}>
                                            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                                            <span>{tab.label}</span>
                                            {hasCostBadge && (
                                                <span className={`hidden sm:inline ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                                                    activeTab === 3 ? "bg-black/20 text-black" : "bg-emerald-500/20 text-emerald-400"
                                                }`}>
                                                    {new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 }).format(totalCostos)}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })()}

                    {/* TAB 1: EQUIPO & NARRATIVA */}
                    {activeTab === 0 && (
                        <div className="space-y-6">
                            <div className={`${s.cardBg} rounded-2xl p-4 sm:p-6`}>
                                <SectionTitle icon={Users} isLight={isLight}>Equipo Investigador</SectionTitle>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <FieldLabel isLight={isLight}>Responsable SST *</FieldLabel>
                                        <FInput value={team.sst} onChange={(v) => { setTeam((t) => ({ ...t, sst: v })); scheduleSave(); }} placeholder="Nombre del profesional SST" disabled={isClosed} isLight={isLight} />
                                    </div>
                                    <div>
                                        <FieldLabel isLight={isLight}>Jefe Inmediato *</FieldLabel>
                                        <FInput value={team.jefe} onChange={(v) => { setTeam((t) => ({ ...t, jefe: v })); scheduleSave(); }} placeholder="Nombre del jefe inmediato" disabled={isClosed} isLight={isLight} />
                                    </div>
                                    <div>
                                        <FieldLabel isLight={isLight}>Representante COPASST *</FieldLabel>
                                        <FInput value={team.copasst} onChange={(v) => { setTeam((t) => ({ ...t, copasst: v })); scheduleSave(); }} placeholder="Nombre del representante" disabled={isClosed} isLight={isLight} />
                                    </div>
                                    <div>
                                        <FieldLabel isLight={isLight}>Otros participantes</FieldLabel>
                                        <FInput value={team.extra} onChange={(v) => { setTeam((t) => ({ ...t, extra: v })); scheduleSave(); }} placeholder="Otros investigadores" disabled={isClosed} isLight={isLight} />
                                    </div>
                                </div>
                            </div>
                            <div className={`${s.cardBg} rounded-2xl p-4 sm:p-6`}>
                                <SectionTitle icon={AlertTriangle} isLight={isLight}>Narrativa Ampliada del Evento</SectionTitle>
                                <p className="text-[#64748B] text-xs mb-3">Describe qué ocurrió, en qué secuencia, y cuáles fueron las circunstancias. Es el sustento de las causas.</p>
                                <FTextarea value={narrative} onChange={(v) => { setNarrative(v); scheduleSave(); }}
                                    placeholder="El día [fecha] a las [hora], el trabajador [nombre] se encontraba [actividad] cuando..." rows={8} disabled={isClosed} isLight={isLight} />
                            </div>
                        </div>
                    )}

                    {/* TAB 2: CAUSAS */}
                    {activeTab === 1 && (
                        <div className="space-y-4">
                            {/* Vehicle toggle */}
                            <div className={`${s.cardBg} rounded-2xl px-4 sm:px-6 py-4 flex items-center justify-between gap-4`}>
                                <div className="flex items-center gap-2">
                                    <Car className="w-4 h-4 text-blue-500" />
                                    <span className={`${s.textTitle} text-sm font-semibold`}>¿El evento involucró un vehículo?</span>
                                </div>
                                <button disabled={isClosed}
                                    onClick={() => { setInvolucraVehiculo((v : boolean) => !v); scheduleSave(); }}
                                    className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 ${involucraVehiculo ? "bg-blue-500" : (isLight ? "bg-gray-200" : "bg-[#1E2A3B]")} ${isClosed ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                                    <span className={`inline-block w-4 h-4 mt-1 rounded-full bg-white shadow transition-transform duration-200 ${involucraVehiculo ? "translate-x-6" : "translate-x-1"}`} />
                                </button>
                            </div>

                            {/* §5.2 — Causas Inmediatas */}
                            <CausesAccordion title="§5.2 — Causas Inmediatas" norm="NTC 3701" isLight={isLight}
                                count={causesSelected.inmediatas.condiciones.length + causesSelected.inmediatas.actos.length}
                                defaultOpen={true}>
                                <p className="text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-2 mt-1">A — Condiciones Ambientales Subestándar</p>
                                {CONDICIONES_SUBESTANDAR.map(cat => (
                                    <SubCategoryAccordion key={cat.code} category={cat}
                                         isLight={isLight} selected={causesSelected.inmediatas.condiciones}
                                        onToggle={(key) => toggleCause("inmediatas", "condiciones", key)}
                                        disabled={isClosed} />
                                ))}
                                <p className="text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-2 mt-4">B — Actos Subestándar</p>
                                {ACTOS_SUBESTANDAR.map(cat => (
                                    <SubCategoryAccordion key={cat.code} category={cat}
                                         isLight={isLight} selected={causesSelected.inmediatas.actos}
                                        onToggle={(key) => toggleCause("inmediatas", "actos", key)}
                                        disabled={isClosed} />
                                ))}
                                <div className="mt-4">
                                    <FieldLabel isLight={isLight}>Otra causa inmediata no listada</FieldLabel>
                                    <FTextarea rows={2} value={causesSelected.inmediatas.otra}
                                        onChange={(v) => { setCausesSelected(p => ({ ...p, inmediatas: { ...p.inmediatas, otra: v } })); scheduleSave(); }}
                                         isLight={isLight} placeholder="Describe si hay otra causa no listada..." disabled={isClosed} />
                                </div>
                            </CausesAccordion>

                            {/* §5.3 — Causas Básicas */}
                            <CausesAccordion title="§5.3 — Causas Básicas" norm="NTC 3701" isLight={isLight}
                                count={causesSelected.basicas.factores_personales.length + causesSelected.basicas.factores_trabajo.length}>
                                <p className="text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-2 mt-1">A — Factores Personales</p>
                                {FACTORES_PERSONALES.map(cat => (
                                    <SubCategoryAccordion key={cat.code} category={cat}
                                         isLight={isLight} selected={causesSelected.basicas.factores_personales}
                                        onToggle={(key) => toggleCause("basicas", "factores_personales", key)}
                                        disabled={isClosed} />
                                ))}
                                <p className="text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-2 mt-4">B — Factores del Trabajo</p>
                                {FACTORES_TRABAJO.map(cat => (
                                    <SubCategoryAccordion key={cat.code} category={cat}
                                         isLight={isLight} selected={causesSelected.basicas.factores_trabajo}
                                        onToggle={(key) => toggleCause("basicas", "factores_trabajo", key)}
                                        disabled={isClosed} />
                                ))}
                                <div className="mt-4">
                                    <FieldLabel isLight={isLight}>Otra causa básica no listada</FieldLabel>
                                    <FTextarea rows={2} value={causesSelected.basicas.otra}
                                        onChange={(v) => { setCausesSelected(p => ({ ...p, basicas: { ...p.basicas, otra: v } })); scheduleSave(); }}
                                         isLight={isLight} placeholder="Describe si hay otra causa no listada..." disabled={isClosed} />
                                </div>
                            </CausesAccordion>

                            {/* §5.4 — Fallas en Control Administrativo (unchanged — free text) */}
                            <div className={`${s.cardBg} rounded-2xl p-4 sm:p-6 space-y-2`}>
                                <SectionTitle 
                                    icon={AlertTriangle}
                                    isLight={isLight}
                                    action={
                                        <button
                                            type="button"
                                            disabled={isSuggesting || isClosed}
                                            onClick={async () => {
                                                const hasCauses = 
                                                    (causesSelected.inmediatas?.condiciones?.length || 0) > 0 ||
                                                    (causesSelected.inmediatas?.actos?.length || 0) > 0 ||
                                                    (causesSelected.basicas?.factores_personales?.length || 0) > 0 ||
                                                    (causesSelected.basicas?.factores_trabajo?.length || 0) > 0;

                                                if (!hasCauses) {
                                                    setSuggestToast({ message: "Selecciona alguna causa primero para sugerir", type: "info" });
                                                    setTimeout(() => setSuggestToast(null), 3000);
                                                    return;
                                                }

                                                setIsSuggesting(true);
                                                setIsSuggestError(false);
                                                setIsSuggestSuccess(false);

                                                try {
                                                    const inmediatas = [
                                                        ...(causesSelected.inmediatas?.condiciones || []),
                                                        ...(causesSelected.inmediatas?.actos || []),
                                                        ...(causesSelected.inmediatas?.otra ? [causesSelected.inmediatas.otra] : [])
                                                    ];
                                                    const basicas = [
                                                        ...(causesSelected.basicas?.factores_personales || []),
                                                        ...(causesSelected.basicas?.factores_trabajo || []),
                                                        ...(causesSelected.basicas?.otra ? [causesSelected.basicas.otra] : [])
                                                    ];

                                                    const res = await fetch("/api/ai/narrativa", {
                                                        method: "POST",
                                                        headers: { "Content-Type": "application/json" },
                                                        body: JSON.stringify({
                                                            tipo: "causas",
                                                            texto: incident?.classification || "Accidente",
                                                            contexto: { inmediatas, basicas }
                                                        })
                                                     });

                                                     const data = await res.json();
                                                     if (data.texto) {
                                                         setControlFails(data.texto);
                                                         scheduleSave();
                                                         setIsSuggestSuccess(true);
                                                         setTimeout(() => setIsSuggestSuccess(false), 2000);
                                                     } else {
                                                         setIsSuggestError(true);
                                                     }
                                                 } catch (e) {
                                                     console.error("Error al sugerir causas:", e);
                                                     setIsSuggestError(true);
                                                 } finally {
                                                     setIsSuggesting(false);
                                                 }
                                             }}
                                             className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                                                 isSuggesting ? "bg-amber-900/20 border-amber-700/30 text-amber-400 cursor-not-allowed" :
                                                 isSuggestSuccess ? "bg-emerald-900/20 border-emerald-700/30 text-emerald-400" :
                                                 isSuggestError ? "bg-red-900/20 border-red-700/30 text-red-400" :
                                                 (isLight ? "bg-white border-gray-200 hover:border-[#F59E0B]/50 text-gray-700" : "bg-[#0F1420] border-[#1E2A3B] hover:border-[#F59E0B]/50 text-white") + " hover:text-[#F59E0B]"
                                             }`}
                                        >
                                            {isSuggesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 
                                             isSuggestSuccess ? <Check className="w-3.5 h-3.5" /> :
                                             <Sparkles className="w-3.5 h-3.5" />}
                                            {isSuggesting ? "Sugiriendo..." : isSuggestSuccess ? "Sugerido" : isSuggestError ? "Error — reintentar" : "Sugerir con IA"}
                                        </button>
                                    }
                                >
                                    Fallas en el Control Administrativo (§5.4)
                                </SectionTitle>
                                
                                <FTextarea value={controlFails} onChange={(v) => { setControlFails(v); scheduleSave(); }}
                                    isLight={isLight} placeholder="Deficiencias del sistema de gestión que permitieron que las causas básicas existieran..." rows={4} disabled={isClosed || isSuggesting} />
                                
                                <div className="flex items-center justify-between">
                                    <p className="text-[#64748B] text-[10px]">
                                        Texto sugerido por IA — revisa y ajusta según los hechos reales
                                    </p>
                                </div>

                                {/* Toast Notification */}
                                {suggestToast && (
                                    <div className={`fixed bottom-20 left-1/2 transform -translate-x-1/2 ${isLight ? "bg-white border-gray-200" : "bg-[#141824] border-[#1E2A3B]"} border rounded-xl px-4 py-2 flex items-center gap-2 shadow-lg z-50`}>
                                        <span className="text-amber-400 text-xs font-semibold">{suggestToast.message}</span>
                                    </div>
                                )}
                            </div>

                            {/* §5.5 — Factores PESV (conditional on vehicle toggle) */}
                            {involucraVehiculo && (
                                <CausesAccordion title="§5.5 — Factores PESV" norm="PESV — Res. 1565/2014" isLight={isLight}
                                    count={causesSelected.pesv.factor_humano.length + causesSelected.pesv.factor_vehiculo.length + causesSelected.pesv.factor_infraestructura.length}>
                                    <p className="text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-2 mt-1">A — Factor Humano</p>
                                    <div className="space-y-0.5 mb-4">
                                        {PESV_FACTOR_HUMANO.map(item => (
                                            <CauseCheckbox key={item} code="—" label={item}
                                                 isLight={isLight} checked={causesSelected.pesv.factor_humano.includes(item)}
                                                onChange={() => toggleCause("pesv", "factor_humano", item)}
                                                disabled={isClosed} />
                                        ))}
                                    </div>
                                    <p className="text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-2">B — Factor Vehículo</p>
                                    <div className="space-y-0.5 mb-4">
                                        {PESV_FACTOR_VEHICULO.map(item => (
                                            <CauseCheckbox key={item} code="—" label={item}
                                                 isLight={isLight} checked={causesSelected.pesv.factor_vehiculo.includes(item)}
                                                onChange={() => toggleCause("pesv", "factor_vehiculo", item)}
                                                disabled={isClosed} />
                                        ))}
                                    </div>
                                    <p className="text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-2">C — Factor Infraestructura</p>
                                    <div className="space-y-0.5 mb-4">
                                        {PESV_FACTOR_INFRAESTRUCTURA.map(item => (
                                            <CauseCheckbox key={item} code="—" label={item}
                                                 isLight={isLight} checked={causesSelected.pesv.factor_infraestructura.includes(item)}
                                                onChange={() => toggleCause("pesv", "factor_infraestructura", item)}
                                                disabled={isClosed} />
                                        ))}
                                    </div>
                                    <div className="mt-2">
                                        <FieldLabel isLight={isLight}>Otro factor PESV no listado</FieldLabel>
                                        <FTextarea rows={2} value={causesSelected.pesv.otra}
                                            onChange={(v) => { setCausesSelected(p => ({ ...p, pesv: { ...p.pesv, otra: v } })); scheduleSave(); }}
                                             isLight={isLight} placeholder="Describe si hay otro factor PESV no listado..." disabled={isClosed} />
                                    </div>
                                </CausesAccordion>
                            )}
                        </div>
                    )}

                    {/* TAB 3: PLAN DE ACCIÓN */}
                    {activeTab === 2 && (
                        <div className="space-y-6">
                            <div className={`${s.cardBg} rounded-2xl p-4 sm:p-6`}>
                                <SectionTitle icon={ClipboardList} isLight={isLight}>Plan de Acción Correctiva</SectionTitle>
                                {actionPlan.length === 0 && !isClosed && (
                                    <div className={`text-center py-6 text-[#334155] text-sm border border-dashed ${isLight ? "border-gray-200" : "border-[#1E2A3B]"} rounded-xl mb-4`}>
                                        Sin acciones definidas
                                    </div>
                                )}
                                {actionPlan.map((item, i) => {
                                    const hasContact = !!(item.responsible_phone || item.responsible_email);
                                    const isNotified = !!item.notified_at;
                                    const notifyDisabled = !hasContact || isClosed;
                                    const buildMessage = (tok?: string) => {
                                        const name = item.responsible || "responsable";
                                        const deadlineStr = item.deadline ? new Date(item.deadline + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }) : "pendiente";
                                        const link = tok ? `${window.location.origin}/acciones/${tok}` : "";
                                        return `Hola ${name}, se te ha asignado una acción correctiva en el sistema SST de FOXTECH.\n\n📋 *Acción:* ${item.action}\n📍 *Origen:* Investigación\n📅 *Fecha límite:* ${deadlineStr}${link ? `\n🔗 *Ver detalle:* ${link}` : ""}\n\nPor favor confirma recibido respondiendo este mensaje.`;
                                    };
                                    const handleNotify = async (via: "whatsapp" | "email") => {
                                        // 1 — generate token if not yet created
                                        let tok = item.token;
                                        if (!tok) {
                                            const { data, error: tokErr } = await supabase.from("action_tokens").insert({
                                                source: "investigation",
                                                source_id: investigation!.id,
                                                action_index: i,
                                            }).select("token").single();
                                            if (tokErr) console.error("action_tokens insert failed:", tokErr);
                                            tok = data?.token ?? undefined;
                                            updAction(i, { token: tok });
                                        }
                                        // 2 — open channel (pass tok explicitly so link is always present)
                                        const msg = buildMessage(tok);
                                        if (via === "whatsapp" && item.responsible_phone) {
                                            const phone = item.responsible_phone.replace(/\D/g, "");
                                            window.open(`https://wa.me/57${phone}?text=${encodeURIComponent(msg)}`, "_blank");
                                        } else if (via === "email" && item.responsible_email) {
                                            const subj = "Acción correctiva asignada — FOXTECH SST";
                                            window.open(`mailto:${item.responsible_email}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(msg)}`, "_blank");
                                        }
                                        // 3 — mark notified
                                        const now = new Date().toISOString();
                                        updAction(i, { notified_at: now, notified_via: via, token: tok });
                                        await save(false);
                                    };
                                    const cardClass = `${isLight ? "bg-white border-gray-200" : "bg-[#0F1420] border-[#1E2A3B]"} border rounded-xl p-4 mb-3`;
                                    return (
                                        <div key={i} className={cardClass}>
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-[#F59E0B] text-xs font-bold">Acción #{i + 1}</span>
                                                {!isClosed && (
                                                    <button onClick={() => rmAction(i)} className="p-1 rounded-lg text-[#64748B] hover:text-red-400 hover:bg-red-400/10 transition-all">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div className="sm:col-span-2">
                                                    <FieldLabel>Acción correctiva *</FieldLabel>
                                                    <FInput value={item.action} onChange={(v) => updAction(i, { action: v })} placeholder="Describir la acción..." disabled={isClosed} />
                                                </div>
                                                {/* Expanded responsible fields */}
                                                <div className="sm:col-span-2">
                                                    <FieldLabel>Nombre del responsable *</FieldLabel>
                                                    <FInput value={item.responsible} onChange={(v) => updAction(i, { responsible: v })} placeholder="Nombre y cargo" disabled={isClosed} />
                                                </div>
                                                <div>
                                                    <FieldLabel>Teléfono (opcional)</FieldLabel>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`text-[#64748B] text-sm px-2 py-2.5 ${isLight ? "bg-gray-50 border-gray-200" : "bg-[#141824] border-[#1E2A3B]"} border rounded-xl`}>+57</span>
                                                        <FInput value={item.responsible_phone ?? ""} onChange={(v) => updAction(i, { responsible_phone: v.replace(/\D/g, "").slice(0, 10) })} placeholder="3001234567" disabled={isClosed} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <FieldLabel>Email (opcional)</FieldLabel>
                                                    <FInput value={item.responsible_email ?? ""} onChange={(v) => updAction(i, { responsible_email: v })} placeholder="correo@empresa.com" disabled={isClosed} />
                                                </div>
                                                <div>
                                                    <FieldLabel>Fecha límite *</FieldLabel>
                                                    <input type="date" value={item.deadline} onChange={(e) => updAction(i, { deadline: e.target.value })} disabled={isClosed}
                                                        className={`w-full ${isLight ? "bg-white border-gray-200 text-[#1E293B]" : "bg-[#141824] border-[#1E2A3B] text-white"} rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#F59E0B]/50 transition-colors disabled:opacity-50`} />
                                                </div>
                                                <div>
                                                    <FieldLabel>Estado</FieldLabel>
                                                    <select value={item.status} onChange={(e) => updAction(i, { status: e.target.value as ActionItem["status"] })} disabled={isClosed}
                                                        className={`w-full ${isLight ? "bg-white border-gray-200 text-[#1E293B]" : "bg-[#141824] border-[#1E2A3B] text-white"} rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#F59E0B]/50 transition-colors disabled:opacity-50`}>
                                                        <option value="pendiente">Pendiente</option>
                                                        <option value="en_curso">En Curso</option>
                                                        <option value="cerrado">Cerrado</option>
                                                    </select>
                                                </div>
                                                {/* Notify row */}
                                                <div className="sm:col-span-2 pt-1 flex flex-wrap items-center gap-2">
                                                    {item.responsible_phone && (
                                                        <button onClick={() => handleNotify("whatsapp")} disabled={isClosed}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg text-xs font-semibold hover:bg-green-500/20 transition-colors disabled:opacity-50 cursor-pointer">
                                                            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                                                        </button>
                                                    )}
                                                    {item.responsible_email && (
                                                        <button onClick={() => handleNotify("email")} disabled={isClosed}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-semibold hover:bg-blue-500/20 transition-colors disabled:opacity-50 cursor-pointer">
                                                            <Mail className="w-3.5 h-3.5" /> Email
                                                        </button>
                                                    )}
                                                    {!hasContact && !isClosed && (
                                                        <span className="text-[#334155] text-xs italic">Agrega teléfono o email para notificar</span>
                                                    )}
                                                    {isNotified && (
                                                        <span className="flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                            Notificado vía {item.notified_via === "whatsapp" ? "WhatsApp" : "Email"} · {new Date(item.notified_at!).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                                        </span>
                                                    )}
                                                    {item.token && (
                                                        <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/acciones/${item.token}`)}
                                                            className="flex items-center gap-1 text-[#64748B] hover:text-white text-xs transition-colors cursor-pointer ml-auto">
                                                            <Copy className="w-3 h-3" /> Copiar link
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {!isClosed && (
                                    <button onClick={addAction} className={`flex items-center gap-2 px-4 py-2 ${isLight ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-[#1E2A3B] text-[#94A3B8] hover:text-white"} rounded-xl text-sm font-semibold transition-colors mt-2 cursor-pointer`}>
                                        <Plus className="w-4 h-4" /> Agregar acción
                                    </button>
                                )}
                            </div>
                            <div className={`${s.cardBg} rounded-2xl p-4 sm:p-6`}>
                                <SectionTitle icon={ChevronRight} isLight={isLight}>Conclusiones</SectionTitle>
                                <FTextarea value={conclusions} onChange={(v) => { setConclusions(v); scheduleSave(); }}
                                    placeholder="Resumen de causas determinadas, lecciones aprendidas y compromisos de la empresa..." rows={5} disabled={isClosed} />
                            </div>
                            {/* Close */}
                            {!isClosed ? (
                                <div className={`${isLight ? "bg-red-50/50 border-red-200" : "bg-[#141824] border-red-500/20"} border rounded-2xl p-4 sm:p-6`}>
                                    <h3 className={`${s.textTitle} font-semibold text-sm mb-1`}>Cierre de la Investigación</h3>
                                    <p className="text-[#64748B] text-xs mb-4">Al cerrar, el evento queda como <strong className="text-white">"Investigado"</strong> y se bloquea la edición.</p>
                                    <button onClick={handleClose} disabled={closing || actionPlan.length === 0}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                        {closing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                        Cerrar Investigación
                                    </button>
                                    {actionPlan.length === 0 && <p className="text-amber-400 text-xs mt-2">⚠ Define al menos una acción correctiva antes de cerrar.</p>}
                                </div>
                            ) : (
                                <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-4 sm:p-6 flex items-center gap-3">
                                    <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                                    <div>
                                        <p className="text-emerald-400 font-semibold">Investigación cerrada</p>
                                        <p className="text-emerald-400/60 text-xs">El evento fue marcado como "Investigado".</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 4: COSTOS DEL EVENTO */}
                    {activeTab === 3 && (() => {
                        const totalDirectos = (eventCost.costo_atencion_medica ?? 0) + (eventCost.costo_incapacidad_salario ?? 0) + (eventCost.costo_indemnizacion ?? 0) + (eventCost.costo_rehabilitacion ?? 0) + (eventCost.costo_danos_propiedad ?? 0) + (eventCost.costo_directo_otro ?? 0);
                        const totalIndirectos = (eventCost.costo_tiempo_perdido_accidentado ?? 0) + (eventCost.costo_tiempo_perdido_companeros ?? 0) + (eventCost.costo_tiempo_perdido_jefes ?? 0) + (eventCost.costo_investigacion ?? 0) + (eventCost.costo_reemplazo_contratacion ?? 0) + (eventCost.costo_entrenamiento_reemplazo ?? 0) + (eventCost.costo_horas_extra ?? 0) + (eventCost.costo_perdida_productividad ?? 0) + (eventCost.costo_danos_materiales_equipos ?? 0) + (eventCost.costo_sanciones_multas ?? 0) + (eventCost.costo_indirecto_otro ?? 0);
                        const totalGeneral = totalDirectos + totalIndirectos;
                        const ratio = totalDirectos > 0 ? totalIndirectos / totalDirectos : 0;
                        const heinrichEstimado = totalDirectos * 4;

                        const numInput = (field: keyof EventCost, label: string, tooltip: string) => (
                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                    <label className={`text-xs font-semibold ${isLight ? "text-gray-500" : "text-[#94A3B8]"}`}>{label}</label>
                                    <span title={tooltip} className="cursor-help">
                                        <Info className="w-3 h-3 text-[#475569]" />
                                    </span>
                                </div>
                                <div className="relative">
                                    <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold ${isLight ? "text-gray-400" : "text-[#475569]"}`}>$</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1000"
                                        value={eventCost[field] as number ?? 0}
                                        disabled={isClosed}
                                        onChange={(e) => updCost(field, parseFloat(e.target.value) || 0)}
                                        className={`w-full pl-6 pr-3 py-2 rounded-xl text-sm font-semibold border focus:outline-none focus:border-[#F59E0B]/50 transition-colors disabled:opacity-50 ${
                                            isLight ? "bg-gray-50 border-gray-200 text-[#1E293B]" : "bg-[#0F1420] border-[#1E2A3B] text-white"
                                        }`}
                                    />
                                </div>
                            </div>
                        );

                        return (
                            <div className="space-y-5">
                                {/* HEADER */}
                                <div className={`${s.cardBg} rounded-2xl p-4 sm:p-5`}>
                                    <div className="flex items-start justify-between flex-wrap gap-3">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <DollarSign className="w-4 h-4 text-[#F59E0B]" />
                                                <h3 className={`${s.textTitle} font-bold text-sm`}>Costos del Evento</h3>
                                                {costSaving && <Loader2 className="w-3.5 h-3.5 text-[#F59E0B] animate-spin" />}
                                                {costSaved && !costSaving && <span className="text-emerald-400 text-xs font-semibold">Guardado ✓</span>}
                                            </div>
                                            <p className="text-[#64748B] text-[10px] font-semibold">
                                                Modelo del Iceberg — Guía RUC® CCS Numeral 4.1 | Dec. 1072/2015 Art. 2.2.4.6.31
                                            </p>
                                        </div>
                                        {!isClosed && (
                                            <button onClick={() => saveCosts(true)} disabled={costSaving}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F59E0B] text-black text-xs font-bold rounded-xl hover:bg-amber-400 transition-colors cursor-pointer disabled:opacity-60">
                                                <Save className="w-3 h-3" /> Guardar
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* SECCIÓN 1 — COSTOS DIRECTOS */}
                                <div className={`${s.cardBg} rounded-2xl p-4 sm:p-5 border-l-4 border-blue-500`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-lg">🔵</span>
                                        <h4 className={`${s.textTitle} font-bold text-sm`}>COSTOS DIRECTOS</h4>
                                    </div>
                                    <p className={`text-xs mb-4 ${isLight ? "text-blue-600" : "text-blue-400"}`}>
                                        Costos visibles — cubiertos parcialmente por la ARL
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {numInput("costo_atencion_medica", "Atención médica y hospitalaria", "Gastos médicos, urgencias, hospitalización no cubiertos por ARL")}
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1.5">
                                                <label className={`text-xs font-semibold ${isLight ? "text-gray-500" : "text-[#94A3B8]"}`}>Salario durante incapacidad</label>
                                                <span title="Días × salario diario del trabajador durante la incapacidad" className="cursor-help">
                                                    <Info className="w-3 h-3 text-[#475569]" />
                                                </span>
                                                {(incident?.disability_days ?? 0) > 0 && (
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${isLight ? "bg-blue-50 text-blue-600" : "bg-blue-900/30 text-blue-400"}`}>
                                                        Sugerido: {incident?.disability_days} días
                                                    </span>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold ${isLight ? "text-gray-400" : "text-[#475569]"}`}>$</span>
                                                <input type="number" min="0" step="1000"
                                                    value={eventCost.costo_incapacidad_salario ?? 0}
                                                    disabled={isClosed}
                                                    onChange={(e) => updCost("costo_incapacidad_salario", parseFloat(e.target.value) || 0)}
                                                    className={`w-full pl-6 pr-3 py-2 rounded-xl text-sm font-semibold border focus:outline-none focus:border-[#F59E0B]/50 transition-colors disabled:opacity-50 ${
                                                        isLight ? "bg-gray-50 border-gray-200 text-[#1E293B]" : "bg-[#0F1420] border-[#1E2A3B] text-white"
                                                    }`} />
                                            </div>
                                        </div>
                                        {numInput("costo_indemnizacion", "Indemnización", "Pagos por IPP, invalidez o muerte según tabla legal")}
                                        {numInput("costo_rehabilitacion", "Rehabilitación", "Fisioterapia, terapia ocupacional, adaptaciones")}
                                        {numInput("costo_danos_propiedad", "Daños a la propiedad", "Reparación o reemplazo de equipos, instalaciones, vehículos")}
                                        {numInput("costo_directo_otro", "Otros costos directos", "Cualquier otro costo directo no listado")}
                                        <div className="sm:col-span-2 space-y-1">
                                            <label className={`text-xs font-semibold ${isLight ? "text-gray-500" : "text-[#94A3B8]"}`}>Descripción de otros costos directos</label>
                                            <textarea rows={2} value={eventCost.costo_directo_descripcion ?? ""} disabled={isClosed}
                                                onChange={(e) => updCost("costo_directo_descripcion", e.target.value)}
                                                placeholder="Detalle los otros costos directos..."
                                                className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-[#F59E0B]/50 transition-colors resize-none disabled:opacity-50 ${
                                                    isLight ? "bg-gray-50 border-gray-200 text-[#1E293B] placeholder:text-gray-400" : "bg-[#0F1420] border-[#1E2A3B] text-white placeholder:text-[#334155]"
                                                }`} />
                                        </div>
                                    </div>
                                    <div className={`mt-4 pt-3 border-t ${isLight ? "border-blue-100" : "border-blue-900/30"} flex items-center justify-between`}>
                                        <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-blue-600" : "text-blue-400"}`}>Subtotal Directos</span>
                                        <span className={`text-base font-black ${isLight ? "text-blue-700" : "text-blue-300"}`}>{formatCOP(totalDirectos)}</span>
                                    </div>
                                </div>

                                {/* SECCIÓN 2 — COSTOS INDIRECTOS */}
                                <div className={`${s.cardBg} rounded-2xl p-4 sm:p-5 border-l-4 border-red-500`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-lg">🔴</span>
                                        <h4 className={`${s.textTitle} font-bold text-sm`}>COSTOS INDIRECTOS</h4>
                                    </div>
                                    <p className={`text-xs mb-4 ${isLight ? "text-red-600" : "text-red-400"}`}>
                                        Costos ocultos — asumidos íntegramente por la empresa. Según Heinrich: 4× los costos directos.
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {numInput("costo_tiempo_perdido_accidentado", "Tiempo perdido — accidentado", "Horas improductivas el día del accidente antes de la incapacidad")}
                                        {numInput("costo_tiempo_perdido_companeros", "Tiempo perdido — compañeros", "Tiempo que otros trabajadores dejaron de producir por atender el evento")}
                                        {numInput("costo_tiempo_perdido_jefes", "Tiempo perdido — supervisores/jefes", "Tiempo de supervisores gestionando el evento")}
                                        {numInput("costo_investigacion", "Investigación del accidente", "Horas del profesional SST, COPASST y otros en la investigación")}
                                        {numInput("costo_reemplazo_contratacion", "Reemplazo y contratación", "Costos de buscar y contratar un reemplazo temporal o definitivo")}
                                        {numInput("costo_entrenamiento_reemplazo", "Entrenamiento del reemplazo", "Capacitación del trabajador sustituto hasta alcanzar productividad")}
                                        {numInput("costo_horas_extra", "Horas extra", "Pago de horas extra para compensar la pérdida de producción")}
                                        {numInput("costo_perdida_productividad", "Pérdida de productividad", "Reducción de rendimiento del equipo durante el período de recuperación")}
                                        {numInput("costo_danos_materiales_equipos", "Daños a materiales y equipos", "Pérdidas en materiales, producto en proceso o terminado")}
                                        {numInput("costo_sanciones_multas", "Sanciones y multas", "Multas del Ministerio del Trabajo u otras autoridades")}
                                        {numInput("costo_indirecto_otro", "Otros costos indirectos", "Cualquier otro costo indirecto no listado")}
                                        <div className="sm:col-span-2 space-y-1">
                                            <label className={`text-xs font-semibold ${isLight ? "text-gray-500" : "text-[#94A3B8]"}`}>Descripción de otros costos indirectos</label>
                                            <textarea rows={2} value={eventCost.costo_indirecto_descripcion ?? ""} disabled={isClosed}
                                                onChange={(e) => updCost("costo_indirecto_descripcion", e.target.value)}
                                                placeholder="Detalle los otros costos indirectos..."
                                                className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-[#F59E0B]/50 transition-colors resize-none disabled:opacity-50 ${
                                                    isLight ? "bg-gray-50 border-gray-200 text-[#1E293B] placeholder:text-gray-400" : "bg-[#0F1420] border-[#1E2A3B] text-white placeholder:text-[#334155]"
                                                }`} />
                                        </div>
                                    </div>
                                    <div className={`mt-4 pt-3 border-t ${isLight ? "border-red-100" : "border-red-900/30"} flex items-center justify-between`}>
                                        <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-red-600" : "text-red-400"}`}>Subtotal Indirectos</span>
                                        <span className={`text-base font-black ${isLight ? "text-red-700" : "text-red-300"}`}>{formatCOP(totalIndirectos)}</span>
                                    </div>
                                </div>

                                {/* SECCIÓN 3 — RESUMEN DEL ICEBERG */}
                                <div className={`${isLight ? "bg-gradient-to-br from-slate-50 to-gray-50 border-gray-200" : "bg-gradient-to-br from-[#141824] to-[#0F1420] border-[#1E2A3B]"} border rounded-2xl p-4 sm:p-6`}>
                                    <div className="flex items-center gap-2 mb-4">
                                        <DollarSign className="w-4 h-4 text-[#F59E0B]" />
                                        <h4 className={`${s.textTitle} font-bold text-sm uppercase tracking-wider`}>Resumen — Iceberg de Costos</h4>
                                    </div>

                                    {/* Summary table */}
                                    <div className={`rounded-xl border ${isLight ? "border-gray-200 bg-white" : "border-[#1E2A3B] bg-[#0A0F1A]"} overflow-hidden mb-4`}>
                                        <div className={`flex items-center justify-between px-4 py-3 border-b ${isLight ? "border-gray-100 bg-blue-50/50" : "border-[#1E2A3B] bg-blue-900/10"}`}>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                                <span className={`text-xs font-semibold ${isLight ? "text-gray-600" : "text-[#94A3B8]"}`}>Costos Directos</span>
                                            </div>
                                            <span className={`text-sm font-black ${isLight ? "text-blue-700" : "text-blue-300"}`}>{formatCOP(totalDirectos)}</span>
                                        </div>
                                        <div className={`flex items-center justify-between px-4 py-3 border-b ${isLight ? "border-gray-100 bg-red-50/50" : "border-[#1E2A3B] bg-red-900/10"}`}>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                                <span className={`text-xs font-semibold ${isLight ? "text-gray-600" : "text-[#94A3B8]"}`}>Costos Indirectos</span>
                                            </div>
                                            <span className={`text-sm font-black ${isLight ? "text-red-700" : "text-red-300"}`}>{formatCOP(totalIndirectos)}</span>
                                        </div>
                                        <div className={`flex items-center justify-between px-4 py-3 ${isLight ? "bg-gray-50" : "bg-[#141824]"}`}>
                                            <span className={`text-xs font-black uppercase tracking-wider ${s.textTitle}`}>TOTAL DEL EVENTO</span>
                                            <span className={`text-lg font-black text-[#F59E0B]`}>{formatCOP(totalGeneral)}</span>
                                        </div>
                                    </div>

                                    {/* Ratio Heinrich */}
                                    {totalDirectos > 0 && (
                                        <div className={`rounded-xl p-3 mb-3 flex items-start gap-3 ${
                                            ratio >= 4
                                                ? (isLight ? "bg-emerald-50 border border-emerald-200" : "bg-emerald-900/10 border border-emerald-700/30")
                                                : (isLight ? "bg-amber-50 border border-amber-200" : "bg-amber-900/10 border border-amber-700/30")
                                        }`}>
                                            <span className="text-xl flex-shrink-0">{ratio >= 4 ? "✅" : "⚠️"}</span>
                                            <div>
                                                <p className={`text-xs font-bold ${
                                                    ratio >= 4 ? (isLight ? "text-emerald-700" : "text-emerald-400") : (isLight ? "text-amber-700" : "text-amber-400")
                                                }`}>
                                                    Relación Indirectos/Directos: <span className="text-base">{ratio.toFixed(1)}x</span>
                                                </p>
                                                <p className={`text-[11px] mt-0.5 ${
                                                    ratio >= 4 ? (isLight ? "text-emerald-600" : "text-emerald-500") : (isLight ? "text-amber-600" : "text-amber-500")
                                                }`}>
                                                    {ratio >= 4
                                                        ? "Relación esperada según modelo Heinrich"
                                                        : "Por debajo del promedio Heinrich — verifica que estén todos los costos indirectos"}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Estimación Heinrich si indirectos = 0 */}
                                    {totalDirectos > 0 && totalIndirectos === 0 && (
                                        <div className={`rounded-xl p-3 flex items-start gap-3 ${isLight ? "bg-blue-50 border border-blue-200" : "bg-blue-900/10 border border-blue-700/30"}`}>
                                            <Info className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isLight ? "text-blue-600" : "text-blue-400"}`} />
                                            <div>
                                                <p className={`text-xs font-bold ${isLight ? "text-blue-700" : "text-blue-300"}`}>
                                                    Estimado costos indirectos (Heinrich 4×): {formatCOP(heinrichEstimado)}
                                                </p>
                                                <p className={`text-[11px] mt-0.5 ${isLight ? "text-blue-500" : "text-blue-500"}`}>
                                                    Estimación teórica — diligencia los costos reales para mayor precisión
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {totalGeneral === 0 && (
                                        <p className={`text-center text-xs py-2 ${isLight ? "text-gray-400" : "text-[#475569]"}`}>
                                            Diligencia los campos para calcular el costo total del evento
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* TAB 5: LECCIÓN APRENDIDA */}
                    {activeTab === 4 && (
                        <div className="space-y-4">
                            {/* header info */}
                            <div className={`${s.cardBg} rounded-2xl p-4 sm:p-6`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <BookOpen className="w-4 h-4 text-[#F59E0B]" />
                                    <h3 className={`${s.textTitle} font-semibold text-sm`}>Lección Aprendida</h3>
                                </div>
                                <p className="text-[#64748B] text-xs">Este documento se adjuntará como última sección del PDF final de investigación.</p>
                            </div>

                            {/* ¿Qué ocurrió? */}
                            <div className={`${s.cardBg} rounded-2xl p-4 sm:p-6`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="w-6 h-6 rounded-full bg-amber-400 text-black text-xs font-black flex items-center justify-center flex-shrink-0">1</span>
                                    <FieldLabel isLight={isLight}>¿Qué ocurrió? — Resumen ejecutivo</FieldLabel>
                                </div>
                                <FTextarea rows={3} value={lessonsLearned.que_ocurrio} isLight={isLight}
                                    onChange={(v) => { setLessons(p => ({ ...p, que_ocurrio: v })); scheduleSave(); }}
                                    placeholder="Describe brevemente qué ocurrió en términos claros para cualquier trabajador..."
                                    disabled={isClosed} />
                            </div>

                            {/* ¿Por qué ocurrió? */}
                            <div className={`${s.cardBg} rounded-2xl p-4 sm:p-6`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="w-6 h-6 rounded-full bg-amber-400 text-black text-xs font-black flex items-center justify-center flex-shrink-0">2</span>
                                    <FieldLabel isLight={isLight}>¿Por qué ocurrió? — Causa raíz en lenguaje simple</FieldLabel>
                                </div>
                                <FTextarea rows={3} value={lessonsLearned.por_que_ocurrio} isLight={isLight}
                                    onChange={(v) => { setLessons(p => ({ ...p, por_que_ocurrio: v })); scheduleSave(); }}
                                    placeholder="Explica la causa raíz de manera que cualquier persona lo entienda..."
                                    disabled={isClosed} />
                            </div>

                            {/* ¿Qué aprendimos? */}
                            <div className={`${s.cardBg} rounded-2xl p-4 sm:p-6`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="w-6 h-6 rounded-full bg-amber-400 text-black text-xs font-black flex items-center justify-center flex-shrink-0">3</span>
                                    <FieldLabel isLight={isLight}>¿Qué aprendimos?</FieldLabel>
                                </div>
                                <FTextarea rows={3} value={lessonsLearned.que_aprendimos} isLight={isLight}
                                    onChange={(v) => { setLessons(p => ({ ...p, que_aprendimos: v })); scheduleSave(); }}
                                    placeholder="Lecciones clave que deja este evento para el equipo y la organización..."
                                    disabled={isClosed} />
                            </div>

                            {/* ¿Cómo lo prevenimos? */}
                            <div className={`${s.cardBg} rounded-2xl p-4 sm:p-6`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="w-6 h-6 rounded-full bg-amber-400 text-black text-xs font-black flex items-center justify-center flex-shrink-0">4</span>
                                    <FieldLabel isLight={isLight}>¿Cómo lo prevenimos? — Medidas implementadas</FieldLabel>
                                </div>
                                <FTextarea rows={3} value={lessonsLearned.como_prevenimos} isLight={isLight}
                                    onChange={(v) => { setLessons(p => ({ ...p, como_prevenimos: v })); scheduleSave(); }}
                                    placeholder="Controles, procedimientos o cambios implementados para prevenir la recurrencia..."
                                    disabled={isClosed} />
                            </div>

                            {/* Evidencia fotográfica del cierre */}
                            <div className={`${s.cardBg} rounded-2xl p-4 sm:p-6`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="w-6 h-6 rounded-full bg-amber-400 text-black text-xs font-black flex items-center justify-center flex-shrink-0">5</span>
                                    <FieldLabel isLight={isLight}>Evidencia fotográfica del cierre</FieldLabel>
                                </div>
                                {lessonsLearned.foto_cierre ? (
                                    <div className="space-y-3">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={lessonsLearned.foto_cierre} alt="Evidencia" className="w-full max-h-64 object-cover rounded-xl border border-[#1E2A3B]" />
                                        {lessonsLearned.foto_timestamp && (
                                            <p className="text-[#64748B] text-xs">
                                                Capturada: {new Date(lessonsLearned.foto_timestamp).toLocaleString("es-CO")}
                                            </p>
                                        )}
                                        {!isClosed && (
                                            <button onClick={() => { setLessons(p => ({ ...p, foto_cierre: undefined, foto_lat: undefined, foto_lng: undefined, foto_timestamp: undefined })); scheduleSave(); }}
                                                className="text-xs text-red-400 hover:text-red-300 underline cursor-pointer">
                                                Quitar foto
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <label className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed ${isLight ? "border-gray-200" : "border-[#1E2A3B]"} rounded-xl p-8 w-full transition-colors ${isClosed ? "opacity-50 cursor-not-allowed" : "hover:border-amber-400/40 cursor-pointer"}`}>
                                        <div className="w-12 h-12 rounded-full bg-amber-400/10 flex items-center justify-center">
                                            <Image className="w-6 h-6 text-[#F59E0B]" />
                                        </div>
                                        <div className="text-center">
                                            <p className="${s.textTitle} text-sm font-semibold">Adjuntar foto de evidencia</p>
                                            <p className="text-[#64748B] text-xs mt-0.5">Toca para seleccionar desde cámara o galeria</p>
                                        </div>
                                        <input type="file" accept="image/*" capture="environment" disabled={isClosed} className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                const reader = new FileReader();
                                                reader.onload = (ev) => {
                                                    const base64 = ev.target?.result as string;
                                                    setLessons(p => ({ ...p, foto_cierre: base64, foto_timestamp: new Date().toISOString() }));
                                                    scheduleSave();
                                                };
                                                reader.readAsDataURL(file);
                                            }} />
                                    </label>
                                )}
                            </div>

                            {/* Fecha de divulgación */}
                            <div className={`${s.cardBg} rounded-2xl p-4 sm:p-6`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="w-6 h-6 rounded-full bg-amber-400 text-black text-xs font-black flex items-center justify-center flex-shrink-0">6</span>
                                    <FieldLabel isLight={isLight}>Fecha de divulgación al personal</FieldLabel>
                                </div>
                                <input type="date" value={lessonsLearned.fecha_divulgacion} disabled={isClosed}
                                    onChange={(e) => { setLessons(p => ({ ...p, fecha_divulgacion: e.target.value })); scheduleSave(); }}
                                    className={`w-full sm:w-64 ${isLight ? "bg-white border-gray-200 text-[#1E293B]" : "bg-[#0F1420] border-[#1E2A3B] text-white"} rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#F59E0B]/50 transition-colors disabled:opacity-50`} />
                                {lessonsLearned.fecha_divulgacion && (
                                    <p className="text-[#64748B] text-xs mt-2">
                                        Divulgado el {new Date(lessonsLearned.fecha_divulgacion + "T12:00:00").toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 6: FIRMAS */}
                    {activeTab === 5 && (
                        <div className="space-y-4">
                            <div className={`${s.cardBg} rounded-2xl p-4 sm:p-6`}>
                                <SectionTitle icon={PenLine} isLight={isLight}>Firmas Digitales</SectionTitle>
                                <p className="text-[#64748B] text-xs mb-5">
                                    Genera un enlace único por firmante. Se envía por WhatsApp o copias el link.
                                    El firmante firma desde su celular. Las firmas tienen validez de 72 horas.
                                </p>

                                <div className="space-y-4">
                                    {SIGNER_ROLES.map(({ role, label, short }) => {
                                        const existing = sigRequests.find((r) => r.signer_role === role && (r.status === "PENDING" || r.status === "SIGNED"));
                                        const isSigned = existing?.status === "SIGNED";
                                        const isLoading = genLoadingRole === role;

                                        return (
                                            <div key={role} className={`border rounded-2xl p-4 transition-colors ${isSigned ? "bg-emerald-400/5 border-emerald-400/20" : (isLight ? "bg-white border-gray-200" : "bg-[#0F1420] border-[#1E2A3B]")
                                                }`}>
                                                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                                                    <div>
                                                        <p className={`${s.textTitle} font-semibold text-sm`}>{label}</p>
                                                        {existing && <Countdown expiresAt={existing.expires_at} />}
                                                    </div>
                                                    {existing && <SigBadge status={existing.status} />}
                                                </div>

                                                {/* Name input */}
                                                {!isSigned && (
                                                    <div className="mb-3">
                                                        <FieldLabel isLight={isLight}>Nombre del firmante</FieldLabel>
                                                        <FInput isLight={isLight} value={signerNames[role]}
                                                            onChange={(v) => setSignerNames((n) => ({ ...n, [role]: v }))}
                                                            placeholder={`Nombre del ${short}`}
                                                        />
                                                    </div>
                                                )}

                                                {isSigned ? (
                                                    <div className="text-xs text-[#64748B] space-y-0.5">
                                                        {existing.signer_name && <p>Firmante: <span className="text-white">{existing.signer_name}</span></p>}
                                                        {existing.signed_at && <p>Firmado: <span className="text-white">{new Date(existing.signed_at).toLocaleString("es-CO")}</span></p>}
                                                        {existing.gps_lat && <p>GPS: <span className="text-white">{existing.gps_lat.toFixed(4)}, {existing.gps_lng?.toFixed(4)}</span></p>}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2">
                                                        <button onClick={() => generateSignatureLink(role)} disabled={isLoading}
                                                            className="flex items-center gap-1.5 px-3 py-2 bg-[#F59E0B] text-black text-xs font-bold rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-60 cursor-pointer">
                                                            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PenLine className="w-3.5 h-3.5" />}
                                                            {existing ? "Regenerar enlace" : "Generar enlace"}
                                                        </button>

                                                        {existing && (
                                                            <>
                                                                <button onClick={() => copyLink(existing.token, existing.id)}
                                                                    className={`flex items-center gap-1.5 px-3 py-2 ${isLight ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-[#1E2A3B] text-[#94A3B8] hover:text-white"} text-xs font-semibold rounded-lg transition-colors cursor-pointer`}>
                                                                    {copiedId === existing.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                                                    {copiedId === existing.id ? "¡Copiado!" : "Copiar enlace"}
                                                                </button>
                                                                <a href={whatsappLink(existing.token, label)} target="_blank" rel="noopener noreferrer"
                                                                    className="flex items-center gap-1.5 px-3 py-2 bg-[#25D366]/15 text-[#25D366] border border-[#25D366]/25 text-xs font-semibold rounded-lg hover:bg-[#25D366]/25 transition-colors cursor-pointer">
                                                                    <Share2 className="w-3.5 h-3.5" />
                                                                    WhatsApp
                                                                </a>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* PDF Final */}
                            <div className={`border rounded-2xl p-4 sm:p-6 ${allSigned ? (isLight ? "bg-white border-gray-200" : "bg-[#141824] border-[#1E2A3B]") : (isLight ? "bg-gray-100 border-gray-200 opacity-60" : "bg-[#0F1420] border-[#1E2A3B] opacity-60")}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText className="w-4 h-4 text-[#F59E0B]" />
                                    <h3 className={`${s.textTitle} font-semibold text-sm`}>PDF Final de Investigación</h3>
                                </div>
                                <p className="text-[#64748B] text-xs mb-4">
                                    {allSigned
                                        ? "Las 3 firmas están completas. Puedes generar el PDF final."
                                        : `Faltan ${3 - sigRequests.filter((r) => r.status === "SIGNED").length} firma(s) para habilitar el PDF.`}
                                </p>
                                <button
                                    disabled={!allSigned}
                                    onClick={() => alert("PDF generation coming — implement with @react-pdf/renderer")}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-[#F59E0B] text-black font-bold rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                                    <FileText className="w-4 h-4" />
                                    Generar PDF Final
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
            </div>
        </div>
    );
}
