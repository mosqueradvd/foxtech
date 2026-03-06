/**
 * app/sign/layout.tsx
 * Minimal layout for public signature pages — no navbar, no sidebar.
 * NOTE: <html> and <body> are already provided by the root app/layout.tsx.
 * Nested layouts must NOT redeclare them.
 */
export default function SignLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
