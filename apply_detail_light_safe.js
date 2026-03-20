const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/dashboard/notifications/[id]/page.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add useTheme import
content = content.replace(
    'import { DashboardHeader } from "@/components/dashboard/DashboardHeader";',
    'import { DashboardHeader } from "@/components/dashboard/DashboardHeader";\nimport { useTheme } from "next-themes";'
);

// 2. Add useTheme lookup inside Main Component
content = content.replace(
    `    const [incident, setIncident] = useState<EnrichedIncident | null>(null);
    const [loading, setLoading] = useState(true);`,
    `    const [incident, setIncident] = useState<EnrichedIncident | null>(null);
    const [loading, setLoading] = useState(true);

    const { theme, resolvedTheme } = useTheme();
    const isLight = resolvedTheme === "light";

    const s = {
        bg: isLight ? "bg-[#F8FAFC] text-[#1E293B]" : "bg-[#0e172a] text-slate-200",
        headerBg: isLight ? "bg-white/90" : "bg-[#0e172a]/90 backdrop-blur-md",
        cardBg: isLight ? "bg-white border-gray-100 shadow-sm" : "bg-[#232b3d] border-slate-800/40",
        inputBg: isLight ? "bg-white border border-gray-200 text-[#1E293B]" : "bg-[#1C2433] border border-slate-800/40 text-white",
        innerCardBg: isLight ? "bg-gray-50 border border-gray-100/80" : "bg-[#1C2433]/40 border border-slate-800/30",
        footerBg: isLight ? "bg-white border-t border-gray-100" : "bg-[#0F131D] border-t border-slate-800",
        textTitle: isLight ? "text-[#1E293B]" : "text-white",
        iconBoxBg: isLight ? "bg-gray-100 border border-gray-100 text-amber-600" : "bg-[#1A2538] rounded-xl border border-slate-800/60 text-amber-500",
    };`
);

// 3. Main Container Layout
content = content.replace(
    '<div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#0e172a] text-slate-200" style={{ fontFamily: "\'Inter\', sans-serif" }}>',
    '<div className={`flex-1 flex flex-col h-full overflow-y-auto ${s.bg}`} style={{ fontFamily: "\'Inter\', sans-serif" }}>'
);

// 4. Header Fijo
content = content.replace(
    '<div className="sticky top-0 z-10 bg-[#0e172a]/90 backdrop-blur-md border-b border-slate-800/50 px-6 py-4 flex items-center justify-between shadow-sm shadow-black/20">',
    '<div className={`sticky top-0 z-10 ${s.headerBg} border-b ${isLight ? "border-gray-100" : "border-slate-800/50"} px-6 py-4 flex items-center justify-between shadow-sm`}>'
);

content = content.replace(
    'className="p-2 rounded-lg hover:bg-slate-800/50 border border-slate-800/20 text-slate-400 hover:text-white transition-colors cursor-pointer"',
    'className={`p-2 rounded-lg ${isLight ? "hover:bg-gray-100 text-slate-500" : "hover:bg-slate-800/50 text-slate-400"} border border-slate-800/20 hover:text-white transition-colors cursor-pointer`}'
);

content = content.replace(
    '<h1 className="text-lg font-black tracking-tight text-white uppercase flex items-center gap-2">',
    '<h1 className={`text-lg font-black tracking-tight ${s.textTitle} uppercase flex items-center gap-2`}>'
);

// 5. Hero Card
content = content.replace(
    '<section className="bg-[#232b3d] h-[450px] rounded-[8px] border border-slate-800/40 p-0 grid grid-cols-1 md:grid-cols-[55fr_45fr] shadow-xl shadow-black/10 overflow-hidden">',
    '<section className={`${s.cardBg} h-[450px] rounded-[4px] p-0 grid grid-cols-1 md:grid-cols-[55fr_45fr] shadow-xl shadow-black/10 overflow-hidden`}>'
);

content = content.replace(
    '<h2 className="text-3xl font-black text-white leading-none">',
    '<h2 className={`text-3xl font-black ${s.textTitle} leading-none`}>'
);

// Add sub-inner block target replaces for grid row
content = content.replace(
    'bg-[#1C2433]/40 rounded-xl p-4 border border-slate-800/30',
    '${s.innerCardBg} rounded-xl p-4'
);

// 6. Sub Cards (Ubicacion, Personal, Metadatos)
content = content.replace(
    '<div className="bg-[#232b3d] rounded-2xl border border-slate-800/40 p-5 shadow-lg flex flex-col h-[260px]">',
    '<div className={`${s.cardBg} rounded-2xl p-5 flex flex-col h-[260px]`}>'
); // Matches multiple cards globally!

content = content.replace(
    '<p className="text-white text-md font-black truncate mb-1">',
    '<p className={`text-md font-black truncate mb-1 ${s.textTitle}`}>'
);

content = content.replace(
    '<div className="w-16 h-16 rounded-full bg-[#1C2433] border border-slate-800/50 flex items-center justify-center text-amber-500 font-black text-2xl shadow-inner shadow-black/30">',
    `<div className={\`w-16 h-16 rounded-full \${isLight ? "bg-gray-100 border-gray-200" : "bg-[#1C2433] border-slate-800/50"} flex items-center justify-center text-amber-500 font-black text-2xl shadow-inner\`}>`
);

content = content.replace(
    '<p className="text-white text-lg font-black leading-tight mb-0.5">',
    '<p className={`text-lg font-black leading-tight mb-0.5 ${s.textTitle}`}>'
);

content = content.replace(
    '<span className="text-white text-[12px] font-bold">',
    '<span className={`text-[12px] font-bold ${s.textTitle}`}>'
);

content = content.replace(
    '<span className="text-slate-500">ID Mintrabajo</span>\n                                <span className="text-white font-bold">',
    '<span className="text-slate-500">ID Mintrabajo</span>\n                                <span className={`font-bold ${s.textTitle}`}>'
);

content = content.replace(
    '<span className="text-slate-500">Fecha/Hora</span>\n                                <span className="text-white font-bold">',
    '<span className="text-slate-500">Fecha/Hora</span>\n                                <span className={`font-bold ${s.textTitle}`}>'
);

content = content.replace(
    '<span className="text-slate-500">Gravedad</span>\n                                <span className="flex items-center gap-1.5 text-white font-bold">',
    '<span className="text-slate-500">Gravedad</span>\n                                <span className={`flex items-center gap-1.5 font-bold ${s.textTitle}`}>'
);

content = content.replace(
    '<span className="text-slate-500">Categoría</span>\n                                <span className="text-white font-bold truncate max-w-[60%] text-right">',
    '<span className="text-slate-500">Categoría</span>\n                                <span className={`font-bold truncate max-w-[60%] text-right ${s.textTitle}`}>'
);

// 7. Cronologia
content = content.replace(
    '<section className="bg-[#232b3d] rounded-2xl border border-slate-800/40 p-5 shadow-lg">',
    '<section className={`${s.cardBg} rounded-2xl p-5`}>'
);

content = content.replace(
    '<p className="text-slate-400 text-white text-[16px] font-black uppercase tracking-wider mb-6">CRONOLOGÍA DEL EVENTO</p>',
    '<p className={`${s.textTitle} text-[16px] font-black uppercase tracking-wider mb-6`}>CRONOLOGÍA DEL EVENTO</p>'
);

content = content.replace(
    '<p className="text-white text-sm font-bold mb-1">',
    '<p className={`${s.textTitle} text-sm font-bold mb-1`}>'
);

// 8. Accordion
content = content.replace(
    '<section className="bg-[#232b3d] rounded-2xl border border-slate-800/40 shadow-lg overflow-hidden">',
    '<section className={`${s.cardBg} rounded-2xl overflow-hidden`}>'
);

content = content.replace(
    '<h3 className="text-white font-bold text-sm">Datos adicionales Mintrabajo</h3>',
    '<h3 className={`${s.textTitle} font-bold text-sm`}>Datos adicionales Mintrabajo</h3>'
);

content = content.replace(
    '<div className="px-5 pb-5 space-y-4 border-t border-slate-800/50 pt-4">',
    `                        <div className={\`px-5 pb-5 space-y-4 border-t \${isLight ? "border-gray-100" : "border-slate-800/50"} pt-4\`}>`
);

content = content.replaceAll(
    'className="w-full bg-[#1C2433] border border-slate-800/40 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50 transition-colors"',
    'className={`w-full ${s.inputBg} rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 transition-colors`}'
);

content = content.replaceAll(
    'className="flex-1 bg-[#1C2433] border border-slate-800/40 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"',
    'className={`flex-1 ${s.inputBg} rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50`}'
);

content = content.replaceAll(
    'className="w-full bg-[#1C2433] border border-slate-800/40 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"',
    'className={`w-full ${s.inputBg} rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50`}'
);

// 9. Legal Documentacion
content = content.replace(
    '<p className="text-white text-[16px] font-black uppercase tracking-wider mb-4">DOCUMENTACIÓN LEGAL</p>',
    '<p className={`${s.textTitle} text-[16px] font-black uppercase tracking-wider mb-4`}>DOCUMENTACIÓN LEGAL</p>'
);

content = content.replaceAll(
    'bg-[#232b3d] rounded-2xl border border-slate-800/40 p-5 flex flex-col items-start gap-4 shadow-lg group hover:border-amber-500/20 transition-all h-[230px]',
    '${s.cardBg} rounded-2xl p-5 flex flex-col items-start gap-4 shadow-lg group hover:border-amber-500/20 transition-all h-[230px]'
);

content = content.replaceAll(
    'p-3 bg-[#1A2538] rounded-xl border border-slate-800/60 text-amber-500',
    'p-3 ${s.iconBoxBg} rounded-xl'
);

content = content.replaceAll(
    '<p className="text-white text-md font-black">Carta Ministerio</p>',
    '<p className={`${s.textTitle} text-md font-black`}>Carta Ministerio</p>'
);

content = content.replaceAll(
    '<button onClick={handleMintrabajoDownload} className="mt-auto w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-transparent border border-slate-700/60 hover:bg-white/5 text-white transition-all cursor-pointer flex items-center justify-center gap-2">',
    `<button onClick={handleMintrabajoDownload} className={\`mt-auto w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-transparent border \${isLight ? "border-gray-200 hover:bg-gray-50 text-[#1E293B]" : "border-slate-700/60 hover:bg-white/5 text-white"} transition-all cursor-pointer flex items-center justify-center gap-2\`}>`
);

content = content.replaceAll(
    '<button onClick={handleARLDownload} className="mt-auto w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-transparent border border-slate-700/60 hover:bg-white/5 text-white transition-all cursor-pointer flex items-center justify-center gap-2">',
    `<button onClick={handleARLDownload} className={\`mt-auto w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-transparent border \${isLight ? "border-gray-200 hover:bg-gray-50 text-[#1E293B]" : "border-slate-700/60 hover:bg-white/5 text-white"} transition-all cursor-pointer flex items-center justify-center gap-2\`}>`
);

content = content.replaceAll(
    '<button onClick={handleEPSDownload} className="mt-auto w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-transparent border border-slate-700/60 hover:bg-white/5 text-white transition-all cursor-pointer flex items-center justify-center gap-2">',
    `<button onClick={handleEPSDownload} className={\`mt-auto w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-transparent border \${isLight ? "border-gray-200 hover:bg-gray-50 text-[#1E293B]" : "border-slate-700/60 hover:bg-white/5 text-white"} transition-all cursor-pointer flex items-center justify-center gap-2\`}>`
);

// 10. Registrar Envio
content = content.replace(
    '<section className="bg-[#232b3d] rounded-2xl border border-slate-800/40 p-5 shadow-lg space-y-4">',
    '<section className={`${s.cardBg} rounded-2xl p-5 shadow-lg space-y-4`}>'
);

content = content.replace(
    '<h3 className="text-white font-bold text-sm">Registrar envío</h3>',
    '<h3 className={`${s.textTitle} font-bold text-sm`}>Registrar envío</h3>'
);

content = content.replace(
    `                                        isNotified(type)
                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 cursor-default"
                                            : "bg-[#1C2433] text-white border-slate-800 hover:bg-slate-800"`,
    `                                        isNotified(type)
                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 cursor-default"
                                            : \`\${isLight ? "bg-white border-gray-200 text-[#1E293B] hover:bg-gray-50" : "bg-[#1C2433] text-white border-slate-800 hover:bg-slate-800"}\``
);

// 11. Footer
content = content.replace(
    '<div className="sticky bottom-0 bg-[#0F131D] border-t border-slate-800 px-6 py-4 flex justify-end items-center gap-3">',
    '<div className={`sticky bottom-0 ${s.footerBg} px-6 py-4 flex justify-end items-center gap-3`}>'
);

fs.writeFileSync(filePath, content);
console.log('Light mode string remapping complete on details view.');
