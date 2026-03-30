import * as XLSX from 'xlsx';
import { Company, RucHistoricalData, WorkerTypeCategory } from '@/lib/supabase';

const CONST_K = 240000;

export async function generateRucExcel(
    company: Company,
    dataMatrix: Record<string, Record<WorkerTypeCategory, Record<number, RucHistoricalData>>>,
    years: number[]
) {
    const wb = XLSX.utils.book_new();

    const sections = [
        { key: "directo", name: "Directos" },
        { key: "subcontratista", name: "Subcontratistas" },
        { key: "cliente", name: "Cliente" }
    ];

    // Helper to generate a sheet for a specific worker type and a specific section of data
    // We export Section 2 (Ultimo Informe) mostly since that's what's officially submitted? 
    // The prompt says: "En total, será un Excel con 4 hojas (Directos, Subcontratistas, Cliente, Diferencias)."
    // So we assume the user exports "Último Informe RUC" (Section 2) data or Section 1 if they want.
    // Let's export Section 2 (the manual input) because that's the "official" report.
    // For Diferencias we export Section 4.

    const createSheetData = (workerType: WorkerTypeCategory, sourceData: Record<number, RucHistoricalData>) => {
        const rows: any[] = [];
        
        // Header Row
        const header = ["CONCEPTO"];
        years.forEach(y => header.push(y.toString()));
        rows.push(header);

        // Bloque A: Exposición
        rows.push(["Numero Promedio Trabajadores", ...years.map(y => sourceData[y]?.num_trabajadores || 0)]);
        rows.push(["Horas Hombre Trabajadas", ...years.map(y => sourceData[y]?.hht || 0)]);
        rows.push(["Número promedio de días de trabajo programados en el mes", ...years.map(y => sourceData[y]?.dias_trabajo_mes || 0)]);

        // Bloque B: Accidentalidad / Incidentes
        rows.push(["INCIDENTES DE TRABAJO"]);
        rows.push(["No. de A.T. fatales", ...years.map(y => sourceData[y]?.at_mortales || 0)]);
        rows.push(["No. de A.T. con Invalidez", ...years.map(y => sourceData[y]?.at_con_invalidez || 0)]);
        rows.push(["No. de A.T. con incapacidad permanente parcial (IPP)", ...years.map(y => sourceData[y]?.at_con_ipp || 0)]);
        rows.push(["No. de A.T. graves de acuerdo con la Resolución 1401 de 2007.", ...years.map(y => sourceData[y]?.at_graves_res_1401 || 0)]);
        rows.push(["No. de A.T. con tiempo perdido", ...years.map(y => sourceData[y]?.at_con_tiempo_perdido || 0)]);
        rows.push(["No. de A.T. sin tiempo perdido", ...years.map(y => sourceData[y]?.at_sin_tiempo_perdido || 0)]);
        rows.push(["Número de días de incapacidad generados por los accidentes reportados en el periodo", ...years.map(y => sourceData[y]?.dias_incapacidad_at || 0)]);
        rows.push(["No. de casos reportados por Casi - Accidente", ...years.map(y => sourceData[y]?.casi_accidentes || 0)]);
        
        // Bloque C: Enfermedad Laboral
        rows.push(["ENFERMEDAD LABORAL"]);
        rows.push(["No. de casos Nuevos de EL", ...years.map(y => sourceData[y]?.el_casos_nuevos || 0)]);
        rows.push(["No. de casos antiguos de EL", ...years.map(y => sourceData[y]?.el_casos_antiguos || 0)]);
        rows.push(["No. E.L. Fatales", ...years.map(y => sourceData[y]?.el_mortales || 0)]);
        rows.push(["No. E.L. con Invalidez", ...years.map(y => sourceData[y]?.el_con_invalidez || 0)]);
        rows.push(["No. E.L. con incapacidad permanente parcial (IPP)", ...years.map(y => sourceData[y]?.el_con_ipp || 0)]);
        rows.push(["No. de E.L. con tiempo perdido", ...years.map(y => sourceData[y]?.el_con_tiempo_perdido || 0)]);
        rows.push(["No. de E.L. sin tiempo perdido", ...years.map(y => sourceData[y]?.el_sin_tiempo_perdido || 0)]);
        rows.push(["Número de días de incapacidad generados por E.L reportados en el periodo", ...years.map(y => sourceData[y]?.dias_incapacidad_el || 0)]);
        
        // Bloque D: Ausentismo
        rows.push(["AUSENTISMO POR CAUSA MEDICA"]);
        rows.push(["Total de días de ausencia por incapacidad laboral", ...years.map(y => sourceData[y]?.dias_ausencia_incapacidad_laboral || 0)]);
        rows.push(["Total de días de ausencia por incapacidad común", ...years.map(y => sourceData[y]?.dias_ausencia_incapacidad_comun || 0)]);

        // Bloque Interno: Indicadores
        rows.push(["OTROS INDICADORES (REFERENCIA)"]);
        rows.push(["Índice de Frecuencia de AT (IF)", ...years.map(y => {
            const hht = sourceData[y]?.hht || 0;
            if (hht === 0) return 0;
            const totalAT = (sourceData[y]?.at_mortales || 0) + (sourceData[y]?.at_con_tiempo_perdido || 0) + (sourceData[y]?.at_sin_tiempo_perdido || 0); // Approx total AT for internal IF calculation
            return (totalAT * CONST_K / hht).toFixed(2);
        })]);
        rows.push(["Índice de Severidad de AT (IS)", ...years.map(y => {
            const hht = sourceData[y]?.hht || 0;
            if (hht === 0) return 0;
            return (((sourceData[y]?.dias_incapacidad_at || 0) + (sourceData[y]?.dias_cargados_at || 0)) * CONST_K / hht).toFixed(2);
        })]);
        rows.push(["Índice de Lesiones Incapacitantes de AT (ILI)", ...years.map(y => {
            return sourceData[y]?.ili || 0;
        })]);

        return rows;
    };

    sections.forEach(({ key, name }) => {
        const sourceData = dataMatrix["s2"][key as WorkerTypeCategory] || {};
        const wsData = createSheetData(key as WorkerTypeCategory, sourceData);
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        ws['!cols'] = [{ wch: 60 }, ...years.map(() => ({ wch: 15 }))];

        XLSX.utils.book_append_sheet(wb, ws, name);
    });

    // Sheet 4: Diferencias (Section 4 data)
    {
        const rows: any[] = [];
        const header = ["CONCEPTO", "TIPO VINCULACION"];
        years.forEach(y => header.push(y.toString()));
        rows.push(header);

        sections.forEach(({ key, name }) => {
            const s4Data = dataMatrix["s4"][key as WorkerTypeCategory] || {};
            
            const addRow = (concept: string, field: keyof RucHistoricalData) => {
                rows.push([
                    concept, 
                    name, 
                    ...years.map(y => {
                        const val = Number(s4Data[y]?.[field] || 0);
                        return val;
                    })
                ]);
            };

            addRow("Numerp Prom. Trabajadores (Dif)", "num_trabajadores");
            addRow("HHT (Dif)", "hht");
            addRow("AT Mortales (Dif)", "at_mortales");
            addRow("AT Tiempo Perdido (Dif)", "at_con_tiempo_perdido");
            addRow("Dias Incapacidad AT (Dif)", "dias_incapacidad_at");
            addRow("Casos Nuevos EL (Dif)", "el_casos_nuevos");
            addRow("Dias Ausencia Incapacidad Laboral (Dif)", "dias_ausencia_incapacidad_laboral");
            addRow("IF (Dif)", "if_at");
            addRow("IS (Dif)", "is_at");
        });

        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{ wch: 40 }, { wch: 20 }, ...years.map(() => ({ wch: 15 }))];
        XLSX.utils.book_append_sheet(wb, ws, "Diferencias");
    }

    const fileName = `RUC_${company.razon_social.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().getFullYear()}.xlsx`;
    XLSX.writeFile(wb, fileName);
}
