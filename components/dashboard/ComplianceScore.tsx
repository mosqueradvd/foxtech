/**
 * components/dashboard/ComplianceScore.tsx
 * SVG radial progress arc showing inspection compliance percentage.
 * Pure SVG — no external libraries.
 */
import React from "react";

interface ComplianceScoreProps {
    /** 0–100 */
    score: number;
    size?: number;
    label?: string;
}

export function ComplianceScore({ score, size = 120, label = "Cumplimiento" }: ComplianceScoreProps) {
    const radius = (size - 20) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(Math.max(score, 0), 100);
    const offset = circumference - (progress / 100) * circumference;

    // Color based on score
    const strokeColor =
        progress >= 80 ? "#22C55E" : progress >= 60 ? "#F59E0B" : "#EF4444";

    return (
        <div className="flex flex-col items-center gap-2">
            <svg width={size} height={size} className="-rotate-90">
                {/* Track */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#334155"
                    strokeWidth={10}
                />
                {/* Progress arc */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={10}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{ transition: "stroke-dashoffset 0.8s ease-in-out" }}
                />
            </svg>
            {/* Center text */}
            <div
                className="absolute flex flex-col items-center"
                style={{ marginTop: -(size / 2 + 20) }}
            >
                <span className="text-white text-xl font-bold" style={{ color: strokeColor }}>
                    {progress}%
                </span>
            </div>
            <p className="text-[#64748B] text-xs font-medium text-center">{label}</p>
        </div>
    );
}
