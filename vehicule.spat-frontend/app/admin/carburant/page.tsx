"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import EnTete from "@/components/EnTete";
import JustificatifsSection from "@/components/JustificatifsSection";
import { FileText } from "lucide-react";

interface Vehicule {
  immatriculation: string;
  modeleType?: string | null;
  categorie?: string | null;
}

interface TransactionCarburant {
  id: string;
  vehicule?: Vehicule | null;
  type: "DOTATION" | "CONSOMMATION" | string;
  quantiteLitres: number;
  dateOperation: string;
  prixUnitaire?: number | null;
  montantTotal?: number | null;
  kilometrage?: number | null;
  station?: string | null;
  mission?: string | null;
  justificatif?: string | null;
  observation?: string | null;
  agentEmail?: string | null;
  dateCreation?: string | null;
}

export default function CarburantPage() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [transactions, setTransactions] = useState<TransactionCarburant[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const [transactionRecu, setTransactionRecu] = useState<TransactionCarburant | null>(null);

  const getToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  };

  const lireErreur = async (res: Response) => {
    const texte = await res.text();
    if (!texte) return `Erreur HTTP ${res.status}`;

    try {
      const data = JSON.parse(texte);
      return data.message || data.erreur || texte;
    } catch {
      return texte;
    }
  };

  const chargerDonnees = async () => {
    if (!API) {
      setErreurChargement("NEXT_PUBLIC_API_URL n'est pas configurée.");
      toast.error("NEXT_PUBLIC_API_URL n'est pas configurée.");
      setChargement(false);
      return;
    }

    const token = getToken();
    if (!token) {
      router.replace("/login");
      setErreurChargement("Session indisponible.");
      return;
    }

    setChargement(true);
    setErreurChargement(null);

    try {
      const carburantRes = await fetch(`${API}/carburant`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          cache: "no-store",
        });

      if (carburantRes.status === 401) {
        toast.error("Votre session a expiré.");
        router.replace("/login");
        return;
      }

      if (!carburantRes.ok) throw new Error(await lireErreur(carburantRes));
      const carburantData: unknown = await carburantRes.json();
      if (!Array.isArray(carburantData)) throw new Error("Format de réponse carburant invalide.");
      setTransactions(carburantData as TransactionCarburant[]);
    } catch (error) {
      console.error("Erreur chargement carburant :", error);
      setTransactions([]);
      setErreurChargement(error instanceof Error ? error.message : "Impossible de charger les données carburant.");
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de charger les données carburant."
      );
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    const initialisation = window.setTimeout(() => {
      chargerDonnees();
      // eslint-disable-next-line react-hooks/exhaustive-deps

    }, 0);
    return () => window.clearTimeout(initialisation);
  }, []);

  const stats = useMemo(() => {
    const dotation = transactions
      .filter((t) => String(t.type).toUpperCase() === "DOTATION")
      .reduce((total, t) => total + Number(t.quantiteLitres || 0), 0);

    const consommation = transactions
      .filter((t) => String(t.type).toUpperCase() === "CONSOMMATION")
      .reduce((total, t) => total + Number(t.quantiteLitres || 0), 0);

    const depenses = transactions.reduce(
      (total, t) => total + montantTransaction(t),
      0
    );

    return {
      dotation,
      consommation,
      solde: dotation - consommation,
      depenses,
    };
  }, [transactions]);

  const transactionsFiltres = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    if (!terme) return transactions;

    return transactions.filter((item) => {
      const texte = [
        item.vehicule?.immatriculation,
        item.vehicule?.modeleType,
        item.vehicule?.categorie,
        item.type,
        item.dateOperation,
        item.station,
        item.mission,
        item.justificatif,
        item.observation,
        item.agentEmail,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return texte.includes(terme);
    });
  }, [transactions, recherche]);

  return (
    <>
      <style jsx global>{`
        * { box-sizing: border-box; }
        input, select, textarea {
          color: #111827;
          background-color: #ffffff;
          border: 1px solid #94a3b8;
          font-size: 14px;
        }
        input::placeholder, textarea::placeholder { color: #64748b; }
        input:focus, select:focus, textarea:focus {
          outline: 2px solid #dc2626;
          outline-offset: 1px;
        }
        .carburant-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
        }
        .carburant-row:hover { background-color: #f8fafc; }
        @media (max-width: 900px) {
          .carburant-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 600px) {
          .carburant-grid { grid-template-columns: 1fr; }
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
              <h2 style={titreStyle}>Suivi carburant & consommation</h2>

            </div>

          </header>

          <section className="carburant-grid" style={{ marginBottom: 24 }}>
            <StatCard titre="Dotations" valeur={erreurChargement ? "—" : `${formatNombre(stats.dotation)} L`} />
            <StatCard titre="Consommation" valeur={erreurChargement ? "—" : `${formatNombre(stats.consommation)} L`} />
            <StatCard titre="Solde théorique" valeur={erreurChargement ? "—" : `${formatNombre(stats.solde)} L`} />
            <StatCard titre="Montant total" valeur={erreurChargement ? "—" : formatMontant(stats.depenses)} />
          </section>

          {erreurChargement && <p role="alert" style={{ color: "#b91c1c", margin: "0 0 16px" }}>Données carburant indisponibles : {erreurChargement}</p>}

          <div style={barreRechercheStyle}>
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher : véhicule, type, station, mission, justificatif, agent..."
              style={rechercheStyle}
            />
          </div>

          <section style={tableCardStyle}>
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Véhicule</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Quantité</th>
                    <th style={thStyle}>Prix unitaire</th>
                    <th style={thStyle}>Montant</th>
                    <th style={thStyle}>Kilométrage</th>
                    <th style={thStyle}>Station / Mission</th>
                    <th style={thStyle}>Justificatif</th>
                    <th style={thStyle}>Agent</th>
                    <th style={thStyle}>Reçu</th>
                  </tr>
                </thead>

                <tbody>
                  {chargement ? (
                    <tr>
                      <td colSpan={11} style={emptyStyle}>Chargement...</td>
                    </tr>
                  ) : erreurChargement ? (
                    <tr><td colSpan={11} style={emptyStyle}>Impossible de confirmer la liste des opérations.</td></tr>
                  ) : transactionsFiltres.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={emptyStyle}>Aucune opération carburant.</td>
                    </tr>
                  ) : (
                    transactionsFiltres.map((item) => (
                      <tr key={item.id} className="carburant-row">
                        <td style={tdStyle}>
                          <strong>{item.vehicule?.immatriculation || "—"}</strong>
                          {(item.vehicule?.modeleType || item.vehicule?.categorie) && (
                            <div style={secondaryTextStyle}>
                              {item.vehicule?.modeleType || item.vehicule?.categorie}
                            </div>
                          )}
                        </td>
                        <td style={tdStyle}><TypeBadge type={item.type} /></td>
                        <td style={tdStyle}>{formatDate(item.dateOperation)}</td>
                        <td style={tdStyle}><strong>{formatNombre(item.quantiteLitres)} L</strong></td>
                        <td style={tdStyle}>
                          {item.prixUnitaire != null ? `${formatNombre(item.prixUnitaire)} Ar/L` : "—"}
                        </td>
                        <td style={tdStyle}>
                          {formatMontant(
                            montantTransaction(item),
                            item.montantTotal == null && item.prixUnitaire == null
                          )}
                        </td>
                        <td style={tdStyle}>
                          {item.kilometrage != null ? `${formatNombre(item.kilometrage)} km` : "—"}
                        </td>
                        <td style={tdStyle}>
                          {item.station || "—"}
                          {item.mission && <div style={secondaryTextStyle}>Mission : {item.mission}</div>}
                        </td>
                        <td style={tdStyle}>
                          {item.justificatif || "—"}
                          {item.observation && <div style={secondaryTextStyle}>{item.observation}</div>}
                        </td>
                        <td style={tdStyle}>{item.agentEmail || "—"}</td>
                        <td style={tdStyle}>
                          <button
                            type="button"
                            onClick={() => setTransactionRecu(item)}
                            title="Déposer / consulter le reçu"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              padding: "5px 9px",
                              borderRadius: 6,
                              border: "1px solid #cbd5e1",
                              background: "#fff",
                              color: "#334155",
                              fontSize: 12,
                              cursor: "pointer",
                            }}
                          >
                            <FileText size={13} /> Reçu
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {transactionRecu && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(15, 23, 42, 0.45)",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
            onClick={() => setTransactionRecu(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 560,
                maxHeight: "85vh",
                overflowY: "auto",
                backgroundColor: "white",
                borderRadius: 12,
                boxShadow: "0 8px 24px rgba(15,23,42,.15)",
                padding: 20,
              }}
            >
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
                marginBottom: 14,
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, color: "#111827" }}>
                    Reçu de la transaction
                  </h3>
                  <p style={{ margin: "6px 0 0", fontSize: 13, color: "#6b7280" }}>
                    {transactionRecu.vehicule?.immatriculation || "Véhicule inconnu"} —{" "}
                    {formatDate(transactionRecu.dateOperation)} —{" "}
                    {formatNombre(transactionRecu.quantiteLitres)} L
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setTransactionRecu(null)}
                  style={{
                    border: 0,
                    background: "transparent",
                    fontSize: 22,
                    lineHeight: 1,
                    color: "#64748b",
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
              </div>

              <JustificatifsSection
                cible={{ kind: "transaction", id: transactionRecu.id }}
                typesAutorises={["RECU_CARBURANT", "AUTRE"]}
                typeParDefaut="RECU_CARBURANT"
                titre="Reçus et pièces"
              />
            </div>
          </div>
        )}
      </main>

    </>
  );
}

function StatCard({ titre, valeur }: { titre: string; valeur: string }) {
  return (
    <div style={statCardStyle}>
      <div style={statTitleStyle}>{titre}</div>
      <div style={statValueStyle}>{valeur}</div>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const dotation = String(type || "").toUpperCase() === "DOTATION";

  return (
    <span
      style={{
        display: "inline-flex",
        padding: "4px 9px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
        backgroundColor: dotation ? "#dbeafe" : "#dcfce7",
        color: dotation ? "#1d4ed8" : "#166534",
      }}
    >
      {dotation ? "Dotation" : "Consommation"}
    </span>
  );
}

function montantTransaction(item: TransactionCarburant) {
  if (item.montantTotal != null) return Number(item.montantTotal);
  if (item.prixUnitaire != null && item.quantiteLitres != null) {
    return Number(item.prixUnitaire) * Number(item.quantiteLitres);
  }
  return 0;
}

function formatNombre(valeur: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(Number(valeur || 0));
}

function formatMontant(valeur: number, absent = false) {
  if (absent) return "—";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number(valeur || 0))} Ar`;
}

function formatDate(valeur: string) {
  if (!valeur) return "—";
  const date = new Date(`${valeur}T00:00:00`);
  if (Number.isNaN(date.getTime())) return valeur;
  return new Intl.DateTimeFormat("fr-FR").format(date);
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
  marginBottom: 24,
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
  padding: 18,
};

const statTitleStyle: CSSProperties = {
  color: "#64748b",
  fontSize: 12,
  marginBottom: 7,
};

const statValueStyle: CSSProperties = {
  color: "#111827",
  fontSize: 21,
  fontWeight: 800,
};

const barreRechercheStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  marginBottom: 16,
};

const rechercheStyle: CSSProperties = {
  width: "100%",
  maxWidth: 580,
  padding: "10px 12px",
  border: "1px solid #94a3b8",
  borderRadius: 8,
  backgroundColor: "#ffffff",
};

const tableCardStyle: CSSProperties = {
  overflow: "hidden",
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 9,
};

const tableStyle: CSSProperties = {
  width: "100%",
  minWidth: 1320,
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

const secondaryTextStyle: CSSProperties = {
  marginTop: 3,
  color: "#64748b",
  fontSize: 10,
};

const emptyStyle: CSSProperties = {
  padding: 30,
  textAlign: "center",
  color: "#64748b",
  fontSize: 13,
};

