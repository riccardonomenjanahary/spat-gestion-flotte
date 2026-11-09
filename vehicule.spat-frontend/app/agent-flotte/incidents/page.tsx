"use client";

import { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import EnTete from "@/components/EnTete";
import { ROLES } from "@/app/lib/roles";

type Vehicule = { id: number; immatriculation?: string | null; statut?: string | null };
type Incident = { id: number; vehicule?: Vehicule | null; typeIncident: string; description: string; statut: string; dateIncident: string };

export default function IncidentsPage() { return <RoleGuard role={ROLES.AGENT_FLOTTE}><IncidentsContent /></RoleGuard>; }
function IncidentsContent() {
  const API = process.env.NEXT_PUBLIC_API_URL || ""; const [vehicules, setVehicules] = useState<Vehicule[]>([]); const [incidents, setIncidents] = useState<Incident[]>([]); const [vehiculeId, setVehiculeId] = useState(""); const [typeIncident, setTypeIncident] = useState("PANNE"); const [description, setDescription] = useState(""); const [erreur, setErreur] = useState("");
  const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, Accept: "application/json" });
  const charger = async () => { const h = headers(); const [v, i] = await Promise.all([fetch(`${API}/vehicules`, { headers: h }), fetch(`${API}/signalements-incidents`, { headers: h })]); if (v.ok) setVehicules(await v.json()); if (i.ok) setIncidents(await i.json()); };
  useEffect(() => {
    const initialisation = window.setTimeout(() => { void charger();
    }, 0);
    return () => window.clearTimeout(initialisation);
  }, []);
  const soumettre = async (e: React.FormEvent) => { e.preventDefault(); const r = await fetch(`${API}/signalements-incidents`, { method: "POST", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify({ vehiculeId: Number(vehiculeId), typeIncident, description, gravite: "MOYEN" }) }); if (!r.ok) setErreur(await r.text() || "Signalement impossible."); else { setDescription(""); await charger(); } };
  const statut = async (id: number, nouveauStatut: string) => { await fetch(`${API}/signalements-incidents/${id}/statut`, { method: "PUT", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify({ statut: nouveauStatut }) }); await charger(); };
  const vehiculeIndisponible = (v: Vehicule) => ["MAINTENANCE", "EN_MAINTENANCE", "EN_PANNE", "HORS_SERVICE", "INDISPONIBLE", "INDISPONIBLE_TECHNIQUE", "REQUISITIONNE", "EN_MISSION", "REFORME", "TRANSFERE"].includes(String(v.statut || "").toUpperCase());
  return <><EnTete afficherNotifications /><main style={{ maxWidth: 1100, margin: "0 auto", padding: 28, display: "grid", gap: 18 }}><h1>Signalement des incidents</h1><form onSubmit={soumettre} style={{ display: "grid", gap: 10, padding: 16, border: "1px solid #dbe3ea", borderRadius: 10, background: "white" }}><select required value={vehiculeId} onChange={e => setVehiculeId(e.target.value)}><option value="">Choisir le véhicule</option>{vehicules.map(v => <option key={v.id} value={v.id} disabled={vehiculeIndisponible(v)}>{v.immatriculation || `#${v.id}`} · {v.statut || "—"}</option>)}</select><select value={typeIncident} onChange={e => setTypeIncident(e.target.value)}><option>PANNE</option><option>DOMMAGE</option><option>CONTRAVENTION</option><option>ACCIDENT</option></select><textarea required rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Décrire l'incident" /><button type="submit">Signaler l’incident</button>{erreur && <div role="alert" style={{ color: "#b91c1c" }}>{erreur}</div>}</form><section style={{ display: "grid", gap: 10 }}>{incidents.map(i => <article key={i.id} style={{ padding: 14, border: "1px solid #dbe3ea", borderRadius: 10, background: "white" }}><strong>{i.vehicule?.immatriculation || "Véhicule"} · {i.typeIncident}</strong><div>{i.description}</div><small>{new Date(i.dateIncident).toLocaleString("fr-FR")} · {i.statut}</small>{i.statut !== "CLOTURE" && <div style={{ marginTop: 8, display: "flex", gap: 8 }}><button type="button" onClick={() => void statut(i.id, "EN_COURS")}>Valider et transmettre au mécanicien</button><button type="button" onClick={() => void statut(i.id, "RESOLU")}>Marquer résolu</button></div>}</article>)}</section></main></>;
}

