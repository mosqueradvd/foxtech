/**
 * app/dashboard/events/[id]/page.tsx
 * Módulo 2 — Caracterización y Clasificación
 * 3-step wizard for the SST consultant to classify an event legally (FURAT).
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    ArrowLeft, ArrowRight, Check, Save, User, MapPin, Activity,
    AlertTriangle, Image as ImageIcon, FileText, Loader2, ChevronRight, ClipboardList, Sparkles
} from "lucide-react";
import { supabase, type Event, type Worker } from "@/lib/supabase";
import { WorkerSelector } from "@/components/module2/WorkerSelector";
import { LocationSelector } from "@/components/module2/LocationSelector";
import { InjuryClassifier } from "@/components/module2/InjuryClassifier";
import { CIESearchInput, type CIECodeItem } from "@/components/ui/CIESearchInput";
import { type CIECode } from "@/lib/supabase";
import {
    EVENT_CLASSIFICATIONS,
    EPS_LIST, ARL_LIST, SEX_OPTIONS, EMPLOYMENT_TYPES, EDUCATION_LEVELS,
    getDayOfWeek, calcSeniorityMonths,
} from "@/lib/constants/colombia";

const STEPS = [
    { id: 1, label: "Trabajador", icon: User, description: "Datos del trabajador involucrado" },
    { id: 2, label: "Evento", icon: MapPin, description: "Clasificación y lugar del evento" },
    { id: 3, label: "Lesión", icon: Activity, description: "Clasificación de la lesión (FURAT)" },
] as const;

type EventFormData = Partial<Event> & {
    disability_date?: string;
    cie_version?: "CIE-10" | "CIE-11";
    cie_codes?: CIECodeItem[];
    eps_id?: string;
};

// ─── Classification badge ─────────────────────────────────────────────────────
function ClassificationStatusBadge({ status }: { status?: string }) {
    const map: Record<string, { label: string; cls: string }> = {
        pending: { label: "PENDIENTE CLASIFICAR", cls: "bg-amber-900/40 text-amber-400 border-amber-700/30" },
        classified: { label: "CLASIFICADO", cls: "bg-blue-900/40 text-blue-400 border-blue-700/30" },
        investigated: { label: "INVESTIGADO", cls: "bg-green-900/40 text-green-400 border-green-700/30" },
    };
    const s = map[status ?? "pending"] ?? map.pending;
    return (
        <span className={`inline-flex items-center self-center leading-none px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider ${s.cls}`}>
            {s.label}
        </span>
    );
}

// ─── Original report card ─────────────────────────────────────────────────────
function OriginalReportCard({ event }: { event: Event }) {
    const typeLabel: Record<string, string> = {
        casi_accidente: "Casi-Accidente",
        accidente: "Accidente / Lesión",
        accidente_grave: "Accidente Grave",
        accidente_fatal: "Accidente Fatal",
        condicion_insegura: "Condición Insegura",
        enfermedad_laboral: "Enfermedad Laboral",
        incidente: "Incidente",
    };
    return (
        <div className="bg-[#1A2538] border border-[#334155] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#F59E0B]" />
                    Reporte Preliminar
                </h3>

            </div>

            <div className="grid grid-cols-3 gap-4">
                {/* Description */}
                <div className="col-span-2 space-y-1">
                    <p className="text-[#64748B] text-[10px] uppercase tracking-wider font-bold">Descripción</p>
                    <p className="text-white text-sm leading-relaxed">{event.description || "Sin descripción"}</p>

                    {event.worker_version && (
                        <>
                            <p className="text-[#64748B] text-[10px] uppercase tracking-wider font-bold mt-3">Versión del trabajador</p>
                            <p className="text-[#94A3B8] text-sm leading-relaxed italic">"{event.worker_version}"</p>
                        </>
                    )}

                    {event.witness_names && (
                        <>
                            <p className="text-[#64748B] text-[10px] uppercase tracking-wider font-bold mt-3">Testigos reportados</p>
                            <p className="text-[#94A3B8] text-sm leading-relaxed">👤 {event.witness_names}</p>
                        </>
                    )}

                    <div className="flex flex-wrap gap-2 mt-3">
                        {event.event_type && (
                            <span className="px-2 py-1 bg-amber-900/30 border border-amber-700/30 text-amber-400 text-[11px] font-bold rounded-lg">
                                {typeLabel[event.event_type] ?? event.event_type}
                            </span>
                        )}
                        {event.reported_by_name && (
                            <span className="px-2 py-1 bg-[#252B3B] border border-[#334155] text-[#64748B] text-[11px] rounded-lg">
                                Reportó: {event.reported_by_name}
                            </span>
                        )}
                        {event.location_name && (
                            <span className="px-2 py-1 bg-[#252B3B] border border-[#334155] text-[#64748B] text-[11px] rounded-lg flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {event.location_name}
                            </span>
                        )}
                    </div>
                </div>

                {/* Photo thumbnail */}
                <div className="flex flex-col gap-2">
                    {event.photo_url ? (
                        <div className="relative rounded-xl overflow-hidden aspect-square bg-[#252B3B]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={event.photo_url} alt="Evidencia" className="w-full h-full object-cover" />
                            {event.photo_lat && (
                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 flex items-center gap-1">
                                    <span className="text-green-400 text-[10px] font-bold">📍 GPS verificado</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="aspect-square bg-[#252B3B] rounded-xl flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-[#334155]" />
                        </div>
                    )}
                    {event.signature_url && (
                        <div className="relative rounded-xl overflow-hidden bg-white/5 border border-[#334155] aspect-video">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={event.signature_url} alt="Firma" className="w-full h-full object-contain p-1" />
                            <p className="text-[#64748B] text-[10px] text-center pb-1">Firma reportante</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Step 1: Worker Data ─────────────────────────────────────────────────────
function Step1Worker({
    event,
    selectedWorker,
    formData,
    onWorkerSelect,
    onFieldChange,
}: {
    event: Event;
    selectedWorker: Worker | null;
    formData: EventFormData;
    onWorkerSelect: (w: Worker | null) => void;
    onFieldChange: (f: keyof EventFormData, v: unknown) => void;
}) {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-white font-bold mb-1">Trabajador Involucrado</h3>
                <p className="text-[#64748B] text-sm">Busca al trabajador o regístralo si no existe aún en el sistema.</p>
            </div>

            <WorkerSelector
                companyId={event.company_id}
                selectedWorker={selectedWorker}
                onSelect={onWorkerSelect}
            />

            {/* Manual override fields — always editable */}
            <div className="space-y-1">
                <h4 className="text-[#64748B] text-xs uppercase tracking-wider font-bold pt-2">
                    {selectedWorker ? "Verificar / Ajustar datos para este evento" : "O ingresa los datos manualmente"}
                </h4>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[#64748B] text-xs uppercase tracking-wider font-bold mb-1 block">Nombre completo *</label>
                    <input type="text" value={formData.worker_name ?? ""} onChange={(e) => onFieldChange("worker_name", e.target.value)}
                        className="w-full bg-[#252B3B] border border-[#334155] rounded-xl px-3 py-3 text-white text-sm outline-none focus:border-[#F59E0B]" />
                </div>
                <div>
                    <label className="text-[#64748B] text-xs uppercase tracking-wider font-bold mb-1 block">Cédula</label>
                    <input type="text" value={formData.worker_cedula ?? ""} onChange={(e) => onFieldChange("worker_cedula", e.target.value)}
                        className="w-full bg-[#252B3B] border border-[#334155] rounded-xl px-3 py-3 text-white text-sm outline-none focus:border-[#F59E0B]" />
                </div>
                <div>
                    <label className="text-[#64748B] text-xs uppercase tracking-wider font-bold mb-1 block">Fecha nacimiento</label>
                    <input type="date" value={formData.worker_birth_date ?? ""} onChange={(e) => onFieldChange("worker_birth_date", e.target.value)}
                        className="w-full bg-[#252B3B] border border-[#334155] rounded-xl px-3 py-3 text-white text-sm outline-none focus:border-[#F59E0B] cursor-pointer" />
                </div>
                <div>
                    <label className="text-[#64748B] text-xs uppercase tracking-wider font-bold mb-1 block">Sexo</label>
                    <select value={formData.worker_sex ?? ""} onChange={(e) => onFieldChange("worker_sex", e.target.value)}
                        className="w-full bg-[#252B3B] border border-[#334155] rounded-xl px-3 py-3 text-white text-sm outline-none focus:border-[#F59E0B] cursor-pointer">
                        <option value="">Seleccionar</option>
                        {SEX_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[#64748B] text-xs uppercase tracking-wider font-bold mb-1 block">EPS</label>
                    <select value={formData.worker_eps ?? ""} onChange={(e) => onFieldChange("worker_eps", e.target.value)}
                        className="w-full bg-[#252B3B] border border-[#334155] rounded-xl px-3 py-3 text-white text-sm outline-none focus:border-[#F59E0B] cursor-pointer">
                        <option value="">Seleccionar EPS</option>
                        {EPS_LIST.map((eps) => <option key={eps} value={eps}>{eps}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[#64748B] text-xs uppercase tracking-wider font-bold mb-1 block">ARL</label>
                    <select value={formData.worker_arl ?? ""} onChange={(e) => onFieldChange("worker_arl", e.target.value)}
                        className="w-full bg-[#252B3B] border border-[#334155] rounded-xl px-3 py-3 text-white text-sm outline-none focus:border-[#F59E0B] cursor-pointer">
                        <option value="">Seleccionar ARL</option>
                        {ARL_LIST.map((arl) => <option key={arl} value={arl}>{arl}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[#64748B] text-xs uppercase tracking-wider font-bold mb-1 block">Cargo</label>
                    <input type="text" value={formData.worker_job_title ?? ""} onChange={(e) => onFieldChange("worker_job_title", e.target.value)}
                        placeholder="Ej: Operador de montacargas"
                        className="w-full bg-[#252B3B] border border-[#334155] rounded-xl px-3 py-3 text-white text-sm outline-none focus:border-[#F59E0B] placeholder:text-[#64748B]" />
                </div>
                <div>
                    <label className="text-[#64748B] text-xs uppercase tracking-wider font-bold mb-1 block">Tipo de contrato</label>
                    <select value={formData.worker_employment_type ?? ""} onChange={(e) => onFieldChange("worker_employment_type", e.target.value)}
                        className="w-full bg-[#252B3B] border border-[#334155] rounded-xl px-3 py-3 text-white text-sm outline-none focus:border-[#F59E0B] cursor-pointer">
                        <option value="">Seleccionar</option>
                        {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[#64748B] text-xs uppercase tracking-wider font-bold mb-1 block">Nivel educativo</label>
                    <select value={formData.worker_education_level ?? ""} onChange={(e) => onFieldChange("worker_education_level", e.target.value)}
                        className="w-full bg-[#252B3B] border border-[#334155] rounded-xl px-3 py-3 text-white text-sm outline-none focus:border-[#F59E0B] cursor-pointer">
                        <option value="">Seleccionar</option>
                        {EDUCATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[#64748B] text-xs uppercase tracking-wider font-bold mb-1 block">Fecha inicio contrato</label>
                    <input type="date" value={formData.worker_contract_start ?? ""} onChange={(e) => {
                        const v = e.target.value;
                        onFieldChange("worker_contract_start", v);
                        if (v) onFieldChange("worker_seniority_months", calcSeniorityMonths(v));
                    }}
                        className="w-full bg-[#252B3B] border border-[#334155] rounded-xl px-3 py-3 text-white text-sm outline-none focus:border-[#F59E0B] cursor-pointer" />
                </div>
                {(formData.worker_seniority_months !== undefined && formData.worker_seniority_months !== null) && (
                    <div className="flex items-center gap-2 col-span-2">
                        <span className="text-[#64748B] text-xs">Antigüedad calculada:</span>
                        <span className="text-[#F59E0B] text-xs font-bold bg-amber-900/20 border border-amber-700/20 px-3 py-1 rounded-full">
                            {formData.worker_seniority_months} meses ({Math.floor((formData.worker_seniority_months) / 12)}a {formData.worker_seniority_months % 12}m)
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Step 2: Event Classification ────────────────────────────────────────────
function Step2Event({
    formData,
    onFieldChange,
}: {
    formData: EventFormData;
    onFieldChange: (f: keyof EventFormData, v: unknown) => void;
}) {
    const [isImproving, setIsImproving] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isError, setIsError] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: "info" | "error" } | null>(null);

    const selectedClass = EVENT_CLASSIFICATIONS.find((c) => c.value === formData.classification);

    // Auto compute day when date changes
    function handleDateChange(v: string) {
        onFieldChange("event_date", v);
        if (v) onFieldChange("event_day_of_week", getDayOfWeek(v));
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-white font-bold mb-1">Clasificación Legal del Evento</h3>
                <p className="text-[#64748B] text-sm">Selecciona la clasificación definitiva según la normativa colombiana (Ley 1562/2012, Dec. Ley 1295/1994).</p>
            </div>

            {/* Classification cards */}
            <div className="grid grid-cols-3 gap-2">
                {EVENT_CLASSIFICATIONS.map((cls) => {
                    const isSelected = formData.classification === cls.value;
                    const colorMap: Record<string, string> = {
                        amber: "border-amber-500/60 bg-amber-900/20",
                        yellow: "border-yellow-500/60 bg-yellow-900/20",
                        orange: "border-orange-500/60 bg-orange-900/20",
                        red: "border-red-500/60 bg-red-900/20",
                        purple: "border-purple-500/60 bg-purple-900/20",
                        green: "border-green-500/60 bg-green-900/20",
                        blue: "border-blue-500/60 bg-blue-900/20",
                    };
                    return (
                        <button
                            key={cls.value}
                            onClick={() => onFieldChange("classification", cls.value)}
                            className={[
                                "text-left p-3 rounded-xl border-2 transition-all cursor-pointer",
                                isSelected
                                    ? colorMap[cls.color] ?? "border-[#F59E0B]/60 bg-amber-900/20"
                                    : "border-[#334155] bg-[#252B3B] hover:border-[#64748B]",
                            ].join(" ")}
                        >
                            <p className={`font-bold text-xs leading-tight ${isSelected ? "text-white" : "text-[#94A3B8]"}`}>
                                {cls.label}
                            </p>
                        </button>
                    );
                })}
            </div>

            {selectedClass && (
                <div className="bg-[#1A2538] border border-[#334155] rounded-xl p-4">
                    <p className="text-[#94A3B8] text-sm leading-relaxed">{selectedClass.description}</p>
                    {(selectedClass.value === "ACCIDENTE_TRABAJO_GRAVE" || selectedClass.value === "ACCIDENTE_TRABAJO_FATAL") && (
                        <div className="mt-3 flex items-start gap-2 bg-red-900/20 border border-red-700/30 rounded-lg p-3">
                            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                            <p className="text-red-400 text-xs font-semibold">
                                {selectedClass.value === "ACCIDENTE_TRABAJO_FATAL"
                                    ? "⚠️ Notificación INMEDIATA al Ministerio de Trabajo obligatoria."
                                    : "⚠️ Notificación al Ministerio de Trabajo en máximo 2 días hábiles."}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Date / time */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[#64748B] text-xs uppercase tracking-wider font-bold mb-1 block">Fecha exacta del evento *</label>
                    <input type="date" value={formData.event_date ?? ""}
                        onChange={(e) => handleDateChange(e.target.value)}
                        className="w-full bg-[#252B3B] border border-[#334155] rounded-xl px-3 py-3 text-white text-sm outline-none focus:border-[#F59E0B] cursor-pointer" />
                </div>
                <div>
                    <label className="text-[#64748B] text-xs uppercase tracking-wider font-bold mb-1 block">Hora exacta del evento *</label>
                    <input type="time" value={formData.event_time ?? ""}
                        onChange={(e) => onFieldChange("event_time", e.target.value)}
                        className="w-full bg-[#252B3B] border border-[#334155] rounded-xl px-3 py-3 text-white text-sm outline-none focus:border-[#F59E0B] cursor-pointer" />
                </div>
                {formData.event_day_of_week && (
                    <div className="col-span-2 flex items-center gap-2">
                        <span className="text-[#64748B] text-xs">Día de la semana:</span>
                        <span className="text-[#F59E0B] text-xs font-bold bg-amber-900/20 border border-amber-700/20 px-3 py-1 rounded-full">
                            {formData.event_day_of_week}
                        </span>
                    </div>
                )}
            </div>

            {/* Location */}
            <LocationSelector
                department={formData.event_department ?? ""}
                city={formData.event_city ?? ""}
                address={formData.event_address ?? ""}
                eventDate={formData.event_date ?? ""}
                onDepartmentChange={(v) => onFieldChange("event_department", v)}
                onCityChange={(v) => onFieldChange("event_city", v)}
                onAddressChange={(v) => onFieldChange("event_address", v)}
            />

            {/* Description Textarea with AI Assistant */}
            <div className="space-y-2">
                <label className="text-[#64748B] text-xs uppercase tracking-wider font-bold mb-1 block">Descripción del evento *</label>
                <textarea
                    value={formData.description ?? ""}
                    onChange={(e) => onFieldChange("description", e.target.value)}
                    placeholder="Describe qué pasó en tus propias palabras o el relato del trabajador..."
                    className="w-full bg-[#252B3B] border border-[#334155] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#F59E0B] placeholder:text-[#334155] resize-none"
                    rows={4}
                    disabled={isImproving}
                />
                <div className="flex items-center justify-between">
                    <p className="text-[#64748B] text-[10px]">
                        Texto sugerido por IA — revisa y ajusta según los hechos reales
                    </p>
                    <button
                        type="button"
                        disabled={isImproving}
                        onClick={async () => {
                            if (!formData.description) {
                                setToast({ message: "Escribe algo primero para mejorar", type: "info" });
                                setTimeout(() => setToast(null), 3000);
                                return;
                            }
                            setIsImproving(true);
                            setIsError(false);
                            setIsSuccess(false);
                            try {
                                const res = await fetch("/api/ai/narrativa", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ tipo: "narrativa", texto: formData.description })
                                });
                                const data = await res.json();
                                if (data.texto) {
                                    onFieldChange("description", data.texto);
                                    setIsSuccess(true);
                                    setTimeout(() => setIsSuccess(false), 2000);
                                } else {
                                    setIsError(true);
                                }
                            } catch (e) {
                                console.error("Error al mejorar redacción:", e);
                                setIsError(true);
                            } finally {
                                setIsImproving(false);
                            }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                            isImproving ? "bg-amber-900/20 border-amber-700/30 text-amber-400 cursor-not-allowed" :
                            isSuccess ? "bg-emerald-900/20 border-emerald-700/30 text-emerald-400" :
                            isError ? "bg-red-900/20 border-red-700/30 text-red-400" :
                            "bg-[#1A2538] border-[#334155] hover:border-[#F59E0B]/50 text-white hover:text-[#F59E0B]"
                        }`}
                    >
                        {isImproving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 
                         isSuccess ? <Check className="w-3.5 h-3.5" /> :
                         <Sparkles className="w-3.5 h-3.5" />}
                        {isImproving ? "Mejorando..." : isSuccess ? "Texto mejorado" : isError ? "Error — reintentar" : "Mejorar redacción"}
                    </button>
                </div>
            </div>

            {/* Toast Notification */}
            {toast && (
                <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-[#1A2538] border border-[#334155] rounded-xl px-4 py-2 flex items-center gap-2 shadow-lg z-50">
                    <span className="text-amber-400 text-xs font-semibold">{toast.message}</span>
                </div>
            )}
        </div>
    );
}

// ─── Step 3: Injury Classification ──────────────────────────────────────────
function Step3Injury({
    formData,
    onFieldChange,
}: {
    formData: EventFormData;
    onFieldChange: (f: keyof EventFormData, v: unknown) => void;
}) {
    const classification = formData.classification ?? "";
    const isAT = classification.startsWith("ACCIDENTE_TRABAJO");
    const isEL = classification === "ENFERMEDAD_LABORAL";

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-white font-bold mb-1">Clasificación de la Lesión</h3>
                <p className="text-[#64748B] text-sm">Campos del FURAT (Formulario Único de Reporte de Accidentes de Trabajo).</p>
            </div>

            {!isAT && !isEL && (
                <div className="bg-[#252B3B] border border-[#334155] rounded-xl p-4 text-[#64748B] text-sm">
                    ℹ️ Los campos de lesión aplican principalmente para Accidentes de Trabajo y Enfermedades Laborales.
                    Puedes completarlos de todas formas si aplica.
                </div>
            )}

            <InjuryClassifier
                data={{
                    injury_nature: formData.injury_nature,
                    body_part: formData.body_part,
                    accident_mechanism: formData.accident_mechanism,
                    hazard_type: formData.hazard_type,
                    disability_days: formData.disability_days ?? 0,
                }}
                onChange={(field, value) => onFieldChange(field as keyof EventFormData, value)}
                showDisabilityDays={false}
            />

            {/* Incapacidad EPS (Solo para AT y EL) */}
            {(isAT || isEL) && (
                <div className="bg-[#1A2538] border border-[#334155] rounded-xl p-5 space-y-4">
                    <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-2">Incapacidad Médica (EPS)</h4>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[#64748B] text-xs uppercase tracking-wider font-bold mb-1 block">
                                Fecha de Incapacidad
                            </label>
                            <input
                                type="date"
                                value={formData.disability_date ?? ""}
                                onChange={(e) => onFieldChange("disability_date", e.target.value)}
                                className="w-full bg-[#252B3B] border border-[#334155] rounded-xl px-3 py-3 text-white text-sm outline-none focus:border-[#F59E0B] cursor-pointer"
                            />
                        </div>
                        <div>
                            <label className="text-[#64748B] text-xs uppercase tracking-wider font-bold mb-1 block">
                                EPS que la expide
                            </label>
                            <select
                                value={formData.eps_id ?? ""}
                                onChange={(e) => onFieldChange("eps_id", e.target.value)}
                                className="w-full bg-[#252B3B] border border-[#334155] rounded-xl px-3 py-3 text-white text-sm outline-none focus:border-[#F59E0B] cursor-pointer"
                            >
                                <option value="">Seleccionar EPS</option>
                                {EPS_LIST.map((eps) => <option key={eps} value={eps}>{eps}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="text-[#64748B] text-xs uppercase tracking-wider font-bold mb-1 block">
                                Días de Incapacidad Médica
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    min="0"
                                    max="999"
                                    value={formData.disability_days ?? ""}
                                    onChange={(e) => onFieldChange("disability_days", parseInt(e.target.value) || 0)}
                                    placeholder="0"
                                    className="w-32 bg-[#252B3B] border border-[#334155] rounded-xl px-3 py-3 text-white text-sm outline-none focus:border-[#F59E0B] transition-colors text-center font-bold"
                                />
                                <span>días</span>
                            </div>
                        </div>
                        <div className="col-span-2 space-y-2 mt-2">
                            <label className="text-[#64748B] text-xs uppercase tracking-wider font-bold mb-1 block">
                                Códigos Diagnóstico (CIE)
                            </label>
                            <CIESearchInput
                                value={formData.cie_codes || []}
                                onChange={(codes: CIECodeItem[]) => onFieldChange("cie_codes", codes)}
                                version={formData.cie_version || "CIE-11"}
                                onVersionChange={(v: "CIE-10" | "CIE-11") => onFieldChange("cie_version", v)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Witnesses */}
            <div>
                <label className="text-[#64748B] text-xs uppercase tracking-wider font-bold mb-1 block">Nombres de testigos</label>
                <input
                    type="text"
                    value={formData.witness_names ?? ""}
                    onChange={(e) => onFieldChange("witness_names", e.target.value)}
                    placeholder="Ej: Pedro Ramírez, Ana López"
                    className="w-full bg-[#252B3B] border border-[#334155] rounded-xl px-3 py-3 text-white text-sm outline-none focus:border-[#F59E0B] placeholder:text-[#64748B]"
                />
                <p className="text-[#64748B] text-xs mt-1">Separar con comas si hay varios</p>
            </div>
        </div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function EventCharacterizationPage() {
    const router = useRouter();
    const params = useParams();
    const eventId = params?.id as string;

    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [step, setStep] = useState(1);
    const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
    const [formData, setFormData] = useState<EventFormData>({});

    const loadEvent = useCallback(async () => {
        setLoading(true);
        // 1. Fetch event
        const { data: eventData, error: eventError } = await supabase
            .from("incidents")
            .select("*")
            .eq("id", eventId)
            .single();

        // 2. Fetch disability records explicitly to avoid relation issues
        const { data: disabilityData } = await supabase
            .from("disability_records")
            .select("*")
            .eq("event_id", eventId)
            .maybeSingle();

        if (!eventError && eventData) {
            setEvent(eventData as Event);
            // Pre-populate form with any existing classification data
            let initialClassification = eventData.classification;
            if (!initialClassification && eventData.event_type) {
                const typeMap: Record<string, string> = {
                    casi_accidente: "CASI_ACCIDENTE",
                    incidente: "INCIDENTE_SIN_LESION",
                    condicion_insegura: "CONDICION_INSEGURA",
                    accidente: "ACCIDENTE_TRABAJO",
                    accidente_grave: "ACCIDENTE_TRABAJO_GRAVE",
                    accidente_fatal: "ACCIDENTE_TRABAJO_FATAL",
                    enfermedad_laboral: "ENFERMEDAD_LABORAL",
                    impacto_ambiental: "IMPACTO_AMBIENTAL",
                    dano_propiedad: "DANO_PROPIEDAD",
                };
                initialClassification = typeMap[eventData.event_type];
            }

            setFormData({
                worker_id: eventData.worker_id,
                worker_name: eventData.worker_name,
                worker_cedula: eventData.worker_cedula,
                worker_birth_date: eventData.worker_birth_date,
                worker_sex: eventData.worker_sex,
                worker_eps: eventData.worker_eps,
                worker_arl: eventData.worker_arl,
                worker_job_title: eventData.worker_job_title,
                worker_employment_type: eventData.worker_employment_type,
                worker_seniority_months: eventData.worker_seniority_months,
                worker_contract_start: eventData.worker_contract_start,
                worker_education_level: eventData.worker_education_level,
                classification: initialClassification,
                event_date: eventData.event_date,
                event_time: eventData.event_time,
                event_day_of_week: eventData.event_day_of_week,
                event_department: eventData.event_department,
                event_city: eventData.event_city,
                event_address: eventData.event_address,
                disability_days: eventData.disability_days,
                injury_nature: eventData.injury_nature,
                body_part: eventData.body_part,
                accident_mechanism: eventData.accident_mechanism,
                hazard_type: eventData.hazard_type,
                witness_names: eventData.witness_names,
                description: eventData.description || "",

                // Disability records merge
                disability_date: disabilityData?.disability_date || "",
                eps_id: disabilityData?.eps_id || eventData.worker_eps || "",
                cie_version: disabilityData?.cie_version || "CIE-11",
                cie_codes: disabilityData?.cie_codes || [],
            });
        }
        setLoading(false);
    }, [eventId]);

    useEffect(() => { loadEvent(); }, [loadEvent]);

    function handleFieldChange(field: keyof EventFormData, value: unknown) {
        setFormData((prev) => ({ ...prev, [field]: value }));
    }

    function handleWorkerSelect(worker: Worker | null) {
        setSelectedWorker(worker);
        if (worker) {
            setFormData((prev) => ({
                ...prev,
                worker_id: worker.id,
                worker_name: worker.full_name,
                worker_cedula: worker.cedula,
                worker_birth_date: worker.birth_date,
                worker_sex: worker.sex,
                worker_eps: worker.eps,
                worker_arl: worker.arl, // ARL can be from worker directly if they are a contractor
                worker_job_title: worker.job_title,
                worker_employment_type: worker.employment_type,
                worker_education_level: worker.education_level,
                worker_contract_start: worker.hire_date,
                worker_seniority_months: worker.hire_date ? calcSeniorityMonths(worker.hire_date) : undefined,
            }));
        }
    }

    async function saveClassification() {
        if (!eventId) return;
        setSaving(true);

        const { disability_date, eps_id, cie_version, cie_codes, ...eventDataToSave } = formData;

        const { error: eventError } = await supabase
            .from("incidents")
            .update({
                ...eventDataToSave,
                classification_status: "classified",
                classified_at: new Date().toISOString(),
                classified_by: "Consultor SST", // would come from auth session
                updated_at: new Date().toISOString(),
            })
            .eq("id", eventId);

        // Upsert disability_record checking explicitly for "error"
        const isATorEL = eventDataToSave.classification?.startsWith("ACCIDENTE_TRABAJO") || eventDataToSave.classification === "ENFERMEDAD_LABORAL";
        if (!eventError && isATorEL) {
            await supabase.from("disability_records").delete().eq("event_id", eventId); // Ensure uniqueness

            const { error: insertError } = await supabase.from("disability_records").insert({
                event_id: eventId,
                disability_date: disability_date || eventDataToSave.event_date || new Date().toISOString().slice(0, 10),
                days_count: formData.disability_days ?? 0,
                eps_id: eps_id || eventDataToSave.worker_eps,
                cie_version: cie_version || "CIE-11",
                cie_codes: cie_codes || []
            });

            if (insertError) {
                console.error("Error saving disability records:", insertError);
            }
        }

        setSaving(false);
        if (!eventError) {
            setSaved(true);
            setTimeout(() => {
                router.push("/dashboard");
            }, 1500);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#1A1F2E]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-[#F59E0B] animate-spin" />
                    <p className="text-[#64748B] text-sm">Cargando evento...</p>
                </div>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#1A1F2E]">
                <div className="text-center space-y-3">
                    <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
                    <p className="text-white font-bold">Evento no encontrado</p>
                    <button onClick={() => router.push("/dashboard")} className="text-[#F59E0B] text-sm underline">
                        Volver al panel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto bg-[#1A1F2E] flex flex-col">
            {/* ── HEADER ── */}
            <header className="sticky top-0 z-20 bg-[#1A1F2E]/95 backdrop-blur border-b border-[#334155]">
                <div className="max-w-6xl mx-auto px-6 relative">
                    {/* Row 1: Title & Actions */}
                    <div className="py-4 flex items-center gap-4">
                        <button
                            onClick={() => router.push("/dashboard")}
                            className="w-9 h-9 rounded-xl bg-[#1A1F2E] border border-[#334155] flex items-center justify-center hover:border-[#64748B] transition-colors flex-shrink-0 cursor-pointer"
                        >
                            <ArrowLeft className="w-4 h-4 text-[#64748B]" />
                        </button>
                        <div>
                            <h1 className="text-white font-black text-base leading-none">
                                Caracterización y Clasificación
                            </h1>
                            <p className="text-[#64748B] text-xs mt-0.5">ID: {eventId.slice(0, 8)}…</p>
                        </div>
                    </div>

                    {/* Step indicator */}
                    <div className="py-3 flex items-center gap-0">
                        {STEPS.map((s, idx) => {
                            const Icon = s.icon;
                            const isDone = step > s.id;
                            const isActive = step === s.id;
                            return (
                                <div key={s.id} className="flex items-center">
                                    <button
                                        onClick={() => setStep(s.id)}
                                        className={[
                                            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer",
                                            isActive ? "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30" : "",
                                            isDone ? "text-green-400" : "",
                                            !isActive && !isDone ? "text-[#64748B] hover:text-white" : "",
                                        ].join(" ")}
                                    >
                                        {isDone
                                            ? <Check className="w-4 h-4 text-green-400" />
                                            : <Icon className="w-4 h-4" />
                                        }
                                        <span>{s.label}</span>
                                    </button>
                                    {idx < STEPS.length - 1 && (
                                        <ChevronRight className="w-4 h-4 text-[#334155] mx-1" />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Absolute-Centered Badge to full height box */}
                    <div className="absolute right-6 top-1/2 -translate-y-1/2">
                        <ClassificationStatusBadge status={event.classification_status} />
                    </div>
                </div>
            </header>

            {/* ── MAIN LAYOUT ── */}
            <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-6 grid grid-cols-[1fr_380px] gap-6">
                {/* Left: form */}
                <div className="space-y-6">
                    <div className="bg-[#252B3B] border border-[#334155] rounded-2xl p-6 min-h-[480px]">
                        {step === 1 && (
                            <Step1Worker
                                event={event}
                                selectedWorker={selectedWorker}
                                formData={formData}
                                onWorkerSelect={handleWorkerSelect}
                                onFieldChange={handleFieldChange}
                            />
                        )}
                        {step === 2 && (
                            <Step2Event formData={formData} onFieldChange={handleFieldChange} />
                        )}
                        {step === 3 && (
                            <Step3Injury formData={formData} onFieldChange={handleFieldChange} />
                        )}
                    </div>

                    {/* Navigation buttons */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setStep((s) => Math.max(1, s - 1))}
                            disabled={step === 1}
                            className="flex items-center gap-2 text-[#64748B] font-semibold text-sm hover:text-white transition-colors disabled:opacity-30 cursor-pointer"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Anterior
                        </button>

                        {step < 3 ? (
                            <button
                                onClick={() => setStep((s) => Math.min(3, s + 1))}
                                className="flex items-center gap-2 bg-[#F59E0B] text-black font-bold text-sm px-6 py-3 rounded-xl hover:bg-amber-400 transition-colors cursor-pointer"
                            >
                                Siguiente
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={saveClassification}
                                disabled={saving || saved}
                                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors disabled:opacity-70 cursor-pointer"
                            >
                                {saving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : saved ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                {saved ? "¡Clasificado! Redirigiendo..." : saving ? "Guardando..." : "Guardar y Clasificar"}
                            </button>
                        )}
                    </div>
                </div>

                {/* Right: original report (sticky reference) */}
                <div className="space-y-4 self-start sticky top-32">
                    <OriginalReportCard event={event} />

                    {/* Progress summary */}
                    <div className="bg-[#252B3B] border border-[#334155] rounded-2xl p-4 space-y-2">
                        <p className="text-[#64748B] text-xs uppercase tracking-wider font-bold">Progreso de caracterización</p>
                        {[
                            { label: "Trabajador", done: !!(formData.worker_name) },
                            { label: "Clasificación", done: !!(formData.classification) },
                            { label: "Fecha y lugar", done: !!(formData.event_date && formData.event_city) },
                            { label: "Lesión (FURAT)", done: !!(formData.injury_nature || formData.body_part) },
                        ].map((item) => (
                            <div key={item.label} className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${item.done ? "bg-green-600" : "bg-[#334155]"}`}>
                                    {item.done && <Check className="w-2.5 h-2.5 text-white" />}
                                </div>
                                <span className={`text-sm ${item.done ? "text-white" : "text-[#64748B]"}`}>{item.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Investigation entry point — only when classified */}
                    {event.classification_status === "classified" || event.classification_status === "investigated" ? (
                        <div className={`border rounded-2xl p-4 space-y-3 ${event.classification_status === "investigated"
                            ? "bg-emerald-900/20 border-emerald-700/30"
                            : "bg-[#252B3B] border-[#334155]"
                            }`}>
                            <div className="flex items-center gap-2">
                                <ClipboardList className={`w-4 h-4 ${event.classification_status === "investigated" ? "text-emerald-400" : "text-[#F59E0B]"
                                    }`} />
                                <p className="text-white font-bold text-xs uppercase tracking-wider">
                                    Investigación del Accidente
                                </p>
                            </div>
                            {event.classification_status === "investigated" ? (
                                <>
                                    <p className="text-emerald-400 text-xs">✓ Investigación completada</p>
                                    <button
                                        onClick={() => router.push(`/dashboard/events/${eventId}/investigation`)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-900/30 border border-emerald-700/30 text-emerald-400 rounded-xl text-sm font-semibold hover:bg-emerald-900/50 transition-colors"
                                    >
                                        Ver Investigación
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <p className="text-[#64748B] text-xs">Res. 1401/2007 — plazo 15 días hábiles desde el evento.</p>
                                    <button
                                        onClick={() => router.push(`/dashboard/events/${eventId}/investigation`)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#F59E0B] text-black rounded-xl text-sm font-bold hover:bg-amber-400 transition-colors"
                                    >
                                        <ClipboardList className="w-4 h-4" />
                                        Iniciar Investigación
                                    </button>
                                </>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
