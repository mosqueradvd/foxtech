/**
 * components/forms/FormStep.tsx
 * 3-step form shell with CSS-only progress indicator and back/next navigation.
 * No JS animation libraries — transitions use pure CSS classes.
 */
"use client";

import React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface FormStepProps {
    step: 1 | 2 | 3;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    onBack?: () => void;
    onNext?: () => void;
    nextLabel?: string;
    nextDisabled?: boolean;
    direction?: "forward" | "back";
}

export function FormStep({
    step,
    title,
    subtitle,
    children,
    onBack,
    onNext,
    nextLabel = "Continuar",
    nextDisabled = false,
    direction = "forward",
}: FormStepProps) {
    return (
        <div className="flex flex-col min-h-dvh bg-[#1A1F2E]">
            {/* Step indicator */}
            <div className="flex flex-col items-center gap-2 pt-6 pb-2 px-6">
                <div className="flex items-center gap-1.5">
                    {[1, 2, 3].map((s) => (
                        <div
                            key={s}
                            className={[
                                "rounded-full transition-all duration-300",
                                s === step
                                    ? "w-8 h-2 bg-[#F59E0B]"
                                    : s < step
                                        ? "w-2 h-2 bg-amber-700"
                                        : "w-2 h-2 bg-[#334155]",
                            ].join(" ")}
                        />
                    ))}
                </div>
                <p className="text-[#F59E0B] text-xs font-bold tracking-widest uppercase">
                    PASO {step} / 3
                </p>
            </div>

            {/* Scrollable content */}
            <div
                className={[
                    "flex-1 px-5 pb-32 overflow-y-auto",
                    direction === "forward" ? "step-enter" : "step-enter-back",
                ].join(" ")}
            >
                <h1 className="text-white text-3xl font-bold mt-4 mb-1 leading-tight">{title}</h1>
                {subtitle && (
                    <p className="text-[#64748B] text-sm font-medium mb-6">{subtitle}</p>
                )}
                <div className="mt-6 space-y-4">{children}</div>
            </div>

            {/* Fixed bottom nav */}
            <div className="fixed bottom-0 left-0 right-0 p-5 bg-[#1A1F2E]/95 backdrop-blur-sm border-t border-[#334155]">
                <div className="flex gap-3 max-w-lg mx-auto">
                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            className="flex items-center justify-center min-h-[48px] min-w-[48px] rounded-xl border border-[#334155] bg-[#252B3B] hover:bg-[#2E3547] active:scale-95 transition-all"
                        >
                            <ArrowLeft className="w-5 h-5 text-white" />
                        </button>
                    )}
                    {onNext && (
                        <button
                            type="button"
                            onClick={onNext}
                            disabled={nextDisabled}
                            className={[
                                "flex-1 flex items-center justify-center gap-2",
                                "min-h-[48px] rounded-xl text-base font-bold transition-all duration-200 active:scale-[0.98]",
                                nextDisabled
                                    ? "bg-amber-900/40 text-amber-800 cursor-not-allowed"
                                    : "bg-[#F59E0B] hover:bg-[#D97706] text-black shadow-lg shadow-amber-900/30",
                            ].join(" ")}
                        >
                            {nextLabel} <ArrowRight className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
