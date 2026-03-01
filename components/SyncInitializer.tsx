/**
 * components/SyncInitializer.tsx
 * Client component that initializes the Dexie→Supabase sync engine.
 * Renders nothing — purely a side-effect mount.
 */
"use client";

import { useEffect } from "react";
import { initSync } from "@/lib/sync";

export function SyncInitializer() {
    useEffect(() => {
        const cleanup = initSync();
        return cleanup;
    }, []);

    return null;
}
