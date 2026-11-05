"use client";

import { useEffect, useMemo, useState } from "react";
import CarteGpsFlotte from "@/components/CarteGpsFlotte";
import type { GpsPosition } from "@/components/FlotteMap";
import type { MissionCarteGps } from "@/components/CarteGpsFlotte";
type Vehicule = { id: number; immatriculation: string; categorie?: string | null; gpsEquipe?: boolean | null; gpsDeviceId?: number | null };
type Historique = { id: number; dateGps?: string | null; latitude?: number | null; longitude?: number | null; vitesse?: number | null; odometreKm?: number | null; distanceTotale?: number | null };
type FicheSureteEnCours = {
  mission?: string;
  immatriculation?: string;
  debut?: string;
  cloturee?: boolean;
  urgence?: { statut?: string; declencheeLe?: string };
  trajets?: Array<{ destination?: string; motif?: string }>;
};

export default function SuiviGpsSurete() {
  const API = process.env.NEXT_PUBLIC_API_URL || "";
  const [vehicule, setVehicule] = useState<Vehicule | null>(null);
  const [position, setPosition] = useState<GpsPosition | null>(null);
  const [missionsActives, setMissionsActives] = useState<MissionCarteGps[]>([]);
  const [historique, setHistorique] = useState<Historique[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [erreur, setErreur] = useState("");
  const [vue, setVue] = useState<"carte" | "historique" | "journal">("carte");

  const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, Accept: "application/json" });

  useEffect(() => {
    let actif = true;
    const charger = async () => {
      try {
        const [vehiculesRes, positionsRes] = await Promise.all([
          fetch(`${API}/vehicules`, { headers: headers(), cache: "no-store" }),
          fetch(`${API}/gps/positions`, { headers: headers(), cache: "no-store" }),
        ]);
        if (!vehiculesRes.ok || !positionsRes.ok) throw new Error("Données GPS indisponibles.");
        const vehicules = await vehiculesRes.json() as Vehicule[];
        const positions = await positionsRes.json() as GpsPosition[];
        const cible = vehicules.find((v) => /1205\s*TCA/i.test(v.immatriculation || ""))
          || vehicules.find((v) => v.gpsEquipe || v.gpsDeviceId != null)
          || null;
        if (!actif) return;
        setVehicule(cible);
        setPosition(cible ? positions.find((p) => p.vehiculeId === cible.id) || null : null);

        let fiche: FicheSureteEnCours | null = null;
        try {
          const ficheJson = localStorage.getItem("fiche-bord-surete-en-cours");
          fiche = ficheJson ? JSON.parse(ficheJson) as FicheSureteEnCours : null;
        } catch {
          fiche = null;
        }
        const plaqueFiche = String(fiche?.immatriculation || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        const plaqueVehicule = String(cible?.immatriculation || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        const urgenceEnCours = fiche?.mission === "URGENCE" && fiche.urgence?.statut === "EN_COURS";
        const patrouilleEnCours = fiche?.mission === "PATROUILLE" && !fiche.cloturee;
          setMissionsActives(cible && fiche && !fiche.cloturee && plaqueFiche === plaqueVehicule && (urgenceEnCours || (patrouilleEnCours && Boolean(fiche.debut)))
          ? [{
              vehiculeId: cible.id,
              typeMission: fiche.mission,
              statut: urgenceEnCours ? fiche.urgence?.statut : "EN_COURS",
            dateDebut: urgenceEnCours ? fiche.urgence?.declencheeLe : fiche.debut,
              destination: fiche.trajets?.at(-1)?.destination || null,
              motif: fiche.trajets?.at(-1)?.motif || null,
            }]
          : []);
      } catch (e) {
        if (actif) setErreur(e instanceof Error ? e.message : "Données GPS indisponibles.");
      }
    };
    void charger();
    const intervalle = window.setInterval(() => void charger(), 30000);
    return () => { actif = false; window.clearInterval(intervalle); };
  }, [API]);

  useEffect(() => {
    if (!vehicule) return;
    let actif = true;
    fetch(`${API}/gps/historique?vehiculeId=${vehicule.id}&date=${date}`, { headers: headers(), cache: "no-store" })
      .then((res) => res.ok ? res.json() : Promise.reject(new Error("Historique GPS indisponible.")))
      .then((data) => { if (actif) setHistorique(Array.isArray(data?.positions) ? data.positions : []); })
      .catch((e) => { if (actif) setErreur(e instanceof Error ? e.message : "Historique GPS indisponible."); });
    return () => { actif = false; };
  }, [API, date, vehicule]);

  const positionCarte = useMemo(() => position ? [position] : [], [position]);
  return <section style={{ display: "grid", gap: 16, marginTop: 22 }}>
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
      <button type="button" onClick={() => setVue("carte")} style={{ border: 0, borderRadius: 9, padding: "11px 16px", background: vue === "carte" ? "#2563eb" : "#fff", color: vue === "carte" ? "#fff" : "#334155", fontWeight: 800 }}>⌖ Carte GPS</button>
      <button type="button" onClick={() => setVue("historique")} style={{ border: "1px solid #cbd5e1", borderRadius: 9, padding: "11px 16px", background: vue === "historique" ? "#2563eb" : "#fff", color: vue === "historique" ? "#fff" : "#334155", fontWeight: 800 }}>☷ Distance / historique</button>
      <button type="button" onClick={() => setVue("journal")} style={{ border: "1px solid #cbd5e1", borderRadius: 9, padding: "11px 16px", background: vue === "journal" ? "#2563eb" : "#fff", color: vue === "journal" ? "#fff" : "#334155", fontWeight: 800 }}>▣ Journal des données</button>
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12, flexWrap: "wrap" }}>
      <div><h2 style={{ margin: 0, color: "#1e293b" }}>Suivi GPS du véhicule de sûreté</h2><p style={{ margin: "5px 0 0", color: "#64748b", fontSize: 13 }}>{vehicule?.immatriculation || "Véhicule de patrouille"} · position actualisée automatiquement</p></div>
      <label style={{ display: "grid", gap: 5, color: "#475569", fontSize: 12, fontWeight: 700 }}>Historique du <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 7 }} /></label>
    </div>
    {erreur && <div role="alert" style={{ padding: 10, borderRadius: 8, color: "#991b1b", background: "#fef2f2", border: "1px solid #fecaca" }}>{erreur}</div>}
    {vue === "carte" && <CarteGpsFlotte
      vehicules={vehicule ? [vehicule] : []}
      positionsGps={positionCarte}
      missionsActives={missionsActives}
      erreurGps={erreur || null}
      masquerListeVehicules
      afficherLieu
    />}
    {vue === "historique" && <div style={{ display: "grid", gap: 8 }}><h3 style={{ margin: 0, color: "#334155", fontSize: 16 }}>Distance / historique</h3>{historique.length === 0 ? <div style={{ padding: 16, color: "#64748b", background: "#f8fafc", borderRadius: 8 }}>Aucun relevé pour cette date.</div> : historique.map((releve) => <div key={releve.id} style={{ display: "grid", gridTemplateColumns: "1.3fr repeat(4, 1fr)", gap: 10, padding: 10, border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", fontSize: 12, color: "#475569" }}><strong>{releve.dateGps ? new Date(releve.dateGps).toLocaleTimeString("fr-FR") : "—"}</strong><span>{releve.latitude?.toFixed(5) || "—"}, {releve.longitude?.toFixed(5) || "—"}</span><span>{releve.vitesse ?? 0} km/h</span><span>{releve.odometreKm ?? "—"} km</span><span>{releve.distanceTotale ?? "—"} km cumulés</span></div>)}</div>}
    {vue === "journal" && null}
  </section>;
}
