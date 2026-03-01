/**
 * components/ui/Input.tsx
 * FOXTECH dark input — 48px minimum height, glove-safe
 */
import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export function Input({ label, error, className = "", id, ...props }: InputProps) {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
        <div className="flex flex-col gap-1.5">
            {label && (
                <label htmlFor={inputId} className="text-sm font-semibold text-white/90">
                    {label}
                </label>
            )}
            <input
                id={inputId}
                className={[
                    "bg-[#2E3547] border border-[#334155] rounded-xl px-4 text-white placeholder:text-[#64748B]",
                    "min-h-[48px] text-base font-medium w-full outline-none transition-all",
                    "focus:border-[#F59E0B] focus:ring-2 focus:ring-amber-500/20",
                    error ? "border-red-500" : "",
                    className,
                ].join(" ")}
                {...props}
            />
            {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
        </div>
    );
}
