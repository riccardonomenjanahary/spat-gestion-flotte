"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import EnTete from "@/components/EnTete";

const MissionCard = dynamic<any>(() => import("@/components/MissionCard"), {
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

interface GpsPosition {
  vehiculeId: number;
  immatriculation: string;
  latitude: number | null;
  longitude: number | null;

  vitesse?: number | null;
  statutGps?: string | null;
  dateGps?: string | null;
  timestampGps?: number | null;
  derniereReceptionSpat?: number | null;
}

interface Mission {
  id: number;

  /*
   * Compatibilité avec les deux formes JSON :
   * - IDs directs
   * - objets JPA véhicule/chauffeur
   */
  vehiculeId?: number | null;
  chauffeurId?: number | null;

  vehicule?: Vehicule | null;
  chauffeur?: Chauffeur | null;

  dateDebut?: string | null;
  dateFin?: string | null;

  statut?: string | null;
  description?: string | null;
  destination?: string | null;
  emailEnvoye?: boolean | null;
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
  const [filtre, setFiltre] = useState<Filtre>("EN_COURS");
  const [recherche, setRecherche] = useState("");

  const [formOuvert, setFormOuvert] = useState(false);
  const [vehiculeId, setVehiculeId] = useState<number | "">("");
  const [chauffeurId, setChauffeurId] = useState<number | "">("");
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setRole(localStorage.getItem("role"));
  }, []);

  const lectureSeule = role === "DIRECTEUR_DFP";

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

    const data = await res.json();

    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.content)) return data.content;

    return [];
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

    /*
     * Le GPS est un enrichissement uniquement.
     * Une erreur GPS ne doit jamais empêcher la liste des missions
     * et des affectations de fonctionner.
     */
    try {
      const res = await fetch(`${API}/gps/positions`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (!res.ok) return;

      const data = await res.json();

      setPositionsGps(Array.isArray(data) ? data : []);
    } catch (error) {
      console.warn("Actualisation GPS missions indisponible :", error);
    }
  }, [API]);

  useEffect(() => {
    charger();
    chargerGps();

    const intervalMissions = window.setInterval(() => charger(true), 10000);
    const intervalGps = window.setInterval(chargerGps, 5000);

    return () => {
      window.clearInterval(intervalMissions);
      window.clearInterval(intervalGps);
    };
  }, [charger, chargerGps]);

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

          // Normalisation pour rester compatible avec MissionCard
          // même si l'API renvoie des objets JPA imbriqués.
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
        };
      }),
    [missions, vehiculesAvecGps, chauffeurs]
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

  const chauffeursDispo = chauffeurs.filter((c) =>
    ["DISPONIBLE", "SUR_PLACE"].includes(
      String(c.statut || "").toUpperCase()
    )
  );

  const missionsActives = missionsEnrichies.filter(missionEnCours);

  const vehiculesEnMissionIds = new Set(
    missionsActives
      .map((m) => idVehiculeMission(m))
      .filter((id): id is number => id != null)
  );

  const handleCreer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (lectureSeule || !API) return;

    if (!vehiculeId || !chauffeurId) {
      toast.error("Véhicule et chauffeur sont obligatoires.");
      return;
    }

    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    setLoadingSubmit(true);

    try {
      /*
       * On conserve exactement le contrat déjà utilisé
       * par le backend des affectations.
       */
      const res = await fetch(`${API}/affectations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({
          vehiculeId,
          chauffeurId,
        }),
      });

      if (!res.ok) {
        toast.error(await lireErreur(res));
        return;
      }

      toast.success("Mission démarrée.");

      setFormOuvert(false);
      setVehiculeId("");
      setChauffeurId("");

      await charger();
    } catch {
      toast.error("Impossible de contacter le serveur.");
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleTerminer = (m: Mission) => {
    if (lectureSeule || !API) return;

    toast("Terminer cette mission ?", {
      description:
        "Le véhicule et le chauffeur repasseront disponibles selon les règles du backend.",
      action: {
        label: "Terminer",
        onClick: async () => {
          const token = getToken();

          if (!token) {
            router.replace("/login");
            return;
          }

          try {
            const res = await fetch(`${API}/affectations/${m.id}/terminer`, {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
              },
            });

            if (!res.ok) {
              toast.error(await lireErreur(res));
              return;
            }

            toast.success("Mission terminée.");
            await charger();
          } catch {
            toast.error("Impossible de contacter le serveur.");
          }
        },
      },
    });
  };

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

      <main style={pageStyle}>
        <div style={containerStyle}>
          <header style={headerStyle}>
            <div>
              <button type="button" onClick={() => router.push("/admin")} style={retourStyle}>
                ← Retour
              </button>

              <h2 style={titreStyle}>Gestion des flux en temps réel</h2>

             
            </div>

            <div style={{ display: "flex", gap: 9 }}>
              <button
                type="button"
                onClick={() => {
                  charger();
                  chargerGps();
                }}
                style={secondaryButton}
              >
                Actualiser
              </button>

              {!lectureSeule && (
                <button
                  type="button"
                  onClick={() => {
                    setVehiculeId("");
                    setChauffeurId("");
                    setFormOuvert(true);
                  }}
                  style={primaryButton}
                >
                  + Nouvelle mission
                </button>
              )}
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
                  onTerminer={lectureSeule ? undefined : handleTerminer}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {formOuvert && !lectureSeule && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <div>
                <h3 style={modalTitleStyle}>Nouvelle mission</h3>
                <p style={modalSubtitleStyle}>
                  Les listes utilisent les véhicules et chauffeurs réellement
                  disponibles dans le système.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setFormOuvert(false)}
                style={closeButtonStyle}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreer}>
              <label style={{ display: "block", marginBottom: 14 }}>
                <span style={labelStyle}>Véhicule disponible *</span>

                <select
                  value={vehiculeId}
                  onChange={(e) =>
                    setVehiculeId(e.target.value ? Number(e.target.value) : "")
                  }
                  required
                  style={inputStyle}
                >
                  <option value="">Sélectionner</option>

                  {vehiculesDispo.map((v) => (
                    <option key={v.id} value={v.id}>
                      {libelleVehicule(v)}
                    </option>
                  ))}
                </select>

                {vehiculesDispo.length === 0 && (
                  <p style={errorHintStyle}>Aucun véhicule disponible.</p>
                )}
              </label>

              <label style={{ display: "block" }}>
                <span style={labelStyle}>Chauffeur disponible *</span>

                <select
                  value={chauffeurId}
                  onChange={(e) =>
                    setChauffeurId(e.target.value ? Number(e.target.value) : "")
                  }
                  required
                  style={inputStyle}
                >
                  <option value="">Sélectionner</option>

                  {chauffeursDispo.map((c) => (
                    <option key={c.id} value={c.id}>
                      {libelleChauffeur(c)}
                    </option>
                  ))}
                </select>

                {chauffeursDispo.length === 0 && (
                  <p style={errorHintStyle}>Aucun chauffeur disponible.</p>
                )}
              </label>

              <div style={modalActionsStyle}>
                <button
                  type="button"
                  onClick={() => setFormOuvert(false)}
                  style={secondaryButton}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={loadingSubmit || !vehiculeId || !chauffeurId}
                  style={{
                    ...primaryButton,
                    opacity:
                      loadingSubmit || !vehiculeId || !chauffeurId ? 0.6 : 1,
                  }}
                >
                  {loadingSubmit ? "Création..." : "Démarrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function libelleVehicule(v: Vehicule) {
  const modele =
    [v.marque, v.modele, v.modeleType, v.categorie]
      .map((x) => x?.trim())
      .filter(Boolean)
      .filter((x, i, tab) => tab.indexOf(x) === i)
      .join(" ") || "";

  return modele ? `${v.immatriculation} — ${modele}` : v.immatriculation;
}

function libelleChauffeur(c: Chauffeur) {
  const nom = `${c.prenom || ""} ${c.nom || ""}`.trim();

  if (nom && c.matricule) return `${nom} — ${c.matricule}`;
  return nom || c.matricule || `Chauffeur #${c.id}`;
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
  padding: "7px 13px",
  borderRadius: 999,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
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

const primaryButton: CSSProperties = {
  padding: "10px 16px",
  border: "1px solid #dc2626",
  borderRadius: 8,
  backgroundColor: "#dc2626",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 700,
};

const secondaryButton: CSSProperties = {
  padding: "10px 14px",
  border: "1px solid #2563eb",
  borderRadius: 8,
  backgroundColor: "#2563eb",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 700,
};

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  padding: 20,
  backgroundColor: "rgba(15,23,42,.65)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalStyle: CSSProperties = {
  width: "100%",
  maxWidth: 480,
  padding: 26,
  borderRadius: 12,
  backgroundColor: "#ffffff",
  boxShadow: "0 20px 60px rgba(0,0,0,.25)",
};

const modalHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 15,
  marginBottom: 20,
};

const modalTitleStyle: CSSProperties = {
  margin: 0,
  color: "#111827",
  fontSize: 20,
};

const modalSubtitleStyle: CSSProperties = {
  margin: "5px 0 0",
  color: "#64748b",
  fontSize: 12,
  lineHeight: 1.5,
};

const closeButtonStyle: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#64748b",
  cursor: "pointer",
  fontSize: 24,
};

const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: 6,
  color: "#374151",
  fontSize: 12,
  fontWeight: 700,
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 11px",
  border: "1px solid #94a3b8",
  borderRadius: 8,
  backgroundColor: "#ffffff",
  color: "#111827",
  fontSize: 13,
};

const errorHintStyle: CSSProperties = {
  margin: "5px 0 0",
  color: "#dc2626",
  fontSize: 11,
};

const modalActionsStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 20,
};

