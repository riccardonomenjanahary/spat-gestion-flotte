"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import EnTete from "@/components/EnTete";

interface Vehicule {
  id: number;
  immatriculation: string;
  marque?: string | null;
  modele?: string | null;
  modeleType?: string | null;
  categorie?: string | null;
  statut: string;
}

interface Maintenance {
  id: string;

  vehicule?: Vehicule | null;

  reservationId?: number | null;
  reservation?: {
    id: number;
  } | null;

  natureIntervention: string;
  statut: string;

  avisTexte?: string | null;
  avisDate?: string | null;
  avisAuteurEmail?: string | null;
  dateAvisdid?: string | null;

  mecanicienEmail?: string | null;
  diagnosticVisuel?: string | null;
  observationsMecanicien?: string | null;
  piecesNecessaires?: string | null;
  decisiondid?: string | null;

  priorite?: string | null;
  prestataire?: string | null;
  dateIntervention?: string | null;

  dateCreation?: string | null;
  dateCloture?: string | null;
}

export default function MaintenancePage() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);

  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("TOUS");

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

  const fetchListe = async <T,>(url: string, token: string): Promise<T[]> => {
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
    if (!Array.isArray(data)) throw new Error("Format de réponse maintenances invalide.");
    return data as T[];
  };

  const charger = async (silencieux = false) => {
    if (!API) {
      setErreurChargement("NEXT_PUBLIC_API_URL n'est pas configurée.");
      if (!silencieux) toast.error("NEXT_PUBLIC_API_URL n'est pas configurée.");
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
      const [m] = await Promise.all([
        fetchListe<Maintenance>(`${API}/maintenances`, token),
      ]);

      setMaintenances(m);
    } catch (error) {
      console.error("Erreur chargement maintenances :", error);
      if (!silencieux) setMaintenances([]);
      setErreurChargement(error instanceof Error ? error.message : "Données de maintenance indisponibles.");

      if (!silencieux) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Impossible de charger les maintenances."
        );
      }
    } finally {
      if (!silencieux) setChargement(false);
    }
  };

  useEffect(() => {
    let nettoyer: (() => void) | undefined;
    const initialisation = window.setTimeout(() => {
      nettoyer = (() => {
        charger();

        const interval = window.setInterval(() => {
          charger(true);
        }, 15000);

        return () => window.clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps

      })();
    }, 0);
    return () => {
      window.clearTimeout(initialisation);
      nettoyer?.();
    };
  }, []);

  const maintenancesFiltrees = useMemo(() => {
    const terme = recherche.trim().toLowerCase();

    return maintenances
      .filter((m) => {
        const statut = String(m.statut || "").toUpperCase();

        if (filtreStatut !== "TOUS" && statut !== filtreStatut) {
          return false;
        }

        if (!terme) return true;

        const reservationLiee =
          m.reservationId ?? m.reservation?.id ?? null;

        const texte = [
          m.vehicule?.immatriculation,
          m.vehicule?.marque,
          m.vehicule?.modele,
          m.vehicule?.modeleType,
          m.natureIntervention,
          m.statut,
          m.avisTexte,
          m.avisAuteurEmail,
          m.mecanicienEmail,
          m.diagnosticVisuel,
          m.observationsMecanicien,
          m.piecesNecessaires,
          m.prestataire,
          m.priorite,
          m.decisiondid,
          reservationLiee != null
            ? `DMD-${String(reservationLiee).padStart(5, "0")}`
            : "entretien autonome",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return texte.includes(terme);
      })
      .slice()
      .sort((a, b) =>
        String(b.dateCreation || "").localeCompare(String(a.dateCreation || ""))
      );
  }, [maintenances, recherche, filtreStatut]);

  const stats = useMemo(() => {
    const cloturees = maintenances.filter(
      (m) => String(m.statut || "").toUpperCase() === "CLOTUREE"
    );

    const durees = cloturees
      .map((m) => {
        if (!m.dateCreation || !m.dateCloture) return null;

        const debut = new Date(m.dateCreation).getTime();
        const fin = new Date(m.dateCloture).getTime();

        if (!Number.isFinite(debut) || !Number.isFinite(fin) || fin < debut) {
          return null;
        }

        return (fin - debut) / 86_400_000;
      })
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

    return {
      actifs: maintenances.filter(
        (m) => String(m.statut || "").toUpperCase() !== "CLOTUREE"
      ).length,

      attenteDid: maintenances.filter(
        (m) =>
          String(m.statut || "").toUpperCase() === "EN_ATTENTE_AVIS_DID" &&
          !m.avisTexte?.trim()
      ).length,

      planifiees: maintenances.filter(
        (m) => String(m.statut || "").toUpperCase() === "PLANIFIEE"
      ).length,

      enCours: maintenances.filter(
        (m) => String(m.statut || "").toUpperCase() === "EN_COURS"
      ).length,

      cloturees: cloturees.length,

      delaiMoyen:
        durees.length > 0
          ? durees.reduce((total, d) => total + d, 0) / durees.length
          : null,
    };
  }, [maintenances]);

  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        .maintenance-stats {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 14px;
        }

        .maintenance-row:hover {
          background: #f8fafc;
        }

        @media (max-width: 1000px) {
          .maintenance-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 650px) {
          .maintenance-stats,
        }
      `}</style>

      <EnTete afficherNotifications={false} afficherProfil={false} />
      {erreurChargement && <div role="alert" style={{ margin: "12px 24px", padding: 12, background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 8 }}>La liste de maintenance n’a pas pu être actualisée : {erreurChargement}.</div>}

      <main style={pageStyle}>
        <div style={containerStyle}>
          <header style={headerStyle}>
            <div>
              <button type="button" onClick={() => router.push("/admin")} style={retourStyle}>
                ← Retour
              </button>

              <h2 style={titreStyle}>Maintenance & entretien</h2>

            </div>

          </header>

          <section className="maintenance-stats" style={{ marginBottom: 22 }}>
            <StatCard titre="Dossiers actifs" valeur={String(stats.actifs)} />
            <StatCard titre="En attente avis DID" valeur={String(stats.attenteDid)} />
            <StatCard titre="Planifiés" valeur={String(stats.planifiees)} />
            <StatCard titre="En cours" valeur={String(stats.enCours)} />
            <StatCard titre="Clôturés" valeur={String(stats.cloturees)} />
          </section>

          {stats.delaiMoyen != null && (
            <div style={infoBarStyle}>
              Délai moyen de traitement des dossiers clôturés :{" "}
              <strong>{stats.delaiMoyen.toFixed(1)} jour(s)</strong>
            </div>
          )}

          <div style={filtersStyle}>
            <select
              value={filtreStatut}
              onChange={(e) => setFiltreStatut(e.target.value)}
              style={selectStyle}
            >
              <option value="TOUS">Tous les statuts</option>
              <option value="PLANIFIEE">Planifiés</option>
              <option value="EN_COURS">En cours</option>
              <option value="CLOTUREE">Clôturés</option>
            </select>

            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher véhicule, intervention, avis DID, prestataire..."
              style={inputStyle}
            />
          </div>

          <section style={tableCardStyle}>
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Véhicule</th>
                    <th style={thStyle}>Nature</th>
                    <th style={thStyle}>Création</th>
                    <th style={thStyle}>Avis DID</th>
                  </tr>
                </thead>

                <tbody>
                  {chargement ? (
                    <tr>
                      <td colSpan={4} style={emptyStyle}>
                        Chargement...
                      </td>
                    </tr>
                  ) : maintenancesFiltrees.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={emptyStyle}>
                        Aucun dossier d&apos;entretien.
                      </td>
                    </tr>
                  ) : (
                    maintenancesFiltrees.map((m) => {
                      return (
                        <tr key={m.id} className="maintenance-row">
                          <td style={tdStyle}>
                            <strong>{m.vehicule?.immatriculation || "—"}</strong>
                            <div style={smallMuted}>
                              {nomModeleVehicule(m.vehicule)}
                            </div>
                          </td>

                          <td style={tdStyle}>
                            {m.natureIntervention || "—"}

                            {m.priorite && (
                              <div style={smallMuted}>
                                Priorité : {m.priorite}
                              </div>
                            )}
                          </td>

                          <td style={tdStyle}>
                            {formaterDate(m.dateCreation)}
                          </td>

                          <td style={tdStyle}>
                            {m.avisTexte?.trim() ? (
                              <>
                                <strong style={{ color: "#166534" }}>Avis reçu</strong>
                                <div style={smallMuted}>{m.avisTexte}</div>
                                <div style={smallMuted}>
                                  {m.avisAuteurEmail || m.mecanicienEmail || "—"}
                                </div>
                              </>
                            ) : (
                              <span style={{ color: "#92400e", fontWeight: 700 }}>
                                En attente
                              </span>
                            )}
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

    </>
  );
}

function nomModeleVehicule(vehicule?: Vehicule | null) {
  if (!vehicule) return "—";

  const valeurs = [
    vehicule.marque,
    vehicule.modele,
    vehicule.modeleType,
    vehicule.categorie,
  ]
    .map((v) => v?.trim())
    .filter(Boolean);

  return [...new Set(valeurs)].join(" ") || "—";
}

function formaterDate(valeur?: string | null) {
  if (!valeur) return "—";

  const date = new Date(valeur);

  if (Number.isNaN(date.getTime())) {
    return valeur;
  }

  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatCard({
  titre,
  valeur,
}: {
  titre: string;
  valeur: string;
}) {
  return (
    <div style={statCardStyle}>
      <div style={statTitleStyle}>{titre}</div>
      <div style={statValueStyle}>{valeur}</div>
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
  marginBottom: 22,
  flexWrap: "wrap",
};

const retourStyle: CSSProperties = {
  padding: 0,
  marginBottom: 8,
  border: "none",
  background: "transparent",
  color: "#64748b",
  cursor: "pointer",
  fontSize: 13,
};

const titreStyle: CSSProperties = {
  margin: 0,
  color: "#172033",
  fontSize: 26,
};

const statCardStyle: CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 9,
  padding: 17,
};

const statTitleStyle: CSSProperties = {
  color: "#64748b",
  fontSize: 12,
  marginBottom: 7,
};

const statValueStyle: CSSProperties = {
  color: "#111827",
  fontSize: 22,
  fontWeight: 800,
};

const infoBarStyle: CSSProperties = {
  marginBottom: 16,
  padding: "10px 13px",
  border: "1px solid #bfdbfe",
  borderRadius: 8,
  backgroundColor: "#eff6ff",
  color: "#1e40af",
  fontSize: 12,
};

const filtersStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  marginBottom: 15,
  flexWrap: "wrap",
};

const inputStyle: CSSProperties = {
  width: "100%",
  minWidth: 220,
  padding: "10px 11px",
  border: "1px solid #94a3b8",
  borderRadius: 8,
  backgroundColor: "#ffffff",
  color: "#111827",
  fontSize: 13,
};

const selectStyle: CSSProperties = {
  ...inputStyle,
  width: "auto",
};

const tableCardStyle: CSSProperties = {
  overflow: "hidden",
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 9,
};

const tableStyle: CSSProperties = {
  width: "100%",
  minWidth: 850,
  borderCollapse: "collapse",
};

const thStyle: CSSProperties = {
  padding: "11px 13px",
  textAlign: "left",
  backgroundColor: "#f8fafc",
  color: "#64748b",
  fontSize: 11,
  fontWeight: 800,
  borderBottom: "1px solid #e2e8f0",
  whiteSpace: "nowrap",
};

const tdStyle: CSSProperties = {
  padding: "12px 13px",
  color: "#334155",
  fontSize: 12,
  borderBottom: "1px solid #f1f5f9",
  verticalAlign: "top",
};

const smallMuted: CSSProperties = {
  marginTop: 3,
  color: "#64748b",
  fontSize: 10,
  lineHeight: 1.4,
  maxWidth: 260,
};

const emptyStyle: CSSProperties = {
  padding: 30,
  textAlign: "center",
  color: "#64748b",
  fontSize: 13,
};

