/**
 * components/module2/InjuryClassifier.tsx
 * FURAT Lesión classifier: naturaleza, parte del cuerpo, mecanismo, peligro GTC-45, días incapacidad.
 */
"use client";

import { Activity } from "lucide-react";
import {
    INJURY_NATURES,
    BODY_PARTS,
    ACCIDENT_MECHANISMS,
    HAZARD_TYPES_GTC45,
} from "@/lib/constants/colombia";

type InjuryData = {
    injury_nature: string;
    body_part: string;
    accident_mechanism: string;
    hazard_type: string;
    disability_days: number;
};

type InjuryClassifierProps = {
    data: Partial<InjuryData>;
    onChange: (field: keyof InjuryData, value: string | number) => void;
    showDisabilityDays?: boolean;
};

export function InjuryClassifier({ data, onChange, showDisabilityDays = true }: InjuryClassifierProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-[#F59E0B]" />
                <span className="text-white font-bold text-sm uppercase tracking-wider">Clasificación de la Lesión (FURAT)</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {/* Naturaleza de la lesión */}
                <div>
                    <label className="text-[#64748B] text-xs uppercase tracking-wider font-bold mb-1 block">
                        Naturaleza de la Lesión *
                    </label>
                    <select
                        value={data.injury_nature ?? ""}
                        onChange={(e) => onChange("injury_nature", e.target.value)}
                        className="w-full bg-[#252B3B] border border-[#334155] rounded-xl px-3 py-3 text-white text-sm outline-none focus:border-[#F59E0B] transition-colors"
                    >
                        <option value="">Seleccionar...</option>
                        {INJURY_NATURES.map((n) => (
                            <option key={n} value={n}>{n}</option>
                        ))}
                    </select>
                </div>

                {/* Parte del cuerpo */}
                <div>
                    <label className="text-[#64748B] text-xs uppercase tracking-wider font-bold mb-1 block">
                        Parte del Cuerpo Afectada *
                    </label>
                    <select
                        value={data.body_part ?? ""}
                        onChange={(e) => onChange("body_part", e.target.value)}
                        className="w-full bg-[#252B3B] border border-[#334155] rounded-xl px-3 py-3 text-white text-sm outline-none focus:border-[#F59E0B] transition-colors"
                    >
                        <option value="">Seleccionar...</option>
                        {BODY_PARTS.map((p) => (
                            <option key={p} value={p}>{p}</option>
                        ))}
                    </select>
                </div>

                {/* Mecanismo del accidente */}
                <div>
                    <label className="text-[#64748B] text-xs uppercase tracking-wider font-bold mb-1 block">
                        Mecanismo del Accidente *
                    </label>
                    <select
                        value={data.accident_mechanism ?? ""}
                        onChange={(e) => onChange("accident_mechanism", e.target.value)}
                        className="w-full bg-[#252B3B] border border-[#334155] rounded-xl px-3 py-3 text-white text-sm outline-none focus:border-[#F59E0B] transition-colors"
                    >
                        <option value="">Seleccionar...</option>
                        {ACCIDENT_MECHANISMS.map((m) => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>

                {/* Peligro GTC-45 */}
                <div>
                    <label className="text-[#64748B] text-xs uppercase tracking-wider font-bold mb-1 block">
                        Agente / Peligro (GTC-45) *
                    </label>
                    <select
                        value={data.hazard_type ?? ""}
                        onChange={(e) => onChange("hazard_type", e.target.value)}
                        className="w-full bg-[#252B3B] border border-[#334155] rounded-xl px-3 py-3 text-white text-sm outline-none focus:border-[#F59E0B] transition-colors"
                    >
                        <option value="">Seleccionar...</option>
                        {HAZARD_TYPES_GTC45.map((h) => (
                            <option key={h.category} value={h.category}>
                                {h.category}
                            </option>
                        ))}
                    </select>
                    {data.hazard_type && (
                        <p className="text-[#64748B] text-[11px] mt-1 leading-relaxed">
                            {HAZARD_TYPES_GTC45.find((h) => h.category === data.hazard_type)?.examples}
                        </p>
                    )}
                </div>

                {/* Días de incapacidad */}
                {showDisabilityDays && (
                    <div className="col-span-2">
                        <label className="text-[#64748B] text-xs uppercase tracking-wider font-bold mb-1 block">
                            Días de Incapacidad Médica
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                min="0"
                                max="999"
                                value={data.disability_days ?? ""}
                                onChange={(e) => onChange("disability_days", parseInt(e.target.value) || 0)}
                                placeholder="0"
                                className="w-32 bg-[#252B3B] border border-[#334155] rounded-xl px-3 py-3 text-white text-sm outline-none focus:border-[#F59E0B] transition-colors text-center font-bold"
                            />
                            <span className="text-[#64748B] text-sm">días</span>
                            {(data.disability_days ?? 0) === 0 && (
                                <span className="text-green-400 text-xs bg-green-900/30 border border-green-700/30 px-3 py-1 rounded-full">
                                    Sin incapacidad
                                </span>
                            )}
                            {(data.disability_days ?? 0) > 0 && (data.disability_days ?? 0) <= 2 && (
                                <span className="text-amber-400 text-xs bg-amber-900/30 border border-amber-700/30 px-3 py-1 rounded-full">
                                    Leve
                                </span>
                            )}
                            {(data.disability_days ?? 0) > 2 && (
                                <span className="text-red-400 text-xs bg-red-900/30 border border-red-700/30 px-3 py-1 rounded-full font-semibold">
                                    {(data.disability_days ?? 0) > 29 ? "⚠️ Grave — notificar Ministerio" : "Moderado"}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
