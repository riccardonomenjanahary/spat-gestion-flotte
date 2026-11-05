
export type RecordMetier = Record<string, unknown>;
export const SOURCES = {
  missions: { titre: "Missions", route: "/reservations" },
  carnets: { titre: "Carnets de bord", route: "/carnet-bord" },
  requisitions: { titre: "Réquisitions", route: "/requisitions" },
  incidents: { titre: "Incidents", route: "/signalements-incidents" },
  maintenance: { titre: "Maintenance", route: "/maintenances" },
  carburant: { titre: "Carburant et recharges", route: "/carburant" },
  sinistres: { titre: "Sinistres", route: "/sinistres" },
  assurances: { titre: "Assurances", route: "/assurances" },
  surete: { titre: "Fiches de sûreté", route: "/fiches-surete" },
  echeances: { titre: "Échéances à 30 jours / dépassées", route: "/dashboard/echeances" },
  vehicules: { titre: "Véhicules", route: "/vehicules" },
  chauffeurs: { titre: "Chauffeurs", route: "/chauffeurs" },
  conducteurs: { titre: "Habilitations motos", route: "/conducteurs-autorises" },
  directions: { titre: "Directions", route: "/directions" },
  utilisateurs: { titre: "Comptes et profils", route: "/admin/utilisateurs" },
  gps: { titre: "Positions GPS reçues", route: "/gps/positions" },
  journal: { titre: "Journal des actions", route: "/admin/modifications?taille=100" },
} as const;
export type Source = keyof typeof SOURCES;

export const SOURCES_SUPERVISION: Source[] = [
  "missions", "carnets", "requisitions", "incidents", "sinistres", "surete", "echeances", "conducteurs",
];
export const ONGLETS_SUPERVISION: Source[] = SOURCES_SUPERVISION.filter(source => source !== "missions");
export type Vue = Source | "planning" | "navettes";
export type ModuleData = { lignes: RecordMetier[]; erreur?: string; total: number };
export type Snapshot = { modules: Partial<Record<Source, ModuleData>>; date: string };
export type Ligne = { cle: string; source: Source; brut: RecordMetier; reference: string; objet: string; vehicule: string; acteur: string; direction: string; statut: string; debut: string; fin: string; navette: boolean };

export function valeur(obj: RecordMetier, path: string): unknown {
  return path.split(".").reduce<unknown>((v, key) => v && typeof v === "object" ? (v as RecordMetier)[key] : undefined, obj);
}
export function texte(obj: RecordMetier, ...paths: string[]): string {
  for (const path of paths) {
    const v = valeur(obj, path);
    if (v !== undefined && v !== null && String(v).trim() !== "" && typeof v !== "object") return String(v);
  }
  return "";
}
export function instant(value: string): number {
  if (!value) return NaN;

  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00+03:00`
    : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(value) ? `${value}+03:00` : value;
  return new Date(iso).getTime();
}
export function jour(value: string): string {
  if (!Number.isFinite(instant(value))) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Indian/Antananarivo", year: "numeric", month: "2-digit", day: "2-digit" }).format(instant(value));
}
export function dateLisible(value: string): string {
  if (!Number.isFinite(instant(value))) return "—";
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Indian/Antananarivo", dateStyle: "short", ...(value.includes("T") ? { timeStyle: "short" as const } : {}) }).format(instant(value));
}

function libelleAction(methode: string, chemin: string): string {
  const ticket = chemin.match(/\/reservations\/(\d+)/)?.[1];
  const suffixe = ticket ? ` — TKT-${ticket.padStart(5, "0")}` : "";
  if (chemin.includes("/notifications/") && chemin.endsWith("/lu")) return "Notification consultée";
  if (chemin.endsWith("/validation-n2")) return `Validation finale de mission${suffixe}`;
  if (chemin.endsWith("/decision")) return `Décision sur une mission${suffixe}`;
  if (chemin.includes("/cloturer")) return `Clôture de mission${suffixe}`;
  if (chemin.includes("/demande-avis")) return `Demande de contrôle atelier${suffixe}`;
  const domaine = chemin.includes("/reservations") ? "mission" : chemin.includes("/navettes-pact") ? "navette PACT"
    : chemin.includes("/carnet-bord") ? "carnet de bord" : chemin.includes("/requisitions") ? "réquisition"
    : chemin.includes("/fiches-surete") ? "fiche de sûreté" : chemin.includes("/maintenances") ? "entretien / contrôle atelier"
    : chemin.includes("/vehicules") ? "véhicule" : chemin.includes("/utilisateurs") ? "compte utilisateur"
    : chemin.includes("/carburant") ? "opération carburant" : chemin.includes("/sinistres") ? "sinistre" : "dossier";
  const operation = methode === "POST" ? "Enregistrement" : methode === "DELETE" ? "Suppression" : "Mise à jour";
  return `${operation} : ${domaine}${suffixe}`;
}

export async function chargerSupervision(signal: AbortSignal, pageJournal = 0): Promise<Snapshot> {
  const token = localStorage.getItem("token");
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!token || !api) throw new Error("Session ou adresse du serveur indisponible.");
  const keys = SOURCES_SUPERVISION;
  const resultats = await Promise.allSettled(keys.map(async key => {
    const route = SOURCES[key].route + (key === "journal" ? `&page=${pageJournal}` : "");
    const response = await fetch(`${api}${route}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]), cache: "no-store", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    if (!response.ok) throw new Error(response.status === 403 ? "Accès refusé par le serveur." : response.status === 401 ? "Session expirée." : `Serveur indisponible (HTTP ${response.status}).`);
    const body: unknown = await response.json();
    const list = Array.isArray(body) ? body : body && typeof body === "object" && "content" in body ? body.content : null;
    if (!Array.isArray(list)) throw new Error("Réponse serveur non reconnue.");
    const total = body && !Array.isArray(body) && typeof body === "object" && "totalElements" in body ? Number(body.totalElements) : list.length;
    return { lignes: list.filter(v => v && typeof v === "object") as RecordMetier[], total };
  }));
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  const modules: Snapshot["modules"] = {};
  resultats.forEach((r, i) => { modules[keys[i]] = r.status === "fulfilled" ? r.value : { lignes: [], total: 0, erreur: r.reason instanceof Error ? r.reason.message : "Chargement impossible." }; });
  return { modules, date: new Date().toISOString() };
}

export function normaliser(source: Source, brut: RecordMetier, index: number): Ligne {
  const t = (...paths: string[]) => texte(brut, ...paths);
  const navette = source === "missions" && (t("modeCreation") === "NAVETTE_PACT" || t("motif").startsWith("Navette parapheurs PACT – Circuit"));
  const id = t("id", "gpsDeviceId", "vehiculeId", "code") || String(index + 1);
  const nom = [t("prenom"), t("nom")].filter(Boolean).join(" ");
  let objet = t("motif", "description", "natureIntervention", "diagnosticVisuel", "numeroDossier", "modeleType", "nomComplet", "nom", "type");
  let statut = t("statut", "statutGps", "niveau_alerte");
  if (source === "utilisateurs" || source === "directions") statut = brut.actif === true ? "ACTIF" : brut.actif === false ? "INACTIF" : "NON_RENSEIGNE";
  if (source === "conducteurs") statut = brut.actif === false ? "INACTIF" : brut.valide === true ? "HABILITE" : "A_VALIDER";
  if (source === "carburant") { objet = t("type"); statut = "ENREGISTRE"; }
  if (source === "chauffeurs") objet = nom;
  if (source === "conducteurs") objet = t("nomComplet", "nom") || nom;
  if (source === "journal") { objet = libelleAction(t("methode"), t("chemin")); statut = `HTTP ${t("statutHttp")}`; }
  if (source === "gps") objet = t("nomGps", "immatriculation");
  if (source === "assurances") { objet = t("numeroPolice", "assureur"); statut = "ENREGISTREE"; }
  if (source === "surete") { objet = t("mission", "nomFichier"); statut = "TRANSMISE"; }
  const reference = source === "missions" ? `TKT-${id.padStart(5, "0")}` : `${SOURCES[source].titre} · ${id}`;
  return {
    cle: `${source}-${id}-${index}`, source, brut, reference, objet: objet || "Non renseigné", navette,
    vehicule: t("vehicule.immatriculation", "immatriculation", "vehicule_immatriculation"),
    acteur: t("conducteurNom", "beneficiaire", "conducteur", "demandeurNom", "nomComplet", "acteurMatricule", "agentEmail", "deposeParNom") || (source === "chauffeurs" ? nom : [t("chauffeur.prenom"), t("chauffeur.nom")].filter(Boolean).join(" ")),
    direction: t("demandeurEntite", "direction.code", "direction.nom", "affectation", "affectationService", "acteurRole", "role"),
    statut: statut || "NON_RENSEIGNE",
    debut: t("dateDebut", "debut", "dateSortie", "date_signalement", "dateSignalement", "dateSinistre", "dateOperation", "dateIntervention", "date_echeance", "dateAction", "dateGps", "dateCreation", "dateDepot"),
    fin: t("dateRetour", "dateFin", "dateCloture", "clotureeLe", "dateExpiration"),
  };
}

export const CHAMPS: [string, string, "date"?][] = [
  ["Destination", "destination"], ["Départ", "pointDepart"], ["Zone", "zoneMission"], ["Motif", "motif"],
  ["Type de demande", "typeDemande"], ["Urgence", "demandeUrgente"], ["Motif d’urgence", "motifUrgence"],
  ["Conducteur", "conducteurNom"], ["Conducteur (matricule)", "conducteurMatricule"], ["Chauffeur", "chauffeur.nom"],
  ["Bénéficiaire", "demandeurNom"], ["Direction", "demandeurEntite"],
  ["Mission associée (ticket)", "reservation.id"], ["Mission impactée (ticket)", "reservationImpactee.id"],
  ["Auteur réquisition", "requisitionnePar.nomComplet"], ["Date réquisition", "dateRequisition", "date"],
  ["Validateur N1", "validationN1Par.nomComplet"], ["Validation N1", "dateValidationN1", "date"],
  ["Validateur N2", "validationN2Par.nomComplet"], ["Validation N2", "dateValidationN2", "date"],
  ["Refus", "motifRefus"], ["Sortie", "dateSortie", "date"], ["Retour", "dateRetour", "date"],
  ["Kilométrage départ", "kilometrageDepart"], ["Kilométrage retour", "kilometrageRetour"],
  ["Charge départ (%)", "niveauChargeDepart"], ["Charge retour (%)", "niveauChargeRetour"],
  ["Saisi par", "saisiPar.nomComplet"], ["Type d’incident", "typeIncident"], ["Gravité", "gravite"],
  ["Description", "description"], ["Intervention", "natureIntervention"], ["Diagnostic", "diagnosticVisuel"],
  ["Avis atelier", "decisionDID"], ["Compte rendu", "compteRenduEntretien"], ["Prestataire", "prestataire"],
  ["Opération", "type"], ["Quantité déclarée", "quantiteLitres"], ["Prix unitaire", "prixUnitaire"], ["Montant (Ar)", "montantTotal"],
  ["Kilométrage", "kilometrage"], ["Station", "station"], ["Dossier sinistre", "numeroDossier"], ["Lieu", "lieu"],
  ["Circonstances", "circonstance"], ["Couverture assurance", "sourceAssurance"], ["Police", "referencePolice"],
  ["Indemnisation", "statutIndemnisation"], ["Montant indemnisé (Ar)", "montantIndemnisation"], ["Date indemnisation", "dateIndemnisation", "date"],
  ["Échéance", "date_echeance", "date"], ["Jours restants", "jours_avant"], ["Police assurance", "numero_police"],
  ["Police assurance", "numeroPolice"], ["Assureur", "assureur"], ["Couverture", "typeCouverture"], ["Expiration assurance", "dateExpiration", "date"],
  ["Fiche transmise", "nomFichier"], ["Déposant", "deposeParNom"], ["Date dépôt", "dateDepot", "date"],
  ["Catégorie", "categorie"], ["Affectation", "affectation"], ["Détention", "modeDetention"],
  ["Visite technique", "dateExpirationVisiteTechnique", "date"], ["Prochain entretien", "dateProchainEntretien", "date"],
  ["Matricule", "matricule"], ["Nom", "nomComplet"], ["Prénom", "prenom"], ["Nom de famille", "nom"], ["Rôle", "role"],
  ["Permis", "numeroPermis"], ["Validité permis", "dateExpirationPermis", "date"], ["Habilitation validée", "valide"],
  ["Date validation", "dateValidation", "date"], ["Code Direction", "code"], ["Latitude", "latitude"], ["Longitude", "longitude"],
  ["Vitesse (km/h)", "vitesse"], ["Dernier relevé GPS", "dateGps", "date"],
  ["Auteur", "acteurMatricule"], ["Profil auteur", "acteurRole"], ["Méthode", "methode"], ["Action", "chemin"],
  ["Création", "dateCreation", "date"], ["Observations", "observations"], ["Observation", "observation"],
];
