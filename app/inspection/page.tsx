/**
 * app/inspection/page.tsx
 * Módulo 6 — Field inspection form (PWA-optimized, Dexie offline).
 * Extended with: template selector, observation fields on negative findings,
 * and syncs template_id + items with observations to Supabase.
 */
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle, ChevronDown } from "lucide-react";
import { db, generateId } from "@/lib/db";
import { syncPendingData } from "@/lib/sync";
import { INSPECTION_TEMPLATES, type InspectionTemplate, type TemplateItem } from "@/lib/inspection-templates";

type CheckState = boolean | null;

interface CheckItem extends TemplateItem {
    checked: CheckState;
    observation: string;
}

export default function InspectionPage() {
    const router = useRouter();
    const [selectedTemplate, setSelectedTemplate] = useState<InspectionTemplate>(INSPECTION_TEMPLATES[0]);
    const [items, setItems] = useState<CheckItem[]>(buildItems(INSPECTION_TEMPLATES[0]));
    const [inspectorName, setInspectorName] = useState("");
    const [locationName, setLocationName] = useState("");
    const [saved, setSaved] = useState(false);
    const [inspectionId] = useState(() => generateId());
    const obsRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

    function buildItems(template: InspectionTemplate): CheckItem[] {
        return template.items.map((t) => ({ ...t, checked: null, observation: "" }));
    }

    const onTemplateChange = (id: string) => {
        const t = INSPECTION_TEMPLATES.find((t) => t.id === id) ?? INSPECTION_TEMPLATES[0];
        setSelectedTemplate(t);
        setItems(buildItems(t));
    };

    // Score calculation
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

    const setObs = (id: string, text: string) => {
        setItems((prev) => prev.map((item) => item.id === id ? { ...item, observation: text } : item));
    };

    // Auto-save to Dexie on every change
    useEffect(() => {
        if (evaluated.length === 0) return;
        db.inspections.put({
            id: inspectionId,
            inspector_name: inspectorName || "Sin nombre",
            template_name: selectedTemplate.name,
            template_id: selectedTemplate.id,
            score_percent: score,
            items: items.map(({ id, label, required, checked, observation, norm }) => ({
                id, label, required, checked, observation, norm,
            })),
            location_name: locationName || undefined,
            sync_status: "pending",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });
    }, [items, score, inspectionId, inspectorName, locationName, selectedTemplate, evaluated.length]);

    const handleFinish = async () => {
        setSaved(true);
        syncPendingData().catch(console.warn);
    };

    const scoreColor = score >= 80 ? "text-green-400" : score >= 60 ? "text-amber-400" : "text-red-400";

    // ── Saved confirmation screen ───────────────────────────────────────────────
    if (saved) {
        return (
            <div className="min-h-dvh bg-[#1A1F2E] flex flex-col items-center justify-center gap-6 px-6 text-center" style={{ fontFamily: "'Inter', sans-serif" }}>
                <div className="w-20 h-20 rounded-full bg-green-900/40 border border-green-700/40 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-green-400" />
                </div>
                <div className="space-y-1">
                    <h2 className="text-white font-black text-2xl">¡Inspección guardada!</h2>
                    <p className={`text-2xl font-bold ${scoreColor}`}>{score}% Cumplimiento</p>
                    <p className="text-[#64748B] text-sm mt-1">
                        {typeof navigator !== "undefined" && navigator.onLine
                            ? "Sincronizando con el servidor..."
                            : "Guardado localmente — se enviará al reconectarse"}
                    </p>
                </div>
                <div className="flex flex-col gap-3 w-full max-w-xs">
                    <button onClick={() => router.push("/dashboard/inspections")}
                        className="min-h-[48px] rounded-xl bg-[#F59E0B] text-black font-bold text-base hover:bg-[#D97706] transition-colors">
                        Ver en dashboard
                    </button>
                    <button onClick={() => { setSaved(false); setItems(buildItems(selectedTemplate)); setInspectorName(""); setLocationName(""); }}
                        className="min-h-[48px] rounded-xl bg-[#252B3B] border border-[#334155] text-white font-bold text-base hover:bg-[#2E3547] transition-colors">
                        Nueva inspección
                    </button>
                </div>
            </div>
        );
    }

    // ── Main form ───────────────────────────────────────────────────────────────
    return (
        <div className="min-h-dvh bg-[#1A1F2E] flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Header */}
            <header className="flex items-center gap-3 px-4 py-3 bg-[#1A1F2E] border-b border-[#334155] sticky top-0 z-40">
                <button onClick={() => router.back()} className="min-w-[44px] min-h-[44px] flex items-center">
                    <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <h1 className="text-white font-bold flex-1 truncate">{selectedTemplate.icon} {selectedTemplate.name}</h1>
                <span className={`text-sm font-black px-3 py-1 rounded-full bg-[#252B3B] border border-[#334155] ${scoreColor}`}>
                    {score}%
                </span>
            </header>

            {/* Template selector */}
            <div className="px-4 pt-4 space-y-3">
                <div className="relative">
                    <select value={selectedTemplate.id} onChange={(e) => onTemplateChange(e.target.value)}
                        className="w-full appearance-none bg-[#252B3B] border border-[#334155] rounded-xl px-4 py-3 text-white font-medium text-sm min-h-[48px] outline-none focus:border-[#F59E0B] pr-10">
                        {INSPECTION_TEMPLATES.map((t) => (
                            <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] pointer-events-none" />
                </div>
                <div className="space-y-1 px-1">
                    <p className="text-[#F59E0B] text-xs font-bold tracking-wide">Marco Legal: {selectedTemplate.norm}</p>
                    <p className="text-[#64748B] text-xs leading-relaxed">{selectedTemplate.description}</p>
                </div>
            </div>

            {/* Inspector info */}
            <div className="px-4 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" placeholder="Su nombre (inspector)" value={inspectorName}
                    onChange={(e) => setInspectorName(e.target.value)}
                    className="w-full bg-[#252B3B] border border-[#334155] rounded-xl px-4 py-3 text-white placeholder:text-[#64748B] text-sm min-h-[48px] outline-none focus:border-[#F59E0B]" />
                <input type="text" placeholder="Ubicación / área inspeccionada" value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    className="w-full bg-[#252B3B] border border-[#334155] rounded-xl px-4 py-3 text-white placeholder:text-[#64748B] text-sm min-h-[48px] outline-none focus:border-[#F59E0B]" />
            </div>

            {/* Checklist */}
            <div className="flex-1 px-4 pt-4 pb-32 space-y-2 overflow-y-auto">
                <p className="text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-3">
                    {evaluated.length}/{items.length} evaluados
                </p>
                {items.map((item) => (
                    <div key={item.id}
                        className={[
                            "bg-[#252B3B] border rounded-xl overflow-hidden",
                            item.checked === true ? "border-green-700/50" : item.checked === false ? "border-red-700/50" : "border-[#334155]",
                        ].join(" ")}
                    >
                        <div className="flex items-center gap-3 px-4 py-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium leading-snug">{item.label}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {item.required && <span className="text-[10px] text-red-400 font-bold uppercase tracking-wide">Obligatorio</span>}
                                    {item.norm && <span className="text-[10px] text-[#334155]">{item.norm}</span>}
                                </div>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                                <button onClick={() => toggle(item.id, true)}
                                    className={`min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition-all ${item.checked === true ? "bg-green-700/50 border border-green-600" : "bg-[#2E3547] border border-[#334155]"}`}>
                                    <CheckCircle2 className={`w-5 h-5 ${item.checked === true ? "text-green-400" : "text-[#64748B]"}`} />
                                </button>
                                <button onClick={() => toggle(item.id, false)}
                                    className={`min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition-all ${item.checked === false ? "bg-red-900/50 border border-red-700" : "bg-[#2E3547] border border-[#334155]"}`}>
                                    <XCircle className={`w-5 h-5 ${item.checked === false ? "text-red-400" : "text-[#64748B]"}`} />
                                </button>
                            </div>
                        </div>
                        {/* Observation field — only visible on negative findings */}
                        {item.checked === false && (
                            <div className="px-4 pb-3">
                                <textarea
                                    ref={(el) => { obsRefs.current[item.id] = el; }}
                                    rows={2}
                                    placeholder="Observación (hallazgo)..."
                                    value={item.observation}
                                    onChange={(e) => setObs(item.id, e.target.value)}
                                    onFocus={() => obsRefs.current[item.id]?.scrollIntoView({ behavior: "smooth", block: "center" })}
                                    className="w-full bg-[#1A1F2E] border border-[#334155] rounded-lg px-3 py-2 text-white text-xs placeholder:text-[#334155] outline-none focus:border-[#F59E0B] resize-none"
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* CTA */}
            <div className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-[#1A1F2E]/95 backdrop-blur-sm border-t border-[#334155]">
                <button onClick={handleFinish} disabled={evaluated.length < 5}
                    className={[
                        "w-full min-h-[48px] rounded-xl font-bold text-base transition-all active:scale-[0.98]",
                        evaluated.length < 5
                            ? "bg-amber-900/40 text-amber-800 cursor-not-allowed"
                            : "bg-[#F59E0B] hover:bg-[#D97706] text-black shadow-lg shadow-amber-900/20",
                    ].join(" ")}
                >
                    {evaluated.length < 5
                        ? `Evalúe al menos 5 ítems (${evaluated.length}/5)`
                        : `Finalizar — ${score}% Cumplimiento`}
                </button>
            </div>
        </div>
    );
}
