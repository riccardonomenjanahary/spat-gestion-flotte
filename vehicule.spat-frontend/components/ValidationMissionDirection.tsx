"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import JustificationMission from "./JustificationMission";

type Mission = { id: number; motifUrgence?: string | null; observations?: string | null; besoinChauffeur?: boolean | null; vehicule?: { id?: number; immatriculation?: string | null; categorie?: string | null } | null };
type Chauffeur = { id: number; nom?: string; prenom?: string };
type VehiculeDisponible = { id: number; immatriculation?: string | null; categorie?: string | null; etat?: string; disponible?: boolean; raison?: string };

export default function ValidationMissionDirection({ mission, onDecision }: { mission: Mission; onDecision: () => Promise<void> }) {
  const moto = mission.vehicule?.categorie?.toLowerCase().includes("moto") ?? false;
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [vehicules, setVehicules] = useState<VehiculeDisponible[]>([]);
  const [vehiculeId, setVehiculeId] = useState("");
  const [chauffeurId, setChauffeurId] = useState("");
  const [motifRefus, setMotifRefus] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const controle = new AbortController();
    void (async () => {
      try {
        if (!API) throw new Error("API indisponible.");
        const planning = await fetch(`${API}/reservations/${mission.id}/planning-vehicules`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, signal: controle.signal,
        });
        if (!planning.ok) throw new Error((await planning.text()) || "Impossible de charger les véhicules.");
        const lignes = await planning.json() as VehiculeDisponible[];
        const disponibles = Array.isArray(lignes) ? lignes.filter((v) => v.disponible
          && (moto ? String(v.categorie ?? "").toLowerCase().includes("moto")
            : String(v.categorie ?? "").toLowerCase().includes("mutualisée"))) : [];
        setVehicules(disponibles);
        setVehiculeId(disponibles.find((v) => v.id === mission.vehicule?.id)?.id?.toString() ?? disponibles[0]?.id?.toString() ?? "");
        const res = await fetch(`${API}/reservations/${mission.id}/disponibilites`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, signal: controle.signal,
        });
        if (!res.ok) throw new Error((await res.text()) || "Impossible de charger les chauffeurs.");
        const donnees = await res.json();
        setChauffeurs(donnees.chauffeursDisponibles ?? []);
      } catch (e) {
        if (!controle.signal.aborted) setErreur(e instanceof Error ? e.message : "Erreur de chargement.");
      } finally { if (!controle.signal.aborted) setChargement(false); }
    })();
    return () => controle.abort();
  }, [API, mission.id, moto]);

  async function decider(statut: "VALIDEE" | "REFUSEE") {
    if (envoi || !API) return;
    if (statut === "VALIDEE" && !vehiculeId) { setErreur("Sélectionnez un véhicule."); return; }
    if (statut === "VALIDEE" && !moto && !chauffeurId) { setErreur("Sélectionnez un chauffeur."); return; }
    if (statut === "REFUSEE" && !motifRefus.trim()) { setErreur("Indiquez le motif du refus."); return; }
    setEnvoi(true); setErreur("");
    try {
      const res = await fetch(`${API}/reservations/${mission.id}/assistant-direction/decision`, {
        method: "PUT", headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" },
        body: JSON.stringify({ statut, vehiculeId: vehiculeId ? Number(vehiculeId) : null, chauffeurId: chauffeurId ? Number(chauffeurId) : null, motifRefus: motifRefus.trim() }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Décision impossible.");
      toast.success(statut === "VALIDEE" ? "Mission validée et planifiée." : "Mission refusée.");
      await onDecision();
    } catch (e) { setErreur(e instanceof Error ? e.message : "Erreur de communication."); }
    finally { setEnvoi(false); }
  }

  return <section aria-label="Décision de l'assistante" style={{ marginTop: 18, padding: 16, border: "1px solid #cbd5e1", borderRadius: 10 }}>
    <h3 style={{ marginTop: 0 }}>Valider et planifier</h3>
    <JustificationMission missionId={mission.id} motifInitial={mission.motifUrgence} observationsInitiales={mission.observations} />

    <label style={{ display: "grid", gap: 6 }}>Véhicule disponible pour ce groupe de Directions
      <select value={vehiculeId} onChange={(e) => setVehiculeId(e.target.value)} disabled={chargement || envoi} style={{ padding: 10 }}>
        <option value="">{chargement ? "Chargement…" : "Sélectionner un véhicule"}</option>
        {vehicules.map((v) => <option key={v.id} value={v.id}>{v.immatriculation || `Véhicule #${v.id}`}</option>)}
      </select>
      {!chargement && !erreur && vehicules.length === 0 && <span>Aucun véhicule disponible pour cette période.</span>}
    </label>
    {!moto && <label style={{ display: "grid", gap: 6 }}>
      Chauffeur disponible avec permis valide
      <select value={chauffeurId} onChange={(e) => setChauffeurId(e.target.value)} disabled={chargement || envoi} style={{ padding: 10 }}>
        <option value="">{chargement ? "Chargement…" : "Sélectionner un chauffeur"}</option>
        {chauffeurs.map((c) => <option key={c.id} value={c.id}>{`${c.prenom ?? ""} ${c.nom ?? ""}`.trim()}</option>)}
      </select>
      {!chargement && !erreur && chauffeurs.length === 0 && <span>Aucun chauffeur disponible avec un permis valide pour cette période.</span>}
    </label>}
    {erreur && <p role="alert" style={{ color: "#b91c1c" }}>{erreur}</p>}
    <button type="button" disabled={envoi || chargement || !vehiculeId || (!moto && !chauffeurId)} onClick={() => void decider("VALIDEE")}
      style={{ marginTop: 12, padding: "10px 16px", background: "#0f766e", color: "white", borderRadius: 8 }}>Valider la mission</button>
    <label style={{ display: "grid", gap: 6, marginTop: 18 }}>Motif du refus
      <textarea value={motifRefus} onChange={(e) => setMotifRefus(e.target.value)} maxLength={1000} rows={2} disabled={envoi} />
    </label>
    <button type="button" disabled={envoi || !motifRefus.trim()} onClick={() => void decider("REFUSEE")}
      style={{ marginTop: 8, padding: "8px 14px" }}>Refuser la demande</button>
  </section>;
}
