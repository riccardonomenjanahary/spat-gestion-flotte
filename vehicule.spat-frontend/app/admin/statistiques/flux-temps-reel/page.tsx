"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Vehicule {
  id: number;
  statut?: string; // "DISPONIBLE" | "EN_MISSION" | "MAINTENANCE" (à confirmer)
  immatriculation?: string;
}

export default function StatistiquesFluxPage() {
  const router = useRouter();
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    charger();
  }, []);

  const charger = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vehicules`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setVehicules(await res.json());
    } catch {
      toast.error("Impossible de charger les données");
    } finally {
      setChargement(false);
    }
  };

  const disponibles = vehicules.filter((v) => v.statut === "DISPONIBLE").length;
  const enMission = vehicules.filter((v) => v.statut === "EN_MISSION").length;
  const enMaintenance = vehicules.filter((v) => v.statut === "MAINTENANCE").length;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f3f4f6", padding: 32 }}>
      <button
        onClick={() => router.push("/admin")}
        style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 14, marginBottom: 20 }}
      >
        ← Retour au tableau de bord
      </button>

      <h2 style={{ color: "#1e293b", marginBottom: 8 }}>Gestion des flux en temps réel</h2>
      <p style={{ color: "#6b7280", marginBottom: 24, fontSize: 15 }}>
        Statuts des véhicules, affectations chauffeurs, positions GPS en direct.
      </p>

      {chargement ? (
        <p style={{ color: "#6b7280" }}>Chargement...</p>
      ) : (
        <>
          {/* ===== Section 1 : Statuts des véhicules ===== */}
          <section style={{ marginBottom: 32 }}>
            <h3 style={{ color: "#1e293b", fontSize: 16, marginBottom: 12 }}>Statuts des véhicules</h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 16 }}>
              <CarteStat titre="Véhicules disponibles" valeur={String(disponibles)} couleur="#16a34a" />
              <CarteStat titre="En mission" valeur={String(enMission)} couleur="#2563eb" />
              <CarteStat titre="En maintenance" valeur={String(enMaintenance)} couleur="#dc2626" />
            </div>

            <div style={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    <th style={thStyle}>Immatriculation</th>
                    <th style={thStyle}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicules.length === 0 ? (
                    <tr>
                      <td colSpan={2} style={{ padding: 20, textAlign: "center", color: "#6b7280" }}>
                        Aucun véhicule
                      </td>
                    </tr>
                  ) : (
                    vehicules.map((v) => (
                      <tr key={v.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={tdStyle}>{v.immatriculation || "—"}</td>
                        <td style={tdStyle}>{v.statut || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ===== Section 2 : Affectations chauffeurs ===== */}
          <section style={{ marginBottom: 32 }}>
            <h3 style={{ color: "#1e293b", fontSize: 16, marginBottom: 12 }}>Affectations chauffeurs</h3>
            <div
              style={{
                backgroundColor: "white",
                border: "1px dashed #d1d5db",
                borderRadius: 8,
                padding: 32,
                textAlign: "center",
                color: "#9ca3af",
              }}
            >
              Le module d'affectation chauffeurs n'est pas encore créé côté backend (entités Chauffeur/Affectation à développer).
            </div>
          </section>

          {/* ===== Section 3 : Positions GPS en direct ===== */}
          <section>
            <h3 style={{ color: "#1e293b", fontSize: 16, marginBottom: 12 }}>Positions GPS en direct</h3>
            <div
              style={{
                backgroundColor: "white",
                border: "1px dashed #d1d5db",
                borderRadius: 8,
                padding: 32,
                textAlign: "center",
                color: "#9ca3af",
              }}
            >
              Le suivi GPS en temps réel n'est pas encore développé pour ce projet.
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function CarteStat({ titre, valeur, couleur }: { titre: string; valeur: string; couleur: string }) {
  return (
    <div style={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20, borderTop: `4px solid ${couleur}` }}>
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>{titre}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color: "#1e293b" }}>{valeur}</div>
    </div>
  );
}

const thStyle: React.CSSProperties = { textAlign: "left", padding: "12px 16px", fontSize: 13, color: "#6b7280", fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: "12px 16px", fontSize: 14, color: "#374151" };
