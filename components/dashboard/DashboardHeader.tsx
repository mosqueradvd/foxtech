"use client";

import React from "react";
import { RefreshCw, Bell } from "lucide-react";

interface DashboardHeaderProps {
    children?: React.ReactNode;
    onRefresh?: () => void;
    loading?: boolean;
}

export function DashboardHeader({ children, onRefresh, loading }: DashboardHeaderProps) {
    return (
        <header className="bg-[#1A1F2E] border-b border-[#1E2A3B] px-8 py-5 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-8 flex-1">
                {children}
            </div>

            <div className="flex items-center gap-4 ml-4">
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        className="p-2.5 rounded-xl bg-[#0F1219] border border-[#1E2A3B] text-[#64748B] hover:text-white hover:border-amber-500/50 transition-all cursor-pointer"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                )}
                <button className="relative p-2.5 rounded-xl bg-[#0F1219] border border-[#1E2A3B] text-[#64748B] hover:text-white hover:border-amber-500/50 transition-all cursor-pointer">
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0F1219]" />
                </button>
            </div>
        </header>
    );
}

export default DashboardHeader;
