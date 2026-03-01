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
import { ArrowLeft, AlertTriangle, Briefcase, ShieldAlert, WifiOff } from "lucide-react";
import { FormStep } from "@/components/forms/FormStep";
import { PhotoCapture } from "@/components/forms/PhotoCapture";
import { SignaturePad } from "@/components/forms/SignaturePad";
import { Input } from "@/components/ui/Input";
import { createIncidentDraft, saveIncidentDraft } from "@/lib/db";
import { syncPendingData } from "@/lib/sync";

type EventType = "casi_accidente" | "accidente" | "condicion_insegura";
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
            id: "accidente",
            title: "Accidente / Lesión",
            subtitle: "Daño físico o lesiones personales",
            icon: <Briefcase className="w-5 h-5 text-red-400" />,
            iconBg: "bg-red-900/50",
        },
        {
            id: "condicion_insegura",
            title: "Condición Insegura",
            subtitle: "Riesgo potencial en el área",
            icon: <ShieldAlert className="w-5 h-5 text-amber-400" />,
            iconBg: "bg-amber-900/40",
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

            {/* ── STEP 2: Photo + GPS ── */}
            {step === 2 && (
                <FormStep
                    step={2}
                    title="Evidencia fotográfica"
                    direction={direction}
                    onBack={goBack}
                    onNext={goNext}
                >
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
