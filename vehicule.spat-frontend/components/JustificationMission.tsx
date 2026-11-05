"use client";
import { useState } from "react";
import { toast } from "sonner";

export default function JustificationMission({ missionId, motifInitial = "", observationsInitiales = "" }: { missionId: number; motifInitial?: string | null; observationsInitiales?: string | null }) {
  const [urgence, setUrgence] = useState(motifInitial || "");
  const [observations, setObservations] = useState(observationsInitiales || "");
  const [envoi, setEnvoi] = useState(false);
  async function enregistrer() {
    setEnvoi(true);
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reservations/${missionId}/conformite`, {
        method: "PUT", headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" },
        body: JSON.stringify({ motifUrgence: urgence, observations }),
      });
      if (!r.ok) throw new Error(await r.text());
      toast.success("Justifications enregistrées. Elles seront contrôlées lors de la validation.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Enregistrement impossible."); }
    finally { setEnvoi(false); }
  }
  return <details style={{ margin: "14px 0", padding: 12, border: "1px solid #cbd5e1", borderRadius: 8 }}>
    <summary>Justifications préalables à la validation</summary>
    <label style={{ display: "grid", gap: 6 }}>Motif d’urgence (départ à moins de 24 h)<textarea maxLength={1000} rows={2} value={urgence} onChange={e => setUrgence(e.target.value)} /></label>
    <label style={{ display: "grid", gap: 6 }}>Justification hors horaires, pause, week-end ou jour férié<textarea maxLength={2000} rows={2} value={observations} onChange={e => setObservations(e.target.value)} /></label>
    <button type="button" disabled={envoi} onClick={() => void enregistrer()}>{envoi ? "Enregistrement…" : "Enregistrer les justifications"}</button>
  </details>;
}
