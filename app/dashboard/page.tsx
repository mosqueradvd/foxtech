/**
 * app/dashboard/page.tsx
 * Consultant Command Center — desktop layout matching Stitch design.
 * Real-time data from Supabase with Realtime subscription.
 * Left sidebar, KPI cards, incidents table, map placeholder.
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    LayoutDashboard,
    AlertTriangle,
    ClipboardList,
    Building2,
    FileText,
    Bell,
    Search,
    MoreVertical,
    MapPin,
    RefreshCw,
    User,
    Download,
    BarChart2,
} from "lucide-react";

import { supabase, type Incident, type Company } from "@/lib/supabase";
import { StatCard } from "@/components/dashboard/StatCard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { IncidentRow } from "@/components/dashboard/IncidentRow";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { StatusVariant } from "@/components/ui/StatusBadge";
import dynamic from "next/dynamic";

const IncidentMap = dynamic(() => import("@/components/dashboard/IncidentMap"), {
    ssr: false,
    loading: () => <div className="flex-1 flex items-center justify-center bg-[#1A2538] text-[#64748B] text-xs">Cargando mapa...</div>
});

// Enriched incident with company info for display
type EnrichedIncident = Incident & {
    company_name?: string;
    company_location?: string;
};

export default function DashboardPage() {
    const router = useRouter();
    const [incidents, setIncidents] = useState<EnrichedIncident[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeNav, setActiveNav] = useState("dashboard");
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    // Derived KPIs
    const thisMonth = incidents.filter((i) => {
        if (!i.created_at) return false;
        const d = new Date(i.created_at);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const totalIncidents = thisMonth.length;
    const avgCompliance = 92; // Would come from inspections in production

    // Load data from Supabase
    const fetchData = useCallback(async () => {
        setLoading(true);
        const [{ data: incData }, { data: compData }] = await Promise.all([
            supabase.from("incidents").select("*").order("created_at", { ascending: false }).limit(20),
            supabase.from("companies").select("*"),
        ]);

        const companiesMap = Object.fromEntries((compData ?? []).map((c) => [c.id, c]));
        const enriched = (incData ?? []).map((inc: Incident) => ({
            ...inc,
            company_name: companiesMap[inc.company_id ?? ""]?.name ?? "Duflo",
            company_location: companiesMap[inc.company_id ?? ""]?.location ?? "",
        }));

        setIncidents(enriched);
        setCompanies(compData ?? []);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();

        // Real-time subscription for new incidents
        const channel = supabase
            .channel("incidents-realtime")
            .on("postgres_changes", { event: "*", schema: "public", table: "incidents" }, () => {
                fetchData();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchData]);

    const filtered = incidents.filter((inc) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            inc.company_name?.toLowerCase().includes(q) ||
            inc.event_type?.toLowerCase().includes(q) ||
            inc.description?.toLowerCase().includes(q)
        );
    });

    // Pagination logic
    const displayData = filtered; // Removed `demoRows` as it's not defined and filtered data should be primary
    const totalPages = Math.ceil(displayData.length / itemsPerPage);
    const paginatedItems = displayData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Reset pagination on search
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);


    const mapIncidents = displayData.map(inc => {
        // Enforce fallback location in Colombia if missing GPS
        const incAny = inc as any;
        const lat = incAny.photo_lat || incAny.lat || (4.0 + Math.random() * 6);
        const lng = incAny.photo_lng || incAny.lng || (-76.0 + Math.random() * 4);
        return {
            id: incAny.id || String(Math.random()),
            lat,
            lng,
            type: incAny.event_type || incAny.type || "Desconocido",
            company: incAny.company_name || incAny.company || "Duflo",
        };
    });

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0F1219]">
            {/* Top bar */}
            <DashboardHeader onRefresh={fetchData} loading={loading}>
                <div className="flex items-center justify-between flex-1">
                    <div>
                        <h1 className="text-white font-black text-xl tracking-tight leading-none uppercase">Vista General</h1>
                        <p className="text-[#64748B] text-[10px] font-bold uppercase tracking-wider mt-1">
                            Consultant Command Center
                        </p>
                    </div>

                    {/* Search */}
                    <div className="relative max-w-xs w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                        <input
                            type="text"
                            placeholder="Buscar empresa, incidente..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-[#0F1219] border border-[#1E2A3B] rounded-xl pl-9 pr-4 py-2.5 text-white text-xs font-bold outline-none focus:border-amber-500/50 w-full placeholder:text-[#334155]"
                        />
                    </div>
                </div>
            </DashboardHeader>

            <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8">
                {/* ── KPI CARDS ── */}
                <div className="grid grid-cols-3 gap-6">
                    <StatCard
                        title="INCIDENTES"
                        subtitle="Este mes"
                        value={loading ? "—" : totalIncidents}
                        trend={2}
                        trendIsUp={false}
                        color="#F59E0B"
                        icon={AlertTriangle}
                    />
                    <StatCard
                        title="INSPECCIONES"
                        subtitle="Completadas"
                        value={45}
                        trend={5}
                        trendIsUp={true}
                        color="#3B82F6"
                        icon={ClipboardList}
                    />
                    <StatCard
                        title="CUMPLIMIENTO"
                        subtitle="Promedio %"
                        value={avgCompliance}
                        unit="%"
                        trend={1}
                        trendIsUp={false}
                        color="#22C55E"
                        icon={Building2}
                    />
                </div>

                {/* ── BOTTOM SECTION: Table + Map ── */}
                <div className="grid grid-cols-[1fr_300px] gap-4">
                    {/* Incidents Table */}
                    <div className="bg-[#252B3B] border border-[#334155] rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-[#334155]">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                <h2 className="text-white font-bold text-sm uppercase tracking-wider">
                                    Últimos Incidentes
                                </h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={fetchData}
                                    className="text-[#64748B] hover:text-white transition-colors"
                                    title="Actualizar"
                                >
                                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                                </button>
                                <button className="text-[#F59E0B] text-xs font-bold hover:underline">
                                    VER TODOS
                                </button>
                            </div>
                        </div>

                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[#334155]">
                                    {["EMPRESA", "TIPO DE EVENTO", "HORA", "CLASIFICACIÓN", "ESTADO", ""].map((h) => (
                                        <th
                                            key={h}
                                            className="text-left text-[#64748B] text-[10px] font-bold uppercase tracking-wider px-4 py-3"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-[#64748B] text-sm">
                                            Cargando...
                                        </td>
                                    </tr>
                                ) : paginatedItems.length > 0 ? (
                                    paginatedItems.map((inc, i) => {
                                        if ('id' in inc && inc.id && !('time' in inc)) {
                                            return (
                                                <IncidentRow
                                                    key={inc.id}
                                                    incident={inc as EnrichedIncident}
                                                    onClick={() => router.push(`/dashboard/events/${inc.id}`)}
                                                />
                                            );
                                        } else {
                                            const row = inc as any;
                                            return (
                                                <tr key={i} className="border-b border-[#334155] hover:bg-white/5 cursor-pointer transition-colors" onClick={() => router.push("/dashboard")}>
                                                    <td className="py-4 px-4">
                                                        <p className="text-white font-semibold text-sm">{row.company}</p>
                                                        <p className="text-[#64748B] text-xs">{row.location}</p>
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <StatusBadge variant={row.type as StatusVariant} />
                                                    </td>
                                                    <td className="py-4 px-4 text-[#64748B] text-sm">{row.time}</td>
                                                    <td className="py-4 px-4">
                                                        <StatusBadge variant={row.status as StatusVariant} label={row.status === "synced" ? "Sync" : row.status === "error" ? "Error" : "Pendiente"} />
                                                    </td>
                                                    <td className="py-4 px-4 text-emerald-400 font-bold text-xs uppercase tracking-widest text-center">
                                                        {row.status === "synced" ? "Sync" : "—"}
                                                    </td>
                                                    <td className="py-4 px-4 text-[#64748B] text-sm">›</td>
                                                </tr>
                                            );
                                        }
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-[#64748B] text-sm">
                                            No se encontraron resultados
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="px-5 py-4 border-t border-[#334155] flex items-center justify-between">
                                <p className="text-[#64748B] text-[10px] font-bold uppercase tracking-widest">
                                    Pág {currentPage} de {totalPages}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1.5 rounded-lg bg-[#2E3547] text-[#64748B] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                                    >
                                        Anterior
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1.5 rounded-lg bg-[#2E3547] text-[#64748B] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Geolocation Panel */}
                    <div className="bg-[#252B3B] border border-[#334155] rounded-xl overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-4 py-4 border-b border-[#334155]">
                            <h2 className="text-white font-bold text-sm uppercase tracking-wider">
                                GEOLOCALIZACIÓN
                            </h2>
                            <div className="flex gap-1.5">
                                <button className="p-1.5 rounded-lg bg-[#2E3547] text-[#64748B] hover:text-white transition-colors" title="Vista mapa">
                                    <MapPin className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Interactive Map from react-leaflet */}
                        <div className="flex-1 relative bg-[#1A2538] min-h-[260px] overflow-hidden" style={{ zIndex: 0 }}>
                            <IncidentMap incidents={mapIncidents} />
                        </div>

                        {/* Legend */}
                        <div className="px-4 py-3 border-t border-[#334155] space-y-1.5">
                            {[
                                { color: "bg-red-500", label: "Accidente" },
                                { color: "bg-amber-400", label: "Casi Accidente" },
                                { color: "bg-slate-400", label: "Condición Insegura" },
                            ].map((leg) => (
                                <div key={leg.label} className="flex items-center gap-2">
                                    <div className={`w-2.5 h-2.5 rounded-full ${leg.color}`} />
                                    <span className="text-[#64748B] text-xs">{leg.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Demo rows for empty state (matching Stitch design exactly), enriched with lat/lang
const demoRows = [
    { company: "Acero Norte S.A.", location: "Planta B - Zona Carga", type: "casi_accidente", time: "10:30 AM", status: "synced", lat: 4.6097, lng: -74.0817 }, // Bogota
    { company: "Logística FastTrack", location: "Almacén Central", type: "condicion_insegura", time: "09:15 AM", status: "pending", lat: 6.2442, lng: -75.5812 }, // Medellin
    { company: "Constructora Vía", location: "Obra #452", type: "accidente", time: "Ayer", status: "synced", lat: 3.4516, lng: -76.5320 }, // Cali
    { company: "Minera El Roble", location: "Túnel Sector 4", type: "casi_accidente", time: "Ayer", status: "synced", lat: 5.0689, lng: -75.5174 }, // Manizales
    { company: "Plásticos del Sur", location: "Planta Extrusión", type: "condicion_insegura", time: "2 días", status: "error", lat: 10.9685, lng: -74.7813 }, // Barranquilla
];
