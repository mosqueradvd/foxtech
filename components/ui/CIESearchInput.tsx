"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Search, X, AlertCircle } from "lucide-react";

export type CIECodeItem = {
    code: string;
    description: string;
};

export type CIEVersion = "CIE-10" | "CIE-11";

interface CIESearchInputProps {
    value: CIECodeItem[];
    onChange: (items: CIECodeItem[]) => void;
    version: CIEVersion;
    onVersionChange: (v: CIEVersion) => void;
}

export function CIESearchInput({ value, onChange, version, onVersionChange }: CIESearchInputProps) {
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [results, setResults] = useState<CIECodeItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    // Debounce effect
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query), 400);
        return () => clearTimeout(timer);
    }, [query]);

    // Fetch from API
    useEffect(() => {
        const fetchResults = async () => {
            if (debouncedQuery.length < 3) {
                setResults([]);
                setShowDropdown(false);
                return;
            }

            setLoading(true);
            setError(false);

            try {
                const apiVersion = version === "CIE-10" ? "10" : "11";
                const res = await fetch(`/api/cie/search?q=${encodeURIComponent(debouncedQuery)}&version=${apiVersion}`);

                if (!res.ok) throw new Error("API Error");

                const data = await res.json();

                // Parse WHO API results
                let parsed: CIECodeItem[] = [];
                if (data.destinationEntities) {
                    parsed = data.destinationEntities.map((e: any) => ({
                        code: e.theCode || e.matchingPVs?.[0]?.label || "Sin código",
                        // WHO returns title usually as HTML string with <em> tags, strip tags
                        description: (e.title || "").replace(/<[^>]*>?/gm, "").trim()
                    }));
                } else if (Array.isArray(data)) {
                    parsed = data.map((e: any) => ({
                        code: e.code || e.id || "N/A",
                        description: (e.title || e.label || "").replace(/<[^>]*>?/gm, "").trim()
                    }));
                }

                // Filter out empty codes or descriptions and ensure uniqueness
                const uniqueResults = Array.from(new Map(parsed.filter((item) => item.code && item.description && item.code !== "Sin código" && item.code !== "N/A" && !item.code.startsWith("http")).map(item => [item.code, item])).values());

                setResults(uniqueResults.slice(0, 8)); // Max 8 results
                setShowDropdown(uniqueResults.length > 0);
            } catch (err) {
                console.error(err);
                setError(true);
                setResults([]);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [debouncedQuery, version]);

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (item: CIECodeItem) => {
        if (!value.find((v) => v.code === item.code)) {
            onChange([...value, item]);
        }
        setQuery("");
        setShowDropdown(false);
    };

    const handleRemove = (code: string) => {
        onChange(value.filter((v) => v.code !== code));
    };

    const handleManualAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && query.trim() && error) {
            e.preventDefault();
            const manualItem = {
                code: query.trim(),
                description: "Ingresado manualmente"
            };
            if (!value.find((v) => v.code === manualItem.code)) {
                onChange([...value, manualItem]);
            }
            setQuery("");
        }
    };

    return (
        <div className="w-full space-y-3" ref={containerRef}>
            {/* Toggle Version */}
            <div className="flex bg-[#0F1219] rounded-lg p-1 w-max border border-[#1E2A3B]">
                <button
                    type="button"
                    onClick={() => onVersionChange("CIE-11")}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${version === "CIE-11"
                            ? "bg-[#252B3B] text-white shadow-sm"
                            : "text-[#64748B] hover:text-white"
                        }`}
                >
                    CIE-11
                </button>
                <button
                    type="button"
                    onClick={() => onVersionChange("CIE-10")}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${version === "CIE-10"
                            ? "bg-[#252B3B] text-white shadow-sm"
                            : "text-[#64748B] hover:text-white"
                        }`}
                >
                    CIE-10
                </button>
            </div>

            {/* Input Container */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {loading ? (
                        <Loader2 className="w-4 h-4 text-[#F59E0B] animate-spin" />
                    ) : (
                        <Search className="w-4 h-4 text-[#64748B]" />
                    )}
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (error) setError(false); // Reset error if user types to try again
                    }}
                    onKeyDown={handleManualAdd}
                    placeholder="Buscar código o descripción CIE (ej: Fractura de radio)..."
                    className={`w-full bg-[#252B3B] border ${error ? "border-red-500" : "border-[#334155] focus:border-[#F59E0B]"
                        } rounded-xl !pl-[44px] pr-3 py-3 text-white text-sm outline-none transition-colors placeholder:text-[#475569]`}
                />

                {/* Dropdown */}
                {showDropdown && results.length > 0 && !error && (
                    <div className="absolute z-50 mt-1 w-full bg-[#1A1F2E] border border-[#334155] rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                        {results.map((res, i) => (
                            <div
                                key={i}
                                onClick={() => handleSelect(res)}
                                className="px-4 py-3 border-b border-[#334155]/50 last:border-0 hover:bg-[#252B3B] cursor-pointer transition-colors flex flex-col"
                            >
                                <span className="text-[#F59E0B] font-black text-xs">{res.code}</span>
                                <span className="text-white text-sm truncate">{res.description}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Error state */}
            {error && (
                <div className="flex items-center gap-2 text-red-400 text-xs mt-1 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
                    <AlertCircle className="w-4 h-4" />
                    Búsqueda no disponible — ingresa el código manualmente y presiona Enter.
                </div>
            )}



            {/* Selected Chips */}
            {value.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                    {value.map((item) => (
                        <div
                            key={item.code}
                            className="flex items-center gap-2 bg-[#252B3B] border border-[#334155] text-white px-3 py-1.5 rounded-lg text-xs"
                        >
                            <span className="font-bold text-[#F59E0B]">{item.code}</span>
                            <span className="max-w-[200px] truncate text-[#94A3B8]">{item.description}</span>
                            <button
                                type="button"
                                onClick={() => handleRemove(item.code)}
                                className="w-5 h-5 rounded-md hover:bg-white/10 flex items-center justify-center transition-colors text-[#64748B] hover:text-red-400"
                            >
                                <X className="w-3 h-3 cursor-pointer" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
