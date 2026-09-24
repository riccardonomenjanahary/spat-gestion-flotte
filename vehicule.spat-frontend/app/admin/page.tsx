"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import EnTete from "@/components/EnTete";
import { Users, Car, Fuel, Wrench, FileBarChart, UserRound, Route } from "lucide-react";

interface Vehicule {
  id: number;
  immatriculation: string;
  modele: string;
  statut: string;
  direction: string;
  etablissement: string;
}

export default function AdminPage() {
  const router = useRouter();

  const [stats, setStats] = useState({
    vehiculesActifs: "—",
    enMission: "—",
    enMaintenance: "—",
    utilisateurs: "—",
  });
  const [statsChargement, setStatsChargement] = useState(true);

  useEffect(() => {
    const chargerStats = async () => {
      const token = localStorage.getItem("token");

      try {
        const resVehicules = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vehicules`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        let vehiculesActifs = "—";
        let enMission = "—";
        let enMaintenance = "—";

        if (resVehicules.ok) {
          const vehicules: Vehicule[] = await resVehicules.json();
          vehiculesActifs = String(vehicules.length);
          enMission = String(vehicules.filter((v) => v.statut === "EN_MISSION").length);
          enMaintenance = String(vehicules.filter((v) => v.statut === "MAINTENANCE").length);
        }

        let utilisateurs = "—";
        try {
          const resUtilisateurs = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/utilisateurs`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (resUtilisateurs.ok) {
            const data = await resUtilisateurs.json();
            utilisateurs = String(data.length);
          }
        } catch {
          // endpoint utilisateurs optionnel
        }

        setStats({ vehiculesActifs, enMission, enMaintenance, utilisateurs });
      } catch {
        toast.error("Impossible de charger les statistiques");
      } finally {
        setStatsChargement(false);
      }
    };

    chargerStats();
  }, []);

  const menuItems = [
    { label: "Utilisateurs", path: "/admin/utilisateurs", icon: Users },
    { label: "Véhicules", path: "/admin/vehicules", icon: Car },
    { label: "Chauffeurs", path: "/admin/chauffeurs", icon: UserRound },
    { label: "Missions", path: "/admin/missions", icon: Route },
    { label: "Carburant", path: "/admin/carburant", icon: Fuel },
    { label: "Maintenance", path: "/admin/maintenance", icon: Wrench },
    { label: "Rapports", path: "/admin/rapports", icon: FileBarChart },
  ];

  const piliers = [
    {
      titre: "Gestion des flux en temps réel",
      description: "Statuts des véhicules, missions chauffeurs, positions GPS en direct.",
      action: () => router.push("/admin/missions"),
    },
    {
      titre: "Suivi de la consommation",
      description: "Transactions carburant, kilométrage, ratio L/100km.",
      action: () => router.push("/admin/statistiques/consommation"),
    },
    {
      titre: "Aide à la décision",
      description: "Coûts, maintenance, rapports hebdomadaires.",
      action: () => router.push("/admin/statistiques/aide-decision"),
    },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#f3f4f6" }}>
      <EnTete afficherNotifications={false} />

      <div style={{ display: "flex", flex: 1 }}>
        <div style={{ width: 220, backgroundColor: "white", borderRight: "1px solid #e5e7eb", padding: "20px 0" }}>
            <div style={{ padding: "0 20px", marginBottom: 12, color: "#9ca3af", fontSize: 12, textTransform: "uppercase" }}>
              Menu
            </div>
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 20px",
                    cursor: "pointer",
                    color: "#374151",
                    fontSize: 14,
                    borderLeft: "3px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f3f4f6";
                    e.currentTarget.style.borderLeft = "3px solid #dc2626";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.borderLeft = "3px solid transparent";
                  }}
                >
                  <Icon size={18} />
                  {item.label}
                </div>
              );
            })}
          </div>

        <div style={{ flex: 1, padding: 32 }}>
          <h2 style={{ color: "#1e293b", marginBottom: 8 }}>Tableau de bord de pilotage de flotte</h2>
          <p style={{ color: "#6b7280", marginBottom: 24, fontSize: 15 }}>
            Pilotage en temps réel des véhicules, chauffeurs, consommations et rapports d&apos;activité.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
            <StatCard titre="Véhicules actifs" valeur={stats.vehiculesActifs} chargement={statsChargement} />
            <StatCard titre="En mission" valeur={stats.enMission} chargement={statsChargement} />
            <StatCard titre="En maintenance" valeur={stats.enMaintenance} chargement={statsChargement} />
            <StatCard titre="Utilisateurs" valeur={stats.utilisateurs} chargement={statsChargement} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {piliers.map((pilier) => (
              <div
                key={pilier.titre}
                onClick={pilier.action}
                style={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: 24,
                  cursor: "pointer",
                  borderTop: "4px solid #ea580c",
                }}
              >
                <h3 style={{ color: "#1e293b", marginBottom: 8, fontSize: 16 }}>{pilier.titre}</h3>
                <p style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.5 }}>{pilier.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: "12px 20px", fontSize: 12, color: "#6b7280", backgroundColor: "white", borderTop: "1px solid #e5e7eb" }}>
        Copyright © 2026 SPAT. Tous droits réservés.
      </div>
    </div>
  );
}

function StatCard({ titre, valeur, chargement }: { titre: string; valeur: string; chargement: boolean }) {
  return (
    <div
      style={{
        backgroundColor: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: 20,
      }}
    >
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>{titre}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "#1e293b" }}>
        {chargement ? "…" : valeur}
      </div>
    </div>
  );
}