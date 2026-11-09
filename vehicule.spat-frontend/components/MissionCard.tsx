"use client";

import dynamic from "next/dynamic";
import type { GpsPosition } from "@/components/FlotteMap";

const FlotteMap = dynamic(() => import("@/components/FlotteMap"), {
  ssr: false,
});

interface Vehicule {
  id: number;
  immatriculation: string;
  modele?: string | null;
  statut: string;
  gpsEquipe?: boolean | null;
  gpsDeviceId?: number | null;
  latitude?: number;
  longitude?: number;
  dernierePositionLe?: string;
}

interface Chauffeur {
  id?: number;
  nom: string;
  prenom: string;
  telephone?: string | null;
  statut?: string;
}

interface Mission {
  id: number;
  vehiculeId?: number | null;
  chauffeurId?: number | null;
  dateDebut?: string | null;
  dateFin?: string | null;
  vehicule?: Vehicule | null;
  chauffeur?: Chauffeur | null;
  positionGps?: GpsPosition | null;
}

const statutColor: Record<string, { bg: string; text: string }> = {
  DISPONIBLE: { bg: "#dcfce7", text: "#166534" },
  EN_MISSION: { bg: "#dbeafe", text: "#1e40af" },
  MAINTENANCE: { bg: "#fef3c7", text: "#92400e" },
  REFORME: { bg: "#fee2e2", text: "#991b1b" },
};

export default function MissionCard({
  mission,
  positionGps,
}: {
  mission: Mission;
  positionGps?: GpsPosition | null;
}) {
  const v = mission.vehicule;
  const c = mission.chauffeur;
  const enCours = !mission.dateFin;
  const gpsEquipe = Boolean(v?.gpsEquipe || v?.gpsDeviceId != null || positionGps);
  const positionValide =
    gpsEquipe &&
    positionGps?.latitude != null &&
    positionGps.longitude != null &&
    Number.isFinite(Number(positionGps.latitude)) &&
    Number.isFinite(Number(positionGps.longitude)) &&
    !(Number(positionGps.latitude) === 0 && Number(positionGps.longitude) === 0);
  const positionsCarte: GpsPosition[] = positionValide && v && positionGps
    ? [{
        ...positionGps,
        vehiculeId: v.id,
        gpsDeviceId: positionGps.gpsDeviceId || v.gpsDeviceId || v.id,
        immatriculation: positionGps.immatriculation || v.immatriculation,
        latitude: Number(positionGps.latitude),
        longitude: Number(positionGps.longitude),
      }]
    : [];

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

        <div style={{ fontSize: 12, color: "#475569", marginTop: 4, display: "flex", flexDirection: "column", gap: 3 }}>
          <div><span style={{ color: "#1e293b" }}>Début :</span> {formatDate(mission.dateDebut)}</div>
          <div><span style={{ color: "#1e293b" }}>Date fin :</span> {mission.dateFin ? formatDate(mission.dateFin) : <span style={{ color: "#2563eb", fontWeight: 600 }}>En cours d&apos;exécution</span>}</div>
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

      </div>

      <div style={{ height: 220 }}>
        <FlotteMap
          positions={positionsCarte}
          height="100%"
          showHeader={false}
          emptyMessage="GPS indisponible"
        />
      </div>
    </div>
  );
}
