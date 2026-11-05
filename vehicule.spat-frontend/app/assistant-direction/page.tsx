"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import EnTete from "@/components/EnTete";
import IncidentSignalementButton from "@/components/IncidentSignalementButton";
import RoleGuard from "@/components/RoleGuard";
import SlideInPanel from "@/app/components/SlideInPanel";
import PersonnelAutocomplete from "@/components/PersonnelAutocomplete";
import { ConducteurMotoSelect, HabilitationMotoButton } from "@/components/HabilitationMoto";
import AvisIndisponibiliteButton from "@/components/AvisIndisponibiliteButton";
import { ROLES } from "@/app/lib/roles";
import { missionAttendRetour, missionRetourEnRetard } from "@/app/lib/suiviRetourMission";
import { exportCsv } from "@/app/lib/exportUtils";

import {
  Car,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  History,
  Map as MapIcon,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  UserRound,
  Users,
  Wrench,
  X,
} from "lucide-react";

import CarteGpsDirection from "@/components/CarteGpsDirection";
import NotificationsVehiculesPartages from "@/components/NotificationsVehiculesPartages";

type TypeDemande = "PLANIFIEE" | "TARDIVE" | "URGENTE";

type Mobilisabilite = "FLEXIBLE" | "VERROUILLEE";

type ZoneMission = "VILLE_TOAMASINA" | "HORS_TOAMASINA";
type PopupMission = { type: "retard" | "disponible" | "horaire" | "contrainte"; titre: string; description: string; missionId?: number };

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

const MOTIFS_MISSION_VILLE = [
  "Réunions",
  "Missions",
  "Courses administratives",
  "Visites de sites",
  "Interventions techniques",
  "Transports de documents ou matériels",
  "Autres activités",
] as const;

const PANNES_ENTRETIEN = [
  "Batterie ou autonomie insuffisante",
  "Recharge ou chargeur défaillant",
  "Moteur électrique",
  "Freinage",
  "Pneumatique ou roue",
  "Éclairage ou signalisation",
  "Commande, accélérateur ou tableau de bord",
  "Bruit ou vibration anormale",
  "Carrosserie ou châssis",
  "Autre panne à préciser",
] as const;

interface VehiculeResume {
  id: number;
  immatriculation?: string | null;
  marque?: string | null;
  modele?: string | null;
  modeleType?: string | null;
  categorie?: string | null;
  typeVehicule?: string | null;
  affectation?: string | null;
  statut?: string | null;
}

interface DisponibiliteVehicule {
  id: number;
  immatriculation?: string | null;
  disponible?: boolean;
  raison?: string | null;
  dateFin?: string | null;
}

interface ChauffeurResume {
  id: number;
  matricule?: string | null;
  nom?: string | null;
  prenom?: string | null;
  telephone?: string | null;
  statut?: string | null;
}

interface Reservation {
  id: number;

  dateDebut: string;
  dateFin: string;

  motif: string;

  demandeUrgente: boolean;
  motifUrgence?: string | null;

  typeDemande?: TypeDemande | null;
  horsDelai24h?: boolean | null;
  mobilisabilite?: Mobilisabilite | null;
  zoneMission?: ZoneMission | null;

  statut: string;
  dateCreation: string;
  modeCreation?: string | null;
  dureeEstimeeMinutes?: number | null;
  dureeUtilisationMinutes?: number | null;
  incidentCloture?: string | null;
  conducteurMoto?: { id: number; nomComplet: string } | null;

  demandeurNom?: string | null;
  demandeur?: { directionId?: number | null; nomComplet?: string | null; email?: string | null } | null;
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

  vehicule?: VehiculeResume | null;
  chauffeur?: ChauffeurResume | null;
}

interface FormulaireReservation {
  conducteurMotoId: string;
  typeVehiculeCreation: "MOTO" | "VOITURE" | "";
  zoneMission: ZoneMission | "";
  typeVehiculeSouhaite: string;

  dateDebut: string;
  dateFin: string;
  dureeEstimeeMinutes: string;

  motif: string;
  motifAutre: string;

  motifUrgence: string;

  demandeurNom: string;
  demandeurPrenom: string;
  demandeurMatricule: string;
  demandeurEntite: string;
  demandeurTelephone: string;

  destination: string;
  pointDepart: string;

  nombrePassagers: string;
  listePassagers: string;

  observations: string;
  forfaitaire: string;
  demandeUrgente: boolean;
}

const formulaireInitial: FormulaireReservation = {
  conducteurMotoId: "",
  typeVehiculeCreation: "",
  zoneMission: "",
  typeVehiculeSouhaite: "",

  dateDebut: "",
  dateFin: "",
  dureeEstimeeMinutes: "",

  motif: "",
  motifAutre: "",

  motifUrgence: "",

  demandeurNom: "",
  demandeurPrenom: "",
  demandeurMatricule: "",
  demandeurEntite: "",
  demandeurTelephone: "",

  destination: "",
  pointDepart: "",

  nombrePassagers: "1",
  listePassagers: "",

  observations: "",
  forfaitaire: "oui",
  demandeUrgente: false,
};

export default function AssistantDirectionPage() {
  return (
    <RoleGuard roles={[ROLES.ASSISTANT_DIRECTION, ROLES.AGENT_PAR_INTERIM_ASSISTANT]}>
      <AssistantDirectionContent />
    </RoleGuard>
  );
}

function AssistantDirectionContent() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [vehiculeDirection, setVehiculeDirection] = useState<VehiculeResume | null>(null);
  const [vehiculesDirection, setVehiculesDirection] = useState<VehiculeResume[]>([]);
  const [disponibilitesVehicules, setDisponibilitesVehicules] = useState<Record<number, DisponibiliteVehicule>>({});
  const [directionId, setDirectionId] = useState<number | null>(null);

  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);

  const [modalOuverte, setModalOuverte] = useState(false);
  const [choixInitialOuvert, setChoixInitialOuvert] = useState(false);
  const [demandeEntretienOuverte, setDemandeEntretienOuverte] = useState(false);
  const [vehiculeEntretienId, setVehiculeEntretienId] = useState("");
  const [panneEntretien, setPanneEntretien] = useState("");
  const [panneEntretienAutre, setPanneEntretienAutre] = useState("");
  const [envoiEntretien, setEnvoiEntretien] = useState(false);
  const [zoneInitiale, setZoneInitiale] = useState<ZoneMission | "">("");
  const [typeVehiculeInitial, setTypeVehiculeInitial] = useState<"MOTO" | "VOITURE" | "">("");
  const [envoi, setEnvoi] = useState(false);
  const [missionEnEdition, setMissionEnEdition] = useState<Reservation | null>(null);
  const [missionSelectionnee, setMissionSelectionnee] = useState<Reservation | null>(null);
  const [historiqueOuvert, setHistoriqueOuvert] = useState(false);
  const [suppressionMissionId, setSuppressionMissionId] = useState<number | null>(null);
  const [dateCalendrier, setDateCalendrier] = useState(() => new Date());
  const [moisDebutExport, setMoisDebutExport] = useState(() => moisPourInput(new Date()));
  const [moisFinExport, setMoisFinExport] = useState(() => moisPourInput(new Date()));
  const [instantCalendrier, setInstantCalendrier] = useState(() => new Date());
  const [signalementIncidentMissionId, setSignalementIncidentMissionId] = useState<number | null>(null);
  const [demandeMaintenanceMissionId, setDemandeMaintenanceMissionId] = useState<number | null>(null);
  const [popupMission, setPopupMission] = useState<PopupMission | null>(null);
  const alertesDureeDejaAffichees = useRef(new Set<string>());
  const [formulaire, setFormulaire] = useState<FormulaireReservation>(formulaireInitial);

  const [carteGpsOuverte, setCarteGpsOuverte] = useState(false);

  useEffect(() => {
    const intervalle = window.setInterval(() => setInstantCalendrier(new Date()), 10_000);
    return () => window.clearInterval(intervalle);
  }, []);

  useEffect(() => {
    const maintenant = instantCalendrier.getTime();
    const timer = window.setTimeout(() => {
      setReservations((precedentes) => {
        let modifie = false;
        const actualisees = precedentes.map((mission) => {
          if (mission.modeCreation !== "ASSISTANT_DIRECTION"
            || mission.statut.toUpperCase() !== "PLANIFIEE"
            || Number.isNaN(new Date(mission.dateDebut).getTime())
            || new Date(mission.dateDebut).getTime() > maintenant) return mission;
          modifie = true;
          return { ...mission, statut: "EN_COURS" };
        });
        return modifie ? actualisees : precedentes;
      });
      setMissionSelectionnee((mission) => {
        if (!mission || mission.modeCreation !== "ASSISTANT_DIRECTION"
          || mission.statut.toUpperCase() !== "PLANIFIEE"
          || Number.isNaN(new Date(mission.dateDebut).getTime())
          || new Date(mission.dateDebut).getTime() > maintenant) return mission;
        return { ...mission, statut: "EN_COURS" };
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [instantCalendrier]);

  useEffect(() => {
    if (popupMission) return;
    const maintenant = instantCalendrier.getTime();
    const mission = reservations.find((candidate) => {
      if (directionId && candidate.demandeur?.directionId !== directionId) return false;
      const cleAlerte = `${candidate.id}:${candidate.dateDebut}:${obtenirDureeEstimeeMission(candidate)}`;
      return missionRetourEnRetard(candidate, maintenant)
        && !alertesDureeDejaAffichees.current.has(cleAlerte);
    });
    if (!mission) return;
    const cleAlerte = `${mission.id}:${mission.dateDebut}:${obtenirDureeEstimeeMission(mission)}`;
    const timer = window.setTimeout(() => {
      alertesDureeDejaAffichees.current.add(cleAlerte);
      const typeVehicule = libelleTypeVehicule(normaliserTypeVehiculeSouhaite(mission.vehicule?.categorie) || mission.typeVehiculeSouhaite).toLowerCase();
      const immatriculation = mission.vehicule?.immatriculation ? ` ${mission.vehicule.immatriculation}` : "";
      const phrase = typeVehicule === "moto" ? "La moto" : "La voiture";
      setPopupMission({
        type: "retard",
        missionId: mission.id,
        titre: `${phrase}${immatriculation} n'est toujours pas revenue.`,
        description: `La durée estimée de la mission TKT-${String(mission.id).padStart(5, "0")} est dépassée. La clôture reste en attente jusqu'au retour du véhicule. Confirmez son arrivée pour clôturer la mission.`,
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [directionId, instantCalendrier, popupMission, reservations]);

  useEffect(() => {
    if (!modalOuverte || formulaire.zoneMission !== "VILLE_TOAMASINA" || !formulaire.dateDebut || !formulaire.dureeEstimeeMinutes || !API) return;
    const debut = new Date(formulaire.dateDebut);
    const minutes = Number(formulaire.dureeEstimeeMinutes);
    if (!Number.isFinite(debut.getTime()) || !Number.isFinite(minutes) || minutes <= 0) return;
    const fin = new Date(debut.getTime() + minutes * 60_000);
    const token = getToken();
    if (!token) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ dateDebut: dateHeureLocale(debut), dateFin: dateHeureLocale(fin) });
    fetch(`${API}/reservations/disponibilites-vehicules?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) return;
      const data = await response.json() as unknown;
      if (!Array.isArray(data)) return;
      const map: Record<number, DisponibiliteVehicule> = {};
      (data as DisponibiliteVehicule[]).forEach((item) => { if (Number.isFinite(Number(item.id))) map[Number(item.id)] = item; });
      setDisponibilitesVehicules(map);
    }).catch(() => undefined);
    return () => controller.abort();
  }, [API, formulaire.dateDebut, formulaire.dureeEstimeeMinutes, formulaire.zoneMission, modalOuverte]);

  const chargerDonnees = async () => {
    const token = getToken();

    if (!API) {
      setErreurChargement("NEXT_PUBLIC_API_URL n'est pas configurée.");
      toast.error("NEXT_PUBLIC_API_URL n'est pas configurée");
      setChargement(false);
      return;
    }

    if (!token) {
      router.replace("/login");
      return;
    }

    setChargement(true);
    setErreurChargement(null);

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      };

      const [reservationsRes, missionsVilleRes] = await Promise.all([
        fetch(`${API}/reservations/mes`, { method: "GET", headers, cache: "no-store" }),
        fetch(`${API}/reservations/assistant-direction/calendrier`, { method: "GET", headers, cache: "no-store" }).catch(() => null),
      ]);

      const vehiculeDirectionRes = await fetch(`${API}/reservations/assistant-direction/vehicule-affecte`, {
        method: "GET",
        headers,
        cache: "no-store",
      }).catch(() => null);

      if (reservationsRes.status === 401 || missionsVilleRes?.status === 401) {
        toast.error("Votre session a expiré");
        router.replace("/login");
        return;
      }

      if (!reservationsRes.ok) {
        const response = reservationsRes;
        if (response.status === 403) {
        toast.error(
          "Vous n'avez pas l'autorisation d'accéder à ces données."
        );
        return;
        }
        throw new Error(
          (await lireErreur(response)) || "Impossible de charger les missions"
        );
      }

      const [mesReservations, missionsVille] = await Promise.all([
        reservationsRes.json() as Promise<unknown>,
        missionsVilleRes?.ok ? missionsVilleRes.json() as Promise<unknown> : Promise.resolve([] as unknown),
      ]);
      if (!Array.isArray(mesReservations)) throw new Error("Format de réponse missions personnelles invalide.");
      if (!missionsVilleRes?.ok) {
        console.error("Calendrier partagé indisponible :", missionsVilleRes?.status ?? "réseau");
        toast.error("Le calendrier partagé n'a pas pu être actualisé. Certaines missions des directions rattachées peuvent manquer.");
      }
      if (missionsVilleRes?.ok && !Array.isArray(missionsVille)) {
        toast.error("Le calendrier partagé a renvoyé un format inattendu; il n'est pas utilisé.");
      }
      const toutesLesMissions = [
        ...mesReservations,
        ...(Array.isArray(missionsVille) ? missionsVille : []),
      ] as Reservation[];
      setReservations((precedentes) => fusionnerReservations(precedentes, toutesLesMissions));

      if (vehiculeDirectionRes?.ok) {
        const donneesVehicule = await vehiculeDirectionRes.json();
        setDirectionId(typeof donneesVehicule?.directionId === "number" ? donneesVehicule.directionId : null);
        setVehiculeDirection(donneesVehicule?.vehicule?.id ? donneesVehicule.vehicule as VehiculeResume : null);
        setVehiculesDirection([
          ...(Array.isArray(donneesVehicule?.vehiculesVoiture) ? donneesVehicule.vehiculesVoiture : []),
          ...(Array.isArray(donneesVehicule?.vehiculesMoto) ? donneesVehicule.vehiculesMoto : []),
        ] as VehiculeResume[]);
      } else {
        setDirectionId(null);
        setVehiculeDirection(null);
        setVehiculesDirection([]);
        toast.error("Le véhicule affecté à votre direction n'a pas pu être chargé depuis l'API.");
      }

    } catch (error) {
      setReservations([]);
      setErreurChargement(error instanceof Error ? error.message : "Impossible de charger les missions.");
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de charger les données"
      );
    } finally {
      setChargement(false);
    }
  };

  const supprimerMissionHistorique = (mission: Reservation) => {
    const proprietaireDeLaDirection = Boolean(directionId && mission.demandeur?.directionId === directionId);
    if (!proprietaireDeLaDirection || !missionEstDansHistorique(mission, instantCalendrier)) return;
    toast(`Supprimer définitivement la mission TKT-${String(mission.id).padStart(5, "0")} ? Cette action est irréversible.`, {
      duration: 10000,
      action: {
        label: "Supprimer",
        onClick: () => void confirmerSuppressionMissionHistorique(mission),
      },
      cancel: { label: "Annuler", onClick: () => undefined },
    });
  };

  const confirmerSuppressionMissionHistorique = async (mission: Reservation) => {
    const token = getToken();
    if (!API || !token) {
      toast.error("Impossible de vérifier votre session.");
      return;
    }

    setSuppressionMissionId(mission.id);
    try {
      const response = await fetch(`${API}/reservations/${mission.id}/assistant-direction/historique`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (response.status === 404) {
        throw new Error("L'API ne reconnaît pas cette route. Redémarrez le backend pour charger la dernière version.");
      }
      if (!response.ok) throw new Error((await lireErreur(response)) || "La suppression de la mission a échoué.");
      setReservations((actuelles) => actuelles.filter((item) => item.id !== mission.id));
      if (missionSelectionnee?.id === mission.id) setMissionSelectionnee(null);
      toast.success("Mission supprimée définitivement.");
    } catch (erreur) {
      toast.error(erreur instanceof Error ? erreur.message : "La suppression de la mission a échoué.");
    } finally {
      setSuppressionMissionId(null);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    chargerDonnees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ouvrirChoixInitial = () => {
    setMissionEnEdition(null);
    setZoneInitiale("");
    setTypeVehiculeInitial("");
    setChoixInitialOuvert(true);
  };

  const continuerVersFormulaire = () => {
    if (!zoneInitiale || !typeVehiculeInitial) return;
    ouvrirModal(zoneInitiale, typeVehiculeInitial);
    setChoixInitialOuvert(false);
  };

  const immatriculationsAffectees = (type: "" | "MOTO" | "VOITURE") => vehiculesDirection
    .filter((vehicule) => normaliserTypeVehiculeSouhaite(vehicule.categorie) === type)
    .map((vehicule) => vehicule.immatriculation?.trim())
    .filter((immatriculation): immatriculation is string => Boolean(immatriculation));

  const vehiculeIndisponible = (vehicule: VehiculeResume) => {
    const statut = String(vehicule.statut || "").trim().toUpperCase();
    return ["MAINTENANCE", "EN_PANNE", "HORS_SERVICE", "INDISPONIBLE", "INDISPONIBLE_TECHNIQUE", "REQUISITIONNE", "EN_MISSION", "REFORME", "TRANSFERE"].includes(statut);
  };

  const disponibiliteVille = (vehicule: VehiculeResume) => {
    const ligne = disponibilitesVehicules[vehicule.id];
    if (!ligne) return { disponible: !vehiculeIndisponible(vehicule), raison: vehiculeIndisponible(vehicule) ? libelleStatutVehicule(vehicule.statut) : "" };
    return { disponible: ligne.disponible !== false && !vehiculeIndisponible(vehicule), raison: ligne.raison || "Réservé sur la période", dateFin: ligne.dateFin };
  };

  const libelleStatutVehicule = (statut?: string | null) => {
    const valeur = String(statut || "").trim().toUpperCase();
    if (["MAINTENANCE", "EN_MAINTENANCE", "EN_PANNE"].includes(valeur)) return "En panne / maintenance";
    if (valeur === "REQUISITIONNE") return "Véhicule réquisitionné par le DGAL";
    if (valeur === "DISPONIBLE") return "Apte au service";
    return String(statut || "Indisponible").replaceAll("_", " ").toLowerCase();
  };

  const ouvrirModal = (zoneMission: ZoneMission, typeVehicule: "MOTO" | "VOITURE") => {
    setMissionEnEdition(null);
    const departParDefaut = new Date();
    if (zoneMission === "VILLE_TOAMASINA") {

      departParDefaut.setSeconds(0, 0);
    } else {
      departParDefaut.setHours(typeVehicule === "MOTO" ? Math.max(departParDefaut.getHours() + 1, 8) : 9, 0, 0, 0);
    }
    setFormulaire({
      ...formulaireInitial,
      zoneMission,
      typeVehiculeCreation: typeVehicule,
      typeVehiculeSouhaite: typeVehicule,
      dateDebut: zoneMission === "VILLE_TOAMASINA" ? dateHeureLocale(departParDefaut) : "",
    });
    setModalOuverte(true);
  };

  const selectionnerMission = (mission: Reservation) => {
    setMissionSelectionnee(mission);
  };

  const modifierMission = (mission: Reservation) => {
    setMissionSelectionnee(null);
    setMissionEnEdition(mission);
    setFormulaire({
      ...formulaireInitial,
      zoneMission: mission.zoneMission || "VILLE_TOAMASINA",
      typeVehiculeSouhaite: normaliserTypeVehiculeSouhaite(mission.typeVehiculeSouhaite),
      conducteurMotoId: mission.conducteurMoto ? String(mission.conducteurMoto.id) : "",
      dateDebut: valeurPourDateLocale(mission.dateDebut),
      dateFin: valeurPourDateLocale(mission.dateFin),
      motif: mission.motif || "",
      demandeurNom: mission.demandeurNom || "",
      demandeurPrenom: mission.demandeurPrenom || "",
      demandeurMatricule: mission.demandeurMatricule || "",
      demandeurEntite: mission.demandeurEntite || "",
      demandeurTelephone: mission.demandeurTelephone || "",
      destination: mission.destination || "",
      pointDepart: mission.pointDepart || "",
      nombrePassagers: String(mission.nombrePassagers || 1),
      listePassagers: mission.listePassagers || "",
      observations: mission.observations || "",
      forfaitaire: mission.observations?.match(/Forfaitaire:\s*(oui|non)/i)?.[1]?.toLowerCase() || "oui",
    });
    setModalOuverte(true);
  };

  const fermerModal = () => {
    if (envoi) {
      return;
    }

    setModalOuverte(false);
    setChoixInitialOuvert(false);
    setMissionEnEdition(null);
    setFormulaire(formulaireInitial);
  };

  useEffect(() => {
    if (!modalOuverte) {
      return;
    }

    const ancienOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !envoi) {
        fermerModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = ancienOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOuverte, envoi]);

  const totalDemandes = reservations.length;

  const missionsCalendrier = useMemo(
    () => reservations.filter((mission) => mission.zoneMission === "VILLE_TOAMASINA"
      && (mission.statut.toUpperCase() === "CLOTUREE" || !missionEstDansHistorique(mission, instantCalendrier))),
    [reservations, instantCalendrier]
  );
  const missionsParJourCalendrier = useMemo(() => {
    const parJour = new Map<string, Reservation[]>();
    const missionsUniques = Array.from(new Map(missionsCalendrier.map((mission) => [mission.id, mission])).values());
    missionsUniques.forEach((mission) => {
      const dateDebut = new Date(mission.dateDebut);
      if (Number.isNaN(dateDebut.getTime())) return;
      const cle = cleJourCalendrier(dateDebut);
      const missions = parJour.get(cle);
      if (missions) missions.push(mission);
      else parJour.set(cle, [mission]);
    });
    return parJour;
  }, [missionsCalendrier]);
  const historiqueDuMois = useMemo(
    () => reservations
      .filter((mission) => mission.zoneMission === "VILLE_TOAMASINA" && missionEstDansHistorique(mission, instantCalendrier) && missionDansMoisHistorique(mission, dateCalendrier))
      .sort((a, b) => new Date(b.dateDebut).getTime() - new Date(a.dateDebut).getTime()),
    [reservations, dateCalendrier, instantCalendrier]
  );
  const periodeExportValide = Boolean(moisDebutExport && moisFinExport && moisDebutExport <= moisFinExport);
  const missionsPeriodeExport = useMemo(() => {
    if (!periodeExportValide) return [];
    return reservations
      .filter((mission) => {
        const date = new Date(mission.dateDebut);
        if (Number.isNaN(date.getTime())) return false;
        const moisMission = moisPourInput(date);
        return moisMission >= moisDebutExport && moisMission <= moisFinExport;
      })
      .sort((a, b) => new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime());
  }, [reservations, periodeExportValide, moisDebutExport, moisFinExport]);
  const joursCalendrier = useMemo(
    () => obtenirJoursCalendrier(dateCalendrier),
    [dateCalendrier]
  );
  const titreCalendrier = dateCalendrier.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const etatOperationnelFormulaire =
    formulaire.zoneMission === "HORS_TOAMASINA"
      ? "PLANIFIEE"
      : formulaire.zoneMission === "VILLE_TOAMASINA"
        ? "FLEXIBLE"
        : null;

  const modifierChamp = <K extends keyof FormulaireReservation>(
    champ: K,
    valeur: FormulaireReservation[K]
  ) => {
    setFormulaire((ancien) => ({
      ...ancien,
      [champ]: valeur,
    }));
  };

  const lignesPassagers = useMemo(() => {
    const nombre =
      Math.max(
        1,
        Number.parseInt(formulaire.nombrePassagers || "1", 10) || 1
      );

    const existants =
      formulaire.listePassagers
        .split("\n")
        .map((nom) => nom.trim());

    return Array.from(
      { length: nombre },
      (_, index) => existants[index] || ""
    );
  }, [
    formulaire.nombrePassagers,
    formulaire.listePassagers,
  ]);

  const modifierNombrePassagers = (valeur: string) => {
    const nombre =
      Math.max(
        1,
        Number.parseInt(valeur || "1", 10) || 1
      );

    const existants =
      formulaire.listePassagers
        .split("\n")
        .map((nom) => nom.trim());

    const nouvelleListe =
      Array.from(
        { length: nombre },
        (_, index) => existants[index] || ""
      ).join("\n");

    setFormulaire((ancien) => ({
      ...ancien,
      nombrePassagers: valeur,
      listePassagers: nouvelleListe,
    }));
  };

  const modifierNomPassager = (
    index: number,
    valeur: string
  ) => {
    const copie = [...lignesPassagers];
    copie[index] = valeur;

    modifierChamp(
      "listePassagers",
      copie.join("\n")
    );
  };

  const envoyerDemande = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const token = getToken();

    if (!API) {
      toast.error("NEXT_PUBLIC_API_URL n'est pas configurée");
      return;
    }

    if (!token) {
      router.replace("/login");
      return;
    }

    if (!missionEnEdition && formulaire.zoneMission === "VILLE_TOAMASINA") {
      await envoyerMissionRapideVille();
      return;
    }

    if (!formulaire.zoneMission) {
      toast.error(
        "Veuillez préciser si la mission est dans Toamasina ou hors Toamasina"
      );
      return;
    }

    const typeVehiculeDemande = missionEnEdition
      ? formulaire.typeVehiculeSouhaite
      : formulaire.typeVehiculeCreation;
    if (!typeVehiculeDemande) {
      toast.error("Veuillez sélectionner le type de véhicule.");
      return;
    }
    if (formulaire.zoneMission === "HORS_TOAMASINA" && typeVehiculeDemande !== "VOITURE") {
      toast.error("Les missions hors ville sont réservées aux voitures.");
      return;
    }

    if (!formulaire.dateDebut || !formulaire.dateFin) {
      toast.error(
        "Veuillez renseigner la date de départ et la date de retour"
      );
      return;
    }

    const debut = new Date(formulaire.dateDebut);
    const fin = new Date(formulaire.dateFin);
    const maintenant = new Date();
    const missionHorsDelai24h = formulaire.zoneMission === "HORS_TOAMASINA"
      && debut.getTime() < maintenant.getTime() + 24 * 60 * 60 * 1000;

    if (
      Number.isNaN(debut.getTime()) ||
      Number.isNaN(fin.getTime())
    ) {
      toast.error("Les dates renseignées sont invalides");
      return;
    }

    if (debut < maintenant) {
      toast.error("La date de départ ne peut pas être dans le passé");
      return;
    }

    if (fin <= debut) {
      toast.error("La date de retour doit être après la date de départ");
      return;
    }

    if (
      formulaire.zoneMission === "VILLE_TOAMASINA" &&
      missionEnEdition === null &&
      debut.getTime() < maintenant.getTime() + 24 * 60 * 60 * 1000
    ) {
      toast.error("Une mission en ville planifiée doit être demandée au moins 24 heures à l'avance.");
      return;
    }

    const motifFinal = formulaire.motif === "Autres activités"
      ? formulaire.motifAutre.trim()
      : formulaire.motif.trim();
    if (!motifFinal) {
      toast.error("L'objet de la mission est obligatoire");
      return;
    }

    if (!formulaire.demandeurNom.trim()) {
      toast.error("Le nom du bénéficiaire est obligatoire");
      return;
    }

    if (!formulaire.demandeurPrenom.trim()) {
      toast.error("Le prénom du bénéficiaire est obligatoire");
      return;
    }

    if (formulaire.zoneMission !== "HORS_TOAMASINA" && !formulaire.demandeurMatricule.trim()) {
      toast.error("Le matricule du bénéficiaire est obligatoire");
      return;
    }

    if (!formulaire.demandeurEntite.trim()) {
      toast.error(
        "La Direction / Département / Service est obligatoire"
      );
      return;
    }

    if (formulaire.zoneMission !== "HORS_TOAMASINA" && !formulaire.pointDepart.trim()) {
      toast.error("Le point de départ est obligatoire");
      return;
    }

    if (!formulaire.destination.trim()) {
      toast.error("La destination est obligatoire");
      return;
    }

    const nombrePassagers = Number(formulaire.nombrePassagers);

    if (
      !Number.isInteger(nombrePassagers) ||
      nombrePassagers <= 0
    ) {
      toast.error("Le nombre de passagers doit être supérieur à 0");
      return;
    }

    const passagersSaisis =
      lignesPassagers.map((nom) => nom.trim());

    const horsVille = formulaire.zoneMission === "HORS_TOAMASINA";

    if (!horsVille) {

      if (
        passagersSaisis.length !== nombrePassagers ||
        passagersSaisis.some((nom) => !nom)
      ) {
        toast.error(
          "Veuillez renseigner le nom et le prénom de chaque passager."
        );
        return;
      }
    }

    const modification = missionEnEdition !== null;
    const body = {
      conducteurMotoId: typeVehiculeDemande === "MOTO" && formulaire.conducteurMotoId ? Number(formulaire.conducteurMotoId) : null,
      vehiculeId: modification ? vehiculeDirection?.id ?? null : null,
      chauffeurId: null,
      zoneMission: modification ? "VILLE_TOAMASINA" : formulaire.zoneMission,

      dateDebut: convertirDatePourApi(formulaire.dateDebut),
      dateFin: convertirDatePourApi(formulaire.dateFin),

      motif: motifFinal,

      demandeUrgente: false,

      motifUrgence: null,

      demandeurNom: formulaire.demandeurNom.trim(),
      demandeurPrenom: formulaire.demandeurPrenom.trim(),
      demandeurMatricule: formulaire.demandeurMatricule.trim() || null,
      demandeurEntite: formulaire.demandeurEntite.trim(),
      demandeurTelephone: formulaire.demandeurTelephone.trim() || null,

      destination: formulaire.destination.trim(),
      pointDepart: formulaire.zoneMission === "HORS_TOAMASINA" ? "SPAT Toamasina" : formulaire.pointDepart.trim(),

      nombrePassagers,

      listePassagers: (horsVille && passagersSaisis.every(p => !p))
        ? `${formulaire.demandeurPrenom.trim()} ${formulaire.demandeurNom.trim()}`
        : passagersSaisis.filter(p => p).join("\n"),

      typeVehiculeSouhaite: modification
        ? vehiculeDirection
          ? normaliserTypeVehiculeSouhaite(vehiculeDirection.categorie)
          : formulaire.typeVehiculeSouhaite
        : formulaire.typeVehiculeCreation,
      besoinChauffeur: true,

      observations: formulaire.zoneMission === "HORS_TOAMASINA"
        ? `Forfaitaire: ${formulaire.forfaitaire}${formulaire.observations.trim() ? ` · ${formulaire.observations.trim()}` : ""}`
        : formulaire.observations.trim()
          ? formulaire.observations.trim()
        : null,
    };

    setEnvoi(true);

    try {
      const res = await fetch(
        modification
          ? `${API}/reservations/${missionEnEdition?.id}/assistant-direction`
          : `${API}/reservations`,
        {
        method: modification ? "PUT" : "POST",

        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },

        body: JSON.stringify(body),
      });

      if (res.status === 401) {
        toast.error("Votre session a expiré");
        router.replace("/login");
        return;
      }

      if (res.status === 403) {
        toast.error(
          "Vous n'avez pas l'autorisation de créer ce ticket."
        );
        return;
      }

      if (!res.ok) {
        const detail = causeLisible(await lireErreur(res));
        if (res.status === 409) {
          setPopupMission({
            type: "contrainte",
            titre: "Planification impossible",
            description: `Cause : ${detail || "véhicule indisponible, réservation en conflit ou document non conforme."}`,
          });
        } else {
          toast.error(detail || "Impossible d'enregistrer la mission");
        }
        return;
      }

      const creee = (await res.json().catch(() => null)) as
        | Reservation
        | null;

      if (creee?.id) {
        setReservations((precedentes) => Array.from(
          new Map([...precedentes, creee].map((mission) => [mission.id, mission])).values()
        ));
      }

      if (!modification) {
        const dateMission = new Date(creee?.dateDebut || formulaire.dateDebut);
        if (!Number.isNaN(dateMission.getTime())) {
          setDateCalendrier(new Date(dateMission.getFullYear(), dateMission.getMonth(), 1));
        }
      }

      const ticket = creee?.id
        ? `TKT-${String(creee.id).padStart(5, "0")}`
        : "Le ticket";

      toast.success(modification
        ? `${ticket} mise à jour.`
        : formulaire.zoneMission === "VILLE_TOAMASINA"
          ? `${ticket} créée dans l'espace Assistant de direction.`
          : `${ticket} a été transmis au Service Logistique`);

      setModalOuverte(false);
      setMissionEnEdition(null);
      setFormulaire(formulaireInitial);

      await chargerDonnees();
    } catch {
      toast.error("Erreur de communication avec le serveur");
    } finally {
      setEnvoi(false);
    }
  };

  const envoyerMissionRapideVille = async () => {
    const token = getToken();
    if (!API || !token) {
      if (!token) router.replace("/login");
      else toast.error("NEXT_PUBLIC_API_URL n'est pas configurée");
      return;
    }
    const nom = formulaire.demandeurNom.trim();
    const prenom = formulaire.demandeurPrenom.trim();
    const motif = formulaire.motif === "Autres activités"
      ? formulaire.motifAutre.trim()
      : formulaire.motif.trim();
    const heureDepartSelectionnee = formulaire.dateDebut.split("T")[1]?.slice(0, 5);
    const debut = heureDepartSelectionnee
      ? new Date(formulaire.dateDebut)
      : new Date(Number.NaN);
    if (!nom || !prenom) {
      toast.error("Sélectionnez le demandeur dans le personnel.");
      return;
    }
    if (!motif) {
      toast.error("L'objet de la mission est obligatoire.");
      return;
    }
    if (!heureDepartSelectionnee || Number.isNaN(debut.getTime())) {
      toast.error("Veuillez renseigner une date et une heure de départ valides.");
      return;
    }
    const debutMinuteCourante = new Date();
    debutMinuteCourante.setSeconds(0, 0);
    if (debut < debutMinuteCourante) {
      setPopupMission({
        type: "contrainte",
        titre: "Heure de départ invalide",
        description: "L'heure de départ ne peut pas être antérieure à la minute actuelle.",
      });
      return;
    }
    const maintenant = new Date();
    const datePlanifiee = debut.getFullYear() > maintenant.getFullYear()
      || (debut.getFullYear() === maintenant.getFullYear() && debut.getMonth() > maintenant.getMonth())
      || (debut.getFullYear() === maintenant.getFullYear() && debut.getMonth() === maintenant.getMonth() && debut.getDate() > maintenant.getDate());
    if (datePlanifiee) {
      setPopupMission({
        type: "horaire",
        titre: "Mission en ville planifiée",
        description: "Pour une date future, les départs doivent respecter les horaires de travail (08 h–12 h et 14 h–18 h) et la demande doit être créée au moins 24 heures à l'avance.",
      });
      if (!estDansHorairesTravail(debut)) {
        setPopupMission({
          type: "contrainte",
          titre: "Horaire de travail non respecté",
          description: "Une mission planifiée doit être prévue entre 08 h et 12 h ou entre 14 h et 18 h.",
        });
        return;
      }
      if (debut.getTime() < Date.now() + 24 * 60 * 60 * 1000) {
        setPopupMission({
          type: "contrainte",
          titre: "Délai de réservation insuffisant",
          description: "Une mission en ville planifiée doit être demandée au moins 24 heures à l'avance.",
        });
        return;
      }
    }
    const dureeEstimeeMinutes = Number(formulaire.dureeEstimeeMinutes);
    if (!Number.isInteger(dureeEstimeeMinutes) || dureeEstimeeMinutes <= 0 || dureeEstimeeMinutes > 1440) {
      toast.error("La durée estimée doit être comprise entre 1 minute et 24 heures.");
      return;
    }

    setEnvoi(true);
    try {
      const res = await fetch(`${API}/reservations/assistant-direction/rapide`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          typeVehicule: formulaire.typeVehiculeCreation,
          conducteurMotoId: formulaire.typeVehiculeCreation === "MOTO" && formulaire.conducteurMotoId ? Number(formulaire.conducteurMotoId) : null,
          nom,
          prenom,
          matricule: formulaire.demandeurMatricule.trim() || null,
          entite: formulaire.demandeurEntite.trim() || null,
          motif,
          heureDepart: heureDepartSelectionnee,
          dateDebut: formulaire.dateDebut,
          destination: formulaire.destination.trim(),
          motifUrgence: null,
          observations: formulaire.observations.trim() || null,
          demandeUrgente: false,
          dureeEstimeeMinutes,
        }),
      });
      if (res.status === 401) {
        toast.error("Votre session a expiré");
        router.replace("/login");
        return;
      }
      if (!res.ok) {
        const detail = causeLisible(await lireErreur(res));
        setPopupMission({
          type: "contrainte",
          titre: "Planification impossible",
          description: `Cause : ${detail || "véhicule indisponible, réservation en conflit ou document non conforme."}`,
        });
        return;
      }
      const creee = await res.json() as Reservation;
      const missionAvecEstimation: Reservation = {
        ...creee,
        dureeEstimeeMinutes: creee.dureeEstimeeMinutes ?? dureeEstimeeMinutes,
        dateFin: creee.dateFin || dateHeureLocale(new Date(debut.getTime() + dureeEstimeeMinutes * 60_000)),
      };
      setReservations((precedentes) => fusionnerReservations(precedentes, [missionAvecEstimation]));
      setDateCalendrier(new Date(debut.getFullYear(), debut.getMonth(), 1));
      toast.success(creee?.id ? `TKT-${String(creee.id).padStart(5, "0")} créée.` : "Mission créée.");
      setModalOuverte(false);
      setFormulaire(formulaireInitial);
      await chargerDonnees();
    } catch {
      toast.error("Erreur de communication avec le serveur");
    } finally {
      setEnvoi(false);
    }
  };

  const cloturerMissionAssistant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const mission = missionSelectionnee;
    const token = getToken();
    if (!mission || !API || !token) {
      if (!token) router.replace("/login");
      else toast.error("Impossible de clôturer cette mission.");
      return;
    }
    const missionRapide = mission.modeCreation === "ASSISTANT_DIRECTION";
    const dateRetour = new Date();
    const debutMission = new Date(mission.dateDebut);
    if (Number.isNaN(debutMission.getTime()) || dateRetour <= debutMission) {
      toast.error("La clôture est disponible après le départ de la mission.");
      return;
    }

    setEnvoi(true);
    try {
      const res = await fetch(`${API}/reservations/${mission.id}/assistant-direction/cloturer`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          ...(missionRapide ? {} : { dateHeureRetour: `${dateHeureLocale(dateRetour)}:${String(dateRetour.getSeconds()).padStart(2, "0")}` }),
        }),
      });
      if (res.status === 401) {
        toast.error("Votre session a expiré");
        router.replace("/login");
        return;
      }
      if (!res.ok) {
        toast.error((await lireErreur(res)) || "Impossible de clôturer la mission");
        return;
      }
      const cloturee = await res.json() as Reservation;
      setPopupMission((popup) => popup?.type === "retard" && popup.missionId === cloturee.id ? null : popup);
      setReservations((precedentes) => precedentes.map((item) => item.id === cloturee.id
        ? {
            ...item,
            ...cloturee,
            dureeEstimeeMinutes: cloturee.dureeEstimeeMinutes ?? item.dureeEstimeeMinutes,
          }
        : item));
      setMissionSelectionnee(null);
      const dureeEstimee = obtenirDureeEstimeeMission(mission);
      const dureeReelle = cloturee.dureeUtilisationMinutes
        ?? Math.floor((dateRetour.getTime() - new Date(mission.dateDebut).getTime()) / 60_000);
      if (missionRapide && dureeEstimee != null && dureeReelle < dureeEstimee) {
        const typeVehicule = libelleTypeVehicule(cloturee.typeVehiculeSouhaite || mission.typeVehiculeSouhaite).toLowerCase();
        const immatriculation = cloturee.vehicule?.immatriculation ? ` ${cloturee.vehicule.immatriculation}` : "";
        setPopupMission({
          type: "disponible",
          titre: `La ${typeVehicule}${immatriculation} est désormais libre.`,
          description: `Retour enregistré après ${formaterDuree(dureeReelle)} sur ${formaterDuree(dureeEstimee)} estimées.`,
        });
      } else {
        toast.success(`TKT-${String(cloturee.id).padStart(5, "0")} clôturé.`);
      }
      await chargerDonnees();
    } catch {
      toast.error("Erreur de communication avec le serveur");
    } finally {
      setEnvoi(false);
    }
  };

  const signalerIncidentMissionVille = async (mission: Reservation) => {
    const token = getToken();
    if (!API || !token || !mission.vehicule?.id) {
      toast.error("Le véhicule de cette mission est introuvable.");
      return;
    }
    const typeIncident = window.prompt("Type d'incident : PANNE, DOMMAGE, CONTRAVENTION ou ACCIDENT", "PANNE")?.trim().toUpperCase();
    if (!typeIncident || !["PANNE", "DOMMAGE", "CONTRAVENTION", "ACCIDENT"].includes(typeIncident)) return;
    const description = window.prompt("Décrivez l'incident", "")?.trim();
    if (!description) return;
    setSignalementIncidentMissionId(mission.id);
    try {
      const res = await fetch(`${API}/signalements-incidents`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          vehiculeId: mission.vehicule.id,
          reservationId: mission.id,
          typeIncident,
          description,
          gravite: typeIncident === "ACCIDENT" || typeIncident === "PANNE" ? "ELEVEE" : "MOYEN",
        }),
      });
      const detail = await lireErreur(res);
      if (!res.ok) {
        toast.error(detail || "Le signalement n'a pas pu être transmis.");
        return;
      }
      setPopupMission({
        type: "retard",
        titre: "Incident signalé",
        description: "Le véhicule est passé en indisponible. Le Service Logistique et l’assistante concernée ont été alertés.",
      });
      await chargerDonnees();
    } catch {
      toast.error("Erreur de communication avec le serveur.");
    } finally {
      setSignalementIncidentMissionId(null);
    }
  };

  const demanderMaintenanceMissionVille = async (mission: Reservation) => {
    const token = getToken();
    if (!API || !token || !mission.vehicule?.id) {
      toast.error("Le véhicule de cette mission est introuvable.");
      return;
    }
    const natureIntervention = window.prompt(
      "Décrivez la demande de maintenance à transmettre au Service Logistique",
      "Entretien du véhicule après mission"
    )?.trim();
    if (!natureIntervention) return;
    setDemandeMaintenanceMissionId(mission.id);
    try {
      const res = await fetch(`${API}/maintenances/demandes-entretien`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ vehiculeId: mission.vehicule.id, reservationId: mission.id, natureIntervention }),
      });
      const detail = await lireErreur(res);
      if (!res.ok) {
        toast.error(detail || "La demande de maintenance n'a pas pu être transmise.");
        return;
      }
      toast.success("Demande transmise au Service Logistique. Il pourra la valider et la transmettre au mécanicien DID.");
    } catch {
      toast.error("Erreur de communication avec le serveur.");
    } finally {
      setDemandeMaintenanceMissionId(null);
    }
  };

  const soumettreDemandeEntretien = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = getToken();
    if (!API || !token || !vehiculeEntretienId || !panneEntretien) {
      toast.error("Sélectionnez un véhicule et une panne.");
      return;
    }
    if (panneEntretien === "Autre panne à préciser" && !panneEntretienAutre.trim()) {
      toast.error("Veuillez préciser la panne ou l'anomalie.");
      return;
    }
    setEnvoiEntretien(true);
    try {
      const response = await fetch(`${API}/maintenances/demandes-entretien`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          vehiculeId: Number(vehiculeEntretienId),
          natureIntervention: panneEntretien === "Autre panne à préciser"
            ? `Autre panne — ${panneEntretienAutre.trim()}`
            : panneEntretien,
        }),
      });
      const detail = await lireErreur(response);
      if (!response.ok) throw new Error(detail || "La demande d'entretien n'a pas pu être transmise.");
      toast.success("Demande d'entretien transmise au Chef du Service Logistique.");
      setDemandeEntretienOuverte(false);
      setVehiculeEntretienId("");
      setPanneEntretien("");
      setPanneEntretienAutre("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de transmettre la demande d'entretien.");
    } finally {
      setEnvoiEntretien(false);
    }
  };

  const exporterStatistiquesMissions = () => {
    if (!periodeExportValide) {
      toast.error("Le mois de fin doit être égal ou postérieur au mois de début.");
      return;
    }

    type LigneStatistique = {
      periode: string;
      missions: number;
      ville: number;
      horsVille: number;
      voitures: number;
      motos: number;
      historisees: number;
      actives: number;
      incidents: number;
      dureeTotaleHeures: number | "";
      dureeMoyenneHeures: number | "";
    };
    const calculerLigneStatistique = (periode: string, missions: Reservation[]): LigneStatistique => {
      const terminees = missions.filter((mission) => missionEstDansHistorique(mission, instantCalendrier));
      const durees = terminees
        .map((mission) => mission.dureeUtilisationMinutes)
        .filter((minutes): minutes is number => typeof minutes === "number" && minutes > 0);
      const dureeTotale = durees.reduce((total, minutes) => total + minutes, 0);
      return {
        periode,
        missions: missions.length,
        ville: missions.filter((mission) => mission.zoneMission === "VILLE_TOAMASINA").length,
        horsVille: missions.filter((mission) => mission.zoneMission === "HORS_TOAMASINA").length,
        voitures: missions.filter((mission) => mission.typeVehiculeSouhaite === "VOITURE").length,
        motos: missions.filter((mission) => mission.typeVehiculeSouhaite === "MOTO").length,
        historisees: terminees.length,
        actives: missions.length - terminees.length,
        incidents: missions.filter((mission) => Boolean(mission.incidentCloture?.trim())).length,
        dureeTotaleHeures: durees.length ? Number((dureeTotale / 60).toFixed(2)) : "",
        dureeMoyenneHeures: durees.length ? Number((dureeTotale / durees.length / 60).toFixed(2)) : "",
      };
    };

    const moisSelectionnes = listeMoisInclusifs(moisDebutExport, moisFinExport);
    const lignes: LigneStatistique[] = [
      calculerLigneStatistique(`TOTAL ${moisDebutExport} à ${moisFinExport}`, missionsPeriodeExport),
    ];
    moisSelectionnes.forEach((mois) => {
      const missionsDuMois = missionsPeriodeExport.filter((mission) => {
        const date = new Date(mission.dateDebut);
        return !Number.isNaN(date.getTime()) && moisPourInput(date) === mois;
      });
      lignes.push(calculerLigneStatistique(mois, missionsDuMois));
    });

    exportCsv({
      titre: "Statistiques des missions — Assistant de direction",
      nomFichier: `statistiques_missions_${moisDebutExport}_${moisFinExport}`,
      colonnes: [
        { header: "Période", key: "periode" },
        { header: "Nombre de missions", key: "missions" },
        { header: "En ville", key: "ville" },
        { header: "Hors ville", key: "horsVille" },
        { header: "Voitures", key: "voitures" },
        { header: "Motos", key: "motos" },
        { header: "Historisées", key: "historisees" },
        { header: "Actives / à venir", key: "actives" },
        { header: "Avec incident", key: "incidents" },
        { header: "Durée cumulée (heures)", key: "dureeTotaleHeures" },
        { header: "Durée moyenne (heures)", key: "dureeMoyenneHeures" },
      ],
      donnees: lignes,
    });
    toast.success(`Synthèse exportée pour ${moisSelectionnes.length} mois.`);
  };

  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        @keyframes mission-popup-slide-in {
          from { transform: translate(-50%, -150%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }

        body {
          margin: 0;
        }

        input,
        textarea,
        select {
          color: #111827;
          background-color: white;
          font-family: inherit;
          font-size: 14px;
        }

        input:focus,
        textarea:focus,
        select:focus {
          outline: 2px solid #94a3b8;
          outline-offset: 1px;
          border-color: #94a3b8 !important;
        }

        textarea {
          resize: vertical;
        }

        button {
          font-family: inherit;
        }

        .assistant-direction-page button,
        .assistant-direction-modal button,
        .assistant-direction-page button.btn-spat,
        .assistant-direction-modal button.btn-spat {
          background: #fff !important;
          border: 1px solid #e2e8f0 !important;
          color: #374151 !important;
          box-shadow: none !important;
        }

        .assistant-direction-page button:hover:not(:disabled),
        .assistant-direction-modal button:hover:not(:disabled) {
          background: #f8fafc !important;
          border-color: #cbd5e1 !important;
        }

        .assistant-direction-page button:active:not(:disabled),
        .assistant-direction-modal button:active:not(:disabled),
        .assistant-direction-page button:focus:not(:disabled),
        .assistant-direction-modal button:focus:not(:disabled) {
          background: var(--spat-bleu) !important;
          border-color: var(--spat-bleu) !important;
          color: #fff !important;
        }

        .assistant-direction-page button:active:not(:disabled) svg,
        .assistant-direction-modal button:active:not(:disabled) svg,
        .assistant-direction-page button:focus:not(:disabled) svg,
        .assistant-direction-modal button:focus:not(:disabled) svg {
          color: #fff !important;
        }

        @media (max-width: 950px) {
          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .form-grid {
            grid-template-columns: 1fr !important;
          }

          .passager-ligne {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 600px) {
          .page-container {
            padding: 18px !important;
          }

          .stats-grid {
            grid-template-columns: 1fr !important;
          }

          .header-page {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .header-page .bouton-nouvelle {
            justify-content: center !important;
          }

          .modal-container {
            padding: 0 !important;
            align-items: flex-end !important;
          }

          .modal-content {
            max-height: 95vh !important;
            border-radius: 14px 14px 0 0 !important;
          }
        }
      `}</style>
      {erreurChargement && <div role="alert" style={{ margin: "12px 24px", padding: 12, background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 8 }}>Missions indisponibles depuis l’API : {erreurChargement}. Le calendrier n’est pas à jour.</div>}

      <EnTete afficherNotifications={false} />
      <div style={{ display: "flex", justifyContent: "flex-end", margin: "12px 24px 0" }}><IncidentSignalementButton role={ROLES.ASSISTANT_DIRECTION} /></div>
      {popupMission && (
        <div
          role={popupMission.type === "disponible" ? "status" : "alert"}
          aria-live={popupMission.type === "disponible" ? "polite" : "assertive"}
          style={{
            position: "fixed",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 30000,
            width: "min(560px, calc(100vw - 24px))",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            padding: "16px 18px",
            border: `1px solid ${popupMission.type === "retard" ? "#fbbf24" : popupMission.type === "horaire" || popupMission.type === "contrainte" ? "#93c5fd" : "#86efac"}`,
            borderLeft: `5px solid ${popupMission.type === "retard" ? "#d97706" : popupMission.type === "horaire" || popupMission.type === "contrainte" ? "#2563eb" : "#16a34a"}`,
            borderRadius: 12,
            background: popupMission.type === "retard" ? "#fffbeb" : popupMission.type === "horaire" || popupMission.type === "contrainte" ? "#eff6ff" : "#f0fdf4",
            color: "#1f2937",
            boxShadow: "0 18px 40px rgba(15, 23, 42, 0.2)",
            animation: "mission-popup-slide-in 320ms ease-out both",
          }}
        >
          <div>
            <strong style={{ display: "block", fontSize: 15 }}>{popupMission.titre}</strong>
            <span style={{ display: "block", marginTop: 5, fontSize: 13, lineHeight: 1.45, color: "#475569" }}>{popupMission.description}</span>
          </div>
          <button
            type="button"
            aria-label="Fermer le message"
            onClick={() => setPopupMission(null)}
            style={{ border: 0, background: "transparent", color: "#475569", cursor: "pointer", padding: 2, flexShrink: 0 }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      <div
        className="page-container assistant-direction-page"
        style={{
          minHeight: "calc(100vh - 66px)",
          backgroundColor: "#ffffff",
          padding: 32,
        }}
      >
        <div
          style={{
            maxWidth: 1320,
            margin: "0 auto",
          }}
        >
          <div
            className="header-page"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 20,
              marginBottom: 24,
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  color: "#6b7280",
                  fontSize: 14,
                }}
              >
                ASSISTANT(TE) DE DIRECTION
              </p>
            </div>
          </div>

          <div
            className="stats-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(220px, 1fr)",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <StatCard
              titre="Mes tickets"
              valeur={chargement ? "…" : totalDemandes}
              icone={<FileText size={21} color="#475569" />}
            />

          </div>

          <section aria-label="Calendrier des missions de la direction" style={{ ...rechercheCardStyle, marginBottom: 24 }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <h2 style={{ margin: 0, fontSize: 18, color: "#111827" }}>Calendrier des missions</h2>
                <button
                  type="button"
                  className="btn-spat btn-bleu bouton-nouvelle"
                  data-default-primary="true"
                  onClick={() => modalOuverte || choixInitialOuvert ? fermerModal() : ouvrirChoixInitial()}
                  aria-expanded={modalOuverte || choixInitialOuvert}
                >
                  <Plus size={18} />
                  Nouvelle mission
                </button>
                <button
                  type="button"
                  onClick={() => setHistoriqueOuvert(true)}
                  aria-label={`Voir l'historique des missions de ${titreCalendrier}`}
                  style={boutonSecondaire}
                >
                  <History size={17} />
                  Historique du mois ({historiqueDuMois.length})
                </button>
                <AvisIndisponibiliteButton />
                <HabilitationMotoButton />
                <button
                  type="button"
                  className="btn-spat btn-orange"
                  onClick={() => setDemandeEntretienOuverte(true)}
                  style={boutonSecondaire}
                >
                  <Wrench size={17} />
                  Demande d&apos;entretien
                </button>
                <button
                  type="button"
                  className="btn-spat btn-vert"
                  onClick={() => setCarteGpsOuverte(true)}
                  style={{
                    ...boutonSecondaire,
                    backgroundColor: "#16a34a",
                    color: "#ffffff",
                  }}
                  title="Suivre les véhicules mutualisés équipés GPS"
                >
                  <MapIcon size={17} />
                  Carte GPS
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <button type="button" aria-label="Mois précédent" title="Mois précédent"
                  onClick={() => setDateCalendrier((date) => decalerDateCalendrier(date, -1))}
                  style={boutonNavigationCalendrier}><ChevronLeft size={19} /></button>
                <strong style={{ minWidth: 180, textAlign: "center", color: "#334155", textTransform: "capitalize" }}>{titreCalendrier}</strong>
                <button type="button" aria-label="Mois suivant" title="Mois suivant"
                  onClick={() => setDateCalendrier((date) => decalerDateCalendrier(date, 1))}
                  style={boutonNavigationCalendrier}><ChevronRight size={19} /></button>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: 12, marginBottom: 16, padding: 14, border: "1px solid #e2e8f0", borderRadius: 10, background: "#f8fafc" }}>
              <label style={{ display: "grid", gap: 5, color: "#475569", fontSize: 12, fontWeight: 700 }}>
                Du mois
                <input
                  type="month"
                  value={moisDebutExport}
                  onChange={(event) => setMoisDebutExport(event.target.value)}
                  style={{ ...inputStyle, minWidth: 155 }}
                />
              </label>
              <label style={{ display: "grid", gap: 5, color: "#475569", fontSize: 12, fontWeight: 700 }}>
                Au mois
                <input
                  type="month"
                  value={moisFinExport}
                  onChange={(event) => setMoisFinExport(event.target.value)}
                  style={{ ...inputStyle, minWidth: 155 }}
                />
              </label>
              {!periodeExportValide && <span role="alert" style={{ flex: "1 1 240px", color: "#b91c1c", fontSize: 12 }}>Le mois de fin doit être égal ou postérieur au mois de début.</span>}
              <button
                type="button"
                className="btn-spat btn-bleu"
                onClick={exporterStatistiquesMissions}
                disabled={!periodeExportValide || chargement}
                title="Télécharger les statistiques et le détail des missions au format CSV compatible avec Excel"
              >
                <Download size={17} />
                Exporter CSV (Excel)
              </button>
            </div>
            <div style={{ width: "100%", padding: "4px 0 12px" }}>
              <article style={{ display: "grid", gridTemplateColumns: "minmax(180px, 23%) minmax(0, 1fr)", width: "100%", minHeight: 410, overflow: "hidden", border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", boxShadow: "0 12px 30px rgba(15, 23, 42, 0.12)" }}>
                <div style={{ position: "relative", overflow: "hidden", background: "#fff", color: "#111827", minHeight: 410 }}>
                  <div style={{ position: "absolute", inset: 0, background: "#fff", clipPath: "polygon(0 60%, 100% 44%, 100% 100%, 0 100%)" }} />
                  <div style={{ position: "absolute", top: -36, left: -35, width: 205, height: 205, borderRadius: "50%", background: "#fff", boxShadow: "12px 15px 0 rgba(15,23,42,.04)" }} />
                  <span style={{ position: "absolute", top: 45, left: 22, fontSize: 74, lineHeight: 1, fontWeight: 800, letterSpacing: -4, color: "#111827" }}>{String(dateCalendrier.getMonth() + 1).padStart(2, "0")}</span>
                </div>
                <div style={{ minWidth: 0, padding: "28px clamp(18px, 5vw, 64px) 22px", display: "flex", flexDirection: "column" }}>
                  <div style={{ textAlign: "right", lineHeight: 1, marginBottom: 22 }}>
                    <strong style={{ display: "block", color: "#111827", fontSize: 38, lineHeight: 1, fontWeight: 800 }}>{dateCalendrier.getFullYear()}</strong>
                    <span style={{ display: "block", marginTop: 7, color: "#1e293b", fontSize: 15, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" }}>{dateCalendrier.toLocaleDateString("fr-FR", { month: "long" })}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 5, textAlign: "center" }}>
                    {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((jour) => <span key={jour} style={{ color: "#64748b", fontSize: 11, fontWeight: 800, paddingBottom: 7 }}>{jour}</span>)}
                    {joursCalendrier.map(({ date, dansPeriode }) => {
                      const missionsDuJour = dansPeriode ? missionsParJourCalendrier.get(cleJourCalendrier(date)) || [] : [];
                      const maintenant = new Date();
                      const estAujourdhui = dansPeriode
                        && date.getFullYear() === maintenant.getFullYear()
                        && date.getMonth() === maintenant.getMonth()
                        && date.getDate() === maintenant.getDate();
                      return <div key={date.toISOString()} style={{ minHeight: 44, padding: "3px 3px", border: missionsDuJour.length ? "1px solid #cbd5e1" : "1px solid transparent", borderRadius: 6, background: "#fff", color: !dansPeriode ? "#cbd5e1" : "#334155", overflow: "visible" }}>
                        <strong style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 12, lineHeight: "16px", color: estAujourdhui ? "#111827" : undefined, fontWeight: estAujourdhui ? 900 : undefined }}>
                          {dansPeriode ? date.getDate() : ""}
                          {missionsDuJour.length > 0 && <span aria-label="Mission prévue" style={{ width: 5, height: 5, flex: "0 0 auto", borderRadius: "50%", background: "#64748b" }} />}
                        </strong>
                        <div style={{ display: "grid", gap: 3, marginTop: 3 }}>
                          {missionsDuJour.map((mission) => {
                            const typeVehicule = mission.typeVehiculeSouhaite === "MOTO" ? "🏍️" : mission.typeVehiculeSouhaite === "VOITURE" ? "🚗" : "";
                            const missionCloturee = mission.statut.toUpperCase() === "CLOTUREE";
                            return <button key={mission.id} type="button" title={`TKT-${String(mission.id).padStart(5, "0")} · ${formatHeure(mission.dateDebut)} — détails`}
                              onClick={() => { if (!missionCloturee) selectionnerMission(mission); }}
                              disabled={missionCloturee}
                              style={{ display: "block", width: "100%", overflow: "hidden", border: "1px solid #e2e8f0", borderRadius: 4, padding: "2px 3px", background: missionCloturee ? "#f8fafc" : "#fff", color: "#374151", fontSize: 11, fontWeight: 700, lineHeight: 1.2, textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: missionCloturee ? "default" : "pointer", opacity: missionCloturee ? 0.7 : 1 }}>
                              {`${typeVehicule} ${formatHeure(mission.dateDebut)}`}
                            </button>;
                          })}
                        </div>
                      </div>;
                    })}
                  </div>
                </div>
              </article>
            </div>
          </section>

        </div>
      </div>

      <SlideInPanel
        open={choixInitialOuvert}
        title="Choisir la zone et le véhicule"
        onClose={() => setChoixInitialOuvert(false)}
      >
        <div style={{ display: "grid", gap: 18 }}>
          <Champ label="Zone de mission" obligatoire>
            <select
              autoFocus
              value={zoneInitiale}
              onChange={(event) => {
                const zone = event.target.value as ZoneMission | "";
                setZoneInitiale(zone);
                setTypeVehiculeInitial(zone === "HORS_TOAMASINA" ? "VOITURE" : "");
              }}
              style={inputStyle}
            >
              <option value="">Sélectionner la zone</option>
              <option value="VILLE_TOAMASINA">Dans la ville de Toamasina</option>
              <option value="HORS_TOAMASINA">Hors ville de Toamasina</option>
            </select>
          </Champ>
          {zoneInitiale !== "HORS_TOAMASINA" && <Champ label="Type de véhicule" obligatoire>
            <select
              value={typeVehiculeInitial}
              disabled={!zoneInitiale}
              onChange={(event) => setTypeVehiculeInitial(event.target.value as "MOTO" | "VOITURE" | "")}
              style={inputStyle}
            >
              <option value="">Sélectionner un véhicule</option>
              {zoneInitiale === "VILLE_TOAMASINA" && (
                <option value="MOTO">
                  Moto{immatriculationsAffectees("MOTO").length > 0 ? ` — ${immatriculationsAffectees("MOTO").join(", ")}` : ""}
                </option>
              )}
              {zoneInitiale && (
                <option value="VOITURE">
                  Voiture{zoneInitiale === "VILLE_TOAMASINA" && immatriculationsAffectees("VOITURE").length > 0
                    ? ` — ${immatriculationsAffectees("VOITURE").join(", ")}`
                    : ""}
                </option>
              )}
            </select>

          </Champ>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 4 }}>
            <button type="button" onClick={() => setChoixInitialOuvert(false)} style={boutonSecondaire}>Annuler</button>
            <button type="button" onClick={continuerVersFormulaire} disabled={!zoneInitiale || !typeVehiculeInitial} className="btn-spat btn-bleu">
              Continuer
            </button>
          </div>
        </div>
      </SlideInPanel>

      <SlideInPanel
        open={demandeEntretienOuverte}
        title="Demande d'entretien"
        onClose={() => { if (!envoiEntretien) setDemandeEntretienOuverte(false); }}
      >
        <form onSubmit={soumettreDemandeEntretien} style={{ display: "grid", gap: 18 }}>

          <Champ label="Véhicule" obligatoire>
            <select value={vehiculeEntretienId} onChange={(event) => setVehiculeEntretienId(event.target.value)} required style={inputStyle}>
              <option value="">Sélectionner le véhicule</option>
              {vehiculesDirection.map((vehicule) => (
                <option key={vehicule.id} value={vehicule.id} disabled={vehiculeIndisponible(vehicule)}>
                  {String(vehicule.typeVehicule || vehicule.categorie || "").toUpperCase().includes("MOTO") ? "Moto" : "Voiture"} — {vehicule.immatriculation || `N°${vehicule.id}`}{vehiculeIndisponible(vehicule) ? ` · ${libelleStatutVehicule(vehicule.statut)}` : ""}
                </option>
              ))}
            </select>
          </Champ>
          <Champ label="Panne / anomalie" obligatoire>
            <select value={panneEntretien} onChange={(event) => { setPanneEntretien(event.target.value); if (event.target.value !== "Autre panne à préciser") setPanneEntretienAutre(""); }} required style={inputStyle}>
              <option value="">Sélectionner la panne</option>
              {PANNES_ENTRETIEN.map((panne) => <option key={panne} value={panne}>{panne}</option>)}
            </select>
          </Champ>
          {panneEntretien === "Autre panne à préciser" && (
            <Champ label="Précisez la panne" obligatoire>
              <input value={panneEntretienAutre} onChange={(event) => setPanneEntretienAutre(event.target.value)} required maxLength={255} style={inputStyle} placeholder="Décrivez la panne ou l'anomalie" />
            </Champ>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" onClick={() => setDemandeEntretienOuverte(false)} disabled={envoiEntretien} style={boutonSecondaire}>Annuler</button>
            <button type="submit" disabled={envoiEntretien} className="btn-spat btn-orange">
              <Send size={16} /> {envoiEntretien ? "Transmission…" : "Envoyer la demande"}
            </button>
          </div>
        </form>
      </SlideInPanel>

      {modalOuverte && (
        <div
          className="modal-container assistant-direction-modal"
          onMouseDown={fermerModal}
          style={modalOverlayStyle}
        >
          <form
            className="modal-content"
            onSubmit={envoyerDemande}
            onMouseDown={(event) => event.stopPropagation()}
            style={{ ...modalContentStyle, maxWidth: 1100 }}
          >
            <div style={modalHeaderStyle}>
              <div style={iconeTexteStyle}>
                <div style={modalIconStyle}>
                  <Car size={21} color="#475569" />
                </div>

                <div>
                  <h3 style={modalTitleStyle}>{missionEnEdition ? "Modifier la mission" : "Nouvelle mission"}</h3>

                </div>
              </div>

              <button
                type="button"
                onClick={fermerModal}
                disabled={envoi}
                aria-label="Fermer"
                style={{
                  ...closeButtonStyle,
                  cursor: envoi ? "not-allowed" : "pointer",
                  opacity: envoi ? 0.5 : 1,
                }}
              >
                <X size={19} color="#4b5563" />
              </button>
            </div>

            <div style={{ padding: 22 }}>
              {!missionEnEdition && formulaire.zoneMission === "VILLE_TOAMASINA" ? (
                <div style={{ display: "grid", gap: 18 }}>
                  <div style={{ padding: 12, borderRadius: 9, background: "#f8fafc", color: "#475569", fontSize: 13 }}>
                    Mission en ville · {formulaire.typeVehiculeCreation === "MOTO" ? "Moto" : "Voiture"}
                    {immatriculationsAffectees(formulaire.typeVehiculeCreation).length > 0 && (
                      <span style={{ marginLeft: 8, color: "#0f172a", fontWeight: 700 }}>
                        · {immatriculationsAffectees(formulaire.typeVehiculeCreation).join(", ")}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <strong style={{ color: "#334155", fontSize: 13 }}>Véhicule affecté à la direction</strong>
                    {vehiculesDirection.filter((vehicule) => normaliserTypeVehiculeSouhaite(vehicule.categorie) === formulaire.typeVehiculeCreation).map((vehicule) => {
                      const disponibilite = disponibiliteVille(vehicule);
                      return (
                        <button key={vehicule.id} type="button" disabled={!disponibilite.disponible}
                          onClick={() => {
                            if (disponibilite.disponible) return;
                            const jusquA = disponibilite.dateFin ? ` jusqu'au ${formatDateHeure(disponibilite.dateFin)}` : "";
                            setPopupMission({ type: "contrainte", titre: "Véhicule indisponible", description: `${vehicule.immatriculation || "Véhicule"} est indisponible${jusquA}. Cause : ${disponibilite.raison || "entretien ou réservation en conflit"}.` });
                          }}
                          style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: disponibilite.disponible ? "#ecfdf5" : "#fef2f2", color: "#334155", textAlign: "left", opacity: disponibilite.disponible ? 1 : 0.75, cursor: disponibilite.disponible ? "default" : "not-allowed" }}>
                          <span>{vehicule.immatriculation || `Véhicule n°${vehicule.id}`}</span>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>{disponibilite.disponible ? "Disponible" : disponibilite.raison || "Indisponible"}</span>
                        </button>
                      );
                    })}
                  </div>
                  <PersonnelAutocomplete
                    label="Demandeur"
                    onSelect={(personnel) => setFormulaire((ancien) => ({
                      ...ancien,
                      demandeurNom: personnel.nom,
                      demandeurPrenom: personnel.prenom,
                      demandeurMatricule: personnel.matricule,
                      demandeurEntite: [personnel.poste, personnel.direction].filter(Boolean).join(" — "),
                    }))}
                  />
                  {formulaire.typeVehiculeCreation === "MOTO" && <ConducteurMotoSelect value={formulaire.conducteurMotoId} onChange={(valeur) => modifierChamp("conducteurMotoId", valeur)} />}
                  <Champ label="Motif de la mission" obligatoire>
                    <select value={formulaire.motif} onChange={(event) => setFormulaire((ancien) => ({ ...ancien, motif: event.target.value, motifAutre: event.target.value === "Autres activités" ? ancien.motifAutre : "" }))} required style={inputStyle}>
                      <option value="">Sélectionner un motif</option>
                      {MOTIFS_MISSION_VILLE.map((motif) => <option key={motif} value={motif}>{motif}</option>)}
                    </select>
                  </Champ>
                  {formulaire.motif === "Autres activités" && (
                    <Champ label="Précisez l'activité" obligatoire>
                      <input value={formulaire.motifAutre} onChange={(event) => modifierChamp("motifAutre", event.target.value)} required maxLength={255} style={inputStyle} placeholder="Décrivez l'activité" />
                    </Champ>
                  )}
                  <Champ label="Date et heure de départ" obligatoire>
                    <input
                      type="datetime-local"
                      value={formulaire.dateDebut}
                      onChange={(event) => modifierChamp("dateDebut", event.target.value)}
                      required
                      style={inputStyle}
                    />
                  </Champ>
                  <Champ label="Destination" obligatoire>
                    <input value={formulaire.destination} onChange={(e) => modifierChamp("destination", e.target.value)} required style={inputStyle} />
                  </Champ>
                  <Champ label="Durée estimée de la mission" obligatoire>
                    <input
                      type="number"
                      min={1}
                      max={1440}
                      step={1}
                      value={formulaire.dureeEstimeeMinutes}
                      onChange={(event) => modifierChamp("dureeEstimeeMinutes", event.target.value)}
                      required
                      placeholder="Ex. 60"
                      style={inputStyle}
                    />
                  </Champ>
                  <Champ label="Observations / justification hors horaires, week-end ou jour férié">
                    <textarea
                      value={formulaire.observations}
                      onChange={(event) => modifierChamp("observations", event.target.value)}
                      rows={3}
                      maxLength={2000}
                      placeholder="Préciser le contexte ou une observation utile..."
                      style={textareaStyle}
                    />
                  </Champ>
                </div>
              ) : (
              <>
              <BlocFormulaire
                numero="1"
                titre="Demandeur"
                icone={<UserRound size={18} color="#475569" />}
              >
                <PersonnelAutocomplete
                  label="Demandeur"
                  style={{ marginBottom: 16 }}
                  onSelect={(personnel) => {
                    setFormulaire((ancien) => ({
                      ...ancien,
                      demandeurNom: personnel.nom,
                      demandeurPrenom: personnel.prenom,
                      demandeurMatricule: personnel.matricule,
                      demandeurEntite: [personnel.poste, personnel.direction].filter(Boolean).join(" — "),
                    }));
                  }}
                />
                <div className="form-grid" style={gridDeuxColonnes}>
                  {missionEnEdition && formulaire.zoneMission !== "HORS_TOAMASINA" && (
                    <>
                      <Champ label="Matricule" obligatoire>
                        <input
                          value={formulaire.demandeurMatricule}
                          onChange={(e) => modifierChamp("demandeurMatricule", e.target.value)}
                          placeholder="Ex. SPAT00125"
                          style={inputStyle}
                        />
                      </Champ>

                      <Champ label="Téléphone (facultatif)">
                        <input
                          type="tel"
                          value={formulaire.demandeurTelephone}
                          onChange={(e) => modifierChamp("demandeurTelephone", e.target.value)}
                          placeholder="Numéro joignable"
                          style={inputStyle}
                        />
                      </Champ>
                    </>
                  )}
                  {missionEnEdition && formulaire.typeVehiculeSouhaite === "MOTO" && <ConducteurMotoSelect value={formulaire.conducteurMotoId} onChange={(valeur) => modifierChamp("conducteurMotoId", valeur)} />}

                  {missionEnEdition && <div style={{ gridColumn: "1 / -1" }}>
                    <Champ
                      label="Direction / Département / Service"
                      obligatoire
                    >
                      <input
                        value={formulaire.demandeurEntite}
                        onChange={(e) =>
                          modifierChamp(
                            "demandeurEntite",
                            e.target.value
                          )
                        }
                        placeholder="Ex. Direction Financière et de la Performance"
                        style={inputStyle}
                      />
                    </Champ>
                  </div>}
                </div>
              </BlocFormulaire>

              <BlocFormulaire
                numero="2"
                titre="Informations sur la mission"
                icone={<MapPin size={18} color="#475569" />}
              >
                <div className="form-grid" style={gridDeuxColonnes}>
                  <Champ label="Zone de mission" obligatoire>
                    <div style={readOnlyStyle}>{formulaire.zoneMission === "HORS_TOAMASINA" ? "Hors ville de Toamasina" : "Dans la ville de Toamasina"}</div>
                  </Champ>

                  <Champ label="État opérationnel">
                    <div style={readOnlyStyle}>
                      {etatOperationnelFormulaire || "Sélectionnez la zone"}
                    </div>
                  </Champ>

                  {missionEnEdition ? (
                    <Champ label={vehiculeDirection ? "Véhicule affecté" : "Type de véhicule souhaité"} obligatoire>
                      <select
                        value={vehiculeDirection
                          ? normaliserTypeVehiculeSouhaite(vehiculeDirection.categorie)
                          : formulaire.typeVehiculeSouhaite}
                        disabled={vehiculeDirection !== null}
                        onChange={(e) => modifierChamp("typeVehiculeSouhaite", e.target.value)}
                        style={inputStyle}
                      >
                        {vehiculeDirection ? (
                          <option value={normaliserTypeVehiculeSouhaite(vehiculeDirection.categorie)}>
                            {vehiculeDirection.immatriculation} — {libelleTypeVehicule(vehiculeDirection.categorie)}
                          </option>
                        ) : (
                          <>
                            <option value="">Sélectionner un type</option>
                            <option value="VOITURE">Voiture</option>
                            {formulaire.zoneMission !== "HORS_TOAMASINA" && <option value="MOTO">Moto</option>}
                          </>
                        )}
                      </select>
                    </Champ>
                  ) : formulaire.zoneMission === "VILLE_TOAMASINA" ? (
                    <Champ label="Type de véhicule" obligatoire>
                      <div style={readOnlyStyle}>{formulaire.typeVehiculeCreation === "MOTO" ? "Moto" : "Voiture"}</div>
                    </Champ>
                  ) : null}

                </div>

                <div style={{ marginTop: 16 }}>
                  <Champ label={formulaire.zoneMission === "HORS_TOAMASINA" ? "Motif de voyage" : "Objet de la mission"} obligatoire>
                    {formulaire.zoneMission === "VILLE_TOAMASINA" ? <select value={formulaire.motif} onChange={(e) => setFormulaire((ancien) => ({ ...ancien, motif: e.target.value, motifAutre: e.target.value === "Autres activités" ? ancien.motifAutre : "" }))} required style={inputStyle}>
                      <option value="">Sélectionner un motif</option>
                      {MOTIFS_MISSION_VILLE.map((motif) => <option key={motif} value={motif}>{motif}</option>)}
                    </select> : <textarea value={formulaire.motif} onChange={(e) => modifierChamp("motif", e.target.value)} rows={3} placeholder="Décrivez le motif du voyage..." style={textareaStyle} />}
                  </Champ>
                  {formulaire.zoneMission === "VILLE_TOAMASINA" && formulaire.motif === "Autres activités" && (
                    <Champ label="Précisez l'activité" obligatoire>
                      <input value={formulaire.motifAutre} onChange={(event) => modifierChamp("motifAutre", event.target.value)} required maxLength={255} style={inputStyle} placeholder="Décrivez l'activité" />
                    </Champ>
                  )}
                </div>

                <div
                  className="form-grid"
                  style={{
                    ...gridDeuxColonnes,
                    marginTop: 16,
                  }}
                >
                  <Champ label={formulaire.zoneMission === "HORS_TOAMASINA" ? "Lieu de placement" : "Point de départ"} obligatoire>
                    <input
                      value={formulaire.zoneMission === "HORS_TOAMASINA" ? formulaire.destination : formulaire.pointDepart}
                      onChange={(e) =>
                        formulaire.zoneMission === "HORS_TOAMASINA" ? modifierChamp("destination", e.target.value) : modifierChamp("pointDepart", e.target.value)
                      }
                      placeholder={formulaire.zoneMission === "HORS_TOAMASINA" ? "Ex. Tana" : "Ex. SPAT Toamasina"}
                      style={inputStyle}
                    />
                  </Champ>

                  <Champ label={formulaire.zoneMission === "HORS_TOAMASINA" ? "Durée" : "Destination"} obligatoire>
                    {formulaire.zoneMission === "HORS_TOAMASINA" ? <input type="number" min={1} step={1} value={Math.max(1, Math.ceil(Number(formulaire.dureeEstimeeMinutes || 1440) / 1440))} onChange={(e) => {
                      const jours = Math.max(1, Number(e.target.value) || 1);
                      modifierChamp("dureeEstimeeMinutes", String(jours * 1440));
                      if (formulaire.dateDebut) { const fin = new Date(formulaire.dateDebut); fin.setMinutes(fin.getMinutes() + jours * 1440); modifierChamp("dateFin", dateHeureLocale(fin)); }
                    }} style={inputStyle} /> :
                    <input
                      value={formulaire.destination}
                      onChange={(e) =>
                        modifierChamp("destination", e.target.value)
                      }
                      placeholder="Lieu de destination"
                      style={inputStyle}
                    />
                    }
                  </Champ>

                  {formulaire.zoneMission === "HORS_TOAMASINA" && <Champ label="Forfaitaire" obligatoire><select value={formulaire.forfaitaire} onChange={(e) => modifierChamp("forfaitaire", e.target.value)} style={inputStyle}><option value="oui">Oui</option><option value="non">Non</option></select></Champ>}

                  <Champ label="Date et heure de départ" obligatoire>
                    <input
                      type="datetime-local"
                      value={formulaire.dateDebut}
                      onChange={(e) => { modifierChamp("dateDebut", e.target.value); if (formulaire.zoneMission === "HORS_TOAMASINA" && e.target.value) { const fin = new Date(e.target.value); fin.setMinutes(fin.getMinutes() + Math.max(1, Number(formulaire.dureeEstimeeMinutes) || 1440)); modifierChamp("dateFin", dateHeureLocale(fin)); } }}
                      style={inputStyle}
                    />
                  </Champ>

                  <Champ
                    label="Date et heure de retour prévues"
                    obligatoire
                  >
                    <input
                      type="datetime-local"
                      value={formulaire.dateFin}
                      onChange={(e) =>
                        modifierChamp("dateFin", e.target.value)
                      }
                      style={inputStyle}
                    />
                  </Champ>
                </div>

              </BlocFormulaire>

              <BlocFormulaire
                numero="3"
                titre="Passagers et contraintes"
                icone={<Users size={18} color="#475569" />}
              >
                <div style={{ marginTop: 16 }}>
                  <Champ label="Nombre de passagers" obligatoire>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={formulaire.nombrePassagers}
                      onChange={(e) =>
                        modifierNombrePassagers(e.target.value)
                      }
                      style={inputStyle}
                    />
                  </Champ>
                </div>

                <div style={{ marginTop: 16 }}>
                  <Champ
                    label="Nom et prénom des passagers"
                    obligatoire={formulaire.zoneMission !== "HORS_TOAMASINA"}
                  >
                    <div
                      style={{
                        display: "grid",
                        gap: 10,
                      }}
                    >
                      {lignesPassagers.map((_, index) => (
                        <div
                          key={`passager-${index}`}
                          className="passager-ligne"
                          style={{
                            display: "grid",
                            gridTemplateColumns: "110px minmax(0, 1fr)",
                            gap: 10,
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              color: "#64748b",
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            Passager {index + 1}
                          </span>

                          <div style={{ display: "grid", gap: 8 }}>
                            <PersonnelAutocomplete
                              label={`Sélectionner le passager ${index + 1}`}
                              placeholder="Rechercher ce passager par nom, matricule ou poste..."
                              onSelect={(personnel) =>
                                modifierNomPassager(
                                  index,
                                  `${personnel.prenom} ${personnel.nom}`.trim()
                                )
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Champ>
                </div>

                <div style={{ marginTop: 16 }}>
                  <Champ label="Observations / justification hors horaires, week-end ou jour férié">
                    <textarea
                      value={formulaire.observations}
                      onChange={(e) =>
                        modifierChamp("observations", e.target.value)
                      }
                      rows={3}
                      placeholder="Matériel à transporter, accès difficile, attente sur place..."
                      style={textareaStyle}
                    />
                  </Champ>
                </div>
              </BlocFormulaire>

              </>
              )}
            </div>

            <div style={modalFooterStyle}>
              <button
                type="button"
                onClick={fermerModal}
                disabled={envoi}
                style={{
                  ...boutonSecondaire,
                  opacity: envoi ? 0.6 : 1,
                }}
              >
                Annuler
              </button>

              <button
                type="submit"
                className="btn-spat btn-bleu"
                disabled={envoi || (!missionEnEdition && (!formulaire.zoneMission || !formulaire.typeVehiculeCreation))}
                style={{
                  ...boutonSecondaire,
                  opacity: envoi ? 0.7 : 1,
                  cursor: envoi ? "not-allowed" : "pointer",
                }}
              >
                {envoi ? (
                  <>
                    <RefreshCw size={17} />
                    Transmission...
                  </>
                ) : (
                  <>
                    <Send size={17} />
                    {missionEnEdition ? "Enregistrer les modifications" : "Créer la mission"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
      {historiqueOuvert && (
        <div className="assistant-direction-modal" style={modalOverlayStyle} onMouseDown={() => setHistoriqueOuvert(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="historique-missions-title"
            onMouseDown={(event) => event.stopPropagation()}
            style={{ ...modalContentStyle, maxWidth: 760, padding: 22 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <h2 id="historique-missions-title" style={{ margin: 0, color: "#111827", fontSize: 20 }}>
                  Historique des missions clôturées
                </h2>
                <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: 14, textTransform: "capitalize" }}>
                  {titreCalendrier} · {historiqueDuMois.length} mission{historiqueDuMois.length === 1 ? "" : "s"}
                </p>
              </div>
              <button
                type="button"
                aria-label="Fermer l'historique"
                onClick={() => setHistoriqueOuvert(false)}
                style={{ ...closeButtonStyle, backgroundColor: "#fff", color: "#374151", border: "1px solid #e2e8f0", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ display: "grid", gap: 10, maxHeight: "65vh", overflowY: "auto", marginTop: 18 }}>
              {historiqueDuMois.length === 0 ? (
                <p style={{ margin: 0, padding: 24, textAlign: "center", color: "#64748b", border: "1px dashed #cbd5e1", borderRadius: 10 }}>
                  Aucune mission clôturée pour ce mois.
                </p>
              ) : historiqueDuMois.map((mission) => {
                const missionDeMaDirection = Boolean(
                  directionId
                  && mission.demandeur?.directionId === directionId
                  && mission.zoneMission === "VILLE_TOAMASINA"
                );
                return (
                  <div key={mission.id} style={{ display: "flex", alignItems: "stretch", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setHistoriqueOuvert(false);
                        selectionnerMission(mission);
                      }}
                      style={{ display: "grid", gap: 7, flex: 1, minWidth: 0, padding: 14, textAlign: "left", color: "#334155", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 9, cursor: "pointer" }}
                    >
                      <strong style={{ color: "#111827" }}>
                        TKT-{String(mission.id).padStart(5, "0")} · {formatDateHeure(mission.dateDebut)}
                      </strong>
                      <span>{mission.motif || "Objet non renseigné"} · {libelleTypeVehicule(mission.typeVehiculeSouhaite)}</span>
                      <span style={{ fontSize: 13, color: "#64748b" }}>
                        Retour {formatHeure(mission.dateFin)} · Durée {formaterDuree(mission.dureeUtilisationMinutes)} · Incident {mission.incidentCloture || "aucun"}
                      </span>
                    </button>
                    {missionDeMaDirection && (
                      <button
                        type="button"
                        aria-label={`Supprimer définitivement la mission TKT-${String(mission.id).padStart(5, "0")}`}
                        title="Supprimer définitivement cette mission"
                        disabled={suppressionMissionId === mission.id}
                        onClick={() => supprimerMissionHistorique(mission)}
                        style={{ ...closeButtonStyle, alignSelf: "center", flexShrink: 0, backgroundColor: "#fff", color: "#b91c1c", border: "1px solid #fecaca", cursor: suppressionMissionId === mission.id ? "wait" : "pointer", opacity: suppressionMissionId === mission.id ? 0.6 : 1 }}
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
      {missionSelectionnee && (
        <div className="assistant-direction-modal" style={modalOverlayStyle} onMouseDown={() => setMissionSelectionnee(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="mission-detail-title" onMouseDown={(event) => event.stopPropagation()} style={{ ...modalContentStyle, maxWidth: 700, padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <h2 id="mission-detail-title" style={{ margin: 0, color: "#111827", fontSize: 20 }}>TKT-{String(missionSelectionnee.id).padStart(5, "0")} · {formatHeure(missionSelectionnee.dateDebut)}</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {missionSelectionnee.modeCreation !== "ASSISTANT_DIRECTION" && missionSelectionnee.zoneMission === "VILLE_TOAMASINA" && missionSelectionnee.statut === "EN_ATTENTE" && (
                  <button
                    type="button"
                    aria-label="Modifier la mission"
                    title="Modifier la mission"
                    onClick={() => modifierMission(missionSelectionnee)}
                    style={{ ...closeButtonStyle, backgroundColor: "#fff", color: "#374151", border: "1px solid #e2e8f0", cursor: "pointer" }}
                  >
                    <Pencil size={18} />
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Fermer les détails"
                  title="Fermer"
                  onClick={() => setMissionSelectionnee(null)}
                  style={{ ...closeButtonStyle, backgroundColor: "#fff", color: "#374151", cursor: "pointer", border: "1px solid #e2e8f0" }}
                >
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 18, color: "#334155" }}>
              {missionSelectionnee.zoneMission === "VILLE_TOAMASINA" && (
                <InfoMission
                  label="Durée estimée au départ"
                  value={formaterDureeEstimeeMission(missionSelectionnee)}
                />
              )}
              {missionSelectionnee.modeCreation === "ASSISTANT_DIRECTION" ? (
                <>
                  <InfoMission label="Date" value={new Date(missionSelectionnee.dateDebut).toLocaleDateString("fr-FR")} />
                  <InfoMission label="Moyen matériel" value={libelleTypeVehicule(missionSelectionnee.typeVehiculeSouhaite)} />
                  {missionSelectionnee.vehicule?.immatriculation && <InfoMission label="Immatriculation" value={missionSelectionnee.vehicule.immatriculation} />}
                  <InfoMission label="Demandeur" value={`${missionSelectionnee.demandeurPrenom || ""} ${missionSelectionnee.demandeurNom || ""}`.trim() || "—"} />
                  <InfoMission label="Matricule" value={missionSelectionnee.demandeurMatricule || "—"} />
                  <InfoMission label="Poste / direction" value={missionSelectionnee.demandeurEntite || "—"} />
                  <InfoMission label="Objet de la mission" value={missionSelectionnee.motif || "—"} />
                  <InfoMission label="Heure de départ" value={formatHeure(missionSelectionnee.dateDebut)} />
                  {missionSelectionnee.statut !== "CLOTUREE" && new Date(missionSelectionnee.dateDebut).getTime() <= instantCalendrier.getTime() && (
                    <InfoMission label="Durée réelle écoulée" value={calculerDureeAffichee(missionSelectionnee.dateDebut, dateHeureLocale(instantCalendrier))} />
                  )}
                  {missionSelectionnee.statut === "CLOTUREE" && (
                    <>
                      <InfoMission label="Heure de retour" value={formatHeure(missionSelectionnee.dateFin)} />
                      <InfoMission label="Durée d'utilisation" value={formaterDuree(missionSelectionnee.dureeUtilisationMinutes)} />
                      <InfoMission label="Incident" value={missionSelectionnee.incidentCloture || "—"} />
                    </>
                  )}
                </>
              ) : (
                <>
                  <InfoMission label="Objet" value={missionSelectionnee.motif || "—"} />
                  <InfoMission label="Période" value={`${formatDateHeure(missionSelectionnee.dateDebut)} → ${formatDateHeure(missionSelectionnee.dateFin)}`} />
                  <InfoMission label="Type de véhicule souhaité" value={libelleTypeVehicule(missionSelectionnee.typeVehiculeSouhaite)} />
                  {missionSelectionnee.vehicule?.immatriculation && <InfoMission label="Véhicule affecté" value={missionSelectionnee.vehicule.immatriculation} />}
                  {missionSelectionnee.chauffeur && <InfoMission label="Chauffeur affecté" value={nomChauffeur(missionSelectionnee.chauffeur)} />}
                  <InfoMission label="Trajet" value={`${missionSelectionnee.pointDepart || "—"} → ${missionSelectionnee.destination || "—"}`} />
                  <InfoMission label="Demandeur" value={`${missionSelectionnee.demandeurPrenom || ""} ${missionSelectionnee.demandeurNom || ""}`.trim() || "—"} />
                  <InfoMission label="Matricule" value={missionSelectionnee.demandeurMatricule || "—"} />
                  <InfoMission label="Poste / direction" value={missionSelectionnee.demandeurEntite || "—"} />
                  <InfoMission label="Passagers" value={missionSelectionnee.listePassagers || String(missionSelectionnee.nombrePassagers || "—")} />
                  <InfoMission label="Observations" value={missionSelectionnee.observations || "—"} />
                </>
              )}
            </div>
            <div style={{ marginTop: 12 }}>
              <InfoMission label="Statut" value={libelleStatutMission(missionSelectionnee.statut)} />
              {missionSelectionnee.conducteurMoto && <InfoMission label="Conducteur de la moto" value={missionSelectionnee.conducteurMoto.nomComplet} />}
            </div>
            {missionSelectionnee.zoneMission === "VILLE_TOAMASINA"
              && missionSelectionnee.statut.toUpperCase() !== "CLOTUREE"
              && (!directionId || !missionSelectionnee.demandeur?.directionId || missionSelectionnee.demandeur.directionId === directionId) && (
              <form onSubmit={cloturerMissionAssistant} style={{ marginTop: 18, padding: 16, borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <h3 style={{ margin: "0 0 14px", color: "#1e293b", fontSize: 16 }}>Clôturer la mission</h3>
                {missionRetourEnRetard(missionSelectionnee, instantCalendrier.getTime()) && (
                  <p role="status" style={{ margin: "0 0 14px", color: "#92400e", fontSize: 13 }}>En attente du retour du véhicule.</p>
                )}
                <Champ label="Durée réelle">
                  <input readOnly value={calculerDureeAffichee(missionSelectionnee.dateDebut, dateHeureLocale(instantCalendrier))} style={readOnlyStyle} />
                </Champ>
                <button type="submit" disabled={envoi || (missionSelectionnee.modeCreation === "ASSISTANT_DIRECTION" ? !["PLANIFIEE", "EN_COURS", "EN_ATTENTE", "VALIDEE"].includes(missionSelectionnee.statut.toUpperCase()) : missionSelectionnee.statut.toUpperCase() !== "VALIDEE") || new Date(missionSelectionnee.dateDebut).getTime() > instantCalendrier.getTime()} style={{ ...boutonSecondaire, marginTop: 14, opacity: envoi ? 0.55 : 1 }}>
                  {envoi ? "Clôture..." : "Valider le retour et clôturer"}
                </button>
              </form>
            )}
          </section>
        </div>
      )}

      {carteGpsOuverte && (
        <CarteGpsDirection
          onClose={() => setCarteGpsOuverte(false)}
        />
      )}

      <NotificationsVehiculesPartages />
    </>
  );
}

function InfoMission({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 11, borderRadius: 8, background: "#f8fafc" }}>
      <strong style={{ display: "block", fontSize: 11, color: "#64748b", textTransform: "uppercase" }}>{label}</strong>
      <span style={{ display: "block", marginTop: 4, overflowWrap: "anywhere" }}>{value}</span>
    </div>
  );
}

function libelleStatutMission(statut?: string | null) {
  switch (String(statut || "").toUpperCase()) {
    case "PLANIFIEE": return "Planifiée";
    case "EN_COURS": return "En cours";
    case "CLOTUREE": return "Clôturée";
    case "EN_ATTENTE": return "En attente";
    case "VALIDEE": return "Planifiée";
    default: return statut || "—";
  }
}

function valeurPourDateLocale(valeur?: string | null) {
  if (!valeur) return "";
  const date = new Date(valeur);
  if (Number.isNaN(date.getTime())) return "";
  const decalee = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return decalee.toISOString().slice(0, 16);
}

function dateHeureLocale(date: Date) {
  const decalee = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return decalee.toISOString().slice(0, 16);
}

function estDansHorairesTravail(date: Date) {
  const minutes = date.getHours() * 60 + date.getMinutes();
  return (minutes >= 8 * 60 && minutes < 12 * 60)
    || (minutes >= 14 * 60 && minutes <= 18 * 60);
}

function moisPourInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function listeMoisInclusifs(debut: string, fin: string) {
  if (!debut || !fin || debut > fin) return [];
  const [anneeDebut, moisDebut] = debut.split("-").map(Number);
  const [anneeFin, moisFin] = fin.split("-").map(Number);
  const curseur = new Date(anneeDebut, moisDebut - 1, 1);
  const dernierMois = new Date(anneeFin, moisFin - 1, 1);
  const mois: string[] = [];
  while (curseur <= dernierMois) {
    mois.push(moisPourInput(curseur));
    curseur.setMonth(curseur.getMonth() + 1);
  }
  return mois;
}

function calculerDureeAffichee(dateDebut?: string | null, dateHeureRetour?: string) {
  if (!dateDebut || !dateHeureRetour) return "—";
  const debut = new Date(dateDebut);
  const retour = new Date(dateHeureRetour);
  if (Number.isNaN(debut.getTime()) || Number.isNaN(retour.getTime()) || retour <= debut) return "—";
  return formaterDuree(Math.floor((retour.getTime() - debut.getTime()) / 60_000));
}

function formaterDuree(minutes?: number | null) {
  if (minutes == null || !Number.isFinite(minutes)) return "—";
  const heures = Math.floor(minutes / 60);
  const minutesRestantes = minutes % 60;
  return heures ? `${heures} h ${minutesRestantes} min` : `${minutesRestantes} min`;
}

function obtenirDureeEstimeeMission(mission: Reservation) {
  if (mission.dureeEstimeeMinutes != null && mission.dureeEstimeeMinutes > 0) {
    return mission.dureeEstimeeMinutes;
  }
  if (mission.statut.toUpperCase() !== "CLOTUREE") {
    const debut = new Date(mission.dateDebut).getTime();
    const finPrevue = new Date(mission.dateFin).getTime();
    const duree = Math.floor((finPrevue - debut) / 60_000);
    if (Number.isFinite(duree) && duree > 0) return duree;
  }
  return null;
}

function formaterDureeEstimeeMission(mission: Reservation) {
  const duree = obtenirDureeEstimeeMission(mission);
  return duree == null ? "Non renseignée" : formaterDuree(duree);
}

function fusionnerReservations(...groupes: Reservation[][]): Reservation[] {
  const parId = new Map<number, Reservation>();
  groupes.flat().forEach((mission) => {
    const precedente = parId.get(mission.id);
    parId.set(mission.id, {
      ...(precedente ?? {}),
      ...mission,
      dureeEstimeeMinutes: mission.dureeEstimeeMinutes ?? precedente?.dureeEstimeeMinutes,
      dateFin: mission.dateFin || precedente?.dateFin || mission.dateFin,
    } as Reservation);
  });
  return Array.from(parId.values());
}

function obtenirJoursCalendrier(date: Date) {
  const premier = new Date(date.getFullYear(), date.getMonth(), 1);
  premier.setDate(premier.getDate() - ((premier.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, index) => {
    const jour = new Date(premier);
    jour.setDate(premier.getDate() + index);
    return { date: jour, dansPeriode: jour.getMonth() === date.getMonth() };
  });
}

function decalerDateCalendrier(date: Date, pas: number) {
  const suivante = new Date(date);
  suivante.setDate(1);
  suivante.setMonth(suivante.getMonth() + pas);
  return suivante;
}

function cleJourCalendrier(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function missionDansMoisHistorique(mission: Reservation, mois: Date) {
  const dateReference = mission.dateFin || mission.dateDebut;
  const date = new Date(dateReference);
  return Number.isFinite(date.getTime())
    && date.getFullYear() === mois.getFullYear()
    && date.getMonth() === mois.getMonth();
}

function missionEstDansHistorique(mission: Reservation, maintenant: Date) {
  if (missionAttendRetour(mission)) return false;
  if (mission.statut === "CLOTUREE") return true;
  const dateReference = mission.modeCreation === "ASSISTANT_DIRECTION"
    ? mission.dateDebut
    : mission.dateFin || mission.dateDebut;
  if (!dateReference) return false;
  const date = new Date(dateReference);
  if (Number.isNaN(date.getTime())) return false;
  const jourMission = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const jourActuel = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
  return jourMission < jourActuel;
}

function StatCard({
  titre,
  valeur,
  icone,
}: {
  titre: string;
  valeur: number | string;
  icone: ReactNode;
}) {
  return (
    <div style={statCardStyle}>
      <div style={statCardHeaderStyle}>
        <span style={statCardLabelStyle}>{titre}</span>

        <div style={statCardIconStyle}>{icone}</div>
      </div>

      <div style={statCardValueStyle}>{valeur}</div>
    </div>
  );
}

function BlocFormulaire({
  numero,
  titre,
  icone,
  children,
}: {
  numero: string;
  titre: string;
  icone: ReactNode;
  children: ReactNode;
}) {
  return (
    <section style={blocStyle}>
      <div style={blocHeaderStyle}>
        <div style={numeroStyle}>{numero}</div>

        {icone}

        <h4 style={blocTitleStyle}>{titre}</h4>
      </div>

      <div style={{ padding: 17 }}>{children}</div>
    </section>
  );
}

function Champ({
  label,
  obligatoire = false,
  interactif = false,
  children,
}: {
  label: string;
  obligatoire?: boolean;
  interactif?: boolean;
  children: ReactNode;
}) {
  const titre = (
    <div style={champLabelStyle}>
      {label}
      {obligatoire && <span style={{ color: "#64748b", marginLeft: 3 }}>*</span>}
    </div>
  );
  return interactif
    ? <div style={{ display: "block" }} role="group" aria-label={label}>{titre}{children}</div>
    : <label style={{ display: "block" }}>{titre}{children}</label>;
}

function BadgeEtatOperationnel({ libelle }: { libelle: string }) {
  const style =
    libelle === "Flexible"
      ? {
          bg: "#e0f2fe",
          color: "#075985",
        }
      : libelle === "Urgente"
        ? {
            bg: "#fee2e2",
            color: "#991b1b",
          }
        : {
            bg: "#dcfce7",
            color: "#166534",
          };

  return (
    <span
      style={{
        display: "inline-flex",
        padding: "5px 10px",
        borderRadius: 20,
        backgroundColor: style.bg,
        color: style.color,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {libelle}
    </span>
  );
}

function obtenirTypeDemande(reservation: Reservation): TypeDemande {
  if (
    reservation.typeDemande === "PLANIFIEE" ||
    reservation.typeDemande === "TARDIVE" ||
    reservation.typeDemande === "URGENTE"
  ) {
    return reservation.typeDemande;
  }

  if (reservation.demandeUrgente) {
    return "URGENTE";
  }

  if (reservation.horsDelai24h) {
    return "TARDIVE";
  }

  return "PLANIFIEE";
}

function obtenirStyleTypeDemande(type: TypeDemande) {
  switch (type) {
    case "URGENTE":
      return {
        bg: "#fee2e2",
        text: "#991b1b",
        label: "Urgente",
      };

    case "TARDIVE":
      return {
        bg: "#fef3c7",
        text: "#92400e",
        label: "Tardive",
      };

    default:
      return {
        bg: "#e0f2fe",
        text: "#075985",
        label: "Planifiée",
      };
  }
}

function libelleZoneMission(zone?: ZoneMission | null) {
  if (zone === "VILLE_TOAMASINA") {
    return "Toamasina";
  }

  if (zone === "HORS_TOAMASINA") {
    return "Hors Toamasina";
  }

  return "—";
}

function libelleEtatOperationnel(reservation: Reservation) {
  if (reservation.demandeUrgente) {
    return "Urgente";
  }

  if (
    String(reservation.mobilisabilite || "").toUpperCase() ===
    "FLEXIBLE"
  ) {
    return "Flexible";
  }

  return "Planifiée";
}

function nomChauffeur(chauffeur: ChauffeurResume) {
  const nom = `${chauffeur.prenom || ""} ${chauffeur.nom || ""}`.trim();

  return nom || chauffeur.matricule || `Chauffeur #${chauffeur.id}`;
}

function libelleModeleVehicule(vehicule: VehiculeResume) {
  const valeurs = [
    vehicule.marque,
    vehicule.modele,
    vehicule.modeleType,
    vehicule.categorie,
  ]
    .map((v) => v?.trim())
    .filter(Boolean);

  return [...new Set(valeurs)].join(" ") || "—";
}

function normaliserRecherche(valeur?: string | number | null) {
  return String(valeur ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function convertirDatePourApi(valeur: string) {
  if (!valeur) {
    return valeur;
  }

  if (valeur.length === 16) {
    return `${valeur}:00`;
  }

  return valeur;
}

function formatDateHeure(valeur?: string | null) {
  if (!valeur) {
    return "—";
  }

  const date = new Date(valeur);

  if (Number.isNaN(date.getTime())) {
    return valeur;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatHeure(valeur?: string | null) {
  if (!valeur) return "—";
  const date = new Date(valeur);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normaliserTypeVehiculeSouhaite(valeur?: string | null) {
  const type = String(valeur ?? "").trim().toUpperCase();
  if (type.includes("MOTO")) return "MOTO";
  if (type.includes("VOITURE") || type.includes("BERLINE")) return "VOITURE";
  return "";
}

function libelleTypeVehicule(valeur?: string | null) {
  const type = normaliserTypeVehiculeSouhaite(valeur);
  return type === "MOTO" ? "Moto" : type === "VOITURE" ? "Voiture" : "Non précisé";
}

function causeLisible(message: string) {
  const valeur = message.trim();
  if (!valeur || /^(Erreur HTTP \d+|Conflict|Bad Request|Internal Server Error)$/i.test(valeur)) {
    return "";
  }
  return valeur;
}

async function lireErreur(res: Response) {
  try {
    const contentType = res.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      const data = await res.json();

      if (typeof data === "string") {
        return data;
      }

      return data?.cause || data?.message || data?.detail || data?.erreur || data?.error || "";
    }

    const texte = await res.text();
    return texte;
  } catch {
    return "";
  }
}

const gridDeuxColonnes: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 16,
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
};

const readOnlyStyle: CSSProperties = {
  ...inputStyle,
  backgroundColor: "#f8fafc",
  color: "#374151",
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: 82,
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "15px 14px",
  fontSize: 12,
  color: "#334155",
  backgroundColor: "#ffffff",
  borderBottom: "1px solid #e5e7eb",
  fontWeight: 800,
  whiteSpace: "nowrap",
  letterSpacing: 0.2,
  textTransform: "uppercase",
};

const tdStyle: CSSProperties = {
  padding: "16px 14px",
  fontSize: 13,
  color: "#374151",
  verticalAlign: "middle",
  borderBottom: "1px solid #eef2f7",
};

const emptyStyle: CSSProperties = {
  ...tdStyle,
  padding: 42,
  textAlign: "center",
  color: "#6b7280",
};

const boutonBasePlein: CSSProperties = {
  border: "1px solid transparent",
  borderRadius: 10,
  color: "white",
  padding: "11px 17px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  cursor: "pointer",
  fontWeight: 700,
  boxShadow: "0 8px 18px rgba(15,23,42,0.10)",
  transition: "background-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease",
};

const boutonRouge: CSSProperties = {
  ...boutonBasePlein,
  backgroundColor: "var(--spat-rouge)",
  borderColor: "var(--spat-rouge)",
};

const boutonBleu: CSSProperties = {
  ...boutonBasePlein,
  backgroundColor: "var(--spat-bleu)",
  borderColor: "var(--spat-bleu)",
};

const boutonVert: CSSProperties = {
  ...boutonBasePlein,
  backgroundColor: "var(--spat-vert)",
  borderColor: "var(--spat-vert)",
};

const boutonJaune: CSSProperties = {
  ...boutonBasePlein,
  backgroundColor: "var(--spat-jaune)",
  borderColor: "var(--spat-jaune)",
  color: "#111827",
};

const boutonPrincipal: CSSProperties = {
  ...boutonRouge,
};

const boutonSecondaire: CSSProperties = {
  border: "1px solid #d1d5db",
  backgroundColor: "white",
  color: "#374151",
  borderRadius: 10,
  padding: "10px 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  cursor: "pointer",
  fontWeight: 700,
  transition: "all 150ms ease",
};

const boutonNavigationCalendrier: CSSProperties = {
  width: 38,
  height: 38,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid #e2e8f0",
  borderRadius: 9,
  backgroundColor: "#fff",
  color: "#374151",
  cursor: "pointer",
};

const boutonSecondaireHeader: CSSProperties = {
  ...boutonSecondaire,
};

const rechercheCardStyle: CSSProperties = {
  backgroundColor: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 16,
  marginBottom: 20,
  boxShadow: "0 2px 5px rgba(0,0,0,0.03)",
};

const rechercheTitreStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 10,
  color: "#1e293b",
  fontWeight: 700,
  fontSize: 14,
};

const boutonEffacerRecherche: CSSProperties = {
  position: "absolute",
  right: 7,
  top: "50%",
  transform: "translateY(-50%)",
  width: 30,
  height: 30,
  border: "none",
  borderRadius: 7,
  backgroundColor: "#f3f4f6",
  color: "#6b7280",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const resultatRechercheStyle: CSSProperties = {
  marginTop: 9,
  color: "#6b7280",
  fontSize: 12,
};

const listeBoxStyle: CSSProperties = {
  backgroundColor: "white",
  border: "1px solid #cbd5e1",
  borderRadius: 16,
  overflow: "hidden",
  boxShadow: "0 10px 28px rgba(15,23,42,0.06)",
};

const listeHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: 12,
  marginBottom: 12,
  color: "#111827",
};

const listeTitreStyle: CSSProperties = {
  margin: 0,
  color: "#111827",
  fontSize: 18,
  fontWeight: 700,
};

const listeSousTitreStyle: CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: 13,
};

const tableContainerStyle: CSSProperties = {
  backgroundColor: "white",
  overflowX: "auto",
};

const theadRowStyle: CSSProperties = {
  backgroundColor: "#ffffff",
  borderBottom: "1px solid #e5e7eb",
};

const emptyContentStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 10,
};

const boutonLienBase: CSSProperties = {
  border: "1px solid transparent",
  borderRadius: 9,
  color: "white",
  cursor: "pointer",
  fontWeight: 700,
  padding: "9px 14px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  boxShadow: "0 6px 14px rgba(15,23,42,0.08)",
};

const boutonLienBleu: CSSProperties = {
  ...boutonLienBase,
  backgroundColor: "#2563eb",
};

const boutonLienVert: CSSProperties = {
  ...boutonLienBase,
  backgroundColor: "#16a34a",
};

const texteSecondaireStyle: CSSProperties = {
  marginTop: 4,
  color: "#9ca3af",
  fontSize: 11,
};

const texteGrisStyle: CSSProperties = {
  color: "#9ca3af",
  fontSize: 12,
};

const ticketCellStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const ticketAvatarStyle: CSSProperties = {
  width: 42,
  height: 42,
  minWidth: 42,
  borderRadius: 12,
  background: "linear-gradient(135deg, #111827 0%, #374151 100%)",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  fontWeight: 800,
  boxShadow: "0 8px 16px rgba(17,24,39,0.18)",
};

const missionCellStyle: CSSProperties = {
  display: "grid",
  gap: 4,
};

const iconeTexteStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 7,
};

const modalOverlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  backgroundColor: "rgba(15, 23, 42, 0.58)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const modalContentStyle: CSSProperties = {
  width: "100%",
  maxWidth: 960,
  maxHeight: "92vh",
  overflowY: "auto",
  backgroundColor: "white",
  borderRadius: 12,
  boxShadow: "0 24px 70px rgba(0,0,0,0.28)",
};

const modalHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  padding: "18px 22px",
  borderBottom: "1px solid #e5e7eb",
  position: "sticky",
  top: 0,
  backgroundColor: "white",
  zIndex: 10,
};

const modalIconStyle: CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 9,
  backgroundColor: "#f8fafc",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const modalTitleStyle: CSSProperties = {
  margin: 0,
  color: "#1e293b",
  fontSize: 18,
};

const modalSubtitleStyle: CSSProperties = {
  margin: "4px 0 0",
  color: "#6b7280",
  fontSize: 13,
};

const closeButtonStyle: CSSProperties = {
  width: 36,
  height: 36,
  border: "none",
  backgroundColor: "#f3f4f6",
  borderRadius: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalFooterStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  padding: "16px 22px",
  borderTop: "1px solid #e5e7eb",
  backgroundColor: "#ffffff",
  position: "sticky",
  bottom: 0,
  zIndex: 10,
};

const statCardStyle: CSSProperties = {
  backgroundColor: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 18,
  boxShadow: "0 2px 5px rgba(0,0,0,0.03)",
};

const statCardHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 10,
};

const statCardLabelStyle: CSSProperties = {
  color: "#6b7280",
  fontSize: 13,
  fontWeight: 500,
};

const statCardIconStyle: CSSProperties = {
  width: 36,
  height: 36,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#f9fafb",
  borderRadius: 8,
};

const statCardValueStyle: CSSProperties = {
  color: "#1e293b",
  fontSize: 28,
  lineHeight: 1,
  fontWeight: 700,
};

const blocStyle: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  marginBottom: 18,
  overflow: "visible",
};

const blocHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  backgroundColor: "#f9fafb",
  padding: "13px 16px",
  borderBottom: "1px solid #e5e7eb",
  borderTopLeftRadius: 10,
  borderTopRightRadius: 10,
};

const numeroStyle: CSSProperties = {
  width: 27,
  height: 27,
  borderRadius: "50%",
  backgroundColor: "white",
  border: "1px solid #e5e7eb",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#374151",
  fontWeight: 700,
  fontSize: 12,
};

const blocTitleStyle: CSSProperties = {
  margin: 0,
  color: "#1e293b",
  fontSize: 15,
};

const champLabelStyle: CSSProperties = {
  marginBottom: 6,
  color: "#374151",
  fontSize: 13,
  fontWeight: 600,
};

const warningJauneStyle: CSSProperties = {
  marginTop: 14,
  border: "1px solid #e2e8f0",
  backgroundColor: "#ffffff",
  borderRadius: 9,
  padding: 15,
  color: "#475569",
};

const warningRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
};

const warningTextStyle: CSSProperties = {
  margin: "4px 0 10px",
  fontSize: 12,
  lineHeight: 1.5,
  color: "#64748b",
};

