/**
 * components/forms/PhotoCapture.tsx
 * Camera capture with GPS EXIF embedding.
 * Uses browser MediaDevices API (no file picker as primary option).
 * GPS + timestamp are embedded before the photo is saved to Dexie.
 * Must be 'use client' — uses browser APIs exclusively.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, MapPin, Clock, CheckCircle2, AlertTriangle, Zap } from "lucide-react";
import { embedGPSExif, getCurrentPosition, formatGPSDisplay, type GPSCoords } from "@/lib/exif";

interface PhotoCaptureProps {
    /** Called when photo + GPS data are ready */
    onCapture: (data: {
        photoBase64: string;
        lat?: number;
        lng?: number;
        timestamp: string;
    }) => void;
    /** Already captured photo (for display after capture) */
    capturedPhoto?: string;
}

export function PhotoCapture({ onCapture, capturedPhoto }: PhotoCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [gps, setGps] = useState<GeolocationCoordinates | null>(null);
    const [gpsStatus, setGpsStatus] = useState<"loading" | "verified" | "denied">("loading");
    const [cameraReady, setCameraReady] = useState(false);
    const [captured, setCaptured] = useState<string | null>(capturedPhoto ?? null);
    const [timestamp, setTimestamp] = useState<Date>(new Date());

    // ── Request GPS immediately on mount ──────────────────────────────
    useEffect(() => {
        let cancelled = false;
        getCurrentPosition().then((pos) => {
            if (cancelled) return;
            if (pos) {
                setGps(pos.coords);
                setGpsStatus("verified");
            } else {
                setGpsStatus("denied");
            }
        });
        return () => { cancelled = true; };
    }, []);

    // ── Start camera stream ──────────────────────────────────────────
    useEffect(() => {
        if (captured) return; // don't open camera if we already have a photo

        let active = true;
        navigator.mediaDevices
            ?.getUserMedia({
                video: {
                    facingMode: "environment",
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
                audio: false,
            })
            .then((stream) => {
                if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                    setCameraReady(true);
                }
            })
            .catch((err) => {
                console.warn("[FOXTECH] Camera access failed:", err);
            });

        return () => {
            active = false;
            streamRef.current?.getTracks().forEach((t) => t.stop());
        };
    }, [captured]);

    // ── Capture frame from video ─────────────────────────────────────
    const capturePhoto = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Get base64 JPEG
        let base64 = canvas.toDataURL("image/jpeg", 0.85);

        const now = new Date();
        setTimestamp(now);

        // Embed GPS EXIF if available
        if (gps) {
            const coords: GPSCoords = {
                latitude: gps.latitude,
                longitude: gps.longitude,
                altitude: gps.altitude ?? 0,
                timestamp: now,
            };
            // Fire-and-forget — doesn't block UI
            base64 = await embedGPSExif(base64, coords);
        }

        // Stop camera stream to save battery
        streamRef.current?.getTracks().forEach((t) => t.stop());
        setCaptured(base64);

        onCapture({
            photoBase64: base64,
            lat: gps?.latitude,
            lng: gps?.longitude,
            timestamp: now.toISOString(),
        });
    }, [gps, onCapture]);

    const retake = useCallback(() => {
        setCaptured(null);
        setCameraReady(false);
        // Camera will restart via useEffect
    }, []);

    return (
        <div className="flex flex-col gap-4">
            {/* Camera viewfinder */}
            <div
                className="relative rounded-2xl overflow-hidden bg-[#0D1017] border border-[#334155] aspect-[4/3] cursor-pointer"
                onClick={captured ? undefined : capturePhoto}
            >
                {/* Corner brackets — design detail */}
                <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-white/60 z-10 rounded-tl" />
                <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-white/60 z-10 rounded-tr" />
                <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-white/60 z-10 rounded-bl" />
                <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-white/60 z-10 rounded-br" />

                {/* Flash icon */}
                <div className="absolute top-3 right-3 z-10">
                    <Zap className="w-5 h-5 text-white/60" />
                </div>

                {captured ? (
                    /* Show captured photo */
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={captured} alt="Foto capturada" className="w-full h-full object-cover" />
                ) : (
                    <>
                        {/* Live video preview */}
                        <video
                            ref={videoRef}
                            playsInline
                            muted
                            autoPlay
                            className="w-full h-full object-cover"
                        />
                        {/* Center capture button overlay */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                            {cameraReady ? (
                                /* Camera ready — show capture trigger */
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-16 h-16 rounded-full bg-[#F59E0B]/90 flex items-center justify-center shadow-xl">
                                        <Camera className="w-7 h-7 text-black" />
                                    </div>
                                </div>
                            ) : (
                                /* Camera loading or unavailable */
                                <div className="flex flex-col items-center gap-3 px-6 text-center">
                                    <div className="w-16 h-16 rounded-full bg-[#F59E0B]/20 flex items-center justify-center">
                                        <Camera className="w-7 h-7 text-[#F59E0B]" />
                                    </div>
                                    <p className="text-white font-bold text-lg">Toque para capturar foto</p>
                                    <p className="text-white/60 text-sm">Asegúrese de buena iluminación</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Hidden canvas for frame capture */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Retake button */}
            {captured && (
                <button
                    onClick={retake}
                    className="text-sm text-[#F59E0B] font-semibold underline underline-offset-2 text-center"
                >
                    Volver a tomar la foto
                </button>
            )}

            {/* GPS info row */}
            <div className="flex items-center gap-2 bg-[#252B3B] rounded-xl px-4 py-3 border border-[#334155]">
                <MapPin className="w-4 h-4 text-[#F59E0B] flex-shrink-0" />
                {gpsStatus === "verified" && gps ? (
                    <span className="text-sm text-white font-medium flex-1">
                        {formatGPSDisplay(gps.latitude, gps.longitude)}
                    </span>
                ) : gpsStatus === "loading" ? (
                    <span className="text-sm text-[#64748B] flex-1">Obteniendo ubicación...</span>
                ) : (
                    <span className="text-sm text-amber-400 flex-1">Ubicación no disponible</span>
                )}
                {gpsStatus === "verified" ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-green-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> VERIFICADO
                    </span>
                ) : gpsStatus === "denied" ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                ) : null}
            </div>

            {/* Timestamp row */}
            <div className="flex items-center gap-2 bg-[#252B3B] rounded-xl px-4 py-3 border border-[#334155]">
                <Clock className="w-4 h-4 text-[#F59E0B] flex-shrink-0" />
                <span className="text-sm text-white font-medium">
                    {timestamp.toLocaleDateString("es-CO", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                </span>
            </div>

            {/* Legal note */}
            <div className="flex gap-2 bg-blue-950/40 border border-blue-800/30 rounded-xl px-4 py-3">
                <span className="text-blue-400 text-base flex-shrink-0 mt-0.5">ℹ</span>
                <p className="text-blue-300 text-xs leading-relaxed">
                    Los metadatos GPS quedan embebidos en la foto para validez legal según normativa vigente.
                </p>
            </div>
        </div>
    );
}
