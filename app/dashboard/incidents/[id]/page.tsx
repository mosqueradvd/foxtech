/**
 * app/dashboard/incidents/[id]/page.tsx
 * Incident Detail View — shows full report with photo, GPS, signature, timeline.
 *
 * DATA STRATEGY (Bug-fix #1):
 * 1. Query Supabase and Dexie in parallel for the incident id.
 * 2. Merge: prefer Supabase remote fields, but fall back to Dexie local blobs
 *    for photo (photo_url ?? photo_blob) and signature (signature_url ?? signature_blob).
 * This means freshly submitted incidents always show their photo, even before sync.
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, MapPin, Camera, Clock, PenLine, AlertOctagon } from "lucide-react";
import { supabase, type Incident, type Company } from "@/lib/supabase";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { StatusVariant } from "@/components/ui/StatusBadge";

const EVENT_LABELS: Record<string, string> = {
    casi_accidente: "Casi-Accidente",
    accidente: "Accidente / Lesión",
    condicion_insegura: "Condición Insegura",
};

// Merged shape that covers both remote Supabase + local Dexie fields
type MergedIncident = Incident & {
    company?: Company;
    localPhotoSrc?: string;     // photo_url ?? photo_blob
    localSignatureSrc?: string; // signature_url ?? signature_blob
    isLocalOnly?: boolean;      // true = not yet in Supabase
};

export default function IncidentDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [incident, setIncident] = useState<MergedIncident | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        async function load() {
            // 1. Fetch from Supabase (null when offline or record not yet synced)
            const { data: remoteInc } = await supabase
                .from("incidents")
                .select("*")
                .eq("id", id)
                .maybeSingle();

            // 2. Fetch from Dexie (always available for locally-created records)
            const localInc = await db.incidents.get(id);

            if (!remoteInc && !localInc) {
                setLoading(false);
                return;
            }

            // 3. Merge: remote wins for all fields; local fills in blobs
            const base: MergedIncident = remoteInc
                ? { ...remoteInc, isLocalOnly: false }
                : {
                    // Map LocalIncident → Incident shape for display
                    id: localInc!.id,
                    company_id: null,
                    reported_by_name: localInc!.reported_by_name ?? null,
                    reported_by_role: localInc!.reported_by_role ?? null,
                    event_type: localInc!.event_type ?? null,
                    description: localInc!.description ?? null,
                    photo_url: null,
                    photo_lat: localInc!.photo_lat ?? null,
                    photo_lng: localInc!.photo_lng ?? null,
                    photo_timestamp: localInc!.photo_timestamp ?? null,
                    signature_url: null,
                    location_name: localInc!.location_name ?? null,
                    synced_at: null,
                    created_at: localInc!.created_at,
                    updated_at: localInc!.updated_at,
                    isLocalOnly: true,
                };

            // 4. Photo src: Supabase URL takes priority, then local base64 blob
            base.localPhotoSrc =
                base.photo_url ?? localInc?.photo_blob ?? undefined;

            // 5. Signature: same priority logic
            base.localSignatureSrc =
                base.signature_url ?? localInc?.signature_blob ?? undefined;

            // 6. Resolve company name if we have a company_id
            if (base.company_id) {
                const { data: comp } = await supabase
                    .from("companies")
                    .select("*")
                    .eq("id", base.company_id)
                    .maybeSingle();
                base.company = comp ?? undefined;
            }

            setIncident(base);
            setLoading(false);
        }

        load();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#1A1F2E] flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!incident) {
        return (
            <div className="min-h-screen bg-[#1A1F2E] flex flex-col items-center justify-center gap-4">
                <p className="text-white font-bold">Incidente no encontrado</p>
                <button onClick={() => router.back()} className="text-[#F59E0B] text-sm underline">
                    Volver
                </button>
            </div>
        );
    }

    const eventVariant = (incident.event_type ?? "condicion_insegura") as StatusVariant;
    const syncVariant: StatusVariant = incident.synced_at ? "synced" : "pending";

    return (
        <div className="min-h-screen bg-[#1A1F2E]">
            {/* Header */}
            <header className="flex items-center gap-4 px-6 py-4 border-b border-[#334155] sticky top-0 bg-[#1A1F2E] z-10">
                <button onClick={() => router.back()} className="text-white hover:text-[#F59E0B] transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <h1 className="text-white font-black text-lg">
                        {EVENT_LABELS[incident.event_type ?? ""] ?? "Incidente"}
                    </h1>
                    <p className="text-[#64748B] text-xs flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {incident.company?.razon_social ?? "—"} · {incident.company?.direccion ?? ""}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {incident.isLocalOnly && (
                        <span className="text-amber-400 text-[10px] font-bold uppercase bg-amber-900/30 px-2 py-0.5 rounded">
                            LOCAL
                        </span>
                    )}
                    <StatusBadge variant={syncVariant} />
                </div>
            </header>

            <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
                {/* Type badge + date */}
                <div className="flex items-center justify-between">
                    <StatusBadge variant={eventVariant} size="md" />
                    <span className="text-[#64748B] text-sm">
                        {incident.created_at
                            ? new Date(incident.created_at).toLocaleString("es-CO", {
                                dateStyle: "medium",
                                timeStyle: "short",
                            })
                            : "—"}
                    </span>
                </div>

                {/* Photo evidence — localPhotoSrc covers both remote URL and local blob */}
                <section>
                    <h2 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2 mb-3">
                        <Camera className="w-4 h-4 text-[#F59E0B]" />
                        Evidencia Fotográfica
                    </h2>
                    {incident.localPhotoSrc ? (
                        <div className="rounded-xl overflow-hidden border border-[#334155] aspect-video relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={incident.localPhotoSrc}
                                alt="Evidencia fotográfica del incidente"
                                className="w-full h-full object-cover"
                            />
                            {incident.photo_lat && incident.photo_lng && (
                                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                                    <MapPin className="w-3.5 h-3.5 text-[#F59E0B]" />
                                    <span className="text-white text-xs font-mono">
                                        {incident.photo_lat.toFixed(4)}°, {incident.photo_lng.toFixed(4)}°
                                    </span>
                                </div>
                            )}
                            {/* Badge when photo hasn't been uploaded to Supabase yet */}
                            {!incident.photo_url && (
                                <div className="absolute top-3 right-3 bg-amber-900/70 text-amber-300 text-[10px] font-bold px-2 py-1 rounded">
                                    FOTO LOCAL
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-48 rounded-xl border border-dashed border-[#334155] bg-[#252B3B] flex items-center justify-center">
                            <p className="text-[#64748B] text-sm">Sin foto adjunta</p>
                        </div>
                    )}
                </section>

                {/* Incident details */}
                <section className="bg-[#252B3B] border border-[#334155] rounded-xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-[#334155]">
                        <h2 className="text-white font-bold text-sm uppercase tracking-wider">Detalles del Incidente</h2>
                    </div>
                    <div className="divide-y divide-[#334155]">
                        {[
                            ["Tipo de evento", EVENT_LABELS[incident.event_type ?? ""] ?? "—"],
                            ["Descripción", incident.description ?? "Sin descripción"],
                            ["Empresa", incident.company?.razon_social ?? "—"],
                            ["Ubicación", incident.company?.direccion ?? "—"],
                        ].map(([label, value]) => (
                            <div key={label} className="px-5 py-3 flex gap-4">
                                <span className="text-[#64748B] text-sm font-medium w-36 flex-shrink-0">{label}</span>
                                <span className="text-white text-sm">{value}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Personnel */}
                <section className="bg-[#252B3B] border border-[#334155] rounded-xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-[#334155]">
                        <h2 className="text-white font-bold text-sm uppercase tracking-wider">Personal</h2>
                    </div>
                    <div className="divide-y divide-[#334155]">
                        {[
                            ["Reportado por", incident.reported_by_name ?? "—"],
                            ["Cargo", incident.reported_by_role ?? "—"],
                        ].map(([label, value]) => (
                            <div key={label} className="px-5 py-3 flex gap-4">
                                <span className="text-[#64748B] text-sm font-medium w-36 flex-shrink-0">{label}</span>
                                <span className="text-white text-sm">{value}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Timeline */}
                <section>
                    <h2 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2 mb-4">
                        <Clock className="w-4 h-4 text-[#F59E0B]" />
                        Línea de Tiempo
                    </h2>
                    <div className="space-y-3">
                        {[
                            { label: "Reporte registrado vía app móvil", time: incident.created_at },
                            { label: "Metadatos verificados y foto procesada", time: incident.photo_timestamp ?? incident.created_at },
                            {
                                label: incident.synced_at
                                    ? "Sincronizado con servidor FOXTECH"
                                    : "Pendiente de sincronización",
                                time: incident.synced_at ?? undefined,
                            },
                        ].map((event, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <div
                                    className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${event.time ? "bg-[#F59E0B]" : "bg-[#334155]"
                                        }`}
                                />
                                <div>
                                    <p className="text-white text-sm">{event.label}</p>
                                    {event.time && (
                                        <p className="text-[#64748B] text-xs mt-0.5">
                                            {new Date(event.time).toLocaleString("es-CO")}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Signature — uses localSignatureSrc */}
                {incident.localSignatureSrc && (
                    <section>
                        <h2 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2 mb-3">
                            <PenLine className="w-4 h-4 text-[#F59E0B]" />
                            Autorización
                        </h2>
                        <div className="bg-[#252B3B] border border-[#334155] rounded-xl p-4">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={incident.localSignatureSrc} alt="Firma digital" className="max-h-20 mx-auto" />
                            <p className="text-center text-[#64748B] text-xs mt-2">
                                Firmado digitalmente por {incident.reported_by_name ?? "el reportador"}
                            </p>
                        </div>
                    </section>
                )}

                {/* Action required */}
                <section className="bg-red-950/30 border border-red-800/30 rounded-xl p-5 flex gap-3">
                    <AlertOctagon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-red-300 font-bold text-sm">Acción Inmediata Requerida</p>
                        <p className="text-red-400/80 text-sm mt-1">
                            Revisar el área afectada e implementar medidas correctivas según el Plan de Acción HSE vigente.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}
