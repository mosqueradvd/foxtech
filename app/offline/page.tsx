/**
 * app/offline/page.tsx
 * Served by the service worker when navigation fails (user is offline).
 * This page is pre-cached by next-pwa so it's always available.
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WifiOff, RefreshCw, Home } from "lucide-react";

export default function OfflinePage() {
    const router = useRouter();
    const [checking, setChecking] = useState(false);

    // Watch for reconnection and auto-redirect
    useEffect(() => {
        const onOnline = () => router.replace("/");
        window.addEventListener("online", onOnline);
        return () => window.removeEventListener("online", onOnline);
    }, [router]);

    const handleRetry = () => {
        setChecking(true);
        setTimeout(() => {
            if (navigator.onLine) {
                router.replace("/");
            } else {
                setChecking(false);
            }
        }, 800);
    };

    return (
        <div className="min-h-dvh bg-[#1A1F2E] flex flex-col items-center justify-center px-6 gap-8 text-center">
            {/* Animated circle */}
            <div className="relative">
                <div className="w-24 h-24 rounded-full bg-amber-900/30 border border-amber-700/40 flex items-center justify-center">
                    <WifiOff className="w-10 h-10 text-[#F59E0B]" />
                </div>
                {/* Ripple */}
                <div className="absolute inset-0 rounded-full border border-amber-600/20 animate-ping" />
            </div>

            <div className="space-y-2">
                <h1 className="text-white font-black text-2xl">Sin conexión</h1>
                <p className="text-[#64748B] text-sm max-w-xs mx-auto leading-relaxed">
                    No hay acceso a internet. Los datos que hayas capturado están guardados localmente y se sincronizarán automáticamente cuando vuelvas a conectarte.
                </p>
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-2 bg-[#252B3B] border border-[#334155] rounded-xl px-5 py-3">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                <span className="text-amber-300 text-sm font-semibold">Modo offline activo</span>
            </div>

            <div className="flex flex-col gap-3 w-full max-w-xs">
                <button
                    onClick={handleRetry}
                    disabled={checking}
                    className="flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-[#F59E0B] text-black font-bold text-base hover:bg-[#D97706] transition-colors disabled:opacity-60"
                >
                    <RefreshCw className={`w-5 h-5 ${checking ? "animate-spin" : ""}`} />
                    {checking ? "Verificando..." : "Reintentar conexión"}
                </button>
                <button
                    onClick={() => router.push("/")}
                    className="flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-[#252B3B] border border-[#334155] text-white font-bold text-base hover:bg-[#2E3547] transition-colors"
                >
                    <Home className="w-5 h-5" />
                    Ir al inicio
                </button>
            </div>

            <p className="text-[#334155] text-xs">
                FOXTECH HSE • Datos protegidos offline
            </p>
        </div>
    );
}
