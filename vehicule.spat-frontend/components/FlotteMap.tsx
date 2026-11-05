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
import { Maximize2, Minimize2 } from "lucide-react";
import { chercherLieuGps, type LieuGps } from "@/app/lib/gpsLocation";

import "leaflet/dist/leaflet.css";

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
  routeNationale?: string | null;
  distanceRouteMetres?: number | null;
  quartier?: string | null;
  voie?: string | null;
  commune?: string | null;
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
  emptyMessage?: string;
  showFullscreenControl?: boolean;
  focusZoom?: number;
  maxZoom?: number;
  showMapWhenEmpty?: boolean;
  emptyCenter?: [number, number];
  afficherLieu?: boolean;
}

const ANTANANARIVO: [number, number] = [-18.8792, 47.5079];
const GPS_STALE_AFTER_SECONDS = 5 * 60;

const ZOOM_VEHICULE = 18;
const ZOOM_MAXIMAL = 19;
const ZOOM_NATIF_SATELLITE = 17;
const ZOOM_NATIF_PLAN = 19;

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

function AjusterVue({ positions, focusZoom }: { positions: GpsPosition[]; focusZoom: number }) {
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
        map.setView(nouvellesCoordonnees, focusZoom, {
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

      map.panTo(nouvellesCoordonnees, {
        animate: true,
        duration: 0.6,
        easeLinearity: 0.25,
      });
      return;
    }

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
      maxZoom: focusZoom,
      animate: false,
    });
  }, [map, positionsValides, focusZoom]);

  return null;
}

function SynchroniserDimensionsCarte() {
  const map = useMap();

  useEffect(() => {

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

type FondCarte = "satellite" | "plan";

function ChoixFondCarte({
  fond,
  changerFond,
  satelliteIndisponible,
  showFullscreenControl,
}: {
  fond: FondCarte;
  changerFond: (fond: FondCarte) => void;
  satelliteIndisponible: boolean;
  showFullscreenControl: boolean;
}) {
  const conteneur = useRef<HTMLDivElement>(null);
  const map = useMap();
  const [pleinEcran, setPleinEcran] = useState(false);
  const [erreurPleinEcran, setErreurPleinEcran] = useState("");

  useEffect(() => {
    if (conteneur.current) L.DomEvent.disableClickPropagation(conteneur.current);
  }, []);

  useEffect(() => {
    const suivrePleinEcran = () => {
      setPleinEcran(document.fullscreenElement === map.getContainer());
      window.setTimeout(() => map.invalidateSize({ pan: false }), 80);
    };
    document.addEventListener("fullscreenchange", suivrePleinEcran);
    return () => document.removeEventListener("fullscreenchange", suivrePleinEcran);
  }, [map]);

  const basculerPleinEcran = async () => {
    setErreurPleinEcran("");
    try {
      const conteneurCarte = map.getContainer();
      if (document.fullscreenElement === conteneurCarte) {
        await document.exitFullscreen();
      } else if (conteneurCarte.requestFullscreen) {
        await conteneurCarte.requestFullscreen();
      } else {
        setErreurPleinEcran("Le mode plein écran n'est pas pris en charge par ce navigateur.");
      }
    } catch {
      setErreurPleinEcran("Impossible d'ouvrir la carte en plein écran.");
    }
  };

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
      {showFullscreenControl && (
        <button
          type="button"
          onClick={basculerPleinEcran}
          aria-label={pleinEcran ? "Quitter le plein écran" : "Afficher la carte en plein écran"}
          title={pleinEcran ? "Quitter le plein écran (Échap)" : "Afficher la carte en plein écran"}
          style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "8px 10px", borderRadius: 6,
            border: "1px solid #cbd5e1", background: "#fff", color: "#1e293b",
            cursor: "pointer", fontSize: 12, fontWeight: 700,
            boxShadow: "0 1px 8px rgba(0,0,0,.12)",
          }}
        >
          {pleinEcran ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          {pleinEcran ? "Quitter le plein écran" : "Plein écran"}
        </button>
      )}
      {erreurPleinEcran && (
        <div role="status" style={{
          padding: "7px 9px", borderRadius: 6, background: "#fff",
          border: "1px solid #fca5a5", color: "#991b1b", fontSize: 11,
        }}>
          {erreurPleinEcran}
        </div>
      )}
    </div>
  );
}

export default function FlotteMap({
  positions = [],
  vehicules = [],
  height = 310,
  showHeader = false,
  showFullscreenControl = false,
  focusZoom = ZOOM_VEHICULE,
  maxZoom = ZOOM_MAXIMAL,
  emptyMessage = "Aucune coordonnée GPS exploitable pour ce véhicule.",
  showMapWhenEmpty = false,
  emptyCenter = ANTANANARIVO,
  afficherLieu = false,
}: FlotteMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [fond, setFond] = useState<FondCarte>("satellite");
  const [satelliteIndisponible, setSatelliteIndisponible] = useState(false);
  const erreursTuilesSatellite = useRef(0);

  useEffect(() => {
    setIsClient(true);
  }, []);
  const [lieuxGps, setLieuxGps] = useState<Record<number, LieuGps>>({});
  const [lieuGpsNonDisponible, setLieuGpsNonDisponible] = useState<Record<number, boolean>>({});
  const positionsGpsValides = useMemo(() => positions.filter(positionValide), [positions]);
  const clePositionsGps = positionsGpsValides
    .map((position) => `${position.vehiculeId}:${position.latitude.toFixed(4)},${position.longitude.toFixed(4)}`)
    .join("|");

  useEffect(() => {
    if (!afficherLieu) return;
    const positionsAvecCoordonnees = positionsGpsValides
      .filter((position) => !lieuxGps[position.vehiculeId] && !lieuGpsNonDisponible[position.vehiculeId]);
    if (positionsAvecCoordonnees.length === 0) return;

    const controller = new AbortController();
    void (async () => {
      for (const position of positionsAvecCoordonnees) {
        try {
          const lieu = await chercherLieuGps(position.latitude, position.longitude, controller.signal);
          if (controller.signal.aborted) return;
          setLieuxGps((actuels) => ({ ...actuels, [position.vehiculeId]: lieu }));
        } catch (error) {
          if (controller.signal.aborted) return;
          setLieuGpsNonDisponible((actuels) => ({ ...actuels, [position.vehiculeId]: true }));
          if (!(error instanceof DOMException && error.name === "AbortError")) {
            console.warn("Localisation textuelle GPS indisponible:", error);
          }
        }
      }
    })();

    return () => controller.abort();
  }, [afficherLieu, clePositionsGps, lieuxGps, lieuGpsNonDisponible]);

  const changerFond = (nouveauFond: FondCarte) => {
    erreursTuilesSatellite.current = 0;
    setSatelliteIndisponible(false);
    setFond(nouveauFond);
  };

  const signalerEchecSatellite = () => {
    erreursTuilesSatellite.current += 1;

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

  if (!isClient) {
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
          backgroundColor: "#f8fafc",
          color: "#94a3b8",
          fontSize: 12,
          textAlign: "center",
          padding: 20,
          boxSizing: "border-box",
        }}
      >
        Chargement de la carte...
      </div>
    );
  }

  if (positionsValides.length === 0 && !showMapWhenEmpty) {
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
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
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
        center={emptyCenter}
        zoom={12}
        minZoom={3}
        maxZoom={maxZoom}
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

        <ZoomControl position="topright" />
        <SynchroniserDimensionsCarte />
        <ChoixFondCarte
          fond={fond}
          changerFond={changerFond}
          satelliteIndisponible={satelliteIndisponible}
          showFullscreenControl={showFullscreenControl}
        />

        {fond === "satellite" ? (
          <TileLayer
            key="fond-satellite"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Imagery &copy; <a href="https://www.esri.com/">Esri</a> — Esri, Maxar, Earthstar Geographics, and the GIS User Community'
            maxNativeZoom={ZOOM_NATIF_SATELLITE}
            maxZoom={maxZoom}
            keepBuffer={4}
            eventHandlers={{ tileerror: signalerEchecSatellite }}
          />
        ) : (
          <TileLayer
            key="fond-plan"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxNativeZoom={ZOOM_NATIF_PLAN}
            maxZoom={maxZoom}
            keepBuffer={4}
          />
        )}

        <AjusterVue positions={positionsValides} focusZoom={focusZoom} />

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
                  <span>État GPS :</span> {etatGps(position)}
                </div>
                <div>
                  <span>Vitesse :</span>{" "}
                  {Math.round(position.vitesse ?? 0)} km/h
                </div>
                <div>
                  <span>Kilométrage :</span>{" "}
                  {formatterKm(position.odometreKm)}
                </div>
                {position.dateGps && (
                  <div>
                    <span>Dernière position :</span> {position.dateGps}
                  </div>
                )}
                <div>
                  <span>Latitude :</span> {position.latitude.toFixed(6)}
                </div>
                <div>
                  <span>Longitude :</span> {position.longitude.toFixed(6)}
                </div>
                {(position.quartier || lieuxGps[position.vehiculeId]?.quartier) && (
                  <div>
                    <span>Quartier :</span> {position.quartier || lieuxGps[position.vehiculeId]?.quartier}
                  </div>
                )}
                {(position.routeNationale || position.voie || lieuxGps[position.vehiculeId]?.route) && (
                  <div>
                    <strong>{position.routeNationale || /\bRN\s*[-.]?\s*\d/i.test(lieuxGps[position.vehiculeId]?.route || "") ? "Route nationale :" : "Voie :"}</strong>{" "}
                    {position.routeNationale || position.voie || lieuxGps[position.vehiculeId]?.route}
                    {position.distanceRouteMetres != null && ` · à ${position.distanceRouteMetres} m`}
                  </div>
                )}
                {(position.commune || lieuxGps[position.vehiculeId]?.commune) && (
                  <div>
                    <span>Commune :</span> {position.commune || lieuxGps[position.vehiculeId]?.commune}
                  </div>
                )}
                {afficherLieu && !lieuxGps[position.vehiculeId] && !position.quartier && !position.routeNationale && !position.voie && (
                  <div style={{ color: "#64748b", marginTop: 6 }}>
                    {lieuGpsNonDisponible[position.vehiculeId] ? "Lieu détaillé indisponible." : "Recherche du quartier et de la voie…"}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {positionsValides.length === 0 && showMapWhenEmpty && (
        <div
          role="status"
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 1200,
            maxWidth: "calc(100% - 24px)",
            padding: "9px 12px",
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            background: "rgba(255,255,255,.94)",
            color: "#475569",
            fontSize: 12,
            boxShadow: "0 2px 8px rgba(15,23,42,.12)",
            pointerEvents: "none",
          }}
        >
          {emptyMessage}
        </div>
      )}
    </div>
  );
}
