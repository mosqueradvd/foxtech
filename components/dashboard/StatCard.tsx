"use client";

import React, { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useTheme } from "next-themes";

interface StatCardProps {
    title: string;
    subtitle: string;
    value: number | string;
    unit?: string;
    trend?: string | number;
    trendIsUp?: boolean;
    color: string;
    icon: React.ElementType;
    progress?: number;
}

export function StatCard({
    title,
    subtitle,
    value,
    unit = "",
    trend,
    trendIsUp,
    color,
    icon: Icon,
    progress
}: StatCardProps) {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDark = mounted && resolvedTheme === "dark";

    const formattedValue = typeof value === "number"
        ? (value < 0.01 && value > 0 ? "<0.01" : value.toLocaleString("es-CO", { maximumFractionDigits: 2 }))
        : value;

    return (
        <div
            className="bg-[var(--bg-surface)] rounded-2xl p-6 transition-all shadow-md dark:shadow-[0_2px_20px_rgba(0,0,0,0.01)]"
        >
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-[var(--text-primary)] text-[12px] font-black tracking-widest leading-none mb-1 uppercase">{title}</h3>
                    <p className="text-[var(--text-muted)] text-[11px] font-bold uppercase tracking-wider">{subtitle}</p>
                </div>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border border-[var(--border)] ${isDark ? "bg-white/5" : "bg-slate-100"}`}>
                    <Icon className="w-4 h-4" style={{ color }} />
                </div>
            </div>

            <div className="flex items-end gap-3 mb-4">
                <div className="text-3xl font-black text-[var(--text-primary)] leading-none">
                    {formattedValue}
                    <span className="text-base ml-0.5">{unit}</span>
                </div>
                {trend !== undefined && (
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${trendIsUp
                        ? "bg-red-500/10 text-red-500 border-red-500/20"
                        : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        }`}>
                        {trendIsUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {trend}%
                    </div>
                )}
            </div>

        </div>
    );
}

export default StatCard;
