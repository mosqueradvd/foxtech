"use client";

import { MapContainer, TileLayer, CircleMarker, Popup, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export interface MapIncident {
    id: string;
    lat: number;
    lng: number;
    type: string;
    company: string;
}

interface Props {
    incidents: MapIncident[];
}

export default function IncidentMap({ incidents }: Props) {
    // Default center: Colombia (aprox center is 4.5709, -74.2973)
    const center: [number, number] = [4.5709, -74.2973];
    const zoom = 5;

    return (
        <MapContainer
            center={center}
            zoom={zoom}
            style={{ height: "100%", width: "100%", background: "#1A2538", zIndex: 0 }}
            zoomControl={false} // We will add it manually to position it
        >
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            {/* Posicionar control de zoom */}
            <ZoomControl position="topleft" />

            {incidents.map(inc => {
                let color = "#ef4444"; // red default (Accidente)
                const t = inc.type.toLowerCase();
                if (t.includes("casi")) color = "#fbbf24"; // amber (Casi Accidente)
                else if (t.includes("condic")) color = "#94a3b8"; // slate (Condición Insegura)

                return (
                    <CircleMarker
                        key={inc.id}
                        center={[inc.lat, inc.lng]}
                        radius={6}
                        pathOptions={{
                            color: "white",
                            fillColor: color,
                            fillOpacity: 0.9,
                            weight: 2
                        }}
                    >
                        <Popup>
                            <div style={{ margin: "-4px" }}>
                                <strong style={{ color: "#0F1420", display: "block", fontSize: "14px" }}>{inc.company}</strong>
                                <span style={{ color: "#64748B", fontSize: "12px", textTransform: "capitalize" }}>{inc.type}</span>
                            </div>
                        </Popup>
                    </CircleMarker>
                );
            })}
        </MapContainer>
    );
}
