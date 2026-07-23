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
    razon_social: string;
    nit?: string;
    nit_dv?: string;
    ciiu?: string;
    clase_riesgo?: number;
    direccion?: string;
    municipio?: string;
    departamento?: string;
    representante_legal?: string;
    telefono_empresa?: string;
    email_empresa?: string;
    arl?: string;
    employee_count?: number;
    hht_annual?: number;
    is_active?: boolean;
    aplica_ruc?: boolean;
    created_at?: string;
};

export type Worker = {
    id: string;
    company_id?: string;
    full_name: string;
    cedula?: string;
    eps?: string;
    arl?: string;
    birth_date?: string;
    sex?: "M" | "F" | "Otro";
    education_level?: string;
    hire_date?: string;
    job_title?: string;
    employment_type?: string;
    created_at?: string;
};

export type CIECode = {
    code: string;
    description: string;
};

export type DisabilityRecord = {
    id?: string;
    event_id?: string;
    disability_date: string;
    days_count: number;
    eps_id?: string;
    cie_version?: "CIE-10" | "CIE-11" | null;
    cie_codes?: CIECode[];
    created_at?: string;
    created_by?: string;
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
    worker_type?: string;
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

    // Relations
    disability_records?: DisabilityRecord[];
};

/** Backward-compatible alias — existing code can keep using Incident */
export type Incident = Event;

export type InspectionStatus = "abierta" | "cerrada";

export type InspectionActionItem = {
    id: string;
    finding_id: string;   // references InspectionItem.id
    finding_label: string;
    action: string;
    responsible: string;
    responsible_phone?: string;   // Colombian mobile, e.g. 3001234567
    responsible_email?: string;
    deadline: string;
    status: "pendiente" | "en_curso" | "en_ejecucion" | "completada" | "verificada" | "cerrado";
    effective?: boolean | null;
    voice_url?: string;
    verification_photo_url?: string;
    verification_note?: string;
    notified_at?: string;         // ISO timestamp of last notification
    notified_via?: "whatsapp" | "email";
    token?: string;               // action_tokens.token
};

export type Inspection = {
    id: string;
    company_id?: string;
    inspector_name?: string;
    template_name?: string;
    template_id?: string;
    score_percent?: number;
    items?: InspectionItem[];
    location_name?: string;
    notes?: string;
    status?: InspectionStatus;
    action_plan?: InspectionActionItem[];
    created_at?: string;
    updated_at?: string;
};

export type InspectionItem = {
    id: string;
    label: string;
    required: boolean;
    checked: boolean | null; // null = not evaluated
    observation?: string;    // note on negative findings
    norm?: string;           // legal reference
    photo_url?: string;
    action_plan?: {
        description: string;
        responsible_name: string;
        deadline: string;
        voice_url?: string;
    };
};

// ── Módulo 3 — Investigación del Accidente ────────────────────────────────

export type { CausesSelected } from "./ntc3701-causes-data";

export interface LessonsLearned {
    que_ocurrio: string;       // resumen ejecutivo
    por_que_ocurrio: string;   // causa raíz en lenguaje simple
    que_aprendimos: string;    // texto libre
    como_prevenimos: string;   // medidas implementadas
    foto_cierre?: string;      // base64 de evidencia fotográfica
    foto_lat?: number;
    foto_lng?: number;
    foto_timestamp?: string;
    fecha_divulgacion: string; // ISO date YYYY-MM-DD
}

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
    responsible_phone?: string;   // Colombian mobile, e.g. 3001234567
    responsible_email?: string;
    deadline: string;             // ISO date string YYYY-MM-DD
    status: "pendiente" | "en_curso" | "cerrado";
    notified_at?: string;         // ISO timestamp of last notification
    notified_via?: "whatsapp" | "email";
    token?: string;               // action_tokens.token
}

// ── Action tokens (public access table) ────────────────────────────────────────
export type ActionToken = {
    id: string;
    token: string;
    source: "inspection" | "investigation";
    source_id: string;
    action_index: number;
    expires_at: string;
    completed_at?: string;
    completion_photo?: string;
    created_at?: string;
};

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

    // Structured causes (NTC 3701)
    causes_selected?: import("./ntc3701-causes-data").CausesSelected;

    // Lessons learned
    lessons_learned?: LessonsLearned;

    // Closure
    conclusions?: string;
    closed_by?: string;
    closed_at?: string;

    created_at?: string;
    updated_at?: string;
};

// ── Sistema de Firmas Digitales ────────────────────────────────────────────────

export type SignerRole = "COPASST" | "SUPERVISOR" | "SST_PROFESSIONAL";
export type SignatureStatus = "PENDING" | "SIGNED" | "EXPIRED";

export type SignatureRequest = {
    id: string;
    investigation_id: string;
    signer_role: SignerRole;
    signer_name?: string;
    token: string;
    expires_at: string;
    signed_at?: string;
    signature_url?: string;
    ip_address?: string;
    gps_lat?: number;
    gps_lng?: number;
    status: SignatureStatus;
    created_at?: string;
};

// ── RUC / ATEL Module ────────────────────────────────────────────────────────

export type WorkerTypeCategory = "directo" | "subcontratista" | "cliente";
export type RucSection = "ultimo_informe" | "certificado_arl";

export interface RucHistoricalData {
    id: string;
    company_id: string;
    section: RucSection;
    worker_type: WorkerTypeCategory;
    year_position: number; // -5, -4, -3, -2, -1, 0

    // Bloque A: Exposición
    num_trabajadores: number;
    hht: number;
    dias_trabajo_mes?: number;

    // Bloque B: Accidentalidad
    at_mortales: number;
    at_con_incapacidad: number;
    at_sin_incapacidad: number;
    dias_incapacidad_at: number;
    dias_cargados_at: number;
    at_con_invalidez: number;
    at_con_ipp: number;
    at_graves_res_1401: number;
    at_con_tiempo_perdido: number;
    at_sin_tiempo_perdido: number;
    casi_accidentes: number;

    // Bloque C: Enfermedad Laboral
    el_mortales: number;
    el_con_incapacidad: number;
    el_sin_incapacidad: number;
    dias_incapacidad_el: number;
    dias_cargados_el: number;
    el_casos_nuevos: number;
    el_casos_antiguos: number;
    el_con_invalidez: number;
    el_con_ipp: number;
    el_con_tiempo_perdido: number;
    el_sin_tiempo_perdido: number;
    
    // Bloque D: Ausentismo
    dias_ausencia_incapacidad_laboral: number;
    dias_ausencia_incapacidad_comun: number;

    // Indicadores
    if_at: number;
    is_at: number;
    ili: number;

    created_at?: string;
    updated_at?: string;
}

// ── Módulo de Costos del Evento (Modelo del Iceberg) ─────────────────────────
// Guía RUC® CCS Numeral 4.1 | Decreto 1072/2015 Art. 2.2.4.6.31

export interface EventCost {
    id?: string;
    event_id: string;

    // COSTOS DIRECTOS — asegurados/visibles, cubiertos parcialmente por la ARL
    costo_atencion_medica?: number;
    costo_incapacidad_salario?: number;
    costo_indemnizacion?: number;
    costo_rehabilitacion?: number;
    costo_danos_propiedad?: number;
    costo_directo_otro?: number;
    costo_directo_descripcion?: string;

    // COSTOS INDIRECTOS — ocultos/no asegurados, asumidos por la empresa
    costo_tiempo_perdido_accidentado?: number;
    costo_tiempo_perdido_companeros?: number;
    costo_tiempo_perdido_jefes?: number;
    costo_investigacion?: number;
    costo_reemplazo_contratacion?: number;
    costo_entrenamiento_reemplazo?: number;
    costo_horas_extra?: number;
    costo_perdida_productividad?: number;
    costo_danos_materiales_equipos?: number;
    costo_sanciones_multas?: number;
    costo_indirecto_otro?: number;
    costo_indirecto_descripcion?: string;

    // Metadatos
    moneda?: string;
    notas?: string;
    created_at?: string;
    updated_at?: string;
}
