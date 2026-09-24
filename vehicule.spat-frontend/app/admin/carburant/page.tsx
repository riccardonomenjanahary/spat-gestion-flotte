"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import EnTete from "@/components/EnTete";

interface Vehicule {
  id: number;
  immatriculation: string;
  modeleType?: string | null;
  categorie?: string | null;
  statut?: string | null;
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

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

function dateLocaleInput() {
  const maintenant = new Date();
  const decalage = maintenant.getTimezoneOffset() * 60_000;
  return new Date(maintenant.getTime() - decalage).toISOString().slice(0, 10);
}

export default function CarburantPage() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [transactions, setTransactions] = useState<TransactionCarburant[]>([]);
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [chargement, setChargement] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const [formOuvert, setFormOuvert] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  const [vehiculeId, setVehiculeId] = useState("");
  const [type, setType] = useState<"DOTATION" | "CONSOMMATION">("CONSOMMATION");
  const [quantiteLitres, setQuantiteLitres] = useState("");
  const [dateOperation, setDateOperation] = useState(dateLocaleInput());
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [kilometrage, setKilometrage] = useState("");
  const [station, setStation] = useState("");
  const [mission, setMission] = useState("");
  const [justificatif, setJustificatif] = useState("");
  const [observation, setObservation] = useState("");

  useEffect(() => {
    setRole(localStorage.getItem("role"));
  }, []);

  const peutGerer =
    role === "ADMIN" ||
    role === "SUPER_ADMIN" ||
    role === "CHEF_SERVICE_LOGISTIQUE" ||
    role === "AGENT_FLOTTE";

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
      const [carburantRes, vehiculesRes] = await Promise.all([
        fetch(`${API}/carburant`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          cache: "no-store",
        }),
        fetch(`${API}/vehicules`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          cache: "no-store",
        }),
      ]);

      if (carburantRes.status === 401 || vehiculesRes.status === 401) {
        toast.error("Votre session a expiré.");
        router.replace("/login");
        return;
      }

      if (!carburantRes.ok) throw new Error(await lireErreur(carburantRes));
      if (!vehiculesRes.ok) throw new Error(await lireErreur(vehiculesRes));

      const carburantData = await carburantRes.json();
      const vehiculesData = await vehiculesRes.json();

      setTransactions(Array.isArray(carburantData) ? carburantData : []);
      setVehicules(Array.isArray(vehiculesData) ? vehiculesData : []);
    } catch (error) {
      console.error("Erreur chargement carburant :", error);
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
    chargerDonnees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const resetFormulaire = () => {
    setVehiculeId("");
    setType("CONSOMMATION");
    setQuantiteLitres("");
    setDateOperation(dateLocaleInput());
    setPrixUnitaire("");
    setKilometrage("");
    setStation("");
    setMission("");
    setJustificatif("");
    setObservation("");
  };

  const ouvrirCreation = () => {
    if (!peutGerer) return;
    resetFormulaire();
    setFormOuvert(true);
  };

  const fermerFormulaire = () => {
    setFormOuvert(false);
    resetFormulaire();
  };

  const handleSoumettre = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!peutGerer) return;

    if (!API) {
      toast.error("API non configurée.");
      return;
    }

    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    if (!vehiculeId || !quantiteLitres || !dateOperation) {
      toast.error("Véhicule, quantité et date sont obligatoires.");
      return;
    }

    const quantite = Number(quantiteLitres);
    if (!Number.isFinite(quantite) || quantite <= 0) {
      toast.error("La quantité doit être supérieure à 0 litre.");
      return;
    }

    const prix = prixUnitaire ? Number(prixUnitaire) : null;
    if (prix !== null && (!Number.isFinite(prix) || prix < 0)) {
      toast.error("Le prix unitaire est invalide.");
      return;
    }

    const km = kilometrage ? Number(kilometrage) : null;
    if (km !== null && (!Number.isFinite(km) || km < 0)) {
      toast.error("Le kilométrage est invalide.");
      return;
    }

    const montantTotal = prix !== null ? quantite * prix : null;

    setEnvoi(true);

    try {
      const res = await fetch(`${API}/carburant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vehiculeId: Number(vehiculeId),
          type,
          quantiteLitres: quantite,
          dateOperation,
          prixUnitaire: prix,
          montantTotal,
          kilometrage: km,
          station: station.trim() || null,
          mission: mission.trim() || null,
          justificatif: justificatif.trim() || null,
          observation: observation.trim() || null,
        }),
      });

      if (!res.ok) {
        toast.error(await lireErreur(res));
        return;
      }

      toast.success(
        type === "DOTATION"
          ? "Dotation enregistrée avec succès."
          : "Consommation enregistrée avec succès."
      );

      fermerFormulaire();
      await chargerDonnees();
    } catch (error) {
      console.error("Erreur création carburant :", error);
      toast.error("Impossible de contacter le serveur.");
    } finally {
      setEnvoi(false);
    }
  };

  const handleSupprimer = async (id: string) => {
    if (!peutGerer) return;

    if (!window.confirm("Voulez-vous vraiment supprimer cette opération carburant ?")) {
      return;
    }

    if (!API) return;

    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const res = await fetch(`${API}/carburant/${id}`, {
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

      toast.success("Opération carburant supprimée.");
      await chargerDonnees();
    } catch (error) {
      console.error("Erreur suppression carburant :", error);
      toast.error("Impossible de contacter le serveur.");
    }
  };

  const montantCalcule =
    quantiteLitres !== "" &&
    prixUnitaire !== "" &&
    Number(quantiteLitres) > 0 &&
    Number(prixUnitaire) >= 0
      ? Number(quantiteLitres) * Number(prixUnitaire)
      : null;

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
        .carburant-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }
        .carburant-row:hover { background-color: #f8fafc; }
        @media (max-width: 900px) {
          .carburant-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .carburant-form-grid { grid-template-columns: 1fr; }
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

            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={chargerDonnees} disabled={chargement} style={secondaireButton}>
                Actualiser
              </button>

              {peutGerer && (
                <button type="button" onClick={ouvrirCreation} style={primaryButton}>
                  + Ajouter une opération
                </button>
              )}
            </div>
          </header>

          <section className="carburant-grid" style={{ marginBottom: 24 }}>
            <StatCard titre="Dotations" valeur={`${formatNombre(stats.dotation)} L`} />
            <StatCard titre="Consommation" valeur={`${formatNombre(stats.consommation)} L`} />
            <StatCard titre="Solde théorique" valeur={`${formatNombre(stats.solde)} L`} />
            <StatCard titre="Montant total" valeur={formatMontant(stats.depenses)} />
          </section>

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
                    {peutGerer && <th style={thStyle}>Actions</th>}
                  </tr>
                </thead>

                <tbody>
                  {chargement ? (
                    <tr>
                      <td colSpan={peutGerer ? 11 : 10} style={emptyStyle}>Chargement...</td>
                    </tr>
                  ) : transactionsFiltres.length === 0 ? (
                    <tr>
                      <td colSpan={peutGerer ? 11 : 10} style={emptyStyle}>Aucune opération carburant.</td>
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
                        {peutGerer && (
                          <td style={tdStyle}>
                            <button
                              type="button"
                              onClick={() => handleSupprimer(item.id)}
                              style={deleteButtonStyle}
                              aria-label={`Supprimer l'opération ${item.id}`}
                              title="Supprimer"
                            >
                              <IconTrash />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {formOuvert && peutGerer && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <div>
                <h3 style={modalTitleStyle}>Ajouter une opération carburant</h3>
                <p style={modalSubtitleStyle}>
                  Les données saisies sont enregistrées directement dans le module carburant.
                </p>
              </div>
              <button type="button" onClick={fermerFormulaire} style={closeButtonStyle}>×</button>
            </div>

            <form onSubmit={handleSoumettre}>
              <div className="carburant-form-grid">
                <Champ label="Véhicule *">
                  <select value={vehiculeId} onChange={(e) => setVehiculeId(e.target.value)} style={inputStyle} required>
                    <option value="">Sélectionner un véhicule</option>
                    {vehicules.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.immatriculation}{v.modeleType ? ` — ${v.modeleType}` : ""}
                      </option>
                    ))}
                  </select>
                </Champ>

                <Champ label="Type *">
                  <select value={type} onChange={(e) => setType(e.target.value as "DOTATION" | "CONSOMMATION")} style={inputStyle} required>
                    <option value="CONSOMMATION">Consommation</option>
                    <option value="DOTATION">Dotation</option>
                  </select>
                </Champ>

                <Champ label="Quantité (L) *">
                  <input type="number" min="0.1" step="0.1" value={quantiteLitres} onChange={(e) => setQuantiteLitres(e.target.value)} style={inputStyle} required />
                </Champ>

                <Champ label="Date de l'opération *">
                  <input type="date" value={dateOperation} onChange={(e) => setDateOperation(e.target.value)} style={inputStyle} required />
                </Champ>

                <Champ label="Prix unitaire (Ar/L)">
                  <input type="number" min="0" step="1" value={prixUnitaire} onChange={(e) => setPrixUnitaire(e.target.value)} style={inputStyle} />
                </Champ>

                <Champ label="Montant calculé">
                  <div style={readOnlyStyle}>
                    {montantCalcule != null ? formatMontant(montantCalcule) : "—"}
                  </div>
                </Champ>

                <Champ label="Kilométrage">
                  <input type="number" min="0" step="1" value={kilometrage} onChange={(e) => setKilometrage(e.target.value)} style={inputStyle} />
                </Champ>

                <Champ label="Station">
                  <input value={station} onChange={(e) => setStation(e.target.value)} style={inputStyle} placeholder="Station-service" />
                </Champ>

                <Champ label="Mission">
                  <input value={mission} onChange={(e) => setMission(e.target.value)} style={inputStyle} placeholder="Référence ou objet de mission" />
                </Champ>

                <Champ label="Justificatif">
                  <input value={justificatif} onChange={(e) => setJustificatif(e.target.value)} style={inputStyle} placeholder="Ticket, facture, référence..." />
                </Champ>

                <div style={{ gridColumn: "1 / -1" }}>
                  <Champ label="Observation">
                    <textarea
                      value={observation}
                      onChange={(e) => setObservation(e.target.value)}
                      style={{ ...inputStyle, minHeight: 90, resize: "vertical", fontFamily: "inherit" }}
                    />
                  </Champ>
                </div>
              </div>

              <div style={modalActionsStyle}>
                <button type="button" onClick={fermerFormulaire} style={secondaireButton}>Annuler</button>
                <button type="submit" disabled={envoi} style={{ ...primaryButton, opacity: envoi ? 0.65 : 1 }}>
                  {envoi ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Champ({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
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

const primaryButton: CSSProperties = {
  padding: "10px 16px",
  border: "1px solid #dc2626",
  borderRadius: 8,
  backgroundColor: "#dc2626",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 700,
};

const secondaireButton: CSSProperties = {
  padding: "10px 14px",
  border: "1px solid #2563eb",
  borderRadius: 8,
  backgroundColor: "#2563eb",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 700,
};

const deleteButtonStyle: CSSProperties = {
  width: 34,
  height: 34,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid #fecaca",
  borderRadius: 8,
  backgroundColor: "#fef2f2",
  color: "#dc2626",
  cursor: "pointer",
};

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  padding: 20,
  backgroundColor: "rgba(15,23,42,0.65)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflowY: "auto",
};

const modalStyle: CSSProperties = {
  width: "100%",
  maxWidth: 800,
  maxHeight: "92vh",
  overflowY: "auto",
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
  fontSize: 21,
};

const modalSubtitleStyle: CSSProperties = {
  margin: "5px 0 0",
  color: "#64748b",
  fontSize: 12,
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

const readOnlyStyle: CSSProperties = {
  ...inputStyle,
  minHeight: 39,
  backgroundColor: "#f8fafc",
  color: "#475569",
};

const modalActionsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 20,
};

