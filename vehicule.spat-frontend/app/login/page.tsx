
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { LockKeyhole, UserRound, LoaderCircle, Eye, EyeOff } from "lucide-react";

type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "CO_ADMIN"
  | "DIRECTEUR_DFP"
  | "CHEF_SERVICE_LOGISTIQUE"
  | "CHEF_DIRECTION"
  | "ASSISTANT_DIRECTION"
  | "CHEF_DGAL"
  | "MECANICIEN_DID"
  | "AGENT_FLOTTE"
  | "AGENT_SURETE";

interface LoginResponse {
  token: string;
  role: Role;
  numMatricule: string;
}

interface EmailPersonnel {
  nom: string;
  email: string;
}

function homeForRole(role: string | null | undefined): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/super-admin";

    case "ADMIN":
    case "CO_ADMIN":
    case "DIRECTEUR_DFP":
      return "/admin";

    case "CHEF_SERVICE_LOGISTIQUE":
      return "/chef-service-logistique";

    case "CHEF_DIRECTION":
      return "/chef-direction";

    case "ASSISTANT_DIRECTION":
      return "/assistant-direction";

    case "CHEF_DGAL":
      return "/chef-dgal";

    case "MECANICIEN_DID":
      return "/mecanicien-did";

    case "AGENT_FLOTTE":
      return "/agent-flotte";
    case "AGENT_SURETE":
      return "/agent-surete";

    default:
      return "/login";
  }
}

function isValidRole(role: string): role is Role {
  return [
    "SUPER_ADMIN",
    "ADMIN",
    "CO_ADMIN",
    "DIRECTEUR_DFP",
    "CHEF_SERVICE_LOGISTIQUE",
    "CHEF_DIRECTION",
    "ASSISTANT_DIRECTION",
    "CHEF_DGAL",
    "MECANICIEN_DID",
    "AGENT_FLOTTE",
    "AGENT_SURETE",
  ].includes(role);
}

export default function LoginPage() {
  const [numMatricule, setNumMatricule] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  const [afficherModalAdmin, setAfficherModalAdmin] = useState(false);
  const [demandeEnCours, setDemandeEnCours] = useState(false);
  const [demandeEnvoyee, setDemandeEnvoyee] = useState(false);
  const [methodeMotDePasse, setMethodeMotDePasse] = useState<"choix" | "ancienne" | "email">("choix");
  const [emailMotDePasse, setEmailMotDePasse] = useState("");
  const [motDePasseTemporaire, setMotDePasseTemporaire] = useState("");
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [confirmationNouveauMotDePasse, setConfirmationNouveauMotDePasse] = useState("");
  const [emailTemporaireEnvoye, setEmailTemporaireEnvoye] = useState(false);
  const [emailsPersonnel, setEmailsPersonnel] = useState<EmailPersonnel[]>([]);
  const [rechercheEmail, setRechercheEmail] = useState("");

  useEffect(() => {
    fetch("/data/emails-personnel.json", { cache: "force-cache" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Répertoire email indisponible");
        const data: unknown = await response.json();
        if (!Array.isArray(data)) throw new Error("Format du répertoire email invalide");
        setEmailsPersonnel(data as EmailPersonnel[]);
      })
      .catch(() => setEmailsPersonnel([]));
  }, []);

  const emailsFiltres = useMemo(() => {
    const terme = rechercheEmail.trim().toLocaleLowerCase("fr");
    if (!terme) return [];
    return emailsPersonnel
      .filter((contact) => `${contact.nom} ${contact.email}`.toLocaleLowerCase("fr").includes(terme))
      .slice(0, 30);
  }, [emailsPersonnel, rechercheEmail]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (chargement) return;

    setErreur("");
    setChargement(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      if (!apiUrl) {
        throw new Error(
          "La variable NEXT_PUBLIC_API_URL n'est pas configurée."
        );
      }

      const matricule = numMatricule.trim();

      if (!matricule) {
        const message = "Veuillez saisir votre numéro matricule.";
        setErreur(message);
        toast.error(message);
        return;
      }

      if (!motDePasse) {
        const message = "Veuillez saisir votre mot de passe.";
        setErreur(message);
        toast.error(message);
        return;
      }

      const response = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          numMatricule: matricule,
          motDePasse,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          data?.message || "Matricule ou mot de passe incorrect.";

        setErreur(message);
        toast.error(message);
        return;
      }

      if (!data?.token || !data?.role) {
        const message = "La réponse du serveur est incomplète.";
        setErreur(message);
        toast.error(message);
        return;
      }

      if (!isValidRole(data.role)) {
        const message = `Rôle utilisateur inconnu : ${data.role}`;
        setErreur(message);
        toast.error(message);
        return;
      }

      const loginData: LoginResponse = {
        token: data.token,
        role: data.role,
        numMatricule: data.numMatricule || matricule,
      };

      localStorage.setItem("token", loginData.token);
      localStorage.setItem("role", loginData.role);
      localStorage.setItem(
        "numMatricule",
        loginData.numMatricule
      );

      toast.success("Connexion réussie.");

      const destination = homeForRole(loginData.role);

      window.location.replace(destination);
    } catch (error) {
      console.error("Erreur de connexion :", error);

      const message =
        error instanceof Error &&
        error.message.includes("NEXT_PUBLIC_API_URL")
          ? error.message
          : "Impossible de contacter le serveur.";

      setErreur(message);
      toast.error(message);
    } finally {
      setChargement(false);
    }
  };

  const ouvrirMotDePasseOublie = () => {
    setDemandeEnvoyee(false);
    setMethodeMotDePasse("choix");
    setEmailMotDePasse("");
    setRechercheEmail("");
    setMotDePasseTemporaire("");
    setNouveauMotDePasse("");
    setConfirmationNouveauMotDePasse("");
    setEmailTemporaireEnvoye(false);
    setAfficherModalAdmin(true);
  };

  const demanderNouveauMotDePasse = async () => {
    if (demandeEnCours) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!apiUrl) {
      toast.error(
        "La variable NEXT_PUBLIC_API_URL n'est pas configurée."
      );
      return;
    }

    const matricule = numMatricule.trim();

    if (!matricule) {
      toast.error(
        "Veuillez d'abord saisir votre numéro matricule."
      );
      return;
    }

    setDemandeEnCours(true);

    try {
      const response = await fetch(
        `${apiUrl}/auth/mot-de-passe-oublie`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ matricule }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          data?.message ||
          data?.erreur ||
          "Impossible d'envoyer la demande.";

        toast.error(message);
        return;
      }

      setDemandeEnvoyee(true);
      toast.success("Demande envoyée au Super Admin.");
    } catch (error) {
      console.error("Erreur mot de passe oublié :", error);
      toast.error("Impossible de contacter le serveur.");
    } finally {
      setDemandeEnCours(false);
    }
  };

  const demanderMotDePasseTemporaire = async () => {
    if (demandeEnCours) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const email = emailMotDePasse.trim();
    if (!apiUrl) {
      toast.error("La variable NEXT_PUBLIC_API_URL n'est pas configurée.");
      return;
    }
    if (!email) {
      toast.error("Veuillez saisir votre adresse email.");
      return;
    }

    setDemandeEnCours(true);
    try {
      const response = await fetch(`${apiUrl}/auth/mot-de-passe-oublie/nouvelle-methode`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(data?.message || "Impossible de traiter la demande.");
        return;
      }
      setEmailTemporaireEnvoye(true);
      setMotDePasseTemporaire("");
      setNouveauMotDePasse("");
      setConfirmationNouveauMotDePasse("");
      toast.success("Si cette adresse correspond à un compte, un mot de passe temporaire a été envoyé.");
    } catch {
      toast.error("Impossible de contacter le serveur.");
    } finally {
      setDemandeEnCours(false);
    }
  };

  const changerMotDePasseTemporaire = async () => {
    if (demandeEnCours) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      toast.error("La variable NEXT_PUBLIC_API_URL n'est pas configurée.");
      return;
    }
    if (!motDePasseTemporaire || !nouveauMotDePasse) {
      toast.error("Veuillez renseigner le mot de passe temporaire et le nouveau mot de passe.");
      return;
    }
    if (nouveauMotDePasse.length < 8) {
      toast.error("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (nouveauMotDePasse !== confirmationNouveauMotDePasse) {
      toast.error("La confirmation du nouveau mot de passe ne correspond pas.");
      return;
    }

    setDemandeEnCours(true);
    try {
      const response = await fetch(`${apiUrl}/auth/mot-de-passe-oublie/changer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          email: emailMotDePasse.trim(),
          motDePasseTemporaire,
          nouveauMotDePasse,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(data?.message || "Impossible de changer le mot de passe.");
        return;
      }
      toast.success(data?.message || "Mot de passe changé. Vous pouvez vous connecter.");
      setAfficherModalAdmin(false);
      setMotDePasse(nouveauMotDePasse);
    } catch {
      toast.error("Impossible de contacter le serveur.");
    } finally {
      setDemandeEnCours(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-layout">

        <section className="brand-panel">
          <div className="brand-content">
            <div className="logo-hexagon">
              <img
                src="/logo.png"
                alt="Logo SPAT"
                className="brand-logo"
              />
            </div>

            <h2>G.P.A</h2>
          </div>
        </section>

        <section className="form-panel">
          <div className="form-content">
            <header className="login-header">
              <h1>LOGIN</h1>

            </header>

            <div className="form-card">
              <form onSubmit={handleSubmit}>

                <div className="field">
                  <label
                    htmlFor="numMatricule"
                    className="sr-only"
                  >
                    Numéro matricule
                  </label>

                  <div className="input-wrapper">
                    <UserRound
                      size={20}
                      className="input-icon"
                      aria-hidden="true"
                    />

                    <input
                      id="numMatricule"
                      name="numMatricule"
                      type="text"
                      placeholder="Numéro matricule"
                      value={numMatricule}
                      onChange={(e) =>
                        setNumMatricule(e.target.value)
                      }
                      autoComplete="username"
                      required
                      disabled={chargement}
                    />
                  </div>
                </div>

                <div className="field">
                  <label
                    htmlFor="motDePasse"
                    className="sr-only"
                  >
                    Mot de passe
                  </label>

                  <div className="input-wrapper">
                    <LockKeyhole
                      size={20}
                      className="input-icon"
                      aria-hidden="true"
                    />

                    <input
                      id="motDePasse"
                      name="motDePasse"
                      type={motDePasseVisible ? "text" : "password"}
                      placeholder="Mot de passe"
                      value={motDePasse}
                      onChange={(e) =>
                        setMotDePasse(e.target.value)
                      }
                      autoComplete="current-password"
                      required
                      disabled={chargement}
                    />
                    <button
                      type="button"
                      className="password-visibility-button"
                      onClick={() => setMotDePasseVisible((visible) => !visible)}
                      disabled={chargement}
                      aria-label={motDePasseVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      aria-pressed={motDePasseVisible}
                    >
                      {motDePasseVisible ? <EyeOff size={19} /> : <Eye size={19} />}
                    </button>
                  </div>
                </div>

                {erreur && (
                  <p className="error-message" role="alert">
                    {erreur}
                  </p>
                )}

                <button
                  type="submit"
                  className="login-button"
                  data-default-primary="true"
                  disabled={chargement}
                >
                  {chargement ? (
                    <>
                      <LoaderCircle
                        size={18}
                        className="loading-icon"
                        aria-hidden="true"
                      />
                      Connexion...
                    </>
                  ) : (
                    "Se connecter"
                  )}
                </button>
              </form>
            </div>

            <button
              type="button"
              className="forgot-password-button"
              onClick={ouvrirMotDePasseOublie}
            >
              Mot de passe oublié ?
            </button>
          </div>
        </section>
      </div>

      {afficherModalAdmin && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!demandeEnCours) {
              setAfficherModalAdmin(false);
            }
          }}
        >
          <div
            className="modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-password-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="reset-password-title">
              Réinitialisation du mot de passe
            </h2>

            <div className="reset-method-buttons" role="group" aria-label="Méthode de réinitialisation">
              <button
                type="button"
                aria-pressed={methodeMotDePasse === "ancienne"}
                onClick={() => setMethodeMotDePasse("ancienne")}
                className={`reset-method-button${methodeMotDePasse === "ancienne" ? " selected" : ""}`}
              >
                Contacter le Super Admin
              </button>
              <button
                type="button"
                aria-pressed={methodeMotDePasse === "email"}
                onClick={() => setMethodeMotDePasse("email")}
                className={`reset-method-button${methodeMotDePasse === "email" ? " selected" : ""}`}
              >
                Pas besoin de Super Admin
              </button>
            </div>

            {methodeMotDePasse === "choix" && (
              null
            )}

            {methodeMotDePasse === "ancienne" && (
              !demandeEnvoyee ? (
                <>

                  <button type="button" onClick={demanderNouveauMotDePasse} disabled={demandeEnCours} className="modal-request-button">
                    {demandeEnCours ? "Envoi en cours..." : "Demander au Super Admin"}
                  </button>
                </>
              ) : (
                <>
                  <div className="success-message">Demande envoyée au Super Admin.</div>
                  <p>Une notification a été envoyée pour le matricule <strong>{numMatricule.trim()}</strong>.</p>
                  <button type="button" onClick={() => setAfficherModalAdmin(false)} className="modal-close-button">Fermer</button>
                </>
              )
            )}

            {methodeMotDePasse === "email" && (
              !emailTemporaireEnvoye ? (
                <>

                  <label className="reset-field-label" htmlFor="email-personnel-search">Rechercher un personnel ou un email</label>
                  <input id="email-personnel-search" className="reset-input" value={rechercheEmail} onChange={(event) => setRechercheEmail(event.target.value)} placeholder="Nom ou adresse email" />
                  <div role="radiogroup" aria-label="Emails du personnel" style={{ maxHeight: 190, overflowY: "auto", display: "grid", gap: 6, margin: "8px 0 12px" }}>
                    {emailsFiltres.map((contact) => (
                      <label key={`${contact.email}-${contact.nom}`} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 10px", border: "1px solid #dbe3ea", borderRadius: 8, cursor: "pointer" }}>
                        <input type="radio" name="email-personnel" value={contact.email} checked={emailMotDePasse === contact.email} onChange={() => setEmailMotDePasse(contact.email)} />
                        <span><strong style={{ display: "block" }}>{contact.nom}</strong><small style={{ color: "#64748b" }}>{contact.email}</small></span>
                      </label>
                    ))}

                    {rechercheEmail.trim() && !emailsFiltres.length && <span style={{ color: "#64748b", fontSize: 13 }}>Aucun email correspondant.</span>}
                  </div>
                  <button type="button" onClick={demanderMotDePasseTemporaire} disabled={demandeEnCours} className="modal-request-button">
                    {demandeEnCours ? "Envoi en cours..." : "Envoyer le mot de passe temporaire"}
                  </button>
                </>
              ) : (
                <>
                  <div className="success-message">Si cette adresse correspond à un compte actif, un mot de passe temporaire lui a été envoyé. Il expire après une heure.</div>

                  <label className="reset-field-label" htmlFor="temporary-password">Mot de passe temporaire</label>
                  <input id="temporary-password" className="reset-input" type="password" autoComplete="one-time-code" value={motDePasseTemporaire} onChange={(event) => setMotDePasseTemporaire(event.target.value)} />
                  <label className="reset-field-label" htmlFor="new-password">Nouveau mot de passe</label>
                  <input id="new-password" className="reset-input" type="password" autoComplete="new-password" minLength={8} value={nouveauMotDePasse} onChange={(event) => setNouveauMotDePasse(event.target.value)} />
                  <label className="reset-field-label" htmlFor="confirm-new-password">Confirmer le nouveau mot de passe</label>
                  <input id="confirm-new-password" className="reset-input" type="password" autoComplete="new-password" minLength={8} value={confirmationNouveauMotDePasse} onChange={(event) => setConfirmationNouveauMotDePasse(event.target.value)} />
                  <button type="button" onClick={changerMotDePasseTemporaire} disabled={demandeEnCours} className="modal-request-button">
                    {demandeEnCours ? "Modification en cours..." : "Changer le mot de passe"}
                  </button>
                  <button type="button" onClick={demanderMotDePasseTemporaire} disabled={demandeEnCours} className="modal-close-button">Renvoyer un mot de passe temporaire</button>
                </>
              )
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          box-sizing: border-box;
          background: #ffffff;
          font-family: Arial, Helvetica, sans-serif;
        }

        .login-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          width: 100%;
          max-width: 1140px;
          min-height: 650px;
          overflow: hidden;
          background: #ffffff;
          border-radius: 26px;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.12);
        }

        

        .brand-panel {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          min-height: 650px;
          background: #ffffff;
        }

        .brand-panel::before {
          content: "";
          position: absolute;
          top: -215px;
          left: -205px;
          width: 450px;
          height: 375px;
          border-radius: 50%;
          background: #ffffff;
        }

        .brand-panel::after {
          content: "";
          position: absolute;
          right: -210px;
          bottom: -245px;
          width: 430px;
          height: 370px;
          border-radius: 50%;
          background: #ffffff;
        }

        .brand-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 34px;
          padding: 35px;
          text-align: center;
        }

        .logo-hexagon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 210px;
          height: 235px;
          background: #ffffff;
          clip-path: polygon(
            50% 0%,
            100% 25%,
            100% 75%,
            50% 100%,
            0% 75%,
            0% 25%
          );
        }

        .brand-logo {
          display: block;
          width: 155px;
          height: 155px;
          object-fit: contain;
        }

        .brand-content h2 {
          margin: 0;
          color: #172033;
          font-size: 27px;
          font-weight: 800;
          letter-spacing: 0.2px;
        }

        

        .form-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 65px 55px;
          box-sizing: border-box;
          background: #ffffff;
        }

        .form-content {
          width: 100%;
          max-width: 440px;
        }

        .login-header {
          margin-bottom: 38px;
        }

        .login-header h1 {
          display: table;
          margin: 0 auto;
          padding-bottom: 5px;
          color: #172033;
          font-size: 37px;
          line-height: 1.15;
          font-weight: 800;
          border-bottom: 4px solid #e2e8f0;
        }

        .login-header p {
          margin: 13px 0 0;
          color: #64748b;
          font-size: 16px;
          text-align: center;
        }

        .form-card {
          padding: 23px;
          border: 1px solid #eef0f5;
          border-radius: 15px;
          background: #ffffff;
          box-shadow: 0 2px 5px rgba(15, 23, 42, 0.04);
        }

        .field {
          margin-bottom: 27px;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-wrapper :global(svg.input-icon) {
          position: absolute;
          left: 17px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 1;
          color: #8a97ad;
          pointer-events: none;
          transition: color 150ms ease;
        }

        .input-wrapper input {
          display: block;
          width: 100%;
          height: 56px;
          box-sizing: border-box;
          padding: 0 16px 0 51px;
          border: 1px solid #cfd7e3;
          border-radius: 10px;
          outline: none;
          background: #ffffff;
          color: #172033;
          font-size: 15px;
          transition:
            border-color 150ms ease,
            box-shadow 150ms ease;
        }

        .input-wrapper input::placeholder {
          color: #8a97ad;
          opacity: 1;
        }

        .input-wrapper input:focus {
          border-color: #64748b;
          box-shadow: 0 0 0 3px rgba(100, 116, 139, 0.12);
        }

        .input-wrapper:focus-within :global(svg.input-icon) {
          color: #475569;
        }

        .input-wrapper input:disabled {
          background: #f8fafc;
          cursor: not-allowed;
        }

        .input-wrapper input[name="motDePasse"] {
          padding-right: 54px;
        }

        .password-visibility-button {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          width: 38px;
          height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          transition: background 150ms ease, color 150ms ease;
        }

        .password-visibility-button:hover {
          background: #f1f5f9;
          color: #172033;
        }

        .password-visibility-button:focus-visible {
          outline: 2px solid #64748b;
          outline-offset: 1px;
        }

        .password-visibility-button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        

        .login-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          width: 100%;
          min-height: 55px;
          border: none;
          border-radius: 10px;
          background: #bc1019;
          color: #ffffff;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition:
            background 150ms ease,
            transform 150ms ease;
        }

        .login-button:hover:not(:disabled) {
          background: #991b1b;
        }

        .login-button:active:not(:disabled) {
          transform: translateY(1px);
        }

        .login-button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .loading-icon {
          animation: rotation 1s linear infinite;
        }

        @keyframes rotation {
          to {
            transform: rotate(360deg);
          }
        }

        .error-message {
          margin: -8px 0 15px;
          padding: 10px 12px;
          border: 1px solid #fecaca;
          border-radius: 8px;
          background: #fef2f2;
          color: #b91c1c;
          font-size: 13px;
          line-height: 1.4;
        }

        .forgot-password-button {
          display: block;
          margin: 34px auto 0;
          padding: 5px;
          border: none;
          background: transparent;
          color: #64748b;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .forgot-password-button:hover {
          color: #b91c1c;
          text-decoration: underline;
        }

        

        .modal-overlay {
          position: fixed;
          z-index: 1000;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          box-sizing: border-box;
          background: rgba(15, 23, 42, 0.6);
        }

        .modal-content {
          width: 100%;
          max-width: 420px;
          padding: 30px;
          box-sizing: border-box;
          border-radius: 16px;
          background: #ffffff;
          box-shadow: 0 16px 45px rgba(0, 0, 0, 0.2);
          text-align: center;
        }

        .modal-content h2 {
          margin: 0 0 15px;
          color: #172033;
          font-size: 21px;
        }

        .modal-content p {
          margin: 0 0 22px;
          color: #64748b;
          font-size: 14px;
          line-height: 1.6;
        }

        .modal-request-button,
        .modal-close-button {
          min-height: 43px;
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          background: #bc1019;
          color: #ffffff;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .modal-request-button {
          width: 100%;
          margin-bottom: 10px;
        }

        .modal-request-button:hover,
        .modal-close-button:hover {
          background: #991b1b;
        }

        .reset-method-buttons {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 20px;
        }

        .reset-method-button {
          min-height: 43px;
          padding: 9px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #ffffff;
          color: #334155;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: background-color 180ms ease, border-color 180ms ease, color 180ms ease;
        }

        .reset-method-button.selected {
          border-color: #1d4ed8;
          background: #1d4ed8;
          color: #ffffff;
        }

        .reset-method-button:focus-visible {
          outline: 2px solid #93c5fd;
          outline-offset: 2px;
        }

        @media (max-width: 480px) {
          .reset-method-buttons {
            grid-template-columns: 1fr;
          }
        }

        .reset-field-label {
          display: block;
          margin: 12px 0 6px;
          color: #334155;
          text-align: left;
          font-size: 13px;
          font-weight: 700;
        }

        .reset-input {
          width: 100%;
          min-height: 44px;
          margin-bottom: 9px;
          padding: 10px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          color: #172033;
          background: #fff;
          font: inherit;
          text-align: left;
        }

        .reset-input:focus {
          outline: 2px solid #93c5fd;
          outline-offset: 1px;
          border-color: #3b82f6;
        }

        .modal-close-button {
          width: 100%;
          margin-top: 3px;
        }

        .modal-request-button:disabled,
        .modal-close-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .success-message {
          margin-bottom: 15px;
          padding: 12px;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          background: #f0fdf4;
          color: #166534;
          font-size: 14px;
          font-weight: 700;
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        

        @media (max-width: 850px) {
          .login-layout {
            max-width: 570px;
            grid-template-columns: 1fr;
            min-height: auto;
          }

          .brand-panel {
            min-height: 235px;
          }

          .brand-panel::before {
            top: -255px;
            left: -235px;
          }

          .brand-panel::after {
            right: -245px;
            bottom: -295px;
          }

          .brand-content {
            gap: 12px;
            padding: 22px;
          }

          .logo-hexagon {
            width: 105px;
            height: 118px;
          }

          .brand-logo {
            width: 83px;
            height: 83px;
          }

          .brand-content h2 {
            font-size: 21px;
          }

          .form-panel {
            padding: 43px 35px 48px;
          }

          .login-header {
            margin-bottom: 25px;
          }

          .login-header h1 {
            font-size: 31px;
          }
        }

        @media (max-width: 480px) {
          .login-page {
            padding: 15px;
          }

          .login-layout {
            border-radius: 18px;
          }

          .brand-panel {
            min-height: 200px;
          }

          .form-panel {
            padding: 30px 19px 38px;
          }

          .form-card {
            padding: 16px;
          }

          .field {
            margin-bottom: 18px;
          }

          .input-wrapper input {
            height: 52px;
          }

          .login-header p {
            font-size: 14px;
          }
        }
      `}</style>
    </main>
  );
}
