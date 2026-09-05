"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Vehicule {
  id: number;
  categorie: string;
  immatriculation: string;
  modeleType: string;
  annee?: number | null;
  affectation?: string | null;
  etatGeneralObservations?: string | null;
  statut: string;
}

interface Chauffeur {
  id: number;
  nom: string;
  prenom: string;
  telephone?: string;
  statut: string;
}

interface MissionHisto {
  id: number;
  vehiculeId?: number;
  dateDebut: string;
  dateFin?: string | null;
  chauffeur?: { prenom: string; nom: string };
  vehicule?: { id: number };
}

const CATEGORIES_SPAT = [
  "Voiture de service",
  "Voiture de fonction",
  "Camion",
  "Engin",
  "Tracteur",
  "Autopompe",
  "Remorque",
  "Bus",
  "Ambulance",
] as const;

const STATUTS_VEHICULE = [
  { value: "DISPONIBLE", label: "Disponible" },
  { value: "EN_MISSION", label: "En mission" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "HORS_SERVICE", label: "Hors service" },
  { value: "TRANSFERE", label: "Transféré" },
  { value: "REFORME", label: "Réformé" },
] as const;

const IconEdit = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </svg>
);

const IconTrash = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const IconLink = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const IconHistory = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </svg>
);

export default function VehiculesPage() {
  const router = useRouter();

  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [chargement, setChargement] = useState(true);
  const [formOuvert, setFormOuvert] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [pageActuelle, setPageActuelle] = useState(1);
  const VEHICULES_PAR_PAGE = 10;

  // =========================================================
  // ROLE / LECTURE SEULE (DIRECTEUR_DFP)
  // =========================================================

  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setRole(localStorage.getItem("role"));
  }, []);

  const lectureSeule = role === "DIRECTEUR_DFP";

  // =========================================================
  // FORMULAIRE VEHICULE - INVENTAIRE SPAT
  // =========================================================

  const [categorie, setCategorie] = useState<string>("Voiture de service");
  const [categorieAutre, setCategorieAutre] = useState("");
  const [immatriculation, setImmatriculation] = useState("");
  const [modeleType, setModeleType] = useState("");
  const [annee, setAnnee] = useState("");
  const [affectation, setAffectation] = useState("");
  const [etatGeneralObservations, setEtatGeneralObservations] = useState("");
  const [statut, setStatut] = useState("DISPONIBLE");

  const [vehiculeEnEdition, setVehiculeEnEdition] =
    useState<Vehicule | null>(null);

  // =========================================================
  // AFFECTATION CHAUFFEUR
  // =========================================================

  const [affectationOuverte, setAffectationOuverte] = useState(false);
  const [vehiculeAAffecter, setVehiculeAAffecter] =
    useState<Vehicule | null>(null);
  const [chauffeursDispo, setChauffeursDispo] = useState<Chauffeur[]>([]);
  const [chauffeurId, setChauffeurId] = useState<number | "">("");
  const [loadingAffect, setLoadingAffect] = useState(false);

  // =========================================================
  // HISTORIQUE
  // =========================================================

  const [historiqueOuvert, setHistoriqueOuvert] = useState(false);
  const [vehiculeHistorique, setVehiculeHistorique] =
    useState<Vehicule | null>(null);
  const [missionsHisto, setMissionsHisto] = useState<MissionHisto[]>([]);
  const [chargementHisto, setChargementHisto] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL;

  const getToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  };

  const lireErreur = async (res: Response) => {
    const texte = await res.text();

    if (!texte) {
      return "Une erreur est survenue.";
    }

    try {
      const json = JSON.parse(texte);
      return json.erreur || json.message || texte;
    } catch {
      return texte;
    }
  };

  // =========================================================
  // CHARGEMENT REEL DES VEHICULES DEPUIS LE BACKEND
  // =========================================================

  const chargerVehicules = async () => {
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
      const res = await fetch(`${API}/vehicules`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (res.status === 401) {
        toast.error("Votre session a expiré");
        router.replace("/login");
        return;
      }

      if (!res.ok) {
        throw new Error(await lireErreur(res));
      }

      const data = await res.json();

      setVehicules(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.content)
            ? data.content
            : []
      );
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de charger les véhicules"
      );
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerVehicules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =========================================================
  // FORMULAIRE
  // =========================================================

  const resetFormulaire = () => {
    setCategorie("Voiture de service");
    setCategorieAutre("");
    setImmatriculation("");
    setModeleType("");
    setAnnee("");
    setAffectation("");
    setEtatGeneralObservations("");
    setStatut("DISPONIBLE");
    setVehiculeEnEdition(null);
  };

  const ouvrirCreation = () => {
    if (lectureSeule) return;
    resetFormulaire();
    setFormOuvert(true);
  };

  const ouvrirEdition = (vehicule: Vehicule) => {
    if (lectureSeule) return;

    setVehiculeEnEdition(vehicule);

    if (
      CATEGORIES_SPAT.includes(
        vehicule.categorie as (typeof CATEGORIES_SPAT)[number]
      )
    ) {
      setCategorie(vehicule.categorie);
      setCategorieAutre("");
    } else {
      setCategorie("AUTRE");
      setCategorieAutre(vehicule.categorie || "");
    }

    setImmatriculation(vehicule.immatriculation || "");
    setModeleType(vehicule.modeleType || "");
    setAnnee(
      vehicule.annee !== null && vehicule.annee !== undefined
        ? String(vehicule.annee)
        : ""
    );
    setAffectation(vehicule.affectation || "");
    setEtatGeneralObservations(vehicule.etatGeneralObservations || "");
    setStatut(vehicule.statut || "DISPONIBLE");
    setFormOuvert(true);
  };

  const fermerFormulaire = () => {
    setFormOuvert(false);
    resetFormulaire();
  };

  const handleSoumettre = async (e: React.FormEvent) => {
    e.preventDefault();

    if (lectureSeule) return;

    if (!API) {
      toast.error("NEXT_PUBLIC_API_URL n'est pas configurée");
      return;
    }

    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    const categorieFinale =
      categorie === "AUTRE" ? categorieAutre.trim() : categorie.trim();

    if (!categorieFinale) {
      toast.error("La catégorie est obligatoire");
      return;
    }

    if (!immatriculation.trim()) {
      toast.error("L'immatriculation / identifiant est obligatoire");
      return;
    }

    if (!modeleType.trim()) {
      toast.error("Le modèle / type est obligatoire");
      return;
    }

    if (!affectation.trim()) {
      toast.error("L'affectation est obligatoire");
      return;
    }

    if (!etatGeneralObservations.trim()) {
      toast.error("L'état général / observations est obligatoire");
      return;
    }

    if (annee.trim()) {
      const anneeNombre = Number(annee);
      const anneeActuelle = new Date().getFullYear();

      if (
        !Number.isInteger(anneeNombre) ||
        anneeNombre < 1900 ||
        anneeNombre > anneeActuelle + 1
      ) {
        toast.error("L'année renseignée est invalide");
        return;
      }
    }

    const estEdition = vehiculeEnEdition !== null;

    const url = estEdition
      ? `${API}/vehicules/${vehiculeEnEdition!.id}`
      : `${API}/vehicules`;

    try {
      const res = await fetch(url, {
        method: estEdition ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          categorie: categorieFinale,
          immatriculation: immatriculation.trim(),
          modeleType: modeleType.trim(),
          annee: annee.trim() ? Number(annee) : null,
          affectation: affectation.trim(),
          etatGeneralObservations: etatGeneralObservations.trim(),
          statut,
        }),
      });

      if (res.status === 401) {
        toast.error("Votre session a expiré");
        router.replace("/login");
        return;
      }

      if (!res.ok) {
        toast.error(await lireErreur(res));
        return;
      }

      toast.success(
        estEdition
          ? "Véhicule / matériel modifié avec succès"
          : "Véhicule / matériel ajouté avec succès"
      );

      fermerFormulaire();
      await chargerVehicules();
    } catch {
      toast.error("Impossible de contacter le serveur");
    }
  };

  // =========================================================
  // RECHERCHE
  // =========================================================

  const vehiculesFiltres = vehicules.filter((vehicule) => {
    const terme = recherche.trim().toLowerCase();

    if (!terme) return true;

    return [
      vehicule.categorie,
      vehicule.immatriculation,
      vehicule.modeleType,
      vehicule.annee?.toString(),
      vehicule.affectation,
      vehicule.etatGeneralObservations,
      vehicule.statut,
    ].some((valeur) => valeur?.toLowerCase().includes(terme));
  });

  const nombrePages = Math.max(
    1,
    Math.ceil(vehiculesFiltres.length / VEHICULES_PAR_PAGE)
  );

  const debutPage = (pageActuelle - 1) * VEHICULES_PAR_PAGE;

  const vehiculesPage = vehiculesFiltres.slice(
    debutPage,
    debutPage + VEHICULES_PAR_PAGE
  );

  useEffect(() => {
    if (pageActuelle > nombrePages) {
      setPageActuelle(nombrePages);
    }
  }, [pageActuelle, nombrePages]);

  // =========================================================
  // STATISTIQUES REELLES PAR CATEGORIE
  // =========================================================

  const totalVehicules = vehicules.length;

  const statistiquesCategories = (() => {
    const compteur = new Map<string, number>();

    vehicules.forEach((vehicule) => {
      const categorieVehicule =
        vehicule.categorie?.trim() || "Non classé";

      compteur.set(
        categorieVehicule,
        (compteur.get(categorieVehicule) || 0) + 1
      );
    });

    const ordreCategories = [
      ...CATEGORIES_SPAT,
      ...Array.from(compteur.keys()).filter(
        (categorie) =>
          !CATEGORIES_SPAT.includes(
            categorie as (typeof CATEGORIES_SPAT)[number]
          )
      ),
    ];

    return ordreCategories
      .filter((categorie) => compteur.has(categorie))
      .map((categorie) => ({
        categorie,
        nombre: compteur.get(categorie) || 0,
      }));
  })();

  const statistiquesStatuts = STATUTS_VEHICULE.map((statutOption) => ({
    statut: statutOption.value,
    label: statutOption.label,
    nombre: vehicules.filter(
      (vehicule) => vehicule.statut === statutOption.value
    ).length,
  })).filter((stat) => stat.nombre > 0);

  // =========================================================
  // SUPPRESSION
  // =========================================================

  const handleSupprimer = (id: number) => {
    if (lectureSeule) return;

    toast("Supprimer ce véhicule / matériel ?", {
      description:
        "Cette action est définitive et supprimera également les relations prévues par le backend.",
      duration: 8000,

      action: {
        label: "Supprimer",

        onClick: async () => {
          if (!API) {
            toast.error("NEXT_PUBLIC_API_URL n'est pas configurée");
            return;
          }

          const token = getToken();

          if (!token) {
            router.replace("/login");
            return;
          }

          try {
            const res = await fetch(`${API}/vehicules/${id}`, {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (!res.ok) {
              toast.error("Échec de la suppression", {
                description: await lireErreur(res),
              });
              return;
            }

            toast.success("Véhicule / matériel supprimé");

            await chargerVehicules();
          } catch {
            toast.error("Erreur de connexion", {
              description: "Impossible de contacter le serveur.",
            });
          }
        },
      },

      cancel: {
        label: "Annuler",
      },
    });
  };

  // =========================================================
  // AFFECTER UN CHAUFFEUR
  // =========================================================

  const ouvrirAffectation = async (v: Vehicule) => {
    if (lectureSeule) return;

    if (v.statut !== "DISPONIBLE") {
      toast.error("Seuls les véhicules disponibles peuvent être affectés");
      return;
    }

    if (!API) {
      toast.error("NEXT_PUBLIC_API_URL n'est pas configurée");
      return;
    }

    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    setVehiculeAAffecter(v);
    setChauffeurId("");
    setAffectationOuverte(true);

    try {
      const res = await fetch(`${API}/chauffeurs`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(await lireErreur(res));
      }

      const data: Chauffeur[] = await res.json();

      const liste = Array.isArray(data) ? data : [];

      setChauffeursDispo(
        liste.filter(
          (c) => c.statut === "DISPONIBLE" || c.statut === "SUR_PLACE"
        )
      );
    } catch (error) {
      setChauffeursDispo([]);

      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de charger les chauffeurs disponibles"
      );
    }
  };

  const handleAffecter = async () => {
    if (lectureSeule) return;
    if (!vehiculeAAffecter || !chauffeurId) return;

    if (!API) {
      toast.error("NEXT_PUBLIC_API_URL n'est pas configurée");
      return;
    }

    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    setLoadingAffect(true);

    try {
      const res = await fetch(`${API}/affectations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vehiculeId: vehiculeAAffecter.id,
          chauffeurId,
        }),
      });

      if (!res.ok) {
        toast.error(await lireErreur(res));
        return;
      }

      toast.success(
        `Chauffeur affecté à ${vehiculeAAffecter.immatriculation}`
      );

      setAffectationOuverte(false);
      setVehiculeAAffecter(null);
      setChauffeurId("");

      await chargerVehicules();
    } catch {
      toast.error("Impossible de contacter le serveur");
    } finally {
      setLoadingAffect(false);
    }
  };

  // =========================================================
  // HISTORIQUE
  // =========================================================

  const ouvrirHistorique = async (v: Vehicule) => {
    if (!API) {
      toast.error("NEXT_PUBLIC_API_URL n'est pas configurée");
      return;
    }

    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    setVehiculeHistorique(v);
    setHistoriqueOuvert(true);
    setChargementHisto(true);
    setMissionsHisto([]);

    try {
      const res = await fetch(`${API}/affectations?vehiculeId=${v.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        const resAll = await fetch(`${API}/affectations`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (!resAll.ok) {
          throw new Error(await lireErreur(resAll));
        }

        const data = await resAll.json();

        const liste: MissionHisto[] = Array.isArray(data)
          ? data
          : data.content || [];

        setMissionsHisto(
          liste.filter(
            (m) => m.vehiculeId === v.id || m.vehicule?.id === v.id
          )
        );
      } else {
        const data = await res.json();

        const liste: MissionHisto[] = Array.isArray(data)
          ? data
          : data.content || [];

        setMissionsHisto(
          liste.filter(
            (m) => m.vehiculeId === v.id || m.vehicule?.id === v.id
          )
        );
      }
    } catch (error) {
      console.error(error);
      toast.error("Impossible de charger l'historique");
      setMissionsHisto([]);
    } finally {
      setChargementHisto(false);
    }
  };

  // =========================================================
  // AFFICHAGE
  // =========================================================

  const badgeStatut = (s: string) => {
    const styles: Record <
      string,
      { bg: string; color: string; label: string }
    > = {
      DISPONIBLE: {
        bg: "#dcfce7",
        color: "#166534",
        label: "Disponible",
      },
      EN_MISSION: {
        bg: "#dbeafe",
        color: "#1e40af",
        label: "En mission",
      },
      MAINTENANCE: {
        bg: "#fee2e2",
        color: "#991b1b",
        label: "Maintenance",
      },
      HORS_SERVICE: {
        bg: "#ffedd5",
        color: "#9a3412",
        label: "Hors service",
      },
      TRANSFERE: {
        bg: "#fef3c7",
        color: "#92400e",
        label: "Transféré",
      },
      REFORME: {
        bg: "#e5e7eb",
        color: "#374151",
        label: "Réformé",
      },
    };

    const style =
      styles[s] || {
        bg: "#f3f4f6",
        color: "#374151",
        label: s,
      };

    return (
      <span
        style={{
          padding: "2px 8px",
          borderRadius: 10,
          fontSize: 11,
          backgroundColor: style.bg,
          color: style.color,
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        {style.label}
      </span>
    );
  };

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("fr-FR");
  };

  return (
    <>
      <style jsx global>{`
        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }

        html,
        body {
          max-width: 100%;
          overflow-x: hidden;
        }

        input,
        select,
        textarea {
          color: #111827;
          background-color: #ffffff;
          border: 2px solid #111827;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
          font-size: 14px;
        }

        input::placeholder,
        textarea::placeholder {
          color: #6b7280;
        }

        input:focus,
        select:focus,
        textarea:focus {
          outline: 2px solid #dc2626;
          outline-offset: 1px;
        }

        .icon-btn {
          transition:
            background-color 0.15s ease,
            transform 0.1s ease;
        }

        .icon-btn:hover {
          transform: translateY(-1px);
        }

        @media (max-width: 760px) {
          .vehicule-form-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#f3f4f6",
          padding: 20,
        }}
      >
        <div
          style={{
            maxWidth: 1500,
            margin: "0 auto",
          }}
        >
          {/* =================================================
              EN-TETE
          ================================================= */}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: 14,
              position: "relative",
            }}
          >
            <button
              type="button"
              onClick={() => router.push("/admin")}
              style={{
                background: "none",
                border: "none",
                color: "#6b7280",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              ← Retour
            </button>

            <h2
              style={{
                color: "#1e293b",
                margin: 0,
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
                whiteSpace: "nowrap",
              }}
            >
              Gestion des véhicules et matériels roulants
            </h2>

            {!lectureSeule && (
              <button
                type="button"
                onClick={ouvrirCreation}
                style={{
                  padding: "8px 14px",
                  backgroundColor: "#dc2626",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                + Ajouter un véhicule
              </button>
            )}
          </div>

          {/* =================================================
              STATISTIQUES PAR CATEGORIE
          ================================================= */}

          <div
            style={{
              marginBottom: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 8,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: "#374151",
                  fontWeight: 700,
                }}
              >
                Répartition du parc par catégorie
              </h3>

              <span
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  whiteSpace: "nowrap",
                }}
              >
                Total : {totalVehicules}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(130px, 1fr))",
                gap: 8,
              }}
            >
              {statistiquesCategories.map((stat) => (
                <StatCategorieCard
                  key={stat.categorie}
                  label={stat.categorie}
                  valeur={stat.nombre}
                />
              ))}
            </div>
          </div>

          <div
            style={{
              marginBottom: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 8,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: "#374151",
                  fontWeight: 700,
                }}
              >
                Répartition du parc par statut
              </h3>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(130px, 1fr))",
                gap: 8,
              }}
            >
              {statistiquesStatuts.map((stat) => (
                <StatStatutCard
                  key={stat.statut}
                  statut={stat.statut}
                  label={stat.label}
                  valeur={stat.nombre}
                />
              ))}
            </div>
          </div>

          {/* =================================================
              MODAL CREATION / EDITION
          ================================================= */}

          {formOuvert && !lectureSeule && (
            <div style={overlayStyle}>
              <div
                style={{
                  ...modalStyle,
                  maxWidth: 820,
                }}
              >
                <div style={modalHeaderStyle}>
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        color: "#111827",
                        fontSize: 22,
                      }}
                    >
                      {vehiculeEnEdition
                        ? "Modifier le véhicule / matériel"
                        : "Ajouter un véhicule / matériel"}
                    </h3>

                    <p
                      style={{
                        margin: "6px 0 0",
                        color: "#6b7280",
                        fontSize: 13,
                      }}
                    >
                      Informations conformes à l&apos;inventaire SPAT.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={fermerFormulaire}
                    style={closeBtnStyle}
                  >
                    ×
                  </button>
                </div>

                <form
                  onSubmit={handleSoumettre}
                  className="vehicule-form-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(2, minmax(220px, 1fr))",
                    gap: 16,
                  }}
                >
                  {/* CATEGORIE */}

                  <div>
                    <label style={labelStyle}>Catégorie *</label>

                    <select
                      value={categorie}
                      onChange={(e) => {
                        setCategorie(e.target.value);

                        if (e.target.value !== "AUTRE") {
                          setCategorieAutre("");
                        }
                      }}
                      style={inputStyle}
                      required
                    >
                      {CATEGORIES_SPAT.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}

                      <option value="AUTRE">
                        Autre catégorie
                      </option>
                    </select>
                  </div>

                  {categorie === "AUTRE" && (
                    <div>
                      <label style={labelStyle}>
                        Nouvelle catégorie *
                      </label>

                      <input
                        type="text"
                        value={categorieAutre}
                        onChange={(e) =>
                          setCategorieAutre(e.target.value)
                        }
                        placeholder="Ex. Véhicule spécialisé"
                        required
                        style={inputStyle}
                      />
                    </div>
                  )}

                  {/* IMMATRICULATION */}

                  <div>
                    <label style={labelStyle}>
                      Immatriculation / Identifiant *
                    </label>

                    <input
                      type="text"
                      value={immatriculation}
                      onChange={(e) =>
                        setImmatriculation(e.target.value)
                      }
                      placeholder="Ex. 1205TCA ou TRAX 966G"
                      required
                      style={inputStyle}
                    />
                  </div>

                  {/* MODELE / TYPE */}

                  <div>
                    <label style={labelStyle}>
                      Modèle / Type *
                    </label>

                    <input
                      type="text"
                      value={modeleType}
                      onChange={(e) =>
                        setModeleType(e.target.value)
                      }
                      placeholder="Ex. TOYOTA REVO, Pelle chargeuse..."
                      required
                      style={inputStyle}
                    />
                  </div>

                  {/* ANNEE */}

                  <div>
                    <label style={labelStyle}>Année</label>

                    <input
                      type="number"
                      min="1900"
                      max={new Date().getFullYear() + 1}
                      value={annee}
                      onChange={(e) => setAnnee(e.target.value)}
                      placeholder="Ex. 2026"
                      style={inputStyle}
                    />

                    <div style={helpStyle}>
                      Facultatif si l&apos;année n&apos;est pas
                      renseignée.
                    </div>
                  </div>

                  {/* AFFECTATION */}

                  <div>
                    <label style={labelStyle}>
                      Affectation *
                    </label>

                    <input
                      type="text"
                      value={affectation}
                      onChange={(e) =>
                        setAffectation(e.target.value)
                      }
                      placeholder="Ex. Garage, DG SPAT, CEMEDI..."
                      required
                      style={inputStyle}
                    />
                  </div>

                  {/* STATUT */}

                  <div>
                    <label style={labelStyle}>
                      Statut opérationnel *
                    </label>

                    <select
                      value={statut}
                      onChange={(e) => setStatut(e.target.value)}
                      style={inputStyle}
                    >
                      {STATUTS_VEHICULE.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>

                    <div style={helpStyle}>
                      Indique la disponibilité actuelle dans le
                      portail.
                    </div>
                  </div>

                  {/* ETAT GENERAL / OBSERVATIONS */}

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>
                      État général / Observations *
                    </label>

                    <textarea
                      value={etatGeneralObservations}
                      onChange={(e) =>
                        setEtatGeneralObservations(e.target.value)
                      }
                      placeholder="Ex. État neuf, Bon état, État moyen (Panne BV), pare-brise fissuré..."
                      required
                      rows={4}
                      style={{
                        ...inputStyle,
                        resize: "vertical",
                        minHeight: 100,
                        fontFamily: "inherit",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      gridColumn: "1 / -1",
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 10,
                      marginTop: 8,
                    }}
                  >
                    <button
                      type="button"
                      onClick={fermerFormulaire}
                      style={btnSecondary}
                    >
                      Annuler
                    </button>

                    <button type="submit" style={btnPrimary}>
                      {vehiculeEnEdition
                        ? "Enregistrer"
                        : "Créer"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* =================================================
              MODAL AFFECTATION CHAUFFEUR
          ================================================= */}

          {affectationOuverte && vehiculeAAffecter && !lectureSeule && (
            <div style={overlayStyle}>
              <div
                style={{
                  ...modalStyle,
                  maxWidth: 440,
                }}
              >
                <div style={modalHeaderStyle}>
                  <h3
                    style={{
                      margin: 0,
                      color: "#111827",
                      fontSize: 18,
                    }}
                  >
                    Affecter un chauffeur
                  </h3>

                  <button
                    type="button"
                    onClick={() =>
                      setAffectationOuverte(false)
                    }
                    style={closeBtnStyle}
                  >
                    ×
                  </button>
                </div>

                <div
                  style={{
                    backgroundColor: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 18,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      color: "#111827",
                    }}
                  >
                    {vehiculeAAffecter.immatriculation}
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      color: "#6b7280",
                      fontSize: 13,
                    }}
                  >
                    {vehiculeAAffecter.categorie} —{" "}
                    {vehiculeAAffecter.modeleType}
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>
                    Chauffeur disponible
                  </label>

                  <select
                    value={chauffeurId}
                    onChange={(e) =>
                      setChauffeurId(
                        e.target.value
                          ? Number(e.target.value)
                          : ""
                      )
                    }
                    style={inputStyle}
                  >
                    <option value="">
                      Sélectionner un chauffeur
                    </option>

                    {chauffeursDispo.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.prenom} {c.nom}
                        {c.telephone
                          ? ` — ${c.telephone}`
                          : ""}
                      </option>
                    ))}
                  </select>

                  {chauffeursDispo.length === 0 && (
                    <p
                      style={{
                        fontSize: 12,
                        color: "#dc2626",
                        marginTop: 6,
                      }}
                    >
                      Aucun chauffeur disponible
                    </p>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 10,
                    marginTop: 24,
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setAffectationOuverte(false)
                    }
                    style={btnSecondary}
                  >
                    Annuler
                  </button>

                  <button
                    type="button"
                    onClick={handleAffecter}
                    disabled={!chauffeurId || loadingAffect}
                    style={{
                      ...btnPrimary,
                      backgroundColor:
                        !chauffeurId || loadingAffect
                          ? "#94a3b8"
                          : "#16a34a",
                      cursor:
                        !chauffeurId || loadingAffect
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    {loadingAffect
                      ? "Affectation..."
                      : "Confirmer"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =================================================
              PANNEAU HISTORIQUE
          ================================================= */}

          {historiqueOuvert && vehiculeHistorique && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(15, 23, 42, 0.45)",
                zIndex: 1000,
                display: "flex",
                justifyContent: "flex-end",
              }}
              onClick={() => setHistoriqueOuvert(false)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "100%",
                  maxWidth: 460,
                  height: "100%",
                  backgroundColor: "white",
                  boxShadow:
                    "-8px 0 24px rgba(0,0,0,0.12)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    padding: "20px 24px",
                    borderBottom: "1px solid #e5e7eb",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 18,
                        color: "#111827",
                      }}
                    >
                      Historique
                    </h3>

                    <p
                      style={{
                        margin: "6px 0 0",
                        fontSize: 14,
                        color: "#374151",
                        fontWeight: 700,
                      }}
                    >
                      {vehiculeHistorique.immatriculation}
                    </p>

                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: 13,
                        color: "#6b7280",
                      }}
                    >
                      {vehiculeHistorique.categorie} —{" "}
                      {vehiculeHistorique.modeleType}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setHistoriqueOuvert(false)
                    }
                    style={closeBtnStyle}
                  >
                    ×
                  </button>
                </div>

                <div
                  style={{
                    padding: 24,
                    overflowY: "auto",
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: 14,
                      marginBottom: 24,
                    }}
                  >
                    <InfoLigne
                      label="Année"
                      valeur={
                        vehiculeHistorique.annee
                          ? String(vehiculeHistorique.annee)
                          : "—"
                      }
                    />

                    <InfoLigne
                      label="Affectation"
                      valeur={
                        vehiculeHistorique.affectation || "—"
                      }
                    />

                    <InfoLigne
                      label="État général / observations"
                      valeur={
                        vehiculeHistorique.etatGeneralObservations ||
                        "—"
                      }
                    />

                    <InfoLigne
                      label="Statut"
                      valeur={
                        STATUTS_VEHICULE.find(
                          (s) =>
                            s.value ===
                            vehiculeHistorique.statut
                        )?.label ||
                        vehiculeHistorique.statut
                      }
                      dernier
                    />
                  </div>

                  <h4
                    style={{
                      margin: "0 0 12px",
                      fontSize: 14,
                      color: "#374151",
                    }}
                  >
                    Missions
                  </h4>

                  {chargementHisto ? (
                    <p
                      style={{
                        color: "#6b7280",
                        fontSize: 14,
                      }}
                    >
                      Chargement...
                    </p>
                  ) : missionsHisto.length === 0 ? (
                    <p
                      style={{
                        color: "#6b7280",
                        fontSize: 14,
                      }}
                    >
                      Aucune mission enregistrée
                    </p>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      {missionsHisto.map((m) => {
                        const enCours = !m.dateFin;

                        return (
                          <div
                            key={m.id}
                            style={{
                              padding: 12,
                              borderRadius: 8,
                              border:
                                "1px solid #e5e7eb",
                              backgroundColor: "#fafafa",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent:
                                  "space-between",
                                gap: 8,
                                marginBottom: 6,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: "#111827",
                                }}
                              >
                                {m.chauffeur
                                  ? `${m.chauffeur.prenom} ${m.chauffeur.nom}`
                                  : "Chauffeur —"}
                              </span>

                              <span
                                style={{
                                  fontSize: 11,
                                  padding: "2px 8px",
                                  borderRadius: 10,
                                  backgroundColor: enCours
                                    ? "#dbeafe"
                                    : "#f3f4f6",
                                  color: enCours
                                    ? "#1e40af"
                                    : "#4b5563",
                                }}
                              >
                                {enCours
                                  ? "En cours"
                                  : "Terminée"}
                              </span>
                            </div>

                            <div
                              style={{
                                fontSize: 12,
                                color: "#6b7280",
                              }}
                            >
                              Début :{" "}
                              {formatDateTime(m.dateDebut)}
                            </div>

                            <div
                              style={{
                                fontSize: 12,
                                color: "#6b7280",
                              }}
                            >
                              Fin : {formatDateTime(m.dateFin)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =================================================
              RECHERCHE
          ================================================= */}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                position: "relative",
                flex: 1,
                maxWidth: 520,
              }}
            >
              <input
                type="text"
                value={recherche}
                onChange={(e) => {
                  setRecherche(e.target.value);
                  setPageActuelle(1);
                }}
                placeholder="Rechercher par catégorie, immatriculation, affectation..."
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "8px 10px",
                  border: "1px solid #111827",
                  borderRadius: 8,
                  fontSize: 14,
                  color: "#111827",
                  backgroundColor: "#ffffff",
                  outline: "none",
                }}
              />
            </div>

            <div
              style={{
                marginLeft: "auto",
                color: "#6b7280",
                fontSize: 13,
                whiteSpace: "nowrap",
              }}
            >
              {vehiculesFiltres.length} matériel
              {vehiculesFiltres.length > 1 ? "s" : ""}
              {" · "}
              Page {pageActuelle}/{nombrePages}
            </div>
          </div>

          {/* =================================================
              TABLEAU
          ================================================= */}

          <div
            style={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                tableLayout: "fixed",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "#f9fafb",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <th style={{ ...thStyle, width: "16%" }}>Catégorie</th>
                  <th style={{ ...thStyle, width: "18%" }}>Immatriculation</th>
                  <th style={{ ...thStyle, width: "10%" }}>Année</th>
                  <th style={{ ...thStyle, width: "24%" }}>Affectation</th>
                  <th style={{ ...thStyle, width: "14%" }}>Statut</th>
                  <th style={{ ...thStyle, width: "18%" }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {chargement ? (
                  <tr>
                    <td colSpan={6} style={emptyStyle}>
                      Chargement...
                    </td>
                  </tr>
                ) : vehiculesFiltres.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={emptyStyle}>
                      Aucun véhicule ou matériel roulant
                    </td>
                  </tr>
                ) : (
                  vehiculesPage.map((v) => (
                    <tr
                      key={v.id}
                      style={{
                        borderBottom:
                          "1px solid #f3f4f6",
                      }}
                    >
                      <td style={{ ...tdStyle, overflow: "hidden" }}>
                        <span
                          style={{
                            backgroundColor: "#f3f4f6",
                            color: "#374151",
                            padding: "2px 7px",
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {v.categorie}
                        </span>
                      </td>

                      <td
                        style={{
                          ...tdStyle,
                          fontWeight: 700,
                          color: "#111827",
                        }}
                      >
                        {v.immatriculation}
                      </td>

                      <td style={tdStyle}>
                        {v.annee ?? "—"}
                      </td>

                      <td
                        style={{
                          ...tdStyle,
                          whiteSpace: "normal",
                          overflowWrap: "anywhere",
                          lineHeight: 1.25,
                        }}
                        title={v.affectation || ""}
                      >
                        {v.affectation || "—"}
                      </td>

                      <td style={tdStyle}>
                        {badgeStatut(v.statut)}
                      </td>

                      <td style={tdStyle}>
                        <div
                          style={{
                            display: "flex",
                            gap: 4,
                            flexWrap: "nowrap",
                            justifyContent: "flex-start",
                          }}
                        >
                          {!lectureSeule && (
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() =>
                                ouvrirEdition(v)
                              }
                              style={iconBtn(
                                "#eff6ff",
                                "#2563eb",
                                "#bfdbfe"
                              )}
                              title="Modifier"
                            >
                              <IconEdit />
                            </button>
                          )}

                          {!lectureSeule && (
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() =>
                                handleSupprimer(v.id)
                              }
                              style={iconBtn(
                                "#fef2f2",
                                "#dc2626",
                                "#fecaca"
                              )}
                              title="Supprimer"
                            >
                              <IconTrash />
                            </button>
                          )}

                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() =>
                              ouvrirHistorique(v)
                            }
                            style={iconBtn(
                              "#f5f3ff",
                              "#6d28d9",
                              "#ddd6fe"
                            )}
                            title="Historique"
                          >
                            <IconHistory />
                          </button>

                          {v.statut === "DISPONIBLE" && !lectureSeule && (
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() =>
                                ouvrirAffectation(v)
                              }
                              style={iconBtn(
                                "#f0fdf4",
                                "#16a34a",
                                "#bbf7d0"
                              )}
                              title="Affecter un chauffeur"
                            >
                              <IconLink />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* =================================================
              PAGINATION
          ================================================= */}

          {vehiculesFiltres.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginTop: 12,
                padding: "0 2px",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                }}
              >
                Affichage de{" "}
                {debutPage + 1} à{" "}
                {Math.min(
                  debutPage + VEHICULES_PAR_PAGE,
                  vehiculesFiltres.length
                )}{" "}
                sur {vehiculesFiltres.length}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setPageActuelle((page) =>
                      Math.max(1, page - 1)
                    )
                  }
                  disabled={pageActuelle === 1}
                  style={{
                    ...paginationBtn,
                    opacity: pageActuelle === 1 ? 0.45 : 1,
                    cursor:
                      pageActuelle === 1
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  ‹
                </button>

                {Array.from(
                  { length: nombrePages },
                  (_, index) => index + 1
                ).map((numero) => (
                  <button
                    key={numero}
                    type="button"
                    onClick={() => setPageActuelle(numero)}
                    style={{
                      ...paginationBtn,
                      backgroundColor:
                        numero === pageActuelle
                          ? "#dc2626"
                          : "#ffffff",
                      color:
                        numero === pageActuelle
                          ? "#ffffff"
                          : "#374151",
                      borderColor:
                        numero === pageActuelle
                          ? "#dc2626"
                          : "#d1d5db",
                    }}
                  >
                    {numero}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    setPageActuelle((page) =>
                      Math.min(nombrePages, page + 1)
                    )
                  }
                  disabled={pageActuelle === nombrePages}
                  style={{
                    ...paginationBtn,
                    opacity:
                      pageActuelle === nombrePages ? 0.45 : 1,
                    cursor:
                      pageActuelle === nombrePages
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function StatCategorieCard({
  label,
  valeur,
}: {
  label: string;
  valeur: number;
}) {
  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: "9px 11px",
        minHeight: 68,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#4b5563",
          lineHeight: 1.25,
          minWidth: 0,
        }}
        title={label}
      >
        {label}
      </div>

      <div
        style={{
          minWidth: 30,
          height: 30,
          borderRadius: 8,
          backgroundColor: "#fef2f2",
          color: "#b91c1c",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          fontWeight: 800,
          flexShrink: 0,
        }}
      >
        {valeur}
      </div>
    </div>
  );
}

function StatStatutCard({
  statut,
  label,
  valeur,
}: {
  statut: string;
  label: string;
  valeur: number;
}) {
  const styles: Record <
    string,
    { fond: string; bord: string; texte: string }
  > = {
    DISPONIBLE: {
      fond: "#f0fdf4",
      bord: "#bbf7d0",
      texte: "#166534",
    },
    EN_MISSION: {
      fond: "#eff6ff",
      bord: "#bfdbfe",
      texte: "#1e40af",
    },
    MAINTENANCE: {
      fond: "#fef2f2",
      bord: "#fecaca",
      texte: "#991b1b",
    },
    HORS_SERVICE: {
      fond: "#fff7ed",
      bord: "#fed7aa",
      texte: "#9a3412",
    },
    TRANSFERE: {
      fond: "#fffbeb",
      bord: "#fde68a",
      texte: "#92400e",
    },
    REFORME: {
      fond: "#f3f4f6",
      bord: "#d1d5db",
      texte: "#374151",
    },
  };

  const style = styles[statut] || {
    fond: "#ffffff",
    bord: "#e5e7eb",
    texte: "#374151",
  };

  return (
    <div
      style={{
        backgroundColor: style.fond,
        border: `1px solid ${style.bord}`,
        borderRadius: 8,
        padding: "9px 11px",
        minHeight: 68,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#4b5563",
          lineHeight: 1.25,
          minWidth: 0,
        }}
        title={label}
      >
        {label}
      </div>

      <div
        style={{
          minWidth: 30,
          height: 30,
          borderRadius: 8,
          backgroundColor: "#ffffff",
          border: `1px solid ${style.bord}`,
          color: style.texte,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          fontWeight: 800,
          flexShrink: 0,
        }}
      >
        {valeur}
      </div>
    </div>
  );
}

function InfoLigne({
  label,
  valeur,
  dernier = false,
}: {
  label: string;
  valeur: string;
  dernier?: boolean;
}) {
  return (
    <div
      style={{
        padding: "8px 0",
        borderBottom: dernier
          ? "none"
          : "1px solid #e5e7eb",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#9ca3af",
          textTransform: "uppercase",
          letterSpacing: 0.3,
          marginBottom: 3,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 13,
          color: "#374151",
          lineHeight: 1.45,
        }}
      >
        {valeur}
      </div>
    </div>
  );
}

// =========================================================
// STYLES
// =========================================================

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  color: "#374151",
  marginBottom: 6,
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  boxSizing: "border-box",
  padding: "9px 10px",
  border: "2px solid #111827",
  borderRadius: 8,
  width: "100%",
  fontSize: 14,
};

const helpStyle: React.CSSProperties = {
  marginTop: 5,
  fontSize: 11,
  color: "#6b7280",
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(15, 23, 42, 0.65)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: 20,
};

const modalStyle: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: 12,
  width: "100%",
  maxHeight: "90vh",
  overflowY: "auto",
  padding: 28,
  boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
};

const modalHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 20,
};

const closeBtnStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  fontSize: 24,
  cursor: "pointer",
  color: "#374151",
};

const btnPrimary: React.CSSProperties = {
  padding: "10px 16px",
  backgroundColor: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
};

const btnSecondary: React.CSSProperties = {
  padding: "10px 16px",
  backgroundColor: "#e5e7eb",
  color: "#374151",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
};

const iconBtn = (
  bg: string,
  color: string,
  border: string
): React.CSSProperties => ({
  width: 30,
  height: 30,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: bg,
  color,
  border: `1px solid ${border}`,
  borderRadius: 8,
  cursor: "pointer",
});

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 8px",
  fontSize: 10.5,
  color: "#6b7280",
  fontWeight: 700,
  whiteSpace: "nowrap",
  textTransform: "uppercase",
  letterSpacing: "0.02em",
  lineHeight: 1.2,
};

const tdStyle: React.CSSProperties = {
  padding: "7px 8px",
  fontSize: 12,
  color: "#374151",
  verticalAlign: "middle",
  whiteSpace: "nowrap",
  lineHeight: 1.2,
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const paginationBtn: React.CSSProperties = {
  minWidth: 30,
  height: 30,
  padding: "0 8px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#ffffff",
  color: "#374151",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 600,
};

const emptyStyle: React.CSSProperties = {
  ...tdStyle,
  padding: 20,
  textAlign: "center",
  color: "#6b7280",
};