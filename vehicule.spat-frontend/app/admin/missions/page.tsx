"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import EnTete from "@/components/EnTete";
import type { GpsPosition } from "@/components/FlotteMap";
import FlotteMap from "@/components/FlotteMap";

const MissionCard = dynamic(() => import("@/components/MissionCard"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 220,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#6b7280",
        backgroundColor: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
      }}
    >
      Chargement...
    </div>
  ),
});

interface Vehicule {
  id: number;
  immatriculation: string;

  marque?: string | null;
  modele?: string | null;
  modeleType?: string | null;
  categorie?: string | null;

  statut: string;

  gpsEquipe?: boolean | null;
  gpsDeviceId?: number | null;

  latitude?: number;
  longitude?: number;
  dernierePositionLe?: string;
}

interface Chauffeur {
  id: number;
  matricule?: string | null;
  nom: string;
  prenom: string;
  telephone?: string | null;
  email?: string | null;
  statut: string;
}

interface Mission {
  id: number;

  vehiculeId?: number | null;
  chauffeurId?: number | null;

  vehicule?: Vehicule | null;
  chauffeur?: Chauffeur | null;

  dateDebut?: string | null;
  dateFin?: string | null;

  statut?: string | null;
  typeDemande?: string | null;
  description?: string | null;
  destination?: string | null;
  emailEnvoye?: boolean | null;
  positionGps?: GpsPosition | null;
}

type Filtre = "TOUTES" | "EN_COURS" | "TERMINEE";

export default function MissionsPage() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [missions, setMissions] = useState<Mission[]>([]);
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [positionsGps, setPositionsGps] = useState<GpsPosition[]>([]);

  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);
  const [erreurGps, setErreurGps] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Filtre>("EN_COURS");
  const [recherche, setRecherche] = useState("");
  const [selectionGps, setSelectionGps] = useState<number | null>(null);
  const [vueGps, setVueGps] = useState<"CARTE" | "HISTORIQUE">("CARTE");
  const [dateHistorique, setDateHistorique] = useState(() => {
    const date = new Date();
    return date.toISOString().split('T')[0];
  });
  const [relevesHistorique, setRelevesHistorique] = useState<GpsPosition[]>([]);
  const [chargementHistorique, setChargementHistorique] = useState(false);
  const [erreurHistorique, setErreurHistorique] = useState<string | null>(null);

  const getToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  };

  const lireErreur = async (res: Response) => {
    const texte = await res.text().catch(() => "");

    if (!texte) return `Erreur HTTP ${res.status}`;

    try {
      const json = JSON.parse(texte);
      return json.message || json.erreur || texte;
    } catch {
      return texte;
    }
  };

  const fetchListe = async <T,>(
    url: string,
    token: string
  ): Promise<T[]> => {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(await lireErreur(res));
    }

    const data: unknown = await res.json();

    if (Array.isArray(data)) return data as T[];
    if (data && typeof data === "object" && "content" in data && Array.isArray(data.content)) return data.content as T[];

    throw new Error(`Format de réponse invalide : ${url}`);
  };

  const charger = useCallback(
    async (silencieux = false) => {
      if (!API) {
        if (!silencieux) {
          toast.error("NEXT_PUBLIC_API_URL n'est pas configurée.");
        }

        setChargement(false);
        return;
      }

      const token = getToken();

      if (!token) {
        router.replace("/login");
        return;
      }

      if (!silencieux) setChargement(true);
      setErreurChargement(null);

      try {
        const [m, v, c] = await Promise.all([
          fetchListe<Mission>(`${API}/affectations`, token),
          fetchListe<Vehicule>(`${API}/vehicules`, token),
          fetchListe<Chauffeur>(`${API}/chauffeurs`, token),
        ]);

        setMissions(m);
        setVehicules(v);
        setChauffeurs(c);
      } catch (error) {
        console.error("Erreur chargement missions :", error);
        setErreurChargement(error instanceof Error ? error.message : "Impossible de charger les missions.");

        if (!silencieux) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Impossible de charger les missions."
          );
        }
      } finally {
        if (!silencieux) setChargement(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [API, router]
  );

  const chargerGps = useCallback(async () => {
    if (!API) return;

    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(`${API}/gps/positions`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: unknown = await res.json();
      if (!Array.isArray(data)) throw new Error("Format de réponse GPS invalide.");
      setPositionsGps(data as GpsPosition[]);
      setErreurGps(null);
    } catch (error) {
      console.warn("Actualisation GPS missions indisponible :", error);
      setPositionsGps([]);
      setErreurGps(error instanceof Error ? error.message : "Positions GPS indisponibles.");
    }
  }, [API]);

  const chargerHistoriqueGps = useCallback(async () => {
    if (!API || selectionGps === null) return;

    const token = getToken();
    if (!token) return;

    setChargementHistorique(true);
    setErreurHistorique(null);

    try {
      const res = await fetch(`${API}/gps/historique?vehiculeId=${selectionGps}&date=${dateHistorique}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: unknown = await res.json();
      if (!Array.isArray(data)) throw new Error("Format de réponse historique GPS invalide.");
      setRelevesHistorique(data as GpsPosition[]);
      setErreurHistorique(null);
    } catch (error) {
      console.warn("Actualisation historique GPS indisponible :", error);
      setRelevesHistorique([]);
      setErreurHistorique(error instanceof Error ? error.message : "Historique GPS indisponible.");
    } finally {
      setChargementHistorique(false);
    }
  }, [API, selectionGps, dateHistorique]);

  useEffect(() => {
    let nettoyer: (() => void) | undefined;
    const initialisation = window.setTimeout(() => {
      nettoyer = (() => {
        charger();
        chargerGps();

        const intervalMissions = window.setInterval(() => charger(true), 10000);
        const intervalGps = window.setInterval(chargerGps, 5000);

        return () => {
          window.clearInterval(intervalMissions);
          window.clearInterval(intervalGps);
        };

      })();
    }, 0);
    return () => {
      window.clearTimeout(initialisation);
      nettoyer?.();
    };
  }, [charger, chargerGps]);

  useEffect(() => {
    const initialisation = window.setTimeout(() => {
      if (vueGps === "HISTORIQUE" && selectionGps !== null) {
        chargerHistoriqueGps();
      }

    }, 0);
    return () => window.clearTimeout(initialisation);
  }, [vueGps, selectionGps, dateHistorique, chargerHistoriqueGps]);

  const gpsParVehicule = useMemo(() => {
    const map = new Map<number, GpsPosition>();

    positionsGps.forEach((p) => {
      if (p.vehiculeId != null) {
        map.set(p.vehiculeId, p);
      }
    });

    return map;
  }, [positionsGps]);

  const vehiculesAvecGps = useMemo(() => {
    return vehicules.map((v) => {
      const gps = gpsParVehicule.get(v.id);

      if (!gps || gps.latitude == null || gps.longitude == null) {
        return v;
      }

      return {
        ...v,
        latitude: gps.latitude,
        longitude: gps.longitude,
        dernierePositionLe:
          gps.dateGps ||
          (gps.timestampGps
            ? new Date(gps.timestampGps * 1000).toISOString()
            : undefined),
      };
    });
  }, [vehicules, gpsParVehicule]);

  const idVehiculeMission = (m: Mission) =>
    m.vehiculeId ?? m.vehicule?.id ?? null;

  const idChauffeurMission = (m: Mission) =>
    m.chauffeurId ?? m.chauffeur?.id ?? null;

  const missionEnCours = (m: Mission) => {
    const statut = String(m.statut || "").toUpperCase();

    if (statut === "TERMINEE" || statut === "CLOTUREE") {
      return false;
    }

    if (statut === "ACTIVE" || statut === "EN_COURS") {
      return true;
    }

    return !m.dateFin;
  };

  const missionsEnrichies: Mission[] = useMemo(
    () =>
      missions.map((m) => {
        const vId = idVehiculeMission(m);
        const cId = idChauffeurMission(m);

        return {
          ...m,

          vehiculeId: vId ?? 0,
          chauffeurId: cId ?? 0,
          dateDebut: m.dateDebut ?? "",

          vehicule:
            (vId != null
              ? vehiculesAvecGps.find((v) => v.id === vId)
              : undefined) ||
            m.vehicule ||
            null,

          chauffeur:
            (cId != null
              ? chauffeurs.find((c) => c.id === cId)
              : undefined) ||
            m.chauffeur ||
            null,
          positionGps:
            vId != null
              ? gpsParVehicule.get(vId) ?? null
              : null,
        };
      }),
    [missions, vehiculesAvecGps, chauffeurs, gpsParVehicule]
  );

  const missionsFiltrees = useMemo(() => {
    const terme = recherche.trim().toLowerCase();

    return missionsEnrichies
      .filter((m) => {
        const enCours = missionEnCours(m);

        if (filtre === "EN_COURS" && !enCours) return false;
        if (filtre === "TERMINEE" && enCours) return false;

        if (!terme) return true;

        const nomChauffeur =
          `${m.chauffeur?.prenom || ""} ${m.chauffeur?.nom || ""}`.trim();

        return [
          m.vehicule?.immatriculation,
          m.vehicule?.marque,
          m.vehicule?.modele,
          m.vehicule?.modeleType,
          m.chauffeur?.matricule,
          nomChauffeur,
          m.description,
          m.destination,
          m.statut,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(terme);
      })
      .slice()
      .sort((a, b) =>
        String(b.dateDebut || "").localeCompare(String(a.dateDebut || ""))
      );
  }, [missionsEnrichies, filtre, recherche]);

  const vehiculesDispo = vehicules.filter(
    (v) => String(v.statut || "").toUpperCase() === "DISPONIBLE"
  );

  const missionsActives = missionsEnrichies.filter(missionEnCours);

  const vehiculesEnMissionIds = new Set(
    missionsActives
      .map((m) => idVehiculeMission(m))
      .filter((id): id is number => id != null)
  );

  const missionParVehicule = useMemo(() => {
    const map = new Map<number, Mission>();
    missionsActives.forEach((m) => {
      const vId = idVehiculeMission(m);
      if (vId != null) map.set(vId, m);
    });
    return map;
  }, [missionsActives]);

  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        .mission-kpis {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
        }

        @media (max-width: 900px) {
          .mission-kpis {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 560px) {
          .mission-kpis {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <EnTete afficherNotifications={false} afficherProfil={false} />

      {erreurChargement && (
        <div role="alert" style={{ margin: "12px 24px", padding: 12, border: "1px solid #fecaca", borderRadius: 8, background: "#fef2f2", color: "#991b1b" }}>
          Données missions indisponibles : {erreurChargement}. Les listes ci-dessous ne peuvent pas être considérées comme à jour.
        </div>
      )}
      {erreurGps && <div role="status" style={{ margin: "0 24px 12px", padding: 10, border: "1px solid #fed7aa", borderRadius: 8, background: "#fff7ed", color: "#9a3412" }}>Positions GPS non actualisées : {erreurGps}. Les missions restent disponibles, sans données de position.</div>}

      <main style={pageStyle}>
        <div style={containerStyle}>
          <header style={headerStyle}>
            <div>
              <button type="button" onClick={() => router.push("/admin")} style={retourStyle}>
                ← Retour
              </button>

              <h2 style={titreStyle}>Gestion des flux en temps réel</h2>

            </div>

          </header>

          <section className="mission-kpis" style={{ marginBottom: 23 }}>
            <StatCard titre="Total véhicules" valeur={vehicules.length} />
            <StatCard
              titre="Disponibles"
              valeur={vehiculesDispo.length}
              accent="#16a34a"
            />
            <StatCard
              titre="Missions en cours"
              valeur={missionsActives.length}
              accent="#2563eb"
            />
            <StatCard
              titre="Véhicules engagés"
              valeur={vehiculesEnMissionIds.size}
              accent="#d97706"
            />
          </section>

          <section style={{ display: "flex", gap: 16, marginBottom: 23, minHeight: 500 }}>

            <div style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#475569", marginBottom: 4 }}>
                Véhicules GPS ({positionsGps.length})
              </div>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>
                {selectionGps ? "Cliquez sur 'Tout voir' pour afficher tous les véhicules" : "Sélectionnez un véhicule pour le voir seul sur la carte"}
              </div>
              <input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher véhicule..."
                style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 12 }}
              />
              <button
                type="button"
                onClick={() => setSelectionGps(null)}
                style={{
                  padding: "8px 12px",
                  border: "1px solid #2563eb",
                  borderRadius: 6,
                  background: "#2563eb",
                  color: "#ffffff",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                Tout voir
              </button>
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, maxHeight: 400 }}>
                {positionsGps.map((p) => {
                  const mission = missionParVehicule.get(p.vehiculeId);
                  return (
                    <button
                      key={p.vehiculeId}
                      type="button"
                      onClick={() => setSelectionGps(p.vehiculeId)}
                      style={{
                        padding: "10px 12px",
                        border: selectionGps === p.vehiculeId ? "2px solid #2563eb" : "1px solid #e2e8f0",
                        borderRadius: 8,
                        background: selectionGps === p.vehiculeId ? "#eff6ff" : "#ffffff",
                        cursor: "pointer",
                        textAlign: "left",
                        fontSize: 12,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: 4,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                        <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 13 }}>{p.immatriculation}</div>
                        <div style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: (p.vitesse ?? 0) > 0 ? "#16a34a" : "#2563eb",
                        }} />
                      </div>
                      {p.vitesse != null && (
                        <div style={{ color: "#64748b", fontSize: 11 }}>
                          {Math.round(p.vitesse)} km/h
                        </div>
                      )}
                      {mission && (
                        <div style={{ color: "#475569", fontSize: 11 }}>
                          <span style={{ fontWeight: 600 }}>
                            {mission.typeDemande === "PATROUILLE" ? "Patrouille : " : "Mission : "}
                          </span>
                          {mission.description || mission.destination || "Non renseignée"}
                        </div>
                      )}
                      {p.routeNationale && (
                        <div style={{ color: "#dc2626", fontSize: 11, fontWeight: 600 }}>
                          {p.routeNationale}
                          {p.distanceRouteMetres != null && ` · à ${p.distanceRouteMetres} m`}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", minHeight: 500 }}>
              <FlotteMap
                positions={selectionGps === null ? positionsGps : positionsGps.filter(p => p.vehiculeId === selectionGps)}
                height="100%"
                showHeader={true}
                showFullscreenControl={true}
                emptyMessage="Aucune position GPS disponible pour les véhicules en mission."
              />
            </div>
          </section>

          <div style={filtersStyle}>
            {(["EN_COURS", "TERMINEE", "TOUTES"] as Filtre[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFiltre(f)}
                style={{
                  ...filterButtonStyle,
                  border:
                    filtre === f
                      ? "1px solid #1e293b"
                      : "1px solid #e2e8f0",
                  backgroundColor: filtre === f ? "#1e293b" : "#ffffff",
                  color: filtre === f ? "#ffffff" : "#475569",
                }}
              >
                {f === "EN_COURS"
                  ? "En cours"
                  : f === "TERMINEE"
                  ? "Terminées"
                  : "Toutes"}
              </button>
            ))}

            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher véhicule, chauffeur, destination..."
              style={searchStyle}
            />
          </div>

          {chargement ? (
            <div style={emptyStyle}>Chargement...</div>
          ) : missionsFiltrees.length === 0 ? (
            <div style={emptyStyle}>Aucune mission.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {missionsFiltrees.map((m) => (
                <MissionCard
                  key={m.id}
                  mission={m}
                  positionGps={m.positionGps}
                />
              ))}
            </div>
          )}
        </div>
      </main>

    </>
  );
}

function StatCard({
  titre,
  valeur,
  accent,
}: {
  titre: string;
  valeur: number;
  accent?: string;
}) {
  return (
    <div style={statCardStyle}>
      <div style={statTitleStyle}>{titre}</div>
      <div
        style={{
          ...statValueStyle,
          color: accent || "#1e293b",
        }}
      >
        {valeur}
      </div>
    </div>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  backgroundColor: "#f3f4f6",
  padding: "28px 18px",
  display: "flex",
  flexDirection: "column",
};

const containerStyle: CSSProperties = {
  maxWidth: 1250,
  margin: "0 auto",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 18,
  marginBottom: 23,
  flexWrap: "wrap",
};

const retourStyle: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#64748b",
  cursor: "pointer",
  padding: 0,
  marginBottom: 8,
  fontSize: 13,
};

const titreStyle: CSSProperties = {
  margin: 0,
  color: "#172033",
  fontSize: 26,
};

const sousTitreStyle: CSSProperties = {
  margin: "5px 0 0",
  color: "#64748b",
  fontSize: 13,
};

const statCardStyle: CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 9,
  padding: 18,
};

const statTitleStyle: CSSProperties = {
  color: "#64748b",
  fontSize: 12,
  marginBottom: 7,
};

const statValueStyle: CSSProperties = {
  fontSize: 27,
  fontWeight: 800,
};

const filtersStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 9,
  marginBottom: 16,
  alignItems: "center",
};

const filterButtonStyle: CSSProperties = {
  padding: "8px 15px",
  borderRadius: 10,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
  transition: "all 150ms ease",
};

const searchStyle: CSSProperties = {
  width: 310,
  maxWidth: "100%",
  padding: "9px 11px",
  border: "1px solid #94a3b8",
  borderRadius: 8,
  backgroundColor: "#ffffff",
  color: "#111827",
  fontSize: 13,
};

const emptyStyle: CSSProperties = {
  padding: 38,
  textAlign: "center",
  color: "#64748b",
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 9,
};

