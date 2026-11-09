"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ChevronDown, MapPin, Search, Users, X } from "lucide-react";
import type { GpsPosition } from "@/components/FlotteMap";

const FlotteMap = dynamic(() => import("@/components/FlotteMap"), { ssr: false });

export type VehiculeCarteGps = {
  id: number;
  immatriculation: string;
  marque?: string | null;
  modele?: string | null;
  modeleType?: string | null;
  categorie?: string | null;
  gpsEquipe?: boolean | null;
  gpsDeviceId?: number | null;
};

export type MissionCarteGps = {
  vehiculeId?: number | null;
  vehicule?: { id: number } | null;
  typeMission?: string | null;
  zoneMission?: string | null;
  typeDemande?: string | null;
  demandeUrgente?: boolean | null;
  statut?: string | null;
  dateDebut?: string | null;
  dateFin?: string | null;
  motif?: string | null;
  description?: string | null;
  destination?: string | null;
};

function libelleTypeMission(mission: MissionCarteGps | null) {
  if (!mission) return "Aucune mission active";
  const type = String(mission.typeMission || "").trim().toUpperCase();
  const zone = String(mission.zoneMission || "").trim().toUpperCase();
  const demande = String(mission.typeDemande || "").trim().toUpperCase();

  if (type === "PATROUILLE") return "Patrouille";
  if (type === "URGENCE" || mission.demandeUrgente === true || demande === "URGENTE") return "Urgence";
  if (zone === "VILLE_TOAMASINA") return "Mission en ville";
  if (zone === "HORS_TOAMASINA") return "Mission hors ville";
  return "Type non renseigné";
}

function libelleZoneMission(mission: MissionCarteGps | null) {
  if (!mission) return "";
  const zone = String(mission.zoneMission || "").trim().toUpperCase();
  if (zone === "VILLE_TOAMASINA") return "Toamasina";
  if (zone === "HORS_TOAMASINA") return "Hors Toamasina";
  return "";
}

function libelleStatutMission(mission: MissionCarteGps | null) {
  if (!mission?.statut) return "";
  const statut = mission.statut.trim().toUpperCase();
  if (statut === "VALIDEE") return "En cours";
  return statut.replaceAll("_", " ").toLocaleLowerCase("fr-FR");
}

function nomModele(vehicule: VehiculeCarteGps) {
  const valeurs = [vehicule.marque, vehicule.modele, vehicule.modeleType, vehicule.categorie]
    .map((v) => v?.trim())
    .filter(Boolean);
  return [...new Set(valeurs)].join(" ") || "—";
}

function formatterKmCourt(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km`;
}

function formaterDateHeureGps(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function gpsConnecte(position?: GpsPosition | null) {
  const statut = String(position?.statutGps || "").toLowerCase();
  if (statut.includes("hors") || statut.includes("offline") || statut.includes("inactif")) {
    return false;
  }
  if (position?.latitude != null && position?.longitude != null) return true;
  return statut.includes("en ligne") || statut.includes("online") || statut.includes("connect");
}

export default function CarteGpsFlotte({
  vehicules,
  positionsGps,
  missionsActives = [],
  erreurGps = null,
  masquerListeVehicules = false,
  afficherLieu = false,
}: {
  vehicules: VehiculeCarteGps[];
  positionsGps: GpsPosition[];
  missionsActives?: MissionCarteGps[];
  erreurGps?: string | null;
  masquerListeVehicules?: boolean;
  afficherLieu?: boolean;
}) {
  const gpsParVehicule = useMemo(() => {
    const map = new Map<number, GpsPosition>();
    positionsGps.forEach((p) => {
      if (p.vehiculeId != null) map.set(p.vehiculeId, p);
    });
    return map;
  }, [positionsGps]);

  const vehiculesGps = useMemo(
    () =>
      vehicules.filter(
        (v) =>
          v.gpsEquipe === true ||
          v.gpsDeviceId != null ||
          gpsParVehicule.has(v.id)
      ),
    [vehicules, gpsParVehicule]
  );

  const missionParVehicule = useMemo(() => {
    const map = new Map<number, MissionCarteGps>();
    missionsActives.forEach((m) => {
      const id = m.vehiculeId ?? m.vehicule?.id ?? null;
      if (id != null && !map.has(id)) map.set(id, m);
    });
    return map;
  }, [missionsActives]);

  const [selection, setSelection] = useState<number | null>(null);
  const [versionCentrage, setVersionCentrage] = useState(0);
  const [recherche, setRecherche] = useState("");
  const [listeOuverte, setListeOuverte] = useState(true);

  useEffect(() => {
    const initialisation = window.setTimeout(() => {
      if (vehiculesGps.length === 0) {
        setSelection(null);
        return;
      }
      if (selection == null || !vehiculesGps.some((v) => v.id === selection)) {
        setSelection(vehiculesGps[0].id);
      }

    }, 0);
    return () => window.clearTimeout(initialisation);
  }, [vehiculesGps, selection]);

  const vehiculesFiltres = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    if (!terme) return vehiculesGps;
    return vehiculesGps.filter((v) =>
      [v.immatriculation, v.marque, v.modele, v.modeleType]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(terme)
    );
  }, [vehiculesGps, recherche]);

  const vehiculeSelectionne = vehiculesGps.find((v) => v.id === selection) || null;
  const positionSelectionnee = vehiculeSelectionne
    ? gpsParVehicule.get(vehiculeSelectionne.id) || null
    : null;

  const positionsCartographie = useMemo(() => {
    if (selection === null) return [];
    const p = gpsParVehicule.get(selection);
    if (!p) return [];
    const latitude = p.latitude == null ? NaN : Number(p.latitude);
    const longitude = p.longitude == null ? NaN : Number(p.longitude);
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 ||
      Math.abs(longitude) > 180 ||
      (latitude === 0 && longitude === 0)
    ) {
      return [];
    }
    return [{ ...p, latitude, longitude, gpsDeviceId: p.gpsDeviceId ?? p.vehiculeId }];
  }, [selection, gpsParVehicule]);

  const dateSelection =
    positionSelectionnee?.dateGps ||
    (positionSelectionnee?.timestampGps
      ? new Date(positionSelectionnee.timestampGps * 1000).toISOString()
      : null);
  const missionSelection = vehiculeSelectionne
    ? missionParVehicule.get(vehiculeSelectionne.id) || null
    : null;

  return (
    <section className={`suivi-panel spat-carte-gps-flotte ${masquerListeVehicules ? "singleVehicle" : ""}`} style={{ height: 560, minHeight: 420 }}>
      <style>{`
        .spat-carte-gps-flotte { display: flex; flex-direction: column; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
        .spat-carte-gps-flotte .gps-content { position: relative; width: 100%; flex: 1 1 auto; min-height: 0; overflow: hidden; }
        .spat-carte-gps-flotte .gps-map { position: absolute; inset: 0; width: 100%; height: 100%; overflow: hidden; background: #dbe3e8; z-index: 1; }
        .spat-carte-gps-flotte .gps-map > div { width: 100% !important; height: 100% !important; min-height: 0 !important; border-radius: 0 !important; }
        .spat-carte-gps-flotte .gps-list { position: absolute; left: 7px; top: 7px; bottom: 7px; width: 390px; max-width: calc(100vw - 20px); min-height: 0; display: flex; flex-direction: column; background: rgba(255,255,255,.98); border: 1px solid #d9e0e7; border-radius: 7px; box-shadow: 0 2px 12px rgba(15,23,42,.20); overflow: hidden; z-index: 30; }
        .spat-carte-gps-flotte .gps-list-header { flex: 0 0 47px; display: flex; align-items: center; justify-content: space-between; padding: 0 10px 0 16px; border-bottom: 1px solid #e2e8f0; background: #ffffff; }
        .spat-carte-gps-flotte .gps-list-header strong { color: #334155; font-size: 15px; font-weight: 700; }
        .spat-carte-gps-flotte .gps-list-close { width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; border: 0; border-radius: 5px; background: transparent; color: #334155; cursor: pointer; }
        .spat-carte-gps-flotte .gps-search-row { flex: 0 0 58px; display: grid; grid-template-columns: minmax(0,1fr) 42px; gap: 8px; padding: 8px 12px 9px; background: #fff; }
        .spat-carte-gps-flotte .gps-search { height: 37px; display: flex; align-items: center; gap: 9px; padding: 0 11px; border: 1px solid #edf1f5; border-radius: 6px; background: #f7f9fb; color: #64748b; }
        .spat-carte-gps-flotte .gps-search input { width: 100%; height: 100%; min-width: 0; padding: 0; border: 0; outline: 0; background: transparent; color: #334155; font-size: 12px; }
        .spat-carte-gps-flotte .gps-filter-button { height: 37px; display: inline-flex; align-items: center; justify-content: center; border: 0; border-radius: 6px; background: #2563eb; color: #ffffff; cursor: pointer; }
        .spat-carte-gps-flotte .gps-list-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; background: #fff; }
        .spat-carte-gps-flotte .gps-list-item { width: 100%; min-height: 53px; display: flex; align-items: center; gap: 9px; padding: 6px 14px; border: 0; border-top: 1px solid #f0f3f6; background: #fff; text-align: left; cursor: pointer; }
        .spat-carte-gps-flotte .gps-list-item.selected { background: #f7fbff; box-shadow: inset 3px 0 0 #1597df; }
        .spat-carte-gps-flotte .gps-list-check { width: 20px; height: 20px; flex: 0 0 20px; display: inline-flex; align-items: center; justify-content: center; border-radius: 2px; background: #1597df; color: #fff; font-size: 14px; font-weight: 800; }
        .spat-carte-gps-flotte .gps-list-info { min-width: 0; flex: 1 1 auto; display: flex; flex-direction: column; gap: 2px; }
        .spat-carte-gps-flotte .gps-list-info strong { color: #334155; font-size: 13px; }
        .spat-carte-gps-flotte .gps-list-info span { color: #64748b; font-size: 11px; }
        .spat-carte-gps-flotte .gps-list-dot { width: 12px; height: 12px; flex: 0 0 12px; border-radius: 50%; background: #ef4444; }
        .spat-carte-gps-flotte .gps-list-dot.connected { background: #16a34a; }
        .spat-carte-gps-flotte .gps-selected-info { position: absolute; left: 410px; right: 18px; bottom: 14px; min-height: 96px; display: flex; align-items: stretch; background: rgba(255,255,255,.96); border: 1px solid #dce3ea; border-radius: 8px; box-shadow: 0 3px 14px rgba(15,23,42,.18); overflow: hidden; z-index: 25; }
        .spat-carte-gps-flotte .gps-selected-vehicle { width: 220px; min-width: 220px; padding: 12px 15px; border-right: 1px solid #e5e7eb; }
        .spat-carte-gps-flotte .gps-selected-vehicle strong { display: block; color: #334155; font-size: 14px; }
        .spat-carte-gps-flotte .gps-selected-vehicle span { display: block; margin-top: 3px; color: #64748b; font-size: 11px; }
        .spat-carte-gps-flotte .gps-selected-grid { flex: 1; min-width: 0; display: grid; grid-template-columns: repeat(5,minmax(90px,1fr)); }
        .spat-carte-gps-flotte .gps-info { min-width: 0; padding: 10px 12px; display: flex; flex-direction: column; justify-content: center; gap: 3px; border-right: 1px solid #f1f5f9; }
        .spat-carte-gps-flotte .gps-info span { color: #94a3b8; font-size: 9px; }
        .spat-carte-gps-flotte .gps-info strong { color: #475569; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .spat-carte-gps-flotte .gps-list-reopen { position: absolute; left: 10px; top: 10px; z-index: 35; width: 42px; height: 38px; display: inline-flex; align-items: center; justify-content: center; border: 0; border-radius: 6px; background: #2563eb; color: #ffffff; cursor: pointer; }
        .spat-carte-gps-flotte.singleVehicle .gps-selected-info { left: 18px; }
        .spat-carte-gps-flotte .gps-no-position { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; background: #e8edf1; }
        .spat-carte-gps-flotte .gps-no-position strong { margin-top: 10px; color: #475569; font-size: 14px; }
        .spat-carte-gps-flotte .gps-no-position span { max-width: 380px; margin-top: 5px; color: #94a3b8; font-size: 11px; }
        .spat-carte-gps-flotte .gps-list-empty { padding: 30px 15px; color: #94a3b8; text-align: center; font-size: 11px; }
        @media (max-width: 900px) {
          .spat-carte-gps-flotte .gps-list { width: 340px; }
          .spat-carte-gps-flotte .gps-selected-info { left: 360px; }
        }
        @media (max-width: 650px) {
          .spat-carte-gps-flotte .gps-selected-info { display: none; }
        }
      `}</style>

      <div className="gps-content">
        <div className="gps-map">
          {positionsCartographie.length > 0 ? (
            <FlotteMap
              key={`vehicule-${selection ?? "aucun"}-centrage-${versionCentrage}`}
              positions={positionsCartographie}
              height="100%"
              showHeader={false}
              afficherLieu={afficherLieu}
            />
          ) : (
            <div className="gps-no-position">
              <MapPin size={38} />
              <strong>
                {erreurGps
                  ? "Service GPS momentanément indisponible"
                  : "Aucune position GPS disponible"}
              </strong>
              <span>
                {erreurGps ||
                  (vehiculeSelectionne
                    ? `Aucune coordonnée GPS valide pour ${vehiculeSelectionne.immatriculation}.`
                    : "Les véhicules équipés GPS apparaîtront automatiquement sur la carte.")}
              </span>
            </div>
          )}
        </div>

        {!masquerListeVehicules && listeOuverte ? (
          <aside className="gps-list">
            <div className="gps-list-header">
              <strong>Véhicules équipés GPS ({vehiculesGps.length})</strong>
              <button
                type="button"
                className="gps-list-close"
                aria-label="Fermer la liste des véhicules GPS"
                onClick={() => setListeOuverte(false)}
              >
                <X size={17} />
              </button>
            </div>
            <div className="gps-search-row">
              <div className="gps-search">
                <Search size={17} />
                <input
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  placeholder="Rechercher un véhicule..."
                  aria-label="Rechercher un véhicule GPS"
                />
              </div>
              <button type="button" className="gps-filter-button" title="Filtrer">
                <ChevronDown size={17} />
              </button>
            </div>
            <div className="gps-list-scroll">
              {vehiculesFiltres.length === 0 ? (
                <div className="gps-list-empty">
                  {vehiculesGps.length === 0
                    ? "Aucun véhicule GPS enregistré."
                    : "Aucun véhicule ne correspond à la recherche."}
                </div>
              ) : (
                vehiculesFiltres.map((v) => {
                  const p = gpsParVehicule.get(v.id);
                  const selected = selection === v.id;
                  const online = gpsConnecte(p);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      className={`gps-list-item ${selected ? "selected" : ""}`}
                      onClick={() => {
                        setSelection(v.id);
                        setVersionCentrage((n) => n + 1);
                      }}
                    >
                      {selected ? <span className="gps-list-check">✓</span> : <span style={{ width: 20 }} />}
                      <span className="gps-list-info">
                        <strong>{v.immatriculation}</strong>
                        <span>{nomModele(v)}</span>
                      </span>
                      <span className={`gps-list-dot ${online ? "connected" : "offline"}`} />
                    </button>
                  );
                })
              )}
            </div>
          </aside>
        ) : !masquerListeVehicules ? (
          <button
            type="button"
            className="gps-list-reopen"
            onClick={() => setListeOuverte(true)}
            title="Afficher les véhicules GPS"
          >
            <Users size={17} />
            {vehiculesGps.length}
          </button>
        ) : null}

        {vehiculeSelectionne && (
          <div className="gps-selected-info">
            <div className="gps-selected-vehicle">
              <strong>{vehiculeSelectionne.immatriculation}</strong>
              <span>{nomModele(vehiculeSelectionne)}</span>
            </div>
            <div className="gps-selected-grid">
              <div className="gps-info">
                <span>État GPS</span>
                <strong>{positionSelectionnee?.statutGps || "Hors ligne"}</strong>
              </div>
              <div className="gps-info">
                <span>Vitesse</span>
                <strong>{`${Math.round(Number(positionSelectionnee?.vitesse) || 0)} km/h`}</strong>
              </div>
              <div className="gps-info">
                <span>Kilométrage</span>
                <strong>{formatterKmCourt(positionSelectionnee?.odometreKm)}</strong>
              </div>
              <div className="gps-info">
                <span>Dernière position</span>
                <strong>{dateSelection ? formaterDateHeureGps(dateSelection) : "—"}</strong>
              </div>
              <div className="gps-info">
                <span>Mission</span>
                <strong>
                  {libelleTypeMission(missionSelection)}
                </strong>
                <span>
                  {[libelleZoneMission(missionSelection), libelleStatutMission(missionSelection)]
                    .filter(Boolean)
                    .join(" · ") || missionSelection?.destination || "Aucune affectation de mission"}
                </span>
                {missionSelection?.destination && (
                  <span title={missionSelection.destination}>Destination : {missionSelection.destination}</span>
                )}
                {(missionSelection?.motif || missionSelection?.description) && (
                  <span title={missionSelection.motif || missionSelection.description || undefined}>
                    Objet : {missionSelection.motif || missionSelection.description}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
