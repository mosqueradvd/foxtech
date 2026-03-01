/**
 * components/forms/OfflineBanner.tsx
 * Persistent offline status indicator — reads navigator.onLine in real time.
 * Amber when offline, subtle green check when online.
 * 'use client' — must read browser APIs.
 */
"use client";

import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";

export function OfflineBanner() {
    const [isOnline, setIsOnline] = useState(true);
    const [visible, setVisible] = useState(false); // only show when relevant

    useEffect(() => {
        // Initial state
        const online = navigator.onLine;
        setIsOnline(online);
        setVisible(!online); // only show banner if already offline

        const handleOnline = () => {
            setIsOnline(true);
            // Brief "back online" confirmation for 3 seconds
            setVisible(true);
            setTimeout(() => setVisible(false), 3000);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setVisible(true);
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    if (!visible) return null;

    return (
        <div
            role="alert"
            aria-live="polite"
            className={[
                "w-full px-4 py-2 flex items-center gap-2 text-sm font-semibold z-50",
                "transition-all duration-300",
                isOnline
                    ? "bg-green-900/80 text-green-300 border-b border-green-700/50"
                    : "bg-amber-900/90 text-amber-300 border-b border-amber-700/50",
            ].join(" ")}
        >
            {isOnline ? (
                <>
                    <Wifi className="w-4 h-4 flex-shrink-0" />
                    <span>Conexión restaurada — sincronizando datos...</span>
                </>
            ) : (
                <>
                    <WifiOff className="w-4 h-4 flex-shrink-0" />
                    <span>Sin conexión — los datos se guardan localmente</span>
                </>
            )}
        </div>
    );
}
