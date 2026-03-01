/**
 * app/inspection/page.tsx
 * Daily safety inspection checklist — auto-calculates compliance score.
 * Saves to Dexie on every check, syncs to Supabase when online.
 */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle, Clock } from "lucide-react";
import { db, generateId } from "@/lib/db";
import { syncPendingData } from "@/lib/sync";

type CheckState = boolean | null;

interface CheckItem {
    id: string;
    label: string;
    required: boolean;
    checked: CheckState;
}

const TEMPLATE: Omit<CheckItem, "checked">[] = [
    { id: "epp_completo", label: "EPP completo y en buen estado (casco, guantes, gafas)", required: true },
    { id: "senalizacion", label: "Señalización del área de trabajo instalada", required: true },
    { id: "extintor", label: "Extintor cargado y accesible < 30m", required: true },
    { id: "primeros_auxilios", label: "Botiquín de primeros auxilios disponible", required: true },
    { id: "permisos_trabajo", label: "Permisos de trabajo firmados", required: true },
    { id: "maquinaria", label: "Inspección pre-operacional de maquinaria", required: false },
    { id: "orden_limpieza", label: "Orden y limpieza del área", required: false },
    { id: "rutas_evacuacion", label: "Rutas de evacuación despejadas", required: true },
    { id: "bloqueo_energia", label: "Bloqueo y etiquetado de energía (LOTO)", required: false },
    { id: "trabajo_alturas", label: "Anclaje de seguridad en trabajos en alturas", required: false },
];

export default function InspectionPage() {
    const router = useRouter();
    const [items, setItems] = useState<CheckItem[]>(
        TEMPLATE.map((t) => ({ ...t, checked: null }))
    );
    const [inspectorName, setInspectorName] = useState("");
    const [saved, setSaved] = useState(false);
    const [inspectionId] = useState(() => generateId());

    // Calculate score — only checked/unchecked items count
    const evaluated = items.filter((i) => i.checked !== null);
    const passed = items.filter((i) => i.checked === true);
    const score = evaluated.length > 0 ? Math.round((passed.length / items.length) * 100) : 0;

    const toggle = (id: string, value: boolean) => {
        setItems((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, checked: item.checked === value ? null : value } : item
            )
        );
    };

    // Auto-save to Dexie whenever items change
    useEffect(() => {
        if (evaluated.length === 0) return;
        db.inspections.put({
            id: inspectionId,
            inspector_name: inspectorName || "Sin nombre",
            template_name: "Inspección Diaria",
            score_percent: score,
            items: items.map(({ id, label, required, checked }) => ({
                id, label, required, checked,
            })),
            sync_status: "pending",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });
    }, [items, score, inspectionId, inspectorName, evaluated.length]);

    const handleFinish = async () => {
        setSaved(true);
        syncPendingData().catch(console.warn);
        // No auto-redirect: manual buttons prevent navigating to an uncached page while offline
    };

    const scoreColor = score >= 80 ? "text-green-400" : score >= 60 ? "text-amber-400" : "text-red-400";
    const arcColor = score >= 80 ? "#22C55E" : score >= 60 ? "#F59E0B" : "#EF4444";

    if (saved) {
        return (
            <div className="min-h-dvh bg-[#1A1F2E] flex flex-col items-center justify-center gap-6 px-6 text-center">
                <div className="w-20 h-20 rounded-full bg-green-900/40 border border-green-700/40 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-green-400" />
                </div>
                <div className="space-y-1">
                    <h2 className="text-white font-black text-2xl">¡Inspección guardada!</h2>
                    <p className={`text-2xl font-bold ${scoreColor}`}>{score}% Cumplimiento</p>
                    <p className="text-[#64748B] text-sm mt-1">
                        {navigator.onLine ? "Sincronizando con el servidor..." : "Guardado localmente — se enviará al reconectarse"}
                    </p>
                </div>
                <div className="flex flex-col gap-3 w-full max-w-xs">
                    <button
                        onClick={() => router.push("/")}
                        className="min-h-[48px] rounded-xl bg-[#F59E0B] text-black font-bold text-base hover:bg-[#D97706] transition-colors"
                    >
                        Ir al inicio
                    </button>
                    <button
                        onClick={() => {
                            setSaved(false);
                            setItems(TEMPLATE.map((t) => ({ ...t, checked: null })));
                            setInspectorName("");
                        }}
                        className="min-h-[48px] rounded-xl bg-[#252B3B] border border-[#334155] text-white font-bold text-base hover:bg-[#2E3547] transition-colors"
                    >
                        Nueva inspección
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-dvh bg-[#1A1F2E] flex flex-col">
            {/* Header */}
            <header className="flex items-center gap-3 px-4 py-3 bg-[#1A1F2E] border-b border-[#334155] sticky top-0 z-40">
                <button onClick={() => router.back()} className="min-w-[44px] min-h-[44px] flex items-center">
                    <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <h1 className="text-white font-bold flex-1">Inspección Diaria</h1>
                {/* Live score pill */}
                <span className={`text-sm font-black px-3 py-1 rounded-full bg-[#252B3B] border border-[#334155] ${scoreColor}`}>
                    {score}%
                </span>
            </header>

            {/* Inspector name */}
            <div className="px-4 pt-4">
                <input
                    type="text"
                    placeholder="Su nombre (inspector)"
                    value={inspectorName}
                    onChange={(e) => setInspectorName(e.target.value)}
                    className="w-full bg-[#252B3B] border border-[#334155] rounded-xl px-4 py-3 text-white placeholder:text-[#64748B] text-sm min-h-[48px] outline-none focus:border-[#F59E0B]"
                />
            </div>

            {/* Checklist */}
            <div className="flex-1 px-4 pt-4 pb-32 space-y-2 overflow-y-auto">
                <p className="text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-3">
                    {evaluated.length}/{items.length} evaluados
                </p>
                {items.map((item) => (
                    <div
                        key={item.id}
                        className={[
                            "flex items-center gap-3 bg-[#252B3B] border rounded-xl px-4 py-3",
                            item.checked === true
                                ? "border-green-700/50"
                                : item.checked === false
                                    ? "border-red-700/50"
                                    : "border-[#334155]",
                        ].join(" ")}
                    >
                        <div className="flex-1">
                            <p className="text-white text-sm font-medium leading-snug">{item.label}</p>
                            {item.required && (
                                <span className="text-[10px] text-red-400 font-bold uppercase tracking-wide">Obligatorio</span>
                            )}
                        </div>
                        {/* Action buttons */}
                        <div className="flex gap-2 flex-shrink-0">
                            <button
                                onClick={() => toggle(item.id, true)}
                                className={`min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition-all ${item.checked === true
                                    ? "bg-green-700/50 border border-green-600"
                                    : "bg-[#2E3547] border border-[#334155]"
                                    }`}
                            >
                                <CheckCircle2 className={`w-5 h-5 ${item.checked === true ? "text-green-400" : "text-[#64748B]"}`} />
                            </button>
                            <button
                                onClick={() => toggle(item.id, false)}
                                className={`min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition-all ${item.checked === false
                                    ? "bg-red-900/50 border border-red-700"
                                    : "bg-[#2E3547] border border-[#334155]"
                                    }`}
                            >
                                <XCircle className={`w-5 h-5 ${item.checked === false ? "text-red-400" : "text-[#64748B]"}`} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Fixed CTA */}
            <div className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-[#1A1F2E]/95 backdrop-blur-sm border-t border-[#334155]">
                <button
                    onClick={handleFinish}
                    disabled={evaluated.length < 5}
                    className={[
                        "w-full min-h-[48px] rounded-xl font-bold text-base transition-all active:scale-[0.98]",
                        evaluated.length < 5
                            ? "bg-amber-900/40 text-amber-800 cursor-not-allowed"
                            : "bg-[#F59E0B] hover:bg-[#D97706] text-black shadow-lg shadow-amber-900/20",
                    ].join(" ")}
                >
                    {evaluated.length < 5
                        ? `Evalúe al menos 5 ítems (${evaluated.length}/5)`
                        : `Finalizar Inspección — ${score}% Cumplimiento`}
                </button>
            </div>
        </div>
    );
}
