/**
 * components/ui/Button.tsx
 * FOXTECH primary/secondary/ghost button — min 48px tap target (glove-safe)
 */
import React from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    loading?: boolean;
    fullWidth?: boolean;
    icon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
    primary:
        "bg-[#F59E0B] hover:bg-[#D97706] active:bg-[#B45309] text-black font-bold shadow-lg shadow-amber-900/30",
    secondary:
        "bg-[#252B3B] hover:bg-[#2E3547] active:bg-[#374151] text-white border border-[#334155]",
    ghost:
        "bg-transparent hover:bg-white/5 active:bg-white/10 text-[#F59E0B]",
    danger:
        "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold",
};

export function Button({
    variant = "primary",
    loading = false,
    fullWidth = false,
    icon,
    children,
    className = "",
    disabled,
    ...props
}: ButtonProps) {
    return (
        <button
            disabled={disabled || loading}
            className={[
                "inline-flex items-center justify-center gap-2 rounded-xl px-6",
                "min-h-[48px] text-base font-semibold transition-all duration-200",
                "active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed",
                variantStyles[variant],
                fullWidth ? "w-full" : "",
                className,
            ].join(" ")}
            {...props}
        >
            {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                icon && <span className="flex-shrink-0">{icon}</span>
            )}
            {children}
        </button>
    );
}
