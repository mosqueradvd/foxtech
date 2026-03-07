/**
 * lib/constants/colombia.ts
 * Listas de valores legales colombianos para el FURAT, FUREL y clasificación
 * de accidentes de trabajo según normativa del Ministerio de Trabajo.
 */

// ─── Clasificación legal del evento ─────────────────────────────────────────

export const EVENT_CLASSIFICATIONS = [
    { value: "CASI_ACCIDENTE", label: "Casi-Accidente", description: "Evento no deseado que no causó lesión ni daño pero pudo haberlo hecho", color: "amber" },
    { value: "INCIDENTE_SIN_LESION", label: "Incidente sin Lesión", description: "Suceso que tuvo el potencial de ser un accidente, sin causar lesiones ni daño a la propiedad o al proceso", color: "yellow" },
    { value: "CONDICION_INSEGURA", label: "Condición Insegura", description: "Situación del ambiente de trabajo con potencial de causar accidente", color: "orange" },
    { value: "ACCIDENTE_TRABAJO", label: "Accidente de Trabajo", description: "Todo suceso repentino que sobrevenga por causa del trabajo (Ley 1562/2012)", color: "red" },
    { value: "ACCIDENTE_TRABAJO_GRAVE", label: "Accidente de Trabajo Grave", description: "AT con amputación, quemadura, pérdida ocular, lesión en columna o en órganos. Notificación al Ministerio en 2 días hábiles.", color: "red" },
    { value: "ACCIDENTE_TRABAJO_FATAL", label: "Accidente de Trabajo Fatal", description: "AT que produce la muerte del trabajador. Notificación inmediata al Ministerio.", color: "red" },
    { value: "ENFERMEDAD_LABORAL", label: "Enfermedad Laboral", description: "Enfermedad contraída como resultado de la exposición a factores de riesgo inherentes a la actividad laboral (Ley 1562/2012)", color: "purple" },
    { value: "IMPACTO_AMBIENTAL", label: "Impacto Ambiental", description: "Evento que genera impacto negativo sobre el ambiente", color: "green" },
    { value: "DANO_PROPIEDAD", label: "Daño a la Propiedad", description: "Evento que causa daño a instalaciones, equipos o materiales", color: "blue" },
] as const;

export type EventClassification = typeof EVENT_CLASSIFICATIONS[number]["value"];

// ─── Naturaleza de la lesión (FURAT Tabla 7) ─────────────────────────────────

export const INJURY_NATURES = [
    "Herida",
    "Contusión / Aplastamiento",
    "Fractura",
    "Luxación / Esguince",
    "Amputación / Enucleación",
    "Quemadura",
    "Intoxicación / Envenenamiento",
    "Cuerpo extraño",
    "Estrés / Tensión",
    "Infección",
    "Asfixia",
    "Electrocución",
    "Congelamiento",
    "Torcedura / Distensión",
    "Lesión múltiple",
    "Nervios / Médula espinal",
    "Tendinitis / Bursitis",
    "Hernias",
    "Pérdida auditiva",
    "Efectos de la presión",
    "Efectos de la temperatura",
    "Efectos de la radiación",
    "Sin lesión",
    "Otra",
] as const;

// ─── Parte del cuerpo afectada (FURAT Tabla 8) ───────────────────────────────

export const BODY_PARTS = [
    "Cabeza",
    "Ojo(s)",
    "Cuello",
    "Tronco",
    "Hombro(s)",
    "Brazo(s)",
    "Codo(s)",
    "Antebrazo(s)",
    "Muñeca(s)",
    "Mano(s)",
    "Dedo(s) mano",
    "Tórax",
    "Abdomen",
    "Columna lumbar",
    "Columna dorsal / cervical",
    "Órganos internos",
    "Órganos genitales",
    "Cadera",
    "Pierna(s)",
    "Rodilla(s)",
    "Tobillo(s)",
    "Pie(s)",
    "Dedo(s) pie",
    "Múltiples partes",
    "Todo el cuerpo",
    "Otra",
] as const;

// ─── Mecanismo del accidente (FURAT Tabla 9) ─────────────────────────────────

export const ACCIDENT_MECHANISMS = [
    "Caída de personas (mismo nivel)",
    "Caída de personas (diferente nivel)",
    "Caída de objetos",
    "Pisada sobre objeto",
    "Choque contra objeto inmóvil",
    "Choque contra objeto móvil",
    "Atrapamiento por o entre objetos",
    "Sobre-esfuerzo / Sobre-tensión",
    "Contacto con temperatura extrema",
    "Contacto con corriente eléctrica",
    "Contacto con sustancias nocivas",
    "Exposición a radiaciones",
    "Mordedura / Picadura de animal",
    "Accidente de tránsito",
    "Exposición a explosión",
    "Exposición a fuego / Incendio",
    "Contacto con objetos cortantes o punzantes",
    "Agresión de personas",
    "Inmersión / Ahogamiento",
    "Otro",
] as const;

// ─── Tipos de peligro GTC 45 ─────────────────────────────────────────────────

export const HAZARD_TYPES_GTC45 = [
    { category: "Biológico", examples: "Virus, bacterias, hongos, parásitos, picaduras" },
    { category: "Físico", examples: "Ruido, vibraciones, temperaturas extremas, radiaciones, iluminación" },
    { category: "Químico", examples: "Polvos, humos, gases, vapores, líquidos, sólidos" },
    { category: "Psicosocial", examples: "Estrés, jornada larga, monotonía, relaciones interpersonales" },
    { category: "Biomecánico", examples: "Posturas, sobre-esfuerzo, movimientos repetitivos, manipulación manual" },
    { category: "Condiciones de seguridad — Mecánico", examples: "Equipos, herramientas, maquinaria" },
    { category: "Condiciones de seguridad — Eléctrico", examples: "Alta tensión, estática, rayos" },
    { category: "Condiciones de seguridad — Locativo", examples: "Superficies de trabajo, espacios confinados, alturas" },
    { category: "Condiciones de seguridad — Tecnológico", examples: "Explosión, fuga, derrame, incendio" },
    { category: "Condiciones de seguridad — Accidente de tránsito", examples: "Vehículos, motos, bicicletas" },
    { category: "Natural", examples: "Sismo, terremoto, vendaval, inundación" },
    { category: "Público", examples: "Robos, atracos, secuestro, asonadas" },
] as const;

export const HAZARD_TYPE_VALUES = HAZARD_TYPES_GTC45.map((h) => h.category);

// ─── Tipo de contrato laboral colombiano ─────────────────────────────────────

export const EMPLOYMENT_TYPES = [
    "Indefinido",
    "Término fijo",
    "Obra o labor determinada",
    "Aprendizaje (SENA)",
    "Prestación de servicios (contratista)",
    "Misión (ETT)",
    "Cooperado",
    "Otro",
] as const;

// ─── Niveles de educación ─────────────────────────────────────────────────────

export const EDUCATION_LEVELS = [
    "Primaria incompleta",
    "Primaria completa",
    "Bachillerato incompleto",
    "Bachillerato completo",
    "Técnico/Tecnológico",
    "Universidad incompleta",
    "Universidad completa",
    "Posgrado / Especialización",
] as const;

// ─── Sexo biológico (FURAT) ───────────────────────────────────────────────────

export const SEX_OPTIONS = [
    { value: "M", label: "Masculino" },
    { value: "F", label: "Femenino" },
] as const;

// ─── EPS activas en Colombia ──────────────────────────────────────────────────

export const EPS_LIST = [
    "Adres (no afiliado)",
    "Aliansalud EPS",
    "Asmet Salud",
    "Cafesalud (liquidada — archivo histórico)",
    "Capital Salud",
    "Comfacor",
    "Comfamiliar",
    "Compensar",
    "Coosalud",
    "Cruz Blanca (liquidada)",
    "EPS Famisanar",
    "EPS Sanitas",
    "EPS Sura",
    "Nueva EPS",
    "Salud Total",
    "SOS",
    "Medimás EPS",
    "Mutual Ser",
    "Otra",
] as const;

// ─── ARL en Colombia ──────────────────────────────────────────────────────────

export const ARL_LIST = [
    "AXA Colpatria",
    "Bolívar ARL",
    "Colmena Seguros",
    "Liberty Seguros",
    "Positiva Compañía de Seguros",
    "SURA ARL",
    "Otra",
] as const;

// ─── Departamentos y municipios de Colombia ───────────────────────────────────
// Lista representativa de los departamentos más usados en contexto laboral
// junto con sus principales municipios.

export const COLOMBIA_DEPARTMENTS: Record<string, string[]> = {
    "Bogotá D.C.": ["Bogotá D.C."],
    "Antioquia": [
        "Medellín", "Bello", "Itagüí", "Envigado", "Sabaneta", "La Estrella",
        "Caldas", "Copacabana", "Girardota", "Barbosa", "Rionegro", "Apartadó",
        "Turbo", "Caucasia", "Yarumal",
    ],
    "Valle del Cauca": [
        "Cali", "Buenaventura", "Palmira", "Tuluá", "Bucaramanga (incorrecto — ver Santander)",
        "Buga", "Cartago", "Yumbo", "Jamundí", "Candelaria",
    ],
    "Atlántico": ["Barranquilla", "Soledad", "Malambo", "Sabanalarga", "Baranoa"],
    "Cundinamarca": [
        "Soacha", "Facatativá", "Zipaquirá", "Chía", "Mosquera", "Madrid",
        "Funza", "Girardot", "Fusagasugá", "La Calera",
    ],
    "Santander": [
        "Bucaramanga", "Floridablanca", "Girón", "Piedecuesta", "Barrancabermeja",
        "Socorro", "San Gil",
    ],
    "Bolívar": ["Cartagena", "Magangué", "El Carmen de Bolívar", "Mompós"],
    "Boyacá": ["Tunja", "Duitama", "Sogamoso", "Chiquinquirá", "Paipa"],
    "Caldas": ["Manizales", "Villamaría", "Chinchiná", "La Dorada", "Riosucio"],
    "Risaralda": ["Pereira", "Dosquebradas", "Santa Rosa de Cabal", "La Virginia"],
    "Quindío": ["Armenia", "Calarcá", "Montenegro", "Quimbaya"],
    "Tolima": ["Ibagué", "Espinal", "Melgar", "Honda", "Chaparral"],
    "Huila": ["Neiva", "Pitalito", "Garzón", "La Plata"],
    "Nariño": ["Pasto", "Tumaco", "Ipiales", "Túquerres"],
    "Cauca": ["Popayán", "Santander de Quilichao", "Puerto Tejada"],
    "Córdoba": ["Montería", "Lorica", "Cereté", "Sahagún", "Montelíbano"],
    "Sucre": ["Sincelejo", "Corozal", "Sampués", "San Marcos"],
    "Cesar": ["Valledupar", "El Copey", "Aguachica", "La Paz"],
    "Meta": ["Villavicencio", "Acacías", "Granada", "Puerto López"],
    "Casanare": ["Yopal", "Aguazul", "Tauramena", "Paz de Ariporo"],
    "Arauca": ["Arauca", "Arauquita", "Saravena"],
    "Vichada": ["Puerto Carreño"],
    "Guainía": ["Inírida"],
    "Vaupés": ["Mitú"],
    "Amazonas": ["Leticia", "Puerto Nariño"],
    "Guaviare": ["San José del Guaviare"],
    "Putumayo": ["Mocoa", "Puerto Asís", "Valle del Guamuez"],
    "Caquetá": ["Florencia", "San Vicente del Caguán"],
    "La Guajira": ["Riohacha", "Maicao", "Uribia", "Manaure"],
    "Magdalena": ["Santa Marta", "Ciénaga", "Fundación"],
    "Chocó": ["Quibdó", "Riosucio (Chocó)", "Istmina"],
    "Norte de Santander": ["Cúcuta", "Ocaña", "Pamplona", "Villa del Rosario"],
    "Vaupes": ["Mitú"],
    "San Andrés": ["San Andrés isla", "Providencia"],
};

export const DEPARTMENT_NAMES = Object.keys(COLOMBIA_DEPARTMENTS).sort();

// ─── Día de la semana ────────────────────────────────────────────────────────

export const DAYS_OF_WEEK = [
    "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo",
] as const;

/** Calculates day of week in Spanish from a date string (YYYY-MM-DD) */
export function getDayOfWeek(dateStr: string): string {
    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const d = new Date(dateStr + "T12:00:00"); // avoid timezone offset issues
    return days[d.getDay()];
}

/** Calculate seniority in months from a hire date */
export function calcSeniorityMonths(hireDateStr: string): number {
    const hire = new Date(hireDateStr);
    const now = new Date();
    const months = (now.getFullYear() - hire.getFullYear()) * 12 + (now.getMonth() - hire.getMonth());
    return Math.max(0, months);
}
