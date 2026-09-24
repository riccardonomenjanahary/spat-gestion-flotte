"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

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
  Eye,
  Fuel,
  RefreshCw,
  Search,
  Send,
  Truck,
  Wrench,
  XCircle,
} from "lucide-react";

// =========================================================
// TYPES
// =========================================================

interface Vehicule {
  id: number;
  categorie?: string | null;
  immatriculation: string;
  modeleType?: string | null;
  typeVehicule?: string | null;
  annee?: number | null;
  affectation?: string | null;
  etatGeneralObservations?: string | null;
  statut: string;
  gpsEquipe?: boolean | null;
  gpsDeviceId?: number | null;
}

interface UtilisateurSimple {
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

// =========================================================
// RESERVATION
// =========================================================

interface Reservation {
  id: number;

  vehicule?: Vehicule | null;
  chauffeur?: Chauffeur | null;
  demandeur?: UtilisateurSimple | null;

  dateDebut: string;
  dateFin: string;

  motif: string;

  demandeUrgente: boolean;
  motifUrgence?: string | null;

  statut: string;
  dateCreation: string;

  demandeurNom?: string | null;
  demandeurPrenom?: string | null;
  demandeurMatricule?: string | null;
  demandeurEntite?: string | null;
  demandeurTelephone?: string | null;

  destination?: string | null;
  pointDepart?: string | null;
  nombrePassagers?: number | null;
  listePassagers?: string | null;

  typeVehiculeSouhaite?: string | null;
  besoinChauffeur?: boolean | null;

  observations?: string | null;

  motifRefus?: string | null;
  refusePar?: UtilisateurSimple | null;
  dateRefus?: string | null;

  validationN1Par?: UtilisateurSimple | null;
  dateValidationN1?: string | null;

  // Permet de savoir si l'avis DID a été demandé
  avisDIDDemande?: boolean | null;
}

// =========================================================
// VEHICULE DISPONIBLE
// =========================================================

interface VehiculeDisponible {
  id: number;
  immatriculation: string;
  categorie?: string | null;
  modeleType?: string | null;
  typeVehicule?: string | null;
  statut: string;
}

// Lecture du planning depuis le backend, pour la periode exacte du ticket.
interface EtatPlanningVehicule {
  id: number;
  immatriculation: string;
  etat: "DISPONIBLE" | "OCCUPE" | "INDISPONIBLE_TECHNIQUE";
  disponible: boolean;
  raison: string;
}

interface ChauffeurDisponible {
  id: number;
  matricule?: string | null;
  nom?: string | null;
  prenom?: string | null;
  telephone?: string | null;
  statut: string;
}

// =========================================================
// DISPONIBILITE
// =========================================================

interface DisponibiliteReservation {
  reservationId: number;

  typeSouhaite?: string | null;

  typeSouhaiteDisponible: boolean;

  message: string;

  chauffeurRequis: boolean;

  chauffeurDisponible: boolean;

  vehiculesCorrespondants: VehiculeDisponible[];

  suggestionsVehicules: VehiculeDisponible[];

  chauffeursDisponibles: ChauffeurDisponible[];
}

// Position courante : consultation seule, sans modifier le suivi GPS de l'Agent Flotte.
interface PositionGpsCarburant {
  vehiculeId: number;
  odometreKm?: number | null;
  dateGps?: string | null;
}

// =========================================================
// MAINTENANCE / AVIS DID
// =========================================================

interface Maintenance {
  id: string;

  vehicule?: Vehicule | null;

  reservationId?: number | null;

  reservation?: {
    id: number;
    vehicule?: Vehicule | null;
    chauffeur?: Chauffeur | null;
    dateDebut?: string | null;
    dateFin?: string | null;
    motif?: string | null;
    besoinChauffeur?: boolean | null;
    statut?: string | null;
  } | null;

  natureIntervention: string;

  origineDemande?: string | null;
  demandeurEntretien?: string | null;
  dateDecisionEntretien?: string | null;
  motifRefusEntretien?: string | null;
  compteRenduEntretien?: string | null;
  mecanicienEntretien?: string | null;

  statut: string;

  avisTexte?: string | null;
  avisDate?: string | null;
  avisAuteurEmail?: string | null;
  dateAvisdid?: string | null;
  dateAvisDID?: string | null;

  // Informations techniques retournées par le mécanicien DID
  diagnosticVisuel?: string | null;
  observationsMecanicien?: string | null;
  piecesNecessaires?: string | null;
  mecanicienEmail?: string | null;
  decisiondid?: string | null;
  decisionDID?: string | null;
  priorite?: string | null;
  prestataire?: string | null;
  dateIntervention?: string | null;

  dateCreation?: string | null;
  dateCloture?: string | null;
}

// =========================================================
// CARBURANT — CONSULTATION UNIQUEMENT
// =========================================================

interface TransactionCarburant {
  id: string;

  vehicule: Vehicule;

  type: "DOTATION" | "CONSOMMATION";

  quantiteLitres: number;
  kilometrage?: number | null;

  dateOperation: string;

  justificatif?: string | null;

  agentEmail?: string | null;
}


interface SuiviEntretienPeriodique {
  id?: number | null;
  vehicule?: Vehicule | null;
  kilometrageDernierEntretien?: number | null;
  prochaineEcheanceKm?: number | null;
  dernierKilometrageConnu?: number | null;
  kilometresRestants?: number | null;
  entretienPeriodiqueOuvert?: boolean | null;
  statut?: string | null;
  intervalleKm?: number | null;
  // Disponible lorsque le backend aura enregistré la date prévisionnelle.
  datePrevueEntretien?: string | null;
  dateEcheanceEntretien?: string | null;
}

interface Assurance {
  id: string | number;
  vehicule?: Vehicule | null;
  numeroPolice?: string | null;
  assureur?: string | null;
  dateExpiration?: string | null;
  dateEcheance?: string | null;
  dateFin?: string | null;
  statut?: string | null;
}

// Comparaison au jour civil : une échéance datée YYYY-MM-DD ne dépend pas
// du décalage horaire du navigateur ni de l'heure de consultation.
function joursAvantDate(date?: string | null): number | null {
  if (!date) return null;
  const valeurs = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!valeurs) return null;
  const annee = Number(valeurs[1]);
  const mois = Number(valeurs[2]);
  const jour = Number(valeurs[3]);
  const echeance = new Date(annee, mois - 1, jour);
  if (echeance.getFullYear() !== annee || echeance.getMonth() !== mois - 1 ||
      echeance.getDate() !== jour) return null;
  const actuel = new Date();
  const debutAujourdHuiUTC = Date.UTC(actuel.getFullYear(), actuel.getMonth(), actuel.getDate());
  const echeanceUTC = Date.UTC(annee, mois - 1, jour);
  return Math.round((echeanceUTC - debutAujourdHuiUTC) / 86_400_000);
}

function dateAssurance(a: Assurance): string | null {
  return a.dateExpiration || a.dateEcheance || a.dateFin || null;
}

function dateEntretienPrevue(s: SuiviEntretienPeriodique): string | null {
  return s.datePrevueEntretien || s.dateEcheanceEntretien || null;
}

// =========================================================
// DECISION
// =========================================================

type DecisionReservation =
  | "VALIDEE_N1"
  | "REFUSEE";

// =========================================================
// AFFECTATIONS DOCUMENTAIRES DES CHAUFFEURS
// =========================================================
// Correspondances de GROUPES issues des listes SPAT fournies.
// Ces documents ne précisent PAS un conducteur nominatif pour chaque
// immatriculation. Ne pas inventer de lien véhicule ↔ chauffeur individuel.
// Les autres véhicules conservent la liste complète des chauffeurs disponibles.

type GroupeChauffeurs = "DG" | "GARAGE" | "AMBULANCE";

const groupesVehiculesDocument: Record<string, GroupeChauffeurs> = {
  // Voitures affectées au DG SPAT
  "40560WWT": "DG",
  "33803WWT": "DG",
  "11881WWT": "DG",
  "3940TBU": "DG",
  // Voitures de service du garage
  "1205TCA": "GARAGE",
  "1218TCA": "GARAGE",
  "5174AH": "GARAGE",
  "5533AE": "GARAGE",
  "6742AJ": "GARAGE",
  "6743AJ": "GARAGE",
  "5334AJ": "GARAGE",
  // Ambulances, y compris celle stationnée au garage pour réparation
  "0040AH": "AMBULANCE",
  "17045WWT": "AMBULANCE",
};

const chauffeursDocument: Record<
  GroupeChauffeurs,
  ReadonlyArray<{ matricule: string; nom: string }>
> = {
  DG: [{ matricule: "2014007", nom: "EMMANUEL" }],
  AMBULANCE: [
    { matricule: "2014012", nom: "VELONJARA PARIZERA" },
    { matricule: "2024095", nom: "RAMANANTSOA FIDELE" },
  ],
  GARAGE: [
    { matricule: "2014011", nom: "RABE VENOR" },
    { matricule: "2014010", nom: "RANDRIANANTENAINA SABIN JOEL" },
    { matricule: "2014013", nom: "LEZOMA GERMAIN" },
    { matricule: "2021045", nom: "LERA" },
    { matricule: "2024103", nom: "RAZAFINDRAKATSO RICHARD" },
    { matricule: "2024106", nom: "RAZANAMAHAVONJY ESCANDE C" },
    { matricule: "2024089", nom: "LEDOA NATHANIEL RICCO" },
    { matricule: "2024109", nom: "ROMAIN" },
    { matricule: "2014009", nom: "YAMICOLE GIDICAEL" },
  ],
};

function normaliserAffectation(texte?: string | null): string {
  return (texte || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function groupePourVehicule(
  vehicule?: Vehicule | VehiculeDisponible | null
): GroupeChauffeurs | null {
  if (!vehicule) return null;
  return groupesVehiculesDocument[
    normaliserAffectation(vehicule.immatriculation)
  ] ?? null;
}

function chauffeursEligiblesPourVehicule(
  vehicule: Vehicule | VehiculeDisponible | null | undefined,
  chauffeursDisponibles: ChauffeurDisponible[]
): ChauffeurDisponible[] {
  const groupe = groupePourVehicule(vehicule);
  if (!groupe) return chauffeursDisponibles;

  const associes = chauffeursDocument[groupe];
  return chauffeursDisponibles.filter((chauffeur) => {
    const matricule = normaliserAffectation(chauffeur.matricule);
    const nom = normaliserAffectation(
      `${chauffeur.nom || ""} ${chauffeur.prenom || ""}`
    );
    const prenomNom = normaliserAffectation(
      `${chauffeur.prenom || ""} ${chauffeur.nom || ""}`
    );
    return associes.some((c) =>
      (matricule && matricule === normaliserAffectation(c.matricule)) ||
      (nom && nom === normaliserAffectation(c.nom)) ||
      (prenomNom && prenomNom === normaliserAffectation(c.nom))
    );
  });
}

// =========================================================
// PAGE
// =========================================================

export default function ChefServiceLogistiquePage() {
  return (
    <RoleGuard role={ROLES.CHEF_SERVICE_LOGISTIQUE}>
      <ChefServiceLogistiqueContent />
    </RoleGuard>
  );
}

// =========================================================
// CONTENU
// =========================================================

function ChefServiceLogistiqueContent() {
  const API = process.env.NEXT_PUBLIC_API_URL;

  // =======================================================
  // DONNEES
  // =======================================================

  const [vehicules, setVehicules] =
    useState<Vehicule[]>([]);

  const [reservations, setReservations] =
    useState<Reservation[]>([]);

  const [maintenances, setMaintenances] =
    useState<Maintenance[]>([]);

  const [transactions, setTransactions] =
    useState<TransactionCarburant[]>([]);

  const [positionsGpsCarburant, setPositionsGpsCarburant] =
    useState<PositionGpsCarburant[]>([]);
  const [erreurGpsCarburant, setErreurGpsCarburant] =
    useState<string | null>(null);

  const [chargement, setChargement] =
    useState(true);

  // =======================================================
  // DISPONIBILITES
  // =======================================================

  const [disponibilites, setDisponibilites] =
    useState<Record<number, DisponibiliteReservation>>({});

  const [planningVehicules, setPlanningVehicules] =
    useState<Record<number, EtatPlanningVehicule[]>>({});

  const [chargementDisponibilites, setChargementDisponibilites] =
    useState<Record<number, boolean>>({});

  const [erreursDisponibilites, setErreursDisponibilites] =
    useState<Record<number, string>>({});

  // =======================================================
  // VEHICULE AFFECTE
  // =======================================================

  const [vehiculeAffecte, setVehiculeAffecte] =
    useState<Record<number, string>>({});

  // =======================================================
  // CHAUFFEUR AFFECTE
  // =======================================================

  const [chauffeurAffecte, setChauffeurAffecte] =
    useState<Record<number, string>>({});

  // =======================================================
  // DECISIONS
  // =======================================================

  const [decisionsEnCours, setDecisionsEnCours] =
    useState<Record<number, boolean>>({});

  // =======================================================
  // DEMANDE AVIS DID
  // =======================================================

  const [avisDIDEnCours, setAvisDIDEnCours] =
    useState<Record<number, boolean>>({});

  // =======================================================
  // REFUS
  // =======================================================

  const [reservationARefuser, setReservationARefuser] =
    useState<Reservation | null>(null);

  const [motifRefusSaisi, setMotifRefusSaisi] =
    useState("");

  // =======================================================
  // FILTRES
  // =======================================================

  const [filtreVehicule, setFiltreVehicule] =
    useState("");

  const [filtreStatutReservation, setFiltreStatutReservation] =
    useState("EN_ATTENTE");

  // Interface : un seul ticket détaillé à la fois.
  const [ticketOuvertId, setTicketOuvertId] =
    useState<number | null>(null);

  // Reprise du contrôle DID pour un autre véhicule du même ticket.
  const [choixAlternatifOuvert, setChoixAlternatifOuvert] =
    useState<Record<number, boolean>>({});
  const [vehiculeAlternatif, setVehiculeAlternatif] =
    useState<Record<number, string>>({});
  const [chauffeurAlternatif, setChauffeurAlternatif] =
    useState<Record<number, string>>({});
  const [relanceDidEnCours, setRelanceDidEnCours] =
    useState<Record<number, boolean>>({});

  // Sous-vues accessibles depuis deux boutons dédiés, sans modifier les flux métier.
  const [panneauGestion, setPanneauGestion] = useState<"TICKETS" | "CARBURANT" | "ENTRETIEN" | "ASSURANCE">("TICKETS");
  const [demandeEntretienOuverte, setDemandeEntretienOuverte] = useState<string | null>(null);
  const [decisionEntretienEnCours, setDecisionEntretienEnCours] = useState<string | null>(null);
  const [motifsRefusEntretien, setMotifsRefusEntretien] = useState<Record<string, string>>({});
  const [actionEntretienEnCours, setActionEntretienEnCours] = useState<string | null>(null);
  const [assurances, setAssurances] = useState<Assurance[]>([]);
  const [erreurAssurances, setErreurAssurances] = useState<string | null>(null);

  // =======================================================
  // CARBURANT — CONSULTATION
  // =======================================================

  const [filtreCarburant, setFiltreCarburant] =
    useState("");

  // Consultation GPS facultative : n'empêche jamais le chargement du carburant.
  // Un refus 403 est affiché et ne déclenche aucune écriture serveur.
  useEffect(() => {
    if (panneauGestion !== "CARBURANT" || !API) return;
    const controleur = new AbortController();
    const token = getToken();
    if (!token) return;
    const lirePositions = async () => {
      try {
        const res = await fetch(`${API}/gps/positions`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          cache: "no-store",
          signal: controleur.signal,
        });
        if (!res.ok) throw new Error(`Accès aux positions GPS indisponible (HTTP ${res.status}).`);
        const data: unknown = await res.json();
        if (!Array.isArray(data)) throw new Error("Format de la réponse GPS invalide.");
        if (!controleur.signal.aborted) {
          setPositionsGpsCarburant(data as PositionGpsCarburant[]);
          setErreurGpsCarburant(null);
        }
      } catch (erreur) {
        if (!controleur.signal.aborted) {
          setPositionsGpsCarburant([]);
          setErreurGpsCarburant(erreur instanceof Error ? erreur.message : "Positions GPS indisponibles.");
        }
      }
    };
    void lirePositions();
    return () => controleur.abort();
  }, [API, panneauGestion]);

  const [suivisPeriodiques, setSuivisPeriodiques] =
    useState<SuiviEntretienPeriodique[]>([]);

  // =======================================================
  // TOKEN
  // =======================================================

  const getToken = () => {
    if (typeof window === "undefined") {
      return null;
    }

    return localStorage.getItem("token");
  };

  // =======================================================
  // CHARGEMENT GENERAL
  // =======================================================

  const charger = useCallback(async () => {
    const token = getToken();

    if (!API) {
      toast.error(
        "NEXT_PUBLIC_API_URL n'est pas configurée"
      );

      setChargement(false);
      return;
    }

    if (!token) {
      toast.error(
        "Session expirée. Veuillez vous reconnecter."
      );

      setChargement(false);
      return;
    }

    setChargement(true);

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      };

      const [
        vRes,
        rRes,
        mRes,
        cRes,
      ] = await Promise.all([
        fetch(`${API}/vehicules`, {
          headers,
          cache: "no-store",
        }),

        fetch(`${API}/reservations`, {
          headers,
          cache: "no-store",
        }),

        fetch(`${API}/maintenances`, {
          headers,
          cache: "no-store",
        }),

        fetch(`${API}/carburant`, {
          headers,
          cache: "no-store",
        }),
      ]);

      const erreurs = [
        ["véhicules", vRes],
        ["réservations", rRes],
        ["maintenances", mRes],
        ["carburant", cRes],
      ].filter(
        ([, response]) =>
          !(response as Response).ok
      ) as [string, Response][];

      if (erreurs.length > 0) {
        const detail = erreurs
          .map(
            ([nom, response]) =>
              `${nom}: ${response.status}`
          )
          .join(" | ");

        throw new Error(detail);
      }

      const [
        vehiculesData,
        reservationsData,
        maintenancesData,
        carburantData,
      ] = await Promise.all([
        vRes.json(),
        rRes.json(),
        mRes.json(),
        cRes.json(),
      ]);

      setVehicules(
        Array.isArray(vehiculesData)
          ? vehiculesData
          : []
      );

      setReservations(
        Array.isArray(reservationsData)
          ? reservationsData
          : []
      );

      setMaintenances(
        Array.isArray(maintenancesData)
          ? maintenancesData
          : []
      );

      setTransactions(
        Array.isArray(carburantData)
          ? carburantData
          : []
      );

      try {
        const suiviRes = await fetch(
          `${API}/entretien-periodique`,
          {
            headers,
            cache: "no-store",
          }
        );

        if (suiviRes.ok) {
          const suiviData = await suiviRes.json();

          setSuivisPeriodiques(
            Array.isArray(suiviData)
              ? suiviData
              : []
          );
        }
      } catch (errorSuivi) {
        console.warn(
          "Suivi entretien périodique indisponible :",
          errorSuivi
        );
      }

      // Les contrats d'assurance sont lus sans déclencher de notification
      // depuis le navigateur. Le job serveur J-7 sera ajouté côté backend.
      try {
        const assuranceRes = await fetch(`${API}/assurances`, {
          headers,
          cache: "no-store",
        });
        if (!assuranceRes.ok) {
          throw new Error(`HTTP ${assuranceRes.status}`);
        }
        const assuranceData: unknown = await assuranceRes.json();
        if (!Array.isArray(assuranceData)) {
          throw new Error("Réponse assurances invalide.");
        }
        setAssurances(assuranceData as Assurance[]);
        setErreurAssurances(null);
      } catch (errorAssurances) {
        setAssurances([]);
        setErreurAssurances(errorAssurances instanceof Error
          ? errorAssurances.message : "Impossible de charger les assurances.");
      }
    } catch (error) {
      console.error(
        "Erreur chargement Chef Service Logistique :",
        error
      );

      toast.error(
        "Impossible de charger les données du Service Logistique"
      );
    } finally {
      setChargement(false);
    }
  }, [API]);

  // =======================================================
  // CHARGEMENT INITIAL
  // =======================================================

  useEffect(() => {
    charger();
  }, [charger]);

  // =======================================================
  // DISPONIBILITES
  // =======================================================

  const chargerDisponibilites = useCallback(
    async (reservationId: number) => {
      if (!API) {
        return;
      }

      const token = getToken();

      if (!token) {
        return;
      }

      setChargementDisponibilites(
        (ancien) => ({
          ...ancien,
          [reservationId]: true,
        })
      );

      setErreursDisponibilites(
        (ancien) => {
          const copie = { ...ancien };

          delete copie[reservationId];

          return copie;
        }
      );

      try {
        const res = await fetch(
          `${API}/reservations/${reservationId}/disponibilites`,
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${token}`,

              Accept:
                "application/json",
            },

            cache: "no-store",
          }
        );

        if (!res.ok) {
          const message =
            await res.text().catch(() => "");

          throw new Error(
            message ||
              `Erreur HTTP ${res.status}`
          );
        }

        const data =
          (await res.json()) as
            DisponibiliteReservation;

        setDisponibilites(
          (ancien) => ({
            ...ancien,
            [reservationId]: data,
          })
        );

        // Ce GET facultatif precise POURQUOI chaque vehicule n'est
        // pas proposable. En cas d'erreur, la liste actuelle continue
        // de fonctionner sans attribuer une fausse cause d'indisponibilite.
        try {
          const planningRes = await fetch(
            `${API}/reservations/${reservationId}/planning-vehicules`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
              },
              cache: "no-store",
            }
          );
          if (!planningRes.ok) {
            throw new Error(`Planning HTTP ${planningRes.status}`);
          }
          const planningData: unknown = await planningRes.json();
          if (!Array.isArray(planningData)) {
            throw new Error("Format du planning invalide");
          }
          setPlanningVehicules((ancien) => ({
            ...ancien,
            [reservationId]: planningData as EtatPlanningVehicule[],
          }));
        } catch (erreurPlanning) {
          console.warn("Planning detaille indisponible :", erreurPlanning);
          setPlanningVehicules((ancien) => {
            const copie = { ...ancien };
            delete copie[reservationId];
            return copie;
          });
        }



        // -------------------------------------------------
        // REVALIDATION VEHICULE
        // -------------------------------------------------

        setVehiculeAffecte(
          (ancien) => {
            const selection =
              ancien[reservationId];

            if (!selection) {
              return ancien;
            }

            const ids = [
              ...(data.vehiculesCorrespondants ||
                []),
              ...(data.suggestionsVehicules ||
                []),
            ].map((v) => String(v.id));

            if (ids.includes(selection)) {
              return ancien;
            }

            const copie = { ...ancien };

            delete copie[reservationId];

            return copie;
          }
        );

        // -------------------------------------------------
        // REVALIDATION CHAUFFEUR
        // -------------------------------------------------

        setChauffeurAffecte(
          (ancien) => {
            const selection =
              ancien[reservationId];

            if (!selection) {
              return ancien;
            }

            const ids = (
              data.chauffeursDisponibles ||
              []
            ).map((c) => String(c.id));

            if (ids.includes(selection)) {
              return ancien;
            }

            const copie = { ...ancien };

            delete copie[reservationId];

            return copie;
          }
        );
      } catch (error) {
        console.error(
          `Erreur disponibilité ${reservationId}:`,
          error
        );

        setErreursDisponibilites(
          (ancien) => ({
            ...ancien,

            [reservationId]:
              error instanceof Error
                ? error.message
                : "Impossible de vérifier les disponibilités",
          })
        );
      } finally {
        setChargementDisponibilites(
          (ancien) => ({
            ...ancien,
            [reservationId]: false,
          })
        );
      }
    },
    [API]
  );

  // =======================================================
  // VERIFICATION AUTOMATIQUE DES DEMANDES
  // =======================================================

  useEffect(() => {
    reservations
      .filter((r) =>
        [
          "EN_ATTENTE",
          "EN_ATTENTE_AVIS_DID",
        ].includes(r.statut)
      )
      .forEach((r) => {
        if (
          !disponibilites[r.id] &&
          !chargementDisponibilites[r.id]
        ) {
          chargerDisponibilites(r.id);
        }
      });
  }, [
    reservations,
    disponibilites,
    chargementDisponibilites,
    chargerDisponibilites,
  ]);

  // =======================================================
  // TROUVER AVIS DID D'UNE RESERVATION
  // =======================================================

  // Plusieurs contrôles peuvent appartenir au MÊME ticket.
  // Le contrôle le plus récent fait foi ; les anciens restent dans l'historique.
  const controlesPourReservation = (reservationId: number) =>
    maintenances
      .filter((m) =>
        (m.reservationId ?? m.reservation?.id) === reservationId &&
        String(m.natureIntervention || "").toLowerCase()
          .includes("contrôle visuel avant mission")
      )
      .sort((a, b) =>
        String(b.dateCreation || "").localeCompare(String(a.dateCreation || "")) ||
        String(b.id).localeCompare(String(a.id))
      );

  const maintenancePourReservation = (reservationId: number) =>
    controlesPourReservation(reservationId)[0] ?? null;

  // =======================================================
  // AVIS DID
  // =======================================================

  const maintenanceAvisRecu = (
    maintenance?: Maintenance | null
  ) => {
    if (!maintenance) {
      return false;
    }

    return Boolean(
      maintenance.avisTexte?.trim() ||
        maintenance.diagnosticVisuel?.trim() ||
        maintenance.observationsMecanicien?.trim() ||
        maintenance.piecesNecessaires?.trim() ||
        maintenance.decisiondid?.trim() ||
        maintenance.decisionDID?.trim() ||
        maintenance.avisDate ||
        maintenance.dateAvisdid ||
        maintenance.dateAvisDID ||
        maintenance.statut ===
          "EN_ATTENTE_VALIDATION_N1"
    );
  };

  // L'avis technique est rattache au ticket via maintenance.reservation.id.
  // Un avis defavorable ne doit jamais etre interprete comme favorable
  // au seul motif que ses champs ont ete remplis.
  const avisDIDDefavorable = (maintenance?: Maintenance | null) => {
    if (!maintenance) return false;
    const decision = String(
      maintenance.decisionDID || maintenance.decisiondid || ""
    ).trim().toUpperCase();
    return decision === "DEFAVORABLE" || decision === "DÉFAVORABLE" ||
      maintenance.statut === "AVIS_DEFAVORABLE_DID";
  };

  const avisDIDFavorable = (maintenance?: Maintenance | null) => {
    if (!maintenance || avisDIDDefavorable(maintenance)) return false;
    const decision = String(
      maintenance.decisionDID || maintenance.decisiondid || ""
    ).trim().toUpperCase();
    // Compatibilite avec les anciens dossiers ou la decision est absente.
    return decision === "FAVORABLE" ||
      maintenance.statut === "EN_ATTENTE_VALIDATION_N1";
  };

  const avisDIDPourReservation = (
    reservationId: number
  ) => {
    const maintenance =
      maintenancePourReservation(
        reservationId
      );

    if (!maintenanceAvisRecu(maintenance)) {
      return "";
    }

    return (
      maintenance?.avisTexte?.trim() ||
      maintenance?.observationsMecanicien?.trim() ||
      maintenance?.diagnosticVisuel?.trim() ||
      maintenance?.decisionDID?.trim() ||
      maintenance?.decisiondid?.trim() ||
      "Avis DID reçu"
    );
  };

  // Le bouton d'ouverture du choix n'émet aucune notification : l'envoi a
  // lieu seulement après validation du véhicule et du chauffeur de remplacement.
  const relancerControleDID = async (r: Reservation) => {
    const nouveauVehicule = Number(vehiculeAlternatif[r.id]);
    const dispo = disponibilites[r.id];

    if (!API || !getToken()) {
      toast.error("Session expirée ou API indisponible.");
      return;
    }
    const vehiculesLibres = [
      ...(dispo?.vehiculesCorrespondants ?? []),
      ...(dispo?.suggestionsVehicules ?? []),
    ];
    if (!Number.isInteger(nouveauVehicule) || nouveauVehicule === r.vehicule?.id ||
        !vehiculesLibres.some((v) => v.id === nouveauVehicule)) {
      toast.error("Choisissez un autre véhicule disponible pour les dates du ticket.");
      return;
    }
    setRelanceDidEnCours((ancien) => ({ ...ancien, [r.id]: true }));
    try {
      const res = await fetch(`${API}/reservations/${r.id}/relancer-avis-did`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          vehiculeId: nouveauVehicule,
        }),
      });
      if (!res.ok) {
        throw new Error((await res.text().catch(() => "")) ||
          `Impossible de relancer l'avis DID (HTTP ${res.status}).`);
      }
      setChoixAlternatifOuvert((ancien) => ({ ...ancien, [r.id]: false }));
      setVehiculeAlternatif((ancien) => ({ ...ancien, [r.id]: "" }));
      setChauffeurAlternatif((ancien) => ({ ...ancien, [r.id]: "" }));
      // Les anciennes disponibilités et sélections ne doivent plus être utilisées.
      setDisponibilites((ancien) => {
        const suivant = { ...ancien };
        delete suivant[r.id];
        return suivant;
      });
      setVehiculeAffecte((ancien) => ({ ...ancien, [r.id]: "" }));
      setChauffeurAffecte((ancien) => ({ ...ancien, [r.id]: "" }));
      toast.success("Nouveau véhicule soumis au DID pour ce ticket.");
      await charger();
    } catch (erreur) {
      toast.error(erreur instanceof Error ? erreur.message :
        "Impossible de relancer le contrôle DID.");
      await chargerDisponibilites(r.id);
    } finally {
      setRelanceDidEnCours((ancien) => ({ ...ancien, [r.id]: false }));
    }
  };

  // =======================================================
  // DEMANDER AVIS DID
  // =======================================================

  const demanderAvisDID = async (
  reservation: Reservation
) => {
  if (!API) {
    toast.error(
      "NEXT_PUBLIC_API_URL n'est pas configurée."
    );

    return;
  }

  const token = getToken();

  if (!token) {
    toast.error(
      "Session expirée. Veuillez vous reconnecter."
    );

    return;
  }

  // =====================================================
  // 1. VERIFIER LA DISPONIBILITE
  // =====================================================

  const dispo =
    disponibilites[
      reservation.id
    ];

  if (!dispo) {
    toast.error(
      "Veuillez attendre la vérification des disponibilités."
    );

    return;
  }

  // =====================================================
  // 2. RECUPERER LE VEHICULE SELECTIONNE
  // =====================================================

  const vehiculeSelectionne =
    vehiculeAffecte[
      reservation.id
    ];

  console.log(
    "DEBUG DEMANDE AVIS DID",
    {
      reservationId:
        reservation.id,

      vehiculeSelectionne,

      vehiculeAffecte,

      dispo,
    }
  );

  // =====================================================
  // 3. VERIFIER LE VEHICULE
  // =====================================================

  if (
    vehiculeSelectionne ===
      undefined ||
    vehiculeSelectionne ===
      null ||
    String(
      vehiculeSelectionne
    ).trim() === ""
  ) {
    toast.error(
      "Le véhicule sélectionné n'a pas été enregistré. Veuillez le sélectionner à nouveau."
    );

    return;
  }

  const vehiculeId =
    Number(
      vehiculeSelectionne
    );

  if (
    !Number.isInteger(
      vehiculeId
    ) ||
    vehiculeId <= 0
  ) {
    toast.error(
      "L'identifiant du véhicule sélectionné est invalide."
    );

    return;
  }

  // =====================================================
  // 4. VERIFIER QUE LE VEHICULE EST BIEN DANS
  //    LES VEHICULES DISPONIBLES
  // =====================================================

  const vehiculesDisponibles = [
    ...(
      dispo.vehiculesCorrespondants ||
      []
    ),

    ...(
      dispo.suggestionsVehicules ||
      []
    ),
  ];

  const vehiculeEstDisponible =
    vehiculesDisponibles.some(
      (vehicule) =>
        Number(
          vehicule.id
        ) === vehiculeId
    );

  if (
    !vehiculeEstDisponible
  ) {
    toast.error(
      "Le véhicule sélectionné n'est plus disponible. Veuillez actualiser les disponibilités."
    );

    await chargerDisponibilites(
      reservation.id
    );

    return;
  }

  // Le backend choisit et enregistre le chauffeur compatible à la confirmation.

  // =====================================================
  // 6. ENVOI DE LA DEMANDE AU BACKEND
  // =====================================================

  try {
    console.log(
      "ENVOI AVIS DID →",
      {
        reservationId:
          reservation.id,

        vehiculeId,

      }
    );

    const res =
      await fetch(
        `${API}/reservations/${reservation.id}/demande-avis-entretien`,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,

            Accept:
              "application/json",
          },

          body:
            JSON.stringify({
              vehiculeId:
                vehiculeId,

            }),
        }
      );

    // ===================================================
    // 7. TRAITER LA REPONSE
    // ===================================================

    if (!res.ok) {
      const message =
        await res
          .text()
          .catch(
            () => ""
          );

      console.error(
        "REPONSE BACKEND DEMANDE AVIS DID",
        {
          status:
            res.status,

          message,
        }
      );

      if (
        res.status ===
        409
      ) {
        await chargerDisponibilites(
          reservation.id
        );
      }

      throw new Error(
        message ||
          `Erreur HTTP ${res.status}`
      );
    }

    // ===================================================
    // 8. SUCCES
    // ===================================================

    toast.success(
      "Demande d'avis envoyée au mécanicien DID."
    );

    // ===================================================
    // 9. NETTOYER LES SELECTIONS LOCALES
    // ===================================================

    setVehiculeAffecte(
      (ancien) => {
        const copie = {
          ...ancien,
        };

        delete copie[
          reservation.id
        ];

        return copie;
      }
    );

    setChauffeurAffecte(
      (ancien) => {
        const copie = {
          ...ancien,
        };

        delete copie[
          reservation.id
        ];

        return copie;
      }
    );

    setDisponibilites(
      (ancien) => {
        const copie = {
          ...ancien,
        };

        delete copie[
          reservation.id
        ];

        return copie;
      }
    );

    // ===================================================
    // 10. RECHARGER LES DONNEES
    // ===================================================

    await charger();

  } catch (
    error
  ) {
    console.error(
      "Erreur demande avis DID :",
      error
    );

    toast.error(
      error instanceof Error
        ? error.message
        : "Impossible d'envoyer la demande d'avis au mécanicien DID."
    );
  }
};

  // =======================================================
  // REFUS
  // =======================================================

  const ouvrirRefus = (
    reservation: Reservation
  ) => {
    setReservationARefuser(
      reservation
    );

    setMotifRefusSaisi("");
  };

  const fermerRefus = () => {
    setReservationARefuser(null);
    setMotifRefusSaisi("");
  };

  // =======================================================
  // DECISION RESERVATION
  // =======================================================

  const decisionReservation =
    async (
      reservation: Reservation,
      statut: DecisionReservation,
      motifRefus?: string
    ) => {
      console.log(
        "1ERE VALIDATION / DECISION RESERVATION",
        {
          reservationId: reservation.id,
          statutDemande: statut,
          besoinChauffeur: reservation.besoinChauffeur,
          vehiculeReservation: reservation.vehicule?.id ?? null,
          chauffeurReservation: reservation.chauffeur?.id ?? null,
          vehiculeLocal: vehiculeAffecte[reservation.id] ?? null,
          chauffeurLocal: chauffeurAffecte[reservation.id] ?? null,
          disponibilite: disponibilites[reservation.id] ?? null,
        }
      );

      if (!API) {
        return;
      }

      const token = getToken();

      if (!token) {
        toast.error(
          "Session expirée. Veuillez vous reconnecter."
        );

        return;
      }

      // ===================================================
      // VALIDATION N1
      // ===================================================

      let vehiculeIdDecision: number | null = null;

      if (
        statut ===
        "VALIDEE_N1"
      ) {
        // -------------------------------------------------
        // RG-01
        // -------------------------------------------------

        if (
          reservation.demandeUrgente &&
          !reservation.motifUrgence?.trim()
        ) {
          toast.error(
            "Une demande urgente doit obligatoirement comporter un motif d'urgence."
          );

          return;
        }

        // -------------------------------------------------
        // DISPONIBILITE
        // -------------------------------------------------

        const dispo =
          disponibilites[
            reservation.id
          ];

        if (!dispo) {
          toast.error(
            "La disponibilité doit être vérifiée avant la validation."
          );

          return;
        }

        // -------------------------------------------------
        // VEHICULE
        // -------------------------------------------------

        const vehiculeSelectionne =
          vehiculeAffecte[
            reservation.id
          ] ||
          (reservation.vehicule?.id
            ? String(reservation.vehicule.id)
            : "");

        if (!vehiculeSelectionne) {
          toast.error(
            "Veuillez sélectionner un véhicule."
          );

          return;
        }

        const vehiculesDisponibles = [
          ...(dispo.vehiculesCorrespondants ||
            []),
          ...(dispo.suggestionsVehicules ||
            []),
        ];

        const vehiculeValide =
          vehiculesDisponibles.some(
            (v) =>
              String(v.id) ===
              vehiculeSelectionne
          );

        if (!vehiculeValide) {
          toast.error(
            "Le véhicule n'est plus disponible pour cette période. Actualisation en cours."
          );

          await chargerDisponibilites(
            reservation.id
          );

          return;
        }

        vehiculeIdDecision = Number(
          vehiculeSelectionne
        );

        // Le backend conserve ou réaffecte automatiquement un chauffeur compatible.

        // -------------------------------------------------
        // AVIS DID OBLIGATOIRE
        // -------------------------------------------------

        const maintenanceDID =
          maintenancePourReservation(
            reservation.id
          );

        if (!maintenanceAvisRecu(maintenanceDID)) {
          toast.error(
            "Validation N°1 impossible : l'avis du mécanicien DID n'a pas encore été reçu."
          );

          return;
        }
        if (avisDIDDefavorable(maintenanceDID) || !avisDIDFavorable(maintenanceDID)) {
          toast.error("Validation N°1 impossible : un avis DID favorable est requis pour le véhicule actuel.");
          return;
        }
        if (maintenanceDID?.vehicule?.id !== vehiculeIdDecision) {
          toast.error("Le véhicule sélectionné doit être celui qui a reçu l'avis DID favorable.");
          return;
        }
      }

      // ===================================================
      // REFUS
      // ===================================================

      if (
        statut ===
        "REFUSEE"
      ) {
        if (!motifRefus?.trim()) {
          toast.error(
            "Le motif du refus est obligatoire."
          );

          return;
        }
      }

      setDecisionsEnCours(
        (ancien) => ({
          ...ancien,
          [reservation.id]:
            true,
        })
      );

      try {
        const res = await fetch(
  `${API}/reservations/${reservation.id}/decision`,
  {
    method: "PUT",

    headers: {
      "Content-Type": "application/json",

      Authorization:
        `Bearer ${token}`,

      Accept:
        "application/json",
    },

    body: JSON.stringify({
      statut,

      vehiculeId:
        statut === "VALIDEE_N1"
          ? vehiculeIdDecision
          : null,

      motifRefus:
        statut === "REFUSEE"
          ? motifRefus
          : null,
    }),
  }
);

        if (!res.ok) {
          const message =
            await res.text().catch(
              () => ""
            );

          if (
            res.status === 409
          ) {
            await chargerDisponibilites(
              reservation.id
            );
          }

          throw new Error(
            message ||
              `Erreur HTTP ${res.status}`
          );
        }

        if (
          statut ===
          "VALIDEE_N1"
        ) {
          toast.success(
            "Validation N°1 enregistrée. La demande est maintenant transmise au Chef DGAL."
          );
        } else {
          toast.success(
            "Demande refusée."
          );
        }

        setVehiculeAffecte(
          (ancien) => {
            const copie = {
              ...ancien,
            };

            delete copie[
              reservation.id
            ];

            return copie;
          }
        );

        setChauffeurAffecte(
          (ancien) => {
            const copie = {
              ...ancien,
            };

            delete copie[
              reservation.id
            ];

            return copie;
          }
        );

        setDisponibilites(
          (ancien) => {
            const copie = {
              ...ancien,
            };

            delete copie[
              reservation.id
            ];

            return copie;
          }
        );

        if (
          statut ===
          "REFUSEE"
        ) {
          fermerRefus();
        }

        await charger();
      } catch (error) {
        console.error(
          "Erreur décision réservation :",
          error
        );

        toast.error(
          error instanceof Error
            ? error.message
            : "La décision n'a pas pu être enregistrée."
        );
      } finally {
        setDecisionsEnCours(
          (ancien) => ({
            ...ancien,

            [reservation.id]:
              false,
          })
        );
      }
    };

  // =======================================================
  // CONFIRMER REFUS
  // =======================================================

  const confirmerRefus = async () => {
    if (!reservationARefuser) {
      return;
    }

    if (
      !motifRefusSaisi.trim()
    ) {
      toast.error(
        "Le motif du refus est obligatoire."
      );

      return;
    }

    await decisionReservation(
      reservationARefuser,
      "REFUSEE",
      motifRefusSaisi
    );
  };

  // =======================================================
  // FILTRE RESERVATIONS
  // =======================================================

  const reservationsFiltrees =
    useMemo(() => {
      return reservations.filter(
        (r) => {
          const statutOk =
            filtreStatutReservation === "TOUS" ||
            (filtreStatutReservation === "EN_ATTENTE" &&
              ["EN_ATTENTE", "EN_ATTENTE_AVIS_DID"].includes(r.statut)) ||
            r.statut === filtreStatutReservation;

          const recherche =
            filtreVehicule
              .trim()
              .toLowerCase();

          const rechercheOk =
            !recherche ||
            r.vehicule?.immatriculation
              ?.toLowerCase()
              .includes(
                recherche
              ) ||
            nomBeneficiaire(r)
              .toLowerCase()
              .includes(
                recherche
              ) ||
            (
              r.demandeurMatricule ||
              ""
            )
              .toLowerCase()
              .includes(
                recherche
              ) ||
            (
              r.destination ||
              ""
            )
              .toLowerCase()
              .includes(
                recherche
              ) ||
            (
              r.typeVehiculeSouhaite ||
              ""
            )
              .toLowerCase()
              .includes(
                recherche
              );

          return (
            statutOk &&
            rechercheOk
          );
        }
      );
    }, [
      reservations,
      filtreStatutReservation,
      filtreVehicule,
    ]);

  // =======================================================
  // MAINTENANCES
  // =======================================================

  const maintenancesAvisRecus =
    maintenances.filter((m) =>
      maintenanceAvisRecu(m)
    );

  // Uniquement les signalements des chauffeurs et les entretiens périodiques.
  // Les avis techniques DID liés aux tickets restent consultables dans les tickets,
  // sans être affichés une seconde fois comme demandes d'entretien.
  const estEntretienPeriodique = (m: Maintenance): boolean =>
    String(m.natureIntervention ?? "").toUpperCase().includes("[PERIODIQUE_5000]") ||
    ["PERIODIQUE", "ENTRETIEN_PERIODIQUE"].includes(
      String(m.origineDemande ?? "").trim().toUpperCase()
    );

  const demandesEntretien = maintenances
    .filter((m) => m.origineDemande === "CHAUFFEUR" || estEntretienPeriodique(m))
    .sort((a, b) => String(b.dateCreation ?? "").localeCompare(String(a.dateCreation ?? "")));

  // Le suivi kilométrique peut signaler un entretien périodique avant même
  // qu'un dossier de maintenance soit ouvert : il est affiché en consultation.
  const suivisPeriodiquesASurveiller = suivisPeriodiques.filter((s) => {
    const jours = joursAvantDate(dateEntretienPrevue(s));
    const procheDate = jours != null && jours <= 7;
    const procheKm = s.kilometresRestants != null && s.kilometresRestants <= 500;
    return ["BIENTOT", "A_FAIRE", "ENTRETIEN_OUVERT"].includes(
      String(s.statut ?? "").trim().toUpperCase()
    ) || procheDate || procheKm || s.entretienPeriodiqueOuvert === true;
  });

  // Une seule police courante par véhicule : on retient la date d'échéance
  // la plus récente pour éviter d'alerter sur une ancienne police renouvelée.
  const assurancesCourantes = new Map<number, Assurance>();
  for (const assurance of assurances) {
    const id = assurance.vehicule?.id;
    const echeance = dateAssurance(assurance);
    if (id == null || !echeance || joursAvantDate(echeance) == null) continue;
    const precedente = assurancesCourantes.get(id);
    if (!precedente || echeance.slice(0, 10) > (dateAssurance(precedente) ?? "").slice(0, 10)) {
      assurancesCourantes.set(id, assurance);
    }
  }
  const assurancesAEcheance = [...assurancesCourantes.values()]
    .filter((a) => {
      const jours = joursAvantDate(dateAssurance(a));
      return jours != null && jours <= 7;
    })
    .sort((a, b) => (dateAssurance(a) ?? "").localeCompare(dateAssurance(b) ?? ""));

  // Chef : la décision est possible uniquement pour une demande d'entretien.
  const deciderEntretien = async (m: Maintenance, approuvee: boolean) => {
    const token = getToken();
    if (!token || !API || decisionEntretienEnCours) return;
    const motifRefus = (motifsRefusEntretien[m.id] ?? "").trim();
    if (!approuvee && !motifRefus) {
      toast.error("Indiquez le motif du refus.");
      return;
    }
    setDecisionEntretienEnCours(m.id);
    try {
      const res = await fetch(`${API}/maintenances/${m.id}/decision-entretien`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ approuvee, motifRefus: approuvee ? null : motifRefus }),
      });
      if (!res.ok) throw new Error(await res.text() || `Erreur HTTP ${res.status}`);
      toast.success(approuvee
        ? "Demande validée et transmise au mécanicien DID."
        : "Demande d'entretien refusée.");
      setDemandeEntretienOuverte(null);
      await charger();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Décision impossible.");
    } finally {
      setDecisionEntretienEnCours(null);
    }
  };

  // Transmission des dossiers périodiques créés automatiquement au seuil 5 000 km.
  // Le backend doit exposer cette route et enregistrer la notification au DID.
  const transmettrePeriodiqueAuDid = async (m: Maintenance) => {
    if (!API || !getToken() || actionEntretienEnCours) return;
    setActionEntretienEnCours(m.id);
    try {
      const res = await fetch(`${API}/maintenances/${m.id}/transmettre-periodique`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${getToken()}`, Accept: "application/json" },
      });
      if (!res.ok) {
        if (res.status === 404 || res.status === 405) {
          throw new Error("La transmission des entretiens périodiques doit encore être activée dans le backend.");
        }
        throw new Error((await res.text().catch(() => "")) || `Erreur HTTP ${res.status}`);
      }
      toast.success("Entretien périodique transmis au mécanicien DID.");
      await charger();
    } catch (erreur) {
      toast.error(erreur instanceof Error ? erreur.message : "Transmission impossible.");
    } finally {
      setActionEntretienEnCours(null);
    }
  };

  // La confirmation du mécanicien (ENTRETIEN_TERMINE) ne clôture pas le dossier.
  // Seul le Chef du Service Logistique demande la clôture, contrôlée en backend.
  const cloturerEntretien = async (m: Maintenance) => {
    if (!API || !getToken() || actionEntretienEnCours || m.statut !== "ENTRETIEN_TERMINE" ||
        !m.compteRenduEntretien?.trim()) return;
    setActionEntretienEnCours(m.id);
    try {
      const res = await fetch(`${API}/maintenances/${m.id}/cloturer-entretien`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${getToken()}`, Accept: "application/json" },
      });
      if (!res.ok) {
        if (res.status === 404 || res.status === 405) {
          throw new Error("La clôture par le Chef du Service Logistique doit encore être activée dans le backend.");
        }
        throw new Error((await res.text().catch(() => "")) || `Erreur HTTP ${res.status}`);
      }
      toast.success("Dossier d'entretien clôturé.");
      await charger();
    } catch (erreur) {
      toast.error(erreur instanceof Error ? erreur.message : "Clôture impossible.");
    } finally {
      setActionEntretienEnCours(null);
    }
  };

  // =======================================================
  // KPI
  // =======================================================

  const disponibles =
    vehicules.filter(
      (v) =>
        v.statut ===
        "DISPONIBLE"
    ).length;

  const tauxDisponibilite =
    vehicules.length > 0
      ? Math.round(
          (disponibles /
            vehicules.length) *
            100
        )
      : 0;

  const reservationsEnAttente =
    reservations.filter(
      (r) =>
        r.statut ===
        "EN_ATTENTE"
    );

  const reservationsUrgentes =
    reservationsEnAttente.filter(
      (r) =>
        r.demandeUrgente
    ).length;

  // =======================================================
  // CARBURANT CONSULTATION
  // =======================================================

  const moisCourant =
    new Date()
      .toISOString()
      .slice(0, 7);

  const consommationsMois =
    transactions.filter(
      (t) =>
        t.type ===
          "CONSOMMATION" &&
        String(
          t.dateOperation
        ).slice(0, 7) ===
          moisCourant
    );

  const totalConsommationMois =
    consommationsMois.reduce(
      (total, t) =>
        total +
        Number(
          t.quantiteLitres ||
            0
        ),
      0
    );

  const transactionsCarburantFiltrees =
    transactions.filter(
      (t) => {
        const recherche =
          filtreCarburant
            .trim()
            .toLowerCase();

        if (!recherche) {
          return true;
        }

        return (
          t.vehicule?.immatriculation
            ?.toLowerCase()
            .includes(
              recherche
            ) ||
          t.type
            .toLowerCase()
            .includes(
              recherche
            ) ||
          (
            t.justificatif ||
            ""
          )
            .toLowerCase()
            .includes(
              recherche
            )
        );
      }
    );

  // =======================================================
  // EXPORT CSV
  // =======================================================

  const exporterCsv = (
    nom: string,
    lignes: string[][]
  ) => {
    const contenu =
      lignes
        .map(
          (ligne) =>
            ligne
              .map(
                (cellule) =>
                  `"${String(
                    cellule
                  ).replace(
                    /"/g,
                    '""'
                  )}"`
              )
              .join(";")
        )
        .join("\n");

    const blob =
      new Blob(
        [
          "\uFEFF" +
            contenu,
        ],
        {
          type:
            "text/csv;charset=utf-8;",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const lien =
      document.createElement(
        "a"
      );

    lien.href = url;

    lien.download =
      `${nom}_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

    lien.click();

    URL.revokeObjectURL(
      url
    );
  };

  // =======================================================
  // EXPORT RESERVATIONS
  // =======================================================

  const exporterReservations =
    () => {
      exporterCsv(
        "demandes_vehicules",
        [
          [
            "ID",
            "Bénéficiaire",
            "Matricule",
            "Entité",
            "Téléphone",
            "Point de départ",
            "Destination",
            "Début",
            "Fin",
            "Motif",
            "Passagers",
            "Type véhicule souhaité",
            "Chauffeur demandé",
            "Véhicule affecté",
            "Chauffeur affecté",
            "Urgente",
            "Motif urgence",
            "Statut",
            "Motif refus",
            "Validation N1 par",
            "Date validation N1",
            "Avis DID",
          ],

          ...reservationsFiltrees.map(
            (r) => [
              String(r.id),

              nomBeneficiaire(r),

              r.demandeurMatricule ||
                "—",

              r.demandeurEntite ||
                "—",

              r.demandeurTelephone ||
                "—",

              r.pointDepart ||
                "—",

              r.destination ||
                "—",

              formaterDate(
                r.dateDebut
              ),

              formaterDate(
                r.dateFin
              ),

              r.motif ||
                "",

              String(
                r.nombrePassagers ??
                  ""
              ),

              r.typeVehiculeSouhaite ||
                "—",

              r.besoinChauffeur
                ? "Oui"
                : "Non",

              r.vehicule
                ?.immatriculation ||
                "Non affecté",

              r.chauffeur
                ? nomChauffeur(
                    r.chauffeur
                  )
                : "Non affecté",

              r.demandeUrgente
                ? "Oui"
                : "Non",

              r.motifUrgence ||
                "",

              r.statut,

              r.motifRefus ||
                "",

              nomUtilisateur(
                r.validationN1Par
              ),

              r.dateValidationN1
                ? formaterDate(
                    r.dateValidationN1
                  )
                : "",

              avisDIDPourReservation(
                r.id
              ) ||
                "En attente",
            ]
          ),
        ]
      );

      toast.success(
        "Export des demandes généré."
      );
    };

  // =======================================================
  // EXPORT CARBURANT
  // =======================================================

  const exporterCarburant =
    () => {
      exporterCsv(
        "consultation_carburant",
        [
          [
            "Véhicule",
            "Type",
            "Quantité (L)",
            "Date",
            "Justificatif",
          ],

          ...transactionsCarburantFiltrees.map(
            (t) => [
              t.vehicule
                ?.immatriculation ||
                "—",

              t.type ===
              "DOTATION"
                ? "Dotation"
                : "Consommation",

              String(
                t.quantiteLitres
              ),

              formaterDateCourte(
                t.dateOperation
              ),

              t.justificatif ||
                "",
            ]
          ),
        ]
      );

      toast.success(
        "Export de la consultation carburant généré."
      );
    };

  // Les données sont celles déjà consultables dans cet espace : aucun nouvel appel API.
  const preparerRapportCarburant = (): RapportSpat => ({
    titre: "ÉTAT DES OPÉRATIONS DE CARBURANT",
    sousTitre: "Consultation des dotations et consommations",
    nomFichier: "spat_carburant_chef_logistique",
    orientation: "landscape",
    champsEntete: [
      { libelle: "Service", valeur: "Service Logistique" },
      { libelle: "Filtre de recherche", valeur: filtreCarburant.trim() || "Tous les véhicules" },
    ],
    indicateurs: [
      { libelle: "Opérations affichées", valeur: transactionsCarburantFiltrees.length },
      { libelle: "Consommation du mois", valeur: `${formatNombre(totalConsommationMois)} L` },
    ],
    sections: [{
      titre: "Opérations de carburant (selon le filtre appliqué)",
      colonnes: ["Date", "Véhicule", "Type", "Quantité (L)", "Justificatif"],
      lignes: transactionsCarburantFiltrees.slice()
        .sort((a, b) => String(b.dateOperation).localeCompare(String(a.dateOperation)))
        .map((t) => [
          formaterDateCourte(t.dateOperation), t.vehicule?.immatriculation || "—",
          t.type === "DOTATION" ? "Dotation" : "Consommation",
          formatNombre(t.quantiteLitres), t.justificatif || "—",
        ]),
    }],
  });

  const preparerRapportEntretiensRecus = (): RapportSpat => ({
    titre: "ENTRETIENS CHAUFFEURS ET PÉRIODIQUES",
    sousTitre: "Signalements des chauffeurs et échéances d'entretien périodique",
    nomFichier: "spat_demandes_entretien_recues",
    orientation: "landscape",
    champsEntete: [{ libelle: "Service", valeur: "Service Logistique" }],
    indicateurs: [
      { libelle: "Demandes reçues", valeur: demandesEntretien.length },
      { libelle: "À valider", valeur: demandesEntretien.filter((m) => m.statut === "EN_ATTENTE_VALIDATION_ENTRETIEN").length },
      { libelle: "Échéances périodiques à surveiller", valeur: suivisPeriodiquesASurveiller.length },
    ],
    sections: [{
      titre: "Signalements chauffeur et dossiers périodiques",
      colonnes: ["Référence", "Date", "Véhicule", "Demandeur", "Origine", "Intervention demandée", "État", "Motif de refus"],
      lignes: demandesEntretien.map((m) => {
        const ticketId = m.reservationId ?? m.reservation?.id;
        return [
          ticketId == null ? `Entretien ${m.id}` : `TKT-${String(ticketId).padStart(5, "0")}`,
          m.dateCreation ? formaterDate(m.dateCreation) : "—",
          m.vehicule?.immatriculation || "—", m.demandeurEntretien || "—",
          estEntretienPeriodique(m) ? "Entretien périodique" : "Chauffeur",
          m.natureIntervention, m.statut, m.motifRefusEntretien || "—",
        ];
      }),
    }, {
      titre: "Suivi kilométrique des entretiens périodiques à surveiller",
      colonnes: ["Véhicule", "Dernier kilométrage", "Dernier entretien", "Prochaine échéance", "Km restants", "État"],
      lignes: suivisPeriodiquesASurveiller.map((s) => [
        s.vehicule?.immatriculation || "—",
        s.dernierKilometrageConnu != null ? `${formatNombre(s.dernierKilometrageConnu)} km` : "—",
        s.kilometrageDernierEntretien != null ? `${formatNombre(s.kilometrageDernierEntretien)} km` : "—",
        s.prochaineEcheanceKm != null ? `${formatNombre(s.prochaineEcheanceKm)} km` : "—",
        s.kilometresRestants != null ? `${formatNombre(s.kilometresRestants)} km` : "—",
        s.statut || "—",
      ]),
    }],
  });

  const preparerRapportTickets = (): RapportSpat => ({
    titre: "TICKETS REÇUS DU CHEF DE DIRECTION",
    sousTitre: "Demandes de véhicules selon les filtres appliqués",
    nomFichier: "spat_tickets_chef_logistique",
    orientation: "landscape",
    champsEntete: [
      { libelle: "Service", valeur: "Service Logistique" },
      { libelle: "Statut sélectionné", valeur: filtreStatutReservation },
      { libelle: "Recherche", valeur: filtreVehicule.trim() || "Toutes les demandes" },
    ],
    indicateurs: [{ libelle: "Tickets affichés", valeur: reservationsFiltrees.length }],
    sections: [{
      titre: "Tickets reçus",
      colonnes: ["Ticket", "Créé le", "Bénéficiaire", "Objet", "Destination", "Véhicule", "Statut"],
      lignes: reservationsFiltrees.map((r) => [
        `TKT-${String(r.id).padStart(5, "0")}`, formaterDate(r.dateCreation),
        nomBeneficiaire(r), r.motif, r.destination || "—", r.vehicule?.immatriculation || "—", r.statut,
      ]),
    }],
  });

  // =======================================================
  // CHARGEMENT
  // =======================================================

  if (chargement) {
    return (
      <div
        style={{
          minHeight:
            "100vh",

          backgroundColor:
            "#f3f4f6",
        }}
      >
        <EnTete />

        <div
          style={{
            padding: 32,
            textAlign: "center",
            color: "#6b7280",
          }}
        >
          Chargement...
        </div>
      </div>
    );
  }

  // =======================================================
  // RENDU
  // =======================================================

  return (
    <div
      style={{
        minHeight:
          "100vh",

        backgroundColor:
          "#f3f4f6",
      }}
    >
      <EnTete />

      <style>{`
        .spat-ticket-details-neutre div,
        .spat-ticket-details-neutre span {
          background-color: #ffffff !important;
          background-image: none !important;
          color: #334155 !important;
          border-color: #e2e8f0 !important;
        }
        .spat-ticket-details-neutre button span {
          background-color: transparent !important;
          color: inherit !important;
          border-color: transparent !important;
        }
        .spat-ticket-details-neutre svg:not(button svg) {
          color: #334155 !important;
        }
      `}</style>
      <div
        style={{
          padding: 32,
        }}
      >
        <div
          style={{
            maxWidth:
              1180,

            margin:
              "0 auto",
          }}
        >
          {/* =================================================
              HEADER
          ================================================= */}

          <div
            style={
              headerStyle
            }
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 22,
                  color: "#1e293b",
                }}
              >
                Chef du Service Logistique
              </h2>

              
            </div>

            <button
              type="button"
              onClick={charger}
              style={
                boutonSecondaire
              }
            >
              <RefreshCw
                size={15}
              />

              Actualiser
            </button>
          </div>

          {/* =================================================
              KPI
          ================================================= */}

          <div
            style={
              kpiGridStyle
            }
          >
            <CarteKpi
              icone={
                <Truck
                  size={18}
                />
              }
              label="Disponibilité flotte"
              valeur={`${tauxDisponibilite}%`}
              sousTexte={`${disponibles} / ${vehicules.length} véhicules disponibles`}
            />

            <CarteKpi
              icone={
                <ClipboardList
                  size={18}
                />
              }
              label="Demandes à traiter"
              valeur={String(
                reservationsEnAttente.length
              )}
              sousTexte={`${reservationsUrgentes} urgente${
                reservationsUrgentes >
                1
                  ? "s"
                  : ""
              }`}
            />

            <CarteKpi
              icone={
                <Wrench
                  size={18}
                />
              }
              label="Avis DID reçus"
              valeur={String(
                maintenancesAvisRecus.length
              )}
              sousTexte="Prêts pour validation N°1"
            />

            <CarteKpi
              icone={
                <Fuel
                  size={18}
                />
              }
              label="Carburant — consultation"
              valeur={`${formatNombre(
                totalConsommationMois
              )} L`}
              sousTexte="Consommation du mois"
            />
          </div>

          {/* Navigation exclusive : les tickets, le carburant, les entretiens et l'assurance
              disposent chacun de leur propre espace de lecture. */}
          <nav aria-label="Rubriques du Service Logistique" style={navigationModulesStyle}>
            <button
              type="button"
              aria-pressed={panneauGestion === "TICKETS"}
              onClick={() => setPanneauGestion("TICKETS")}
              style={styleOnglet(panneauGestion === "TICKETS", "BLEU")}
            >
              <ClipboardList size={17} />
              Liste des tickets ({reservations.length})
            </button>
            <button
              type="button"
              aria-pressed={panneauGestion === "CARBURANT"}
              onClick={() => setPanneauGestion("CARBURANT")}
              style={styleOnglet(panneauGestion === "CARBURANT", "BLEU")}
            >
              <Fuel size={17} />
              Carburant (consultation)
            </button>
            <button
              type="button"
              aria-pressed={panneauGestion === "ENTRETIEN"}
              onClick={() => setPanneauGestion("ENTRETIEN")}
              style={styleOnglet(panneauGestion === "ENTRETIEN", "VERT")}
            >
              <Wrench size={17} />
              Entretiens ({demandesEntretien.filter(m => m.statut === "EN_ATTENTE_VALIDATION_ENTRETIEN").length + suivisPeriodiquesASurveiller.filter(s => s.statut === "A_FAIRE").length} à traiter)
            </button>
            <button
              type="button"
              aria-pressed={panneauGestion === "ASSURANCE"}
              onClick={() => setPanneauGestion("ASSURANCE")}
              style={styleOnglet(panneauGestion === "ASSURANCE", "ROUGE")}
            >
              <AlertTriangle size={17} />
              Assurances à échéance ({assurancesAEcheance.length})
            </button>
          </nav>

          {panneauGestion === "ASSURANCE" && (
            <section style={{ ...cardStyle, marginBottom: 25 }}>
              <h3 style={{ margin: "0 0 9px", color: "#111827" }}>Assurances — échéances dans 7 jours ou dépassées</h3>
              
              {erreurAssurances ? (
                <p role="alert" style={{ color: "#991b1b" }}>Assurances indisponibles : {erreurAssurances}</p>
              ) : assurancesAEcheance.length === 0 ? (
                <p style={{ color: "#64748b" }}>Aucune assurance à échéance dans les 7 jours, ni expirée, parmi les contrats renseignés.</p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {assurancesAEcheance.map((a) => {
                    const jours = joursAvantDate(dateAssurance(a));
                    return (
                      <div key={a.vehicule?.id ?? a.id} style={{ border: "1px solid #f59e0b", borderRadius: 9, padding: 13, color: "#111827" }}>
                        <strong>{a.vehicule?.immatriculation ?? "Véhicule non renseigné"}</strong>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 7, fontSize: 13 }}>
                          <span>Police : {a.numeroPolice || "—"}</span>
                          <span>Assureur : {a.assureur || "—"}</span>
                          <span>Échéance : {dateAssurance(a)?.slice(0, 10) ?? "—"}</span>
                          <strong>{jours == null ? "Date invalide" : jours < 0 ? `Expirée depuis ${-jours} jour(s)` : jours === 0 ? "Expire aujourd'hui" : `Expire dans ${jours} jour(s)`}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {panneauGestion === "ENTRETIEN" && (
            <div>
          {/* Entretien : uniquement signalements chauffeur et entretiens périodiques. */}
          <section style={{marginBottom: 26}}>
            <div style={{ ...sectionHeaderStyle, marginTop: 0, padding: "13px 16px", borderRadius: 10, background: "#ffffff" }}>
              <h3 style={{ margin: 0, color: "#1e293b", fontSize: 16 }}>
                Entretiens demandés par les chauffeurs et entretiens périodiques ({demandesEntretien.filter(m => m.statut === "EN_ATTENTE_VALIDATION_ENTRETIEN").length} dossier(s) en attente)
              </h3>
              <BoutonsRapportSpat preparerRapport={preparerRapportEntretiensRecus} />
            </div>
            <div style={{ ...cardStyle, marginTop: 14, marginBottom: 18 }}>
              <h4 style={{ margin: "0 0 10px", color: "#111827", fontSize: 15 }}>
                Suivi des entretiens périodiques (kilométrage)
              </h4>
              {suivisPeriodiquesASurveiller.length === 0 ? (
                <p style={{ color: "#64748b", margin: 0 }}>
                  Aucune échéance périodique à surveiller actuellement.
                </p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {suivisPeriodiquesASurveiller.map((s, index) => (
                    <div
                      key={`${s.vehicule?.id ?? "sans-vehicule"}-${s.id ?? index}`}
                      style={{ border: "1px solid #e2e8f0", borderRadius: 9, padding: 12, color: "#111827" }}
                    >
                      <strong>{s.vehicule?.immatriculation || "Véhicule non renseigné"}</strong>
                      <div style={{ marginTop: 5, fontSize: 13, display: "flex", flexWrap: "wrap", gap: 12 }}>
                        <span>État : {s.statut === "A_FAIRE" ? "Entretien à effectuer" : s.statut === "BIENTOT" ? "Échéance proche" : s.statut === "ENTRETIEN_OUVERT" ? "Dossier déjà ouvert" : s.statut || "—"}</span>
                        <span>Dernier kilométrage : {s.dernierKilometrageConnu != null ? `${formatNombre(s.dernierKilometrageConnu)} km` : "—"}</span>
                        <span>Dernier entretien : {s.kilometrageDernierEntretien != null ? `${formatNombre(s.kilometrageDernierEntretien)} km` : "—"}</span>
                        <span>Prochaine échéance : {s.prochaineEcheanceKm != null ? `${formatNombre(s.prochaineEcheanceKm)} km` : "—"}</span>
                        <span>Km restants : {s.kilometresRestants != null ? `${formatNombre(s.kilometresRestants)} km` : "—"}</span>
                        <span>Date prévue : {dateEntretienPrevue(s)?.slice(0, 10) || "Non renseignée"}</span>
                        {joursAvantDate(dateEntretienPrevue(s)) != null && joursAvantDate(dateEntretienPrevue(s))! <= 7 && (
                          <strong style={{ color: "#92400e" }}>
                            {joursAvantDate(dateEntretienPrevue(s))! < 0 ? "Date dépassée" : `Alerte date J−${joursAvantDate(dateEntretienPrevue(s))}`}
                          </strong>
                        )}
                      </div>
                      <p style={{ color: "#64748b", fontSize: 12, margin: "7px 0 0" }}>
                        {dateEntretienPrevue(s)
                          ? "Échéance de date : rappel affiché à partir de J−7. La notification automatique est à réaliser côté serveur."
                          : "Aucune date prévue enregistrée : le rappel J−7 attend ce renseignement côté serveur ; la surveillance kilométrique reste active."}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {demandesEntretien.length === 0 ? (
              <BlocVide texte="Aucun signalement chauffeur ou dossier d'entretien périodique." />
            ) : (
              <div style={{display: "grid", gap: 10}}>
                {demandesEntretien.map(m => {
                  const ouvert = demandeEntretienOuverte === m.id;
                  const ticketId = m.reservationId ?? m.reservation?.id;
                  return (
                    <div key={m.id} style={{backgroundColor: "white", border: "1px solid #d1d5db", borderRadius: 10, padding: 15}}>
                      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap"}}>
                        <div style={{display: "grid", gap: 4, color: "#111827"}}>
                          <strong>{ticketId != null ? `TKT-${String(ticketId).padStart(5,"0")}` : `Entretien ${m.vehicule?.immatriculation ?? ""}`}</strong>
                          <span>Véhicule : {m.vehicule?.immatriculation ?? "—"} · Provenance : {estEntretienPeriodique(m) ? "Entretien périodique" : "Chauffeur"}</span>
                          <span>État : {m.statut === "EN_ATTENTE_VALIDATION_ENTRETIEN" ? "En attente de validation" : m.statut === "ENTRETIEN_AUTORISE" ? "Demande validée — entretien à effectuer" : m.statut === "ENTRETIEN_TERMINE" ? "Travail terminé par le mécanicien — clôture du chef requise" : m.statut === "CLOTUREE" ? "Dossier clôturé" : m.statut === "REFUSEE" ? "Demande refusée" : m.statut}</span>
                        </div>
                        <button type="button" style={{...boutonSecondaire, backgroundColor: COULEURS_BOUTONS.BLEU, color: "white", border: "none"}}
                          onClick={() => setDemandeEntretienOuverte(ouvert ? null : m.id)}>
                          {ouvert ? "Fermer" : "Détails"}
                        </button>
                      </div>
                      {ouvert && (
                        <div style={{marginTop: 14, display: "grid", gap: 10, color: "#111827"}}>
                          <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 9}}>
                            {[ ["Demandeur", m.demandeurEntretien ?? "—"], ["Origine", estEntretienPeriodique(m) ? "Entretien périodique" : "Chauffeur"], ["Ticket", ticketId != null ? `TKT-${String(ticketId).padStart(5,"0")}` : "Sans ticket"], ["Véhicule", m.vehicule?.immatriculation ?? "—"], ["Demande créée", m.dateCreation ? formaterDate(m.dateCreation) : "—"] ].map(([label,value]) =>
                              <div key={label} style={{border: "1px solid #e5e7eb", borderRadius: 8, padding: 10}}><div style={{fontSize: 11, color: "#475569"}}>{label}</div><strong>{value}</strong></div>
                            )}
                          </div>
                          <div style={{border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, whiteSpace: "pre-wrap"}}><strong>Entretien demandé</strong><div>{m.natureIntervention}</div></div>
                          {m.motifRefusEntretien && <div>Motif du refus : {m.motifRefusEntretien}</div>}
                          {m.compteRenduEntretien && <div style={{border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, whiteSpace: "pre-wrap"}}><strong>Retour du mécanicien — entretien terminé</strong><div>{m.compteRenduEntretien}</div><div>Mécanicien : {m.mecanicienEntretien ?? "—"}</div>{m.dateCloture && <div>Le {formaterDate(m.dateCloture)}</div>}</div>}
                          {estEntretienPeriodique(m) &&
                            ["EN_ATTENTE_AVIS_DID", "A_FAIRE"].includes(m.statut) && (
                            <div style={{ display: "grid", gap: 7 }}>
                              <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>
                                Dossier automatique des 5 000 km : à transmettre au mécanicien DID.
                              </p>
                              <button type="button" disabled={actionEntretienEnCours !== null}
                                style={{ ...boutonSecondaire, backgroundColor: COULEURS_BOUTONS.BLEU, color: "white", border: "none", width: "fit-content" }}
                                onClick={() => transmettrePeriodiqueAuDid(m)}>
                                <Send size={15} /> {actionEntretienEnCours === m.id ? "Transmission..." : "Transmettre au mécanicien DID"}
                              </button>
                            </div>
                          )}
                          {m.statut === "ENTRETIEN_TERMINE" && (
                            <div style={{ display: "grid", gap: 8 }}>
                              <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>
                                Le mécanicien a déclaré le travail terminé. Vérifiez le compte rendu puis clôturez ce dossier.
                              </p>
                              <button type="button"
                                disabled={actionEntretienEnCours !== null || !m.compteRenduEntretien?.trim()}
                                style={{ ...boutonSecondaire, backgroundColor: COULEURS_BOUTONS.VERT, color: "white", border: "none", width: "fit-content" }}
                                onClick={() => cloturerEntretien(m)}>
                                <CheckCircle2 size={15} /> {actionEntretienEnCours === m.id ? "Clôture..." : "Clôturer le dossier"}
                              </button>
                            </div>
                          )}
                          {m.statut === "EN_ATTENTE_VALIDATION_ENTRETIEN" && (
                            <div style={{display: "grid", gap: 8}}>
                              <label htmlFor={`motif-entretien-${m.id}`}>Motif du refus (uniquement si refus)</label>
                              <textarea id={`motif-entretien-${m.id}`} style={{...inputStyle, minHeight: 55}}
                                value={motifsRefusEntretien[m.id] ?? ""}
                                onChange={e => setMotifsRefusEntretien(prev => ({...prev, [m.id]: e.target.value}))} />
                              <div style={{display: "flex", flexWrap: "wrap", gap: 8}}>
                                <button type="button" disabled={decisionEntretienEnCours !== null}
                                  style={{...boutonSecondaire, backgroundColor: COULEURS_BOUTONS.VERT, color: "white", border: "none"}}
                                  onClick={() => deciderEntretien(m, true)}>Valider la demande d'entretien</button>
                                <button type="button" disabled={decisionEntretienEnCours !== null}
                                  style={{...boutonSecondaire, backgroundColor: COULEURS_BOUTONS.ROUGE, color: "white", border: "none"}}
                                  onClick={() => deciderEntretien(m, false)}>Refuser</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

            </div>
          )}
          {panneauGestion === "CARBURANT" && (
            <div>
          {/* =================================================
              CARBURANT — CONSULTATION UNIQUEMENT
          ================================================= */}

          <div style={{ ...sectionHeaderStyle, marginTop: 0, background: "#ffffff", padding: "13px 16px", borderRadius: 10 }}>
            <h3 style={{ margin: 0, color: "#1e293b", fontSize: 16 }}>
              Carburant
            </h3>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <BoutonsRapportSpat preparerRapport={preparerRapportCarburant} />
            <button
              type="button"
              onClick={
                exporterCarburant
              }
              style={
                boutonSecondaire
              }
            >
              <Download
                size={15}
              />

              Exporter CSV
            </button>
            </div>
          </div>

          <NormesCarburantGpsConsultation
            vehicules={vehicules}
            transactions={transactions}
            positionsGps={positionsGpsCarburant}
            erreurGps={erreurGpsCarburant}
          />

          <SuiviCarburantSansGpsConsultation
            vehicules={vehicules}
            transactions={transactions}
            positionsGps={positionsGpsCarburant}
          />

          {/* =================================================
              FILTRE CARBURANT
          ================================================= */}

          <div
            style={{
              marginBottom:
                12,

              position:
                "relative",
            }}
          >
            <Search
              size={15}
              style={{
                position:
                  "absolute",

                left: 10,

                top:
                  "50%",

                transform:
                  "translateY(-50%)",

                color:
                  "#9ca3af",
              }}
            />

            <input
              value={
                filtreCarburant
              }
              onChange={(e) =>
                setFiltreCarburant(
                  e.target.value
                )
              }
              placeholder="Rechercher un véhicule, un type ou un justificatif..."
              style={{
                ...inputStyle,

                paddingLeft:
                  32,
              }}
            />
          </div>

          <div
            style={
              tableCardStyle
            }
          >
            <table
              style={
                tableStyle
              }
            >
              <thead>
                <tr
                  style={
                    theadRowStyle
                  }
                >
                  <th
                    style={
                      thStyle
                    }
                  >
                    Date
                  </th>

                  <th
                    style={
                      thStyle
                    }
                  >
                    Véhicule
                  </th>

                  <th
                    style={
                      thStyle
                    }
                  >
                    Type
                  </th>

                  <th
                    style={
                      thStyle
                    }
                  >
                    Quantité
                  </th>

                  <th
                    style={
                      thStyle
                    }
                  >
                    Justificatif
                  </th>
                </tr>
              </thead>

              <tbody>
                {transactionsCarburantFiltrees
                  .slice()
                  .sort(
                    (a, b) =>
                      String(
                        b.dateOperation
                      ).localeCompare(
                        String(
                          a.dateOperation
                        )
                      )
                  )
                  .map((t) => (
                    <tr
                      key={
                        t.id
                      }
                      style={
                        trStyle
                      }
                    >
                      <td
                        style={
                          tdStyle
                        }
                      >
                        {formaterDateCourte(
                          t.dateOperation
                        )}
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        {t.vehicule
                          ?.immatriculation ||
                          "—"}
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        {t.type ===
                        "DOTATION"
                          ? "Dotation"
                          : "Consommation"}
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        <strong>
                          {formatNombre(
                            t.quantiteLitres
                          )}{" "}
                          L
                        </strong>
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        {t.justificatif ||
                          "—"}
                      </td>
                    </tr>
                  ))}

                {transactionsCarburantFiltrees.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={
                        5
                      }
                      style={{
                        ...tdStyle,

                        textAlign:
                          "center",

                        color:
                          "#94a3b8",
                      }}
                    >
                      Aucune donnée carburant.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
            </div>
          )}

          {panneauGestion === "TICKETS" && (
            <>
          {/* =================================================
              DEMANDES
          ================================================= */}

          <div
            style={
              sectionHeaderStyle
            }
          >
            <SectionTitre
              titre="Tickets reçus du Chef de Direction"
            />

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <BoutonsRapportSpat preparerRapport={preparerRapportTickets} />
            <button
              type="button"
              onClick={
                exporterReservations
              }
              style={
                boutonSecondaire
              }
            >
              <Download
                size={15}
              />

              Exporter CSV
            </button>
            </div>
          </div>

          {/* =================================================
              FILTRES
          ================================================= */}

          <div
            style={
              filtersStyle
            }
          >
            <div
              style={{
                position:
                  "relative",

                flex:
                  "1 1 300px",
              }}
            >
              <Search
                size={15}
                style={{
                  position:
                    "absolute",

                  left: 10,

                  top:
                    "50%",

                  transform:
                    "translateY(-50%)",

                  color:
                    "#9ca3af",
                }}
              />

              <input
                value={
                  filtreVehicule
                }
                onChange={(e) =>
                  setFiltreVehicule(
                    e.target.value
                  )
                }
                placeholder="Immatriculation, bénéficiaire, matricule, destination..."
                style={{
                  ...inputStyle,

                  paddingLeft:
                    32,
                }}
              />
            </div>

            <select
              value={
                filtreStatutReservation
              }
              onChange={(e) =>
                setFiltreStatutReservation(
                  e.target.value
                )
              }
              style={{
                ...inputStyle,

                width: 220,
              }}
            >
              <option value="EN_ATTENTE">
                Tickets à traiter (dont avis DID reçus)
              </option>
              <option value="EN_ATTENTE_AVIS_DID">
                En attente / retour avis DID
              </option>

              <option value="VALIDEE_N1">
                Validées N°1
              </option>

              <option value="VALIDEE">
                Validées finales
              </option>

              <option value="REFUSEE">
                Refusées
              </option>

              <option value="TOUS">
                Tous les statuts
              </option>
            </select>
          </div>

          {/* =================================================
              LISTE DEMANDES
          ================================================= */}

          {reservationsFiltrees.length ===
          0 ? (
            <BlocVide
              texte="Aucune demande ne correspond aux filtres."
            />
          ) : (
            <div
              style={{
                display:
                  "flex",

                flexDirection:
                  "column",

                gap: 14,

                marginBottom:
                  32,
              }}
            >
              {reservationsFiltrees.map(
                (r) => {
                  const dispo =
                    disponibilites[
                      r.id
                    ];

                  const verification =
                    Boolean(
                      chargementDisponibilites[
                        r.id
                      ]
                    );

                  const erreur =
                    erreursDisponibilites[
                      r.id
                    ];

                  const decision =
                    Boolean(
                      decisionsEnCours[
                        r.id
                      ]
                    );

                  const avisEnvoi =
                    Boolean(
                      avisDIDEnCours[
                        r.id
                      ]
                    );

                  const avisDID =
                    avisDIDPourReservation(
                      r.id
                    );

                  const controlesDuTicket = controlesPourReservation(r.id);
                  const maintenance = controlesDuTicket[0] ?? null;
                  const idsVehiculesEcartes = new Set(
                    controlesDuTicket
                      .filter((m) => avisDIDDefavorable(m) && m.vehicule?.id != null)
                      .map((m) => m.vehicule!.id)
                  );
                  const choixRemplacement = vehiculeAlternatif[r.id] || "";
                  const vehiculeRemplacement = vehicules.find((v) =>
                    String(v.id) === choixRemplacement
                  ) || null;
                  const chauffeursRemplacement = chauffeursEligiblesPourVehicule(
                    vehiculeRemplacement,
                    dispo?.chauffeursDisponibles || []
                  );
                  const avisDefavorable = avisDIDDefavorable(maintenance);
                  const avisFavorable = avisDIDFavorable(maintenance);
                  // L'avis du DID peut être reçu alors que le statut de la réservation
                  // reste EN_ATTENTE_AVIS_DID jusqu'à la validation N°1.
                  // La carte affiche l'état réel de l'avis, pas ce statut transitoire.
                  const avisDIDRecu = maintenanceAvisRecu(maintenance);

                  const vehiculesCorrespondants =
                    dispo
                      ?.vehiculesCorrespondants ||
                    [];

                  const suggestions =
                    dispo
                      ?.suggestionsVehicules ||
                    [];

                  // L'API des disponibilités est la référence pour la période du ticket.
                  // Les autres véhicules restent visibles, mais non sélectionnables.
                  const idsVehiculesProposes = new Set([
                    ...vehiculesCorrespondants,
                    ...suggestions,
                  ].map((v) => v.id));
                  const vehiculesNonProposes = dispo
                    ? vehicules.filter((v) => !idsVehiculesProposes.has(v.id))
                    : [];
                  const planningDuTicket = planningVehicules[r.id] || [];
                  const etatPlanningParVehicule = new Map(
                    planningDuTicket.map((v) => [v.id, v])
                  );

                  const vehiculeSelectionnePourChauffeurs =
                    vehicules.find((v) =>
                      String(v.id) === (vehiculeAffecte[r.id] ||
                        (r.vehicule?.id ? String(r.vehicule.id) : ""))
                    ) || r.vehicule || null;

                  // Toujours partir des chauffeurs libres SUR LA PERIODE
                  // puis appliquer le groupe documentaire, si connu.
                  const chauffeurs = chauffeursEligiblesPourVehicule(
                    vehiculeSelectionnePourChauffeurs,
                    dispo?.chauffeursDisponibles || []
                  );
                  const groupeChauffeurs = groupePourVehicule(
                    vehiculeSelectionnePourChauffeurs
                  );

                  const aucunVehicule =
                    Boolean(
                      dispo &&
                        vehiculesCorrespondants.length ===
                          0 &&
                        suggestions.length ===
                          0
                    );

                  const aucunChauffeur =
                    Boolean(
                      r.besoinChauffeur &&
                        dispo &&
                        chauffeurs.length ===
                          0
                    );

                  const urgenceBloquante =
                    Boolean(
                      r.demandeUrgente &&
                        !r.motifUrgence?.trim()
                    );

                  const vehiculeSelectionne =
                    vehiculeAffecte[
                      r.id
                    ] ||
                    (r.vehicule?.id
                      ? String(r.vehicule.id)
                      : "");

                  const chauffeurSelectionneBrut =
                    chauffeurAffecte[r.id] ||
                    (r.chauffeur?.id ? String(r.chauffeur.id) : "");
                  const chauffeurSelectionne = chauffeurs.some(
                    (c) => String(c.id) === chauffeurSelectionneBrut
                  ) ? chauffeurSelectionneBrut : "";

                  const peutDemanderAvis =
                    r.statut ===
                      "EN_ATTENTE" &&
                    Boolean(
                      dispo
                    ) &&
                    !verification &&
                    !erreur &&
                    !aucunVehicule &&
                    !urgenceBloquante &&
                    Boolean(
                      vehiculeSelectionne
                    ) &&
                    !avisDID;

                  const peutValider =
  (
    r.statut === "EN_ATTENTE" ||
    r.statut === "EN_ATTENTE_AVIS_DID"
  ) &&
  !verification &&
  !erreur &&
  Boolean(dispo) &&
  !aucunVehicule &&
  !urgenceBloquante &&
  Boolean(vehiculeSelectionne) &&
  Boolean(avisDID) &&
  !avisDefavorable &&
  !decision &&
  !avisEnvoi;

                  const estOuvert = ticketOuvertId === r.id;

                  return (
                    <div
                      key={r.id}
                      style={{
                        ...ticketCompactCardStyle,
                        borderColor: r.demandeUrgente
                          ? "#b45309"
                          : "#e2e8f0",
                      }}
                    >
                      {/* =====================================
                          TICKET COMPACT
                          Les informations détaillées et leurs actions
                          restent inchangées ci-dessous.
                      ===================================== */}
                      <div style={ticketCompactTitleRowStyle}>
                        <strong style={ticketCompactTitleStyle}>
                          {`TKT-${String(r.id).padStart(5, "0")}`}
                        </strong>

                        {/* Ne pas afficher « En attente avis DID » après réception de l'avis. */}
                        {!(r.statut === "EN_ATTENTE_AVIS_DID" && avisDIDRecu) && (
                          <BadgeStatut statut={r.statut} />
                        )}
                        {avisDefavorable && (
                          <span style={ticketAvisDefavorableBadgeStyle}>
                            <AlertTriangle size={13} /> Avis DID défavorable — entretien nécessaire
                          </span>
                        )}
                        {avisFavorable && ["EN_ATTENTE", "EN_ATTENTE_AVIS_DID"].includes(r.statut) && (
                          <span style={ticketAvisFavorableBadgeStyle}>
                            <CheckCircle2 size={13} /> Avis DID favorable reçu
                          </span>
                        )}
                        {avisDIDRecu && !avisFavorable && !avisDefavorable &&
                          ["EN_ATTENTE", "EN_ATTENTE_AVIS_DID"].includes(r.statut) && (
                            <span style={ticketAvisFavorableBadgeStyle}>
                              <CheckCircle2 size={13} /> Avis DID reçu — décision à vérifier
                            </span>
                          )}
                      </div>

                      {/* Le motif reste dans les détails : la carte compacte affiche
                          uniquement le numéro, l'état de l'avis et la date. */}
                      <div style={ticketCompactBottomStyle}>
                        <div style={ticketCompactMetaStyle}>
                          Créé le {formaterDate(r.dateCreation)}
                          {r.demandeUrgente && (
                            <span style={ticketCompactUrgentStyle}>
                              <AlertTriangle size={13} />
                              Moins de 24h
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setTicketOuvertId(estOuvert ? null : r.id)
                          }
                          aria-expanded={estOuvert}
                          aria-controls={`ticket-details-${r.id}`}
                          style={ticketCompactButtonStyle}
                        >
                          <Eye size={16} />
                          {estOuvert ? "Masquer" : "Détails"}
                        </button>
                      </div>

                      {/* Le contenu préexistant n'est affiché qu'à la demande. */}
                      {estOuvert && (
                        <div
                          id={`ticket-details-${r.id}`}
                          className="spat-ticket-details-neutre"
                          style={ticketDetailsStyle}
                        >
                      {/* =====================================
                          DEMANDEUR
                      ===================================== */}

                      <SousTitreCarte
                        texte="Informations du demandeur"
                      />

                      <div style={informationBoitesStyle}>
                        <InfoBoite
                          label="Nom"
                          value={nomBeneficiaire(r)}
                        />
                        <InfoBoite
                          label="Matricule"
                          value={r.demandeurMatricule || "—"}
                        />
                        <InfoBoite
                          label="Entité"
                          value={r.demandeurEntite || "—"}
                        />
                        <InfoBoite
                          label="Téléphone"
                          value={r.demandeurTelephone || "—"}
                        />
                      </div>

                      {/* =====================================
                          MISSION
                      ===================================== */}

                      <SousTitreCarte
                        texte="Informations du ticket"
                      />

                      {/* Même présentation compacte pour toutes les informations
                          du ticket, y compris les passagers et observations. */}
                      <div style={informationBoitesStyle}>
                        <InfoBoite label="Objet" value={r.motif || "—"} />
                        <InfoBoite
                          label="Période"
                          value={`${formaterDate(r.dateDebut)} → ${formaterDate(r.dateFin)}`}
                        />
                        <InfoBoite
                          label="Point de départ"
                          value={r.pointDepart || "—"}
                        />
                        <InfoBoite
                          label="Destination"
                          value={r.destination || "—"}
                        />
                        <InfoBoite
                          label="Passagers"
                          value={r.nombrePassagers != null ? String(r.nombrePassagers) : "—"}
                        />
                        <InfoBoite
                          label="Chauffeur demandé"
                          value={r.besoinChauffeur ? "Oui" : "Non"}
                        />
                        {r.listePassagers?.trim() && (
                          <InfoBoite
                            label="Liste des passagers"
                            value={r.listePassagers}
                          />
                        )}
                        {r.observations?.trim() && (
                          <InfoBoite
                            label="Observations"
                            value={r.observations}
                          />
                        )}
                        {r.demandeUrgente && (
                          <InfoBoite
                            label="Motif d'urgence"
                            value={r.motifUrgence?.trim() || "Non renseigné — validation bloquée"}
                          />
                        )}
                      </div>

                      {/* =====================================
                          AVIS DID LIE AU TICKET
                      ===================================== */}
                      {maintenance && (
                        <div style={{
                          marginTop: 16,
                          border: "1px solid #e2e8f0",
                          borderRadius: 10,
                          background: "#ffffff",
                          padding: 14,
                        }}>
                          <div style={{
                            display: "flex", alignItems: "center", gap: 8,
                            flexWrap: "wrap", fontWeight: 800, color: "#334155",
                          }}>
                            {avisDefavorable ? <AlertTriangle size={17} /> : <Wrench size={17} />}
                            {avisDefavorable
                              ? "Avis DID défavorable — le véhicule demandé nécessite un entretien"
                              : avisFavorable
                                ? "Avis DID favorable — ticket prêt pour la validation N°1"
                                : avisDID
                                  ? "Avis technique DID reçu — décision à vérifier"
                                  : "Contrôle technique demandé — en attente de l'avis DID"}
                          </div>
                          <div style={{ ...infoGridStyle, marginTop: 12 }}>
                            <Info label="Véhicule contrôlé" value={
                              maintenance.vehicule
                                ? libelleVehicule(maintenance.vehicule)
                                : r.vehicule
                                  ? libelleVehicule(r.vehicule)
                                  : "—"
                            } />
                            <Info label="Chauffeur du ticket" value={
                              r.chauffeur ? nomChauffeur(r.chauffeur) :
                              r.besoinChauffeur ? "Non affecté" : "Non requis"
                            } />
                            <Info label="Diagnostic visuel" value={maintenance.diagnosticVisuel?.trim() || "En attente"} />
                            <Info label="Observations du mécanicien" value={maintenance.observationsMecanicien?.trim() || "En attente"} />
                            <Info label="Pièces ou actions nécessaires" value={maintenance.piecesNecessaires?.trim() || "En attente"} />
                            <Info label="Décision DID" value={
                              avisDefavorable ? "Défavorable" : avisFavorable ? "Favorable" : "En attente / non renseignée"
                            } />
                            <Info label="Date de l'avis" value={formaterDate(
                              maintenance.dateAvisDID || maintenance.dateAvisdid || maintenance.avisDate
                            )} />
                            <Info label="Mécanicien" value={
                              maintenance.mecanicienEmail || maintenance.avisAuteurEmail || "—"
                            } />
                          </div>
                          {maintenance.avisTexte?.trim() && (
                            <div style={detailBoxStyle}>
                              <div style={detailLabelStyle}>Avis technique</div>
                              <div style={detailValueStyle}>{maintenance.avisTexte.trim()}</div>
                            </div>
                          )}
                          {avisFavorable && ["EN_ATTENTE", "EN_ATTENTE_AVIS_DID"].includes(r.statut) && (
                            <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
                              <button
                                type="button"
                                onClick={() => decisionReservation(r, "VALIDEE_N1")}
                                disabled={!peutValider}
                                style={{
                                  ...boutonValider,
                                  cursor: peutValider ? "pointer" : "not-allowed",
                                  opacity: peutValider ? 1 : 0.5,
                                }}
                              >
                                <CheckCircle2 size={15} />
                                {decision ? "Enregistrement..." : "Valider N°1"}
                              </button>
                            </div>
                          )}
                          {avisDefavorable && ["EN_ATTENTE", "EN_ATTENTE_AVIS_DID"].includes(r.statut) && (
                            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}>
                              <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 12 }}>
                                <button
                                  type="button"
                                  style={{ ...boutonValider, cursor: "pointer" }}
                                  disabled={Boolean(relanceDidEnCours[r.id])}
                                  aria-expanded={Boolean(choixAlternatifOuvert[r.id])}
                                  aria-controls={`choix-vehicule-${r.id}`}
                                  onClick={() => {
                                    const ouverture = !choixAlternatifOuvert[r.id];
                                    setChoixAlternatifOuvert((ancien) => ({ ...ancien, [r.id]: ouverture }));
                                    if (ouverture) chargerDisponibilites(r.id);
                                  }}
                                >
                                  <RefreshCw size={15} />
                                  {choixAlternatifOuvert[r.id] ? "Masquer le choix" : "Choisir un autre véhicule"}
                                </button>
                                <button type="button" style={boutonRefuser}
                                  onClick={() => ouvrirRefus(r)} disabled={decision}>
                                  <XCircle size={15} /> Refuser ce ticket
                                </button>
                              </div>
                              {choixAlternatifOuvert[r.id] && (
                                <div
                                  id={`choix-vehicule-${r.id}`}
                                  style={{
                                    ...detailBoxStyle,
                                    background: "#ffffff",
                                    marginTop: 10,
                                    display: "grid",
                                    gap: 10,
                                  }}
                                >
                                  <label style={labelStyle}>Autre véhicule *</label>
                                  <select
                                    value={choixRemplacement}
                                    style={inputStyle}
                                    disabled={!dispo || verification || Boolean(relanceDidEnCours[r.id])}
                                    onChange={(e) => {
                                      setVehiculeAlternatif((ancien) => ({ ...ancien, [r.id]: e.target.value }));
                                      setChauffeurAlternatif((ancien) => ({ ...ancien, [r.id]: "" }));
                                    }}
                                  >
                                    <option value="">Sélectionner un autre véhicule</option>
                                    {[...vehiculesCorrespondants, ...suggestions]
                                      .filter((v, index, liste) => liste.findIndex((x) => x.id === v.id) === index)
                                      .filter((v) => v.id !== r.vehicule?.id && !idsVehiculesEcartes.has(v.id))
                                      .map((v) => (
                                        <option key={v.id} value={String(v.id)}>
                                          {libelleVehiculeDisponible(v)} — Disponible
                                        </option>
                                      ))}
                                    {vehiculesNonProposes.map((v) => {
                                      const etat = etatPlanningParVehicule.get(v.id);
                                      const motif = etat?.etat === "OCCUPE"
                                        ? "Occupé pour cette période"
                                        : "Indisponible";
                                      return (
                                        <option key={v.id} value={String(v.id)} disabled>
                                          {libelleVehicule(v)} — {motif}
                                        </option>
                                      );
                                    })}
                                  </select>
                                  {Boolean(r.besoinChauffeur) && choixRemplacement && (
                                    <div style={{ ...detailBoxStyle, background: "#ffffff" }}>
                                      <div style={detailLabelStyle}>Chauffeur</div>
                                      <div style={detailValueStyle}>Affectation automatique à la confirmation</div>
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    style={{
                                      ...boutonValider,
                                      marginTop: 14,
                                      cursor: "pointer",
                                      display: "inline-flex",
                                      width: "fit-content",
                                      maxWidth: "100%",
                                      alignSelf: "flex-start",
                                      justifyContent: "center",
                                      background: "#2563eb",
                                      border: "1px solid #2563eb",
                                      color: "#ffffff",
                                    }}
                                    disabled={verification || Boolean(relanceDidEnCours[r.id]) ||
                                      !choixRemplacement}
                                    onClick={() => relancerControleDID(r)}
                                  >
                                    <Send size={15} />
                                    {relanceDidEnCours[r.id] ? "Envoi au DID..." :
                                      "Confirmer le nouveau véhicule et demander l'avis DID"}
                                  </button>
                                </div>
                              )}

                            </div>
                          )}
                              {controlesDuTicket.length > 1 && (
                                <div style={{ ...detailBoxStyle, marginTop: 12 }}>
                                  <strong>Historique des contrôles du ticket</strong>
                                  {controlesDuTicket.slice(1).map((ancien) => (
                                    <div key={ancien.id} style={{ marginTop: 8, fontSize: 12 }}>
                                      {ancien.vehicule?.immatriculation || "Véhicule non renseigné"} —
                                      {avisDIDDefavorable(ancien) ? " Avis défavorable" :
                                        avisDIDFavorable(ancien) ? " Avis favorable" : " Avis en attente"} —
                                      {formaterDate(ancien.dateAvisDID || ancien.dateAvisdid || ancien.avisDate || ancien.dateCreation)}
                                    </div>
                                  ))}
                                </div>
                              )}
                        </div>
                      )}

                      {/* =====================================
                          DISPONIBILITES
                      ===================================== */}

                      {!maintenance && [
                        "EN_ATTENTE",
                        "EN_ATTENTE_AVIS_DID",
                      ].includes(r.statut) && (
                        <div
                          style={{
                            marginTop:
                              18,

                            paddingTop:
                              16,

                            borderTop:
                              "1px solid #e5e7eb",
                          }}
                        >
                          <div
                            style={{
                              display:
                                "flex",

                              justifyContent:
                                "space-between",

                              alignItems:
                                "center",

                              gap: 10,

                              flexWrap:
                                "wrap",
                            }}
                          >
                            <div
                              style={{
                                display:
                                  "flex",

                                alignItems:
                                  "center",

                                gap: 7,

                                fontWeight:
                                  700,

                                color:
                                  "#334155",
                              }}
                            >
                              <Truck
                                size={16}
                              />

                              Choisir le véhicule
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                chargerDisponibilites(
                                  r.id
                                )
                              }
                              disabled={
                                verification ||
                                decision ||
                                avisEnvoi
                              }
                              style={{
                                ...boutonSecondaire,

                                padding:
                                  "6px 9px",

                                fontSize:
                                  12,
                              }}
                            >
                              <RefreshCw
                                size={13}
                              />

                              Re-vérifier
                            </button>
                          </div>

                          {verification && (
                            <div
                              style={
                                infoBoxBleuStyle
                              }
                            >
                              <strong>
                                Vérification en cours...
                              </strong>

                            </div>
                          )}

                          {!verification &&
                            erreur && (
                              <div
                                style={
                                  errorBoxStyle
                                }
                              >
                                <strong>
                                  Impossible de vérifier la disponibilité.
                                </strong>

                                <div
                                  style={{
                                    marginTop:
                                      4,
                                  }}
                                >
                                  {erreur}
                                </div>
                              </div>
                            )}

                          {!verification &&
                            dispo && (
                              <>
                                {/* VEHICULE DEMANDE */}

                                {!dispo.typeSouhaiteDisponible && (
                                  <div
                                    style={
                                      warningAvailabilityStyle
                                    }
                                  >
                                    <strong>
                                      ⚠ Le véhicule/type demandé est indisponible
                                    </strong>

                                  </div>
                                )}

                                {/* CHAUFFEUR */}

                                {r.besoinChauffeur &&
                                  !dispo.chauffeurDisponible && (
                                  <div
                                    style={
                                      errorBoxStyle
                                    }
                                  >
                                    <strong>
                                      ⚠ Aucun chauffeur disponible
                                    </strong>

                                  </div>
                                )}

                                {/* =================================
                                    CHOIX
                                ================================= */}

                                <div
                                  style={
                                    affectationGridStyle
                                  }
                                >
                                  <div>
                                    <label
                                      style={
                                        labelStyle
                                      }
                                    >
                                      Véhicule proposé
                                    </label>

                                    <select
                                      value={vehiculeAffecte[r.id] ?? ""}
                                      onChange={(e) => {
                                        const valeur = e.target.value;
                                        // Vérification supplémentaire côté interface :
                                        // un véhicule absent de la liste disponible ne peut
                                        // pas être choisi, même par manipulation du DOM.
                                        if (
                                          valeur &&
                                          !idsVehiculesProposes.has(Number(valeur))
                                        ) {
                                          toast.error(
                                            "Ce véhicule n'est pas disponible aux dates du ticket."
                                          );
                                          return;
                                        }

                                        setVehiculeAffecte((ancien) => ({
                                          ...ancien,
                                          [r.id]: valeur,
                                        }));
                                        // Une nouvelle sélection de véhicule invalide
                                        // l'éventuelle sélection antérieure du chauffeur.
                                        setChauffeurAffecte((ancien) => ({
                                          ...ancien,
                                          [r.id]: "",
                                        }));
                                      }}
                                      disabled={
                                        r.statut === "EN_ATTENTE_AVIS_DID" ||
                                        !dispo || verification || decision || avisEnvoi
                                      }
                                      style={inputStyle}
                                    >
                                      <option value="">
                                        {!dispo
                                          ? "Vérification des disponibilités..."
                                          : "Sélectionner un véhicule"}
                                      </option>

                                      {vehiculesCorrespondants.length > 0 && (
                                        <optgroup label="Type demandé — disponibles">
                                          {vehiculesCorrespondants.map((v) => (
                                            <option key={v.id} value={String(v.id)}>
                                              {libelleVehiculeDisponible(v)} — Disponible
                                            </option>
                                          ))}
                                        </optgroup>
                                      )}

                                      {suggestions.length > 0 && (
                                        <optgroup label="Suggestions — autres véhicules disponibles">
                                          {suggestions
                                            .filter((v) => !vehiculesCorrespondants.some((x) => x.id === v.id))
                                            .map((v) => (
                                              <option key={v.id} value={String(v.id)}>
                                                {libelleVehiculeDisponible(v)} — Disponible
                                              </option>
                                            ))}
                                        </optgroup>
                                      )}

                                      {vehiculesNonProposes.length > 0 && (
                                        <optgroup label="Véhicules non disponibles pour la période du ticket">
                                          {vehiculesNonProposes.map((v) => {
                                            const etat = etatPlanningParVehicule.get(v.id);
                                            const raison = etat?.etat === "OCCUPE"
                                              ? "Occupé — déjà réservé sur les dates de ce ticket"
                                              : etat?.etat === "INDISPONIBLE_TECHNIQUE"
                                                ? `Indisponible — statut : ${v.statut || "non renseigné"}`
                                                : "Indisponible — motif non précisé";
                                            return (
                                              <option key={v.id} value={String(v.id)} disabled>
                                                {libelleVehicule(v)} — {raison}
                                              </option>
                                            );
                                          })}
                                        </optgroup>
                                      )}
                                    </select>
                                  </div>

                                  {r.besoinChauffeur && vehiculeSelectionne && (
                                    <div style={{ ...detailBoxStyle, background: "#ffffff" }}>
                                      <div style={detailLabelStyle}>Chauffeur</div>
                                      <div style={detailValueStyle}>
                                        Affectation automatique
                                      </div>
                                    </div>
                                  )}
                                </div>


                                {/* =================================
                                    AVIS DID
                                ================================= */}

                                {!avisDID ? (
                                  <div
                                    style={{
                                      marginTop:
                                        16,
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        demanderAvisDID(
                                          r
                                        )
                                      }
                                      disabled={
                                        !peutDemanderAvis ||
                                        avisEnvoi
                                      }
                                      style={{
                                        ...boutonPrimaire(
                                          !peutDemanderAvis ||
                                          avisEnvoi
                                        ),

                                        background:
                                          "#2563eb",
                                      }}
                                    >
                                      <Send
                                        size={15}
                                      />

                                      {avisEnvoi
                                        ? "Envoi au mécanicien DID..."
                                        : "Demander l'avis du mécanicien DID"}
                                    </button>
                                  </div>
                                ) : (
                                  <div
                                    style={{
                                      marginTop:
                                        16,

                                      padding:
                                        12,

                                      background: avisDefavorable ? "#fff1f2" : "#f0fdf4",
                                      border: avisDefavorable ? "1px solid #fecaca" : "1px solid #bbf7d0",
                                      borderRadius: 8,
                                      color: avisDefavorable ? "#991b1b" : "#166534",
                                    }}
                                  >
                                    <div
                                      style={{
                                        display:
                                          "flex",

                                        alignItems:
                                          "center",

                                        gap: 6,

                                        fontWeight:
                                          700,
                                      }}
                                    >
                                      <CheckCircle2
                                        size={16}
                                      />

                                      {avisDefavorable
                                        ? "Avis DID défavorable — entretien nécessaire"
                                        : "Avis DID reçu"}
                                    </div>

                                    <div
                                      style={{
                                        marginTop:
                                          7,

                                        fontSize:
                                          13,

                                        lineHeight:
                                          1.5,
                                      }}
                                    >
                                      {avisDID}
                                    </div>

                                    {maintenance?.avisDate && (
                                      <div
                                        style={{
                                          marginTop:
                                            6,

                                          fontSize:
                                            11,

                                          color:
                                            "#64748b",
                                        }}
                                      >
                                        Avis enregistré le{" "}
                                        {formaterDate(
                                          maintenance.avisDate
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* =================================
                                    ACTIONS
                                ================================= */}

                                <div
                                  style={
                                    actionsStyle
                                  }
                                >
                                  <button
                                    type="button"
                                    disabled={
                                      decision ||
                                      avisEnvoi
                                    }
                                    onClick={() =>
                                      ouvrirRefus(
                                        r
                                      )
                                    }
                                    style={{
                                      ...boutonRefuser,

                                      opacity:
                                        decision
                                          ? 0.5
                                          : 1,
                                    }}
                                  >
                                    <XCircle
                                      size={15}
                                    />

                                    Refuser
                                  </button>

                                  <button
                                    type="button"
                                    disabled={
                                      !peutValider
                                    }
                                    onClick={() =>
                                      decisionReservation(
                                        r,
                                        "VALIDEE_N1"
                                      )
                                    }
                                    style={{
                                      ...boutonValider,

                                      opacity:
                                        !peutValider
                                          ? 0.5
                                          : 1,

                                      cursor:
                                        !peutValider
                                          ? "not-allowed"
                                          : "pointer",
                                    }}
                                  >
                                    <CheckCircle2
                                      size={15}
                                    />

                                    {decision
                                      ? "Enregistrement..."
                                      : "Valider N°1"}
                                  </button>
                                </div>
                              </>
                            )}
                        </div>
                      )}

                      {/* =====================================
                          VALIDATION N1
                      ===================================== */}

                      {(r.statut ===
                        "VALIDEE_N1" ||
                        r.statut ===
                          "VALIDEE") && (
                        <div
                          style={
                            successBoxStyle
                          }
                        >
                          <div
                            style={{
                              display:
                                "flex",

                              alignItems:
                                "center",

                              gap: 6,

                              fontWeight:
                                700,
                            }}
                          >
                            <CheckCircle2
                              size={16}
                            />

                            Validation N°1 enregistrée
                          </div>


                          <div
                            style={
                              traceGridStyle
                            }
                          >
                            <TraceInfo
                              label="Véhicule"
                              value={
                                r.vehicule
                                  ? libelleVehicule(
                                      r.vehicule
                                    )
                                  : "—"
                              }
                            />

                            <TraceInfo
                              label="Chauffeur"
                              value={
                                r.chauffeur
                                  ? nomChauffeur(
                                      r.chauffeur
                                    )
                                  : r.besoinChauffeur
                                    ? "—"
                                    : "Non demandé"
                              }
                            />

                            <TraceInfo
                              label="Validation N°1 par"
                              value={
                                nomUtilisateur(
                                  r.validationN1Par
                                )
                              }
                            />

                            <TraceInfo
                              label="Date"
                              value={
                                r.dateValidationN1
                                  ? formaterDate(
                                      r.dateValidationN1
                                    )
                                  : "—"
                              }
                            />
                          </div>
                        </div>
                      )}

                      {/* =====================================
                          REFUS
                      ===================================== */}

                      {r.statut ===
                        "REFUSEE" && (
                        <div
                          style={
                            errorBoxStyle
                          }
                        >
                          <div
                            style={{
                              display:
                                "flex",

                              alignItems:
                                "center",

                              gap: 6,

                              fontWeight:
                                700,
                            }}
                          >
                            <XCircle
                              size={16}
                            />

                            Demande refusée
                          </div>

                          <div
                            style={{
                              marginTop:
                                9,
                            }}
                          >
                            <strong>
                              Motif :
                            </strong>{" "}
                            {r.motifRefus ||
                              "—"}
                          </div>

                          <div
                            style={
                              traceGridStyle
                            }
                          >
                            <TraceInfo
                              label="Refusée par"
                              value={
                                nomUtilisateur(
                                  r.refusePar
                                )
                              }
                            />

                            <TraceInfo
                              label="Date"
                              value={
                                r.dateRefus
                                  ? formaterDate(
                                      r.dateRefus
                                    )
                                  : "—"
                              }
                            />
                          </div>
                        </div>
                      )}
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )}

          {/* Les avis DID restent dans les détails des tickets ci-dessus.
              Les entretiens chauffeurs et périodiques sont dans le panneau dédié. */}

            </>
          )}
        </div>
      </div>

      {/* ===================================================
          MODALE REFUS
      =================================================== */}

      {reservationARefuser && (
        <div
          style={
            modalOverlayStyle
          }
        >
          <div
            style={
              modalStyle
            }
          >
            <div
              style={{
                display:
                  "flex",

                alignItems:
                  "center",

                gap: 9,

                marginBottom:
                  8,
              }}
            >
              <XCircle
                size={20}
                style={{
                  color:
                    "#dc2626",
                }}
              />

              <h3
                style={{
                  margin: 0,
                  fontSize: 17,
                  color: "#111827",
                }}
              >
                Refuser la demande
              </h3>
            </div>

            <p
              style={{
                margin:
                  "0 0 15px",

                fontSize:
                  13,

                color:
                  "#64748b",

                lineHeight:
                  1.5,
              }}
            >
              Demande{" "}
              <strong>
                {`TKT-${String(
                  reservationARefuser.id
                ).padStart(
                  5,
                  "0"
                )}`}
              </strong>

              {" — "}

              {nomBeneficiaire(
                reservationARefuser
              )}
            </p>

            <label
              style={
                labelStyle
              }
            >
              Motif du refus *
            </label>

            <textarea
              value={
                motifRefusSaisi
              }
              onChange={(e) =>
                setMotifRefusSaisi(
                  e.target.value
                )
              }
              rows={5}
              autoFocus
              placeholder="Indiquer clairement la raison du refus..."
              style={{
                ...inputStyle,

                resize:
                  "vertical",
              }}
            />

            <div
              style={{
                display:
                  "flex",

                justifyContent:
                  "flex-end",

                gap: 8,

                marginTop:
                  17,

                flexWrap:
                  "wrap",
              }}
            >
              <button
                type="button"
                onClick={
                  fermerRefus
                }
                style={
                  boutonSecondaire
                }
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={
                  !motifRefusSaisi.trim()
                }
                onClick={
                  confirmerRefus
                }
                style={{
                  ...boutonRefuser,

                  opacity:
                    !motifRefusSaisi.trim()
                      ? 0.5
                      : 1,
                }}
              >
                <XCircle
                  size={15}
                />

                Confirmer le refus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



// =========================================================
// NORMES DE CARBURANT : CONSULTATION, VEHICULES GPS
// Reprend les mêmes 9 références et la même règle de calcul indicative
// que la rubrique Carburant de l'Agent Flotte (classeur SPAT transmis).
// =========================================================
const NORMES_CARBURANT_GPS: Record<string, { min: number; max: number; categorie: string }> = {
  "1205TCA": { min: 8.5, max: 13.5, categorie: "Voiture" },
  "1218TCA": { min: 8.5, max: 13.5, categorie: "Voiture" },
  "5174AH": { min: 10, max: 15, categorie: "Voiture" },
  "5533AE": { min: 10, max: 15, categorie: "Voiture" },
  "6742AJ": { min: 10, max: 15, categorie: "Voiture" },
  "6743AJ": { min: 10, max: 15, categorie: "Voiture" },
  "5334AJ": { min: 10, max: 15, categorie: "Voiture" },
  "0040AH": { min: 10, max: 12, categorie: "Ambulance" },
  "19255WWT": { min: 12.5, max: 16, categorie: "Bus" },
};

function normaliserPlaqueCarburant(immatriculation: string): string {
  return immatriculation.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function jourCarburant(dateOperation: string): string | null {
  const jour = String(dateOperation || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(jour) && !Number.isNaN(Date.parse(`${jour}T12:00:00`))
    ? jour : null;
}

type RatioCarburantIndicatif = { km: number; litres: number; ratio: number; debut: string; fin: string };

function calculerRatioCarburantLecture(operations: TransactionCarburant[]): RatioCarburantIndicatif | null {
  const points = operations.flatMap((t) => {
    const jour = jourCarburant(t.dateOperation);
    const km = t.kilometrage == null ? NaN : Number(t.kilometrage);
    return jour && Number.isFinite(km) && km >= 0 ? [{ jour, km }] : [];
  }).sort((a, b) => a.jour.localeCompare(b.jour) || a.km - b.km);
  const debut = points[0];
  const fin = points[points.length - 1];
  if (!debut || !fin || debut.jour >= fin.jour || fin.km <= debut.km) return null;

  const litres = operations.reduce((total, operation) => {
    const jour = jourCarburant(operation.dateOperation);
    const volume = Number(operation.quantiteLitres);
    if (operation.type !== "CONSOMMATION" || !jour || jour <= debut.jour || jour > fin.jour ||
        !Number.isFinite(volume) || volume <= 0) return total;
    return total + volume;
  }, 0);
  const km = fin.km - debut.km;
  if (litres <= 0 || km <= 0) return null;
  return { km, litres, ratio: (litres / km) * 100, debut: debut.jour, fin: fin.jour };
}

function NormesCarburantGpsConsultation({ vehicules, transactions, positionsGps, erreurGps }: {
  vehicules: Vehicule[];
  transactions: TransactionCarburant[];
  positionsGps: PositionGpsCarburant[];
  erreurGps: string | null;
}) {
  const lignes = useMemo(() => {
    const pointsGps = new Map<number, PositionGpsCarburant>();
    positionsGps.forEach((point) => {
      if (point.vehiculeId != null) pointsGps.set(Number(point.vehiculeId), point);
    });
    return vehicules
      // Les 9 plaques du document sont connues comme équipées GPS ;
      // le dixième est ajouté à partir des données GPS ou de l'équipement déclaré.
      .filter((v) => v.gpsEquipe === true || v.gpsDeviceId != null ||
        pointsGps.has(v.id) || Boolean(NORMES_CARBURANT_GPS[normaliserPlaqueCarburant(v.immatriculation)]))
      .slice()
      .sort((a, b) => a.immatriculation.localeCompare(b.immatriculation, "fr", { numeric: true }))
      .map((vehicule) => {
        const norme = NORMES_CARBURANT_GPS[normaliserPlaqueCarburant(vehicule.immatriculation)] ?? null;
        const gps = pointsGps.get(vehicule.id) ?? null;
        const releve = gps?.odometreKm == null ? NaN : Number(gps.odometreKm);
        const operations = transactions.filter((t) => t.vehicule?.id === vehicule.id);
        return {
          vehicule, norme, gps,
          kmGps: Number.isFinite(releve) && releve >= 0 ? releve : null,
          mesure: calculerRatioCarburantLecture(operations),
        };
      });
  }, [vehicules, transactions, positionsGps]);

  const avecNorme = lignes.filter((ligne) => ligne.norme !== null).length;
  const depassements = lignes.filter((ligne) => ligne.norme && ligne.mesure &&
    ligne.mesure.km >= 100 && ligne.mesure.ratio > ligne.norme.max).length;
  const n = (valeur: number, decimales = 1) => valeur.toLocaleString("fr-FR", {
    minimumFractionDigits: decimales, maximumFractionDigits: decimales,
  });
  const fr = (jour: string) => jour.split("-").reverse().join("/");
  const cellule: CSSProperties = { padding: "10px 9px", borderBottom: "1px solid #f1f5f9", verticalAlign: "top" };

  return (
    <section aria-label="Normes carburant des véhicules GPS" style={{
      ...cardStyle, marginBottom: 18,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
        <div>
          <h3 style={{ margin: 0, color: "#1e293b", fontSize: 16 }}>Normes de consommation — véhicules équipés GPS</h3>
          
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 12, fontWeight: 700 }}>
          <span style={{ background: "#f1f5f9", color: "#334155", padding: "7px 9px", borderRadius: 7 }}>Véhicules identifiés : {lignes.length}</span>
          <span style={{ background: "#eff6ff", color: "#1d4ed8", padding: "7px 9px", borderRadius: 7 }}>Normes associées : {avecNorme}/{lignes.length}</span>
          <span style={{ background: depassements ? "#fee2e2" : "#f1f5f9", color: depassements ? "#b91c1c" : "#334155", padding: "7px 9px", borderRadius: 7 }}>Dépassements indicatifs : {depassements}</span>
        </div>
      </div>
      {erreurGps && <p role="status" style={{ color: "#991b1b", background: "#fef2f2", padding: 10, borderRadius: 7, fontSize: 12 }}>
        {erreurGps} Les 9 références du document restent consultables, mais la liste GPS complète et les compteurs actuels ne peuvent pas être confirmés.
      </p>}
      
      {lignes.length === 0 ? (
        <p style={{ color: "#64748b", fontSize: 12 }}>Aucun véhicule du référentiel trouvé dans le parc accessible à ce rôle.</p>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
          <table style={{ width: "100%", minWidth: 1080, borderCollapse: "collapse", fontSize: 12, color: "#334155" }}>
            <thead style={{ background: "#f8fafc" }}><tr>
              {["Véhicule", "Catégorie", "Norme (L/100 km)", "Dernier compteur GPS", "Période des relevés carburant", "Distance relevée", "Litres saisis", "Ratio indicatif", "Comparaison"].map((titre) => (
                <th key={titre} style={{ ...cellule, whiteSpace: "nowrap", textAlign: "left", fontWeight: 700, borderBottom: "1px solid #e2e8f0" }}>{titre}</th>
              ))}
            </tr></thead>
            <tbody>{lignes.map(({ vehicule, norme, gps, kmGps, mesure }) => {
              const depasse = Boolean(norme && mesure && mesure.km >= 100 && mesure.ratio > norme.max);
              const comparaison = !norme ? "Norme à renseigner" : !mesure ? "Données de consommation insuffisantes" :
                mesure.km < 100 ? "Distance trop courte pour alerte" :
                mesure.ratio > norme.max ? "Dépassement indicatif — à vérifier" :
                mesure.ratio < norme.min ? "Sous la fourchette — à vérifier" : "Dans la fourchette — indicatif";
              return <tr key={vehicule.id}>
                <td style={cellule}><strong>{vehicule.immatriculation}</strong></td>
                <td style={cellule}>{norme?.categorie ?? "—"}</td>
                <td style={cellule}>{norme ? `${n(norme.min)} – ${n(norme.max)}` : <strong style={{ color: "#b45309" }}>Non fournie</strong>}</td>
                <td style={cellule}>{kmGps == null ? "Non disponible" : `${n(kmGps, 0)} km`}
                  <div style={{ color: "#94a3b8", fontSize: 10 }}>{gps ? (gps.dateGps ? formaterDate(gps.dateGps) : "Date GPS indisponible") : "Aucun relevé GPS"}</div>
                </td>
                <td style={cellule}>{mesure ? `${fr(mesure.debut)} → ${fr(mesure.fin)}` : "Deux relevés datés requis"}</td>
                <td style={cellule}>{mesure ? `${n(mesure.km, 0)} km` : "—"}</td>
                <td style={cellule}>{mesure ? `${n(mesure.litres)} L` : "—"}</td>
                <td style={cellule}><strong>{mesure ? `${n(mesure.ratio)} L/100 km` : "—"}</strong></td>
                <td style={cellule}><span style={{ color: depasse ? "#b91c1c" : "#475569", fontWeight: depasse ? 700 : 500 }}>{comparaison}</span></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      )}
      
    </section>
  );
}

// =========================================================
// CONSULTATION DES CONSOMMATIONS SANS GPS : données déjà enregistrées.
// Aucune saisie ou modification n'est accessible depuis cette section.
// =========================================================
function SuiviCarburantSansGpsConsultation({ vehicules, transactions, positionsGps }: {
  vehicules: Vehicule[];
  transactions: TransactionCarburant[];
  positionsGps: PositionGpsCarburant[];
}) {
  const lignes = useMemo(() => {
    const idsGps = new Set(positionsGps.map((point) => point.vehiculeId));
    return vehicules
      .filter((v) => v.gpsEquipe !== true && v.gpsDeviceId == null && !idsGps.has(v.id))
      .slice()
      .sort((a, b) => a.immatriculation.localeCompare(b.immatriculation, "fr", { numeric: true }))
      .map((vehicule) => {
        const operations = transactions.filter((t) => t.vehicule?.id === vehicule.id);
        const points = operations.flatMap((t) => {
          const jour = jourCarburant(t.dateOperation);
          const km = t.kilometrage == null ? NaN : Number(t.kilometrage);
          return jour && Number.isFinite(km) && km >= 0 ? [{ jour, km }] : [];
        }).sort((a, b) => a.jour.localeCompare(b.jour) || a.km - b.km);
        return {
          vehicule,
          dernierReleve: points[points.length - 1] ?? null,
          mesure: calculerRatioCarburantLecture(operations),
          nombreReleves: points.length,
        };
      });
  }, [vehicules, transactions, positionsGps]);
  const nombre = (valeur: number, decimales = 1) => valeur.toLocaleString("fr-FR", {
    minimumFractionDigits: decimales, maximumFractionDigits: decimales,
  });
  const dateFr = (date: string) => date.split("-").reverse().join("/");
  const cellule: CSSProperties = { padding: "9px 8px", verticalAlign: "top", borderBottom: "1px solid #f1f5f9" };
  return (
    <section aria-label="Suivi carburant sans GPS en consultation" style={{ ...cardStyle, marginBottom: 18 }}>
      <h3 style={{ margin: 0, fontSize: 16, color: "#1e293b" }}>Consommation(véhicules sans GPS)</h3>
      
      {lignes.length === 0 ? (
        <p style={{ color: "#64748b", fontSize: 12 }}>Aucun véhicule sans GPS identifié dans le parc chargé.</p>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
          <table style={{ width: "100%", minWidth: 920, borderCollapse: "collapse", fontSize: 12, color: "#334155" }}>
            <thead style={{ background: "#f8fafc" }}><tr>
              {["Véhicule", "Dernier compteur manuel", "Période", "Distance", "Litres saisis", "Ratio indicatif", "Norme", "État du suivi"].map((titre) => (
                <th key={titre} style={{ ...cellule, textAlign: "left", whiteSpace: "nowrap" }}>{titre}</th>
              ))}
            </tr></thead>
            <tbody>{lignes.map(({ vehicule, dernierReleve, mesure, nombreReleves }) => (
              <tr key={vehicule.id}>
                <td style={cellule}><strong>{vehicule.immatriculation}</strong></td>
                <td style={cellule}>{dernierReleve ? `${nombre(dernierReleve.km, 0)} km — ${dateFr(dernierReleve.jour)}` : "Non renseigné"}</td>
                <td style={cellule}>{mesure ? `${dateFr(mesure.debut)} → ${dateFr(mesure.fin)}` : "—"}</td>
                <td style={cellule}>{mesure ? `${nombre(mesure.km, 0)} km` : "—"}</td>
                <td style={cellule}>{mesure ? `${nombre(mesure.litres)} L` : "—"}</td>
                <td style={cellule}><strong>{mesure ? `${nombre(mesure.ratio)} L/100 km` : "—"}</strong></td>
                <td style={cellule}>À renseigner après validation</td>
                <td style={cellule}>{!mesure ? (nombreReleves < 2 ? "Deux relevés datés requis" : "Vérifier distance et litres") : mesure.km < 100 ? "Distance courte : estimation prudente" : "Estimation disponible, sans comparaison"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <p style={{ color: "#64748b", fontSize: 11, margin: "9px 0 0" }}>
        Consultation uniquement. Une comparaison fiable requiert la même période pour les litres réellement consommés et les relevés kilométriques.
      </p>
    </section>
  );
}

// =========================================================
// KPI
// =========================================================

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
    <div
      style={
        cardStyle
      }
    >
      <div
        style={{
          display:
            "flex",

          alignItems:
            "center",

          gap: 8,

          color:
            "#475569",

          fontSize:
            13,
        }}
      >
        {icone}

        {label}
      </div>

      <div
        style={{
          marginTop:
            8,

          fontSize:
            25,

          fontWeight:
            700,

          color:
            "#111827",
        }}
      >
        {valeur}
      </div>

      {sousTexte && (
        <div
          style={{
            marginTop:
              3,

            fontSize:
              12,

            color:
              "#94a3b8",
          }}
        >
          {sousTexte}
        </div>
      )}
    </div>
  );
}

// =========================================================
// SECTION
// =========================================================

function SectionTitre({
  titre,
}: {
  titre: string;
}) {
  return (
    <h3
      style={{
        margin:
          "0 0 12px",

        fontSize:
          16,

        color:
          "#334155",
      }}
    >
      {titre}
    </h3>
  );
}

// =========================================================
// SOUS TITRE
// =========================================================

function SousTitreCarte({
  texte,
}: {
  texte: string;
}) {
  return (
    <div
      style={{
        marginTop:
          16,

        marginBottom:
          8,

        fontSize:
          12,

        fontWeight:
          700,

        color:
          "#64748b",

        textTransform:
          "uppercase",

        letterSpacing:
          "0.04em",
      }}
    >
      {texte}
    </div>
  );
}

// =========================================================
// BLOC VIDE
// =========================================================

function BlocVide({
  texte,
}: {
  texte: string;
}) {
  return (
    <div
      style={{
        ...cardStyle,

        marginBottom:
          32,

        textAlign:
          "center",

        color:
          "#64748b",

        fontSize:
          13,
      }}
    >
      {texte}
    </div>
  );
}

// Carte compacte commune aux informations du demandeur et du ticket.
function InfoBoite({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={informationBoiteStyle}>
      <div style={informationBoiteLabelStyle}>{label}</div>
      <div style={informationBoiteValeurStyle}>{value}</div>
    </div>
  );
}

// =========================================================
// INFO
// =========================================================

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        background:
          "#f8fafc",

        borderRadius:
          8,

        padding:
          11,
      }}
    >
      <div
        style={{
          fontSize:
            11,

          color:
            "#94a3b8",

          textTransform:
            "uppercase",

          marginBottom:
            4,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize:
            13,

          color:
            "#334155",

          fontWeight:
            600,

          wordBreak:
            "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// =========================================================
// INFO AVIS DID
// =========================================================

function InfoAvisDID({
  label,
  value,
  grand = false,
}: {
  label: string;
  value: string;
  grand?: boolean;
}) {
  return (
    <div
      style={{
        ...maintenanceInfoCardStyle,
        minHeight: grand ? 86 : 72,
      }}
    >
      <div
        style={maintenanceInfoLabelStyle}
      >
        {label}
      </div>

      <div
        style={maintenanceInfoValueStyle}
      >
        {value}
      </div>
    </div>
  );
}

// =========================================================
// TRACE
// =========================================================

function TraceInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize:
            11,

          textTransform:
            "uppercase",

          opacity:
            0.75,

          marginBottom:
            3,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize:
            13,

          fontWeight:
            600,
        }}
      >
        {value}
      </div>
    </div>
  );
}

// =========================================================
// BADGE
// =========================================================

function BadgeStatut({
  statut,
}: {
  statut: string;
}) {
  const map: Record<
    string,
    {
      bg: string;
      color: string;
      label: string;
    }
  > = {
    DISPONIBLE: {
      bg: "#dcfce7",
      color: "#166534",
      label: "Disponible",
    },

    EN_MISSION: {
      bg: "#dbeafe",
      color: "#1d4ed8",
      label: "En mission",
    },

    EN_MAINTENANCE: {
      bg: "#fef3c7",
      color: "#92400e",
      label: "En maintenance",
    },

    EN_ATTENTE: {
      bg: "#f1f5f9",
      color: "#475569",
      label: "En attente",
    },

    VALIDEE_N1: {
      bg: "#dcfce7",
      color: "#166534",
      label: "Validée N°1",
    },

    VALIDEE: {
      bg: "#dcfce7",
      color: "#166534",
      label: "Validée",
    },

    REFUSEE: {
      bg: "#fee2e2",
      color: "#b91c1c",
      label: "Refusée",
    },

    EN_ATTENTE_AVIS_DID: {
      bg: "#fef3c7",
      color: "#92400e",
      label: "En attente avis DID",
    },

    EN_ATTENTE_VALIDATION_N1: {
      bg: "#dbeafe",
      color: "#1d4ed8",
      label: "Avis DID reçu — validation N°1",
    },

    PLANIFIEE: {
      bg: "#dbeafe",
      color: "#1e40af",
      label: "Planifiée",
    },

    EN_COURS: {
      bg: "#e0f2fe",
      color: "#0369a1",
      label: "En cours",
    },

    CLOTUREE: {
      bg: "#dcfce7",
      color: "#166534",
      label: "Clôturée",
    },
  };

  const item =
    map[statut] || {
      bg: "#f1f5f9",
      color: "#475569",
      label: statut,
    };

  return (
    <span
      style={{
        display:
          "inline-flex",

        padding:
          "3px 9px",

        borderRadius:
          999,

        fontSize:
          11,

        fontWeight:
          700,

        background:
          item.bg,

        color:
          item.color,
      }}
    >
      {item.label}
    </span>
  );
}

// =========================================================
// NOM BENEFICIAIRE
// =========================================================

function nomBeneficiaire(
  r: Reservation
) {
  const nom =
    `${r.demandeurPrenom || ""} ${
      r.demandeurNom || ""
    }`.trim();

  if (nom) {
    return nom;
  }

  return nomUtilisateur(
    r.demandeur
  );
}

// =========================================================
// UTILISATEUR
// =========================================================

function nomUtilisateur(
  utilisateur?:
    | UtilisateurSimple
    | null
) {
  if (!utilisateur) {
    return "—";
  }

  if (
    utilisateur.nomComplet?.trim()
  ) {
    return utilisateur.nomComplet.trim();
  }

  const nom =
    `${utilisateur.prenom || ""} ${
      utilisateur.nom || ""
    }`.trim();

  return (
    nom ||
    utilisateur.numMatricule ||
    utilisateur.matricule ||
    utilisateur.email ||
    "—"
  );
}

// =========================================================
// CHAUFFEUR
// =========================================================

function nomChauffeur(
  chauffeur:
    | Chauffeur
    | ChauffeurDisponible
) {
  const nom =
    `${chauffeur.prenom || ""} ${
      chauffeur.nom || ""
    }`.trim();

  return (
    nom ||
    chauffeur.matricule ||
    `Chauffeur #${chauffeur.id}`
  );
}

function libelleChauffeur(
  chauffeur: ChauffeurDisponible
) {
  const nom =
    nomChauffeur(
      chauffeur
    );

  return chauffeur.matricule
    ? `${nom} — ${chauffeur.matricule}`
    : nom;
}

// =========================================================
// VEHICULE
// =========================================================

function libelleVehicule(
  vehicule: Vehicule
) {
  const modele =
    vehicule.modeleType?.trim();

  const type =
    vehicule.typeVehicule?.trim();

  const details =
    [
      modele,
      type
        ? formaterTypeVehicule(
            type
          )
        : null,
    ].filter(Boolean);

  return details.length > 0
    ? `${vehicule.immatriculation} — ${details.join(
        " — "
      )}`
    : vehicule.immatriculation;
}

function libelleVehiculeDisponible(
  vehicule: VehiculeDisponible
) {
  const modele =
    vehicule.modeleType ||
    vehicule.categorie ||
    "";

  const type =
    vehicule.typeVehicule
      ? formaterTypeVehicule(
          vehicule.typeVehicule
        )
      : "";

  const details =
    [
      modele,
      type,
    ].filter(Boolean);

  return details.length > 0
    ? `${vehicule.immatriculation} — ${details.join(
        " — "
      )}`
    : vehicule.immatriculation;
}

// =========================================================
// TYPE VEHICULE
// =========================================================

function formaterTypeVehicule(
  type?: string | null
) {
  if (!type) {
    return "Aucun type particulier";
  }

  const valeur =
    type
      .trim()
      .toUpperCase();

  const map: Record<
    string,
    string
  > = {
    BERLINE: "Berline",
    "4X4": "4x4",
    UTILITAIRE:
      "Utilitaire",
    MINIBUS: "Minibus",
    AUTRE: "Autre",
  };

  return (
    map[valeur] ||
    type
  );
}

// =========================================================
// DATES
// =========================================================

function formaterDate(
  date?: string | null
) {
  if (!date) {
    return "—";
  }

  const valeur =
    new Date(date);

  if (
    Number.isNaN(
      valeur.getTime()
    )
  ) {
    return date;
  }

  return valeur.toLocaleString(
    "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function formaterDateCourte(
  date: string
) {
  if (!date) {
    return "—";
  }

  const valeur =
    new Date(date);

  if (
    Number.isNaN(
      valeur.getTime()
    )
  ) {
    return date;
  }

  return valeur.toLocaleDateString(
    "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  );
}

// =========================================================
// NOMBRE
// =========================================================

function formatNombre(
  nombre: number
) {
  return Number(
    nombre || 0
  ).toLocaleString(
    "fr-FR",
    {
      maximumFractionDigits:
        1,
    }
  );
}

// =========================================================
// STYLES
// =========================================================

const COULEURS_BOUTONS = {
  ROUGE: "#dc2626",
  BLEU: "#2563eb",
  VERT: "#15803d",
} as const;

const navigationModulesStyle: CSSProperties = {
  display: "flex",
  alignItems: "stretch",
  flexWrap: "wrap",
  gap: 7,
  padding: 8,
  marginBottom: 16,
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
};

function styleOnglet(actif: boolean, teinte: keyof typeof COULEURS_BOUTONS): CSSProperties {
  const couleur = COULEURS_BOUTONS[teinte];
  return {
    ...boutonSecondaire,
    backgroundColor: couleur,
    color: "#ffffff",
    border: `1px solid ${couleur}`,
    boxShadow: actif ? `0 3px 9px ${couleur}45, 0 0 0 2px #ffffff inset` : `0 2px 6px ${couleur}22`,
    opacity: actif ? 1 : 0.88,
    padding: "7px 11px",
    justifyContent: "center",
    flex: "0 1 auto",
    minHeight: 34,
    maxWidth: "100%",
    fontSize: 12,
    transition: "background-color 160ms ease, box-shadow 160ms ease",
  };
}

const headerStyle:
  CSSProperties = {
  display:
    "flex",

  justifyContent:
    "space-between",

  alignItems:
    "center",

  gap: 16,

  marginBottom:
    24,

  flexWrap:
    "wrap",
};

const sectionHeaderStyle:
  CSSProperties = {
  display:
    "flex",

  justifyContent:
    "space-between",

  alignItems:
    "center",

  gap: 12,

  marginTop:
    30,

  marginBottom:
    12,

  flexWrap:
    "wrap",
};

const kpiGridStyle:
  CSSProperties = {
  display:
    "grid",

  gridTemplateColumns:
    "repeat(auto-fit, minmax(210px, 1fr))",

  gap: 14,

  marginBottom:
    30,
};

const cardStyle:
  CSSProperties = {
  background:
    "white",

  border:
    "1px solid #e5e7eb",

  borderRadius:
    10,

  padding:
    16,
};

// =========================================================
// TICKETS COMPACTS — PRESENTATION UNIQUEMENT
// =========================================================

const ticketCompactCardStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: "18px 20px",
  color: "#1e293b",
  boxShadow: "0 3px 12px rgba(0, 0, 0, 0.08)",
};

const ticketCompactTitleRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 10,
};

const ticketCompactTitleStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: "#1e293b",
};

const ticketCompactSubtitleStyle: CSSProperties = {
  fontSize: 15,
  lineHeight: 1.5,
  color: "#475569",
  overflowWrap: "anywhere",
};

const ticketCompactBottomStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginTop: 13,
};

const ticketCompactMetaStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  fontSize: 12,
  color: "#64748b",
};

const ticketCompactUrgentStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  color: "#b91c1c",
  fontWeight: 600,
};

const ticketCompactButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  padding: "8px 15px",
  background: "#2563eb",
  border: "1px solid #1d4ed8",
  borderRadius: 999,
  color: "#ffffff",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
};

const ticketDetailsStyle: CSSProperties = {
  marginTop: 16,
  padding: "16px 18px 18px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  color: "#334155",
};

const filtersStyle:
  CSSProperties = {
  display:
    "flex",

  gap: 10,

  marginBottom:
    16,

  flexWrap:
    "wrap",
};

// Grille de cartes compactes, responsive et identique dans les deux sections.
const informationBoitesStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 205px), 1fr))",
  gap: 10,
};

const informationBoiteStyle: CSSProperties = {
  minWidth: 0,
  border: "1px solid #e2e8f0",
  borderRadius: 9,
  backgroundColor: "#ffffff",
  padding: "11px 13px",
};

const informationBoiteLabelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "#64748b",
  textTransform: "uppercase",
  marginBottom: 5,
};

const informationBoiteValeurStyle: CSSProperties = {
  whiteSpace: "pre-wrap",
  fontSize: 13,
  fontWeight: 600,
  color: "#334155",
  overflowWrap: "anywhere",
};

const infoGridStyle:
  CSSProperties = {
  display:
    "grid",

  gridTemplateColumns:
    "repeat(auto-fit, minmax(210px, 1fr))",

  gap: 10,
};

const affectationGridStyle:
  CSSProperties = {
  display:
    "grid",

  gridTemplateColumns:
    "repeat(auto-fit, minmax(280px, 1fr))",

  gap: 12,

  marginTop:
    14,
};

const traceGridStyle:
  CSSProperties = {
  display:
    "grid",

  gridTemplateColumns:
    "repeat(auto-fit, minmax(180px, 1fr))",

  gap: 12,

  marginTop: 12,
};

const warningBoxStyle:
  CSSProperties = {
  marginTop: 12,

  padding: 12,

  border:
    "1px solid #fed7aa",

  background:
    "#fff7ed",

  borderRadius: 8,

  color: "#9a3412",

  fontSize: 13,
};

const warningAvailabilityStyle:
  CSSProperties = {
  marginTop: 10,

  padding: 12,

  border:
    "1px solid #fed7aa",

  background:
    "#fff7ed",

  borderRadius: 8,

  color: "#9a3412",

  fontSize: 13,

  lineHeight: 1.5,
};

const successBoxStyle:
  CSSProperties = {
  marginTop: 10,

  padding: 12,

  border:
    "1px solid #bbf7d0",

  background:
    "#f0fdf4",

  borderRadius: 8,

  color: "#166534",

  fontSize: 13,

  lineHeight: 1.5,
};

const errorBoxStyle:
  CSSProperties = {
  marginTop: 10,

  padding: 12,

  border:
    "1px solid #fecaca",

  background:
    "#fef2f2",

  borderRadius: 8,

  color: "#991b1b",

  fontSize: 13,

  lineHeight: 1.5,
};

const infoBoxBleuStyle:
  CSSProperties = {
  marginTop: 10,

  padding: 12,

  border:
    "1px solid #bfdbfe",

  background:
    "#eff6ff",

  borderRadius: 8,

  color: "#1e40af",

  fontSize: 13,

  lineHeight: 1.5,
};

const urgentBadgeStyle:
  CSSProperties = {
  display:
    "inline-flex",

  alignItems:
    "center",

  gap: 5,

  padding:
    "3px 8px",

  borderRadius:
    999,

  background:
    "#fee2e2",

  color:
    "#b91c1c",

  fontSize: 11,

  fontWeight: 700,
};

const detailBoxStyle:
  CSSProperties = {
  marginTop: 10,

  padding: 11,

  background:
    "#f8fafc",

  borderRadius: 8,
};

const detailLabelStyle:
  CSSProperties = {
  fontSize: 11,

  color:
    "#94a3b8",

  textTransform:
    "uppercase",

  marginBottom: 5,
};

const detailValueStyle:
  CSSProperties = {
  fontSize: 13,

  color:
    "#334155",

  lineHeight: 1.5,
};

const maintenanceAvisCardStyle: CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 18,
  boxShadow: "0 2px 10px rgba(15, 23, 42, 0.04)",
};

const maintenanceAvisHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 10,
};

const maintenanceAvisBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 11px",
  borderRadius: 999,
  background: "#dbeafe",
  color: "#1d4ed8",
  fontSize: 12,
  fontWeight: 700,
};

const maintenancePendingBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "5px 9px",
  borderRadius: 999,
  background: "#fef3c7",
  color: "#92400e",
  fontSize: 11,
  fontWeight: 700,
};

const maintenanceReservationStyle: CSSProperties = {
  fontSize: 12,
  color: "#64748b",
  fontWeight: 500,
};

const maintenanceNatureStyle: CSSProperties = {
  marginBottom: 14,
  color: "#334155",
  fontSize: 14,
  fontWeight: 600,
  lineHeight: 1.45,
};

const maintenanceMissionGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: 10,
  marginBottom: 10,
};

const maintenanceDiagnosticGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 10,
};

const maintenanceInfoCardStyle: CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #eef2f7",
  borderRadius: 10,
  padding: "11px 12px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

const maintenanceInfoLabelStyle: CSSProperties = {
  marginBottom: 6,
  color: "#8aa0c6",
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.035em",
};

const maintenanceInfoValueStyle: CSSProperties = {
  color: "#172554",
  fontSize: 13,
  fontWeight: 600,
  lineHeight: 1.45,
  wordBreak: "break-word",
};

const maintenanceFooterStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: 16,
  flexWrap: "wrap",
  marginTop: 14,
  paddingTop: 12,
  borderTop: "1px solid #eef2f7",
};

const maintenanceMetaStyle: CSSProperties = {
  display: "flex",
  gap: 22,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const maintenanceMetaLabelStyle: CSSProperties = {
  display: "block",
  marginBottom: 3,
  color: "#94a3b8",
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.03em",
};

const maintenanceMetaValueStyle: CSSProperties = {
  display: "block",
  color: "#475569",
  fontSize: 11,
  fontWeight: 600,
};

const maintenanceActionButtonsStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: 9,
  flexWrap: "wrap",
};

const maintenanceAutonomeInfoStyle: CSSProperties = {
  marginTop: 10,
  padding: "8px 10px",
  borderRadius: 8,
  background: "#f8fafc",
  color: "#64748b",
  fontSize: 11,
};

const maintenanceChauffeurSelectStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  border: "1px solid #cbd5e1",
  borderRadius: 7,
  background: "white",
  color: "#172554",
  fontSize: 12,
  fontWeight: 600,
  outline: "none",
};


const boutonPremiereValidation: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "7px 10px",
  border: "1px solid #15803d",
  borderRadius: 8,
  background: "#15803d",
  color: "white",
  fontSize: 13,
  fontWeight: 700,
};

const actionsStyle:
  CSSProperties = {
  display:
    "flex",

  justifyContent:
    "flex-end",

  gap: 8,

  flexWrap:
    "wrap",

  marginTop: 14,

  paddingTop: 12,

  borderTop:
    "1px solid #f1f5f9",
};

const labelStyle:
  CSSProperties = {
  display:
    "block",

  fontSize: 12,

  color:
    "#374151",

  marginBottom: 5,

  fontWeight: 600,
};

const inputStyle:
  CSSProperties = {
  width: "100%",

  padding:
    "9px 11px",

  border:
    "1px solid #d1d5db",

  borderRadius: 7,

  fontSize: 13,

  color: "#111827",

  background: "white",

  boxSizing:
    "border-box",
};

const boutonSecondaire:
  CSSProperties = {
  display:
    "inline-flex",

  alignItems:
    "center",

  gap: 7,

  padding:
    "7px 10px",

  border:
    "1px solid #2563eb",

  borderRadius: 8,

  background: "#2563eb",

  color: "#ffffff",

  fontSize: 12,

  fontWeight: 600,

  cursor: "pointer",
};

function boutonPrimaire(
  disabled: boolean
): CSSProperties {
  return {
    display:
      "inline-flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    gap: 7,

    padding:
      "7px 10px",

    border: "none",

    borderRadius: 8,

    background:
      "#dc2626",

    color: "white",

    fontSize: 13,

    fontWeight: 600,

    cursor:
      disabled
        ? "not-allowed"
        : "pointer",

    opacity:
      disabled ? 0.5 : 1,
  };
}

const boutonValider:
  CSSProperties = {
  display:
    "inline-flex",

  alignItems:
    "center",

  gap: 6,

  padding:
    "7px 10px",

  border:
    "1px solid #15803d",

  borderRadius: 8,

  background:
    "#15803d",

  color:
    "#ffffff",

  fontSize: 13,

  fontWeight: 600,
};

const boutonRefuser:
  CSSProperties = {
  display:
    "inline-flex",

  alignItems:
    "center",

  gap: 6,

  padding:
    "7px 10px",

  border:
    "1px solid #dc2626",

  borderRadius: 8,

  background:
    "#dc2626",

  color:
    "#ffffff",

  fontSize: 13,

  fontWeight: 600,
};

const tableCardStyle:
  CSSProperties = {
  background:
    "white",

  border:
    "1px solid #e5e7eb",

  borderRadius:
    10,

  overflowX:
    "auto",

  marginBottom:
    30,
};

const tableStyle:
  CSSProperties = {
  width: "100%",

  borderCollapse:
    "collapse",

  minWidth:
    650,
};

const theadRowStyle:
  CSSProperties = {
  background:
    "#ffffff",

  borderBottom:
    "1px solid #e5e7eb",
};

const trStyle:
  CSSProperties = {
  borderBottom:
    "1px solid #f1f5f9",
};

const thStyle:
  CSSProperties = {
  textAlign: "left",

  padding:
    "12px 14px",

  fontSize: 11,

  textTransform:
    "uppercase",

  letterSpacing:
    "0.04em",

  color:
    "#1e293b",
};

const tdStyle:
  CSSProperties = {
  padding:
    "12px 14px",

  fontSize: 13,

  color:
    "#334155",
};

const modalOverlayStyle:
  CSSProperties = {
  position:
    "fixed",

  inset: 0,

  background:
    "rgba(15, 23, 42, 0.45)",

  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "center",

  padding: 20,

  zIndex: 1000,
};

const modalStyle:
  CSSProperties = {
  width: "100%",

  maxWidth: 520,

  background:
    "white",

  borderRadius:
    12,

  border:
    "1px solid #e5e7eb",

  padding: 20,

  boxShadow:
    "0 20px 45px rgba(15, 23, 42, 0.18)",
};
// Etats de l'avis DID visibles directement sur la carte du ticket.
const ticketAvisDefavorableBadgeStyle: CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 5,
  border: "1px solid #fecaca", background: "#fff1f2", color: "#b91c1c",
  borderRadius: 999, padding: "4px 9px", fontSize: 11, fontWeight: 700,
};
const ticketAvisFavorableBadgeStyle: CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 5,
  border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#166534",
  borderRadius: 999, padding: "4px 9px", fontSize: 11, fontWeight: 700,
};
