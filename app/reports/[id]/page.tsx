/**
 * app/reports/[id]/page.tsx
 * Incident detail view — editable if PENDING, read-only if SYNCED.
 * Reads from Dexie (offline-first). After saving → re-syncs.
 */
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    ArrowLeft, Lock, Clock, Mic, FileText, User, MapPin,
    Calendar, Loader2, Save, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { db, saveIncidentDraft, type LocalIncident } from "@/lib/db";
import { syncPendingData } from "@/lib/sync";

const TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    casi_accidente: { label: "Casi-Accidente", color: "text-blue-400", bg: "bg-blue-900/20 border-blue-700/30" },
    accidente: { label: "Accidente / Lesión", color: "text-red-400", bg: "bg-red-900/20 border-red-700/30" },
    condicion_insegura: { label: "Condición Insegura", color: "text-amber-400", bg: "bg-amber-900/20 border-amber-700/30" },
};

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1E2A3B] flex items-center justify-center flex-shrink-0 mt-0.5">
                {icon}
            </div>
            <div>
                <p className="text-[#64748B] text-xs font-semibold uppercase tracking-wider">{label}</p>
                <p className="text-white text-sm mt-0.5 leading-relaxed">{value}</p>
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-[#252B3B] border border-[#334155] rounded-2xl p-4 space-y-4">
            <h3 className="text-[#94A3B8] text-xs font-bold uppercase tracking-wider">{title}</h3>
            {children}
        </div>
    );
}

function EditableField({ label, value, onChange, placeholder, multiline }: {
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; multiline?: boolean;
}) {
    const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
    const cls = "w-full bg-[#1A1F2E] border border-[#334155] rounded-xl px-4 py-3 text-white text-sm placeholder:text-[#334155] outline-none focus:border-[#F59E0B]/50 resize-none";
    return (
        <div>
            <label className="text-[#94A3B8] text-xs font-bold uppercase tracking-wider block mb-1.5">{label}</label>
            {multiline ? (
                <textarea ref={ref as React.Ref<HTMLTextAreaElement>} rows={4} value={value}
                    onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
                    onFocus={() => ref.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
                    className={cls} />
            ) : (
                <input ref={ref as React.Ref<HTMLInputElement>} type="text" value={value}
                    onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
                    onFocus={() => ref.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
                    className={cls} />
            )}
        </div>
    );
}

export default function ReportDetailPage() {
    const router = useRouter();
    const { id } = useParams<{ id: string }>();

    const [incident, setIncident] = useState<LocalIncident | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Editable fields
    const [description, setDescription] = useState("");
    const [reporterDesc, setReporterDesc] = useState("");
    const [witnessName, setWitnessName] = useState("");
    const [witnessDesc, setWitnessDesc] = useState("");

    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        db.incidents.get(id).then((inc) => {
            if (inc) {
                setIncident(inc);
                setDescription(inc.description ?? "");
                setReporterDesc(inc.reporter_description ?? "");
                setWitnessName(inc.witness_name ?? "");
                setWitnessDesc(inc.witness_description ?? "");
            }
            setLoading(false);
        });
    }, [id]);

    const isPending = incident?.sync_status === "pending";

    const handleSave = useCallback(async () => {
        if (!incident || !isPending) return;
        setSaving(true);
        await saveIncidentDraft(id, {
            description: description.trim() || undefined,
            reporter_description: reporterDesc.trim() || undefined,
            witness_name: witnessName.trim() || undefined,
            witness_description: witnessDesc.trim() || undefined,
        });
        syncPendingData().catch(console.warn);
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    }, [incident, isPending, id, description, reporterDesc, witnessName, witnessDesc]);

    const scheduleAutoSave = useCallback(() => {
        if (!isPending) return;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => handleSave(), 1500);
    }, [isPending, handleSave]);

    if (loading) return (
        <div className="min-h-dvh bg-[#1A1F2E] flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-[#F59E0B] animate-spin" />
        </div>
    );

    if (!incident) return (
        <div className="min-h-dvh bg-[#1A1F2E] flex flex-col items-center justify-center gap-4 text-center px-6">
            <AlertTriangle className="w-10 h-10 text-red-400" />
            <p className="text-white font-bold">Reporte no encontrado</p>
            <button onClick={() => router.back()} className="text-[#F59E0B] text-sm underline">Volver</button>
        </div>
    );

    const typeInfo = TYPE_LABELS[incident.event_type ?? ""] ?? { label: "Incidente", color: "text-[#94A3B8]", bg: "bg-[#252B3B] border-[#334155]" };
    const date = new Date(incident.created_at);
    const dateStr = isNaN(date.getTime()) ? "—" : date.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

    return (
        <div className="min-h-dvh bg-[#1A1F2E] flex flex-col pb-8" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Header */}
            <header className="flex items-center gap-3 px-4 py-3 bg-[#1A1F2E] border-b border-[#334155] sticky top-0 z-40">
                <button onClick={() => router.back()} className="min-w-[44px] min-h-[44px] flex items-center text-white">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm ${typeInfo.color}`}>{typeInfo.label}</p>
                    <p className="text-[#64748B] text-xs truncate">{dateStr}</p>
                </div>
                <div className="flex items-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 text-[#F59E0B] animate-spin" />}
                    {saved && !saving && <span className="text-emerald-400 text-xs font-semibold">Guardado ✓</span>}
                    {isPending ? (
                        <button onClick={handleSave} disabled={saving}
                            className="flex items-center gap-1.5 px-3 py-2 bg-[#F59E0B] text-black text-xs font-bold rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-50">
                            <Save className="w-3.5 h-3.5" />Guardar
                        </button>
                    ) : (
                        <div className="flex items-center gap-1 px-2.5 py-1.5 bg-green-900/20 border border-green-700/30 rounded-lg">
                            <Lock className="w-3 h-3 text-green-400" />
                            <span className="text-green-400 text-xs font-bold">Solo lectura</span>
                        </div>
                    )}
                </div>
            </header>

            <main className="flex-1 px-4 py-4 space-y-4 max-w-lg mx-auto w-full">
                {/* Status banner */}
                {isPending && (
                    <div className="flex items-center gap-3 bg-amber-900/20 border border-amber-700/30 rounded-2xl px-4 py-3">
                        <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <p className="text-amber-300 text-sm">
                            <span className="font-bold">Pendiente de sincronización</span> — puedes editar este reporte antes de que se envíe.
                        </p>
                    </div>
                )}
                {!isPending && (
                    <div className="flex items-center gap-3 bg-green-900/10 border border-green-700/20 rounded-2xl px-4 py-3">
                        <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <p className="text-green-300 text-sm">
                            <span className="font-bold">Sincronizado</span> — este reporte ya fue enviado al servidor.
                        </p>
                    </div>
                )}

                {/* Type badge */}
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${typeInfo.bg}`}>
                    <AlertTriangle className={`w-4 h-4 ${typeInfo.color}`} />
                    <span className={`font-bold text-sm ${typeInfo.color}`}>{typeInfo.label}</span>
                </div>

                {/* Metadata */}
                <Section title="Información del reporte">
                    <InfoRow icon={<Calendar className="w-4 h-4 text-[#64748B]" />} label="Fecha y hora" value={dateStr} />
                    <InfoRow icon={<User className="w-4 h-4 text-[#64748B]" />} label="Reportado por"
                        value={incident.reported_by_name ? `${incident.reported_by_name}${incident.reported_by_role ? ` — ${incident.reported_by_role}` : ""}` : undefined} />
                    {incident.photo_lat && incident.photo_lng && (
                        <InfoRow icon={<MapPin className="w-4 h-4 text-[#64748B]" />} label="Ubicación GPS"
                            value={`${incident.photo_lat.toFixed(4)}° N, ${Math.abs(incident.photo_lng).toFixed(4)}° W`} />
                    )}
                </Section>

                {/* Photo */}
                {incident.photo_blob && (
                    <Section title="Evidencia fotográfica">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={incident.photo_blob} alt="Evidencia" className="w-full rounded-xl object-cover max-h-64" />
                    </Section>
                )}

                {/* Reporter narration */}
                <Section title="Relato de los hechos (quien reporta)">
                    {isPending ? (
                        <EditableField label="Descripción" value={reporterDesc} multiline
                            placeholder="Describe con tus palabras qué pasó, cuándo, cómo y dónde…"
                            onChange={(v) => { setReporterDesc(v); scheduleAutoSave(); }} />
                    ) : (
                        <div className="flex items-start gap-3">
                            <FileText className="w-4 h-4 text-[#64748B] mt-0.5 flex-shrink-0" />
                            <p className="text-white text-sm leading-relaxed">{reporterDesc || "Sin descripción registrada"}</p>
                        </div>
                    )}
                    {/* Voice audio playback if exists */}
                    {incident.reporter_voice_blob && (
                        <div>
                            <p className="text-[#64748B] text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                                <Mic className="w-3 h-3" /> Audio original
                            </p>
                            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                            <audio controls src={incident.reporter_voice_blob} className="w-full h-10" />
                        </div>
                    )}
                </Section>

                {/* Witness */}
                {(incident.witness_name || incident.witness_description || isPending) && (
                    <Section title="Declaración del testigo">
                        {isPending ? (
                            <div className="space-y-3">
                                <EditableField label="Nombre del testigo" value={witnessName}
                                    placeholder="Nombre completo del testigo"
                                    onChange={(v) => { setWitnessName(v); scheduleAutoSave(); }} />
                                <EditableField label="Declaración" value={witnessDesc} multiline
                                    placeholder="Relato del testigo sobre lo que presenció…"
                                    onChange={(v) => { setWitnessDesc(v); scheduleAutoSave(); }} />
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {incident.witness_name && (
                                    <InfoRow icon={<User className="w-4 h-4 text-[#64748B]" />} label="Testigo" value={incident.witness_name} />
                                )}
                                {incident.witness_description && (
                                    <div className="flex items-start gap-3">
                                        <FileText className="w-4 h-4 text-[#64748B] mt-0.5 flex-shrink-0" />
                                        <p className="text-white text-sm leading-relaxed">{incident.witness_description}</p>
                                    </div>
                                )}
                            </div>
                        )}
                        {incident.witness_voice_blob && (
                            <div>
                                <p className="text-[#64748B] text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <Mic className="w-3 h-3" /> Audio testigo
                                </p>
                                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                                <audio controls src={incident.witness_voice_blob} className="w-full h-10" />
                            </div>
                        )}
                    </Section>
                )}

                {/* Signature preview */}
                {incident.signature_blob && (
                    <Section title="Firma del reportante">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={incident.signature_blob} alt="Firma" className="bg-white rounded-xl p-2 max-h-24 object-contain" />
                    </Section>
                )}
            </main>
        </div>
    );
}
