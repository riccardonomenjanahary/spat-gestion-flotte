"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import {
  CalendarClock,
  Car,
  CheckCircle2,
  Inbox,
  RefreshCw,
  Route,
  TriangleAlert,
  User,
} from "lucide-react";

type Vehicule = { id: number; immatriculation: string; categorie?: string };
type Chauffeur = { id: number; nom: string; prenom?: string };
type Navette = { id: number; motif: string; dateDebut: string; statut: string; vehicule?: Vehicule; chauffeur?: Chauffeur };

async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    method, cache: "no-store", headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const message = await response.text();
    try { const error = JSON.parse(message); throw new Error(error.detail || error.message || error.erreur || message); }
    catch (error) { throw error instanceof SyntaxError ? new Error(message || `Erreur HTTP ${response.status}`) : error; }
  }
  return response.json();
}

export default function NavettesPact({ onPlanifie }: { onPlanifie?: () => void }) {
  const [navettes, setNavettes] = useState<Navette[]>([]);
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [choix, setChoix] = useState<Record<number, { vehiculeId: string; chauffeurId: string }>>({});
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");
  const [enCours, setEnCours] = useState<number | null>(null);
  const charger = useCallback(async () => {
    const [n, v, c] = await Promise.all([api<Navette[]>("/navettes-pact"), api<Vehicule[]>("/vehicules"), api<Chauffeur[]>("/chauffeurs")]);
    setNavettes(n); setVehicules(v); setChauffeurs(c);
  }, []);
  useEffect(() => {
    let actif = true;
    Promise.all([api<Navette[]>("/navettes-pact"), api<Vehicule[]>("/vehicules"), api<Chauffeur[]>("/chauffeurs")])
      .then(([n, v, c]) => { if (actif) { setNavettes(n); setVehicules(v); setChauffeurs(c); } })
      .catch(e => { if (actif) setErreur(String(e)); });
    return () => { actif = false; };
  }, []);
  async function affecter(id: number) {
    setEnCours(id); setErreur(""); setMessage("");
    try {
      await api(`/navettes-pact/${id}/affectation`, "PUT", { vehiculeId: Number(choix[id]?.vehiculeId), chauffeurId: Number(choix[id]?.chauffeurId) });
      setMessage(`Navette TKT-${id} planifiée automatiquement.`); await charger(); onPlanifie?.();
    } catch (e) { setErreur(e instanceof Error ? e.message : String(e)); }
    finally { setEnCours(null); }
  }
  return <div style={{ display: "grid", gap: 18 }}>
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <span style={badgeIconeStyle}><Route size={20} /></span>
        <div style={{ display: "grid", gap: 3 }}>
          <strong style={{ fontSize: 15, color: "#0f172a" }}>Circuits récurrents</strong>

        </div>
      </div>
      <button type="button" onClick={() => void charger().catch(e => setErreur(String(e)))} style={boutonSecondaireStyle}>
        <RefreshCw size={15} /> Actualiser
      </button>
    </div>
    {erreur && <div role="alert" style={alerteErreurStyle}><TriangleAlert size={16} /> <span>{erreur}</span></div>}
    {message && <div role="status" style={alerteSuccesStyle}><CheckCircle2 size={16} /> <span>{message}</span></div>}
    {!navettes.length && <div style={videStyle}><Inbox size={26} /><span>Aucune navette générée pour le moment.</span></div>}
    {navettes.length > 0 && <div style={{ display: "grid", gap: 12 }}>
      {navettes.map(n => <article key={n.id} style={carteStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={badgeTicketStyle}>TKT-{String(n.id).padStart(5, "0")}</span>
            <strong style={{ fontSize: 14.5, color: "#0f172a" }}>{n.motif}</strong>
          </div>
          <span style={n.statut === "EN_ATTENTE" ? badgeAttenteStyle : badgePretStyle}>
            {n.statut === "EN_ATTENTE" ? "À affecter" : n.statut}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#64748b", fontSize: 12.5 }}>
          <CalendarClock size={14} /> {new Date(n.dateDebut).toLocaleString("fr-FR")}
        </div>
        {n.statut === "EN_ATTENTE" ? <form onSubmit={e => { e.preventDefault(); void affecter(n.id); }} style={{ display: "grid", gap: 12, marginTop: 2 }}>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <label style={champStyle}>
              <span>Véhicule</span>
              <select required style={selectStyle} value={choix[n.id]?.vehiculeId || ""} onChange={e => setChoix(p => ({ ...p, [n.id]: { chauffeurId: p[n.id]?.chauffeurId || "", vehiculeId: e.target.value } }))}>
                <option value="">Choisir</option>{vehicules.filter(v => !/patrouille|moto/i.test(v.categorie || "")).map(v => <option key={v.id} value={v.id}>{v.immatriculation} · {v.categorie}</option>)}
              </select>
            </label>
            <label style={champStyle}>
              <span>Chauffeur</span>
              <select required style={selectStyle} value={choix[n.id]?.chauffeurId || ""} onChange={e => setChoix(p => ({ ...p, [n.id]: { vehiculeId: p[n.id]?.vehiculeId || "", chauffeurId: e.target.value } }))}>
                <option value="">Choisir</option>{chauffeurs.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>)}
              </select>
            </label>
          </div>
          <button type="submit" disabled={enCours !== null} style={{ ...boutonPrimaireStyle, opacity: enCours !== null ? 0.6 : 1, cursor: enCours !== null ? "wait" : "pointer" }}>
            <CheckCircle2 size={15} /> {enCours === n.id ? "Vérification…" : "Affecter et planifier"}
          </button>
        </form> : <div style={{ display: "flex", gap: 16, flexWrap: "wrap", color: "#334155", fontSize: 13 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Car size={14} /> {n.vehicule?.immatriculation}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><User size={14} /> {n.chauffeur?.nom} {n.chauffeur?.prenom}</span>
        </div>}
      </article>)}
    </div>}
  </div>;
}

const badgeIconeStyle: CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  width: 38, height: 38, flex: "0 0 auto", borderRadius: 11,
  background: "linear-gradient(135deg, #dbeafe, #eff6ff)", color: "#1d4ed8",
  border: "1px solid #bfdbfe",
};

const boutonSecondaireStyle: CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "9px 14px", borderRadius: 9, border: "1px solid #cbd5e1",
  background: "#fff", color: "#334155", fontSize: 13, fontWeight: 600, cursor: "pointer",
};

const boutonPrimaireStyle: CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
  padding: "10px 16px", borderRadius: 9, border: "1px solid #1d4ed8",
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff",
  fontSize: 13, fontWeight: 700,
};

const alerteErreurStyle: CSSProperties = {
  display: "flex", alignItems: "center", gap: 8,
  padding: "11px 14px", borderRadius: 10,
  background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", fontSize: 13,
};

const alerteSuccesStyle: CSSProperties = {
  display: "flex", alignItems: "center", gap: 8,
  padding: "11px 14px", borderRadius: 10,
  background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", fontSize: 13,
};

const videStyle: CSSProperties = {
  display: "grid", placeItems: "center", gap: 8,
  padding: "34px 20px", borderRadius: 14,
  border: "1px dashed #cbd5e1", background: "#f8fafc", color: "#94a3b8", fontSize: 13,
};

const carteStyle: CSSProperties = {
  display: "grid", gap: 10, padding: 16, borderRadius: 14,
  border: "1px solid #e2e8f0", background: "#fff",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)",
};

const badgeTicketStyle: CSSProperties = {
  fontFamily: "monospace", fontSize: 11.5, fontWeight: 700, color: "#1d4ed8",
  background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 7, padding: "3px 8px",
};

const badgeAttenteStyle: CSSProperties = {
  fontSize: 11.5, fontWeight: 700, color: "#b45309",
  background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 999, padding: "4px 10px",
};

const badgePretStyle: CSSProperties = {
  fontSize: 11.5, fontWeight: 700, color: "#15803d",
  background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 999, padding: "4px 10px",
};

const champStyle: CSSProperties = {
  display: "grid", gap: 5, fontSize: 12, fontWeight: 600, color: "#475569",
};

const selectStyle: CSSProperties = {
  width: "100%", padding: "9px 11px", borderRadius: 9,
  border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a",
  fontSize: 13, fontWeight: 500,
};
