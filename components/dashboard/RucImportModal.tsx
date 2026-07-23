"use client";

import { useState } from "react";
import { Sparkles, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2, X, ArrowRight, RefreshCw } from "lucide-react";
import { WorkerTypeCategory } from "@/lib/supabase";

interface RucImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportData: (importedData: { s2: any; s3: any }) => void;
    isLight?: boolean;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 5, CURRENT_YEAR - 4, CURRENT_YEAR - 3, CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR];

export default function RucImportModal({ isOpen, onClose, onImportData, isLight = false }: RucImportModalProps) {
    const [step, setStep] = useState<"upload" | "analyzing" | "preview" | "error">("upload");
    const [file, setFile] = useState<File | null>(null);
    const [errorMsg, setErrorMsg] = useState<string>("");
    const [analysisResult, setAnalysisResult] = useState<{
        confidence: number;
        summary: string;
        fileName: string;
        data: any;
    } | null>(null);

    if (!isOpen) return null;

    const s = {
        overlay: "fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4",
        container: isLight
            ? "bg-white border-slate-200 text-slate-900 shadow-2xl"
            : "bg-[#141824] border-[#1E2A3B] text-white shadow-2xl shadow-black/80",
        border: isLight ? "border-slate-200" : "border-[#1E2A3B]",
        subText: isLight ? "text-slate-500" : "text-[#94A3B8]",
        cardBg: isLight ? "bg-slate-50 border-slate-200" : "bg-[#1E2A3B]/50 border-[#2A374A]",
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setErrorMsg("");
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
            setErrorMsg("");
        }
    };

    const handleAnalyze = async () => {
        if (!file) return;
        setStep("analyzing");
        setErrorMsg("");

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/ai/ruc-import", {
                method: "POST",
                body: formData,
            });

            const json = await res.json();

            if (!res.ok || json.error) {
                throw new Error(json.error || "Ocurrió un error al procesar el archivo Excel.");
            }

            setAnalysisResult({
                confidence: json.confidence || 90,
                summary: json.summary || "Procesamiento completado con éxito.",
                fileName: json.fileName || file.name,
                data: json.data || {},
            });
            setStep("preview");
        } catch (err: any) {
            console.error(err);
            setErrorMsg(err.message || "Error al conectar con el asistente de IA.");
            setStep("error");
        }
    };

    const handleConfirmImport = () => {
        if (!analysisResult?.data) return;

        const importedS2 = analysisResult.data.ultimo_informe || {};
        const importedS3 = analysisResult.data.certificado_arl?.directo || {};

        onImportData({ s2: importedS2, s3: importedS3 });
        handleReset();
        onClose();
    };

    const handleReset = () => {
        setStep("upload");
        setFile(null);
        setErrorMsg("");
        setAnalysisResult(null);
    };

    return (
        <div className={s.overlay}>
            <div className={`w-full max-w-3xl rounded-2xl border ${s.container} p-6 relative overflow-hidden flex flex-col max-h-[90vh]`}>

                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-700/40">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-[#F59E0B]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                                Importación Inteligente con IA
                                <span className="text-[10px] bg-amber-500/20 text-[#F59E0B] border border-amber-500/30 px-2 py-0.5 rounded-full font-bold uppercase">
                                    FOXTECH AI
                                </span>
                            </h2>
                            <p className={`text-xs font-medium ${s.subText}`}>
                                Sube el Excel del RUC / CCS de tu empresa para mapear e importar el historial automáticamente.
                            </p>
                        </div>
                    </div>
                    <button onClick={() => { handleReset(); onClose(); }} className="p-1 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Content depending on step */}
                <div className="flex-1 overflow-y-auto py-6">

                    {/* STEP 1: UPLOAD */}
                    {step === "upload" && (
                        <div className="space-y-6">
                            <div
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleDrop}
                                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${file
                                    ? "border-[#F59E0B] bg-amber-500/5"
                                    : `${s.border} hover:border-[#F59E0B]/50 hover:bg-slate-800/10`
                                    } flex flex-col items-center justify-center cursor-pointer`}
                                onClick={() => document.getElementById("ruc-file-input")?.click()}
                            >
                                <input
                                    id="ruc-file-input"
                                    type="file"
                                    accept=".xlsx, .xls, .xlsm, .csv"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                                {file ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-[#F59E0B] flex items-center justify-center border border-amber-500/30">
                                            <FileSpreadsheet className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <p className="text-base font-bold text-white">{file.name}</p>
                                            <p className={`text-xs ${s.subText}`}>{(file.size / 1024 / 1024).toFixed(2)} MB • Listo para analizar</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFile(null);
                                            }}
                                            className="text-xs text-amber-500 font-semibold hover:underline mt-1"
                                        >
                                            Cambiar archivo
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-14 h-14 rounded-2xl bg-slate-800/60 text-slate-400 flex items-center justify-center border border-slate-700">
                                            <Upload className="w-7 h-7" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">Haz clic o arrastra tu archivo Excel aquí</p>
                                            <p className={`text-xs ${s.subText} mt-1`}>
                                                Archivos soportados: .xlsx, .xls, .xlsm (Ej: Pestaña ATEL 5 AÑOS o reporte del CCS)
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className={`p-4 rounded-xl border ${s.cardBg} flex items-start gap-3`}>
                                <Sparkles className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
                                <div className="text-xs space-y-1">
                                    <p className="font-bold text-white">¿Cómo funciona la IA de FOXTECH?</p>
                                    <p className={s.subText}>
                                        Gemini identificará las columnas por año (ej: 2019-2024), las filas de accidentes/enfermedades y los desgloses por personal (Directos, Subcontratistas y Cliente) sin necesidad de que modifiques el formato de tu archivo.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: ANALYZING */}
                    {step === "analyzing" && (
                        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="relative">
                                <div className="w-20 h-20 rounded-full border-4 border-amber-500/20 border-t-[#F59E0B] animate-spin flex items-center justify-center" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Sparkles className="w-8 h-8 text-[#F59E0B] animate-pulse" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold text-white">Analizando estructura con Gemini IA...</h3>
                                <p className={`text-xs ${s.subText} max-w-md`}>
                                    Extrayendo matrices de datos, asociando filas de accidentalidad y cuadrando los periodos anuales.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: PREVIEW */}
                    {step === "preview" && analysisResult && (
                        <div className="space-y-5">
                            <div className="flex items-center justify-between p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0" />
                                    <div>
                                        <h4 className="text-sm font-bold text-green-400">Análisis Exitoso</h4>
                                        <p className="text-xs text-slate-300 mt-0.5">{analysisResult.summary}</p>
                                    </div>
                                </div>
                                <span className="bg-green-500/20 text-green-300 font-mono font-bold text-xs px-3 py-1 rounded-full border border-green-500/30">
                                    {analysisResult.confidence}% Confianza
                                </span>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Resumen de Datos Extraídos</h4>
                                <div className={`p-4 rounded-xl border ${s.cardBg} space-y-3`}>
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-700/50">
                                            <p className="text-[10px] text-slate-400 uppercase font-bold">Trabajadores Directos</p>
                                            <p className="text-lg font-black text-amber-500">
                                                {Object.keys(analysisResult.data?.ultimo_informe?.directo || {}).length || 6} años
                                            </p>
                                        </div>
                                        <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-700/50">
                                            <p className="text-[10px] text-slate-400 uppercase font-bold">Subcontratistas</p>
                                            <p className="text-lg font-black text-amber-500">
                                                {Object.keys(analysisResult.data?.ultimo_informe?.subcontratista || {}).length || 6} años
                                            </p>
                                        </div>
                                        <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-700/50">
                                            <p className="text-[10px] text-slate-400 uppercase font-bold">Cliente</p>
                                            <p className="text-lg font-black text-amber-500">
                                                {Object.keys(analysisResult.data?.ultimo_informe?.cliente || {}).length || 6} años
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-slate-400 text-center">
                                        Al hacer clic en <strong className="text-white">"Aplicar e Importar al RUC"</strong>, los valores extraídos poblarán inmediatamente las matrices de la Sección 2 ("Último Informe RUC") y Sección 3 ("Certificado ARL").
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: ERROR */}
                    {step === "error" && (
                        <div className="py-8 text-center space-y-4">
                            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
                                <AlertTriangle className="w-8 h-8" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-base font-bold text-white">No se pudo procesar el archivo</h3>
                                <p className="text-xs text-red-400 max-w-md mx-auto">{errorMsg}</p>
                            </div>
                            <button
                                onClick={handleReset}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-xs transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" /> Intentar de nuevo
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-slate-700/40 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => { handleReset(); onClose(); }}
                        className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800/50 text-slate-300 font-bold text-sm transition-colors"
                    >
                        Cancelar
                    </button>
                    {step === "upload" && (
                        <button
                            type="button"
                            disabled={!file}
                            onClick={handleAnalyze}
                            className="flex items-center gap-2 bg-[#F59E0B] hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-sm px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-amber-500/20"
                        >
                            <Sparkles className="w-4 h-4" /> Analizar con IA
                        </button>
                    )}
                    {step === "preview" && (
                        <button
                            type="button"
                            onClick={handleConfirmImport}
                            className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-bold text-sm px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-green-500/20"
                        >
                            <CheckCircle2 className="w-4 h-4" /> Aplicar e Importar al RUC
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}
