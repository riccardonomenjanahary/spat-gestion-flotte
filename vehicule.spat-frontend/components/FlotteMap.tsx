"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  ZoomControl,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";

import "leaflet/dist/leaflet.css";

// =========================================================
// TYPES : contrat GPS et compatibilité avec les anciennes pages
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
// Ne pas démarrer à 22 : les images satellite utilisées ici ne contiennent
// pas de détails natifs à ce niveau. L'utilisateur peut zoomer jusqu'à 19.
const ZOOM_VEHICULE = 18;
const ZOOM_MAXIMAL = 19;
const ZOOM_NATIF_SATELLITE = 19;
const ZOOM_NATIF_PLAN = 19;

// =========================================================
// VALIDATION ET AFFICHAGE GPS
// =========================================================

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
  const secondes =
    position.timestampGps >= 100_000_000_000
      ? position.timestampGps / 1000
      : position.timestampGps;
  return Date.now() / 1000 - secondes > GPS_STALE_AFTER_SECONDS;
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
  if (positionAncienne(position)) {
    couleur = "#f59e0b";
  } else if (String(position.statutGps || "").toLowerCase() !== "online") {
    couleur = "#dc2626";
  } else if ((position.vitesse ?? 0) > 0) {
    couleur = "#16a34a";
  } else {
    couleur = "#2563eb";
  }

  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:22px;
        height:22px;
        border-radius:50%;
        background:${couleur};
        border:3px solid white;
        box-sizing:border-box;
        box-shadow:0 2px 9px rgba(15,23,42,.38);
      "></div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -13],
  });
}

// =========================================================
// CENTRAGE INITIAL ET SUIVI DU VÉHICULE EN MOUVEMENT
// =========================================================

function AjusterVue({ positions }: { positions: GpsPosition[] }) {
  const map = useMap();
  const vehiculeSuivi = useRef<string | null>(null);
  const dernierePosition = useRef<[number, number] | null>(null);

  const positionsValides = useMemo(
    () => positions.filter(positionValide),
    [positions]
  );

  useEffect(() => {
    if (positionsValides.length === 0) return;

    if (positionsValides.length === 1) {
      const position = positionsValides[0];
      const identifiant = `vehicule-${position.vehiculeId}-gps-${position.gpsDeviceId}`;
      const nouvellesCoordonnees: [number, number] = [
        position.latitude,
        position.longitude,
      ];

      if (vehiculeSuivi.current !== identifiant) {
        vehiculeSuivi.current = identifiant;
        dernierePosition.current = nouvellesCoordonnees;
        map.stop();
        map.setView(nouvellesCoordonnees, ZOOM_VEHICULE, {
          animate: false,
        });
        return;
      }

      const precedente = dernierePosition.current;
      const aBouge =
        precedente === null ||
        precedente[0] !== nouvellesCoordonnees[0] ||
        precedente[1] !== nouvellesCoordonnees[1];
      if (!aBouge) return;

      dernierePosition.current = nouvellesCoordonnees;
      map.stop();
      // panTo conserve le zoom choisi manuellement lors de chaque relevé GPS.
      map.panTo(nouvellesCoordonnees, {
        animate: true,
        duration: 0.6,
        easeLinearity: 0.25,
      });
      return;
    }

    // Pour les pages qui montrent plusieurs véhicules, conserver le cadrage
    // global et ne pas le réinitialiser à chaque polling GPS.
    const identifiants = positionsValides
      .map((p) => `${p.vehiculeId}-${p.gpsDeviceId}`)
      .sort()
      .join("|");
    const identifiantGroupe = `groupe-${identifiants}`;
    if (vehiculeSuivi.current === identifiantGroupe) return;

    vehiculeSuivi.current = identifiantGroupe;
    dernierePosition.current = null;
    const bounds = L.latLngBounds(
      positionsValides.map((p) => [p.latitude, p.longitude])
    );
    map.stop();
    map.fitBounds(bounds, {
      padding: [30, 30],
      maxZoom: ZOOM_VEHICULE,
      animate: false,
    });
  }, [map, positionsValides]);

  return null;
}

// =========================================================
// AFFICHAGE FIABLE APRÈS CHANGEMENT DE TAILLE DU PANNEAU
// =========================================================
function SynchroniserDimensionsCarte() {
  const map = useMap();

  useEffect(() => {
    // React Leaflet doit recalculer la taille réelle du panneau Agent Flotte.
    map.invalidateSize({ pan: false });
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      map.invalidateSize({ pan: false, debounceMoveend: true });
    });
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);

  return null;
}

// =========================================================
// CHOIX DU FOND : accessible à droite (la liste GPS couvre la gauche).
// =========================================================
type FondCarte = "satellite" | "plan";

function ChoixFondCarte({
  fond,
  changerFond,
  satelliteIndisponible,
}: {
  fond: FondCarte;
  changerFond: (fond: FondCarte) => void;
  satelliteIndisponible: boolean;
}) {
  const conteneur = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conteneur.current) L.DomEvent.disableClickPropagation(conteneur.current);
  }, []);

  return (
    <div
      ref={conteneur}
      aria-label="Choisir le fond de carte"
      style={{
        position: "absolute", top: 86, right: 10, zIndex: 1100,
        display: "flex", flexDirection: "column", alignItems: "flex-end",
        gap: 5, maxWidth: "min(300px, calc(100% - 20px))",
      }}
    >
      <div style={{
        display: "flex", padding: 4, gap: 4, background: "white",
        border: "1px solid #cbd5e1", borderRadius: 7,
        boxShadow: "0 1px 8px rgba(0,0,0,.15)",
      }}>
        {(["satellite", "plan"] as const).map((valeur) => (
          <button
            key={valeur}
            type="button"
            aria-pressed={fond === valeur}
            onClick={() => changerFond(valeur)}
            style={{
              padding: "8px 10px", borderRadius: 5, border: 0,
              background: fond === valeur ? "#2563eb" : "#fff",
              color: fond === valeur ? "#fff" : "#334155",
              cursor: "pointer", fontSize: 12, fontWeight: 700,
            }}
          >
            {valeur === "satellite" ? "Satellite" : "Plan"}
          </button>
        ))}
      </div>
      {satelliteIndisponible && fond === "plan" && (
        <div role="status" style={{
          padding: "7px 9px", borderRadius: 6, background: "#fff",
          border: "1px solid #fca5a5", color: "#991b1b",
          fontSize: 11, lineHeight: 1.35, boxShadow: "0 1px 8px rgba(0,0,0,.1)",
        }}>
          Images satellite non chargées. Plan affiché automatiquement.
          Réessayez « Satellite » lorsque la connexion est rétablie.
        </div>
      )}
    </div>
  );
}

// =========================================================
// COMPOSANT CARTE : SATELLITE PAR DÉFAUT, PLAN DISPONIBLE
// =========================================================

export default function FlotteMap({
  positions = [],
  vehicules = [],
  height = 310,
  showHeader = false,
}: FlotteMapProps) {
  const [fond, setFond] = useState<FondCarte>("satellite");
  const [satelliteIndisponible, setSatelliteIndisponible] = useState(false);
  const erreursTuilesSatellite = useRef(0);

  const changerFond = (nouveauFond: FondCarte) => {
    erreursTuilesSatellite.current = 0;
    setSatelliteIndisponible(false);
    setFond(nouveauFond);
  };

  const signalerEchecSatellite = () => {
    erreursTuilesSatellite.current += 1;
    // Évite de passer au plan pour une tuile isolée momentanément absente.
    if (erreursTuilesSatellite.current >= 3) {
      setSatelliteIndisponible(true);
      setFond("plan");
    }
  };
  const positionsFinales = useMemo<GpsPosition[]>(() => {
    if (positions.length > 0) return positions;

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
      <div
        style={{
          height,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px dashed #cbd5e1",
          borderRadius: 10,
          backgroundColor: "#ffffff",
          color: "#64748b",
          fontSize: 12,
          textAlign: "center",
          padding: 20,
          boxSizing: "border-box",
        }}
      >
        Aucune coordonnée GPS exploitable pour ce véhicule.
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      {showHeader && (
        <div
          style={{
            marginBottom: 8,
            color: "#475569",
            fontSize: 12,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {positionsValides.length} véhicule(s) GPS affiché(s)
        </div>
      )}

      <MapContainer
        center={ANTANANARIVO}
        zoom={12}
        minZoom={3}
        maxZoom={ZOOM_MAXIMAL}
        zoomControl={false}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        touchZoom={true}
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          width: "100%",
          borderRadius: 10,
          zIndex: 0,
          backgroundColor: "#e5e7eb",
        }}
      >
        {/* + / − sont à DROITE : à gauche ils étaient masqués par la liste GPS. */}
        <ZoomControl position="topright" />
        <SynchroniserDimensionsCarte />
        <ChoixFondCarte
          fond={fond}
          changerFond={changerFond}
          satelliteIndisponible={satelliteIndisponible}
        />

        {fond === "satellite" ? (
          <TileLayer
            key="fond-satellite"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Imagery &copy; <a href="https://www.esri.com/">Esri</a> — Esri, Maxar, Earthstar Geographics, and the GIS User Community'
            maxNativeZoom={ZOOM_NATIF_SATELLITE}
            maxZoom={ZOOM_MAXIMAL}
            keepBuffer={4}
            eventHandlers={{ tileerror: signalerEchecSatellite }}
          />
        ) : (
          <TileLayer
            key="fond-plan"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxNativeZoom={ZOOM_NATIF_PLAN}
            maxZoom={ZOOM_MAXIMAL}
            keepBuffer={4}
          />
        )}

        <AjusterVue positions={positionsValides} />

        {positionsValides.map((position) => (
          <Marker
            key={`${position.vehiculeId}-${position.gpsDeviceId}`}
            position={[position.latitude, position.longitude]}
            icon={creerIcone(position)}
          >
            <Popup minWidth={245}>
              <div style={{ fontSize: 12, lineHeight: 1.55 }}>
                <strong style={{ fontSize: 14 }}>
                  {position.immatriculation}
                </strong>
                {position.nomGps && (
                  <div style={{ color: "#64748b", marginTop: 2 }}>
                    {position.nomGps}
                  </div>
                )}
                <div style={{ marginTop: 8 }}>
                  <strong>État GPS :</strong> {etatGps(position)}
                </div>
                <div>
                  <strong>Vitesse :</strong>{" "}
                  {Math.round(position.vitesse ?? 0)} km/h
                </div>
                <div>
                  <strong>Kilométrage :</strong>{" "}
                  {formatterKm(position.odometreKm)}
                </div>
                {position.dateGps && (
                  <div>
                    <strong>Dernière position :</strong> {position.dateGps}
                  </div>
                )}
                <div>
                  <strong>Latitude :</strong> {position.latitude.toFixed(6)}
                </div>
                <div>
                  <strong>Longitude :</strong> {position.longitude.toFixed(6)}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
