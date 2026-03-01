/**
 * components/forms/SignaturePad.tsx
 * Digital signature canvas using react-signature-canvas.
 * Shows dashed border, "Borrar" clear button, and validates non-empty.
 */
"use client";

import { useRef, useCallback } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Trash2 } from "lucide-react";

interface SignaturePadProps {
    /** Called with base64 PNG data URL when signature changes */
    onChange: (dataUrl: string | null) => void;
    error?: string;
}

export function SignaturePad({ onChange, error }: SignaturePadProps) {
    const sigRef = useRef<SignatureCanvas>(null);

    const handleEnd = useCallback(() => {
        if (sigRef.current && !sigRef.current.isEmpty()) {
            onChange(sigRef.current.getTrimmedCanvas().toDataURL("image/png"));
        }
    }, [onChange]);

    const handleClear = useCallback(() => {
        sigRef.current?.clear();
        onChange(null);
    }, [onChange]);

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-white/90">Firma Digital</label>
                <button
                    type="button"
                    onClick={handleClear}
                    className="flex items-center gap-1.5 text-sm font-bold text-[#F59E0B] hover:text-amber-300 transition-colors"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                    Borrar
                </button>
            </div>

            {/* Canvas wrapper with dashed border to match Stitch design */}
            <div
                className={[
                    "rounded-xl overflow-hidden border-2 border-dashed",
                    error ? "border-red-500" : "border-[#334155]",
                ].join(" ")}
                style={{ background: "#1e2535" }}
            >
                <SignatureCanvas
                    ref={sigRef}
                    penColor="#F59E0B"
                    onEnd={handleEnd}
                    canvasProps={{
                        className: "w-full",
                        style: { height: 160, display: "block" },
                    }}
                    backgroundColor="transparent"
                />
                {/* Placeholder text (hidden once signed) */}
                <style>{`
          .sig-placeholder { pointer-events: none; }
        `}</style>
            </div>

            {/* Hint text */}
            <p className="text-center text-[#64748B] text-xs mt-1 select-none">
                ✦ Firme aquí con el dedo
            </p>

            {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
        </div>
    );
}
