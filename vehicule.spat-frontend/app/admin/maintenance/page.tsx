"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Maintenance {
  id: number;
  vehicule: string;
  type: string;
  date: string;
  km: number;
  cout: number;
  statut: string;
}

export default function MaintenancePage() {
  const router = useRouter();
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
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

  const chargerMaintenances = async () => {
    setChargement(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/maintenances`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMaintenances(data);
    } catch {
      toast.error("Impossible de charger les maintenances");
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerMaintenances();
  }, []);
  const [formOuvert, setFormOuvert] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [vehicule, setVehicule] = useState("");
  const [type, setType] = useState("Vidange");
  const [date, setDate] = useState("2026-08-11");
  const [km, setKm] = useState(13000);
  const [cout, setCout] = useState(200000);
  const [statut, setStatut] = useState("PLANIFIEE");

  const maintenancesFiltres = maintenances.filter((item) => {
    const terme = recherche.toLowerCase();
    return [item.vehicule, item.type, item.date, item.statut]
      .some((valeur) => valeur.toLowerCase().includes(terme));
  });

  const handleAjouter = async (e: React.FormEvent) => {
    e.preventDefault();

    if (lectureSeule) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/maintenances`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ vehicule, type, date, km, cout, statut }),
      });

      if (!res.ok) {
        toast.error("Erreur lors de la création");
        return;
      }

      toast.success("Intervention ajoutée");
      setVehicule("");
      setType("Vidange");
      setDate("2026-08-11");
      setKm(13000);
      setCout(200000);
      setStatut("PLANIFIEE");
      setFormOuvert(false);
      chargerMaintenances();
    } catch {
      toast.error("Impossible de contacter le serveur");
    }
  };

  const handleSupprimer = async (id: number) => {
    if (lectureSeule) return;

    if (!window.confirm("Voulez-vous vraiment supprimer cette intervention ?")) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/maintenances/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        toast.error("Erreur lors de la suppression");
        return;
      }

      toast.success("Intervention supprimée");
      chargerMaintenances();
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
        <div><button onClick={() => router.push("/admin")} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", marginBottom: 8, fontSize: 14 }}>← Retour</button></div>
        <h2 style={{ color: "#1e293b", margin: 0, position: "absolute", left: "50%", transform: "translateX(-50%)" }}>Maintenance & entretien</h2>
        {!lectureSeule && (
          <button onClick={() => setFormOuvert(true)} style={{ padding: "10px 20px", backgroundColor: "#dc2626", color: "white", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>+ Ajouter une intervention</button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard titre="Interventions" valeur={`${maintenances.length}`} />
        <StatCard titre="Planifiées" valeur={`${maintenances.filter((m) => m.statut === "PLANIFIEE").length}`} />
        <StatCard titre="Réalisées" valeur={`${maintenances.filter((m) => m.statut === "REALISEE").length}`} />
      </div>

      {formOuvert && !lectureSeule && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div style={{ backgroundColor: "white", borderRadius: 12, width: "100%", maxWidth: 760, padding: 28, boxShadow: "0 12px 40px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}><h3 style={{ margin: 0, color: "#111827", fontSize: 22 }}>Ajouter une intervention</h3><button type="button" onClick={() => setFormOuvert(false)} style={{ border: "none", background: "transparent", fontSize: 22, cursor: "pointer", color: "#6b7280" }}>×</button></div>
            <form onSubmit={handleAjouter} style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(220px, 1fr))", gap: 16 }}>
              <div><label style={{ display: "block", fontSize: 13, color: "#374151", marginBottom: 6, fontWeight: 600 }}>Véhicule</label><input type="text" value={vehicule} onChange={(e) => setVehicule(e.target.value)} required style={{ padding: "10px 12px", border: "2px solid #111827", borderRadius: 8, width: "100%", fontSize: 14, color: "#111827", backgroundColor: "#ffffff" }} /></div>
              <div><label style={{ display: "block", fontSize: 13, color: "#374151", marginBottom: 6, fontWeight: 600 }}>Type</label><input type="text" value={type} onChange={(e) => setType(e.target.value)} required style={{ padding: "10px 12px", border: "2px solid #111827", borderRadius: 8, width: "100%", fontSize: 14, color: "#111827", backgroundColor: "#ffffff" }} /></div>
              <div><label style={{ display: "block", fontSize: 13, color: "#374151", marginBottom: 6, fontWeight: 600 }}>Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={{ padding: "10px 12px", border: "2px solid #111827", borderRadius: 8, width: "100%", fontSize: 14, color: "#111827", backgroundColor: "#ffffff" }} /></div>
              <div><label style={{ display: "block", fontSize: 13, color: "#374151", marginBottom: 6, fontWeight: 600 }}>Kilométrage</label><input type="number" value={km} onChange={(e) => setKm(Number(e.target.value))} required style={{ padding: "10px 12px", border: "2px solid #111827", borderRadius: 8, width: "100%", fontSize: 14, color: "#111827", backgroundColor: "#ffffff" }} /></div>
              <div><label style={{ display: "block", fontSize: 13, color: "#374151", marginBottom: 6, fontWeight: 600 }}>Coût</label><input type="number" value={cout} onChange={(e) => setCout(Number(e.target.value))} required style={{ padding: "10px 12px", border: "2px solid #111827", borderRadius: 8, width: "100%", fontSize: 14, color: "#111827", backgroundColor: "#ffffff" }} /></div>
              <div><label style={{ display: "block", fontSize: 13, color: "#374151", marginBottom: 6, fontWeight: 600 }}>Statut</label><select value={statut} onChange={(e) => setStatut(e.target.value)} style={{ padding: "10px 12px", border: "2px solid #111827", borderRadius: 8, width: "100%", fontSize: 14, color: "#111827", backgroundColor: "#ffffff" }}><option value="PLANIFIEE">Planifiée</option><option value="REALISEE">Réalisée</option></select></div>
              <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}><button type="button" onClick={() => setFormOuvert(false)} style={{ padding: "10px 16px", backgroundColor: "#e5e7eb", color: "#374151", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Annuler</button><button type="submit" style={{ padding: "10px 16px", backgroundColor: "#dc2626", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Enregistrer</button></div>
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
            placeholder="Rechercher une intervention..."
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
          <thead><tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}><th style={thStyle}>Véhicule</th><th style={thStyle}>Type</th><th style={thStyle}>Date</th><th style={thStyle}>KM</th><th style={thStyle}>Coût</th><th style={thStyle}>Statut</th><th style={thStyle}>Actions</th></tr></thead>
          <tbody>
            {chargement ? (
              <tr>
                <td colSpan={7} style={{ padding: 20, textAlign: "center", color: "#6b7280" }}>
                  Chargement...
                </td>
              </tr>
            ) : maintenancesFiltres.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 20, textAlign: "center", color: "#6b7280" }}>
                  Aucune intervention
                </td>
              </tr>
            ) : (
              maintenancesFiltres.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={tdStyle}>{item.vehicule}</td>
                  <td style={tdStyle}>{item.type}</td>
                  <td style={tdStyle}>{item.date}</td>
                  <td style={tdStyle}>{item.km}</td>
                  <td style={tdStyle}>{item.cout.toLocaleString()} FCFA</td>
                  <td style={tdStyle}>{badgeStatut(item.statut)}</td>
                  <td style={tdStyle}>
                    {!lectureSeule && (
                      <button
                        onClick={() => handleSupprimer(item.id)}
                        style={{ width: 36, height: 36, display: "inline-flex", alignItems: "center", justifyContent: "center", backgroundColor: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 6, cursor: "pointer", fontSize: 16 }}
                        aria-label={`Supprimer ${item.vehicule}`}
                      >
                        🗑️
                      </button>
                    )}
                  </td>
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

function badgeStatut(statut: string) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    PLANIFIEE: { bg: "#dbeafe", color: "#1e40af", label: "Planifiée" },
    REALISEE: { bg: "#dcfce7", color: "#166534", label: "Réalisée" },
  };
  const style = styles[statut] || { bg: "#f3f4f6", color: "#374151", label: statut };
  return <span style={{ padding: "2px 10px", borderRadius: 12, fontSize: 12, backgroundColor: style.bg, color: style.color }}>{style.label}</span>;
}

function StatCard({ titre, valeur }: { titre: string; valeur: string }) {
  return <div style={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20 }}><div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>{titre}</div><div style={{ fontSize: 22, fontWeight: 700, color: "#1e293b" }}>{valeur}</div></div>;
}

const thStyle: React.CSSProperties = { textAlign: "left", padding: "12px 16px", fontSize: 13, color: "#6b7280", fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: "12px 16px", fontSize: 14, color: "#374151" };