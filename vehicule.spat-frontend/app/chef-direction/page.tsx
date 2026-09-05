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

import {
  AlertTriangle,
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  LogOut,
  MapPin,
  Plus,
  RefreshCw,
  Send,
  UserRound,
  Users,
  X,
  XCircle,
} from "lucide-react";

// =========================================================
// TYPES
// =========================================================

interface VehiculeResume {
  id: number;
  immatriculation?: string | null;
  marque?: string | null;
  modele?: string | null;
}

interface Reservation {
  id: number;

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

  vehicule?: VehiculeResume | null;
}

interface FormulaireReservation {
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

  typeVehiculeSouhaite: string;
  besoinChauffeur: boolean;

  observations: string;
}

interface ProfilUtilisateur {
  matricule: string;
  nomComplet: string;
  role: string;
}

// =========================================================
// FORMULAIRE INITIAL
// =========================================================

const formulaireInitial: FormulaireReservation = {
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

  typeVehiculeSouhaite: "",
  besoinChauffeur: true,

  observations: "",
};

// =========================================================
// STYLE STATUTS
// =========================================================

const statutStyle: Record<
  string,
  {
    bg: string;
    text: string;
    label: string;
  }
> = {
  EN_ATTENTE: {
    bg: "#fef3c7",
    text: "#92400e",
    label: "En attente",
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

export default function ChefDirectionPage() {
  const router = useRouter();

  const API = process.env.NEXT_PUBLIC_API_URL;

  const [reservations, setReservations] = useState<Reservation[]>([]);

  const [chargement, setChargement] = useState(true);

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
  // CHARGER LES RESERVATIONS
  // =======================================================

  const chargerReservations = async () => {
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
      const res = await fetch(`${API}/reservations/mes`, {
        method: "GET",

        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },

        cache: "no-store",
      });

      if (res.status === 401 || res.status === 403) {
        toast.error("Votre session a expiré");
        router.replace("/login");
        return;
      }

      if (!res.ok) {
        const message = await lireErreur(res);

        throw new Error(
          message || "Impossible de charger les demandes"
        );
      }

      const data: Reservation[] = await res.json();

      setReservations(Array.isArray(data) ? data : []);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible de charger vos demandes";

      toast.error(message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerReservations();
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
        setModalOuverte(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = ancienOverflow;

      window.removeEventListener("keydown", handleKeyDown);
    };
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
  // URGENCE < 24H
  // =======================================================

  const estUrgente = useMemo(() => {
    if (!formulaire.dateDebut) {
      return false;
    }

    const debut = new Date(formulaire.dateDebut);

    if (Number.isNaN(debut.getTime())) {
      return false;
    }

    const maintenant = new Date();

    const limite24h = new Date(
      maintenant.getTime() + 24 * 60 * 60 * 1000
    );

    return debut < limite24h;
  }, [formulaire.dateDebut]);

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
  // ENVOYER DEMANDE
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
      toast.error(
        "La date de retour doit être après la date de départ"
      );
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
    // MISSION
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
      toast.error(
        "Le nombre de passagers doit être supérieur à 0"
      );
      return;
    }

    // -----------------------------------------------------
    // URGENCE
    // -----------------------------------------------------

    if (estUrgente && !formulaire.motifUrgence.trim()) {
      toast.error(
        "Cette demande est effectuée à moins de 24 heures du départ. Le motif d'urgence est obligatoire."
      );
      return;
    }

    // -----------------------------------------------------
    // JSON BACKEND
    // -----------------------------------------------------

    const body = {
      dateDebut: convertirDatePourApi(formulaire.dateDebut),

      dateFin: convertirDatePourApi(formulaire.dateFin),

      motif: formulaire.motif.trim(),

      motifUrgence: estUrgente
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

      listePassagers: formulaire.listePassagers.trim()
        ? formulaire.listePassagers.trim()
        : null,

      typeVehiculeSouhaite: formulaire.typeVehiculeSouhaite
        ? formulaire.typeVehiculeSouhaite
        : null,

      besoinChauffeur: formulaire.besoinChauffeur,

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

      if (res.status === 401 || res.status === 403) {
        toast.error("Votre session a expiré");
        router.replace("/login");
        return;
      }

      if (!res.ok) {
        const message = await lireErreur(res);

        toast.error(
          message || "Impossible d'enregistrer la demande"
        );

        return;
      }

      toast.success(
        "La demande de véhicule a été transmise au Service Logistique"
      );

      setModalOuverte(false);
      setFormulaire(formulaireInitial);

      await chargerReservations();
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

        .ligne-demande:hover {
          background-color: #f9fafb;
        }

        .bouton-principal:hover:not(:disabled) {
          background-color: #b91c1c !important;
        }

        .bouton-secondaire:hover:not(:disabled) {
          background-color: #f9fafb !important;
        }

        .profil-header:hover {
          background-color: #f9fafb !important;
        }

        @media (max-width: 950px) {
          .stats-grid {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            ) !important;
          }

          .form-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 700px) {
          .header-marque-texte {
            display: none !important;
          }

          .header-profil-texte {
            display: none !important;
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

          .header-interieur {
            padding-left: 18px !important;
            padding-right: 18px !important;
          }
        }
      `}</style>

      {/* ===================================================
          HEADER
      =================================================== */}

      <HeaderChefDirection />

      {/* ===================================================
          PAGE
      =================================================== */}

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
            maxWidth: 1200,
            margin: "0 auto",
          }}
        >
          {/* =================================================
              ENTETE PAGE
          ================================================= */}

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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Car size={25} color="#1e293b" />

                <h2
                  style={{
                    color: "#1e293b",
                    margin: 0,
                  }}
                >
                  Espace Chef de Direction
                </h2>
              </div>

              <p
                style={{
                  margin: "7px 0 0 35px",
                  color: "#6b7280",
                  fontSize: 14,
                }}
              >
                Gestion de vos demandes de véhicules pour mission
              </p>
            </div>

            <button
              type="button"
              className="bouton-principal bouton-nouvelle"
              onClick={ouvrirModal}
              style={{
                border: "none",
                borderRadius: 8,
                backgroundColor: "#dc2626",
                color: "white",
                padding: "11px 17px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              <Plus size={18} />

              Nouvelle demande
            </button>
          </div>

          {/* =================================================
              STATISTIQUES
          ================================================= */}

          <div
            className="stats-grid"
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(4, minmax(0, 1fr))",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <StatCard
              titre="Mes demandes"
              valeur={chargement ? "…" : totalDemandes}
              icone={
                <FileText size={21} color="#2563eb" />
              }
            />

            <StatCard
              titre="En attente"
              valeur={chargement ? "…" : enAttente}
              icone={
                <Clock3 size={21} color="#d97706" />
              }
            />

            <StatCard
              titre="Validées"
              valeur={chargement ? "…" : validees}
              icone={
                <CheckCircle2 size={21} color="#16a34a" />
              }
            />

            <StatCard
              titre="Refusées"
              valeur={chargement ? "…" : refusees}
              icone={
                <XCircle size={21} color="#dc2626" />
              }
            />
          </div>

          {/* =================================================
              TITRE TABLEAU
          ================================================= */}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: 12,
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  color: "#1e293b",
                  fontSize: 18,
                }}
              >
                Mes demandes
              </h3>

              <p
                style={{
                  margin: "5px 0 0",
                  color: "#6b7280",
                  fontSize: 13,
                }}
              >
                Suivez ici les demandes transmises au Service
                Logistique.
              </p>
            </div>

            <button
              type="button"
              className="bouton-secondaire"
              onClick={chargerReservations}
              disabled={chargement}
              style={{
                border: "1px solid #d1d5db",
                backgroundColor: "white",
                color: "#374151",
                borderRadius: 8,
                padding: "9px 12px",
                display: "flex",
                alignItems: "center",
                gap: 7,
                cursor: chargement ? "not-allowed" : "pointer",
                opacity: chargement ? 0.6 : 1,
              }}
            >
              <RefreshCw size={15} />

              Actualiser
            </button>
          </div>

          {/* =================================================
              TABLEAU
          ================================================= */}

          <div
            style={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              overflowX: "auto",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "#f9fafb",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <th style={thStyle}>Référence</th>
                  <th style={thStyle}>Objet de la mission</th>
                  <th style={thStyle}>Destination</th>
                  <th style={thStyle}>Départ</th>
                  <th style={thStyle}>Passagers</th>
                  <th style={thStyle}>Véhicule</th>
                  <th style={thStyle}>Statut</th>
                </tr>
              </thead>

              <tbody>
                {chargement ? (
                  <tr>
                    <td colSpan={7} style={emptyStyle}>
                      Chargement des demandes...
                    </td>
                  </tr>
                ) : reservations.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={emptyStyle}>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <Car size={34} color="#9ca3af" />

                        <strong
                          style={{
                            color: "#374151",
                          }}
                        >
                          Aucune demande
                        </strong>

                        <span>
                          Vous n&apos;avez encore transmis aucune
                          demande de véhicule.
                        </span>

                        <button
                          type="button"
                          onClick={ouvrirModal}
                          style={{
                            border: "none",
                            background: "none",
                            color: "#dc2626",
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                        >
                          Créer une demande
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  reservations.map((reservation) => {
                    const styleStatut =
                      statutStyle[reservation.statut] || {
                        bg: "#f3f4f6",
                        text: "#374151",
                        label: reservation.statut,
                      };

                    return (
                      <tr
                        key={reservation.id}
                        className="ligne-demande"
                        style={{
                          borderBottom: "1px solid #f3f4f6",
                        }}
                      >
                        <td style={tdStyle}>
                          <div
                            style={{
                              fontWeight: 700,
                              color: "#111827",
                            }}
                          >
                            {`DMD-${String(
                              reservation.id
                            ).padStart(5, "0")}`}
                          </div>

                          {reservation.demandeUrgente && (
                            <div
                              style={{
                                marginTop: 6,
                              }}
                            >
                              <span
                                style={{
                                  backgroundColor: "#fee2e2",
                                  color: "#991b1b",
                                  padding: "3px 7px",
                                  borderRadius: 20,
                                  fontSize: 11,
                                  fontWeight: 700,
                                }}
                              >
                                Urgente
                              </span>
                            </div>
                          )}
                        </td>

                        <td style={tdStyle}>
                          <div
                            style={{
                              fontWeight: 600,
                              color: "#111827",
                              maxWidth: 260,
                            }}
                          >
                            {reservation.motif}
                          </div>

                          <div
                            style={{
                              marginTop: 4,
                              color: "#9ca3af",
                              fontSize: 12,
                            }}
                          >
                            Créée le{" "}
                            {formatDateHeure(
                              reservation.dateCreation
                            )}
                          </div>
                        </td>

                        <td style={tdStyle}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <MapPin size={14} color="#6b7280" />

                            {reservation.destination || "—"}
                          </div>
                        </td>

                        <td style={tdStyle}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              whiteSpace: "nowrap",
                            }}
                          >
                            <CalendarDays
                              size={14}
                              color="#6b7280"
                            />

                            {formatDateHeure(
                              reservation.dateDebut
                            )}
                          </div>
                        </td>

                        <td style={tdStyle}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <Users size={14} color="#6b7280" />

                            {reservation.nombrePassagers ?? "—"}
                          </div>
                        </td>

                        <td style={tdStyle}>
                          {reservation.vehicule ? (
                            <div>
                              <div
                                style={{
                                  fontWeight: 600,
                                  color: "#111827",
                                }}
                              >
                                {reservation.vehicule
                                  .immatriculation ||
                                  `Véhicule ${reservation.vehicule.id}`}
                              </div>

                              {(reservation.vehicule.marque ||
                                reservation.vehicule.modele) && (
                                <div
                                  style={{
                                    color: "#9ca3af",
                                    fontSize: 12,
                                    marginTop: 3,
                                  }}
                                >
                                  {[
                                    reservation.vehicule.marque,
                                    reservation.vehicule.modele,
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span
                              style={{
                                color: "#9ca3af",
                                fontSize: 12,
                              }}
                            >
                              Non affecté
                            </span>
                          )}
                        </td>

                        <td style={tdStyle}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              backgroundColor: styleStatut.bg,
                              color: styleStatut.text,
                              padding: "5px 10px",
                              borderRadius: 20,
                              fontSize: 12,
                              fontWeight: 600,
                              whiteSpace: "nowrap",
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

      {/* ===================================================
          MODAL
      =================================================== */}

      {modalOuverte && (
        <div
          className="modal-container"
          onMouseDown={fermerModal}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            backgroundColor: "rgba(15, 23, 42, 0.58)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <form
            className="modal-content"
            onSubmit={envoyerDemande}
            onMouseDown={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 920,
              maxHeight: "92vh",
              overflowY: "auto",
              backgroundColor: "white",
              borderRadius: 12,
              boxShadow: "0 24px 70px rgba(0,0,0,0.28)",
            }}
          >
            {/* HEADER MODAL */}

            <div
              style={{
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
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 9,
                    backgroundColor: "#fee2e2",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Car size={21} color="#dc2626" />
                </div>

                <div>
                  <h3
                    style={{
                      margin: 0,
                      color: "#1e293b",
                      fontSize: 18,
                    }}
                  >
                    Nouvelle demande de véhicule
                  </h3>

                  <p
                    style={{
                      margin: "4px 0 0",
                      color: "#6b7280",
                      fontSize: 13,
                    }}
                  >
                    Demande de véhicule pour mission
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={fermerModal}
                disabled={envoi}
                aria-label="Fermer"
                style={{
                  width: 36,
                  height: 36,
                  border: "none",
                  backgroundColor: "#f3f4f6",
                  borderRadius: 8,
                  cursor: envoi ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: envoi ? 0.5 : 1,
                }}
              >
                <X size={19} color="#4b5563" />
              </button>
            </div>

            {/* CONTENU MODAL */}

            <div style={{ padding: 22 }}>
              {/* 1 BENEFICIAIRE */}

              <BlocFormulaire
                numero="1"
                titre="Bénéficiaire de la mission"
                icone={
                  <UserRound size={18} color="#2563eb" />
                }
              >
                <div
                  className="form-grid"
                  style={gridDeuxColonnes}
                >
                  <Champ label="Nom" obligatoire>
                    <input
                      value={formulaire.demandeurNom}
                      onChange={(e) =>
                        modifierChamp(
                          "demandeurNom",
                          e.target.value
                        )
                      }
                      placeholder="Nom du bénéficiaire"
                      style={inputStyle}
                    />
                  </Champ>

                  <Champ label="Prénom" obligatoire>
                    <input
                      value={formulaire.demandeurPrenom}
                      onChange={(e) =>
                        modifierChamp(
                          "demandeurPrenom",
                          e.target.value
                        )
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

              {/* 2 MISSION */}

              <BlocFormulaire
                numero="2"
                titre="Informations sur la mission"
                icone={<MapPin size={18} color="#16a34a" />}
              >
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
                        modifierChamp(
                          "pointDepart",
                          e.target.value
                        )
                      }
                      placeholder="Ex. SPAT Toamasina"
                      style={inputStyle}
                    />
                  </Champ>

                  <Champ label="Destination" obligatoire>
                    <input
                      value={formulaire.destination}
                      onChange={(e) =>
                        modifierChamp(
                          "destination",
                          e.target.value
                        )
                      }
                      placeholder="Lieu de destination"
                      style={inputStyle}
                    />
                  </Champ>

                  <Champ
                    label="Date et heure de départ"
                    obligatoire
                  >
                    <input
                      type="datetime-local"
                      value={formulaire.dateDebut}
                      onChange={(e) =>
                        modifierChamp(
                          "dateDebut",
                          e.target.value
                        )
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
                        modifierChamp(
                          "dateFin",
                          e.target.value
                        )
                      }
                      style={inputStyle}
                    />
                  </Champ>
                </div>

                {/* URGENCE */}

                {estUrgente && formulaire.dateDebut && (
                  <div
                    style={{
                      marginTop: 17,
                      border: "1px solid #fecaca",
                      backgroundColor: "#fef2f2",
                      borderRadius: 9,
                      padding: 15,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                      }}
                    >
                      <AlertTriangle
                        size={20}
                        color="#dc2626"
                        style={{
                          marginTop: 1,
                          flexShrink: 0,
                        }}
                      />

                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#991b1b",
                          }}
                        >
                          Demande urgente
                        </div>

                        <p
                          style={{
                            margin: "4px 0 10px",
                            fontSize: 12,
                            lineHeight: 1.5,
                            color: "#b91c1c",
                          }}
                        >
                          Le départ est prévu à moins de 24 heures.
                          Une justification est obligatoire.
                        </p>

                        <Champ
                          label="Motif de l'urgence"
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
                            placeholder="Expliquez la raison de cette demande urgente..."
                            style={textareaStyle}
                          />
                        </Champ>
                      </div>
                    </div>
                  </div>
                )}
              </BlocFormulaire>

              {/* 3 TRANSPORT */}

              <BlocFormulaire
                numero="3"
                titre="Besoin de transport"
                icone={<Users size={18} color="#7c3aed" />}
              >
                <div
                  className="form-grid"
                  style={gridDeuxColonnes}
                >
                  <Champ
                    label="Nombre de passagers"
                    obligatoire
                  >
                    <input
                      type="number"
                      min={1}
                      value={formulaire.nombrePassagers}
                      onChange={(e) =>
                        modifierChamp(
                          "nombrePassagers",
                          e.target.value
                        )
                      }
                      style={inputStyle}
                    />
                  </Champ>

                  <Champ label="Type de véhicule souhaité">
                    <select
                      value={formulaire.typeVehiculeSouhaite}
                      onChange={(e) =>
                        modifierChamp(
                          "typeVehiculeSouhaite",
                          e.target.value
                        )
                      }
                      style={inputStyle}
                    >
                      <option value="">
                        Aucun type particulier
                      </option>

                      <option value="BERLINE">Berline</option>
                      <option value="4X4">4x4</option>

                      <option value="UTILITAIRE">
                        Utilitaire
                      </option>

                      <option value="MINIBUS">Minibus</option>
                      <option value="AUTRE">Autre</option>
                    </select>
                  </Champ>
                </div>

                <div style={{ marginTop: 16 }}>
                  <Champ label="Liste des passagers">
                    <textarea
                      value={formulaire.listePassagers}
                      onChange={(e) =>
                        modifierChamp(
                          "listePassagers",
                          e.target.value
                        )
                      }
                      rows={3}
                      placeholder="Ex. RAKOTO Jean, RASOA Marie..."
                      style={textareaStyle}
                    />
                  </Champ>
                </div>

                <div
                  style={{
                    marginTop: 17,
                    padding: "13px 14px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    backgroundColor: "#f9fafb",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formulaire.besoinChauffeur}
                      onChange={(e) =>
                        modifierChamp(
                          "besoinChauffeur",
                          e.target.checked
                        )
                      }
                      style={{
                        width: 18,
                        height: 18,
                        accentColor: "#dc2626",
                        cursor: "pointer",
                      }}
                    />

                    <div>
                      <div
                        style={{
                          color: "#374151",
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                      >
                        Besoin d&apos;un chauffeur
                      </div>

                      <div
                        style={{
                          color: "#6b7280",
                          fontSize: 12,
                          marginTop: 2,
                        }}
                      >
                        Cochez si un chauffeur doit être affecté
                        à la mission.
                      </div>
                    </div>
                  </label>
                </div>

                <div style={{ marginTop: 16 }}>
                  <Champ label="Observations / contraintes particulières">
                    <textarea
                      value={formulaire.observations}
                      onChange={(e) =>
                        modifierChamp(
                          "observations",
                          e.target.value
                        )
                      }
                      rows={3}
                      placeholder="Matériel à transporter, accès difficile, attente sur place..."
                      style={textareaStyle}
                    />
                  </Champ>
                </div>
              </BlocFormulaire>

              {/* INFO VEHICULE */}

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: 9,
                  padding: 14,
                }}
              >
                <Car
                  size={19}
                  color="#2563eb"
                  style={{
                    marginTop: 1,
                    flexShrink: 0,
                  }}
                />

                <div
                  style={{
                    color: "#1e40af",
                    fontSize: 13,
                    lineHeight: 1.55,
                  }}
                >
                  <strong>Affectation du véhicule</strong>

                  <br />

                  Le véhicule précis sera affecté par le Service
                  Logistique après vérification des disponibilités.
                </div>
              </div>
            </div>

            {/* FOOTER */}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                padding: "16px 22px",
                borderTop: "1px solid #e5e7eb",
                backgroundColor: "#f9fafb",
                position: "sticky",
                bottom: 0,
                zIndex: 10,
              }}
            >
              <button
                type="button"
                className="bouton-secondaire"
                onClick={fermerModal}
                disabled={envoi}
                style={{
                  border: "1px solid #d1d5db",
                  backgroundColor: "white",
                  color: "#374151",
                  padding: "10px 18px",
                  borderRadius: 8,
                  cursor: envoi ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  opacity: envoi ? 0.6 : 1,
                }}
              >
                Annuler
              </button>

              <button
                type="submit"
                className="bouton-principal"
                disabled={envoi}
                style={{
                  border: "none",
                  backgroundColor: "#dc2626",
                  color: "white",
                  padding: "10px 18px",
                  borderRadius: 8,
                  cursor: envoi ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  opacity: envoi ? 0.7 : 1,
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
                    Transmettre la demande
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
// HEADER
// =========================================================

function HeaderChefDirection() {
  const router = useRouter();

  const [menuOuvert, setMenuOuvert] = useState(false);

  const [profil, setProfil] = useState<ProfilUtilisateur>({
    matricule: "",
    nomComplet: "",
    role: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    try {
      const parties = token.split(".");

      if (parties.length !== 3) {
        return;
      }

      let payloadBase64 = parties[1]
        .replace(/-/g, "+")
        .replace(/_/g, "/");

      while (payloadBase64.length % 4 !== 0) {
        payloadBase64 += "=";
      }

      const payload = JSON.parse(atob(payloadBase64));

      let role = "";

      if (typeof payload.role === "string") {
        role = payload.role;
      } else if (typeof payload.authority === "string") {
        role = payload.authority;
      } else if (
        Array.isArray(payload.roles) &&
        payload.roles.length > 0
      ) {
        role = String(payload.roles[0]);
      }

      setProfil({
        matricule:
          payload.sub ||
          payload.matricule ||
          "",

        nomComplet:
          payload.nomComplet ||
          payload.name ||
          payload.nom ||
          "",

        role,
      });
    } catch (error) {
      console.error("Erreur lecture JWT :", error);
    }
  }, []);

  const deconnexion = () => {
    localStorage.removeItem("token");

    router.replace("/login");
  };

  return (
    <header
      style={{
        width: "100%",
        height: 66,
        backgroundColor: "white",
        borderBottom: "1px solid #e5e7eb",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        display: "flex",
        alignItems: "center",
        position: "relative",
        zIndex: 100,
      }}
    >
      <div
        className="header-interieur"
        style={{
          width: "100%",
          maxWidth: 1264,
          margin: "0 auto",
          padding: "0 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* GAUCHE */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <img
            src="/logo.png"
            alt="SPAT"
            style={{
              height: 43,
              maxWidth: 150,
              width: "auto",
              objectFit: "contain",
            }}
          />

          <div
            className="header-marque-texte"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 1,
                height: 30,
                backgroundColor: "#e5e7eb",
              }}
            />

            <div>
              <div
                style={{
                  color: "#1e293b",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Gestion de la flotte
              </div>

              <div
                style={{
                  color: "#9ca3af",
                  fontSize: 11,
                  marginTop: 2,
                }}
              >
                Portail SPAT
              </div>
            </div>
          </div>
        </div>

        {/* DROITE */}

        <div style={{ position: "relative" }}>
          <button
            type="button"
            className="profil-header"
            onClick={() =>
              setMenuOuvert((ancien) => !ancien)
            }
            style={{
              border: "none",
              backgroundColor: "transparent",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "6px 8px",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            <div
              className="header-profil-texte"
              style={{
                textAlign: "right",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#1e293b",
                }}
              >
                {profil.nomComplet ||
                  profil.matricule ||
                  "Utilisateur SPAT"}
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: "#6b7280",
                  marginTop: 2,
                }}
              >
                {formatRole(profil.role)}
              </div>
            </div>

            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                overflow: "hidden",
                border: "2px solid #e5e7eb",
                backgroundColor: "#f3f4f6",
              }}
            >
              <img
                src="/icon.png"
                alt="Profil"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>

            <ChevronDown
              size={15}
              color="#6b7280"
              style={{
                transform: menuOuvert
                  ? "rotate(180deg)"
                  : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            />
          </button>

          {/* MENU */}

          {menuOuvert && (
            <div
              style={{
                position: "absolute",
                top: 54,
                right: 0,
                width: 270,
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                boxShadow:
                  "0 12px 30px rgba(15,23,42,0.15)",
                overflow: "hidden",
                zIndex: 500,
              }}
            >
              {/* IDENTITE */}

              <div
                style={{
                  padding: 16,
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 11,
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      overflow: "hidden",
                      backgroundColor: "#f3f4f6",
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src="/icon.png"
                      alt="Profil"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#111827",
                      }}
                    >
                      {profil.nomComplet ||
                        "Utilisateur SPAT"}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        marginTop: 3,
                      }}
                    >
                      Matricule :{" "}
                      {profil.matricule || "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* PROFIL */}

              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                  }}
                >
                  <UserRound
                    size={16}
                    color="#6b7280"
                  />

                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#9ca3af",
                      }}
                    >
                      Profil
                    </div>

                    <div
                      style={{
                        marginTop: 2,
                        fontSize: 13,
                        color: "#374151",
                        fontWeight: 600,
                      }}
                    >
                      {formatRole(profil.role)}
                    </div>
                  </div>
                </div>
              </div>

              {/* DECONNEXION */}

              <div style={{ padding: 7 }}>
                <button
                  type="button"
                  onClick={deconnexion}
                  style={{
                    width: "100%",
                    border: "none",
                    backgroundColor: "transparent",
                    padding: "10px 11px",
                    borderRadius: 7,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    color: "#dc2626",
                    fontWeight: 600,
                    fontSize: 13,
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "#fef2f2";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "transparent";
                  }}
                >
                  <LogOut size={17} />

                  Se déconnecter
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// =========================================================
// STAT CARD
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
    <div
      style={{
        backgroundColor: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: 18,
        boxShadow: "0 2px 5px rgba(0,0,0,0.03)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <span
          style={{
            color: "#6b7280",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {titre}
        </span>

        <div
          style={{
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f9fafb",
            borderRadius: 8,
          }}
        >
          {icone}
        </div>
      </div>

      <div
        style={{
          color: "#1e293b",
          fontSize: 28,
          lineHeight: 1,
          fontWeight: 700,
        }}
      >
        {valeur}
      </div>
    </div>
  );
}

// =========================================================
// BLOC FORMULAIRE
// =========================================================

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
    <section
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        marginBottom: 18,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          backgroundColor: "#f9fafb",
          padding: "13px 16px",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div
          style={{
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
          }}
        >
          {numero}
        </div>

        {icone}

        <h4
          style={{
            margin: 0,
            color: "#1e293b",
            fontSize: 15,
          }}
        >
          {titre}
        </h4>
      </div>

      <div style={{ padding: 17 }}>
        {children}
      </div>
    </section>
  );
}

// =========================================================
// CHAMP
// =========================================================

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
      <div
        style={{
          marginBottom: 6,
          color: "#374151",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {label}

        {obligatoire && (
          <span
            style={{
              color: "#dc2626",
              marginLeft: 3,
            }}
          >
            *
          </span>
        )}
      </div>

      {children}
    </label>
  );
}

// =========================================================
// ROLE
// =========================================================

function formatRole(role?: string) {
  if (!role) {
    return "Chef de Direction";
  }

  const roles: Record<string, string> = {
    CHEF_DIRECTION: "Chef de Direction",
    DIRECTEUR_DFP: "Directeur DFP",
    CHEF_SERVICE_LOGISTIQUE: "Chef Service Logistique",
    CHEF_SERVICE: "Chef de Service",
    CHEF_DEPARTEMENT: "Chef de Département",
    CHEF_DGAL: "Chef DGAL",
    AGENT_FLOTTE: "Agent Flotte",
    CHAUFFEUR: "Chauffeur",
    MECANICIEN_DID: "Mécanicien DID",
  };

  return (
    roles[role] ||
    role
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (lettre) =>
        lettre.toUpperCase()
      )
  );
}

// =========================================================
// DATE API
// =========================================================

function convertirDatePourApi(valeur: string) {
  if (!valeur) {
    return valeur;
  }

  if (valeur.length === 16) {
    return `${valeur}:00`;
  }

  return valeur;
}

// =========================================================
// FORMAT DATE
// =========================================================

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

// =========================================================
// ERREURS API
// =========================================================

async function lireErreur(res: Response) {
  try {
    const contentType = res.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      const data = await res.json();

      if (typeof data === "string") {
        return data;
      }

      return (
        data?.message ||
        data?.error ||
        JSON.stringify(data)
      );
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

const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: 82,
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "12px 16px",
  fontSize: 13,
  color: "#6b7280",
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const tdStyle: CSSProperties = {
  padding: "13px 16px",
  fontSize: 14,
  color: "#374151",
  verticalAlign: "middle",
};

const emptyStyle: CSSProperties = {
  ...tdStyle,
  padding: 42,
  textAlign: "center",
  color: "#6b7280",
};