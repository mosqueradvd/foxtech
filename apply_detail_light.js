const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/dashboard/notifications/[id]/page.tsx');
let content = fs.readFileSync(filePath, 'utf-8').split('\n');

// 1. Add useTheme import
content[10] = 'import { DashboardHeader } from "@/components/dashboard/DashboardHeader";\nimport { useTheme } from "next-themes";';

// 2. Add useTheme lookup inside Main Component
content[104] = `    const [incident, setIncident] = useState<EnrichedIncident | null>(null);
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
        iconBoxBg: isLight ? "bg-gray-100 border border-gray-100 text-amber-600" : "bg-[#1A2538] border border-slate-800/60 text-amber-500",
    };`;

// 3. Main Container Layout
content[354] = '        <div className={`flex-1 flex flex-col h-full overflow-y-auto ${s.bg}`} style={{ fontFamily: "\'Inter\', sans-serif" }}>';

// 4. Header Fijo
content[357] = '            <div className={`sticky top-0 z-10 ${s.headerBg} border-b ${isLight ? "border-gray-100" : "border-slate-800/50"} px-6 py-4 flex items-center justify-between shadow-sm`}>';
content[361] = '                        className={`p-2 rounded-lg ${isLight ? "hover:bg-gray-100 text-slate-500" : "hover:bg-slate-800/50 text-slate-400"} border border-slate-800/20 hover:text-white transition-colors cursor-pointer`}';
content[366] = '                        <h1 className={`text-lg font-black tracking-tight ${s.textTitle} uppercase flex items-center gap-2`}>';

// 5. Hero Card
content[413] = '                <section className={`${s.cardBg} h-[450px] rounded-[8px] p-0 grid grid-cols-1 md:grid-cols-[55fr_45fr] shadow-xl shadow-black/10 overflow-hidden`}>';
content[441] = '                                <h2 className={`text-3xl font-black ${s.textTitle} leading-none`}>';
content[453] = '                            <div className={`${s.innerCardBg} rounded-xl p-4`}>';
content[457] = '                            <div className={`${s.innerCardBg} rounded-xl p-4`}>';

// 6. Sub Cards (Ubicacion, Personal, Metadatos)
content[468] = '                    <div className={`${s.cardBg} rounded-2xl p-5 flex flex-col h-[260px]`}>';
content[496] = '                    <div className={`${s.cardBg} rounded-2xl p-5 flex flex-col h-[260px]`}>';
content[524] = '                    <div className={`${s.cardBg} rounded-2xl p-5 flex flex-col h-[260px]`}>';

content[486] = '                                <p className={`text-md font-black truncate mb-1 ${s.textTitle}`}>';
content[505] = `                            <div className={\`w-16 h-16 rounded-full \${isLight ? "bg-gray-100 border-gray-200" : "bg-[#1C2433] border-slate-800/50"} flex items-center justify-center text-amber-500 font-black text-2xl shadow-inner\`}>`;
content[509] = '                                <p className={`text-lg font-black leading-tight mb-0.5 ${s.textTitle}`}>{incident.worker_name || "—"}</p>';
content[517] = '                            <span className={`text-[12px] font-bold ${s.textTitle}`}>';
content[534] = '                                <span className={`font-bold ${s.textTitle}`}>{furatNumber || "Pendiente"}</span>';
content[538] = '                                <span className={`font-bold ${s.textTitle}`}>{formatDate(incident.created_at)}</span>';
content[542] = '                                <span className={`flex items-center gap-1.5 font-bold ${s.textTitle}`}>';
content[549] = '                                <span className={`font-bold truncate max-w-[60%] text-right ${s.textTitle}`}>{incidentTitle(incident)}</span>';

// 7. Cronologia
content[556] = '                <section className={`${s.cardBg} rounded-2xl p-5`}>';
content[557] = '                    <p className={`${s.textTitle} text-[16px] font-black uppercase tracking-wider mb-6`}>CRONOLOGÍA DEL EVENTO</p>';
content[605] = '                                            <p className={`${s.textTitle} text-sm font-bold mb-1`}>';

// 8. Accordion
content[618] = '                <section className={`${s.cardBg} rounded-2xl overflow-hidden`}>';
content[625] = '                            <h3 className={`${s.textTitle} font-bold text-sm`}>Datos adicionales Mintrabajo</h3>';
content[631] = '                        <div className={`px-5 pb-5 space-y-4 border-t ${isLight ? "border-gray-100" : "border-slate-800/50"} pt-4`}>';
content[639] = '                                        className={`w-full ${s.inputBg} rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 transition-colors`}\n';
content[648] = '                                        className={`w-full ${s.inputBg} rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 transition-colors`}\n';
content[661] = '                                                className={`flex-1 ${s.inputBg} rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50`}\n';

// 9. Legal Documentacion
content[679] = '                    <p className={`${s.textTitle} text-[16px] font-black uppercase tracking-wider mb-4`}>DOCUMENTACIÓN LEGAL</p>';
content[682] = '                        <div className={`${s.cardBg} rounded-2xl p-5 flex flex-col items-start gap-4 shadow-lg group hover:border-amber-500/20 transition-all h-[230px]`}>';
content[683] = '                            <div className={`p-3 ${s.iconBoxBg} rounded-xl`}>';
content[687] = '                                <p className={`${s.textTitle} text-md font-black`}>Carta Ministerio</p>';
content[690] = `                            <button onClick={handleMintrabajoDownload} className={\`mt-auto w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-transparent border \${isLight ? "border-gray-200 hover:bg-gray-50 text-[#1E293B]" : "border-slate-700/60 hover:bg-white/5 text-white"} transition-all cursor-pointer flex items-center justify-center gap-2\`}>`;

content[696] = '                        <div className={`${s.cardBg} rounded-2xl p-5 flex flex-col items-start gap-4 shadow-lg group hover:border-amber-500/20 transition-all h-[230px]`}>';
content[697] = '                            <div className={`p-3 ${s.iconBoxBg} rounded-xl`}>';
content[701] = '                                <p className={`${s.textTitle} text-md font-black`}>Notificación ARL</p>';
content[704] = `                            <button onClick={handleARLDownload} className={\`mt-auto w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-transparent border \${isLight ? "border-gray-200 hover:bg-gray-50 text-[#1E293B]" : "border-slate-700/60 hover:bg-white/5 text-white"} transition-all cursor-pointer flex items-center justify-center gap-2\`}>`;

content[710] = '                        <div className={`${s.cardBg} rounded-2xl p-5 flex flex-col items-start gap-4 shadow-lg group hover:border-amber-500/20 transition-all h-[230px]`}>';
content[711] = '                            <div className={`p-3 ${s.iconBoxBg} rounded-xl`}>';
content[715] = '                                <p className={`${s.textTitle} text-md font-black`}>Incapacidad EPS</p>';
content[718] = `                            <button onClick={handleEPSDownload} className={\`mt-auto w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-transparent border \${isLight ? "border-gray-200 hover:bg-gray-50 text-[#1E293B]" : "border-slate-700/60 hover:bg-white/5 text-white"} transition-all cursor-pointer flex items-center justify-center gap-2\`}>`;

// 10. Registrar Envio
content[726] = '                <section className={`${s.cardBg} rounded-2xl p-5 shadow-lg space-y-4`}>';
content[729] = '                        <h3 className={`${s.textTitle} font-bold text-sm`}>Registrar envío</h3>';
content[739] = '                                className={`w-full ${s.inputBg} rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50`}\n';
content[752] = `                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 cursor-default"
                                            : \`\${isLight ? "bg-white border-gray-200 text-[#1E293B] hover:bg-gray-50" : "bg-[#1C2433] text-white border-slate-800 hover:bg-slate-800"}\`\n`;

// 11. Footer
content[765] = '            <div className={`sticky bottom-0 ${s.footerBg} px-6 py-4 flex justify-end items-center gap-3`}>';

fs.writeFileSync(filePath, content.join('\n'));
console.log('Light mode applied up to footer elements.');
