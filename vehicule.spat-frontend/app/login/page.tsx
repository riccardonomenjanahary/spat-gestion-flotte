"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "DIRECTEUR_DFP"
  | "CHEF_SERVICE_LOGISTIQUE"
  | "CHEF_DIRECTION"
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

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

      if (!data) {
        const message = "Réponse vide du serveur.";

        setErreur(message);
        toast.error(message);
        return;
      }

      if (!data.token || !data.role) {
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

      router.replace(destination);
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

  return (
    <main className="login-container">
      <img
        src="/logo.png"
        alt="Logo SPAT"
        className="login-logo"
      />

      <section className="login-card">
        <h1>Connexion</h1>

        <p className="login-description">
          Connectez-vous pour accéder à votre espace.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="numMatricule">
              Numéro matricule
            </label>

            <input
              id="numMatricule"
              type="text"
              placeholder="Votre numéro matricule"
              value={numMatricule}
              onChange={(e) =>
                setNumMatricule(e.target.value)
              }
              required
              autoComplete="username"
              disabled={chargement}
            />
          </div>

          <div className="form-group">
            <label htmlFor="motDePasse">
              Mot de passe
            </label>

            <input
              id="motDePasse"
              type="password"
              placeholder="Votre mot de passe"
              value={motDePasse}
              onChange={(e) =>
                setMotDePasse(e.target.value)
              }
              required
              autoComplete="current-password"
              disabled={chargement}
            />
          </div>

          {erreur && (
            <p
              className="error-message"
              role="alert"
            >
              {erreur}
            </p>
          )}

          <button
            type="submit"
            disabled={chargement}
            className="login-button"
          >
            {chargement
              ? "Connexion..."
              : "Se connecter"}
          </button>
        </form>
      </section>

      <button
        type="button"
        className="forgot-password-button"
        onClick={() => setAfficherModalAdmin(true)}
      >
        Mot de passe oublié ?
      </button>

      {afficherModalAdmin && (
        <div
          className="modal-overlay"
          onClick={() =>
            setAfficherModalAdmin(false)
          }
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>
              Réinitialisation du mot de passe
            </h2>

            <p>
              Veuillez contacter votre administrateur
              pour réinitialiser votre mot de passe.
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
          </div>
        </div>
      )}

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 60px 20px;
          background-color: #ffffff;
        }

        .login-logo {
          width: 150px;
          height: 150px;
          object-fit: contain;
          margin-bottom: 32px;
        }

        .login-card {
          width: 100%;
          max-width: 420px;
          padding: 32px;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          background-color: #ffffff;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
        }

        .login-card h1 {
          margin: 0;
          color: #1e293b;
          text-align: center;
          font-size: 26px;
          font-weight: 700;
        }

        .login-description {
          margin: 10px 0 28px;
          color: #64748b;
          text-align: center;
          font-size: 14px;
        }

        .form-group {
          margin-bottom: 18px;
        }

        .form-group label {
          display: block;
          margin-bottom: 7px;
          color: #374151;
          font-size: 14px;
          font-weight: 600;
        }

        .form-group input {
          width: 100%;
          box-sizing: border-box;
          padding: 11px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          outline: none;
          color: #111827;
          background-color: #ffffff;
          font-size: 15px;
        }

        .form-group input:focus {
          border-color: #dc2626;
          box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.12);
        }

        .form-group input:disabled {
          cursor: not-allowed;
          background-color: #f3f4f6;
        }

        .form-group input::placeholder {
          color: #6b7280;
          opacity: 1;
        }

        .error-message {
          margin: 0 0 14px;
          color: #dc2626;
          text-align: center;
          font-size: 14px;
        }

        .login-button {
          width: 100%;
          padding: 11px;
          border: none;
          border-radius: 6px;
          color: #ffffff;
          background-color: #dc2626;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
        }

        .login-button:hover {
          background-color: #b91c1c;
        }

        .login-button:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
        }

        .forgot-password-button {
          margin-top: 20px;
          padding: 0;
          border: none;
          color: #374151;
          background: transparent;
          font-size: 14px;
          text-decoration: underline;
          cursor: pointer;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background-color: rgba(0, 0, 0, 0.5);
        }

        .modal-content {
          width: 100%;
          max-width: 380px;
          padding: 30px;
          border-radius: 10px;
          background-color: #ffffff;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
          text-align: center;
        }

        .modal-content h2 {
          margin: 0 0 16px;
          color: #1e293b;
          font-size: 20px;
        }

        .modal-content p {
          margin: 0 0 24px;
          color: #475569;
          font-size: 14px;
          line-height: 1.6;
        }

        .modal-close-button {
          padding: 9px 22px;
          border: none;
          border-radius: 6px;
          color: #ffffff;
          background-color: #dc2626;
          font-size: 14px;
          cursor: pointer;
        }

        .modal-close-button:hover {
          background-color: #b91c1c;
        }

        @media (max-width: 480px) {
          .login-container {
            padding-top: 30px;
          }

          .login-logo {
            width: 120px;
            height: 120px;
            margin-bottom: 24px;
          }

          .login-card {
            padding: 24px 20px;
          }
        }
      `}</style>
    </main>
  );
}