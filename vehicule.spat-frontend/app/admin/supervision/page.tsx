"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { Activity, ArrowLeft, Eye, RefreshCw, Search, X } from "lucide-react";
import EnTete from "@/components/EnTete";
import ExportButtons from "@/components/ExportButtons";
import { CHAMPS, SOURCES, SOURCES_SUPERVISION, ONGLETS_SUPERVISION, chargerSupervision, dateLisible, instant, jour, normaliser, texte, valeur,
  type Ligne, type RecordMetier, type Snapshot, type Source, type Vue } from "@/app/lib/supervision";

const TERMINEES = new Set(["CLOTURE", "CLOTUREE", "TERMINEE", "ANNULEE", "REFUSEE", "RESOLU", "RESOLUE"]);
const PLANIFIEES = new Set(["VALIDEE", "PLANIFIEE", "EN_COURS", "EN_MISSION"]);
const TABS = [{ id: "planning" as Vue, titre: "Planning global" }, { id: "navettes" as Vue, titre: "Navettes PACT" },
  ...ONGLETS_SUPERVISION.map(id => ({ id, titre: SOURCES[id].titre }))];

function Badge({ statut }: { statut: string }) {
  const rouge = /PANNE|INDISPONIBLE|REQUISITIONNE|EXPIREE|CRITIQUE|REFUSE|NON_RENSEIGNE/.test(statut);
  const vert = /VALIDEE|PLANIFIEE|DISPONIBLE|CLOTURE|TERMINEE|HABILITE/.test(statut) && !rouge;
  return <span style={{ display: "inline-block", padding: "5px 9px", borderRadius: 7, fontSize: 11, fontWeight: 750, background: rouge ? "#fef2f2" : vert ? "#ecfdf5" : "#eff6ff", color: rouge ? "#b91c1c" : vert ? "#047857" : "#1d4ed8" }}>{statut.replaceAll("_", " ")}</span>;
}

export default function SupervisionPage() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [erreur, setErreur] = useState("");
  const [revision, setRevision] = useState(0);
  const [actualisation, setActualisation] = useState(true);
  const [vue, setVue] = useState<Vue>("planning");
  const [recherche, setRecherche] = useState("");
  const [statut, setStatut] = useState("");
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<Ligne | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let occupe = false;
    const charger = async () => {
      if (occupe) return;
      occupe = true;
      try {
        const data = await chargerSupervision(controller.signal);
        if (!controller.signal.aborted) { setSnapshot(data); setErreur(""); }
      } catch (e) {
        if (!controller.signal.aborted) setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      } finally {
        if (!controller.signal.aborted) setActualisation(false);
        occupe = false;
      }
    };
    void charger();
    const timer = window.setInterval(() => { if (!document.hidden) void charger(); }, 30000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [revision]);

  const lignes = useMemo(() => {
    if (!snapshot) return [];
    return SOURCES_SUPERVISION.flatMap(source => (snapshot.modules[source]?.lignes || []).map((r, i) => normaliser(source, r, i)));
  }, [snapshot]);
  const parVue = useMemo(() => lignes.filter(r => vue === "navettes" ? r.navette : vue === "planning"
    ? r.source === "missions" && PLANIFIEES.has(r.statut) || r.source === "requisitions" && r.statut === "ACTIVE"
    : r.source === vue), [lignes, vue]);
  const statuts = [...new Set(parVue.map(r => r.statut))].sort();
  const filtrees = useMemo(() => {
    const q = recherche.trim().toLocaleLowerCase("fr-FR");
    return parVue.filter(r => {
      const d = jour(r.debut);
      const rechercheOk = !q || [r.reference, r.objet, r.vehicule, r.acteur, r.direction, texte(r.brut, "destination"), r.statut].join(" ").toLocaleLowerCase("fr-FR").includes(q);

      const dernierJour = jour(r.fin) || d;
      return rechercheOk && (!statut || r.statut === statut) && (!debut || !!dernierJour && dernierJour >= debut) && (!fin || !!d && d <= fin);
    }).sort((a, b) => {
      const da = instant(a.debut), db = instant(b.debut);
      if (!Number.isFinite(da)) return Number.isFinite(db) ? 1 : 0;
      if (!Number.isFinite(db)) return -1;
      return vue === "planning" || vue === "navettes" ? da - db : db - da;
    });
  }, [parVue, recherche, statut, debut, fin, vue]);
  const changerVue = (v: Vue) => { setVue(v); setStatut(""); setPage(0); };
  const taille = 25;
  const dernierePage = Math.max(0, Math.ceil(filtrees.length / taille) - 1);
  const pageVisible = Math.min(page, dernierePage);
  const echecs = SOURCES_SUPERVISION.filter(s => snapshot?.modules[s]?.erreur);
  const sourcesVue: Source[] = vue === "planning" ? ["missions", "requisitions"] : vue === "navettes" ? ["missions"] : [vue];
  const maintenant = snapshot ? instant(snapshot.date) : 0;
  const compte = (source: Source, predicat: (r: Ligne) => boolean) => !snapshot || snapshot.modules[source]?.erreur ? "—" : lignes.filter(r => r.source === source && predicat(r)).length;
  const indicateurs: { titre: string; nombre: number | string; vue: Vue; detail: string }[] = [
    { titre: "Missions planifiées / en cours", nombre: compte("missions", r => PLANIFIEES.has(r.statut)), vue: "planning", detail: "Toutes Directions et catégories" },
    { titre: "Carnets ouverts", nombre: compte("carnets", r => r.statut === "EN_COURS"), vue: "carnets", detail: "Sorties sans retour enregistré" },
    { titre: "Réquisitions actives", nombre: compte("requisitions", r => r.statut === "ACTIVE"), vue: "requisitions", detail: "Priorités DGAL" },
    { titre: "Incidents ouverts", nombre: compte("incidents", r => !TERMINEES.has(r.statut)), vue: "incidents", detail: "Signalements à suivre" },
    { titre: "Échéances ≤ 7 jours", nombre: compte("echeances", r => Number(valeur(r.brut, "jours_avant")) <= 7), vue: "echeances", detail: "Inclut les échéances dépassées" },
    { titre: "Navettes à affecter", nombre: compte("missions", r => r.navette && r.statut === "EN_ATTENTE"), vue: "navettes", detail: "Circuits PACT de 10 h et 17 h" },
  ];
  const retoursEnRetard = lignes.filter(r => r.source === "carnets" && r.statut === "EN_COURS" && instant(texte(r.brut, "reservation.dateFin")) < maintenant);

  return <><EnTete afficherNotifications /><main className="supervision">
    <Link href="/admin" className="retour"><ArrowLeft size={16} /> Retour à l’administration</Link>
    <header className="entete-supervision">
      <div><span className="surtitre"><Activity size={15} /> PILOTAGE DU PARC</span><h1>Supervision globale</h1></div>
      <div className="actualisation"><span><Eye size={15} /> Consultation seule</span><small>{snapshot ? `Dernière lecture : ${dateLisible(snapshot.date)} · actualisation toutes les 30 s` : "Chargement des données…"}</small>
        <button type="button" disabled={actualisation} onClick={() => { setActualisation(true); setRevision(v => v + 1); }}><RefreshCw size={15} />{actualisation ? "Actualisation…" : "Actualiser"}</button></div>
    </header>
    {erreur && <p role="alert" className="erreur">{erreur} {snapshot && "Les dernières données affichées peuvent être anciennes."}</p>}
    {echecs.length > 0 && <div role="alert" className="erreur"><strong>Supervision partielle : {echecs.length} source(s) non chargée(s).</strong><ul>{echecs.map(s => <li key={s}>{SOURCES[s].titre} : {snapshot?.modules[s]?.erreur}</li>)}</ul><p>Une source indisponible n’est pas comptée comme une absence d’activité.</p></div>}
    <div className="indicateurs">{indicateurs.map(k => <button key={k.titre} className="indicateur" onClick={() => changerVue(k.vue)}><span>{k.titre}</span><strong>{k.nombre}</strong><small>{k.detail}</small></button>)}</div>
    {retoursEnRetard.length > 0 && <div className="attention"><strong>{retoursEnRetard.length} retour(s) à vérifier</strong> : un carnet reste ouvert après la fin prévue de sa mission. <button onClick={() => { changerVue("carnets"); setStatut("EN_COURS"); }}>Consulter</button></div>}
    <section className="bloc">
      <nav aria-label="Modules de supervision" className="onglets">{TABS.map(t => {
        const source = t.id === "navettes" || t.id === "planning" ? "missions" : t.id;
        const failed = snapshot?.modules[source]?.erreur;
        return <button key={t.id} aria-pressed={vue === t.id} onClick={() => changerVue(t.id)}>{t.titre}{failed ? " ⚠" : ""}</button>;
      })}</nav>
      <div className="contenu">
        <div className="titre-liste"><div><h2>{TABS.find(t => t.id === vue)?.titre}</h2></div><span className="nombre">{filtrees.length} résultat(s)</span></div>
        <div className="filtres">
          <label className="recherche"><span><Search size={15} /> Recherche</span><input value={recherche} onChange={e => { setRecherche(e.target.value); setPage(0); }} placeholder="Véhicule, Direction, personne, motif…" /></label>
          <label>Statut<select value={statut} onChange={e => { setStatut(e.target.value); setPage(0); }}><option value="">Tous les statuts</option>{statuts.map(s => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}</select></label>
          <label>Du<input type="date" value={debut} onChange={e => { setDebut(e.target.value); setPage(0); }} /></label>
          <label>Au<input type="date" value={fin} min={debut || undefined} onChange={e => { setFin(e.target.value); setPage(0); }} /></label>
          <button onClick={() => { setRecherche(""); setStatut(""); setDebut(""); setFin(""); setPage(0); }}>Réinitialiser</button>
        </div>
        {debut && fin && debut > fin && <p role="alert" className="erreur">La fin du filtre doit être postérieure ou égale au début.</p>}
        {sourcesVue.some(s => snapshot?.modules[s]?.erreur) && <p role="alert" className="erreur">Cette vue est incomplète. Consultez les sources indisponibles signalées ci-dessus.</p>}
        <ExportButtons titre={`Supervision — ${TABS.find(t => t.id === vue)?.titre}`} nomFichier={`supervision_${vue}`} sousTitre="Données filtrées · heure de Madagascar" donnees={filtrees} colonnes={[
          { header: "Référence", key: "reference" }, { header: "Objet", key: "objet" }, { header: "Véhicule", key: "vehicule" },
          { header: "Personne", key: "acteur" }, { header: "Direction / profil", key: "direction" }, { header: "Statut", key: "statut" },
          { header: "Début / date", value: r => dateLisible(r.debut) }, { header: "Fin / retour", value: r => dateLisible(r.fin) },
        ]} />
        <div className="table-scroll"><table><thead><tr><th>Référence / objet</th><th>Véhicule</th><th>Personne / Direction</th><th>Date / période</th><th>Statut</th><th>Consultation</th></tr></thead><tbody>
          {filtrees.slice(pageVisible * taille, (pageVisible + 1) * taille).map(r => <tr key={r.cle}><td><strong>{r.reference}</strong><p>{r.objet}</p>{r.navette && <small>Navette PACT</small>}</td><td>{r.vehicule || "—"}</td><td>{r.acteur || "—"}<small>{r.direction}</small></td><td>{dateLisible(r.debut)}{r.fin && <small>→ {dateLisible(r.fin)}</small>}</td><td><Badge statut={r.statut} /></td><td><button onClick={() => setDetail(r)}><Eye size={14} /> Détails</button></td></tr>)}
          {!filtrees.length && <tr><td colSpan={6} className="vide">{!snapshot ? "Chargement…" : sourcesVue.some(s => snapshot.modules[s]?.erreur) ? "Données non disponibles ou partiellement chargées." : "Aucun enregistrement correspondant aux filtres."}</td></tr>}
        </tbody></table></div>
        <div className="pagination"><button disabled={pageVisible === 0} onClick={() => setPage(pageVisible - 1)}>Précédent</button><span>Page {pageVisible + 1} / {dernierePage + 1}</span><button disabled={pageVisible >= dernierePage} onClick={() => setPage(pageVisible + 1)}>Suivant</button></div>
      </div>
    </section>
    {detail && <Detail key={detail.cle} ligne={detail} fermer={() => setDetail(null)} />}
    <style jsx>{`
      .supervision{max-width:1600px;margin:auto;padding:26px clamp(14px,3vw,40px) 60px;color:#1e293b;background:#f5f7fa;min-height:100vh}
      .retour{display:inline-flex;align-items:center;gap:8px;color:#475569;text-decoration:none;margin-bottom:20px}
      .entete-supervision{display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap;background:#0f172a;color:white;padding:28px;border-radius:16px}
      .surtitre{display:flex;align-items:center;gap:7px;font-size:11px;letter-spacing:.12em;color:#7dd3fc;font-weight:800}h1{margin:10px 0;font-size:30px}.entete-supervision p{color:#cbd5e1;margin:0;line-height:1.5}
      .actualisation{display:grid;gap:10px;align-content:center}.actualisation span{display:flex;gap:6px;align-items:center}.actualisation small{color:#cbd5e1}
      button{display:inline-flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;border:1px solid #cbd5e1;padding:9px 12px;border-radius:8px;background:white;color:#334155;font:inherit;font-size:13px}button:disabled{opacity:.5;cursor:default}
      .indicateurs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:20px 0}.indicateur{display:grid;text-align:left;justify-content:stretch;gap:7px;padding:18px;border:1px solid #e2e8f0}.indicateur strong{font-size:30px;color:#0f172a}.indicateur small{color:#64748b}.indicateur:hover{border-color:#0284c7}
      .bloc{background:white;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden}.onglets{display:flex;flex-wrap:wrap;gap:7px;padding:16px;background:#f8fafc;border-bottom:1px solid #e2e8f0}.onglets button[aria-pressed=true]{background:#0f172a;color:white;border-color:#0f172a}.contenu{padding:20px}
      .titre-liste{display:flex;justify-content:space-between;gap:16px;align-items:start}.titre-liste h2{margin:0 0 6px}.titre-liste p{font-size:13px;color:#64748b;max-width:760px;line-height:1.5}.nombre{white-space:nowrap;color:#64748b;font-size:13px}
      .filtres{display:flex;flex-wrap:wrap;gap:12px;align-items:end;margin:20px 0}.filtres label{display:grid;gap:7px;font-size:12px;font-weight:700}.recherche{flex:1;min-width:220px}.recherche span{display:flex;gap:6px;align-items:center}input,select{padding:10px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;color:#334155;background:white;min-width:130px}
      .table-scroll{overflow-x:auto;margin-top:16px}table{width:100%;border-collapse:collapse;min-width:850px;text-align:left;font-size:13px}th{font-size:11px;text-transform:uppercase;color:#64748b;background:#f8fafc;padding:13px}td{padding:15px 13px;border-bottom:1px solid #e2e8f0;vertical-align:top}td:first-child{max-width:350px}td p{margin:6px 0;line-height:1.5;overflow-wrap:anywhere}td small{display:block;color:#64748b;margin-top:6px}td strong{font-size:12px}.vide{text-align:center;padding:35px;color:#64748b}.pagination{display:flex;justify-content:flex-end;gap:14px;align-items:center;margin-top:18px;font-size:12px}
      .erreur{background:#fef2f2;color:#991b1b;border:1px solid #fecaca;padding:14px;border-radius:10px;margin:16px 0;font-size:13px}.erreur p{margin:8px 0 0}.attention{background:#fffbeb;border:1px solid #fde68a;padding:14px;border-radius:10px;margin-bottom:16px;font-size:13px}.attention button{margin-left:10px}
      @media(max-width:700px){.indicateurs{grid-template-columns:repeat(2,minmax(0,1fr))}.entete-supervision{padding:20px}h1{font-size:25px}.contenu{padding:14px}.filtres label{flex:1}.titre-liste{display:block}}
    `}</style>
  </main></>;
}

function Detail({ ligne, fermer }: { ligne: Ligne; fermer: () => void }) {
  const [etats, setEtats] = useState<RecordMetier[] | null>(null);
  const [erreur, setErreur] = useState("");
  const [pdf, setPdf] = useState("");
  useEffect(() => {
    if (ligne.source !== "surete") return;
    const controller = new AbortController();
    let fichier = "";
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/fiches-surete/${texte(ligne.brut, "id")}/contenu`, {
      signal: controller.signal, headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, cache: "no-store",
    }).then(async r => { if (!r.ok) throw new Error(`Fiche PDF inaccessible (HTTP ${r.status}).`); return r.blob(); })
      .then(blob => { if (!controller.signal.aborted) { fichier = URL.createObjectURL(blob); setPdf(fichier); } })
      .catch(e => { if (!controller.signal.aborted) setErreur(String(e)); });
    return () => { controller.abort(); if (fichier) URL.revokeObjectURL(fichier); };
  }, [ligne]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") fermer(); };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [fermer]);
  useEffect(() => {
    if (ligne.source !== "carnets") return;
    const controller = new AbortController();
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/carnet-bord/${texte(ligne.brut, "id")}/etat-lieux`, { signal: controller.signal, headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, cache: "no-store" })
      .then(async r => { if (!r.ok) throw new Error(`États des lieux inaccessibles (HTTP ${r.status}).`); const body = await r.json(); if (!Array.isArray(body)) throw new Error("Réponse des états des lieux non reconnue."); return body as RecordMetier[]; })
      .then(setEtats).catch(e => { if (!controller.signal.aborted) setErreur(String(e)); });
    return () => controller.abort();
  }, [ligne]);
  const champs = CHAMPS.filter(([, path]) => valeur(ligne.brut, path) !== undefined && valeur(ligne.brut, path) !== null);
  const champStyle: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(120px, 1fr) 2fr", gap: 14, borderBottom: "1px solid #e2e8f0", padding: "10px 0", margin: 0 };
  return <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(15,23,42,.6)", display: "grid", placeItems: "center", padding: 16 }} onClick={fermer}>
    <section role="dialog" aria-modal="true" aria-labelledby="detail-supervision" style={{ background: "white", borderRadius: 14, maxWidth: 800, width: "100%", maxHeight: "85vh", overflowY: "auto", padding: 24, boxSizing: "border-box" }} onClick={e => e.stopPropagation()}>
      <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 18 }}><div><small>CONSULTATION SEULE</small><h2 id="detail-supervision">{ligne.reference}</h2><Badge statut={ligne.statut} /></div><button autoFocus aria-label="Fermer les détails" onClick={fermer}><X size={20} /></button></div>
      <p>{ligne.vehicule} · {ligne.objet}</p><p>{dateLisible(ligne.debut)} {ligne.fin && `→ ${dateLisible(ligne.fin)}`}</p>
      <dl>{champs.map(([label, path, format]) => { const v = valeur(ligne.brut, path); return <div key={path + label} style={champStyle}><dt style={{ color: "#64748b" }}>{label}</dt><dd style={{ margin: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{format === "date" ? dateLisible(String(v)) : typeof v === "boolean" ? v ? "Oui" : "Non" : String(v) || "—"}</dd></div>; })}</dl>
      {ligne.source === "surete" && <div><h3>Fiche de bord transmise</h3>{erreur && <p role="alert">{erreur}</p>}{pdf ? <iframe title="Fiche de sûreté en consultation" src={pdf} style={{ width: "100%", height: 550, border: "1px solid #cbd5e1" }} /> : !erreur && <p>Chargement du PDF…</p>}</div>}
      {ligne.source === "carnets" && <div><h3>États des lieux avant / après</h3>{erreur && <p role="alert">{erreur}</p>}{!etats && !erreur && <p>Chargement…</p>}{etats?.length === 0 && <p>Aucun état des lieux enregistré.</p>}{etats?.map((e, i) => <div key={i} style={{ padding: 12, marginTop: 10, border: "1px solid #cbd5e1", borderRadius: 8 }}><strong>{texte(e, "moment")}</strong><p>État : {texte(e, "etatApparent")} · Carburant / charge : {texte(e, "niveauCarburantCharge")}</p><p>Équipements : {e.equipementsOk === true ? "conformes" : e.equipementsOk === false ? "non conformes" : "non renseignés"} {texte(e, "detailEquipements")}</p><p>Anomalie : {e.anomalieSignalee === true ? texte(e, "descriptionAnomalie") || "signalée" : e.anomalieSignalee === false ? "aucune signalée" : "non renseignée"}</p><small>{dateLisible(texte(e, "dateRealisation"))}</small></div>)}</div>}
    </section>
  </div>;
}
