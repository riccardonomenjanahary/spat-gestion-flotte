"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TrendingUp, Wrench, Fuel, ClipboardList } from "lucide-react";

interface Reservation {
  id: number;
  statut?: string | null;
  dateCreation?: string | null;
  demandeUrgente?: boolean | null;
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

interface DecisionData {
  reservations: Reservation[];
  maintenances: Maintenance[];
  carburant: TransactionCarburant[];
}

const VIDE: DecisionData = { reservations: [], maintenances: [], carburant: [] };
const HEADERS = { Accept: "application/json" };

export default function StatistiquesAideDecisionPage() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;
  const [donnees, setDonnees] = useState<DecisionData>(VIDE);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!API || !token) {
      if (!token) router.replace("/login");
      setErreur("Configuration API ou session indisponible.");
      setChargement(false);
      return;
    }

    setChargement(true);
    setErreur(null);
    const headers = { ...HEADERS, Authorization: `Bearer ${token}` };
    try {
      const [reservationsRes, maintenancesRes, carburantRes] = await Promise.all([
        fetch(`${API}/reservations`, { headers, cache: "no-store" }),
        fetch(`${API}/maintenances`, { headers, cache: "no-store" }),
        fetch(`${API}/carburant`, { headers, cache: "no-store" }),
      ]);
      if ([reservationsRes, maintenancesRes, carburantRes].some((res) => res.status === 401)) {
        router.replace("/login");
        return;
      }
      const erreurs = [reservationsRes, maintenancesRes, carburantRes].filter((res) => !res.ok);
      if (erreurs.length) throw new Error(`Les statistiques ne peuvent pas être chargées (HTTP ${erreurs[0].status}).`);
      const [reservations, maintenances, carburant] = await Promise.all([
        reservationsRes.json(), maintenancesRes.json(), carburantRes.json(),
      ]);
      if (![reservations, maintenances, carburant].every(Array.isArray)) {
        throw new Error("Format de réponse invalide pour les statistiques.");
      }
      setDonnees({
        reservations,
        maintenances,
        carburant,
      });
    } catch (cause) {
      console.error("Erreur aide à la décision :", cause);
      const message = cause instanceof Error ? cause.message : "Impossible de charger les données.";
      setDonnees(VIDE);
      setErreur(message);
      toast.error(message);
    } finally {
      setChargement(false);
    }
  }, [API, router]);

  useEffect(() => { void charger(); }, [charger]);

  const stats = useMemo(() => {
    const now = new Date();
    const monthKey = now.toISOString().slice(0, 7);
    const monthRows = donnees.carburant.filter((t) => String(t.dateOperation || "").slice(0, 7) === monthKey);
    const coutMois = monthRows.reduce((sum, t) => sum + Number(t.montantTotal ?? Number(t.quantiteLitres || 0) * Number(t.prixUnitaire || 0)), 0);
    const litresMois = monthRows.filter((t) => String(t.type).toUpperCase() === "CONSOMMATION")
      .reduce((sum, t) => sum + Number(t.quantiteLitres || 0), 0);
    const entretienEnAttente = donnees.maintenances.filter((m) => String(m.statut || "").toUpperCase() === "EN_ATTENTE_VALIDATION_ENTRETIEN").length;
    const missionsEnAttente = donnees.reservations.filter((r) => ["EN_ATTENTE", "EN_ATTENTE_AVIS_DID"].includes(String(r.statut || "").toUpperCase())).length;
    const depuis7J = new Date(now.getTime() - 7 * 86_400_000);
    const creees7J = donnees.reservations.filter((r) => r.dateCreation && new Date(r.dateCreation) >= depuis7J).length;
    const coutsMensuels = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const montant = donnees.carburant.filter((t) => String(t.dateOperation || "").slice(0, 7) === key)
        .reduce((sum, t) => sum + Number(t.montantTotal ?? Number(t.quantiteLitres || 0) * Number(t.prixUnitaire || 0)), 0);
      return { label: new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(date), value: montant };
    });
    const statutsMaintenance = ["EN_ATTENTE_VALIDATION_ENTRETIEN", "ENTRETIEN_AUTORISE", "ENTRETIEN_TERMINE", "CLOTUREE", "REFUSEE"]
      .map((status) => ({
        label: maintenanceLabel(status),
        value: donnees.maintenances.filter((m) => String(m.statut || "").toUpperCase() === status).length,
      }));
    return { coutMois, litresMois, entretienEnAttente, missionsEnAttente, creees7J, coutsMensuels, statutsMaintenance };
  }, [donnees]);

  return (
    <main className="decision-page">
      <style jsx>{styles}</style>
      <div className="decision-container">
        <header className="decision-header">
          <div>
            <button type="button" className="back-button" onClick={() => router.push("/admin")}>← Retour au tableau de bord</button>
            <h1>Aide à la décision</h1>

          </div>
        </header>

        {erreur && <div className="error-banner" role="alert">{erreur}</div>}

        <section className="kpi-grid" aria-label="Indicateurs clés">
          <Kpi icon={<Fuel size={18} />} label="Dépenses carburant ce mois" value={erreur ? "—" : `${formatMontant(stats.coutMois)} Ar`} hint="Transactions disponibles" />
          <Kpi icon={<TrendingUp size={18} />} label="Consommation ce mois" value={erreur ? "—" : `${formatNombre(stats.litresMois)} L`} hint="Opérations de consommation" />
          <Kpi icon={<Wrench size={18} />} label="Entretiens à valider" value={erreur ? "—" : String(stats.entretienEnAttente)} hint="Demandes mécanicien / chauffeur" />
          <Kpi icon={<ClipboardList size={18} />} label="Missions en attente" value={erreur ? "—" : String(stats.missionsEnAttente)} hint={`${stats.creees7J} demande(s) créée(s) sur 7 jours`} />
        </section>

        {erreur ? (
          <div className="loading-panel">Les graphiques ne sont pas disponibles tant que les données API ne sont pas chargées.</div>
        ) : chargement && donnees.carburant.length === 0 && donnees.maintenances.length === 0 ? (
          <div className="loading-panel">Chargement des indicateurs…</div>
        ) : (
          <section className="charts-grid">
            <ChartPanel title="Dépenses carburant — 6 derniers mois">
              <ColumnChart data={stats.coutsMensuels} unit="Ar" />
            </ChartPanel>
            <ChartPanel title="Répartition des dossiers d’entretien">
              <HorizontalBars data={stats.statutsMaintenance} />
            </ChartPanel>
          </section>
        )}

      </div>
    </main>
  );
}

function Kpi({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return <article className="kpi-card"><div className="kpi-icon">{icon}</div><div className="kpi-label">{label}</div><strong className="kpi-value">{value}</strong><div className="kpi-hint">{hint}</div></article>;
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return <article className="chart-card"><h2>{title}</h2>{children}</article>;
}

function ColumnChart({ data, unit }: { data: Array<{ label: string; value: number }>; unit: string }) {
  const max = Math.max(1, ...data.map((item) => item.value));
  if (data.every((item) => item.value === 0)) return <ChartEmpty />;
  return <div className="column-chart">{data.map((item) => <div className="column-item" key={item.label}>
    <span className="column-value">{item.value ? formatNombre(item.value) : ""}</span>
    <div className="column-track"><div title={`${formatNombre(item.value)} ${unit}`} className="column-bar" style={{ height: `${item.value ? Math.max(4, item.value / max * 100) : 2}%` }} /></div>
    <span className="column-label">{item.label}</span>
  </div>)}</div>;
}

function HorizontalBars({ data }: { data: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...data.map((item) => item.value));
  if (data.every((item) => item.value === 0)) return <ChartEmpty />;
  return <div className="horizontal-bars">{data.map((item, index) => <div key={item.label}>
    <div className="bar-label"><span>{item.label}</span><strong>{item.value}</strong></div>
    <div className="bar-track"><div className={`bar-fill bar-${index % 5}`} style={{ width: `${Math.max(item.value ? 3 : 0, item.value / max * 100)}%` }} /></div>
  </div>)}</div>;
}

function ChartEmpty() {
  return <div className="chart-empty">Aucune donnée enregistrée pour cette période.</div>;
}

function maintenanceLabel(status: string) {
  const labels: Record<string, string> = {
    EN_ATTENTE_VALIDATION_ENTRETIEN: "En attente de validation",
    ENTRETIEN_AUTORISE: "Autorisé",
    ENTRETIEN_TERMINE: "Travail terminé",
    CLOTUREE: "Clôturé",
    REFUSEE: "Refusé",
  };
  return labels[status] || status;
}

function formatNombre(value: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value || 0);
}

function formatMontant(value: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value || 0);
}

const styles = `
  .decision-page { min-height:100vh; padding:28px 24px; box-sizing:border-box; background:#f3f4f6; color:#172033; }
  .decision-container { max-width:1200px; margin:0 auto; }
  .decision-header { display:flex; align-items:flex-end; justify-content:space-between; gap:18px; margin-bottom:22px; flex-wrap:wrap; }
  .decision-header h1 { margin:12px 0 5px; font-size:27px; }
  .decision-header p { margin:0; color:#64748b; font-size:14px; }
  .back-button { padding:0; border:0; background:transparent; color:#64748b; cursor:pointer; font-size:13px; }
  .error-banner { padding:12px 14px; margin-bottom:16px; border:1px solid #fecaca; border-radius:8px; color:#991b1b; background:#fef2f2; font-size:13px; }
  .kpi-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; margin-bottom:18px; }
  .kpi-card { min-width:0; padding:17px; border:1px solid #e2e8f0; border-radius:10px; background:white; box-shadow:0 2px 8px rgba(15,23,42,.04); }
  .kpi-icon { display:grid; place-items:center; width:34px; height:34px; margin-bottom:12px; border-radius:9px; background:#eff6ff; color:#2563eb; }
  .kpi-label { color:#64748b; font-size:12px; }
  .kpi-value { display:block; margin-top:5px; color:#172033; font-size:24px; }
  .kpi-hint { margin-top:5px; color:#94a3b8; font-size:11px; }
  .charts-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
  .chart-card { min-width:0; padding:20px; border:1px solid #e2e8f0; border-radius:10px; background:white; box-shadow:0 2px 8px rgba(15,23,42,.04); }
  .chart-card h2 { margin:0 0 20px; color:#1e293b; font-size:15px; }
  .column-chart { height:190px; display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); align-items:stretch; gap:10px; }
  .column-item { min-width:0; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; gap:6px; }
  .column-value { min-height:14px; color:#64748b; font-size:10px; }
  .column-track { width:100%; flex:1; display:flex; align-items:flex-end; justify-content:center; border-bottom:1px solid #e2e8f0; }
  .column-bar { width:min(36px,75%); min-height:3px; border-radius:6px 6px 2px 2px; background:linear-gradient(180deg,#60a5fa,#2563eb); }
  .column-label { color:#64748b; font-size:10px; text-transform:capitalize; }
  .horizontal-bars { display:grid; gap:14px; }
  .bar-label { display:flex; justify-content:space-between; gap:10px; margin-bottom:5px; color:#475569; font-size:12px; }
  .bar-track { height:9px; overflow:hidden; border-radius:999px; background:#f1f5f9; }
  .bar-fill { height:100%; border-radius:999px; background:#2563eb; }
  .bar-1 { background:#0ea5e9; } .bar-2 { background:#f59e0b; } .bar-3 { background:#16a34a; } .bar-4 { background:#ef4444; }
  .chart-empty,.loading-panel { min-height:140px; display:grid; place-items:center; padding:20px; box-sizing:border-box; color:#94a3b8; font-size:13px; text-align:center; }
  .footnote { margin:16px 2px 0; color:#64748b; font-size:11px; line-height:1.5; }
  @media (max-width:850px) { .kpi-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } .charts-grid { grid-template-columns:1fr; } }
  @media (max-width:500px) { .decision-page { padding:20px 14px; } .kpi-grid { grid-template-columns:1fr; } .column-chart { gap:5px; } }
`;
