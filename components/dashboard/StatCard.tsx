"use client";

import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
    title: string;
    subtitle: string | React.ReactNode;
    value: number | string;
    unit?: string;
    trend?: string | number;
    trendIsUp?: boolean;
    color: string;
    borderBottomColor?: string;
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
    borderBottomColor,
    icon: Icon,
    progress
}: StatCardProps) {
    const formattedValue = typeof value === "number"
        ? (value < 0.01 && value > 0 ? "<0.01" : value.toLocaleString("es-CO", { maximumFractionDigits: 2 }))
        : value;

    return (
        <div className="bg-[#1A1F2E] border border-[#1E2A3B] rounded-2xl p-6 transition-all hover:bg-white/[0.02] relative overflow-hidden">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-white text-[12px] font-black tracking-widest leading-none mb-1 uppercase">{title}</h3>
                    <p className="text-[#64748B] text-[11px] font-bold uppercase tracking-wider">{subtitle}</p>
                </div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10">
                    <Icon className="w-4 h-4" style={{ color }} />
                </div>
            </div>
            <div className="flex items-end gap-3 mb-4">
                <div className="text-3xl font-black text-white leading-none">
                    {formattedValue}
                    <span className="text-base ml-0.5">{unit}</span>
                </div>
                {trend !== undefined && (
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${trendIsUp
                        ? "bg-red-500/10 text-red-500 border-red-500/20"
                        : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        }`}>
                        {trendIsUp ? <TrendingUp className="w-2 h-2" /> : <TrendingDown className="w-2 h-2" />}
                        {trend}%
                    </div>
                )}
            </div>
            {(progress !== undefined || typeof value === "number") && (
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                            width: `${progress !== undefined ? progress : Math.min(Number(value) * 10, 100)}%`,
                            backgroundColor: color
                        }}
                    />
                </div>
            )}
        </div>
    );
}

export default StatCard;
