"use client";
import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Pencil,
  Trash2,
  KeyRound,
  Search,
  Power,
  PowerOff,
  Mail,
} from "lucide-react";
import RoleGuard from "@/components/RoleGuard";
import { ROLES } from "@/app/lib/roles";
interface Utilisateur {
  id: number;
  nomComplet: string;
  matricule: string;
  email?: string | null;
  role: string;
  directionId?: number | null;
  actif: boolean;
  doitChangerMotDePasse?: boolean;
}
const roleStyle: Record<string, { bg: string; text: string; label: string }> = {
  AGENT_FLOTTE: {
    bg: "#dcfce7",
    text: "#166534",
    label: "Agent Flotte",
  },
  CHAUFFEUR: {
    bg: "#fce7f3",
    text: "#9d174d",
    label: "Chauffeur",
  },
  CHEF_DIRECTION: {
    bg: "#e0f2fe",
    text: "#0369a1",
    label: "Chef de Direction des employés",
  },
  CHEF_SERVICE_LOGISTIQUE: {
    bg: "#dbeafe",
    text: "#1e40af",
    label: "Chef Service Logistique",
  },
  CHEF_DGAL: {
    bg: "#ede9fe",
    text: "#5b21b6",
    label: "Chef DGAL",
  },
  MECANICIEN_DID: {
    bg: "#fef3c7",
    text: "#92400e",
    label: "Mécanicien diagnostiqueur DID",
  },
  DIRECTEUR_DFP: {
    bg: "#e0e7ff",
    text: "#3730a3",
    label: "Directeur DFP",
  },
};

const DIRECTIONS_SPAT = [
  { id: 1, nom: "Direction Générale" },
  { id: 2, nom: "Direction Audit et Gestion des risques" },
  { id: 3, nom: "Direction des Affaires juridiques" },
  { id: 4, nom: "Direction de la Capitainerie" },
  { id: 5, nom: "Direction Infrastructure et Développement" },
  { id: 6, nom: "Direction Marketing" },
  { id: 7, nom: "Direction de l’exploitation" },
  { id: 8, nom: "Direction Financière et Performance" },
  { id: 9, nom: "Direction des Ressources Humaines" },
  { id: 10, nom: "Direction Digitalisation et Innovation" },
] as const;

function nomDirection(directionId?: number | null) {
  if (!directionId) return "—";
  return DIRECTIONS_SPAT.find((d) => d.id === directionId)?.nom || "—";
}

const avatarPalette = [
  "#dc2626",
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#7c3aed",
  "#0891b2",
];
function couleurAvatar(id: number) {
  return avatarPalette[id % avatarPalette.length];
}
function initiales(nomComplet: string) {
  if (!nomComplet) return "?";
  const morceaux = nomComplet.trim().split(/\s+/);
  return ((morceaux[0]?.[0] || "") + (morceaux[1]?.[0] || "")).toUpperCase();
}
export default function SuperAdminUtilisateursPage() {
  return (
    <RoleGuard role={ROLES.SUPER_ADMIN}>
      <SuperAdminUtilisateursContent />
    </RoleGuard>
  );
}
function SuperAdminUtilisateursContent() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState("");
  const [formOuvert, setFormOuvert] = useState(false);
  const [modeEdition, setModeEdition] = useState(false);
  const [utilisateurEnCours, setUtilisateurEnCours] =
    useState<Utilisateur | null>(null);
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [numMatricule, setNumMatricule] = useState("");
  const [email, setEmail] = useState("");
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState("");
  const [nouveauRole, setNouveauRole] = useState("AGENT_FLOTTE");
  const [directionId, setDirectionId] = useState("");
  const [actif, setActif] = useState(true);
  const [resetOuvert, setResetOuvert] = useState(false);
  const [utilisateurReset, setUtilisateurReset] =
    useState<Utilisateur | null>(null);
  const [motDePasseReset, setMotDePasseReset] = useState("");
  const [confirmationReset, setConfirmationReset] = useState("");
  const [resetEnCours, setResetEnCours] = useState(false);
  const [statutEnCours, setStatutEnCours] = useState<number | null>(null);
  const getToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  };
  const lireErreur = async (res: Response) => {
    const texte = await res.text();
    if (!texte) return "Une erreur est survenue.";
    try {
      const json = JSON.parse(texte);
      return json.message || texte;
    } catch {
      return texte;
    }
  };
  const chargerUtilisateurs = async () => {
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
      const res = await fetch(`${API}/admin/utilisateurs`, {
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
      if (res.status === 403) {
        toast.error(
          "Le Super Admin n'est pas autorisé à accéder aux utilisateurs"
        );
        return;
      }
      if (!res.ok) {
        throw new Error(await lireErreur(res));
      }
      const data: Utilisateur[] = await res.json();
      setUtilisateurs(
        data.filter(
          (u) =>
            u.role !== "ADMIN" &&
            u.role !== "SUPER_ADMIN" &&
            u.role !== "EMPLOYE"
        )
      );
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de charger les utilisateurs"
      );
    } finally {
      setChargement(false);
    }
  };
  useEffect(() => {
    chargerUtilisateurs();
  }, []);
  const resetForm = () => {
    setNom("");
    setPrenom("");
    setNumMatricule("");
    setEmail("");
    setNouveauMotDePasse("");
    setConfirmationMotDePasse("");
    setNouveauRole("AGENT_FLOTTE");
    setDirectionId("");
    setActif(true);
    setModeEdition(false);
    setUtilisateurEnCours(null);
  };
  const fermerFormulaire = () => {
    setFormOuvert(false);
    resetForm();
  };
  const ouvrirCreation = () => {
    resetForm();
    setFormOuvert(true);
  };
  const ouvrirEdition = (u: Utilisateur) => {
    setModeEdition(true);
    setUtilisateurEnCours(u);
    const parties = u.nomComplet.trim().split(/\s+/);
    setPrenom(parties.shift() || "");
    setNom(parties.join(" "));
    setNumMatricule(u.matricule);
    setEmail(u.email || "");
    setNouveauRole(u.role);
    setDirectionId(u.directionId ? String(u.directionId) : "");
    setActif(u.actif);
    setNouveauMotDePasse("");
    setConfirmationMotDePasse("");
    setFormOuvert(true);
  };
  const emailValide = (valeur: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valeur);
  };
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const token = getToken();
    if (!API) {
      toast.error("NEXT_PUBLIC_API_URL n'est pas configurée");
      return;
    }
    if (!token) {
      router.replace("/login");
      return;
    }
    if (!prenom.trim() || !nom.trim()) {
      toast.error("Le nom et le prénom sont obligatoires");
      return;
    }
    if (!numMatricule.trim()) {
      toast.error("Le matricule est obligatoire");
      return;
    }
    if (!email.trim()) {
      toast.error("L'adresse email est obligatoire");
      return;
    }
    if (!emailValide(email.trim())) {
      toast.error("Veuillez saisir une adresse email valide");
      return;
    }
    if (nouveauRole === ROLES.CHEF_DIRECTION && !directionId) {
      toast.error(
        "Le Chef de Direction des employés doit être rattaché à une direction"
      );
      return;
    }
    if (!modeEdition) {
      if (!nouveauMotDePasse) {
        toast.error("Le mot de passe temporaire est obligatoire");
        return;
      }
      if (nouveauMotDePasse.length < 8) {
        toast.error("Le mot de passe doit contenir au moins 8 caractères");
        return;
      }
      if (nouveauMotDePasse !== confirmationMotDePasse) {
        toast.error("Les mots de passe ne correspondent pas");
        return;
      }
    }
    try {
      const body: {
        nomComplet: string;
        matricule: string;
        email: string;
        role: string;
        directionId: number | null;
        actif: boolean;
        motDePasse?: string;
      } = {
        nomComplet: `${prenom.trim()} ${nom.trim()}`.trim(),
        matricule: numMatricule.trim(),
        email: email.trim().toLowerCase(),
        role: nouveauRole,
        directionId:
          nouveauRole === ROLES.CHEF_DIRECTION && directionId
            ? Number(directionId)
            : null,
        actif,
      };
      if (!modeEdition) {
        body.motDePasse = nouveauMotDePasse;
      }
      const url =
        modeEdition && utilisateurEnCours
          ? `${API}/admin/utilisateurs/${utilisateurEnCours.id}`
          : `${API}/admin/utilisateurs`;
      const res = await fetch(url, {
        method: modeEdition ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
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
          "Le Super Admin n'est pas autorisé à effectuer cette opération"
        );
        return;
      }
      if (!res.ok) {
        toast.error(await lireErreur(res));
        return;
      }
      if (modeEdition) {
        toast.success("Utilisateur modifié avec succès");
      } else {
        toast.success(
          "Utilisateur créé. Les informations de connexion ont été envoyées par email."
        );
      }
      fermerFormulaire();
      await chargerUtilisateurs();
    } catch (error) {
      console.error(error);
      toast.error("Impossible de contacter le serveur");
    }
  };
  const modifierStatutCompte = (u: Utilisateur) => {
    const nouveauStatut = !u.actif;
    toast(
      nouveauStatut
        ? `Activer le compte de ${u.nomComplet} ?`
        : `Désactiver le compte de ${u.nomComplet} ?`,
      {
        description: nouveauStatut
          ? "L'utilisateur pourra de nouveau se connecter au portail."
          : "L'utilisateur ne pourra plus se connecter au portail.",
        action: {
          label: nouveauStatut ? "Activer" : "Désactiver",
          onClick: async () => {
            const token = getToken();
            if (!API || !token) {
              toast.error("Session ou configuration invalide");
              return;
            }
            setStatutEnCours(u.id);
            try {
              const res = await fetch(
                `${API}/admin/utilisateurs/${u.id}/actif?actif=${nouveauStatut}`,
                {
                  method: "PATCH",
                  headers: {
                    Authorization: `Bearer ${token}`,
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
                  "Le Super Admin n'est pas autorisé à modifier ce compte"
                );
                return;
              }
              if (!res.ok) {
                toast.error(await lireErreur(res));
                return;
              }
              toast.success(
                nouveauStatut
                  ? "Compte activé avec succès"
                  : "Compte désactivé avec succès"
              );
              await chargerUtilisateurs();
            } catch {
              toast.error("Impossible de contacter le serveur");
            } finally {
              setStatutEnCours(null);
            }
          },
        },
        cancel: {
          label: "Annuler",
        },
      }
    );
  };
  const handleSupprimer = (u: Utilisateur) => {
    toast(`Supprimer ${u.nomComplet} ?`, {
      description:
        "Cette action est définitive. Privilégiez la désactivation lorsqu'un utilisateur a déjà utilisé le système.",
      action: {
        label: "Supprimer",
        onClick: async () => {
          const token = getToken();
          if (!API || !token) {
            toast.error("Session ou configuration invalide");
            return;
          }
          try {
            const res = await fetch(
              `${API}/admin/utilisateurs/${u.id}`,
              {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            if (res.status === 403) {
              toast.error(
                "Le Super Admin n'est pas autorisé à supprimer cet utilisateur"
              );
              return;
            }
            if (!res.ok) {
              toast.error(await lireErreur(res));
              return;
            }
            toast.success("Utilisateur supprimé");
            await chargerUtilisateurs();
          } catch {
            toast.error("Erreur de connexion");
          }
        },
      },
      cancel: {
        label: "Annuler",
      },
    });
  };
  const ouvrirResetMotDePasse = (u: Utilisateur) => {
    if (!u.email) {
      toast.error(
        "Cet utilisateur ne possède pas encore d'adresse email."
      );
      return;
    }
    setUtilisateurReset(u);
    setMotDePasseReset("");
    setConfirmationReset("");
    setResetOuvert(true);
  };
  const fermerResetMotDePasse = () => {
    setResetOuvert(false);
    setUtilisateurReset(null);
    setMotDePasseReset("");
    setConfirmationReset("");
  };
  const confirmerResetMotDePasse = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    if (!utilisateurReset) return;
    if (!motDePasseReset) {
      toast.error("Veuillez saisir le nouveau mot de passe");
      return;
    }
    if (motDePasseReset.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    if (motDePasseReset !== confirmationReset) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    const token = getToken();
    if (!API || !token) {
      toast.error("Session ou configuration invalide");
      return;
    }
    setResetEnCours(true);
    try {
      const res = await fetch(
        `${API}/admin/utilisateurs/${utilisateurReset.id}/reinitialiser-mot-de-passe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            nouveauMotDePasse: motDePasseReset,
          }),
        }
      );
      if (res.status === 401) {
        toast.error("Votre session a expiré");
        router.replace("/login");
        return;
      }
      if (res.status === 403) {
        toast.error(
          "Le Super Admin n'est pas autorisé à réinitialiser ce mot de passe"
        );
        return;
      }
      if (!res.ok) {
        toast.error(await lireErreur(res));
        return;
      }
      fermerResetMotDePasse();
      toast.success(
        "Mot de passe réinitialisé. Le nouveau mot de passe a été envoyé à l'utilisateur par email."
      );
    } catch {
      toast.error("Impossible de contacter le serveur");
    } finally {
      setResetEnCours(false);
    }
  };
  const termeRecherche = recherche.trim().toLowerCase();
  const utilisateursFiltres = utilisateurs.filter((u) => {
    if (!termeRecherche) return true;
    return (
      (u.nomComplet || "").toLowerCase().includes(termeRecherche) ||
      (u.matricule || "").toLowerCase().includes(termeRecherche) ||
      (u.email || "").toLowerCase().includes(termeRecherche) ||
      (u.role || "").toLowerCase().includes(termeRecherche) ||
      nomDirection(u.directionId).toLowerCase().includes(termeRecherche)
    );
  });
  return (
    <>
      <style jsx global>{`
        input,
        select {
          color: #111827;
          background-color: white;
          border: 2px solid #111827;
          font-size: 14px;
        }
        input:focus,
        select:focus {
          outline: 2px solid #dc2626;
          outline-offset: 1px;
        }
        .ligne-utilisateur:hover {
          background: #f9fafb;
        }
      `}</style>
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#f3f4f6",
          padding: 32,
        }}
      >
        <div
          style={{
            maxWidth: 1300,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 24,
              position: "relative",
              minHeight: 42,
            }}
          >
            <button
              type="button"
              onClick={() => router.push("/super-admin")}
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
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
                color: "#1e293b",
                margin: 0,
                whiteSpace: "nowrap",
              }}
            >
              Gestion des comptes utilisateurs
            </h2>
            <button
              type="button"
              onClick={ouvrirCreation}
              style={{
                padding: "10px 20px",
                backgroundColor: "#dc2626",
                color: "white",
                border: "none",
                borderRadius: 6,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              + Ajouter un utilisateur
            </button>
          </div>
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
                maxWidth: 470,
              }}
            >
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#9ca3af",
                }}
              />
              <input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher par nom, matricule, email, rôle ou direction..."
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "10px 12px 10px 36px",
                  border: "1px solid #111827",
                  borderRadius: 8,
                }}
              />
            </div>
          </div>
          {formOuvert && (
            <div style={overlayStyle}>
              <div style={modalStyle}>
                <div style={modalHeaderStyle}>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 22,
                      color: "#111827",
                    }}
                  >
                    {modeEdition
                      ? "Modifier l'utilisateur"
                      : "Ajouter un utilisateur"}
                  </h3>
                  <button
                    type="button"
                    onClick={fermerFormulaire}
                    style={closeBtnStyle}
                  >
                    ×
                  </button>
                </div>
                <form
                  onSubmit={handleSubmit}
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(2,minmax(220px,1fr))",
                    gap: 16,
                  }}
                >
                  <div>
                    <label style={labelStyle}>Nom *</label>
                    <input
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      required
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Prénom *</label>
                    <input
                      value={prenom}
                      onChange={(e) => setPrenom(e.target.value)}
                      required
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Matricule *</label>
                    <input
                      value={numMatricule}
                      onChange={(e) => setNumMatricule(e.target.value)}
                      required
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>
                      Adresse email *
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="prenom.nom@spat.mg"
                      required
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Rôle *</label>
                    <select
                      value={nouveauRole}
                      onChange={(e) => {
                        setNouveauRole(e.target.value);
                        setDirectionId("");
                      }}
                      style={inputStyle}
                    >
                      <option value="AGENT_FLOTTE">
                        Agent Flotte
                      </option>
                      <option value="CHAUFFEUR">
                        Chauffeur
                      </option>
                      <option value={ROLES.CHEF_DIRECTION}>
                        Chef de Direction des employés
                      </option>
                      <option value="CHEF_SERVICE_LOGISTIQUE">
                        Chef Service Logistique
                      </option>
                      <option value="CHEF_DGAL">
                        Chef DGAL
                      </option>
                      <option value="MECANICIEN_DID">
                        Mécanicien diagnostiqueur DID
                      </option>
                      <option value="DIRECTEUR_DFP">
                        Directeur DFP
                      </option>
                    </select>
                  </div>
                  {nouveauRole === ROLES.CHEF_DIRECTION && (
                    <div>
                      <label style={labelStyle}>
                        Direction SPAT *
                      </label>
                      <select
                        value={directionId}
                        onChange={(e) =>
                          setDirectionId(e.target.value)
                        }
                        required
                        style={inputStyle}
                      >
                        <option value="">
                          Sélectionner une direction
                        </option>
                        {DIRECTIONS_SPAT.map((direction) => (
                          <option
                            key={direction.id}
                            value={direction.id}
                          >
                            {direction.nom}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {!modeEdition && (
                    <>
                      <div>
                        <label style={labelStyle}>
                          Mot de passe temporaire *
                        </label>
                        <input
                          type="password"
                          value={nouveauMotDePasse}
                          onChange={(e) =>
                            setNouveauMotDePasse(
                              e.target.value
                            )
                          }
                          minLength={8}
                          required
                          style={inputStyle}
                          autoComplete="new-password"
                        />
                        <div style={helpStyle}>
                          Minimum 8 caractères.
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>
                          Confirmation *
                        </label>
                        <input
                          type="password"
                          value={confirmationMotDePasse}
                          onChange={(e) =>
                            setConfirmationMotDePasse(
                              e.target.value
                            )
                          }
                          minLength={8}
                          required
                          style={inputStyle}
                          autoComplete="new-password"
                        />
                      </div>
                    </>
                  )}
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 0",
                    }}
                  >
                    <input
                      id="utilisateurActif"
                      type="checkbox"
                      checked={actif}
                      onChange={(e) =>
                        setActif(e.target.checked)
                      }
                      style={{
                        width: 18,
                        height: 18,
                        cursor: "pointer",
                      }}
                    />
                    <label
                      htmlFor="utilisateurActif"
                      style={{
                        fontSize: 14,
                        color: "#374151",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Compte actif
                    </label>
                  </div>
                  {!modeEdition && (
                    <div
                      style={{
                        gridColumn: "1 / -1",
                        padding: 12,
                        borderRadius: 8,
                        backgroundColor: "#eff6ff",
                        color: "#1e40af",
                        fontSize: 13,
                        lineHeight: 1.5,
                      }}
                    >
                      Le mot de passe temporaire sera
                      enregistré de manière chiffrée et les
                      informations de connexion seront
                      envoyées à l'adresse email renseignée.
                    </div>
                  )}
                  <div
                    style={{
                      gridColumn: "1/-1",
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
                      {modeEdition
                        ? "Enregistrer"
                        : "Créer le compte"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {resetOuvert && utilisateurReset && (
            <div style={overlayStyle}>
              <div
                style={{
                  ...modalStyle,
                  maxWidth: 560,
                }}
              >
                <div style={modalHeaderStyle}>
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        color: "#111827",
                        fontSize: 21,
                      }}
                    >
                      Réinitialiser le mot de passe
                    </h3>
                    <p
                      style={{
                        margin: "6px 0 0",
                        color: "#6b7280",
                        fontSize: 13,
                      }}
                    >
                      {utilisateurReset.nomComplet}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fermerResetMotDePasse}
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
                    padding: 14,
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      color: "#374151",
                      marginBottom: 6,
                    }}
                  >
                    <strong>Matricule :</strong>{" "}
                    {utilisateurReset.matricule}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 13,
                      color: "#374151",
                    }}
                  >
                    <Mail size={14} />
                    <strong>Email :</strong>{" "}
                    {utilisateurReset.email}
                  </div>
                </div>
                <form
                  onSubmit={confirmerResetMotDePasse}
                >
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>
                      Nouveau mot de passe temporaire *
                    </label>
                    <input
                      type="password"
                      value={motDePasseReset}
                      onChange={(e) =>
                        setMotDePasseReset(e.target.value)
                      }
                      minLength={8}
                      required
                      style={inputStyle}
                      autoComplete="new-password"
                    />
                    <div style={helpStyle}>
                      Minimum 8 caractères.
                    </div>
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>
                      Confirmer le mot de passe *
                    </label>
                    <input
                      type="password"
                      value={confirmationReset}
                      onChange={(e) =>
                        setConfirmationReset(e.target.value)
                      }
                      minLength={8}
                      required
                      style={inputStyle}
                      autoComplete="new-password"
                    />
                  </div>
                  <div
                    style={{
                      padding: 12,
                      backgroundColor: "#fffbeb",
                      border: "1px solid #fde68a",
                      borderRadius: 8,
                      color: "#92400e",
                      fontSize: 13,
                      lineHeight: 1.5,
                      marginBottom: 20,
                    }}
                  >
                    Après confirmation, l'ancien mot de
                    passe ne fonctionnera plus. Le nouveau
                    mot de passe temporaire sera envoyé à
                    l'utilisateur par email.
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 10,
                    }}
                  >
                    <button
                      type="button"
                      onClick={fermerResetMotDePasse}
                      disabled={resetEnCours}
                      style={btnSecondary}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={resetEnCours}
                      style={{
                        ...btnPrimary,
                        opacity: resetEnCours ? 0.7 : 1,
                      }}
                    >
                      {resetEnCours
                        ? "Réinitialisation..."
                        : "Réinitialiser"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          <div
            style={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
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
                  <th style={thStyle}>Utilisateur</th>
                  <th style={thStyle}>Matricule</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Rôle</th>
                  <th style={thStyle}>Direction</th>
                  <th style={thStyle}>Statut</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {chargement ? (
                  <tr>
                    <td colSpan={7} style={emptyStyle}>
                      Chargement...
                    </td>
                  </tr>
                ) : utilisateursFiltres.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={emptyStyle}>
                      Aucun utilisateur
                    </td>
                  </tr>
                ) : (
                  utilisateursFiltres.map((u) => {
                    const r = roleStyle[u.role] || {
                      bg: "#f3f4f6",
                      text: "#374151",
                      label: u.role,
                    };
                    return (
                      <tr
                        key={u.id}
                        className="ligne-utilisateur"
                        style={{
                          borderBottom:
                            "1px solid #f3f4f6",
                          opacity: u.actif ? 1 : 0.72,
                        }}
                      >
                        <td style={tdStyle}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: "50%",
                                backgroundColor:
                                  couleurAvatar(u.id),
                                color: "white",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {initiales(u.nomComplet)}
                            </div>
                            <div
                              style={{
                                fontWeight: 600,
                                color: "#111827",
                              }}
                            >
                              {u.nomComplet}
                            </div>
                          </div>
                        </td>
                        <td style={tdStyle}>
                          {u.matricule}
                        </td>
                        <td style={tdStyle}>
                          {u.email ? (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <Mail
                                size={14}
                                color="#6b7280"
                              />
                              {u.email}
                            </div>
                          ) : (
                            <span
                              style={{
                                color: "#dc2626",
                                fontSize: 12,
                              }}
                            >
                              Email non renseigné
                            </span>
                          )}
                        </td>
                        <td style={tdStyle}>
                          <span
                            style={{
                              backgroundColor: r.bg,
                              color: r.text,
                              padding: "4px 10px",
                              borderRadius: 20,
                              fontSize: 12,
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {r.label}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          {u.role === ROLES.CHEF_DIRECTION
                            ? nomDirection(u.directionId)
                            : "—"}
                        </td>
                        <td style={tdStyle}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              backgroundColor: u.actif
                                ? "#dcfce7"
                                : "#fee2e2",
                              color: u.actif
                                ? "#166534"
                                : "#991b1b",
                              padding: "5px 9px",
                              borderRadius: 20,
                              fontWeight: 600,
                              fontSize: 12,
                            }}
                          >
                            <span
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: "50%",
                                backgroundColor: u.actif
                                  ? "#16a34a"
                                  : "#dc2626",
                              }}
                            />
                            {u.actif
                              ? "Actif"
                              : "Inactif"}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <div
                            style={{
                              display: "flex",
                              gap: 7,
                              flexWrap: "wrap",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                ouvrirEdition(u)
                              }
                              style={iconBtn(
                                "#eff6ff",
                                "#2563eb",
                                "#bfdbfe"
                              )}
                              title="Modifier"
                              aria-label={`Modifier ${u.nomComplet}`}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                ouvrirResetMotDePasse(u)
                              }
                              style={iconBtn(
                                "#fef3c7",
                                "#92400e",
                                "#fde68a"
                              )}
                              title="Réinitialiser le mot de passe"
                              aria-label={`Réinitialiser le mot de passe de ${u.nomComplet}`}
                            >
                              <KeyRound size={15} />
                            </button>
                            <button
                              type="button"
                              disabled={
                                statutEnCours === u.id
                              }
                              onClick={() =>
                                modifierStatutCompte(u)
                              }
                              style={{
                                ...iconBtn(
                                  u.actif
                                    ? "#fff7ed"
                                    : "#f0fdf4",
                                  u.actif
                                    ? "#c2410c"
                                    : "#15803d",
                                  u.actif
                                    ? "#fed7aa"
                                    : "#bbf7d0"
                                ),
                                opacity:
                                  statutEnCours === u.id
                                    ? 0.5
                                    : 1,
                              }}
                              title={
                                u.actif
                                  ? "Désactiver le compte"
                                  : "Activer le compte"
                              }
                              aria-label={
                                u.actif
                                  ? `Désactiver ${u.nomComplet}`
                                  : `Activer ${u.nomComplet}`
                              }
                            >
                              {u.actif ? (
                                <PowerOff size={15} />
                              ) : (
                                <Power size={15} />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleSupprimer(u)
                              }
                              style={iconBtn(
                                "#fef2f2",
                                "#dc2626",
                                "#fecaca"
                              )}
                              title="Supprimer"
                              aria-label={`Supprimer ${u.nomComplet}`}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
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
    </>
  );
}
const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 13,
  color: "#374151",
  marginBottom: 6,
  fontWeight: 600,
};
const inputStyle: CSSProperties = {
  boxSizing: "border-box",
  padding: "10px 12px",
  border: "2px solid #111827",
  borderRadius: 8,
  width: "100%",
  fontSize: 14,
};
const helpStyle: CSSProperties = {
  marginTop: 5,
  fontSize: 11,
  color: "#6b7280",
};
const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(15,23,42,0.65)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: 20,
};
const modalStyle: CSSProperties = {
  backgroundColor: "white",
  borderRadius: 12,
  width: "100%",
  maxWidth: 760,
  maxHeight: "90vh",
  overflowY: "auto",
  padding: 28,
  boxShadow: "0 12px 40px rgba(0,0,0,.25)",
};
const modalHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 20,
};
const closeBtnStyle: CSSProperties = {
  border: "none",
  background: "transparent",
  fontSize: 24,
  cursor: "pointer",
  color: "#374151",
};
const btnPrimary: CSSProperties = {
  padding: "10px 16px",
  backgroundColor: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
};
const btnSecondary: CSSProperties = {
  padding: "10px 16px",
  backgroundColor: "#e5e7eb",
  color: "#374151",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
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
  padding: "12px 16px",
  fontSize: 14,
  color: "#374151",
  verticalAlign: "middle",
};
const emptyStyle: CSSProperties = {
  ...tdStyle,
  padding: 32,
  textAlign: "center",
  color: "#6b7280",
};
const iconBtn = (
  bg: string,
  color: string,
  border: string
): CSSProperties => ({
  width: 34,
  height: 34,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: bg,
  color,
  border: `1px solid ${border}`,
  borderRadius: 8,
  cursor: "pointer",
});