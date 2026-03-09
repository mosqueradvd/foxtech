/**
 * app/dashboard/inspections/[id]/page.tsx
 * Módulo 6 — Detalle de inspección: hallazgos, plan de acción y cierre.
 */
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    ArrowLeft, CheckCircle2, XCircle, AlertCircle,
    Plus, Trash2, Loader2, Save, Lock, Clock, ChevronDown, ChevronUp
} from "lucide-react";
import {
    supabase,
    type Inspection,
    type InspectionItem,
    type InspectionActionItem,
    type Company,
} from "@/lib/supabase";
import { PhotoCapture } from "@/components/forms/PhotoCapture";
import { INSPECTION_TEMPLATES } from "@/lib/inspection-templates";
import * as LucideIcons from "lucide-react";

function DynamicIcon({ name, className }: { name: string; className?: string }) {
    const IconComponent = (LucideIcons as any)[name?.split("-").map(p => p.charAt(0).toUpperCase() + p.slice(1)).join("")] || LucideIcons.ClipboardList;
    return <IconComponent className={className} />;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
    const color = score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-red-500";
    return (
        <div className="w-full bg-[#1E2A3B] rounded-full h-2">
            <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
        </div>
    );
}

function ActionStatusSelect({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
    return (
        <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
            className="bg-[#0F1420] border border-[#1E2A3B] rounded-lg px-2 py-1.5 text-white text-xs outline-none focus:border-[#F59E0B]/50 disabled:opacity-50 cursor-pointer">
            <option value="pendiente">Pendiente</option>
            <option value="en_ejecucion">En ejecución</option>
            <option value="completada">Completada</option>
            {(value === "verificada" || value === "cerrado") && (
                <option value={value} disabled>{value === "cerrado" ? "Cerrado" : "Verificada"}</option>
            )}
            {value === "en_curso" && <option value="en_curso" hidden>En Curso</option>}
        </select>
    );
}

function FInput({ value, onChange, placeholder, disabled }: { value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }) {
    const ref = useRef<HTMLInputElement>(null);
    return (
        <input ref={ref} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
            onFocus={() => ref.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
            className="w-full bg-[#0F1420] border border-[#1E2A3B] rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[#F59E0B]/50 placeholder:text-[#334155] disabled:opacity-50" />
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function InspectionDetailPage() {
    const router = useRouter();
    const { id } = useParams<{ id: string }>();

    const [inspection, setInspection] = useState<Inspection | null>(null);
    const [company, setCompany] = useState<Company | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [closing, setClosing] = useState(false);
    const [actionPlan, setActionPlan] = useState<InspectionActionItem[]>([]);
    const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isClosed = inspection?.status === "cerrada";
    const score = inspection?.score_percent ?? 0;
    const items = inspection?.items ?? [];
    const failed = items.filter((i) => i.checked === false);
    const passed = items.filter((i) => i.checked === true);
    const notEval = items.filter((i) => i.checked === null);
    const template = INSPECTION_TEMPLATES.find((t) => t.id === inspection?.template_id);

    // ── Load ───────────────────────────────────────────────────────────────────
    const load = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase.from("inspections").select("*").eq("id", id).maybeSingle();
        if (data) {
            const insp = data as Inspection;
            setInspection(insp);

            let loadedActions = insp.action_plan ?? [];
            let needsSave = false;

            // Seed missing action plans from the item-level action_plan (mobile app format)
            if (insp.items) {
                insp.items.forEach(item => {
                    if (item.checked === false && item.action_plan && !loadedActions.some(a => a.finding_id === item.id)) {
                        loadedActions.push({
                            id: crypto.randomUUID(),
                            finding_id: item.id,
                            finding_label: item.label,
                            action: item.action_plan.description,
                            responsible: item.action_plan.responsible_name,
                            deadline: item.action_plan.deadline,
                            status: "pendiente",
                            effective: null,
                            voice_url: item.action_plan.voice_url
                        });
                        needsSave = true;
                    }
                });
            }

            setActionPlan(loadedActions);

            if (needsSave && insp.status !== "cerrada") {
                // Ensure the db correctly knows about the migrated items so they persist
                supabase.from("inspections").update({ action_plan: loadedActions }).eq("id", id).then(({ error }) => { if (error) console.warn(error); });
            }

            if (insp.company_id) {
                const { data: co } = await supabase.from("companies").select("*").eq("id", insp.company_id).maybeSingle();
                if (co) setCompany(co as Company);
            }
        }
        setLoading(false);
    }, [id]);

    useEffect(() => { load(); }, [load]);

    // ── Save action plan ───────────────────────────────────────────────────────
    const save = useCallback(async (showFeedback = true) => {
        if (!inspection || isClosed) return;
        if (showFeedback) setSaving(true);
        await supabase.from("inspections").update({
            action_plan: actionPlan,
            updated_at: new Date().toISOString(),
        }).eq("id", id);
        if (showFeedback) { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    }, [inspection, isClosed, actionPlan, id]);

    const scheduleSave = useCallback(() => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => save(false), 2500);
    }, [save]);

    // ── Close inspection ───────────────────────────────────────────────────────
    const handleClose = async () => {
        if (!inspection) return;
        setClosing(true);
        await save(false);
        await supabase.from("inspections").update({ status: "cerrada", updated_at: new Date().toISOString() }).eq("id", id);
        setInspection((prev) => prev ? { ...prev, status: "cerrada" } : prev);
        setClosing(false);
    };

    // ── Action plan helpers ────────────────────────────────────────────────────
    const addAction = (finding: InspectionItem) => {
        if (actionPlan.some((a) => a.finding_id === finding.id)) return; // one per finding
        const newAction: InspectionActionItem = {
            id: crypto.randomUUID(),
            finding_id: finding.id,
            finding_label: finding.label,
            action: "",
            responsible: "",
            deadline: "",
            status: "pendiente",
            effective: null,
        };
        setActionPlan((prev) => [...prev, newAction]);
        setExpandedFinding(finding.id);
        scheduleSave();
    };

    const updateAction = (id: string, patch: Partial<InspectionActionItem>) => {
        setActionPlan((prev) => prev.map((a) => a.id === id ? { ...a, ...patch } : a));
        scheduleSave();
    };

    const removeAction = (id: string) => {
        setActionPlan((prev) => prev.filter((a) => a.id !== id));
        scheduleSave();
    };

    const openActions = actionPlan.filter((a) => a.status !== "cerrado" && a.status !== "verificada").length;
    const allActionsSet = failed.length > 0 && failed.every((f) => actionPlan.some((a) => a.finding_id === f.id));

    // ── Render ─────────────────────────────────────────────────────────────────
    if (loading) return (
        <div className="min-h-screen bg-[#0F1420] flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-[#F59E0B] animate-spin" />
        </div>
    );

    if (!inspection) return (
        <div className="min-h-screen bg-[#0F1420] flex items-center justify-center">
            <div className="text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
                <p className="text-white font-bold">Inspección no encontrada</p>
                <button onClick={() => router.back()} className="text-[#F59E0B] text-sm underline">Volver</button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0F1420]" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* HEADER */}
            <header className="bg-[#141824] border-b border-[#1E2A3B] px-4 sm:px-6 py-4 flex items-center gap-3 sticky top-0 z-30">
                <button onClick={() => router.push("/dashboard/inspections")} className="p-2 rounded-lg text-[#64748B] hover:text-white hover:bg-white/5 transition-all flex-shrink-0">
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-white font-bold text-sm leading-none flex items-center gap-2">
                            <DynamicIcon name={template?.icon ?? "clipboard-list"} className="w-4 h-4" />
                            {inspection.template_name ?? template?.name ?? "Inspección"}
                        </h1>
                        {isClosed
                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"><Lock className="w-3 h-3" />Cerrada</span>
                            : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-400/10 text-amber-400 border border-amber-400/20"><Clock className="w-3 h-3" />Abierta</span>
                        }
                    </div>
                    <p className="text-[#64748B] text-xs mt-0.5 truncate">
                        {inspection.inspector_name}{company ? ` · ${company.name}` : ""}
                        {" · "}{new Date(inspection.created_at ?? "").toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 text-[#F59E0B] animate-spin" />}
                    {saved && !saving && <span className="text-emerald-400 text-xs font-semibold hidden sm:inline">Guardado ✓</span>}
                    {!isClosed && (
                        <button onClick={() => save(true)} disabled={saving}
                            className="flex items-center gap-1.5 px-3 py-2 bg-[#1E2A3B] text-[#94A3B8] hover:text-white rounded-xl text-xs font-semibold transition-colors">
                            <Save className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Guardar</span>
                        </button>
                    )}
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 space-y-5">
                {/* Score card */}
                <div className="bg-[#141824] border border-[#1E2A3B] rounded-2xl p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[#94A3B8] text-sm font-semibold">Cumplimiento general</span>
                        <span className={`text-2xl font-black ${score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-red-400"}`}>
                            {score}%
                        </span>
                    </div>
                    <ScoreBar score={score} />
                    <div className="grid grid-cols-3 gap-2 mt-4">
                        {[
                            { label: "OK", count: passed.length, color: "text-emerald-400" },
                            { label: "Fallidos", count: failed.length, color: "text-red-400" },
                            { label: "Sin evaluar", count: notEval.length, color: "text-[#64748B]" },
                        ].map((s) => (
                            <div key={s.label} className="text-center bg-[#0F1420] rounded-xl p-2">
                                <p className={`text-lg font-black ${s.color}`}>{s.count}</p>
                                <p className="text-[#64748B] text-xs">{s.label}</p>
                            </div>
                        ))}
                    </div>
                    {inspection.notes && (
                        <p className="text-[#64748B] text-xs mt-3 italic">"{inspection.notes}"</p>
                    )}
                </div>

                {/* Findings + action plan */}
                {failed.length > 0 && (
                    <div className="bg-[#141824] border border-[#1E2A3B] rounded-2xl p-4 sm:p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            <h2 className="text-white font-semibold text-sm">Hallazgos ({failed.length})</h2>
                            <span className="text-[#64748B] text-xs ml-auto">Plan de acción requerido por cada hallazgo</span>
                        </div>

                        <div className="space-y-3">
                            {failed.map((item) => {
                                const action = actionPlan.find((a) => a.finding_id === item.id);
                                const expanded = expandedFinding === item.id;
                                return (
                                    <div key={item.id} className={`border rounded-xl overflow-hidden ${action ? "border-amber-700/30" : "border-red-700/30"}`}>
                                        {/* Finding header */}
                                        <div className="flex items-start gap-3 p-3 bg-[#0F1420]">
                                            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white text-sm font-medium leading-snug">{item.label}</p>
                                                {item.observation && (
                                                    <p className="text-[#64748B] text-xs mt-1 italic">"{item.observation}"</p>
                                                )}
                                                {item.photo_url && (
                                                    <a href={item.photo_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-2">
                                                        <img src={item.photo_url} alt="Evidencia" className="h-16 w-16 object-cover rounded-lg border border-[#1E2A3B] hover:opacity-80 transition-opacity" />
                                                    </a>
                                                )}
                                                {item.norm && (
                                                    <p className="text-[#334155] text-xs mt-1.5">{item.norm}</p>
                                                )}
                                            </div>
                                            {action ? (
                                                <button onClick={() => setExpandedFinding(expanded ? null : item.id)}
                                                    className="flex items-center gap-1 text-amber-400 text-xs font-semibold flex-shrink-0">
                                                    Acción definida
                                                    {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                </button>
                                            ) : !isClosed ? (
                                                <button onClick={() => addAction(item)}
                                                    className="flex items-center gap-1 px-2.5 py-1.5 bg-red-400/10 text-red-400 border border-red-400/20 rounded-lg text-xs font-semibold hover:bg-red-400/20 transition-colors flex-shrink-0">
                                                    <Plus className="w-3 h-3" /> Acción
                                                </button>
                                            ) : (
                                                <span className="text-red-400 text-xs font-semibold flex-shrink-0">Sin acción</span>
                                            )}
                                        </div>

                                        {/* Action form */}
                                        {action && (expanded || !action.action) && (
                                            <div className="p-3 border-t border-[#1E2A3B] bg-[#141824] space-y-3">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div className="sm:col-span-2">
                                                        <label className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wider mb-1.5 block">Acción correctiva *</label>
                                                        <div className="space-y-2">
                                                            <FInput value={action.action} onChange={(v) => updateAction(action.id, { action: v })} placeholder="Describe la acción a tomar..." disabled={isClosed} />
                                                            {action.voice_url && (
                                                                <audio src={action.voice_url} controls className="h-8 max-w-full" />
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wider mb-1.5 block">Responsable *</label>
                                                        <FInput value={action.responsible} onChange={(v) => updateAction(action.id, { responsible: v })} placeholder="Nombre y cargo" disabled={isClosed} />
                                                    </div>
                                                    <div>
                                                        <label className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wider mb-1.5 block">Fecha límite *</label>
                                                        <input type="date" value={action.deadline} onChange={(e) => updateAction(action.id, { deadline: e.target.value })} disabled={isClosed}
                                                            className="w-full bg-[#0F1420] border border-[#1E2A3B] rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[#F59E0B]/50 disabled:opacity-50" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wider mb-1.5 block">Estado</label>
                                                        <ActionStatusSelect value={action.status} onChange={(v) => updateAction(action.id, { status: v as InspectionActionItem["status"] })} disabled={isClosed} />
                                                    </div>
                                                    {action.status === "completada" && (
                                                        <div className="sm:col-span-2 mt-2 p-3 sm:p-4 bg-[#0F1420] border border-[#1E2A3B] rounded-xl space-y-4">
                                                            <div className="flex items-center gap-2 border-b border-[#1E2A3B] pb-2">
                                                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                                <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Verificación de Eficacia (Dec. 1072)</span>
                                                            </div>
                                                            <div>
                                                                <label className="text-[#64748B] text-[10px] uppercase block mb-1.5">Nota de cierre / Observaciones de Verificación</label>
                                                                <FInput value={action.verification_note || ""} onChange={(v) => updateAction(action.id, { verification_note: v })} disabled={isClosed} placeholder="E.g. área limpia y delimitada, se cerró el hallazgo." />
                                                            </div>
                                                            <div>
                                                                <label className="text-[#64748B] text-[10px] uppercase block mb-1.5 mt-2">Evidencia fotográfica</label>
                                                                {action.verification_photo_url ? (
                                                                    <div className="relative inline-block mt-1">
                                                                        <img src={action.verification_photo_url} className="h-24 w-24 object-cover rounded-xl border-2 border-[#1E2A3B]" alt="Verificación" />
                                                                        {!isClosed && (
                                                                            <button onClick={() => updateAction(action.id, { verification_photo_url: undefined })} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-400 transition-colors cursor-pointer"><XCircle className="w-3.5 h-3.5" /></button>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-full sm:w-80">
                                                                        <PhotoCapture onCapture={(data) => updateAction(action.id, { verification_photo_url: data.photoBase64 })} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <button
                                                                onClick={() => updateAction(action.id, { status: "verificada", effective: true })}
                                                                disabled={!action.verification_note || !action.verification_photo_url || isClosed}
                                                                className="w-full sm:max-w-xs mt-2 py-2.5 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer">
                                                                Confirmar y Validar Cierre
                                                            </button>
                                                        </div>
                                                    )}
                                                    {(action.status === "verificada" || action.status === "cerrado") && (
                                                        <div className="sm:col-span-2 mt-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                                <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Acción Verificada</span>
                                                            </div>
                                                            {action.verification_note && (
                                                                <p className="text-emerald-400/80 text-xs mt-1 italic">"{action.verification_note}"</p>
                                                            )}
                                                            {action.verification_photo_url && (
                                                                <a href={action.verification_photo_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-2">
                                                                    <img src={action.verification_photo_url} className="h-16 w-16 object-cover rounded-lg border border-emerald-500/30 hover:opacity-80 transition-opacity" alt="Evidencia de cierre" />
                                                                </a>
                                                            )}
                                                            {/* backward compatibility */}
                                                            {action.effective !== undefined && action.effective !== null && !action.verification_note && (
                                                                <p className="text-emerald-400/80 text-xs mt-1">Eficaz: {action.effective ? "Sí" : "No"}</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                {!isClosed && (
                                                    <button onClick={() => removeAction(action.id)} className="flex items-center gap-1 text-[#64748B] hover:text-red-400 text-xs transition-colors">
                                                        <Trash2 className="w-3.5 h-3.5" /> Eliminar acción
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Pass items (collapsed) */}
                {passed.length > 0 && (
                    <details className="bg-[#141824] border border-[#1E2A3B] rounded-2xl overflow-hidden">
                        <summary className="flex items-center gap-2 px-4 sm:px-6 py-4 cursor-pointer text-white font-semibold text-sm hover:bg-[#1E2A3B]/30 transition-colors list-none">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            Ítems aprobados ({passed.length})
                        </summary>
                        <div className="px-4 sm:px-6 pb-4 space-y-2">
                            {passed.map((item) => (
                                <div key={item.id} className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                                    <span className="text-[#94A3B8] text-xs">{item.label}</span>
                                    {item.norm && <span className="text-[#334155] text-xs ml-auto">{item.norm}</span>}
                                </div>
                            ))}
                        </div>
                    </details>
                )}

                {/* Close / status section */}
                {!isClosed ? (
                    <div className="bg-[#141824] border border-[#1E2A3B] rounded-2xl p-4 sm:p-6">
                        <h3 className="text-white font-semibold text-sm mb-1">Cierre de la Inspección</h3>
                        <p className="text-[#64748B] text-xs mb-4">
                            {allActionsSet || failed.length === 0
                                ? "Todos los hallazgos tienen acción correctiva. Puedes cerrar la inspección."
                                : `Faltan acciones para ${failed.filter((f) => !actionPlan.some((a) => a.finding_id === f.id)).length} hallazgo(s).`}
                        </p>
                        <button onClick={handleClose} disabled={closing || (!allActionsSet && failed.length > 0)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            {closing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            Cerrar Inspección
                        </button>
                        {openActions > 0 && (
                            <p className="text-amber-400 text-xs mt-2">⚠ {openActions} acción(es) aún en proceso — se pueden cerrar después.</p>
                        )}
                    </div>
                ) : (
                    <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-4 sm:p-6 flex items-center gap-3">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                        <div>
                            <p className="text-emerald-400 font-semibold">Inspección cerrada</p>
                            <p className="text-emerald-400/60 text-xs">Plan de acción bloqueado. Edita en nueva inspección.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
