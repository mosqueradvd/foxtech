/**
 * components/ui/Card.tsx
 * FOXTECH surface card with optional border and padding presets
 */
import React from "react";

interface CardProps {
    children: React.ReactNode;
    className?: string;
    /** Adds a subtle amber accent border */
    accent?: boolean;
    onClick?: () => void;
}

export function Card({ children, className = "", accent = false, onClick }: CardProps) {
    return (
        <div
            onClick={onClick}
            className={[
                "rounded-xl bg-[#252B3B] border",
                accent ? "border-amber-700/40" : "border-[#334155]",
                onClick ? "cursor-pointer active:scale-[0.98] transition-transform duration-150" : "",
                className,
            ].join(" ")}
        >
            {children}
        </div>
    );
}
