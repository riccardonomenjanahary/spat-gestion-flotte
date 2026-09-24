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

interface Reservation {
  id: number;
  vehicule?: Vehicule | null;
  dateDebut: string;
  dateFin: string;
  statut: string;
  dateCreation: string;
}

interface TransactionCarburant {
  id: string;
  vehicule?: Vehicule | null;
  type: "DOTATION" | "CONSOMMATION" | string;
  quantiteLitres: number;
  dateOperation: string;
  montantTotal?: number | null;
  prixUnitaire?: number | null;
}

interface Maintenance {
  id: string;
  vehicule?: Vehicule | null;
  statut: string;
  dateCreation?: string | null;
  dateCloture?: string | null;
}

interface Assurance {
  id: string | number;
  vehicule?: Vehicule | null;
  numeroPolice?: string | null;
  dateExpiration?: string | null;
  dateEcheance?: string | null;
  dateFin?: string | null;
  statut?: string | null;
}

interface Sinistre {
  id: string | number;
  vehicule?: Vehicule | null;
  dateSinistre?: string | null;
  date?: string | null;
  statut?: string | null;
}

type Periode = "7J" | "30J" | "MOIS" | "TOUT";

export default function RapportsPage() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [transactions, setTransactions] = useState<TransactionCarburant[]>([]);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [assurances, setAssurances] = useState<Assurance[]>([]);
  const [sinistres, setSinistres] = useState<Sinistre[]>([]);

  const [chargement, setChargement] = useState(true);
  const [periode, setPeriode] = useState<Periode>("30J");
  const [recherche, setRecherche] = useState("");

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
    token: string,
    optionnel = false
  ): Promise<T[]> => {
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (!res.ok) {
        if (optionnel) return [];
        throw new Error(await lireErreur(res));
      }

      const data = await res.json();

      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.content)) return data.content;

      return [];
    } catch (error) {
      if (optionnel) {
        console.warn("Module optionnel indisponible :", url, error);
        return [];
      }

      throw error;
    }
  };

  const charger = async () => {
    if (!API) {
      toast.error("NEXT_PUBLIC_API_URL n'est pas configurée.");
      setChargement(false);
      return;
    }

    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    setChargement(true);

    try {
      const [v, r, c, m, a, s] = await Promise.all([
        fetchListe<Vehicule>(`${API}/vehicules`, token),
        fetchListe<Reservation>(`${API}/reservations`, token),
        fetchListe<TransactionCarburant>(`${API}/carburant`, token),
        fetchListe<Maintenance>(`${API}/maintenances`, token),
        fetchListe<Assurance>(`${API}/assurances`, token, true),
        fetchListe<Sinistre>(`${API}/sinistres`, token, true),
      ]);

      setVehicules(v);
      setReservations(r);
      setTransactions(c);
      setMaintenances(m);
      setAssurances(a);
      setSinistres(s);
    } catch (error) {
      console.error("Erreur chargement rapports :", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de charger les données de reporting."
      );
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    charger();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const debutPeriode = useMemo(() => {
    if (periode === "TOUT") return null;

    const maintenant = new Date();

    if (periode === "7J") {
      return new Date(maintenant.getTime() - 7 * 86_400_000);
    }

    if (periode === "30J") {
      return new Date(maintenant.getTime() - 30 * 86_400_000);
    }

    return new Date(
      maintenant.getFullYear(),
      maintenant.getMonth(),
      1
    );
  }, [periode]);

  const dansPeriode = (valeur?: string | null) => {
    if (!valeur) return false;
    if (!debutPeriode) return true;

    const date = new Date(valeur);

    return (
      !Number.isNaN(date.getTime()) &&
      date.getTime() >= debutPeriode.getTime()
    );
  };

  const reservationsPeriode = useMemo(
    () =>
      reservations.filter((r) =>
        dansPeriode(r.dateCreation || r.dateDebut)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reservations, debutPeriode]
  );

  const carburantPeriode = useMemo(
    () =>
      transactions.filter((t) =>
        dansPeriode(t.dateOperation)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions, debutPeriode]
  );

  const maintenancesPeriode = useMemo(
    () =>
      maintenances.filter((m) =>
        dansPeriode(m.dateCreation)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [maintenances, debutPeriode]
  );

  const sinistresPeriode = useMemo(
    () =>
      sinistres.filter((s) =>
        dansPeriode(s.dateSinistre || s.date)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sinistres, debutPeriode]
  );

  const kpis = useMemo(() => {
    const disponibles = vehicules.filter(
      (v) =>
        String(v.statut || "").toUpperCase() ===
        "DISPONIBLE"
    ).length;

    const demandesEnCours = reservations.filter((r) =>
      [
        "EN_ATTENTE",
        "EN_ATTENTE_AVIS_DID",
        "VALIDEE_N1",
        "VALIDEE",
      ].includes(
        String(r.statut || "").toUpperCase()
      )
    ).length;

    const consommation = carburantPeriode
      .filter(
        (t) =>
          String(t.type || "").toUpperCase() ===
          "CONSOMMATION"
      )
      .reduce(
        (total, t) =>
          total +
          Number(t.quantiteLitres || 0),
        0
      );

    const montantCarburant =
      carburantPeriode.reduce(
        (total, t) => {
          if (t.montantTotal != null) {
            return (
              total +
              Number(t.montantTotal || 0)
            );
          }

          if (t.prixUnitaire != null) {
            return (
              total +
              Number(t.quantiteLitres || 0) *
                Number(t.prixUnitaire || 0)
            );
          }

          return total;
        },
        0
      );

    const entretiensActifs =
      maintenances.filter(
        (m) =>
          String(m.statut || "").toUpperCase() !==
          "CLOTUREE"
      ).length;

    const cloturees = maintenances.filter(
      (m) =>
        String(m.statut || "").toUpperCase() ===
          "CLOTUREE" &&
        m.dateCreation &&
        m.dateCloture
    );

    const durees = cloturees
      .map((m) => {
        const debut = new Date(
          m.dateCreation!
        ).getTime();

        const fin = new Date(
          m.dateCloture!
        ).getTime();

        if (
          !Number.isFinite(debut) ||
          !Number.isFinite(fin) ||
          fin < debut
        ) {
          return null;
        }

        return (
          (fin - debut) /
          86_400_000
        );
      })
      .filter(
        (v): v is number =>
          typeof v === "number" &&
          Number.isFinite(v)
      );

    const delaiMoyen =
      durees.length > 0
        ? durees.reduce(
            (total, v) => total + v,
            0
          ) / durees.length
        : null;

    return {
      disponibles,
      demandesEnCours,
      consommation,
      montantCarburant,
      entretiensActifs,
      sinistres:
        sinistresPeriode.length,
      delaiMoyen,
    };
  }, [
    vehicules,
    reservations,
    carburantPeriode,
    maintenances,
    sinistresPeriode,
  ]);

  const rapportParVehicule = useMemo(() => {
    const terme = recherche
      .trim()
      .toLowerCase();

    return vehicules
      .map((vehicule) => {
        const missions =
          reservationsPeriode.filter(
            (r) =>
              r.vehicule?.id ===
              vehicule.id
          ).length;

        const consommation =
          carburantPeriode
            .filter(
              (t) =>
                t.vehicule?.id ===
                  vehicule.id &&
                String(
                  t.type || ""
                ).toUpperCase() ===
                  "CONSOMMATION"
            )
            .reduce(
              (total, t) =>
                total +
                Number(
                  t.quantiteLitres || 0
                ),
              0
            );

        const coutCarburant =
          carburantPeriode
            .filter(
              (t) =>
                t.vehicule?.id ===
                vehicule.id
            )
            .reduce((total, t) => {
              if (
                t.montantTotal !=
                null
              ) {
                return (
                  total +
                  Number(
                    t.montantTotal || 0
                  )
                );
              }

              if (
                t.prixUnitaire != null
              ) {
                return (
                  total +
                  Number(
                    t.quantiteLitres ||
                      0
                  ) *
                    Number(
                      t.prixUnitaire ||
                        0
                    )
                );
              }

              return total;
            }, 0);

        const entretiensActifs =
          maintenances.filter(
            (m) =>
              m.vehicule?.id ===
                vehicule.id &&
              String(
                m.statut || ""
              ).toUpperCase() !==
                "CLOTUREE"
          ).length;

        const nombreSinistres =
          sinistresPeriode.filter(
            (s) =>
              s.vehicule?.id ===
              vehicule.id
          ).length;

        const assurance =
          assurances
            .filter(
              (a) =>
                a.vehicule?.id ===
                vehicule.id
            )
            .slice()
            .sort((a, b) =>
              String(
                dateAssurance(b) || ""
              ).localeCompare(
                String(
                  dateAssurance(a) || ""
                )
              )
            )[0] || null;

        return {
          vehicule,
          missions,
          consommation,
          coutCarburant,
          entretiensActifs,
          nombreSinistres,
          assurance,
        };
      })
      .filter((ligne) => {
        if (!terme) return true;

        return [
          ligne.vehicule
            .immatriculation,
          ligne.vehicule.marque,
          ligne.vehicule.modele,
          ligne.vehicule
            .modeleType,
          ligne.vehicule
            .categorie,
          ligne.vehicule.statut,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(terme);
      });
  }, [
    vehicules,
    reservationsPeriode,
    carburantPeriode,
    maintenances,
    sinistresPeriode,
    assurances,
    recherche,
  ]);

  const imprimer = () => {
    window.print();
  };

  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        .rapport-kpis {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .rapport-row:hover {
          background: #f8fafc;
        }

        @media print {
          .no-print {
            display: none !important;
          }

          body {
            background: #ffffff !important;
          }

          main {
            padding: 0 !important;
          }
        }

        @media (max-width: 950px) {
          .rapport-kpis {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 560px) {
          .rapport-kpis {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <EnTete afficherNotifications={false} afficherProfil={false} />

      <main style={pageStyle}>
        <div style={containerStyle}>
          <header
            className="no-print"
            style={headerStyle}
          >
            <div>
              <button
                type="button"
                onClick={() =>
                  router.push("/admin")
                }
                style={retourStyle}
              >
                ← Retour
              </button>

              <h2 style={titreStyle}>
                Rapports & décisions
              </h2>

              
            </div>

            <div
              style={{
                display: "flex",
                gap: 9,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={charger}
                disabled={chargement}
                style={
                  secondaryButton
                }
              >
                Actualiser
              </button>

              <button
                type="button"
                onClick={imprimer}
                style={primaryButton}
              >
                Imprimer / PDF
              </button>
            </div>
          </header>

          <div
            className="no-print"
            style={filtersStyle}
          >
            <select
              value={periode}
              onChange={(e) =>
                setPeriode(
                  e.target
                    .value as Periode
                )
              }
              style={inputStyle}
            >
              <option value="7J">
                7 derniers jours
              </option>
              <option value="30J">
                30 derniers jours
              </option>
              <option value="MOIS">
                Mois en cours
              </option>
              <option value="TOUT">
                Toutes les données
              </option>
            </select>

            <input
              value={recherche}
              onChange={(e) =>
                setRecherche(
                  e.target.value
                )
              }
              placeholder="Rechercher un véhicule..."
              style={{
                ...inputStyle,
                minWidth: 280,
              }}
            />
          </div>

          <section
            className="rapport-kpis no-print"
            style={{
              marginBottom: 22,
            }}
          >
            <StatCard
              titre="Véhicules disponibles"
              valeur={`${kpis.disponibles} / ${vehicules.length}`}
            />

            <StatCard
              titre="Demandes / missions en cours"
              valeur={String(
                kpis.demandesEnCours
              )}
            />

            <StatCard
              titre="Consommation carburant"
              valeur={`${formatNombre(
                kpis.consommation
              )} L`}
            />

            <StatCard
              titre="Coût carburant"
              valeur={formatMontant(
                kpis.montantCarburant
              )}
            />

            <StatCard
              titre="Entretiens actifs"
              valeur={String(
                kpis.entretiensActifs
              )}
            />

            <StatCard
              titre="Sinistres sur la période"
              valeur={String(
                kpis.sinistres
              )}
            />

            <StatCard
              titre="Délai moyen entretien"
              valeur={
                kpis.delaiMoyen !=
                null
                  ? `${kpis.delaiMoyen.toFixed(
                      1
                    )} j`
                  : "—"
              }
            />

            <StatCard
              titre="Période analysée"
              valeur={libellePeriode(
                periode
              )}
            />
          </section>

          <section
            style={tableCardStyle}
          >
            <div
              style={{
                padding:
                  "15px 16px",
                borderBottom:
                  "1px solid #e2e8f0",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color: "#1e293b",
                  fontSize: 16,
                }}
              >
                Synthèse par véhicule
              </h3>

              <p
                style={{
                  margin:
                    "4px 0 0",
                  color: "#64748b",
                  fontSize: 11,
                }}
              >
                Missions, consommation,
                entretiens, sinistres et
                échéance assurance.
              </p>
            </div>

            <div
              style={{
                overflowX: "auto",
              }}
            >
              <table
                style={tableStyle}
              >
                <thead>
                  <tr>
                    <th
                      style={thStyle}
                    >
                      Véhicule
                    </th>
                    <th
                      style={thStyle}
                    >
                      Statut
                    </th>
                    <th
                      style={thStyle}
                    >
                      Missions
                    </th>
                    <th
                      style={thStyle}
                    >
                      Consommation
                    </th>
                    <th
                      style={thStyle}
                    >
                      Coût carburant
                    </th>
                    <th
                      style={thStyle}
                    >
                      Entretiens actifs
                    </th>
                    <th
                      style={thStyle}
                    >
                      Sinistres
                    </th>
                    <th
                      style={thStyle}
                    >
                      Assurance
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {chargement ? (
                    <tr>
                      <td
                        colSpan={8}
                        style={
                          emptyStyle
                        }
                      >
                        Chargement...
                      </td>
                    </tr>
                  ) : rapportParVehicule.length ===
                    0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        style={
                          emptyStyle
                        }
                      >
                        Aucune donnée.
                      </td>
                    </tr>
                  ) : (
                    rapportParVehicule.map(
                      (ligne) => (
                        <tr
                          key={
                            ligne
                              .vehicule
                              .id
                          }
                          className="rapport-row"
                        >
                          <td
                            style={
                              tdStyle
                            }
                          >
                            <strong>
                              {
                                ligne
                                  .vehicule
                                  .immatriculation
                              }
                            </strong>

                            <div
                              style={
                                smallMuted
                              }
                            >
                              {nomModeleVehicule(
                                ligne.vehicule
                              )}
                            </div>
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {formatStatutVehicule(
                              ligne
                                .vehicule
                                .statut
                            )}
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {
                              ligne.missions
                            }
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {formatNombre(
                              ligne.consommation
                            )}{" "}
                            L
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {formatMontant(
                              ligne.coutCarburant
                            )}
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {
                              ligne.entretiensActifs
                            }
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {
                              ligne.nombreSinistres
                            }
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {ligne.assurance ? (
                              <>
                                <div>
                                  {ligne
                                    .assurance
                                    .numeroPolice ||
                                    "Police renseignée"}
                                </div>

                                <div
                                  style={
                                    smallMuted
                                  }
                                >
                                  Échéance :{" "}
                                  {formaterDateSimple(
                                    dateAssurance(
                                      ligne.assurance
                                    )
                                  )}
                                </div>
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      )
                    )
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

function dateAssurance(
  assurance: Assurance
) {
  return (
    assurance.dateExpiration ||
    assurance.dateEcheance ||
    assurance.dateFin ||
    null
  );
}

function nomModeleVehicule(
  vehicule: Vehicule
) {
  const valeurs = [
    vehicule.marque,
    vehicule.modele,
    vehicule.modeleType,
    vehicule.categorie,
  ]
    .map((v) => v?.trim())
    .filter(Boolean);

  return (
    [...new Set(valeurs)].join(
      " "
    ) || "—"
  );
}

function formatStatutVehicule(
  statut: string
) {
  const map: Record<
    string,
    string
  > = {
    DISPONIBLE: "Disponible",
    EN_MISSION: "En mission",
    MAINTENANCE: "Maintenance",
    EN_MAINTENANCE:
      "Maintenance",
    HORS_SERVICE: "Hors service",
    TRANSFERE: "Transféré",
    REFORME: "Réformé",
  };

  return (
    map[
      String(
        statut || ""
      ).toUpperCase()
    ] ||
    statut ||
    "—"
  );
}

function libellePeriode(
  periode: Periode
) {
  const map: Record<
    Periode,
    string
  > = {
    "7J": "7 jours",
    "30J": "30 jours",
    MOIS: "Mois en cours",
    TOUT: "Toutes",
  };

  return map[periode];
}

function formatNombre(
  valeur: number
) {
  return new Intl.NumberFormat(
    "fr-FR",
    {
      maximumFractionDigits: 2,
    }
  ).format(
    Number(valeur || 0)
  );
}

function formatMontant(
  valeur: number
) {
  return `${new Intl.NumberFormat(
    "fr-FR",
    {
      maximumFractionDigits: 0,
    }
  ).format(
    Number(valeur || 0)
  )} Ar`;
}

function formaterDateSimple(
  valeur?: string | null
) {
  if (!valeur) return "—";

  const date = new Date(valeur);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return valeur;
  }

  return date.toLocaleDateString(
    "fr-FR"
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
      <div
        style={statTitleStyle}
      >
        {titre}
      </div>

      <div
        style={statValueStyle}
      >
        {valeur}
      </div>
    </div>
  );
}

const pageStyle:
  CSSProperties = {
  minHeight: "100vh",
  backgroundColor:
    "#f3f4f6",
  padding: "28px 18px",
};

const containerStyle:
  CSSProperties = {
  maxWidth: 1280,
  margin: "0 auto",
};

const headerStyle:
  CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent:
    "space-between",
  gap: 18,
  marginBottom: 20,
  flexWrap: "wrap",
};

const retourStyle:
  CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#64748b",
  cursor: "pointer",
  padding: 0,
  marginBottom: 8,
  fontSize: 13,
};

const titreStyle:
  CSSProperties = {
  margin: 0,
  color: "#172033",
  fontSize: 26,
};

const sousTitreStyle:
  CSSProperties = {
  margin: "5px 0 0",
  color: "#64748b",
  fontSize: 13,
};

const filtersStyle:
  CSSProperties = {
  display: "flex",
  gap: 10,
  marginBottom: 16,
  flexWrap: "wrap",
};

const inputStyle:
  CSSProperties = {
  padding: "9px 11px",
  border:
    "1px solid #94a3b8",
  borderRadius: 8,
  backgroundColor:
    "#ffffff",
  color: "#111827",
  fontSize: 13,
};

const statCardStyle:
  CSSProperties = {
  backgroundColor:
    "#ffffff",
  border:
    "1px solid #e2e8f0",
  borderRadius: 9,
  padding: 17,
};

const statTitleStyle:
  CSSProperties = {
  color: "#64748b",
  fontSize: 11,
  marginBottom: 7,
};

const statValueStyle:
  CSSProperties = {
  color: "#111827",
  fontSize: 21,
  fontWeight: 800,
};

const tableCardStyle:
  CSSProperties = {
  overflow: "hidden",
  backgroundColor:
    "#ffffff",
  border:
    "1px solid #e2e8f0",
  borderRadius: 9,
};

const tableStyle:
  CSSProperties = {
  width: "100%",
  minWidth: 1080,
  borderCollapse:
    "collapse",
};

const thStyle:
  CSSProperties = {
  padding: "11px 13px",
  textAlign: "left",
  backgroundColor:
    "#f8fafc",
  color: "#64748b",
  fontSize: 11,
  fontWeight: 800,
  borderBottom:
    "1px solid #e2e8f0",
  whiteSpace: "nowrap",
};

const tdStyle:
  CSSProperties = {
  padding: "12px 13px",
  color: "#334155",
  fontSize: 12,
  borderBottom:
    "1px solid #f1f5f9",
  verticalAlign: "top",
};

const smallMuted:
  CSSProperties = {
  marginTop: 3,
  color: "#64748b",
  fontSize: 10,
};

const emptyStyle:
  CSSProperties = {
  padding: 30,
  textAlign: "center",
  color: "#64748b",
  fontSize: 13,
};

const primaryButton:
  CSSProperties = {
  padding: "10px 16px",
  border: "none",
  borderRadius: 8,
  backgroundColor:
    "#dc2626",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 700,
};

const secondaryButton:
  CSSProperties = {
  padding: "10px 14px",
  border: "1px solid #2563eb",
  borderRadius: 8,
  backgroundColor:
    "#2563eb",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 700,
};

