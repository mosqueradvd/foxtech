/**
 * app/reports/page.tsx
 * Full list of all incidents/reports by this field worker (from Dexie).
 * "Ver todo" destination — sorted newest first.
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle, CheckCircle2, Clock, ChevronRight, ClipboardList } from "lucide-react";
import { db, type LocalIncident } from "@/lib/db";

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
    casi_accidente: { label: "Casi-Accidente", color: "text-blue-400" },
    accidente: { label: "Accidente / Lesión", color: "text-red-400" },
    condicion_insegura: { label: "Condición Insegura", color: "text-amber-400" },
};

export default function ReportsListPage() {
    const router = useRouter();
    const [incidents, setIncidents] = useState<LocalIncident[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        db.incidents.orderBy("created_at").reverse().toArray().then((rows) => {
            setIncidents(rows);
            setLoading(false);
        });
    }, []);

    return (
        <div className="min-h-dvh bg-[#1A1F2E] flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Header */}
            <header className="flex items-center gap-3 px-4 py-3 bg-[#1A1F2E] border-b border-[#334155] sticky top-0 z-40">
                <button onClick={() => router.back()} className="min-w-[44px] min-h-[44px] flex items-center text-white">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-white font-bold text-base flex-1">Mis Reportes</h1>
                <span className="text-[#64748B] text-sm">{incidents.length} registros</span>
            </header>

            <main className="flex-1 px-4 py-4 pb-8 space-y-2 overflow-y-auto">
                {loading && (
                    <p className="text-[#64748B] text-center py-12">Cargando...</p>
                )}

                {!loading && incidents.length === 0 && (
                    <div className="text-center py-16 space-y-3">
                        <ClipboardList className="w-10 h-10 text-[#334155] mx-auto" />
                        <p className="text-[#64748B] font-semibold">Sin reportes aún</p>
                        <button onClick={() => router.push("/report")}
                            className="mt-2 inline-flex px-5 py-2.5 bg-[#F59E0B] text-black font-bold rounded-xl text-sm hover:bg-amber-400 transition-colors">
                            Crear primer reporte
                        </button>
                    </div>
                )}

                {incidents.map((inc) => {
                    const typeInfo = TYPE_LABELS[inc.event_type ?? ""] ?? { label: "Incidente", color: "text-[#94A3B8]" };
                    const isPending = inc.sync_status === "pending";
                    const date = new Date(inc.created_at);
                    const dateStr = isNaN(date.getTime()) ? "—" : date.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

                    return (
                        <button key={inc.id} onClick={() => router.push(`/reports/${inc.id}`)}
                            className="w-full text-left bg-[#252B3B] border border-[#334155] rounded-2xl p-4 flex items-center gap-4 hover:border-[#F59E0B]/30 active:scale-[0.99] transition-all">
                            {/* Icon */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isPending ? "bg-amber-900/30" : "bg-slate-700"}`}>
                                <AlertTriangle className={`w-5 h-5 ${isPending ? "text-amber-500" : "text-slate-400"}`} />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                    <p className={`font-bold text-sm ${typeInfo.color}`}>{typeInfo.label}</p>
                                    {isPending ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-900/40 text-amber-400">
                                            <Clock className="w-3 h-3" />Pendiente
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-green-900/40 text-green-400">
                                            <CheckCircle2 className="w-3 h-3" />Sincronizado
                                        </span>
                                    )}
                                </div>
                                <p className="text-[#64748B] text-xs truncate">
                                    {inc.description?.slice(0, 50) || inc.reporter_description?.slice(0, 50) || "Sin descripción"}
                                </p>
                                <p className="text-[#334155] text-[10px] mt-0.5">{dateStr}</p>
                            </div>

                            <ChevronRight className="w-4 h-4 text-[#334155] flex-shrink-0" />
                        </button>
                    );
                })}
            </main>
        </div>
    );
}
