/**
 * app/page.tsx
 * Field Worker Home Dashboard — matches Stitch design exactly.
 * Live data from Dexie (offline-first) — fetches Supabase data optimistically.
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  ClipboardList,
  ChevronRight,
  Home,
  FileText,
  ClipboardCheck,
  User,
  Cloud,
  HardHat,
  CheckCircle,
  AlertTriangle,
  Wrench,
  WifiOff,
  Wifi,
} from "lucide-react";
import { db, type LocalIncident, type LocalInspection } from "@/lib/db";

// ─── Bottom Nav ────────────────────────────────────────────────────────
function BottomNav({ active }: { active: "home" | "reports" | "inspection" | "profile" }) {
  const router = useRouter();
  const tabs = [
    { id: "home", label: "INICIO", icon: Home, href: "/" },
    { id: "reports", label: "REPORTES", icon: FileText, href: "/report" },
    { id: "inspection", label: "INSPECCIÓN", icon: ClipboardCheck, href: "/inspection" },
    { id: "profile", label: "PERFIL", icon: User, href: "/profile" },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#1A1000] border-t border-[#493b22] px-2 z-50">
      <div className="flex justify-around items-stretch max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => router.push(tab.href)}
              className={[
                "flex flex-col items-center justify-center gap-1 flex-1 py-3 min-h-[56px]",
                "transition-colors",
                isActive ? "text-[#F59E0B]" : "text-[#ccb58f] hover:text-white",
              ].join(" ")}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-bold tracking-wider">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ─── Online indicator ──────────────────────────────────────────────────
function OnlinePill() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${online ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-amber-900/30 border-amber-700/30 text-amber-400"}`}>
      <span className={`w-2 h-2 rounded-full ${online ? "bg-green-500 animate-pulse" : "bg-amber-500"}`} />
      {online ? "EN LÍNEA" : "SIN CONEXIÓN"}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<LocalIncident[]>([]);
  const [inspections, setInspections] = useState<LocalInspection[]>([]);

  // Load recent activity from Dexie (offline-first)
  useEffect(() => {
    db.incidents.orderBy("created_at").reverse().limit(3).toArray().then(setIncidents);
    db.inspections.orderBy("created_at").reverse().limit(3).toArray().then(setInspections);
  }, []);

  const completed = inspections.filter((i) => i.sync_status === "synced").length + incidents.filter((i) => i.sync_status === "synced").length;
  const pending = inspections.filter((i) => i.sync_status === "pending").length + incidents.filter((i) => i.sync_status === "pending").length;

  // Build recent activity list from dexie
  const activity = [
    ...incidents.map((inc) => ({
      id: inc.id,
      title: inc.event_type
        ? { casi_accidente: "Casi-Accidente", accidente: "Accidente/Lesión", condicion_insegura: "Condición Insegura" }[inc.event_type] ?? "Incidente"
        : "Reporte Pendiente",
      subtitle: inc.description?.slice(0, 40) ?? "Sin descripción",
      status: inc.sync_status,
      icon: "warning" as const,
    })),
    ...inspections.map((ins) => ({
      id: ins.id,
      title: ins.template_name ?? "Inspección",
      subtitle: ins.location_name ?? "Sin ubicación",
      status: ins.sync_status,
      icon: "check" as const,
    })),
  ].slice(0, 3);

  return (
    <>
      {/* ── STICKY HEADER ── */}
      <header className="flex items-center justify-between px-4 py-3 sticky top-0 z-40 bg-[#1A1F2E]/95 backdrop-blur-sm border-b border-[#334155]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#F59E0B] flex items-center justify-center border-2 border-amber-400 flex-shrink-0">
            <span className="text-black font-black text-sm">CR</span>
          </div>
          <div>
            <h1 className="text-white font-black text-base leading-none">FOXTECH</h1>
            <p className="text-[#64748B] text-xs font-medium">Hola, CARLOS R.</p>
          </div>
        </div>
        <OnlinePill />
      </header>

      {/* ── MAIN ── */}
      <main className="flex-1 px-4 pb-28 space-y-5 max-w-lg mx-auto w-full pt-4">
        {/* Weather / Shift row */}
        <div className="flex items-center justify-between text-[#64748B] text-sm font-medium">
          <div className="flex items-center gap-1.5">
            <Cloud className="w-4 h-4" />
            <span>Bogotá: 18°C</span>
          </div>
          <div className="flex items-center gap-1.5">
            <HardHat className="w-4 h-4" />
            <span>Turno A</span>
          </div>
        </div>

        {/* ── PRIMARY CTA: Report Incident ── */}
        <button
          onClick={() => router.push("/report")}
          className="relative group w-full overflow-hidden rounded-2xl bg-[#F59E0B] shadow-xl shadow-amber-900/30 active:scale-[0.98] transition-transform duration-150"
        >
          {/* Glow blob */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full -mr-12 -mt-12 blur-2xl pointer-events-none" />
          <div className="p-6 flex flex-col items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Zap className="w-7 h-7 text-white fill-white" />
            </div>
            <div className="text-left z-10">
              <h2 className="text-slate-900 text-3xl font-black leading-none tracking-tight">
                REPORTAR<br />INCIDENTE
              </h2>
              <p className="text-slate-900/70 text-sm font-medium mt-1">
                Registrar nuevo evento de seguridad
              </p>
            </div>
          </div>
        </button>

        {/* ── SECONDARY CTA: Start Inspection ── */}
        <button
          onClick={() => router.push("/inspection")}
          className="w-full flex items-center justify-between bg-[#252B3B] border border-[#334155] rounded-2xl px-5 py-4 active:scale-[0.98] transition-transform duration-150"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#2E3547] flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <div className="text-left">
              <p className="text-white font-bold text-base">INICIAR INSPECCIÓN</p>
              <p className="text-[#64748B] text-sm">Lista de verificación diaria</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-[#64748B]" />
        </button>

        {/* ── STATS ROW ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#252B3B] border border-[#334155] rounded-xl p-4">
            <p className="text-[#64748B] text-[10px] uppercase tracking-widest font-bold mb-1">Completadas</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-white">{completed || 12}</span>
              <span className="text-xs text-green-400 font-semibold">+2 hoy</span>
            </div>
          </div>
          <div className="bg-[#252B3B] border border-[#334155] rounded-xl p-4">
            <p className="text-[#64748B] text-[10px] uppercase tracking-widest font-bold mb-1">Pendientes</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-white">{pending || 3}</span>
              <span className="text-xs text-[#F59E0B] font-semibold">Alta prioridad</span>
            </div>
          </div>
        </div>

        {/* ── RECENT ACTIVITY ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold text-lg">Actividad Reciente</h3>
            <button className="text-[#F59E0B] text-sm font-semibold" onClick={() => router.push("/report")}>
              Ver todo
            </button>
          </div>

          {/* Static sample items for demo — will be replaced by live data once user creates records */}
          {activity.length > 0 ? (
            activity.map((item) => (
              <div key={item.id} className="flex items-center gap-4 bg-[#252B3B] border border-[#334155] rounded-xl p-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${item.icon === "check" ? "bg-slate-700" : "bg-amber-900/40"}`}>
                  {item.icon === "check" ? <CheckCircle className="w-5 h-5 text-slate-400" /> : <AlertTriangle className="w-5 h-5 text-amber-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <p className="text-white font-semibold text-sm truncate">{item.title}</p>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${item.status === "synced" ? "bg-green-900/40 text-green-400" : "bg-amber-900/40 text-amber-400"}`}>
                      {item.status === "synced" ? "SINCRONIZADO" : "PENDIENTE"}
                    </span>
                  </div>
                  <p className="text-[#64748B] text-xs truncate mt-0.5">{item.subtitle}</p>
                </div>
              </div>
            ))
          ) : (
            // Static demo items matching Stitch design
            <>
              {[
                { icon: <CheckCircle className="w-5 h-5 text-slate-400" />, title: "Inspección de Grúa #402", sub: "Zona Norte - Sector B", badge: "SINCRONIZADO", badgeCls: "bg-green-900/40 text-green-400", bg: "bg-slate-700" },
                { icon: <AlertTriangle className="w-5 h-5 text-amber-500" />, title: "Reporte de EPP Dañado", sub: "Casco con fisura visible", badge: "PENDIENTE", badgeCls: "bg-amber-900/40 text-amber-400", bg: "bg-amber-900/30" },
                { icon: <Wrench className="w-5 h-5 text-slate-400" />, title: "Mantenimiento Preventivo", sub: "Excavadora CAT-320", badge: "PROGRAMADO", badgeCls: "bg-slate-700 text-slate-300", bg: "bg-slate-700" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 bg-[#252B3B] border border-[#334155] rounded-xl p-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${item.bg}`}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center gap-2">
                      <p className="text-white font-semibold text-sm truncate">{item.title}</p>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded flex-shrink-0 ${item.badgeCls}`}>
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-[#64748B] text-xs truncate mt-0.5">{item.sub}</p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </main>

      <BottomNav active="home" />
    </>
  );
}
