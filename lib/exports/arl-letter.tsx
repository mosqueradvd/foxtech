/**
 * lib/exports/arl-letter.tsx
 * Comunicación a la ARL por accidente de trabajo grave o mortal.
 * Más concisa que la carta Mintrabajo — aviso + solicitud de asesoría técnica.
 */
"use client";

import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import type { LocalIncident } from "../db";
import type { CompanyLegal } from "./mintrabajo-letter";
import { downloadBlob } from "./ruc-export";

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
    dateCity: { fontSize: 10, marginBottom: 18 },
    recipientBlock: { marginBottom: 18 },
    recipientBold: { fontFamily: "Helvetica-Bold", fontSize: 10, textTransform: "uppercase" },
    recipientNormal: { fontSize: 10 },
    subject: { fontFamily: "Helvetica-Bold", fontSize: 10, marginBottom: 16, textDecoration: "underline" },
    salutation: { marginBottom: 10 },
    paragraph: { marginBottom: 10, textAlign: "justify" },
    sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 10, textTransform: "uppercase", marginTop: 12, marginBottom: 6 },
    dataRow: { flexDirection: "row", marginBottom: 3 },
    dataLabel: { fontFamily: "Helvetica-Bold", fontSize: 10, width: 170, flexShrink: 0 },
    dataValue: { fontSize: 10, flex: 1 },
    signatureBlock: { marginTop: 36 },
    signatureLine: { borderTopWidth: 0.5, borderTopColor: "#374151", marginTop: 36, paddingTop: 4, width: 200 },
    signatureLabel: { fontSize: 9, color: "#374151" },
    footer: { position: "absolute", bottom: 24, left: 56, right: 56, flexDirection: "row", justifyContent: "space-between" },
    footerText: { fontSize: 7, color: "#9ca3af" },
});

function Field({ label, value }: { label: string; value: string }) {
    return (
        <View style={S.dataRow}>
            <Text style={S.dataLabel}>{label}:</Text>
            <Text style={S.dataValue}>{value || "—"}</Text>
        </View>
    );
}

function ARLLetterDocument({ company, incident }: { company: CompanyLegal; incident: LocalIncident }) {
    const arlName = incident.worker_arl ?? "ARL";
    const today = new Date().toISOString();
    const severityLabel = incident.severity === "mortal" ? "MORTAL" : "GRAVE";

    return (
        <Document title={`Comunicación ARL — ${incident.id.slice(0, 8).toUpperCase()}`} author="FOXTECH SST">
            <Page size="LETTER" style={S.page}>
                <Text style={S.dateCity}>{company.city}, {longDateCO(today)}</Text>

                <View style={S.recipientBlock}>
                    <Text style={S.recipientBold}>Señores</Text>
                    <Text style={S.recipientBold}>{arlName.toUpperCase()}</Text>
                    <Text style={S.recipientNormal}>{company.city}</Text>
                </View>

                <Text style={S.subject}>
                    Asunto: Aviso de accidente de trabajo {severityLabel} — reporte para gestión ARL
                </Text>

                <Text style={S.salutation}>Estimados señores,</Text>

                <Text style={S.paragraph}>
                    {company.name}, NIT {company.nitWithDv}, informa a la Administradora de Riesgos
                    Laborales {arlName} el siguiente accidente de trabajo, en cumplimiento de las
                    obligaciones del Sistema General de Riesgos Laborales (Ley 1562/2012) y el
                    Decreto 1072/2015.
                </Text>

                <Text style={S.sectionTitle}>Datos del Trabajador Accidentado</Text>
                <Field label="Nombre completo" value={incident.worker_name ?? ""} />
                <Field label="Identificación" value={incident.worker_id_number ?? ""} />
                <Field label="Cargo" value={incident.worker_position ?? ""} />
                <Field label="Fecha de ingreso" value={
                    incident.worker_hire_date ? shortDateCO(incident.worker_hire_date) : "—"
                } />

                <Text style={S.sectionTitle}>Datos del Evento</Text>
                <Field label="Fecha del evento" value={shortDateCO(incident.created_at)} />
                <Field label="Lugar" value={incident.location_name ?? ""} />
                <Field label="Severidad" value={severityLabel} />
                <Field label="Tipo de lesión" value={incident.injury_type ?? ""} />
                <Field label="Parte del cuerpo" value={
                    incident.body_part_description
                        ? `(${incident.body_part_code}) ${incident.body_part_description}`
                        : ""
                } />
                <Field label="Días de incapacidad" value={
                    incident.disability_days !== undefined ? `${incident.disability_days}` : "En calificación"
                } />

                <Text style={S.paragraph}>
                    Descripción: {incident.description || "Ver FURAT adjunto."}
                </Text>

                <Text style={S.paragraph}>
                    Se solicita respetuosamente la asesoría técnica y acompañamiento de la ARL
                    para la investigación del evento y la implementación de medidas preventivas,
                    conforme al artículo 11 de la Ley 1562 de 2012.
                </Text>

                <Text style={S.paragraph}>Atentamente,</Text>

                <View style={S.signatureBlock}>
                    <View style={S.signatureLine} />
                    <Text style={S.signatureLabel}>{company.legalRep.name}</Text>
                    <Text style={S.signatureLabel}>Representante Legal</Text>
                    <Text style={S.signatureLabel}>{company.name} — NIT {company.nitWithDv}</Text>
                    <Text style={S.signatureLabel}>Tel: {company.legalRep.phone} | {company.legalRep.email}</Text>
                </View>

                <View style={S.footer} fixed>
                    <Text style={S.footerText}>Comunicación ARL — {incident.id.slice(0, 8).toUpperCase()}</Text>
                    <Text style={S.footerText}>Generado el {shortDateCO(today)} — FOXTECH SST</Text>
                    <Text style={S.footerText} render={({ pageNumber, totalPages }) => `Pág. ${pageNumber}/${totalPages}`} />
                </View>
            </Page>
        </Document>
    );
}

export async function downloadARLLetterPDF(
    company: CompanyLegal,
    incident: LocalIncident
): Promise<void> {
    const doc = <ARLLetterDocument company={company} incident={incident} />;
    const blob = await pdf(doc).toBlob();
    const fileName = `ARL_Comunicacion_${incident.id.slice(0, 8).toUpperCase()}.pdf`;
    downloadBlob(blob, fileName);
}
