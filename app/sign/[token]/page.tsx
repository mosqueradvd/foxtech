/**
 * app/sign/[token]/page.tsx
 * PUBLIC signature page — no authentication required.
 * Mobile-first, optimized for touch devices.
 * Validates token → shows signing pad → uploads PNG to Supabase Storage.
 */
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";
import { supabase, type SignatureRequest } from "@/lib/supabase";
import { CheckCircle2, AlertTriangle, Loader2, RotateCcw } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
    COPASST: "Representante COPASST",
    SUPERVISOR: "Jefe Inmediato / Supervisor",
    SST_PROFESSIONAL: "Profesional SST con Licencia",
};

type PageState = "loading" | "invalid" | "expired" | "already_signed" | "ready" | "submitting" | "success";

export default function SignPage() {
    const { token } = useParams<{ token: string }>();
    const sigRef = useRef<SignatureCanvas>(null);
    const [state, setState] = useState<PageState>("loading");
    const [sigRequest, setSigRequest] = useState<SignatureRequest | null>(null);
    const [eventDate, setEventDate] = useState<string>("");
    const [companyName, setCompanyName] = useState<string>("");
    const [agreed, setAgreed] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);
    const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
    const [error, setError] = useState<string>("");

    // ── Validate token ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!token) { setState("invalid"); return; }
        (async () => {
            const { data, error: err } = await supabase
                .from("signature_requests")
                .select("*")
                .eq("token", token)
                .maybeSingle();

            if (err || !data) { setState("invalid"); return; }
            const req = data as SignatureRequest;

            if (req.status === "SIGNED") { setState("already_signed"); setSigRequest(req); return; }
            if (req.status === "EXPIRED" || new Date(req.expires_at) < new Date()) {
                // Mark as expired
                await supabase.from("signature_requests").update({ status: "EXPIRED" }).eq("id", req.id);
                setState("expired");
                return;
            }

            setSigRequest(req);

            // Fetch contextual info (company name + event date) — no sensitive worker data
            const { data: inv } = await supabase
                .from("investigations")
                .select("incident_id")
                .eq("id", req.investigation_id)
                .maybeSingle();

            if (inv?.incident_id) {
                const { data: incident } = await supabase
                    .from("incidents")
                    .select("event_date, created_at, company_id")
                    .eq("id", inv.incident_id)
                    .maybeSingle();
                if (incident) {
                    setEventDate(incident.event_date ?? (incident.created_at ?? "").slice(0, 10));
                    if (incident.company_id) {
                        const { data: co } = await supabase.from("companies").select("name").eq("id", incident.company_id).maybeSingle();
                        setCompanyName(co?.name ?? "");
                    }
                }
            }

            // Request geolocation (optional — doesn't block)
            if (typeof navigator !== "undefined" && navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                    () => { }, // silent failure
                    { timeout: 5000 }
                );
            }

            setState("ready");
        })();
    }, [token]);

    // ── Submit signature ────────────────────────────────────────────────────
    const handleSubmit = useCallback(async () => {
        if (!sigRequest || isEmpty || !agreed) return;
        setState("submitting");
        setError("");

        try {
            // 1. Get PNG blob from canvas
            const canvas = sigRef.current?.getCanvas();
            if (!canvas) throw new Error("Canvas no disponible");
            const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => b ? res(b) : rej(new Error("blob null")), "image/png"));

            // 2. Upload to Supabase Storage
            const fileName = `investigations/${sigRequest.investigation_id}/${sigRequest.signer_role}_${Date.now()}.png`;
            const { error: upErr } = await supabase.storage.from("signatures").upload(fileName, blob, { contentType: "image/png", upsert: true });
            if (upErr) throw upErr;

            const { data: { publicUrl } } = supabase.storage.from("signatures").getPublicUrl(fileName);

            // 3. Mark as signed
            const { error: updErr } = await supabase.from("signature_requests").update({
                status: "SIGNED",
                signed_at: new Date().toISOString(),
                signature_url: publicUrl,
                gps_lat: gps?.lat ?? null,
                gps_lng: gps?.lng ?? null,
            }).eq("id", sigRequest.id);
            if (updErr) throw updErr;

            setState("success");
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Error desconocido");
            setState("ready");
        }
    }, [sigRequest, isEmpty, agreed, gps]);

    // ── UI states ──────────────────────────────────────────────────────────

    if (state === "loading") return (
        <Screen>
            <Loader2 className="w-10 h-10 text-[#F59E0B] animate-spin mx-auto" />
            <p className="text-[#64748B] mt-4 text-center">Verificando enlace...</p>
        </Screen>
    );

    if (state === "invalid") return (
        <Screen>
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
            <h2 className="text-white font-bold text-xl mt-4 text-center">Enlace inválido</h2>
            <p className="text-[#64748B] text-sm text-center mt-2">Este enlace de firma no existe o ha sido eliminado.</p>
        </Screen>
    );

    if (state === "expired") return (
        <Screen>
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
            <h2 className="text-white font-bold text-xl mt-4 text-center">Enlace expirado</h2>
            <p className="text-[#64748B] text-sm text-center mt-2">Este enlace de firma ha vencido (validez 72 horas).<br />Solicita un nuevo enlace al profesional SST.</p>
        </Screen>
    );

    if (state === "already_signed") return (
        <Screen>
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h2 className="text-white font-bold text-xl mt-4 text-center">Ya fue firmado</h2>
            <p className="text-[#64748B] text-sm text-center mt-2">Este documento ya fue firmado. No es posible firmarlo de nuevo.</p>
        </Screen>
    );

    if (state === "success") return (
        <Screen>
            <div className="w-20 h-20 rounded-full bg-emerald-400/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-white font-bold text-2xl mt-6 text-center">¡Firma registrada!</h2>
            <p className="text-[#64748B] text-sm text-center mt-2 max-w-xs">
                Tu firma ha sido guardada exitosamente con registro de fecha y hora.
                Puedes cerrar esta página.
            </p>
            {gps && <p className="text-[#334155] text-xs text-center mt-2">✓ Ubicación GPS registrada</p>}
        </Screen>
    );

    // ── Ready / Submitting ─────────────────────────────────────────────────
    return (
        <div className="min-h-dvh bg-[#0F1420] flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Top bar */}
            <div className="bg-[#141824] border-b border-[#1E2A3B] px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F59E0B] flex items-center justify-center flex-shrink-0">
                    <span className="text-black font-black text-xs">FT</span>
                </div>
                <div>
                    <p className="text-white text-sm font-bold">FOXTECH — Firma Digital</p>
                    {companyName && <p className="text-[#64748B] text-xs">{companyName}</p>}
                </div>
            </div>

            <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full space-y-5">
                {/* Context info */}
                <div className="bg-[#141824] border border-[#1E2A3B] rounded-2xl p-4">
                    <p className="text-[#64748B] text-xs font-bold uppercase tracking-wider mb-1">Estás firmando como</p>
                    <p className="text-white font-bold text-base">{ROLE_LABELS[sigRequest?.signer_role ?? ""] ?? sigRequest?.signer_role}</p>
                    {sigRequest?.signer_name && <p className="text-[#94A3B8] text-sm mt-0.5">{sigRequest.signer_name}</p>}
                    {eventDate && (
                        <p className="text-[#64748B] text-sm mt-2">
                            Documento de investigación del evento ocurrido el{" "}
                            <span className="text-white font-semibold">
                                {new Date(eventDate + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}
                            </span>
                        </p>
                    )}
                </div>

                {/* Signature pad */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[#94A3B8] text-xs font-bold uppercase tracking-wider">Tu firma</p>
                        <button onClick={() => { sigRef.current?.clear(); setIsEmpty(true); }}
                            className="flex items-center gap-1 text-[#64748B] hover:text-white text-xs transition-colors">
                            <RotateCcw className="w-3 h-3" /> Limpiar
                        </button>
                    </div>
                    <div className="bg-white rounded-2xl overflow-hidden touch-none" style={{ minHeight: 300 }}>
                        <SignatureCanvas
                            ref={sigRef}
                            canvasProps={{
                                style: { width: "100%", height: "300px", display: "block", touchAction: "none" },
                            }}
                            penColor="#1a1a2e"
                            minWidth={2}
                            maxWidth={4}
                            velocityFilterWeight={0.7}
                            onEnd={() => setIsEmpty(sigRef.current?.isEmpty() ?? true)}
                        />
                    </div>
                    {isEmpty && (
                        <p className="text-[#64748B] text-xs text-center mt-2">👆 Dibuja tu firma con el dedo o aguja</p>
                    )}
                </div>

                {/* GPS status */}
                {gps ? (
                    <p className="text-emerald-400 text-xs text-center">✓ Ubicación GPS obtenida</p>
                ) : (
                    <p className="text-[#334155] text-xs text-center">Ubicación GPS no disponible (opcional)</p>
                )}

                {/* Legal confirmation — tappable card, much clearer than native checkbox on mobile */}
                <button
                    type="button"
                    onClick={() => setAgreed((v) => !v)}
                    className={[
                        "w-full text-left rounded-2xl border-2 p-4 transition-all active:scale-[0.98]",
                        agreed
                            ? "bg-[#F59E0B]/10 border-[#F59E0B]"
                            : "bg-[#141824] border-[#1E2A3B]",
                    ].join(" ")}
                >
                    <div className="flex items-center gap-3 mb-2">
                        {/* Custom checkbox circle */}
                        <div className={[
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                            agreed ? "bg-[#F59E0B] border-[#F59E0B]" : "border-[#334155]",
                        ].join(" ")}>
                            {agreed && (
                                <svg viewBox="0 0 12 10" fill="none" className="w-3.5 h-3.5">
                                    <path d="M1 5l3.5 3.5L11 1" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                        </div>
                        <span className={`text-sm font-semibold ${agreed ? "text-[#F59E0B]" : "text-[#64748B]"}`}>
                            {agreed ? "Confirmado ✓" : "Toca aquí para confirmar"}
                        </span>
                    </div>
                    <p className="text-[#94A3B8] text-xs leading-relaxed pl-9">
                        Entiendo que esta firma tiene <strong className="text-white">validez legal</strong> y que estoy firmando en mi calidad de{" "}
                        <strong className="text-white">{ROLE_LABELS[sigRequest?.signer_role ?? ""] ?? ""}</strong>{" "}
                        el documento de investigación del accidente de trabajo.
                    </p>
                </button>

                {/* Error */}
                {error && (
                    <div className="bg-red-400/10 border border-red-400/25 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
                )}

                {/* Submit button */}
                <button
                    onClick={handleSubmit}
                    disabled={isEmpty || !agreed || state === "submitting"}
                    className="w-full py-4 bg-[#F59E0B] text-black font-bold text-base rounded-2xl hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {state === "submitting" ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Registrando firma...</>
                    ) : (
                        <><CheckCircle2 className="w-5 h-5" /> Confirmar Firma</>
                    )}
                </button>

                <p className="text-[#334155] text-xs text-center pb-6">
                    Este enlace expira el{" "}
                    {sigRequest && new Date(sigRequest.expires_at).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
            </div>
        </div>
    );
}

// ── Helper layout component ────────────────────────────────────────────────────
function Screen({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-dvh bg-[#0F1420] flex flex-col items-center justify-center px-6 py-12" style={{ fontFamily: "'Inter', sans-serif" }}>
            {children}
        </div>
    );
}
