
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LockKeyhole, UserRound, LoaderCircle } from "lucide-react";

type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "DIRECTEUR_DFP"
  | "CHEF_SERVICE_LOGISTIQUE"
  | "CHEF_DIRECTION"
  | "ASSISTANT_DIRECTION"
  | "CHEF_DGAL"
  | "MECANICIEN_DID"
  | "AGENT_FLOTTE"
  | "CHAUFFEUR";

interface LoginResponse {
  token: string;
  role: Role;
  numMatricule: string;
}

function homeForRole(role: string | null | undefined): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/super-admin";

    case "ADMIN":
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

    case "CHAUFFEUR":
      return "/chauffeur";

    default:
      return "/login";
  }
}

function isValidRole(role: string): role is Role {
  return [
    "SUPER_ADMIN",
    "ADMIN",
    "DIRECTEUR_DFP",
    "CHEF_SERVICE_LOGISTIQUE",
    "CHEF_DIRECTION",
    "ASSISTANT_DIRECTION",
    "CHEF_DGAL",
    "MECANICIEN_DID",
    "AGENT_FLOTTE",
    "CHAUFFEUR",
  ].includes(role);
}

export default function LoginPage() {
  const router = useRouter();

  const [numMatricule, setNumMatricule] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  const [afficherModalAdmin, setAfficherModalAdmin] = useState(false);
  const [demandeEnCours, setDemandeEnCours] = useState(false);
  const [demandeEnvoyee, setDemandeEnvoyee] = useState(false);

  // =====================================================
  // CONNEXION
  // =====================================================

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

      router.replace(homeForRole(loginData.role));
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

  // =====================================================
  // MOT DE PASSE OUBLIÉ
  // =====================================================

  const ouvrirMotDePasseOublie = () => {
    setDemandeEnvoyee(false);
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

  // =====================================================
  // INTERFACE
  // =====================================================

  return (
    <main className="login-page">
      <div className="login-layout">

        {/* ================================================
            PARTIE GAUCHE : IDENTITÉ SPAT
        ================================================ */}

        <section className="brand-panel">
          <div className="brand-content">
            <div className="logo-hexagon">
              <img
                src="/logo.png"
                alt="Logo SPAT"
                className="brand-logo"
              />
            </div>

            <h2>GESTION DU PARC AUTOMOBILE</h2>
          </div>
        </section>

        {/* ================================================
            PARTIE DROITE : FORMULAIRE
        ================================================ */}

        <section className="form-panel">
          <div className="form-content">
            <header className="login-header">
              <h1>LOGIN</h1>
              <p>Connectez-vous ici pour acceder à votre compte</p>
            </header>

            <div className="form-card">
              <form onSubmit={handleSubmit}>

                {/* NUMÉRO MATRICULE */}

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

                {/* MOT DE PASSE */}

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
                      type="password"
                      placeholder="Mot de passe"
                      value={motDePasse}
                      onChange={(e) =>
                        setMotDePasse(e.target.value)
                      }
                      autoComplete="current-password"
                      required
                      disabled={chargement}
                    />
                  </div>
                </div>

                {/* MESSAGE D'ERREUR */}

                {erreur && (
                  <p className="error-message" role="alert">
                    {erreur}
                  </p>
                )}

                {/* BOUTON DE CONNEXION */}

                <button
                  type="submit"
                  className="login-button"
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

            {/* MOT DE PASSE OUBLIÉ */}

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

      {/* =================================================
          MODALE : MOT DE PASSE OUBLIÉ
      ================================================= */}

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

            {!demandeEnvoyee ? (
              <>
                <p>
                  Veuillez contacter votre administrateur
                  pour réinitialiser votre mot de passe.
                </p>

                <button
                  type="button"
                  onClick={demanderNouveauMotDePasse}
                  disabled={demandeEnCours}
                  className="modal-request-button"
                >
                  {demandeEnCours
                    ? "Envoi en cours..."
                    : "Demander un nouveau mot de passe"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setAfficherModalAdmin(false)
                  }
                  disabled={demandeEnCours}
                  className="modal-close-button"
                >
                  Fermer
                </button>
              </>
            ) : (
              <>
                <div className="success-message">
                  Demande envoyée au Super Admin.
                </div>

                <p>
                  Le Super Admin a reçu une notification
                  pour le matricule{" "}
                  <strong>{numMatricule.trim()}</strong>.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setAfficherModalAdmin(false)
                  }
                  className="modal-close-button"
                >
                  Fermer
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* =================================================
          STYLES
      ================================================= */}

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

        /* ==============================================
           PANNEAU GAUCHE BLANC
        ============================================== */

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

        /* ==============================================
           PANNEAU DROIT
        ============================================== */

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
          margin: 0;
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

        /* ==============================================
           BOUTON ROUGE
        ============================================== */

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

        /* ==============================================
           MODALE
        ============================================== */

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

        /* ==============================================
           RESPONSIVE
        ============================================== */

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