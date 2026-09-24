"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

import "leaflet/dist/leaflet.css";

// =========================================================
// TYPES — mêmes contrats que le composant existant
// =========================================================

export interface GpsPosition {
  vehiculeId: number;
  immatriculation: string;
  gpsDeviceId: number;
  nomGps?: string | null;
  latitude: number | null;
  longitude: number | null;
  vitesse?: number | null;
  course?: number | null;
  altitude?: number | null;
  statutGps?: string | null;
  dateGps?: string | null;
  timestampGps?: number | null;
  odometreKm?: number | null;
  distanceTotale?: number | null;
  derniereReceptionSpat?: number | null;
}

interface VehiculePositionLegacy {
  id: number;
  immatriculation: string;
  modele?: string | null;
  statut?: string | null;
  latitude: number;
  longitude: number;
}

interface FlotteMapProps {
  positions?: GpsPosition[];
  vehicules?: VehiculePositionLegacy[];
  height?: number | string;
  showHeader?: boolean;
}

const ANTANANARIVO: [number, number] = [-18.8792, 47.5079];
const GPS_STALE_AFTER_SECONDS = 5 * 60;

// 21 = vue encore plus rapprochée sur le véhicule sélectionné.
// Les tuiles OSM natives s’arrêtent au niveau 19 : au-delà, Leaflet agrandit
// la carte sans améliorer la précision réelle des coordonnées GPS.
// Le zoom manuel est conservé lors des actualisations GPS toutes les 5 secondes.
const ZOOM_VEHICULE = 21;
const ZOOM_MAX_GROUPE = 17;

function positionValide(
  position: GpsPosition
): position is GpsPosition & { latitude: number; longitude: number } {
  return (
    typeof position.latitude === "number" &&
    typeof position.longitude === "number" &&
    Number.isFinite(position.latitude) &&
    Number.isFinite(position.longitude) &&
    position.latitude >= -90 &&
    position.latitude <= 90 &&
    position.longitude >= -180 &&
    position.longitude <= 180 &&
    !(position.latitude === 0 && position.longitude === 0)
  );
}

function positionAncienne(position: GpsPosition): boolean {
  if (!position.timestampGps) return true;
  const secondes = position.timestampGps > 1e12
    ? position.timestampGps / 1000
    : position.timestampGps;
  const maintenant = Math.floor(Date.now() / 1000);
  return maintenant - secondes > GPS_STALE_AFTER_SECONDS;
}

function etatGps(position: GpsPosition): string {
  if (positionAncienne(position)) return "Dernière position connue";
  const statut = String(position.statutGps || "").toLowerCase();
  if (statut === "online") {
    return (position.vitesse ?? 0) > 0
      ? "En mouvement"
      : "En ligne - à l'arrêt";
  }
  if (statut === "offline") return "Hors ligne";
  return position.statutGps || "Statut inconnu";
}

function formatterKm(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return "Non disponible";
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km`;
}

function creerIcone(position: GpsPosition) {
  let couleur = "#64748b";
  if (positionAncienne(position)) couleur = "#f59e0b";
  else if (String(position.statutGps || "").toLowerCase() !== "online") {
    couleur = "#dc2626";
  } else if ((position.vitesse ?? 0) > 0) couleur = "#16a34a";
  else couleur = "#2563eb";

  return L.divIcon({
    className: "",
    html: `
      <div style="width:22px;height:22px;border-radius:50%;background:${couleur};
        border:3px solid white;box-shadow:0 2px 9px rgba(15,23,42,.38);"></div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -13],
  });
}

// Une nouvelle sélection recadre la carte au niveau de la rue.
// Les actualisations GPS (toutes les 5 s) déplacent les marqueurs,
// mais ne réinitialisent PLUS le zoom manuel de l'utilisateur.
function AjusterVue({ positions }: { positions: GpsPosition[] }) {
  const map = useMap();
  const derniereSelection = useRef<string | null>(null);

  const positionsValides = useMemo(
    () => positions.filter(positionValide),
    [positions]
  );

  useEffect(() => {
    if (positionsValides.length === 0) return;

    const selection = positionsValides
      .map((position) => `${position.vehiculeId}:${position.gpsDeviceId}`)
      .sort()
      .join("|");

    if (derniereSelection.current === selection) return;
    derniereSelection.current = selection;

    if (positionsValides.length === 1) {
      const position = positionsValides[0];
      map.setView([position.latitude, position.longitude], ZOOM_VEHICULE, {
        animate: false,
      });
      return;
    }

    const bounds = L.latLngBounds(
      positionsValides.map((position) => [
        position.latitude,
        position.longitude,
      ])
    );
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: ZOOM_MAX_GROUPE });
  }, [map, positionsValides]);

  return null;
}

export default function FlotteMap({
  positions = [],
  vehicules = [],
  height = 310,
  showHeader = false,
}: FlotteMapProps) {
  const positionsFinales = useMemo<GpsPosition[]>(() => {
    if (positions.length > 0) return positions;

    // Maintien de la compatibilité avec les pages utilisant « vehicules ».
    return vehicules.map((vehicule) => ({
      vehiculeId: vehicule.id,
      gpsDeviceId: vehicule.id,
      immatriculation: vehicule.immatriculation,
      nomGps: vehicule.modele ?? null,
      latitude: vehicule.latitude,
      longitude: vehicule.longitude,
      vitesse: 0,
      statutGps: vehicule.statut ?? null,
      timestampGps: Math.floor(Date.now() / 1000),
    }));
  }, [positions, vehicules]);

  const positionsValides = useMemo(
    () => positionsFinales.filter(positionValide),
    [positionsFinales]
  );

  if (positionsValides.length === 0) {
    return (
      <div style={{
        height, width: "100%", display: "flex", alignItems: "center",
        justifyContent: "center", border: "1px dashed #cbd5e1",
        borderRadius: 10, backgroundColor: "#fff", color: "#64748b",
        fontSize: 12, textAlign: "center", padding: 20,
        boxSizing: "border-box",
      }}>
        Aucune coordonnée GPS exploitable pour ce véhicule.
      </div>
    );
  }

  const centreInitial: [number, number] = positionsValides.length === 1
    ? [positionsValides[0].latitude, positionsValides[0].longitude]
    : ANTANANARIVO;

  return (
    <div style={{ width: "100%" }}>
      {showHeader && (
        <div style={{ marginBottom: 8, color: "#475569", fontSize: 12, fontWeight: 600 }}>
          {positionsValides.length} véhicule(s) GPS affiché(s)
        </div>
      )}

      <MapContainer
        center={centreInitial}
        zoom={positionsValides.length === 1 ? ZOOM_VEHICULE : 12}
        maxZoom={22}
        zoomControl
        scrollWheelZoom
        doubleClickZoom
        style={{ height, width: "100%", borderRadius: 10, zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxNativeZoom={19}
          maxZoom={22}
        />

        <AjusterVue positions={positionsValides} />

        {positionsValides.map((position) => (
          <Marker
            key={position.gpsDeviceId}
            position={[position.latitude, position.longitude]}
            icon={creerIcone(position)}
          >
            <Popup minWidth={245}>
              <div style={{ fontSize: 12, lineHeight: 1.55 }}>
                <strong style={{ fontSize: 14 }}>{position.immatriculation}</strong>
                {position.nomGps && (
                  <div style={{ color: "#64748b", marginTop: 2 }}>
                    {position.nomGps}
                  </div>
                )}
                <div style={{ marginTop: 8 }}>
                  <strong>État GPS :</strong> {etatGps(position)}
                </div>
                <div><strong>Vitesse :</strong> {Math.round(position.vitesse ?? 0)} km/h</div>
                <div><strong>Kilométrage :</strong> {formatterKm(position.odometreKm)}</div>
                {position.dateGps && (
                  <div><strong>Dernière position :</strong> {position.dateGps}</div>
                )}
                <div><strong>Latitude :</strong> {position.latitude.toFixed(6)}</div>
                <div><strong>Longitude :</strong> {position.longitude.toFixed(6)}</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
