/**
 * app/dashboard/events/[id]/investigation/page.tsx
 * Módulo 3 — Investigación del Accidente (Res. 1401/2007)
 * 3-tab form: Equipo/Narrativa | Árbol de Causas | Plan de Acción
 * Auto-save por tab. Estado persistido en Supabase tabla `investigations`.
 */
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    ArrowLeft, Save, CheckCircle2, AlertTriangle, Users,
    Search, Zap, ClipboardList, Plus, Trash2, Loader2,
    ChevronRight, Lock, Clock
} from "lucide-react";
import {
    supabase,
    type Event,
    type Investigation,
    type ImmediateCause,
    type BasicCause,
    type ActionItem,
} from "@/lib/supabase";

// ── Consts ────────────────────────────────────────────────────────────────────

const TABS = [
    { id: 0, label: "Equipo & Narrativa", icon: Users },
    { id: 1, label: "Árbol de Causas", icon: Search },
    { id: 2, label: "Plan de Acción", icon: ClipboardList },
] as const;

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    en_proceso: { label: "En Proceso", color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/25" },
    plan_accion_definido: { label: "Plan Definido", color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/25" },
    en_seguimiento: { label: "En Seguimiento", color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/25" },
    cerrado: { label: "Cerrado", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/25" },
};

// ── Small reusable components ─────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
    return <label className="block text-[#94A3B8] text-xs font-semibold uppercase tracking-wider mb-1.5">{children}</label>;
}

function Input({ value, onChange, placeholder, disabled }: {
    value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean;
}) {
    return (
        <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full bg-[#0F1420] border border-[#1E2A3B] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#F59E0B]/50 transition-colors placeholder:text-[#334155] disabled:opacity-50"
        />
    );
}

function Textarea({ value, onChange, placeholder, rows = 4, disabled }: {
    value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; disabled?: boolean;
}) {
    return (
        <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
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

// ── Primary investigation form page ──────────────────────────────────────────

export default function InvestigationPage() {
    const router = useRouter();
    const params = useParams();
    const incidentId = params.id as string;

    // Data
    const [incident, setIncident] = useState<Event | null>(null);
    const [investigation, setInvestigation] = useState<Investigation | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [closing, setClosing] = useState(false);
    const [creating, setCreating] = useState(false);

    // UI
    const [activeTab, setActiveTab] = useState(0);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Form state (mirrors Investigation fields) ─────────────────────────────
    const [team, setTeam] = useState({ sst: "", jefe: "", copasst: "", extra: "" });
    const [narrative, setNarrative] = useState("");
    const [immediateCauses, setImmediateCauses] = useState<ImmediateCause[]>([]);
    const [basicCauses, setBasicCauses] = useState<BasicCause[]>([]);
    const [controlFailures, setControlFailures] = useState("");
    const [actionPlan, setActionPlan] = useState<ActionItem[]>([]);
    const [conclusions, setConclusions] = useState("");

    const isClosed = investigation?.status === "cerrado";

    // ── Load ─────────────────────────────────────────────────────────────────
    const load = useCallback(async () => {
        setLoading(true);
        const [{ data: ev }, { data: invs }] = await Promise.all([
            supabase.from("incidents").select("*").eq("id", incidentId).maybeSingle(),
            supabase.from("investigations").select("*").eq("incident_id", incidentId).maybeSingle(),
        ]);
        setIncident(ev as Event | null);

        const inv = invs as Investigation | null;
        if (inv) {
            setInvestigation(inv);
            setTeam({
                sst: inv.investigator_sst ?? "",
                jefe: inv.investigator_jefe ?? "",
                copasst: inv.investigator_copasst ?? "",
                extra: inv.investigators_extra ?? "",
            });
            setNarrative(inv.event_narrative ?? "");
            setImmediateCauses(inv.immediate_causes ?? []);
            setBasicCauses(inv.basic_causes ?? []);
            setControlFailures(inv.control_failures ?? "");
            setActionPlan(inv.action_plan ?? []);
            setConclusions(inv.conclusions ?? "");
        }
        setLoading(false);
    }, [incidentId]);

    useEffect(() => { load(); }, [load]);

    // ── Create investigation ──────────────────────────────────────────────────
    const handleCreate = async () => {
        setCreating(true);
        const { data, error } = await supabase
            .from("investigations")
            .insert({
                incident_id: incidentId,
                company_id: incident?.company_id ?? null,
                status: "en_proceso",
                immediate_causes: [],
                basic_causes: [],
                action_plan: [],
            })
            .select()
            .single();
        if (!error && data) {
            setInvestigation(data as Investigation);
        }
        setCreating(false);
    };

    // ── Save ──────────────────────────────────────────────────────────────────
    const save = useCallback(async (showFeedback = true) => {
        if (!investigation || isClosed) return;
        if (showFeedback) setSaving(true);

        // Determine new status based on content
        let newStatus: Investigation["status"] = "en_proceso";
        const hasTeam = team.sst || team.jefe || team.copasst;
        const hasCauses = immediateCauses.length > 0 || basicCauses.length > 0;
        const hasPlan = actionPlan.length > 0;
        if (hasPlan) newStatus = "plan_accion_definido";
        else if (hasTeam && hasCauses) newStatus = "en_proceso";

        await supabase.from("investigations").update({
            investigator_sst: team.sst || null,
            investigator_jefe: team.jefe || null,
            investigator_copasst: team.copasst || null,
            investigators_extra: team.extra || null,
            event_narrative: narrative || null,
            immediate_causes: immediateCauses,
            basic_causes: basicCauses,
            control_failures: controlFailures || null,
            action_plan: actionPlan,
            conclusions: conclusions || null,
            status: newStatus,
            updated_at: new Date().toISOString(),
        }).eq("id", investigation.id);

        setInvestigation((prev) => prev ? { ...prev, status: newStatus } : prev);
        if (showFeedback) {
            setSaving(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        }
    }, [investigation, isClosed, team, narrative, immediateCauses, basicCauses, controlFailures, actionPlan, conclusions]);

    // Auto-save after 3s of inactivity
    const scheduleSave = useCallback(() => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => save(false), 3000);
    }, [save]);

    // ── Close investigation ───────────────────────────────────────────────────
    const handleClose = async () => {
        if (!investigation) return;
        setClosing(true);
        await save(false);
        await supabase.from("investigations").update({
            status: "cerrado",
            closed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }).eq("id", investigation.id);

        // Update incident to 'investigated'
        await supabase.from("incidents").update({
            classification_status: "investigated",
            updated_at: new Date().toISOString(),
        }).eq("id", incidentId);

        setInvestigation((prev) => prev ? { ...prev, status: "cerrado" } : prev);
        setClosing(false);
    };

    // ── Helpers for cause lists ───────────────────────────────────────────────
    function addImmediateCause(type: ImmediateCause["type"]) {
        const updated = [...immediateCauses, { type, description: "" }];
        setImmediateCauses(updated);
        scheduleSave();
    }
    function updateImmediateCause(i: number, desc: string) {
        const updated = immediateCauses.map((c, idx) => idx === i ? { ...c, description: desc } : c);
        setImmediateCauses(updated);
        scheduleSave();
    }
    function removeImmediateCause(i: number) {
        setImmediateCauses(immediateCauses.filter((_, idx) => idx !== i));
        scheduleSave();
    }

    function addBasicCause(type: BasicCause["type"]) {
        setBasicCauses([...basicCauses, { type, description: "" }]);
        scheduleSave();
    }
    function updateBasicCause(i: number, desc: string) {
        setBasicCauses(basicCauses.map((c, idx) => idx === i ? { ...c, description: desc } : c));
        scheduleSave();
    }
    function removeBasicCause(i: number) {
        setBasicCauses(basicCauses.filter((_, idx) => idx !== i));
        scheduleSave();
    }

    function addAction() {
        setActionPlan([...actionPlan, { action: "", responsible: "", deadline: "", status: "pendiente" }]);
        scheduleSave();
    }
    function updateAction(i: number, patch: Partial<ActionItem>) {
        setActionPlan(actionPlan.map((a, idx) => idx === i ? { ...a, ...patch } : a));
        scheduleSave();
    }
    function removeAction(i: number) {
        setActionPlan(actionPlan.filter((_, idx) => idx !== i));
        scheduleSave();
    }

    // ── Cause row ─────────────────────────────────────────────────────────────
    function CauseRow({ label, value, onChange, onRemove }: {
        label: string; value: string; onChange: (v: string) => void; onRemove: () => void;
    }) {
        return (
            <div className="flex items-start gap-2 mb-2">
                <span className="mt-2.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider w-20 flex-shrink-0">{label}</span>
                <input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={isClosed}
                    placeholder="Describe la causa..."
                    className="flex-1 bg-[#0F1420] border border-[#1E2A3B] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F59E0B]/50 transition-colors placeholder:text-[#334155] disabled:opacity-50"
                />
                {!isClosed && (
                    <button onClick={onRemove} className="mt-2 p-1.5 rounded-lg text-[#64748B] hover:text-red-400 hover:bg-red-400/10 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-[#0F1420] flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-[#F59E0B] animate-spin" />
            </div>
        );
    }

    const statusCfg = STATUS_LABELS[investigation?.status ?? "en_proceso"];

    return (
        <div className="min-h-screen bg-[#0F1420]" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* ── HEADER ── */}
            <header className="bg-[#141824] border-b border-[#1E2A3B] px-6 py-4 flex items-center gap-4 sticky top-0 z-30">
                <button onClick={() => router.push(`/dashboard/events/${incidentId}`)} className="p-2 rounded-lg text-[#64748B] hover:text-white hover:bg-white/5 transition-all">
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                        <h1 className="text-white font-bold text-base leading-none">INVESTIGACIÓN DEL ACCIDENTE</h1>
                        {investigation && (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${statusCfg.bg} ${statusCfg.color}`}>
                                {statusCfg.label}
                            </span>
                        )}
                    </div>
                    <p className="text-[#64748B] text-xs mt-0.5">
                        {incident?.worker_name ?? incident?.reported_by_name ?? "Evento"} — Res. 1401/2007
                    </p>
                </div>

                {/* Save / status indicators */}
                <div className="flex items-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 text-[#F59E0B] animate-spin" />}
                    {saved && !saving && <span className="text-emerald-400 text-xs font-semibold">Guardado ✓</span>}
                    {investigation && !isClosed && (
                        <button
                            onClick={() => save(true)}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-[#1E2A3B] text-[#94A3B8] hover:text-white rounded-xl text-sm font-semibold transition-colors"
                        >
                            <Save className="w-3.5 h-3.5" />
                            Guardar
                        </button>
                    )}
                    {isClosed && <Lock className="w-4 h-4 text-emerald-400" />}
                </div>
            </header>

            {/* ── INCIDENT SUMMARY STRIP ── */}
            {incident && (
                <div className="bg-[#141824]/60 border-b border-[#1E2A3B] px-6 py-2.5 flex items-center gap-6 text-xs text-[#64748B] flex-wrap">
                    <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        {incident.classification?.replace(/_/g, " ") ?? "Sin clasificar"}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {incident.event_date ?? (incident.created_at ?? "").slice(0, 10)}
                    </span>
                    {incident.event_city && <span>{incident.event_city}</span>}
                    {incident.disability_days !== undefined && (
                        <span>{incident.disability_days} días de incapacidad</span>
                    )}
                </div>
            )}

            {/* ── NO INVESTIGATION YET ── */}
            {!investigation ? (
                <div className="max-w-2xl mx-auto px-6 py-16 text-center">
                    <div className="w-16 h-16 bg-amber-400/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <ClipboardList className="w-8 h-8 text-[#F59E0B]" />
                    </div>
                    <h2 className="text-white font-bold text-xl mb-2">Iniciar Investigación Formal</h2>
                    <p className="text-[#64748B] text-sm mb-2 max-w-md mx-auto">
                        La investigación formal debe realizarse dentro de los <strong className="text-white">15 días hábiles</strong> siguientes al evento (Res. 1401/2007, Art. 4).
                    </p>
                    <p className="text-[#334155] text-sm mb-8 max-w-md mx-auto">
                        Al iniciarla, se crea un expediente de investigación vinculado a este evento. Podrás guardarlo y continuarlo en cualquier momento.
                    </p>
                    <button
                        onClick={handleCreate}
                        disabled={creating}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[#F59E0B] text-black font-bold rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-60"
                    >
                        {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Iniciar Investigación
                    </button>
                </div>
            ) : (
                <div className="max-w-4xl mx-auto px-6 py-6">
                    {/* ── TABS ── */}
                    <div className="flex gap-1 bg-[#141824] border border-[#1E2A3B] rounded-2xl p-1 mb-6">
                        {TABS.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={[
                                        "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all",
                                        activeTab === tab.id
                                            ? "bg-[#F59E0B] text-black"
                                            : "text-[#64748B] hover:text-white",
                                    ].join(" ")}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span className="hidden sm:inline">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* ── TAB 1: EQUIPO & NARRATIVA ── */}
                    {activeTab === 0 && (
                        <div className="space-y-6">
                            <div className="bg-[#141824] border border-[#1E2A3B] rounded-2xl p-6">
                                <SectionTitle icon={Users}>Equipo Investigador</SectionTitle>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <FieldLabel>Responsable SST *</FieldLabel>
                                        <Input value={team.sst} onChange={(v) => { setTeam((t) => ({ ...t, sst: v })); scheduleSave(); }} placeholder="Nombre del profesional SST" disabled={isClosed} />
                                    </div>
                                    <div>
                                        <FieldLabel>Jefe Inmediato *</FieldLabel>
                                        <Input value={team.jefe} onChange={(v) => { setTeam((t) => ({ ...t, jefe: v })); scheduleSave(); }} placeholder="Nombre del jefe inmediato" disabled={isClosed} />
                                    </div>
                                    <div>
                                        <FieldLabel>Representante COPASST *</FieldLabel>
                                        <Input value={team.copasst} onChange={(v) => { setTeam((t) => ({ ...t, copasst: v })); scheduleSave(); }} placeholder="Nombre del representante" disabled={isClosed} />
                                    </div>
                                    <div>
                                        <FieldLabel>Otros participantes</FieldLabel>
                                        <Input value={team.extra} onChange={(v) => { setTeam((t) => ({ ...t, extra: v })); scheduleSave(); }} placeholder="Otros investigadores" disabled={isClosed} />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#141824] border border-[#1E2A3B] rounded-2xl p-6">
                                <SectionTitle icon={AlertTriangle}>Narrativa Ampliada del Evento</SectionTitle>
                                <p className="text-[#64748B] text-xs mb-3">Describe con detalle qué ocurrió, en qué secuencia, quiénes estaban presentes y cuáles fueron las circunstancias. Esta narrativa es el sustento de las causas.</p>
                                <Textarea
                                    value={narrative}
                                    onChange={(v) => { setNarrative(v); scheduleSave(); }}
                                    placeholder="El día [fecha] a las [hora], el trabajador [nombre] se encontraba [actividad] cuando..."
                                    rows={8}
                                    disabled={isClosed}
                                />
                            </div>
                        </div>
                    )}

                    {/* ── TAB 2: ÁRBOL DE CAUSAS ── */}
                    {activeTab === 1 && (
                        <div className="space-y-6">
                            {/* Immediate causes */}
                            <div className="bg-[#141824] border border-[#1E2A3B] rounded-2xl p-6">
                                <SectionTitle icon={Zap}>Causas Inmediatas (§5.2 Res. 1401)</SectionTitle>
                                <p className="text-[#64748B] text-xs mb-4">Condiciones o actos que directamente causaron el evento.</p>

                                {immediateCauses.map((c, i) => (
                                    <CauseRow
                                        key={i}
                                        label={c.type === "acto" ? "Acto" : "Condición"}
                                        value={c.description}
                                        onChange={(v) => updateImmediateCause(i, v)}
                                        onRemove={() => removeImmediateCause(i)}
                                    />
                                ))}

                                {!isClosed && (
                                    <div className="flex gap-2 mt-4">
                                        <button onClick={() => addImmediateCause("acto")} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400/10 text-amber-400 border border-amber-400/20 rounded-lg text-xs font-semibold hover:bg-amber-400/20 transition-colors">
                                            <Plus className="w-3 h-3" /> Acto subestándar
                                        </button>
                                        <button onClick={() => addImmediateCause("condicion")} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-400/10 text-orange-400 border border-orange-400/20 rounded-lg text-xs font-semibold hover:bg-orange-400/20 transition-colors">
                                            <Plus className="w-3 h-3" /> Condición subestándar
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Basic/root causes */}
                            <div className="bg-[#141824] border border-[#1E2A3B] rounded-2xl p-6">
                                <SectionTitle icon={Search}>Causas Básicas (§5.3)</SectionTitle>
                                <p className="text-[#64748B] text-xs mb-4">Factores personales o del trabajo que generaron las causas inmediatas.</p>

                                {basicCauses.map((c, i) => (
                                    <CauseRow
                                        key={i}
                                        label={c.type === "personal" ? "Personal" : "Trabajo"}
                                        value={c.description}
                                        onChange={(v) => updateBasicCause(i, v)}
                                        onRemove={() => removeBasicCause(i)}
                                    />
                                ))}

                                {!isClosed && (
                                    <div className="flex gap-2 mt-4">
                                        <button onClick={() => addBasicCause("personal")} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-400/10 text-blue-400 border border-blue-400/20 rounded-lg text-xs font-semibold hover:bg-blue-400/20 transition-colors">
                                            <Plus className="w-3 h-3" /> Factor personal
                                        </button>
                                        <button onClick={() => addBasicCause("trabajo")} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-400/10 text-purple-400 border border-purple-400/20 rounded-lg text-xs font-semibold hover:bg-purple-400/20 transition-colors">
                                            <Plus className="w-3 h-3" /> Factor de trabajo
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Control failures */}
                            <div className="bg-[#141824] border border-[#1E2A3B] rounded-2xl p-6">
                                <SectionTitle icon={AlertTriangle}>Fallas en el Control Administrativo (§5.4)</SectionTitle>
                                <p className="text-[#64748B] text-xs mb-3">Deficiencias del sistema de gestión que permitieron que las causas básicas existieran.</p>
                                <Textarea
                                    value={controlFailures}
                                    onChange={(v) => { setControlFailures(v); scheduleSave(); }}
                                    placeholder="Ej.: No existía procedimiento de trabajo seguro para esta actividad. Los EPP no eran inspeccionados periódicamente..."
                                    rows={4}
                                    disabled={isClosed}
                                />
                            </div>
                        </div>
                    )}

                    {/* ── TAB 3: PLAN DE ACCIÓN ── */}
                    {activeTab === 2 && (
                        <div className="space-y-6">
                            <div className="bg-[#141824] border border-[#1E2A3B] rounded-2xl p-6">
                                <SectionTitle icon={ClipboardList}>Plan de Acción Correctiva</SectionTitle>
                                <p className="text-[#64748B] text-xs mb-4">Define las acciones para eliminar o controlar las causas identificadas.</p>

                                {actionPlan.length === 0 && !isClosed && (
                                    <div className="text-center py-6 text-[#334155] text-sm border border-dashed border-[#1E2A3B] rounded-xl mb-4">
                                        Sin acciones definidas, agrega la primera
                                    </div>
                                )}

                                {actionPlan.map((item, i) => (
                                    <div key={i} className="bg-[#0F1420] border border-[#1E2A3B] rounded-xl p-4 mb-3">
                                        <div className="flex items-start justify-between gap-2 mb-3">
                                            <span className="text-[#F59E0B] text-xs font-bold">Acción #{i + 1}</span>
                                            {!isClosed && (
                                                <button onClick={() => removeAction(i)} className="p-1 rounded-lg text-[#64748B] hover:text-red-400 hover:bg-red-400/10 transition-all">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="sm:col-span-2">
                                                <FieldLabel>Acción correctiva *</FieldLabel>
                                                <Input value={item.action} onChange={(v) => updateAction(i, { action: v })} placeholder="Describir la acción a tomar..." disabled={isClosed} />
                                            </div>
                                            <div>
                                                <FieldLabel>Responsable *</FieldLabel>
                                                <Input value={item.responsible} onChange={(v) => updateAction(i, { responsible: v })} placeholder="Nombre y cargo" disabled={isClosed} />
                                            </div>
                                            <div>
                                                <FieldLabel>Fecha límite *</FieldLabel>
                                                <input
                                                    type="date"
                                                    value={item.deadline}
                                                    onChange={(e) => updateAction(i, { deadline: e.target.value })}
                                                    disabled={isClosed}
                                                    className="w-full bg-[#141824] border border-[#1E2A3B] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#F59E0B]/50 transition-colors disabled:opacity-50"
                                                />
                                            </div>
                                            <div>
                                                <FieldLabel>Estado</FieldLabel>
                                                <select
                                                    value={item.status}
                                                    onChange={(e) => updateAction(i, { status: e.target.value as ActionItem["status"] })}
                                                    disabled={isClosed}
                                                    className="w-full bg-[#141824] border border-[#1E2A3B] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#F59E0B]/50 transition-colors disabled:opacity-50"
                                                >
                                                    <option value="pendiente">Pendiente</option>
                                                    <option value="en_curso">En Curso</option>
                                                    <option value="cerrado">Cerrado</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {!isClosed && (
                                    <button onClick={addAction} className="flex items-center gap-2 px-4 py-2 bg-[#1E2A3B] text-[#94A3B8] hover:text-white rounded-xl text-sm font-semibold transition-colors mt-2">
                                        <Plus className="w-4 h-4" /> Agregar acción
                                    </button>
                                )}
                            </div>

                            {/* Conclusions */}
                            <div className="bg-[#141824] border border-[#1E2A3B] rounded-2xl p-6">
                                <SectionTitle icon={ChevronRight}>Conclusiones</SectionTitle>
                                <Textarea
                                    value={conclusions}
                                    onChange={(v) => { setConclusions(v); scheduleSave(); }}
                                    placeholder="Resumen de las causas determinadas, lecciones aprendidas y compromisos de la empresa..."
                                    rows={5}
                                    disabled={isClosed}
                                />
                            </div>

                            {/* Close button */}
                            {!isClosed ? (
                                <div className="bg-[#141824] border border-red-500/20 rounded-2xl p-6">
                                    <h3 className="text-white font-semibold text-sm mb-1">Cierre de la Investigación</h3>
                                    <p className="text-[#64748B] text-xs mb-4">
                                        Al cerrar, el evento queda marcado como <strong className="text-white">"Investigado"</strong> y la investigación queda bloqueada. Asegúrate de haber llenado las causas y definido el plan de acción.
                                    </p>
                                    <button
                                        onClick={handleClose}
                                        disabled={closing || actionPlan.length === 0}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {closing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                        Cerrar Investigación
                                    </button>
                                    {actionPlan.length === 0 && (
                                        <p className="text-amber-400 text-xs mt-2">⚠ Define al menos una acción correctiva antes de cerrar.</p>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-6 flex items-center gap-3">
                                    <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                                    <div>
                                        <p className="text-emerald-400 font-semibold">Investigación cerrada</p>
                                        <p className="text-emerald-400/60 text-xs">El evento fue marcado como "Investigado" en el sistema.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
