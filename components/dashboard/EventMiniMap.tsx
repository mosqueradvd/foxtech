"use client";

import { MapContainer, TileLayer, CircleMarker, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
    lat: number;
    lng: number;
    type?: string;
}

export default function EventMiniMap({ lat, lng, type = "evento" }: Props) {
    const center: [number, number] = [lat, lng];
    const zoom = 14; // Closer zoom for event location

    let color = "#ef4444"; // red default (Accidente)
    const t = type.toLowerCase();
    if (t.includes("casi")) color = "#fbbf24"; // amber (Casi Accidente)
    else if (t.includes("condic")) color = "#94a3b8"; // slate (Condición Insegura)

    return (
        <MapContainer
            center={center}
            zoom={zoom}
            style={{ height: "100%", width: "100%", background: "#fff", zIndex: 0 }}
            zoomControl={false}
        >
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            <ZoomControl position="bottomright" />
            <CircleMarker
                center={center}
                radius={8}
                pathOptions={{
                    color: "white",
                    fillColor: color,
                    fillOpacity: 0.9,
                    weight: 2
                }}
            />
        </MapContainer>
    );
}
