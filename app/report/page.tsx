/**
 * app/report/page.tsx
 * 3-step incident report form — the core field worker workflow.
 * Target: fully reportable in under 90 seconds.
 *
 * Step 1 — Incident type selection
 * Step 2 — Photo + GPS evidence capture  
 * Step 3 — Signature + name + submit
 *
 * Every change auto-saves to Dexie. Submission is optimistic.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle, Briefcase, ShieldAlert, WifiOff, UserPlus, Camera, ChevronDown, ChevronUp } from "lucide-react";
import { FormStep } from "@/components/forms/FormStep";
import { PhotoCapture } from "@/components/forms/PhotoCapture";
import { SignaturePad } from "@/components/forms/SignaturePad";
import { Input } from "@/components/ui/Input";
import { VoiceNarration, type VoiceNarrationValue } from "@/components/forms/VoiceNarration";
import { createIncidentDraft, saveIncidentDraft } from "@/lib/db";
import { syncPendingData } from "@/lib/sync";

type EventType = "casi_accidente" | "accidente_trabajo" | "enfermedad_laboral" | "condicion_insegura" | "impacto_ambiental" | "dano_propiedad";
type Step = 1 | 2 | 3;

const eventTypes: {
    id: EventType;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    iconBg: string;
}[] = [
        {
            id: "casi_accidente",
            title: "Casi-Accidente",
            subtitle: "Situación peligrosa sin lesiones",
            icon: <AlertTriangle className="w-5 h-5 text-blue-400" />,
            iconBg: "bg-blue-900/50",
        },
        {
            id: "accidente_trabajo",
            title: "Accidente de Trabajo",
            subtitle: "Ocurrió una lesión o daño físico",
            icon: <Briefcase className="w-5 h-5 text-red-400" />,
            iconBg: "bg-red-900/50",
        },
        {
            id: "enfermedad_laboral",
            title: "Enfermedad Laboral",
            subtitle: "Síntoma o diagnóstico por causa del trabajo",
            icon: <ShieldAlert className="w-5 h-5 text-purple-400" />,
            iconBg: "bg-purple-900/40",
        },
        {
            id: "condicion_insegura",
            title: "Condición Insegura",
            subtitle: "Riesgo potencial en el área",
            icon: <ShieldAlert className="w-5 h-5 text-amber-400" />,
            iconBg: "bg-amber-900/40",
        },
        {
            id: "impacto_ambiental",
            title: "Impacto Ambiental",
            subtitle: "Derrame, contaminación o daño al entorno",
            icon: <ShieldAlert className="w-5 h-5 text-emerald-400" />,
            iconBg: "bg-emerald-900/40",
        },
        {
            id: "dano_propiedad",
            title: "Daño a la Propiedad",
            subtitle: "Daño a equipos, vehículos o instalaciones",
            icon: <Briefcase className="w-5 h-5 text-orange-400" />,
            iconBg: "bg-orange-900/40",
        },
    ];

export default function ReportPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>(1);
    const [direction, setDirection] = useState<"forward" | "back">("forward");
    const [incidentId, setIncidentId] = useState<string | null>(null);

    // Form state
    const [selectedType, setSelectedType] = useState<EventType | null>(null);
    const [photoData, setPhotoData] = useState<{
        photoBase64: string;
        lat?: number;
        lng?: number;
        timestamp: string;
    } | null>(null);
    // Step 2 — Relato de los hechos
    const [reporterNarrative, setReporterNarrative] = useState<VoiceNarrationValue>({ text: "" });
    const [witnessName, setWitnessName] = useState("");
    const [witnessNarrative, setWitnessNarrative] = useState<VoiceNarrationValue>({ text: "" });
    const [showWitness, setShowWitness] = useState(false);
    const [showPhoto, setShowPhoto] = useState(false);
    // Step 3
    const [name, setName] = useState("");
    const [role, setRole] = useState("");
    const [signature, setSignature] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Create draft on mount
    useEffect(() => {
        createIncidentDraft().then((id) => {
            setIncidentId(id);
        });
    }, []);

    // Auto-save on every field change to Dexie
    const debouncerRef = useRef<NodeJS.Timeout | null>(null);

    const autosave = useCallback(
        (partial: Parameters<typeof saveIncidentDraft>[1]) => {
            if (!incidentId) return;
            if (debouncerRef.current) clearTimeout(debouncerRef.current);
            debouncerRef.current = setTimeout(() => {
                saveIncidentDraft(incidentId, partial);
            }, 300);
        },
        [incidentId]
    );

    // ── Navigation ──────────────────────────────────────────────────────
    const goNext = () => {
        if (step === 1) {
            if (!selectedType) { setErrors({ type: "Seleccione un tipo de evento" }); return; }
            setErrors({});
        }
        if (step < 3) {
            setDirection("forward");
            setStep((s) => (s + 1) as Step);
        }
    };

    const goBack = () => {
        if (step > 1) {
            setDirection("back");
            setStep((s) => (s - 1) as Step);
        } else {
            router.back();
        }
    };

    // ── Submit ──────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        const newErrors: Record<string, string> = {};
        if (!name.trim()) newErrors.name = "El nombre es requerido";
        if (!signature) newErrors.signature = "La firma es requerida";
        if (Object.keys(newErrors).length) { setErrors(newErrors); return; }

        setSubmitting(true);

        // Final save to Dexie — optimistic complete
        if (incidentId) {
            await saveIncidentDraft(incidentId, {
                reported_by_name: name.trim(),
                reported_by_role: role.trim(),
                signature_blob: signature ?? undefined,
                reporter_description: reporterNarrative.text || undefined,
                reporter_voice_blob: reporterNarrative.audioBlob,
                witness_name: witnessName.trim() || undefined,
                witness_description: witnessNarrative.text || undefined,
                witness_voice_blob: witnessNarrative.audioBlob,
                sync_status: "pending",
            });
        }

        setSubmitted(true);
        setSubmitting(false);

        // Trigger background sync (fire-and-forget — doesn't block UI)
        syncPendingData().catch(console.warn);
    };

    // ─────────────────────────────────────────────────────────────────────

    if (submitted) {
        return (
            <div className="min-h-dvh bg-[#1A1F2E] flex flex-col items-center justify-center gap-6 px-6 text-center">
                <div className="w-20 h-20 rounded-full bg-green-900/40 border border-green-700/40 flex items-center justify-center">
                    <span className="text-4xl">✓</span>
                </div>
                <div className="space-y-1">
                    <h2 className="text-white font-black text-2xl">¡Reporte guardado!</h2>
                    <p className="text-[#64748B] text-sm">
                        {navigator.onLine
                            ? "Sincronizando con el servidor..."
                            : "Sin conexión — se enviará automáticamente al reconectarse"}
                    </p>
                </div>
                {/* Manual navigation — never auto-redirect (breaks offline) */}
                <div className="flex flex-col gap-3 w-full max-w-xs">
                    <button
                        onClick={() => router.push("/")}
                        className="min-h-[48px] rounded-xl bg-[#F59E0B] text-black font-bold text-base hover:bg-[#D97706] transition-colors"
                    >
                        Ir al inicio
                    </button>
                    <button
                        onClick={() => {
                            setSubmitted(false);
                            setStep(1);
                            setSelectedType(null);
                            setPhotoData(null);
                            setReporterNarrative({ text: "" });
                            setWitnessName("");
                            setWitnessNarrative({ text: "" });
                            setShowWitness(false);
                            setShowPhoto(false);
                            setName("");
                            setRole("");
                            setSignature(null);
                        }}
                        className="min-h-[48px] rounded-xl bg-[#252B3B] border border-[#334155] text-white font-bold text-base hover:bg-[#2E3547] transition-colors"
                    >
                        Nuevo reporte
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Back / Cancel header */}
            <header className="flex items-center justify-between px-4 py-3 bg-[#1A1F2E] border-b border-[#334155] sticky top-0 z-40">
                <button onClick={goBack} className="flex items-center gap-1.5 text-white min-w-[48px] min-h-[48px]">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-white font-bold text-base">
                    {step === 1 ? "Reportar Incidente" : "Reporte de Incidente"}
                </h1>
                {step === 3 ? (
                    <button onClick={() => router.push("/")} className="text-[#F59E0B] font-bold text-sm">
                        CANCELAR
                    </button>
                ) : (
                    <div className="w-20" />
                )}
            </header>

            {/* ── STEP 1: Incident Type ── */}
            {step === 1 && (
                <FormStep
                    step={1}
                    title="¿Qué ocurrió?"
                    direction={direction}
                    onBack={goBack}
                    onNext={goNext}
                    nextDisabled={!selectedType}
                >
                    <div className="space-y-3">
                        {eventTypes.map((ev) => (
                            <button
                                key={ev.id}
                                onClick={() => {
                                    setSelectedType(ev.id);
                                    autosave({ event_type: ev.id });
                                    setErrors({});
                                }}
                                className={[
                                    "w-full flex items-center gap-4 rounded-2xl p-4 border-2 transition-all duration-150",
                                    "min-h-[72px] active:scale-[0.99] text-left",
                                    selectedType === ev.id
                                        ? "border-[#F59E0B] bg-amber-900/20"
                                        : "border-[#334155] bg-[#252B3B]",
                                ].join(" ")}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${ev.iconBg}`}>
                                    {ev.icon}
                                </div>
                                <div className="flex-1">
                                    <p className="text-white font-bold text-base">{ev.title}</p>
                                    <p className="text-[#64748B] text-sm mt-0.5">{ev.subtitle}</p>
                                </div>
                                {/* Radio outer ring */}
                                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${selectedType === ev.id ? "border-[#F59E0B]" : "border-[#334155]"}`}>
                                    {selectedType === ev.id && <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />}
                                </div>
                            </button>
                        ))}
                        {errors.type && <p className="text-red-400 text-xs font-medium">{errors.type}</p>}
                    </div>
                </FormStep>
            )}

            {/* ── STEP 2: Relato de los Hechos ── */}
            {step === 2 && (
                <FormStep
                    step={2}
                    title="Relato de los Hechos"
                    subtitle="Describe lo que ocurrió. Puedes usar voz o escribir directamente."
                    direction={direction}
                    onBack={goBack}
                    onNext={goNext}
                >
                    <div className="space-y-5">
                        {/* Reporter narration */}
                        <VoiceNarration
                            label="Tu relato (quien reporta)"
                            placeholder="Describe con tus palabras qué pasó, cuándo, cómo y dónde…"
                            value={reporterNarrative}
                            onChange={(v) => {
                                setReporterNarrative(v);
                                autosave({ reporter_description: v.text, reporter_voice_blob: v.audioBlob });
                            }}
                        />

                        {/* Witness section */}
                        <div className="border border-[#1E2A3B] rounded-2xl overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setShowWitness((v) => !v)}
                                className="w-full flex items-center justify-between px-4 py-3 bg-[#141824] hover:bg-[#1E2A3B]/50 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <UserPlus className="w-4 h-4 text-[#F59E0B]" />
                                    <span className="text-white text-sm font-semibold">
                                        {showWitness ? "Testigo" : "¿Hay testigo? (opcional)"}
                                    </span>
                                    {witnessName && (
                                        <span className="text-[#64748B] text-xs">— {witnessName}</span>
                                    )}
                                </div>
                                {showWitness
                                    ? <ChevronUp className="w-4 h-4 text-[#64748B]" />
                                    : <ChevronDown className="w-4 h-4 text-[#64748B]" />}
                            </button>

                            {showWitness && (
                                <div className="px-4 pb-4 pt-3 space-y-4 bg-[#0F1420]">
                                    <div>
                                        <label className="text-[#94A3B8] text-xs font-bold uppercase tracking-wider block mb-1.5">Nombre del testigo</label>
                                        <input
                                            type="text"
                                            placeholder="Nombre completo del testigo"
                                            value={witnessName}
                                            onChange={(e) => {
                                                setWitnessName(e.target.value);
                                                autosave({ witness_name: e.target.value });
                                            }}
                                            className="w-full bg-[#141824] border border-[#1E2A3B] rounded-xl px-4 py-3 text-white text-sm placeholder:text-[#334155] outline-none focus:border-[#F59E0B]/50 min-h-[48px]"
                                        />
                                    </div>
                                    <VoiceNarration
                                        label="Declaración del testigo"
                                        placeholder="Relato del testigo sobre lo que presenció…"
                                        value={witnessNarrative}
                                        onChange={(v) => {
                                            setWitnessNarrative(v);
                                            autosave({ witness_description: v.text, witness_voice_blob: v.audioBlob });
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Photo — collapsible */}
                        <div className="border border-[#1E2A3B] rounded-2xl overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setShowPhoto((v) => !v)}
                                className="w-full flex items-center justify-between px-4 py-3 bg-[#141824] hover:bg-[#1E2A3B]/50 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <Camera className="w-4 h-4 text-[#F59E0B]" />
                                    <span className="text-white text-sm font-semibold">Evidencia fotográfica</span>
                                    {photoData && (
                                        <span className="text-emerald-400 text-xs">✓ Capturada</span>
                                    )}
                                </div>
                                {showPhoto
                                    ? <ChevronUp className="w-4 h-4 text-[#64748B]" />
                                    : <ChevronDown className="w-4 h-4 text-[#64748B]" />}
                            </button>
                            {showPhoto && (
                                <div className="px-4 pb-4 pt-3 bg-[#0F1420]">
                                    <PhotoCapture
                                        capturedPhoto={photoData?.photoBase64}
                                        onCapture={(data) => {
                                            setPhotoData(data);
                                            autosave({
                                                photo_blob: data.photoBase64,
                                                photo_lat: data.lat,
                                                photo_lng: data.lng,
                                                photo_timestamp: data.timestamp,
                                            });
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </FormStep>
            )}

            {/* ── STEP 3: Signature + Submit ── */}
            {step === 3 && (
                <FormStep
                    step={3}
                    title="Firma y confirmar"
                    subtitle="Paso 3 de 3: Valide la información antes de enviar."
                    direction={direction}
                    onBack={goBack}
                    onNext={handleSubmit}
                    nextLabel="ENVIAR REPORTE"
                    nextDisabled={submitting}
                >
                    <div className="space-y-5">
                        <Input
                            label="Nombre Completo"
                            placeholder="Ej: Juan Pérez"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                autosave({ reported_by_name: e.target.value });
                            }}
                            error={errors.name}
                        />
                        <Input
                            label="Cargo"
                            placeholder="Ej: Supervisor de Obra"
                            value={role}
                            onChange={(e) => {
                                setRole(e.target.value);
                                autosave({ reported_by_role: e.target.value });
                            }}
                        />
                        <SignaturePad
                            onChange={(dataUrl) => {
                                setSignature(dataUrl);
                                if (dataUrl) autosave({ signature_blob: dataUrl });
                            }}
                            error={errors.signature}
                        />

                        {/* Save-locally hint */}
                        <div className="flex items-center justify-center gap-2 text-[#64748B] text-xs">
                            <WifiOff className="w-3.5 h-3.5" />
                            <span>Se guardará localmente si no hay conexión</span>
                        </div>
                    </div>
                </FormStep>
            )}
        </>
    );
}
