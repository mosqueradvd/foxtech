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
import { KPICard } from "@/components/dashboard/KPICard";
import { IncidentRow } from "@/components/dashboard/IncidentRow";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { StatusVariant } from "@/components/ui/StatusBadge";

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
            company_name: companiesMap[inc.company_id ?? ""]?.name ?? "—",
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

    // Nav items
    const navItems = [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
        { id: "incidents", label: "Incidentes", icon: AlertTriangle, badge: totalIncidents || undefined, href: "/dashboard" },
        { id: "inspections", label: "Inspecciones", icon: ClipboardList, href: "/dashboard/inspections" },
        { id: "companies", label: "Empresas", icon: Building2, href: "/dashboard" },
        { id: "investigations", label: "Investigaciones", icon: Search, href: "/dashboard/investigations" },
        { id: "stats", label: "Estadísticas", icon: BarChart2, href: "/dashboard/stats" },
        { id: "notifications", label: "Notificaciones", icon: Bell, href: "/dashboard/notifications" },
        { id: "exports", label: "Exportaciones", icon: Download, href: "/dashboard/exports" },
        { id: "reports", label: "Reportes PDF", icon: FileText, href: "/dashboard" },
    ];



    return (
        <div className="flex h-screen bg-[#1A1F2E] overflow-hidden">
            {/* ── LEFT SIDEBAR ── */}
            <aside className="w-60 flex-shrink-0 bg-[#252B3B] border-r border-[#334155] flex flex-col">
                {/* Logo */}
                <div className="px-5 py-5 border-b border-[#334155]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#F59E0B] flex items-center justify-center">
                            <span className="text-black font-black text-sm">FT</span>
                        </div>
                        <div>
                            <p className="text-white font-black text-sm leading-none">FOXTECH</p>
                            <p className="text-[#64748B] text-[10px] font-semibold tracking-wider uppercase">
                                Consultant Center
                            </p>
                        </div>
                    </div>
                </div>

                {/* Nav items */}
                <nav className="flex-1 px-3 py-4 space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeNav === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setActiveNav(item.id);
                                    if (item.href) router.push(item.href);
                                }}
                                className={[
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                                    isActive
                                        ? "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/20"
                                        : "text-[#64748B] hover:bg-white/5 hover:text-white",
                                ].join(" ")}
                            >
                                <Icon className="w-4 h-4 flex-shrink-0" />
                                <span className="flex-1 text-left">{item.label}</span>
                                {item.badge !== undefined && (
                                    <span className="bg-red-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                                        {item.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>


                {/* User profile at bottom */}
                <div className="px-4 py-4 border-t border-[#334155] flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold leading-none truncate">Carlos Mendez</p>
                        <p className="text-[#64748B] text-xs truncate">Senior Consultant</p>
                    </div>
                    <button className="text-[#64748B] hover:text-white transition-colors">
                        <MoreVertical className="w-4 h-4" />
                    </button>
                </div>
            </aside>

            {/* ── MAIN CONTENT ── */}
            <main className="flex-1 overflow-y-auto">
                {/* Top bar */}
                <div className="flex items-center justify-between px-8 py-4 border-b border-[#334155] sticky top-0 bg-[#1A1F2E] z-10">
                    <div>
                        <h1 className="text-white font-black text-xl tracking-tight">VISTA GENERAL</h1>
                        <p className="text-[#64748B] text-xs mt-0.5">
                            Monitoreo de seguridad y cumplimiento normativo en tiempo real
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                            <input
                                type="text"
                                placeholder="Buscar empresa, incidente..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-[#252B3B] border border-[#334155] rounded-xl pl-9 pr-4 py-2 text-white text-sm placeholder:text-[#64748B] outline-none focus:border-[#F59E0B] w-64"
                            />
                        </div>
                        {/* Notifications */}
                        <button className="relative w-9 h-9 rounded-xl bg-[#252B3B] border border-[#334155] flex items-center justify-center hover:border-[#F59E0B] transition-colors">
                            <Bell className="w-4 h-4 text-[#64748B]" />
                            {totalIncidents > 0 && (
                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-600 rounded-full text-[8px] text-white font-bold flex items-center justify-center">
                                    {Math.min(totalIncidents, 9)}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                <div className="px-8 py-6 space-y-6">
                    {/* ── KPI CARDS ── */}
                    <div className="grid grid-cols-3 gap-4">
                        <KPICard
                            title="Incidentes este mes"
                            value={loading ? "—" : totalIncidents || 12}
                            delta={{ value: "-2%", direction: "down" }}
                            icon={<AlertTriangle className="w-4 h-4" />}
                            accentColor="#F59E0B"
                        />
                        <KPICard
                            title="Inspecciones completadas"
                            value={loading ? "—" : 45}
                            delta={{ value: "+5%", direction: "up" }}
                            icon={<ClipboardList className="w-4 h-4" />}
                            accentColor="#3B82F6"
                        />
                        <KPICard
                            title="Promedio de cumplimiento %"
                            value={`${avgCompliance}%`}
                            delta={{ value: "-1%", direction: "down" }}
                            icon={<Building2 className="w-4 h-4" />}
                            accentColor="#22C55E"
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
                                            <td colSpan={5} className="py-8 text-center text-[#64748B] text-sm">
                                                Cargando...
                                            </td>
                                        </tr>
                                    ) : filtered.length > 0 ? (
                                        filtered.slice(0, 8).map((inc) => (
                                            <IncidentRow
                                                key={inc.id}
                                                incident={inc}
                                                onClick={() => router.push(`/dashboard/events/${inc.id}`)}
                                            />
                                        ))
                                    ) : (
                                        // Demo rows when no real data
                                        demoRows.map((row, i) => (
                                            <tr key={i} className="border-b border-[#334155] hover:bg-white/5 cursor-pointer transition-colors">
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
                                                <td className="py-4 px-4 text-[#64748B] text-sm">›</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
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

                            {/* Map placeholder with incident dots */}
                            <div className="flex-1 relative bg-[#1A2538] min-h-[260px] overflow-hidden">
                                {/* Grid lines for visual depth */}
                                <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
                                    <defs>
                                        <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
                                            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#64748B" strokeWidth="0.5" />
                                        </pattern>
                                    </defs>
                                    <rect width="100%" height="100%" fill="url(#grid)" />
                                </svg>

                                {/* Incident dots — matching Stitch design */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-[#334155] text-xs font-mono">Colombia — Bogotá</span>
                                </div>
                                {/* Dot positions */}
                                <div className="absolute w-3 h-3 rounded-full bg-amber-400 border-2 border-amber-300 shadow-lg shadow-amber-400/50" style={{ top: "38%", left: "65%" }} title="Casi Accidente" />
                                <div className="absolute w-3 h-3 rounded-full bg-slate-400 border-2 border-slate-300 shadow-lg" style={{ top: "60%", left: "45%" }} title="Condición Insegura" />
                                <div className="absolute w-3 h-3 rounded-full bg-red-500 border-2 border-red-400 shadow-lg shadow-red-500/50" style={{ top: "72%", left: "72%" }} title="Accidente" />
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
            </main>
        </div>
    );
}

// Demo rows for empty state (matching Stitch design exactly)
const demoRows = [
    { company: "Acero Norte S.A.", location: "Planta B - Zona Carga", type: "casi_accidente", time: "10:30 AM", status: "synced" },
    { company: "Logística FastTrack", location: "Almacén Central", type: "condicion_insegura", time: "09:15 AM", status: "pending" },
    { company: "Constructora Vía", location: "Obra #452", type: "accidente", time: "Ayer", status: "synced" },
    { company: "Minera El Roble", location: "Túnel Sector 4", type: "casi_accidente", time: "Ayer", status: "synced" },
    { company: "Plásticos del Sur", location: "Planta Extrusión", type: "condicion_insegura", time: "2 días", status: "error" },
];
