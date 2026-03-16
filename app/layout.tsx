/**
 * app/layout.tsx
 * Root layout — Space Grotesk font, PWA meta tags, OfflineBanner, sync init, route preloader
 */
import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Outfit } from "next/font/google";
import "./globals.css";
import { OfflineBanner } from "@/components/forms/OfflineBanner";
import { SyncInitializer } from "@/components/SyncInitializer";
import { RoutePreloader } from "@/components/RoutePreloader";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FOXTECH HSE",
  description: "Plataforma HSE/SST para trabajadores de campo y consultores de seguridad en Colombia",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FOXTECH",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#F59E0B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${spaceGrotesk.variable} ${outfit.variable}`}>
      <body className="font-[var(--font-space-grotesk)] bg-[#1A1F2E] text-white antialiased">
        {/* Registers public/sw.js (Workbox custom service worker) */}
        <ServiceWorkerRegistrar />
        {/* Persistent offline status banner */}
        <OfflineBanner />
        {/* Initializes Dexie→Supabase sync engine on client */}
        <SyncInitializer />
        {/* Prefetches all primary routes for offline navigation */}
        <RoutePreloader />
        {children}
      </body>
    </html>
  );
}
