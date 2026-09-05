"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface TransactionCarburant {
  id: number;
  vehicule: string;
  date: string;
  litres: number;
  montant: number;
  station: string;
  km: number;
}

// --- Icônes SVG modernes ---
const IconEdit = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </svg>
);

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

export default function CarburantPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<TransactionCarburant[]>([]);
  const [chargement, setChargement] = useState(true);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // =========================================================
  // ROLE / LECTURE SEULE (DIRECTEUR_DFP)
  // =========================================================

  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setRole(localStorage.getItem("role"));
  }, []);

  const lectureSeule = role === "DIRECTEUR_DFP";

  const chargerTransactions = async () => {
    setChargement(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/carburant`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTransactions(data);
    } catch {
      toast.error("Impossible de charger les transactions");
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerTransactions();
  }, []);

  const [formOuvert, setFormOuvert] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [vehicule, setVehicule] = useState("V-102");
  const [date, setDate] = useState("2026-08-11");
  const [litres, setLitres] = useState(40);
  const [montant, setMontant] = useState(3400);
  const [station, setStation] = useState("SPAT Station");
  const [km, setKm] = useState(450);

  // Suivi du mode édition
  const [transactionEnEdition, setTransactionEnEdition] = useState<TransactionCarburant | null>(null);

  const stats = useMemo(() => {
    const totalLitres = transactions.reduce((acc, item) => acc + item.litres, 0);
    const totalMontant = transactions.reduce((acc, item) => acc + item.montant, 0);
    const totalKm = transactions.reduce((acc, item) => acc + item.km, 0);
    const ratio = totalKm > 0 ? (totalLitres / totalKm) * 100 : 0;
    return { totalLitres, totalMontant, totalKm, ratio };
  }, [transactions]);

  const transactionsFiltres = transactions.filter((item) => {
    const terme = recherche.toLowerCase();
    return [item.vehicule, item.date, item.station]
      .some((valeur) => valeur.toLowerCase().includes(terme));
  });

  const resetFormulaire = () => {
    setVehicule("V-102");
    setDate("2026-08-11");
    setLitres(40);
    setMontant(3400);
    setStation("SPAT Station");
    setKm(450);
    setTransactionEnEdition(null);
  };

  const ouvrirCreation = () => {
    if (lectureSeule) return;
    resetFormulaire();
    setFormOuvert(true);
  };

  const ouvrirEdition = (item: TransactionCarburant) => {
    if (lectureSeule) return;
    setTransactionEnEdition(item);
    setVehicule(item.vehicule);
    setDate(item.date);
    setLitres(item.litres);
    setMontant(item.montant);
    setStation(item.station);
    setKm(item.km);
    setFormOuvert(true);
  };

  const fermerFormulaire = () => {
    setFormOuvert(false);
    resetFormulaire();
  };

  const handleSoumettre = async (e: React.FormEvent) => {
    e.preventDefault();

    if (lectureSeule) return;

    const estEdition = transactionEnEdition !== null;
    const url = estEdition
      ? `${process.env.NEXT_PUBLIC_API_URL}/carburant/${transactionEnEdition!.id}`
      : `${process.env.NEXT_PUBLIC_API_URL}/carburant`;

    try {
      const res = await fetch(url, {
        method: estEdition ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ vehicule, date, litres, montant, station, km }),
      });

      if (!res.ok) {
        toast.error(estEdition ? "Erreur lors de la modification" : "Erreur lors de la création");
        return;
      }

      toast.success(estEdition ? "Transaction modifiée" : "Transaction carburant ajoutée");
      fermerFormulaire();
      chargerTransactions();
    } catch {
      toast.error("Impossible de contacter le serveur");
    }
  };

  const handleSupprimer = async (id: number) => {
    if (lectureSeule) return;

    if (!window.confirm("Voulez-vous vraiment supprimer cette transaction ?")) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/carburant/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        toast.error("Erreur lors de la suppression");
        return;
      }

      toast.success("Transaction supprimée");
      chargerTransactions();
    } catch {
      toast.error("Impossible de contacter le serveur");
    }
  };

  return (
    <>
      <style jsx global>{`
        input, select, textarea {
          color: #111827;
          background-color: #ffffff;
          border: 2px solid #111827;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
          font-size: 14px;
        }
        input::placeholder, textarea::placeholder {
          color: #4b5563;
        }
        input:focus, select:focus, textarea:focus {
          outline: 2px solid #dc2626;
          outline-offset: 1px;
        }
        .search-bar {
          border: 2px solid #111827;
          background-color: #ffffff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.16);
        }
        .search-button {
          box-shadow: 0 2px 8px rgba(0,0,0,0.16);
        }
        .icon-btn {
          transition: background-color 0.15s ease, transform 0.1s ease;
        }
        .icon-btn:hover {
          transform: translateY(-1px);
        }
      `}</style>
      <div style={{ minHeight: "100vh", backgroundColor: "#f3f4f6", padding: 32 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, position: "relative" }}>
          <div>
            <button
              onClick={() => router.push("/admin")}
              style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", marginBottom: 8, fontSize: 14 }}
            >
              ← Retour
            </button>
          </div>

          <h2 style={{ color: "#1e293b", margin: 0, position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
            Suivi carburant & consommation
          </h2>

          {!lectureSeule && (
            <button
              onClick={ouvrirCreation}
              style={{
                padding: "10px 20px",
                backgroundColor: "#dc2626",
                color: "white",
                border: "none",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              + Ajouter une transaction
            </button>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, marginBottom: 24 }}>
          <StatCard titre="Litres total" valeur={`${stats.totalLitres.toFixed(1)} L`} />
          <StatCard titre="Montant total" valeur={`${stats.totalMontant.toLocaleString()} FCFA`} />
          <StatCard titre="Km total" valeur={`${stats.totalKm} km`} />
          <StatCard titre="Ratio moyen" valeur={`${stats.ratio.toFixed(2)} L/100km`} />
        </div>

        {formOuvert && !lectureSeule && (
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
            <div style={{ backgroundColor: "white", borderRadius: 12, width: "100%", maxWidth: 760, padding: 28, boxShadow: "0 12px 40px rgba(0,0,0,0.25)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ margin: 0, color: "#111827", fontSize: 22 }}>
                  {transactionEnEdition ? "Modifier la transaction" : "Ajouter une transaction"}
                </h3>
                <button type="button" onClick={fermerFormulaire} style={{ border: "none", background: "transparent", fontSize: 22, cursor: "pointer", color: "#6b7280" }}>
                  ×
                </button>
              </div>

              <form onSubmit={handleSoumettre} style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(220px, 1fr))", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, color: "#374151", marginBottom: 6, fontWeight: 600 }}>Véhicule</label>
                  <input type="text" value={vehicule} onChange={(e) => setVehicule(e.target.value)} required style={{ padding: "10px 12px", border: "2px solid #111827", borderRadius: 8, width: "100%", fontSize: 14, color: "#111827", backgroundColor: "#ffffff" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, color: "#374151", marginBottom: 6, fontWeight: 600 }}>Date</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={{ padding: "10px 12px", border: "2px solid #111827", borderRadius: 8, width: "100%", fontSize: 14, color: "#111827", backgroundColor: "#ffffff" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, color: "#374151", marginBottom: 6, fontWeight: 600 }}>Litres</label>
                  <input type="number" value={litres} onChange={(e) => setLitres(Number(e.target.value))} required style={{ padding: "10px 12px", border: "2px solid #111827", borderRadius: 8, width: "100%", fontSize: 14, color: "#111827", backgroundColor: "#ffffff" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, color: "#374151", marginBottom: 6, fontWeight: 600 }}>Montant</label>
                  <input type="number" value={montant} onChange={(e) => setMontant(Number(e.target.value))} required style={{ padding: "10px 12px", border: "2px solid #111827", borderRadius: 8, width: "100%", fontSize: 14, color: "#111827", backgroundColor: "#ffffff" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, color: "#374151", marginBottom: 6, fontWeight: 600 }}>Station</label>
                  <input type="text" value={station} onChange={(e) => setStation(e.target.value)} required style={{ padding: "10px 12px", border: "2px solid #111827", borderRadius: 8, width: "100%", fontSize: 14, color: "#111827", backgroundColor: "#ffffff" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, color: "#374151", marginBottom: 6, fontWeight: 600 }}>Kilométrage</label>
                  <input type="number" value={km} onChange={(e) => setKm(Number(e.target.value))} required style={{ padding: "10px 12px", border: "2px solid #111827", borderRadius: 8, width: "100%", fontSize: 14, color: "#111827", backgroundColor: "#ffffff" }} />
                </div>
                <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                  <button type="button" onClick={fermerFormulaire} style={{ padding: "10px 16px", backgroundColor: "#e5e7eb", color: "#374151", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
                    Annuler
                  </button>
                  <button type="submit" style={{ padding: "10px 16px", backgroundColor: "#dc2626", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
                    {transactionEnEdition ? "Enregistrer" : "Enregistrer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 420 }}>
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher une transaction..."
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #111827", borderRadius: 8, fontSize: 14, color: "#111827", backgroundColor: "#ffffff", outline: "none" }}
            />
          </div>
          <button
            type="button"
            className="search-button"
            onClick={() => {}}
            style={{ padding: "10px 16px", backgroundColor: "#dc2626", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            Rechercher
          </button>
        </div>

        <div style={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <th style={thStyle}>Véhicule</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Litres</th>
                <th style={thStyle}>Montant</th>
                <th style={thStyle}>KM</th>
                <th style={thStyle}>Ratio</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {chargement ? (
                <tr>
                  <td colSpan={7} style={{ padding: 20, textAlign: "center", color: "#6b7280" }}>
                    Chargement...
                  </td>
                </tr>
              ) : transactionsFiltres.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 20, textAlign: "center", color: "#6b7280" }}>
                    Aucune transaction
                  </td>
                </tr>
              ) : (
                transactionsFiltres.map((item) => {
                  const ratio = item.km > 0 ? (item.litres / item.km) * 100 : 0;
                  return (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={tdStyle}>{item.vehicule}</td>
                      <td style={tdStyle}>{item.date}</td>
                      <td style={tdStyle}>{item.litres} L</td>
                      <td style={tdStyle}>{item.montant.toLocaleString()} FCFA</td>
                      <td style={tdStyle}>{item.km} km</td>
                      <td style={tdStyle}>{ratio.toFixed(2)} L/100km</td>
                      <td style={tdStyle}>
                        {!lectureSeule && (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              className="icon-btn"
                              onClick={() => ouvrirEdition(item)}
                              style={{
                                width: 34,
                                height: 34,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: "#eff6ff",
                                color: "#2563eb",
                                border: "1px solid #bfdbfe",
                                borderRadius: 8,
                                cursor: "pointer",
                              }}
                              aria-label={`Modifier ${item.vehicule}`}
                            >
                              <IconEdit />
                            </button>
                            <button
                              className="icon-btn"
                              onClick={() => handleSupprimer(item.id)}
                              style={{
                                width: 34,
                                height: 34,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: "#fef2f2",
                                color: "#dc2626",
                                border: "1px solid #fecaca",
                                borderRadius: 8,
                                cursor: "pointer",
                              }}
                              aria-label={`Supprimer ${item.vehicule}`}
                            >
                              <IconTrash />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function StatCard({ titre, valeur }: { titre: string; valeur: string }) {
  return (
    <div style={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20 }}>
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>{titre}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#1e293b" }}>{valeur}</div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 16px",
  fontSize: 13,
  color: "#6b7280",
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: "12px 16px",
  fontSize: 14,
  color: "#374151",
};