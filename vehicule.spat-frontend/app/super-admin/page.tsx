"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Users,
  UserCheck,
  UserX,
  ShieldCheck,
  UserCog,
} from "lucide-react";

import RoleGuard from "@/components/RoleGuard";
import { ROLES } from "@/app/lib/roles";

interface Utilisateur {
  id: number;
  matricule?: string;
  numMatricule?: string;
  nomComplet?: string;
  role: string;
  actif: boolean;
}

export default function SuperAdminPage() {
  return (
    <RoleGuard role={ROLES.SUPER_ADMIN}>
      <SuperAdminContent />
    </RoleGuard>
  );
}

function SuperAdminContent() {
  const router = useRouter();

  const [profilMenuOuvert, setProfilMenuOuvert] = useState(false);

  const [matricule, setMatricule] = useState("");

  const [stats, setStats] = useState({
    total: "—",
    actifs: "—",
    inactifs: "—",
  });

  const [statsChargement, setStatsChargement] = useState(true);

  // =====================================================
  // INFORMATIONS DU SUPER ADMIN CONNECTÉ
  // =====================================================

  useEffect(() => {
    const matriculeStocke =
      localStorage.getItem("numMatricule") || "";

    setMatricule(matriculeStocke);
  }, []);

  // =====================================================
  // CHARGEMENT DES STATISTIQUES UTILISATEURS
  // =====================================================

  useEffect(() => {
    const chargerStats = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;

        if (!apiUrl) {
          throw new Error(
            "NEXT_PUBLIC_API_URL n'est pas configurée."
          );
        }

        /*
         * On réutilise pour l'instant l'endpoint utilisateurs
         * déjà fonctionnel côté ADMIN.
         *
         * L'ADMIN n'est pas encore modifié.
         */
        const response = await fetch(
          `${apiUrl}/admin/utilisateurs`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `Erreur lors du chargement des utilisateurs : ${response.status}`
          );
        }

        const utilisateurs: Utilisateur[] =
          await response.json();

        const actifs = utilisateurs.filter(
          (utilisateur) => utilisateur.actif === true
        ).length;

        const inactifs = utilisateurs.filter(
          (utilisateur) => utilisateur.actif === false
        ).length;

        setStats({
          total: String(utilisateurs.length),
          actifs: String(actifs),
          inactifs: String(inactifs),
        });
      } catch (error) {
        console.error(
          "Erreur chargement utilisateurs :",
          error
        );

        toast.error(
          "Impossible de charger les statistiques utilisateurs."
        );
      } finally {
        setStatsChargement(false);
      }
    };

    chargerStats();
  }, [router]);

  // =====================================================
  // DÉCONNEXION
  // =====================================================

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("numMatricule");
    localStorage.removeItem("email");

    toast.success("Déconnexion réussie");

    router.replace("/login");
  };

  // =====================================================
  // REDIRECTION VERS LA GESTION DES UTILISATEURS
  // =====================================================

  const ouvrirGestionUtilisateurs = () => {
    router.push("/super-admin/utilisateurs");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#f3f4f6",
      }}
    >
      {/* ================================================= */}
      {/* EN-TÊTE */}
      {/* ================================================= */}

      <header
        style={{
          height: 90,
          backgroundColor: "#1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
          borderBottom: "1px solid #334155",
        }}
      >
        {/* LOGO + TITRE */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 62,
              height: 62,
              borderRadius: 10,
              backgroundColor: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <img
              src="/Logo.png"
              alt="Logo SPAT"
              style={{
                width: 58,
                height: 58,
                objectFit: "contain",
              }}
            />
          </div>

          <div>
            <div
              style={{
                color: "white",
                fontSize: 17,
                fontWeight: 700,
              }}
            >
              SPAT
            </div>

            <div
              style={{
                color: "#cbd5e1",
                fontSize: 12,
                marginTop: 2,
              }}
            >
              Administration des utilisateurs
            </div>
          </div>
        </div>

        {/* PROFIL SUPER ADMIN */}

        <div
          style={{
            position: "relative",
          }}
        >
          <button
            onClick={() =>
              setProfilMenuOuvert((valeur) => !valeur)
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.2)",
              backgroundColor: "rgba(255,255,255,0.1)",
              color: "white",
              cursor: "pointer",
            }}
            aria-label="Ouvrir le profil"
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#f3f4f6",
              }}
            >
              <img
                src="/icon.png"
                alt="Avatar profil"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>

            <div
              style={{
                textAlign: "left",
                lineHeight: 1.2,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                SPAT-Super Admin
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: "#cbd5e1",
                }}
              >
                Super administrateur
              </div>
            </div>
          </button>

          {/* MENU PROFIL */}

          {profilMenuOuvert && (
            <div
              style={{
                position: "absolute",
                top: 52,
                right: 0,
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                minWidth: 220,
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                zIndex: 20,
              }}
            >
              <div
                style={{
                  padding: "12px 14px",
                  borderBottom: "1px solid #f3f4f6",
                  color: "#111827",
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                  }}
                >
                  {matricule || "Super Admin"}
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                    marginTop: 2,
                  }}
                >
                  Super administrateur
                </div>
              </div>

              <button
                onClick={handleLogout}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 14px",
                  border: "none",
                  backgroundColor: "transparent",
                  color: "#dc2626",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ================================================= */}
      {/* CONTENU PRINCIPAL */}
      {/* ================================================= */}

      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 1050,
          margin: "0 auto",
          padding: "40px 24px",
          boxSizing: "border-box",
        }}
      >
        {/* ================================================= */}
        {/* TITRE */}
        {/* ================================================= */}

        <div
          style={{
            textAlign: "center",
            marginBottom: 34,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginBottom: 8,
            }}
          >
            <ShieldCheck
              size={29}
              color="#1e293b"
            />

            <h1
              style={{
                color: "#1e293b",
                margin: 0,
                fontSize: 25,
              }}
            >
              Super Administration
            </h1>
          </div>

          <p
            style={{
              color: "#6b7280",
              margin: 0,
              fontSize: 14,
            }}
          >
            Gestion des comptes utilisateurs et des
            habilitations du portail de gestion de la flotte
            SPAT.
          </p>
        </div>

        {/* ================================================= */}
        {/* STATISTIQUES UTILISATEURS */}
        {/* ================================================= */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            maxWidth: 800,
            margin: "0 auto 38px auto",
          }}
        >
          <StatCard
            titre="Utilisateurs"
            valeur={stats.total}
            chargement={statsChargement}
            icone={
              <Users
                size={21}
                color="#1e40af"
              />
            }
          />

          <StatCard
            titre="Comptes actifs"
            valeur={stats.actifs}
            chargement={statsChargement}
            icone={
              <UserCheck
                size={21}
                color="#166534"
              />
            }
          />

          <StatCard
            titre="Comptes désactivés"
            valeur={stats.inactifs}
            chargement={statsChargement}
            icone={
              <UserX
                size={21}
                color="#991b1b"
              />
            }
          />
        </div>

        {/* ================================================= */}
        {/* GESTION DES UTILISATEURS CENTRÉE */}
        {/* ================================================= */}

        <div
          style={{
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 540,
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 28,
              boxShadow: "0 3px 12px rgba(0,0,0,0.04)",
              borderTop: "4px solid #dc2626",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  backgroundColor: "#fef2f2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <UserCog
                  size={27}
                  color="#dc2626"
                />
              </div>
            </div>

            <h2
              style={{
                color: "#1e293b",
                margin: "0 0 8px",
                fontSize: 19,
                textAlign: "center",
              }}
            >
              Gestion des utilisateurs
            </h2>

            <p
              style={{
                color: "#6b7280",
                fontSize: 14,
                lineHeight: 1.6,
                margin: "0 auto",
                maxWidth: 430,
                textAlign: "center",
              }}
            >
              Créer les comptes utilisateurs, attribuer les
              rôles, gérer les rattachements organisationnels
              et activer ou désactiver les accès au système.
            </p>

            {/* BOUTON PRINCIPAL */}

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: 24,
              }}
            >
              <button
                type="button"
                onClick={ouvrirGestionUtilisateurs}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 9,
                  padding: "11px 22px",
                  border: "none",
                  borderRadius: 7,
                  backgroundColor: "#dc2626",
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "#b91c1c";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "#dc2626";
                }}
              >
                <Users size={18} />

                Gérer les utilisateurs
              </button>
            </div>

            <div
              style={{
                textAlign: "center",
                color: "#9ca3af",
                fontSize: 12,
                marginTop: 14,
              }}
            >
              Création, modification, activation et
              désactivation des comptes
            </div>
          </div>
        </div>
      </main>

      {/* ================================================= */}
      {/* FOOTER */}
      {/* ================================================= */}

      <footer
        style={{
          padding: "12px 20px",
          fontSize: 12,
          color: "#6b7280",
          backgroundColor: "white",
          borderTop: "1px solid #e5e7eb",
          textAlign: "center",
        }}
      >
        Copyright © 2026 SPAT. Tous droits réservés.
      </footer>
    </div>
  );
}

// =========================================================
// CARTE STATISTIQUE
// =========================================================

function StatCard({
  titre,
  valeur,
  chargement,
  icone,
}: {
  titre: string;
  valeur: string;
  chargement: boolean;
  icone: React.ReactNode;
}) {
  return (
    <div
      style={{
        backgroundColor: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            fontSize: 13,
            color: "#6b7280",
          }}
        >
          {titre}
        </div>

        {icone}
      </div>

      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: "#1e293b",
        }}
      >
        {chargement ? "…" : valeur}
      </div>
    </div>
  );
}