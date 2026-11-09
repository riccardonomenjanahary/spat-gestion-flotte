"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import NotificationPopup from "@/components/NotificationPopup";
import IncidentSignalementButton from "@/components/IncidentSignalementButton";

type InfosUtilisateur = {
  role?: string;
  matricule?: string;
};

function decoderToken(token: string): InfosUtilisateur {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));

    return {
      role: payload.role || payload.roles?.[0],
      matricule:
        payload.sub ||
        payload.matricule ||
        payload.numMatricule,
    };
  } catch {
    return {};
  }
}

function libelleRole(role?: string): string {
  if (!role) {
    return "Utilisateur";
  }

  const roles: Record<string, string> = {
    SUPER_ADMIN: "Super administrateur",
    ADMIN: "Administrateur",
    CO_ADMIN: "Co-administrateur (lecture seule)",
    DIRECTEUR_DFP: "Directeur DFP",
    CHEF_DIRECTION: "Chef de Direction",
    CHEF_SERVICE_LOGISTIQUE: "Chef Service Logistique",
    CHEF_DGAL: "Chef DGAL",
    MECANICIEN_DID: "Chef d’Atelier / Mécanicien DID",
    AGENT_FLOTTE: "Agent Flotte",
    AGENT_SURETE: "Agent de sûreté",
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

function sousTitreEspace(role?: string): string {
  const titres: Record<string, string> = {
    SUPER_ADMIN: "Administration des utilisateurs",
    ADMIN: "Administration du parc automobile",
    CO_ADMIN: "Consultation du parc automobile",
    DIRECTEUR_DFP: "Pilotage du parc automobile",
    CHEF_DIRECTION: "Demandes de véhicules",
    CHEF_SERVICE_LOGISTIQUE: "Gestion logistique du parc",
    CHEF_DGAL: "Validation des demandes",
    MECANICIEN_DID: "Plan d’entretien, réparations et historique du parc",
    AGENT_FLOTTE: "Gestion de la flotte",
    AGENT_SURETE: "Demandes de sûreté et de patrouille",
  };

  return (
    (role && titres[role]) ||
    "Portail de gestion de la flotte SPAT"
  );
}

type EnTeteProps = {
  afficherNotifications?: boolean;
  afficherProfil?: boolean;
  afficherSignalement?: boolean;
};

export default function EnTete({
  afficherNotifications = true,
  afficherProfil = true,
  afficherSignalement = false,
}: EnTeteProps) {
  const router = useRouter();

  const [menuOuvert, setMenuOuvert] = useState(false);
  const [profilOuvert, setProfilOuvert] = useState(false);
  const [infos, setInfos] = useState<InfosUtilisateur>({});

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initialisation = window.setTimeout(() => {
      const token = localStorage.getItem("token");

      const roleStocke =
        localStorage.getItem("role") ||
        undefined;

      const matriculeStocke =
        localStorage.getItem("numMatricule") ||
        localStorage.getItem("matricule") ||
        undefined;

      if (token) {
        const decoded = decoderToken(token);

        setInfos({
          role:
            decoded.role ||
            roleStocke,

          matricule:
            decoded.matricule ||
            matriculeStocke,
        });
      } else {
        setInfos({
          role: roleStocke,
          matricule: matriculeStocke,
        });
      }

    }, 0);
    return () => window.clearTimeout(initialisation);
  }, []);

  useEffect(() => {
    function gererClicExterieur(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setMenuOuvert(false);
      }
    }

    document.addEventListener("mousedown", gererClicExterieur);

    return () =>
      document.removeEventListener("mousedown", gererClicExterieur);
  }, []);

  const deconnexion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("numMatricule");
    localStorage.removeItem("matricule");
    localStorage.removeItem("email");

    router.replace("/login");
    router.refresh();
  };

  return (
    <>
      <style>{`
        .spat-profile-button {
          transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
        }
        .spat-profile-button:hover,
        .spat-profile-button:focus-visible {
          transform: scale(1.05);
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1) !important;
        }
        .spat-menu-item {
          transition: background-color 0.15s ease, color 0.15s ease;
        }
        .spat-menu-item:hover {
          background-color: #f1f5f9 !important;
        }
        .spat-menu-item-danger:hover {
          background-color: #fef2f2 !important;
        }
        @media (max-width: 700px) {
          .spat-global-header {
            padding: 10px 14px !important;
          }

          .spat-header-subtitle {
            display: none !important;
          }

          .spat-brand-title {
            font-size: 13px !important;
          }
        }
      `}</style>

      <header style={headerStyle}>
        <div
          className="spat-global-header"
          style={headerInterieurStyle}
        >

          <div style={marqueStyle}>
            <div style={logoBoiteStyle}>
              <Image
                src="/logo.png"
                alt="SPAT"
                width={46}
                height={46}
                priority
                style={logoStyle}
              />
            </div>

            <div style={marqueTexteStyle}>
              <div
                className="spat-brand-title"
                style={titreMarqueStyle}
              >
                SPAT
              </div>

              <div
                className="spat-header-subtitle"
                style={sousTitreMarqueStyle}
              >
                {sousTitreEspace(infos.role)}
              </div>
            </div>
          </div>

          <div
            ref={menuRef}
            style={zoneProfilStyle}
          >
            {afficherProfil && (
              <>
                <button
                  type="button"
                  className="spat-profile-button"
                  onClick={() => setMenuOuvert((ouvert) => !ouvert)}
                  aria-label="Ouvrir le menu profil"
                  aria-expanded={menuOuvert}
                  style={boutonProfilStyle}
                >
                  <Image
                    src="/icon.png"
                    alt="Profil"
                    width={40}
                    height={40}
                    style={iconeProfilStyle}
                  />
                </button>

                {menuOuvert && (
                  <div style={menuStyle}>
                    <button
                      type="button"
                      className="spat-menu-item"
                      onClick={() => {
                        setProfilOuvert(true);
                        setMenuOuvert(false);
                      }}
                      style={itemStyle}
                    >
                      <User size={16} />
                      Infos profil
                    </button>

                    <button
                      type="button"
                      className="spat-menu-item spat-menu-item-danger"
                      onClick={deconnexion}
                      style={{
                        ...itemStyle,
                        color: "#dc2626",
                      }}
                    >
                      <LogOut size={16} />
                      Déconnexion
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </header>
      <NotificationPopup />
      {afficherSignalement && <IncidentSignalementButton role={infos.role} />}

      {profilOuvert && (
        <div
          style={overlayStyle}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setProfilOuvert(false);
            }
          }}
        >
          <div style={modalStyle}>
            <h3 style={modalTitreStyle}>
              Mon profil
            </h3>

            <div style={profilLigneStyle}>
              <span style={profilLabelStyle}>
                Matricule
              </span>

              <strong style={profilValeurStyle}>
                {infos.matricule || "—"}
              </strong>
            </div>

            <div style={profilLigneStyle}>
              <span style={profilLabelStyle}>
                Rôle
              </span>

              <strong style={profilValeurStyle}>
                {libelleRole(infos.role)}
              </strong>
            </div>

            <button
              type="button"
              onClick={() => setProfilOuvert(false)}
              style={fermerButtonStyle}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const headerStyle: CSSProperties = {
  width: "100%",
  backgroundColor: "#ffffff",
  borderBottom: "2px solid #e2e8f0",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)",
  position: "relative",
  zIndex: 100,
};

const headerInterieurStyle: CSSProperties = {
  width: "100%",
  minHeight: 78,
  padding: "10px 28px",
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 18,
};

const marqueStyle: CSSProperties = {
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  gap: 13,
};

const logoBoiteStyle: CSSProperties = {
  width: 54,
  height: 54,
  padding: 4,
  backgroundColor: "#ffffff",
  border: "1.5px solid #e2e8f0",
  borderRadius: 10,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
  flexShrink: 0,
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

const logoStyle: CSSProperties = {
  width: 44,
  height: 44,
  objectFit: "contain",
  display: "block",
};

const marqueTexteStyle: CSSProperties = {
  minWidth: 0,
};

const titreMarqueStyle: CSSProperties = {
  color: "#0f172a",
  fontSize: 16,
  fontWeight: 800,
  lineHeight: 1.15,
  letterSpacing: "0.02em",
};

const sousTitreMarqueStyle: CSSProperties = {
  marginTop: 4,
  color: "#64748b",
  fontSize: 11,
  lineHeight: 1.2,
  whiteSpace: "nowrap",
  fontWeight: 500,
};

const zoneProfilStyle: CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 12,
  minWidth: 0,
};

const boutonProfilStyle: CSSProperties = {
  width: 42,
  height: 42,
  padding: 0,
  border: "2px solid #cbd5e1",
  borderRadius: "50%",
  backgroundColor: "#f8fafc",
  color: "#0f172a",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  overflow: "hidden",
  outline: "none",
};

const iconeProfilStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  borderRadius: "50%",
  objectFit: "cover",
  display: "block",
  flexShrink: 0,
};

const menuStyle: CSSProperties = {
  position: "absolute",
  top: 52,
  right: 0,
  zIndex: 1000,
  width: 180,
  overflow: "hidden",
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.1)",
  padding: "4px 0",
};

const itemStyle: CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "none",
  backgroundColor: "#ffffff",
  color: "#374151",
  display: "flex",
  alignItems: "center",
  gap: 10,
  textAlign: "left",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
};

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 2000,
  padding: 20,
  backgroundColor: "rgba(15,23,42,0.65)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalStyle: CSSProperties = {
  width: "100%",
  maxWidth: 350,
  padding: 24,
  backgroundColor: "#ffffff",
  borderRadius: 12,
  boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
};

const modalTitreStyle: CSSProperties = {
  margin: "0 0 18px",
  color: "#111827",
  fontSize: 18,
  fontWeight: 700,
};

const profilLigneStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  padding: "10px 0",
  borderBottom: "1px solid #f1f5f9",
};

const profilLabelStyle: CSSProperties = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 500,
};

const profilValeurStyle: CSSProperties = {
  color: "#111827",
  fontSize: 12,
  textAlign: "right",
};

const fermerButtonStyle: CSSProperties = {
  width: "100%",
  marginTop: 20,
  padding: "11px 16px",
  border: "none",
  borderRadius: 10,
  backgroundColor: "#bc1019",
  color: "#ffffff",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
  transition: "all 150ms ease",
};
