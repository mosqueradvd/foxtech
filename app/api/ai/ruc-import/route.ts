import { GoogleGenerativeAI } from "@google/generative-ai";
import * as XLSX from "xlsx";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return Response.json(
                { error: "GEMINI_API_KEY no está configurada en las variables de entorno." },
                { status: 500 }
            );
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return Response.json(
                { error: "No se proporcionó ningún archivo Excel para analizar." },
                { status: 400 }
            );
        }

        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });

        // Extract a structured text representation of the workbook (headers + first 45 rows of each sheet)
        const sheetSummaries: Array<{ name: string; rows: any[][] }> = [];

        workbook.SheetNames.forEach((sheetName) => {
            const sheet = workbook.Sheets[sheetName];
            const rawData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

            // Filter non-empty rows and limit sample size for prompt efficiency
            const sampleRows = rawData
                .filter((row) => Array.isArray(row) && row.some((cell) => cell !== null && cell !== undefined && cell !== ""))
                .slice(0, 45);

            if (sampleRows.length > 0) {
                sheetSummaries.push({
                    name: sheetName,
                    rows: sampleRows,
                });
            }
        });

        if (sheetSummaries.length === 0) {
            return Response.json(
                { error: "El archivo Excel está vacío o no contiene datos legibles." },
                { status: 400 }
            );
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        const currentYear = new Date().getFullYear();
        const targetYears = [
            currentYear - 5,
            currentYear - 4,
            currentYear - 3,
            currentYear - 2,
            currentYear - 1,
            currentYear,
        ];

        const systemPrompt = `Eres un experto en inteligencia de datos y auditoría de Seguridad y Salud en el Trabajo (SST / RUC del Consejo Colombiano de Seguridad) en Colombia.

Tu objetivo es analizar el contenido de un archivo Excel de reporte histórico ATEL / RUC y mapear sus datos cuantitativos exactamente al esquema JSON objetivo de la plataforma FOXTECH.

ESQUEMA OBJETIVO:
Los años soportados son exactamente: ${targetYears.join(", ")}.
Los tipos de vinculación soportados son: "directo", "subcontratista", "cliente".
Las secciones soportadas son: "ultimo_informe" (Último Informe RUC) y "certificado_arl" (Certificado ARL - solo para trabajadores directos).

Campos por año (todos valores numéricos enteros o decimales):
- num_trabajadores: Número promedio de trabajadores
- hht: Horas Hombre Trabajadas
- dias_trabajo_mes: Número promedio de días de trabajo programados en el mes
- at_mortales: No. de A.T. fatales
- at_con_invalidez: No. de A.T. con Invalidez
- at_con_ipp: No. de A.T. con incapacidad permanente parcial (IPP)
- at_graves_res_1401: No. de A.T. graves según Res. 1401/2007
- at_con_tiempo_perdido: No. de A.T. con tiempo perdido
- at_sin_tiempo_perdido: No. de A.T. sin tiempo perdido
- dias_incapacidad_at: Número de días de incapacidad generados por accidentes
- casi_accidentes: No. de casos reportados por Casi-Accidente / Near Misses
- el_casos_nuevos: No. de casos Nuevos de Enfermedad Laboral
- el_casos_antiguos: No. de casos antiguos de EL
- el_mortales: No. E.L. Fatales
- el_con_invalidez: No. E.L. con Invalidez
- el_con_ipp: No. E.L. con IPP
- el_con_tiempo_perdido: No. de E.L. con tiempo perdido
- el_sin_tiempo_perdido: No. de E.L. sin tiempo perdido
- dias_incapacidad_el: Número de días de incapacidad generados por E.L.
- dias_ausencia_incapacidad_laboral: Total días de ausencia por incapacidad laboral
- dias_ausencia_incapacidad_comun: Total días de ausencia por incapacidad común

REGLAS DE EXTRACCIÓN:
1. Analiza cada pestaña y determina si corresponde a "ultimo_informe" o "certificado_arl". Si la pestaña no especifica se asume "ultimo_informe".
2. Identifica las columnas por año (pueden venir como 2019, 2020, 2021, 2022, 2023, 2024 o como -5, -4, -3, -2, -1, 0). Asigna cada columna a su año correspondiente (donde 0 o el último año representa ${currentYear}).
3. Extrae las filas asociándolas a las categorías de trabajador: "directo", "subcontratista", "cliente". Si el archivo no desglosa por vinculación, asigna todo a "directo".
4. Retorna SOLO un objeto JSON válido con la siguiente estructura:
{
  "confidence": <número entre 0 y 100>,
  "summary": "<breve resumen ejecutivo en español de lo encontrado en el Excel>",
  "detectedSheets": ["nombre1", "nombre2"],
  "data": {
    "ultimo_informe": {
      "directo": {
        "2019": { "num_trabajadores": 0, "hht": 0, ... },
        ...
      },
      "subcontratista": { ... },
      "cliente": { ... }
    },
    "certificado_arl": {
      "directo": { ... }
    }
  }
}`;

        const userPrompt = `A continuación se presentan las hojas del archivo Excel cargado:\n\n${JSON.stringify(
            sheetSummaries,
            null,
            2
        )}`;

        const result = await model.generateContent({
            contents: [
                {
                    role: "user",
                    parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
                },
            ],
        });

        const responseText = result.response.text();
        let parsedJson: any;

        try {
            // Clean up possible markdown json blocks
            const jsonText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
            parsedJson = JSON.parse(jsonText);
        } catch (e) {
            console.error("[RUC AI API] Error al parsear respuesta de Gemini:", responseText);
            return Response.json(
                { error: "La IA generó una respuesta pero no pudo formatearse en JSON válido." },
                { status: 500 }
            );
        }

        return Response.json({
            success: true,
            fileName: file.name,
            confidence: parsedJson.confidence || 90,
            summary: parsedJson.summary || "Procesamiento completado con éxito.",
            data: parsedJson.data || {},
        });
    } catch (err: any) {
        console.error("[RUC AI API] Internal Error:", err);
        return Response.json(
            { error: err.message || "Error al procesar el archivo Excel con IA." },
            { status: 500 }
        );
    }
}
