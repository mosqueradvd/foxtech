/**
 * lib/sync.ts
 * Dexie → Supabase sync engine.
 *
 * BUG-FIX #3 — Preventing duplicate inserts:
 * 1. After uploading a photo/signature, the public URL is written back to Dexie
 *    IMMEDIATELY so on the next sync run, `photo_blob` is still present but
 *    `photo_url` is already set → the upload branch is skipped (no re-upload).
 * 2. The `online` event listener is debounced by 2 seconds to avoid firing
 *    multiple times from rapid reconnects (browser fires 'online' several times).
 * 3. `syncInProgress` is module-level (single flag across the session).
 * 4. `markIncidentSynced` updates sync_status in Dexie; the Supabase upsert is
 *    idempotent by `id` so even if called twice it won't create a new row.
 */
"use client";

import { supabase } from "./supabase";
import {
    getPendingIncidents,
    getPendingInspections,
    markIncidentSynced,
    markInspectionSynced,
    db,
} from "./db";

let syncInProgress = false;
let onlineDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// ── Upload helpers ─────────────────────────────────────────────────────────

async function uploadPhoto(incidentId: string, base64DataUrl: string): Promise<string | null> {
    try {
        const res = await fetch(base64DataUrl);
        const blob = await res.blob();
        const fileName = `incidents/${incidentId}/photo.jpg`;

        const { error } = await supabase.storage
            .from("incident-photos")
            .upload(fileName, blob, { contentType: "image/jpeg", upsert: true });

        if (error) throw error;

        const { data } = supabase.storage.from("incident-photos").getPublicUrl(fileName);
        return data.publicUrl;
    } catch (err) {
        console.warn("[FOXTECH] Photo upload failed:", err);
        return null;
    }
}

async function uploadSignature(incidentId: string, base64DataUrl: string): Promise<string | null> {
    try {
        const res = await fetch(base64DataUrl);
        const blob = await res.blob();
        const fileName = `signatures/${incidentId}.png`;

        const { error } = await supabase.storage
            .from("incident-photos")
            .upload(fileName, blob, { contentType: "image/png", upsert: true });

        if (error) throw error;

        const { data } = supabase.storage.from("incident-photos").getPublicUrl(fileName);
        return data.publicUrl;
    } catch (err) {
        console.warn("[FOXTECH] Signature upload failed:", err);
        return null;
    }
}

// ── Sync incidents ─────────────────────────────────────────────────────────

async function syncIncidents(): Promise<void> {
    const pending = await getPendingIncidents();
    if (!pending.length) return;

    for (const incident of pending) {
        try {
            // --- Photo: only upload if we have a blob AND no URL yet ---
            let photoUrl = incident.photo_url;
            if (incident.photo_blob && !photoUrl) {
                const uploaded = await uploadPhoto(incident.id, incident.photo_blob);
                if (uploaded) {
                    photoUrl = uploaded;
                    // Write URL back to Dexie immediately so next sync skips re-upload
                    await db.incidents.update(incident.id, { photo_url: uploaded });
                }
            }

            // --- Signature: same logic ---
            let signatureUrl = incident.signature_url;
            if (incident.signature_blob && !signatureUrl) {
                const uploaded = await uploadSignature(incident.id, incident.signature_blob);
                if (uploaded) {
                    signatureUrl = uploaded;
                    await db.incidents.update(incident.id, { signature_url: uploaded });
                }
            }

            // Map event_type to match Supabase constraints
            let mappedEventType = incident.event_type;
            if (mappedEventType === "accidente_trabajo") mappedEventType = "accidente";

            // --- Upsert to Supabase (idempotent by id) ---
            const { error } = await supabase.from("incidents").upsert(
                {
                    id: incident.id,
                    company_id: incident.company_id || "03426697-f564-4d5c-af78-864f1afe89a2", // Hardcoded company for demo
                    reported_by_name: incident.reported_by_name || null,
                    reported_by_role: incident.reported_by_role || null,
                    event_type: mappedEventType || null,
                    description: incident.reporter_description || incident.description || null,
                    witness_names: incident.witness_name || null,
                    worker_version: incident.reporter_description || null,
                    photo_url: photoUrl || null,
                    photo_lat: incident.photo_lat || null,
                    photo_lng: incident.photo_lng || null,
                    photo_timestamp: incident.photo_timestamp || null,
                    signature_url: signatureUrl || null,
                    location_name: incident.location_name || null,
                    synced_at: new Date().toISOString(),
                    created_at: incident.created_at,
                },
                {
                    onConflict: "id",   // explicit conflict target
                    ignoreDuplicates: false, // update on conflict
                }
            );

            if (!error) {
                await markIncidentSynced(incident.id);
                console.info("[FOXTECH] Incident synced:", incident.id);
            } else {
                console.error("[FOXTECH] Incident sync error:", error.message);
            }
        } catch (err) {
            console.error("[FOXTECH] Unexpected sync error for incident:", incident.id, err);
        }
    }
}

// ── Sync inspections ───────────────────────────────────────────────────────

async function syncInspections(): Promise<void> {
    const pending = await getPendingInspections();
    if (!pending.length) return;

    for (const inspection of pending) {
        try {
            // Upload photos & voice notes for failed items
            let itemsUpdated = false;
            const syncedItems = await Promise.all(
                (inspection.items || []).map(async (item) => {
                    let updatedItem = { ...item };
                    let changed = false;

                    // Photo upload
                    if (updatedItem.photo_blob && !updatedItem.photo_url) {
                        try {
                            const res = await fetch(updatedItem.photo_blob);
                            const blob = await res.blob();
                            const fileName = `inspections/${inspection.id}/${item.id}-photo.jpg`;

                            const { error } = await supabase.storage
                                .from("incident-photos")
                                .upload(fileName, blob, { contentType: "image/jpeg", upsert: true });

                            if (!error) {
                                const { data } = supabase.storage.from("incident-photos").getPublicUrl(fileName);
                                updatedItem.photo_url = data.publicUrl;
                                changed = true;
                            }
                        } catch (err) {
                            console.warn("[FOXTECH] Inspection photo upload failed:", err);
                        }
                    }

                    // Voice upload
                    if (updatedItem.action_plan?.voice_blob && !updatedItem.action_plan.voice_url) {
                        try {
                            const res = await fetch(updatedItem.action_plan.voice_blob);
                            const blob = await res.blob();
                            const fileName = `inspections/${inspection.id}/${item.id}-voice.webm`;

                            const { error } = await supabase.storage
                                .from("incident-photos")
                                .upload(fileName, blob, { contentType: "audio/webm", upsert: true });

                            if (!error) {
                                const { data } = supabase.storage.from("incident-photos").getPublicUrl(fileName);
                                updatedItem.action_plan = { ...updatedItem.action_plan, voice_url: data.publicUrl };
                                changed = true;
                            }
                        } catch (err) {
                            console.warn("[FOXTECH] Inspection voice upload failed:", err);
                        }
                    }

                    if (changed) itemsUpdated = true;
                    return updatedItem;
                })
            );

            // Write back URLs to Dexie immediately
            if (itemsUpdated) {
                await db.inspections.update(inspection.id, { items: syncedItems });
            }

            // Strip the base64 blobs so we don't send mega-strings to Postgres
            const dbItems = syncedItems.map((item) => {
                const copy: any = { ...item };
                delete copy.photo_blob;
                if (copy.action_plan) {
                    copy.action_plan = { ...copy.action_plan };
                    delete copy.action_plan.voice_blob;
                }
                return copy;
            });

            const { error } = await supabase.from("inspections").upsert(
                {
                    id: inspection.id,
                    company_id: inspection.company_id || null,
                    inspector_name: inspection.inspector_name || null,
                    template_name: inspection.template_name || null,
                    score_percent: inspection.score_percent ?? null,
                    items: dbItems,
                    location_name: inspection.location_name || null,
                    created_at: inspection.created_at,
                },
                { onConflict: "id", ignoreDuplicates: false }
            );

            if (!error) {
                await markInspectionSynced(inspection.id);
                console.info("[FOXTECH] Inspection synced:", inspection.id);
            }
        } catch (err) {
            console.error("[FOXTECH] Unexpected sync error for inspection:", inspection.id, err);
        }
    }
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Push all pending Dexie records to Supabase.
 * Safe to call multiple times — guarded by syncInProgress flag.
 */
export async function syncPendingData(): Promise<void> {
    if (typeof navigator === "undefined" || !navigator.onLine) return;
    if (syncInProgress) return;

    syncInProgress = true;
    try {
        await Promise.allSettled([syncIncidents(), syncInspections()]);
    } finally {
        syncInProgress = false;
    }
}

/**
 * Initialize the sync engine — call once at app startup.
 * Returns a cleanup function.
 */
export function initSync(): () => void {
    // Only sync on first mount if there are pending records (don't fire blindly)
    syncPendingData();

    const handleOnline = () => {
        // Debounce: browsers fire 'online' multiple times on reconnect
        if (onlineDebounceTimer) clearTimeout(onlineDebounceTimer);
        onlineDebounceTimer = setTimeout(() => {
            console.info("[FOXTECH] Network restored — syncing...");
            syncPendingData();
        }, 2000); // 2-second delay to let connection stabilize
    };

    window.addEventListener("online", handleOnline);

    return () => {
        window.removeEventListener("online", handleOnline);
        if (onlineDebounceTimer) clearTimeout(onlineDebounceTimer);
    };
}
