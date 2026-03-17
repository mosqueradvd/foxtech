"use client";

import React, { useEffect, useState } from "react";
import { RefreshCw, Bell, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

interface DashboardHeaderProps {
    children?: React.ReactNode;
    onRefresh?: () => void;
    loading?: boolean;
}

export function DashboardHeader({ children, onRefresh, loading }: DashboardHeaderProps) {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <header className="bg-[var(--bg-surface)] border-b border-[var(--border)] px-8 py-5 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-8 flex-1">
                {children}
            </div>

            <div className="flex items-center gap-4 ml-4">
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        className="p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-amber-500/50 transition-all cursor-pointer"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                )}
                
                <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-amber-500/50 transition-all cursor-pointer"
                    aria-label="Toggle Theme"
                >
                    {mounted ? (
                        theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />
                    ) : (
                        <Sun className="w-4 h-4" /> // Default fallback
                    )}
                </button>

                <button className="relative p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-amber-500/50 transition-all cursor-pointer">
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[var(--bg-primary)]" />
                </button>
            </div>
        </header>
    );
}

export default DashboardHeader;
