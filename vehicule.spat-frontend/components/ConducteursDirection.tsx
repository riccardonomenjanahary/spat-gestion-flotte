"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import PersonnelAutocomplete from "@/components/PersonnelAutocomplete";

type Conducteur = { id: number; matricule: string; nomComplet: string; valide: boolean; validePar?: string; dateValidation?: string };

export default function ConducteursDirection({ directeur = false }: { directeur?: boolean }) {
  const [liste, setListe] = useState<Conducteur[]>([]);
  const [matricule, setMatricule] = useState("");
  const [nom, setNom] = useState("");
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const controle = useRef<AbortController | null>(null);
  const API = process.env.NEXT_PUBLIC_API_URL;

  async function lireErreur(res: Response) {
    const texte = await res.text();
    try { const json = JSON.parse(texte); return json.erreur || json.message || texte; } catch { return texte || `Erreur HTTP ${res.status}`; }
  }
  async function charger(signal?: AbortSignal) {
    setChargement(true); setErreur("");
    try {
      if (!API) throw new Error("API indisponible.");
      const res = await fetch(`${API}/conducteurs-autorises`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, signal });
      if (!res.ok) throw new Error(await lireErreur(res));
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Réponse invalide.");
      if (!signal?.aborted) setListe(data);
    } catch (e) { if (!signal?.aborted) setErreur(e instanceof Error ? e.message : "Chargement impossible."); }
    finally { if (!signal?.aborted) setChargement(false); }
  }
  useEffect(() => () => controle.current?.abort(), []);

  async function agir(chemin: string, method: "POST" | "PUT", body: object) {
    if (envoi || !API) return;
    setEnvoi(true); setErreur(""); setMessage("");
    try {
      const res = await fetch(`${API}/conducteurs-autorises${chemin}`, {
        method, headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await lireErreur(res));
      setMessage(method === "POST" ? "Conducteur proposé au Directeur pour validation." : "Liste mise à jour.");
      if (method === "POST") { setMatricule(""); setNom(""); }
      await charger();
    } catch (e) { setErreur(e instanceof Error ? e.message : "Enregistrement impossible."); }
    finally { setEnvoi(false); }
  }
  function proposer(e: FormEvent) { e.preventDefault(); if (matricule && nom) void agir("", "POST", { matricule, nomComplet: nom }); }

  return <details onToggle={(e) => {
    controle.current?.abort();
    if (e.currentTarget.open) { controle.current = new AbortController(); void charger(controle.current.signal); }
  }} style={{ margin: "16px 24px", padding: 16, background: "white", border: "1px solid #cbd5e1", borderRadius: 10 }}>
    <summary style={{ cursor: "pointer", fontWeight: 700 }}>Conducteurs autorisés des motos de la Direction</summary>

    {erreur && <p role="alert" style={{ color: "#b91c1c" }}>{erreur}</p>}
    {message && <p role="status" style={{ color: "#166534" }}>{message}</p>}
    {chargement ? <p>Chargement…</p> : <ul style={{ paddingLeft: 20 }}>
      {liste.map((c) => <li key={c.id} style={{ marginBottom: 12 }}>
        <strong>{c.nomComplet}</strong> · {c.matricule} · {c.valide ? "Validé par le Directeur" : "En attente de validation"}
        {directeur && !c.valide && <button type="button" disabled={envoi} onClick={() => void agir(`/${c.id}/valider`, "PUT", {})} style={{ marginLeft: 12 }}>Valider</button>}
        {directeur && <button type="button" disabled={envoi} onClick={() => void agir(`/${c.id}/desactiver`, "PUT", {})} style={{ marginLeft: 8 }}>Retirer l’autorisation</button>}
      </li>)}
      {liste.length === 0 && <li>Aucun conducteur actif dans la liste de votre Direction.</li>}
    </ul>}
    <form onSubmit={proposer} style={{ maxWidth: 600, display: "grid", gap: 10, marginTop: 18 }}>
      <PersonnelAutocomplete label="Personnel à habiliter pour une moto" onSelect={(p) => { setMatricule(p.matricule); setNom(`${p.prenom} ${p.nom}`.trim()); }} />
      <label>Matricule sélectionné<input aria-label="Matricule sélectionné" value={matricule} readOnly required style={{ display: "block", padding: 8 }} /></label>
      <button type="submit" disabled={envoi || !matricule || !nom} style={{ padding: 10 }}>Proposer au Directeur</button>
    </form>
  </details>;
}
