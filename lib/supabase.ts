/**
 * lib/supabase.ts
 * Supabase browser client — singleton pattern
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── TypeScript Row Types ────────────────────────────────────────────

export type Company = {
    id: string;
    consultant_id?: string;
    name: string;
    industry?: string;
    location?: string;
    created_at?: string;
};

export type Incident = {
    id: string;
    company_id?: string;
    reported_by_name?: string;
    reported_by_role?: string;
    event_type?: "casi_accidente" | "accidente" | "condicion_insegura";
    description?: string;
    photo_url?: string;
    photo_lat?: number;
    photo_lng?: number;
    photo_timestamp?: string;
    signature_url?: string;
    location_name?: string;
    synced_at?: string;
    created_at?: string;
};

export type Inspection = {
    id: string;
    company_id?: string;
    inspector_name?: string;
    template_name?: string;
    score_percent?: number;
    items?: InspectionItem[];
    location_name?: string;
    created_at?: string;
};

export type InspectionItem = {
    id: string;
    label: string;
    required: boolean;
    checked: boolean | null; // null = not evaluated
};
