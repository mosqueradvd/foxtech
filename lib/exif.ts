/**
 * lib/exif.ts
 * Embeds GPS coordinates and timestamp into a JPEG blob using piexifjs.
 * This is required by Colombian ARL regulation for legal validity of photos.
 */

// piexifjs is a CommonJS module
let piexif: typeof import("piexifjs") | null = null;

async function getPiexif() {
    if (!piexif) {
        piexif = await import("piexifjs");
    }
    return piexif;
}

export type GPSCoords = {
    latitude: number;
    longitude: number;
    altitude?: number;
    timestamp?: Date;
};

/**
 * Convert decimal degrees to the DMS rational format required by EXIF GPS IFD.
 * Returns [[degrees, 1], [minutes, 1], [seconds_numerator, 100]] format.
 */
function decimalToDMSRational(decimal: number): [[number, number], [number, number], [number, number]] {
    const d = Math.abs(decimal);
    const degrees = Math.floor(d);
    const minutesFloat = (d - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = (minutesFloat - minutes) * 60;

    return [
        [degrees, 1],
        [minutes, 1],
        [Math.round(seconds * 100), 100],
    ];
}

/**
 * Convert a base64 data URL JPEG to one with GPS EXIF metadata embedded.
 * Returns a new base64 data URL string.
 *
 * @param base64DataUrl - The original JPEG as a base64 data URL
 * @param coords        - GPS coordinates to embed
 * @returns Modified JPEG as base64 data URL
 */
export async function embedGPSExif(
    base64DataUrl: string,
    coords: GPSCoords
): Promise<string> {
    try {
        const piexifLib = await getPiexif();

        const { latitude, longitude, altitude = 0, timestamp = new Date() } = coords;

        // Format date/time for EXIF
        const pad = (n: number) => String(n).padStart(2, "0");
        const dateStr = `${timestamp.getFullYear()}:${pad(timestamp.getMonth() + 1)}:${pad(timestamp.getDate())}`;
        const timeStr = `${pad(timestamp.getHours())}:${pad(timestamp.getMinutes())}:${pad(timestamp.getSeconds())}`;

        const exifObj = {
            "0th": {
                [piexifLib.ImageIFD.Make]: "FOXTECH HSE",
                [piexifLib.ImageIFD.Software]: "FOXTECH PWA v1.0",
                [piexifLib.ImageIFD.DateTime]: `${dateStr} ${timeStr}`,
                [piexifLib.ImageIFD.Copyright]: "FOXTECH Safety Systems",
            },
            Exif: {
                [piexifLib.ExifIFD.DateTimeOriginal]: `${dateStr} ${timeStr}`,
                [piexifLib.ExifIFD.DateTimeDigitized]: `${dateStr} ${timeStr}`,
            },
            GPS: {
                [piexifLib.GPSIFD.GPSVersionID]: [2, 3, 0, 0],
                [piexifLib.GPSIFD.GPSLatitudeRef]: latitude >= 0 ? "N" : "S",
                [piexifLib.GPSIFD.GPSLatitude]: decimalToDMSRational(latitude),
                [piexifLib.GPSIFD.GPSLongitudeRef]: longitude >= 0 ? "E" : "W",
                [piexifLib.GPSIFD.GPSLongitude]: decimalToDMSRational(longitude),
                [piexifLib.GPSIFD.GPSAltitudeRef]: altitude >= 0 ? 0 : 1,
                [piexifLib.GPSIFD.GPSAltitude]: [Math.round(Math.abs(altitude) * 100), 100],
                [piexifLib.GPSIFD.GPSDateStamp]: dateStr,
                [piexifLib.GPSIFD.GPSProcessingMethod]: "\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000GPS", // ASCII encoding marker
            },
        };

        const exifBytes = piexifLib.dump(exifObj);

        // Insert EXIF bytes into the JPEG
        const newJpeg = piexifLib.insert(exifBytes, base64DataUrl);
        return newJpeg;
    } catch (err) {
        // If EXIF embedding fails, return original photo (don't block user)
        console.warn("[FOXTECH] EXIF embedding failed, using original photo:", err);
        return base64DataUrl;
    }
}

/**
 * Get current GPS position wrapped in a promise.
 * Returns null if geolocation is unavailable or denied — app must still work.
 */
export function getCurrentPosition(): Promise<GeolocationPosition | null> {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            console.warn("[FOXTECH] Geolocation API not available");
            resolve(null);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => resolve(position),
            (error) => {
                console.warn("[FOXTECH] Geolocation error:", error.message);
                resolve(null);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000, // Accept cached position up to 1 min old (helpful underground)
            }
        );
    });
}

/**
 * Format GPS decimal degrees for display.
 * E.g. 4.6097, -74.0817 → "4.6097° N, 74.0817° W"
 */
export function formatGPSDisplay(lat: number, lng: number): string {
    const latDir = lat >= 0 ? "N" : "S";
    const lngDir = lng >= 0 ? "E" : "W";
    return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}
