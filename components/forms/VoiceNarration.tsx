/**
 * components/forms/VoiceNarration.tsx
 * Mobile-optimized voice recording with Web Speech API transcription.
 * Records audio (MediaRecorder) → stores blob → optionally transcribes live.
 *
 * API compatibility:
 *  - MediaRecorder: Chrome/Firefox/Safari 14.5+
 *  - SpeechRecognition: Chrome/Android. Falls back gracefully on Safari/Firefox.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Square, RotateCcw, CheckCircle2 } from "lucide-react";

export interface VoiceNarrationValue {
    text: string;
    audioBlob?: string; // base64 encoded
}

interface Props {
    label: string;
    placeholder?: string;
    value: VoiceNarrationValue;
    onChange: (v: VoiceNarrationValue) => void;
    disabled?: boolean;
}

type RecordState = "idle" | "recording" | "done";

// Web Speech API types (not yet in TS lib)
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}
interface SpeechRecognitionErrorEvent extends Event {
    error: string;
}
declare global {
    interface Window {
        SpeechRecognition?: new () => SpeechRecognitionInstance;
        webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    }
}
interface SpeechRecognitionInstance extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    start(): void;
    stop(): void;
    onresult: ((e: SpeechRecognitionEvent) => void) | null;
    onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
}

function getSpeechRecognition(): SpeechRecognitionInstance | null {
    if (typeof window === "undefined") return null;
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) return null;
    return new Ctor();
}

export function VoiceNarration({ label, placeholder, value, onChange, disabled }: Props) {
    const [recordState, setRecordState] = useState<RecordState>("idle");
    const [elapsed, setElapsed] = useState(0);
    const [speechAvail, setSpeechAvail] = useState(false);
    const [transcribing, setTranscribing] = useState(false);

    const mediaRecRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const speechRef = useRef<SpeechRecognitionInstance | null>(null);
    const textRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setSpeechAvail(!!getSpeechRecognition());
    }, []);

    const stopTimer = () => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            chunksRef.current = [];

            const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                ? "audio/webm;codecs=opus"
                : "audio/ogg;codecs=opus";

            const mr = new MediaRecorder(stream, { mimeType: mime });
            mediaRecRef.current = mr;

            mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            mr.onstop = () => {
                stream.getTracks().forEach((t) => t.stop());
                const blob = new Blob(chunksRef.current, { type: mime });
                const reader = new FileReader();
                reader.onloadend = () => {
                    onChange({ text: value.text, audioBlob: reader.result as string });
                };
                reader.readAsDataURL(blob);
            };

            mr.start(500);
            setRecordState("recording");
            setElapsed(0);
            timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);

            // Start speech recognition if available
            const sr = getSpeechRecognition();
            if (sr) {
                sr.lang = "es-CO";
                sr.continuous = true;
                sr.interimResults = true;
                let accumulated = value.text ? value.text + " " : "";
                sr.onresult = (e) => {
                    let interim = "";
                    for (let i = e.resultIndex; i < e.results.length; i++) {
                        const t = e.results[i][0].transcript;
                        if (e.results[i].isFinal) {
                            accumulated += t + " ";
                        } else {
                            interim = t;
                        }
                    }
                    onChange({ text: (accumulated + interim).trim(), audioBlob: value.audioBlob });
                };
                sr.onerror = () => { }; // silent
                sr.onend = () => setTranscribing(false);
                speechRef.current = sr;
                setTranscribing(true);
                try { sr.start(); } catch { /* already started */ }
            }
        } catch {
            alert("No se pudo acceder al micrófono. Verifica los permisos.");
        }
    }, [value, onChange]);

    const stopRecording = useCallback(() => {
        stopTimer();
        mediaRecRef.current?.stop();
        speechRef.current?.stop();
        setRecordState("done");
    }, []);

    const reset = useCallback(() => {
        stopTimer();
        mediaRecRef.current?.stop();
        speechRef.current?.stop();
        setRecordState("idle");
        setElapsed(0);
        setTranscribing(false);
        onChange({ text: "", audioBlob: undefined });
    }, [onChange]);

    useEffect(() => () => { stopTimer(); mediaRecRef.current?.stop(); speechRef.current?.stop(); }, []);

    const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

    return (
        <div className="space-y-2">
            <label className="text-[#94A3B8] text-xs font-bold uppercase tracking-wider block">{label}</label>

            {/* Voice control bar */}
            <div className={[
                "flex items-center gap-3 rounded-xl p-3 border transition-colors",
                recordState === "recording"
                    ? "bg-red-500/10 border-red-500/30"
                    : recordState === "done"
                        ? "bg-emerald-500/10 border-emerald-500/20"
                        : "bg-[#141824] border-[#1E2A3B]",
            ].join(" ")}>
                {/* Mic button */}
                {recordState === "idle" && (
                    <button type="button" onClick={startRecording} disabled={disabled}
                        className="w-10 h-10 rounded-full bg-[#F59E0B] flex items-center justify-center flex-shrink-0 hover:bg-amber-400 transition-colors disabled:opacity-40 active:scale-95">
                        <Mic className="w-5 h-5 text-black" />
                    </button>
                )}
                {recordState === "recording" && (
                    <button type="button" onClick={stopRecording}
                        className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 animate-pulse hover:bg-red-400 active:scale-95">
                        <Square className="w-4 h-4 text-white fill-white" />
                    </button>
                )}
                {recordState === "done" && (
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                )}

                {/* Status text */}
                <div className="flex-1 min-w-0">
                    {recordState === "idle" && (
                        <p className="text-[#64748B] text-sm">
                            {speechAvail ? "Toca para grabar y transcribir" : "Toca para grabar audio"}
                        </p>
                    )}
                    {recordState === "recording" && (
                        <div>
                            <p className="text-red-400 text-sm font-semibold flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
                                Grabando… {fmt(elapsed)}
                            </p>
                            {transcribing && (
                                <p className="text-[#64748B] text-xs mt-0.5">Transcribiendo en tiempo real…</p>
                            )}
                        </div>
                    )}
                    {recordState === "done" && (
                        <p className="text-emerald-400 text-sm font-semibold">
                            Audio guardado ({fmt(elapsed)}) {value.audioBlob ? "✓" : ""}
                        </p>
                    )}
                </div>

                {/* Reset */}
                {recordState !== "idle" && (
                    <button type="button" onClick={reset} disabled={disabled}
                        className="text-[#64748B] hover:text-white transition-colors p-2 flex-shrink-0">
                        <RotateCcw className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Editable text (transcription or manual) */}
            <div className="relative">
                <textarea
                    ref={textRef}
                    rows={4}
                    placeholder={placeholder ?? "Descripción de los hechos (se completa automáticamente al grabar)…"}
                    value={value.text}
                    onChange={(e) => onChange({ ...value, text: e.target.value })}
                    disabled={disabled}
                    onFocus={() => textRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
                    className="w-full bg-[#141824] border border-[#1E2A3B] rounded-xl px-4 py-3 text-white text-sm placeholder:text-[#334155] outline-none focus:border-[#F59E0B]/50 resize-none disabled:opacity-50 leading-relaxed"
                />
                {!speechAvail && (
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[#334155] text-xs">
                        <MicOff className="w-3 h-3" />
                        <span>Solo audio</span>
                    </div>
                )}
            </div>
        </div>
    );
}
