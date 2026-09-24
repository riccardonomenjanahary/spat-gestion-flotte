"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import RoleGuard from "@/components/RoleGuard";
import EnTete from "@/components/EnTete";
import BoutonsRapportSpat from "@/app/components/BoutonsRapportSpat";
import type { RapportSpat } from "@/app/lib/spatRapports";
import { ROLES } from "@/app/lib/roles";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Download,
  Fuel,
  Gauge,
  RefreshCw,
  ShieldAlert,
  Truck,
  Wrench,
} from "lucide-react";

interface Vehicule {
  id: number;
  immatriculation: string;
  categorie?: string | null;
  modeleType?: string | null;
  typeVehicule?: string | null;
  annee?: number | null;
  affectation?: string | null;
  etatGeneralObservations?: string | null;
  statut: string;
}

interface Demandeur {
  id?: number;
  nom?: string | null;
  prenom?: string | null;
  nomComplet?: string | null;
  numMatricule?: string | null;
  matricule?: string | null;
  email?: string | null;
}

interface Chauffeur {
  id: number;
  matricule?: string | null;
  nom?: string | null;
  prenom?: string | null;
  telephone?: string | null;
  email?: string | null;
  numeroPermis?: string | null;
  affectationService?: string | null;
  statut: string;
}

interface Reservation {
  id: number;

  vehicule?: Vehicule | null;
  chauffeur?: Chauffeur | null;
  demandeur?: Demandeur | null;

  dateDebut: string;
  dateFin: string;
  motif: string;

  demandeUrgente: boolean;
  motifUrgence?: string | null;

  statut: string;
  dateCreation: string;

  // Bénéficiaire réel de la demande
  demandeurNom?: string | null;
  demandeurPrenom?: string | null;
  demandeurMatricule?: string | null;
  demandeurEntite?: string | null;
  demandeurTelephone?: string | null;

  // Mission
  destination?: string | null;
  pointDepart?: string | null;
  nombrePassagers?: number | null;
  listePassagers?: string | null;
  typeVehiculeSouhaite?: string | null;
  besoinChauffeur?: boolean | null;
  observations?: string | null;

  // Refus niveau 1
  motifRefus?: string | null;
  refusePar?: Demandeur | null;
  dateRefus?: string | null;

  // Validation niveau 1
  validationN1Par?: Demandeur | null;
  dateValidationN1?: string | null;

  // Validation niveau 2
  validationN2Par?: Demandeur | null;
  dateValidationN2?: string | null;
}

interface Maintenance {
  id: string;
  vehicule?: Vehicule;
  natureIntervention: string;
  statut: string;
  avisTexte?: string | null;
  avisDate?: string | null;
  avisAuteurEmail?: string | null;
  dateCreation?: string | null;
  dateCloture?: string | null;
}

interface TransactionCarburant {
  id: string;
  vehicule?: Vehicule;
  type: "DOTATION" | "CONSOMMATION" | string;
  quantiteLitres: number;
  dateOperation: string;
  justificatif?: string | null;
  agentEmail?: string | null;
}

interface Assurance {
  id: string | number;
  vehicule?: Vehicule;
  numeroPolice?: string | null;
  police?: string | null;
  dateEcheance?: string | null;
  dateFin?: string | null;
  statut?: string | null;
}

interface Sinistre {
  id: string | number;
  vehicule?: Vehicule;
  dateSinistre?: string | null;
  date?: string | null;
  statut?: string | null;
  constat?: string | null;
  description?: string | null;
}

const statutMaintenanceLabel: Record<string, string> = {
  EN_ATTENTE_AVIS_DID: "En attente d'avis DID",
  PLANIFIEE: "Planifiée",
  EN_COURS: "En cours",
  CLOTUREE: "Clôturée",
};

export default function ChefDgalPage() {
  return (
    <RoleGuard role={ROLES.CHEF_DGAL}>
      <ChefDgalContent />
    </RoleGuard>
  );
}

function ChefDgalContent() {
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [transactions, setTransactions] = useState<TransactionCarburant[]>([]);
  const [assurances, setAssurances] = useState<Assurance[]>([]);
  const [sinistres, setSinistres] = useState<Sinistre[]>([]);
  const [chargement, setChargement] = useState(true);
  const [validationN2EnCours, setValidationN2EnCours] = useState<Record<number, boolean>>({});

  const [moisSelection, setMoisSelection] = useState(() => new Date().toISOString().slice(0, 7));

  const getToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  };

  const fetchListe = async <T,>(url: string, token: string): Promise<T[]> => {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const message = await res.text().catch(() => "");
      throw new Error(`${res.status} ${message}`.trim());
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  };

  const fetchListeOptionnelle = async <T,>(url: string, token: string): Promise<T[]> => {
    try {
      return await fetchListe<T>(url, token);
    } catch (error) {
      console.warn(`Module optionnel indisponible : ${url}`, error);
      return [];
    }
  };

  const charger = async () => {
    const token = getToken();

    if (!API) {
      toast.error("NEXT_PUBLIC_API_URL n'est pas configurée");
      setChargement(false);
      return;
    }

    if (!token) {
      toast.error("Session expirée. Veuillez vous reconnecter.");
      setChargement(false);
      return;
    }

    setChargement(true);

    try {
      const [v, r, m, c] = await Promise.all([
        fetchListe<Vehicule>(`${API}/vehicules`, token),
        fetchListe<Reservation>(`${API}/reservations`, token),
        fetchListe<Maintenance>(`${API}/maintenances`, token),
        fetchListe<TransactionCarburant>(`${API}/carburant`, token),
      ]);

      setVehicules(v);
      setReservations(r);
      setMaintenances(m);
      setTransactions(c);

      const [a, s] = await Promise.all([
        fetchListeOptionnelle<Assurance>(`${API}/assurances`, token),
        fetchListeOptionnelle<Sinistre>(`${API}/sinistres`, token),
      ]);

      setAssurances(a);
      setSinistres(s);
    } catch (error) {
      console.error("Erreur chargement Chef DGAL :", error);
      toast.error("Impossible de charger la vue consolidée de la flotte");
    } finally {
      setChargement(false);
    }
  };

  const validerNiveau2 = async (reservation: Reservation) => {
    const token = getToken();

    if (!API) {
      toast.error("NEXT_PUBLIC_API_URL n'est pas configurée");
      return;
    }

    if (!token) {
      toast.error("Session expirée. Veuillez vous reconnecter.");
      return;
    }

    if (reservation.statut !== "VALIDEE_N1") {
      toast.error("Cette demande n'est pas disponible pour une validation niveau 2.");
      return;
    }

    setValidationN2EnCours((ancien) => ({
      ...ancien,
      [reservation.id]: true,
    }));

    try {
      const res = await fetch(
        `${API}/reservations/${reservation.id}/validation-n2`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (!res.ok) {
        const message = await res.text().catch(() => "");
        throw new Error(message || `Erreur HTTP ${res.status}`);
      }

      toast.success("Validation niveau 2 enregistrée");
      await charger();
    } catch (error) {
      console.error("Erreur validation niveau 2 :", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "La validation niveau 2 n'a pas pu être enregistrée"
      );
    } finally {
      setValidationN2EnCours((ancien) => ({
        ...ancien,
        [reservation.id]: false,
      }));
    }
  };

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Le centre de notifications est géré par EnTete. La liste des tickets à
  // valider est rafraîchie séparément, sans recharger toute la page.
  useEffect(() => {
    let actif = true;
    let enCours = false;

    const actualiserTickets = async () => {
      if (enCours || document.visibilityState === "hidden" || !API) return;
      const token = getToken();
      if (!token) return;
      enCours = true;
      try {
        const tickets = await fetchListe<Reservation>(`${API}/reservations`, token);
        if (actif) setReservations(tickets);
      } catch (error) {
        // Ne pas masquer les informations déjà chargées si le réseau est coupé.
        console.warn("Actualisation des tickets en attente de validation N2 impossible", error);
      } finally {
        enCours = false;
      }
    };

    const intervalle = window.setInterval(() => { void actualiserTickets(); }, 15000);
    const retourPage = () => { void actualiserTickets(); };
    window.addEventListener("focus", retourPage);
    return () => {
      actif = false;
      window.clearInterval(intervalle);
      window.removeEventListener("focus", retourPage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API]);

  const disponibles = vehicules.filter((v) => v.statut === "DISPONIBLE").length;
  const tauxDisponibilite = vehicules.length > 0 ? Math.round((disponibles / vehicules.length) * 100) : 0;

  const reservationsAValiderN2 = reservations.filter(
    (r) => r.statut === "VALIDEE_N1"
  );

  const reservationsEnCours = reservations.filter((r) =>
    ["EN_ATTENTE", "VALIDEE_N1", "VALIDEE"].includes(r.statut)
  );

  const demandesUrgentes = reservations.filter((r) => r.demandeUrgente).length;

  const maintenancesActives = maintenances.filter((m) => m.statut !== "CLOTUREE");
  const entretiensEnCours = maintenances.filter((m) => m.statut === "EN_COURS").length;
  const entretiensEnAttenteAvis = maintenances.filter((m) => m.statut === "EN_ATTENTE_AVIS_DID").length;

  const consommationsMois = useMemo(
    () =>
      transactions.filter(
        (t) =>
          t.type === "CONSOMMATION" &&
          String(t.dateOperation || "").slice(0, 7) === moisSelection
      ),
    [transactions, moisSelection]
  );

  const totalConsommationMois = consommationsMois.reduce(
    (total, t) => total + Number(t.quantiteLitres || 0),
    0
  );

  const consommationParVehicule = Object.values(
    consommationsMois.reduce<Record<number, { vehicule: Vehicule; total: number }>>((acc, t) => {
      if (!t.vehicule) return acc;
      const id = t.vehicule.id;
      if (!acc[id]) acc[id] = { vehicule: t.vehicule, total: 0 };
      acc[id].total += Number(t.quantiteLitres || 0);
      return acc;
    }, {})
  ).sort((a, b) => b.total - a.total);

  const maintenancesClotureesMois = maintenances.filter(
    (m) =>
      m.statut === "CLOTUREE" &&
      m.dateCreation &&
      m.dateCloture &&
      String(m.dateCloture).slice(0, 7) === moisSelection
  );

  const delaiMoyenEntretien = (() => {
    if (maintenancesClotureesMois.length === 0) return null;

    const durees = maintenancesClotureesMois
      .map((m) => {
        const debut = new Date(String(m.dateCreation)).getTime();
        const fin = new Date(String(m.dateCloture)).getTime();
        if (!Number.isFinite(debut) || !Number.isFinite(fin) || fin < debut) return null;
        return (fin - debut) / (1000 * 60 * 60 * 24);
      })
      .filter((v): v is number => v !== null);

    if (durees.length === 0) return null;
    return durees.reduce((a, b) => a + b, 0) / durees.length;
  })();

  const assurancesJ15 = assurances.filter((a) => {
    const date = a.dateEcheance || a.dateFin;
    if (!date) return false;
    const jours = differenceJours(new Date(), new Date(date));
    return jours >= 0 && jours <= 15;
  }).length;

  const sinistresOuverts = sinistres.filter((s) => {
    const statut = String(s.statut || "").toUpperCase();
    return !["CLOTURE", "CLOTUREE", "CLOS", "RESOLU", "RESOLUE"].includes(statut);
  }).length;

  const maintenant = new Date();
  const ilYASemaine = new Date(maintenant.getTime() - 7 * 24 * 60 * 60 * 1000);

  const demandes7j = reservations.filter((r) => dateDansIntervalle(r.dateCreation, ilYASemaine, maintenant));
  const consommations7j = transactions.filter((t) => dateDansIntervalle(t.dateOperation, ilYASemaine, maintenant));
  const entretiens7j = maintenances.filter((m) => dateDansIntervalle(m.dateCreation, ilYASemaine, maintenant));
  const sinistres7j = sinistres.filter((s) => dateDansIntervalle(s.dateSinistre || s.date || "", ilYASemaine, maintenant));

  const exporterSynthese = () => {
    const lignes = [
      ["SYNTHÈSE HEBDOMADAIRE - CHEF DGAL", ""],
      ["Période", `${formaterDateCourte(ilYASemaine.toISOString())} au ${formaterDateCourte(maintenant.toISOString())}`],
      ["", ""],
      ["Indicateur", "Valeur"],
      ["Parc total", String(vehicules.length)],
      ["Véhicules disponibles", String(disponibles)],
      ["Taux de disponibilité", `${tauxDisponibilite}%`],
      ["Demandes créées sur 7 jours", String(demandes7j.length)],
      ["Demandes urgentes", String(demandesUrgentes)],
      ["Entretiens créés sur 7 jours", String(entretiens7j.length)],
      ["Entretiens actuellement actifs", String(maintenancesActives.length)],
      ["Consommation enregistrée sur 7 jours", `${formatNombre(consommations7j.filter((t) => t.type === "CONSOMMATION").reduce((s, t) => s + Number(t.quantiteLitres || 0), 0))} L`],
      ["Sinistres sur 7 jours", String(sinistres7j.length)],
      ["Sinistres ouverts", String(sinistresOuverts)],
    ];

    exporterCsv("synthese_hebdomadaire_chef_dgal", lignes);
    toast.success("Synthèse hebdomadaire exportée");
  };

  const preparerRapportDgal = (): RapportSpat => ({
    titre: "RAPPORT DE SUPERVISION DE LA FLOTTE",
    sousTitre: "Chef DGAL — Synthèse de pilotage et décisions de niveau 2",
    nomFichier: `spat_rapport_chef_dgal_${moisSelection}`,
    champsEntete: [
      { libelle: "Service", valeur: "Direction générale — Chef DGAL" },
      { libelle: "Mois de suivi du carburant", valeur: libelleMois(moisSelection) },
    ],
    indicateurs: [
      { libelle: "Parc total", valeur: vehicules.length },
      { libelle: "Véhicules disponibles", valeur: disponibles },
      { libelle: "Taux de disponibilité", valeur: `${tauxDisponibilite}%` },
      { libelle: "Consommation du mois", valeur: `${formatNombre(totalConsommationMois)} L` },
      { libelle: "Demandes à valider (N°2)", valeur: reservationsAValiderN2.length },
      { libelle: "Entretiens actifs", valeur: maintenancesActives.length },
      { libelle: "Délai moyen d'entretien du mois", valeur: delaiMoyenEntretien == null ? "—" : `${formatNombre(delaiMoyenEntretien)} j` },
      { libelle: "Assurances à échéance ≤ 15 jours", valeur: assurancesJ15 },
      { libelle: "Sinistres ouverts", valeur: sinistresOuverts },
    ],
    sections: [
      {
        titre: "Consommation mensuelle par véhicule",
        colonnes: ["Immatriculation", "Modèle", "Consommation (L)"],
        lignes: consommationParVehicule.map(({ vehicule, total }) => [
          vehicule.immatriculation, vehicule.modeleType || "—", formatNombre(total),
        ]),
      },
      {
        titre: "Tickets en attente de validation N°2",
        colonnes: ["Ticket", "Bénéficiaire", "Objet", "Véhicule", "Urgent", "Statut"],
        lignes: reservationsAValiderN2.map((r) => [
          `TKT-${String(r.id).padStart(5, "0")}`,
          [r.demandeurPrenom, r.demandeurNom].filter(Boolean).join(" ") || r.demandeur?.nomComplet || "—",
          r.motif, r.vehicule?.immatriculation || "—", r.demandeUrgente ? "Oui" : "Non", r.statut,
        ]),
      },
    ],
  });

  if (chargement) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#f3f4f6" }}>
        <EnTete afficherNotifications />
        <div style={{ padding: 32, textAlign: "center", color: "#6b7280" }}>
          Chargement de la vue consolidée...
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f3f4f6" }}>
      <EnTete afficherNotifications />

      <main style={{ padding: 32 }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={headerStyle}>
            <div>
              <h2 style={{ margin: 0, fontSize: 22, color: "#1e293b" }}>
                Chef DGAL — Supervision de la flotte
              </h2>
              
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <BoutonsRapportSpat preparerRapport={preparerRapportDgal} />
              <button onClick={exporterSynthese} style={boutonSecondaire}>
                <Download size={15} />
                Synthèse CSV
              </button>
              <button onClick={charger} style={boutonSecondaire}>
                <RefreshCw size={15} />
                Actualiser
              </button>
            </div>
          </div>

         

          <div style={kpiGridStyle}>
            <CarteKpi
              icone={<Truck size={18} />}
              label="Taux de disponibilité"
              valeur={`${tauxDisponibilite}%`}
              sousTexte={`${disponibles} / ${vehicules.length} véhicules disponibles`}
            />
            <CarteKpi
              icone={<Fuel size={18} />}
              label="Consommation du mois"
              valeur={`${formatNombre(totalConsommationMois)} L`}
              sousTexte={libelleMois(moisSelection)}
            />
            <CarteKpi
              icone={<Gauge size={18} />}
              label="Délai moyen entretien"
              valeur={delaiMoyenEntretien === null ? "—" : `${formatNombre(delaiMoyenEntretien)} j`}
              sousTexte="Entretiens clôturés du mois"
            />
            <CarteKpi
              icone={<Wrench size={18} />}
              label="Entretiens actifs"
              valeur={String(maintenancesActives.length)}
              sousTexte={`${entretiensEnCours} en cours · ${entretiensEnAttenteAvis} en attente DID`}
            />
            <CarteKpi
              icone={<ClipboardList size={18} />}
              label="À valider niveau 2"
              valeur={String(reservationsAValiderN2.length)}
              sousTexte={`${reservationsEnCours.length} demande(s) en suivi · ${demandesUrgentes} urgente(s)`}
            />
            <CarteKpi
              icone={<AlertTriangle size={18} />}
              label="Alertes assurance / sinistre"
              valeur={String(assurancesJ15 + sinistresOuverts)}
              sousTexte={`${assurancesJ15} échéance(s) J-15 · ${sinistresOuverts} sinistre(s) ouvert(s)`}
            />
          </div>

          <nav aria-label="Rubriques de supervision" style={{display: "flex", flexWrap: "wrap",
            gap: 10, padding: 12, border: "1px solid #e2e8f0", borderRadius: 12,
            background: "#ffffff", marginBottom: 22}}>
            {[
              {id: "dgal-validations", texte: `Tickets à valider (${reservationsAValiderN2.length})`, couleur: "#2563eb"},
              {id: "dgal-consultation", texte: "Liste des tickets", couleur: "#2563eb"},
              {id: "dgal-entretiens", texte: "Entretiens", couleur: "#16a34a"},
              {id: "dgal-assurances", texte: "Assurances et sinistres", couleur: "#dc2626"},
              {id: "dgal-synthese", texte: "Synthèse", couleur: "#2563eb"},
            ].map(rubrique => (
              <button key={rubrique.id} type="button"
                onClick={() => document.getElementById(rubrique.id)?.scrollIntoView({behavior: "smooth", block: "start"})}
                style={{...boutonSecondaire, borderColor: rubrique.couleur, color: "#ffffff",
                  background: rubrique.couleur, minHeight: 43,
                  boxShadow: "0 3px 9px rgba(15,23,42,.10)"}}>
                {rubrique.texte}
              </button>
            ))}
          </nav>

          <div style={sectionHeaderStyle}>
            <SectionTitre titre="Pilotage mensuel" />
            <input
              type="month"
              value={moisSelection}
              onChange={(e) => setMoisSelection(e.target.value)}
              style={{ ...inputStyle, width: 190 }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: 18, marginBottom: 30 }}>
            <div style={cardStyle}>
              <h4 style={cardTitleStyle}>Consommation par véhicule</h4>
              {consommationParVehicule.length === 0 ? (
                <TexteVide texte="Aucune consommation pour la période sélectionnée." />
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {consommationParVehicule.map(({ vehicule, total }) => (
                    <div key={vehicule.id} style={ligneSyntheseStyle}>
                      <span>{vehicule.immatriculation}</span>
                      <strong>{formatNombre(total)} L</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={cardStyle}>
              <h4 style={cardTitleStyle}>Entretien</h4>
              <div style={{ display: "grid", gap: 9 }}>
                <Info label="Actifs" value={String(maintenancesActives.length)} />
                <Info label="En attente d'avis DID" value={String(entretiensEnAttenteAvis)} />
                <Info label="En cours" value={String(entretiensEnCours)} />
                <Info
                  label="Délai moyen du mois"
                  value={delaiMoyenEntretien === null ? "Non calculable" : `${formatNombre(delaiMoyenEntretien)} jours`}
                />
              </div>
            </div>
          </div>

          <div id="dgal-validations" style={{scrollMarginTop: 85}}>
            <SectionTitre titre="Demandes de véhicule — 2eme validation" />
          </div>

          {reservationsAValiderN2.length === 0 ? (
            <BlocVide texte="Aucune demande en attente de 2eme validation." />
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                marginBottom: 26,
              }}
            >
              {reservationsAValiderN2
                .slice()
                .sort((a, b) =>
                  String(b.dateValidationN1 || b.dateCreation).localeCompare(
                    String(a.dateValidationN1 || a.dateCreation)
                  )
                )
                .map((r) => {
                  const validationEnCours = Boolean(validationN2EnCours[r.id]);

                  return (
                    <div key={r.id} style={cardStyle}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            <strong style={{ color: "#111827" }}>
                              {`Ticket TKT-${String(r.id).padStart(5, "0")}`}
                            </strong>
                            <BadgeStatut statut={r.statut} />
                            {r.demandeUrgente && (
                              <span style={urgentBadgeStyle}>Urgente</span>
                            )}
                          </div>

                          <div style={{ marginTop: 6, fontSize: 13, color: "#64748b" }}>
                            Bénéficiaire :{" "}
                            <strong style={{ color: "#334155" }}>
                              {nomBeneficiaire(r)}
                            </strong>
                          </div>
                        </div>

                        <span style={{ fontSize: 12, color: "#94a3b8" }}>
                          Validation N1 :{" "}
                          {r.dateValidationN1 ? formaterDate(r.dateValidationN1) : "—"}
                        </span>
                      </div>

                      <div style={validationGridStyle}>
                        <Info
                          label="Objet de la mission"
                          value={r.motif || "—"}
                        />
                        <Info
                          label="Destination"
                          value={r.destination || "—"}
                        />
                        <Info
                          label="Période"
                          value={`${formaterDate(r.dateDebut)} → ${formaterDate(r.dateFin)}`}
                        />
                        <Info
                          label="Type souhaité"
                          value={formaterTypeVehicule(r.typeVehiculeSouhaite)}
                        />
                        <Info
                          label="Véhicule affecté N1"
                          value={r.vehicule ? libelleVehicule(r.vehicule) : "—"}
                        />
                        <Info
                          label="Chauffeur affecté N1"
                          value={
                            r.chauffeur
                              ? nomChauffeur(r.chauffeur)
                              : r.besoinChauffeur
                                ? "—"
                                : "Non demandé"
                          }
                        />
                        <Info
                          label="Validation N1 par"
                          value={nomDemandeur(r.validationN1Par)}
                        />
                        <Info
                          label="Date validation N1"
                          value={
                            r.dateValidationN1
                              ? formaterDate(r.dateValidationN1)
                              : "—"
                          }
                        />
                      </div>

                      {r.demandeUrgente && (
                        <div style={urgenceDetailStyle}>
                          <strong>Motif d&apos;urgence :</strong>{" "}
                          {r.motifUrgence?.trim() || "—"}
                        </div>
                      )}

                      {r.observations?.trim() && (
                        <div style={observationStyle}>
                          <strong>Observations :</strong> {r.observations}
                        </div>
                      )}

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          marginTop: 14,
                          paddingTop: 12,
                          borderTop: "1px solid #f1f5f9",
                        }}
                      >
                        <button
                          type="button"
                          disabled={validationEnCours}
                          onClick={() => validerNiveau2(r)}
                          style={{
                            ...boutonValider,
                            opacity: validationEnCours ? 0.5 : 1,
                            cursor: validationEnCours ? "not-allowed" : "pointer",
                          }}
                        >
                          <CheckCircle2 size={15} />
                          {validationEnCours
                            ? "Validation..."
                            : "Valider niveau 2"}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          <div id="dgal-consultation" style={{scrollMarginTop: 85}}>
            <SectionTitre titre="Demandes de véhicule — consultation et traçabilité" />
          </div>

          {reservations.length === 0 ? (
            <BlocVide texte="Aucune demande de véhicule." />
          ) : (
            <div style={tableCardStyle}>
              <table style={{ ...tableStyle, minWidth: 1280 }}>
                <thead>
                  <tr style={theadRowStyle}>
                    <th style={thStyle}>Créée le</th>
                    <th style={thStyle}>Bénéficiaire</th>
                    <th style={thStyle}>Véhicule</th>
                    <th style={thStyle}>Chauffeur</th>
                    <th style={thStyle}>Période</th>
                    <th style={thStyle}>Urgence</th>
                    <th style={thStyle}>Validation N1</th>
                    <th style={thStyle}>Validation N2</th>
                    <th style={thStyle}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations
                    .slice()
                    .sort((a, b) =>
                      String(b.dateCreation).localeCompare(String(a.dateCreation))
                    )
                    .slice(0, 20)
                    .map((r) => (
                      <tr key={r.id} style={trStyle}>
                        <td style={tdStyle}>{formaterDate(r.dateCreation)}</td>

                        <td style={tdStyle}>
                          <strong>{nomBeneficiaire(r)}</strong>
                          {r.demandeurMatricule && (
                            <div style={{ marginTop: 3, fontSize: 11, color: "#94a3b8" }}>
                              {r.demandeurMatricule}
                            </div>
                          )}
                        </td>

                        <td style={tdStyle}>
                          {r.vehicule ? libelleVehicule(r.vehicule) : "—"}
                        </td>

                        <td style={tdStyle}>
                          {r.chauffeur
                            ? nomChauffeur(r.chauffeur)
                            : r.besoinChauffeur
                              ? "—"
                              : "Non demandé"}
                        </td>

                        <td style={tdStyle}>
                          {`${formaterDate(r.dateDebut)} → ${formaterDate(r.dateFin)}`}
                        </td>

                        <td style={tdStyle}>
                          {r.demandeUrgente ? (
                            <span style={urgentBadgeStyle}>Oui</span>
                          ) : (
                            "Non"
                          )}
                        </td>

                        <td style={tdStyle}>
                          {r.dateValidationN1 ? (
                            <>
                              <strong>{nomDemandeur(r.validationN1Par)}</strong>
                              <div style={{ marginTop: 3, fontSize: 11, color: "#94a3b8" }}>
                                {formaterDate(r.dateValidationN1)}
                              </div>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>

                        <td style={tdStyle}>
                          {r.dateValidationN2 ? (
                            <>
                              <strong>{nomDemandeur(r.validationN2Par)}</strong>
                              <div style={{ marginTop: 3, fontSize: 11, color: "#94a3b8" }}>
                                {formaterDate(r.dateValidationN2)}
                              </div>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>

                        <td style={tdStyle}>
                          <BadgeStatut statut={r.statut} />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          <div id="dgal-entretiens" style={{scrollMarginTop: 85}}>
            <SectionTitre titre="Entretiens — consultation du circuit DID" />
          </div>
          {maintenances.length === 0 ? (
            <BlocVide texte="Aucun entretien enregistré." />
          ) : (
            <div style={tableCardStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr style={theadRowStyle}>
                    <th style={thStyle}>Véhicule</th>
                    <th style={thStyle}>Intervention</th>
                    <th style={thStyle}>Avis DID</th>
                    <th style={thStyle}>Statut</th>
                    <th style={thStyle}>Création</th>
                    <th style={thStyle}>Clôture</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenances
                    .slice()
                    .sort((a, b) => String(b.dateCreation || "").localeCompare(String(a.dateCreation || "")))
                    .slice(0, 15)
                    .map((m) => (
                      <tr key={m.id} style={trStyle}>
                        <td style={tdStyle}>{m.vehicule?.immatriculation || "—"}</td>
                        <td style={tdStyle}>{m.natureIntervention}</td>
                        <td style={tdStyle}>{m.avisTexte?.trim() || "En attente"}</td>
                        <td style={tdStyle}><BadgeStatut statut={m.statut} /></td>
                        <td style={tdStyle}>{m.dateCreation ? formaterDate(m.dateCreation) : "—"}</td>
                        <td style={tdStyle}>{m.dateCloture ? formaterDate(m.dateCloture) : "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {(assurances.length > 0 || sinistres.length > 0) && (
            <>
              <div id="dgal-assurances" style={{scrollMarginTop: 85}}>
                <SectionTitre titre="Assurances et sinistres — consultation" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: 18, marginBottom: 30 }}>
                <div style={cardStyle}>
                  <h4 style={cardTitleStyle}>Assurances</h4>
                  {assurances.length === 0 ? (
                    <TexteVide texte="Aucune assurance disponible." />
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {assurances.slice(0, 10).map((a) => {
                        const date = a.dateEcheance || a.dateFin;
                        return (
                          <div key={a.id} style={ligneSyntheseStyle}>
                            <span>{a.vehicule?.immatriculation || "Véhicule —"}</span>
                            <span style={{ textAlign: "right" }}>
                              {date ? formaterDateCourte(date) : "Échéance —"}
                              {a.statut ? ` · ${a.statut}` : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div style={cardStyle}>
                  <h4 style={cardTitleStyle}>Sinistres</h4>
                  {sinistres.length === 0 ? (
                    <TexteVide texte="Aucun sinistre disponible." />
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {sinistres.slice(0, 10).map((s) => (
                        <div key={s.id} style={ligneSyntheseStyle}>
                          <span>{s.vehicule?.immatriculation || "Véhicule —"}</span>
                          <span style={{ textAlign: "right" }}>
                            {formaterDateCourte(s.dateSinistre || s.date || "")}
                            {s.statut ? ` · ${s.statut}` : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <div id="dgal-synthese" style={{scrollMarginTop: 85}}>
            <SectionTitre titre="Synthèse hebdomadaire pour le Chef du Département" />
          </div>
          <div style={cardStyle}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
              <Info label="Demandes créées sur 7 jours" value={String(demandes7j.length)} />
              <Info label="Entretiens créés sur 7 jours" value={String(entretiens7j.length)} />
              <Info
                label="Consommation sur 7 jours"
                value={`${formatNombre(
                  consommations7j
                    .filter((t) => t.type === "CONSOMMATION")
                    .reduce((s, t) => s + Number(t.quantiteLitres || 0), 0)
                )} L`}
              />
              <Info label="Sinistres sur 7 jours" value={String(sinistres7j.length)} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function CarteKpi({
  icone,
  label,
  valeur,
  sousTexte,
}: {
  icone: ReactNode;
  label: string;
  valeur: string;
  sousTexte?: string;
}) {
  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#475569", fontSize: 13 }}>
        {icone}
        {label}
      </div>
      <div style={{ marginTop: 8, fontSize: 25, fontWeight: 700, color: "#111827" }}>{valeur}</div>
      {sousTexte && <div style={{ marginTop: 3, fontSize: 12, color: "#94a3b8" }}>{sousTexte}</div>}
    </div>
  );
}

function SectionTitre({ titre }: { titre: string }) {
  return <h3 style={{ margin: "28px 0 12px", fontSize: 16, color: "#334155" }}>{titre}</h3>;
}

function BlocVide({ texte }: { texte: string }) {
  return <div style={{ ...cardStyle, marginBottom: 24, textAlign: "center", color: "#64748b", fontSize: 13 }}>{texte}</div>;
}

function TexteVide({ texte }: { texte: string }) {
  return <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{texte}</p>;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#f8fafc", borderRadius: 8, padding: 11 }}>
      <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: "#334155", fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function BadgeStatut({ statut }: { statut: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    DISPONIBLE: { bg: "#dcfce7", color: "#166534", label: "Disponible" },
    EN_MISSION: { bg: "#dbeafe", color: "#1d4ed8", label: "En mission" },
    EN_MAINTENANCE: { bg: "#fef3c7", color: "#92400e", label: "En maintenance" },
    INDISPONIBLE: { bg: "#fee2e2", color: "#991b1b", label: "Indisponible" },
    EN_ATTENTE: { bg: "#f1f5f9", color: "#475569", label: "En attente" },
    VALIDEE_N1: { bg: "#dbeafe", color: "#1e40af", label: "Validée N1" },
    VALIDEE: { bg: "#dcfce7", color: "#166534", label: "Validée N2" },
    REFUSEE: { bg: "#fee2e2", color: "#b91c1c", label: "Refusée" },
    EN_ATTENTE_AVIS_DID: { bg: "#fef3c7", color: "#92400e", label: "En attente d'avis DID" },
    PLANIFIEE: { bg: "#dbeafe", color: "#1e40af", label: "Planifiée" },
    EN_COURS: { bg: "#e0f2fe", color: "#0369a1", label: "En cours" },
    CLOTUREE: { bg: "#dcfce7", color: "#166534", label: "Clôturée" },
  };

  const item = map[statut] || {
    bg: "#f1f5f9",
    color: "#475569",
    label: statutMaintenanceLabel[statut] || statut || "—",
  };

  return (
    <span
      style={{
        display: "inline-flex",
        padding: "3px 9px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        background: item.bg,
        color: item.color,
      }}
    >
      {item.label}
    </span>
  );
}

function nomDemandeur(d?: Demandeur | null) {
  if (!d) return "—";
  if (d.nomComplet?.trim()) return d.nomComplet.trim();

  const nom = `${d.prenom || ""} ${d.nom || ""}`.trim();

  return (
    nom ||
    d.numMatricule ||
    d.matricule ||
    d.email ||
    "—"
  );
}

function nomBeneficiaire(r: Reservation) {
  const nom = `${r.demandeurPrenom || ""} ${r.demandeurNom || ""}`.trim();
  return nom || nomDemandeur(r.demandeur);
}

function nomChauffeur(chauffeur?: Chauffeur | null) {
  if (!chauffeur) return "—";

  const nom = `${chauffeur.prenom || ""} ${chauffeur.nom || ""}`.trim();

  if (nom && chauffeur.matricule) {
    return `${nom} — ${chauffeur.matricule}`;
  }

  return nom || chauffeur.matricule || `Chauffeur #${chauffeur.id}`;
}

function formaterTypeVehicule(type?: string | null) {
  if (!type) return "Aucun type particulier";

  const valeur = type.trim().toUpperCase();

  const map: Record<string, string> = {
    BERLINE: "Berline",
    "4X4": "4x4",
    UTILITAIRE: "Utilitaire",
    MINIBUS: "Minibus",
    AUTRE: "Autre",
  };

  return map[valeur] || type;
}

function libelleVehicule(vehicule?: Vehicule | null) {
  if (!vehicule) return "—";

  const details = [
    vehicule.modeleType?.trim(),
    vehicule.typeVehicule?.trim()
      ? formaterTypeVehicule(vehicule.typeVehicule)
      : null,
  ].filter(Boolean);

  return details.length > 0
    ? `${vehicule.immatriculation} — ${details.join(" — ")}`
    : vehicule.immatriculation;
}

function exporterCsv(nom: string, lignes: string[][]) {
  const contenu = lignes
    .map((ligne) => ligne.map((cellule) => `"${String(cellule).replace(/"/g, '""')}"`).join(";"))
    .join("\n");

  const blob = new Blob(["\uFEFF" + contenu], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = `${nom}_${new Date().toISOString().slice(0, 10)}.csv`;
  lien.click();
  URL.revokeObjectURL(url);
}

function dateDansIntervalle(date: string | null | undefined, debut: Date, fin: Date) {
  if (!date) return false;
  const valeur = new Date(date).getTime();
  return Number.isFinite(valeur) && valeur >= debut.getTime() && valeur <= fin.getTime();
}

function differenceJours(debut: Date, fin: Date) {
  const ms = fin.getTime() - debut.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function formaterDate(date: string) {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formaterDateCourte(date: string) {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function libelleMois(mois: string) {
  if (!mois) return "—";
  const [annee, numeroMois] = mois.split("-");
  const date = new Date(Number(annee), Number(numeroMois) - 1, 1);
  return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function formatNombre(nombre: number) {
  return Number(nombre || 0).toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  marginBottom: 18,
  flexWrap: "wrap",
};

const noticeStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
  background: "#eef2ff",
  border: "1px solid #c7d2fe",
  borderRadius: 10,
  padding: 14,
  color: "#3730a3",
  fontSize: 13,
  lineHeight: 1.5,
  marginBottom: 22,
};

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const kpiGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 14,
  marginBottom: 30,
};

const cardStyle: CSSProperties = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 16,
};

const cardTitleStyle: CSSProperties = {
  margin: "0 0 14px",
  fontSize: 15,
  color: "#111827",
};

const ligneSyntheseStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "9px 0",
  borderBottom: "1px solid #f1f5f9",
  fontSize: 13,
  color: "#475569",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontSize: 13,
  color: "#111827",
  background: "white",
  boxSizing: "border-box",
};

const validationGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
  marginTop: 14,
};

const urgenceDetailStyle: CSSProperties = {
  marginTop: 12,
  padding: 11,
  border: "1px solid #fed7aa",
  background: "#fff7ed",
  borderRadius: 8,
  color: "#9a3412",
  fontSize: 13,
  lineHeight: 1.5,
};

const observationStyle: CSSProperties = {
  marginTop: 10,
  padding: 11,
  background: "#f8fafc",
  borderRadius: 8,
  color: "#475569",
  fontSize: 13,
  lineHeight: 1.5,
};

const boutonValider: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  padding: "9px 13px",
  borderRadius: 8,
  border: "1px solid #16a34a",
  background: "#16a34a",
  color: "#ffffff",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const boutonSecondaire: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  padding: "9px 13px",
  borderRadius: 8,
  border: "1px solid #2563eb",
  background: "#2563eb",
  color: "#ffffff",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const urgentBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "3px 8px",
  borderRadius: 999,
  background: "#fee2e2",
  color: "#b91c1c",
  fontSize: 11,
  fontWeight: 700,
};

const tableCardStyle: CSSProperties = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  overflowX: "auto",
  marginBottom: 26,
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 760,
};

const theadRowStyle: CSSProperties = {
  background: "#ffffff",
  borderBottom: "1px solid #e2e8f0",
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "12px 14px",
  fontSize: 11,
  background: "#ffffff",
  color: "#334155",
  borderBottom: "1px solid #e2e8f0",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  fontWeight: 700,
};

const trStyle: CSSProperties = {
  borderBottom: "1px solid #f1f5f9",
};

const tdStyle: CSSProperties = {
  padding: "11px 14px",
  fontSize: 13,
  color: "#374151",
  verticalAlign: "top",
};
