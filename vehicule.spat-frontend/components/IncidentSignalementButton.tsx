"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CarFront, Check, ChevronDown, CircleAlert, FileText, Send, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";

type Vehicule = { id: number; immatriculation?: string | null; statut?: string | null };
type TypeIncident = "PANNE" | "DOMMAGE" | "CONTRAVENTION" | "ACCIDENT";

const TYPES_INCIDENT: { value: TypeIncident; label: string; aide: string }[] = [
  { value: "PANNE", label: "Panne", aide: "Défaillance mécanique ou technique" },
  { value: "DOMMAGE", label: "Dommage", aide: "Détérioration ou dégradation" },
  { value: "CONTRAVENTION", label: "Contravention", aide: "Infraction ou amende routière" },
  { value: "ACCIDENT", label: "Accident", aide: "Collision ou événement routier" },
];

const selectStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", border: "1px solid #dbe3ee", borderRadius: 10,
  padding: "12px 40px 12px 13px", background: "#fff", color: "#0f172a", fontSize: 14,
  fontWeight: 550, outline: "none", appearance: "none",
};

const ROLES_AUTORISES = ["ASSISTANT_DIRECTION", "AGENT_PAR_INTERIM_ASSISTANT", "CHEF_DIRECTION", "AGENT_PAR_INTERIM_CHEF", "MECANICIEN_DID", "CHEF_ATELIER"];
const STATUTS_BLOQUES = ["MAINTENANCE", "EN_PANNE", "HORS_SERVICE", "INDISPONIBLE", "REQUISITIONNE", "EN_MISSION", "REFORME", "TRANSFERE"];

export default function IncidentSignalementButton({ role }: { role?: string }) {
  const API = process.env.NEXT_PUBLIC_API_URL || "";
  const [ouvert, setOuvert] = useState(false);
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [chargementVehicules, setChargementVehicules] = useState(false);
  const [vehiculeId, setVehiculeId] = useState("");
  const [typeIncident, setTypeIncident] = useState<TypeIncident>("PANNE");
  const [description, setDescription] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const visible = Boolean(role && ROLES_AUTORISES.includes(role));
  const bleu = true;

  useEffect(() => {
    if (!ouvert || !visible) return;
    const controller = new AbortController();
    setChargementVehicules(true);
    fetch(`${API}/vehicules`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, Accept: "application/json" },
      cache: "no-store", signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Impossible de charger la liste des véhicules.");
        const data: unknown = await response.json();
        if (!Array.isArray(data)) throw new Error("La liste des véhicules est invalide.");
        setVehicules(data as Vehicule[]);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setErreur(error instanceof Error ? error.message : "Chargement impossible.");
      })
      .finally(() => { if (!controller.signal.aborted) setChargementVehicules(false); });
    return () => controller.abort();
  }, [API, ouvert, visible]);

  useEffect(() => {
    if (!ouvert) return;
    const precedent = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const clavier = (event: KeyboardEvent) => { if (event.key === "Escape" && !envoi) setOuvert(false); };
    window.addEventListener("keydown", clavier);
    return () => { document.body.style.overflow = precedent; window.removeEventListener("keydown", clavier); };
  }, [ouvert, envoi]);

  if (!visible) return null;

  const vehiculeSelectionne = vehicules.find((vehicule) => String(vehicule.id) === vehiculeId);
  const vehiculeIndisponible = (vehicule: Vehicule) => STATUTS_BLOQUES.includes(String(vehicule.statut || "").toUpperCase());

  const envoyer = async () => {
    setErreur("");
    if (!vehiculeId || !description.trim()) {
      setErreur("Sélectionnez un véhicule et décrivez l’incident.");
      return;
    }
    setEnvoi(true);
    try {
      const res = await fetch(`${API}/signalements-incidents`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          vehiculeId: Number(vehiculeId), typeIncident, description: description.trim(),
          gravite: typeIncident === "PANNE" || typeIncident === "ACCIDENT" ? "ELEVEE" : "MOYEN",
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Le signalement n’a pas pu être transmis.");
      setOuvert(false);
      setVehiculeId("");
      setTypeIncident("PANNE");
      setDescription("");
      toast.success("Signalement transmis au Chef du Service Logistique pour validation.");
    } catch (error) {
      setErreur(error instanceof Error ? error.message : "Signalement impossible.");
    } finally {
      setEnvoi(false);
    }
  };

  const boutonStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid #bfdbfe", borderRadius: 10, padding: "10px 15px", background: "#fff", color: "#1d4ed8", fontSize: 13, fontWeight: 750, cursor: "pointer" };

  return <>
    <button type="button" onClick={() => { setErreur(""); setOuvert(true); }} style={boutonStyle}>
      <AlertTriangle size={17} color={bleu ? "#2563eb" : undefined} /> Signaler un incident
    </button>

    {ouvert && <div
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget && !envoi) setOuvert(false); }}
      style={{ position: "fixed", inset: 0, zIndex: 1200, display: "grid", placeItems: "center", padding: 18, background: "rgba(15,23,42,.58)", backdropFilter: "blur(5px)" }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="incident-dialog-title" style={{ width: "min(580px,100%)", overflow: "hidden", borderRadius: 20, background: "#fff", boxShadow: "0 28px 80px rgba(15,23,42,.3)", border: "1px solid rgba(255,255,255,.75)" }}>
        <header style={{ position: "relative", overflow: "hidden", padding: "22px 24px", color: "white", background: bleu ? "linear-gradient(125deg,#1e3a8a,#2563eb 58%,#60a5fa)" : "linear-gradient(125deg,#991b1b,#dc2626 58%,#f87171)" }}>
          <div aria-hidden="true" style={{ position: "absolute", right: -24, top: -50, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,.08)" }} />
          <div style={{ position: "relative", display: "flex", justifyContent: "space-between", gap: 18, alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
              <span style={{ width: 46, height: 46, flex: "0 0 auto", display: "grid", placeItems: "center", borderRadius: 14, background: "rgba(255,255,255,.16)", border: "1px solid rgba(255,255,255,.25)" }}><ShieldAlert size={23} /></span>
              <div>
                <span style={{ display: "block", marginBottom: 4, color: bleu ? "#dbeafe" : "#fee2e2", fontSize: 10, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase" }}>Centre de signalement</span>
                <h2 id="incident-dialog-title" style={{ margin: 0, fontSize: 21, lineHeight: 1.2, fontWeight: 800 }}>Signaler un incident</h2>

              </div>
            </div>
            <button type="button" onClick={() => { if (!envoi) setOuvert(false); }} disabled={envoi} aria-label="Fermer la fenêtre" style={{ display: "grid", placeItems: "center", width: 34, height: 34, flex: "0 0 auto", border: "1px solid rgba(255,255,255,.25)", borderRadius: 10, background: "rgba(255,255,255,.12)", color: "white", cursor: envoi ? "not-allowed" : "pointer" }}><X size={18} /></button>
          </div>
        </header>

        <div style={{ display: "grid", gap: 19, padding: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", alignItems: "center", gap: 8 }}>
            {["Véhicule", "Incident", "Transmission"].map((etape, index) => <div key={etape} style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
              <span style={{ width: 24, height: 24, flex: "0 0 auto", display: "grid", placeItems: "center", borderRadius: "50%", background: index < (vehiculeId ? (description.trim() ? 2 : 1) : 0) ? "#dcfce7" : "#f1f5f9", color: index < (vehiculeId ? (description.trim() ? 2 : 1) : 0) ? "#15803d" : "#64748b", fontSize: 11, fontWeight: 800 }}>{index < (vehiculeId ? (description.trim() ? 2 : 1) : 0) ? <Check size={13} /> : index + 1}</span>
              <span style={{ overflow: "hidden", color: "#64748b", fontSize: 11, fontWeight: 700, textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{etape}</span>
              {index < 2 && <span style={{ height: 1, flex: 1, minWidth: 8, background: "#e2e8f0" }} />}
            </div>)}
          </div>

          <label style={{ display: "grid", gap: 7, color: "#334155", fontSize: 12, fontWeight: 750 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 7 }}><CarFront size={15} color="#64748b" /> Véhicule concerné <span style={{ color: "#dc2626" }}>*</span></span>
            <span style={{ position: "relative" }}>
              <select required value={vehiculeId} onChange={(event) => setVehiculeId(event.target.value)} style={selectStyle}>
                <option value="">{chargementVehicules ? "Chargement des véhicules…" : "Sélectionner le véhicule concerné"}</option>
                {vehicules.map((vehicule) => <option key={vehicule.id} value={vehicule.id} disabled={vehiculeIndisponible(vehicule)}>
                  {vehicule.immatriculation || `#${vehicule.id}`} · {vehicule.statut || "Statut inconnu"}{vehiculeIndisponible(vehicule) ? " — indisponible" : ""}
                </option>)}
              </select>
              <ChevronDown size={16} style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", color: "#64748b", pointerEvents: "none" }} />
            </span>
            {vehiculeSelectionne && <span style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 11px", borderRadius: 9, background: "#f8fafc", color: "#475569", fontSize: 11.5, fontWeight: 550 }}><Check size={14} color="#16a34a" /> Sélectionné : <strong style={{ color: "#0f172a" }}>{vehiculeSelectionne.immatriculation || `Véhicule #${vehiculeSelectionne.id}`}</strong></span>}
          </label>

          <div style={{ display: "grid", gap: 8 }}>
            <span style={{ color: "#334155", fontSize: 12, fontWeight: 750 }}>Nature de l’incident <span style={{ color: "#dc2626" }}>*</span></span>
            <div role="radiogroup" aria-label="Nature de l’incident" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 }}>
              {TYPES_INCIDENT.map((incident) => {
                const actif = typeIncident === incident.value;
                return <button key={incident.value} type="button" role="radio" aria-checked={actif} onClick={() => setTypeIncident(incident.value)} style={{ minWidth: 0, display: "grid", gap: 4, padding: "11px 12px", textAlign: "left", border: `1px solid ${actif ? (bleu ? "#93c5fd" : "#fca5a5") : "#e2e8f0"}`, borderRadius: 11, background: actif ? (bleu ? "#eff6ff" : "#fff7f7") : "#fff", color: actif ? (bleu ? "#1d4ed8" : "#b91c1c") : "#334155", boxShadow: actif ? (bleu ? "0 0 0 2px rgba(37,99,235,.08)" : "0 0 0 2px rgba(239,68,68,.08)") : "none", cursor: "pointer" }}>
                  <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 800 }}>{incident.label}{actif && <Check size={15} />}</span>
                  <span style={{ color: "#64748b", fontSize: 10.5, lineHeight: 1.35, fontWeight: 500 }}>{incident.aide}</span>
                </button>;
              })}
            </div>
          </div>

          <label style={{ display: "grid", gap: 7, color: "#334155", fontSize: 12, fontWeight: 750 }}>
            <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span style={{ display: "flex", alignItems: "center", gap: 7 }}><FileText size={15} color="#64748b" /> Description <span style={{ color: "#dc2626" }}>*</span></span><span style={{ color: "#94a3b8", fontSize: 10, fontWeight: 600 }}>{description.length}/1000</span></span>
            <textarea required maxLength={1000} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Décrivez les faits, le lieu et les dégâts ou symptômes observés…" style={{ ...selectStyle, minHeight: 112, resize: "vertical", lineHeight: 1.5 }} />
          </label>

          <div style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "10px 12px", borderRadius: 10, background: bleu ? "#eff6ff" : "#fff7ed", border: `1px solid ${bleu ? "#bfdbfe" : "#fed7aa"}`, color: bleu ? "#1e40af" : "#9a3412", fontSize: 11.5, lineHeight: 1.45 }}>
            <CircleAlert size={16} style={{ flex: "0 0 auto", marginTop: 1 }} />

          </div>

          {erreur && <div role="alert" style={{ padding: "10px 12px", borderRadius: 9, background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", fontSize: 12.5 }}>{erreur}</div>}

          <footer style={{ display: "flex", justifyContent: "space-between", gap: 10, paddingTop: 3 }}>
            <button type="button" disabled={envoi} onClick={() => setOuvert(false)} style={{ padding: "11px 15px", borderRadius: 10, border: "1px solid #dbe3ee", background: "#fff", color: "#475569", fontSize: 13, fontWeight: 700, cursor: envoi ? "not-allowed" : "pointer" }}>Annuler</button>
            <button type="button" disabled={envoi || chargementVehicules || !vehiculeId || !description.trim()} onClick={() => void envoyer()} style={{ display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 8, padding: "11px 16px", border: 0, borderRadius: 10, background: envoi || chargementVehicules || !vehiculeId || !description.trim() ? (bleu ? "#93c5fd" : "#fca5a5") : (bleu ? "linear-gradient(135deg,#2563eb,#1d4ed8)" : "linear-gradient(135deg,#dc2626,#991b1b)"), color: "#fff", fontSize: 13, fontWeight: 800, cursor: envoi || chargementVehicules || !vehiculeId || !description.trim() ? "not-allowed" : "pointer", boxShadow: bleu ? "0 5px 12px rgba(37,99,235,.18)" : "0 5px 12px rgba(185,28,28,.18)" }}><Send size={15} /> {envoi ? "Transmission en cours…" : "Transmettre le signalement"}</button>
          </footer>
        </div>
      </section>
    </div>}
  </>;
}
