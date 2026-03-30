"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { supabase } from "@/lib/supabase";
import { Award, Download, AlertTriangle, Save, Loader2, Info } from "lucide-react";
import { useTheme } from "next-themes";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { generateRucExcel } from "@/lib/exports/ruc-atel-excel";
import { RucHistoricalData, WorkerTypeCategory, Event } from "@/lib/supabase";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 5, CURRENT_YEAR - 4, CURRENT_YEAR - 3, CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR];
const CONST_K = 240000;

const WORKER_TYPES: { id: WorkerTypeCategory, label: string }[] = [
    { id: "directo", label: "Directos" },
    { id: "subcontratista", label: "Subcontratistas" },
    { id: "cliente", label: "Cliente" }
];

type MatrixData = Record<WorkerTypeCategory, Record<number, RucHistoricalData>>;

// Helper to init an empty matrix
const createEmptyMatrix = (): MatrixData => {
    const res: any = {};
    WORKER_TYPES.forEach(wt => {
        res[wt.id] = {};
        YEARS.forEach(y => {
            res[wt.id][y] = {
                num_trabajadores: 0, hht: 0, dias_trabajo_mes: 0,
                at_mortales: 0, at_con_incapacidad: 0, at_sin_incapacidad: 0, dias_incapacidad_at: 0, dias_cargados_at: 0,
                at_con_invalidez: 0, at_con_ipp: 0, at_graves_res_1401: 0, at_con_tiempo_perdido: 0, at_sin_tiempo_perdido: 0, casi_accidentes: 0,
                el_mortales: 0, el_con_incapacidad: 0, el_sin_incapacidad: 0, dias_incapacidad_el: 0, dias_cargados_el: 0,
                el_casos_nuevos: 0, el_casos_antiguos: 0, el_con_invalidez: 0, el_con_ipp: 0, el_con_tiempo_perdido: 0, el_sin_tiempo_perdido: 0,
                dias_ausencia_incapacidad_laboral: 0, dias_ausencia_incapacidad_comun: 0,
                if_at: 0, is_at: 0, ili: 0
            };
        });
    });
    return res;
};

export default function RucAtelPage() {
    const { activeCompany } = useActiveCompany();
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const [activeTab, setActiveTab] = useState<WorkerTypeCategory>("directo");
    const [saving, setSaving] = useState(false);

    // Form states for editable sections
    const [section2, setSection2] = useState<MatrixData>(createEmptyMatrix());
    const [section3, setSection3] = useState<Record<number, RucHistoricalData>>({}); // only "directo"

    const isLight = mounted && resolvedTheme === "light";
    const s = {
        bg: isLight ? "bg-slate-50" : "bg-black",
        cardBg: isLight ? "bg-white border-slate-200" : "bg-[#141824] border-[#1E2A3B]",
        textPrimary: isLight ? "text-slate-900" : "text-white",
        textSecondary: isLight ? "text-slate-500" : "text-[#94A3B8]",
        border: isLight ? "border-slate-200" : "border-[#1E2A3B]",
        accent: "#F59E0B"
    };

    const [incidents, setIncidents] = useState<Event[] | null>(null);
    const [isLoadingIncidents, setIsLoadingIncidents] = useState(false);

    // 2. Fetch Historical Data (Sections 2 & 3) state
    const [historicalData, setHistoricalData] = useState<RucHistoricalData[] | null>(null);
    const [isLoadingHistorical, setIsLoadingHistorical] = useState(false);

    const loadData = useCallback(async () => {
        if (!activeCompany?.id) return;

        setIsLoadingIncidents(true);
        setIsLoadingHistorical(true);

        const [incRes, histRes] = await Promise.all([
            supabase
                .from("incidents")
                .select("*")
                .eq("company_id", activeCompany.id)
                .gte("event_date", `${CURRENT_YEAR - 5}-01-01`),
            supabase
                .from("ruc_historical_data")
                .select("*")
                .eq("company_id", activeCompany.id)
        ]);

        if (incRes.data) setIncidents(incRes.data as Event[]);
        if (histRes.data) setHistoricalData(histRes.data);

        setIsLoadingIncidents(false);
        setIsLoadingHistorical(false);
    }, [activeCompany?.id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Initialize state from fetched data
    useEffect(() => {
        if (!historicalData) return;

        const s2 = createEmptyMatrix();
        const s3: Record<number, RucHistoricalData> = {};

        // Initialize s3 empty
        YEARS.forEach(y => {
            s3[y] = {
                num_trabajadores: 0, hht: 0, dias_trabajo_mes: 0,
                at_mortales: 0, at_con_incapacidad: 0, at_sin_incapacidad: 0, dias_incapacidad_at: 0, dias_cargados_at: 0,
                at_con_invalidez: 0, at_con_ipp: 0, at_graves_res_1401: 0, at_con_tiempo_perdido: 0, at_sin_tiempo_perdido: 0, casi_accidentes: 0,
                el_mortales: 0, el_con_incapacidad: 0, el_sin_incapacidad: 0, dias_incapacidad_el: 0, dias_cargados_el: 0,
                el_casos_nuevos: 0, el_casos_antiguos: 0, el_con_invalidez: 0, el_con_ipp: 0, el_con_tiempo_perdido: 0, el_sin_tiempo_perdido: 0,
                dias_ausencia_incapacidad_laboral: 0, dias_ausencia_incapacidad_comun: 0,
                if_at: 0, is_at: 0, ili: 0
            } as any;
        });

        historicalData.forEach(row => {
            const year = CURRENT_YEAR + row.year_position;
            if (!YEARS.includes(year)) return;

            if (row.section === "ultimo_informe") {
                const wt = row.worker_type as WorkerTypeCategory;
                s2[wt][year] = { ...s2[wt][year], ...row };
            } else if (row.section === "certificado_arl" && row.worker_type === "directo") {
                s3[year] = { ...s3[year], ...row };
            }
        });

        setSection2(s2);
        setSection3(s3);
    }, [historicalData]);

    // 3. Compute Section 1 (from Incidents)
    const section1 = useMemo(() => {
        const mat = createEmptyMatrix();
        if (!incidents) return mat;

        incidents.forEach(ev => {
            if (!ev.event_date) return;
            const year = new Date(ev.event_date).getFullYear();
            if (!YEARS.includes(year)) return;

            const wType = (ev.worker_type as WorkerTypeCategory) || "directo";
            if (!mat[wType]) return;

            const target = mat[wType][year];

            const isAT = ev.classification?.startsWith("ACCIDENTE_TRABAJO");
            const isEL = ev.classification === "ENFERMEDAD_LABORAL";

            if (isAT) {
                // Legacy / General metrics mapped for compatibility
                if (ev.classification === "ACCIDENTE_TRABAJO_FATAL") target.at_mortales++;
                else if ((ev.disability_days || 0) > 0) target.at_con_incapacidad++;
                else target.at_sin_incapacidad++;

                // New specific metrics
                if (ev.classification === "ACCIDENTE_TRABAJO_INVALIDEZ") target.at_con_invalidez++;
                if (ev.classification === "ACCIDENTE_TRABAJO_IPP") target.at_con_ipp++;

                if (ev.classification === "ACCIDENTE_TRABAJO_GRAVE") {
                    target.at_graves_res_1401++;
                    if ((ev.disability_days || 0) > 0) target.at_con_tiempo_perdido++;
                    else target.at_sin_tiempo_perdido++;
                }

                if (ev.classification === "ACCIDENTE_TRABAJO_CON_TIEMPO_PERDIDO") target.at_con_tiempo_perdido++;
                if (ev.classification === "ACCIDENTE_TRABAJO_SIN_TIEMPO_PERDIDO") target.at_sin_tiempo_perdido++;

                target.dias_incapacidad_at += (ev.disability_days || 0);

                // Estimate charged days based on standard rules
                if (ev.classification === "ACCIDENTE_TRABAJO_FATAL") target.dias_cargados_at += 6000;
                else target.dias_cargados_at += (ev.disability_days || 0); // Simplified charged days logic
            } else if (isEL) {
                target.el_casos_nuevos++; // For now all reported ELs are treated as new cases automatically

                if ((ev.disability_days || 0) > 0) {
                    target.el_con_incapacidad++;
                    target.el_con_tiempo_perdido++;
                } else {
                    target.el_sin_incapacidad++;
                    target.el_sin_tiempo_perdido++;
                }

                target.dias_incapacidad_el += (ev.disability_days || 0);
                target.dias_cargados_el += (ev.disability_days || 0);
            } else if (ev.classification === "CASI_ACCIDENTE") {
                target.casi_accidentes++;
            }
        });

        // Compute standard indicators for dynamically generated S1
        WORKER_TYPES.forEach(wt => {
            YEARS.forEach(y => {
                const s = mat[wt.id][y];

                // For Section 1, "Directos" always pull the company's global current values for HHT and Workers
                if (wt.id === "directo" && activeCompany) {
                    s.num_trabajadores = activeCompany.employee_count || 0;
                    s.hht = activeCompany.hht_annual || 0;
                }

                // Computed based on average 22 days per month requested by user, usually you can modify this field.
                s.dias_trabajo_mes = s.num_trabajadores * 22;
                s.dias_ausencia_incapacidad_laboral = s.dias_incapacidad_at + s.dias_incapacidad_el;
                s.dias_ausencia_incapacidad_comun = 0; // Filled manually in Section 2

                if (s.hht > 0) {
                    const totalAT = s.at_mortales + s.at_con_tiempo_perdido + s.at_sin_tiempo_perdido;
                    s.if_at = (totalAT * CONST_K) / s.hht;
                    s.is_at = ((s.dias_incapacidad_at + s.dias_cargados_at) * CONST_K) / s.hht;
                    s.ili = (s.if_at * s.is_at) / 1000;
                }
            });
        });

        return mat;
    }, [incidents]);

    // Compute Diferencia (S1 vs S2)
    const section4 = useMemo(() => {
        const mat = createEmptyMatrix();
        WORKER_TYPES.forEach(wt => {
            YEARS.forEach(y => {
                const s1 = section1[wt.id][y];
                const s2 = section2[wt.id][y];

                mat[wt.id][y] = {
                    ...mat[wt.id][y],
                    num_trabajadores: s1.num_trabajadores - (s2.num_trabajadores || 0),
                    hht: s1.hht - (s2.hht || 0),
                    dias_trabajo_mes: (s1.dias_trabajo_mes || 0) - (s2.dias_trabajo_mes || 0),

                    at_mortales: s1.at_mortales - (s2.at_mortales || 0),
                    at_con_invalidez: (s1.at_con_invalidez || 0) - (s2.at_con_invalidez || 0),
                    at_con_ipp: (s1.at_con_ipp || 0) - (s2.at_con_ipp || 0),
                    at_graves_res_1401: (s1.at_graves_res_1401 || 0) - (s2.at_graves_res_1401 || 0),
                    at_con_tiempo_perdido: (s1.at_con_tiempo_perdido || 0) - (s2.at_con_tiempo_perdido || 0),
                    at_sin_tiempo_perdido: (s1.at_sin_tiempo_perdido || 0) - (s2.at_sin_tiempo_perdido || 0),
                    dias_incapacidad_at: s1.dias_incapacidad_at - (s2.dias_incapacidad_at || 0),
                    casi_accidentes: (s1.casi_accidentes || 0) - (s2.casi_accidentes || 0),

                    el_casos_nuevos: (s1.el_casos_nuevos || 0) - (s2.el_casos_nuevos || 0),
                    el_casos_antiguos: (s1.el_casos_antiguos || 0) - (s2.el_casos_antiguos || 0),
                    el_mortales: s1.el_mortales - (s2.el_mortales || 0),
                    el_con_invalidez: (s1.el_con_invalidez || 0) - (s2.el_con_invalidez || 0),
                    el_con_ipp: (s1.el_con_ipp || 0) - (s2.el_con_ipp || 0),
                    el_con_tiempo_perdido: (s1.el_con_tiempo_perdido || 0) - (s2.el_con_tiempo_perdido || 0),
                    el_sin_tiempo_perdido: (s1.el_sin_tiempo_perdido || 0) - (s2.el_sin_tiempo_perdido || 0),
                    dias_incapacidad_el: s1.dias_incapacidad_el - (s2.dias_incapacidad_el || 0),

                    dias_ausencia_incapacidad_laboral: (s1.dias_ausencia_incapacidad_laboral || 0) - (s2.dias_ausencia_incapacidad_laboral || 0),
                    dias_ausencia_incapacidad_comun: (s1.dias_ausencia_incapacidad_comun || 0) - (s2.dias_ausencia_incapacidad_comun || 0),
                } as any;
            });
        });
        return mat;
    }, [section1, section2]);

    const handleSave = async () => {
        if (!activeCompany?.id) return;
        setSaving(true);
        try {
            const upserts: any[] = [];

            // Build S2 upserts
            WORKER_TYPES.forEach(wt => {
                YEARS.forEach(y => {
                    const row = section2[wt.id][y];
                    upserts.push({
                        ...row,
                        company_id: activeCompany.id,
                        section: "ultimo_informe",
                        worker_type: wt.id,
                        year_position: y - CURRENT_YEAR,
                        id: row.id || undefined
                    });
                });
            });

            // Build S3 upserts (directo only)
            YEARS.forEach(y => {
                const row = section3[y];
                upserts.push({
                    ...row,
                    company_id: activeCompany.id,
                    section: "certificado_arl",
                    worker_type: "directo",
                    year_position: y - CURRENT_YEAR,
                    id: row.id || undefined
                });
            });

            // The issue is ID generation doesn't work well with upserts unless we specify the unique identifier.
            // We have a UNIQUE constraint: (company_id, section, worker_type, year_position)
            // So we can use upsert.
            const { error } = await supabase.from("ruc_historical_data").upsert(
                upserts.map(({ id, ...rest }) => rest), // remove id to avoid conflicts on new rows
                { onConflict: 'company_id, section, worker_type, year_position' }
            );

            if (error) throw error;
            alert("Datos guardados exitosamente");

        } catch (e: any) {
            console.error(e);
            alert("Error al guardar: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleExport = async () => {
        if (!activeCompany) return;
        await generateRucExcel(activeCompany, { s1: section1, s2: section2, s3: { directo: section3 } as any, s4: section4 }, YEARS);
    };

    if (!activeCompany?.aplica_ruc) {
        return (
            <div className={`flex-1 flex flex-col h-full overflow-hidden ${s.bg}`}>
                <DashboardHeader>
                    <div>
                        <h1 className={`text-xl font-black uppercase tracking-tight flex items-center gap-2 ${s.textPrimary}`}>
                            <Award className="w-6 h-6 text-[#F59E0B]" />
                            RUC / ATEL
                        </h1>
                        <p className={`text-sm font-bold uppercase tracking-wider mt-0.5 ${s.textSecondary}`}>Gestión y Exportación CCS</p>
                    </div>
                </DashboardHeader>
                <div className="flex-1 p-8 overflow-y-auto">
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 p-4 rounded-xl flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5" />
                        <p className="text-sm font-bold">Esta empresa no aplica para el módulo RUC/CCS. Actívelo en la configuración de la empresa.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (isLoadingIncidents || isLoadingHistorical) {
        return <div className={`min-h-screen flex items-center justify-center ${s.bg}`}><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>;
    }

    const renderMatrix = (
        title: string,
        data: Record<number, any>,
        isEditable: boolean,
        isDiff: boolean = false,
        onChange?: (year: number, field: string, val: number) => void
    ) => {

        const handleChange = (year: number, field: string, val: string) => {
            if (!onChange) return;
            onChange(year, field, parseInt(val) || 0);
        };

        const getCellColor = (val: number) => {
            if (!isDiff) return "";
            return val !== 0 ? "text-red-500 font-bold" : "text-green-500";
        };

        return (
            <div className={`mt-6 p-6 rounded-2xl border ${s.border} ${s.cardBg} shadow-sm overflow-x-auto`}>
                <h3 className={`text-lg font-black mb-4 ${s.textPrimary}`}>{title}</h3>
                <table className="w-full text-sm text-left">
                    <thead>
                        <tr className="border-b border-slate-700/50">
                            <th className={`py-3 px-4 font-bold ${s.textSecondary} w-1/2`}>CONCEPTO</th>
                            {YEARS.map(y => <th key={y} className={`py-3 px-4 text-center font-bold ${s.textPrimary}`}>{y}</th>)}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                        {[
                            { key: "num_trabajadores", label: "Numero Promedio Trabajadores" },
                            { key: "hht", label: "Horas Hombre Trabajadas" },
                            { key: "dias_trabajo_mes", label: "Número promedio de días de trabajo programados en el mes" }
                        ].map(f => (
                            <tr key={f.key}>
                                <td className="py-3 px-4 text-slate-400">{f.label}</td>
                                {YEARS.map(y => <td key={y} className="px-1 py-1 text-center">
                                    <input disabled={!isEditable} value={data[y]?.[f.key] || 0} onChange={(e) => handleChange(y, f.key, e.target.value)} className={`w-24 text-center bg-transparent border ${s.border} rounded py-1 px-0.5 ${getCellColor(data[y]?.[f.key])}`} type="number" />
                                </td>)}
                            </tr>
                        ))}

                        {/* Bloque B */}
                        <tr className="bg-slate-800/20"><td colSpan={7} className="py-2 px-4 font-black text-xs text-amber-500 uppercase tracking-widest mt-4">INCIDENTES DE TRABAJO</td></tr>
                        {[
                            { key: "at_mortales", label: "No. de A.T. fatales" },
                            { key: "at_con_invalidez", label: "No. de A.T. con Invalidez", tooltip: "Pendiente de implementación — ingresar manualmente" },
                            { key: "at_con_ipp", label: "No. de A.T. con incapacidad permanente parcial (IPP)", tooltip: "Pendiente de implementación — ingresar manualmente" },
                            { key: "at_graves_res_1401", label: "No. de A.T. graves de acuerdo con la Resolución 1401 de 2007" },
                            { key: "at_con_tiempo_perdido", label: "No. de A.T. con tiempo perdido" },
                            { key: "at_sin_tiempo_perdido", label: "No. de A.T. sin tiempo perdido" },
                            { key: "dias_incapacidad_at", label: "Número de días de incapacidad generados por los accidentes reportados en el periodo" },
                            { key: "casi_accidentes", label: "No. de casos reportados por Casi - Accidente" }
                        ].map(f => (
                            <tr key={f.key}>
                                <td className="py-2 px-4 text-slate-400">
                                    <div className="flex items-center gap-2">
                                        {f.label}
                                        {f.tooltip && <span title={f.tooltip} className="cursor-help"><Info className="w-3.5 h-3.5 text-amber-500/50 flex-shrink-0" /></span>}
                                    </div>
                                </td>
                                {YEARS.map(y => <td key={y} className="py-2 px-2 text-center">
                                    <input disabled={!isEditable} value={data[y]?.[f.key] || 0} onChange={(e) => handleChange(y, f.key, e.target.value)} className={`w-24 text-center bg-transparent border ${s.border} rounded py-1.5 px-3 ${getCellColor(data[y]?.[f.key])}`} type="number" />
                                </td>)}
                            </tr>
                        ))}

                        {/* Bloque C */}
                        <tr className="bg-slate-800/20"><td colSpan={7} className="py-2 px-4 font-black text-xs text-amber-500 uppercase tracking-widest mt-4">ENFERMEDAD LABORAL</td></tr>
                        {[
                            { key: "el_casos_nuevos", label: "No. de casos Nuevos de EL" },
                            { key: "el_casos_antiguos", label: "No. de casos antiguos de EL", tooltip: "Pendiente de implementación — ingresar manualmente" },
                            { key: "el_mortales", label: "No. E.L. Fatales" },
                            { key: "el_con_invalidez", label: "No. E.L. con Invalidez", tooltip: "Pendiente de implementación — ingresar manualmente" },
                            { key: "el_con_ipp", label: "No. E.L. con incapacidad permanente parcial (IPP)", tooltip: "Pendiente de implementación — ingresar manualmente" },
                            { key: "el_con_tiempo_perdido", label: "No. de E.L. con tiempo perdido" },
                            { key: "el_sin_tiempo_perdido", label: "No. de E.L. sin tiempo perdido" },
                            { key: "dias_incapacidad_el", label: "Número de días de incapacidad generados por E.L reportados en el periodo" }
                        ].map(f => (
                            <tr key={f.key}>
                                <td className="py-2 px-4 text-slate-400">
                                    <div className="flex items-center gap-2">
                                        {f.label}
                                        {f.tooltip && <span title={f.tooltip} className="cursor-help"><Info className="w-3.5 h-3.5 text-amber-500/50 flex-shrink-0" /></span>}
                                    </div>
                                </td>
                                {YEARS.map(y => <td key={y} className="py-2 px-2 text-center">
                                    <input disabled={!isEditable} value={data[y]?.[f.key] || 0} onChange={(e) => handleChange(y, f.key, e.target.value)} className={`w-24 text-center bg-transparent border ${s.border} rounded py-1.5 px-3 ${getCellColor(data[y]?.[f.key])}`} type="number" />
                                </td>)}
                            </tr>
                        ))}

                        {/* Bloque D */}
                        <tr className="bg-slate-800/20"><td colSpan={7} className="py-2 px-4 font-black text-xs text-amber-500 uppercase tracking-widest mt-4">AUSENTISMO POR CAUSA MEDICA</td></tr>
                        {[
                            { key: "dias_ausencia_incapacidad_laboral", label: "Total de días de ausencia por incapacidad laboral" },
                            { key: "dias_ausencia_incapacidad_comun", label: "Total de días de ausencia por incapacidad común" }
                        ].map(f => (
                            <tr key={f.key}>
                                <td className="py-3 px-4 text-slate-400 font-bold">{f.label}</td>
                                {YEARS.map(y => <td key={y} className="py-2 px-2 text-center">
                                    <input disabled={!isEditable} value={data[y]?.[f.key] || 0} onChange={(e) => handleChange(y, f.key, e.target.value)} className={`w-24 text-center bg-transparent border ${s.border} rounded py-1.5 px-3 ${getCellColor(data[y]?.[f.key])}`} type="number" />
                                </td>)}
                            </tr>
                        ))}

                        {/* Otros Indicadores (legacy Bloque D) */}
                        <tr className="bg-slate-800/20"><td colSpan={7} className="py-2 px-4 font-black text-xs text-slate-500 uppercase tracking-widest mt-4 border-t border-[var(--border)]">OTROS INDICADORES</td></tr>
                        {[
                            { key: "if_at", label: "Índice de Frecuencia (IF) AT" },
                            { key: "is_at", label: "Índice de Severidad (IS) AT" }
                        ].map(f => (
                            <tr key={f.key}>
                                <td className="py-2 px-4 text-slate-400 font-bold">{f.label}</td>
                                {YEARS.map(y => {
                                    const val = data[y]?.[f.key] || 0;
                                    // Make calculated metric readonly if we just compute it for UI, 
                                    // but if it's diff, it will show up.
                                    return <td key={y} className="py-1 px-2 text-center text-slate-300 font-mono text-xs">
                                        <span className={getCellColor(val)}>{Number(val).toFixed(2)}</span>
                                    </td>;
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className={`flex-1 flex flex-col h-full overflow-hidden ${s.bg}`}>
            <DashboardHeader onRefresh={loadData} loading={isLoadingIncidents || isLoadingHistorical}>
                <div>
                    <h1 className={`text-xl font-black uppercase tracking-tight flex items-center gap-2 ${s.textPrimary}`}>
                        <Award className={`w-6 h-6 ${isLight ? "text-amber-500" : "text-[#F59E0B]"}`} />
                        RUC / ATEL
                    </h1>
                    <p className={`text-sm font-bold uppercase tracking-wider mt-0.5 ${s.textSecondary}`}>
                        Gestión y Exportación CCS
                    </p>
                </div>
                <div className="flex items-center gap-3 ml-auto mr-4">
                    <button onClick={handleSave} disabled={saving} className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg border ${s.border} ${isLight ? "bg-white hover:bg-slate-50 text-slate-700" : "bg-[#1E2A3B] hover:bg-[#2A374A] text-white"} transition-colors shadow-sm cursor-pointer`}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar Avance
                    </button>
                    <button onClick={handleExport} className="flex items-center gap-2 bg-[#F59E0B] hover:bg-amber-400 text-black px-4 py-2 rounded-lg font-bold text-sm transition-colors cursor-pointer shadow-lg shadow-amber-500/20">
                        <Download className="w-4 h-4" /> Generar RUC.xlsx
                    </button>
                </div>
            </DashboardHeader>

            <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 space-y-6 overflow-y-auto">

                {/* TABS */}
                <div className="flex border-b border-[var(--border)] gap-8">
                    {WORKER_TYPES.map(vt => (
                        <button
                            key={vt.id}
                            onClick={() => setActiveTab(vt.id)}
                            className={`pb-4 cursor-pointer text-sm font-bold border-b-2 transition-colors ${activeTab === vt.id
                                ? "border-[#F59E0B] text-[#F59E0B]"
                                : `border-transparent ${s.textSecondary} hover:${s.textPrimary}`
                                }`}
                        >
                            {vt.label.toUpperCase()}
                        </button>
                    ))}
                </div>

                {/* MATRIX SECTIONS */}
                <div key={activeTab} className="space-y-12 pb-12" style={{ animation: "tabFadeIn 0.3s ease-out forwards" }}>
                    <style>{`
                        @keyframes tabFadeIn {
                            from { opacity: 0; transform: translateY(10px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                    `}</style>
                    {renderMatrix("Sección 1: ATEL 5 Años", section1[activeTab], false)}

                    {renderMatrix(
                        "Sección 2: Último Informe RUC (Editable)",
                        section2[activeTab],
                        true,
                        false,
                        (year, field, val) => {
                            setSection2(prev => ({
                                ...prev,
                                [activeTab]: {
                                    ...prev[activeTab],
                                    [year]: { ...prev[activeTab][year], [field]: val }
                                }
                            }));
                        }
                    )}

                    {activeTab === "directo" && renderMatrix(
                        "Sección 3: Datos Certificado ARL (Solo Directos)",
                        section3,
                        true,
                        false,
                        (year, field, val) => {
                            setSection3(prev => ({
                                ...prev,
                                [year]: { ...prev[year], [field]: val }
                            }));
                        }
                    )}

                    {renderMatrix("Sección 4: Diferencia (S1 - S2)", section4[activeTab], false, true)}
                </div>

            </div>
        </div>
    );
}
