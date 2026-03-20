/**
 * components/module2/LocationSelector.tsx
 * Cascading selector: Departamento → Municipio for Colombia.
 */
"use client";

import { useEffect } from "react";
import { MapPin } from "lucide-react";
import { COLOMBIA_DEPARTMENTS, DEPARTMENT_NAMES, getDayOfWeek } from "@/lib/constants/colombia";

type LocationSelectorProps = {
    department: string;
    city: string;
    address: string;
    eventDate: string;
    onDepartmentChange: (v: string) => void;
    onCityChange: (v: string) => void;
    onAddressChange: (v: string) => void;
};

export function LocationSelector({
    department,
    city,
    address,
    eventDate,
    onDepartmentChange,
    onCityChange,
    onAddressChange,
}: LocationSelectorProps) {
    const cities = department ? (COLOMBIA_DEPARTMENTS[department] ?? []) : [];

    // Reset city when department changes
    useEffect(() => {
        if (department && cities.length > 0 && !cities.includes(city)) {
            onCityChange(cities[0]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [department]);

    const dayOfWeek = eventDate ? getDayOfWeek(eventDate) : null;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-[#F59E0B]" />
                <span className="text-[var(--text-primary)] font-bold text-sm uppercase tracking-wider">Lugar del evento</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {/* Departamento */}
                <div>
                    <label className="text-[var(--text-secondary)] text-xs uppercase tracking-wider font-bold mb-1 block">
                        Departamento *
                    </label>
                    <select
                        value={department}
                        onChange={(e) => onDepartmentChange(e.target.value)}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-3 py-3 text-[var(--text-primary)] text-sm outline-none focus:border-[#F59E0B] transition-colors cursor-pointer"
                    >
                        <option value="">Seleccionar...</option>
                        {DEPARTMENT_NAMES.map((d) => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                </div>

                {/* Municipio */}
                <div>
                    <label className="text-[var(--text-secondary)] text-xs uppercase tracking-wider font-bold mb-1 block">
                        Municipio *
                    </label>
                    <select
                        value={city}
                        onChange={(e) => onCityChange(e.target.value)}
                        disabled={!department}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-3 py-3 text-[var(--text-primary)] text-sm outline-none focus:border-[#F59E0B] transition-colors disabled:opacity-40 cursor-pointer"
                    >
                        <option value="">Seleccionar...</option>
                        {cities.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>

                {/* Dirección */}
                <div className="col-span-2">
                    <label className="text-[var(--text-secondary)] text-xs uppercase tracking-wider font-bold mb-1 block">
                        Dirección / Lugar exacto *
                    </label>
                    <input
                        type="text"
                        value={address}
                        onChange={(e) => onAddressChange(e.target.value)}
                        placeholder="Ej: Carrera 7 # 45-20, Bodega 3, Zona de carga"
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-3 py-3 text-[var(--text-primary)] text-sm outline-none focus:border-[#F59E0B] transition-colors placeholder:text-[var(--text-secondary)]"
                    />
                </div>

                {/* Day of week indicator (auto-calculated) */}
                {dayOfWeek && (
                    <div className="col-span-2 flex items-center gap-2">
                        <span className="text-[var(--text-secondary)] text-xs">Día calculado:</span>
                        <span className="inline-flex items-center px-3 py-1 bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B] text-xs font-bold rounded-full dark:bg-[#F59E0B]/10 dark:border-[#F59E0B]/20">
                            {dayOfWeek}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
