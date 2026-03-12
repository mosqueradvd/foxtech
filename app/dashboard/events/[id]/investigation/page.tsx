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
    Car, TriangleAlert
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
} from "@/lib/supabase";

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS = [
    { id: 0, label: "Equipo", icon: Users },
    { id: 1, label: "Causas", icon: Zap },
    { id: 2, label: "Acciones", icon: ClipboardList },
    { id: 3, label: "Firmas", icon: PenLine },
] as const;

const SIGNER_ROLES: { role: SignerRole; label: string; short: string }[] = [
    { role: "COPASST", label: "Representante COPASST", short: "COPASST" },
    { role: "SUPERVISOR", label: "Jefe Inmediato / Supervisor", short: "Supervisor" },
    { role: "SST_PROFESSIONAL", label: "Profesional SST con Licencia", short: "SST" },
];

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    en_proceso: { label: "En Proceso", color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/25" },
    plan_accion_definido: { label: "Plan Definido", color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/25" },
    en_seguimiento: { label: "En Seguimiento", color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/25" },
    cerrado: { label: "Cerrado", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/25" },
};

// ── Reusable field components ─────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
    return <label className="block text-[#94A3B8] text-xs font-semibold uppercase tracking-wider mb-1.5">{children}</label>;
}

function FInput({ value, onChange, placeholder, disabled }: {
    value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean;
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
            className="w-full bg-[#0F1420] border border-[#1E2A3B] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#F59E0B]/50 transition-colors placeholder:text-[#334155] disabled:opacity-50"
        />
    );
}

function FTextarea({ value, onChange, placeholder, rows = 4, disabled }: {
    value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; disabled?: boolean;
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
            className="w-full bg-[#0F1420] border border-[#1E2A3B] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#F59E0B]/50 transition-colors placeholder:text-[#334155] resize-none disabled:opacity-50"
        />
    );
}

function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2 mb-4">
            <Icon className="w-4 h-4 text-[#F59E0B]" />
            <h3 className="text-white font-semibold text-sm">{children}</h3>
        </div>
    );
}

// ── NTC 3701 cause selector components ────────────────────────────────────────

function CauseCheckbox({ code, label, checked, onChange, disabled }: {
    code: string; label: string; checked: boolean;
    onChange: (v: boolean) => void; disabled?: boolean;
}) {
    const id = `cause-${code}`;
    return (
        <label htmlFor={id} className={`flex items-start gap-2.5 py-1.5 px-2 rounded-lg cursor-pointer transition-colors ${
            checked ? "bg-amber-400/8 border border-amber-400/20" : "hover:bg-white/3 border border-transparent"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
            <input id={id} type="checkbox" checked={checked} disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
                className="mt-0.5 w-3.5 h-3.5 accent-amber-400 flex-shrink-0 cursor-pointer" />
            <span className="text-xs leading-relaxed">
                <span className="text-amber-400/80 font-mono font-bold mr-1">{code}</span>
                <span className="text-[#CBD5E1]">{label}</span>
            </span>
        </label>
    );
}

function SubCategoryAccordion({ category, selected, onToggle, disabled }: {
    category: CauseCategory;
    selected: string[];
    onToggle: (key: string) => void;
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const selectedCount = category.causes.filter(c => selected.includes(`${c.code} ${c.label}`)).length;
    return (
        <div className="border border-[#1E2A3B] rounded-xl overflow-hidden mb-2">
            <button onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-[#0F1420] hover:bg-white/3 transition-colors cursor-pointer">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-amber-400/70 font-mono text-[11px] font-bold flex-shrink-0">{category.code}</span>
                    <span className="text-[#94A3B8] text-xs font-semibold truncate text-left">{category.label}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {selectedCount > 0 && (
                        <span className="bg-amber-400 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">{selectedCount}</span>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 text-[#64748B] transition-transform ${open ? "rotate-180" : ""}`} />
                </div>
            </button>
            {open && (
                <div className="px-3 py-2 bg-[#0A0F1A] space-y-0.5">
                    {category.causes.map(c => {
                        const key = `${c.code} ${c.label}`;
                        return (
                            <CauseCheckbox key={c.code} code={c.code} label={c.label}
                                checked={selected.includes(key)}
                                onChange={() => onToggle(key)}
                                disabled={disabled} />
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function CausesAccordion({ title, norm, count, defaultOpen, children }: {
    title: string; norm: string; count: number; defaultOpen?: boolean; children: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen ?? false);
    return (
        <div className="bg-[#141824] border border-[#1E2A3B] rounded-2xl overflow-hidden">
            <button onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-white/2 transition-colors cursor-pointer">
                <div className="flex flex-col items-start gap-0.5">
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-[#F59E0B]" />
                        <span className="text-white font-semibold text-sm">{title}</span>
                        {count > 0 && (
                            <span className="bg-amber-400 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {count} seleccionada{count !== 1 ? "s" : ""}
                            </span>
                        )}
                    </div>
                    <span className="text-[#475569] text-[10px] ml-6">{norm}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-[#64748B] transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} />
            </button>
            {open && <div className="px-4 sm:px-6 pb-5">{children}</div>}
        </div>
    );
}

// ── Signature status badge ────────────────────────────────────────────────────

function SigBadge({ status }: { status: string }) {
    const cfg: Record<string, { label: string; cls: string }> = {
        PENDING: { label: "Pendiente", cls: "bg-amber-400/10 text-amber-400 border-amber-400/25" },
        SIGNED: { label: "Firmado ✓", cls: "bg-emerald-400/10 text-emerald-400 border-emerald-400/25" },
        EXPIRED: { label: "Expirado", cls: "bg-red-400/10 text-red-400 border-red-400/25" },
    };
    const c = cfg[status] ?? cfg.PENDING;
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${c.cls}`}>
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

    // Form state
    const [team, setTeam] = useState({ sst: "", jefe: "", copasst: "", extra: "" });
    const [narrative, setNarrative] = useState("");
    const [causesSelected, setCausesSelected] = useState<CausesSelected>(DEFAULT_CAUSES_SELECTED);
    const [involucraVehiculo, setInvolucraVehiculo] = useState(false);
    const [controlFails, setControlFails] = useState("");
    const [actionPlan, setActionPlan] = useState<ActionItem[]>([]);
    const [conclusions, setConclusions] = useState("");
    const [signerNames, setSignerNames] = useState<Record<SignerRole, string>>({
        COPASST: "", SUPERVISOR: "", SST_PROFESSIONAL: "",
    });

    const isClosed = investigation?.status === "cerrado";
    const allSigned = sigRequests.length === 3 && sigRequests.every((r) => r.status === "SIGNED");

    // ── Load ────────────────────────────────────────────────────────────────
    const load = useCallback(async () => {
        setLoading(true);
        const [{ data: ev }, { data: invs }] = await Promise.all([
            supabase.from("incidents").select("*").eq("id", incidentId).maybeSingle(),
            supabase.from("investigations").select("*").eq("incident_id", incidentId).maybeSingle(),
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
            // Load existing signature requests
            const { data: sigs } = await supabase.from("signature_requests").select("*").eq("investigation_id", inv.id);
            if (sigs) {
                setSigReqs(sigs as SignatureRequest[]);
                const names: Record<SignerRole, string> = { COPASST: "", SUPERVISOR: "", SST_PROFESSIONAL: "" };
                sigs.forEach((s) => { if (s.signer_name) names[s.signer_role as SignerRole] = s.signer_name; });
                setSignerNames(names);
            }
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
                team, narrative, causesSelected, controlFails, actionPlan, conclusions,
            }));
        } catch { /* quota exceeded ignored */ }
    }, [investigation?.id, team, narrative, causesSelected, controlFails, actionPlan, conclusions]);

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
            status: newStatus,
            updated_at: new Date().toISOString(),
        }).eq("id", investigation.id);
        setInv((prev) => prev ? { ...prev, status: newStatus } : prev);
        persistLocal();
        if (showFeedback) { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    }, [investigation, isClosed, team, narrative, causesSelected, involucraVehiculo, controlFails, actionPlan, conclusions, persistLocal]);

    const scheduleSave = useCallback(() => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => save(false), 3000);
    }, [save]);

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
        <div className="min-h-screen bg-[#0F1420] flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-[#F59E0B] animate-spin" />
        </div>
    );

    const statusCfg = STATUS_LABELS[investigation?.status ?? "en_proceso"];

    return (
        <div className="min-h-screen bg-[#0F1420]" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* HEADER */}
            <header className="bg-[#141824] border-b border-[#1E2A3B] px-4 sm:px-6 py-4 flex items-center gap-3 sm:gap-4 sticky top-0 z-30">
                <button onClick={() => router.push(`/dashboard/events/${incidentId}`)} className="p-2 rounded-lg text-[#64748B] hover:text-white hover:bg-white/5 transition-all flex-shrink-0 cursor-pointer">
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-white font-bold text-sm sm:text-base leading-none">INVESTIGACIÓN</h1>
                        {investigation && (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${statusCfg.bg} ${statusCfg.color}`}>
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
                            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-[#1E2A3B] text-[#94A3B8] hover:text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer">
                            <Save className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Guardar</span>
                        </button>
                    )}
                    {isClosed && <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                </div>
            </header>

            {/* INCIDENT STRIP */}
            {incident && (
                <div className="bg-[#141824]/60 border-b border-[#1E2A3B] px-4 sm:px-6 py-2 flex items-center gap-4 text-xs text-[#64748B] flex-wrap">
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
                    <div className="flex gap-1 bg-[#141824] border border-[#1E2A3B] rounded-2xl p-1 mb-6">
                        {TABS.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                    className={["flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer",
                                        activeTab === tab.id ? "bg-[#F59E0B] text-black" : "text-[#64748B] hover:text-white"].join(" ")}>
                                    <Icon className="w-4 h-4 flex-shrink-0" />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* TAB 1: EQUIPO & NARRATIVA */}
                    {activeTab === 0 && (
                        <div className="space-y-6">
                            <div className="bg-[#141824] border border-[#1E2A3B] rounded-2xl p-4 sm:p-6">
                                <SectionTitle icon={Users}>Equipo Investigador</SectionTitle>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <FieldLabel>Responsable SST *</FieldLabel>
                                        <FInput value={team.sst} onChange={(v) => { setTeam((t) => ({ ...t, sst: v })); scheduleSave(); }} placeholder="Nombre del profesional SST" disabled={isClosed} />
                                    </div>
                                    <div>
                                        <FieldLabel>Jefe Inmediato *</FieldLabel>
                                        <FInput value={team.jefe} onChange={(v) => { setTeam((t) => ({ ...t, jefe: v })); scheduleSave(); }} placeholder="Nombre del jefe inmediato" disabled={isClosed} />
                                    </div>
                                    <div>
                                        <FieldLabel>Representante COPASST *</FieldLabel>
                                        <FInput value={team.copasst} onChange={(v) => { setTeam((t) => ({ ...t, copasst: v })); scheduleSave(); }} placeholder="Nombre del representante" disabled={isClosed} />
                                    </div>
                                    <div>
                                        <FieldLabel>Otros participantes</FieldLabel>
                                        <FInput value={team.extra} onChange={(v) => { setTeam((t) => ({ ...t, extra: v })); scheduleSave(); }} placeholder="Otros investigadores" disabled={isClosed} />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-[#141824] border border-[#1E2A3B] rounded-2xl p-4 sm:p-6">
                                <SectionTitle icon={AlertTriangle}>Narrativa Ampliada del Evento</SectionTitle>
                                <p className="text-[#64748B] text-xs mb-3">Describe qué ocurrió, en qué secuencia, y cuáles fueron las circunstancias. Es el sustento de las causas.</p>
                                <FTextarea value={narrative} onChange={(v) => { setNarrative(v); scheduleSave(); }}
                                    placeholder="El día [fecha] a las [hora], el trabajador [nombre] se encontraba [actividad] cuando..." rows={8} disabled={isClosed} />
                            </div>
                        </div>
                    )}

                    {/* TAB 2: CAUSAS */}
                    {activeTab === 1 && (
                        <div className="space-y-4">
                            {/* Vehicle toggle */}
                            <div className="bg-[#141824] border border-[#1E2A3B] rounded-2xl px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <Car className="w-4 h-4 text-blue-400" />
                                    <span className="text-white text-sm font-semibold">¿El evento involucró un vehículo?</span>
                                </div>
                                <button disabled={isClosed}
                                    onClick={() => { setInvolucraVehiculo((v: boolean) => !v); scheduleSave(); }}
                                    className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 ${involucraVehiculo ? "bg-blue-500" : "bg-[#1E2A3B]"} ${isClosed ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                                    <span className={`inline-block w-4 h-4 mt-1 rounded-full bg-white shadow transition-transform duration-200 ${involucraVehiculo ? "translate-x-6" : "translate-x-1"}`} />
                                </button>
                            </div>

                            {/* §5.2 — Causas Inmediatas */}
                            <CausesAccordion title="§5.2 — Causas Inmediatas" norm="NTC 3701"
                                count={causesSelected.inmediatas.condiciones.length + causesSelected.inmediatas.actos.length}
                                defaultOpen={true}>
                                <p className="text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-2 mt-1">A — Condiciones Ambientales Subestándar</p>
                                {CONDICIONES_SUBESTANDAR.map(cat => (
                                    <SubCategoryAccordion key={cat.code} category={cat}
                                        selected={causesSelected.inmediatas.condiciones}
                                        onToggle={(key) => toggleCause("inmediatas", "condiciones", key)}
                                        disabled={isClosed} />
                                ))}
                                <p className="text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-2 mt-4">B — Actos Subestándar</p>
                                {ACTOS_SUBESTANDAR.map(cat => (
                                    <SubCategoryAccordion key={cat.code} category={cat}
                                        selected={causesSelected.inmediatas.actos}
                                        onToggle={(key) => toggleCause("inmediatas", "actos", key)}
                                        disabled={isClosed} />
                                ))}
                                <div className="mt-4">
                                    <FieldLabel>Otra causa inmediata no listada</FieldLabel>
                                    <FTextarea rows={2} value={causesSelected.inmediatas.otra}
                                        onChange={(v) => { setCausesSelected(p => ({ ...p, inmediatas: { ...p.inmediatas, otra: v } })); scheduleSave(); }}
                                        placeholder="Describe si hay otra causa no listada..." disabled={isClosed} />
                                </div>
                            </CausesAccordion>

                            {/* §5.3 — Causas Básicas */}
                            <CausesAccordion title="§5.3 — Causas Básicas" norm="NTC 3701"
                                count={causesSelected.basicas.factores_personales.length + causesSelected.basicas.factores_trabajo.length}>
                                <p className="text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-2 mt-1">A — Factores Personales</p>
                                {FACTORES_PERSONALES.map(cat => (
                                    <SubCategoryAccordion key={cat.code} category={cat}
                                        selected={causesSelected.basicas.factores_personales}
                                        onToggle={(key) => toggleCause("basicas", "factores_personales", key)}
                                        disabled={isClosed} />
                                ))}
                                <p className="text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-2 mt-4">B — Factores del Trabajo</p>
                                {FACTORES_TRABAJO.map(cat => (
                                    <SubCategoryAccordion key={cat.code} category={cat}
                                        selected={causesSelected.basicas.factores_trabajo}
                                        onToggle={(key) => toggleCause("basicas", "factores_trabajo", key)}
                                        disabled={isClosed} />
                                ))}
                                <div className="mt-4">
                                    <FieldLabel>Otra causa básica no listada</FieldLabel>
                                    <FTextarea rows={2} value={causesSelected.basicas.otra}
                                        onChange={(v) => { setCausesSelected(p => ({ ...p, basicas: { ...p.basicas, otra: v } })); scheduleSave(); }}
                                        placeholder="Describe si hay otra causa no listada..." disabled={isClosed} />
                                </div>
                            </CausesAccordion>

                            {/* §5.4 — Fallas en Control Administrativo (unchanged — free text) */}
                            <div className="bg-[#141824] border border-[#1E2A3B] rounded-2xl p-4 sm:p-6">
                                <SectionTitle icon={AlertTriangle}>Fallas en el Control Administrativo (§5.4)</SectionTitle>
                                <FTextarea value={controlFails} onChange={(v) => { setControlFails(v); scheduleSave(); }}
                                    placeholder="Deficiencias del sistema de gestión que permitieron que las causas básicas existieran..." rows={4} disabled={isClosed} />
                            </div>

                            {/* §5.5 — Factores PESV (conditional on vehicle toggle) */}
                            {involucraVehiculo && (
                                <CausesAccordion title="§5.5 — Factores PESV" norm="PESV — Res. 1565/2014"
                                    count={causesSelected.pesv.factor_humano.length + causesSelected.pesv.factor_vehiculo.length + causesSelected.pesv.factor_infraestructura.length}>
                                    <p className="text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-2 mt-1">A — Factor Humano</p>
                                    <div className="space-y-0.5 mb-4">
                                        {PESV_FACTOR_HUMANO.map(item => (
                                            <CauseCheckbox key={item} code="—" label={item}
                                                checked={causesSelected.pesv.factor_humano.includes(item)}
                                                onChange={() => toggleCause("pesv", "factor_humano", item)}
                                                disabled={isClosed} />
                                        ))}
                                    </div>
                                    <p className="text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-2">B — Factor Vehículo</p>
                                    <div className="space-y-0.5 mb-4">
                                        {PESV_FACTOR_VEHICULO.map(item => (
                                            <CauseCheckbox key={item} code="—" label={item}
                                                checked={causesSelected.pesv.factor_vehiculo.includes(item)}
                                                onChange={() => toggleCause("pesv", "factor_vehiculo", item)}
                                                disabled={isClosed} />
                                        ))}
                                    </div>
                                    <p className="text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-2">C — Factor Infraestructura</p>
                                    <div className="space-y-0.5 mb-4">
                                        {PESV_FACTOR_INFRAESTRUCTURA.map(item => (
                                            <CauseCheckbox key={item} code="—" label={item}
                                                checked={causesSelected.pesv.factor_infraestructura.includes(item)}
                                                onChange={() => toggleCause("pesv", "factor_infraestructura", item)}
                                                disabled={isClosed} />
                                        ))}
                                    </div>
                                    <div className="mt-2">
                                        <FieldLabel>Otro factor PESV no listado</FieldLabel>
                                        <FTextarea rows={2} value={causesSelected.pesv.otra}
                                            onChange={(v) => { setCausesSelected(p => ({ ...p, pesv: { ...p.pesv, otra: v } })); scheduleSave(); }}
                                            placeholder="Describe si hay otro factor PESV no listado..." disabled={isClosed} />
                                    </div>
                                </CausesAccordion>
                            )}
                        </div>
                    )}

                    {/* TAB 3: PLAN DE ACCIÓN */}
                    {activeTab === 2 && (
                        <div className="space-y-6">
                            <div className="bg-[#141824] border border-[#1E2A3B] rounded-2xl p-4 sm:p-6">
                                <SectionTitle icon={ClipboardList}>Plan de Acción Correctiva</SectionTitle>
                                {actionPlan.length === 0 && !isClosed && (
                                    <div className="text-center py-6 text-[#334155] text-sm border border-dashed border-[#1E2A3B] rounded-xl mb-4">
                                        Sin acciones definidas
                                    </div>
                                )}
                                {actionPlan.map((item, i) => (
                                    <div key={i} className="bg-[#0F1420] border border-[#1E2A3B] rounded-xl p-4 mb-3">
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
                                            <div>
                                                <FieldLabel>Responsable *</FieldLabel>
                                                <FInput value={item.responsible} onChange={(v) => updAction(i, { responsible: v })} placeholder="Nombre y cargo" disabled={isClosed} />
                                            </div>
                                            <div>
                                                <FieldLabel>Fecha límite *</FieldLabel>
                                                <input type="date" value={item.deadline} onChange={(e) => updAction(i, { deadline: e.target.value })} disabled={isClosed}
                                                    className="w-full bg-[#141824] border border-[#1E2A3B] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#F59E0B]/50 transition-colors disabled:opacity-50" />
                                            </div>
                                            <div>
                                                <FieldLabel>Estado</FieldLabel>
                                                <select value={item.status} onChange={(e) => updAction(i, { status: e.target.value as ActionItem["status"] })} disabled={isClosed}
                                                    className="w-full bg-[#141824] border border-[#1E2A3B] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#F59E0B]/50 transition-colors disabled:opacity-50">
                                                    <option value="pendiente">Pendiente</option>
                                                    <option value="en_curso">En Curso</option>
                                                    <option value="cerrado">Cerrado</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {!isClosed && (
                                    <button onClick={addAction} className="flex items-center gap-2 px-4 py-2 bg-[#1E2A3B] text-[#94A3B8] hover:text-white rounded-xl text-sm font-semibold transition-colors mt-2 cursor-pointer">
                                        <Plus className="w-4 h-4" /> Agregar acción
                                    </button>
                                )}
                            </div>
                            <div className="bg-[#141824] border border-[#1E2A3B] rounded-2xl p-4 sm:p-6">
                                <SectionTitle icon={ChevronRight}>Conclusiones</SectionTitle>
                                <FTextarea value={conclusions} onChange={(v) => { setConclusions(v); scheduleSave(); }}
                                    placeholder="Resumen de causas determinadas, lecciones aprendidas y compromisos de la empresa..." rows={5} disabled={isClosed} />
                            </div>
                            {/* Close */}
                            {!isClosed ? (
                                <div className="bg-[#141824] border border-red-500/20 rounded-2xl p-4 sm:p-6">
                                    <h3 className="text-white font-semibold text-sm mb-1">Cierre de la Investigación</h3>
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

                    {/* TAB 4: FIRMAS */}
                    {activeTab === 3 && (
                        <div className="space-y-4">
                            <div className="bg-[#141824] border border-[#1E2A3B] rounded-2xl p-4 sm:p-6">
                                <SectionTitle icon={PenLine}>Firmas Digitales</SectionTitle>
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
                                            <div key={role} className={`border rounded-2xl p-4 transition-colors ${isSigned ? "bg-emerald-400/5 border-emerald-400/20" : "bg-[#0F1420] border-[#1E2A3B]"
                                                }`}>
                                                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                                                    <div>
                                                        <p className="text-white font-semibold text-sm">{label}</p>
                                                        {existing && <Countdown expiresAt={existing.expires_at} />}
                                                    </div>
                                                    {existing && <SigBadge status={existing.status} />}
                                                </div>

                                                {/* Name input */}
                                                {!isSigned && (
                                                    <div className="mb-3">
                                                        <FieldLabel>Nombre del firmante</FieldLabel>
                                                        <FInput
                                                            value={signerNames[role]}
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
                                                                    className="flex items-center gap-1.5 px-3 py-2 bg-[#1E2A3B] text-[#94A3B8] hover:text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer">
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
                            <div className={`border rounded-2xl p-4 sm:p-6 ${allSigned ? "bg-[#141824] border-[#1E2A3B]" : "bg-[#0F1420] border-[#1E2A3B] opacity-60"}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText className="w-4 h-4 text-[#F59E0B]" />
                                    <h3 className="text-white font-semibold text-sm">PDF Final de Investigación</h3>
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
    );
}
