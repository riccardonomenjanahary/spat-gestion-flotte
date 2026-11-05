"use client";

import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { Download, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import PersonnelAutocomplete from "@/components/PersonnelAutocomplete";

export interface ConducteurMoto {
  id: number;
  matricule: string;
  nomComplet: string;
  poste?: string | null;
  direction?: { id: number; nom: string };
  valide: boolean;
  actif: boolean;
  dateValidation?: string | null;
  permisNomFichier?: string | null;
}

const API = process.env.NEXT_PUBLIC_API_URL;
const champ: CSSProperties = { display: "block", width: "100%", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: 8, padding: "10px 12px", marginTop: 6, color: "#172033", background: "white" };
const label: CSSProperties = { display: "block", color: "#475569", fontSize: 13, fontWeight: 600 };
const bouton: CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: 8, background: "white", color: "#334155", cursor: "pointer" };
const boite: CSSProperties = { width: "min(600px, calc(100vw - 32px))", maxHeight: "85vh", overflow: "auto", boxSizing: "border-box", padding: 24, border: "1px solid #cbd5e1", borderRadius: 14, background: "white", color: "#172033", boxShadow: "0 20px 60px #0f172a44" };

function headers() {
  const token = localStorage.getItem("token");
  if (!API || !token) throw new Error("Session expirée ou API indisponible.");
  return { Authorization: `Bearer ${token}` };
}

async function verifier(response: Response) {
  if (response.ok) return;
  const texte = await response.text();
  let message = texte;
  try { const erreur = JSON.parse(texte); message = erreur.erreur || erreur.detail || erreur.message || texte; } catch {                     }
  throw new Error(message || "Impossible de traiter la demande d’habilitation.");
}

export function HabilitationMotoButton() {
  const [ouvert, setOuvert] = useState(false);
  return <>
    <button type="button" style={bouton} onClick={() => setOuvert(true)}><ShieldCheck size={17} /> Habilitation moto</button>
    {ouvert && <FormulaireHabilitation fermer={() => setOuvert(false)} />}
  </>;
}

function FormulaireHabilitation({ fermer }: { fermer: () => void }) {
  const [mode, setMode] = useState<"recherche" | "manuel">("recherche");
  const [nom, setNom] = useState("");
  const [matricule, setMatricule] = useState("");
  const [poste, setPoste] = useState("");
  const [direction, setDirection] = useState<{ id: number; nom: string } | null>(null);
  const [permis, setPermis] = useState<File | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function charger() {
      try {
        const response = await fetch(`${API}/conducteurs-autorises/profil`, { headers: headers(), signal: controller.signal });
        await verifier(response);
        const data = await response.json();
        if (!controller.signal.aborted) setDirection(data);
      } catch (e) { if (!controller.signal.aborted) setErreur(e instanceof Error ? e.message : "Direction indisponible."); }
    }
    void charger();
    return () => controller.abort();
  }, []);

  async function soumettre(event: FormEvent) {
    event.preventDefault();
    if (envoi) return;
    if (!direction || !nom.trim() || !poste.trim() || !permis) { setErreur("Renseignez le nom, le poste et déposez le permis."); return; }
    if (permis.size > 15 * 1024 * 1024) { setErreur("Le permis ne doit pas dépasser 15 Mo."); return; }
    const donnees = new FormData();
    donnees.append("nomComplet", nom.trim());
    donnees.append("poste", poste.trim());
    if (matricule.trim()) donnees.append("matricule", matricule.trim());
    donnees.append("permis", permis);
    setEnvoi(true); setErreur("");
    try {
      const response = await fetch(`${API}/conducteurs-autorises`, { method: "POST", headers: headers(), body: donnees });
      await verifier(response);
      toast.success("Demande d’habilitation transmise au chef de direction.");
      fermer();
    } catch (e) { setErreur(e instanceof Error ? e.message : "Enregistrement impossible."); }
    finally { setEnvoi(false); }
  }

  return <dialog ref={(element) => { if (element && !element.open) element.showModal(); }} aria-labelledby="habilitation-titre" onCancel={(event) => { event.preventDefault(); if (!envoi) fermer(); }} style={boite}>
    <form onSubmit={soumettre} style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <h2 id="habilitation-titre" style={{ margin: 0, fontSize: 20 }}>Habilitation moto</h2>
        <button type="button" style={{ ...bouton, padding: 5 }} aria-label="Fermer" disabled={envoi} onClick={fermer}><X size={19} /></button>
      </div>

      {erreur && <p role="alert" style={{ margin: 0, color: "#b91c1c", whiteSpace: "pre-wrap" }}>{erreur}</p>}
      <fieldset disabled={envoi} style={{ border: 0, margin: 0, padding: 0, display: "grid", gap: 16 }}>
        <div role="radiogroup" aria-label="Saisie du nom" style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          {([ ["recherche", "Rechercher dans le personnel"], ["manuel", "Saisir manuellement"] ] as const).map(([valeur, texte]) =>
            <label key={valeur} style={{ fontSize: 13 }}><input type="radio" name="saisie-habilitation" checked={mode === valeur} onChange={() => { setMode(valeur); setNom(""); setMatricule(""); setPoste(""); }} /> {texte}</label>)}
        </div>
        {mode === "recherche" && <PersonnelAutocomplete label="Nom du conducteur" onClear={() => { setNom(""); setMatricule(""); setPoste(""); }} onSelect={(personnel) => {
          setNom(`${personnel.prenom} ${personnel.nom}`.trim()); setMatricule(personnel.matricule); setPoste(personnel.poste);
        }} />}
        {mode === "manuel" && <label style={label}>Nom complet *<input required maxLength={200} value={nom} onChange={(e) => setNom(e.target.value)} style={champ} placeholder="Nom et prénom" /></label>}
        {mode === "manuel" && <label style={label}>Matricule (facultatif)<input maxLength={50} value={matricule} onChange={(e) => setMatricule(e.target.value)} style={champ} /></label>}
        <label style={label}>Poste *<input required maxLength={255} value={poste} onChange={(e) => setPoste(e.target.value)} style={champ} /></label>
        <label style={label}>Direction<input value={direction?.nom || "Chargement de la direction…"} readOnly style={{ ...champ, background: "#f1f5f9" }} /></label>
        <label style={label}>Permis * (PDF, JPG, PNG · 15 Mo max.)<input required type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setPermis(e.target.files?.[0] || null)} style={champ} /></label>
      </fieldset>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button type="button" style={bouton} disabled={envoi} onClick={fermer}>Annuler</button>
        <button type="submit" disabled={envoi || !direction || !nom.trim() || !poste.trim() || !permis} style={{ ...bouton, background: "#2563eb", color: "white", opacity: envoi || !direction ? .6 : 1 }}>{envoi ? "Transmission…" : "Transmettre au chef de direction"}</button>
      </div>
    </form>
  </dialog>;
}

export function HabilitationsMotoValidation() {
  const [demandes, setDemandes] = useState<ConducteurMoto[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [erreur, setErreur] = useState("");
  const [traitement, setTraitement] = useState<number | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let actif = true;
    let controller: AbortController | undefined;
    const connus = new Set<number>();
    async function charger() {
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      try {
        const response = await fetch(`${API}/conducteurs-autorises/en-attente`, { headers: headers(), signal, cache: "no-store" });
        await verifier(response);
        const data: ConducteurMoto[] = await response.json();
        if (!Array.isArray(data)) throw new Error("Liste des habilitations invalide.");
        if (!actif || signal.aborted) return;
        const nouvelles = data.filter((c) => c.permisNomFichier);
        if (nouvelles.some((c) => !connus.has(c.id))) setOuvert(true);
        nouvelles.forEach((c) => connus.add(c.id));
        setDemandes(nouvelles); setErreur("");
      } catch (e) { if (actif && !signal.aborted) setErreur(e instanceof Error ? e.message : "Habilitations indisponibles."); }
    }
    void charger();
    const intervalle = window.setInterval(() => void charger(), 15_000);
    return () => { actif = false; controller?.abort(); window.clearInterval(intervalle); };
  }, [revision]);

  async function valider(conducteur: ConducteurMoto) {
    if (traitement !== null) return;
    setTraitement(conducteur.id);
    try {
      const response = await fetch(`${API}/conducteurs-autorises/${conducteur.id}/valider`, { method: "PUT", headers: { ...headers(), "Content-Type": "application/json" }, body: "{}" });
      await verifier(response);
      setDemandes((anciennes) => anciennes.filter((c) => c.id !== conducteur.id));
      setRevision((ancienne) => ancienne + 1);
      toast.success(`${conducteur.nomComplet} est habilité à conduire une moto.`);
    } catch (e) { setErreur(e instanceof Error ? e.message : "Validation impossible."); }
    finally { setTraitement(null); }
  }

  async function telechargerPermis(conducteur: ConducteurMoto) {
    try {
      const response = await fetch(`${API}/conducteurs-autorises/${conducteur.id}/permis`, { headers: headers() });
      await verifier(response);
      const url = URL.createObjectURL(await response.blob());
      const lien = document.createElement("a"); lien.href = url; lien.download = conducteur.permisNomFichier || "permis"; lien.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Permis indisponible."); }
  }

  return <>
    <button type="button" style={bouton} onClick={() => setOuvert(true)}><ShieldCheck size={17} /> Habilitations moto ({demandes.length})</button>
    {erreur && !ouvert && <span role="alert" style={{ color: "#b91c1c", fontSize: 13 }}>{erreur}</span>}
    {ouvert && <dialog ref={(element) => { if (element && !element.open) element.showModal(); }} aria-labelledby="habilitations-validation-titre" onCancel={(event) => { event.preventDefault(); if (traitement === null) setOuvert(false); }} style={boite}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14 }}>
        <h2 id="habilitations-validation-titre" style={{ margin: 0, fontSize: 20 }}>Habilitations moto à valider</h2>
        <button type="button" style={{ ...bouton, padding: 5 }} disabled={traitement !== null} aria-label="Fermer" onClick={() => setOuvert(false)}><X size={19} /></button>
      </div>
      {erreur && <p role="alert" style={{ color: "#b91c1c" }}>{erreur}</p>}
      {!erreur && demandes.length === 0 && <p>Aucune demande d’habilitation en attente.</p>}
      {demandes.map((conducteur) => <article key={conducteur.id} style={{ marginTop: 16, padding: 16, border: "1px solid #e2e8f0", borderRadius: 10, background: "#f8fafc" }}>
        <strong>{conducteur.nomComplet}</strong>
        {!conducteur.matricule.startsWith("MANUEL-") && <p>Matricule : {conducteur.matricule}</p>}
        <p>Poste : {conducteur.poste || "—"}</p><p>Direction : {conducteur.direction?.nom || "—"}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <button type="button" style={bouton} onClick={() => void telechargerPermis(conducteur)}><Download size={16} /> Consulter le permis</button>
          <button type="button" disabled={traitement !== null} style={{ ...bouton, background: "#15803d", color: "white" }} onClick={() => void valider(conducteur)}>{traitement === conducteur.id ? "Validation…" : "Valider"}</button>
        </div>
      </article>)}
    </dialog>}
  </>;
}

export function ConducteurMotoSelect({ value, onChange }: { value: string; onChange: (valeur: string) => void }) {
  const [conducteurs, setConducteurs] = useState<ConducteurMoto[]>([]);
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(true);
  useEffect(() => {
    let actif = true;
    let controller: AbortController | undefined;
    async function charger() {
      controller?.abort(); controller = new AbortController(); const signal = controller.signal;
      try {
        const response = await fetch(`${API}/conducteurs-autorises`, { headers: headers(), signal, cache: "no-store" });
        await verifier(response);
        const data: ConducteurMoto[] = await response.json();
        if (!Array.isArray(data)) throw new Error("Liste des conducteurs invalide.");
        if (actif && !signal.aborted) { setConducteurs(data.filter((c) => c.valide && c.actif && c.dateValidation && c.permisNomFichier)); setErreur(""); }
      } catch (e) { if (actif && !signal.aborted) { setErreur(e instanceof Error ? e.message : "Conducteurs indisponibles."); setConducteurs([]); } }
      finally { if (actif && !signal.aborted) setChargement(false); }
    }
    void charger(); const intervalle = window.setInterval(() => void charger(), 15_000);
    return () => { actif = false; controller?.abort(); window.clearInterval(intervalle); };
  }, []);
  return <label style={label}>Conducteur de la moto (facultatif)
    <select value={value} onChange={(event) => onChange(event.target.value)} style={champ} disabled={chargement || !!erreur}>
      <option value="">{chargement ? "Chargement…" : "Aucun conducteur sélectionné"}</option>
      {conducteurs.map((conducteur) => <option key={conducteur.id} value={conducteur.id}>{conducteur.nomComplet}{conducteur.poste ? ` — ${conducteur.poste}` : ""}</option>)}
    </select>
    {erreur ? <span role="alert" style={{ color: "#b91c1c" }}>{erreur}</span> : !chargement && conducteurs.length === 0 && <span style={{ display: "block", marginTop: 6, color: "#92400e" }}>Aucun conducteur habilité disponible.</span>}
  </label>;
}
