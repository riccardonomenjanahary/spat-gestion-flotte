"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, User } from "lucide-react";
import NotificationCenter from "@/app/components/notifications/NotificationCenter";

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
    DIRECTEUR_DFP: "Directeur DFP",
    CHEF_DIRECTION: "Chef de Direction",
    CHEF_SERVICE_LOGISTIQUE: "Chef Service Logistique",
    CHEF_DGAL: "Chef DGAL",
    MECANICIEN_DID: "Mécanicien diagnostiqueur DID",
    AGENT_FLOTTE: "Agent Flotte",
    CHAUFFEUR: "Chauffeur",
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

function libelleProfil(role?: string): string {
  const roles: Record<string, string> = {
    SUPER_ADMIN: "SPAT-Super Admin",
    ADMIN: "SPAT-Administrateur",
    DIRECTEUR_DFP: "SPAT-Directeur DFP",
    CHEF_DIRECTION: "SPAT-Chef de Direction",
    CHEF_SERVICE_LOGISTIQUE: "SPAT-Chef Logistique",
    CHEF_DGAL: "SPAT-Chef DGAL",
    MECANICIEN_DID: "SPAT-Mécanicien DID",
    AGENT_FLOTTE: "SPAT-Agent Flotte",
    CHAUFFEUR: "SPAT-Chauffeur",
  };

  return role
    ? roles[role] || `SPAT-${libelleRole(role)}`
    : "SPAT";
}

function sousTitreEspace(role?: string): string {
  const titres: Record<string, string> = {
    SUPER_ADMIN: "Administration des utilisateurs",
    ADMIN: "Administration du parc automobile",
    DIRECTEUR_DFP: "Pilotage du parc automobile",
    CHEF_DIRECTION: "Demandes de véhicules",
    CHEF_SERVICE_LOGISTIQUE: "Gestion logistique du parc",
    CHEF_DGAL: "Validation des demandes",
    MECANICIEN_DID: "Diagnostic et entretien du parc",
    AGENT_FLOTTE: "Gestion de la flotte",
    CHAUFFEUR: "Espace chauffeur",
  };

  return (
    (role && titres[role]) ||
    "Portail de gestion de la flotte SPAT"
  );
}

type EnTeteProps = {
  afficherNotifications?: boolean;
  afficherProfil?: boolean;
};

export default function EnTete({
  afficherNotifications = true,
  afficherProfil = true,
}: EnTeteProps) {
  const router = useRouter();

  const [menuOuvert, setMenuOuvert] =
    useState(false);

  const [profilOuvert, setProfilOuvert] =
    useState(false);

  const [infos, setInfos] =
    useState<InfosUtilisateur>({});

  // Animation visuelle uniquement : aucune lecture audio.
  const [nouvelleNotification, setNouvelleNotification] = useState(false);
  const idsVusRef = useRef<Set<number> | null>(null);
  const finAnimationRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const menuRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token =
      localStorage.getItem("token");

    const roleStocke =
      localStorage.getItem("role") ||
      undefined;

    const matriculeStocke =
      localStorage.getItem("numMatricule") ||
      localStorage.getItem("matricule") ||
      undefined;

    if (token) {
      const decoded =
        decoderToken(token);

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
  }, []);

  useEffect(() => {
    function gererClicExterieur(
      e: MouseEvent
    ) {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          e.target as Node
        )
      ) {
        setMenuOuvert(false);
      }
    }

    document.addEventListener(
      "mousedown",
      gererClicExterieur
    );

    return () =>
      document.removeEventListener(
        "mousedown",
        gererClicExterieur
      );
  }, []);

  // Une notification deja presente lors de l'ouverture de la page
  // ne declenche pas l'animation. Seuls les nouveaux IDs la declenchent.
  // Les notifications continuent d'etre affichees/traitees par NotificationCenter.
  useEffect(() => {
    if (!afficherNotifications) return;
    const api = process.env.NEXT_PUBLIC_API_URL;
    if (!api) return;

    let actif = true;
    let enCours = false;
    const lireNouvellesNotifications = async () => {
      if (enCours) return;
      const token = localStorage.getItem("token");
      if (!token) return;
      enCours = true;
      try {
        const reponse = await fetch(
          `${api}/notifications/me?nonLuesUniquement=true`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );
        if (!reponse.ok) return;
        const donnees: unknown = await reponse.json();
        if (!actif || !Array.isArray(donnees)) return;
        const ids = new Set<number>(
          donnees
            .filter((n): n is { id: number } =>
              typeof n === "object" && n !== null &&
              typeof (n as { id?: unknown }).id === "number"
            )
            .map((n) => n.id)
        );
        if (idsVusRef.current !== null &&
            [...ids].some((id) => !idsVusRef.current!.has(id))) {
          // Une nouvelle notification a ete detectee depuis le dernier appel.
          setNouvelleNotification(true);
          if (finAnimationRef.current) clearTimeout(finAnimationRef.current);
          finAnimationRef.current = setTimeout(() => {
            if (actif) setNouvelleNotification(false);
          }, 3000);
        }
        idsVusRef.current = ids;
      } catch {
        // Aucune incidence sur la navigation ni sur la cloche existante.
      } finally {
        enCours = false;
      }
    };

    void lireNouvellesNotifications();
    const intervalle = window.setInterval(() => {
      void lireNouvellesNotifications();
    }, 10000);
    return () => {
      actif = false;
      window.clearInterval(intervalle);
      if (finAnimationRef.current) clearTimeout(finAnimationRef.current);
    };
  }, [afficherNotifications]);

  const deconnexion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem(
      "numMatricule"
    );
    localStorage.removeItem(
      "matricule"
    );
    localStorage.removeItem("email");

    router.replace("/login");
    router.refresh();
  };

  return (
    <>
      <style>{`
        @keyframes spat-cloche-sonne {
          0%, 100% { transform: rotate(0deg); }
          15% { transform: rotate(24deg); }
          30% { transform: rotate(-22deg); }
          45% { transform: rotate(18deg); }
          60% { transform: rotate(-14deg); }
          75% { transform: rotate(8deg); }
          90% { transform: rotate(-4deg); }
        }
        @keyframes spat-cloche-halo {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0); }
          35%, 65% { box-shadow: 0 0 0 7px rgba(220,38,38,0.18); }
        }
        .spat-notification-arrival {
          display: inline-flex;
          border-radius: 999px;
          animation: spat-cloche-halo 0.8s ease-in-out infinite;
        }
        .spat-notification-arrival svg.lucide-bell {
          transform-origin: 50% 0%;
          animation: spat-cloche-sonne 1.1s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .spat-notification-arrival,
          .spat-notification-arrival svg.lucide-bell {
            animation: none !important;
          }
        }
        @media (max-width: 700px) {
          .spat-global-header {
            padding: 10px 14px !important;
          }

          .spat-header-subtitle {
            display: none !important;
          }

          .spat-profile-text {
            display: none !important;
          }

          .spat-profile-button {
            padding: 4px 7px !important;
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
          {/* =========================================
              GAUCHE — IDENTITÉ SPAT
          ========================================= */}

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
                {sousTitreEspace(
                  infos.role
                )}
              </div>
            </div>
          </div>

          {/* =========================================
              DROITE — NOTIFICATION + PROFIL
          ========================================= */}

          <div
            ref={menuRef}
            style={zoneProfilStyle}
          >
            {afficherNotifications && (
              <div className={nouvelleNotification
                ? "spat-notification-arrival"
                : undefined}>
                <NotificationCenter />
              </div>
            )}

            {afficherProfil && (
              <>
                          <button
                            type="button"
                            className="spat-profile-button"
                            onClick={() =>
                              setMenuOuvert(
                                (ouvert) => !ouvert
                              )
                            }
                            aria-label="Ouvrir le menu profil"
                            aria-expanded={menuOuvert}
                            style={boutonProfilStyle}
                          >
                            <Image
                              src="/icon.png"
                              alt="Profil"
                              width={38}
                              height={38}
                              style={iconeProfilStyle}
                            />

                            <div
                              className="spat-profile-text"
                              style={identiteStyle}
                            >
                              <div
                                style={
                                  nomProfilStyle
                                }
                              >
                                {libelleProfil(
                                  infos.role
                                )}
                              </div>

                              <div
                                style={roleStyle}
                              >
                                {libelleRole(
                                  infos.role
                                )}
                              </div>
                            </div>

                            <ChevronDown
                              size={15}
                              strokeWidth={1.8}
                              style={{
                                flexShrink: 0,
                              }}
                            />
                          </button>

                          {menuOuvert && (
                            <div style={menuStyle}>
                              <button
                                type="button"
                                onClick={() => {
                                  setProfilOuvert(
                                    true
                                  );

                                  setMenuOuvert(
                                    false
                                  );
                                }}
                                style={itemStyle}
                              >
                                <User size={16} />
                                Infos profil
                              </button>

                              <button
                                type="button"
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

      {/* =========================================
          MODALE PROFIL
      ========================================= */}

      {profilOuvert && (
        <div
          style={overlayStyle}
          onMouseDown={(e) => {
            if (
              e.target ===
              e.currentTarget
            ) {
              setProfilOuvert(false);
            }
          }}
        >
          <div style={modalStyle}>
            <h3
              style={modalTitreStyle}
            >
              Mon profil
            </h3>

            <div
              style={profilLigneStyle}
            >
              <span
                style={profilLabelStyle}
              >
                Matricule
              </span>

              <strong
                style={profilValeurStyle}
              >
                {infos.matricule ||
                  "—"}
              </strong>
            </div>

            <div
              style={profilLigneStyle}
            >
              <span
                style={profilLabelStyle}
              >
                Rôle
              </span>

              <strong
                style={profilValeurStyle}
              >
                {libelleRole(
                  infos.role
                )}
              </strong>
            </div>

            <button
              type="button"
              onClick={() =>
                setProfilOuvert(false)
              }
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

// =========================================================
// STYLES
// =========================================================

const headerStyle: CSSProperties = {
  width: "100%",
  backgroundColor: "#ffffff",
  borderBottom: "2px solid #e2e8f0",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)",
  position: "relative",
  zIndex: 100,
};

const headerInterieurStyle:
  CSSProperties = {
  width: "100%",
  minHeight: 78,
  padding: "10px 28px",
  boxSizing: "border-box",

  display: "flex",
  alignItems: "center",
  justifyContent:
    "space-between",

  gap: 18,
};

const marqueStyle:
  CSSProperties = {
  minWidth: 0,

  display: "flex",
  alignItems: "center",
  gap: 13,
};

const logoBoiteStyle:
  CSSProperties = {
  width: 54,
  height: 54,

  padding: 4,

  backgroundColor:
    "#ffffff",

  border:
    "1.5px solid #e2e8f0",

  borderRadius: 10,

  display:
    "inline-flex",

  alignItems:
    "center",

  justifyContent:
    "center",

  boxSizing:
    "border-box",

  flexShrink: 0,
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

const logoStyle:
  CSSProperties = {
  width: 44,
  height: 44,

  objectFit:
    "contain",

  display:
    "block",
};

const marqueTexteStyle:
  CSSProperties = {
  minWidth: 0,
};

const titreMarqueStyle:
  CSSProperties = {
  color: "#0f172a",
  fontSize: 16,
  fontWeight: 800,
  lineHeight: 1.15,
  letterSpacing:
    "0.02em",
};

const sousTitreMarqueStyle:
  CSSProperties = {
  marginTop: 4,

  color:
    "#64748b",

  fontSize: 11,
  lineHeight: 1.2,

  whiteSpace:
    "nowrap",
  fontWeight: 500,
};

const zoneProfilStyle:
  CSSProperties = {
  position: "relative",

  display: "flex",
  alignItems: "center",
  justifyContent:
    "flex-end",

  gap: 12,

  minWidth: 0,
};

const boutonProfilStyle:
  CSSProperties = {
  minHeight: 46,

  padding:
    "4px 12px 4px 6px",

  border:
    "1.5px solid #cbd5e1",

  borderRadius: 999,

  backgroundColor:
    "#f8fafc",

  color: "#0f172a",

  cursor: "pointer",

  display:
    "inline-flex",

  alignItems:
    "center",

  justifyContent:
    "center",

  gap: 9,

  boxShadow:
    "0 1px 2px rgba(0,0,0,0.04)",
};

const iconeProfilStyle:
  CSSProperties = {
  width: 36,
  height: 36,

  borderRadius: "50%",

  objectFit:
    "cover",

  display:
    "block",

  flexShrink: 0,

  backgroundColor:
    "#ffffff",
  border: "1px solid #e2e8f0",
};

const identiteStyle:
  CSSProperties = {
  minWidth: 0,
  textAlign: "left",
  lineHeight: 1.15,
};

const nomProfilStyle:
  CSSProperties = {
  color: "#0f172a",

  fontSize: 12,
  fontWeight: 700,

  whiteSpace:
    "nowrap",
};

const roleStyle:
  CSSProperties = {
  marginTop: 2,

  color:
    "#64748b",

  fontSize: 10,

  whiteSpace:
    "nowrap",
  fontWeight: 500,
};

const menuStyle:
  CSSProperties = {
  position: "absolute",

  top: 58,
  right: 0,

  zIndex: 1000,

  width: 190,

  overflow: "hidden",

  backgroundColor:
    "#ffffff",

  border:
    "1px solid #e5e7eb",

  borderRadius: 9,

  boxShadow:
    "0 12px 32px rgba(15,23,42,0.20)",
};

const itemStyle:
  CSSProperties = {
  width: "100%",

  padding:
    "10px 13px",

  border: "none",

  backgroundColor:
    "#ffffff",

  color:
    "#374151",

  display: "flex",
  alignItems: "center",

  gap: 8,

  textAlign: "left",

  fontSize: 12,

  cursor: "pointer",
};

const overlayStyle:
  CSSProperties = {
  position: "fixed",
  inset: 0,

  zIndex: 2000,

  padding: 20,

  backgroundColor:
    "rgba(15,23,42,0.65)",

  display: "flex",
  alignItems: "center",
  justifyContent:
    "center",
};

const modalStyle:
  CSSProperties = {
  width: "100%",
  maxWidth: 350,

  padding: 24,

  backgroundColor:
    "#ffffff",

  borderRadius: 12,

  boxShadow:
    "0 20px 60px rgba(0,0,0,0.25)",
};

const modalTitreStyle:
  CSSProperties = {
  margin: "0 0 18px",

  color:
    "#111827",

  fontSize: 18,
};

const profilLigneStyle:
  CSSProperties = {
  display: "flex",

  alignItems:
    "center",

  justifyContent:
    "space-between",

  gap: 14,

  padding:
    "10px 0",

  borderBottom:
    "1px solid #f1f5f9",
};

const profilLabelStyle:
  CSSProperties = {
  color:
    "#64748b",

  fontSize: 12,
};

const profilValeurStyle:
  CSSProperties = {
  color:
    "#111827",

  fontSize: 12,

  textAlign:
    "right",
};

const fermerButtonStyle:
  CSSProperties = {
  width: "100%",

  marginTop: 20,

  padding:
    "10px 16px",

  border: "none",

  borderRadius: 8,

  backgroundColor:
    "#dc2626",

  color:
    "#ffffff",

  fontWeight: 700,

  cursor:
    "pointer",
};
