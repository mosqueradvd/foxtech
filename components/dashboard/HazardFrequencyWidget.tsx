/**
 * components/dashboard/HazardFrequencyWidget.tsx
 * Rediseño ULTRA-FIDELIDAD (Stitch) del widget de Peligros GTC-45.
 * Estructura de 3 filas: Héroe/Secundarios, Activos Menores, Sin Datos.
 */
"use client";

import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
    PhysicalIcon,
    ChemicalIcon,
    BiologicalIcon,
    ErgonomicIcon,
    PsychosocialIcon,
    SecurityIcon,
    ElectricIcon,
    LocativeIcon,
    MechanicIcon,
    HazardIconColor,
} from "@/components/icons";

// ── Types & Helpers ──────────────────────────────────────────────────────────
type IconComponent = React.FC<{ color?: HazardIconColor; size?: number; className?: string }>;

const HAZARD_ICONS: Record<string, IconComponent> = {
    "Físico": PhysicalIcon,
    "Químico": ChemicalIcon,
    "Biológico": BiologicalIcon,
    "Ergonómico": ErgonomicIcon,
    "Psicosocial": PsychosocialIcon,
    "Seguridad": SecurityIcon,
    "Eléctrico": ElectricIcon,
    "Locativo": LocativeIcon,
    "Mecánico": MechanicIcon,
};

function normalize(str: string) {
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getIcon(label: string): IconComponent {
    const keys = Object.keys(HAZARD_ICONS);
    const normLabel = normalize(label);
    const key = keys.find((k) => {
        const normK = normalize(k);
        return normK.includes(normLabel) || normLabel.includes(normK);
    });
    return key ? HAZARD_ICONS[key] : SecurityIcon;
}

interface HazardEntry {
    label: string;
    value: number;
}

interface HazardFrequencyWidgetProps {
    hazardData: HazardEntry[];
    loading?: boolean;
}

const ALL_GTC45_HAZARDS = [
    "Físico",
    "Químico",
    "Biológico",
    "Ergonómico",
    "Psicosocial",
    "Seguridad",
    "Eléctrico",
    "Locativo",
    "Mecánico"
];

// ── Main Component ───────────────────────────────────────────────────────────
export default function HazardFrequencyWidget({ hazardData, loading = false }: HazardFrequencyWidgetProps) {
    // 1. Map incoming data to full GTC-45 list to ensure all categories are handled
    const fullData = ALL_GTC45_HAZARDS.map(label => {
        const normLabel = normalize(label);
        const found = hazardData.find(h => {
            const normH = normalize(h.label);
            return normH.includes(normLabel) || normLabel.includes(normH);
        });
        return { label, value: found ? found.value : 0 };
    });

    // 2. Sort: active first (by value desc, then label), then inactive (alphabetical)
    const active = fullData
        .filter(h => h.value > 0)
        .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));

    const inactive = fullData
        .filter(h => h.value === 0)
        .sort((a, b) => a.label.localeCompare(b.label));

    // 3. Distribute into buckets
    const hero = active[0] || inactive[0]; // Fallback to an inactive if absolutely no data
    const secondary = active.slice(1, 3);
    const minorActive = active.slice(3);

    if (loading) return <Skeleton />;

    return (
        <div className="flex flex-col gap-5 w-full bg-[#1A1F2E] p-6 rounded-2xl border border-white/5">
            {/* ── ROW 1: Hero (60%) & Secondary (40%) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-5">
                {hero ? (
                    <HeroCard item={hero} />
                ) : (
                    <div className="bg-[#1A1F2E] border border-white/5 rounded-2xl p-12 flex items-center justify-center text-[#475569] italic">
                        Sin datos críticos detectados
                    </div>
                )}

                <div className="flex flex-col gap-5">
                    {secondary.map((item) => (
                        <SecondaryCard key={item.label} item={item} maxVal={hero?.value || 1} />
                    ))}
                    {/* Fill space if less than 2 secondary */}
                    {secondary.length < 2 && Array.from({ length: 2 - secondary.length }).map((_, i) => (
                        <div key={i} className="flex-1 bg-[#1A1F2E]/30 border border-white/5 border-dashed rounded-2xl" />
                    ))}
                </div>
            </div>

            {/* ── ROW 2: Minor Active Hazards (3-col Grid) ── */}
            {minorActive.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {minorActive.map((item) => (
                        <MinorActiveCard key={item.label} item={item} maxVal={hero?.value || 1} />
                    ))}
                </div>
            )}

            {/* ── ROW 3: No Data Hazards (2-col Grid) ── */}
            {inactive.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {inactive.map((item) => (
                        <NoDataCard key={item.label} item={item} />
                    ))}
                </div>
            )}

            {/* ── FOOTER ── */}
            <div className="flex flex-wrap items-center justify-between border-t border-white/5 pt-4 mt-2">
                <span className="text-[10px] font-bold text-[#475569] tracking-[0.2em] uppercase">
                    Clasificación según GTC-45 V2012
                </span>
                <div className="flex items-center gap-6">
                    <LegendItem color="#EF4444" label="NIVEL I" />
                    <LegendItem color="#F59E0B" label="NIVEL II" />
                    <LegendItem color="#10B981" label="NIVEL III/IV" />
                </div>
            </div>
        </div>
    );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function HeroCard({ item }: { item: HazardEntry }) {
    const Icon = getIcon(item.label);
    return (
        <div className="relative group overflow-hidden rounded-2xl border border-red-500/20 bg-[#1A1F2E] p-8 min-h-[400px] flex flex-col justify-between shadow-[0_0_50px_-12px_rgba(239,68,68,0.3)] hover:shadow-[0_0_60px_-12px_rgba(239,68,68,0.45)] hover:border-red-500/40 transition-all duration-500">
            {/* Radial Gradient Background */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,_#7F1D1D44_0%,_#1A1F2E_70%)] opacity-80 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8">
                    <span className="bg-[#EF4444] text-white text-[10px] font-black px-2 py-1 rounded-[4px] tracking-wider">
                        MÁS FRECUENTE
                    </span>
                    <span className="text-[#EF4444] text-[10px] font-bold tracking-[0.2em] uppercase">
                        Nivel de Riesgo: Crítico
                    </span>
                </div>

                <div className="flex items-start justify-between">
                    <div className="max-w-[60%]">
                        <h2 className="text-white text-[32px] font-black leading-none uppercase mb-4 tracking-tight">
                            {item.label}
                        </h2>
                        <p className="text-[#94A3B8] text-[13px] leading-relaxed font-medium">
                            Identificado como el factor de riesgo predominante en las operaciones actuales.
                            Requiere intervención inmediata.
                        </p>
                    </div>
                    <div className="flex-none -mt-4 opacity-80">
                        <Icon color="red" size={100} />
                    </div>
                </div>
            </div>

            <div className="relative z-10 flex items-end justify-between mt-auto">
                <div className="flex flex-col">
                    <span className="text-[#64748B] text-[11px] font-bold tracking-[0.15em] uppercase mb-1">Incidencias</span>
                    <span className="text-[#EF4444] text-7xl font-black leading-none">{item.value.toString().padStart(2, '0')}</span>
                </div>

                <div className="flex flex-col items-end gap-1">
                    <span className="text-[#64748B] text-[11px] font-bold tracking-[0.15em] uppercase">Tendencia</span>
                    <div className="flex items-center gap-1.5 text-[#EF4444] bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                        <TrendingUp size={16} strokeWidth={3} />
                        <span className="text-sm font-black">+12%</span>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-4 left-0 right-0 flex justify-center opacity-30">
                <span className="text-[8px] font-bold tracking-[0.3em] text-[#94A3B8] uppercase">
                    Requiere Intervención Inmediata
                </span>
            </div>
        </div>
    );
}

function SecondaryCard({ item, maxVal }: { item: HazardEntry; maxVal: number }) {
    const Icon = getIcon(item.label);
    const progress = (item.value / maxVal) * 100;
    return (
        <div className="group relative bg-[#252B3B] border-white/5 border-l-[3px] border-l-[#F59E0B] rounded-xl p-5 hover:bg-[#2e364a] transition-all duration-300 h-full flex flex-col justify-between">
            <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-xl bg-[#1A1F2E] border border-white/5">
                    <Icon color="amber" size={36} />
                </div>
                <span className="text-[#F59E0B] text-4xl font-black leading-none">{item.value.toString().padStart(2, '0')}</span>
            </div>

            <div>
                <h3 className="text-white text-sm font-black uppercase tracking-wider mb-3 mt-4">
                    {item.label}
                </h3>
                <div className="relative h-[3px] w-full bg-[#1A1F2E] rounded-full overflow-hidden">
                    <div
                        className="absolute top-0 left-0 h-full bg-[#F59E0B] rounded-full transition-all duration-1000"
                        style={{ width: `${Math.max(progress, 5)}%` }}
                    />
                </div>
                <p className="text-[#475569] text-[9px] font-bold uppercase tracking-widest mt-2">
                    {Math.round(progress)}% Impacto Relativo
                </p>
            </div>
        </div>
    );
}

function MinorActiveCard({ item, maxVal }: { item: HazardEntry; maxVal: number }) {
    const Icon = getIcon(item.label);
    const progress = (item.value / maxVal) * 100;
    return (
        <div className="bg-[#252B3B] border border-white/5 border-l-[3px] border-l-[#F59E0B] rounded-xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-lg bg-[#1A1F2E]">
                    <Icon color="amber" size={28} />
                </div>
                <div className="text-right">
                    <p className="text-white text-[10px] font-black uppercase tracking-wider leading-none mb-1">{item.label}</p>
                    <span className="text-[#F59E0B] text-2xl font-black leading-none">{item.value.toString().padStart(2, '0')}</span>
                </div>
            </div>
            <div>
                <div className="h-[2px] w-full bg-[#161B28] rounded-full overflow-hidden">
                    <div
                        className="h-full bg-[#F59E0B] rounded-full"
                        style={{ width: `${Math.max(progress, 5)}%` }}
                    />
                </div>
                <p className="text-[#475569] text-[8px] font-bold uppercase tracking-widest mt-1.5 text-right">
                    {Math.round(progress)}% Impacto
                </p>
            </div>
        </div>
    );
}

function NoDataCard({ item }: { item: HazardEntry }) {
    const Icon = getIcon(item.label);
    return (
        <div className="bg-[#252B3B]/60 border border-white/10 rounded-xl px-5 py-4 flex items-center justify-between transition-opacity hover:opacity-100">
            <div className="flex items-center gap-4">
                <Icon color="muted" size={24} />
                <span className="text-[#64748B] text-[10px] font-bold uppercase tracking-[0.15em]">{item.label}</span>
            </div>
            <span className="text-[#475569] text-[9px] font-black uppercase bg-[#1A1F2E]/80 px-2 py-1 rounded tracking-widest border border-white/5">
                No Data
            </span>
        </div>
    );
}

function LegendItem({ color, label }: { color: string; label: string }) {
    return (
        <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[#64748B] text-[9px] font-bold tracking-widest uppercase">{label}</span>
        </div>
    );
}

function Skeleton() {
    return (
        <div className="w-full h-[600px] bg-[#1A1F2E] animate-pulse rounded-2xl border border-white/5" />
    );
}
