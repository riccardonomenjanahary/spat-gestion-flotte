"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import RoleGuard from "@/components/RoleGuard";
import EnTete from "@/components/EnTete";
import { ROLES } from "@/app/lib/roles";
import ExportButtons from "@/components/ExportButtons";
import {
  BatteryCharging,
  BookOpen,
  CalendarClock,
  ClipboardList,
  Eye,
  Fuel,
  Gauge,
  Inbox,
  MapPin,
  Clock3,
  Save,
  TriangleAlert,
  Truck,
  Undo2,
  User,
} from "lucide-react";

type Vehicule = { id: number; immatriculation: string; categorie?: string };
type Mission = { id: number; vehicule?: Vehicule; dateDebut: string; dateFin: string; statut: string; destination?: string };
type DernierKilometrage = { estMotoElectrique?: boolean; dernierKilometrage?: number | null; source?: string; message?: string };
type Carnet = { id: number; vehicule: Vehicule; conducteurNom: string; dateSortie: string; dateRetour?: string; destination: string; motif: string; kilometrageDepart?: number; kilometrageRetour?: number; niveauChargeDepart?: number; niveauChargeRetour?: number; statut: string };
type Etat = { moment?: string; etatApparent: string; niveauCarburantCharge: string; equipementsOk: boolean; detailEquipements: string; anomalieSignalee: boolean; descriptionAnomalie: string };
const STATUTS_MISSION_OUVRABLES = ["VALIDEE", "PLANIFIEE"];
const etatVide = (): Etat => ({ etatApparent: "BON", niveauCarburantCharge: "PLEIN", equipementsOk: true, detailEquipements: "", anomalieSignalee: false, descriptionAnomalie: "" });
function heureLocale() { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19); }
const moto = (v?: Vehicule) => /moto/i.test(v?.categorie || "");
const libelleMoment = (moment?: string) => { const m = (moment || "").toUpperCase(); if (m === "AVANT") return "Sortie"; if (m === "APRES") return "Retour"; return moment || "État"; };
async function api<T>(route: string, method = "GET", body?: unknown): Promise<T> {
  const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${route}`, { method, cache: "no-store", headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  if (!r.ok) { const message = await r.text(); throw new Error(message || `Erreur HTTP ${r.status}`); }
  return r.json();
}

function FormEtat({ value, onChange }: { value: Etat; onChange: (e: Etat) => void }) {
  return <fieldset style={fieldsetStyle}>
    <legend style={legendStyle}>État des lieux obligatoire</legend>
    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
      <label style={champStyle}>
        <span>État apparent</span>
        <select style={selectStyle} value={value.etatApparent} onChange={e => onChange({ ...value, etatApparent: e.target.value })}><option>BON</option><option>CORRECT</option><option>MAUVAIS</option></select>
      </label>
      <label style={champStyle}>
        <span>Carburant / charge</span>
        <select style={selectStyle} value={value.niveauCarburantCharge} onChange={e => onChange({ ...value, niveauCarburantCharge: e.target.value })}>{["PLEIN", "TROIS_QUARTS", "DEMI", "QUART", "RESERVE"].map(v => <option key={v}>{v}</option>)}</select>
      </label>
    </div>
    <label style={caseStyle}>
      <input type="checkbox" checked={value.equipementsOk} onChange={e => onChange({ ...value, equipementsOk: e.target.checked })} />
      <span>Équipements présents et conformes</span>
    </label>
    <label style={champStyle}>
      <span>Détail des équipements</span>
      <input style={selectStyle} placeholder="Détail des équipements" maxLength={1000} value={value.detailEquipements} onChange={e => onChange({ ...value, detailEquipements: e.target.value })} />
    </label>
    <label style={caseStyle}>
      <input type="checkbox" checked={value.anomalieSignalee} onChange={e => onChange({ ...value, anomalieSignalee: e.target.checked })} />
      <span>Anomalie constatée</span>
    </label>
    {value.anomalieSignalee && <label style={champStyle}>
      <span>Description de l’anomalie</span>
      <textarea style={{ ...selectStyle, minHeight: 76, resize: "vertical" }} required maxLength={2000} placeholder="Décrire l’anomalie" value={value.descriptionAnomalie} onChange={e => onChange({ ...value, descriptionAnomalie: e.target.value })} />
    </label>}
  </fieldset>;
}

export default function CarnetBordPage() { return <RoleGuard roles={[ROLES.AGENT_FLOTTE, ROLES.ASSISTANT_DIRECTION, ROLES.CHEF_SERVICE_LOGISTIQUE]}><CarnetBordContent /></RoleGuard>; }
function CarnetBordContent() {
  const [carnets, setCarnets] = useState<Carnet[]>([]); const [missions, setMissions] = useState<Mission[]>([]);
  const [rappelMission, setRappelMission] = useState<Mission | null>(null);
  const [missionId, setMissionId] = useState(""); const [compteur, setCompteur] = useState(""); const [etat, setEtat] = useState<Etat>(etatVide);
  const [chargementKilometrage, setChargementKilometrage] = useState(false); const [infoKilometrage, setInfoKilometrage] = useState(""); const [kilometrageAutomatique, setKilometrageAutomatique] = useState(false);
  const [retourId, setRetourId] = useState<number | null>(null); const [etatRetour, setEtatRetour] = useState<Etat>(etatVide); const [compteurRetour, setCompteurRetour] = useState("");
  const [erreur, setErreur] = useState(""); const [envoi, setEnvoi] = useState(false); const [etats, setEtats] = useState<Record<number, Etat[]>>({});
  const formulaireRef = useRef<HTMLFormElement>(null);
  const rappelsTraitesRef = useRef(new Set<number>());
  const charger = useCallback(async () => { const [c, m] = await Promise.all([api<Carnet[]>("/carnet-bord"), api<Mission[]>("/reservations")]); setCarnets(c); setMissions(m.filter(x => STATUTS_MISSION_OUVRABLES.includes(String(x.statut).toUpperCase()) && x.vehicule)); }, []);
  useEffect(() => {
    void charger().catch(e => setErreur(String(e)));
    const intervalle = window.setInterval(() => {
      void api<Mission[]>("/reservations")
        .then(data => setMissions(data.filter(m => STATUTS_MISSION_OUVRABLES.includes(String(m.statut).toUpperCase()) && m.vehicule)))
        .catch(e => setErreur(String(e)));
    }, 30000);
    return () => window.clearInterval(intervalle);
  }, [charger]);
  useEffect(() => {
    const cleStockage = "spat-agent-flotte-rappels-missions";
    try {
      const ids: unknown = JSON.parse(localStorage.getItem(cleStockage) || "[]");
      if (Array.isArray(ids)) ids.forEach(id => { if (typeof id === "number") rappelsTraitesRef.current.add(id); });
    } catch {                                                                   }
    const verifierRappels = () => {
      if (rappelMission) return;
      const maintenant = Date.now();
      const prochaine = missions
        .filter(m => m.vehicule && STATUTS_MISSION_OUVRABLES.includes(String(m.statut).toUpperCase()) && !rappelsTraitesRef.current.has(m.id))
        .map(m => ({ mission: m, depart: new Date(m.dateDebut).getTime() }))
        .filter(item => Number.isFinite(item.depart) && maintenant >= item.depart - 5 * 60 * 1000 && maintenant < item.depart)
        .sort((a, b) => a.depart - b.depart)[0];
      if (prochaine) setRappelMission(prochaine.mission);
    };
    verifierRappels();
    const intervalle = window.setInterval(verifierRappels, 10000);
    return () => window.clearInterval(intervalle);
  }, [missions, rappelMission]);
  const vehiculeSelectionneMission = missions.find(m => String(m.id) === missionId)?.vehicule;
  useEffect(() => {
    const vehicule = vehiculeSelectionneMission;
    if (!missionId || !vehicule) {
      setCompteur(""); setInfoKilometrage(""); setKilometrageAutomatique(false); setChargementKilometrage(false);
      return;
    }
    if (moto(vehicule)) {
      setCompteur(""); setInfoKilometrage("Moto électrique : renseignez le niveau de charge au départ.");
      setKilometrageAutomatique(false); setChargementKilometrage(false);
      return;
    }
    let actif = true;
    setCompteur(""); setInfoKilometrage(""); setKilometrageAutomatique(false); setChargementKilometrage(true);
    api<DernierKilometrage>(`/carnet-bord/vehicule/${vehicule.id}/dernier-kilometrage`)
      .then(resultat => {
        if (!actif) return;
        if (resultat.dernierKilometrage != null) {
          setCompteur(String(resultat.dernierKilometrage));
          setKilometrageAutomatique(true);
          setInfoKilometrage(`Dernier kilométrage enregistré (${resultat.dernierKilometrage} km) — reprise automatique.`);
        } else {
          setInfoKilometrage(resultat.message || "Aucun historique disponible : saisie manuelle requise.");
        }
      })
      .catch(() => { if (actif) setInfoKilometrage("Kilométrage indisponible : saisie manuelle requise."); })
      .finally(() => { if (actif) setChargementKilometrage(false); });
    return () => { actif = false; };
  }, [missionId, vehiculeSelectionneMission?.id, vehiculeSelectionneMission?.categorie]);
  function fermerRappelMission() {
    if (rappelMission) {
      rappelsTraitesRef.current.add(rappelMission.id);
      try { localStorage.setItem("spat-agent-flotte-rappels-missions", JSON.stringify([...rappelsTraitesRef.current])); } catch {                                                 }
    }
    setRappelMission(null);
  }
  function ouvrirCarnetDepuisRappel() {
    if (rappelMission) { setMissionId(String(rappelMission.id)); setCompteur(""); }
    fermerRappelMission();
    window.setTimeout(() => formulaireRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
  }
  const selection = missions.find(m => String(m.id) === missionId);
  async function ouvrir(e: FormEvent) {
    e.preventDefault(); if (!selection?.vehicule) return; setEnvoi(true); setErreur("");
    try { await api("/carnet-bord", "POST", { reservationId: selection.id, vehiculeId: selection.vehicule.id, dateSortie: heureLocale(), ...(moto(selection.vehicule) ? { niveauChargeDepart: Number(compteur) } : { kilometrageDepart: Number(compteur) }), etatAvant: etat }); setMissionId(""); setCompteur(""); setEtat(etatVide()); await charger(); } catch (e) { setErreur(String(e)); } finally { setEnvoi(false); }
  }
  async function fermer(e: FormEvent, carnet: Carnet) {
    e.preventDefault(); setEnvoi(true); setErreur("");
    try { await api(`/carnet-bord/${carnet.id}/retour`, "PUT", { dateRetour: heureLocale(), ...(moto(carnet.vehicule) ? { niveauChargeRetour: Number(compteurRetour) } : { kilometrageRetour: Number(compteurRetour) }), etatApres: etatRetour }); setRetourId(null); setCompteurRetour(""); setEtatRetour(etatVide()); await charger(); } catch (e) { setErreur(String(e)); } finally { setEnvoi(false); }
  }
  return <><EnTete afficherNotifications afficherSignalement={false} /><main style={{ maxWidth: 1100, margin: "auto", padding: 28, display: "grid", gap: 18 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
      <span style={badgeIconeStyle}><BookOpen size={22} /></span>
      <div style={{ display: "grid", gap: 3, flex: 1, minWidth: 240 }}>
        <h1 style={{ margin: 0, fontSize: 22, color: "#0f172a" }}>Carnet de bord et états des lieux</h1>

      </div>
    </div>

    {erreur && <div role="alert" style={alerteErreurStyle}><TriangleAlert size={16} /><span>{erreur}</span></div>}

    <ExportButtons titre="Carnet de bord" nomFichier="carnet_bord" donnees={carnets} colonnes={[{ header: "Véhicule", value: c => c.vehicule.immatriculation }, { header: "Conducteur", key: "conducteurNom" }, { header: "Sortie", key: "dateSortie" }, { header: "Retour", key: "dateRetour" }, { header: "Destination", key: "destination" }, { header: "Motif", key: "motif" }, { header: "Km départ", key: "kilometrageDepart" }, { header: "Km retour", key: "kilometrageRetour" }, { header: "Charge départ %", key: "niveauChargeDepart" }, { header: "Charge retour %", key: "niveauChargeRetour" }]} />

    <form ref={formulaireRef} onSubmit={ouvrir} style={carteStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={badgeIconePetitStyle}><Truck size={16} /></span>
        <div style={{ display: "grid", gap: 2 }}>
          <h2 style={{ margin: 0, fontSize: 16, color: "#0f172a" }}>Sortie d’un véhicule</h2>

        </div>
      </div>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        <label style={champStyle}>
          <span>Mission validée</span>
          <select style={selectStyle} required value={missionId} onChange={e => { setMissionId(e.target.value); setCompteur(""); }}>
            <option value="">Sélectionner</option>{missions.map(m => <option key={m.id} value={m.id}>TKT-{m.id} · {m.vehicule?.immatriculation} · {m.destination}</option>)}
          </select>
        </label>
        <label style={champStyle}>
          <span>{moto(selection?.vehicule) ? "Charge départ (%)" : "Kilométrage départ"}</span>
          <input style={selectStyle} type="number" min={0} max={moto(selection?.vehicule) ? 100 : undefined} step={1} required value={compteur} readOnly={kilometrageAutomatique && !moto(selection?.vehicule)} onChange={e => setCompteur(e.target.value)} />
          {chargementKilometrage && <span role="status" style={{ color: "#2563eb", fontSize: 11.5 }}>Récupération du dernier kilométrage…</span>}
          {infoKilometrage && !chargementKilometrage && <span role="status" style={{ color: kilometrageAutomatique ? "#1d4ed8" : "#64748b", fontSize: 11.5 }}>{infoKilometrage}</span>}
        </label>
      </div>
      <FormEtat value={etat} onChange={setEtat} />
      <button type="submit" disabled={envoi || chargementKilometrage || !selection} style={{ ...boutonPrimaireStyle, opacity: envoi || chargementKilometrage || !selection ? 0.6 : 1, cursor: envoi || chargementKilometrage || !selection ? "not-allowed" : "pointer" }}>
        <Save size={15} /> {envoi ? "Enregistrement…" : "Enregistrer la sortie et l’état avant"}
      </button>
    </form>

    {!carnets.length && <div style={videStyle}><Inbox size={26} /><span>Aucun carnet de bord pour le moment.</span></div>}

    {carnets.length > 0 && <div style={{ display: "grid", gap: 12 }}>
      {carnets.map(c => <article key={c.id} style={carteStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={badgeIconePetitStyle}><Truck size={16} /></span>
            <strong style={{ fontSize: 15, color: "#0f172a" }}>{c.vehicule.immatriculation}</strong>
          </div>
          <span style={c.statut === "EN_COURS" ? badgeEnCoursStyle : badgeClotureStyle}>{c.statut === "EN_COURS" ? "En cours" : "Clôturé"}</span>
        </div>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <span style={metaStyle}><User size={13} /> {c.conducteurNom}</span>
          <span style={metaStyle}><MapPin size={13} /> {c.destination} · {c.motif}</span>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <span style={metaStyle}><CalendarClock size={13} /> Sortie : {new Date(c.dateSortie).toLocaleString("fr-FR")}</span>
          <span style={metaStyle}><CalendarClock size={13} /> Retour : {c.dateRetour ? new Date(c.dateRetour).toLocaleString("fr-FR") : "en cours"}</span>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {!moto(c.vehicule) && c.kilometrageDepart != null && <span style={metaStyle}><Gauge size={13} /> {c.kilometrageDepart} km {c.kilometrageRetour != null ? `→ ${c.kilometrageRetour} km` : "→ en cours"}</span>}
          {moto(c.vehicule) && c.niveauChargeDepart != null && <span style={metaStyle}><BatteryCharging size={13} /> {c.niveauChargeDepart}% {c.niveauChargeRetour != null ? `→ ${c.niveauChargeRetour}%` : "→ en cours"}</span>}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" style={boutonSecondaireStyle} onClick={() => void api<Etat[]>(`/carnet-bord/${c.id}/etat-lieux`).then(data => setEtats(p => ({ ...p, [c.id]: data }))).catch(e => setErreur(String(e)))}><Eye size={15} /> Voir les états des lieux</button>
          {c.statut === "EN_COURS" && <button type="button" style={boutonRetourStyle} onClick={() => { setRetourId(c.id); setCompteurRetour(""); setEtatRetour(etatVide()); }}><Undo2 size={15} /> Enregistrer le retour</button>}
        </div>

        {etats[c.id] && <div style={etatsBoxStyle}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>États des lieux</span>
          {etats[c.id].length === 0 && <span style={metaStyle}>Aucun état enregistré.</span>}
          {etats[c.id].map((t, index) => <div key={`${c.id}-${index}`} style={etatLigneStyle}>
            <span style={badgeTicketStyle}>{libelleMoment(t.moment)}</span>
            <span style={etatItemStyle}><ClipboardList size={13} /> {t.etatApparent}</span>
            <span style={etatItemStyle}><Fuel size={13} /> {t.niveauCarburantCharge}</span>
            <span style={{ color: t.equipementsOk ? "#15803d" : "#b45309" }}>{t.equipementsOk ? "Équipements conformes" : t.detailEquipements || "Équipements non conformes"}</span>
            {t.anomalieSignalee && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#b91c1c" }}><TriangleAlert size={13} /> {t.descriptionAnomalie}</span>}
          </div>)}
        </div>}

        {retourId === c.id && <form onSubmit={e => void fermer(e, c)} style={retourFormStyle}>
          <label style={champStyle}>
            <span>{moto(c.vehicule) ? "Charge retour (%)" : "Kilométrage retour"}</span>
            <input style={selectStyle} required type="number" step={1} min={moto(c.vehicule) ? 0 : c.kilometrageDepart || 0} max={moto(c.vehicule) ? 100 : undefined} value={compteurRetour} onChange={e => setCompteurRetour(e.target.value)} />
          </label>
          <FormEtat value={etatRetour} onChange={setEtatRetour} />
          <button type="submit" disabled={envoi} style={{ ...boutonPrimaireStyle, opacity: envoi ? 0.6 : 1, cursor: envoi ? "wait" : "pointer" }}><Save size={15} /> {envoi ? "Clôture…" : "Clôturer avec l’état après"}</button>
        </form>}
      </article>)}
    </div>}
  </main>
  {rappelMission && <div role="presentation" style={overlayRappelStyle}>
    <section role="alertdialog" aria-modal="true" aria-labelledby="rappel-mission-titre" style={dialogueRappelStyle}>
      <span style={iconeRappelStyle}><Clock3 size={22} /></span>
      <h2 id="rappel-mission-titre" style={{ margin: 0, color: "#0f172a", fontSize: 20 }}>Départ imminent</h2>
      <p style={{ margin: 0, color: "#334155", fontSize: 14, lineHeight: 1.6, textAlign: "center" }}>
        Le véhicule <strong>{rappelMission.vehicule?.immatriculation || "—"}</strong> va partir en mission le <strong>{new Date(rappelMission.dateDebut).toLocaleDateString("fr-FR")}</strong> à <strong>{new Date(rappelMission.dateDebut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</strong>.
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap", width: "100%" }}>
        <button type="button" onClick={fermerRappelMission} style={boutonSecondaireStyle}>Annuler</button>
        <button type="button" onClick={ouvrirCarnetDepuisRappel} style={boutonPrimaireStyle}><BookOpen size={15} /> Ouvrir le carnet de bord</button>
      </div>
    </section>
  </div>}
  </>;
}

const carteStyle: CSSProperties = { display: "grid", gap: 14, padding: 18, borderRadius: 14, border: "1px solid #e2e8f0", background: "#fff", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)" };
const badgeIconeStyle: CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, flex: "0 0 auto", borderRadius: 12, background: "linear-gradient(135deg, #dbeafe, #eff6ff)", color: "#1d4ed8", border: "1px solid #bfdbfe" };
const badgeIconePetitStyle: CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, flex: "0 0 auto", borderRadius: 9, background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" };
const boutonPrimaireStyle: CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px 16px", borderRadius: 9, border: "1px solid #1d4ed8", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", fontSize: 13, fontWeight: 700 };
const boutonSecondaireStyle: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 9, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const boutonRetourStyle: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 9, border: "1px solid #fdba74", background: "#fff7ed", color: "#c2410c", fontSize: 13, fontWeight: 700, cursor: "pointer" };
const overlayRappelStyle: CSSProperties = { position: "fixed", inset: 0, zIndex: 1400, display: "grid", placeItems: "center", padding: 18, background: "rgba(15,23,42,.48)", backdropFilter: "blur(4px)" };
const dialogueRappelStyle: CSSProperties = { width: "min(440px, 100%)", display: "grid", justifyItems: "center", gap: 15, padding: 26, borderRadius: 18, border: "1px solid #bfdbfe", background: "#fff", boxShadow: "0 24px 70px rgba(15,23,42,.24)" };
const iconeRappelStyle: CSSProperties = { display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 14, background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" };
const alerteErreurStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "11px 14px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", fontSize: 13, whiteSpace: "pre-wrap" };
const videStyle: CSSProperties = { display: "grid", placeItems: "center", gap: 8, padding: "34px 20px", borderRadius: 14, border: "1px dashed #cbd5e1", background: "#f8fafc", color: "#94a3b8", fontSize: 13 };
const champStyle: CSSProperties = { display: "grid", gap: 5, fontSize: 12, fontWeight: 600, color: "#475569" };
const selectStyle: CSSProperties = { width: "100%", padding: "9px 11px", borderRadius: 9, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", fontSize: 13, fontWeight: 500 };
const fieldsetStyle: CSSProperties = { display: "grid", gap: 12, padding: 14, margin: 0, borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fafc" };
const legendStyle: CSSProperties = { padding: "0 6px", fontSize: 12.5, fontWeight: 700, color: "#1d4ed8" };
const caseStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500, color: "#334155" };
const badgeTicketStyle: CSSProperties = { fontFamily: "monospace", fontSize: 11.5, fontWeight: 700, color: "#1d4ed8", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 7, padding: "3px 8px" };
const badgeEnCoursStyle: CSSProperties = { fontSize: 11.5, fontWeight: 700, color: "#1d4ed8", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 999, padding: "4px 10px" };
const badgeClotureStyle: CSSProperties = { fontSize: 11.5, fontWeight: 700, color: "#15803d", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 999, padding: "4px 10px" };
const metaStyle: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, color: "#64748b", fontSize: 12.5 };
const etatsBoxStyle: CSSProperties = { display: "grid", gap: 8, padding: 12, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" };
const etatLigneStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 12.5, color: "#334155" };
const etatItemStyle: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 5 };
const retourFormStyle: CSSProperties = { display: "grid", gap: 12, padding: 14, borderRadius: 12, background: "#fff7ed", border: "1px solid #fed7aa" };
