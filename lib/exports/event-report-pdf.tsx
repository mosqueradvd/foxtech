/**
 * lib/exports/event-report-pdf.tsx
 * PDF event report for ARL/EPS using @react-pdf/renderer.
 * 100% client-side, offline-capable (no external fonts).
 * Source: skill legal-exports-colombia — P5: Offline-Safe Documents
 */
"use client";

import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Font,
    pdf,
} from "@react-pdf/renderer";
import type { LocalIncident } from "../db";
import { downloadBlob } from "./ruc-export";

// ── Company profile (loaded from localStorage or passed as prop) ──────────

export interface CompanyProfile {
    name: string;
    nit: string;
    arl: string;
    riskClass: number;
    ciiu: string;
    address: string;
    city: string;
}

// ── Colombian legal date format DD/MM/YYYY ────────────────────────────────

function formatDateCO(isoString: string): string {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "—";
    const dd = d.getDate().toString().padStart(2, "0");
    const mm = (d.getMonth() + 1).toString().padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

function formatDateLongCO(isoString: string): string {
    const months = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
    ];
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "—";
    return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
}

// ── Severity labels ───────────────────────────────────────────────────────

const SEVERITY_LABELS: Record<string, string> = {
    leve: "Leve",
    grave: "Grave",
    mortal: "Mortal",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
    casi_accidente: "Casi Accidente / Incidente",
    accidente: "Accidente de Trabajo",
    condicion_insegura: "Condición Insegura",
};

const ZONE_LABELS: Record<string, string> = {
    dentro_empresa: "Dentro de la empresa",
    fuera_empresa: "Fuera de la empresa",
    en_trayecto: "En trayecto (in itinere)",
    comision: "En comisión",
};

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    page: {
        fontFamily: "Helvetica",
        fontSize: 9,
        paddingTop: 36,
        paddingBottom: 48,
        paddingHorizontal: 40,
        color: "#111827",
    },
    // Header
    header: {
        borderBottomWidth: 2,
        borderBottomColor: "#1e3a5f",
        marginBottom: 12,
        paddingBottom: 8,
    },
    headerTitle: {
        fontSize: 14,
        fontFamily: "Helvetica-Bold",
        color: "#1e3a5f",
    },
    headerSubtitle: {
        fontSize: 9,
        color: "#4b5563",
        marginTop: 2,
    },
    // Section
    section: {
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 9,
        fontFamily: "Helvetica-Bold",
        color: "#ffffff",
        backgroundColor: "#1e3a5f",
        padding: "3 6",
        marginBottom: 4,
    },
    // Grid
    row: {
        flexDirection: "row",
        marginBottom: 3,
    },
    fieldContainer: {
        flex: 1,
        marginRight: 8,
    },
    fieldLabel: {
        fontSize: 7,
        fontFamily: "Helvetica-Bold",
        color: "#6b7280",
        textTransform: "uppercase",
        marginBottom: 1,
    },
    fieldValue: {
        fontSize: 9,
        color: "#111827",
        borderBottomWidth: 0.5,
        borderBottomColor: "#d1d5db",
        paddingBottom: 2,
    },
    // Description block
    descriptionBlock: {
        borderWidth: 0.5,
        borderColor: "#d1d5db",
        borderRadius: 2,
        padding: 6,
        marginTop: 4,
        minHeight: 40,
    },
    // Alert box
    alertBox: {
        flexDirection: "row",
        backgroundColor: "#fef2f2",
        borderWidth: 0.5,
        borderColor: "#fca5a5",
        borderRadius: 2,
        padding: 6,
        marginBottom: 8,
    },
    alertText: {
        fontSize: 8,
        color: "#b91c1c",
        fontFamily: "Helvetica-Bold",
    },
    // Signature area
    signatureArea: {
        flexDirection: "row",
        marginTop: 24,
        gap: 20,
    },
    signatureBox: {
        flex: 1,
        borderTopWidth: 0.5,
        borderTopColor: "#374151",
        paddingTop: 4,
        alignItems: "center",
    },
    signatureLabel: {
        fontSize: 7,
        color: "#6b7280",
        fontFamily: "Helvetica-Bold",
        textTransform: "uppercase",
    },
    // Footer
    footer: {
        position: "absolute",
        bottom: 20,
        left: 40,
        right: 40,
        flexDirection: "row",
        justifyContent: "space-between",
    },
    footerText: {
        fontSize: 7,
        color: "#9ca3af",
    },
    // Badge
    badge: {
        fontSize: 8,
        fontFamily: "Helvetica-Bold",
        padding: "2 6",
        borderRadius: 2,
        alignSelf: "flex-start",
    },
    badgeGrave: { backgroundColor: "#fef3c7", color: "#92400e" },
    badgeMortal: { backgroundColor: "#fee2e2", color: "#991b1b" },
    badgeLeve: { backgroundColor: "#d1fae5", color: "#065f46" },
});

// ── Sub-components ────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <Text style={styles.fieldValue}>{value || "—"}</Text>
        </View>
    );
}

function SectionTitle({ children }: { children: string }) {
    return <Text style={styles.sectionTitle}>{children}</Text>;
}

// ── Main PDF Document ─────────────────────────────────────────────────────

interface EventReportDocumentProps {
    incident: LocalIncident;
    company: CompanyProfile;
    generatedAt: string;
}

function EventReportDocument({
    incident,
    company,
    generatedAt,
}: EventReportDocumentProps) {
    const severityLabel =
        incident.severity ? SEVERITY_LABELS[incident.severity] ?? incident.severity : "Sin clasificar";
    const eventTypeLabel =
        incident.event_type ? EVENT_TYPE_LABELS[incident.event_type] ?? incident.event_type : "—";
    const zoneLabel =
        incident.accident_zone ? ZONE_LABELS[incident.accident_zone] ?? incident.accident_zone : "—";

    const badgeStyle =
        incident.severity === "grave"
            ? styles.badgeGrave
            : incident.severity === "mortal"
                ? styles.badgeMortal
                : styles.badgeLeve;

    return (
        <Document
            title={`Reporte de Evento Laboral — ${incident.id.slice(0, 8).toUpperCase()}`}
            author="FOXTECH SST"
            subject="Reporte de Accidente / Incidente de Trabajo"
        >
            <Page size="LETTER" style={styles.page}>
                {/* ── Header ── */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>REPORTE DE EVENTO LABORAL</Text>
                    <Text style={styles.headerSubtitle}>
                        FOXTECH SST — Generado el {formatDateLongCO(generatedAt)} — N.° {incident.id.slice(0, 8).toUpperCase()}
                    </Text>
                </View>

                {/* ── Severity Alert (grave/mortal) ── */}
                {(incident.severity === "grave" || incident.severity === "mortal") && (
                    <View style={styles.alertBox}>
                        <Text style={styles.alertText}>
                            ⚠ ATENCIÓN: Evento clasificado como{" "}
                            {severityLabel.toUpperCase()}. Requiere notificación al Ministerio
                            del Trabajo dentro de los 2 días hábiles siguientes al evento.
                            (Art. 2.2.4.1.6 Decreto 1072/2015)
                        </Text>
                    </View>
                )}

                {/* ── Sección 1: Datos del Empleador ── */}
                <View style={styles.section}>
                    <SectionTitle>1. DATOS DEL EMPLEADOR</SectionTitle>
                    <View style={styles.row}>
                        <Field label="Razón Social" value={company.name} />
                        <Field label="NIT" value={company.nit} />
                        <Field label="ARL" value={company.arl} />
                    </View>
                    <View style={styles.row}>
                        <Field label="Clase de Riesgo" value={String(company.riskClass)} />
                        <Field label="CIIU" value={company.ciiu} />
                        <Field label="Municipio" value={company.city} />
                    </View>
                    <View style={styles.row}>
                        <Field label="Dirección" value={company.address} />
                        <Field label="Centro de Trabajo" value={incident.work_center ?? "—"} />
                    </View>
                </View>

                {/* ── Sección 2: Datos del Trabajador ── */}
                <View style={styles.section}>
                    <SectionTitle>2. DATOS DEL TRABAJADOR</SectionTitle>
                    <View style={styles.row}>
                        <Field label="Nombre Completo" value={incident.worker_name ?? "—"} />
                        <Field label="N.° Identificación" value={incident.worker_id_number ?? "—"} />
                        <Field label="Cargo" value={incident.worker_position ?? "—"} />
                    </View>
                    <View style={styles.row}>
                        <Field label="EPS" value={incident.worker_eps ?? "—"} />
                        <Field label="ARL" value={incident.worker_arl ?? "—"} />
                        <Field label="Fecha de Ingreso" value={incident.worker_hire_date ? formatDateCO(incident.worker_hire_date) : "—"} />
                    </View>
                    <View style={styles.row}>
                        <Field label="Reportado por" value={incident.reported_by_name ?? "—"} />
                        <Field label="Cargo del Reportante" value={incident.reported_by_role ?? "—"} />
                    </View>
                </View>

                {/* ── Sección 3: Datos del Accidente ── */}
                <View style={styles.section}>
                    <SectionTitle>3. DATOS DEL EVENTO</SectionTitle>
                    <View style={styles.row}>
                        <Field label="Fecha del Evento" value={formatDateCO(incident.created_at)} />
                        <Field label="Tipo de Evento" value={eventTypeLabel} />
                        <Field label="Severidad" value={severityLabel} />
                    </View>
                    <View style={styles.row}>
                        <Field label="Zona del Accidente" value={zoneLabel} />
                        <Field label="Lugar Específico" value={incident.location_name ?? "—"} />
                    </View>
                    <View style={styles.row}>
                        <Field label="Mecanismo del Accidente" value={incident.accident_mechanism ?? "—"} />
                        <Field label="Agente del Accidente" value={incident.accident_agent ?? "—"} />
                    </View>
                    <View style={styles.row}>
                        <Field
                            label="Actividad que realizaba al momento del evento"
                            value={incident.activity_at_time ?? "—"}
                        />
                    </View>
                    <Text style={styles.fieldLabel}>Descripción del Evento</Text>
                    <View style={styles.descriptionBlock}>
                        <Text style={{ fontSize: 9 }}>{incident.description ?? "Sin descripción."}</Text>
                    </View>
                </View>

                {/* ── Sección 4: Clasificación de la Lesión ── */}
                <View style={styles.section}>
                    <SectionTitle>4. CLASIFICACIÓN DE LA LESIÓN</SectionTitle>
                    <View style={styles.row}>
                        <Field label="Tipo de Lesión" value={incident.injury_type ?? "—"} />
                        <Field
                            label="Parte del Cuerpo Afectada"
                            value={
                                incident.body_part_description
                                    ? `(${incident.body_part_code}) ${incident.body_part_description}`
                                    : "—"
                            }
                        />
                    </View>
                    <View style={styles.row}>
                        <Field
                            label="Días de Incapacidad"
                            value={
                                incident.disability_days !== undefined
                                    ? `${incident.disability_days} días`
                                    : "—"
                            }
                        />
                        <Field
                            label="Accidente de Trabajo"
                            value={
                                incident.is_work_accident === true
                                    ? "Sí"
                                    : incident.is_work_accident === false
                                        ? "No"
                                        : "—"
                            }
                        />
                    </View>
                </View>

                {/* ── Signature Area ── */}
                <View style={styles.signatureArea}>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureLabel}>Firma del Trabajador</Text>
                    </View>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureLabel}>Firma del Jefe Inmediato</Text>
                    </View>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureLabel}>Responsable SG-SST</Text>
                    </View>
                </View>

                {/* ── Footer ── */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>
                        FOXTECH SST — Reporte N.° {incident.id.slice(0, 8).toUpperCase()}
                    </Text>
                    <Text style={styles.footerText}>
                        Generado el {formatDateCO(generatedAt)}
                    </Text>
                    <Text
                        style={styles.footerText}
                        render={({ pageNumber, totalPages }) =>
                            `Página ${pageNumber} de ${totalPages}`
                        }
                    />
                </View>
            </Page>
        </Document>
    );
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Generate and download the PDF report for a single event.
 * Uses @react-pdf/renderer — client-side only, no server needed.
 */
export async function downloadEventReportPDF(
    incident: LocalIncident,
    company: CompanyProfile
): Promise<void> {
    const generatedAt = new Date().toISOString();

    const doc = (
        <EventReportDocument
            incident={incident}
            company={company}
            generatedAt={generatedAt}
        />
    );

    const blob = await pdf(doc).toBlob();
    const fileName = `FOXTECH_Evento_${incident.id.slice(0, 8).toUpperCase()}.pdf`;
    downloadBlob(blob, fileName);
}
