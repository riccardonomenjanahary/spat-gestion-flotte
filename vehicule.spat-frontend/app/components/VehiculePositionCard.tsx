"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

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
  dernierePositionLe?: string;
}

interface Chauffeur {
  nom: string;
  prenom: string;
  telephone?: string;
}

const statutColor: Record<string, { bg: string; text: string }> = {
  DISPONIBLE: { bg: "#dcfce7", text: "#166534" },
  EN_MISSION: { bg: "#dbeafe", text: "#1e40af" },
  MAINTENANCE: { bg: "#fef3c7", text: "#92400e" },
  REFORME: { bg: "#fee2e2", text: "#991b1b" },
};

export default function VehiculePositionCard({
  vehicule,
  chauffeur,
}: {
  vehicule: VehiculePosition;
  chauffeur?: Chauffeur;
}) {
  const colors = statutColor[vehicule.statut] || { bg: "#f3f4f6", text: "#4b5563" };

  const formatHeure = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit" })
      : "—";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "260px 1fr",
        backgroundColor: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {/* Infos à gauche */}
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 15 }}>
            {vehicule.immatriculation}
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "3px 8px",
              borderRadius: 999,
              backgroundColor: colors.bg,
              color: colors.text,
            }}
          >
            {vehicule.statut.replace(/_/g, " ")}
          </span>
        </div>

        {vehicule.modele && (
          <div style={{ fontSize: 13, color: "#6b7280" }}>{vehicule.modele}</div>
        )}

        {chauffeur && (
          <div style={{ fontSize: 13, color: "#374151", marginTop: 4 }}>
            {chauffeur.prenom} {chauffeur.nom}
            {chauffeur.telephone && (
              <div style={{ fontSize: 12, color: "#9ca3af" }}>{chauffeur.telephone}</div>
            )}
          </div>
        )}

        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: "auto" }}>
          Dernière position : {formatHeure(vehicule.dernierePositionLe)}
        </div>
      </div>

      {/* Carte à droite */}
      <div style={{ height: 200 }}>
        <MapContainer
          center={[vehicule.latitude, vehicule.longitude]}
          zoom={14}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[vehicule.latitude, vehicule.longitude]}>
            <Popup>
              <strong>{vehicule.immatriculation}</strong>
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
}