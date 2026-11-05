"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, Clock3, Wrench } from "lucide-react";

type Mode = "LOGISTIQUE" | "MECANICIEN";
type Signalement = {
  id: number;
  vehicule?: { id?: number; immatriculation?: string | null } | null;
  typeIncident: string;
  description: string;
  gravite?: string | null;
  statut: string;
  dateSignalement?: string | null;
  datePlanification?: string | null;
  commentaireResolution?: string | null;
  dateResolution?: string | null;
};

const API = process.env.NEXT_PUBLIC_API_URL || "";
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString("fr-FR") : "—";
const libelleStatut: Record<string, string> = {
  SIGNALE: "À valider par la Logistique",
  VALIDEE: "Validé — à planifier",
  PLANIFIEE: "Planifié — en attente du mécanicien",
  EN_TRAITEMENT: "Réparation en cours",
  CLOTURE: "Réparation terminée",
};

export default function SignalementsIncidentsWorkflow({ mode }: { mode: Mode }) {
  const [signalements, setSignalements] = useState<Signalement[]>([]);
  const [dates, setDates] = useState<Record<number, string>>({});
  const [comptesRendus, setComptesRendus] = useState<Record<number, string>>({});
  const [actionEnCours, setActionEnCours] = useState<number | null>(null);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");

  const charger = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || !API) return;
    const response = await fetch(`${API}/signalements-incidents`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(await response.text() || `Erreur HTTP ${response.status}`);
    const data: unknown = await response.json();
    if (!Array.isArray(data)) throw new Error("La liste des signalements est invalide.");
    setSignalements(data as Signalement[]);
  }, []);

  useEffect(() => {
    let actif = true;
    const actualiser = async () => {
      try { await charger(); }
      catch (e) { if (actif) setErreur(e instanceof Error ? e.message : "Signalements indisponibles."); }
    };
    void actualiser();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void actualiser(); }, 15000);
    return () => { actif = false; window.clearInterval(timer); };
  }, [charger]);

  async function agir(id: number, action: "valider" | "planifier" | "prendre-en-charge" | "cloturer") {
    const token = localStorage.getItem("token");
    if (!token) { setErreur("Session expirée."); return; }
    if (action === "planifier" && !dates[id]) { setErreur("Choisissez la date et l'heure de planification."); return; }
    if (action === "cloturer" && !comptesRendus[id]?.trim()) { setErreur("Renseignez le compte rendu de réparation avant la clôture."); return; }
    setActionEnCours(id); setErreur(""); setMessage("");
    try {
      const body = action === "planifier" ? { datePlanification: dates[id] }
        : action === "cloturer" ? { commentaireResolution: comptesRendus[id].trim() }
        : {};
      const response = await fetch(`${API}/signalements-incidents/${id}/${action}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(await response.text() || "La mise à jour du signalement a échoué.");
      setMessage(action === "valider" ? "Signalement validé. Vous pouvez maintenant le planifier."
        : action === "planifier" ? "Intervention planifiée et transmise au mécanicien DID."
        : action === "prendre-en-charge" ? "Prise en charge enregistrée."
        : "Réparation clôturée. Le compte rendu est conservé dans l’historique.");
      await charger();
    } catch (e) { setErreur(e instanceof Error ? e.message : "Mise à jour impossible."); }
    finally { setActionEnCours(null); }
  }

  const visibles = mode === "LOGISTIQUE"
    ? signalements
    : signalements.filter(s => ["PLANIFIEE", "EN_TRAITEMENT", "CLOTURE"].includes(String(s.statut).toUpperCase()));

  return <section style={{ display: "grid", gap: 14 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={iconeTitre}><Wrench size={18} /></span>
      <div><h2 style={{ margin: 0, color: "#0f172a", fontSize: 18 }}>Signalements d’incident</h2>

      </div>
      <button type="button" onClick={() => void charger().catch(e => setErreur(String(e)))} style={boutonNeutre}>Actualiser</button>
    </div>
    {erreur && <div role="alert" style={alerteErreur}>{erreur}</div>}
    {message && <div role="status" style={alerteSucces}>{message}</div>}
    {!visibles.length && <div style={videStyle}>Aucun signalement {mode === "MECANICIEN" ? "planifié" : "à traiter"}.</div>}
    {visibles.map(s => {
      const statut = String(s.statut || "").toUpperCase();
      const ferme = statut === "CLOTURE";
      return <article key={s.id} style={carteStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div><strong style={{ color: "#0f172a", fontSize: 15 }}>{s.vehicule?.immatriculation || "Véhicule"} · {s.typeIncident}</strong>
            <div style={{ marginTop: 5, color: "#64748b", fontSize: 12 }}>Signalé le {formatDate(s.dateSignalement)} · Gravité : {s.gravite || "—"}</div>
          </div>
          <span style={badgeStatut}>{libelleStatut[statut] || statut}</span>
        </div>
        <p style={{ margin: 0, color: "#334155", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{s.description}</p>
        {s.datePlanification && <div style={metaStyle}><CalendarClock size={14} /> Prévu le {formatDate(s.datePlanification)}</div>}
        {s.commentaireResolution && <div style={compteRenduStyle}><strong>Compte rendu de réparation</strong><span>{s.commentaireResolution}</span><small>{formatDate(s.dateResolution)}</small></div>}

        {mode === "LOGISTIQUE" && statut === "SIGNALE" && <button type="button" disabled={actionEnCours === s.id} onClick={() => void agir(s.id, "valider")} style={boutonPrimaire}><CheckCircle2 size={15} />{actionEnCours === s.id ? "Validation…" : "Valider le signalement"}</button>}
        {mode === "LOGISTIQUE" && statut === "VALIDEE" && <div style={planificationStyle}>
          <label style={labelStyle}><span>Date et heure de planification</span><input type="datetime-local" min={maintenantLocal()} value={dates[s.id] || ""} onChange={e => setDates(old => ({ ...old, [s.id]: e.target.value }))} style={inputStyle} /></label>
          <button type="button" disabled={actionEnCours === s.id} onClick={() => void agir(s.id, "planifier")} style={boutonPrimaire}><CalendarClock size={15} />{actionEnCours === s.id ? "Planification…" : "Planifier l’intervention"}</button>
        </div>}
        {mode === "MECANICIEN" && statut === "PLANIFIEE" && <button type="button" disabled={actionEnCours === s.id} onClick={() => void agir(s.id, "prendre-en-charge")} style={boutonPrimaire}><Wrench size={15} />Prendre en charge</button>}
        {mode === "MECANICIEN" && statut === "EN_TRAITEMENT" && <div style={planificationStyle}>
          <label style={labelStyle}><span>Compte rendu de réparation (obligatoire)</span><textarea rows={3} maxLength={2000} value={comptesRendus[s.id] || ""} onChange={e => setComptesRendus(old => ({ ...old, [s.id]: e.target.value }))} style={{ ...inputStyle, resize: "vertical" }} /></label>
          <button type="button" disabled={actionEnCours === s.id} onClick={() => void agir(s.id, "cloturer")} style={boutonPrimaire}><CheckCircle2 size={15} />{actionEnCours === s.id ? "Clôture…" : "Clôturer après réparation"}</button>
        </div>}
        {ferme && <div style={{ ...metaStyle, color: "#15803d" }}><Clock3 size={14} /> Intervention terminée</div>}
      </article>;
    })}
  </section>;
}

function maintenantLocal() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

const iconeTitre: React.CSSProperties = { display: "grid", placeItems: "center", width: 38, height: 38, borderRadius: 11, background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" };
const carteStyle: React.CSSProperties = { display: "grid", gap: 12, padding: 16, borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", boxShadow: "0 2px 6px rgba(15,23,42,.04)" };
const badgeStatut: React.CSSProperties = { alignSelf: "flex-start", borderRadius: 999, padding: "5px 10px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", fontSize: 11.5, fontWeight: 750 };
const boutonPrimaire: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, justifySelf: "start", padding: "9px 13px", borderRadius: 8, border: "1px solid #1d4ed8", background: "#2563eb", color: "#fff", fontSize: 12.5, fontWeight: 750, cursor: "pointer" };
const boutonNeutre: React.CSSProperties = { marginLeft: "auto", padding: "8px 11px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontSize: 12, fontWeight: 700, cursor: "pointer" };
const labelStyle: React.CSSProperties = { display: "grid", gap: 6, color: "#334155", fontSize: 12, fontWeight: 700 };
const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "9px 11px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", font: "inherit" };
const planificationStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "minmax(220px, 1fr) auto", alignItems: "end", gap: 10 };
const metaStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, color: "#64748b", fontSize: 12 };
const compteRenduStyle: React.CSSProperties = { display: "grid", gap: 5, padding: 11, borderRadius: 9, background: "#f8fafc", color: "#334155", fontSize: 12.5 };
const videStyle: React.CSSProperties = { padding: 22, textAlign: "center", border: "1px dashed #cbd5e1", borderRadius: 12, color: "#64748b", background: "#f8fafc", fontSize: 13 };
const alerteErreur: React.CSSProperties = { padding: 10, borderRadius: 8, color: "#991b1b", background: "#fef2f2", border: "1px solid #fecaca", fontSize: 12.5 };
const alerteSucces: React.CSSProperties = { padding: 10, borderRadius: 8, color: "#166534", background: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: 12.5 };
