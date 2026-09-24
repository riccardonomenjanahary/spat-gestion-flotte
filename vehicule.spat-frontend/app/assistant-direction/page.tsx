"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import EnTete from "@/components/EnTete";
import RoleGuard from "@/components/RoleGuard";
import { ROLES } from "@/app/lib/roles";

import {
  AlertTriangle,
  CalendarDays,
  Car,
  CheckCircle2,
  Clock3,
  FileText,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Send,
  UserRound,
  Users,
  X,
  XCircle,
} from "lucide-react";

// =========================================================
// TYPES
// =========================================================

type TypeDemande = "PLANIFIEE" | "TARDIVE" | "URGENTE";

type Mobilisabilite = "FLEXIBLE" | "VERROUILLEE";

type ZoneMission = "VILLE_TOAMASINA" | "HORS_TOAMASINA";

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

  vehicule?: VehiculeResume | null;
  chauffeur?: ChauffeurResume | null;
}

interface FormulaireReservation {
  zoneMission: ZoneMission | "";

  dateDebut: string;
  dateFin: string;

  motif: string;

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
}

// =========================================================
// FORMULAIRE INITIAL
// =========================================================

const formulaireInitial: FormulaireReservation = {
  zoneMission: "",

  dateDebut: "",
  dateFin: "",

  motif: "",

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
};

// =========================================================
// STYLE STATUTS
// =========================================================

const statutStyle: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  EN_ATTENTE: {
    bg: "#fef3c7",
    text: "#92400e",
    label: "En attente",
  },

  EN_ATTENTE_AVIS_DID: {
    bg: "#e0f2fe",
    text: "#075985",
    label: "Avis DID",
  },

  VALIDEE_N1: {
    bg: "#ede9fe",
    text: "#6d28d9",
    label: "Validée N1",
  },

  VALIDEE: {
    bg: "#dcfce7",
    text: "#166534",
    label: "Validée",
  },

  REFUSEE: {
    bg: "#fee2e2",
    text: "#991b1b",
    label: "Refusée",
  },
};

// =========================================================
// PAGE
// =========================================================

export default function AssistantDirectionPage() {
  return (
    <RoleGuard role={ROLES.ASSISTANT_DIRECTION}>
      <AssistantDirectionContent />
    </RoleGuard>
  );
}

function AssistantDirectionContent() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [reservations, setReservations] = useState<Reservation[]>([]);

  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState("");

  const [modalOuverte, setModalOuverte] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  const [formulaire, setFormulaire] =
    useState<FormulaireReservation>(formulaireInitial);

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
  // CHARGEMENT
  // =======================================================

  const chargerDonnees = async () => {
    const token = getToken();

    if (!API) {
      toast.error("NEXT_PUBLIC_API_URL n'est pas configurée");
      setChargement(false);
      return;
    }

    if (!token) {
      router.replace("/login");
      return;
    }

    setChargement(true);

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      };

      const reservationsRes = await fetch(
        `${API}/reservations/mes`,
        {
          method: "GET",
          headers,
          cache: "no-store",
        }
      );

      if (reservationsRes.status === 401) {
        toast.error("Votre session a expiré");
        router.replace("/login");
        return;
      }

      if (reservationsRes.status === 403) {
        toast.error(
          "Vous n'avez pas l'autorisation d'accéder à ces données."
        );
        return;
      }

      if (!reservationsRes.ok) {
        throw new Error(
          (await lireErreur(reservationsRes)) ||
            "Impossible de charger les tickets"
        );
      }

      const reservationsData = await reservationsRes.json();

      setReservations(
        Array.isArray(reservationsData) ? reservationsData : []
      );

    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de charger les données"
      );
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =======================================================
  // MODAL
  // =======================================================

  const ouvrirModal = () => {
    setFormulaire(formulaireInitial);
    setModalOuverte(true);
  };

  const fermerModal = () => {
    if (envoi) {
      return;
    }

    setModalOuverte(false);
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

  // =======================================================
  // STATISTIQUES
  // =======================================================

  const totalDemandes = reservations.length;

  const enAttente = reservations.filter(
    (r) => r.statut === "EN_ATTENTE"
  ).length;

  const validees = reservations.filter(
    (r) => r.statut === "VALIDEE"
  ).length;

  const refusees = reservations.filter(
    (r) => r.statut === "REFUSEE"
  ).length;

  // =======================================================
  // RECHERCHE
  // =======================================================

  const reservationsFiltrees = useMemo(() => {
    const terme = normaliserRecherche(recherche);

    if (!terme) {
      return reservations;
    }

    return reservations.filter((reservation) => {
      const ticket = `TKT-${String(reservation.id).padStart(5, "0")}`;

      const typeDemande = obtenirStyleTypeDemande(
        obtenirTypeDemande(reservation)
      ).label;

      const statut =
        statutStyle[reservation.statut]?.label || reservation.statut;

      const texteRecherche = [
        ticket,
        reservation.motif,
        reservation.destination,
        reservation.pointDepart,
        reservation.demandeurNom,
        reservation.demandeurPrenom,
        reservation.demandeurMatricule,
        reservation.demandeurEntite,
        reservation.demandeurTelephone,
        libelleZoneMission(reservation.zoneMission),
        libelleEtatOperationnel(reservation),
        statut,
        typeDemande,
      ]
        .filter(Boolean)
        .join(" ");

      return normaliserRecherche(texteRecherche).includes(terme);
    });
  }, [reservations, recherche]);

  // =======================================================
  // DELAI 24 H
  // Uniquement HORS TOAMASINA
  // =======================================================

  const estHorsDelai24h = useMemo(() => {
    if (
      formulaire.zoneMission !== "HORS_TOAMASINA" ||
      !formulaire.dateDebut
    ) {
      return false;
    }

    const debut = new Date(formulaire.dateDebut);

    if (Number.isNaN(debut.getTime())) {
      return false;
    }

    const limite24h = new Date(Date.now() + 24 * 60 * 60 * 1000);

    return debut < limite24h;
  }, [formulaire.zoneMission, formulaire.dateDebut]);

  // =======================================================
  // TYPE / ETAT OPERATIONNEL PREVISIONNELS
  // =======================================================

  const etatOperationnelFormulaire =
    formulaire.zoneMission === "HORS_TOAMASINA"
      ? "PLANIFIEE"
      : formulaire.zoneMission === "VILLE_TOAMASINA"
        ? "FLEXIBLE"
        : null;

  // =======================================================
  // MODIFIER CHAMP
  // =======================================================

  const modifierChamp = <K extends keyof FormulaireReservation>(
    champ: K,
    valeur: FormulaireReservation[K]
  ) => {
    setFormulaire((ancien) => ({
      ...ancien,
      [champ]: valeur,
    }));
  };

  // =======================================================
  // PASSAGERS
  // Un champ Nom / Prénom est affiché pour chaque passager.
  // =======================================================

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

  // =======================================================
  // ENVOYER MISSION
  // =======================================================

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

    // -----------------------------------------------------
    // ZONE
    // -----------------------------------------------------

    if (!formulaire.zoneMission) {
      toast.error(
        "Veuillez préciser si la mission est dans Toamasina ou hors Toamasina"
      );
      return;
    }

    // -----------------------------------------------------
    // DATES
    // -----------------------------------------------------

    if (!formulaire.dateDebut || !formulaire.dateFin) {
      toast.error(
        "Veuillez renseigner la date de départ et la date de retour"
      );
      return;
    }

    const debut = new Date(formulaire.dateDebut);
    const fin = new Date(formulaire.dateFin);
    const maintenant = new Date();

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

    // -----------------------------------------------------
    // OBJET
    // -----------------------------------------------------

    if (!formulaire.motif.trim()) {
      toast.error("L'objet de la mission est obligatoire");
      return;
    }

    // -----------------------------------------------------
    // BENEFICIAIRE
    // -----------------------------------------------------

    if (!formulaire.demandeurNom.trim()) {
      toast.error("Le nom du bénéficiaire est obligatoire");
      return;
    }

    if (!formulaire.demandeurPrenom.trim()) {
      toast.error("Le prénom du bénéficiaire est obligatoire");
      return;
    }

    if (!formulaire.demandeurMatricule.trim()) {
      toast.error("Le matricule du bénéficiaire est obligatoire");
      return;
    }

    if (!formulaire.demandeurEntite.trim()) {
      toast.error(
        "La Direction / Département / Service est obligatoire"
      );
      return;
    }

    if (!formulaire.demandeurTelephone.trim()) {
      toast.error("Le numéro de téléphone est obligatoire");
      return;
    }

    // -----------------------------------------------------
    // TRAJET
    // -----------------------------------------------------

    if (!formulaire.pointDepart.trim()) {
      toast.error("Le point de départ est obligatoire");
      return;
    }

    if (!formulaire.destination.trim()) {
      toast.error("La destination est obligatoire");
      return;
    }

    // -----------------------------------------------------
    // PASSAGERS
    // -----------------------------------------------------

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

    if (
      passagersSaisis.length !== nombrePassagers ||
      passagersSaisis.some((nom) => !nom)
    ) {
      toast.error(
        "Veuillez renseigner le nom et le prénom de chaque passager."
      );
      return;
    }

    // -----------------------------------------------------
    // URGENCE / 24H
    // -----------------------------------------------------

    if (
      formulaire.zoneMission === "HORS_TOAMASINA" &&
      estHorsDelai24h &&
      !formulaire.motifUrgence.trim()
    ) {
      toast.error(
        "La mission hors Toamasina est créée à moins de 24 heures du départ. Veuillez justifier cette demande tardive."
      );
      return;
    }

    // -----------------------------------------------------
    // JSON BACKEND
    // -----------------------------------------------------

    const body = {
      zoneMission: formulaire.zoneMission,

      dateDebut: convertirDatePourApi(formulaire.dateDebut),
      dateFin: convertirDatePourApi(formulaire.dateFin),

      motif: formulaire.motif.trim(),

      // L'Assistant de Direction ne déclare pas l'urgence depuis ce formulaire.
      // Les urgences opérationnelles sont gérées dans le circuit dédié.
      demandeUrgente: false,

      motifUrgence:
        formulaire.zoneMission === "HORS_TOAMASINA" &&
        estHorsDelai24h
          ? formulaire.motifUrgence.trim()
          : null,

      demandeurNom: formulaire.demandeurNom.trim(),
      demandeurPrenom: formulaire.demandeurPrenom.trim(),
      demandeurMatricule: formulaire.demandeurMatricule.trim(),
      demandeurEntite: formulaire.demandeurEntite.trim(),
      demandeurTelephone: formulaire.demandeurTelephone.trim(),

      destination: formulaire.destination.trim(),
      pointDepart: formulaire.pointDepart.trim(),

      nombrePassagers,

      listePassagers: passagersSaisis.join("\n"),

      // Le Service Logistique affectera ensuite le véhicule et le chauffeur.
      typeVehiculeSouhaite: null,
      besoinChauffeur: true,

      observations: formulaire.observations.trim()
        ? formulaire.observations.trim()
        : null,
    };

    setEnvoi(true);

    try {
      const res = await fetch(`${API}/reservations`, {
        method: "POST",

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
        toast.error(
          (await lireErreur(res)) || "Impossible d'enregistrer la mission"
        );
        return;
      }

      const creee = (await res.json().catch(() => null)) as
        | Reservation
        | null;

      const ticket = creee?.id
        ? `TKT-${String(creee.id).padStart(5, "0")}`
        : "Le ticket";

      toast.success(
        `${ticket} a été transmis au Service Logistique`
      );

      setModalOuverte(false);
      setFormulaire(formulaireInitial);

      await chargerDonnees();
    } catch {
      toast.error("Erreur de communication avec le serveur");
    } finally {
      setEnvoi(false);
    }
  };

  // =======================================================
  // RENDU
  // =======================================================

  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
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
          outline: 2px solid #dc2626;
          outline-offset: 1px;
          border-color: #dc2626 !important;
        }

        textarea {
          resize: vertical;
        }

        button {
          font-family: inherit;
        }

        .ligne-demande {
          transition: background-color 0.18s ease, transform 0.18s ease;
        }

        .ligne-demande:hover {
          background-color: #f8fafc;
        }

        .bouton-rouge:hover:not(:disabled) {
          background-color: #b91c1c !important;
          border-color: #b91c1c !important;
        }

        .bouton-bleu:hover:not(:disabled) {
          background-color: #1d4ed8 !important;
          border-color: #1d4ed8 !important;
        }

        .bouton-vert:hover:not(:disabled) {
          background-color: #15803d !important;
          border-color: #15803d !important;
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

      <EnTete afficherNotifications={false} />

      <div
        className="page-container"
        style={{
          minHeight: "calc(100vh - 66px)",
          backgroundColor: "#f3f4f6",
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

            <button
              type="button"
              className="bouton-vert bouton-nouvelle"
              onClick={ouvrirModal}
              style={boutonVert}
            >
              <Plus size={18} />
              Nouvelle mission
            </button>
          </div>

          <div
            className="stats-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <StatCard
              titre="Mes tickets"
              valeur={chargement ? "…" : totalDemandes}
              icone={<FileText size={21} color="#2563eb" />}
            />

            <StatCard
              titre="En attente"
              valeur={chargement ? "…" : enAttente}
              icone={<Clock3 size={21} color="#d97706" />}
            />

            <StatCard
              titre="Validés"
              valeur={chargement ? "…" : validees}
              icone={<CheckCircle2 size={21} color="#16a34a" />}
            />

            <StatCard
              titre="Refusés"
              valeur={chargement ? "…" : refusees}
              icone={<XCircle size={21} color="#dc2626" />}
            />
          </div>

          <div style={rechercheCardStyle}>
            <div style={rechercheTitreStyle}>
              <Search size={17} color="#475569" />
              Rechercher un ticket
            </div>

            <div style={{ position: "relative" }}>
              <Search
                size={17}
                color="#9ca3af"
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                }}
              />

              <input
                type="search"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Ticket, objet, destination, bénéficiaire, statut..."
                aria-label="Rechercher dans mes tickets"
                style={{
                  ...inputStyle,
                  paddingLeft: 39,
                  paddingRight: recherche ? 42 : 12,
                  height: 42,
                }}
              />

              {recherche && (
                <button
                  type="button"
                  onClick={() => setRecherche("")}
                  aria-label="Effacer la recherche"
                  title="Effacer la recherche"
                  style={boutonEffacerRecherche}
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {recherche.trim() && (
              <div style={resultatRechercheStyle}>
                <strong style={{ color: "#374151" }}>
                  {reservationsFiltrees.length}
                </strong>{" "}
                résultat
                {reservationsFiltrees.length > 1 ? "s" : ""} sur{" "}
                {reservations.length} ticket
                {reservations.length > 1 ? "s" : ""}
              </div>
            )}
          </div>

          {/* Titre et bouton AU-DESSUS de la boîte, sans fond ni bordure. */}
          <div style={listeHeaderStyle}>
              <div>
                <h3 style={listeTitreStyle}>Mes tickets</h3>
                
              </div>

              <button
                type="button"
                className="bouton-bleu"
                onClick={chargerDonnees}
                disabled={chargement}
                style={{
                  ...boutonBleu,
                  cursor: chargement ? "not-allowed" : "pointer",
                  opacity: chargement ? 0.6 : 1,
                }}
              >
                <RefreshCw size={15} />
                Actualiser
              </button>
          </div>

          {/* Seul le tableau des tickets est contenu dans la boîte encadrée. */}
          <div style={listeBoxStyle}>
            <div style={tableContainerStyle}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "separate",
                  borderSpacing: 0,
                  minWidth: 860,
                }}
              >
              <thead>
                <tr style={theadRowStyle}>
                  <th style={thStyle}>Ticket</th>
                  <th style={thStyle}>Mission</th>
                  <th style={thStyle}>Zone</th>
                  <th style={thStyle}>Destination</th>
                  <th style={thStyle}>Départ</th>
                                    <th style={thStyle}>État opérationnel</th>
                  <th style={thStyle}>Étape actuelle</th>
                </tr>
              </thead>

              <tbody>
                {chargement ? (
                  <tr>
                    <td colSpan={7} style={emptyStyle}>
                      Chargement des tickets...
                    </td>
                  </tr>
                ) : reservations.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={emptyStyle}>
                      <div style={emptyContentStyle}>
                        <Car size={34} color="#9ca3af" />

                        <strong style={{ color: "#374151" }}>
                          Aucun ticket
                        </strong>

                        <span>
                          Vous n&apos;avez encore créé aucune mission.
                        </span>

                        <button
                          type="button"
                          onClick={ouvrirModal}
                          style={boutonLienVert}
                        >
                          Créer une mission
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : reservationsFiltrees.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={emptyStyle}>
                      <div style={emptyContentStyle}>
                        <Search size={32} color="#9ca3af" />

                        <strong style={{ color: "#374151" }}>
                          Aucun résultat
                        </strong>

                        <span>
                          Aucun ticket ne correspond à votre recherche.
                        </span>

                        <button
                          type="button"
                          onClick={() => setRecherche("")}
                          style={boutonLienBleu}
                        >
                          Effacer la recherche
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  reservationsFiltrees.map((reservation, index) => {
                    const styleStatut =
                      statutStyle[reservation.statut] || {
                        bg: "#f3f4f6",
                        text: "#374151",
                        label: reservation.statut,
                      };

                    const styleType = obtenirStyleTypeDemande(
                      obtenirTypeDemande(reservation)
                    );

                    const etatOperationnel =
                      libelleEtatOperationnel(reservation);

                    return (
                      <tr
                        key={reservation.id}
                        className="ligne-demande"
                        style={{
                          backgroundColor:
                            index % 2 === 0 ? "#ffffff" : "#fcfcfd",
                        }}
                      >
                        <td style={tdStyle}>
                          <div style={ticketCellStyle}>
                         

                            <div>
                              <div
                                style={{
                                  fontWeight: 800,
                                  color: "#111827",
                                  whiteSpace: "nowrap",
                                  letterSpacing: 0.2,
                                }}
                              >
                                {`TKT-${String(reservation.id).padStart(
                                  5,
                                  "0"
                                )}`}
                              </div>

                              <div style={{ marginTop: 6 }}>
                                <span
                                  style={{
                                    backgroundColor: styleType.bg,
                                    color: styleType.text,
                                    padding: "4px 9px",
                                    borderRadius: 999,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    whiteSpace: "nowrap",
                                    border: `1px solid ${styleType.text}22`,
                                  }}
                                >
                                  {styleType.label}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td style={tdStyle}>
                          <div style={missionCellStyle}>
                            <div
                              style={{
                                fontWeight: 700,
                                color: "#111827",
                                maxWidth: 250,
                                lineHeight: 1.45,
                              }}
                            >
                              {reservation.motif}
                            </div>

                            <div style={texteSecondaireStyle}>
                              Créé le {formatDateHeure(reservation.dateCreation)}
                            </div>
                          </div>
                        </td>

                        <td style={tdStyle}>
                          {libelleZoneMission(reservation.zoneMission)}
                        </td>

                        <td style={tdStyle}>
                          <div style={iconeTexteStyle}>
                            <MapPin size={14} color="#6b7280" />
                            {reservation.destination || "—"}
                          </div>
                        </td>

                        <td style={tdStyle}>
                          <div
                            style={{
                              ...iconeTexteStyle,
                              whiteSpace: "nowrap",
                            }}
                          >
                            <CalendarDays size={14} color="#6b7280" />
                            {formatDateHeure(reservation.dateDebut)}
                          </div>
                        </td>

                        <td style={tdStyle}>
                          <BadgeEtatOperationnel
                            libelle={etatOperationnel}
                          />
                        </td>

                        <td style={tdStyle}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              backgroundColor: styleStatut.bg,
                              color: styleStatut.text,
                              padding: "6px 11px",
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                              border: `1px solid ${styleStatut.text}22`,
                              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.25)",
                            }}
                          >
                            {styleStatut.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================
          MODAL
      =================================================== */}

      {modalOuverte && (
        <div
          className="modal-container"
          onMouseDown={fermerModal}
          style={modalOverlayStyle}
        >
          <form
            className="modal-content"
            onSubmit={envoyerDemande}
            onMouseDown={(event) => event.stopPropagation()}
            style={modalContentStyle}
          >
            <div style={modalHeaderStyle}>
              <div style={iconeTexteStyle}>
                <div style={modalIconStyle}>
                  <Car size={21} color="#dc2626" />
                </div>

                <div>
                  <h3 style={modalTitleStyle}>Nouvelle mission</h3>

                  
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
              <BlocFormulaire
                numero="1"
                titre="Bénéficiaire de la mission"
                icone={<UserRound size={18} color="#2563eb" />}
              >
                <div className="form-grid" style={gridDeuxColonnes}>
                  <Champ label="Nom" obligatoire>
                    <input
                      value={formulaire.demandeurNom}
                      onChange={(e) =>
                        modifierChamp("demandeurNom", e.target.value)
                      }
                      placeholder="Nom du bénéficiaire"
                      style={inputStyle}
                    />
                  </Champ>

                  <Champ label="Prénom" obligatoire>
                    <input
                      value={formulaire.demandeurPrenom}
                      onChange={(e) =>
                        modifierChamp("demandeurPrenom", e.target.value)
                      }
                      placeholder="Prénom du bénéficiaire"
                      style={inputStyle}
                    />
                  </Champ>

                  <Champ label="Matricule" obligatoire>
                    <input
                      value={formulaire.demandeurMatricule}
                      onChange={(e) =>
                        modifierChamp(
                          "demandeurMatricule",
                          e.target.value
                        )
                      }
                      placeholder="Ex. SPAT00125"
                      style={inputStyle}
                    />
                  </Champ>

                  <Champ label="Téléphone" obligatoire>
                    <input
                      type="tel"
                      value={formulaire.demandeurTelephone}
                      onChange={(e) =>
                        modifierChamp(
                          "demandeurTelephone",
                          e.target.value
                        )
                      }
                      placeholder="Numéro joignable"
                      style={inputStyle}
                    />
                  </Champ>

                  <div style={{ gridColumn: "1 / -1" }}>
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
                  </div>
                </div>
              </BlocFormulaire>

              <BlocFormulaire
                numero="2"
                titre="Informations sur la mission"
                icone={<MapPin size={18} color="#16a34a" />}
              >
                <div className="form-grid" style={gridDeuxColonnes}>
                  <Champ label="Zone de mission" obligatoire>
                    <select
                      value={formulaire.zoneMission}
                      onChange={(e) =>
                        modifierChamp(
                          "zoneMission",
                          e.target.value as ZoneMission | ""
                        )
                      }
                      style={inputStyle}
                    >
                      <option value="">Sélectionner la zone</option>

                      <option value="VILLE_TOAMASINA">
                        Dans la ville de Toamasina
                      </option>

                      <option value="HORS_TOAMASINA">
                        Hors ville de Toamasina
                      </option>
                    </select>
                  </Champ>

                  <Champ label="État opérationnel">
                    <div style={readOnlyStyle}>
                      {etatOperationnelFormulaire || "Sélectionnez la zone"}
                    </div>
                  </Champ>
                </div>

                <div style={{ marginTop: 16 }}>
                  <Champ label="Objet de la mission" obligatoire>
                    <textarea
                      value={formulaire.motif}
                      onChange={(e) =>
                        modifierChamp("motif", e.target.value)
                      }
                      rows={3}
                      placeholder="Décrivez brièvement l'objet de la mission..."
                      style={textareaStyle}
                    />
                  </Champ>
                </div>

                <div
                  className="form-grid"
                  style={{
                    ...gridDeuxColonnes,
                    marginTop: 16,
                  }}
                >
                  <Champ label="Point de départ" obligatoire>
                    <input
                      value={formulaire.pointDepart}
                      onChange={(e) =>
                        modifierChamp("pointDepart", e.target.value)
                      }
                      placeholder="Ex. SPAT Toamasina"
                      style={inputStyle}
                    />
                  </Champ>

                  <Champ label="Destination" obligatoire>
                    <input
                      value={formulaire.destination}
                      onChange={(e) =>
                        modifierChamp("destination", e.target.value)
                      }
                      placeholder="Lieu de destination"
                      style={inputStyle}
                    />
                  </Champ>

                  <Champ label="Date et heure de départ" obligatoire>
                    <input
                      type="datetime-local"
                      value={formulaire.dateDebut}
                      onChange={(e) =>
                        modifierChamp("dateDebut", e.target.value)
                      }
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

                {formulaire.zoneMission === "HORS_TOAMASINA" &&
                  estHorsDelai24h &&
                  formulaire.dateDebut && (
                    <div style={warningJauneStyle}>
                      <div style={warningRowStyle}>
                        <Clock3
                          size={20}
                          color="#d97706"
                          style={{ flexShrink: 0 }}
                        />

                        <div style={{ flex: 1 }}>
                          <strong>Mission hors ville créée tardivement</strong>

                          <p style={warningTextStyle}>
                            Le départ est prévu à moins de 24 heures. Une
                            justification est obligatoire.
                          </p>

                          <Champ
                            label="Justification de la demande tardive"
                            obligatoire
                          >
                            <textarea
                              value={formulaire.motifUrgence}
                              onChange={(e) =>
                                modifierChamp(
                                  "motifUrgence",
                                  e.target.value
                                )
                              }
                              rows={3}
                              placeholder="Ex. Mission confirmée tardivement..."
                              style={textareaStyle}
                            />
                          </Champ>
                        </div>
                      </div>
                    </div>
                  )}

              </BlocFormulaire>

              <BlocFormulaire
                numero="3"
                titre="Passagers et contraintes"
                icone={<Users size={18} color="#7c3aed" />}
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
                  <Champ label="Liste des passagers" obligatoire>
                    <div
                      style={{
                        display: "grid",
                        gap: 10,
                      }}
                    >
                      {lignesPassagers.map((nom, index) => (
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

                          <input
                            value={nom}
                            onChange={(e) =>
                              modifierNomPassager(
                                index,
                                e.target.value
                              )
                            }
                            placeholder={`Nom et prénom du passager ${index + 1}`}
                            style={inputStyle}
                          />
                        </div>
                      ))}
                    </div>
                  </Champ>
                </div>

                <div style={{ marginTop: 16 }}>
                  <Champ label="Observations / contraintes particulières">
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


            </div>

            <div style={modalFooterStyle}>
              <button
                type="button"
                className="bouton-bleu"
                onClick={fermerModal}
                disabled={envoi}
                style={{
                  ...boutonBleu,
                  opacity: envoi ? 0.6 : 1,
                }}
              >
                Annuler
              </button>

              <button
                type="submit"
                className="bouton-rouge"
                disabled={envoi}
                style={{
                  ...boutonRouge,
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
                    Créer le ticket
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

// =========================================================
// COMPOSANTS
// =========================================================

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
  children,
}: {
  label: string;
  obligatoire?: boolean;
  children: ReactNode;
}) {
  return (
    <label style={{ display: "block" }}>
      <div style={champLabelStyle}>
        {label}

        {obligatoire && (
          <span style={{ color: "#dc2626", marginLeft: 3 }}>*</span>
        )}
      </div>

      {children}
    </label>
  );
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

// =========================================================
// HELPERS METIER
// =========================================================

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

async function lireErreur(res: Response) {
  try {
    const contentType = res.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      const data = await res.json();

      if (typeof data === "string") {
        return data;
      }

      return data?.message || data?.error || JSON.stringify(data);
    }

    return await res.text();
  } catch {
    return "";
  }
}

// =========================================================
// STYLES
// =========================================================

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
  color: "#475569",
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
  backgroundColor: "#dc2626",
  borderColor: "#dc2626",
};

const boutonBleu: CSSProperties = {
  ...boutonBasePlein,
  backgroundColor: "#2563eb",
  borderColor: "#2563eb",
};

const boutonVert: CSSProperties = {
  ...boutonBasePlein,
  backgroundColor: "#16a34a",
  borderColor: "#16a34a",
};

const boutonPrincipal: CSSProperties = {
  ...boutonRouge,
};

const boutonSecondaire: CSSProperties = {
  border: "1px solid #d1d5db",
  backgroundColor: "white",
  color: "#374151",
  borderRadius: 8,
  padding: "9px 12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  cursor: "pointer",
  fontWeight: 600,
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
  backgroundColor: "#fee2e2",
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
  backgroundColor: "#f9fafb",
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
  overflow: "hidden",
};

const blocHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  backgroundColor: "#f9fafb",
  padding: "13px 16px",
  borderBottom: "1px solid #e5e7eb",
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
  border: "1px solid #fde68a",
  backgroundColor: "#fffbeb",
  borderRadius: 9,
  padding: 15,
  color: "#92400e",
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
  color: "#92400e",
};

