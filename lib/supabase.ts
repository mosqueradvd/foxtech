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
    nit?: string;
    arl?: string;
    employee_count?: number;
    created_at?: string;
};

export type Worker = {
    id: string;
    company_id?: string;
    full_name: string;
    cedula?: string;
    eps?: string;
    birth_date?: string;
    sex?: "M" | "F" | "Otro";
    education_level?: string;
    hire_date?: string;
    job_title?: string;
    employment_type?: string;
    created_at?: string;
};

/**
 * Event = the full DB row for the `incidents` table.
 * Módulo 1 fields come from field workers.
 * Módulo 2 fields are added by the SST consultant via the web panel.
 */
export type Event = {
    id: string;
    company_id?: string;

    // ── Módulo 1 — Reporte Preliminar ─────────────────────────
    reported_by_name?: string;
    reported_by_role?: string;
    event_type?: string;
    description?: string;
    worker_version?: string;
    witness_names?: string;
    photo_url?: string;
    photo_lat?: number;
    photo_lng?: number;
    photo_timestamp?: string;
    signature_url?: string;
    location_name?: string;

    // ── Módulo 2 — Clasificación y Caracterización ────────────
    classification_status?: "pending" | "classified" | "investigated";
    classified_by?: string;
    classified_at?: string;

    // Worker data (denormalized copy at time of event)
    worker_id?: string;
    worker_name?: string;
    worker_cedula?: string;
    worker_birth_date?: string;
    worker_sex?: string;
    worker_eps?: string;
    worker_arl?: string;
    worker_job_title?: string;
    worker_employment_type?: string;
    worker_seniority_months?: number;
    worker_contract_start?: string;
    worker_education_level?: string;

    // Event classification
    classification?: string;
    event_date?: string;
    event_time?: string;
    event_day_of_week?: string;
    event_department?: string;
    event_city?: string;
    event_address?: string;

    // Injury classification (FURAT)
    disability_days?: number;
    injury_nature?: string;
    body_part?: string;
    accident_mechanism?: string;
    hazard_type?: string;

    // Audit
    synced_at?: string;
    created_at?: string;
    updated_at?: string;
};

/** Backward-compatible alias — existing code can keep using Incident */
export type Incident = Event;

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

// ── Módulo 3 — Investigación del Accidente ────────────────────────────────

export interface ImmediateCause {
    type: "acto" | "condicion";
    description: string;
}

export interface BasicCause {
    type: "personal" | "trabajo";
    description: string;
}

export interface ActionItem {
    action: string;
    responsible: string;
    deadline: string;   // ISO date string YYYY-MM-DD
    status: "pendiente" | "en_curso" | "cerrado";
}

export type InvestigationStatus =
    | "en_proceso"
    | "plan_accion_definido"
    | "en_seguimiento"
    | "cerrado";

export type Investigation = {
    id: string;
    incident_id: string;
    company_id?: string;
    status: InvestigationStatus;

    // Team
    investigator_sst?: string;
    investigator_jefe?: string;
    investigator_copasst?: string;
    investigators_extra?: string;

    // Narrative
    event_narrative?: string;

    // Causes (Res. 1401/2007)
    immediate_causes: ImmediateCause[];
    basic_causes: BasicCause[];
    control_failures?: string;

    // Action plan
    action_plan: ActionItem[];

    // Closure
    conclusions?: string;
    closed_by?: string;
    closed_at?: string;

    created_at?: string;
    updated_at?: string;
};
