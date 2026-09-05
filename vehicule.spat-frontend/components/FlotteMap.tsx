"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix icône par défaut Leaflet (bug connu avec Next.js/Webpack)
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface VehiculePosition {
  id: number;
  immatriculation: string;
  modele?: string;
  statut: string;
  latitude: number;
  longitude: number;
}

const ANTANANARIVO: [number, number] = [-18.8792, 47.5079];

export default function FlotteMap({ vehicules }: { vehicules: VehiculePosition[] }) {
  return (
    <MapContainer
      center={ANTANANARIVO}
      zoom={12}
      style={{ height: "100%", width: "100%", borderRadius: 8 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {vehicules.map((v) => (
        <Marker key={v.id} position={[v.latitude, v.longitude]}>
          <Popup>
            <strong>{v.immatriculation}</strong>
            {v.modele && <div>{v.modele}</div>}
            <div>{v.statut.replace(/_/g, " ")}</div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}