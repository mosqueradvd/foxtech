"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, MapPin, Users, Plus, Search } from "lucide-react";
import { supabase, type Company } from "@/lib/supabase";
import { useTheme } from "next-themes";

const lightStyles = {
    bg: "bg-gray-50",
    header: "bg-white border-b border-gray-200",
    title: "text-gray-900",
    subtitle: "text-gray-500",
    inputBg: "bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500/50",
    card: "bg-white border-gray-200 hover:bg-gray-50/50",
    cardTitle: "text-gray-900",
    cardSubtitle: "text-gray-500",
    badge: "bg-gray-100 text-gray-600 border border-gray-200",
    statsText: "text-gray-600",
    editButton: "bg-transparent text-gray-500 border border-gray-300 hover:bg-gray-100/50 hover:text-gray-700",
    emptyCard: "border-gray-300 hover:border-gray-400 hover:bg-gray-50/50",
    footer: "bg-white border-t border-gray-200 text-gray-500",
    footerTextHighlight: "text-gray-900",
    activaBadge: "bg-green-100 text-green-800 border-green-200",
    plusIcon: "bg-gray-100 text-gray-500",
};

const darkStyles = {
    bg: "bg-[#0B0D14]",
    header: "bg-[#1A1F2E] border-b border-[#1E2A3B]",
    title: "text-white",
    subtitle: "text-[#64748B]",
    inputBg: "bg-[#141824] border-[#1E2A3B] text-white focus:border-[#F59E0B]/50",
    card: "bg-[#141824] border-[#1E2A3B] hover:bg-white/[0.02]",
    cardTitle: "text-white",
    cardSubtitle: "text-[#64748B]",
    badge: "bg-[#1E2A3B] text-[#94A3B8] border border-[#334155]",
    statsText: "text-[#94A3B8]",
    editButton: "bg-transparent text-[#94A3B8] border border-[#334155] hover:bg-[#1E2A3B] hover:text-white",
    emptyCard: "border-[#1E2A3B] hover:border-[#334155] hover:bg-white/[0.02]",
    footer: "bg-[#141824] border-t border-[#1E2A3B] text-[#64748B]",
    footerTextHighlight: "text-white",
    activaBadge: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    plusIcon: "bg-[#1E2A3B] text-[#94A3B8]",
};

export default function CompaniesPage() {
    const router = useRouter();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);

    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDark = mounted && resolvedTheme === "dark";
    const s = isDark ? darkStyles : lightStyles;

    useEffect(() => {
        const loadCompanies = async () => {
            const { data, error } = await supabase
                .from("companies")
                .select("*")
                .order("created_at", { ascending: false });

            if (!error && data) {
                setCompanies(data as Company[]);
            }
            setActiveCompanyId(localStorage.getItem("foxtech_active_company_id"));
            setLoading(false);
        };

        loadCompanies();
    }, []);

    const handleSelectActive = (id: string, name: string) => {
        localStorage.setItem("foxtech_active_company_id", id);
        setActiveCompanyId(id);

        window.dispatchEvent(new Event("foxtech_company_changed"));

        // Instant redirect to dashboard
        router.push("/dashboard");
    };

    const activeConsultant = "Leonardo Pulido"; // Hardcoded for now
    const [searchQuery, setSearchQuery] = useState("");

    const filteredCompanies = companies.filter(c =>
        c.razon_social.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.nit && c.nit.includes(searchQuery))
    );

    return (
        <div className={`flex flex-col h-full ${s.bg}`} style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* ── HEADER ── */}
            <header className={`flex-shrink-0 ${s.header} px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10 sticky top-0`}>
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className={`${s.title} font-black text-xl tracking-tight leading-none uppercase`}>Mis Empresas</h1>
                        <p className={`${s.subtitle} text-md font-meium mt-1`}>
                            Gestión de empresas cliente centralizada
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                        <input
                            id="search-company"
                            type="text"
                            placeholder="Buscar empresa..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-[280px] !h-[36px] !min-h-0 ${s.inputBg} border rounded-lg !pl-10 pr-4 py-2 text-sm focus:outline-none transition-colors`}
                        />
                    </div>
                    <button
                        onClick={() => router.push("/dashboard/companies/new")}
                        className="flex items-center gap-2 px-5 h-[36px] bg-[#F59E0B] text-black text-xs font-black rounded-lg hover:bg-amber-400 transition-colors uppercase tracking-tight cursor-pointer"
                    >
                        <Building2 className="w-4 h-4" /> Nueva Empresa
                    </button>
                </div>
            </header>

            {/* ── CONTENT ── */}
            <div className="flex-1 overflow-y-auto p-10">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-6 h-6 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCompanies.map(company => {
                            const isActive = company.id === activeCompanyId;
                            return (
                                <div key={company.id} className={`${s.card} rounded-[20px] p-6 relative flex flex-col transition-all border-2 ${isActive ? "!border-[#F59E0B]" : "border-transparent"}`}>
                                    {isActive && (
                                        <div className={`absolute top-6 right-6 ${s.activaBadge} text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded`}>
                                            ACTIVA
                                        </div>
                                    )}

                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl mb-5 ${isActive ? "bg-[#F59E0B] text-black" : isDark ? "bg-[#252B3B] text-white" : "bg-gray-100 text-gray-800"}`}>
                                        {company.razon_social.charAt(0).toUpperCase()}
                                    </div>

                                    <h3 className={`${s.cardTitle} font-bold text-lg leading-tight mb-1`} title={company.razon_social}>
                                        {company.razon_social}
                                    </h3>
                                    <p className={`${s.cardSubtitle} text-sm mb-5`}>
                                        NIT: {company.nit}{company.nit_dv ? `${company.nit_dv}` : ""}
                                    </p>

                                    <div className="flex items-center gap-2 mb-6">
                                        <span className={`px-2.5 py-1 rounded ${s.badge} text-[10px] font-bold`}>
                                            ARL {company.arl || "Positiva"}
                                        </span>
                                        <span className={`px-2.5 py-1 rounded ${s.badge} text-[10px] font-bold`}>
                                            Clase {company.clase_riesgo || "3"}
                                        </span>
                                    </div>

                                    <div className="space-y-3 mb-8 flex-1">
                                        <div className={`flex items-center gap-3 text-sm ${s.statsText}`}>
                                            <Users className="w-4 h-4" />
                                            <span>{company.employee_count || 0} trabajadores</span>
                                        </div>
                                        <div className={`flex items-center gap-3 text-sm ${s.statsText}`}>
                                            <MapPin className="w-4 h-4" />
                                            <span className="truncate">{company.municipio || "Bogotá D.C."}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mt-auto">
                                        {!isActive && (
                                            <button
                                                onClick={() => handleSelectActive(company.id, company.razon_social)}
                                                className="py-2.5 rounded-lg text-xs font-black bg-[#F59E0B] text-black hover:bg-amber-400 cursor-pointer transition-colors"
                                            >
                                                SELECCIONAR
                                            </button>
                                        )}
                                        <button
                                            className={`py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${s.editButton} ${isActive ? "col-span-2" : ""}`}
                                        >
                                            EDITAR
                                        </button>
                                    </div>
                                </div>
                            )
                        })}

                        {/* Add New Company Card */}
                        <div
                            onClick={() => router.push("/dashboard/companies/new")}
                            className={`bg-transparent border-2 border-dashed ${s.emptyCard} rounded-[20px] p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors min-h-[360px]`}
                        >
                            <div className={`w-14 h-14 rounded-full ${s.plusIcon} flex items-center justify-center mb-6`}>
                                <Plus className="w-6 h-6" />
                            </div>
                            <h3 className={`${s.cardTitle} font-black uppercase text-sm tracking-widest mb-2`}>
                                AGREGAR EMPRESA
                            </h3>
                            <p className={`${s.cardSubtitle} text-sm max-w-[200px]`}>
                                Configura los detalles de tu nueva empresa cliente
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* ── FOOTER ── */}
            <footer className={`flex-shrink-0 ${s.footer} px-8 py-3 flex items-center justify-between text-[10px] font-bold tracking-widest uppercase`}>
                <div>
                    CONSULTOR: <span className={`${s.footerTextHighlight} ml-2`}>SSTA EN LA ROCA SAS — LEONARDO PULIDO</span>
                </div>
                <div>
                    <span className="px-3 py-1 rounded bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B]">
                        PLAN PROFESIONAL
                    </span>
                </div>
                <div className="flex items-center gap-4 text-[#64748B]">
                    <span>FOXTECH V2.4.0</span>
                    <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        SISTEMAS ESTABLES
                    </span>
                </div>
            </footer>
        </div>
    );
}
