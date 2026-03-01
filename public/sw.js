/**
 * public/sw.js
 * FOXTECH HSE — Custom Workbox service worker.
 *
 * IMPORTANT: This service worker ONLY works correctly in production builds
 * (next build && next start). In development (next dev), Next.js serves all
 * /_next/static assets with Cache-Control: no-store, making CSS/JS caching
 * impossible regardless of service worker strategy. This is by design in all
 * Next.js dev servers and cannot be worked around without a production build.
 *
 * Strategies:
 *  - Next.js static (JS/CSS): StaleWhileRevalidate — serve from cache, update in bg
 *  - App pages/documents:     NetworkFirst (3s) → cache → /offline fallback
 *  - Supabase API:            NetworkFirst (5s) → cache
 *  - Images (Supabase CDN):   CacheFirst (7 days)
 *  - Google Fonts:            CacheFirst (1 year)
 */

importScripts("https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js");

// ── Workbox lifecycle API (avoids InvalidStateError from manual listeners) ──
workbox.core.skipWaiting();
workbox.core.clientsClaim();

const { registerRoute, setCatchHandler } = workbox.routing;
const { NetworkFirst, StaleWhileRevalidate, CacheFirst } = workbox.strategies;
const { CacheableResponsePlugin } = workbox.cacheableResponse;
const { ExpirationPlugin } = workbox.expiration;

// ── Pre-cache the offline fallback page immediately on install ──────────────
// (so it's available even before any navigation happens)
workbox.precaching.precacheAndRoute([
    { url: "/offline", revision: "v2" },
    { url: "/manifest.json", revision: "v1" },
    { url: "/icon-192.png", revision: "v1" },
    { url: "/icon-512.png", revision: "v1" },
]);

// ── Google Fonts ────────────────────────────────────────────────────────────
registerRoute(
    ({ url }) =>
        url.origin === "https://fonts.googleapis.com" ||
        url.origin === "https://fonts.gstatic.com",
    new CacheFirst({
        cacheName: "foxtech-fonts",
        plugins: [
            new CacheableResponsePlugin({ statuses: [0, 200] }),
            new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 }),
        ],
    })
);

// ── Next.js static assets (JS/CSS chunks, produced by next build) ───────────
// In production these have stable content-hash filenames → safe to cache long-term
registerRoute(
    ({ url }) => url.pathname.startsWith("/_next/static/"),
    new StaleWhileRevalidate({
        cacheName: "foxtech-next-static",
        plugins: [
            new CacheableResponsePlugin({ statuses: [0, 200] }),
            new ExpirationPlugin({ maxEntries: 400, maxAgeSeconds: 30 * 24 * 60 * 60 }),
        ],
    })
);

// ── Next.js image optimization ──────────────────────────────────────────────
registerRoute(
    ({ url }) => url.pathname.startsWith("/_next/image"),
    new CacheFirst({
        cacheName: "foxtech-next-image",
        plugins: [
            new CacheableResponsePlugin({ statuses: [0, 200] }),
            new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 }),
        ],
    })
);

// ── Supabase API + Storage ──────────────────────────────────────────────────
registerRoute(
    ({ url }) => url.hostname.includes("supabase.co"),
    new NetworkFirst({
        cacheName: "foxtech-supabase",
        networkTimeoutSeconds: 5,
        plugins: [
            new CacheableResponsePlugin({ statuses: [0, 200] }),
            new ExpirationPlugin({ maxEntries: 150, maxAgeSeconds: 24 * 60 * 60 }),
        ],
    })
);

// ── App pages / HTML documents ──────────────────────────────────────────────
registerRoute(
    ({ request, url }) =>
        request.destination === "document" && !url.pathname.startsWith("/_next"),
    new NetworkFirst({
        cacheName: "foxtech-pages",
        networkTimeoutSeconds: 3,
        plugins: [
            new CacheableResponsePlugin({ statuses: [0, 200] }),
            new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 24 * 60 * 60 }),
        ],
    })
);

// ── Fallback: serve /offline for any document navigation that fails ─────────
setCatchHandler(async ({ request }) => {
    if (request.destination === "document") {
        // Try the precache first
        const cached = await workbox.precaching.matchPrecache("/offline");
        if (cached) return cached;
        // Fallback to fetching /offline live (won't work if truly offline, but best effort)
        return fetch("/offline");
    }
    return Response.error();
});
