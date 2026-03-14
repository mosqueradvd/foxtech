import { NextResponse } from "next/server";

// Cache en memoria para el token
let cachedToken: string | null = null;
let tokenExpiresAt: number = 0; // Timestamp en mr

async function getWHOToken() {
    // Si tenemos token y aún no ha expirado (con 1 minuto de margen de seguridad)
    if (cachedToken && Date.now() < tokenExpiresAt - 60000) {
        return cachedToken;
    }

    const clientId = process.env.WHO_ICD_CLIENT_ID;
    const clientSecret = process.env.WHO_ICD_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error("WHO_ICD_CLIENT_ID and WHO_ICD_CLIENT_SECRET are required");
    }

    const tokenUrl = "https://icdaccessmanagement.who.int/connect/token";

    const body = new URLSearchParams();
    body.append("client_id", clientId);
    body.append("client_secret", clientSecret);
    body.append("scope", "icdapi_access");
    body.append("grant_type", "client_credentials");

    const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
    });

    if (!response.ok) {
        console.error("Error al obtener token OMS:", await response.text());
        throw new Error("Error obtaining WHO API token");
    }

    const data = await response.json();
    cachedToken = data.access_token;
    // data.expires_in is in seconds (usually 3600 = 1 hour)
    tokenExpiresAt = Date.now() + (data.expires_in * 1000);

    return cachedToken;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const q = searchParams.get("q");
        const version = searchParams.get("version") || "11"; // 10 o 11

        if (!q) {
            return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
        }

        const token = await getWHOToken();

        let searchUrl = "";
        if (version === "11") {
            searchUrl = `https://id.who.int/icd/release/11/2024-01/mms/search?q=${encodeURIComponent(q)}&useFlexisearch=true&flatResults=true`;
        } else if (version === "10") {
            searchUrl = `https://id.who.int/icd/release/10/2019/search?q=${encodeURIComponent(q)}`;
        } else {
            return NextResponse.json({ error: "Invalid version. Must be '10' or '11'" }, { status: 400 });
        }

        const headers = {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json",
            "Accept-Language": "es",
            "API-Version": "v2",
        };

        const response = await fetch(searchUrl, { headers });

        if (!response.ok) {
            console.error(`Error buscando CIE-${version}:`, await response.text());
            throw new Error(`Failed to fetch from WHO ICD-${version} API`);
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error("API Error in /api/cie/search:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
