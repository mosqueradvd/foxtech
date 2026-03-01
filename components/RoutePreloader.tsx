/**
 * components/RoutePreloader.tsx
 * Prefetches all primary app routes on mount while the device is online.
 * This ensures that page JS bundles are cached by the browser BEFORE
 * the user goes offline, allowing client-side navigation to work offline.
 *
 * Root cause of offline navigation failures in Next.js dev:
 * - next-pwa doesn't work with Turbopack (webpack incompatibility)
 * - Without a service worker, page JS bundles are only cached by the browser's
 *   HTTP cache and Next.js router soft-nav cache
 * - router.prefetch() forces Next.js to download and cache the page bundle now
 *
 * In production (next build + next start), next-pwa's service worker handles
 * this automatically, but prefetching here provides a safety net in both envs.
 */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const ROUTES_TO_PREFETCH = [
    "/",
    "/report",
    "/inspection",
    "/dashboard",
    "/offline",
];

export function RoutePreloader() {
    const router = useRouter();

    useEffect(() => {
        if (!navigator.onLine) return; // Only prefetch when online

        // Stagger prefetches to not compete for bandwidth
        ROUTES_TO_PREFETCH.forEach((route, i) => {
            setTimeout(() => {
                try {
                    router.prefetch(route);
                } catch {
                    // Silently ignore — prefetch is best-effort
                }
            }, i * 300); // 300ms apart
        });

        // Re-prefetch whenever we come back online (in case bundles expired)
        const onOnline = () => {
            ROUTES_TO_PREFETCH.forEach((route, i) => {
                setTimeout(() => {
                    try { router.prefetch(route); } catch { /* ignore */ }
                }, i * 200);
            });
        };

        window.addEventListener("online", onOnline);
        return () => window.removeEventListener("online", onOnline);
    }, [router]);

    return null;
}
