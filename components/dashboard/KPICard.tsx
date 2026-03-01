/**
 * components/dashboard/KPICard.tsx
 * Metric card for the consultant dashboard — large number, icons, delta indicator
 */
import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface KPICardProps {
    title: string;
    value: string | number;
    delta?: {
        value: string;
        direction: "up" | "down" | "neutral";
    };
    icon: React.ReactNode;
    accentColor?: string;
    subtitle?: string;
}

export function KPICard({
    title,
    value,
    delta,
    icon,
    accentColor = "#F59E0B",
    subtitle,
}: KPICardProps) {
    return (
        <div className="bg-[#252B3B] border border-[#334155] rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden">
            {/* Icon accent top-right */}
            <div
                className="absolute top-4 right-4 w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: `${accentColor}20`, color: accentColor }}
            >
                {icon}
            </div>

            <div>
                <p className="text-[#64748B] text-xs font-bold uppercase tracking-wider">{title}</p>
                <p className="text-white text-4xl font-bold mt-1 leading-none">{value}</p>
                {subtitle && <p className="text-[#64748B] text-xs mt-1">{subtitle}</p>}
            </div>

            {delta && (
                <div className="flex items-center gap-1">
                    {delta.direction === "up" ? (
                        <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                    ) : delta.direction === "down" ? (
                        <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                    ) : null}
                    <span
                        className={[
                            "text-xs font-semibold",
                            delta.direction === "up"
                                ? "text-green-400"
                                : delta.direction === "down"
                                    ? "text-red-400"
                                    : "text-[#64748B]",
                        ].join(" ")}
                    >
                        {delta.value}
                    </span>
                    <span className="text-[#64748B] text-xs">vs mes anterior</span>
                </div>
            )}
        </div>
    );
}
