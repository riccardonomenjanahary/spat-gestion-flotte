"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Rapport {
  id: number;
  periode: string;
  type: string;
  statut: string;
  date: string;
}

export default function RapportsPage() {
  const router = useRouter();
  const [rapports, setRapports] = useState<Rapport[]>([]);
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

  const chargerRapports = async () => {
    setChargement(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rapports`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRapports(data);
    } catch {
      toast.error("Impossible de charger les rapports");
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerRapports();
  }, []);
  const [formOuvert, setFormOuvert] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [periode, setPeriode] = useState("Semaine 33");
  const [type, setType] = useState("Hebdomadaire");

  const rapportsFiltres = rapports.filter((rapport) => {
    const terme = recherche.toLowerCase();
    return [rapport.periode, rapport.type, rapport.statut, rapport.date]
      .some((valeur) => valeur.toLowerCase().includes(terme));
  });

  const handleGenerer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (lectureSeule) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rapports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          periode,
          type,
          statut: "Généré",
          date: new Date().toISOString().slice(0, 10),
        }),
      });

      if (!res.ok) {
        toast.error("Erreur lors de la génération du rapport");
        return;
      }

      toast.success("Rapport généré");
      setPeriode("Semaine 33");
      setType("Hebdomadaire");
      setFormOuvert(false);
      chargerRapports();
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
      `}</style>
      <div style={{ minHeight: "100vh", backgroundColor: "#f3f4f6", padding: 32 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, position: "relative" }}>
        <div>
          <button onClick={() => router.push("/admin")} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", marginBottom: 8, fontSize: 14 }}>
            ← Retour
          </button>
        </div>

        <h2 style={{ color: "#1e293b", margin: 0, position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
          Rapports & décisions
        </h2>

        {!lectureSeule && (
          <button onClick={() => setFormOuvert(true)} style={{ padding: "10px 20px", backgroundColor: "#dc2626", color: "white", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            + Générer un rapport
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard titre="Rapports générés" valeur={`${rapports.length}`} />
        <StatCard titre="Dernier type" valeur={rapports[0]?.type || "—"} />
        <StatCard titre="Dernière période" valeur={rapports[0]?.periode || "—"} />
      </div>

      {formOuvert && !lectureSeule && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div style={{ backgroundColor: "white", borderRadius: 12, width: "100%", maxWidth: 600, padding: 28, boxShadow: "0 12px 40px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: "#111827", fontSize: 22 }}>Générer un rapport</h3>
              <button type="button" onClick={() => setFormOuvert(false)} style={{ border: "none", background: "transparent", fontSize: 22, cursor: "pointer", color: "#6b7280" }}>
                ×
              </button>
            </div>

            <form onSubmit={handleGenerer} style={{ display: "grid", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, color: "#374151", marginBottom: 6, fontWeight: 600 }}>Période</label>
                <input type="text" value={periode} onChange={(e) => setPeriode(e.target.value)} required style={{ padding: "10px 12px", border: "2px solid #111827", borderRadius: 8, width: "100%", fontSize: 14, color: "#111827", backgroundColor: "#ffffff" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, color: "#374151", marginBottom: 6, fontWeight: 600 }}>Type</label>
                <select value={type} onChange={(e) => setType(e.target.value)} style={{ padding: "10px 12px", border: "2px solid #111827", borderRadius: 8, width: "100%", fontSize: 14, color: "#111827", backgroundColor: "#ffffff" }}>
                  <option value="Hebdomadaire">Hebdomadaire</option>
                  <option value="Mensuel">Mensuel</option>
                  <option value="Analyse coûts">Analyse coûts</option>
                </select>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setFormOuvert(false)} style={{ padding: "10px 16px", backgroundColor: "#e5e7eb", color: "#374151", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
                  Annuler
                </button>
                <button type="submit" style={{ padding: "10px 16px", backgroundColor: "#dc2626", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
                  Générer
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
            placeholder="Rechercher un rapport..."
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
              <th style={thStyle}>Période</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Statut</th>
              <th style={thStyle}>Date</th>
            </tr>
          </thead>
          <tbody>
            {chargement ? (
              <tr>
                <td colSpan={4} style={{ padding: 20, textAlign: "center", color: "#6b7280" }}>
                  Chargement...
                </td>
              </tr>
            ) : rapportsFiltres.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 20, textAlign: "center", color: "#6b7280" }}>
                  Aucun rapport
                </td>
              </tr>
            ) : (
              rapportsFiltres.map((rapport) => (
                <tr key={rapport.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={tdStyle}>{rapport.periode}</td>
                  <td style={tdStyle}>{rapport.type}</td>
                  <td style={tdStyle}>{rapport.statut}</td>
                  <td style={tdStyle}>{rapport.date}</td>
                </tr>
              ))
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