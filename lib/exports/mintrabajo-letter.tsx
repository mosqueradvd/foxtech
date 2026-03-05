/**
 * lib/exports/mintrabajo-letter.tsx
 * Carta formal al Ministerio del Trabajo para accidentes graves o mortales.
 * Base legal: Decreto 1072/2015, Art. 2.2.4.1.6
 * Plazo: 2 días hábiles desde el accidente.
 * Generación 100% client-side via @react-pdf/renderer.
 */
"use client";

import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import type { LocalIncident } from "../db";
import { getDireccionTerritorial } from "../constants/mintrabajo-direcciones";
import { downloadBlob } from "./ruc-export";

// ── Types ─────────────────────────────────────────────────────────────────

export interface LegalRepresentative {
    name: string;
    phone: string;
    email: string;
}

export interface CompanyLegal {
    name: string;
    /** NIT con DV, ej. "900.123.456-7" */
    nitWithDv: string;
    city: string;
    department: string;
    legalRep: LegalRepresentative;
}

export interface ImmediateAction {
    description: string;
}

export interface MintrabajoLetterInput {
    company: CompanyLegal;
    incident: LocalIncident;
    furatNumber?: string;
    immediateActions: ImmediateAction[];
    attachments?: string[];
}

// ── Date helpers ──────────────────────────────────────────────────────────

const MESES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function longDateCO(isoString: string): string {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "—";
    return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

function shortDateCO(isoString: string): string {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "—";
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
}

function today(): string {
    return new Date().toISOString();
}

// ── Severity labels ───────────────────────────────────────────────────────

const SEVERITY_UPPER: Record<string, string> = {
    grave: "GRAVE",
    mortal: "MORTAL",
};

// ── Styles ────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
    page: {
        fontFamily: "Helvetica",
        fontSize: 10,
        paddingTop: 50,
        paddingBottom: 60,
        paddingHorizontal: 56,
        color: "#1a1a1a",
        lineHeight: 1.5,
    },
    // Header
    dateCity: {
        fontSize: 10,
        marginBottom: 18,
    },
    recipientBlock: {
        marginBottom: 18,
    },
    recipientName: {
        fontFamily: "Helvetica-Bold",
        fontSize: 10,
        textTransform: "uppercase",
    },
    recipientSub: {
        fontSize: 10,
    },
    // Subject
    subject: {
        fontFamily: "Helvetica-Bold",
        fontSize: 10,
        marginBottom: 16,
        textDecoration: "underline",
    },
    // Body
    salutation: {
        marginBottom: 10,
    },
    paragraph: {
        marginBottom: 10,
        textAlign: "justify",
    },
    // Data section
    sectionTitle: {
        fontFamily: "Helvetica-Bold",
        fontSize: 10,
        textTransform: "uppercase",
        marginTop: 12,
        marginBottom: 6,
    },
    dataRow: {
        flexDirection: "row",
        marginBottom: 3,
    },
    dataLabel: {
        fontFamily: "Helvetica-Bold",
        fontSize: 10,
        width: 170,
        flexShrink: 0,
    },
    dataValue: {
        fontSize: 10,
        flex: 1,
    },
    // Actions list
    actionItem: {
        marginBottom: 3,
        paddingLeft: 10,
    },
    // Signature
    signatureBlock: {
        marginTop: 36,
    },
    signatureLine: {
        borderTopWidth: 0.5,
        borderTopColor: "#374151",
        marginTop: 36,
        paddingTop: 4,
        width: 200,
    },
    signatureLabel: {
        fontSize: 9,
        color: "#374151",
    },
    // Footer
    footer: {
        position: "absolute",
        bottom: 24,
        left: 56,
        right: 56,
        flexDirection: "row",
        justifyContent: "space-between",
    },
    footerText: {
        fontSize: 7,
        color: "#9ca3af",
    },
    // Alert bar
    alertBar: {
        backgroundColor: "#fef2f2",
        borderWidth: 0.5,
        borderColor: "#fca5a5",
        borderRadius: 2,
        padding: 6,
        marginBottom: 14,
    },
    alertText: {
        fontFamily: "Helvetica-Bold",
        fontSize: 8,
        color: "#b91c1c",
    },
});

// ── Helper ────────────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value: string }) {
    return (
        <View style={S.dataRow}>
            <Text style={S.dataLabel}>{label}:</Text>
            <Text style={S.dataValue}>{value || "—"}</Text>
        </View>
    );
}

// ── PDF Document ──────────────────────────────────────────────────────────

function MintrabajoLetterDocument({ input }: { input: MintrabajoLetterInput }) {
    const { company, incident, furatNumber, immediateActions, attachments = [] } = input;
    const dt = getDireccionTerritorial(company.department);
    const oficina = dt?.nombreOficina ?? `Dirección Territorial de ${company.department}`;
    const severityLabel = SEVERITY_UPPER[incident.severity ?? ""] ?? "GRAVE";

    const defaultAttachments = ["Copia del FURAT", "Registro fotográfico del evento"];
    const allAttachments = attachments.length > 0 ? attachments : defaultAttachments;

    return (
        <Document
            title={`Notificación Mintrabajo — ${incident.id.slice(0, 8).toUpperCase()}`}
            author="FOXTECH SST"
        >
            <Page size="LETTER" style={S.page}>
                {/* Mortal alert */}
                {incident.severity === "mortal" && (
                    <View style={S.alertBar}>
                        <Text style={S.alertText}>
                            ⚠ ACCIDENTE MORTAL — Notificación inmediata obligatoria. Plazo: 2 días hábiles
                            (Art. 2.2.4.1.6, Decreto 1072/2015).
                        </Text>
                    </View>
                )}

                {/* Date and city */}
                <Text style={S.dateCity}>
                    {company.city}, {longDateCO(today())}
                </Text>

                {/* Recipient */}
                <View style={S.recipientBlock}>
                    <Text style={S.recipientName}>Señores</Text>
                    <Text style={S.recipientName}>MINISTERIO DEL TRABAJO</Text>
                    <Text style={S.recipientSub}>{oficina}</Text>
                    <Text style={S.recipientSub}>{dt?.ciudad ?? company.city}</Text>
                </View>

                {/* Subject */}
                <Text style={S.subject}>
                    Asunto: Notificación de accidente de trabajo {severityLabel} — Art. 2.2.4.1.6
                    del Decreto 1072 de 2015
                </Text>

                {/* Salutation */}
                <Text style={S.salutation}>Respetados señores,</Text>

                {/* Opening paragraph */}
                <Text style={S.paragraph}>
                    {company.name}, identificada con NIT {company.nitWithDv}, en cumplimiento de
                    lo establecido en el Artículo 2.2.4.1.6 del Decreto 1072 de 2015 y el Artículo
                    3 de la Resolución 1401 de 2007, se permite notificar ante su Despacho el
                    siguiente evento laboral:
                </Text>

                {/* Worker data */}
                <Text style={S.sectionTitle}>Datos del Trabajador</Text>
                <Field label="Nombre completo" value={incident.worker_name ?? ""} />
                <Field label="Documento de identidad" value={incident.worker_id_number ?? ""} />
                <Field label="Cargo" value={incident.worker_position ?? ""} />
                <Field label="ARL" value={incident.worker_arl ?? ""} />
                <Field label="EPS" value={incident.worker_eps ?? ""} />

                {/* Accident data */}
                <Text style={S.sectionTitle}>Datos del Accidente</Text>
                <Field label="Fecha del accidente" value={shortDateCO(incident.created_at)} />
                <Field label="Lugar del accidente" value={incident.location_name ?? ""} />
                <Field label="Centro de trabajo" value={incident.work_center ?? ""} />
                <Field label="Tipo de lesión" value={incident.injury_type ?? ""} />
                <Field label="Parte del cuerpo afectada" value={
                    incident.body_part_description
                        ? `(${incident.body_part_code}) ${incident.body_part_description}`
                        : ""
                } />
                <Field label="Severidad" value={severityLabel} />
                {furatNumber && <Field label="N.° FURAT" value={furatNumber} />}
                <Field label="Días de incapacidad" value={
                    incident.disability_days !== undefined ? `${incident.disability_days} días` : "En calificación"
                } />

                {/* Description */}
                <Text style={S.sectionTitle}>Descripción de los Hechos</Text>
                <Text style={S.paragraph}>{incident.description || "Sin descripción registrada."}</Text>

                {/* Immediate actions */}
                {immediateActions.length > 0 && (
                    <>
                        <Text style={S.sectionTitle}>Acciones Inmediatas Tomadas</Text>
                        {immediateActions.map((action, i) => (
                            <Text key={i} style={S.actionItem}>
                                {i + 1}. {action.description}
                            </Text>
                        ))}
                    </>
                )}

                {/* Closing */}
                <Text style={[S.paragraph, { marginTop: 12 }]}>
                    Se adjunta a la presente comunicación: {allAttachments.join(", ")}.
                </Text>

                <Text style={S.paragraph}>
                    En caso de requerir información adicional, quedamos a su disposición en los
                    datos de contacto indicados al pie de la presente comunicación.
                </Text>

                <Text style={S.paragraph}>Atentamente,</Text>

                {/* Signature */}
                <View style={S.signatureBlock}>
                    <View style={S.signatureLine} />
                    <Text style={S.signatureLabel}>{company.legalRep.name}</Text>
                    <Text style={S.signatureLabel}>Representante Legal</Text>
                    <Text style={S.signatureLabel}>{company.name}</Text>
                    <Text style={S.signatureLabel}>NIT: {company.nitWithDv}</Text>
                    <Text style={S.signatureLabel}>Tel: {company.legalRep.phone}</Text>
                    <Text style={S.signatureLabel}>{company.legalRep.email}</Text>
                </View>

                {/* Footer */}
                <View style={S.footer} fixed>
                    <Text style={S.footerText}>
                        Notificación Mintrabajo — {incident.id.slice(0, 8).toUpperCase()}
                    </Text>
                    <Text style={S.footerText}>
                        Generado el {shortDateCO(today())} — FOXTECH SST
                    </Text>
                    <Text
                        style={S.footerText}
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

export async function downloadMintrabajoLetterPDF(
    input: MintrabajoLetterInput
): Promise<void> {
    const doc = <MintrabajoLetterDocument input={input} />;
    const blob = await pdf(doc).toBlob();
    const workerSlug = (input.incident.worker_name ?? "Trabajador")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
    const dateSlug = input.incident.created_at.slice(0, 10).replace(/-/g, "");
    const fileName = `Mintrabajo_${workerSlug}_${dateSlug}.pdf`;
    downloadBlob(blob, fileName);
}
