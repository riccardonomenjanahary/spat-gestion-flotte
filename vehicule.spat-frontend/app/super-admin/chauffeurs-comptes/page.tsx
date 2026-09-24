"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  Copy,
  KeyRound,
  Pencil,
  Search,
  Trash2,
  UserPlus,
  UserRound,
  XCircle,
} from "lucide-react";

import RoleGuard from "@/components/RoleGuard";
import EnTete from "@/components/EnTete";
import { ROLES } from "@/app/lib/roles";

interface ChauffeurCompte {
  chauffeurId: number;
  matricule?: string | null;
  nom?: string | null;
  prenom?: string | null;
  telephone?: string | null;
  email?: string | null;
  numeroPermis?: string | null;
  affectationService?: string | null;
  statutChauffeur?: string | null;

  compteExiste: boolean;
  matriculeDejaUtilise: boolean;
  roleExistant?: string | null;

  utilisateurId?: number | null;
  compteActif?: boolean | null;
}

interface MotDePasseGenere {
  message: string;
  utilisateurId: number;
  chauffeurId: number;
  nomComplet: string;
  matricule: string;
  motDePasse: string;
}

interface FormulaireChauffeur {
  matricule: string;
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  numeroPermis: string;
  affectationService: string;
}

const formulaireChauffeurVide: FormulaireChauffeur = {
  matricule: "",
  nom: "",
  prenom: "",
  telephone: "",
  email: "",
  numeroPermis: "",
  affectationService: "",
};

export default function ComptesChauffeursSuperAdminPage() {
  return (
    <RoleGuard role={ROLES.SUPER_ADMIN}>
      <ComptesChauffeursContent />
    </RoleGuard>
  );
}

function ComptesChauffeursContent() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [chauffeurs, setChauffeurs] = useState<ChauffeurCompte[]>([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState("");
  const [actionEnCours, setActionEnCours] = useState<number | null>(null);

  const [confirmationCreation, setConfirmationCreation] =
    useState<ChauffeurCompte | null>(null);

  const [confirmationReset, setConfirmationReset] =
    useState<ChauffeurCompte | null>(null);

  const [resultatMotDePasse, setResultatMotDePasse] =
    useState<MotDePasseGenere | null>(null);

  const [formChauffeurOuvert, setFormChauffeurOuvert] =
    useState(false);

  const [chauffeurEnEdition, setChauffeurEnEdition] =
    useState<ChauffeurCompte | null>(null);

  const [formChauffeur, setFormChauffeur] =
    useState<FormulaireChauffeur>(formulaireChauffeurVide);

  const [enregistrementChauffeur, setEnregistrementChauffeur] =
    useState(false);

  const getToken = () => {
    if (typeof window === "undefined") {
      return null;
    }

    return localStorage.getItem("token");
  };

  const lireErreur = async (res: Response) => {
    const texte = await res.text();

    if (!texte) {
      return "Une erreur est survenue.";
    }

    try {
      const json = JSON.parse(texte);
      return json.message || texte;
    } catch {
      return texte;
    }
  };

  const charger = async () => {
    if (!API) {
      toast.error("NEXT_PUBLIC_API_URL n'est pas configurée");
      setChargement(false);
      return;
    }

    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    setChargement(true);

    try {
      const res = await fetch(
        `${API}/admin/chauffeur-comptes`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (res.status === 401) {
        toast.error("Votre session a expiré");
        router.replace("/login");
        return;
      }

      if (res.status === 403) {
        toast.error(
          "Vous n'êtes pas autorisé à consulter les comptes chauffeurs."
        );
        return;
      }

      if (!res.ok) {
        throw new Error(
          await lireErreur(res)
        );
      }

      const data: ChauffeurCompte[] =
        await res.json();

      setChauffeurs(data);
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de charger les chauffeurs."
      );
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    charger();
  }, []);

  const chauffeursFiltres = useMemo(() => {
    const terme =
      recherche.trim().toLowerCase();

    if (!terme) {
      return chauffeurs;
    }

    return chauffeurs.filter((chauffeur) => {
      const nom =
        `${chauffeur.prenom || ""} ${chauffeur.nom || ""}`
          .trim()
          .toLowerCase();

      return (
        nom.includes(terme) ||
        (chauffeur.matricule || "")
          .toLowerCase()
          .includes(terme) ||
        (chauffeur.email || "")
          .toLowerCase()
          .includes(terme) ||
        (chauffeur.affectationService || "")
          .toLowerCase()
          .includes(terme)
      );
    });
  }, [chauffeurs, recherche]);

  const creerCompte = async (
    chauffeur: ChauffeurCompte
  ) => {
    if (!API) {
      toast.error("NEXT_PUBLIC_API_URL n'est pas configurée");
      return;
    }

    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    setActionEnCours(
      chauffeur.chauffeurId
    );

    try {
      const res = await fetch(
        `${API}/admin/chauffeur-comptes/${chauffeur.chauffeurId}/creer`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (res.status === 401) {
        toast.error("Votre session a expiré");
        router.replace("/login");
        return;
      }

      if (res.status === 403) {
        toast.error(
          "Le Super Admin n'est pas autorisé à créer ce compte."
        );
        return;
      }

      if (!res.ok) {
        toast.error(
          await lireErreur(res)
        );
        return;
      }

      const data: MotDePasseGenere =
        await res.json();

      setConfirmationCreation(null);
      setResultatMotDePasse(data);

      await charger();
    } catch (error) {
      console.error(error);
      toast.error("Impossible de contacter le serveur.");
    } finally {
      setActionEnCours(null);
    }
  };

  const genererNouveauMotDePasse = async (
    chauffeur: ChauffeurCompte
  ) => {
    if (!API) {
      toast.error("NEXT_PUBLIC_API_URL n'est pas configurée");
      return;
    }

    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    setActionEnCours(
      chauffeur.chauffeurId
    );

    try {
      const res = await fetch(
        `${API}/admin/chauffeur-comptes/${chauffeur.chauffeurId}/nouveau-mot-de-passe`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (res.status === 401) {
        toast.error("Votre session a expiré");
        router.replace("/login");
        return;
      }

      if (res.status === 403) {
        toast.error(
          "Le Super Admin n'est pas autorisé à générer ce mot de passe."
        );
        return;
      }

      if (!res.ok) {
        toast.error(
          await lireErreur(res)
        );
        return;
      }

      const data: MotDePasseGenere =
        await res.json();

      setConfirmationReset(null);
      setResultatMotDePasse(data);

      await charger();
    } catch (error) {
      console.error(error);
      toast.error("Impossible de contacter le serveur.");
    } finally {
      setActionEnCours(null);
    }
  };

  // =========================================================
  // CREATION / MODIFICATION D'UN CHAUFFEUR
  // =========================================================

  const ouvrirNouveauChauffeur = () => {
    setChauffeurEnEdition(null);
    setFormChauffeur(formulaireChauffeurVide);
    setFormChauffeurOuvert(true);
  };

  const ouvrirEditionChauffeur = (
    chauffeur: ChauffeurCompte
  ) => {
    setChauffeurEnEdition(chauffeur);

    setFormChauffeur({
      matricule: chauffeur.matricule || "",
      nom: chauffeur.nom || "",
      prenom: chauffeur.prenom || "",
      telephone: chauffeur.telephone || "",
      email: chauffeur.email || "",
      numeroPermis: chauffeur.numeroPermis || "",
      affectationService:
        chauffeur.affectationService || "",
    });

    setFormChauffeurOuvert(true);
  };

  const fermerFormulaireChauffeur = () => {
    if (enregistrementChauffeur) {
      return;
    }

    setFormChauffeurOuvert(false);
    setChauffeurEnEdition(null);
    setFormChauffeur(formulaireChauffeurVide);
  };

  const modifierChampChauffeur = (
    champ: keyof FormulaireChauffeur,
    valeur: string
  ) => {
    setFormChauffeur((ancien) => ({
      ...ancien,
      [champ]: valeur,
    }));
  };

  const enregistrerChauffeur = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!API) {
      toast.error(
        "NEXT_PUBLIC_API_URL n'est pas configurée"
      );
      return;
    }

    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    const matricule =
      formChauffeur.matricule.trim();

    const nom =
      formChauffeur.nom.trim();

    const prenom =
      formChauffeur.prenom.trim();

    const numeroPermis =
      formChauffeur.numeroPermis.trim();

    if (!matricule) {
      toast.error(
        "Le matricule du chauffeur est obligatoire."
      );
      return;
    }

    if (!nom) {
      toast.error(
        "Le nom du chauffeur est obligatoire."
      );
      return;
    }

    if (!prenom) {
      toast.error(
        "Le prénom du chauffeur est obligatoire."
      );
      return;
    }

    if (!numeroPermis) {
      toast.error(
        "Le numéro de permis est obligatoire."
      );
      return;
    }

    const body = {
      matricule,
      nom,
      prenom,
      telephone:
        formChauffeur.telephone.trim() || null,
      email:
        formChauffeur.email.trim() || null,
      numeroPermis,
      affectationService:
        formChauffeur.affectationService.trim() || null,

      /*
       * Aucun champ "statut" n'est présenté dans le formulaire.
       * A la création, le chauffeur est disponible par défaut.
       * En modification, on conserve son statut opérationnel existant.
       */
      statut:
        chauffeurEnEdition?.statutChauffeur ||
        "DISPONIBLE",
    };

    const url =
      chauffeurEnEdition
        ? `${API}/chauffeurs/${chauffeurEnEdition.chauffeurId}`
        : `${API}/chauffeurs`;

    setEnregistrementChauffeur(true);

    try {
      const res = await fetch(
        url,
        {
          method:
            chauffeurEnEdition
              ? "PUT"
              : "POST",

          headers: {
            Authorization:
              `Bearer ${token}`,
            "Content-Type":
              "application/json",
            Accept:
              "application/json",
          },

          body:
            JSON.stringify(body),
        }
      );

      if (res.status === 401) {
        toast.error(
          "Votre session a expiré"
        );
        router.replace("/login");
        return;
      }

      if (res.status === 403) {
        toast.error(
          "Le Super Admin n'est pas autorisé à gérer les chauffeurs."
        );
        return;
      }

      if (!res.ok) {
        toast.error(
          await lireErreur(res)
        );
        return;
      }

      toast.success(
        chauffeurEnEdition
          ? "Chauffeur modifié avec succès."
          : "Nouveau chauffeur ajouté."
      );

      setFormChauffeurOuvert(false);
      setChauffeurEnEdition(null);
      setFormChauffeur(
        formulaireChauffeurVide
      );

      await charger();
    } catch (error) {
      console.error(error);

      toast.error(
        "Impossible de contacter le serveur."
      );
    } finally {
      setEnregistrementChauffeur(false);
    }
  };

  // =========================================================
  // SUPPRESSION D'UN CHAUFFEUR
  // =========================================================

  const supprimerChauffeur = (
    chauffeur: ChauffeurCompte
  ) => {
    const nom =
      `${chauffeur.prenom || ""} ${chauffeur.nom || ""}`
        .trim() ||
      chauffeur.matricule ||
      `chauffeur #${chauffeur.chauffeurId}`;

    toast(
      `Supprimer ${nom} ?`,
      {
        description:
          "Cette action supprime la fiche chauffeur. Le backend refusera la suppression si des données liées doivent être conservées.",

        duration: 8000,

        action: {
          label: "Supprimer",

          onClick: async () => {
            if (!API) {
              toast.error(
                "NEXT_PUBLIC_API_URL n'est pas configurée"
              );
              return;
            }

            const token =
              getToken();

            if (!token) {
              router.replace(
                "/login"
              );
              return;
            }

            try {
              const res =
                await fetch(
                  `${API}/chauffeurs/${chauffeur.chauffeurId}`,
                  {
                    method:
                      "DELETE",

                    headers: {
                      Authorization:
                        `Bearer ${token}`,
                      Accept:
                        "application/json",
                    },
                  }
                );

              if (
                res.status === 401
              ) {
                toast.error(
                  "Votre session a expiré"
                );
                router.replace(
                  "/login"
                );
                return;
              }

              if (
                res.status === 403
              ) {
                toast.error(
                  "Le Super Admin n'est pas autorisé à supprimer ce chauffeur."
                );
                return;
              }

              if (!res.ok) {
                toast.error(
                  "Échec de la suppression",
                  {
                    description:
                      await lireErreur(
                        res
                      ),
                  }
                );
                return;
              }

              toast.success(
                "Chauffeur supprimé."
              );

              await charger();
            } catch (error) {
              console.error(
                error
              );

              toast.error(
                "Impossible de contacter le serveur."
              );
            }
          },
        },

        cancel: {
          label: "Annuler",
          onClick: () => {},
        },
      }
    );
  };

  const copierIdentifiants = async () => {
    if (!resultatMotDePasse) {
      return;
    }

    const texte =
      `Matricule : ${resultatMotDePasse.matricule}\n`
      + `Mot de passe : ${resultatMotDePasse.motDePasse}`;

    try {
      await navigator.clipboard.writeText(
        texte
      );

      toast.success(
        "Identifiants copiés."
      );
    } catch {
      toast.error(
        "Copie impossible. Sélectionnez le mot de passe manuellement."
      );
    }
  };

  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        .ligne-chauffeur:hover {
          background: #f9fafb;
        }

        @media (max-width: 850px) {
          .chauffeur-compte-header {
            flex-direction: column;
            align-items: flex-start !important;
          }
        }

        @media (max-width: 650px) {
          .chauffeur-compte-header > div:last-child {
            width: 100%;
          }
        }
      `}</style>

      <EnTete afficherNotifications={false} afficherProfil={false} />

      <main style={pageStyle}>
        <div style={containerStyle}>
          <header
            className="chauffeur-compte-header"
            style={headerStyle}
          >
            <div>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/super-admin/utilisateurs"
                  )
                }
                style={retourButton}
              >
                ← Retour
              </button>

              <h1 style={titleStyle}>
                Comptes des chauffeurs
              </h1>

              
            </div>

            <div style={headerActionsStyle}>
              <div style={resumeStyle}>
                <UserRound size={20} />

                <div>
                  <div style={resumeValueStyle}>
                    {
                      chauffeurs.filter(
                        (c) => c.compteExiste
                      ).length
                    }
                    {" / "}
                    {chauffeurs.length}
                  </div>

                  <div style={resumeLabelStyle}>
                    comptes créés
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={ouvrirNouveauChauffeur}
                style={nouveauChauffeurButton}
              >
                <UserPlus size={17} />
                Nouveau chauffeur
              </button>
            </div>
          </header>

          

          <div style={searchWrapStyle}>
            <Search
              size={16}
              style={searchIconStyle}
            />

            <input
              value={recherche}
              onChange={(e) =>
                setRecherche(e.target.value)
              }
              placeholder="Rechercher par nom, matricule, email ou service..."
              style={searchInputStyle}
            />
          </div>

          <section style={cardStyle}>
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={headRowStyle}>
                    <th style={thStyle}>
                      Chauffeur
                    </th>

                    <th style={thStyle}>
                      Matricule
                    </th>

                    <th style={thStyle}>
                      Email
                    </th>

                    <th style={thStyle}>
                      Service
                    </th>

                    <th style={thStyle}>
                      Compte portail
                    </th>

                    <th
                      style={{
                        ...thStyle,
                        textAlign: "center",
                        minWidth: 190,
                      }}
                    >
                      Accès portail
                    </th>

                    <th
                      style={{
                        ...thStyle,
                        textAlign: "center",
                        minWidth: 100,
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {chargement ? (
                    <tr>
                      <td
                        colSpan={7}
                        style={emptyStyle}
                      >
                        Chargement...
                      </td>
                    </tr>
                  ) : chauffeursFiltres.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        style={emptyStyle}
                      >
                        Aucun chauffeur trouvé.
                      </td>
                    </tr>
                  ) : (
                    chauffeursFiltres.map(
                      (chauffeur) => {
                        const nom =
                          `${chauffeur.prenom || ""} ${chauffeur.nom || ""}`
                            .trim() || "—";

                        const enCours =
                          actionEnCours ===
                          chauffeur.chauffeurId;

                        return (
                          <tr
                            key={
                              chauffeur.chauffeurId
                            }
                            className="ligne-chauffeur"
                            style={bodyRowStyle}
                          >
                            <td style={tdStyle}>
                              <strong
                                style={{
                                  color:
                                    "#111827",
                                }}
                              >
                                {nom}
                              </strong>

                              {chauffeur.numeroPermis && (
                                <div
                                  style={
                                    secondaryStyle
                                  }
                                >
                                  Permis :{" "}
                                  {
                                    chauffeur.numeroPermis
                                  }
                                </div>
                              )}
                            </td>

                            <td style={tdStyle}>
                              {chauffeur.matricule ||
                                "—"}
                            </td>

                            <td style={tdStyle}>
                              {chauffeur.email ||
                                "—"}
                            </td>

                            <td style={tdStyle}>
                              {
                                chauffeur.affectationService ||
                                "—"
                              }
                            </td>

                            <td style={tdStyle}>
                              {chauffeur.compteExiste ? (
                                <span
                                  style={
                                    badgeActif
                                  }
                                >
                                  <CheckCircle2
                                    size={13}
                                  />
                                  Compte créé
                                </span>
                              ) : chauffeur.matriculeDejaUtilise ? (
                                <div>
                                  <span
                                    style={
                                      badgeConflit
                                    }
                                  >
                                    <XCircle
                                      size={13}
                                    />
                                    Matricule déjà
                                    utilisé
                                  </span>

                                  <div
                                    style={
                                      secondaryStyle
                                    }
                                  >
                                    Rôle :{" "}
                                    {
                                      chauffeur.roleExistant
                                    }
                                  </div>
                                </div>
                              ) : (
                                <span
                                  style={
                                    badgeAbsent
                                  }
                                >
                                  Aucun compte
                                </span>
                              )}
                            </td>

                            <td
                              style={{
                                ...tdStyle,
                                textAlign:
                                  "center",
                              }}
                            >
                              {!chauffeur.matricule ? (
                                <span
                                  style={{
                                    color:
                                      "#dc2626",
                                    fontSize: 12,
                                  }}
                                >
                                  Matricule manquant
                                </span>
                              ) : chauffeur.matriculeDejaUtilise ? (
                                <span
                                  style={{
                                    color:
                                      "#92400e",
                                    fontSize: 12,
                                  }}
                                >
                                  Vérifier le compte
                                  existant
                                </span>
                              ) : chauffeur.compteExiste ? (
                                <button
                                  type="button"
                                  disabled={
                                    enCours
                                  }
                                  onClick={() =>
                                    setConfirmationReset(
                                      chauffeur
                                    )
                                  }
                                  style={{
                                    ...actionButton,
                                    backgroundColor:
                                      "#fef3c7",
                                    color:
                                      "#92400e",
                                    border:
                                      "1px solid #fde68a",
                                    opacity:
                                      enCours
                                        ? 0.6
                                        : 1,
                                  }}
                                >
                                  <KeyRound
                                    size={15}
                                  />
                                  Nouveau mot de passe
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={
                                    enCours
                                  }
                                  onClick={() =>
                                    setConfirmationCreation(
                                      chauffeur
                                    )
                                  }
                                  style={{
                                    ...actionButton,
                                    backgroundColor:
                                      "#dcfce7",
                                    color:
                                      "#166534",
                                    border:
                                      "1px solid #bbf7d0",
                                    opacity:
                                      enCours
                                        ? 0.6
                                        : 1,
                                  }}
                                >
                                  <UserPlus
                                    size={15}
                                  />
                                  Créer le compte
                                </button>
                              )}
                            </td>

                            <td
                              style={{
                                ...tdStyle,
                                textAlign: "center",
                              }}
                            >
                              <div style={iconActionsWrapStyle}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    ouvrirEditionChauffeur(
                                      chauffeur
                                    )
                                  }
                                  style={iconEditButton}
                                  title="Modifier le chauffeur"
                                  aria-label={`Modifier ${nom}`}
                                >
                                  <Pencil size={15} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    supprimerChauffeur(
                                      chauffeur
                                    )
                                  }
                                  style={iconDeleteButton}
                                  title="Supprimer le chauffeur"
                                  aria-label={`Supprimer ${nom}`}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {formChauffeurOuvert && (
        <div
          style={overlayStyle}
          onMouseDown={
            fermerFormulaireChauffeur
          }
        >
          <form
            onSubmit={
              enregistrerChauffeur
            }
            onMouseDown={(e) =>
              e.stopPropagation()
            }
            style={{
              ...modalStyle,
              maxWidth: 720,
            }}
          >
            <div style={driverModalHeaderStyle}>
              <div>
                <h2 style={modalTitleStyle}>
                  {chauffeurEnEdition
                    ? "Modifier le chauffeur"
                    : "Nouveau chauffeur"}
                </h2>

                <p
                  style={{
                    ...modalTextStyle,
                    margin: 0,
                  }}
                >
                  Renseignez les informations de la fiche chauffeur.
                  La création du compte portail reste une action séparée.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  fermerFormulaireChauffeur
                }
                disabled={
                  enregistrementChauffeur
                }
                style={modalCloseIconButton}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <div style={driverFormGridStyle}>
              <label style={driverFieldStyle}>
                <span style={driverLabelStyle}>
                  Matricule *
                </span>

                <input
                  value={
                    formChauffeur.matricule
                  }
                  onChange={(e) =>
                    modifierChampChauffeur(
                      "matricule",
                      e.target.value
                    )
                  }
                  placeholder="Ex. SPAT00125"
                  required
                  style={driverInputStyle}
                />
              </label>

              <label style={driverFieldStyle}>
                <span style={driverLabelStyle}>
                  N° de permis *
                </span>

                <input
                  value={
                    formChauffeur.numeroPermis
                  }
                  onChange={(e) =>
                    modifierChampChauffeur(
                      "numeroPermis",
                      e.target.value
                    )
                  }
                  placeholder="Numéro du permis"
                  required
                  style={driverInputStyle}
                />
              </label>

              <label style={driverFieldStyle}>
                <span style={driverLabelStyle}>
                  Nom *
                </span>

                <input
                  value={
                    formChauffeur.nom
                  }
                  onChange={(e) =>
                    modifierChampChauffeur(
                      "nom",
                      e.target.value
                    )
                  }
                  placeholder="Nom"
                  required
                  style={driverInputStyle}
                />
              </label>

              <label style={driverFieldStyle}>
                <span style={driverLabelStyle}>
                  Prénom *
                </span>

                <input
                  value={
                    formChauffeur.prenom
                  }
                  onChange={(e) =>
                    modifierChampChauffeur(
                      "prenom",
                      e.target.value
                    )
                  }
                  placeholder="Prénom"
                  required
                  style={driverInputStyle}
                />
              </label>

              <label style={driverFieldStyle}>
                <span style={driverLabelStyle}>
                  Téléphone
                </span>

                <input
                  type="tel"
                  value={
                    formChauffeur.telephone
                  }
                  onChange={(e) =>
                    modifierChampChauffeur(
                      "telephone",
                      e.target.value
                    )
                  }
                  placeholder="Numéro de téléphone"
                  style={driverInputStyle}
                />
              </label>

              <label style={driverFieldStyle}>
                <span style={driverLabelStyle}>
                  Email
                </span>

                <input
                  type="email"
                  value={
                    formChauffeur.email
                  }
                  onChange={(e) =>
                    modifierChampChauffeur(
                      "email",
                      e.target.value
                    )
                  }
                  placeholder="prenom.nom@spat.mg"
                  style={driverInputStyle}
                />
              </label>

              <label
                style={{
                  ...driverFieldStyle,
                  gridColumn: "1 / -1",
                }}
              >
                <span style={driverLabelStyle}>
                  Service d'affectation
                </span>

                <input
                  value={
                    formChauffeur.affectationService
                  }
                  onChange={(e) =>
                    modifierChampChauffeur(
                      "affectationService",
                      e.target.value
                    )
                  }
                  placeholder="Ex. Service Logistique"
                  style={driverInputStyle}
                />
              </label>
            </div>

            <div style={modalActionsStyle}>
              <button
                type="button"
                onClick={
                  fermerFormulaireChauffeur
                }
                disabled={
                  enregistrementChauffeur
                }
                style={secondaryButton}
              >
                Annuler
              </button>

              <button
                type="submit"
                disabled={
                  enregistrementChauffeur
                }
                style={{
                  ...primaryButton,
                  opacity:
                    enregistrementChauffeur
                      ? 0.65
                      : 1,
                  cursor:
                    enregistrementChauffeur
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {enregistrementChauffeur
                  ? "Enregistrement..."
                  : chauffeurEnEdition
                    ? "Enregistrer les modifications"
                    : "Ajouter le chauffeur"}
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmationCreation && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={modalTitleStyle}>
              Créer le compte chauffeur
            </h2>

            <p style={modalTextStyle}>
              Le système va créer un compte
              <strong> CHAUFFEUR </strong>
              pour{" "}
              <strong>
                {`${confirmationCreation.prenom || ""} ${confirmationCreation.nom || ""}`.trim()}
              </strong>
              .
            </p>

            <div style={identityBoxStyle}>
              <div>
                <strong>Matricule :</strong>{" "}
                {confirmationCreation.matricule}
              </div>

              <div style={{ marginTop: 7 }}>
                <strong>
                  Mot de passe :
                </strong>{" "}
                généré automatiquement
              </div>
            </div>

            <p style={warningStyle}>
              Après création, le mot de passe sera
              affiché une seule fois au Super Admin.
            </p>

            <div style={modalActionsStyle}>
              <button
                type="button"
                onClick={() =>
                  setConfirmationCreation(null)
                }
                style={secondaryButton}
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={
                  actionEnCours ===
                  confirmationCreation.chauffeurId
                }
                onClick={() =>
                  creerCompte(
                    confirmationCreation
                  )
                }
                style={primaryButton}
              >
                Créer le compte
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmationReset && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={modalTitleStyle}>
              Générer un nouveau mot de passe
            </h2>

            <p style={modalTextStyle}>
              Chauffeur :{" "}
              <strong>
                {`${confirmationReset.prenom || ""} ${confirmationReset.nom || ""}`.trim()}
              </strong>
            </p>

            <div style={identityBoxStyle}>
              <strong>
                Matricule :
              </strong>{" "}
              {confirmationReset.matricule}
            </div>

            <p style={warningStyle}>
              L'ancien mot de passe cessera
              immédiatement de fonctionner. Le
              nouveau restera valable jusqu'à une
              nouvelle régénération.
            </p>

            <div style={modalActionsStyle}>
              <button
                type="button"
                onClick={() =>
                  setConfirmationReset(null)
                }
                style={secondaryButton}
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={
                  actionEnCours ===
                  confirmationReset.chauffeurId
                }
                onClick={() =>
                  genererNouveauMotDePasse(
                    confirmationReset
                  )
                }
                style={primaryButton}
              >
                Générer
              </button>
            </div>
          </div>
        </div>
      )}

      {resultatMotDePasse && (
        <div style={overlayStyle}>
          <div
            style={{
              ...modalStyle,
              maxWidth: 520,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 14,
              }}
            >
              <CheckCircle2
                size={24}
                color="#16a34a"
              />

              <h2
                style={{
                  ...modalTitleStyle,
                  margin: 0,
                }}
              >
                Identifiants du chauffeur
              </h2>
            </div>

            <p style={modalTextStyle}>
              {resultatMotDePasse.message}
            </p>

            <div style={credentialBoxStyle}>
              <div
                style={
                  credentialLabelStyle
                }
              >
                Chauffeur
              </div>

              <div
                style={
                  credentialValueStyle
                }
              >
                {
                  resultatMotDePasse.nomComplet
                }
              </div>

              <div
                style={{
                  ...credentialLabelStyle,
                  marginTop: 14,
                }}
              >
                Matricule
              </div>

              <div
                style={
                  credentialValueStyle
                }
              >
                {
                  resultatMotDePasse.matricule
                }
              </div>

              <div
                style={{
                  ...credentialLabelStyle,
                  marginTop: 14,
                }}
              >
                Mot de passe
              </div>

              <div style={passwordStyle}>
                {
                  resultatMotDePasse.motDePasse
                }
              </div>
            </div>

            <div style={importantStyle}>
              Notez ou communiquez ce mot de passe
              au chauffeur avant de fermer cette
              fenêtre. Il n'est pas conservé en
              clair dans la base.
            </div>

            <div style={modalActionsStyle}>
              <button
                type="button"
                onClick={
                  copierIdentifiants
                }
                style={{
                  ...secondaryButton,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <Copy size={15} />
                Copier
              </button>

              <button
                type="button"
                onClick={() =>
                  setResultatMotDePasse(null)
                }
                style={primaryButton}
              >
                J'ai noté le mot de passe
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  backgroundColor: "#f3f4f6",
  padding: 32,
};

const containerStyle: CSSProperties = {
  maxWidth: 1250,
  margin: "0 auto",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 20,
  marginBottom: 18,
};

const retourButton: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#64748b",
  cursor: "pointer",
  padding: 0,
  marginBottom: 8,
  fontSize: 13,
};

const titleStyle: CSSProperties = {
  margin: 0,
  color: "#172033",
  fontSize: 28,
};

const subtitleStyle: CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: 13,
};

const headerActionsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 10,
  flexWrap: "wrap",
};

const nouveauChauffeurButton: CSSProperties = {
  minHeight: 44,
  border: "none",
  borderRadius: 8,
  padding: "10px 15px",
  backgroundColor: "#dc2626",
  color: "#ffffff",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  fontSize: 13,
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const resumeStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "12px 16px",
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  color: "#1e3a5f",
};

const resumeValueStyle: CSSProperties = {
  fontWeight: 800,
  fontSize: 17,
  color: "#111827",
};

const resumeLabelStyle: CSSProperties = {
  color: "#64748b",
  fontSize: 11,
};

const infoStyle: CSSProperties = {
  backgroundColor: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1e40af",
  borderRadius: 9,
  padding: 14,
  marginBottom: 16,
  fontSize: 13,
  lineHeight: 1.55,
};

const searchWrapStyle: CSSProperties = {
  position: "relative",
  maxWidth: 520,
  marginBottom: 16,
};

const searchIconStyle: CSSProperties = {
  position: "absolute",
  left: 12,
  top: "50%",
  transform: "translateY(-50%)",
  color: "#94a3b8",
};

const searchInputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px 10px 36px",
  border: "1px solid #94a3b8",
  borderRadius: 8,
  backgroundColor: "#ffffff",
  color: "#111827",
  fontSize: 13,
};

const cardStyle: CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  overflow: "hidden",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 930,
};

const headRowStyle: CSSProperties = {
  backgroundColor: "#f8fafc",
};

const bodyRowStyle: CSSProperties = {
  borderBottom: "1px solid #f1f5f9",
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "12px 14px",
  color: "#64748b",
  fontSize: 12,
  fontWeight: 700,
  borderBottom: "1px solid #e2e8f0",
  whiteSpace: "nowrap",
};

const tdStyle: CSSProperties = {
  padding: "12px 14px",
  color: "#334155",
  fontSize: 13,
  verticalAlign: "middle",
};

const secondaryStyle: CSSProperties = {
  marginTop: 3,
  color: "#64748b",
  fontSize: 11,
};

const emptyStyle: CSSProperties = {
  padding: 32,
  textAlign: "center",
  color: "#64748b",
  fontSize: 13,
};

const badgeActif: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "5px 9px",
  borderRadius: 999,
  backgroundColor: "#dcfce7",
  color: "#166534",
  fontSize: 11,
  fontWeight: 700,
};

const badgeAbsent: CSSProperties = {
  display: "inline-flex",
  padding: "5px 9px",
  borderRadius: 999,
  backgroundColor: "#f1f5f9",
  color: "#475569",
  fontSize: 11,
  fontWeight: 700,
};

const badgeConflit: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "5px 9px",
  borderRadius: 999,
  backgroundColor: "#fef3c7",
  color: "#92400e",
  fontSize: 11,
  fontWeight: 700,
};

const actionButton: CSSProperties = {
  minHeight: 34,
  borderRadius: 8,
  padding: "7px 11px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const iconActionsWrapStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
};

const iconEditButton: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 8,
  border: "1px solid #bfdbfe",
  backgroundColor: "#eff6ff",
  color: "#2563eb",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const iconDeleteButton: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 8,
  border: "1px solid #fecaca",
  backgroundColor: "#fef2f2",
  color: "#dc2626",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const driverModalHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 20,
};

const modalCloseIconButton: CSSProperties = {
  width: 34,
  height: 34,
  border: "none",
  borderRadius: 8,
  backgroundColor: "#f1f5f9",
  color: "#475569",
  cursor: "pointer",
  fontSize: 22,
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const driverFormGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 15,
};

const driverFieldStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const driverLabelStyle: CSSProperties = {
  color: "#374151",
  fontSize: 12,
  fontWeight: 700,
};

const driverInputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  backgroundColor: "#ffffff",
  color: "#111827",
  fontSize: 13,
  outline: "none",
};

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 2000,
  backgroundColor: "rgba(15,23,42,0.65)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const modalStyle: CSSProperties = {
  width: "100%",
  maxWidth: 500,
  backgroundColor: "#ffffff",
  borderRadius: 12,
  padding: 24,
  boxShadow: "0 20px 60px rgba(0,0,0,.28)",
};

const modalTitleStyle: CSSProperties = {
  color: "#111827",
  fontSize: 21,
  margin: "0 0 12px",
};

const modalTextStyle: CSSProperties = {
  color: "#475569",
  fontSize: 13,
  lineHeight: 1.55,
};

const identityBoxStyle: CSSProperties = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  padding: 13,
  color: "#334155",
  fontSize: 13,
  marginTop: 14,
};

const warningStyle: CSSProperties = {
  padding: 12,
  backgroundColor: "#fffbeb",
  border: "1px solid #fde68a",
  color: "#92400e",
  borderRadius: 8,
  fontSize: 12,
  lineHeight: 1.5,
  marginTop: 14,
};

const importantStyle: CSSProperties = {
  padding: 12,
  backgroundColor: "#fff7ed",
  border: "1px solid #fed7aa",
  color: "#9a3412",
  borderRadius: 8,
  fontSize: 12,
  lineHeight: 1.5,
  marginTop: 14,
};

const credentialBoxStyle: CSSProperties = {
  border: "1px solid #cbd5e1",
  backgroundColor: "#f8fafc",
  borderRadius: 10,
  padding: 16,
  marginTop: 14,
};

const credentialLabelStyle: CSSProperties = {
  color: "#64748b",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.4,
};

const credentialValueStyle: CSSProperties = {
  marginTop: 4,
  color: "#111827",
  fontSize: 15,
  fontWeight: 700,
};

const passwordStyle: CSSProperties = {
  marginTop: 6,
  padding: "11px 13px",
  borderRadius: 8,
  backgroundColor: "#111827",
  color: "#ffffff",
  fontFamily: "monospace",
  fontSize: 20,
  fontWeight: 800,
  letterSpacing: 1.5,
  textAlign: "center",
  userSelect: "all",
};

const modalActionsStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 9,
  marginTop: 20,
  flexWrap: "wrap",
};

const primaryButton: CSSProperties = {
  border: "none",
  borderRadius: 8,
  backgroundColor: "#dc2626",
  color: "#ffffff",
  padding: "9px 14px",
  cursor: "pointer",
  fontWeight: 700,
};

const secondaryButton: CSSProperties = {
  border: "none",
  borderRadius: 8,
  backgroundColor: "#e5e7eb",
  color: "#374151",
  padding: "9px 14px",
  cursor: "pointer",
  fontWeight: 700,
};
