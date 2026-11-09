"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import EnTete from "@/components/EnTete";
import { Users, Car, Fuel, Wrench, FileBarChart, UserRound, Route, Building2, BrainCircuit } from "lucide-react";

interface Vehicule {
  id: number;
  immatriculation: string;
  modele: string;
  statut: string;
  direction: string;
  etablissement: string;
}

interface Reservation {
  id: number;
  statut?: string | null;
  dateCreation?: string | null;
}

interface Maintenance {
  id: string;
  statut?: string | null;
  dateCreation?: string | null;
}

interface TransactionCarburant {
  id: string;
  type?: string | null;
  quantiteLitres?: number | null;
  montantTotal?: number | null;
  prixUnitaire?: number | null;
  dateOperation?: string | null;
}

interface DashboardData {
  vehicules: Vehicule[];
  reservations: Reservation[];
  maintenances: Maintenance[];
  carburant: TransactionCarburant[];
  utilisateurs: number | null;
}

const DONNEES_VIDES: DashboardData = {
  vehicules: [],
  reservations: [],
  maintenances: [],
  carburant: [],
  utilisateurs: null,
};

export default function AdminPage() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;
  const [donnees, setDonnees] = useState<DashboardData>(DONNEES_VIDES);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  const chargerStats = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!API || !token) {
      if (!token) router.replace("/login");
      setErreur("Configuration API ou session indisponible.");
      setChargement(false);
      return;
    }

    setChargement(true);
    setErreur(null);
    const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };
    const lireListe = async <T,>(chemin: string): Promise<T[]> => {
      const response = await fetch(`${API}${chemin}`, { headers, cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status} — ${chemin}`);
      const body: unknown = await response.json();
      if (Array.isArray(body)) return body as T[];
      if (body && typeof body === "object" && "content" in body && Array.isArray(body.content)) {
        return body.content as T[];
      }
      throw new Error(`Format de réponse invalide — ${chemin}`);
    };

    try {
      const [vehicules, reservations, maintenances, carburant] = await Promise.all([
        lireListe<Vehicule>("/vehicules"),
        lireListe<Reservation>("/reservations"),
        lireListe<Maintenance>("/maintenances"),
        lireListe<TransactionCarburant>("/carburant"),
      ]);
      let utilisateurs: number | null = null;
      try {
        const response = await fetch(`${API}/admin/utilisateurs`, { headers, cache: "no-store" });
        if (response.ok) {
          const body: unknown = await response.json();
          utilisateurs = Array.isArray(body) ? body.length : null;
        }
      } catch {

      }
      setDonnees({ vehicules, reservations, maintenances, carburant, utilisateurs });
    } catch (loadError) {
      console.error("Erreur chargement tableau de bord admin :", loadError);
      setDonnees(DONNEES_VIDES);
      const detail = loadError instanceof Error
        ? loadError.message
        : "Erreur inconnue pendant le chargement des statistiques.";
      setErreur(`Erreur de chargement : ${detail}`);
      toast.error(`Impossible de charger les statistiques : ${detail}`);
    } finally {
      setChargement(false);
    }
  }, [API, router]);

  useEffect(() => {
    const initialisation = window.setTimeout(() => {
      setRole(localStorage.getItem("role"));

    }, 0);
    return () => window.clearTimeout(initialisation);
  }, []);

  useEffect(() => {
    const initialisation = window.setTimeout(() => {
      void chargerStats();

    }, 0);
    return () => window.clearTimeout(initialisation);
  }, [chargerStats]);

  const statistiques = useMemo(() => {
    const compterStatut = (statuts: string[]) =>
      donnees.vehicules.filter((v) => statuts.includes(String(v.statut || "").toUpperCase())).length;
    const ceMois = new Date().toISOString().slice(0, 7);
    const litresMois = donnees.carburant
      .filter((t) => String(t.dateOperation || "").slice(0, 7) === ceMois && String(t.type).toUpperCase() === "CONSOMMATION")
      .reduce((total, t) => total + Number(t.quantiteLitres || 0), 0);
    const coutMois = donnees.carburant
      .filter((t) => String(t.dateOperation || "").slice(0, 7) === ceMois)
      .reduce((total, t) => total + Number(t.montantTotal ?? Number(t.quantiteLitres || 0) * Number(t.prixUnitaire || 0)), 0);
    const mois = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - (5 - index));
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      return {
        label: new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(date),
        value: donnees.carburant
          .filter((t) => String(t.dateOperation || "").slice(0, 7) === key && String(t.type).toUpperCase() === "CONSOMMATION")
          .reduce((total, t) => total + Number(t.quantiteLitres || 0), 0),
      };
    });
    const statutsMissions = ["EN_ATTENTE", "EN_ATTENTE_AVIS_DID", "VALIDEE", "REFUSEE", "CLOTUREE"]
      .map((statut) => ({
        label: statut.replaceAll("_", " "),
        value: donnees.reservations.filter((r) => String(r.statut || "").toUpperCase() === statut).length,
      }));
    return {
      vehicules: [
        { label: "Disponibles", value: compterStatut(["DISPONIBLE"]), color: "#16a34a" },
        { label: "En mission", value: compterStatut(["EN_MISSION"]), color: "#2563eb" },
        { label: "Maintenance", value: compterStatut(["MAINTENANCE", "EN_MAINTENANCE"]), color: "#d97706" },
        { label: "Hors service", value: compterStatut(["HORS_SERVICE", "REFORME"]), color: "#dc2626" },
      ],
      mois,
      statutsMissions,
      totalVehicules: donnees.vehicules.length,
      enMission: compterStatut(["EN_MISSION"]),
      maintenancesOuvertes: donnees.maintenances.filter((m) => !["CLOTUREE", "REFUSEE"].includes(String(m.statut || "").toUpperCase())).length,
      litresMois,
      coutMois,
      demandesEnAttente: donnees.reservations.filter((r) => ["EN_ATTENTE", "EN_ATTENTE_AVIS_DID"].includes(String(r.statut || "").toUpperCase())).length,
    };
  }, [donnees]);

  const menuItems = [
    { label: "Supervision globale", path: "/admin/supervision", icon: FileBarChart },
    { label: "Utilisateurs", path: "/admin/utilisateurs", icon: Users },
    { label: "Affectation", path: "/admin/directions", icon: Building2 },
    { label: "Véhicules", path: "/admin/vehicules", icon: Car },
    { label: "Chauffeurs", path: "/admin/chauffeurs", icon: UserRound },
    { label: "Missions", path: "/admin/missions", icon: Route },
    { label: "Carburant", path: "/admin/carburant", icon: Fuel },
    { label: "Maintenance", path: "/admin/maintenance", icon: Wrench },
    { label: "Rapports", path: "/admin/rapports", icon: FileBarChart },
    { label: "Aide à la décision", path: "/admin/statistiques/aide-decision", icon: BrainCircuit },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#f3f4f6" }}>
      <style jsx global>{responsiveDashboardStyles}</style>
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

        <div className="admin-dashboard-body" style={{ flex: 1, padding: 32 }}>
          <h2 style={{ color: "#1e293b", margin: "0 0 24px" }}>Tableau de bord de pilotage de flotte</h2>
          <a href="/admin/supervision" style={{ display: "block", marginBottom: 24, padding: 18, borderRadius: 12, background: "#0f172a", color: "white", textDecoration: "none" }}>
            <strong>Supervision globale →</strong>
          </a>

          {erreur && <p role="alert" style={{ color: "#b91c1c", margin: "0 0 18px" }}>{erreur}</p>}

          <div className="admin-kpi-grid" style={{ marginBottom: 24 }}>
            <StatCard titre="Véhicules" valeur={erreur ? "—" : String(statistiques.totalVehicules)} chargement={chargement} />
            <StatCard titre="En mission" valeur={erreur ? "—" : String(statistiques.enMission)} chargement={chargement} />
            <StatCard titre="Demandes en attente" valeur={erreur ? "—" : String(statistiques.demandesEnAttente)} chargement={chargement} />
            <StatCard titre="Entretiens ouverts" valeur={erreur ? "—" : String(statistiques.maintenancesOuvertes)} chargement={chargement} />
            <StatCard titre="Carburant consommé ce mois" valeur={erreur ? "—" : `${formatNombre(statistiques.litresMois)} L`} chargement={chargement} />
            <StatCard titre="Dépenses carburant ce mois" valeur={erreur ? "—" : `${formatNombre(statistiques.coutMois)} Ar`} chargement={chargement} />
          </div>

          <div className="admin-chart-grid" style={{ marginBottom: 24 }}>
            <ChartPanel title="État du parc">
              <HorizontalBars data={statistiques.vehicules} />
            </ChartPanel>
            <ChartPanel title="Consommation mensuelle (6 derniers mois)">
              <ColumnChart data={statistiques.mois} unit="L" />
            </ChartPanel>
            <ChartPanel title="Demandes de mission par statut">
              <HorizontalBars data={statistiques.statutsMissions.map((s) => ({ ...s, color: s.label === "REFUSEE" ? "#dc2626" : s.label === "CLOTUREE" ? "#64748b" : "#2563eb" }))} />
            </ChartPanel>
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
        borderRadius: 10,
        padding: 18,
        boxShadow: "0 2px 8px rgba(15,23,42,.04)",
      }}
    >
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>{titre}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "#1e293b" }}>
        {chargement ? "…" : valeur}
      </div>
    </div>
  );
}

function formatNombre(value: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value || 0);
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20, minWidth: 0, boxShadow: "0 2px 8px rgba(15,23,42,.04)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 15, color: "#1e293b" }}>{title}</h3>
      </div>
      {children}
    </section>
  );
}

function HorizontalBars({ data }: { data: Array<{ label: string; value: number; color: string }> }) {
  const max = Math.max(1, ...data.map((item) => item.value));
  if (data.every((item) => item.value === 0)) return <ChartEmpty />;
  return <div style={{ display: "grid", gap: 14 }}>{data.map((item) => (
    <div key={item.label}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 5, fontSize: 12, color: "#475569" }}><span>{item.label}</span><strong>{item.value}</strong></div>
      <div style={{ height: 9, overflow: "hidden", borderRadius: 999, background: "#f1f5f9" }}><div style={{ height: "100%", width: `${Math.max(item.value > 0 ? 3 : 0, item.value / max * 100)}%`, background: item.color, borderRadius: 999, transition: "width 250ms ease" }} /></div>
    </div>
  ))}</div>;
}

function ColumnChart({ data, unit }: { data: Array<{ label: string; value: number }>; unit: string }) {
  const max = Math.max(1, ...data.map((item) => item.value));
  if (data.every((item) => item.value === 0)) return <ChartEmpty />;
  return <div style={{ height: 180, display: "grid", gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))`, alignItems: "end", gap: 10, paddingTop: 12 }}>
    {data.map((item) => <div key={item.label} style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
      <span style={{ minHeight: 14, fontSize: 10, color: "#64748b" }}>{item.value ? formatNombre(item.value) : ""}</span>
      <div title={`${formatNombre(item.value)} ${unit}`} style={{ width: "min(34px, 80%)", minHeight: item.value ? 5 : 2, height: `${item.value ? Math.max(4, item.value / max * 100) : 2}%`, background: "linear-gradient(180deg, #60a5fa, #2563eb)", borderRadius: "6px 6px 2px 2px" }} />
      <span style={{ fontSize: 10, color: "#64748b", textTransform: "capitalize" }}>{item.label}</span>
    </div>)}
  </div>;
}

function ChartEmpty() {
  return <div style={{ minHeight: 120, display: "grid", placeItems: "center", color: "#94a3b8", fontSize: 13, textAlign: "center" }}>Aucune donnée enregistrée sur la période.</div>;
}

const responsiveDashboardStyles = `
  .admin-kpi-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
  .admin-chart-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
  @media (max-width: 950px) { .admin-chart-grid { grid-template-columns: 1fr; } }
  @media (max-width: 760px) { .admin-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 520px) { .admin-kpi-grid { grid-template-columns: 1fr; } }
`;
