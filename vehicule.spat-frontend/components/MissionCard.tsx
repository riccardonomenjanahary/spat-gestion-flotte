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

interface Vehicule {
  id: number;
  immatriculation: string;
  modele?: string;
  statut: string;
  latitude?: number;
  longitude?: number;
  dernierePositionLe?: string;
}

interface Chauffeur {
  nom: string;
  prenom: string;
  telephone?: string;
}

interface Mission {
  id: number;
  vehiculeId: number;
  chauffeurId: number;
  dateDebut: string;
  dateFin?: string | null;
  vehicule?: Vehicule;
  chauffeur?: Chauffeur;
}

const statutColor: Record<string, { bg: string; text: string }> = {
  DISPONIBLE: { bg: "#dcfce7", text: "#166534" },
  EN_MISSION: { bg: "#dbeafe", text: "#1e40af" },
  MAINTENANCE: { bg: "#fef3c7", text: "#92400e" },
  REFORME: { bg: "#fee2e2", text: "#991b1b" },
};

export default function MissionCard({
  mission,
  onTerminer,
}: {
  mission: Mission;
  onTerminer: (mission: Mission) => void;
}) {
  const v = mission.vehicule;
  const c = mission.chauffeur;
  const enCours = !mission.dateFin;
  const aPosition = v?.latitude != null && v?.longitude != null;

  const colors = v ? statutColor[v.statut] || { bg: "#f3f4f6", text: "#4b5563" } : { bg: "#f3f4f6", text: "#4b5563" };

  const formatDate = (iso?: string | null) =>
    iso
      ? new Date(iso).toLocaleString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "300px 1fr",
        backgroundColor: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 15 }}>
              {v?.immatriculation || `#${mission.vehiculeId}`}
            </div>
            {v?.modele && <div style={{ fontSize: 13, color: "#6b7280" }}>{v.modele}</div>}
          </div>
          {v && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "3px 8px",
                borderRadius: 999,
                backgroundColor: colors.bg,
                color: colors.text,
                whiteSpace: "nowrap",
              }}
            >
              {v.statut.replace(/_/g, " ")}
            </span>
          )}
        </div>

        <div style={{ fontSize: 13, color: "#374151" }}>
          {c ? `${c.prenom} ${c.nom}` : `#${mission.chauffeurId}`}
          {c?.telephone && <div style={{ fontSize: 12, color: "#9ca3af" }}>{c.telephone}</div>}
        </div>

        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
          <div>Début : {formatDate(mission.dateDebut)}</div>
          <div>Fin : {formatDate(mission.dateFin)}</div>
        </div>

        <span
          style={{
            alignSelf: "flex-start",
            padding: "2px 10px",
            borderRadius: 12,
            fontSize: 12,
            backgroundColor: enCours ? "#dbeafe" : "#f3f4f6",
            color: enCours ? "#1e40af" : "#4b5563",
            marginTop: 4,
          }}
        >
          {enCours ? "En cours" : "Terminée"}
        </span>

        {enCours && (
          <button
            onClick={() => onTerminer(mission)}
            style={{
              marginTop: "auto",
              padding: "8px 0",
              backgroundColor: "#d97706",
              color: "white",
              border: "none",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Terminer la mission
          </button>
        )}
      </div>

      <div style={{ height: 220 }}>
        {aPosition && v ? (
          <MapContainer
            center={[v.latitude as number, v.longitude as number]}
            zoom={14}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[v.latitude as number, v.longitude as number]}>
              <Popup>
                <strong>{v.immatriculation}</strong>
              </Popup>
            </Marker>
          </MapContainer>
        ) : (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#9ca3af",
              fontSize: 13,
              backgroundColor: "#f9fafb",
            }}
          >
            Aucune position GPS
          </div>
        )}
      </div>
    </div>
  );
}