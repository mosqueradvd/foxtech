/**
 * lib/ntc3701-causes-data.ts
 * Listas completas de causas NTC 3701 para el módulo de investigación de accidentes.
 * Cada entrada: { code, label }
 * Las categorías de nivel 1 contienen un array de causas específicas de nivel 2.
 */

export interface CauseCategory {
  code: string;
  label: string;
  causes: CauseItem[];
}

export interface CauseItem {
  code: string;
  label: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// §5.2 A — CONDICIONES AMBIENTALES SUBESTÁNDAR
// ─────────────────────────────────────────────────────────────────────────────

export const CONDICIONES_SUBESTANDAR: CauseCategory[] = [
  {
    code: "000",
    label: "DEFECTO DE LOS AGENTES",
    causes: [
      { code: "001", label: "Elaborado con materiales inadecuados" },
      { code: "005", label: "Romo, embotado, obtuso" },
      { code: "010", label: "Elaborado, construido, ensamblado inapropiadamente" },
      { code: "015", label: "Diseñado inapropiadamente" },
      { code: "020", label: "Áspero, tosco" },
      { code: "025", label: "Agudo, cortante" },
      { code: "030", label: "Resbaloso" },
      { code: "035", label: "Desgastado, cuarteado, raído, roto, etc." },
      { code: "099", label: "Otros defectos no especificados en otra parte" },
    ],
  },
  {
    code: "100",
    label: "RIESGO DE LA ROPA O VESTUARIO",
    causes: [
      { code: "110", label: "Carencia del equipo de protección personal necesario" },
      { code: "113", label: "Ropa inadecuada o inapropiada" },
      { code: "199", label: "Riesgos de la ropa o vestuario no especificados en otra parte" },
    ],
  },
  {
    code: "200",
    label: "RIESGOS AMBIENTALES NO ESPECIFICADOS EN OTRA PARTE",
    causes: [
      { code: "205", label: "Ruido excesivo" },
      { code: "210", label: "Espacio inadecuado de los pasillos, salidas, etc." },
      { code: "220", label: "Espacio libre inadecuado para movimientos de personas u objetos" },
      { code: "230", label: "Control inadecuado del tráfico" },
      { code: "240", label: "Ventilación general inadecuada, no debida a equipo defectuoso" },
      { code: "250", label: "Insuficiente espacio de trabajo" },
      { code: "260", label: "Iluminación inadecuada (insuficiente luz para la operación, brillo, etc.)" },
      { code: "299", label: "Riesgos ambientales no especificados en otra parte" },
    ],
  },
  {
    code: "300",
    label: "MÉTODOS O PROCEDIMIENTOS PELIGROSOS",
    causes: [
      { code: "310", label: "Uso de material o equipo de por sí peligroso (no defectuoso)" },
      { code: "320", label: "Uso de métodos o procedimientos de por sí peligrosos" },
      { code: "330", label: "Uso de herramientas o equipo inadecuado o inapropiado (no defectuoso)" },
      { code: "339", label: "Métodos o procedimientos peligrosos, no especificados en otra parte" },
      { code: "340", label: "Ayuda inadecuada para levantar cosas pesadas" },
      { code: "350", label: "Ubicación del personal inapropiada (sin tener en cuenta las limitaciones físicas, habilidades, etc.)" },
    ],
  },
  {
    code: "400",
    label: "RIESGO DE COLOCACIÓN O EMPLAZAMIENTO (MATERIALES, EQUIPOS, ETC. EXCEPTUANDO LAS PERSONAS)",
    causes: [
      { code: "410", label: "Inapropiadamente apilado" },
      { code: "420", label: "Colocados o emplazados inadecuadamente" },
      { code: "430", label: "Inadecuadamente asegurados contra movimientos inconvenientes (exceptuando apilamiento inestable)" },
    ],
  },
  {
    code: "500",
    label: "INADECUADAMENTE PROTEGIDO",
    causes: [
      { code: "510", label: "Sin protección (riesgos mecánicos o físicos exceptuando riesgos eléctricos y radiaciones)" },
      { code: "520", label: "Inadecuadamente protegido (riesgos mecánicos o físicos exceptuando riesgos eléctricos y radiaciones)" },
      { code: "530", label: "Carencia de o inadecuado apuntalamiento o entibación de minería, excavaciones, construcciones, etc." },
      { code: "540", label: "Sin conexión a tierra (eléctrico)" },
      { code: "550", label: "Sin aislamiento (eléctrico)" },
      { code: "560", label: "Conexiones, interruptores, etc., descubiertos (eléctrico)" },
      { code: "570", label: "Sin protección (radiación)" },
      { code: "580", label: "Inadecuadamente protegido (radiación)" },
      { code: "590", label: "Materiales sin rótulo o inadecuadamente rotulados" },
      { code: "599", label: "Inadecuadamente protegido, no especificado en otra parte" },
    ],
  },
  {
    code: "600",
    label: "RIESGOS AMBIENTALES EN TRABAJOS EXTERIORES, DISTINTOS A LOS OTROS RIESGOS PÚBLICOS",
    causes: [
      { code: "610", label: "Predios o cosas defectuosas de extraños" },
      { code: "620", label: "Materiales o equipo defectuoso de extraños" },
      { code: "630", label: "Otros riesgos asociados con la propiedad u operaciones de extraños" },
      { code: "640", label: "Riesgos naturales (riesgos de terrenos irregulares e inestables, exposición a elementos, animales salvajes, etc., encontradas en operaciones a campo abierto)" },
    ],
  },
  {
    code: "700",
    label: "RIESGOS PÚBLICOS",
    causes: [
      { code: "710", label: "Riesgos del transporte público" },
      { code: "720", label: "Riesgo del tráfico" },
      { code: "780", label: "Otros riesgos públicos (riesgos de lugares públicos a los cuales también está expuesto el público en general)" },
    ],
  },
  {
    code: "980",
    label: "CONDICIONES AMBIENTALES PELIGROSAS NO ESPECIFICADAS EN OTRA PARTE",
    causes: [
      { code: "980", label: "Condiciones ambientales peligrosas no especificadas en otra parte" },
      { code: "990", label: "Indeterminada información insuficiente" },
      { code: "999", label: "No hay condición ambiental peligrosa" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// §5.2 B — ACTOS SUBESTÁNDAR
// ─────────────────────────────────────────────────────────────────────────────

export const ACTOS_SUBESTANDAR: CauseCategory[] = [
  {
    code: "050",
    label: "LIMPIEZA, LUBRICACIÓN, AJUSTE O REPARACIÓN DE EQUIPO MÓVIL ELÉCTRICO O DE PRESIÓN",
    causes: [
      { code: "051", label: "Apretar con martillo, empacar, etc., equipo bajo presión (recipientes a presión, válvulas, uniones, tubos, conexiones, etc.)" },
      { code: "052", label: "Limpiar, lubricar, ajustar, etc., equipo en movimiento" },
      { code: "056", label: "Soldar, reparar, etc., tanques, recipientes o equipo sin permiso del supervisor con respecto a la presencia de vapores, sustancias químicas peligrosas, etc." },
      { code: "057", label: "Trabajar en equipo cargado eléctricamente (motores, generadores, líneas, etc.)" },
      { code: "059", label: "No especificada en otra parte" },
    ],
  },
  {
    code: "100",
    label: "OMITIR EL USO DE EQUIPO DE PROTECCIÓN PERSONAL DISPONIBLE",
    causes: [
      { code: "100", label: "Omitir el uso de equipo de protección personal disponible" },
    ],
  },
  {
    code: "150",
    label: "OMITIR EL USO DE ATUENDO PERSONAL SEGURO",
    causes: [
      { code: "150", label: "Uso de zapatos de tacón alto, pelo suelto, mangas largas, ropa suelta, anillos, relojes, etc." },
    ],
  },
  {
    code: "200",
    label: "NO ASEGURAR O ADVERTIR",
    causes: [
      { code: "201", label: "Omitir, cerrar, bloquear o asegurar los vehículos, interruptores, válvulas, prensas, otras herramientas, materiales y equipo, contra movimientos inesperados, flujo de corriente eléctrica, vapor, etc." },
      { code: "202", label: "Omitir el cierre del equipo que no está en uso" },
      { code: "203", label: "Omitir la colocación de avisos, señales, tarjetas, etc." },
      { code: "205", label: "Soltar o mover pesos, etc., sin dar aviso o advertencia adecuada" },
      { code: "207", label: "Iniciar o parar vehículos o equipos sin dar el aviso adecuado" },
      { code: "209", label: "No especificados en otra parte" },
    ],
  },
  {
    code: "250",
    label: "BROMAS O JUEGOS PESADOS",
    causes: [
      { code: "250", label: "Distraer, fastidiar, molestar, asustar, reñir, chancearse pesadamente, lanzar materiales, exhibirse burlonamente, etc." },
    ],
  },
  {
    code: "300",
    label: "USO INADECUADO DEL EQUIPO",
    causes: [
      { code: "301", label: "Uso del material o equipo de una manera para la cual no está indicado" },
      { code: "305", label: "Recargar de pesos (vehículos, andamios, etc.)" },
      { code: "309", label: "No especificados en otra parte" },
    ],
  },
  {
    code: "350",
    label: "USO INAPROPIADO DE LAS MANOS O PARTES DEL CUERPO",
    causes: [
      { code: "353", label: "Agarrar los objetos inseguramente" },
      { code: "355", label: "Agarrar los objetos en forma errada" },
      { code: "356", label: "Usar las manos en lugar de las herramientas manuales (para alimentar, limpiar, reparar, ajustar, etc.)" },
      { code: "359", label: "No especificadas en otra parte" },
    ],
  },
  {
    code: "400",
    label: "FALTA DE ATENCIÓN A LAS CONDICIONES DEL PISO O LAS VECINDADES",
    causes: [
      { code: "400", label: "Falta de atención a las condiciones del piso o las vecindades" },
    ],
  },
  {
    code: "450",
    label: "HACER INOPERANTES LOS DISPOSITIVOS DE SEGURIDAD",
    causes: [
      { code: "452", label: "Bloquear, tapar, atar, etc., los dispositivos de seguridad" },
      { code: "453", label: "Desconectar o quitar los dispositivos de seguridad" },
      { code: "454", label: "Colocar mal los dispositivos de seguridad" },
      { code: "456", label: "Reemplazar los dispositivos de seguridad por otros de capacidad inapropiada (fusibles con mayor amperaje eléctrico, válvulas de seguridad de baja capacidad, etc.)" },
      { code: "459", label: "No especificados en otra parte" },
    ],
  },
  {
    code: "500",
    label: "OPERAR O TRABAJAR A VELOCIDAD INSEGURA",
    causes: [
      { code: "502", label: "Alimentar o suministrar muy rápidamente" },
      { code: "503", label: "Saltar desde partes elevadas (vehículos, plataformas, etc.)" },
      { code: "505", label: "Operar los vehículos de la planta a velocidad insegura" },
      { code: "506", label: "Correr" },
      { code: "508", label: "Lanzar material en lugar de cargarlo o pasarlo" },
      { code: "509", label: "No especificados en otra parte" },
    ],
  },
  {
    code: "550",
    label: "ADOPTAR UNA POSICIÓN INSEGURA",
    causes: [
      { code: "552", label: "Entrar en tanques, cajones u otros espacios encerrados sin el debido permiso del supervisor" },
      { code: "555", label: "Viajar en posición insegura (en plataformas, horquillas o levantadores, elevadores, en el gancho de una grúa, etc.)" },
      { code: "556", label: "Exponerse innecesariamente bajo cargas suspendidas" },
      { code: "557", label: "Exponerse innecesariamente a cargas oscilantes" },
      { code: "558", label: "Exponerse innecesariamente a materiales o equipos que se mueven" },
      { code: "559", label: "No especificados en otra parte" },
    ],
  },
  {
    code: "600",
    label: "ERRORES DE CONDUCCIÓN",
    causes: [
      { code: "601", label: "Conducir demasiado rápido o demasiado despacio" },
      { code: "602", label: "Entrar o salir del vehículo por el lado del tráfico" },
      { code: "603", label: "No hacer la señal cuando se para, se voltea o se retrocede" },
      { code: "604", label: "Omitir el otorgamiento del derecho de vía" },
      { code: "605", label: "No obedecer las señales o signos del control del tráfico" },
      { code: "606", label: "No guardar la distancia" },
      { code: "607", label: "Pasar inapropiadamente" },
      { code: "608", label: "Voltear inapropiadamente" },
      { code: "609", label: "No especificados en otra parte" },
    ],
  },
  {
    code: "650",
    label: "COLOCAR, MEZCLAR, COMBINAR, ETC., INSEGURAMENTE",
    causes: [
      { code: "653", label: "Inyectar, mezclar o combinar una sustancia con otra, de manera que se cree un riesgo de explosión, fuego u otro" },
      { code: "655", label: "Colocación insegura de vehículos o equipo de movimiento de materiales (estacionar, situar, parar, o dejar vehículos elevadores o aparatos de transporte en posición insegura para cargar o descargar)" },
      { code: "657", label: "Colocación insegura de materiales, herramientas, desechos, etc. (como para crear riesgos de derrumbe, tropezón, choque o resbalón, etc.)" },
      { code: "659", label: "No especificados en otra parte" },
    ],
  },
  {
    code: "750",
    label: "USAR EQUIPO INSEGURO",
    causes: [
      { code: "750", label: "Usar equipo inseguro (equipo rotulado o conocido como defectuoso)" },
      { code: "900", label: "Acto subestándar no especificado en otra parte" },
      { code: "998", label: "Ningún acto subestándar" },
      { code: "999", label: "Sin clasificación (Datos insuficientes)" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// §5.3 A — FACTORES PERSONALES (Causas Básicas)
// ─────────────────────────────────────────────────────────────────────────────

export const FACTORES_PERSONALES: CauseCategory[] = [
  {
    code: "FP-001",
    label: "CAPACIDAD FÍSICA / FISIOLÓGICA INADECUADA",
    causes: [
      { code: "001", label: "Altura, peso, talla, fuerza, alcance, etc. Inadecuados" },
      { code: "002", label: "Capacidad de movimiento corporal limitada" },
      { code: "003", label: "Capacidad visual limitada (incluyendo visión nocturna, percepción de profundidad, visión de color, etc.)" },
      { code: "004", label: "Capacidad auditiva limitada" },
      { code: "005", label: "Otras deficiencias sensoriales (tacto, gusto, olfato, equilibrio)" },
      { code: "006", label: "Susceptibilidad a sustancias alérgenas o agentes irritantes" },
      { code: "007", label: "Sensibilidad a extremos de temperatura o calor de fricción" },
      { code: "008", label: "Sensibilidad a efectos de radiación" },
      { code: "009", label: "Capacidad física inadecuada en otro aspecto" },
    ],
  },
  {
    code: "FP-010",
    label: "CAPACIDAD MENTAL / PSICOLÓGICA INADECUADA",
    causes: [
      { code: "010", label: "Miedo o fobias" },
      { code: "011", label: "Problemas emocionales" },
      { code: "012", label: "Enfermedad mental" },
      { code: "013", label: "Nivel de inteligencia" },
      { code: "014", label: "Incapacidad de comprensión" },
      { code: "015", label: "Escasa memoria" },
      { code: "016", label: "Mal juicio — bajo nivel de razonamiento" },
      { code: "017", label: "Escasa coordinación" },
      { code: "018", label: "Tiempo de reacción lento" },
      { code: "019", label: "Aptitud mecánica limitada" },
      { code: "020", label: "Capacidad mental o psicológica inadecuada en otro aspecto" },
    ],
  },
  {
    code: "FP-021",
    label: "TENSIÓN FÍSICA O FISIOLÓGICA",
    causes: [
      { code: "021", label: "Lesión o enfermedad" },
      { code: "022", label: "Fatiga debida a la carga o duración de las tareas" },
      { code: "023", label: "Fatiga debida a la falta de descanso" },
      { code: "024", label: "Fatiga debida a la sobrecarga sensorial" },
      { code: "025", label: "Exposición a riesgos contra la salud" },
      { code: "026", label: "Exposición a temperaturas extremas" },
      { code: "027", label: "Insuficiencia de oxígeno" },
      { code: "028", label: "Variaciones en la presión atmosférica" },
      { code: "029", label: "Movimiento restringido" },
      { code: "030", label: "Insuficiencia de azúcar en la sangre" },
      { code: "031", label: "Sobredosis de drogas o alcohol" },
      { code: "032", label: "Tensión física o fisiológica en otro aspecto" },
    ],
  },
  {
    code: "FP-033",
    label: "TENSIÓN MENTAL O PSICOLÓGICA",
    causes: [
      { code: "033", label: "Sobrecarga emocional" },
      { code: "034", label: "Fatiga debida a la carga o restricciones mentales de la tarea" },
      { code: "035", label: "Órdenes poco claras o que producen conflictos" },
      { code: "036", label: "Solicitudes o exigencias sin sentido o que producen conflictos" },
      { code: "037", label: "Preocupaciones debidas a problemas" },
      { code: "038", label: "Frustración" },
      { code: "039", label: "Enfermedad mental" },
      { code: "040", label: "Tensión mental o psicológica en otro aspecto" },
    ],
  },
  {
    code: "FP-041",
    label: "FALTA DE CONOCIMIENTO",
    causes: [
      { code: "041", label: "Falta de experiencia" },
      { code: "042", label: "Orientación deficiente" },
      { code: "043", label: "Capacitación inicial inadecuada" },
      { code: "044", label: "Capacitación actualizada inadecuada" },
      { code: "045", label: "Instrucción mal interpretada" },
      { code: "046", label: "Falta de conocimiento en otro aspecto" },
    ],
  },
  {
    code: "FP-047",
    label: "FALTA DE HABILIDAD",
    causes: [
      { code: "047", label: "Instrucción inicial inadecuada" },
      { code: "048", label: "Práctica inadecuada" },
      { code: "049", label: "Escasa operación de revisión del trabajo" },
      { code: "050", label: "Instrucción mal interpretada" },
      { code: "051", label: "Falta de habilidad en otro aspecto" },
    ],
  },
  {
    code: "FP-052",
    label: "MOTIVACIÓN DEFICIENTE",
    causes: [
      { code: "052", label: "La actuación subestándar es más bien tolerada" },
      { code: "053", label: "La actuación estándar no es gratificada" },
      { code: "054", label: "La actuación subestándar es más bien recompensada" },
      { code: "055", label: "Desempeño insuficiente del trabajador" },
      { code: "056", label: "Intento de ahorro de tiempo o esfuerzo inadecuado" },
      { code: "057", label: "Intento de evitar la incomodidad" },
      { code: "058", label: "Intento de llamar la atención" },
      { code: "059", label: "Presión mal interpretada de los compañeros" },
      { code: "060", label: "Ejemplo deficiente de la supervisión" },
      { code: "061", label: "Retroalimentación deficiente del desempeño" },
      { code: "062", label: "Falta de incentivos positivos, del reconocimiento de refuerzos" },
      { code: "063", label: "Motivación deficiente en otro aspecto" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// §5.3 B — FACTORES DEL TRABAJO (Causas Básicas)
// ─────────────────────────────────────────────────────────────────────────────

export const FACTORES_TRABAJO: CauseCategory[] = [
  {
    code: "FT-001",
    label: "SUPERVISIÓN Y LIDERAZGO DEFICIENTES",
    causes: [
      { code: "001", label: "Relaciones jerárquicas poco claras o que producen conflictos" },
      { code: "002", label: "Asignación de responsabilidad poco clara o que produce conflictos" },
      { code: "003", label: "Delegación insuficiente o inadecuada" },
      { code: "004", label: "Dar política, procedimientos, prácticas o guías de actuación inadecuados" },
      { code: "005", label: "Dar objetivos, metas o normas contradictorias" },
      { code: "006", label: "Programación o planificación del trabajo inadecuada" },
      { code: "007", label: "Instrucción, orientación y/o formación insuficiente" },
      { code: "008", label: "Suministrar documentos de referencia, instrucciones y publicaciones orientadoras de forma deficiente" },
      { code: "009", label: "Identificación y evaluación deficiente de las exposiciones a pérdidas" },
      { code: "010", label: "Falta de conocimiento en el trabajo de supervisión/gestión" },
      { code: "011", label: "Supervisión y liderazgo deficiente en otro aspecto" },
    ],
  },
  {
    code: "FT-012",
    label: "INGENIERÍA INADECUADA",
    causes: [
      { code: "012", label: "Evaluación inadecuada de las exposiciones a pérdidas" },
      { code: "013", label: "Preocupación inadecuada por los factores ergonómicos / factores humanos" },
      { code: "014", label: "Normas, especificaciones y criterios de diseño inadecuados" },
      { code: "015", label: "Control e inspección inadecuados en la construcción" },
      { code: "016", label: "Evaluación inadecuada de la preparación para la operación" },
      { code: "017", label: "Evaluación inadecuada de los cambios" },
      { code: "018", label: "Ingeniería inadecuada en otro aspecto" },
    ],
  },
  {
    code: "FT-019",
    label: "ADQUISICIONES DEFICIENTES",
    causes: [
      { code: "019", label: "Especificaciones deficientes con relación a los requisitos" },
      { code: "020", label: "Investigación inadecuada de los materiales / equipos" },
      { code: "021", label: "Especificaciones deficientes a vendedores" },
      { code: "022", label: "Modalidad o ruta de embarque inadecuada" },
      { code: "023", label: "Inspección de recepción deficiente" },
      { code: "024", label: "Comunicación inadecuada de información sobre seguridad y salud" },
      { code: "025", label: "Manejo inadecuado de los materiales" },
      { code: "026", label: "Almacenamiento inadecuado de los materiales" },
      { code: "027", label: "Transporte inadecuado de los materiales" },
      { code: "028", label: "Identificación deficiente de los elementos peligrosos" },
      { code: "029", label: "Disposición inadecuada de los artículos" },
      { code: "030", label: "Selección inadecuada de contratistas" },
      { code: "031", label: "Adquisiciones deficientes en otro aspecto" },
    ],
  },
  {
    code: "FT-032",
    label: "MANTENIMIENTO DEFICIENTE",
    causes: [
      { code: "032", label: "Evaluación preventiva inadecuada de las necesidades" },
      { code: "033", label: "Lubricación y mantención deficientes" },
      { code: "034", label: "Ajuste/ensamblaje deficiente" },
      { code: "035", label: "Limpieza o pulimento deficientes" },
      { code: "036", label: "Reemplazo inadecuado de piezas desgastadas o dañadas" },
      { code: "037", label: "Mantenimiento deficiente en otro aspecto" },
    ],
  },
  {
    code: "FT-038",
    label: "HERRAMIENTAS Y EQUIPOS INADECUADOS",
    causes: [
      { code: "038", label: "Evaluación inadecuada de las necesidades y los riesgos" },
      { code: "039", label: "Consideraciones ergonómicas / factores humanos inadecuados en el aspecto" },
      { code: "040", label: "Normas o especificaciones inadecuadas" },
      { code: "041", label: "Disponibilidad inadecuada" },
      { code: "042", label: "Ajuste / reparación / mantenimiento deficientes" },
      { code: "043", label: "Salvamento y descarte deficientes" },
      { code: "044", label: "Herramientas y equipos inadecuados en otro aspecto" },
    ],
  },
  {
    code: "FT-045",
    label: "NORMAS DE TRABAJO INADECUADAS",
    causes: [
      { code: "045", label: "Desarrollo inadecuado de normas para el inventario y evaluación de las exposiciones a pérdidas" },
      { code: "046", label: "Desarrollo inadecuado de normas en cuanto a su coordinación con los diseñadores de proceso" },
      { code: "047", label: "Normas, reglas, procedimientos inadecuados" },
      { code: "048", label: "Comunicación inadecuada de las normas" },
      { code: "049", label: "Mantenimiento de normas inadecuado" },
      { code: "050", label: "Vigilancia inadecuada del cumplimiento de las normas" },
      { code: "051", label: "Normas de trabajo inadecuadas en otro aspecto" },
    ],
  },
  {
    code: "FT-052",
    label: "USO Y DESGASTE EXCESIVOS",
    causes: [
      { code: "052", label: "Planificación inadecuada del uso" },
      { code: "053", label: "Prolongación de la vida útil más allá del límite de servicio" },
      { code: "054", label: "Inspección e (/)o control deficientes" },
      { code: "055", label: "Sobrecarga o categorización incorrecta" },
      { code: "056", label: "Mantenimiento deficiente" },
      { code: "057", label: "Uso y desgaste excesivos en otro aspecto" },
    ],
  },
  {
    code: "FT-058",
    label: "ABUSO O MAL USO",
    causes: [
      { code: "058", label: "Conducta permitida (intencional)" },
      { code: "059", label: "Conducta no permitida (no intencional)" },
      { code: "060", label: "Motivación inadecuada" },
      { code: "061", label: "Abuso o mal uso en otro aspecto" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// §5.5 — FACTORES PESV (Res. 1565/2014)
// ─────────────────────────────────────────────────────────────────────────────

export const PESV_FACTOR_HUMANO: string[] = [
  "Velocidad Inadecuada",
  "Conductor con prisa en recorrido",
  "Vehículo pasó por un hueco",
  "Supervisor presionó entrega",
  "Tomar ruta inadecuada",
  "No permitidos por la supervisión — no intencionalmente",
  "704 No permitidos por la supervisión no intencionalmente",
];

export const PESV_FACTOR_VEHICULO: string[] = [
  "El vehículo se inclinó",
  "La carga se desplazó",
  "Capacidad del vehículo inadecuada",
  "Carga asegurada con soga",
  "Aseguramiento de carga inadecuado",
  "Falta de supervisión en el cargue",
  "Fallas en contratación",
];

export const PESV_FACTOR_INFRAESTRUCTURA: string[] = [
  "Superficie con baches",
  "Vía en malas condiciones",
  "Fuera del control de la organización",
];

// ─────────────────────────────────────────────────────────────────────────────
// Valor por defecto para causes_selected
// ─────────────────────────────────────────────────────────────────────────────

export interface CausesSelected {
  inmediatas: {
    condiciones: string[];
    actos: string[];
    otra: string;
  };
  basicas: {
    factores_personales: string[];
    factores_trabajo: string[];
    otra: string;
  };
  pesv: {
    aplica: boolean;
    factor_humano: string[];
    factor_vehiculo: string[];
    factor_infraestructura: string[];
    otra: string;
  };
}

export const DEFAULT_CAUSES_SELECTED: CausesSelected = {
  inmediatas: { condiciones: [], actos: [], otra: "" },
  basicas: { factores_personales: [], factores_trabajo: [], otra: "" },
  pesv: { aplica: false, factor_humano: [], factor_vehiculo: [], factor_infraestructura: [], otra: "" },
};
