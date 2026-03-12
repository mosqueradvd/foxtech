/**
 * app/acciones/[token]/page.tsx
 * PUBLIC page — no authentication required.
 * Shows an assigned corrective action to the responsible party.
 * They can mark it as completed and upload a closure photo.
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
    CheckCircle2, AlertTriangle, Loader2, Clock, Camera
} from "lucide-react";
import { supabase, type ActionToken } from "@/lib/supabase";

type PageState = "loading" | "invalid" | "expired" | "completed" | "ready" | "submitting" | "success";

type ActionInfo = {
    action: string;
    responsible: string;
    deadline: string;
    status: string;
    source: "inspection" | "investigation";
    sourceName: string;
    findingLabel?: string;
    findingPhoto?: string;
};

export default function AccionPage() {
    const { token } = useParams<{ token: string }>();
    const [state, setState] = useState<PageState>("loading");
    const [actionToken, setActionToken] = useState<ActionToken | null>(null);
    const [info, setInfo] = useState<ActionInfo | null>(null);
    const [photo, setPhoto] = useState<string | null>(null);
    const [error, setError] = useState("");

    // ── Load token ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!token) { setState("invalid"); return; }
        (async () => {
            const { data, error: err } = await supabase
                .from("action_tokens")
                .select("*")
                .eq("token", token)
                .maybeSingle();

            if (err || !data) { setState("invalid"); return; }
            const tok = data as ActionToken;
            setActionToken(tok);

            // Check if already done
            if (tok.completed_at) { setState("completed"); return; }

            // Check expiry
            if (new Date(tok.expires_at) < new Date()) { setState("expired"); return; }

            // Fetch action details from parent record
            let ai: ActionInfo | null = null;
            if (tok.source === "investigation") {
                const { data: inv } = await supabase
                    .from("investigations")
                    .select("action_plan")
                    .eq("id", tok.source_id)
                    .maybeSingle();
                if (inv?.action_plan && inv.action_plan[tok.action_index]) {
                    const item = inv.action_plan[tok.action_index];
                    ai = {
                        action: item.action,
                        responsible: item.responsible,
                        deadline: item.deadline,
                        status: item.status,
                        source: "investigation",
                        sourceName: "Investigación de Accidente",
                    };
                }
            } else {
                const { data: insp } = await supabase
                    .from("inspections")
                    .select("action_plan, template_name, items")
                    .eq("id", tok.source_id)
                    .maybeSingle();
                if (insp?.action_plan && insp.action_plan[tok.action_index]) {
                    const item = insp.action_plan[tok.action_index];
                    // Try to find the finding's photo
                    const findingPhoto = insp.items?.find((f: { id: string }) => f.id === item.finding_id)?.photo_url;
                    ai = {
                        action: item.action,
                        responsible: item.responsible,
                        deadline: item.deadline,
                        status: item.status,
                        source: "inspection",
                        sourceName: insp.template_name ?? "Inspección",
                        findingLabel: item.finding_label,
                        findingPhoto,
                    };
                }
            }

            if (!ai) { setState("invalid"); return; }
            setInfo(ai);
            setState("ready");
        })();
    }, [token]);

    // ── Submit completion ───────────────────────────────────────────────────────
    const handleComplete = useCallback(async () => {
        if (!actionToken || !photo) return;
        setState("submitting");
        setError("");
        try {
            const now = new Date().toISOString();

            // 1 — update action_tokens
            const { error: tokErr } = await supabase
                .from("action_tokens")
                .update({ completed_at: now, completion_photo: photo })
                .eq("id", actionToken.id);
            if (tokErr) throw tokErr;

            // 2 — update the action item status in the parent record
            if (actionToken.source === "investigation") {
                const { data: inv } = await supabase
                    .from("investigations")
                    .select("action_plan")
                    .eq("id", actionToken.source_id)
                    .maybeSingle();
                if (inv?.action_plan) {
                    const plan = [...inv.action_plan];
                    if (plan[actionToken.action_index]) {
                        plan[actionToken.action_index] = { ...plan[actionToken.action_index], status: "cerrado" };
                        await supabase.from("investigations").update({ action_plan: plan }).eq("id", actionToken.source_id);
                    }
                }
            } else {
                const { data: insp } = await supabase
                    .from("inspections")
                    .select("action_plan")
                    .eq("id", actionToken.source_id)
                    .maybeSingle();
                if (insp?.action_plan) {
                    const plan = [...insp.action_plan];
                    if (plan[actionToken.action_index]) {
                        plan[actionToken.action_index] = { ...plan[actionToken.action_index], status: "completada", verification_photo_url: photo };
                        await supabase.from("inspections").update({ action_plan: plan }).eq("id", actionToken.source_id);
                    }
                }
            }
            setState("success");
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Error desconocido");
            setState("ready");
        }
    }, [actionToken, photo]);

    // ── Terminal states ─────────────────────────────────────────────────────────
    if (state === "loading") return (
        <Screen>
            <Loader2 className="w-10 h-10 text-[#F59E0B] animate-spin mx-auto" />
            <p className="text-[#64748B] mt-4 text-center">Cargando acción...</p>
        </Screen>
    );

    if (state === "invalid") return (
        <Screen>
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
            <h2 className="text-white font-bold text-xl mt-4 text-center">Enlace inválido</h2>
            <p className="text-[#64748B] text-sm text-center mt-2">Este enlace no existe o ha sido eliminado.</p>
        </Screen>
    );

    if (state === "expired") return (
        <Screen>
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
            <h2 className="text-white font-bold text-xl mt-4 text-center">Enlace expirado</h2>
            <p className="text-[#64748B] text-sm text-center mt-2">Este enlace venció (validez 7 días). Contacta al profesional SST para que genere uno nuevo.</p>
        </Screen>
    );

    if (state === "completed") return (
        <Screen>
            <div className="w-20 h-20 rounded-full bg-emerald-400/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-white font-bold text-2xl mt-6 text-center">Acción completada</h2>
            <p className="text-[#64748B] text-sm text-center mt-2 max-w-xs">Esta acción ya fue marcada como completada. ¡Gracias!</p>
        </Screen>
    );

    if (state === "success") return (
        <Screen>
            <div className="w-20 h-20 rounded-full bg-emerald-400/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-white font-bold text-2xl mt-6 text-center">¡Listo!</h2>
            <p className="text-[#64748B] text-sm text-center mt-2 max-w-xs">
                La acción fue registrada como completada. El equipo SST ha sido notificado.
            </p>
        </Screen>
    );

    // ── Ready / Submitting ──────────────────────────────────────────────────────
    return (
        <div className="min-h-dvh bg-[#0F1420] flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Top bar */}
            <div className="bg-[#141824] border-b border-[#1E2A3B] px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F59E0B] flex items-center justify-center flex-shrink-0">
                    <span className="text-black font-black text-xs">FT</span>
                </div>
                <div>
                    <p className="text-white text-sm font-bold">FOXTECH — Acción Correctiva</p>
                    <p className="text-[#64748B] text-xs">{info?.sourceName}</p>
                </div>
            </div>

            <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full space-y-4">
                {/* Action card */}
                <div className="bg-[#141824] border border-[#1E2A3B] rounded-2xl p-5 space-y-4">
                    <div>
                        <p className="text-[#64748B] text-xs font-bold uppercase tracking-wider mb-1">Acción asignada</p>
                        <p className="text-white font-semibold text-sm leading-relaxed">{info?.action}</p>
                    </div>
                    {info?.findingLabel && (
                        <div>
                            <p className="text-[#64748B] text-xs font-bold uppercase tracking-wider mb-1">Hallazgo origen</p>
                            <p className="text-[#94A3B8] text-sm">{info.findingLabel}</p>
                        </div>
                    )}
                    {info?.findingPhoto && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={info.findingPhoto} alt="Hallazgo" className="w-full max-h-48 object-cover rounded-xl border border-[#1E2A3B]" />
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#0F1420] rounded-xl p-3">
                            <p className="text-[#64748B] text-xs mb-1">Responsable</p>
                            <p className="text-white text-sm font-semibold">{info?.responsible || "—"}</p>
                        </div>
                        <div className="bg-[#0F1420] rounded-xl p-3">
                            <p className="text-[#64748B] text-xs mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Fecha límite</p>
                            <p className={`text-sm font-semibold ${info?.deadline && new Date(info.deadline + "T23:59:59") < new Date() ? "text-red-400" : "text-white"}`}>
                                {info?.deadline ? new Date(info.deadline + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                            </p>
                        </div>
                    </div>
                    <div className="bg-[#0F1420] rounded-xl p-3">
                        <p className="text-[#64748B] text-xs mb-1">Origen</p>
                        <p className="text-[#94A3B8] text-sm">{info?.sourceName}</p>
                    </div>
                </div>

                {/* Photo upload for completion */}
                <div className="bg-[#141824] border border-[#1E2A3B] rounded-2xl p-5">
                    <p className="text-white font-semibold text-sm mb-3">Evidencia fotográfica de cierre</p>
                    {photo ? (
                        <div className="space-y-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={photo} alt="Evidencia" className="w-full max-h-64 object-cover rounded-xl border border-[#1E2A3B]" />
                            <button onClick={() => setPhoto(null)} className="text-xs text-red-400 hover:text-red-300 underline cursor-pointer">
                                Quitar foto
                            </button>
                        </div>
                    ) : (
                        <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-[#1E2A3B] hover:border-amber-400/40 rounded-xl p-8 w-full cursor-pointer transition-colors">
                            <div className="w-12 h-12 rounded-full bg-amber-400/10 flex items-center justify-center">
                                <Camera className="w-6 h-6 text-[#F59E0B]" />
                            </div>
                            <div className="text-center">
                                <p className="text-white text-sm font-semibold">Tomar o subir foto</p>
                                <p className="text-[#64748B] text-xs mt-0.5">Documento la evidencia del cierre</p>
                            </div>
                            <input type="file" accept="image/*" capture="environment" className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = (ev) => setPhoto(ev.target?.result as string);
                                    reader.readAsDataURL(file);
                                }} />
                        </label>
                    )}
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-400/10 border border-red-400/25 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
                )}

                {/* Submit */}
                <button
                    onClick={handleComplete}
                    disabled={!photo || state === "submitting"}
                    className="w-full py-4 bg-[#F59E0B] text-black font-bold text-base rounded-2xl hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                    {state === "submitting" ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Registrando...</>
                    ) : (
                        <><CheckCircle2 className="w-5 h-5" /> Marcar como completada</>
                    )}
                </button>

                <p className="text-[#334155] text-xs text-center pb-6">
                    Este enlace expira el{" "}
                    {actionToken && new Date(actionToken.expires_at).toLocaleString("es-CO", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
            </div>
        </div>
    );
}

function Screen({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-dvh bg-[#0F1420] flex flex-col items-center justify-center px-6 py-12" style={{ fontFamily: "'Inter', sans-serif" }}>
            {children}
        </div>
    );
}
