"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import {
    LayoutDashboard,
    AlertTriangle,
    ClipboardList,
    Building2,
    FileText,
    BarChart2,
    Shield,
    User,
    MoreVertical,
} from "lucide-react";

interface NavItem {
    id: string;
    label: string;
    icon: React.ElementType;
    href: string;
}

const navItems: NavItem[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    { id: "inspections", label: "Inspecciones", icon: ClipboardList, href: "/dashboard/inspections" },
    { id: "investigations", label: "Investigaciones", icon: Building2, href: "/dashboard/investigations" },
    { id: "notifications", label: "Notificaciones", icon: AlertTriangle, href: "/dashboard/notifications" },
    { id: "stats", label: "Estadísticas", icon: BarChart2, href: "/dashboard/stats" },
    { id: "exports", label: "Exportaciones", icon: FileText, href: "/dashboard/exports" },
];

export function Sidebar() {
    const router = useRouter();
    const pathname = usePathname();

    return (
        <aside className="w-64 flex-shrink-0 bg-[#1A1F2E] border-r border-[#1E2A3B] flex flex-col h-full">
            {/* Logo */}
            <div className="px-6 py-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                        <Shield className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                        <p className="text-white font-black text-lg leading-none tracking-tight">FOXTECH</p>
                        <p className="text-[#64748B] text-[10px] font-bold tracking-[0.2em] uppercase mt-1">
                            Command Center
                        </p>
                    </div>
                </div>
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
                                    ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                    : "text-[#64748B] hover:bg-white/5 hover:text-white",
                            ].join(" ")}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* User profile at bottom */}
            <div className="p-4 border-t border-[#1E2A3B] flex items-center gap-3 mt-auto">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                    <User className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-bold leading-none truncate">Carlos Mendez</p>
                    <p className="text-[#64748B] text-[10px] font-bold uppercase tracking-wider mt-1 truncate">Senior Consultant</p>
                </div>
                <button className="text-[#64748B] hover:text-white transition-colors cursor-pointer">
                    <MoreVertical className="w-4 h-4" />
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;
