/**
 * lib/inspection-templates.ts
 * 5 normative inspection templates for Colombian SST regulations.
 * Each template maps to a legal framework and has specific checklist items.
 */

export type CheckState = boolean | null;

export interface TemplateItem {
    id: string;
    label: string;
    required: boolean;
    norm?: string; // Legal reference
    category?: string;
}

export interface InspectionTemplate {
    id: string;
    name: string;
    description: string;
    norm: string;
    icon: string;
    items: TemplateItem[];
}

// ── Templates ──────────────────────────────────────────────────────────────────

export const INSPECTION_TEMPLATES: InspectionTemplate[] = [
    {
        id: "general",
        name: "Inspección General",
        description: "Verificación diaria de condiciones básicas de seguridad",
        norm: "Decreto 1072/2015",
        icon: "🏭",
        items: [
            { id: "epp_completo", label: "EPP completo y en buen estado (casco, guantes, gafas, calzado)", required: true, norm: "Art. 2.2.4.6.12" },
            { id: "senalizacion", label: "Señalización de seguridad instalada y visible", required: true, norm: "Dec. 1072 §4.6.27" },
            { id: "extintor", label: "Extintor cargado, con seguro y accesible (<30 m)", required: true, norm: "NTC 2885" },
            { id: "primeros_auxilios", label: "Botiquín de primeros auxilios disponible y completo", required: true, norm: "Res. 0705/2007" },
            { id: "rutas_evacuacion", label: "Rutas de evacuación despejadas y señalizadas", required: true, norm: "Dec. 1072 §4.6.28" },
            { id: "permisos_trabajo", label: "Permisos de trabajo firmados y vigentes", required: true, norm: "GTC 45" },
            { id: "orden_limpieza", label: "Orden y limpieza del área de trabajo", required: false, norm: "Dec. 1072 §4.6.15" },
            { id: "maquinaria", label: "Inspección pre-operacional de equipos y herramientas", required: false, norm: "Dec. 1072 §4.6.26" },
            { id: "copasst_vigente", label: "COPASST activo y actas al día", required: false, norm: "Res. 2013/1986" },
            { id: "demarcacion", label: "Demarcación de áreas peligrosas visible", required: false, norm: "GTC 45" },
        ],
    },
    {
        id: "alturas",
        name: "Trabajo en Alturas",
        description: "Inspección para tareas con riesgo de caída a más de 1.50 m",
        norm: "Res. 4272/2021",
        icon: "🪜",
        items: [
            { id: "permiso_alturas", label: "Permiso de trabajo en alturas firmado y vigente", required: true, norm: "Res. 4272 Art. 20" },
            { id: "arnés_certificado", label: "Arnés certificado (ANSI Z359.1), sin desgaste ni cortes", required: true, norm: "Res. 4272 Art. 10" },
            { id: "linea_vida", label: "Línea de vida instalada y anclada correctamente", required: true, norm: "Res. 4272 Art. 11" },
            { id: "punto_ancla", label: "Punto de anclaje con resistencia mínima de 5000 lb", required: true, norm: "Res. 4272 Art. 12" },
            { id: "casco_tipo_2", label: "Casco tipo II con barbuquejo puesto", required: true, norm: "NTC 1523" },
            { id: "andamio_revision", label: "Andamio/plataforma inspeccionado (sin defectos estructurales)", required: true, norm: "NTC 6072" },
            { id: "area_barricada", label: "Área inferior barricada y señalizada", required: true, norm: "Res. 4272 Art. 18" },
            { id: "competencia_cert", label: "Trabajador con certificación vigente en alturas", required: true, norm: "Res. 4272 Art. 6" },
            { id: "rescate_plan", label: "Plan de rescate disponible y comunicado al equipo", required: true, norm: "Res. 4272 Art. 22" },
            { id: "condiciones_clima", label: "Condiciones climáticas aptas para el trabajo", required: false, norm: "Res. 4272 Art. 19" },
            { id: "comunicacion", label: "Sistema de comunicación entre trabajadores en altura", required: false, norm: "Res. 4272 Art. 21" },
        ],
    },
    {
        id: "electrico",
        name: "Riesgo Eléctrico",
        description: "Inspección de instalaciones y trabajos eléctricos",
        norm: "RETIE / NTC 2050",
        icon: "⚡",
        items: [
            { id: "bloqueo_loto", label: "Bloqueo y etiquetado (LOTO) aplicado antes de intervención", required: true, norm: "NTC 4120" },
            { id: "herramientas_diels", label: "Herramientas dieléctricas certificadas y en buen estado", required: true, norm: "RETIE Art. 30" },
            { id: "guantes_diels", label: "Guantes dieléctricos de clase adecuada al voltaje", required: true, norm: "NTC 2195" },
            { id: "tension_cero", label: "Tensión verificada en cero antes de iniciar trabajo", required: true, norm: "RETIE Art. 31" },
            { id: "proteccion_ojos", label: "Protección para arco eléctrico (gafas y careta)", required: true, norm: "NTC 4116" },
            { id: "tablero_energizado", label: "Tableros eléctricos cerrados y sin humedad", required: true, norm: "RETIE Art. 9" },
            { id: "cableado", label: "Cableado sin empalmes, sin daños ni improvisaciones", required: true, norm: "NTC 2050" },
            { id: "puesta_tierra", label: "Puestas a tierra instaladas y en buen estado", required: true, norm: "RETIE Art. 15" },
            { id: "compentencia_elec", label: "Trabajador eléctrico calificado/certificado", required: true, norm: "RETIE Art. 32" },
            { id: "extintor_clase_c", label: "Extintor Clase C disponible en el área", required: false, norm: "NTC 2885" },
            { id: "senalizacion_volt", label: "Señalización de voltaje y peligro eléctrico visible", required: false, norm: "RETIE Art. 8" },
        ],
    },
    {
        id: "copasst",
        name: "Inspección COPASST",
        description: "Inspección mensual por el Comité Paritario de SST",
        norm: "Res. 2013/1986 — Dec. 1072/2015",
        icon: "🔍",
        items: [
            { id: "actas_copasst", label: "Actas de reunión COPASST al día (mínimo 1/mes)", required: true, norm: "Res. 2013 Art. 4" },
            { id: "vigias_activos", label: "Vigías/representantes activos y capacitados", required: true, norm: "Res. 2013 Art. 2" },
            { id: "programa_sst", label: "Programa SST documentado y socializado a trabajadores", required: true, norm: "Dec. 1072 §4.6.2" },
            { id: "inspecciones_prev", label: "Inspecciones previas documentadas y hallazgos cerrados", required: true, norm: "Dec. 1072 §4.6.17" },
            { id: "investigacion_at", label: "Investigaciones de accidentes al día (Res. 1401/2007)", required: true, norm: "Res. 1401/2007" },
            { id: "indicadores_sst", label: "Indicadores de accidentalidad calculados y reportados", required: true, norm: "Dec. 1072 §4.6.19" },
            { id: "capacitaciones", label: "Plan de capacitaciones ejecutado (registro de asistencia)", required: true, norm: "Dec. 1072 §4.6.11" },
            { id: "epps_entregados", label: "Registros de entrega de EPP firmados y actualizados", required: true, norm: "Dec. 1072 §4.6.12" },
            { id: "examen_ingreso", label: "Exámenes médicos de ingreso al día", required: true, norm: "Dec. 1072 §4.6.13" },
            { id: "demanda_queja", label: "Buzón de sugerencias activo y seguimiento a PQR", required: false, norm: "Res. 2013 Art. 11" },
            { id: "plan_emergencias", label: "Plan de emergencias documentado y socializado", required: false, norm: "Dec. 1072 §4.6.24.2" },
            { id: "simulacros", label: "Simulacros realizados (mínimo 1/año)", required: false, norm: "Dec. 1072 §4.6.24.3" },
        ],
    },
    {
        id: "maquinaria",
        name: "Pre-operacional Maquinaria",
        description: "Verificación antes de operar equipos y maquinaria pesada",
        norm: "ISO 45001:2018 — Dec. 1072/2015",
        icon: "🔧",
        items: [
            { id: "hoja_preop", label: "Hoja pre-operacional diligenciada y firmada por operador", required: true, norm: "Dec. 1072 §4.6.26" },
            { id: "licencia_op", label: "Operador con licencia/certificación vigente para el equipo", required: true, norm: "Dec. 1072 §4.6.6" },
            { id: "niveles_fluidos", label: "Niveles de aceite, refrigerante e hidráulico correctos", required: true, norm: "Manual fabricante" },
            { id: "frenos", label: "Frenos de servicio y parqueo operativos", required: true, norm: "ISO 45001 §8.1" },
            { id: "luces_alarmas", label: "Luces frontales, traseras y alarma de reversa funcionando", required: true, norm: "Res. 3600/2014" },
            { id: "cinturon_cab", label: "Cinturón de seguridad de cabina en buen estado", required: true, norm: "ISO 45001 §8.1" },
            { id: "extintor_maq", label: "Extintor montado en la máquina y cargado", required: true, norm: "NTC 2885" },
            { id: "guarda_protections", label: "Guardas y protecciones mecánicas instaladas y aseguradas", required: true, norm: "Dec. 1072 §4.6.16" },
            { id: "kit_derrame", label: "Kit de control de derrames en la máquina", required: false, norm: "Res. 1562/2012" },
            { id: "bitacora", label: "Bitácora de mantenimiento al día", required: false, norm: "ISO 45001 §9.1" },
            { id: "espejo_retrovisor", label: "Espejos retrovisores y cámara de reversa funcionando", required: false, norm: "Res. 3600/2014" },
        ],
    },
];

export const TEMPLATE_MAP = Object.fromEntries(
    INSPECTION_TEMPLATES.map((t) => [t.id, t])
) as Record<string, InspectionTemplate>;

export function getTemplate(id: string): InspectionTemplate {
    return TEMPLATE_MAP[id] ?? INSPECTION_TEMPLATES[0];
}
