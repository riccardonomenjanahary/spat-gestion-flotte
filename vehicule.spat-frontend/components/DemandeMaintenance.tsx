"use client";

import { FormEvent, useState } from "react";
import type { CSSProperties } from "react";
import { toast } from "sonner";
import PersonnelChauffeurAutocomplete from "@/components/PersonnelChauffeurAutocomplete";

const API = process.env.NEXT_PUBLIC_API_URL || "";

const ENDPOINT_MAINTENANCE = "/maintenances";

const NATURES = [
  "Moteur / surchauffe",
  "Pneus / crevaison",
  "Batterie / électricité",
  "Freins",
  "Carburant / panne sèche",
  "Carrosserie / accident",
  "Autre",
];

const champStyle: CSSProperties = {
  padding: "8px 10px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
  background: "white",
};

function maintenantLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function DemandeMaintenance() {
  const [immatriculation, setImmatriculation] = useState("1205 TCA");
  const [declarant, setDeclarant] = useState("");
  const [telephone, setTelephone] = useState("");
  const [selectionDeclarant, setSelectionDeclarant] = useState(0);
  const [datePanne, setDatePanne] = useState(maintenantLocal);
  const [lieu, setLieu] = useState("");
  const [kilometrage, setKilometrage] = useState("");
  const [nature, setNature] = useState("");
  const [immobilise, setImmobilise] = useState(true);
  const [description, setDescription] = useState("");
  const [envoi, setEnvoi] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!declarant.trim()) return toast.error("Sélectionnez le déclarant dans la liste du personnel ou des chauffeurs.");
    if (!nature) return toast.error("Choisissez la nature de la panne.");
    setEnvoi(true);
    try {
      const token = localStorage.getItem("token");
      const km = parseFloat(kilometrage.replace(",", "."));
      const res = await fetch(`${API}${ENDPOINT_MAINTENANCE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          vehiculeImmatriculation: immatriculation.trim(),
          declarantNom: declarant.trim(),
          declarantTelephone: telephone.trim() || null,
          datePanne,
          lieu: lieu.trim(),
          kilometrage: Number.isFinite(km) ? km : null,
          natureProbleme: nature,
          vehiculeImmobilise: immobilise,
          description: description.trim(),
          source: "AGENT_SURETE",
        }),
      });
      const body = await res.text();
      if (res.status === 404) throw new Error(`Service de maintenance indisponible côté serveur (${ENDPOINT_MAINTENANCE} introuvable).`);
      if (!res.ok) throw new Error(body || "Envoi impossible");
      toast.success("Demande de maintenance transmise au chef de service logistique.");
      setLieu("");
      setKilometrage("");
      setNature("");
      setDescription("");
      setDeclarant("");
      setTelephone("");
      setSelectionDeclarant((cle) => cle + 1);
      setDatePanne(maintenantLocal());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Envoi impossible");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <>
      <form onSubmit={submit} style={{ display: "grid", gap: 14, background: "white", padding: 24, borderRadius: 12 }}>
        <label style={{ display: "grid", gap: 4 }}>Immatriculation du véhicule
          <input style={champStyle} required value={immatriculation} onChange={(e) => setImmatriculation(e.target.value)} />
        </label>
        <PersonnelChauffeurAutocomplete
          key={selectionDeclarant}
          label="Déclarant"
          placeholder="Rechercher par nom, prénom ou matricule…"
          onSelect={(personne) => {
            setDeclarant(personne.nomComplet);
            setTelephone(personne.telephone);
          }}
        />
        <label style={{ display: "grid", gap: 4 }}>Téléphone
          <input style={champStyle} type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>Date et heure de la panne
          <input style={champStyle} type="datetime-local" required value={datePanne} onChange={(e) => setDatePanne(e.target.value)} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>Lieu où se trouve le véhicule
          <input style={champStyle} required value={lieu} onChange={(e) => setLieu(e.target.value)} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>Kilométrage
          <input style={champStyle} type="number" inputMode="decimal" min={0} value={kilometrage} onChange={(e) => setKilometrage(e.target.value)} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>Nature de la panne
          <select style={champStyle} required value={nature} onChange={(e) => setNature(e.target.value)}>
            <option value="">—</option>
            {NATURES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <label>
          <input type="checkbox" checked={immobilise} onChange={(e) => setImmobilise(e.target.checked)} /> Le véhicule est immobilisé
        </label>
        <label style={{ display: "grid", gap: 4 }}>Description de la panne
          <textarea style={champStyle} rows={4} required value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <button disabled={envoi} type="submit">{envoi ? "Envoi…" : "Envoyer la demande de maintenance"}</button>
      </form>
    </>
  );
}