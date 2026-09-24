"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
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
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [chargement, setChargement] = useState(true);

  const [role, setRole] = useState<string | null>(null);
  const [formOuvert, setFormOuvert] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("ACTIFS");

  const [vehiculeId, setVehiculeId] = useState("");
  const [natureIntervention, setNatureIntervention] = useState("");
  const [envoi, setEnvoi] = useState(false);

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

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  };

  const charger = async (silencieux = false) => {
    if (!API) {
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

    try {
      const [m, v] = await Promise.all([
        fetchListe<Maintenance>(`${API}/maintenances`, token),
        fetchListe<Vehicule>(`${API}/vehicules`, token),
      ]);

      setMaintenances(m);
      setVehicules(v);
    } catch (error) {
      console.error("Erreur chargement maintenances :", error);

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
    charger();

    const interval = window.setInterval(() => {
      charger(true);
    }, 15000);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maintenancesFiltrees = useMemo(() => {
    const terme = recherche.trim().toLowerCase();

    return maintenances
      .filter((m) => {
        const statut = String(m.statut || "").toUpperCase();

        if (filtreStatut === "ACTIFS" && statut === "CLOTUREE") {
          return false;
        }

        if (
          filtreStatut !== "TOUS" &&
          filtreStatut !== "ACTIFS" &&
          statut !== filtreStatut
        ) {
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

  const ouvrirCreation = () => {
    if (lectureSeule) return;

    setVehiculeId("");
    setNatureIntervention("");
    setFormOuvert(true);
  };

  const handleAjouter = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (lectureSeule || !API) return;

    if (!vehiculeId || !natureIntervention.trim()) {
      toast.error("Véhicule et nature de l'intervention sont obligatoires.");
      return;
    }

    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    setEnvoi(true);

    try {
      const res = await fetch(`${API}/maintenances`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({
          vehicule: {
            id: Number(vehiculeId),
          },
          natureIntervention: natureIntervention.trim(),
        }),
      });

      if (!res.ok) {
        toast.error(await lireErreur(res));
        return;
      }

      toast.success(
        "Demande d'entretien créée. L'avis DID est requis avant planification."
      );

      setVehiculeId("");
      setNatureIntervention("");
      setFormOuvert(false);

      await charger();
    } catch (error) {
      console.error(error);
      toast.error("Impossible de contacter le serveur.");
    } finally {
      setEnvoi(false);
    }
  };

  const handleSupprimer = async (id: string) => {
    if (lectureSeule || !API) return;

    if (!window.confirm("Voulez-vous vraiment supprimer ce dossier d'entretien ?")) {
      return;
    }

    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const res = await fetch(`${API}/maintenances/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        toast.error(await lireErreur(res));
        return;
      }

      toast.success("Dossier d'entretien supprimé.");
      await charger();
    } catch {
      toast.error("Impossible de contacter le serveur.");
    }
  };

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

        .maintenance-form {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 15px;
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
          .maintenance-form {
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

              <h2 style={titreStyle}>Maintenance & entretien</h2>

              
            </div>

            <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => charger()}
                disabled={chargement}
                style={secondaryButton}
              >
                Actualiser
              </button>

              {!lectureSeule && (
                <button type="button" onClick={ouvrirCreation} style={primaryButton}>
                  + Ajouter une intervention
                </button>
              )}
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
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher véhicule, intervention, avis DID, prestataire..."
              style={inputStyle}
            />

            <select
              value={filtreStatut}
              onChange={(e) => setFiltreStatut(e.target.value)}
              style={selectStyle}
            >
              <option value="ACTIFS">Dossiers actifs</option>
              <option value="EN_ATTENTE_AVIS_DID">En attente avis DID</option>
              <option value="PLANIFIEE">Planifiés</option>
              <option value="EN_COURS">En cours</option>
              <option value="CLOTUREE">Clôturés</option>
              <option value="TOUS">Tous les statuts</option>
            </select>
          </div>

          <section style={tableCardStyle}>
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Véhicule</th>
                    <th style={thStyle}>Nature</th>
                    <th style={thStyle}>Origine</th>
                    <th style={thStyle}>Création</th>
                    <th style={thStyle}>Avis DID</th>
                    <th style={thStyle}>Intervention</th>
                    <th style={thStyle}>Statut</th>
                    {!lectureSeule && <th style={thStyle}>Actions</th>}
                  </tr>
                </thead>

                <tbody>
                  {chargement ? (
                    <tr>
                      <td colSpan={lectureSeule ? 7 : 8} style={emptyStyle}>
                        Chargement...
                      </td>
                    </tr>
                  ) : maintenancesFiltrees.length === 0 ? (
                    <tr>
                      <td colSpan={lectureSeule ? 7 : 8} style={emptyStyle}>
                        Aucun dossier d'entretien.
                      </td>
                    </tr>
                  ) : (
                    maintenancesFiltrees.map((m) => {
                      const reservationLiee =
                        m.reservationId ?? m.reservation?.id ?? null;

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
                            {reservationLiee != null
                              ? `Mission DMD-${String(reservationLiee).padStart(5, "0")}`
                              : "Entretien autonome"}
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

                          <td style={tdStyle}>
                            {formaterDate(m.dateIntervention)}

                            {m.prestataire && (
                              <div style={smallMuted}>{m.prestataire}</div>
                            )}

                            {m.dateCloture && (
                              <div style={smallMuted}>
                                Clôture : {formaterDate(m.dateCloture)}
                              </div>
                            )}
                          </td>

                          <td style={tdStyle}>
                            {badgeStatut(m)}
                          </td>

                          {!lectureSeule && (
                            <td style={tdStyle}>
                              <button
                                type="button"
                                onClick={() => handleSupprimer(m.id)}
                                style={deleteButtonStyle}
                                title="Supprimer"
                              >
                                Supprimer
                              </button>
                            </td>
                          )}
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

      {formOuvert && !lectureSeule && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <div>
                <h3 style={modalTitleStyle}>Ajouter une intervention</h3>
                <p style={modalSubtitleStyle}>
                  Le dossier sera créé avec le vrai véhicule sélectionné et transmis
                  dans le circuit maintenance / avis DID.
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

            <form onSubmit={handleAjouter}>
              <div className="maintenance-form">
                <label>
                  <span style={labelStyle}>Véhicule *</span>

                  <select
                    value={vehiculeId}
                    onChange={(e) => setVehiculeId(e.target.value)}
                    style={inputStyle}
                    required
                  >
                    <option value="">Sélectionner un véhicule</option>

                    {vehicules.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.immatriculation}
                        {nomModeleVehicule(v) !== "—"
                          ? ` — ${nomModeleVehicule(v)}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span style={labelStyle}>Nature de l'intervention *</span>

                  <input
                    value={natureIntervention}
                    onChange={(e) => setNatureIntervention(e.target.value)}
                    placeholder="Ex. Vidange, contrôle freinage, remise en état..."
                    style={inputStyle}
                    required
                  />
                </label>
              </div>

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
                  disabled={envoi}
                  style={{
                    ...primaryButton,
                    opacity: envoi ? 0.65 : 1,
                  }}
                >
                  {envoi ? "Enregistrement..." : "Créer le dossier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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

function badgeStatut(m: Maintenance) {
  const statutBrut = String(m.statut || "").toUpperCase();

  const statutAffiche =
    statutBrut === "EN_ATTENTE_AVIS_DID" && m.avisTexte?.trim()
      ? "AVIS_DID_RECU"
      : statutBrut;

  const map: Record<
    string,
    { bg: string; color: string; label: string }
  > = {
    EN_ATTENTE_AVIS_DID: {
      bg: "#fef3c7",
      color: "#92400e",
      label: "Avis DID attendu",
    },

    AVIS_DID_RECU: {
      bg: "#dcfce7",
      color: "#166534",
      label: "Avis DID reçu",
    },

    PLANIFIEE: {
      bg: "#dbeafe",
      color: "#1d4ed8",
      label: "Planifiée",
    },

    EN_COURS: {
      bg: "#e0f2fe",
      color: "#0369a1",
      label: "En cours",
    },

    CLOTUREE: {
      bg: "#dcfce7",
      color: "#166534",
      label: "Clôturée",
    },
  };

  const s =
    map[statutAffiche] || {
      bg: "#f1f5f9",
      color: "#475569",
      label: m.statut || "—",
    };

  return (
    <span
      style={{
        display: "inline-flex",
        padding: "4px 9px",
        borderRadius: 999,
        backgroundColor: s.bg,
        color: s.color,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
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

const sousTitreStyle: CSSProperties = {
  margin: "5px 0 0",
  color: "#64748b",
  fontSize: 13,
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
  minWidth: 1150,
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

const deleteButtonStyle: CSSProperties = {
  padding: "7px 10px",
  border: "1px solid #fecaca",
  borderRadius: 7,
  backgroundColor: "#fef2f2",
  color: "#dc2626",
  cursor: "pointer",
  fontSize: 11,
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
  maxWidth: 760,
  padding: 26,
  borderRadius: 12,
  backgroundColor: "#ffffff",
  boxShadow: "0 20px 60px rgba(0,0,0,.25)",
};

const modalHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 15,
  marginBottom: 20,
};

const modalTitleStyle: CSSProperties = {
  margin: 0,
  color: "#111827",
  fontSize: 21,
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

const modalActionsStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 20,
};

