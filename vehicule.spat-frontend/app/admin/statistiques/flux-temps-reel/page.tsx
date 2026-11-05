"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { GpsPosition } from "@/components/FlotteMap";

const FlotteMap = dynamic(() => import("@/components/FlotteMap"), {
  ssr: false,
});

interface Vehicule {
  id: number;
  immatriculation: string;
  gpsEquipe?: boolean | null;
  gpsDeviceId?: number | null;
  statut?: string;
}

interface Affectation {
  id: number;
  vehicule?: { immatriculation?: string | null } | null;
  chauffeur?: { nom?: string | null; prenom?: string | null } | null;
  dateDebut?: string | null;
  dateFin?: string | null;
  statut?: string | null;
  destination?: string | null;
}

export default function StatistiquesFluxPage() {
  const router = useRouter();
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [positionsGps, setPositionsGps] = useState<GpsPosition[]>([]);
  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [erreurAffectations, setErreurAffectations] = useState<string | null>(null);
  const [erreurGps, setErreurGps] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    let actif = true;
    const charger = async () => {
      const token = localStorage.getItem("token");
      const API = process.env.NEXT_PUBLIC_API_URL;
      if (!API || !token) {
        if (!token) router.replace("/login");
        if (actif) {
          setErreurGps("Configuration API ou session indisponible.");
          setErreurAffectations("Configuration API ou session indisponible.");
          setChargement(false);
        }
        return;
      }

      try {
        const [vehiculesRes, gpsRes] = await Promise.all([
          fetch(`${API}/vehicules`, {
            headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
            cache: "no-store",
          }),
          fetch(`${API}/gps/positions`, {
            headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
            cache: "no-store",
          }),
        ]);
        if (vehiculesRes.status === 401 || gpsRes.status === 401) {
          router.replace("/login");
          return;
        }
        if (!vehiculesRes.ok) throw new Error("Impossible de charger les véhicules.");
        if (!gpsRes.ok) throw new Error("Service GPS momentanément indisponible.");

        const [vehiculesData, gpsData] = await Promise.all([
          vehiculesRes.json(),
          gpsRes.json(),
        ]);
        if (!Array.isArray(vehiculesData) || !Array.isArray(gpsData)) {
          throw new Error("Format de réponse invalide pour les véhicules ou les positions GPS.");
        }
        if (actif) {
          setVehicules(vehiculesData as Vehicule[]);
          setPositionsGps(gpsData as GpsPosition[]);
          setErreurGps(null);
        }

        try {
          const affectationsRes = await fetch(`${API}/affectations`, {
            headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
            cache: "no-store",
          });
          if (!affectationsRes.ok) {
            if (affectationsRes.status === 401) router.replace("/login");
            throw new Error(`Service des affectations indisponible (HTTP ${affectationsRes.status}).`);
          }
          const affectationsData: unknown = await affectationsRes.json();
          if (!Array.isArray(affectationsData)) throw new Error("Format de réponse affectations invalide.");
          if (actif) {
            setAffectations(affectationsData as Affectation[]);
            setErreurAffectations(null);
          }
        } catch (error) {
          if (actif) {
            setAffectations([]);
            setErreurAffectations(error instanceof Error ? error.message : "Impossible de charger les affectations.");
          }
        }
      } catch (error) {
        if (actif) {
          setErreurGps(error instanceof Error ? error.message : "Impossible de charger les positions GPS.");
          setAffectations([]);
          setErreurAffectations("Les affectations n'ont pas pu être actualisées.");
        }
      } finally {
        if (actif) setChargement(false);
      }
    };

    void charger();
    const interval = window.setInterval(() => void charger(), 5000);
    return () => {
      actif = false;
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const disponibles = vehicules.filter((v) => v.statut === "DISPONIBLE").length;
  const enMission = vehicules.filter((v) => v.statut === "EN_MISSION").length;
  const enMaintenance = vehicules.filter((v) => v.statut === "MAINTENANCE").length;
  const vehiculesAvecGps = new Set(
    vehicules
      .filter((vehicule) => vehicule.gpsEquipe === true || vehicule.gpsDeviceId != null)
      .map((vehicule) => vehicule.id)
  );
  const positionsCartographiques = positionsGps.filter((position) =>
    vehiculesAvecGps.has(position.vehiculeId)
  );
  const gpsIndisponible = Boolean(erreurGps) || vehiculesAvecGps.size === 0 || positionsCartographiques.length === 0;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f3f4f6", padding: 32 }}>
      <button
        onClick={() => router.push("/admin")}
        style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 14, marginBottom: 20 }}
      >
        ← Retour au tableau de bord
      </button>

      <h2 style={{ color: "#1e293b", marginBottom: 8 }}>Gestion des flux en temps réel</h2>

      {chargement ? (
        <p style={{ color: "#6b7280" }}>Chargement...</p>
      ) : (
        <>

          <section style={{ marginBottom: 32 }}>
            <h3 style={{ color: "#1e293b", fontSize: 16, marginBottom: 12 }}>Statuts des véhicules</h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 16 }}>
              <CarteStat titre="Véhicules disponibles" valeur={erreurGps ? "—" : String(disponibles)} couleur="#16a34a" />
              <CarteStat titre="En mission" valeur={erreurGps ? "—" : String(enMission)} couleur="#2563eb" />
              <CarteStat titre="En maintenance" valeur={erreurGps ? "—" : String(enMaintenance)} couleur="#dc2626" />
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
                  {erreurGps ? (
                    <tr><td colSpan={2} role="alert" style={{ padding: 20, textAlign: "center", color: "#b91c1c" }}>{erreurGps}</td></tr>
                  ) : vehicules.length === 0 ? (
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

          <section style={{ marginBottom: 32 }}>
            <h3 style={{ color: "#1e293b", fontSize: 16, marginBottom: 12 }}>Affectations chauffeurs</h3>
            <div style={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
              {erreurAffectations ? (
                <p role="alert" style={{ margin: 0, padding: 20, color: "#b91c1c" }}>{erreurAffectations}</p>
              ) : affectations.length === 0 ? (
                <p style={{ margin: 0, padding: 20, textAlign: "center", color: "#6b7280" }}>Aucune affectation enregistrée.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                        <th style={thStyle}>Véhicule</th>
                        <th style={thStyle}>Chauffeur</th>
                        <th style={thStyle}>Destination</th>
                        <th style={thStyle}>Début</th>
                        <th style={thStyle}>Fin</th>
                        <th style={thStyle}>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...affectations]
                        .sort((a, b) => String(b.dateDebut || "").localeCompare(String(a.dateDebut || "")))
                        .map((affectation) => (
                          <tr key={affectation.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                            <td style={tdStyle}>{affectation.vehicule?.immatriculation || "—"}</td>
                            <td style={tdStyle}>{[affectation.chauffeur?.prenom, affectation.chauffeur?.nom].filter(Boolean).join(" ") || "—"}</td>
                            <td style={tdStyle}>{affectation.destination || "—"}</td>
                            <td style={tdStyle}>{formaterDateAffectation(affectation.dateDebut)}</td>
                            <td style={tdStyle}>{formaterDateAffectation(affectation.dateFin)}</td>
                            <td style={tdStyle}>{affectation.statut || "—"}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <section>
            <h3 style={{ color: "#1e293b", fontSize: 16, marginBottom: 12 }}>Positions GPS en direct</h3>
            <FlotteMap
              positions={gpsIndisponible ? [] : positionsCartographiques}
              height={560}
              showHeader={false}
              emptyMessage="GPS indisponible"
            />
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

function formaterDateAffectation(valeur?: string | null): string {
  if (!valeur) return "—";
  const date = new Date(valeur);
  if (Number.isNaN(date.getTime())) return valeur;
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

const thStyle: React.CSSProperties = { textAlign: "left", padding: "12px 16px", fontSize: 13, color: "#6b7280", fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: "12px 16px", fontSize: 14, color: "#374151" };
