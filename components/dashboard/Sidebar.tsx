"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
    LayoutDashboard,
    AlertTriangle,
    ClipboardList,
    Building2,
    Factory,
    FileText,
    BarChart2,
    Shield,
    User,
    MoreVertical,
    ChevronDown,
    ChevronsUpDown,
    ChevronUp,
    Search,
    ShieldAlert,
    Sun,
    Moon,
} from "lucide-react";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useTheme } from "next-themes";

interface NavItem {
    id: string;
    label: string;
    icon: React.ElementType;
    href: string;
}

const navItems: NavItem[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    { id: "companies", label: "Empresas", icon: Factory, href: "/dashboard/companies" },
    { id: "inspections", label: "Inspecciones", icon: ClipboardList, href: "/dashboard/inspections" },
    { id: "investigations", label: "Investigaciones", icon: Building2, href: "/dashboard/investigations" },
    { id: "notifications", label: "Notificaciones", icon: AlertTriangle, href: "/dashboard/notifications" },
    { id: "stats", label: "Estadísticas", icon: BarChart2, href: "/dashboard/stats" },
    { id: "exports", label: "Exportaciones", icon: FileText, href: "/dashboard/exports" },
];

export function Sidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const { activeCompany, companies, changeActiveCompany } = useActiveCompany();
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredCompanies = companies.filter(c =>
        c.razon_social.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.nit?.includes(searchQuery)
    );

    return (
        <aside className="w-64 flex-shrink-0 bg-[var(--bg-surface)] border-r border-[var(--border)] flex flex-col h-full shadow-sm dark:shadow-none">
            {/* Logo */}
            <div className="px-6 py-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                        <Shield className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                        <p className="text-[var(--text-primary)] font-black text-lg leading-none tracking-tight">FOXTECH</p>
                        <p className="text-[var(--text-muted)] text-[10px] font-bold tracking-[0.2em] uppercase mt-1">
                            Command Center
                        </p>
                    </div>
                </div>

                {/* Company Selector */}
                {companies.length > 0 && (
                    <div className="mt-10 relative" ref={dropdownRef}>
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] px-2 mb-2 block">
                            Empresa en Gestión
                        </label>

                        {/* Trigger Button */}
                        <button
                            type="button"
                            onClick={() => setIsOpen(!isOpen)}
                            className={`w-full bg-[var(--bg-surface)] border ${isOpen ? "border-amber-500/50 bg-[var(--bg-card)]" : "border-[var(--border)] hover:border-amber-500/30"} transition-all rounded-xl p-3 flex items-center justify-between cursor-pointer`}
                        >
                            <div className="flex items-center gap-3 overflow-hidden text-left">
                                <div className="w-8 h-8 shrink-0 bg-amber-500/20 text-amber-500 rounded-lg flex items-center justify-center font-black text-sm border border-amber-500/10">
                                    {activeCompany?.razon_social?.charAt(0).toUpperCase() || "E"}
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-xs font-bold text-[var(--text-primary)] truncate uppercase leading-tight">
                                        {activeCompany?.razon_social || "Seleccionar..."}
                                    </p>
                                    <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                                        {activeCompany?.nit ? `NIT: ${activeCompany.nit}` : "Sin NIT"}
                                    </p>
                                </div>
                            </div>
                            {isOpen ? (
                                <ChevronUp className="w-4 h-4 text-amber-500" />
                            ) : (
                                <ChevronsUpDown className="w-4 h-4 text-[#64748B] group-hover:text-amber-500 transition-colors" />
                            )}
                        </button>

                        {/* Dropdown Menu */}
                        {isOpen && (
                            <div className="absolute top-full left-0 w-[350px] mt-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-50">
                                <div className="p-3 border-b border-[var(--border)] bg-[var(--bg-card)]">
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder="Buscar empresa..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[12px] !pl-10 py-1.5 focus:outline-none focus:border-amber-500/50 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                                        />
                                    </div>
                                </div>
                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1.5 space-y-1">
                                    {filteredCompanies.map(c => {
                                        const isActive = c.id === activeCompany?.id;
                                        return (
                                            <button
                                                key={c.id}
                                                onClick={() => {
                                                    changeActiveCompany(c.id);
                                                    setIsOpen(false);
                                                    setSearchQuery("");
                                                }}
                                                className={`w-full text-left p-2.5 rounded-lg transition-all cursor-pointer relative group ${isActive
                                                    ? "bg-amber-500/10 border border-amber-500/30 ring-1 ring-amber-500/20"
                                                    : "hover:bg-[#F1F5F9] dark:hover:bg-white/5"
                                                    }`}
                                            >
                                                {isActive && (
                                                    <div className="absolute top-0 right-0 w-12 h-12 bg-amber-500/5 -mr-6 -mt-6 rotate-45"></div>
                                                )}
                                                <div className="flex items-center justify-between mb-1 relative">
                                                    <span className={`text-[16px] font-bold truncate uppercase ${isActive ? "text-amber-500" : "text-[var(--text-primary)]"}`}>
                                                        {c.razon_social}
                                                    </span>
                                                    {isActive && (
                                                        <span className="text-[8px] bg-amber-500 text-[#0F1219] px-1.5 py-0.5 rounded-sm font-black uppercase tracking-tighter">
                                                            ACTUAL
                                                        </span>
                                                    )}
                                                </div>
                                                <div className={`flex items-center gap-2 text-[12px] uppercase font-medium relative ${isActive ? "text-amber-500/70" : "text-[var(--text-muted)]"}`}>
                                                    <span>NIT: {c.nit || "N/A"}</span>
                                                    {(c.arl || c.clase_riesgo) && <span className="w-1 h-1 rounded-full bg-current opacity-40"></span>}
                                                    {c.arl && <span>{c.arl}</span>}
                                                    {c.clase_riesgo !== undefined && <span> • Clase {c.clase_riesgo}</span>}
                                                </div>
                                            </button>
                                        );
                                    })}
                                    {filteredCompanies.length === 0 && (
                                        <p className="text-center text-[#64748B] text-xs py-4">No se encontraron empresas</p>
                                    )}
                                </div>
                                <div className="p-2 bg-[var(--bg-card)] border-t border-[var(--border)]">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            router.push("/dashboard/companies");
                                            setIsOpen(false);
                                        }}
                                        className="w-full py-2 text-[12px] font-bold text-amber-500 flex items-center justify-center gap-2 hover:bg-amber-500/10 rounded transition-colors uppercase tracking-[0.1em] cursor-pointer"
                                    >
                                        <Building2 className="w-3.5 h-3.5" />
                                        Ver todas las empresas
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Nav items */}
            <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.href === "/dashboard"
                        ? pathname === "/dashboard"
                        : pathname.startsWith(item.href);

                    return (
                        <button
                            key={item.id}
                            onClick={() => router.push(item.href)}
                            className={[
                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer",
                                isActive
                                    ? "bg-amber-500 text-black dark:bg-amber-500/10 dark:text-amber-500 border border-amber-500/20"
                                    : "text-[var(--text-muted)] hover:bg-[#F1F5F9] hover:text-[#0F1219] dark:hover:bg-white/5 dark:hover:text-white",
                            ].join(" ")}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* User profile at bottom */}
            <div className="p-4 border-t border-[var(--border)] flex items-center gap-3 mt-auto">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                    <User className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[var(--text-primary)] text-sm font-bold leading-none truncate">Carlos Mendez</p>
                    <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider mt-1 truncate">Senior Consultant</p>
                </div>
                
                <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="p-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-amber-500/50 transition-all cursor-pointer flex items-center justify-center shrink-0"
                    aria-label="Toggle Theme"
                >
                    {mounted ? (
                        theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />
                    ) : (
                        <Sun className="w-4 h-4" />
                    )}
                </button>

                <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer ml-1">
                    <MoreVertical className="w-4 h-4" />
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;
