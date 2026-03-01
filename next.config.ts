import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack is the default in Next.js 16 — no next-pwa (webpack-only, incompatible)
  // PWA is handled by public/sw.js (custom Workbox CDN service worker)
  // registered via components/ServiceWorkerRegistrar.tsx
  turbopack: {},

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "weekszxsuuxwfxirgbmi.supabase.co",
      },
    ],
  },
};

export default nextConfig;
