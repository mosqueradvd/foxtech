/**
 * components/module2/WorkerSelector.tsx
 * Búsqueda de trabajador por nombre/cédula con creación inline si no existe.
 */
"use client";

import { useState, useEffect, useRef } from "react";
import { Search, UserPlus, User, Loader2, Check } from "lucide-react";
import { supabase, type Worker } from "@/lib/supabase";
import { EPS_LIST, ARL_LIST, SEX_OPTIONS, EMPLOYMENT_TYPES, EDUCATION_LEVELS } from "@/lib/constants/colombia";

type WorkerSelectorProps = {
    companyId?: string;
    onSelect: (worker: Worker | null) => void;
    selectedWorker: Worker | null;
};

export function WorkerSelector({ companyId, onSelect, selectedWorker }: WorkerSelectorProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Worker[]>([]);
    const [searching, setSearching] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [saving, setSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const [newWorker, setNewWorker] = useState<Partial<Worker>>({
        company_id: companyId,
        sex: "M",
        employment_type: "Indefinido",
    });

    // Search workers by name or cedula
    useEffect(() => {
        if (!query || query.length < 2) { setResults([]); return; }
        const t = setTimeout(async () => {
            setSearching(true);
            const { data } = await supabase
                .from("workers")
                .select("*")
                .or(`full_name.ilike.%${query}%,cedula.ilike.%${query}%`)
                .limit(8);
            setResults(data ?? []);
            setSearching(false);
        }, 300);
        return () => clearTimeout(t);
    }, [query]);

    async function createWorker() {
        if (!newWorker.full_name?.trim()) return;
        setSaving(true);
        const { data, error } = await supabase
            .from("workers")
            .insert({ ...newWorker, company_id: companyId ?? newWorker.company_id })
            .select()
            .single();
        setSaving(false);
        if (!error && data) {
            onSelect(data as Worker);
            setShowCreate(false);
            setQuery(data.full_name);
        }
    }

    if (selectedWorker) {
        return (
            <div className="flex items-center gap-4 bg-[#1e3a29] border border-green-600/30 rounded-xl p-4">
                <div className="w-10 h-10 rounded-full bg-green-700 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-white font-bold">{selectedWorker.full_name}</p>
                    <p className="text-green-400 text-xs">CC {selectedWorker.cedula ?? "—"} • {selectedWorker.job_title ?? "Sin cargo"}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    <button
                        onClick={() => { onSelect(null); setQuery(""); }}
                        className="text-xs text-white/50 hover:text-white transition-colors cursor-pointer"
                    >
                        Cambiar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Search input */}
            <div className="relative">
                {searching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F59E0B] animate-spin" />}
                <input
                    id="worker-search"
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar por nombre o cédula..."
                    className="w-full bg-[#1A1F2E] border border-[#334155] rounded-xl pl-11 pr-10 py-3 text-white placeholder:text-[#64748B] outline-none focus:border-[#F59E0B] transition-colors text-sm"
                />
            </div>

            {/* Results dropdown */}
            {results.length > 0 && (
                <div className="bg-[#1A1F2E] border border-[#334155] rounded-xl overflow-hidden divide-y divide-[#334155]">
                    {results.map((w) => (
                        <button
                            key={w.id}
                            onClick={() => { onSelect(w); setQuery(w.full_name); setResults([]); }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left cursor-pointer"
                        >
                            <div className="w-8 h-8 rounded-full bg-[#252B3B] flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 text-[#64748B]" />
                            </div>
                            <div>
                                <p className="text-white text-sm font-semibold">{w.full_name}</p>
                                <p className="text-[#64748B] text-xs">CC {w.cedula ?? "—"} • {w.job_title ?? "Sin cargo"}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Create new worker CTA */}
            {query.length >= 2 && results.length === 0 && !searching && (
                <div className="text-center py-3 text-[#64748B] text-sm">
                    No encontrado.{" "}
                    <button onClick={() => setShowCreate(true)} className="text-[#F59E0B] font-semibold hover:underline">
                        Registrar nuevo trabajador
                    </button>
                </div>
            )}

            <button
                onClick={() => setShowCreate(!showCreate)}
                className="flex items-center gap-2 text-[#F59E0B] text-sm font-semibold hover:underline transition-colors cursor-pointer"
            >
                <UserPlus className="w-4 h-4" />
                Registrar trabajador nuevo
            </button>

            {/* Create form */}
            {showCreate && (
                <div className="bg-[#1A1F2E] border border-[#334155] rounded-xl p-5 space-y-4">
                    <h4 className="text-white font-bold text-sm uppercase tracking-wider">Nuevo Trabajador</h4>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className="text-[#64748B] text-xs uppercase tracking-wider font-bold mb-1 block">Nombre completo *</label>
                            <input
                                type="text"
                                placeholder="Nombres y apellidos"
                                value={newWorker.full_name ?? ""}
                                onChange={(e) => setNewWorker((p) => ({ ...p, full_name: e.target.value }))}
                                className="w-full bg-[#252B3B] border border-[#334155] rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-[#F59E0B]"
                            />
                        </div>

                        <div>
                            <label className="text-[#64748B] text-xs uppercase tracking-wider font-bold mb-1 block">Cédula</label>
                            <input
                                type="text"
                                placeholder="N.° documento"
                                value={newWorker.cedula ?? ""}
                                onChange={(e) => setNewWorker((p) => ({ ...p, cedula: e.target.value }))}
                                className="w-full bg-[#252B3B] border border-[#334155] rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-[#F59E0B]"
                            />
                        </div>

                        <div>
                            <label className="text-[#64748B] text-xs uppercase tracking-wider font-bold mb-1 block">Fecha nacimiento</label>
                            <input
                                type="date"
                                value={newWorker.birth_date ?? ""}
                                onChange={(e) => setNewWorker((p) => ({ ...p, birth_date: e.target.value }))}
                                className="w-full bg-[#252B3B] border border-[#334155] rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-[#F59E0B] cursor-pointer"
                            />
                        </div>

                        <div>
                            <label className="text-[#64748B] text-xs uppercase tracking-wider font-bold mb-1 block">Sexo</label>
                            <select
                                value={newWorker.sex ?? "M"}
                                onChange={(e) => setNewWorker((p) => ({ ...p, sex: e.target.value as "M" | "F" | "Otro" }))}
                                className="w-full bg-[#252B3B] border border-[#334155] rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-[#F59E0B] cursor-pointer"
                            >
                                {SEX_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="text-[#64748B] text-xs uppercase tracking-wider font-bold mb-1 block">Cargo</label>
                            <input
                                type="text"
                                placeholder="Ej: Operador de montacargas"
                                value={newWorker.job_title ?? ""}
                                onChange={(e) => setNewWorker((p) => ({ ...p, job_title: e.target.value }))}
                                className="w-full bg-[#252B3B] border border-[#334155] rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-[#F59E0B]"
                            />
                        </div>

                        <div>
                            <label className="text-[#64748B] text-xs uppercase tracking-wider font-bold mb-1 block">EPS</label>
                            <select
                                value={newWorker.eps ?? ""}
                                onChange={(e) => setNewWorker((p) => ({ ...p, eps: e.target.value }))}
                                className="w-full bg-[#252B3B] border border-[#334155] rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-[#F59E0B] cursor-pointer"
                            >
                                <option value="">Seleccionar EPS</option>
                                {EPS_LIST.map((eps) => <option key={eps} value={eps}>{eps}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="text-[#64748B] text-xs uppercase tracking-wider font-bold mb-1 block">Tipo de contrato</label>
                            <select
                                value={newWorker.employment_type ?? "Indefinido"}
                                onChange={(e) => setNewWorker((p) => ({ ...p, employment_type: e.target.value }))}
                                className="w-full bg-[#252B3B] border border-[#334155] rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-[#F59E0B] cursor-pointer"
                            >
                                {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="text-[#64748B] text-xs uppercase tracking-wider font-bold mb-1 block">Nivel educativo</label>
                            <select
                                value={newWorker.education_level ?? ""}
                                onChange={(e) => setNewWorker((p) => ({ ...p, education_level: e.target.value }))}
                                className="w-full bg-[#252B3B] border border-[#334155] rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-[#F59E0B] cursor-pointer"
                            >
                                <option value="">Seleccionar</option>
                                {EDUCATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="text-[#64748B] text-xs uppercase tracking-wider font-bold mb-1 block">Fecha ingreso</label>
                            <input
                                type="date"
                                value={newWorker.hire_date ?? ""}
                                onChange={(e) => setNewWorker((p) => ({ ...p, hire_date: e.target.value }))}
                                className="w-full bg-[#252B3B] border border-[#334155] rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-[#F59E0B] cursor-pointer"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={createWorker}
                            disabled={saving || !newWorker.full_name?.trim()}
                            className="flex items-center gap-2 bg-[#F59E0B] text-black font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                            {saving ? "Guardando..." : "Registrar"}
                        </button>
                        <button
                            onClick={() => setShowCreate(false)}
                            className="text-[#64748B] text-sm font-semibold hover:text-white transition-colors px-4 py-2.5 cursor-pointer"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
