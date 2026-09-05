"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface VehiculeFlux {
  id: number;
  immatriculation: string;
  statut: string;
  chauffeur: string;
  position: string;
}

export default function FluxPage() {
  const router = useRouter();
  const [recherche, setRecherche] = useState("");
  const [vehicules, setVehicules] = useState<VehiculeFlux[]>([
    { id: 1, immatriculation: "V-102", statut: "EN_MISSION", chauffeur: "Moussa Diallo", position: "Route Nord" },
    { id: 2, immatriculation: "V-205", statut: "DISPONIBLE", chauffeur: "Awa Sow", position: "Base" },
    { id: 3, immatriculation: "V-311", statut: "MAINTENANCE", chauffeur: "—", position: "Atelier" },
  ]);

  const vehiculesFiltres = vehicules.filter((vehicule) => {
    const terme = recherche.toLowerCase();
    return [vehicule.immatriculation, vehicule.statut, vehicule.chauffeur, vehicule.position]
      .some((valeur) => valeur.toLowerCase().includes(terme));
  });

  const changerStatut = (id: number, statut: string) => {
    setVehicules((prev) => prev.map((item) => (item.id === id ? { ...item, statut } : item)));
    toast.success("Statut du véhicule mis à jour");
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
        <h2 style={{ color: "#1e293b", margin: 0, position: "absolute", left: "50%", transform: "translateX(-50%)" }}>Flux temps réel</h2>
        <div style={{ padding: "8px 14px", backgroundColor: "#dc2626", color: "white", borderRadius: 999, fontSize: 13, fontWeight: 600 }}>Live</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard titre="Disponibles" valeur={`${vehicules.filter((v) => v.statut === "DISPONIBLE").length}`} />
        <StatCard titre="En mission" valeur={`${vehicules.filter((v) => v.statut === "EN_MISSION").length}`} />
        <StatCard titre="Maintenance" valeur={`${vehicules.filter((v) => v.statut === "MAINTENANCE").length}`} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 420 }}>
          <input
            type="text"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un véhicule ou un statut..."
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
          <thead><tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}><th style={thStyle}>Véhicule</th><th style={thStyle}>Statut</th><th style={thStyle}>Chauffeur</th><th style={thStyle}>Position</th></tr></thead>
          <tbody>{vehiculesFiltres.map((vehicule) => <tr key={vehicule.id} style={{ borderBottom: "1px solid #f3f4f6" }}><td style={tdStyle}>{vehicule.immatriculation}</td><td style={tdStyle}><select value={vehicule.statut} onChange={(e) => changerStatut(vehicule.id, e.target.value)} style={{ padding: "8px 10px", border: "2px solid #111827", borderRadius: 6, fontSize: 13, color: "#111827", backgroundColor: "#ffffff" }}><option value="DISPONIBLE">Disponible</option><option value="EN_MISSION">En mission</option><option value="MAINTENANCE">Maintenance</option></select></td><td style={tdStyle}>{vehicule.chauffeur}</td><td style={tdStyle}>{vehicule.position}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
    </>
  );
}

function StatCard({ titre, valeur }: { titre: string; valeur: string }) {
  return <div style={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20 }}><div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>{titre}</div><div style={{ fontSize: 22, fontWeight: 700, color: "#1e293b" }}>{valeur}</div></div>;
}

const thStyle: React.CSSProperties = { textAlign: "left", padding: "12px 16px", fontSize: 13, color: "#6b7280", fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: "12px 16px", fontSize: 14, color: "#374151" };
