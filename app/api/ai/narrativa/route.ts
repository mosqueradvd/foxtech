import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY!
);

export async function POST(req: Request) {
    try {
        const { tipo, texto, contexto } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            return Response.json({ error: "GEMINI_API_KEY no configurada" }, { status: 500 });
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash"
        });

        let systemPrompt = "";
        let userMessage = "";

        if (tipo === "narrativa") {
            systemPrompt = `Eres un asistente especializado en redacción de informes de seguridad y salud en el trabajo (SST) para Colombia. 
Tu tarea es tomar el relato informal de un trabajador sobre un accidente o incidente de trabajo y convertirlo en una descripción técnica, clara y legalmente apropiada para un informe SST colombiano.

Reglas:
- Mantén todos los hechos del relato original
- No inventes información que no esté en el texto
- Usa lenguaje técnico SST colombiano
- Redacta en tercera persona
- Incluye: qué pasó, cómo pasó, consecuencia inmediata
- Máximo 150 palabras
- Responde SOLO con la descripción mejorada, sin explicaciones adicionales`;

            userMessage = `Mejora esta descripción de evento SST: ${texto}`;
        } else if (tipo === "causas") {
            systemPrompt = `Eres un experto en investigación de accidentes de trabajo según la Resolución 1401 de 2007 de Colombia.
Con base en las causas identificadas, sugiere las posibles fallas en el control administrativo (§5.4) que pudieron permitir que esas causas existieran.

Reglas:
- Enfócate en fallas del sistema de gestión
- Menciona políticas, procedimientos o supervisión deficientes según el caso
- Usa lenguaje técnico SST colombiano
- Máximo 120 palabras
- Responde SOLO con el texto sugerido`;

            const inmediatas = contexto?.inmediatas?.map((c: string) => `- ${c}`).join("\n") || "Ninguna";
            const basicas = contexto?.basicas?.map((c: string) => `- ${c}`).join("\n") || "Ninguna";

            userMessage = `Tipo de evento: ${texto || "No especificado"}
Causas inmediatas:
${inmediatas}

Causas básicas:
${basicas}

Sugiere las fallas en control administrativo.`;
        } else {
            return Response.json({ error: "Tipo de solicitud no válido" }, { status: 400 });
        }

        const result = await model.generateContent({
            contents: [
                { role: "user", parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }
            ]
        });

        return Response.json({
            texto: result.response.text()
        });

    } catch (error: any) {
        console.error("Error en API AI:", error);
        return Response.json({ error: error.message || "Error interno del servidor" }, { status: 500 });
    }
}
