"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";

import RoleGuard from "@/components/RoleGuard";
import EnTete from "@/components/EnTete";
import { ROLES } from "@/app/lib/roles";
import { toast } from "sonner";

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Download,
  Fuel,
  PlusCircle,
  RefreshCw,
  Search,
  Truck,
  UserRound,
  Wrench,
  XCircle,
} from "lucide-react";

// =========================================================
// TYPES GENERAUX
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

  // -------------------------------------------------------
  // BENEFICIAIRE
  // -------------------------------------------------------

  demandeurNom?: string | null;

  demandeurPrenom?: string | null;

  demandeurMatricule?: string | null;

  demandeurEntite?: string | null;

  demandeurTelephone?: string | null;

  // -------------------------------------------------------
  // MISSION
  // -------------------------------------------------------

  destination?: string | null;

  pointDepart?: string | null;

  nombrePassagers?: number | null;

  listePassagers?: string | null;

  typeVehiculeSouhaite?: string | null;

  besoinChauffeur?: boolean | null;

  observations?: string | null;

  // -------------------------------------------------------
  // REFUS
  // -------------------------------------------------------

  motifRefus?: string | null;

  refusePar?: UtilisateurSimple | null;

  dateRefus?: string | null;

  // -------------------------------------------------------
  // VALIDATION NIVEAU 1
  // -------------------------------------------------------

  validationN1Par?: UtilisateurSimple | null;

  dateValidationN1?: string | null;
}

// =========================================================
// DISPONIBILITES
// =========================================================

interface VehiculeDisponible {
  id: number;

  immatriculation: string;

  categorie?: string | null;

  modeleType?: string | null;

  typeVehicule?: string | null;

  statut: string;
}

interface ChauffeurDisponible {
  id: number;

  matricule?: string | null;

  nom?: string | null;

  prenom?: string | null;

  telephone?: string | null;

  statut: string;
}

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

// =========================================================
// MAINTENANCE
// =========================================================

interface Maintenance {
  id: string;

  vehicule: Vehicule;

  natureIntervention: string;

  statut:
    | "EN_ATTENTE_AVIS_DID"
    | "PLANIFIEE"
    | "EN_COURS"
    | "CLOTUREE"
    | string;

  avisTexte?: string | null;

  avisDate?: string | null;

  avisAuteurEmail?: string | null;

  dateCreation?: string | null;

  dateCloture?: string | null;
}

// =========================================================
// CARBURANT
// =========================================================

interface TransactionCarburant {
  id: string;

  vehicule: Vehicule;

  type:
    | "DOTATION"
    | "CONSOMMATION";

  quantiteLitres: number;

  dateOperation: string;

  justificatif?: string | null;

  agentEmail?: string | null;
}

// =========================================================
// DECISION
// =========================================================

type DecisionReservation =
  | "VALIDEE_N1"
  | "REFUSEE";

// =========================================================
// LABELS
// =========================================================

const statutMaintenanceLabel: Record<string, string> = {
  EN_ATTENTE_AVIS_DID:
    "En attente d'avis DID",

  PLANIFIEE:
    "Planifiée",

  EN_COURS:
    "En cours",

  CLOTUREE:
    "Clôturée",
};

// =========================================================
// PAGE
// =========================================================

export default function ChefServiceLogistiquePage() {
  return (
    <RoleGuard
      role={
        ROLES.CHEF_SERVICE_LOGISTIQUE
      }
    >
      <ChefServiceLogistiqueContent />
    </RoleGuard>
  );
}

// =========================================================
// CONTENU
// =========================================================

function ChefServiceLogistiqueContent() {
  const API =
    process.env.NEXT_PUBLIC_API_URL;

  // =======================================================
  // DONNEES PRINCIPALES
  // =======================================================

  const [
    vehicules,
    setVehicules,
  ] = useState<Vehicule[]>([]);

  const [
    reservations,
    setReservations,
  ] = useState<Reservation[]>([]);

  const [
    maintenances,
    setMaintenances,
  ] = useState<Maintenance[]>([]);

  const [
    transactions,
    setTransactions,
  ] = useState<
    TransactionCarburant[]
  >([]);

  const [
    chargement,
    setChargement,
  ] = useState(true);

  // =======================================================
  // DISPONIBILITES
  // =======================================================

  const [
    disponibilites,
    setDisponibilites,
  ] = useState<
    Record<
      number,
      DisponibiliteReservation
    >
  >({});

  const [
    chargementDisponibilites,
    setChargementDisponibilites,
  ] = useState<
    Record<number, boolean>
  >({});

  const [
    erreursDisponibilites,
    setErreursDisponibilites,
  ] = useState<
    Record<number, string>
  >({});

  // =======================================================
  // AFFECTATION VEHICULE
  // =======================================================

  const [
    vehiculeAffecte,
    setVehiculeAffecte,
  ] = useState<
    Record<number, string>
  >({});

  // =======================================================
  // AFFECTATION CHAUFFEUR
  // =======================================================

  const [
    chauffeurAffecte,
    setChauffeurAffecte,
  ] = useState<
    Record<number, string>
  >({});

  // =======================================================
  // DECISION EN COURS
  // =======================================================

  const [
    decisionsEnCours,
    setDecisionsEnCours,
  ] = useState<
    Record<number, boolean>
  >({});

  // =======================================================
  // REFUS
  // =======================================================

  const [
    reservationARefuser,
    setReservationARefuser,
  ] = useState<
    Reservation | null
  >(null);

  const [
    motifRefusSaisi,
    setMotifRefusSaisi,
  ] = useState("");

  // =======================================================
  // FILTRES RESERVATIONS
  // =======================================================

  const [
    filtreVehicule,
    setFiltreVehicule,
  ] = useState("");

  const [
    filtreStatutReservation,
    setFiltreStatutReservation,
  ] = useState(
    "EN_ATTENTE"
  );

  // =======================================================
  // FILTRE MAINTENANCE
  // =======================================================

  const [
    filtreStatutMaintenance,
    setFiltreStatutMaintenance,
  ] = useState(
    "ACTIVES"
  );

  // =======================================================
  // CARBURANT
  // =======================================================

  const [
    carbVehiculeId,
    setCarbVehiculeId,
  ] = useState("");

  const [
    carbType,
    setCarbType,
  ] = useState<
    | "DOTATION"
    | "CONSOMMATION"
  >(
    "CONSOMMATION"
  );

  const [
    carbQuantite,
    setCarbQuantite,
  ] = useState("");

  const [
    carbDate,
    setCarbDate,
  ] = useState(() =>
    new Date()
      .toISOString()
      .slice(
        0,
        10
      )
  );

  const [
    carbJustificatif,
    setCarbJustificatif,
  ] = useState("");

  const [
    envoiCarburant,
    setEnvoiCarburant,
  ] = useState(false);

  // =======================================================
  // ENTRETIEN
  // =======================================================

  const [
    entVehiculeId,
    setEntVehiculeId,
  ] = useState("");

  const [
    entNature,
    setEntNature,
  ] = useState("");

  const [
    envoiEntretien,
    setEnvoiEntretien,
  ] = useState(false);

  // =======================================================
  // TOKEN
  // =======================================================

  const getToken = () => {
    if (
      typeof window ===
      "undefined"
    ) {
      return null;
    }

    return localStorage.getItem(
      "token"
    );
  };

  // =======================================================
  // CHARGEMENT GENERAL
  // =======================================================

  const charger =
    async () => {
      const token =
        getToken();

      if (!API) {
        toast.error(
          "NEXT_PUBLIC_API_URL n'est pas configurée"
        );

        setChargement(
          false
        );

        return;
      }

      if (!token) {
        toast.error(
          "Session expirée. Veuillez vous reconnecter."
        );

        setChargement(
          false
        );

        return;
      }

      setChargement(
        true
      );

      try {
        const [
          vRes,
          rRes,
          mRes,
          cRes,
        ] =
          await Promise.all(
            [
              fetch(
                `${API}/vehicules`,
                {
                  headers: {
                    Authorization:
                      `Bearer ${token}`,

                    Accept:
                      "application/json",
                  },
                }
              ),

              fetch(
                `${API}/reservations`,
                {
                  headers: {
                    Authorization:
                      `Bearer ${token}`,

                    Accept:
                      "application/json",
                  },
                }
              ),

              fetch(
                `${API}/maintenances`,
                {
                  headers: {
                    Authorization:
                      `Bearer ${token}`,

                    Accept:
                      "application/json",
                  },
                }
              ),

              fetch(
                `${API}/carburant`,
                {
                  headers: {
                    Authorization:
                      `Bearer ${token}`,

                    Accept:
                      "application/json",
                  },
                }
              ),
            ]
          );

        const erreurs =
          [
            [
              "véhicules",
              vRes,
            ],

            [
              "réservations",
              rRes,
            ],

            [
              "maintenances",
              mRes,
            ],

            [
              "carburant",
              cRes,
            ],
          ].filter(
            (
              [, res]
            ) =>
              !(
                res as Response
              ).ok
          ) as [
            string,
            Response,
          ][];

        if (
          erreurs.length >
          0
        ) {
          const detail =
            erreurs
              .map(
                (
                  [
                    nom,
                    res,
                  ]
                ) =>
                  `${nom}: ${res.status}`
              )
              .join(
                " | "
              );

          throw new Error(
            detail
          );
        }

        const vehiculesData =
          await vRes.json();

        const reservationsData =
          await rRes.json();

        const maintenancesData =
          await mRes.json();

        const carburantData =
          await cRes.json();

        setVehicules(
          Array.isArray(
            vehiculesData
          )
            ? vehiculesData
            : []
        );

        setReservations(
          Array.isArray(
            reservationsData
          )
            ? reservationsData
            : []
        );

        setMaintenances(
          Array.isArray(
            maintenancesData
          )
            ? maintenancesData
            : []
        );

        setTransactions(
          Array.isArray(
            carburantData
          )
            ? carburantData
            : []
        );
      } catch (
        error
      ) {
        console.error(
          "Erreur chargement Chef Service Logistique :",
          error
        );

        toast.error(
          "Impossible de charger les données du Service Logistique"
        );
      } finally {
        setChargement(
          false
        );
      }
    };

  // =======================================================
  // DISPONIBILITES D'UNE DEMANDE
  // =======================================================

  const chargerDisponibilites =
    async (
      reservationId: number
    ) => {
      if (!API) {
        return;
      }

      const token =
        getToken();

      if (!token) {
        return;
      }

      setChargementDisponibilites(
        (
          ancien
        ) => ({
          ...ancien,

          [reservationId]:
            true,
        })
      );

      setErreursDisponibilites(
        (
          ancien
        ) => {
          const copie = {
            ...ancien,
          };

          delete copie[
            reservationId
          ];

          return copie;
        }
      );

      try {
        const res =
          await fetch(
            `${API}/reservations/${reservationId}/disponibilites`,
            {
              method:
                "GET",

              headers: {
                Authorization:
                  `Bearer ${token}`,

                Accept:
                  "application/json",
              },

              cache:
                "no-store",
            }
          );

        if (!res.ok) {
          const message =
            await res
              .text()
              .catch(
                () => ""
              );

          throw new Error(
            message ||
              "Impossible de vérifier les disponibilités"
          );
        }

        const data =
          (await res.json()) as
            DisponibiliteReservation;

        setDisponibilites(
          (
            ancien
          ) => ({
            ...ancien,

            [reservationId]:
              data,
          })
        );

        // -------------------------------------------------
        // REVALIDER LE VEHICULE SELECTIONNE
        // -------------------------------------------------

        setVehiculeAffecte(
          (
            ancien
          ) => {
            const selection =
              ancien[
                reservationId
              ];

            if (
              !selection
            ) {
              return ancien;
            }

            const ids =
              [
                ...(
                  data.vehiculesCorrespondants ||
                  []
                ),

                ...(
                  data.suggestionsVehicules ||
                  []
                ),
              ].map(
                (
                  v
                ) =>
                  String(
                    v.id
                  )
              );

            if (
              ids.includes(
                selection
              )
            ) {
              return ancien;
            }

            const copie = {
              ...ancien,
            };

            delete copie[
              reservationId
            ];

            return copie;
          }
        );

        // -------------------------------------------------
        // REVALIDER LE CHAUFFEUR SELECTIONNE
        // -------------------------------------------------

        setChauffeurAffecte(
          (
            ancien
          ) => {
            const selection =
              ancien[
                reservationId
              ];

            if (
              !selection
            ) {
              return ancien;
            }

            const ids =
              (
                data.chauffeursDisponibles ||
                []
              ).map(
                (
                  c
                ) =>
                  String(
                    c.id
                  )
              );

            if (
              ids.includes(
                selection
              )
            ) {
              return ancien;
            }

            const copie = {
              ...ancien,
            };

            delete copie[
              reservationId
            ];

            return copie;
          }
        );
      } catch (
        error
      ) {
        console.error(
          `Erreur disponibilités réservation ${reservationId} :`,
          error
        );

        const message =
          error instanceof
          Error
            ? error.message
            : "Impossible de vérifier les disponibilités";

        setErreursDisponibilites(
          (
            ancien
          ) => ({
            ...ancien,

            [reservationId]:
              message,
          })
        );
      } finally {
        setChargementDisponibilites(
          (
            ancien
          ) => ({
            ...ancien,

            [reservationId]:
              false,
          })
        );
      }
    };

  // =======================================================
  // CHARGEMENT INITIAL
  // =======================================================

  useEffect(() => {
    charger();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =======================================================
  // DISPONIBILITES AUTOMATIQUES
  // =======================================================

  useEffect(() => {
    const demandes =
      reservations.filter(
        (
          r
        ) =>
          r.statut ===
          "EN_ATTENTE"
      );

    demandes.forEach(
      (
        reservation
      ) => {
        chargerDisponibilites(
          reservation.id
        );
      }
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservations]);

  // =======================================================
  // OUVRIR REFUS
  // =======================================================

  const ouvrirRefus = (
    reservation: Reservation
  ) => {
    setReservationARefuser(
      reservation
    );

    setMotifRefusSaisi(
      ""
    );
  };

  // =======================================================
  // FERMER REFUS
  // =======================================================

  const fermerRefus =
    () => {
      setReservationARefuser(
        null
      );

      setMotifRefusSaisi(
        ""
      );
    };

  // =======================================================
  // DECISION RESERVATION
  // =======================================================

  const decisionReservation =
    async (
      reservation: Reservation,

      statut:
        DecisionReservation,

      motifRefus?: string
    ) => {
      if (!API) {
        return;
      }

      const token =
        getToken();

      if (!token) {
        toast.error(
          "Session expirée. Veuillez vous reconnecter."
        );

        return;
      }

      // ===================================================
      // VALIDATION NIVEAU 1
      // ===================================================

      let vehiculeId:
        number | null =
        null;

      let chauffeurId:
        number | null =
        null;

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
            "Validation impossible : une demande à moins de 24h doit contenir un motif d'urgence."
          );

          return;
        }

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

        const vehiculeSelectionne =
          vehiculeAffecte[
            reservation.id
          ];

        if (
          !vehiculeSelectionne
        ) {
          toast.error(
            "Veuillez sélectionner un véhicule."
          );

          return;
        }

        const vehiculesDisponibles =
          [
            ...(
              dispo.vehiculesCorrespondants ||
              []
            ),

            ...(
              dispo.suggestionsVehicules ||
              []
            ),
          ];

        const vehiculeValide =
          vehiculesDisponibles.some(
            (
              v
            ) =>
              String(
                v.id
              ) ===
              vehiculeSelectionne
          );

        if (
          !vehiculeValide
        ) {
          toast.error(
            "Ce véhicule n'est plus disponible. Les disponibilités vont être actualisées."
          );

          await chargerDisponibilites(
            reservation.id
          );

          return;
        }

        vehiculeId =
          Number(
            vehiculeSelectionne
          );

        // -------------------------------------------------
        // CHAUFFEUR
        // -------------------------------------------------

        if (
          Boolean(
            reservation.besoinChauffeur
          )
        ) {
          if (
            !dispo.chauffeurDisponible
          ) {
            toast.error(
              "Aucun chauffeur n'est disponible pour cette période."
            );

            return;
          }

          const chauffeurSelectionne =
            chauffeurAffecte[
              reservation.id
            ];

          if (
            !chauffeurSelectionne
          ) {
            toast.error(
              "Veuillez sélectionner un chauffeur."
            );

            return;
          }

          const chauffeurValide =
            (
              dispo.chauffeursDisponibles ||
              []
            ).some(
              (
                c
              ) =>
                String(
                  c.id
                ) ===
                chauffeurSelectionne
            );

          if (
            !chauffeurValide
          ) {
            toast.error(
              "Ce chauffeur n'est plus disponible. Les disponibilités vont être actualisées."
            );

            await chargerDisponibilites(
              reservation.id
            );

            return;
          }

          chauffeurId =
            Number(
              chauffeurSelectionne
            );
        }
      }

      // ===================================================
      // REFUS
      // ===================================================

      if (
        statut ===
        "REFUSEE"
      ) {
        if (
          !motifRefus?.trim()
        ) {
          toast.error(
            "Le motif du refus est obligatoire."
          );

          return;
        }
      }

      // ===================================================
      // APPEL API
      // ===================================================

      setDecisionsEnCours(
        (
          ancien
        ) => ({
          ...ancien,

          [reservation.id]:
            true,
        })
      );

      try {
        const res =
          await fetch(
            `${API}/reservations/${reservation.id}/decision`,
            {
              method:
                "PUT",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`,

                Accept:
                  "application/json",
              },

              body:
                JSON.stringify(
                  {
                    statut,

                    vehiculeId:
                      statut ===
                      "VALIDEE_N1"
                        ? vehiculeId
                        : null,

                    chauffeurId:
                      statut ===
                      "VALIDEE_N1"
                        ? chauffeurId
                        : null,

                    motifRefus:
                      statut ===
                      "REFUSEE"
                        ? motifRefus?.trim()
                        : null,
                  }
                ),
            }
          );

        if (!res.ok) {
          const message =
            await res
              .text()
              .catch(
                () => ""
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

        if (
          statut ===
          "VALIDEE_N1"
        ) {
          toast.success(
            "Validation niveau 1 enregistrée"
          );
        } else {
          toast.success(
            "Demande refusée"
          );
        }

        // -------------------------------------------------
        // NETTOYAGE VEHICULE
        // -------------------------------------------------

        setVehiculeAffecte(
          (
            ancien
          ) => {
            const copie = {
              ...ancien,
            };

            delete copie[
              reservation.id
            ];

            return copie;
          }
        );

        // -------------------------------------------------
        // NETTOYAGE CHAUFFEUR
        // -------------------------------------------------

        setChauffeurAffecte(
          (
            ancien
          ) => {
            const copie = {
              ...ancien,
            };

            delete copie[
              reservation.id
            ];

            return copie;
          }
        );

        // -------------------------------------------------
        // NETTOYAGE DISPONIBILITE
        // -------------------------------------------------

        setDisponibilites(
          (
            ancien
          ) => {
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
      } catch (
        error
      ) {
        console.error(
          "Erreur décision réservation :",
          error
        );

        toast.error(
          error instanceof
          Error
            ? error.message
            : "La décision n'a pas pu être enregistrée"
        );
      } finally {
        setDecisionsEnCours(
          (
            ancien
          ) => ({
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

  const confirmerRefus =
    async () => {
      if (
        !reservationARefuser
      ) {
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
  // MAINTENANCE
  // =======================================================

  const changerStatutMaintenance =
    async (
      maintenance:
        Maintenance,

      statut:
        string
    ) => {
      if (!API) {
        return;
      }

      if (
        statut ===
          "PLANIFIEE" &&
        !maintenance.avisTexte?.trim()
      ) {
        toast.error(
          "Planification impossible : l'avis du mécanicien diagnostiqueur DID est obligatoire."
        );

        return;
      }

      const token =
        getToken();

      if (!token) {
        return;
      }

      try {
        const res =
          await fetch(
            `${API}/maintenances/${maintenance.id}/statut`,
            {
              method:
                "PUT",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`,

                Accept:
                  "application/json",
              },

              body:
                JSON.stringify(
                  {
                    statut,
                  }
                ),
            }
          );

        if (!res.ok) {
          const message =
            await res
              .text()
              .catch(
                () => ""
              );

          throw new Error(
            `${res.status} ${message}`.trim()
          );
        }

        const libelle =
          statut ===
          "PLANIFIEE"
            ? "Intervention planifiée"
            : statut ===
                "EN_COURS"
              ? "Intervention démarrée"
              : statut ===
                  "CLOTUREE"
                ? "Intervention clôturée"
                : "Statut mis à jour";

        toast.success(
          libelle
        );

        await charger();
      } catch (
        error
      ) {
        console.error(
          "Erreur mise à jour maintenance :",
          error
        );

        toast.error(
          "Le statut de l'entretien n'a pas pu être modifié"
        );
      }
    };

  // =======================================================
  // CARBURANT
  // =======================================================

  const soumettreCarburant =
    async (
      e:
        FormEvent
    ) => {
      e.preventDefault();

      if (!API) {
        return;
      }

      if (
        !carbVehiculeId ||
        !carbQuantite ||
        !carbDate
      ) {
        toast.error(
          "Véhicule, quantité et date sont obligatoires"
        );

        return;
      }

      const quantite =
        Number(
          carbQuantite
        );

      if (
        !Number.isFinite(
          quantite
        ) ||
        quantite <=
          0
      ) {
        toast.error(
          "La quantité doit être supérieure à 0 litre"
        );

        return;
      }

      const token =
        getToken();

      if (!token) {
        return;
      }

      setEnvoiCarburant(
        true
      );

      try {
        const res =
          await fetch(
            `${API}/carburant`,
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
                JSON.stringify(
                  {
                    vehiculeId:
                      Number(
                        carbVehiculeId
                      ),

                    type:
                      carbType,

                    quantiteLitres:
                      quantite,

                    dateOperation:
                      carbDate,

                    justificatif:
                      carbJustificatif.trim() ||
                      null,
                  }
                ),
            }
          );

        if (!res.ok) {
          const message =
            await res
              .text()
              .catch(
                () => ""
              );

          throw new Error(
            `${res.status} ${message}`.trim()
          );
        }

        toast.success(
          carbType ===
          "DOTATION"
            ? "Dotation enregistrée"
            : "Consommation enregistrée"
        );

        setCarbVehiculeId(
          ""
        );

        setCarbQuantite(
          ""
        );

        setCarbJustificatif(
          ""
        );

        await charger();
      } catch (
        error
      ) {
        console.error(
          "Erreur carburant :",
          error
        );

        toast.error(
          "L'enregistrement carburant a échoué"
        );
      } finally {
        setEnvoiCarburant(
          false
        );
      }
    };

  // =======================================================
  // CREER ENTRETIEN
  // =======================================================

  const soumettreEntretien =
    async (
      e:
        FormEvent
    ) => {
      e.preventDefault();

      if (!API) {
        return;
      }

      if (
        !entVehiculeId ||
        !entNature.trim()
      ) {
        toast.error(
          "Véhicule et nature de l'intervention sont obligatoires"
        );

        return;
      }

      const token =
        getToken();

      if (!token) {
        return;
      }

      setEnvoiEntretien(
        true
      );

      try {
        const res =
          await fetch(
            `${API}/maintenances`,
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
                JSON.stringify(
                  {
                    vehicule: {
                      id:
                        Number(
                          entVehiculeId
                        ),
                    },

                    natureIntervention:
                      entNature.trim(),
                  }
                ),
            }
          );

        if (!res.ok) {
          const message =
            await res
              .text()
              .catch(
                () => ""
              );

          throw new Error(
            `${res.status} ${message}`.trim()
          );
        }

        toast.success(
          "Demande d'entretien créée et transmise pour avis DID"
        );

        setEntVehiculeId(
          ""
        );

        setEntNature(
          ""
        );

        await charger();
      } catch (
        error
      ) {
        console.error(
          "Erreur création entretien :",
          error
        );

        toast.error(
          "La demande d'entretien n'a pas pu être créée"
        );
      } finally {
        setEnvoiEntretien(
          false
        );
      }
    };

  // =======================================================
  // EXPORT CSV
  // =======================================================

  const exporterCsv = (
    nom:
      string,

    lignes:
      string[][]
  ) => {
    const contenu =
      lignes
        .map(
          (
            ligne
          ) =>
            ligne
              .map(
                (
                  cellule
                ) =>
                  `"${String(
                    cellule
                  ).replace(
                    /"/g,
                    '""'
                  )}"`
              )
              .join(
                ";"
              )
        )
        .join(
          "\n"
        );

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
      `${nom}_${new Date()
        .toISOString()
        .slice(
          0,
          10
        )}.csv`;

    lien.click();

    URL.revokeObjectURL(
      url
    );
  };

  // =======================================================
  // FILTRE RESERVATIONS
  // =======================================================

  const reservationsFiltrees =
    reservations.filter(
      (
        r
      ) => {
        const statutOk =
          filtreStatutReservation ===
            "TOUS" ||
          r.statut ===
            filtreStatutReservation;

        const recherche =
          filtreVehicule
            .trim()
            .toLowerCase();

        const rechercheOk =
          !recherche ||
          r.vehicule
            ?.immatriculation
            ?.toLowerCase()
            .includes(
              recherche
            ) ||
          nomBeneficiaire(
            r
          )
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
            "Refusée par",
            "Date refus",
          ],

          ...reservationsFiltrees.map(
            (
              r
            ) => [
              String(
                r.id
              ),

              nomBeneficiaire(
                r
              ),

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

              nomUtilisateur(
                r.refusePar
              ),

              r.dateRefus
                ? formaterDate(
                    r.dateRefus
                  )
                : "",
            ]
          ),
        ]
      );

      toast.success(
        "Export des demandes généré"
      );
    };

  // =======================================================
  // EXPORT CARBURANT
  // =======================================================

  const exporterCarburant =
    () => {
      exporterCsv(
        "carburant",
        [
          [
            "Véhicule",
            "Type",
            "Quantité (L)",
            "Date",
            "Justificatif",
          ],

          ...transactions.map(
            (
              t
            ) => [
              t.vehicule
                ?.immatriculation ||
                "—",

              t.type,

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
        "Export carburant généré"
      );
    };

  // =======================================================
  // KPI
  // =======================================================

  const disponibles =
    vehicules.filter(
      (
        v
      ) =>
        v.statut ===
        "DISPONIBLE"
    ).length;

  const tauxDisponibilite =
    vehicules.length >
    0
      ? Math.round(
          (
            disponibles /
            vehicules.length
          ) *
            100
        )
      : 0;

  const reservationsEnAttente =
    reservations.filter(
      (
        r
      ) =>
        r.statut ===
        "EN_ATTENTE"
    );

  const reservationsUrgentes =
    reservationsEnAttente.filter(
      (
        r
      ) =>
        r.demandeUrgente
    ).length;

  const maintenancesActives =
    maintenances.filter(
      (
        m
      ) =>
        m.statut !==
        "CLOTUREE"
    );

  const maintenancesEnAttenteAvis =
    maintenances.filter(
      (
        m
      ) =>
        m.statut ===
        "EN_ATTENTE_AVIS_DID"
    );

  const maintenancesAvisRecus =
    maintenancesEnAttenteAvis.filter(
      (
        m
      ) =>
        Boolean(
          m.avisTexte?.trim()
        )
    );

  const moisCourant =
    new Date()
      .toISOString()
      .slice(
        0,
        7
      );

  const consommationsMois =
    transactions.filter(
      (
        t
      ) =>
        t.type ===
          "CONSOMMATION" &&
        String(
          t.dateOperation
        ).slice(
          0,
          7
        ) ===
          moisCourant
    );

  const totalConsommationMois =
    consommationsMois.reduce(
      (
        total,
        t
      ) =>
        total +
        Number(
          t.quantiteLitres ||
            0
        ),
      0
    );

  const consommationParVehicule =
    Object.values(
      consommationsMois.reduce<
        Record<
          number,
          {
            vehicule:
              Vehicule;

            total:
              number;
          }
        >
      >(
        (
          acc,
          t
        ) => {
          const id =
            t.vehicule.id;

          if (
            !acc[
              id
            ]
          ) {
            acc[
              id
            ] = {
              vehicule:
                t.vehicule,

              total:
                0,
            };
          }

          acc[
            id
          ].total +=
            Number(
              t.quantiteLitres ||
                0
            );

          return acc;
        },
        {}
      )
    ).sort(
      (
        a,
        b
      ) =>
        b.total -
        a.total
    );

  // =======================================================
  // FILTRE MAINTENANCES
  // =======================================================

  const maintenancesFiltrees =
    maintenances.filter(
      (
        m
      ) => {
        if (
          filtreStatutMaintenance ===
          "TOUS"
        ) {
          return true;
        }

        if (
          filtreStatutMaintenance ===
          "ACTIVES"
        ) {
          return (
            m.statut !==
            "CLOTUREE"
          );
        }

        return (
          m.statut ===
          filtreStatutMaintenance
        );
      }
    );

  // =======================================================
  // CHARGEMENT
  // =======================================================

  if (
    chargement
  ) {
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
            padding:
              32,

            textAlign:
              "center",

            color:
              "#6b7280",
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

      <div
        style={{
          padding:
            32,
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
                  margin:
                    0,

                  fontSize:
                    22,

                  color:
                    "#1e293b",
                }}
              >
                Chef du Service Logistique — Gestion de la flotte
              </h2>

              <p
                style={{
                  margin:
                    "6px 0 0",

                  fontSize:
                    13,

                  color:
                    "#64748b",
                }}
              >
                Validation niveau 1, affectation des véhicules et chauffeurs, suivi opérationnel de la flotte.
              </p>
            </div>

            <button
              type="button"
              onClick={
                charger
              }
              style={
                boutonSecondaire
              }
            >
              <RefreshCw
                size={
                  15
                }
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
                  size={
                    18
                  }
                />
              }
              label="Disponibilité actuelle"
              valeur={`${tauxDisponibilite}%`}
              sousTexte={`${disponibles} / ${vehicules.length} véhicules actuellement disponibles`}
            />

            <CarteKpi
              icone={
                <ClipboardList
                  size={
                    18
                  }
                />
              }
              label="Demandes à valider"
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
                  size={
                    18
                  }
                />
              }
              label="Entretiens en cours"
              valeur={String(
                maintenancesActives.length
              )}
              sousTexte={`${maintenancesAvisRecus.length} avis DID reçu${
                maintenancesAvisRecus.length >
                1
                  ? "s"
                  : ""
              }`}
            />

            <CarteKpi
              icone={
                <Fuel
                  size={
                    18
                  }
                />
              }
              label="Consommation du mois"
              valeur={`${formatNombre(
                totalConsommationMois
              )} L`}
              sousTexte="Consommations uniquement"
            />
          </div>

          {/* =================================================
              DEMANDES VEHICULES
          ================================================= */}

          <div
            style={
              sectionHeaderStyle
            }
          >
            <SectionTitre
              titre="Demandes de véhicule — validation niveau 1"
            />

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
                size={
                  15
                }
              />

              Exporter CSV
            </button>
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
                  "1 1 260px",
              }}
            >
              <Search
                size={
                  15
                }
                style={{
                  position:
                    "absolute",

                  left:
                    10,

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
                onChange={(
                  e
                ) =>
                  setFiltreVehicule(
                    e.target.value
                  )
                }
                placeholder="Immatriculation, bénéficiaire, matricule, type ou destination..."
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
              onChange={(
                e
              ) =>
                setFiltreStatutReservation(
                  e.target.value
                )
              }
              style={{
                ...inputStyle,

                width:
                  210,
              }}
            >
              <option value="EN_ATTENTE">
                En attente
              </option>

              <option value="VALIDEE_N1">
                Validées niveau 1
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

                gap:
                  12,

                marginBottom:
                  32,
              }}
            >
              {reservationsFiltrees.map(
                (
                  r
                ) => {
                  const dispo =
                    disponibilites[
                      r.id
                    ];

                  const verificationEnCours =
                    Boolean(
                      chargementDisponibilites[
                        r.id
                      ]
                    );

                  const erreurDisponibilite =
                    erreursDisponibilites[
                      r.id
                    ];

                  const decisionEnCours =
                    Boolean(
                      decisionsEnCours[
                        r.id
                      ]
                    );

                  const vehiculesCorrespondants =
                    dispo
                      ?.vehiculesCorrespondants ||
                    [];

                  const suggestions =
                    dispo
                      ?.suggestionsVehicules ||
                    [];

                  const chauffeursDisponibles =
                    dispo
                      ?.chauffeursDisponibles ||
                    [];

                  const aucunVehicule =
                    Boolean(
                      dispo &&
                        vehiculesCorrespondants.length ===
                          0 &&
                        suggestions.length ===
                          0
                    );

                  const chauffeurRequis =
                    Boolean(
                      r.besoinChauffeur
                    );

                  const aucunChauffeur =
                    Boolean(
                      chauffeurRequis &&
                        dispo &&
                        chauffeursDisponibles.length ===
                          0
                    );

                  const urgenceBloquante =
                    Boolean(
                      r.demandeUrgente &&
                        !r.motifUrgence?.trim()
                    );

                  const validationBloquee =
                    verificationEnCours ||
                    decisionEnCours ||
                    !dispo ||
                    Boolean(
                      erreurDisponibilite
                    ) ||
                    aucunVehicule ||
                    aucunChauffeur ||
                    urgenceBloquante ||
                    !vehiculeAffecte[
                      r.id
                    ] ||
                    (
                      chauffeurRequis &&
                      !chauffeurAffecte[
                        r.id
                      ]
                    );

                  return (
                    <div
                      key={
                        r.id
                      }
                      style={{
                        ...cardStyle,

                        borderColor:
                          r.demandeUrgente
                            ? "#fca5a5"
                            : "#e5e7eb",
                      }}
                    >
                      {/* =====================================
                          ENTETE
                      ===================================== */}

                      <div
                        style={{
                          display:
                            "flex",

                          justifyContent:
                            "space-between",

                          gap:
                            16,

                          alignItems:
                            "flex-start",

                          flexWrap:
                            "wrap",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              display:
                                "flex",

                              gap:
                                8,

                              alignItems:
                                "center",

                              flexWrap:
                                "wrap",
                            }}
                          >
                            <strong
                              style={{
                                color:
                                  "#111827",
                              }}
                            >
                              {`DMD-${String(
                                r.id
                              ).padStart(
                                5,
                                "0"
                              )}`}
                            </strong>

                            <BadgeStatut
                              statut={
                                r.statut
                              }
                            />

                            {r.demandeUrgente && (
                              <span
                                style={
                                  urgentBadgeStyle
                                }
                              >
                                <AlertTriangle
                                  size={
                                    13
                                  }
                                />

                                Moins de 24h
                              </span>
                            )}
                          </div>

                          <div
                            style={{
                              fontSize:
                                13,

                              color:
                                "#64748b",

                              marginTop:
                                6,
                            }}
                          >
                            Bénéficiaire :{" "}
                            <strong
                              style={{
                                color:
                                  "#374151",
                              }}
                            >
                              {nomBeneficiaire(
                                r
                              )}
                            </strong>
                          </div>

                          {r.demandeurMatricule && (
                            <div
                              style={{
                                fontSize:
                                  12,

                                color:
                                  "#94a3b8",

                                marginTop:
                                  3,
                              }}
                            >
                              Matricule :{" "}
                              {
                                r.demandeurMatricule
                              }
                            </div>
                          )}
                        </div>

                        <span
                          style={{
                            fontSize:
                              12,

                            color:
                              "#9ca3af",
                          }}
                        >
                          Créée le{" "}
                          {formaterDate(
                            r.dateCreation
                          )}
                        </span>
                      </div>

                      {/* =====================================
                          BENEFICIAIRE
                      ===================================== */}

                      <SousTitreCarte
                        texte="Bénéficiaire"
                      />

                      <div
                        style={
                          infoGridStyle
                        }
                      >
                        <Info
                          label="Nom"
                          value={
                            nomBeneficiaire(
                              r
                            )
                          }
                        />

                        <Info
                          label="Matricule"
                          value={
                            r.demandeurMatricule ||
                            "—"
                          }
                        />

                        <Info
                          label="Entité"
                          value={
                            r.demandeurEntite ||
                            "—"
                          }
                        />

                        <Info
                          label="Téléphone"
                          value={
                            r.demandeurTelephone ||
                            "—"
                          }
                        />
                      </div>

                      {/* =====================================
                          MISSION
                      ===================================== */}

                      <SousTitreCarte
                        texte="Mission"
                      />

                      <div
                        style={
                          infoGridStyle
                        }
                      >
                        <Info
                          label="Objet de la mission"
                          value={
                            r.motif ||
                            "—"
                          }
                        />

                        <Info
                          label="Période"
                          value={`${formaterDate(
                            r.dateDebut
                          )} → ${formaterDate(
                            r.dateFin
                          )}`}
                        />

                        <Info
                          label="Point de départ"
                          value={
                            r.pointDepart ||
                            "—"
                          }
                        />

                        <Info
                          label="Destination"
                          value={
                            r.destination ||
                            "—"
                          }
                        />
                      </div>

                      {/* =====================================
                          TRANSPORT
                      ===================================== */}

                      <SousTitreCarte
                        texte="Besoin de transport"
                      />

                      <div
                        style={
                          infoGridStyle
                        }
                      >
                        <Info
                          label="Nombre de passagers"
                          value={
                            r.nombrePassagers !=
                            null
                              ? String(
                                  r.nombrePassagers
                                )
                              : "—"
                          }
                        />

                        <Info
                          label="Type de véhicule souhaité"
                          value={
                            formaterTypeVehicule(
                              r.typeVehiculeSouhaite
                            )
                          }
                        />

                        <Info
                          label="Chauffeur demandé"
                          value={
                            r.besoinChauffeur ===
                            true
                              ? "Oui"
                              : r.besoinChauffeur ===
                                  false
                                ? "Non"
                                : "—"
                          }
                        />

                        <Info
                          label="Véhicule affecté"
                          value={
                            r.vehicule
                              ?.immatriculation ||
                            "Non affecté"
                          }
                        />

                        <Info
                          label="Chauffeur affecté"
                          value={
                            r.chauffeur
                              ? nomChauffeur(
                                  r.chauffeur
                                )
                              : "Non affecté"
                          }
                        />
                      </div>

                      {/* PASSAGERS */}

                      {r.listePassagers?.trim() && (
                        <div
                          style={
                            detailBoxStyle
                          }
                        >
                          <div
                            style={
                              detailLabelStyle
                            }
                          >
                            Liste des passagers
                          </div>

                          <div
                            style={
                              detailValueStyle
                            }
                          >
                            {
                              r.listePassagers
                            }
                          </div>
                        </div>
                      )}

                      {/* OBSERVATIONS */}

                      {r.observations?.trim() && (
                        <div
                          style={
                            detailBoxStyle
                          }
                        >
                          <div
                            style={
                              detailLabelStyle
                            }
                          >
                            Observations
                          </div>

                          <div
                            style={
                              detailValueStyle
                            }
                          >
                            {
                              r.observations
                            }
                          </div>
                        </div>
                      )}

                      {/* URGENCE */}

                      {r.demandeUrgente && (
                        <div
                          style={
                            warningBoxStyle
                          }
                        >
                          <strong>
                            Motif d&apos;urgence :
                          </strong>{" "}

                          {r.motifUrgence?.trim() ||
                            "Non renseigné — validation bloquée"}
                        </div>
                      )}

                      {/* =====================================
                          TRAITEMENT EN ATTENTE
                      ===================================== */}

                      {r.statut ===
                        "EN_ATTENTE" && (
                        <div
                          style={{
                            marginTop:
                              16,

                            paddingTop:
                              15,

                            borderTop:
                              "1px solid #e5e7eb",
                          }}
                        >
                          <div
                            style={{
                              display:
                                "flex",

                              alignItems:
                                "center",

                              justifyContent:
                                "space-between",

                              gap:
                                10,

                              flexWrap:
                                "wrap",

                              marginBottom:
                                10,
                            }}
                          >
                            <div
                              style={{
                                fontSize:
                                  13,

                                fontWeight:
                                  700,

                                color:
                                  "#334155",
                              }}
                            >
                              Affectation du véhicule et du chauffeur
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                chargerDisponibilites(
                                  r.id
                                )
                              }
                              disabled={
                                verificationEnCours ||
                                decisionEnCours
                              }
                              style={{
                                ...boutonSecondaire,

                                padding:
                                  "6px 9px",

                                fontSize:
                                  12,

                                opacity:
                                  verificationEnCours ||
                                  decisionEnCours
                                    ? 0.6
                                    : 1,
                              }}
                            >
                              <RefreshCw
                                size={
                                  13
                                }
                              />

                              Re-vérifier
                            </button>
                          </div>

                          {/* CHARGEMENT DISPONIBILITES */}

                          {verificationEnCours && (
                            <div
                              style={
                                infoBoxBleuStyle
                              }
                            >
                              <strong>
                                Vérification automatique en cours...
                              </strong>

                              <div
                                style={{
                                  marginTop:
                                    4,
                                }}
                              >
                                Le système contrôle les réservations et affectations existantes pour la période demandée.
                              </div>
                            </div>
                          )}

                          {/* ERREUR */}

                          {!verificationEnCours &&
                            erreurDisponibilite && (
                              <div
                                style={
                                  errorBoxStyle
                                }
                              >
                                <strong>
                                  Impossible de vérifier les disponibilités.
                                </strong>

                                <div
                                  style={{
                                    marginTop:
                                      4,
                                  }}
                                >
                                  {
                                    erreurDisponibilite
                                  }
                                </div>
                              </div>
                            )}

                          {/* RESULTAT */}

                          {!verificationEnCours &&
                            dispo && (
                              <>
                                {/* VEHICULE */}

                                {dispo.typeSouhaiteDisponible ? (
                                  <div
                                    style={
                                      successBoxStyle
                                    }
                                  >
                                    <strong>
                                      ✓ Type de véhicule demandé disponible
                                    </strong>

                                    <div
                                      style={{
                                        marginTop:
                                          4,
                                      }}
                                    >
                                      {
                                        dispo.message
                                      }
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    style={
                                      warningAvailabilityStyle
                                    }
                                  >
                                    <strong>
                                      ⚠ Type de véhicule souhaité indisponible
                                    </strong>

                                    <div
                                      style={{
                                        marginTop:
                                          4,
                                      }}
                                    >
                                      {
                                        dispo.message
                                      }
                                    </div>

                                    {suggestions.length >
                                      0 && (
                                      <div
                                        style={{
                                          marginTop:
                                            7,

                                          fontWeight:
                                            600,
                                        }}
                                      >
                                        D&apos;autres véhicules disponibles peuvent être proposés au Chef du Service Logistique.
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* CHAUFFEUR */}

                                {chauffeurRequis && (
                                  <div
                                    style={
                                      dispo.chauffeurDisponible
                                        ? successBoxStyle
                                        : errorBoxStyle
                                    }
                                  >
                                    {dispo.chauffeurDisponible ? (
                                      <>
                                        <strong>
                                          ✓ Chauffeur disponible
                                        </strong>

                                        <div
                                          style={{
                                            marginTop:
                                              4,
                                          }}
                                        >
                                          {
                                            chauffeursDisponibles.length
                                          }{" "}
                                          chauffeur(s) disponible(s) pour la période demandée.
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <strong>
                                          ⚠ Aucun chauffeur disponible
                                        </strong>

                                        <div
                                          style={{
                                            marginTop:
                                              4,
                                          }}
                                        >
                                          La validation niveau 1 est impossible tant qu&apos;aucun chauffeur n&apos;est disponible.
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}

                                {/* SELECTS */}

                                <div
                                  style={
                                    affectationGridStyle
                                  }
                                >
                                  {/* VEHICULE */}

                                  <div>
                                    <label
                                      style={
                                        labelStyle
                                      }
                                    >
                                      Véhicule à affecter
                                    </label>

                                    <select
                                      value={
                                        vehiculeAffecte[
                                          r.id
                                        ] ||
                                        ""
                                      }
                                      onChange={(
                                        e
                                      ) =>
                                        setVehiculeAffecte(
                                          (
                                            ancien
                                          ) => ({
                                            ...ancien,

                                            [r.id]:
                                              e.target.value,
                                          })
                                        )
                                      }
                                      disabled={
                                        aucunVehicule ||
                                        decisionEnCours
                                      }
                                      style={{
                                        ...inputStyle,

                                        opacity:
                                          aucunVehicule
                                            ? 0.6
                                            : 1,
                                      }}
                                    >
                                      <option value="">
                                        {aucunVehicule
                                          ? "Aucun véhicule disponible"
                                          : "Sélectionner un véhicule"}
                                      </option>

                                      {vehiculesCorrespondants.length >
                                        0 && (
                                        <optgroup label="Type demandé">
                                          {vehiculesCorrespondants.map(
                                            (
                                              v
                                            ) => (
                                              <option
                                                key={
                                                  v.id
                                                }
                                                value={
                                                  v.id
                                                }
                                              >
                                                {libelleVehiculeDisponible(
                                                  v
                                                )}
                                              </option>
                                            )
                                          )}
                                        </optgroup>
                                      )}

                                      {suggestions.length >
                                        0 && (
                                        <optgroup label="Autres véhicules disponibles">
                                          {suggestions.map(
                                            (
                                              v
                                            ) => (
                                              <option
                                                key={
                                                  v.id
                                                }
                                                value={
                                                  v.id
                                                }
                                              >
                                                {libelleVehiculeDisponible(
                                                  v
                                                )}
                                              </option>
                                            )
                                          )}
                                        </optgroup>
                                      )}
                                    </select>
                                  </div>

                                  {/* CHAUFFEUR */}

                                  {chauffeurRequis && (
                                    <div>
                                      <label
                                        style={
                                          labelStyle
                                        }
                                      >
                                        Chauffeur à affecter
                                      </label>

                                      <select
                                        value={
                                          chauffeurAffecte[
                                            r.id
                                          ] ||
                                          ""
                                        }
                                        onChange={(
                                          e
                                        ) =>
                                          setChauffeurAffecte(
                                            (
                                              ancien
                                            ) => ({
                                              ...ancien,

                                              [r.id]:
                                                e.target.value,
                                            })
                                          )
                                        }
                                        disabled={
                                          aucunChauffeur ||
                                          decisionEnCours
                                        }
                                        style={{
                                          ...inputStyle,

                                          opacity:
                                            aucunChauffeur
                                              ? 0.6
                                              : 1,
                                        }}
                                      >
                                        <option value="">
                                          {aucunChauffeur
                                            ? "Aucun chauffeur disponible"
                                            : "Sélectionner un chauffeur"}
                                        </option>

                                        {chauffeursDisponibles.map(
                                          (
                                            c
                                          ) => (
                                            <option
                                              key={
                                                c.id
                                              }
                                              value={
                                                c.id
                                              }
                                            >
                                              {libelleChauffeur(
                                                c
                                              )}
                                            </option>
                                          )
                                        )}
                                      </select>
                                    </div>
                                  )}
                                </div>

                                <div
                                  style={{
                                    marginTop:
                                      7,

                                    fontSize:
                                      11,

                                    color:
                                      "#94a3b8",
                                  }}
                                >
                                  Le serveur recontrôlera automatiquement le véhicule et le chauffeur au moment de la validation afin d&apos;éviter une double affectation.
                                </div>

                                {/* ACTIONS */}

                                <div
                                  style={{
                                    display:
                                      "flex",

                                    justifyContent:
                                      "flex-end",

                                    gap:
                                      8,

                                    flexWrap:
                                      "wrap",

                                    marginTop:
                                      14,
                                  }}
                                >
                                  <button
                                    type="button"
                                    disabled={
                                      decisionEnCours
                                    }
                                    onClick={() =>
                                      ouvrirRefus(
                                        r
                                      )
                                    }
                                    style={{
                                      ...boutonRefuser,

                                      opacity:
                                        decisionEnCours
                                          ? 0.5
                                          : 1,

                                      cursor:
                                        decisionEnCours
                                          ? "not-allowed"
                                          : "pointer",
                                    }}
                                  >
                                    <XCircle
                                      size={
                                        15
                                      }
                                    />

                                    Refuser
                                  </button>

                                  <button
                                    type="button"
                                    disabled={
                                      validationBloquee
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
                                        validationBloquee
                                          ? 0.5
                                          : 1,

                                      cursor:
                                        validationBloquee
                                          ? "not-allowed"
                                          : "pointer",
                                    }}
                                  >
                                    <CheckCircle2
                                      size={
                                        15
                                      }
                                    />

                                    {decisionEnCours
                                      ? "Enregistrement..."
                                      : "Valider niveau 1"}
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

                              gap:
                                6,

                              fontWeight:
                                700,
                            }}
                          >
                            <CheckCircle2
                              size={
                                16
                              }
                            />

                            Validation niveau 1 enregistrée
                          </div>

                          <div
                            style={
                              traceGridStyle
                            }
                          >
                            <TraceInfo
                              label="Véhicule affecté"
                              value={
                                r.vehicule
                                  ? libelleVehicule(
                                      r.vehicule
                                    )
                                  : "—"
                              }
                            />

                            <TraceInfo
                              label="Chauffeur affecté"
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
                              label="Validée par"
                              value={
                                nomUtilisateur(
                                  r.validationN1Par
                                )
                              }
                            />

                            <TraceInfo
                              label="Date de validation"
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

                              gap:
                                6,

                              fontWeight:
                                700,
                            }}
                          >
                            <XCircle
                              size={
                                16
                              }
                            />

                            Demande refusée
                          </div>

                          <div
                            style={{
                              marginTop:
                                10,
                            }}
                          >
                            <strong>
                              Motif :
                            </strong>{" "}

                            {r.motifRefus?.trim() ||
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
                              label="Date du refus"
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
                  );
                }
              )}
            </div>
          )}

          {/* =================================================
              ENTRETIEN
          ================================================= */}

          <div
            style={
              sectionHeaderStyle
            }
          >
            <SectionTitre
              titre="Entretien — coordination avec le mécanicien DID"
            />

            <select
              value={
                filtreStatutMaintenance
              }
              onChange={(
                e
              ) =>
                setFiltreStatutMaintenance(
                  e.target.value
                )
              }
              style={{
                ...inputStyle,

                width:
                  220,
              }}
            >
              <option value="ACTIVES">
                Entretiens actifs
              </option>

              <option value="EN_ATTENTE_AVIS_DID">
                En attente d&apos;avis DID
              </option>

              <option value="PLANIFIEE">
                Planifiés
              </option>

              <option value="EN_COURS">
                En cours
              </option>

              <option value="CLOTUREE">
                Clôturés
              </option>

              <option value="TOUS">
                Tous
              </option>
            </select>
          </div>

          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "repeat(auto-fit, minmax(340px, 1fr))",

              gap:
                18,

              marginBottom:
                22,
            }}
          >
            {/* CREER ENTRETIEN */}

            <div
              style={
                cardStyle
              }
            >
              <h4
                style={
                  cardTitleStyle
                }
              >
                Créer une demande d&apos;entretien
              </h4>

              <form
                onSubmit={
                  soumettreEntretien
                }
                style={
                  formStyle
                }
              >
                <div>
                  <label
                    style={
                      labelStyle
                    }
                  >
                    Véhicule
                  </label>

                  <select
                    value={
                      entVehiculeId
                    }
                    onChange={(
                      e
                    ) =>
                      setEntVehiculeId(
                        e.target.value
                      )
                    }
                    style={
                      inputStyle
                    }
                    required
                  >
                    <option value="">
                      Sélectionner un véhicule
                    </option>

                    {vehicules.map(
                      (
                        v
                      ) => (
                        <option
                          key={
                            v.id
                          }
                          value={
                            v.id
                          }
                        >
                          {libelleVehicule(
                            v
                          )}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label
                    style={
                      labelStyle
                    }
                  >
                    Nature de l&apos;intervention
                  </label>

                  <textarea
                    value={
                      entNature
                    }
                    onChange={(
                      e
                    ) =>
                      setEntNature(
                        e.target.value
                      )
                    }
                    rows={
                      3
                    }
                    placeholder="Ex : vidange, freinage, carrosserie..."
                    style={{
                      ...inputStyle,

                      resize:
                        "vertical",
                    }}
                    required
                  />
                </div>

                <p
                  style={
                    helpStyle
                  }
                >
                  Après création, le dossier reste bloqué jusqu&apos;à l&apos;avis du mécanicien diagnostiqueur DID.
                </p>

                <button
                  type="submit"
                  disabled={
                    envoiEntretien
                  }
                  style={boutonPrimaire(
                    envoiEntretien
                  )}
                >
                  <PlusCircle
                    size={
                      15
                    }
                  />

                  {envoiEntretien
                    ? "Envoi..."
                    : "Créer la demande"}
                </button>
              </form>
            </div>

            {/* CONTROLE RG02 */}

            <div
              style={
                cardStyle
              }
            >
              <h4
                style={
                  cardTitleStyle
                }
              >
                Contrôle RG-02
              </h4>

              <div
                style={{
                  display:
                    "grid",

                  gap:
                    10,
                }}
              >
                <Info
                  label="En attente d'avis DID"
                  value={String(
                    maintenancesEnAttenteAvis.length
                  )}
                />

                <Info
                  label="Avis DID reçus, prêts à planifier"
                  value={String(
                    maintenancesAvisRecus.length
                  )}
                />

                <Info
                  label="Entretiens actifs"
                  value={String(
                    maintenancesActives.length
                  )}
                />
              </div>
            </div>
          </div>

          {/* LISTE MAINTENANCES */}

          {maintenancesFiltrees.length ===
          0 ? (
            <BlocVide
              texte="Aucun entretien dans cette catégorie."
            />
          ) : (
            <div
              style={{
                display:
                  "flex",

                flexDirection:
                  "column",

                gap:
                  12,

                marginBottom:
                  32,
              }}
            >
              {maintenancesFiltrees.map(
                (
                  m
                ) => (
                  <div
                    key={
                      m.id
                    }
                    style={
                      cardStyle
                    }
                  >
                    <div
                      style={{
                        display:
                          "flex",

                        justifyContent:
                          "space-between",

                        gap:
                          16,

                        flexWrap:
                          "wrap",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display:
                              "flex",

                            alignItems:
                              "center",

                            gap:
                              8,

                            flexWrap:
                              "wrap",
                          }}
                        >
                          <strong>
                            {m.vehicule
                              ? libelleVehicule(
                                  m.vehicule
                                )
                              : "—"}
                          </strong>

                          <BadgeStatut
                            statut={
                              m.statut
                            }
                          />
                        </div>

                        <div
                          style={{
                            marginTop:
                              6,

                            fontSize:
                              13,

                            color:
                              "#475569",
                          }}
                        >
                          {
                            m.natureIntervention
                          }
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop:
                          12,

                        padding:
                          12,

                        background:
                          "#f8fafc",

                        borderRadius:
                          8,

                        fontSize:
                          13,

                        color:
                          "#475569",
                      }}
                    >
                      <strong>
                        Avis DID :
                      </strong>{" "}

                      {m.avisTexte?.trim() ||
                        "En attente"}
                    </div>

                    <div
                      style={
                        actionsStyle
                      }
                    >
                      {m.statut ===
                        "EN_ATTENTE_AVIS_DID" && (
                        <button
                          type="button"
                          onClick={() =>
                            changerStatutMaintenance(
                              m,
                              "PLANIFIEE"
                            )
                          }
                          disabled={
                            !m.avisTexte?.trim()
                          }
                          style={boutonPrimaire(
                            !m.avisTexte?.trim()
                          )}
                        >
                          Planifier
                        </button>
                      )}

                      {m.statut ===
                        "PLANIFIEE" && (
                        <button
                          type="button"
                          onClick={() =>
                            changerStatutMaintenance(
                              m,
                              "EN_COURS"
                            )
                          }
                          style={boutonPrimaire(
                            false
                          )}
                        >
                          Démarrer
                        </button>
                      )}

                      {m.statut ===
                        "EN_COURS" && (
                        <button
                          type="button"
                          onClick={() =>
                            changerStatutMaintenance(
                              m,
                              "CLOTUREE"
                            )
                          }
                          style={
                            boutonValider
                          }
                        >
                          <CheckCircle2
                            size={
                              15
                            }
                          />

                          Clôturer
                        </button>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {/* =================================================
              CARBURANT
          ================================================= */}

          <div
            style={
              sectionHeaderStyle
            }
          >
            <SectionTitre
              titre="Carburant — dotations, consommations et justificatifs"
            />

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
                size={
                  15
                }
              />

              Exporter CSV
            </button>
          </div>

          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "repeat(auto-fit, minmax(340px, 1fr))",

              gap:
                18,

              marginBottom:
                22,
            }}
          >
            {/* SAISIE CARBURANT */}

            <div
              style={
                cardStyle
              }
            >
              <h4
                style={
                  cardTitleStyle
                }
              >
                Nouvelle saisie carburant
              </h4>

              <form
                onSubmit={
                  soumettreCarburant
                }
                style={
                  formStyle
                }
              >
                <div>
                  <label
                    style={
                      labelStyle
                    }
                  >
                    Véhicule
                  </label>

                  <select
                    value={
                      carbVehiculeId
                    }
                    onChange={(
                      e
                    ) =>
                      setCarbVehiculeId(
                        e.target.value
                      )
                    }
                    style={
                      inputStyle
                    }
                    required
                  >
                    <option value="">
                      Sélectionner un véhicule
                    </option>

                    {vehicules.map(
                      (
                        v
                      ) => (
                        <option
                          key={
                            v.id
                          }
                          value={
                            v.id
                          }
                        >
                          {libelleVehicule(
                            v
                          )}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div
                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "1fr 1fr",

                    gap:
                      10,
                  }}
                >
                  <div>
                    <label
                      style={
                        labelStyle
                      }
                    >
                      Type
                    </label>

                    <select
                      value={
                        carbType
                      }
                      onChange={(
                        e
                      ) =>
                        setCarbType(
                          e.target.value as
                            | "DOTATION"
                            | "CONSOMMATION"
                        )
                      }
                      style={
                        inputStyle
                      }
                    >
                      <option value="CONSOMMATION">
                        Consommation
                      </option>

                      <option value="DOTATION">
                        Dotation
                      </option>
                    </select>
                  </div>

                  <div>
                    <label
                      style={
                        labelStyle
                      }
                    >
                      Quantité (L)
                    </label>

                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={
                        carbQuantite
                      }
                      onChange={(
                        e
                      ) =>
                        setCarbQuantite(
                          e.target.value
                        )
                      }
                      style={
                        inputStyle
                      }
                      required
                    />
                  </div>
                </div>

                <div>
                  <label
                    style={
                      labelStyle
                    }
                  >
                    Date
                  </label>

                  <input
                    type="date"
                    value={
                      carbDate
                    }
                    onChange={(
                      e
                    ) =>
                      setCarbDate(
                        e.target.value
                      )
                    }
                    style={
                      inputStyle
                    }
                    required
                  />
                </div>

                <div>
                  <label
                    style={
                      labelStyle
                    }
                  >
                    Justificatif / référence facture ou ticket
                  </label>

                  <input
                    value={
                      carbJustificatif
                    }
                    onChange={(
                      e
                    ) =>
                      setCarbJustificatif(
                        e.target.value
                      )
                    }
                    style={
                      inputStyle
                    }
                    placeholder="Référence du justificatif"
                  />
                </div>

                <button
                  type="submit"
                  disabled={
                    envoiCarburant
                  }
                  style={boutonPrimaire(
                    envoiCarburant
                  )}
                >
                  <PlusCircle
                    size={
                      15
                    }
                  />

                  {envoiCarburant
                    ? "Enregistrement..."
                    : "Enregistrer"}
                </button>
              </form>
            </div>

            {/* CONSOMMATION */}

            <div
              style={
                cardStyle
              }
            >
              <h4
                style={
                  cardTitleStyle
                }
              >
                Consommation par véhicule — mois en cours
              </h4>

              {consommationParVehicule.length ===
              0 ? (
                <p
                  style={
                    helpStyle
                  }
                >
                  Aucune consommation enregistrée pour le mois en cours.
                </p>
              ) : (
                <div
                  style={{
                    display:
                      "grid",

                    gap:
                      8,
                  }}
                >
                  {consommationParVehicule.map(
                    ({
                      vehicule,
                      total,
                    }) => (
                      <div
                        key={
                          vehicule.id
                        }
                        style={{
                          display:
                            "flex",

                          justifyContent:
                            "space-between",

                          gap:
                            12,

                          padding:
                            "9px 0",

                          borderBottom:
                            "1px solid #f1f5f9",
                        }}
                      >
                        <span
                          style={{
                            fontSize:
                              13,

                            color:
                              "#475569",
                          }}
                        >
                          {
                            vehicule.immatriculation
                          }
                        </span>

                        <strong
                          style={{
                            fontSize:
                              13,
                          }}
                        >
                          {formatNombre(
                            total
                          )}{" "}
                          L
                        </strong>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>

          {/* TABLEAU CARBURANT */}

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
                {transactions
                  .slice()
                  .sort(
                    (
                      a,
                      b
                    ) =>
                      String(
                        b.dateOperation
                      ).localeCompare(
                        String(
                          a.dateOperation
                        )
                      )
                  )
                  .map(
                    (
                      t
                    ) => (
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
                    )
                  )}
              </tbody>
            </table>
          </div>
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

                gap:
                  9,

                marginBottom:
                  8,
              }}
            >
              <XCircle
                size={
                  20
                }
                style={{
                  color:
                    "#dc2626",
                }}
              />

              <h3
                style={{
                  margin:
                    0,

                  fontSize:
                    17,

                  color:
                    "#111827",
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
                {`DMD-${String(
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
              onChange={(
                e
              ) =>
                setMotifRefusSaisi(
                  e.target.value
                )
              }
              rows={
                5
              }
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

                gap:
                  8,

                marginTop:
                  17,

                flexWrap:
                  "wrap",
              }}
            >
              <button
                type="button"
                disabled={
                  Boolean(
                    decisionsEnCours[
                      reservationARefuser.id
                    ]
                  )
                }
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
                  !motifRefusSaisi.trim() ||
                  Boolean(
                    decisionsEnCours[
                      reservationARefuser.id
                    ]
                  )
                }
                onClick={
                  confirmerRefus
                }
                style={{
                  ...boutonRefuser,

                  opacity:
                    !motifRefusSaisi.trim() ||
                    Boolean(
                      decisionsEnCours[
                        reservationARefuser.id
                      ]
                    )
                      ? 0.5
                      : 1,

                  cursor:
                    !motifRefusSaisi.trim()
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                <XCircle
                  size={
                    15
                  }
                />

                {decisionsEnCours[
                  reservationARefuser.id
                ]
                  ? "Enregistrement..."
                  : "Confirmer le refus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
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
  icone:
    ReactNode;

  label:
    string;

  valeur:
    string;

  sousTexte?:
    string;
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

          gap:
            8,

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
// SECTION TITRE
// =========================================================

function SectionTitre({
  titre,
}: {
  titre:
    string;
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
// SOUS-TITRE
// =========================================================

function SousTitreCarte({
  texte,
}: {
  texte:
    string;
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
  texte:
    string;
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

// =========================================================
// INFO
// =========================================================

function Info({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
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
// TRACE
// =========================================================

function TraceInfo({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
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
  statut:
    string;
}) {
  const map: Record<
    string,
    {
      bg:
        string;

      color:
        string;

      label:
        string;
    }
  > = {
    DISPONIBLE: {
      bg:
        "#dcfce7",

      color:
        "#166534",

      label:
        "Disponible",
    },

    EN_MISSION: {
      bg:
        "#dbeafe",

      color:
        "#1d4ed8",

      label:
        "En mission",
    },

    EN_MAINTENANCE: {
      bg:
        "#fef3c7",

      color:
        "#92400e",

      label:
        "En maintenance",
    },

    EN_ATTENTE: {
      bg:
        "#f1f5f9",

      color:
        "#475569",

      label:
        "En attente",
    },

    VALIDEE_N1: {
      bg:
        "#dcfce7",

      color:
        "#166534",

      label:
        "Validée N1",
    },

    VALIDEE: {
      bg:
        "#dcfce7",

      color:
        "#166534",

      label:
        "Validée",
    },

    REFUSEE: {
      bg:
        "#fee2e2",

      color:
        "#b91c1c",

      label:
        "Refusée",
    },

    EN_ATTENTE_AVIS_DID: {
      bg:
        "#fef3c7",

      color:
        "#92400e",

      label:
        "En attente d'avis DID",
    },

    PLANIFIEE: {
      bg:
        "#dbeafe",

      color:
        "#1e40af",

      label:
        "Planifiée",
    },

    EN_COURS: {
      bg:
        "#e0f2fe",

      color:
        "#0369a1",

      label:
        "En cours",
    },

    CLOTUREE: {
      bg:
        "#dcfce7",

      color:
        "#166534",

      label:
        "Clôturée",
    },
  };

  const item =
    map[
      statut
    ] || {
      bg:
        "#f1f5f9",

      color:
        "#475569",

      label:
        statutMaintenanceLabel[
          statut
        ] ||
        statut,
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
  r:
    Reservation
) {
  const nom =
    `${
      r.demandeurPrenom ||
      ""
    } ${
      r.demandeurNom ||
      ""
    }`.trim();

  if (
    nom
  ) {
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
  if (
    !utilisateur
  ) {
    return "—";
  }

  if (
    utilisateur.nomComplet?.trim()
  ) {
    return utilisateur.nomComplet.trim();
  }

  const nom =
    `${
      utilisateur.prenom ||
      ""
    } ${
      utilisateur.nom ||
      ""
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
    `${
      chauffeur.prenom ||
      ""
    } ${
      chauffeur.nom ||
      ""
    }`.trim();

  return (
    nom ||
    chauffeur.matricule ||
    `Chauffeur #${chauffeur.id}`
  );
}

function libelleChauffeur(
  chauffeur:
    ChauffeurDisponible
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
  vehicule:
    Vehicule
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
    ].filter(
      Boolean
    );

  return details.length >
    0
    ? `${vehicule.immatriculation} — ${details.join(
        " — "
      )}`
    : vehicule.immatriculation;
}

function libelleVehiculeDisponible(
  vehicule:
    VehiculeDisponible
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
    ].filter(
      Boolean
    );

  return details.length >
    0
    ? `${vehicule.immatriculation} — ${details.join(
        " — "
      )}`
    : vehicule.immatriculation;
}

// =========================================================
// TYPE VEHICULE
// =========================================================

function formaterTypeVehicule(
  type?:
    | string
    | null
) {
  if (
    !type
  ) {
    return "Aucun type particulier";
  }

  const valeur =
    type
      .trim()
      .toUpperCase();

  const map:
    Record<
      string,
      string
    > = {
    BERLINE:
      "Berline",

    "4X4":
      "4x4",

    UTILITAIRE:
      "Utilitaire",

    MINIBUS:
      "Minibus",

    AUTRE:
      "Autre",
  };

  return (
    map[
      valeur
    ] ||
    type
  );
}

// =========================================================
// DATES
// =========================================================

function formaterDate(
  date:
    string
) {
  if (
    !date
  ) {
    return "—";
  }

  const valeur =
    new Date(
      date
    );

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
      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  );
}

function formaterDateCourte(
  date:
    string
) {
  if (
    !date
  ) {
    return "—";
  }

  const valeur =
    new Date(
      date
    );

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
      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",
    }
  );
}

// =========================================================
// NOMBRE
// =========================================================

function formatNombre(
  nombre:
    number
) {
  return Number(
    nombre ||
      0
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

const headerStyle:
  CSSProperties = {
  display:
    "flex",

  justifyContent:
    "space-between",

  alignItems:
    "center",

  gap:
    16,

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

  gap:
    12,

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

  gap:
    14,

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

const cardTitleStyle:
  CSSProperties = {
  margin:
    "0 0 14px",

  fontSize:
    15,

  color:
    "#111827",
};

const formStyle:
  CSSProperties = {
  display:
    "flex",

  flexDirection:
    "column",

  gap:
    12,
};

const filtersStyle:
  CSSProperties = {
  display:
    "flex",

  gap:
    10,

  marginBottom:
    16,

  flexWrap:
    "wrap",
};

const infoGridStyle:
  CSSProperties = {
  display:
    "grid",

  gridTemplateColumns:
    "repeat(auto-fit, minmax(210px, 1fr))",

  gap:
    10,
};

const affectationGridStyle:
  CSSProperties = {
  display:
    "grid",

  gridTemplateColumns:
    "repeat(auto-fit, minmax(280px, 1fr))",

  gap:
    12,

  marginTop:
    14,
};

const traceGridStyle:
  CSSProperties = {
  display:
    "grid",

  gridTemplateColumns:
    "repeat(auto-fit, minmax(180px, 1fr))",

  gap:
    12,

  marginTop:
    12,
};

const warningBoxStyle:
  CSSProperties = {
  marginTop:
    12,

  padding:
    12,

  border:
    "1px solid #fed7aa",

  background:
    "#fff7ed",

  borderRadius:
    8,

  color:
    "#9a3412",

  fontSize:
    13,
};

const warningAvailabilityStyle:
  CSSProperties = {
  marginTop:
    10,

  padding:
    12,

  border:
    "1px solid #fed7aa",

  background:
    "#fff7ed",

  borderRadius:
    8,

  color:
    "#9a3412",

  fontSize:
    13,

  lineHeight:
    1.5,
};

const successBoxStyle:
  CSSProperties = {
  marginTop:
    10,

  padding:
    12,

  border:
    "1px solid #bbf7d0",

  background:
    "#f0fdf4",

  borderRadius:
    8,

  color:
    "#166534",

  fontSize:
    13,

  lineHeight:
    1.5,
};

const errorBoxStyle:
  CSSProperties = {
  marginTop:
    10,

  padding:
    12,

  border:
    "1px solid #fecaca",

  background:
    "#fef2f2",

  borderRadius:
    8,

  color:
    "#991b1b",

  fontSize:
    13,

  lineHeight:
    1.5,
};

const infoBoxBleuStyle:
  CSSProperties = {
  marginTop:
    10,

  padding:
    12,

  border:
    "1px solid #bfdbfe",

  background:
    "#eff6ff",

  borderRadius:
    8,

  color:
    "#1e40af",

  fontSize:
    13,

  lineHeight:
    1.5,
};

const urgentBadgeStyle:
  CSSProperties = {
  display:
    "inline-flex",

  alignItems:
    "center",

  gap:
    5,

  padding:
    "3px 8px",

  borderRadius:
    999,

  background:
    "#fee2e2",

  color:
    "#b91c1c",

  fontSize:
    11,

  fontWeight:
    700,
};

const detailBoxStyle:
  CSSProperties = {
  marginTop:
    10,

  padding:
    11,

  background:
    "#f8fafc",

  borderRadius:
    8,
};

const detailLabelStyle:
  CSSProperties = {
  fontSize:
    11,

  color:
    "#94a3b8",

  textTransform:
    "uppercase",

  marginBottom:
    5,
};

const detailValueStyle:
  CSSProperties = {
  fontSize:
    13,

  color:
    "#334155",

  lineHeight:
    1.5,
};

const actionsStyle:
  CSSProperties = {
  display:
    "flex",

  justifyContent:
    "flex-end",

  gap:
    8,

  flexWrap:
    "wrap",

  marginTop:
    14,

  paddingTop:
    12,

  borderTop:
    "1px solid #f1f5f9",
};

const labelStyle:
  CSSProperties = {
  display:
    "block",

  fontSize:
    12,

  color:
    "#374151",

  marginBottom:
    5,

  fontWeight:
    600,
};

const inputStyle:
  CSSProperties = {
  width:
    "100%",

  padding:
    "9px 11px",

  border:
    "1px solid #d1d5db",

  borderRadius:
    7,

  fontSize:
    13,

  color:
    "#111827",

  background:
    "white",

  boxSizing:
    "border-box",
};

const helpStyle:
  CSSProperties = {
  margin:
    0,

  fontSize:
    12,

  color:
    "#94a3b8",

  lineHeight:
    1.5,
};

const boutonSecondaire:
  CSSProperties = {
  display:
    "inline-flex",

  alignItems:
    "center",

  gap:
    7,

  padding:
    "9px 13px",

  border:
    "1px solid #d1d5db",

  borderRadius:
    8,

  background:
    "white",

  color:
    "#374151",

  fontSize:
    13,

  fontWeight:
    600,

  cursor:
    "pointer",
};

function boutonPrimaire(
  disabled:
    boolean
): CSSProperties {
  return {
    display:
      "inline-flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    gap:
      7,

    padding:
      "9px 13px",

    border:
      "none",

    borderRadius:
      8,

    background:
      "#dc2626",

    color:
      "white",

    fontSize:
      13,

    fontWeight:
      600,

    cursor:
      disabled
        ? "not-allowed"
        : "pointer",

    opacity:
      disabled
        ? 0.5
        : 1,
  };
}

const boutonValider:
  CSSProperties = {
  display:
    "inline-flex",

  alignItems:
    "center",

  gap:
    6,

  padding:
    "9px 13px",

  border:
    "1px solid #bbf7d0",

  borderRadius:
    8,

  background:
    "#dcfce7",

  color:
    "#166534",

  fontSize:
    13,

  fontWeight:
    600,

  cursor:
    "pointer",
};

const boutonRefuser:
  CSSProperties = {
  display:
    "inline-flex",

  alignItems:
    "center",

  gap:
    6,

  padding:
    "9px 13px",

  border:
    "1px solid #fecaca",

  borderRadius:
    8,

  background:
    "#fef2f2",

  color:
    "#dc2626",

  fontSize:
    13,

  fontWeight:
    600,

  cursor:
    "pointer",
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
  width:
    "100%",

  borderCollapse:
    "collapse",

  minWidth:
    650,
};

const theadRowStyle:
  CSSProperties = {
  background:
    "#f8fafc",

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
  textAlign:
    "left",

  padding:
    "12px 14px",

  fontSize:
    11,

  textTransform:
    "uppercase",

  letterSpacing:
    "0.04em",

  color:
    "#64748b",
};

const tdStyle:
  CSSProperties = {
  padding:
    "12px 14px",

  fontSize:
    13,

  color:
    "#334155",
};

const modalOverlayStyle:
  CSSProperties = {
  position:
    "fixed",

  inset:
    0,

  background:
    "rgba(15, 23, 42, 0.45)",

  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "center",

  padding:
    20,

  zIndex:
    1000,
};

const modalStyle:
  CSSProperties = {
  width:
    "100%",

  maxWidth:
    520,

  background:
    "white",

  borderRadius:
    12,

  border:
    "1px solid #e5e7eb",

  padding:
    20,

  boxShadow:
    "0 20px 45px rgba(15, 23, 42, 0.18)",
};