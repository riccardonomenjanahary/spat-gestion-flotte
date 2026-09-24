"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import dynamic from "next/dynamic";

import RoleGuard from "@/components/RoleGuard";
import EnTete from "@/components/EnTete";
import { ROLES } from "@/app/lib/roles";
import { toast } from "sonner";

import {
  AlertTriangle,
  Car,
  CheckCircle2,
  ChevronDown,
  Clock,
  ClipboardList,
  Download,
  Eye,
  Fuel,
  MapPin,
  Navigation,
  PlusCircle,
  RefreshCw,
  Route,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  X,
  Zap,
} from "lucide-react";

const FlotteMap = dynamic(
  () => import("@/components/FlotteMap"),
  { ssr: false }
);


// TYPES


interface Vehicule {
  id: number;
  immatriculation: string;

  // Compatibilité avec les différentes versions du modèle
  marque?: string | null;
  modele?: string | null;

  categorie?: string | null;
  modeleType?: string | null;
  typeVehicule?: string | null;

  annee?: number | null;
  affectation?: string | null;

  statut: string;

  gpsEquipe?: boolean | null;
  gpsDeviceId?: number | null;
}

interface GpsPosition {
  vehiculeId: number;
  immatriculation: string;
  gpsDeviceId: number;
  nomGps?: string | null;
  latitude: number | null;
  longitude: number | null;
  vitesse?: number | null;
  course?: number | null;
  altitude?: number | null;
  statutGps?: string | null;
  dateGps?: string | null;
  timestampGps?: number | null;
  odometreKm?: number | null;
  distanceTotale?: number | null;
  derniereReceptionSpat?: number | null;
}

// Contrat attendu du backend SPAT pour les relevés conservés dans le temps.
interface GpsReleveHistorique {
  id?: string | number;
  vehiculeId?: number;
  dateGps?: string | null;
  timestampGps?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  vitesse?: number | null;
  altitude?: number | null;
  course?: number | null;
  odometreKm?: number | null;
}

type VueSuiviGps = "CARTE" | "HISTORIQUE" | "JOURNAL";

interface Chauffeur {
  id: number;
  matricule?: string | null;
  nom?: string | null;
  prenom?: string | null;
  telephone?: string | null;
  email?: string | null;
  statut?: string | null;
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

  typeDemande?: "PLANIFIEE" | "TARDIVE" | "URGENTE" | null;
  horsDelai24h?: boolean | null;

  mobilisabilite?: "FLEXIBLE" | "VERROUILLEE" | null;
  zoneMission?: "VILLE_TOAMASINA" | "HORS_TOAMASINA" | null;

  modeCreation?: "NORMAL" | "EXPRESS" | null;
  aRegulariser?: boolean | null;
  demandeExpressPar?: string | null;

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

  dateValidationN1?: string | null;
  dateValidationN2?: string | null;
}

interface ChangementDerniereMinute {
  id: number;
  ticketInitialId: number;
  ticketUrgentId: number;
  agentMatricule: string;
  sousCategorie: string;
  motifUrgence: string;
  dateChangement: string;
}

interface TransactionCarburant {
  id: string;

  vehicule?: Vehicule | null;

  type: "DOTATION" | "CONSOMMATION" | string;

  quantiteLitres: number;
  dateOperation: string;

  prixUnitaire?: number | null;
  montantTotal?: number | null;

  kilometrage?: number | null;

  station?: string | null;
  fournisseur?: string | null;

  mission?: string | null;

  justificatif?: string | null;

  observation?: string | null;

  chauffeur?: Chauffeur | null;

  statut?: string | null;
}

interface Assurance {
  id: string | number;

  vehicule?: Vehicule | null;

  numeroPolice?: string | null;

  // Champs déjà utilisés / compatibilité backend
  dateExpiration?: string | null;
  dateEcheance?: string | null;
  dateFin?: string | null;

  // Champs complémentaires du dossier assurance.
  // Ils restent optionnels afin de rester compatibles avec
  // les versions actuelles du backend.
  dateDebut?: string | null;
  assureur?: string | null;
  typeCouverture?: string | null;
  montantPrime?: number | null;
  observation?: string | null;
  documentPolice?: string | null;
  pieceJointe?: string | null;

  statut?: string | null;

  dateCreation?: string | null;
  dateModification?: string | null;
  agentEmail?: string | null;
  auteurEmail?: string | null;
}

interface Sinistre {
  id: string | number;

  vehicule?: Vehicule | null;

  dateSinistre?: string | null;
  date?: string | null;
  dateDeclaration?: string | null;
  dateCloture?: string | null;

  conducteur?: string | null;

  circonstance?: string | null;
  description?: string | null;

  // Compatibilité avec un backend enrichi pour le constat amiable.
  numeroDossier?: string | null;
  constatAmiable?: string | null;
  constat?: string | null;
  constatUrl?: string | null;
  lieu?: string | null;
  observation?: string | null;

  statut?: string | null;

  agentEmail?: string | null;
  auteurEmail?: string | null;
}

type Onglet =
  | "SUIVI"
  | "DEMANDES"
  | "CARBURANT"
  | "ASSURANCES";

// =========================================================
// PAGE
// =========================================================

export default function AgentFlottePage() {
  return (
    <RoleGuard role={ROLES.AGENT_FLOTTE}>
      <AgentFlotteContent />
    </RoleGuard>
  );
}

// =========================================================
// CONTENU
// =========================================================

function AgentFlotteContent() {
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [onglet, setOnglet] = useState<Onglet>("SUIVI");
  const [afficherHistoriqueMissions, setAfficherHistoriqueMissions] = useState(false);
  const [urgenceZoneMission, setUrgenceZoneMission] = useState<"VILLE_TOAMASINA" | "HORS_TOAMASINA" | "">("");
  const [urgenceTicket, setUrgenceTicket] = useState<Reservation | null>(null);
  const [urgenceEnCours, setUrgenceEnCours] = useState(false);
  const [confirmeDerogationVerrouillage, setConfirmeDerogationVerrouillage] = useState(false);
  const [urgenceSousCategorie, setUrgenceSousCategorie] = useState("URGENCE_OPERATIONNELLE");
  const [urgenceMotif, setUrgenceMotif] = useState("");
  const [urgenceObjet, setUrgenceObjet] = useState("");
  const [urgenceDepart, setUrgenceDepart] = useState("");
  const [urgenceFin, setUrgenceFin] = useState("");
  const [urgencePointDepart, setUrgencePointDepart] = useState("");
  const [urgenceDestination, setUrgenceDestination] = useState("");
  const [tracesUrgence, setTracesUrgence] = useState<ChangementDerniereMinute[]>([]);


  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [transactions, setTransactions] =
    useState<TransactionCarburant[]>([]);
  const [assurances, setAssurances] = useState<Assurance[]>([]);
  const [sinistres, setSinistres] = useState<Sinistre[]>([]);

  const [chargement, setChargement] = useState(true);

  const [positionsGps, setPositionsGps] = useState<GpsPosition[]>([]);
  const [erreurGps, setErreurGps] = useState<string | null>(null);
  const [derniereMajGps, setDerniereMajGps] = useState<Date | null>(null);

  // =========================================================
  // CARBURANT
  // =========================================================

const [carbVehiculeId, setCarbVehiculeId] = useState("");

const [carbType, setCarbType] =
  useState<"DOTATION" | "CONSOMMATION">("CONSOMMATION");

const [carbQuantite, setCarbQuantite] = useState("");

const [carbDate, setCarbDate] = useState(() =>
  new Date().toISOString().slice(0, 10)
);

const [carbPrixUnitaire, setCarbPrixUnitaire] =
  useState("");

const [carbKilometrage, setCarbKilometrage] =
  useState("");

const [carbStation, setCarbStation] =
  useState("");


const [carbJustificatif, setCarbJustificatif] =
  useState("");

const [carbObservation, setCarbObservation] =
  useState("");

const [envoiCarburant, setEnvoiCarburant] =
  useState(false);

const [carbRecherche, setCarbRecherche] =
  useState("");

const [carbFiltreVehicule, setCarbFiltreVehicule] =
  useState("");

const [carbFiltreType, setCarbFiltreType] =
  useState("");

const [carbFiltreJustificatif, setCarbFiltreJustificatif] =
  useState("");

const [carbPeriode, setCarbPeriode] =
  useState<"TOUT" | "MOIS" | "30J">("MOIS");

  // =========================================================
  // ASSURANCE
  // =========================================================

  const [assVehiculeId, setAssVehiculeId] = useState("");
  const [assNumeroPolice, setAssNumeroPolice] = useState("");
  const [assDateDebut, setAssDateDebut] = useState("");
  const [assDateExpiration, setAssDateExpiration] = useState("");
  const [assAssureur, setAssAssureur] = useState("");
  const [assTypeCouverture, setAssTypeCouverture] = useState("");
  const [assMontantPrime, setAssMontantPrime] = useState("");
  const [assObservation, setAssObservation] = useState("");
  const [assDocumentPolice, setAssDocumentPolice] = useState("");

  const [envoiAssurance, setEnvoiAssurance] = useState(false);
  const [assuranceEditionId, setAssuranceEditionId] =
    useState<string | number | null>(null);

  const [assRecherche, setAssRecherche] = useState("");
  const [assFiltreVehicule, setAssFiltreVehicule] = useState("");
  const [assFiltreEtat, setAssFiltreEtat] =
    useState<"TOUS" | "VALIDES" | "J15" | "EXPIREES">("TOUS");

  // =========================================================
  // SINISTRE
  // =========================================================

  const [sinVehiculeId, setSinVehiculeId] = useState("");

  const [sinDate, setSinDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

  const [sinConducteur, setSinConducteur] = useState("");
  const [sinCirconstance, setSinCirconstance] = useState("");
  const [sinDescription, setSinDescription] = useState("");
  const [sinConstatAmiable, setSinConstatAmiable] = useState("");

  const [envoiSinistre, setEnvoiSinistre] = useState(false);

  const [sinRecherche, setSinRecherche] = useState("");
  const [sinFiltreVehicule, setSinFiltreVehicule] = useState("");
  const [sinFiltreStatut, setSinFiltreStatut] = useState("TOUS");
  const [sinDossierOuvert, setSinDossierOuvert] =
    useState<string | number | null>(null);

  // =========================================================
  // TOKEN
  // =========================================================

  const getToken = () => {
    if (typeof window === "undefined") return null;

    return localStorage.getItem("token");
  };

  // =========================================================
  // FETCH
  // =========================================================

  const fetchListe = async <T,>(
    url: string,
    token: string
  ): Promise<T[]> => {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const message = await res.text().catch(() => "");

      throw new Error(
        `${res.status} ${message}`.trim()
      );
    }

    const data = await res.json();

    return Array.isArray(data) ? data : [];
  };

  const fetchOptionnel = async <T,>(
    url: string,
    token: string
  ): Promise<T[]> => {
    try {
      return await fetchListe<T>(url, token);
    } catch (error) {
      console.warn(
        "Module non disponible :",
        url,
        error
      );

      return [];
    }
  };

  // =========================================================
  // CHARGEMENT
  // =========================================================

  const chargerTracesUrgence = async () => {
    const token = getToken();
    if (!API || !token) return;
    try {
      const res = await fetch(`${API}/agent-flotte/urgences-derniere-minute`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
      });
      if (res.ok) {
        const donnees: unknown = await res.json();
        if (Array.isArray(donnees)) setTracesUrgence(donnees as ChangementDerniereMinute[]);
      }
    } catch (e) { console.warn("Historique des urgences momentanément indisponible", e); }
  };

  const ouvrirUrgence = (r: Reservation) => {
    setUrgenceTicket(r);
    setConfirmeDerogationVerrouillage(false);
    setUrgenceZoneMission(r.zoneMission === "VILLE_TOAMASINA" || r.zoneMission === "HORS_TOAMASINA" ? r.zoneMission : "");
    setUrgenceSousCategorie("URGENCE_OPERATIONNELLE");
    setUrgenceMotif("");
    setUrgenceObjet("");
    setUrgencePointDepart(r.pointDepart || "");
    setUrgenceDestination(r.destination || "");
    const maintenant = new Date();
    const fin = new Date(maintenant.getTime() + 60 * 60 * 1000);
    const local = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}T${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
    setUrgenceDepart(local(maintenant));
    setUrgenceFin(local(fin));
  };

  const soumettreUrgence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urgenceTicket || urgenceEnCours || !API) return;
    const token = getToken();
    if (!token) { toast.error("Session expirée."); return; }
    if (!urgenceZoneMission) { toast.error("Sélectionnez la zone du nouveau trajet."); return; }
    if (urgenceTicket.mobilisabilite === "VERROUILLEE" && !confirmeDerogationVerrouillage) {
      toast.error("Confirmez explicitement la dérogation pour la mission verrouillée."); return;
    }
    if (!urgenceMotif.trim() || !urgenceObjet.trim() || !urgencePointDepart.trim() || !urgenceDestination.trim()
        || !urgenceDepart || !urgenceFin || new Date(urgenceFin) <= new Date(urgenceDepart)) {
      toast.error("Complétez les informations et vérifiez les dates."); return;
    }
    const avertissement = urgenceTicket.mobilisabilite === "VERROUILLEE"
      ? "DÉROGATION EXCEPTIONNELLE : la mission initiale est VERROUILLÉE. Son véhicule et son chauffeur seront réaffectés. "
      : "";
    if (!window.confirm(`${avertissement}Créer la mission urgente et mettre le ticket TKT-${String(urgenceTicket.id).padStart(5,"0")} à reprogrammer ? Le demandeur initial et le chauffeur seront informés.`)) return;
    setUrgenceEnCours(true);
    try {
      const res = await fetch(`${API}/agent-flotte/tickets/${urgenceTicket.id}/urgence-derniere-minute`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          sousCategorie: urgenceSousCategorie, motifUrgence: urgenceMotif.trim(), motif: urgenceObjet.trim(),
          dateDebut: `${urgenceDepart}:00`, dateFin: `${urgenceFin}:00`,
          pointDepart: urgencePointDepart.trim(), destination: urgenceDestination.trim(),
          zoneMission: urgenceZoneMission,
          derogationMissionVerrouillee: urgenceTicket.mobilisabilite === "VERROUILLEE" && confirmeDerogationVerrouillage,
        }),
      });
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || `Erreur HTTP ${res.status}`);
      const resultat: {ticketUrgentId?: number} = await res.json();
      toast.success(`Mission urgente TKT-${String(resultat.ticketUrgentId ?? "").padStart(5,"0")} créée. Le ticket initial est à reprogrammer.`);
      setUrgenceTicket(null);
      await Promise.all([charger(), chargerTracesUrgence()]);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Impossible de créer la mission urgente."); }
    finally { setUrgenceEnCours(false); }
  };

  const charger = async () => {
    if (!API) {
      toast.error(
        "NEXT_PUBLIC_API_URL n'est pas configurée."
      );

      setChargement(false);
      return;
    }

    const token = getToken();

    if (!token) {
      toast.error(
        "Session expirée. Veuillez vous reconnecter."
      );

      setChargement(false);
      return;
    }

    setChargement(true);

    try {
      /*
       * Données principales réellement présentes
       * dans le système.
       */
      const [v, r, c] = await Promise.all([
        fetchListe<Vehicule>(
          `${API}/vehicules`,
          token
        ),

        fetchListe<Reservation>(
          `${API}/reservations`,
          token
        ),

        fetchListe<TransactionCarburant>(
          `${API}/carburant`,
          token
        ),
      ]);

      setVehicules(v);
      setReservations(r);
      setTransactions(c);

      /*
       * Ces deux modules restent optionnels
       * pour éviter de bloquer toute la page
       * s'ils ne sont pas disponibles.
       */
      const [a, s] = await Promise.all([
        fetchOptionnel<Assurance>(
          `${API}/assurances`,
          token
        ),

        fetchOptionnel<Sinistre>(
          `${API}/sinistres`,
          token
        ),
      ]);

      setAssurances(a);
      setSinistres(s);
    } catch (error) {
      console.error(
        "Erreur chargement Agent Flotte :",
        error
      );

      toast.error(
        "Impossible de charger les données de la flotte."
      );
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    charger();
    void chargerTracesUrgence();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Les statuts des missions sont rafraîchis indépendamment de la carte GPS.
  // La notification persistante doit être créée côté backend par la clôture.
  useEffect(() => {
    if (!API) return;
    let actif = true;
    let requeteEnCours = false;
    const actualiserStatutsMissions = async () => {
      if (!actif || requeteEnCours) return;
      const token = getToken();
      if (!token) return;
      requeteEnCours = true;
      try {
        const res = await fetch(`${API}/reservations`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) return;
        const data: unknown = await res.json();
        if (actif && Array.isArray(data)) setReservations(data as Reservation[]);
      } catch (error) {
        console.warn("Actualisation des statuts de missions indisponible :", error);
      } finally {
        requeteEnCours = false;
      }
    };
    const interval = window.setInterval(actualiserStatutsMissions, 15000);
    return () => {
      actif = false;
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API]);

  // =========================================================
  // GPS - SYNCHRONISATION TOUTES LES 5 SECONDES
  // =========================================================

  useEffect(() => {
    if (!API) return;

    let actif = true;

    const chargerPositionsGps = async () => {
      const token = getToken();

      if (!token) {
        if (actif) {
          setErreurGps("Session expirée. Reconnexion nécessaire.");
        }
        return;
      }

      try {
        const res = await fetch(`${API}/gps/positions`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          cache: "no-store",
        });

        if (!res.ok) {
          const message = await res.text().catch(() => "");
          throw new Error(
            `${res.status} ${message || "Impossible de charger les positions GPS."}`.trim()
          );
        }

        const data: unknown = await res.json();

        if (!Array.isArray(data)) {
          throw new Error("Format de réponse GPS invalide.");
        }

        if (actif) {
          setPositionsGps(data as GpsPosition[]);
          setErreurGps(null);
          setDerniereMajGps(new Date());
        }
      } catch (error) {
        console.error("Erreur GPS Agent Flotte :", error);

        if (actif) {
          setErreurGps(
            error instanceof Error
              ? error.message
              : "Impossible de charger les positions GPS."
          );
        }
      }
    };

    chargerPositionsGps();

    const interval = window.setInterval(chargerPositionsGps, 5000);

    return () => {
      actif = false;
      window.clearInterval(interval);
    };
  }, [API]);

  const gpsParVehicule = useMemo(() => {
    const map = new Map<number, GpsPosition>();

    positionsGps.forEach((position) => {
      if (position.vehiculeId != null) {
        map.set(position.vehiculeId, position);
      }
    });

    return map;
  }, [positionsGps]);

  // =========================================================
  // MISSIONS ACTIVES
  // =========================================================

  const missionsActives = useMemo(() => {
    const maintenant = Date.now();

    return reservations.filter((reservation) => {
      if (
        reservation.statut !== "VALIDEE" ||
        !reservation.vehicule
      ) {
        return false;
      }

      const debut =
        new Date(reservation.dateDebut).getTime();

      const fin =
        new Date(reservation.dateFin).getTime();

      return (
        Number.isFinite(debut) &&
        Number.isFinite(fin) &&
        maintenant >= debut &&
        maintenant <= fin
      );
    });
  }, [reservations]);

  // Missions explicitement terminees ou cloturees : une date de fin passee
  // ne prouve pas, a elle seule, qu'une mission est terminee.
  const historiqueMissions = useMemo(
    () => reservations
      .filter((r) => ["TERMINEE", "CLOTUREE"].includes(
        String(r.statut || "").trim().toUpperCase()
      ))
      .slice()
      .sort((a, b) => {
        const dateA = new Date(a.dateFin).getTime();
        const dateB = new Date(b.dateFin).getTime();
        const difference = (Number.isFinite(dateB) ? dateB : 0)
          - (Number.isFinite(dateA) ? dateA : 0);
        return difference || b.id - a.id;
      }),
    [reservations]
  );

  const changementsParTicket = useMemo(() => {
    const liens = new Map<number, ChangementDerniereMinute>();
    tracesUrgence.forEach((c) => {
      liens.set(c.ticketInitialId, c);
      liens.set(c.ticketUrgentId, c);
    });
    return liens;
  }, [tracesUrgence]);
  // Afficher l'action même lorsqu'elle est indisponible : l'agent doit
  // comprendre précisément pourquoi le bouton ne peut pas être utilisé.
  // Les mêmes conditions métier sont également contrôlées côté backend.
  const raisonUrgenceIndisponible = (r: Reservation): string | null => {
    if (changementsParTicket.has(r.id)) {
      return "Un changement de dernière minute est déjà enregistré pour ce ticket.";
    }
    if (r.statut !== "VALIDEE") {
      return "La mission doit d’abord être validée au niveau 2.";
    }
    // FLEXIBLE : circuit normal ; VERROUILLEE : dérogation explicite dans le formulaire.
    if (r.mobilisabilite && !["FLEXIBLE", "VERROUILLEE"].includes(r.mobilisabilite)) {
      return "Mobilisabilité non reconnue : vérifiez le ticket avec le service logistique.";
    }
    if (!r.vehicule || !r.chauffeur) {
      return "Un véhicule et un chauffeur doivent être affectés à cette mission.";
    }
    const depart = new Date(r.dateDebut).getTime();
    if (!Number.isFinite(depart)) {
      return "Date de départ invalide : vérifiez les informations de la mission.";
    }
    if (depart <= Date.now()) {
      return "Le départ initial a déjà eu lieu : ce circuit ne s’applique plus.";
    }
    return null;
  };
  const urgencePossible = (r: Reservation) => raisonUrgenceIndisponible(r) === null;

  // La vue normale conserve TOUS les tickets, y compris les archives.
  const ticketsAffiches = afficherHistoriqueMissions
    ? historiqueMissions
    : reservations;

  // =========================================================
  // MAP MISSIONS PAR VEHICULE
  // =========================================================

  const missionParVehicule = useMemo(() => {
    const map = new Map<number, Reservation>();

    missionsActives.forEach((mission) => {
      if (mission.vehicule?.id) {
        map.set(
          mission.vehicule.id,
          mission
        );
      }
    });

    return map;
  }, [missionsActives]);

  // =========================================================
  // PROCHAINE MISSION
  // =========================================================

  const prochaineMissionParVehicule = useMemo(() => {
    const maintenant = Date.now();

    const map = new Map<number, Reservation>();

    reservations
      .filter(
        (r) =>
          r.statut === "VALIDEE" &&
          r.vehicule &&
          new Date(r.dateDebut).getTime() > maintenant
      )
      .sort(
        (a, b) =>
          new Date(a.dateDebut).getTime() -
          new Date(b.dateDebut).getTime()
      )
      .forEach((r) => {
        const id = r.vehicule!.id;

        if (!map.has(id)) {
          map.set(id, r);
        }
      });

    return map;
  }, [reservations]);

  // =========================================================
  // STATISTIQUES
  // =========================================================

  const disponibles = vehicules.filter(
    (v) => v.statut === "DISPONIBLE"
  ).length;

  const demandesEnAttente = reservations.filter(
    (r) =>
      r.statut === "EN_ATTENTE" ||
      r.statut === "A_AFFECTER"
  ).length;

  // =========================================================
  // CARBURANT
  // =========================================================
// =========================================================
// STATISTIQUES CARBURANT
// =========================================================

const transactionsCarburantFiltrees = useMemo(() => {
  const maintenant = new Date();

  const debutMois = new Date(
    maintenant.getFullYear(),
    maintenant.getMonth(),
    1
  );

  const debut30J = new Date(
    maintenant.getTime() -
      30 * 24 * 60 * 60 * 1000
  );

  const recherche =
    carbRecherche.trim().toLowerCase();

  return transactions.filter((t) => {
    const date = new Date(t.dateOperation);

    if (Number.isNaN(date.getTime())) {
      return false;
    }

    // -------------------------------
    // Période
    // -------------------------------

    if (
      carbPeriode === "MOIS" &&
      date < debutMois
    ) {
      return false;
    }

    if (
      carbPeriode === "30J" &&
      date < debut30J
    ) {
      return false;
    }

    // -------------------------------
    // Véhicule
    // -------------------------------

    if (
      carbFiltreVehicule &&
      String(t.vehicule?.id) !==
        carbFiltreVehicule
    ) {
      return false;
    }

    // -------------------------------
    // Type
    // -------------------------------

    if (
      carbFiltreType &&
      t.type !== carbFiltreType
    ) {
      return false;
    }

    // -------------------------------
    // Justificatif
    // -------------------------------

    if (
      carbFiltreJustificatif === "FOURNI" &&
      !t.justificatif?.trim()
    ) {
      return false;
    }

    if (
      carbFiltreJustificatif === "MANQUANT" &&
      t.justificatif?.trim()
    ) {
      return false;
    }

    // -------------------------------
    // Recherche
    // -------------------------------

    if (recherche) {
      const texte = [
        t.vehicule?.immatriculation,
        t.vehicule?.marque,
        t.vehicule?.modele,
        t.station,
        t.fournisseur,
        t.mission,
        t.justificatif,
        t.observation,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!texte.includes(recherche)) {
        return false;
      }
    }

    return true;
  });
}, [
  transactions,
  carbRecherche,
  carbFiltreVehicule,
  carbFiltreType,
  carbFiltreJustificatif,
  carbPeriode,
]);

const carburantStats = useMemo(() => {
  const dotation = transactionsCarburantFiltrees
    .filter((t) => t.type === "DOTATION")
    .reduce(
      (total, t) =>
        total + Number(t.quantiteLitres || 0),
      0
    );

  const consommation =
    transactionsCarburantFiltrees
      .filter(
        (t) => t.type === "CONSOMMATION"
      )
      .reduce(
        (total, t) =>
          total + Number(t.quantiteLitres || 0),
        0
      );

  const depenses =
    transactionsCarburantFiltrees
      .filter(
        (t) => t.type === "CONSOMMATION"
      )
      .reduce(
        (total, t) =>
          total +
          Number(t.montantTotal || 0),
        0
      );

  const operations =
    transactionsCarburantFiltrees.length;

  const justificatifsManquants =
    transactionsCarburantFiltrees.filter(
      (t) =>
        t.type === "CONSOMMATION" &&
        !t.justificatif?.trim()
    ).length;

  return {
    dotation,
    consommation,
    solde: dotation - consommation,
    depenses,
    operations,
    justificatifsManquants,
  };
}, [transactionsCarburantFiltrees]);

  const soumettreCarburant = async (
  e: React.FormEvent
) => {
  e.preventDefault();

  if (
    !carbVehiculeId ||
    !carbQuantite ||
    !carbDate
  ) {
    toast.error(
      "Véhicule, quantité et date sont obligatoires."
    );

    return;
  }

  const quantite =
    Number(carbQuantite);

  if (
    !Number.isFinite(quantite) ||
    quantite <= 0
  ) {
    toast.error(
      "La quantité doit être supérieure à 0."
    );

    return;
  }

  const prix =
    carbPrixUnitaire
      ? Number(carbPrixUnitaire)
      : 0;

  const kilometrage =
    carbKilometrage
      ? Number(carbKilometrage)
      : null;

  if (
    carbPrixUnitaire &&
    (!Number.isFinite(prix) || prix < 0)
  ) {
    toast.error(
      "Le prix unitaire est invalide."
    );

    return;
  }

  if (
    carbKilometrage &&
    (kilometrage === null ||
      !Number.isFinite(kilometrage) ||
      kilometrage < 0)
  ) {
    toast.error(
      "Le dernier kilométrage est invalide."
    );

    return;
  }

  if (!API) {
    toast.error(
      "API de l'application non configurée."
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

  setEnvoiCarburant(true);

  try {
    const montantTotal =
      prix > 0
        ? quantite * prix
        : null;

    const res = await fetch(
      `${API}/carburant`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${token}`,
        },

        body: JSON.stringify({
  vehiculeId: carbVehiculeId,

  type: carbType,

  quantiteLitres: quantite,

  dateOperation: carbDate,

  prixUnitaire:
    prix > 0 ? prix : null,

  montantTotal,

  kilometrage,

  station:
    carbStation.trim() || null,

  justificatif:
    carbJustificatif.trim() || null,

  observation:
    carbObservation.trim() || null,
}),
      }
    );

    if (!res.ok) {
      const message =
        await res.text().catch(
          () => ""
        );

      throw new Error(
        message ||
          "Erreur lors de l'enregistrement."
      );
    }

    toast.success(
      carbType === "DOTATION"
        ? "Dotation enregistrée avec succès."
        : "Consommation enregistrée avec succès."
    );

    // Réinitialisation
    setCarbVehiculeId("");
    setCarbQuantite("");
    setCarbPrixUnitaire("");
    setCarbKilometrage("");
    setCarbStation("");
    setCarbJustificatif("");
    setCarbObservation("");

    await charger();

  } catch (error) {
    console.error(
      "Erreur carburant :",
      error
    );

    toast.error(
      error instanceof Error
        ? error.message
        : "Impossible d'enregistrer l'opération."
    );
  } finally {
    setEnvoiCarburant(false);
  }
};


  // =========================================================
  // ASSURANCE
  // =========================================================

  const reinitialiserFormulaireAssurance = () => {
    setAssuranceEditionId(null);
    setAssVehiculeId("");
    setAssNumeroPolice("");
    setAssDateDebut("");
    setAssDateExpiration("");
    setAssAssureur("");
    setAssTypeCouverture("");
    setAssMontantPrime("");
    setAssObservation("");
    setAssDocumentPolice("");
  };

  const preparerModificationAssurance = (
    assurance: Assurance
  ) => {
    setAssuranceEditionId(assurance.id);
    setAssVehiculeId(
      assurance.vehicule?.id
        ? String(assurance.vehicule.id)
        : ""
    );
    setAssNumeroPolice(
      assurance.numeroPolice || ""
    );
    setAssDateDebut(
      datePourInput(
        assurance.dateDebut
      )
    );
    setAssDateExpiration(
      datePourInput(
        assurance.dateExpiration ||
          assurance.dateEcheance ||
          assurance.dateFin
      )
    );
    setAssAssureur(
      assurance.assureur || ""
    );
    setAssTypeCouverture(
      assurance.typeCouverture || ""
    );
    setAssMontantPrime(
      assurance.montantPrime != null
        ? String(assurance.montantPrime)
        : ""
    );
    setAssObservation(
      assurance.observation || ""
    );
    setAssDocumentPolice(
      assurance.documentPolice ||
        assurance.pieceJointe ||
        ""
    );

    toast.info(
      "Police chargée dans le formulaire. Modifiez les informations puis enregistrez."
    );
  };

  const soumettreAssurance = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !assVehiculeId ||
      !assNumeroPolice.trim() ||
      !assDateExpiration
    ) {
      toast.error(
        "Véhicule, numéro de police et date d'expiration sont obligatoires."
      );

      return;
    }

    if (
      assDateDebut &&
      new Date(assDateExpiration).getTime() <
        new Date(assDateDebut).getTime()
    ) {
      toast.error(
        "La date d'expiration doit être postérieure à la date de début."
      );

      return;
    }

    const montantPrime =
      assMontantPrime.trim()
        ? Number(assMontantPrime)
        : null;

    if (
      montantPrime != null &&
      (
        !Number.isFinite(montantPrime) ||
        montantPrime < 0
      )
    ) {
      toast.error(
        "Le montant de la prime est invalide."
      );

      return;
    }

    if (!API) {
      toast.error(
        "API de l'application non configurée."
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

    setEnvoiAssurance(true);

    try {
      const body = {
        vehicule: {
          id: Number(assVehiculeId),
        },

        numeroPolice:
          assNumeroPolice.trim(),

        /*
         * dateExpiration est conservé car c'est le champ
         * déjà utilisé par le backend actuel.
         */
        dateExpiration:
          assDateExpiration,

        /*
         * Champs complémentaires : si le backend actuel
         * les possède, ils seront persistés. Sinon la
         * compatibilité avec les champs principaux est
         * conservée.
         */
        dateDebut:
          assDateDebut || null,

        assureur:
          assAssureur.trim() || null,

        typeCouverture:
          assTypeCouverture.trim() || null,

        montantPrime,

        observation:
          assObservation.trim() || null,

        documentPolice:
          assDocumentPolice.trim() || null,
      };

      const edition =
        assuranceEditionId != null;

      const res = await fetch(
        edition
          ? `${API}/assurances/${assuranceEditionId}`
          : `${API}/assurances`,
        {
          method: edition
            ? "PUT"
            : "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },

          body:
            JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const message =
          await res.text().catch(() => "");

        throw new Error(
          message ||
            (
              edition
                ? "Erreur lors de la mise à jour de la police."
                : "Erreur lors de l'enregistrement de la police."
            )
        );
      }

      toast.success(
        edition
          ? "Police d'assurance mise à jour."
          : "Police d'assurance enregistrée."
      );

      reinitialiserFormulaireAssurance();

      await charger();

    } catch (error) {

      console.error(
        "Erreur assurance :",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer l'assurance."
      );

    } finally {

      setEnvoiAssurance(false);
    }
  };

  // =========================================================
  // SINISTRE
  // =========================================================

  const soumettreSinistre = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !sinVehiculeId ||
      !sinDate ||
      !sinConducteur.trim() ||
      !sinCirconstance.trim()
    ) {
      toast.error(
        "Véhicule, date, conducteur et circonstances sont obligatoires."
      );

      return;
    }

    if (!API) {
      toast.error(
        "API de l'application non configurée."
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

    setEnvoiSinistre(true);

    try {
      const res = await fetch(
        `${API}/sinistres`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },

          body: JSON.stringify({
            vehicule: {
              id: Number(sinVehiculeId),
            },

            dateSinistre: sinDate,

            conducteur:
              sinConducteur.trim(),

            circonstance:
              sinCirconstance.trim(),

            description:
              sinDescription.trim() || null,

            /*
             * Référence / emplacement du constat amiable.
             * Le champ est optionnel pour préserver la
             * compatibilité avec les dossiers existants.
             */
            constatAmiable:
              sinConstatAmiable.trim() || null,
          }),
        }
      );

      if (!res.ok) {
        const message =
          await res.text().catch(() => "");

        throw new Error(
          message ||
            "Erreur lors de la déclaration."
        );
      }

      toast.success(
        "Dossier de sinistre enregistré."
      );

      setSinVehiculeId("");
      setSinConducteur("");
      setSinCirconstance("");
      setSinDescription("");
      setSinConstatAmiable("");

      await charger();

    } catch (error) {

      console.error(
        "Erreur sinistre :",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de déclarer le sinistre."
      );

    } finally {

      setEnvoiSinistre(false);
    }
  };

  // =========================================================
  // ASSURANCES / SINISTRES — SUIVI, ALERTES ET REPORTING
  // =========================================================

  const assurancesFiltrees = useMemo(() => {
    const recherche =
      assRecherche.trim().toLowerCase();

    return assurances
      .filter((a) => {
        if (
          assFiltreVehicule &&
          String(a.vehicule?.id ?? "") !==
            assFiltreVehicule
        ) {
          return false;
        }

        const etat =
          etatAssurance(a);

        if (
          assFiltreEtat === "VALIDES" &&
          etat.code !== "VALIDE"
        ) {
          return false;
        }

        if (
          assFiltreEtat === "J15" &&
          etat.code !== "J15"
        ) {
          return false;
        }

        if (
          assFiltreEtat === "EXPIREES" &&
          etat.code !== "EXPIREE"
        ) {
          return false;
        }

        if (recherche) {
          const texte = [
            a.vehicule?.immatriculation,
            a.vehicule?.marque,
            a.vehicule?.modele,
            a.numeroPolice,
            a.assureur,
            a.typeCouverture,
            a.observation,
            a.documentPolice,
            a.pieceJointe,
            a.statut,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          if (!texte.includes(recherche)) {
            return false;
          }
        }

        return true;
      })
      .slice()
      .sort((a, b) => {
        const da =
          dateEcheanceAssurance(a);
        const db =
          dateEcheanceAssurance(b);

        return String(da || "9999")
          .localeCompare(
            String(db || "9999")
          );
      });
  }, [
    assurances,
    assRecherche,
    assFiltreVehicule,
    assFiltreEtat,
  ]);

  const assuranceStats = useMemo(() => {
    let valides = 0;
    let j15 = 0;
    let expirees = 0;
    let sansEcheance = 0;

    assurances.forEach((a) => {
      const etat =
        etatAssurance(a);

      if (etat.code === "VALIDE") {
        valides += 1;
      } else if (etat.code === "J15") {
        j15 += 1;
      } else if (etat.code === "EXPIREE") {
        expirees += 1;
      } else {
        sansEcheance += 1;
      }
    });

    return {
      total: assurances.length,
      valides,
      j15,
      expirees,
      sansEcheance,
    };
  }, [assurances]);

  const sinistresFiltres = useMemo(() => {
    const recherche =
      sinRecherche.trim().toLowerCase();

    return sinistres
      .filter((s) => {
        if (
          sinFiltreVehicule &&
          String(s.vehicule?.id ?? "") !==
            sinFiltreVehicule
        ) {
          return false;
        }

        if (
          sinFiltreStatut !== "TOUS" &&
          statutSinistreNormalise(s) !==
            sinFiltreStatut
        ) {
          return false;
        }

        if (recherche) {
          const texte = [
            s.vehicule?.immatriculation,
            s.numeroDossier,
            s.conducteur,
            s.circonstance,
            s.description,
            s.constatAmiable,
            s.constat,
            s.lieu,
            s.statut,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          if (!texte.includes(recherche)) {
            return false;
          }
        }

        return true;
      })
      .slice()
      .sort((a, b) =>
        String(
          dateSinistreAffiche(b) || ""
        ).localeCompare(
          String(
            dateSinistreAffiche(a) || ""
          )
        )
      );
  }, [
    sinistres,
    sinRecherche,
    sinFiltreVehicule,
    sinFiltreStatut,
  ]);

  const sinistreStats = useMemo(() => {
    const ouverts =
      sinistres.filter(
        (s) =>
          statutSinistreNormalise(s) !==
          "CLOTURE"
      ).length;

    const clotures =
      sinistres.length - ouverts;

    const avecConstat =
      sinistres.filter(
        (s) =>
          Boolean(
            valeurConstatAmiable(s)
          )
      ).length;

    return {
      total: sinistres.length,
      ouverts,
      clotures,
      avecConstat,
      sansConstat:
        sinistres.length -
        avecConstat,
    };
  }, [sinistres]);

  const sinistreSelectionne = useMemo(
    () =>
      sinistres.find(
        (s) =>
          String(s.id) ===
          String(sinDossierOuvert)
      ) || null,
    [sinistres, sinDossierOuvert]
  );

  const exporterAssurances = () => {
    exporterCsvGenerique(
      `assurances_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`,
      [
        [
          "Véhicule",
          "N° police",
          "Assureur",
          "Couverture",
          "Début",
          "Échéance",
          "Jours restants",
          "État",
          "Prime",
          "Document / référence",
          "Observation",
        ],
        ...assurancesFiltrees.map(
          (a) => {
            const etat =
              etatAssurance(a);

            return [
              a.vehicule?.immatriculation ||
                "—",
              a.numeroPolice || "—",
              a.assureur || "—",
              a.typeCouverture || "—",
              formaterDateSimple(
                a.dateDebut
              ),
              formaterDateSimple(
                dateEcheanceAssurance(a)
              ),
              etat.jours != null
                ? String(etat.jours)
                : "—",
              etat.label,
              a.montantPrime != null
                ? String(a.montantPrime)
                : "—",
              a.documentPolice ||
                a.pieceJointe ||
                "—",
              a.observation || "—",
            ];
          }
        ),
      ]
    );

    toast.success(
      "Export des assurances généré."
    );
  };

  const exporterSinistres = () => {
    exporterCsvGenerique(
      `sinistres_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`,
      [
        [
          "Dossier",
          "Véhicule",
          "Date sinistre",
          "Conducteur",
          "Circonstances",
          "Description",
          "Constat amiable",
          "Statut",
          "Date clôture",
        ],
        ...sinistresFiltres.map(
          (s) => [
            s.numeroDossier ||
              `SIN-${String(s.id).padStart(
                5,
                "0"
              )}`,
            s.vehicule?.immatriculation ||
              "—",
            formaterDateSimple(
              dateSinistreAffiche(s)
            ),
            s.conducteur || "—",
            s.circonstance || "—",
            s.description || "—",
            valeurConstatAmiable(s) ||
              "Non renseigné",
            libelleStatutSinistre(s),
            formaterDateSimple(
              s.dateCloture
            ),
          ]
        ),
      ]
    );

    toast.success(
      "Export des sinistres généré."
    );
  };

  // =========================================================
  // CHARGEMENT
  // =========================================================

  if (chargement) {
    return (
      <div className="agent-flotte-page">
        <EnTete afficherNotifications />

        <div
          style={{
            padding: 50,
            textAlign: "center",
            color: "#64748b",
          }}
        >
          Chargement des données de la flotte...
        </div>
      </div>
    );
  }

  // =========================================================
  // INTERFACE
  // =========================================================

  return (
    <div className="agent-flotte-page">
      <EnTete afficherNotifications />

      <div className="agent-flotte-main">
        {/* ================================================ */}
        {/* TITRE */}
        {/* ================================================ */}

        <div className="dashboard-title" style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 20,
          alignItems: "center",
          marginBottom: 14,
          flex: "0 0 auto",
        }}>
          <div>

            <p
              style={{
                margin: "6px 0 0",
                color: "#64748b",
                fontSize: 14,
              }}
            >
              Suivi quotidien des véhicules,
              missions, consommations,
              assurances et échéances.
            </p>
          </div>

          <button
            type="button"
            onClick={charger}
            style={refreshButton}
          >
            <RefreshCw size={16} />
            Actualiser
          </button>
        </div>

        {/* ================================================ */}
        {/* KPI */}
        {/* ================================================ */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(4, minmax(0, 1fr))",
            gap: 10,
            marginBottom: 12,
            flex: "0 0 auto",
          }}
        >
          <Kpi
            icon={<Car size={20} />}
            titre="Parc total"
            valeur={vehicules.length}
          />

          <Kpi
            icon={<Route size={20} />}
            titre="En mission"
            valeur={missionsActives.length}
          />

          <Kpi
            icon={<CheckCircle2 size={20} />}
            titre="Disponibles"
            valeur={disponibles}
          />

          <Kpi
            icon={<ClipboardList size={20} />}
            titre="Tickets à traiter"
            valeur={demandesEnAttente}
          />
        </div>

        {/* ================================================ */}
        {/* ONGLETS */}
        {/* ================================================ */}

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 7,
            marginBottom: 10,
            flex: "0 0 auto",
          }}
        >
          <OngletButton
            couleur="bleu"
            actif={onglet === "SUIVI"}
            onClick={() => setOnglet("SUIVI")}
            icon={<Navigation size={16} />}
          >
            Suivi flotte
          </OngletButton>

          <OngletButton
            couleur="bleu"
            actif={onglet === "DEMANDES"}
            onClick={() => setOnglet("DEMANDES")}
            icon={<ClipboardList size={16} />}
          >
            Tickets / Missions
          </OngletButton>

          <OngletButton
            couleur="vert"
            actif={onglet === "CARBURANT"}
            onClick={() => setOnglet("CARBURANT")}
            icon={<Fuel size={16} />}
          >
            Carburant
          </OngletButton>

          <OngletButton
            couleur="rouge"
            actif={onglet === "ASSURANCES"}
            onClick={() => setOnglet("ASSURANCES")}
            icon={<ShieldCheck size={16} />}
          >
            Assurances / Sinistres
          </OngletButton>
        </div>

        {/* ================================================ */}
        {/* SUIVI DES VEHICULES */}
        {/* ================================================ */}

        <div className="dashboard-content">
        {onglet === "SUIVI" && (
          <SuiviFlottePanel
            vehicules={vehicules}
            positionsGps={positionsGps}
            gpsParVehicule={gpsParVehicule}
            missionsActives={missionsActives}
            missionParVehicule={missionParVehicule}
            prochaineMissionParVehicule={prochaineMissionParVehicule}
            erreurGps={erreurGps}
            derniereMajGps={derniereMajGps}
          />
        )}

        {/* ================================================ */}
        {/* DEMANDES / MISSIONS */}
        {/* ================================================ */}

        {onglet === "DEMANDES" && (
          <section className="panel-scroll">
            <SectionTitre titre={afficherHistoriqueMissions
              ? "Historique des missions terminées et clôturées"
              : "Tickets et missions"} />

            <div style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 14,
            }}>
              <button
                type="button"
                onClick={() => setAfficherHistoriqueMissions((precedent) => !precedent)}
                aria-pressed={afficherHistoriqueMissions}
                style={{
                  ...refreshButton,
                  backgroundColor: afficherHistoriqueMissions ? "#475569" : "#2563eb",
                  borderColor: afficherHistoriqueMissions ? "#475569" : "#2563eb",
                }}
              >
                <Clock size={16} />
                {afficherHistoriqueMissions
                  ? "Retour à tous les tickets"
                  : `Historique des missions terminées et clôturées (${historiqueMissions.length})`}
              </button>
              {afficherHistoriqueMissions && (
                <span style={smallMuted}>
                  Missions terminées et clôturées enregistrées dans l'application.
                </span>
              )}
            </div>

            {urgenceTicket && (
              <form onSubmit={soumettreUrgence} style={{...cardStyleHistorique, marginBottom: 16, border: "2px solid #dc2626", display: "grid", gap: 10}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap: 12}}>
                  <strong style={{color:"#b91c1c"}}>Urgence de dernière minute — TKT-{String(urgenceTicket.id).padStart(5,"0")}</strong>
                  <button type="button" onClick={() => setUrgenceTicket(null)} disabled={urgenceEnCours} style={refreshButton}><X size={14}/> Annuler</button>
                </div>
                
                <label style={labelStyle}>Sous-catégorie *
                  <select required value={urgenceSousCategorie} onChange={e=>setUrgenceSousCategorie(e.target.value)} style={inputStyle}>
                    <option value="URGENCE_OPERATIONNELLE">Urgence opérationnelle</option>
                    <option value="REUNION_IMPREVUE">Réunion imprévue</option><option value="AUTRE">Autre urgence justifiée</option>
                  </select>
                </label>
                <label style={labelStyle}>Motif de l'urgence *
                  <textarea required maxLength={1000} value={urgenceMotif} onChange={e=>setUrgenceMotif(e.target.value)} rows={2} style={inputStyle}/>
                </label>
                <label style={labelStyle}>Objet de la nouvelle mission *
                  <input required maxLength={255} value={urgenceObjet} onChange={e=>setUrgenceObjet(e.target.value)} style={inputStyle}/>
                </label>
                <label style={labelStyle}>Zone du NOUVEAU trajet *
                  <select required value={urgenceZoneMission} onChange={e=>setUrgenceZoneMission(e.target.value as "VILLE_TOAMASINA" | "HORS_TOAMASINA" | "")} style={inputStyle}>
                    <option value="">Choisir la zone du nouveau trajet</option>
                    <option value="VILLE_TOAMASINA">Dans la ville de Toamasina</option>
                    <option value="HORS_TOAMASINA">Hors de la ville de Toamasina</option>
                  </select>
                </label>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:10}}>
                  <label style={labelStyle}>Date et heure de départ *
                    <input type="datetime-local" required value={urgenceDepart} onChange={e=>setUrgenceDepart(e.target.value)} style={inputStyle}/>
                  </label>
                  <label style={labelStyle}>Date et heure de fin estimée *
                    <input type="datetime-local" required value={urgenceFin} onChange={e=>setUrgenceFin(e.target.value)} style={inputStyle}/>
                  </label>
                  <label style={labelStyle}>Point de départ *
                    <input required maxLength={255} value={urgencePointDepart} onChange={e=>setUrgencePointDepart(e.target.value)} style={inputStyle}/>
                  </label>
                  <label style={labelStyle}>Destination *
                    <input required maxLength={255} value={urgenceDestination} onChange={e=>setUrgenceDestination(e.target.value)} style={inputStyle}/>
                  </label>
                </div>
                <strong style={{fontSize:12, color:"#475569"}}>Véhicule : {urgenceTicket.vehicule?.immatriculation || "—"} · Chauffeur : {urgenceTicket.chauffeur ? nomChauffeur(urgenceTicket.chauffeur) : "—"}</strong>
                {urgenceTicket.mobilisabilite === "VERROUILLEE" && (
                  <div style={{padding:12, border:"1px solid #fca5a5", borderRadius:8, background:"#fef2f2", color:"#b91c1c", fontSize:12, lineHeight:1.5}}>
                    <strong>Mission initiale verrouillée — dérogation exceptionnelle.</strong>
                    <p style={{margin:"5px 0 8px"}}>La réaffectation annulera son créneau initial et nécessitera sa reprogrammation. L'opération, son auteur et son motif seront tracés, et le chauffeur ainsi que le demandeur initial seront informés.</p>
                    <label style={{display:"flex", alignItems:"flex-start", gap:9, cursor:"pointer"}}>
                      <input type="checkbox" checked={confirmeDerogationVerrouillage}
                        onChange={e=>setConfirmeDerogationVerrouillage(e.target.checked)}
                        style={{marginTop:2}} required />
                      <span>Je confirme exceptionnellement la réaffectation du véhicule et du chauffeur de cette mission verrouillée.</span>
                    </label>
                  </div>
                )}
                <button type="submit" disabled={urgenceEnCours || (urgenceTicket.mobilisabilite === "VERROUILLEE" && !confirmeDerogationVerrouillage)} style={{...refreshButton, backgroundColor:"#dc2626",borderColor:"#dc2626",opacity:urgenceEnCours?.6:1, justifySelf:"start", alignSelf:"start", width:"fit-content", maxWidth:"100%", minWidth:0, textAlign:"center"}}>
                  <Zap size={15}/>{urgenceEnCours ? "Création en cours..." : "Créer le ticket urgent et reprogrammer l'initial"}
                </button>
              </form>
            )}

            {ticketsAffiches.length === 0 ? (
              <BlocVide texte={afficherHistoriqueMissions
                ? "Aucune mission terminée ou clôturée enregistrée."
                : "Aucun ticket enregistré."} />
            ) : (
              <div style={tableCard}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: 1100,
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor: "#ffffff",
                      }}
                    >
                      <Th>Ticket</Th>
                      <Th>Créée le</Th>
                      <Th>Bénéficiaire / origine</Th>
                      <Th>Mission</Th>
                      <Th>Trajet</Th>
                      <Th>Véhicule</Th>
                      <Th>Chauffeur</Th>
                      <Th>Période</Th>
                      <Th>Statut</Th>
              <Th>Changement dernière minute</Th>
                    </tr>
                  </thead>

                  <tbody>
                    {ticketsAffiches.map((r) => (
                      <tr key={r.id}>
                        <Td>
                          <strong>
                            {`TKT-${String(r.id).padStart(5, "0")}`}
                          </strong>

                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 5,
                              marginTop: 5,
                            }}
                          >
                            {r.modeCreation === "EXPRESS" && (
                              <span style={expressBadgeStyle}>
                                <Zap size={10} />
                                Express
                              </span>
                            )}

                            <TypeDemandeBadge reservation={r} />

                            {r.aRegulariser && (
                              <span style={regulariserBadgeStyle}>
                                À régulariser
                              </span>
                            )}
                          </div>
                        </Td>

                        <Td>
                          {formaterDate(
                            r.dateCreation
                          )}
                        </Td>

                        <Td>
                          <strong>
                            {nomBeneficiaire(r)}
                          </strong>

                          {r.demandeurMatricule && (
                            <div style={smallMuted}>
                              {r.demandeurMatricule}
                            </div>
                          )}
                        </Td>

                        <Td>
                          {r.motif || "—"}

                          {r.demandeUrgente && r.motifUrgence?.trim() && (
                            <div
                              style={{
                                marginTop: 4,
                                color: "#b91c1c",
                                fontSize: 10,
                                lineHeight: 1.35,
                              }}
                            >
                              Motif urgence : {r.motifUrgence}
                            </div>
                          )}
                        </Td>

                        <Td>
                          <div>
                            {r.pointDepart || "—"}
                          </div>

                          <div style={smallMuted}>
                            →
                            {" "}
                            {r.destination || "—"}
                          </div>
                        </Td>

                        <Td>
                          {r.vehicule
                            ? libelleVehicule(
                                r.vehicule
                              )
                            : "Non affecté"}
                        </Td>

                        <Td>
                          {r.chauffeur
                            ? nomChauffeur(
                                r.chauffeur
                              )
                            : r.besoinChauffeur
                            ? "Non affecté"
                            : "Sans chauffeur"}
                        </Td>

                        <Td>
                          <div>
                            {formaterDate(
                              r.dateDebut
                            )}
                          </div>

                          <div style={smallMuted}>
                            au{" "}
                            {formaterDate(
                              r.dateFin
                            )}
                          </div>
                        </Td>

                        <Td>
                          <StatutReservation statut={r.statut} />
                        </Td>
                        <Td>
                          {!afficherHistoriqueMissions && !changementsParTicket.has(r.id) && (
                            <div style={{ display: "grid", gap: 5, minWidth: 190, maxWidth: 245 }}>
                              <button
                                type="button"
                                disabled={!urgencePossible(r)}
                                title={raisonUrgenceIndisponible(r) ?? "Créer un ticket urgent lié à ce ticket"}
                                onClick={() => ouvrirUrgence(r)}
                                style={{
                                  ...refreshButton,
                                  backgroundColor: urgencePossible(r) ? "#dc2626" : "#e2e8f0",
                                  borderColor: urgencePossible(r) ? "#dc2626" : "#cbd5e1",
                                  color: urgencePossible(r) ? "#ffffff" : "#64748b",
                                  cursor: urgencePossible(r) ? "pointer" : "not-allowed",
                                  fontSize: 11,
                                  whiteSpace: "normal",
                                  textAlign: "center",
                                }}
                              >
                                <Zap size={14} /> Changement de dernière minute
                              </button>
                              {raisonUrgenceIndisponible(r) ? (
                                <span style={{ ...smallMuted, lineHeight: 1.4, maxWidth: 245 }}>
                                  {raisonUrgenceIndisponible(r)}
                                </span>
                              ) : r.mobilisabilite === "VERROUILLEE" ? (
                                <span style={{ ...smallMuted, lineHeight: 1.4, maxWidth: 245, color: "#b91c1c" }}>
                                  Mission verrouillée : dérogation exceptionnelle à confirmer.
                                </span>
                              ) : null}
                            </div>
                          )}
                          {changementsParTicket.get(r.id) && (
                            <div style={{...smallMuted, maxWidth: 250, marginTop: 4}}>
                              {changementsParTicket.get(r.id)?.ticketInitialId === r.id
                                ? `Remplacée par TKT-${String(changementsParTicket.get(r.id)?.ticketUrgentId).padStart(5,"0")}`
                                : `Urgence liée à TKT-${String(changementsParTicket.get(r.id)?.ticketInitialId).padStart(5,"0")}`}
                              <br />{changementsParTicket.get(r.id)?.sousCategorie} · {changementsParTicket.get(r.id)?.motifUrgence}
                            </div>
                          )}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ================================================ */}
        {/* CARBURANT */}
        {/* ================================================ */}

        {onglet === "CARBURANT" && (
  <section className="panel-scroll">

    <SectionTitre
      titre="Suivi du carburant"
      
    />

    {/* Référentiel du document de consommation réservé aux véhicules équipés GPS. */}
    <NormesCarburantGps
      vehicules={vehicules}
      positionsGps={positionsGps}
      transactions={transactions}
    />

    {/* Suivi distinct des véhicules sans GPS identifié : relevés kilométriques manuels. */}
    <SuiviCarburantSansGps
      vehicules={vehicules}
      positionsGps={positionsGps}
      transactions={transactions}
    />

    {/* ================================================= */}
    {/* KPI CARBURANT */}
    {/* ================================================= */}

    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(6, minmax(0, 1fr))",
        gap: 10,
        marginBottom: 18,
      }}
    >

      <Kpi
        icon={<Fuel size={20} />}
        titre="Dotation"
        valeur={`${carburantStats.dotation.toLocaleString(
          "fr-FR"
        )} L`}
      />

      <Kpi
        icon={<Fuel size={20} />}
        titre="Consommation"
        valeur={`${carburantStats.consommation.toLocaleString(
          "fr-FR"
        )} L`}
      />

      <Kpi
        icon={<RefreshCw size={20} />}
        titre="Solde"
        valeur={`${carburantStats.solde.toLocaleString(
          "fr-FR"
        )} L`}
        alerte={carburantStats.solde < 0}
      />

      <Kpi
        icon={<ClipboardList size={20} />}
        titre="Dépenses"
        valeur={`${carburantStats.depenses.toLocaleString(
          "fr-FR"
        )} Ar`}
      />

      <Kpi
        icon={<Fuel size={20} />}
        titre="Opérations"
        valeur={carburantStats.operations}
      />

      <Kpi
        icon={<AlertTriangle size={20} />}
        titre="Justificatifs manquants"
        valeur={
          carburantStats.justificatifsManquants
        }
        alerte={
          carburantStats.justificatifsManquants > 0
        }
      />

    </div>

    {/* ================================================= */}
    {/* SAISIE + RESUME */}
    {/* ================================================= */}

    <div style={twoColumns}>

      {/* =============================================== */}
      {/* NOUVELLE SAISIE */}
      {/* =============================================== */}

      <Card>

        <CardTitre
          icon={
            <Fuel
              size={18}
              color="#0369a1"
            />
          }
        >
          Nouvelle opération
        </CardTitre>

       

        <form
          onSubmit={soumettreCarburant}
          style={formStyle}
        >

          {/* VEHICULE */}

          <Champ label="Véhicule *">

            <select
              value={carbVehiculeId}
              onChange={(e) =>
                setCarbVehiculeId(
                  e.target.value
                )
              }
              style={inputStyle}
              required
            >

              <option value="">
                Sélectionner un véhicule
              </option>

              {vehicules.map((v) => (
                <option
                  key={v.id}
                  value={v.id}
                >
                  {libelleVehicule(v)}
                </option>
              ))}

            </select>

          </Champ>

          {/* TYPE + QUANTITE */}

          <div style={twoInputColumns}>

            <Champ label="Type *">

              <select
                value={carbType}
                onChange={(e) =>
                  setCarbType(
                    e.target.value as
                      | "DOTATION"
                      | "CONSOMMATION"
                  )
                }
                style={inputStyle}
              >

                <option value="CONSOMMATION">
                  Consommation
                </option>

                <option value="DOTATION">
                  Dotation
                </option>

              </select>

            </Champ>

            <Champ label="Quantité (L) *">

              <input
                type="number"
                min="0.1"
                step="0.1"
                value={carbQuantite}
                onChange={(e) =>
                  setCarbQuantite(
                    e.target.value
                  )
                }
                placeholder="Ex. 45"
                style={inputStyle}
                required
              />

            </Champ>

          </div>

          {/* DATE + KM */}

          <div style={twoInputColumns}>

            <Champ label="Date *">

              <input
                type="date"
                value={carbDate}
                onChange={(e) =>
                  setCarbDate(
                    e.target.value
                  )
                }
                style={inputStyle}
                required
              />

            </Champ>

            <Champ label="Kilométrage au compteur (relevé manuel)">

              <input
                type="number"
                min="0"
                step="0.1"
                value={carbKilometrage}
                onChange={(e) =>
                  setCarbKilometrage(
                    e.target.value
                  )
                }
                placeholder="Ex. 67141"
                style={inputStyle}
              />
              <div style={{ marginTop: 5, fontSize: 11, color: "#64748b", lineHeight: 1.45 }}>
                {(() => {
                  const vehicule = vehicules.find((v) => String(v.id) === carbVehiculeId);
                  const suiviGps = vehicule && (vehicule.gpsEquipe === true || vehicule.gpsDeviceId != null ||
                    positionsGps.some((p) => p.vehiculeId === vehicule.id));
                  return suiviGps
                    ? "Compteur saisi lors de l’opération ; le GPS reste une information distincte."
                    : "Sans GPS identifié : relevez le compteur à chaque opération de consommation. Deux relevés datés et des litres correspondant à la même période permettent d'estimer les L/100 km.";
                })()}
              </div>

            </Champ>

          </div>

          {/* PRIX */}

          <div style={twoInputColumns}>

            <Champ label="Prix unitaire (Ar/L)">

              <input
                type="number"
                min="0"
                step="1"
                value={carbPrixUnitaire}
                onChange={(e) =>
                  setCarbPrixUnitaire(
                    e.target.value
                  )
                }
                placeholder="Ex. 4900"
                style={inputStyle}
              />

            </Champ>

            <Champ label="Montant total">

              <div
                style={{
                  ...inputStyle,
                  backgroundColor:
                    "#f8fafc",
                  color: "#0f172a",
                  fontWeight: 700,
                }}
              >
                {carbQuantite &&
                carbPrixUnitaire
                  ? (
                      Number(carbQuantite) *
                      Number(carbPrixUnitaire)
                    ).toLocaleString(
                      "fr-FR"
                    ) + " Ar"
                  : "—"}
              </div>

            </Champ>

          </div>

          {/* STATION */}

          <Champ label="Station / fournisseur">

            <select
              value={carbStation}
              onChange={(e) =>
                setCarbStation(
                  e.target.value
                )
              }
              style={inputStyle}
            >
              <option value="">
                Sélectionner une station
              </option>

              <option value="JOVENA">
                JOVENA
              </option>

              <option value="GALANA">
                GALANA
              </option>

              <option value="SHELL">
                SHELL
              </option>
            </select>

          </Champ>

          {/* JUSTIFICATIF */}

          <Champ label="Justificatif">

            <input
              value={carbJustificatif}
              onChange={(e) =>
                setCarbJustificatif(
                  e.target.value
                )
              }
              placeholder="N° ticket / facture / bon"
              style={inputStyle}
            />

          </Champ>

          {/* OBSERVATION */}

          <Champ label="Observation">

            <textarea
              value={carbObservation}
              onChange={(e) =>
                setCarbObservation(
                  e.target.value
                )
              }
              rows={3}
              placeholder="Observation éventuelle..."
              style={{
                ...inputStyle,
                resize: "vertical",
              }}
            />

          </Champ>

          {/* BOUTON */}

          <ActionButton
            couleur="vert"
            disabled={envoiCarburant}
          >

            <PlusCircle size={15} />

            {envoiCarburant
              ? "Enregistrement..."
              : "Enregistrer l'opération"}

          </ActionButton>

        </form>

      </Card>

      {/* =============================================== */}
      {/* DERNIERES OPERATIONS */}
      {/* =============================================== */}

      <Card>

        <div className="agent-flotte-liste-entete">
<CardTitre
          icon={<ClipboardList size={18} />}
        >
          Dernières opérations
        </CardTitre>
</div>

        {transactions.length === 0 ? (

          <BlocVide
            texte="Aucune opération carburant enregistrée."
            compact
          />

        ) : (

          <div style={scrollList}>

            {transactions
              .slice(0, 10)
              .map((t) => (

                <ListeLigne
                  key={t.id}

                  gauche={
                    <>
                      <strong>
                        {t.vehicule
                          ?.immatriculation ||
                          "—"}
                      </strong>

                      <div
                        style={smallMuted}
                      >
                        {t.type ===
                        "DOTATION"
                          ? "Dotation"
                          : "Consommation"}

                        {" • "}

                        {formaterDateSimple(
                          t.dateOperation
                        )}

                      </div>

                      {t.station && (
                        <div
                          style={{
                            marginTop: 3,
                            fontSize: 10,
                            color: "#64748b",
                          }}
                        >
                          {t.station}
                        </div>
                      )}
                    </>
                  }

                  droite={
                    <>
                      <strong>
                        {Number(
                          t.quantiteLitres
                        ).toLocaleString(
                          "fr-FR"
                        )}{" "}
                        L
                      </strong>

                      {t.montantTotal && (
                        <div
                          style={{
                            fontSize: 10,
                            color: "#64748b",
                          }}
                        >
                          {Number(
                            t.montantTotal
                          ).toLocaleString(
                            "fr-FR"
                          )}{" "}
                          Ar
                        </div>
                      )}

                      {!t.justificatif &&
                        t.type ===
                          "CONSOMMATION" && (
                          <div
                            style={{
                              color:
                                "#dc2626",
                              fontSize: 10,
                              fontWeight: 600,
                            }}
                          >
                            ⚠ Justificatif absent
                          </div>
                        )}

                    </>
                  }
                />

              ))}

          </div>

        )}

      </Card>

    </div>

    {/* ================================================= */}
    {/* HISTORIQUE COMPLET */}
    {/* ================================================= */}

    <Card>

      <div className="agent-flotte-liste-entete">
<CardTitre
        icon={<ClipboardList size={18} />}
      >
        Historique des consommations et dotations
      </CardTitre>
</div>

      {/* FILTRES */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(220px, 2fr) repeat(4, minmax(130px, 1fr))",
          gap: 9,
          marginBottom: 15,
        }}
      >

        {/* RECHERCHE */}

       <div
  style={{
    height: 38,
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "0 10px",
    boxSizing: "border-box",
    border: "1px solid #d1d5db",
    borderRadius: 7,
    backgroundColor: "white",
    color: "#64748b",
  }}
>

          <input
            value={carbRecherche}
            onChange={(e) =>
              setCarbRecherche(
                e.target.value
              )
            }
            placeholder="Rechercher..."
          />
        </div>

        {/* PERIODE */}

        <select
          value={carbPeriode}
          onChange={(e) =>
            setCarbPeriode(
              e.target.value as
                | "TOUT"
                | "MOIS"
                | "30J"
            )
          }
          style={inputStyle}
        >
          <option value="MOIS">
            Ce mois
          </option>

          <option value="30J">
            30 derniers jours
          </option>

          <option value="TOUT">
            Toute la période
          </option>
        </select>

        {/* VEHICULE */}

        <select
          value={carbFiltreVehicule}
          onChange={(e) =>
            setCarbFiltreVehicule(
              e.target.value
            )
          }
          style={inputStyle}
        >

          <option value="">
            Tous les véhicules
          </option>

          {vehicules.map((v) => (
            <option
              key={v.id}
              value={v.id}
            >
              {v.immatriculation}
            </option>
          ))}

        </select>

        {/* TYPE */}

        <select
          value={carbFiltreType}
          onChange={(e) =>
            setCarbFiltreType(
              e.target.value
            )
          }
          style={inputStyle}
        >

          <option value="">
            Tous les types
          </option>

          <option value="CONSOMMATION">
            Consommation
          </option>

          <option value="DOTATION">
            Dotation
          </option>

        </select>

        {/* JUSTIFICATIF */}

        <select
          value={carbFiltreJustificatif}
          onChange={(e) =>
            setCarbFiltreJustificatif(
              e.target.value
            )
          }
          style={inputStyle}
        >

          <option value="">
            Tous justificatifs
          </option>

          <option value="FOURNI">
            Justificatif fourni
          </option>

          <option value="MANQUANT">
            Justificatif manquant
          </option>

        </select>

      </div>

      {/* TABLE */}

      {transactionsCarburantFiltrees.length ===
      0 ? (

        <BlocVide
          texte="Aucune opération ne correspond aux filtres."
        />

      ) : (

        <div style={tableCard}>

          <table
            style={{
              width: "100%",
              borderCollapse:
                "collapse",
              minWidth: 1200,
            }}
          >

            <thead>

              <tr
                style={{
                  backgroundColor:
                    "#ffffff",
                }}
              >

                <Th>Date</Th>
                <Th>Véhicule</Th>
                <Th>Type</Th>
                <Th>Quantité</Th>
                <Th>Prix/L</Th>
                <Th>Montant</Th>
                <Th>Dernier kilométrage</Th>
                <Th>Station</Th>
                <Th>Mission</Th>
                <Th>Justificatif</Th>

              </tr>

            </thead>

            <tbody>

              {transactionsCarburantFiltrees.map(
                (t) => (

                  <tr key={t.id}>

                    <Td>
                      {formaterDateSimple(
                        t.dateOperation
                      )}
                    </Td>

                    <Td>
                      <strong>
                        {t.vehicule
                          ?.immatriculation ||
                          "—"}
                      </strong>

                      <div
                        style={smallMuted}
                      >
                        {t.vehicule
                          ? nomModeleVehicule(
                              t.vehicule
                            )
                          : ""}
                      </div>
                    </Td>

                    <Td>

                      <span
                        style={{
                          padding:
                            "4px 8px",
                          borderRadius:
                            999,
                          backgroundColor:
                            t.type ===
                            "DOTATION"
                              ? "#dbeafe"
                              : "#dcfce7",
                          color:
                            t.type ===
                            "DOTATION"
                              ? "#1d4ed8"
                              : "#166534",
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        {t.type ===
                        "DOTATION"
                          ? "Dotation"
                          : "Consommation"}
                      </span>

                    </Td>

                    <Td>
                      <strong>
                        {Number(
                          t.quantiteLitres ||
                            0
                        ).toLocaleString(
                          "fr-FR"
                        )}{" "}
                        L
                      </strong>
                    </Td>

                    <Td>
                      {t.prixUnitaire
                        ? `${Number(
                            t.prixUnitaire
                          ).toLocaleString(
                            "fr-FR"
                          )} Ar`
                        : "—"}
                    </Td>

                    <Td>
                      {t.montantTotal
                        ? `${Number(
                            t.montantTotal
                          ).toLocaleString(
                            "fr-FR"
                          )} Ar`
                        : "—"}
                    </Td>

                    <Td>
                      {t.kilometrage != null
                        ? `${Number(
                            t.kilometrage
                          ).toLocaleString(
                            "fr-FR"
                          )} km`
                        : "—"}
                    </Td>

                    <Td>
                      {t.station ||
                        t.fournisseur ||
                        "—"}
                    </Td>

                    <Td>
                      {t.mission ||
                        "—"}
                    </Td>

                    <Td>

                      {t.justificatif ? (

                        <span
                          style={{
                            color:
                              "#166534",
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          ✓ Fourni
                        </span>

                      ) : t.type ===
                        "CONSOMMATION" ? (

                        <span
                          style={{
                            color:
                              "#dc2626",
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          ⚠ Manquant
                        </span>

                      ) : (

                        <span
                          style={{
                            color:
                              "#94a3b8",
                            fontSize: 11,
                          }}
                        >
                          —
                        </span>

                      )}

                    </Td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      )}

    </Card>

  </section>
)}


        {/* ================================================ */}
        {/* ASSURANCES ET SINISTRES */}
        {/* ================================================ */}

        {onglet === "ASSURANCES" && (
          <section className="panel-scroll">
            <SectionTitre
              titre="Assurances et sinistres"
            
            />

            {/* ================================================= */}
            {/* KPI ASSURANCES / SINISTRES */}
            {/* ================================================= */}

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(6, minmax(0, 1fr))",
                gap: 10,
                marginBottom: 18,
              }}
            >
              <Kpi
                icon={<ShieldCheck size={20} />}
                titre="Polices"
                valeur={assuranceStats.total}
              />

              <Kpi
                icon={<CheckCircle2 size={20} />}
                titre="Assurances valides"
                valeur={assuranceStats.valides}
              />

              <Kpi
                icon={<Clock size={20} />}
                titre="Échéance J-15"
                valeur={assuranceStats.j15}
              />

              <Kpi
                icon={<AlertTriangle size={20} />}
                titre="Assurances expirées"
                valeur={assuranceStats.expirees}
              />

              <Kpi
                icon={<ClipboardList size={20} />}
                titre="Sinistres ouverts"
                valeur={sinistreStats.ouverts}
              />

              <Kpi
                icon={<ClipboardList size={20} />}
                titre="Constats renseignés"
                valeur={`${sinistreStats.avecConstat}/${sinistreStats.total}`}
              />
            </div>

            {/* ================================================= */}
            {/* SAISIE ASSURANCE + SINISTRE */}
            {/* ================================================= */}

            <div
              style={{
                ...twoColumns,
                marginTop: 18,
                marginBottom: 18,
              }}
            >
              {/* =============================================== */}
              {/* POLICE ASSURANCE */}
              {/* =============================================== */}

              <Card>
                <CardTitre
                  icon={
                    <ShieldCheck
                      size={18}
                      color="#5b21b6"
                    />
                  }
                >
                  {assuranceEditionId != null
                    ? "Régulariser / renouveler une police"
                    : "Nouvelle police d'assurance"}
                </CardTitre>

                {assuranceEditionId != null && (
                  <div
                    style={{
                      ...infoApi,
                      border:
                        "1px solid #c4b5fd",
                      backgroundColor:
                        "#f5f3ff",
                      color: "#5b21b6",
                    }}
                  >
                    <strong>
                      Modification d&apos;une police existante
                    </strong>
                    <span>
                      Mettez à jour l&apos;échéance ou les
                      informations puis enregistrez.
                    </span>
                  </div>
                )}

                <form
                  onSubmit={soumettreAssurance}
                  style={formStyle}
                >
                  <Champ label="Véhicule *">
                    <select
                      value={assVehiculeId}
                      onChange={(e) =>
                        setAssVehiculeId(
                          e.target.value
                        )
                      }
                      style={inputStyle}
                      required
                    >
                      <option value="">
                        Sélectionner un véhicule
                      </option>

                      {vehicules.map((v) => (
                        <option
                          key={v.id}
                          value={v.id}
                        >
                          {libelleVehicule(v)}
                        </option>
                      ))}
                    </select>
                  </Champ>

                  <div style={twoInputColumns}>
                    <Champ label="N° de police *">
                      <input
                        value={assNumeroPolice}
                        onChange={(e) =>
                          setAssNumeroPolice(
                            e.target.value
                          )
                        }
                        placeholder="Ex. POL-2026-001"
                        style={inputStyle}
                        required
                      />
                    </Champ>

                    <Champ label="Assureur">
                      <input
                        value={assAssureur}
                        onChange={(e) =>
                          setAssAssureur(
                            e.target.value
                          )
                        }
                        placeholder="Compagnie d'assurance"
                        style={inputStyle}
                      />
                    </Champ>
                  </div>

                  <div style={twoInputColumns}>
                    <Champ label="Date de début">
                      <input
                        type="date"
                        value={assDateDebut}
                        onChange={(e) =>
                          setAssDateDebut(
                            e.target.value
                          )
                        }
                        style={inputStyle}
                      />
                    </Champ>

                    <Champ label="Date d'expiration *">
                      <input
                        type="date"
                        value={assDateExpiration}
                        onChange={(e) =>
                          setAssDateExpiration(
                            e.target.value
                          )
                        }
                        style={inputStyle}
                        required
                      />
                    </Champ>
                  </div>

                  <div style={twoInputColumns}>
                    <Champ label="Type de couverture">
                      <input
                        value={assTypeCouverture}
                        onChange={(e) =>
                          setAssTypeCouverture(
                            e.target.value
                          )
                        }
                        placeholder="Tous risques, tiers..."
                        style={inputStyle}
                      />
                    </Champ>

                    <Champ label="Prime (Ar)">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={assMontantPrime}
                        onChange={(e) =>
                          setAssMontantPrime(
                            e.target.value
                          )
                        }
                        placeholder="Montant"
                        style={inputStyle}
                      />
                    </Champ>
                  </div>

                  <Champ label="Police / pièce justificative">
                    <input
                      value={assDocumentPolice}
                      onChange={(e) =>
                        setAssDocumentPolice(
                          e.target.value
                        )
                      }
                      placeholder="Référence, nom de fichier ou emplacement du document"
                      style={inputStyle}
                    />
                  </Champ>

                  <Champ label="Observation">
                    <textarea
                      value={assObservation}
                      onChange={(e) =>
                        setAssObservation(
                          e.target.value
                        )
                      }
                      rows={3}
                      placeholder="Information complémentaire..."
                      style={{
                        ...inputStyle,
                        resize: "vertical",
                      }}
                    />
                  </Champ>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <ActionButton
                      couleur="vert"
                      disabled={envoiAssurance}
                    >
                      <ShieldCheck size={15} />

                      {envoiAssurance
                        ? "Enregistrement..."
                        : assuranceEditionId != null
                          ? "Enregistrer la régularisation"
                          : "Enregistrer la police"}
                    </ActionButton>

                    {assuranceEditionId != null && (
                      <button
                        type="button"
                        onClick={
                          reinitialiserFormulaireAssurance
                        }
                        style={refreshButton}
                      >
                        <X size={14} />
                        Annuler
                      </button>
                    )}
                  </div>
                </form>
              </Card>

              {/* =============================================== */}
              {/* DECLARATION SINISTRE */}
              {/* =============================================== */}

              <Card>
                <CardTitre
                  icon={
                    <AlertTriangle
                      size={18}
                      color="#dc2626"
                    />
                  }
                >
                  Nouveau dossier de sinistre
                </CardTitre>

               

                <form
                  onSubmit={soumettreSinistre}
                  style={formStyle}
                >
                  <Champ label="Véhicule *">
                    <select
                      value={sinVehiculeId}
                      onChange={(e) =>
                        setSinVehiculeId(
                          e.target.value
                        )
                      }
                      style={inputStyle}
                      required
                    >
                      <option value="">
                        Sélectionner un véhicule
                      </option>

                      {vehicules.map((v) => (
                        <option
                          key={v.id}
                          value={v.id}
                        >
                          {libelleVehicule(v)}
                        </option>
                      ))}
                    </select>
                  </Champ>

                  <div style={twoInputColumns}>
                    <Champ label="Date du sinistre *">
                      <input
                        type="date"
                        value={sinDate}
                        onChange={(e) =>
                          setSinDate(
                            e.target.value
                          )
                        }
                        style={inputStyle}
                        required
                      />
                    </Champ>

                    <Champ label="Conducteur *">
                      <input
                        value={sinConducteur}
                        onChange={(e) =>
                          setSinConducteur(
                            e.target.value
                          )
                        }
                        placeholder="Nom du conducteur"
                        style={inputStyle}
                        required
                      />
                    </Champ>
                  </div>

                  <Champ label="Circonstances *">
                    <textarea
                      value={sinCirconstance}
                      onChange={(e) =>
                        setSinCirconstance(
                          e.target.value
                        )
                      }
                      rows={4}
                      placeholder="Décrire les circonstances de l'accident ou du sinistre..."
                      style={{
                        ...inputStyle,
                        resize: "vertical",
                      }}
                      required
                    />
                  </Champ>

                  <Champ label="Description / dégâts">
                    <textarea
                      value={sinDescription}
                      onChange={(e) =>
                        setSinDescription(
                          e.target.value
                        )
                      }
                      rows={3}
                      placeholder="Dégâts constatés, tiers impliqué, observations..."
                      style={{
                        ...inputStyle,
                        resize: "vertical",
                      }}
                    />
                  </Champ>

                  <Champ label="Constat amiable / pièce jointe">
                    <input
                      value={sinConstatAmiable}
                      onChange={(e) =>
                        setSinConstatAmiable(
                          e.target.value
                        )
                      }
                      placeholder="Référence, nom du document ou emplacement du constat"
                      style={inputStyle}
                    />

                    <div
                      style={{
                        marginTop: 5,
                        color: "#94a3b8",
                        fontSize: 10,
                        lineHeight: 1.4,
                      }}
                    >
                      La pièce est rattachée au dossier si le
                      backend expose le champ de constat.
                    </div>
                  </Champ>

                  <ActionButton
                    couleur="rouge"
                    disabled={envoiSinistre}
                  >
                    <PlusCircle size={15} />

                    {envoiSinistre
                      ? "Déclaration..."
                      : "Créer le dossier de sinistre"}
                  </ActionButton>
                </form>
              </Card>
            </div>

            {/* ================================================= */}
            {/* SUIVI DES POLICES */}
            {/* ================================================= */}

            <Card>
              <div className="agent-flotte-liste-entete"
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 14,
                }}
              >
                <CardTitre
                  icon={
                    <ShieldCheck size={18} />
                  }
                >
                  Suivi des polices et échéances
                </CardTitre>

                <button
                  type="button"
                  onClick={exporterAssurances}
                  style={{...refreshButton, backgroundColor: "#dc2626", borderColor: "#dc2626"}}
                >
                  <Download size={15} />
                  Exporter CSV
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(220px, 2fr) repeat(2, minmax(160px, 1fr))",
                  gap: 9,
                  marginBottom: 15,
                }}
              >
                <div
                  style={{
                    height: 38,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "0 10px",
                    boxSizing: "border-box",
                    border:
                      "1px solid #d1d5db",
                    borderRadius: 7,
                    backgroundColor: "white",
                    color: "#64748b",
                  }}
                >
                  <Search size={15} />

                  <input
                    value={assRecherche}
                    onChange={(e) =>
                      setAssRecherche(
                        e.target.value
                      )
                    }
                    placeholder="Immatriculation, police, assureur..."
                    style={{
                      flex: 1,
                      minWidth: 0,
                      border: 0,
                      outline: 0,
                      background: "transparent",
                      fontSize: 12,
                    }}
                  />
                </div>

                <select
                  value={assFiltreVehicule}
                  onChange={(e) =>
                    setAssFiltreVehicule(
                      e.target.value
                    )
                  }
                  style={inputStyle}
                >
                  <option value="">
                    Tous les véhicules
                  </option>

                  {vehicules.map((v) => (
                    <option
                      key={v.id}
                      value={v.id}
                    >
                      {v.immatriculation}
                    </option>
                  ))}
                </select>

                <select
                  value={assFiltreEtat}
                  onChange={(e) =>
                    setAssFiltreEtat(
                      e.target.value as
                        | "TOUS"
                        | "VALIDES"
                        | "J15"
                        | "EXPIREES"
                    )
                  }
                  style={inputStyle}
                >
                  <option value="TOUS">
                    Toutes les échéances
                  </option>
                  <option value="VALIDES">
                    Valides
                  </option>
                  <option value="J15">
                    Échéance sous 15 jours
                  </option>
                  <option value="EXPIREES">
                    Expirées
                  </option>
                </select>
              </div>

              {assurancesFiltrees.length === 0 ? (
                <BlocVide
                  texte="Aucune police ne correspond aux filtres."
                  compact
                />
              ) : (
                <div style={tableCard}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse:
                        "collapse",
                      minWidth: 1100,
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          backgroundColor:
                            "#ffffff",
                        }}
                      >
                        <Th>Véhicule</Th>
                        <Th>Police</Th>
                        <Th>Assureur</Th>
                        <Th>Couverture</Th>
                        <Th>Début</Th>
                        <Th>Échéance</Th>
                        <Th>État</Th>
                        <Th>Pièce</Th>
                        <Th>Action</Th>
                      </tr>
                    </thead>

                    <tbody>
                      {assurancesFiltrees.map(
                        (a) => (
                          <tr key={String(a.id)}>
                            <Td>
                              <strong>
                                {a.vehicule
                                  ?.immatriculation ||
                                  "—"}
                              </strong>

                              <div
                                style={smallMuted}
                              >
                                {a.vehicule
                                  ? nomModeleVehicule(
                                      a.vehicule
                                    )
                                  : ""}
                              </div>
                            </Td>

                            <Td>
                              <strong>
                                {a.numeroPolice ||
                                  "—"}
                              </strong>
                            </Td>

                            <Td>
                              {a.assureur ||
                                "—"}
                            </Td>

                            <Td>
                              {a.typeCouverture ||
                                "—"}
                            </Td>

                            <Td>
                              {formaterDateSimple(
                                a.dateDebut
                              )}
                            </Td>

                            <Td>
                              {formaterDateSimple(
                                dateEcheanceAssurance(
                                  a
                                )
                              )}
                            </Td>

                            <Td>
                              <BadgeAssurance
                                assurance={a}
                              />
                            </Td>

                            <Td>
                              {a.documentPolice ||
                              a.pieceJointe ? (
                                <span
                                  style={{
                                    color:
                                      "#166534",
                                    fontSize: 11,
                                    fontWeight: 700,
                                  }}
                                >
                                  ✓{" "}
                                  {a.documentPolice ||
                                    a.pieceJointe}
                                </span>
                              ) : (
                                <span
                                  style={{
                                    color:
                                      "#94a3b8",
                                    fontSize: 11,
                                  }}
                                >
                                  Non renseignée
                                </span>
                              )}
                            </Td>

                            <Td>
                              <button
                                type="button"
                                onClick={() =>
                                  preparerModificationAssurance(
                                    a
                                  )
                                }
                                style={{
                                  ...refreshButton,
                                  padding: "7px 10px",
                                  fontSize: 11,
                                }}
                              >
                                <RefreshCw size={13} />
                                Renouveler
                              </button>
                            </Td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* ================================================= */}
            {/* DOSSIERS DE SINISTRES */}
            {/* ================================================= */}

            <div style={{ marginTop: 18 }}>
              <Card>
                <div className="agent-flotte-liste-entete"
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                    marginBottom: 14,
                  }}
                >
                  <CardTitre
                    icon={
                      <AlertTriangle
                        size={18}
                        color="#dc2626"
                      />
                    }
                  >
                    Dossiers de sinistre
                  </CardTitre>

                  <button
                    type="button"
                    onClick={exporterSinistres}
                    style={{...refreshButton, backgroundColor: "#dc2626", borderColor: "#dc2626"}}
                  >
                    <Download size={15} />
                    Exporter CSV
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "minmax(220px, 2fr) repeat(2, minmax(160px, 1fr))",
                    gap: 9,
                    marginBottom: 15,
                  }}
                >
                  <div
                    style={{
                      height: 38,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "0 10px",
                      boxSizing: "border-box",
                      border:
                        "1px solid #d1d5db",
                      borderRadius: 7,
                      backgroundColor: "white",
                      color: "#64748b",
                    }}
                  >
                    <Search size={15} />

                    <input
                      value={sinRecherche}
                      onChange={(e) =>
                        setSinRecherche(
                          e.target.value
                        )
                      }
                      placeholder="Dossier, véhicule, conducteur, circonstances..."
                      style={{
                        flex: 1,
                        minWidth: 0,
                        border: 0,
                        outline: 0,
                        background:
                          "transparent",
                        fontSize: 12,
                      }}
                    />
                  </div>

                  <select
                    value={sinFiltreVehicule}
                    onChange={(e) =>
                      setSinFiltreVehicule(
                        e.target.value
                      )
                    }
                    style={inputStyle}
                  >
                    <option value="">
                      Tous les véhicules
                    </option>

                    {vehicules.map((v) => (
                      <option
                        key={v.id}
                        value={v.id}
                      >
                        {v.immatriculation}
                      </option>
                    ))}
                  </select>

                  <select
                    value={sinFiltreStatut}
                    onChange={(e) =>
                      setSinFiltreStatut(
                        e.target.value
                      )
                    }
                    style={inputStyle}
                  >
                    <option value="TOUS">
                      Tous les statuts
                    </option>
                    <option value="OUVERT">
                      Ouverts
                    </option>
                    <option value="CLOTURE">
                      Clôturés
                    </option>
                  </select>
                </div>

                {sinistresFiltres.length === 0 ? (
                  <BlocVide
                    texte="Aucun dossier de sinistre ne correspond aux filtres."
                    compact
                  />
                ) : (
                  <div style={tableCard}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse:
                          "collapse",
                        minWidth: 1100,
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            backgroundColor:
                              "#ffffff",
                          }}
                        >
                          <Th>Dossier</Th>
                          <Th>Date</Th>
                          <Th>Véhicule</Th>
                          <Th>Conducteur</Th>
                          <Th>Circonstances</Th>
                          <Th>Constat amiable</Th>
                          <Th>Statut</Th>
                          <Th>Détail</Th>
                        </tr>
                      </thead>

                      <tbody>
                        {sinistresFiltres.map(
                          (s) => (
                            <tr
                              key={String(s.id)}
                            >
                              <Td>
                                <strong>
                                  {s.numeroDossier ||
                                    `SIN-${String(
                                      s.id
                                    ).padStart(
                                      5,
                                      "0"
                                    )}`}
                                </strong>
                              </Td>

                              <Td>
                                {formaterDateSimple(
                                  dateSinistreAffiche(
                                    s
                                  )
                                )}
                              </Td>

                              <Td>
                                <strong>
                                  {s.vehicule
                                    ?.immatriculation ||
                                    "—"}
                                </strong>
                              </Td>

                              <Td>
                                {s.conducteur ||
                                  "—"}
                              </Td>

                              <Td>
                                <div
                                  style={{
                                    maxWidth: 300,
                                    lineHeight: 1.45,
                                  }}
                                >
                                  {s.circonstance ||
                                    s.description ||
                                    "—"}
                                </div>
                              </Td>

                              <Td>
                                {valeurConstatAmiable(
                                  s
                                ) ? (
                                  <span
                                    style={{
                                      color:
                                        "#166534",
                                      fontSize: 11,
                                      fontWeight: 700,
                                    }}
                                  >
                                    ✓ Renseigné
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      color:
                                        "#b45309",
                                      fontSize: 11,
                                      fontWeight: 700,
                                    }}
                                  >
                                    À compléter
                                  </span>
                                )}
                              </Td>

                              <Td>
                                <BadgeSinistre
                                  sinistre={s}
                                />
                              </Td>

                              <Td>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSinDossierOuvert(
                                      s.id
                                    )
                                  }
                                  style={{
                                    ...refreshButton,
                                    padding:
                                      "7px 10px",
                                    fontSize: 11,
                                  }}
                                >
                                  <Eye size={14} />
                                  Voir
                                </button>
                              </Td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>

            {/* ================================================= */}
            {/* DETAIL SINISTRE */}
            {/* ================================================= */}

            {sinistreSelectionne && (
              <div
                style={{
                  marginTop: 18,
                }}
              >
                <Card>
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "flex-start",
                      gap: 12,
                      flexWrap: "wrap",
                      marginBottom: 16,
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
                        <AlertTriangle
                          size={18}
                          color="#dc2626"
                        />

                        <h3
                          style={{
                            margin: 0,
                            color: "#111827",
                            fontSize: 16,
                          }}
                        >
                          Dossier de sinistre{" "}
                          {sinistreSelectionne.numeroDossier ||
                            `SIN-${String(
                              sinistreSelectionne.id
                            ).padStart(
                              5,
                              "0"
                            )}`}
                        </h3>

                        <BadgeSinistre
                          sinistre={
                            sinistreSelectionne
                          }
                        />
                      </div>

                      <div
                        style={{
                          marginTop: 5,
                          color: "#64748b",
                          fontSize: 12,
                        }}
                      >
                        {sinistreSelectionne
                          .vehicule
                          ?.immatriculation ||
                          "Véhicule non renseigné"}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSinDossierOuvert(
                          null
                        )
                      }
                      style={{
                        ...refreshButton,
                        padding: "7px 10px",
                      }}
                    >
                      <X size={14} />
                      Fermer
                    </button>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(190px, 1fr))",
                      gap: 10,
                      marginBottom: 12,
                    }}
                  >
                    <DetailInfo
                      label="Véhicule"
                      value={
                        sinistreSelectionne
                          .vehicule
                          ? libelleVehicule(
                              sinistreSelectionne
                                .vehicule
                            )
                          : "—"
                      }
                    />

                    <DetailInfo
                      label="Date du sinistre"
                      value={formaterDateSimple(
                        dateSinistreAffiche(
                          sinistreSelectionne
                        )
                      )}
                    />

                    <DetailInfo
                      label="Conducteur"
                      value={
                        sinistreSelectionne
                          .conducteur ||
                        "—"
                      }
                    />

                    <DetailInfo
                      label="Date déclaration"
                      value={formaterDate(
                        sinistreSelectionne
                          .dateDeclaration
                      )}
                    />

                    <DetailInfo
                      label="Date clôture"
                      value={formaterDate(
                        sinistreSelectionne
                          .dateCloture
                      )}
                    />

                    <DetailInfo
                      label="Constat amiable"
                      value={
                        valeurConstatAmiable(
                          sinistreSelectionne
                        ) ||
                        "Non renseigné"
                      }
                    />
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(280px, 1fr))",
                      gap: 12,
                    }}
                  >
                    <DetailBloc
                      titre="Circonstances"
                      contenu={
                        sinistreSelectionne
                          .circonstance ||
                        "—"
                      }
                    />

                    <DetailBloc
                      titre="Description / dégâts"
                      contenu={
                        sinistreSelectionne
                          .description ||
                        "—"
                      }
                    />

                    <DetailBloc
                      titre="Constat amiable / pièce"
                      contenu={
                        valeurConstatAmiable(
                          sinistreSelectionne
                        ) ||
                        "Aucun constat renseigné."
                      }
                    />

                    <DetailBloc
                      titre="Traçabilité"
                      contenu={
                        [
                          sinistreSelectionne
                            .auteurEmail ||
                            sinistreSelectionne
                              .agentEmail,
                          sinistreSelectionne
                            .observation,
                        ]
                          .filter(Boolean)
                          .join(" • ") ||
                        "Informations de traçabilité non retournées par l'API."
                      }
                    />
                  </div>
                </Card>
              </div>
            )}
          </section>
        )}
        </div>
      </div>

      <style>{`
  .agent-flotte-page {
    width: 100%;
    height: 100vh;
    min-height: 100vh;
    overflow: hidden;
    background: #f3f4f6;
  }

  .agent-flotte-main {
    width: 100%;
    height: calc(100vh - 64px);
    min-height: 0;
    max-width: none;
    margin: 0;
    padding: 16px 16px 0;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .dashboard-content {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    margin-left: -16px;
    margin-right: -16px;
  }

  .panel-scroll {
    height: 100%;
    min-height: 0;
    overflow: auto;
    padding: 0 16px 16px;
    box-sizing: border-box;
  }

  .suivi-panel {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    background: #dbe3e8;
  }

  .suivi-panel { display: flex; flex-direction: column; }
  .gps-history-toolbar {
    flex: 0 0 auto; display: flex; justify-content: space-between;
    align-items: center; gap: 10px; flex-wrap: wrap; background: #fff;
    border-bottom: 1px solid #e2e8f0; padding: 8px 14px;
  }
  .gps-content {
    position: relative;
    width: 100%;
    height: auto;
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
  }
  .gps-historique-zone {
    position: absolute; inset: 0; overflow: auto; background: #f8fafc;
    box-sizing: border-box; padding: 18px 20px;
  }
  .gps-historique-zone.avec-liste { padding-left: 418px; }

  .gps-map {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #dbe3e8;
    z-index: 1;
  }

  .gps-map > div {
    width: 100% !important;
    height: 100% !important;
    min-height: 0 !important;
    border-radius: 0 !important;
  }

  .gps-list {
    position: absolute;
    left: 7px;
    top: 7px;
    bottom: 7px;
    width: 390px;
    max-width: calc(100vw - 20px);
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: rgba(255,255,255,.98);
    border: 1px solid #d9e0e7;
    border-radius: 7px;
    box-shadow: 0 2px 12px rgba(15,23,42,.20);
    overflow: hidden;
    z-index: 30;
  }

  .agent-flotte-liste-entete {
    padding: 12px 14px;
    border-radius: 8px;
    background: #ffffff;
    color: #334155;
    border-bottom: 1px solid #e2e8f0;
  }

  .agent-flotte-liste-entete h3,
  .agent-flotte-liste-entete svg {
    color: #334155 !important;
  }

  .agent-flotte-liste-entete > div {
    margin-bottom: 0 !important;
  }

  .agent-flotte-liste-entete button svg {
    color: inherit !important;
  }

  .gps-list-header {
    flex: 0 0 47px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 10px 0 16px;
    border-bottom: 1px solid #e2e8f0;
    background: #ffffff;
  }

  .gps-list-header strong {
    color: #334155;
    font-size: 15px;
    font-weight: 700;
    white-space: nowrap;
  }

  .gps-list-close {
    width: 30px;
    height: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: #334155;
    cursor: pointer;
  }

  .gps-list-close:hover {
    background: #f1f5f9;
  }

  .gps-search-row {
    flex: 0 0 58px;
    display: grid;
    grid-template-columns: minmax(0,1fr) 42px;
    gap: 8px;
    padding: 8px 12px 9px;
    box-sizing: border-box;
    background: #fff;
  }

  .gps-search {
    height: 37px;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 0 11px;
    box-sizing: border-box;
    border: 1px solid #edf1f5;
    border-radius: 6px;
    background: #f7f9fb;
    color: #64748b;
  }

  .gps-search input {
    width: 100%;
    height: 100%;
    min-width: 0;
    padding: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: #334155;
    font-size: 12px;
  }

  .gps-search input::placeholder {
    color: #a0acba;
  }

  .gps-filter-button {
    height: 37px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 6px;
    background: #2563eb;
    color: #ffffff;
    cursor: pointer;
  }

  .gps-filter-button:hover {
    background: #1d4ed8;
  }

  .gps-list-scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    background: #fff;
  }

  .gps-list-scroll::-webkit-scrollbar {
    width: 7px;
  }

  .gps-list-scroll::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 10px;
  }

  .gps-list-item {
    width: 100%;
    min-height: 53px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 6px 14px;
    border: 0;
    border-top: 1px solid #f0f3f6;
    background: #fff;
    text-align: left;
    cursor: pointer;
  }

  .gps-list-item:hover {
    background: #f8fafc;
  }

  .gps-list-item.selected {
    background: #f7fbff;
    box-shadow: inset 3px 0 0 #1597df;
  }

  .gps-list-check {
    width: 20px;
    height: 20px;
    flex: 0 0 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 2px;
    background: #1597df;
    color: #fff;
    font-size: 14px;
    font-weight: 800;
    line-height: 1;
  }

  .gps-list-info {
    min-width: 0;
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .gps-list-info strong {
    color: #334155;
    font-size: 13px;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .gps-list-info span {
    color: #64748b;
    font-size: 11px;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .gps-list-info small {
    color: #94a3b8;
    font-size: 10px;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .gps-list-dot {
    width: 12px;
    height: 12px;
    flex: 0 0 12px;
    border-radius: 50%;
    display: inline-block;
    background: #ef4444;
  }

  .gps-list-dot.connected {
    background: #16a34a;
  }

  .gps-list-dot.offline {
    background: #ef4444;
  }

  .gps-selected-info {
    position: absolute;
    left: 410px;
    right: 18px;
    bottom: 14px;
    min-height: 76px;
    display: flex;
    align-items: stretch;
    background: rgba(255,255,255,.96);
    border: 1px solid #dce3ea;
    border-radius: 8px;
    box-shadow: 0 3px 14px rgba(15,23,42,.18);
    overflow: hidden;
    z-index: 25;
  }

  .gps-selected-vehicle {
    width: 220px;
    min-width: 220px;
    padding: 12px 15px;
    box-sizing: border-box;
    border-right: 1px solid #e5e7eb;
  }

  .gps-selected-vehicle strong {
    display: block;
    color: #334155;
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .gps-selected-vehicle span {
    display: block;
    margin-top: 3px;
    color: #64748b;
    font-size: 11px;
  }

  .gps-selected-grid {
    flex: 1;
    min-width: 0;
    display: grid;
    grid-template-columns: repeat(5,minmax(90px,1fr));
  }

  .gps-info {
    min-width: 0;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 3px;
    border-right: 1px solid #f1f5f9;
  }

  .gps-info span {
    color: #94a3b8;
    font-size: 9px;
  }

  .gps-info strong {
    color: #475569;
    font-size: 11px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .gps-list-reopen {
    position: absolute;
    left: 10px;
    top: 10px;
    z-index: 35;
    width: 42px;
    height: 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    border: 0;
    border-radius: 6px;
    background: #2563eb;
    color: #ffffff;
    box-shadow: 0 2px 8px rgba(15,23,42,.18);
    cursor: pointer;
  }

  .gps-list-reopen:hover {
    background: #1d4ed8;
  }

  .gps-no-position {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    background: #e8edf1;
  }

  .gps-no-position svg {
    color: #94a3b8;
  }

  .gps-no-position strong {
    margin-top: 10px;
    color: #475569;
    font-size: 14px;
  }

  .gps-no-position span {
    max-width: 380px;
    margin-top: 5px;
    color: #94a3b8;
    font-size: 11px;
  }

  .gps-list-empty {
    padding: 30px 15px;
    color: #94a3b8;
    text-align: center;
    font-size: 11px;
  }

  @media (max-width: 900px) {
    .gps-list {
      width: 340px;
    }
    .gps-historique-zone.avec-liste { padding-left: 364px; }

    .gps-selected-info {
      left: 360px;
    }

    .gps-selected-vehicle {
      width: 170px;
      min-width: 170px;
    }

    .gps-selected-grid {
      grid-template-columns: repeat(3,minmax(85px,1fr));
    }
  }

  @media (max-width: 650px) {
    .agent-flotte-main {
      padding: 10px 10px 0;
    }

    .dashboard-content {
      margin-left: -10px;
      margin-right: -10px;
    }

    .gps-list {
      width: calc(100vw - 20px);
      max-width: 360px;
    }
    .gps-historique-zone.avec-liste { padding-left: 10px; padding-top: 20px; }
    .gps-history-toolbar { align-items: flex-start; }

    .gps-selected-info {
      display: none;
    }
  }
`}</style>
    </div>
    


  );
}

// =========================================================
// NOUVEAU PANNEAU GPS
// =========================================================

function SuiviFlottePanel({
  vehicules,
  positionsGps,
  gpsParVehicule,
  missionsActives,
  missionParVehicule,
  prochaineMissionParVehicule,
  erreurGps,
  derniereMajGps,
}: {
  vehicules: Vehicule[];
  positionsGps: GpsPosition[];
  gpsParVehicule: Map<number, GpsPosition>;
  missionsActives: Reservation[];
  missionParVehicule: Map<number, Reservation>;
  prochaineMissionParVehicule: Map<number, Reservation>;
  erreurGps: string | null;
  derniereMajGps: Date | null;
}) {
  const vehiculesGps = useMemo(
    () =>
      vehicules.filter(
        (v) =>
          v.gpsEquipe === true ||
          v.gpsDeviceId != null ||
          gpsParVehicule.has(v.id)
      ),
    [vehicules, gpsParVehicule]
  );

  const [selection, setSelection] = useState<number | null>(null);
  // Permet de recentrer aussi lorsqu'on clique une seconde fois sur le même véhicule.
  // Ne change pas au rafraîchissement GPS : la carte n'est pas recréée toutes les 5 secondes.
  const [versionCentrage, setVersionCentrage] = useState(0);
  const [recherche, setRecherche] = useState("");
  const [listeOuverte, setListeOuverte] = useState(true);
  const [vueGps, setVueGps] = useState<VueSuiviGps>("CARTE");
  const [dateHistorique, setDateHistorique] = useState(dateLocaleGps);
  const [versionHistorique, setVersionHistorique] = useState(0);
  const [chargementHistorique, setChargementHistorique] = useState(false);
  const [erreurHistorique, setErreurHistorique] = useState<string | null>(null);
  const [relevesHistorique, setRelevesHistorique] = useState<GpsReleveHistorique[]>([]);
  const [distanceJourApi, setDistanceJourApi] = useState<number | null>(null);
  const API = process.env.NEXT_PUBLIC_API_URL;

  // Ces relevés doivent venir d'un historique persisté côté serveur : le dernier
  // point GPS /gps/positions ne peut pas reconstituer les trajets d'hier.
  useEffect(() => {
    if (vueGps === "CARTE" || selection == null) return;
    const controleur = new AbortController();
    const chargerHistorique = async () => {
      setChargementHistorique(true);
      setErreurHistorique(null);
      setRelevesHistorique([]);
      setDistanceJourApi(null);
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!API || !token) {
        setErreurHistorique("API SPAT ou session indisponible. Reconnectez-vous si nécessaire.");
        setChargementHistorique(false);
        return;
      }
      try {
        const url = `${API}/gps/historique?vehiculeId=${encodeURIComponent(selection)}&date=${encodeURIComponent(dateHistorique)}`;
        const reponse = await fetch(url, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          cache: "no-store",
          signal: controleur.signal,
        });
        if (!reponse.ok) {
          if (reponse.status === 404) {
            throw new Error("Historique GPS non disponible : l'endpoint /gps/historique doit être ajouté au backend et les relevés GPS doivent y être conservés.");
          }
          if (reponse.status === 401 || reponse.status === 403) {
            throw new Error(`Accès à l'historique refusé (HTTP ${reponse.status}). Vérifier l'autorisation AGENT_FLOTTE côté backend.`);
          }
          throw new Error(`Historique GPS indisponible (HTTP ${reponse.status}).`);
        }
        const charge: unknown = await reponse.json();
        const objet = charge && typeof charge === "object" && !Array.isArray(charge)
          ? charge as { positions?: unknown; releves?: unknown; distanceJourKm?: unknown }
          : null;
        const lignes = Array.isArray(charge)
          ? charge
          : objet?.positions ?? objet?.releves;
        if (!Array.isArray(lignes)) throw new Error("Réponse historique invalide : liste de positions attendue.");
        const triees = (lignes as GpsReleveHistorique[])
          .filter((r) => r != null && typeof r === "object" && Number.isFinite(dateReleveGps(r)))
          .sort((a, b) => dateReleveGps(a) - dateReleveGps(b));
        const distance = objet?.distanceJourKm;
        if (!controleur.signal.aborted) {
          setRelevesHistorique(triees);
          setDistanceJourApi(typeof distance === "number" && Number.isFinite(distance) && distance >= 0 ? distance : null);
        }
      } catch (erreur) {
        if (!controleur.signal.aborted) {
          setErreurHistorique(erreur instanceof Error ? erreur.message : "Erreur de chargement de l'historique GPS.");
        }
      } finally {
        if (!controleur.signal.aborted) setChargementHistorique(false);
      }
    };
    void chargerHistorique();
    return () => controleur.abort();
  }, [API, selection, dateHistorique, vueGps, versionHistorique]);

  const relevesAvecDistance = useMemo(() => {
    let precedent: number | null = null;
    let total = 0;
    let segmentsValides = 0;
    const lignes = relevesHistorique.map((releve) => {
      const km = nombreGps(releve.odometreKm);
      let distanceSegmentKm: number | null = null;
      if (km !== null && km >= 0) {
        if (precedent !== null) {
          const ecart = km - precedent;
          // Une baisse d'odomètre = remise à zéro. Un écart > 1 500 km
          // entre deux relevés est écarté, en attendant confirmation serveur.
          if (ecart >= 0 && ecart <= 1500) {
            distanceSegmentKm = ecart;
            total += ecart;
            segmentsValides++;
          }
        }
        precedent = km;
      }
      return { releve, distanceSegmentKm, distanceCumuleeKm: total };
    });
    return { lignes, totalEstime: segmentsValides > 0 ? total : null };
  }, [relevesHistorique]);
  const distanceJourEstimee = relevesAvecDistance.totalEstime;

  const distanceAffichee = distanceJourApi ?? distanceJourEstimee;
  const exporterJournalGps = () => {
    if (!vehiculeSelectionne || relevesHistorique.length === 0) return;
    exporterCsvGenerique(`journal_gps_${vehiculeSelectionne.immatriculation}_${dateHistorique}.csv`, [
      ["Date GPS", "Latitude", "Longitude", "Vitesse (km/h)", "Altitude (m)", "Angle (°)", "Odomètre (km)", "Distance depuis le relevé précédent (km)", "Distance cumulée observée (km)"],
      ...relevesAvecDistance.lignes.map(({ releve: r, distanceSegmentKm, distanceCumuleeKm }) => [
        formaterDate(dateIsoReleveGps(r)), r.latitude, r.longitude, r.vitesse,
        r.altitude, r.course, r.odometreKm, distanceSegmentKm, distanceCumuleeKm,
      ]),
    ]);
    toast.success("Journal GPS exporté.");
  };

  useEffect(() => {
    if (vehiculesGps.length === 0) {
      setSelection(null);
      return;
    }

    if (
      selection == null ||
      !vehiculesGps.some((v) => v.id === selection)
    ) {
      setSelection(vehiculesGps[0].id);
    }
  }, [vehiculesGps, selection]);

  const vehiculesFiltres = useMemo(() => {
    const terme = recherche.trim().toLowerCase();

    if (!terme) return vehiculesGps;

    return vehiculesGps.filter((v) => {
      const texte = [
        v.immatriculation,
        v.marque,
        v.modele,
        v.modeleType,
        v.affectation,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return texte.includes(terme);
    });
  }, [vehiculesGps, recherche]);

  const vehiculeSelectionne =
    vehiculesGps.find((v) => v.id === selection) || null;

  const positionSelectionnee = vehiculeSelectionne
    ? gpsParVehicule.get(vehiculeSelectionne.id) || null
    : null;

  const positionsCartographie = useMemo(() => {
    if (selection === null) return [];
    const p = gpsParVehicule.get(selection);
    if (!p) return [];

    // Une position absente ou hors limites ne peut pas servir au recentrage.
    // Certains serveurs renvoient les coordonnées sous forme de chaînes JSON.
    const latitude = p.latitude == null ? NaN : Number(p.latitude);
    const longitude = p.longitude == null ? NaN : Number(p.longitude);
    if (
      !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 || Math.abs(longitude) > 180 ||
      (latitude === 0 && longitude === 0)
    ) return [];

    return [{ ...p, latitude, longitude }];
  }, [selection, gpsParVehicule]);
  const statutSelection = positionSelectionnee?.statutGps || "Hors ligne";
  const vitesseSelection = positionSelectionnee?.vitesse ?? 0;
  const odometreSelection = positionSelectionnee?.odometreKm;
  const dateSelection = positionSelectionnee?.dateGps ||
    (positionSelectionnee?.timestampGps
      ? new Date(positionSelectionnee.timestampGps * 1000).toISOString()
      : null);
  const missionSelection = vehiculeSelectionne
    ? missionParVehicule.get(vehiculeSelectionne.id) || null
    : null;

  return (
    <section className="suivi-panel">
      <div className="gps-history-toolbar" aria-label="Mode de suivi GPS">
        <strong style={{ fontSize: 13, color: "#334155" }}>Suivi GPS SPAT</strong>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          <button type="button" aria-pressed={vueGps === "CARTE"}
            onClick={() => setVueGps("CARTE")}
            style={{ ...refreshButton, backgroundColor: vueGps === "CARTE" ? "#2563eb" : "#64748b", borderColor: vueGps === "CARTE" ? "#2563eb" : "#64748b" }}>
            <MapPin size={15} /> Carte en direct
          </button>
          <button type="button" aria-pressed={vueGps === "HISTORIQUE"}
            onClick={() => setVueGps("HISTORIQUE")}
            style={{ ...refreshButton, backgroundColor: vueGps === "HISTORIQUE" ? "#16a34a" : "#15803d", borderColor: "#15803d" }}>
            <Route size={15} /> Distance / historique
          </button>
          <button type="button" aria-pressed={vueGps === "JOURNAL"}
            onClick={() => setVueGps("JOURNAL")}
            style={{ ...refreshButton, backgroundColor: vueGps === "JOURNAL" ? "#dc2626" : "#b91c1c", borderColor: "#dc2626" }}>
            <ClipboardList size={15} /> Journal des données
          </button>
          {vueGps !== "CARTE" && (
            <>
              <label htmlFor="jour-gps-spat" style={{ fontSize: 12, color: "#475569" }}>Jour</label>
              <input id="jour-gps-spat" type="date" value={dateHistorique}
                onChange={(e) => setDateHistorique(e.target.value)}
                style={{ ...inputStyle, width: 153, minHeight: 39 }} />
              <button type="button" onClick={() => setVersionHistorique((v) => v + 1)}
                style={refreshButton} aria-label="Actualiser l'historique GPS">
                <RefreshCw size={15} /> Actualiser
              </button>
            </>
          )}
        </div>
      </div>
      <div className="gps-content">
        {vueGps === "CARTE" ? <div className="gps-map">
          {positionsCartographie.length > 0 ? (
            <FlotteMap
              // Le composant de carte initialise parfois son centre uniquement au montage.
              // On le remonte donc au clic pour qu'il lise la position du véhicule choisi.
              // La clé reste stable lorsque les données GPS sont simplement rafraîchies.
              key={`vehicule-${selection ?? "aucun"}-centrage-${versionCentrage}`}
              positions={positionsCartographie}
              height="100%"
              showHeader={false}
            />
          ) : (
            <div className="gps-no-position">
              <MapPin size={38} />
              <strong>
                {erreurGps
                  ? "Service GPS momentanément indisponible"
                  : "Aucune position GPS disponible"}
              </strong>
              <span>
                  {erreurGps ||
                    (vehiculeSelectionne
                      ? `Aucune coordonnée GPS valide pour ${vehiculeSelectionne.immatriculation}.`
                      : "Les véhicules équipés GPS apparaîtront automatiquement sur la carte.")}
              </span>
            </div>
          )}
        </div> : (
          <section className={`gps-historique-zone ${listeOuverte ? "avec-liste" : ""}`}
            aria-label={vueGps === "HISTORIQUE" ? "Historique du véhicule" : "Journal GPS du véhicule"}>
            <h3 style={{ margin: "0 0 12px", color: "#0f172a", fontSize: 17 }}>
              {vueGps === "HISTORIQUE" ? "Distance parcourue et historique" : "Journal des relevés GPS"}
            </h3>
            <p style={{ color: "#475569", fontSize: 12, margin: "0 0 14px" }}>
              {vehiculeSelectionne
                ? `${vehiculeSelectionne.immatriculation} · ${dateHistorique}`
                : "Sélectionnez un véhicule dans la liste de gauche."}
            </p>
            {chargementHistorique ? (
              <div style={infoApi}>Chargement des relevés enregistrés…</div>
            ) : erreurHistorique ? (
              <div role="alert" style={{ ...infoApi, backgroundColor: "#fef2f2", borderColor: "#fecaca", color: "#991b1b" }}>
                {erreurHistorique}
              </div>
            ) : relevesHistorique.length === 0 ? (
              <div style={infoApi}>Aucun relevé GPS enregistré pour ce véhicule à cette date.</div>
            ) : vueGps === "HISTORIQUE" ? (
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ ...cardStyleHistorique, borderLeft: "5px solid #16a34a" }}>
                  <span style={{ color: "#64748b", fontSize: 12 }}>Distance du jour</span>
                  <div style={{ fontSize: 30, fontWeight: 800, color: "#166534", marginTop: 3 }}>
                    {distanceAffichee === null ? "Indisponible" : `${distanceAffichee.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} km`}
                  </div>
                  
                </div>
                <div style={cardStyleHistorique}>
                  <strong style={{ color: "#334155" }}>Historique du {dateHistorique}</strong>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginTop: 12 }}>
                    <GpsResumeJour titre="Relevés reçus" valeur={String(relevesHistorique.length)} />
                    <GpsResumeJour titre="Premier relevé" valeur={formaterHeureReleveGps(relevesHistorique[0])} />
                    <GpsResumeJour titre="Dernier relevé" valeur={formaterHeureReleveGps(relevesHistorique[relevesHistorique.length - 1])} />
                    <GpsResumeJour titre="Odomètre initial" valeur={formatterKmCourt(nombreGps(relevesHistorique[0].odometreKm))} />
                    <GpsResumeJour titre="Odomètre final" valeur={formatterKmCourt(nombreGps(relevesHistorique[relevesHistorique.length - 1].odometreKm))} />
                  </div>
                </div>
               
              </div>
            ) : (
              <div style={cardStyleHistorique}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                  <strong style={{ color: "#334155" }}>{relevesHistorique.length} relevé(s) enregistrés</strong>
                  <button type="button" style={{ ...refreshButton, backgroundColor: "#dc2626", borderColor: "#dc2626" }}
                    onClick={exporterJournalGps}><Download size={15} /> Exporter CSV</button>
                </div>
                <div style={{ overflowX: "auto", maxHeight: "min(54vh, 520px)", overflowY: "auto" }}>
                  <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 850 }}>
                    <thead><tr>
                      {["Heure GPS", "Latitude", "Longitude", "Vitesse", "Altitude", "Angle", "Odomètre", "Distance segment", "Cumul observé"].map((titre) =>
                        <th key={titre} style={{ ...celluleJournalGps, position: "sticky", top: 0, backgroundColor: "#ffffff", color: "#334155", fontWeight: 800 }}>{titre}</th>
                      )}
                    </tr></thead>
                    <tbody>{relevesAvecDistance.lignes.map(({ releve: r, distanceSegmentKm, distanceCumuleeKm }, i) => (
                      <tr key={`${r.id ?? dateReleveGps(r)}-${i}`}>
                        <td style={celluleJournalGps}>{formaterHeureReleveGps(r)}</td>
                        <td style={celluleJournalGps}>{nombreAfficheGps(r.latitude, 6)}</td>
                        <td style={celluleJournalGps}>{nombreAfficheGps(r.longitude, 6)}</td>
                        <td style={celluleJournalGps}>{nombreAfficheGps(r.vitesse, 1)} km/h</td>
                        <td style={celluleJournalGps}>{nombreAfficheGps(r.altitude, 1)} m</td>
                        <td style={celluleJournalGps}>{nombreAfficheGps(r.course, 1)}°</td>
                        <td style={celluleJournalGps}>{formatterKmCourt(nombreGps(r.odometreKm))}</td>
                        <td style={celluleJournalGps}>{formatterKmCourt(distanceSegmentKm)}</td>
                        <td style={celluleJournalGps}>{formatterKmCourt(distanceCumuleeKm)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        {listeOuverte ? (
          <aside className="gps-list">
            <div className="gps-list-header">
              <strong>
                Véhicules équipés GPS ({vehiculesGps.length})
              </strong>

              <button
                type="button"
                className="gps-list-close"
                aria-label="Fermer la liste des véhicules GPS"
                title="Fermer"
                onClick={() => setListeOuverte(false)}
              >
                <X size={17} />
              </button>
            </div>

            <div className="gps-search-row">
              <div className="gps-search">
                <Search size={17} />
                <input
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  placeholder="Rechercher un véhicule..."
                  aria-label="Rechercher un véhicule GPS"
                />
              </div>

              <button
                type="button"
                className="gps-filter-button"
                aria-label="Options de filtre"
                title="Filtrer"
              >
                <ChevronDown size={17} />
              </button>
            </div>

            <div className="gps-list-scroll">
              {vehiculesFiltres.length === 0 ? (
                <div className="gps-list-empty">
                  {vehiculesGps.length === 0
                    ? "Aucun véhicule équipé GPS."
                    : "Aucun véhicule correspondant à la recherche."}
                </div>
              ) : (
                vehiculesFiltres.map((v) => {
                  const p = gpsParVehicule.get(v.id);
                  const selected = v.id === selection;
                  const vitesse = p?.vitesse != null
                    ? `${Number(p.vitesse).toLocaleString("fr-FR")} km/h`
                    : "0 km/h";

                  const datePosition = p?.dateGps ||
                    (p?.timestampGps
                      ? new Date(p.timestampGps * 1000).toISOString()
                      : null);

                  const online =
                    String(p?.statutGps || "").toLowerCase() === "online";

                  return (
                    <button
                      key={v.id}
                      type="button"
                      className={`gps-list-item ${selected ? "selected" : ""}`}
                      onClick={() => {
                        setSelection(v.id);
                        setVersionCentrage((precedente) => precedente + 1);
                      }}
                    >
                      <span className="gps-list-check">✓</span>

                      <span className="gps-list-info">
                        <strong>{v.immatriculation}</strong>
                        <span>{nomModeleVehicule(v)}</span>
                        <small>
                          {datePosition
                            ? `${formaterDateHeureGps(datePosition)} • `
                            : ""}
                          {vitesse}
                        </small>
                      </span>

                      <span
                        className={`gps-list-dot ${online ? "connected" : "offline"}`}
                      />
                    </button>
                  );
                })
              )}
            </div>
          </aside>
        ) : (
          <button
            type="button"
            className="gps-list-reopen"
            onClick={() => setListeOuverte(true)}
            title="Afficher les véhicules GPS"
          >
            <Users size={17} />
            {vehiculesGps.length}
          </button>
        )}

        {vehiculeSelectionne && vueGps === "CARTE" && (
          <div className="gps-selected-info">
            <div className="gps-selected-vehicle">
              <strong>{vehiculeSelectionne.immatriculation}</strong>
              <span>{nomModeleVehicule(vehiculeSelectionne)}</span>
            </div>

            <div className="gps-selected-grid">
              <GpsInfo
                label="État GPS"
                value={statutSelection}
              />
              <GpsInfo
                label="Vitesse"
                value={`${Math.round(Number(vitesseSelection) || 0)} km/h`}
              />
              <GpsInfo
                label="Kilométrage"
                value={formatterKmCourt(odometreSelection)}
              />
              <GpsInfo
                label="Dernière position"
                value={dateSelection ? formaterDateHeureGps(dateSelection) : "—"}
              />
              <GpsInfo
                label="Mission"
                value={missionSelection?.motif || "Aucune mission"}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// Date locale, sans dérive UTC autour de minuit.
function dateLocaleGps() {
  const maintenant = new Date();
  return `${maintenant.getFullYear()}-${String(maintenant.getMonth() + 1).padStart(2, "0")}-${String(maintenant.getDate()).padStart(2, "0")}`;
}

function dateReleveGps(r: GpsReleveHistorique): number {
  if (r.dateGps) return new Date(r.dateGps).getTime();
  const t = Number(r.timestampGps);
  if (!Number.isFinite(t) || t <= 0) return NaN;
  return t < 1e12 ? t * 1000 : t;
}

function dateIsoReleveGps(r: GpsReleveHistorique): string {
  const t = dateReleveGps(r);
  return Number.isFinite(t) ? new Date(t).toISOString() : "";
}

function formaterHeureReleveGps(r: GpsReleveHistorique): string {
  const t = dateReleveGps(r);
  return Number.isFinite(t) ? new Date(t).toLocaleTimeString("fr-FR") : "—";
}

function nombreGps(valeur: unknown): number | null {
  if (valeur == null || valeur === "") return null;
  const n = Number(valeur);
  return Number.isFinite(n) ? n : null;
}

function nombreAfficheGps(valeur: unknown, decimales: number): string {
  const n = nombreGps(valeur);
  return n === null ? "—" : n.toLocaleString("fr-FR", { maximumFractionDigits: decimales });
}


// =========================================================
// NORMES CARBURANT — REFERENCES FOURNIES POUR VEHICULES GPS
// =========================================================
// Le classeur transmis renseigne NEUF immatriculations, pas dix.
// Ne jamais attribuer à la dixième une norme calculée ou empruntée
// à un modèle voisin : une référence absente reste à renseigner.
const REFERENCES_CONSOMMATION_GPS: Record<
  string,
  { min: number; max: number; categorie: string }
> = {
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

function normaliserPlaqueGps(valeur: string): string {
  return valeur.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function jourOperationCarburant(dateOperation: string): string | null {
  const jour = String(dateOperation || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(jour) && !Number.isNaN(Date.parse(`${jour}T12:00:00`))
    ? jour : null;
}

type RatioCarburantGPS = {
  km: number;
  litres: number;
  ratio: number;
  debut: string;
  fin: string;
};

function calculerRatioCarburantIndicatif(
  operations: TransactionCarburant[]
): RatioCarburantGPS | null {
  // Première et dernière observation kilométrique datées, sur deux jours
  // distincts ; pas de soustraction du kilométrage GPS actuel à une date
  // antérieure sans litres couvrant exactement la même période.
  const points = operations.flatMap((t) => {
    const jour = jourOperationCarburant(t.dateOperation);
    const km = t.kilometrage == null ? NaN : Number(t.kilometrage);
    return jour && Number.isFinite(km) && km >= 0 ? [{ jour, km }] : [];
  }).sort((a, b) => a.jour.localeCompare(b.jour) || a.km - b.km);

  const debut = points[0];
  const fin = points[points.length - 1];
  if (!debut || !fin || debut.jour >= fin.jour || fin.km <= debut.km) return null;

  const litres = operations.reduce((total, t) => {
    const jour = jourOperationCarburant(t.dateOperation);
    const volume = Number(t.quantiteLitres);
    if (String(t.type).toUpperCase() !== "CONSOMMATION" ||
        !jour || jour <= debut.jour || jour > fin.jour ||
        !Number.isFinite(volume) || volume <= 0) return total;
    return total + volume;
  }, 0);

  const km = fin.km - debut.km;
  if (litres <= 0 || km <= 0) return null;
  return { km, litres, ratio: (litres / km) * 100, debut: debut.jour, fin: fin.jour };
}

function NormesCarburantGps({
  vehicules,
  positionsGps,
  transactions,
}: {
  vehicules: Vehicule[];
  positionsGps: GpsPosition[];
  transactions: TransactionCarburant[];
}) {
  const lignes = useMemo(() => {
    const pointsGps = new Map<number, GpsPosition>();
    positionsGps.forEach((p) => {
      if (p.vehiculeId != null) pointsGps.set(p.vehiculeId, p);
    });

    // La liste correspond aux véhicules enregistrés comme équipés GPS,
    // ou effectivement renvoyés par le service /gps/positions.
    return vehicules
      .filter((v) => v.gpsEquipe === true || v.gpsDeviceId != null || pointsGps.has(v.id))
      .sort((a, b) => a.immatriculation.localeCompare(b.immatriculation, "fr", { numeric: true }))
      .map((vehicule) => {
        const reference = REFERENCES_CONSOMMATION_GPS[
          normaliserPlaqueGps(vehicule.immatriculation)
        ] ?? null;
        const gps = pointsGps.get(vehicule.id) ?? null;
        const operations = transactions.filter((t) => t.vehicule?.id === vehicule.id);
        const mesure = calculerRatioCarburantIndicatif(operations);
        const kmGps = gps?.odometreKm == null ? null : Number(gps.odometreKm);
        return {
          vehicule,
          reference,
          gps,
          mesure,
          kmGps: kmGps !== null && Number.isFinite(kmGps) && kmGps >= 0 ? kmGps : null,
        };
      });
  }, [vehicules, positionsGps, transactions]);

  const avecNorme = lignes.filter((l) => l.reference !== null).length;
  const comparables = lignes.filter((l) => l.reference && l.mesure && l.mesure.km >= 100);
  const depassements = comparables.filter((l) => l.mesure!.ratio > l.reference!.max).length;
  const n = (value: number, fraction = 1) => value.toLocaleString("fr-FR", {
    minimumFractionDigits: fraction, maximumFractionDigits: fraction,
  });
  const jourFr = (date: string) => date.split("-").reverse().join("/");

  return (
    <section style={{
      background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 10,
      padding: 16, marginBottom: 18,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
        <div>
          <h3 style={{ margin: 0, color: "#1e293b", fontSize: 16 }}>
            Normes de consommation — véhicules équipés GPS
          </h3>
          <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: 12 }}>
            Référentiel transmis : 9 immatriculations, fourchettes en L/100 km.
            Les véhicules sans norme correspondante restent « Norme à renseigner ».
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12, fontWeight: 700, color: "#334155" }}>
          <span style={{ padding: "7px 9px", borderRadius: 7, background: "#f1f5f9" }}>
            GPS : {lignes.length}
          </span>
          <span style={{ padding: "7px 9px", borderRadius: 7, background: "#eff6ff", color: "#1d4ed8" }}>
            Normes associées : {avecNorme}/{lignes.length}
          </span>
          <span style={{ padding: "7px 9px", borderRadius: 7, background: depassements ? "#fee2e2" : "#f1f5f9", color: depassements ? "#b91c1c" : "#334155" }}>
            Dépassements indicatifs : {depassements}
          </span>
        </div>
      </div>
      <p style={{ margin: "0 0 12px", padding: 10, background: "#f8fafc", borderRadius: 7, fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
        Le compteur GPS est affiché à titre de suivi. Le ratio indicatif utilise les litres
        enregistrés comme « Consommation » entre deux relevés kilométriques datés dans les opérations carburant :
        litres ÷ kilomètres parcourus × 100. Une distance inférieure à 100 km ne déclenche pas d’alerte.
        Il ne s’agit pas d’une mesure directe de carburant par le GPS ; des saisies incomplètes peuvent fausser la comparaison.
      </p>
      {lignes.length === 0 ? (
        <div style={{ padding: 18, textAlign: "center", color: "#64748b", fontSize: 12 }}>
          Aucun véhicule équipé GPS trouvé dans les données. Vérifiez /vehicules et /gps/positions.
        </div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
          <table style={{ minWidth: 1120, width: "100%", borderCollapse: "collapse", fontSize: 12, color: "#334155" }}>
            <thead style={{ background: "#f8fafc" }}>
              <tr>
                {["Véhicule GPS", "Catégorie", "Norme (L/100 km)", "Dernier compteur GPS", "Période des relevés carburant", "Distance relevée", "Litres saisis", "Ratio indicatif", "Comparaison"].map((titre) => (
                  <th key={titre} style={{ padding: "10px 9px", textAlign: "left", borderBottom: "1px solid #e2e8f0", fontWeight: 700, whiteSpace: "nowrap" }}>{titre}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lignes.map(({ vehicule, reference, gps, kmGps, mesure }) => {
                const comparaison = !reference
                  ? "Norme à renseigner"
                  : !mesure
                    ? "Données de consommation insuffisantes"
                    : mesure.km < 100
                      ? "Distance trop courte pour alerte"
                      : mesure.ratio > reference.max
                        ? "Dépassement indicatif — à vérifier"
                        : mesure.ratio < reference.min
                          ? "Sous la fourchette — à vérifier"
                          : "Dans la fourchette — indicatif";
                const depasse = !!reference && !!mesure && mesure.km >= 100 && mesure.ratio > reference.max;
                return (
                  <tr key={vehicule.id}>
                    <td style={celluleNormeGps}><strong>{vehicule.immatriculation}</strong></td>
                    <td style={celluleNormeGps}>{reference?.categorie ?? "—"}</td>
                    <td style={celluleNormeGps}>
                      {reference ? `${n(reference.min)} – ${n(reference.max)}` : <strong style={{ color: "#b45309" }}>Non fournie</strong>}
                    </td>
                    <td style={celluleNormeGps}>
                      {kmGps == null ? "Non disponible" : `${n(kmGps, 0)} km`}
                      <div style={{ color: "#94a3b8", fontSize: 10 }}>
                        {gps ? (gps.dateGps ? formaterDateHeureGps(gps.dateGps) : "Date GPS indisponible") : "Aucun relevé GPS"}
                      </div>
                    </td>
                    <td style={celluleNormeGps}>{mesure ? `${jourFr(mesure.debut)} → ${jourFr(mesure.fin)}` : "Deux relevés datés requis"}</td>
                    <td style={celluleNormeGps}>{mesure ? `${n(mesure.km, 0)} km` : "—"}</td>
                    <td style={celluleNormeGps}>{mesure ? `${n(mesure.litres)} L` : "—"}</td>
                    <td style={celluleNormeGps}><strong>{mesure ? `${n(mesure.ratio)} L/100 km` : "—"}</strong></td>
                    <td style={celluleNormeGps}>
                      <span style={{ color: depasse ? "#b91c1c" : !reference ? "#b45309" : "#475569", fontWeight: depasse ? 700 : 500 }}>
                        {comparaison}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ margin: "9px 0 0", fontSize: 11, color: "#64748b" }}>
        Si un véhicule ne possède pas deux relevés kilométriques datés et des litres de consommation entre eux,
        renseignez le kilométrage lors des opérations carburant : aucun ratio ne sera inventé.
      </p>
    </section>
  );
}

// =========================================================
// SUIVI CARBURANT SANS GPS : kilométrages relevés manuellement.
// Aucune norme n'est appliquée à ces véhicules faute de document validé.
// =========================================================
function SuiviCarburantSansGps({ vehicules, positionsGps, transactions }: {
  vehicules: Vehicule[];
  positionsGps: GpsPosition[];
  transactions: TransactionCarburant[];
}) {
  const lignes = useMemo(() => {
    const idsGps = new Set(positionsGps.map((p) => p.vehiculeId));
    return vehicules
      .filter((v) => v.gpsEquipe !== true && v.gpsDeviceId == null && !idsGps.has(v.id))
      .slice()
      .sort((a, b) => a.immatriculation.localeCompare(b.immatriculation, "fr", { numeric: true }))
      .map((vehicule) => {
        const operations = transactions.filter((t) => t.vehicule?.id === vehicule.id);
        const points = operations
          .flatMap((t) => {
            const jour = jourOperationCarburant(t.dateOperation);
            const km = t.kilometrage == null ? NaN : Number(t.kilometrage);
            return jour && Number.isFinite(km) && km >= 0 ? [{ jour, km }] : [];
          })
          .sort((a, b) => a.jour.localeCompare(b.jour) || a.km - b.km);
        return {
          vehicule,
          dernierReleve: points[points.length - 1] ?? null,
          mesure: calculerRatioCarburantIndicatif(operations),
          nombreReleves: points.length,
        };
      });
  }, [vehicules, positionsGps, transactions]);
  const nombreAvecRatio = lignes.filter((ligne) => ligne.mesure !== null).length;
  const nombre = (valeur: number, decimales = 1) => valeur.toLocaleString("fr-FR", {
    maximumFractionDigits: decimales, minimumFractionDigits: decimales,
  });
  const dateFr = (jour: string) => jour.split("-").reverse().join("/");
  return (
    <section style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16, marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 9 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: "#1e293b" }}>Consommation — véhicules sans GPS identifié</h3>
        <span style={{ fontSize: 12, color: "#334155", background: "#f1f5f9", borderRadius: 7, padding: "6px 9px" }}>
          Ratios disponibles : {nombreAvecRatio}/{lignes.length}
        </span>
      </div>
      <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.55, margin: "8px 0 12px" }}>
        Pour chaque véhicule sans GPS, l'Agent Flotte renseigne le kilométrage au compteur dans « Nouvelle opération ».
        Le ratio est calculé à partir des relevés datés et des litres de « Consommation » saisis sur la même période.
        Le document reçu ne fournit pas de norme pour ces véhicules : aucune alerte de dépassement n'est déclenchée.
        L'absence d'un indicateur GPS dans la fiche véhicule ne prouve pas à elle seule que le véhicule n'est pas équipé.
      </p>
      {lignes.length === 0 ? (
        <div style={{ padding: 12, fontSize: 12, color: "#64748b" }}>Aucun véhicule sans GPS identifié dans le parc chargé.</div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
          <table style={{ width: "100%", minWidth: 920, borderCollapse: "collapse", fontSize: 12, color: "#334155" }}>
            <thead style={{ background: "#f8fafc" }}><tr>
              {["Véhicule", "Dernier compteur manuel", "Période des relevés", "Distance", "Litres saisis", "Ratio indicatif", "Norme", "Suivi"].map((titre) => (
                <th key={titre} style={{ ...celluleNormeGps, textAlign: "left", fontWeight: 700, whiteSpace: "nowrap" }}>{titre}</th>
              ))}
            </tr></thead>
            <tbody>{lignes.map(({ vehicule, dernierReleve, mesure, nombreReleves }) => (
              <tr key={vehicule.id}>
                <td style={celluleNormeGps}><strong>{vehicule.immatriculation}</strong></td>
                <td style={celluleNormeGps}>{dernierReleve ? `${nombre(dernierReleve.km, 0)} km — ${dateFr(dernierReleve.jour)}` : "Non renseigné"}</td>
                <td style={celluleNormeGps}>{mesure ? `${dateFr(mesure.debut)} → ${dateFr(mesure.fin)}` : "—"}</td>
                <td style={celluleNormeGps}>{mesure ? `${nombre(mesure.km, 0)} km` : "—"}</td>
                <td style={celluleNormeGps}>{mesure ? `${nombre(mesure.litres)} L` : "—"}</td>
                <td style={celluleNormeGps}><strong>{mesure ? `${nombre(mesure.ratio)} L/100 km` : "—"}</strong></td>
                <td style={celluleNormeGps}>À renseigner après validation</td>
                <td style={celluleNormeGps}>{!mesure ? (nombreReleves < 2 ? "Deux relevés datés requis" : "Vérifier la distance et les litres de la période") : mesure.km < 100 ? "Distance courte : estimation à interpréter prudemment" : "Estimation disponible — sans comparaison à une norme"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <p style={{ margin: "9px 0 0", color: "#64748b", fontSize: 11 }}>
        Les litres saisis doivent correspondre au carburant réellement consommé entre les deux compteurs, et non uniquement aux achats ou dotations ; vérifier le niveau de réservoir.
      </p>
    </section>
  );
}

const celluleNormeGps: CSSProperties = {
  padding: "10px 9px",
  borderBottom: "1px solid #f1f5f9",
  verticalAlign: "top",
};

const cardStyleHistorique: CSSProperties = {
  backgroundColor: "#ffffff", border: "1px solid #e2e8f0",
  borderRadius: 10, padding: 16,
};
const celluleJournalGps: CSSProperties = {
  padding: "10px 9px", borderBottom: "1px solid #e2e8f0", textAlign: "left",
  color: "#334155", fontSize: 12, whiteSpace: "nowrap",
};
function GpsResumeJour({ titre, valeur }: { titre: string; valeur: string }) {
  return <div style={{ background: "#f8fafc", borderRadius: 8, padding: 10 }}>
    <div style={{ fontSize: 11, color: "#64748b" }}>{titre}</div>
    <strong style={{ color: "#0f172a", fontSize: 14 }}>{valeur}</strong>
  </div>;
}

function formatterKmCourt(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km`;
}

function formaterDateHeureGps(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function GpsInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="gps-info">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

// =========================================================
// COMPOSANTS UI
// =========================================================

function Kpi({
  icon,
  titre,
  valeur,
  alerte = false,
}: {
  icon: ReactNode;
  titre: string;
  valeur: number | string;
  alerte?: boolean;
}) {
  return (
    <div
      style={{
        backgroundColor: "white",
        border: alerte
          ? "1px solid #fed7aa"
          : "1px solid #e2e8f0",
        borderRadius: 10,
        padding: 17,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          color: alerte
            ? "#ea580c"
            : "#64748b",
        }}
      >
        <span
          style={{
            fontSize: 12,
          }}
        >
          {titre}
        </span>

        {icon}
      </div>

      <div
        style={{
          marginTop: 7,
          fontSize: 27,
          fontWeight: 700,
          color: "#0f172a",
        }}
      >
        {valeur}
      </div>
    </div>
  );
}

function SectionTitre({
  titre,
  sousTitre,
}: {
  titre: string;
  sousTitre?: string;
}) {
  return (
    <div
      style={{
        marginBottom: 16,
      }}
    >
      <h2
        style={{
          margin: 0,
          color: "#1e293b",
          fontSize: 19,
        }}
      >
        {titre}
      </h2>

      {sousTitre && (
        <p
          style={{
            margin: "5px 0 0",
            color: "#64748b",
            fontSize: 13,
          }}
        >
          {sousTitre}
        </p>
      )}
    </div>
  );
}

function OngletButton({
  actif,
  couleur,
  onClick,
  icon,
  children,
}: {
  actif: boolean;
  couleur: "bleu" | "vert" | "rouge";
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  const fond = couleur === "vert" ? "#16a34a" : couleur === "rouge" ? "#dc2626" : "#2563eb";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 43,
        gap: 8,
        border: `1px solid ${fond}`,
        backgroundColor: fond,
        color: "#ffffff",
        borderRadius: 9,
        padding: "10px 14px",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 700,
        boxShadow: actif ? `0 0 0 3px ${fond}33, 0 4px 10px rgba(15,23,42,.12)` : "0 3px 8px rgba(15,23,42,.08)",
        filter: actif ? "none" : "saturate(.88)",
      }}
    >
      {icon}
      {children}
    </button>
  );
}

function Card({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      style={{
        backgroundColor: "white",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: 20,
      }}
    >
      {children}
    </div>
  );
}

function CardTitre({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 17,
      }}
    >
      {icon}

      <h3
        style={{
          margin: 0,
          color: "#111827",
          fontSize: 15,
        }}
      >
        {children}
      </h3>
    </div>
  );
}

function Champ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label}
      </label>

      {children}
    </div>
  );
}

function ActionButton({
  disabled,
  couleur,
  children,
}: {
  disabled: boolean;
  couleur: "bleu" | "vert" | "rouge";
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        padding: "10px 14px",
        border: "none",
        borderRadius: 8,
        backgroundColor: couleur === "vert" ? "#16a34a" : couleur === "bleu" ? "#2563eb" : "#dc2626",
        color: "#ffffff",
        minHeight: 43,
        boxShadow: "0 3px 9px rgba(15,23,42,.10)",
        fontSize: 13,
        fontWeight: 700,
        cursor: disabled
          ? "not-allowed"
          : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

function BlocVide({
  texte,
  compact = false,
}: {
  texte: string;
  compact?: boolean;
}) {
  return (
    <div
      style={{
        backgroundColor: "white",
        border: "1px dashed #cbd5e1",
        borderRadius: 9,
        padding: compact ? 18 : 30,
        color: "#94a3b8",
        textAlign: "center",
        fontSize: 13,
      }}
    >
      {texte}
    </div>
  );
}


function InfoMission({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "22px 115px minmax(0, 1fr)",
        gap: 7,
        alignItems: "start",
        marginBottom: 11,
        fontSize: 13,
      }}
    >
      <span
        style={{
          color: "#64748b",
        }}
      >
        {icon}
      </span>

      <span
        style={{
          color: "#64748b",
        }}
      >
        {label}
      </span>

      <strong
        style={{
          color: "#1e293b",
          fontWeight: 600,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function ListeLigne({
  gauche,
  droite,
}: {
  gauche: ReactNode;
  droite: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 15,
        alignItems: "center",
        borderBottom: "1px solid #f1f5f9",
        padding: "10px 0",
        color: "#334155",
        fontSize: 12,
      }}
    >
      <div>{gauche}</div>

      <div
        style={{
          textAlign: "right",
        }}
      >
        {droite}
      </div>
    </div>
  );
}

function Th({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <th
      style={{
        padding: "13px 12px",
        textAlign: "left",
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #e2e8f0",
        color: "#334155",
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <td
      style={{
        padding: "11px 12px",
        borderBottom: "1px solid #f1f5f9",
        color: "#334155",
        fontSize: 12,
        verticalAlign: "top",
      }}
    >
      {children}
    </td>
  );
}

// =========================================================
// BADGES
// =========================================================

function StatutVehicule({
  statut,
}: {
  statut: string;
}) {
  const valeur =
    String(statut || "").toUpperCase();

  let bg = "#f1f5f9";
  let color = "#475569";

  if (valeur === "DISPONIBLE") {
    bg = "#dcfce7";
    color = "#166534";
  }

  if (valeur === "EN_MISSION") {
    bg = "#dbeafe";
    color = "#1d4ed8";
  }

  if (
    valeur === "MAINTENANCE" ||
    valeur === "EN_MAINTENANCE"
  ) {
    bg = "#fef3c7";
    color = "#92400e";
  }

  if (
    valeur === "HORS_SERVICE" ||
    valeur === "REFORME"
  ) {
    bg = "#fee2e2";
    color = "#991b1b";
  }

  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        backgroundColor: bg,
        color,
        fontSize: 10,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {formatStatutVehicule(valeur)}
    </span>
  );
}

function StatutReservation({
  statut,
}: {
  statut: string;
}) {
  const map: Record<
    string,
    {
      label: string;
      bg: string;
      color: string;
    }
  > = {
    EN_ATTENTE: {
      label: "En attente N1",
      bg: "#fef3c7",
      color: "#92400e",
    },

    A_AFFECTER: {
      label: "À affecter",
      bg: "#fee2e2",
      color: "#b91c1c",
    },

    AFFECTEE: {
      label: "Affectée",
      bg: "#dbeafe",
      color: "#1d4ed8",
    },

    EN_MISSION: {
      label: "En mission",
      bg: "#e0f2fe",
      color: "#0369a1",
    },

    TERMINEE: {
      label: "Terminée",
      bg: "#dcfce7",
      color: "#166534",
    },

    A_REPROGRAMMER: {
      label: "À reprogrammer",
      bg: "#fef3c7",
      color: "#92400e",
    },

    A_REGULARISER: {
      label: "À régulariser",
      bg: "#ffedd5",
      color: "#9a3412",
    },

    CLOTUREE: {
      label: "Clôturée",
      bg: "#dcfce7",
      color: "#166534",
    },

    VALIDEE_N1: {
      label: "Validée N1",
      bg: "#dbeafe",
      color: "#1d4ed8",
    },

    VALIDEE: {
      label: "Validée",
      bg: "#dcfce7",
      color: "#166534",
    },

    REFUSEE: {
      label: "Refusée",
      bg: "#fee2e2",
      color: "#991b1b",
    },
  };

  const item =
    map[statut] || {
      label: statut || "—",
      bg: "#f1f5f9",
      color: "#475569",
    };

  return (
    <span
      style={{
        display: "inline-flex",
        padding: "4px 9px",
        borderRadius: 999,
        backgroundColor: item.bg,
        color: item.color,
        fontSize: 10,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {item.label}
    </span>
  );
}

function TypeDemandeBadge({
  reservation,
}: {
  reservation: Reservation;
}) {
  const type =
    reservation.typeDemande === "URGENTE" ||
    reservation.typeDemande === "TARDIVE" ||
    reservation.typeDemande === "PLANIFIEE"
      ? reservation.typeDemande
      : reservation.demandeUrgente
        ? "URGENTE"
        : reservation.horsDelai24h
          ? "TARDIVE"
          : "PLANIFIEE";

  const style: CSSProperties =
    type === "URGENTE"
      ? {
          background: "#fee2e2",
          color: "#b91c1c",
        }
      : type === "TARDIVE"
        ? {
            background: "#fef3c7",
            color: "#92400e",
          }
        : {
            background: "#e0f2fe",
            color: "#0369a1",
          };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 7px",
        borderRadius: 999,
        fontSize: 9,
        fontWeight: 800,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {type === "URGENTE"
        ? "Urgente"
        : type === "TARDIVE"
          ? "Tardive"
          : "Planifiée"}
    </span>
  );
}


function DetailInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: 10,
        border:
          "1px solid #e2e8f0",
        borderRadius: 8,
        backgroundColor:
          "#f8fafc",
      }}
    >
      <div
        style={{
          color: "#94a3b8",
          fontSize: 10,
          textTransform:
            "uppercase",
          marginBottom: 4,
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: "#334155",
          fontSize: 12,
          fontWeight: 600,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function DetailBloc({
  titre,
  contenu,
  meta,
}: {
  titre: string;
  contenu: string;
  meta?: string;
}) {
  return (
    <div
      style={{
        padding: 12,
        border:
          "1px solid #e2e8f0",
        borderRadius: 8,
        backgroundColor: "white",
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: 11,
          fontWeight: 700,
          marginBottom: 6,
        }}
      >
        {titre}
      </div>

      <div
        style={{
          color: "#334155",
          fontSize: 12,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
        }}
      >
        {contenu}
      </div>

      {meta && (
        <div
          style={{
            marginTop: 7,
            color: "#94a3b8",
            fontSize: 10,
          }}
        >
          {meta}
        </div>
      )}
    </div>
  );
}


// =========================================================
// HELPERS ASSURANCES / SINISTRES
// =========================================================

type EtatAssuranceCode =
  | "VALIDE"
  | "J15"
  | "EXPIREE"
  | "SANS_ECHEANCE";

function debutJour(
  date: Date
) {
  const copie =
    new Date(date);

  copie.setHours(
    0,
    0,
    0,
    0
  );

  return copie;
}

function dateEcheanceAssurance(
  assurance: Assurance
) {
  return (
    assurance.dateExpiration ||
    assurance.dateEcheance ||
    assurance.dateFin ||
    null
  );
}

function joursAvantEcheanceAssurance(
  assurance: Assurance
): number | null {
  const valeur =
    dateEcheanceAssurance(
      assurance
    );

  if (!valeur) {
    return null;
  }

  const date =
    new Date(valeur);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  const maintenant =
    debutJour(
      new Date()
    );

  const expiration =
    debutJour(date);

  return Math.ceil(
    (
      expiration.getTime() -
      maintenant.getTime()
    ) /
      (
        1000 *
        60 *
        60 *
        24
      )
  );
}

function etatAssurance(
  assurance: Assurance
): {
  code: EtatAssuranceCode;
  label: string;
  jours: number | null;
} {
  const jours =
    joursAvantEcheanceAssurance(
      assurance
    );

  if (jours == null) {
    return {
      code: "SANS_ECHEANCE",
      label: "Échéance non renseignée",
      jours: null,
    };
  }

  if (jours < 0) {
    return {
      code: "EXPIREE",
      label:
        `Expirée depuis ${Math.abs(
          jours
        )} j`,
      jours,
    };
  }

  if (jours <= 15) {
    return {
      code: "J15",
      label:
        jours === 0
          ? "Expire aujourd'hui"
          : `Échéance dans ${jours} j`,
      jours,
    };
  }

  return {
    code: "VALIDE",
    label:
      `Valide — ${jours} j restants`,
    jours,
  };
}

function BadgeAssurance({
  assurance,
}: {
  assurance: Assurance;
}) {
  const etat =
    etatAssurance(
      assurance
    );

  let backgroundColor =
    "#f1f5f9";

  let color =
    "#475569";

  if (etat.code === "VALIDE") {
    backgroundColor =
      "#dcfce7";
    color =
      "#166534";
  }

  if (etat.code === "J15") {
    backgroundColor =
      "#fef3c7";
    color =
      "#92400e";
  }

  if (etat.code === "EXPIREE") {
    backgroundColor =
      "#fee2e2";
    color =
      "#991b1b";
  }

  return (
    <span
      style={{
        display: "inline-flex",
        padding: "4px 9px",
        borderRadius: 999,
        backgroundColor,
        color,
        fontSize: 10,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {etat.label}
    </span>
  );
}

function statutSinistreNormalise(
  sinistre: Sinistre
): "OUVERT" | "CLOTURE" {
  const statut =
    String(
      sinistre.statut || ""
    )
      .trim()
      .toUpperCase();

  if (
    statut === "CLOTURE" ||
    statut === "CLOTUREE" ||
    statut === "FERME" ||
    statut === "FERMEE" ||
    statut === "TERMINE" ||
    statut === "TERMINEE"
  ) {
    return "CLOTURE";
  }

  return "OUVERT";
}

function libelleStatutSinistre(
  sinistre: Sinistre
) {
  return statutSinistreNormalise(
    sinistre
  ) === "CLOTURE"
    ? "Clôturé"
    : "Ouvert";
}

function BadgeSinistre({
  sinistre,
}: {
  sinistre: Sinistre;
}) {
  const cloture =
    statutSinistreNormalise(
      sinistre
    ) === "CLOTURE";

  return (
    <span
      style={{
        display: "inline-flex",
        padding: "4px 9px",
        borderRadius: 999,
        backgroundColor:
          cloture
            ? "#dcfce7"
            : "#fee2e2",
        color:
          cloture
            ? "#166534"
            : "#991b1b",
        fontSize: 10,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {cloture
        ? "Clôturé"
        : "Ouvert"}
    </span>
  );
}

function dateSinistreAffiche(
  sinistre: Sinistre
) {
  return (
    sinistre.dateSinistre ||
    sinistre.date ||
    sinistre.dateDeclaration ||
    null
  );
}

function valeurConstatAmiable(
  sinistre: Sinistre
) {
  return (
    sinistre.constatAmiable ||
    sinistre.constat ||
    sinistre.constatUrl ||
    null
  );
}

function datePourInput(
  valeur?: string | null
) {
  if (!valeur) {
    return "";
  }

  const date =
    new Date(valeur);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(valeur)
      .slice(0, 10);
  }

  return date
    .toISOString()
    .slice(0, 10);
}

function exporterCsvGenerique(
  nomFichier: string,
  lignes: (string | number | null | undefined)[][]
) {
  const contenu =
    lignes
      .map((ligne) =>
        ligne
          .map((cellule) =>
            `"${String(
              cellule ?? ""
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

  lien.href =
    url;

  lien.download =
    nomFichier;

  lien.click();

  URL.revokeObjectURL(
    url
  );
}

// =========================================================
// HELPERS
// =========================================================


function nomBeneficiaire(
  reservation: Reservation
) {
  if (
    reservation.modeCreation === "EXPRESS" &&
    reservation.demandeExpressPar?.trim()
  ) {
    return reservation.demandeExpressPar.trim();
  }

  const nom = `${
    reservation.demandeurPrenom || ""
  } ${
    reservation.demandeurNom || ""
  }`.trim();

  if (nom) {
    return nom;
  }

  return nomDemandeur(
    reservation.demandeur
  );
}

function nomDemandeur(
  demandeur?: Demandeur | null
) {
  if (!demandeur) return "—";

  if (demandeur.nomComplet?.trim()) {
    return demandeur.nomComplet.trim();
  }

  const nom = `${
    demandeur.prenom || ""
  } ${
    demandeur.nom || ""
  }`.trim();

  return (
    nom ||
    demandeur.numMatricule ||
    demandeur.matricule ||
    demandeur.email ||
    "—"
  );
}

function nomChauffeur(
  chauffeur?: Chauffeur | null
) {
  if (!chauffeur) return "—";

  const nom = `${
    chauffeur.prenom || ""
  } ${
    chauffeur.nom || ""
  }`.trim();

  if (nom && chauffeur.matricule) {
    return `${nom} — ${chauffeur.matricule}`;
  }

  return (
    nom ||
    chauffeur.matricule ||
    `Chauffeur #${chauffeur.id}`
  );
}

function nomModeleVehicule(
  vehicule: Vehicule
) {
  const valeurs = [
    vehicule.marque,
    vehicule.modele,
    vehicule.modeleType,
  ]
    .map((v) => v?.trim())
    .filter(Boolean);

  const uniques = [
    ...new Set(valeurs),
  ];

  return (
    uniques.join(" ") ||
    vehicule.categorie ||
    "Véhicule"
  );
}

function libelleVehicule(
  vehicule: Vehicule
) {
  const modele =
    nomModeleVehicule(vehicule);

  if (
    !modele ||
    modele === "Véhicule"
  ) {
    return vehicule.immatriculation;
  }

  return `${vehicule.immatriculation} — ${modele}`;
}

function formatStatutVehicule(
  statut: string
) {
  const map: Record<string, string> = {
    DISPONIBLE: "Disponible",
    EN_MISSION: "En mission",
    MAINTENANCE: "Maintenance",
    EN_MAINTENANCE: "Maintenance",
    HORS_SERVICE: "Hors service",
    TRANSFERE: "Transféré",
    REFORME: "Réformé",
  };

  return (
    map[
      String(statut || "").toUpperCase()
    ] ||
    statut ||
    "—"
  );
}

function formaterDate(
  valeur?: string | null
) {
  if (!valeur) return "—";

  const date = new Date(valeur);

  if (
    Number.isNaN(date.getTime())
  ) {
    return valeur;
  }

  return date.toLocaleString(
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

function formaterDateSimple(
  valeur?: string | null
) {
  if (!valeur) return "—";

  const date = new Date(valeur);

  if (
    Number.isNaN(date.getTime())
  ) {
    return valeur;
  }

  return date.toLocaleDateString(
    "fr-FR"
  );
}

// =========================================================
// STYLES
// =========================================================

const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: 5,
  color: "#374151",
  fontSize: 12,
  fontWeight: 600,
};

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 11px",
  border: "1px solid #d1d5db",
  borderRadius: 7,
  backgroundColor: "white",
  color: "#111827",
  fontSize: 13,
};

const formStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const twoColumns: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(420px, 1fr))",
  gap: 20,
};

const twoInputColumns: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const tableCard: CSSProperties = {
  backgroundColor: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  overflowX: "auto",
};

const scrollList: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  maxHeight: 500,
  overflowY: "auto",
};

const smallMuted: CSSProperties = {
  marginTop: 3,
  color: "#94a3b8",
  fontSize: 10,
};

const cardSubTitle: CSSProperties = {
  margin: "0 0 17px",
  color: "#334155",
  fontSize: 14,
};

const infoApi: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 3,
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  padding: 12,
  marginBottom: 15,
  color: "#64748b",
  fontSize: 11,
};

const businessRuleBox: CSSProperties = {
  backgroundColor: "#fffbeb",
  border: "1px solid #fde68a",
  borderRadius: 7,
  padding: 10,
  color: "#92400e",
  fontSize: 11,
  lineHeight: 1.5,
};


const expressBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
  padding: "3px 7px",
  borderRadius: 999,
  background: "#ede9fe",
  color: "#6d28d9",
  fontSize: 9,
  fontWeight: 800,
};

const regulariserBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "3px 7px",
  borderRadius: 999,
  background: "#ffedd5",
  color: "#9a3412",
  fontSize: 9,
  fontWeight: 800,
};


const refreshButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  minHeight: 40,
  padding: "9px 13px",
  backgroundColor: "#2563eb",
  color: "#ffffff",
  border: "1px solid #2563eb",
  borderRadius: 8,
  boxShadow: "0 3px 9px rgba(15,23,42,.10)",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
};
