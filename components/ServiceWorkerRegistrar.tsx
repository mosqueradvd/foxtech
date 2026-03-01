/**
 * components/ServiceWorkerRegistrar.tsx
 * Registers public/sw.js at runtime.
 * Works in both next dev and next start — no build step needed.
 */
"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
    useEffect(() => {
        if (!("serviceWorker" in navigator)) return;

        const register = async () => {
            try {
                const reg = await navigator.serviceWorker.register("/sw.js", {
                    scope: "/",
                });

                reg.addEventListener("updatefound", () => {
                    const newWorker = reg.installing;
                    if (!newWorker) return;
                    newWorker.addEventListener("statechange", () => {
                        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                            // New SW ready — skip waiting so it activates immediately
                            newWorker.postMessage({ type: "SKIP_WAITING" });
                        }
                    });
                });

                console.info("[FOXTECH] Service worker registered:", reg.scope);
            } catch (err) {
                console.warn("[FOXTECH] Service worker registration failed:", err);
            }
        };

        // Register after page load so it doesn't compete for bandwidth
        if (document.readyState === "complete") {
            register();
        } else {
            window.addEventListener("load", register, { once: true });
        }
    }, []);

    return null;
}
