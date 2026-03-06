/**
 * app/sign/layout.tsx
 * Minimal layout for public signature pages — no navbar, no sidebar.
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Firma Digital — FOXTECH SST",
    description: "Firma el documento de investigación de accidente de trabajo",
};

export default function SignLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es">
            <body style={{ margin: 0, padding: 0, background: "#0F1420", minHeight: "100dvh" }}>
                {children}
            </body>
        </html>
    );
}
