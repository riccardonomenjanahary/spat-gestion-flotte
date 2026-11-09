"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import RoleGuard from "@/components/RoleGuard";
import EnTete from "@/components/EnTete";
import PersonnelAutocomplete from "@/components/PersonnelAutocomplete";
import { ROLES } from "@/app/lib/roles";

type Vehicule = { id: number; immatriculation?: string | null; categorie?: string | null; statut?: string | null };
type Requisition = { id: number; vehicule?: Vehicule | null; motif: string; beneficiaire?: string | null; destination?: string | null; dateDebut: string; dateFin?: string | null; statut: string; notificationsEnvoyees?: boolean };

const VEHICULES_DE_MISSION = new Set(["1614WWA", "1615WWA"]);

function estVehiculeDeMission(vehicule: Vehicule) {
  const immatriculation = String(vehicule.immatriculation || "")
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase()
    .replace(/^0(?=161[45]WWA$)/, "");
  return vehicule.categorie?.trim().toLowerCase() === "véhicule de mission"
    && VEHICULES_DE_MISSION.has(immatriculation);
}

export default function RequisitionsPage() {
  return <RoleGuard role={ROLES.CHEF_DGAL}><RequisitionsContent /></RoleGuard>;
}

function RequisitionsContent() {
  const API = process.env.NEXT_PUBLIC_API_URL || "";
  const router = useRouter();
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [typeChoixVehicule, setTypeChoixVehicule] = useState<"MISSION" | "AUTRE" | "">("");
  const [vehiculeId, setVehiculeId] = useState("");
  const [motif, setMotif] = useState("");
  const [beneficiaire, setBeneficiaire] = useState("");
  const [destination, setDestination] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  const statutStyle = (statut: string): CSSProperties => {
    if (statut === "ACTIVE") return { color: "#166534", background: "#dcfce7", borderColor: "#bbf7d0" };
    if (statut === "ANNULEE") return { color: "#991b1b", background: "#fee2e2", borderColor: "#fecaca" };
    return { color: "#475569", background: "#f1f5f9", borderColor: "#e2e8f0" };
  };

  const charger = async () => {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };
    const [v, r] = await Promise.all([fetch(`${API}/vehicules`, { headers }), fetch(`${API}/requisitions`, { headers })]);
    if (v.ok) setVehicules(await v.json());
    if (r.ok) setRequisitions(await r.json());
  };

  useEffect(() => {
    const initialisation = window.setTimeout(() => { void charger().catch(() => setErreur("Impossible de charger les réquisitions."));
    }, 0);
    return () => window.clearTimeout(initialisation);
  }, []);

  const soumettre = async (event: React.FormEvent) => {
    event.preventDefault();
    setErreur(""); setEnvoi(true);
    try {
      const response = await fetch(`${API}/requisitions`, { method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ vehiculeId: Number(vehiculeId), autreVehicule: typeChoixVehicule === "AUTRE", motif, beneficiaire, destination, dateDebut, dateFin: dateFin || null }) });
      if (!response.ok) throw new Error(await response.text() || "Réquisition refusée.");
      setTypeChoixVehicule(""); setVehiculeId(""); setMotif(""); setBeneficiaire(""); setDestination(""); setDateDebut(""); setDateFin("");
      await charger();
    } catch (e) { setErreur(e instanceof Error ? e.message : "Réquisition impossible."); } finally { setEnvoi(false); }
  };

  const terminer = async (id: number, action: "terminer" | "annuler") => {
    setErreur("");
    try {
      const response = await fetch(`${API}/requisitions/${id}/${action}`, { method: "PUT", headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, Accept: "application/json" } });
      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.erreur || `Action refusée (HTTP ${response.status}).`);
      }
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de mettre à jour la réquisition.");
    }
  };

  const selectedVehicle = vehicules.find(v => String(v.id) === vehiculeId);
  const vehiculesDeMission = vehicules.filter(estVehiculeDeMission);
  const autresVehicules = vehicules.filter((vehicule) => !estVehiculeDeMission(vehicule));
  const inputStyle: CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: 9, padding: "11px 12px", background: "#fff", color: "#0f172a", fontSize: 14, outline: "none" };
  const labelStyle: CSSProperties = { display: "grid", gap: 6, color: "#334155", fontSize: 13, fontWeight: 700 };

  return <><EnTete afficherNotifications /><main style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 20px 48px", display: "grid", gap: 22, background: "#f8fafc", minHeight: "calc(100vh - 72px)" }}>
    <button type="button" onClick={() => router.push("/chef-dgal")} style={{ width: "fit-content", border: 0, background: "transparent", color: "#475569", padding: 0, cursor: "pointer", fontWeight: 700 }}>← Retour au pilotage DGAL</button>
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, flexWrap: "wrap" }}>
      <div><div style={{ color: "#b91c1c", fontSize: 12, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>Pilotage prioritaire</div><h1 style={{ margin: "5px 0 6px", color: "#0f172a", fontSize: 30 }}>Réquisitions DGAL</h1></div>
      <div style={{ padding: "10px 14px", borderRadius: 12, background: "#fff1f2", border: "1px solid #fecdd3", color: "#9f1239", fontSize: 13, fontWeight: 800 }}>{requisitions.filter(r => r.statut === "ACTIVE").length} active(s)</div>
    </header>
    <form onSubmit={soumettre} style={{ display: "grid", gap: 20, padding: 24, border: "1px solid #e2e8f0", borderRadius: 16, background: "#fff", boxShadow: "0 12px 30px rgba(15,23,42,.07)" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}><div style={{ width: 38, height: 38, display: "grid", placeItems: "center", borderRadius: 11, background: "#fee2e2", color: "#b91c1c", fontSize: 20 }}>!</div><h2 style={{ margin: 0, color: "#0f172a", fontSize: 19 }}>Nouvelle réquisition</h2></div>
      <div style={{ display: "grid", gap: 16 }}>
        <label style={labelStyle}>Véhicule à réquisitionner
          <select required value={typeChoixVehicule === "AUTRE" ? "AUTRE" : typeChoixVehicule === "MISSION" && vehiculeId ? `MISSION:${vehiculeId}` : ""} onChange={e => {
            const valeur = e.target.value;
            if (valeur === "AUTRE") {
              setTypeChoixVehicule("AUTRE");
              setVehiculeId("");
            } else if (valeur.startsWith("MISSION:")) {
              setTypeChoixVehicule("MISSION");
              setVehiculeId(valeur.slice("MISSION:".length));
            } else {
              setTypeChoixVehicule("");
              setVehiculeId("");
            }
          }} style={inputStyle}>
            <option value="">Choisir un véhicule</option>
            {vehiculesDeMission.map(v => {
              const indisponible = v.statut !== "DISPONIBLE";
              return <option key={v.id} value={`MISSION:${v.id}`} disabled={indisponible}>{v.immatriculation || `Véhicule #${v.id}`} ({v.statut || "—"})</option>;
            })}
            <option value="AUTRE">Autres véhicules</option>
          </select>
        </label>
        {typeChoixVehicule === "AUTRE" && (
          <label style={labelStyle}>Autre véhicule
            <select required value={vehiculeId} onChange={e => setVehiculeId(e.target.value)} style={inputStyle}>
              <option value="">Choisir un autre véhicule</option>
              {autresVehicules.map(v => {
                const indisponible = v.statut !== "DISPONIBLE";
                return <option key={v.id} value={v.id} disabled={indisponible}>{v.immatriculation || `Véhicule #${v.id}`} — {v.categorie || "Catégorie non renseignée"} ({v.statut || "—"})</option>;
              })}
            </select>
          </label>
        )}
        {selectedVehicle && <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "9px 12px", borderRadius: 9, background: "#f8fafc", color: "#475569", fontSize: 13 }}><span style={{ fontWeight: 800, color: "#0f172a" }}>{selectedVehicle.immatriculation}</span><span>•</span><span>{selectedVehicle.categorie || "Catégorie non renseignée"}</span><span style={{ marginLeft: "auto", color: "#15803d", fontWeight: 800 }}>Disponible</span></div>}
        <label style={labelStyle}>Motif de la réquisition<textarea required value={motif} onChange={e => setMotif(e.target.value)} placeholder="Expliquez la raison opérationnelle…" rows={3} style={{ ...inputStyle, resize: "vertical" }} /></label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}><div><PersonnelAutocomplete label="Nom du bénéficiaire" placeholder="Rechercher un nom…" onSelect={personnel => setBeneficiaire(`${personnel.prenom} ${personnel.nom}`.trim())} /></div><label style={labelStyle}>Destination<input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Lieu ou itinéraire" style={inputStyle} /></label></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}><label style={labelStyle}>Début<input required type="datetime-local" value={dateDebut} onChange={e => setDateDebut(e.target.value)} style={inputStyle} /></label><label style={labelStyle}>Fin prévue<input type="datetime-local" value={dateFin} onChange={e => setDateFin(e.target.value)} style={inputStyle} /></label></div>
      </div>
      {erreur && <div role="alert" style={{ padding: "11px 13px", borderRadius: 9, color: "#991b1b", background: "#fef2f2", border: "1px solid #fecaca", fontSize: 13 }}>{erreur}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4 }}><button disabled={envoi || !vehiculeId || !typeChoixVehicule} type="submit" style={{ border: 0, borderRadius: 9, padding: "12px 20px", background: envoi || !vehiculeId || !typeChoixVehicule ? "#cbd5e1" : "#b91c1c", color: "white", fontWeight: 800, cursor: envoi || !vehiculeId || !typeChoixVehicule ? "not-allowed" : "pointer", boxShadow: "0 5px 12px rgba(185,28,28,.2)" }}>{envoi ? "Enregistrement…" : "Réquisitionner le véhicule"}</button></div>
    </form>
    <section style={{ display: "grid", gap: 12 }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><h2 style={{ margin: 0, fontSize: 19, color: "#0f172a" }}>Historique des réquisitions</h2><span style={{ color: "#64748b", fontSize: 13 }}>{requisitions.length} opération(s)</span></div>{requisitions.length === 0 ? <div style={{ padding: 28, textAlign: "center", border: "1px dashed #cbd5e1", borderRadius: 14, color: "#64748b", background: "#fff" }}>Aucune réquisition enregistrée.</div> : requisitions.map(r => <article key={r.id} style={{ display: "grid", gap: 12, padding: 18, border: "1px solid #e2e8f0", borderRadius: 14, background: "#fff", boxShadow: "0 4px 14px rgba(15,23,42,.04)" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}><div><strong style={{ color: "#0f172a", fontSize: 16 }}>{r.vehicule?.immatriculation || "Véhicule"}</strong><div style={{ marginTop: 4, color: "#475569", fontSize: 13 }}>{r.vehicule?.categorie || "Catégorie non renseignée"}</div></div><span style={{ ...statutStyle(r.statut), border: "1px solid", borderRadius: 999, padding: "4px 9px", fontSize: 11, fontWeight: 800 }}>{r.statut}</span></div><p style={{ margin: 0, color: "#1e293b", lineHeight: 1.5 }}>{r.motif}</p><div style={{ display: "flex", flexWrap: "wrap", gap: 8, color: "#64748b", fontSize: 12 }}><span>🗓 {new Date(r.dateDebut).toLocaleString("fr-FR")}</span>{r.destination && <span>• 📍 {r.destination}</span>}{r.beneficiaire && <span>• 👤 {r.beneficiaire}</span>}</div>{r.statut === "ACTIVE" && <div style={{ display: "flex", gap: 8, paddingTop: 2 }}><button type="button" onClick={() => void terminer(r.id, "terminer")} style={{ border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 12px", background: "#f0fdf4", color: "#166534", fontWeight: 700, cursor: "pointer" }}>Terminer</button><button type="button" onClick={() => void terminer(r.id, "annuler")} style={{ border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", background: "#fff1f2", color: "#be123c", fontWeight: 700, cursor: "pointer" }}>Annuler</button></div>}</article>)}</section>
  </main></>;
}
