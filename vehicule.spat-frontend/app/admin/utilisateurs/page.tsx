"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import EnTete from "@/components/EnTete";
import {
  Search,
  Users,
  UserCheck,
  UserX,
  ShieldCheck,
} from "lucide-react";
interface Utilisateur {
  id: number;
  nomComplet: string;
  matricule: string;
  email?: string | null;
  role: string;
  serviceId?: number | null;
  departementId?: number | null;
  actif: boolean;
}
const roleStyle: Record<string, { bg: string; text: string; label: string }> = {
  DIRECTEUR_DFP: {
    bg: "#e0e7ff",
    text: "#3730a3",
    label: "Directeur DFP",
  },
  CHEF_SERVICE_LOGISTIQUE: {
    bg: "#dbeafe",
    text: "#1e40af",
    label: "Chef Service Logistique",
  },
  CHEF_SERVICE: {
    bg: "#e0f2fe",
    text: "#0369a1",
    label: "Chef de Service",
  },
  CHEF_DEPARTEMENT: {
    bg: "#cffafe",
    text: "#155e75",
    label: "Chef de Département",
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
};
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
export default function UtilisateursPage() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState("");
  const getToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
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
      if (!res.ok) {
        throw new Error();
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
    } catch {
      toast.error("Impossible de charger les utilisateurs");
    } finally {
      setChargement(false);
    }
  };
  useEffect(() => {
    chargerUtilisateurs();
  }, []);
  const totalUtilisateurs = utilisateurs.length;
  const utilisateursActifs = utilisateurs.filter(
    (u) => u.actif
  ).length;
  const utilisateursInactifs = utilisateurs.filter(
    (u) => !u.actif
  ).length;
  const nombreRoles = new Set(
    utilisateurs.map((u) => u.role)
  ).size;
  const terme = recherche.trim().toLowerCase();
  const utilisateursFiltres = utilisateurs.filter((u) => {
    if (!terme) return true;
    return (
      (u.nomComplet || "").toLowerCase().includes(terme) ||
      (u.matricule || "").toLowerCase().includes(terme) ||
      (u.email || "").toLowerCase().includes(terme) ||
      (u.role || "").toLowerCase().includes(terme)
    );
  });
  return (
    <>
      <style jsx global>{`
        input {
          color: #111827;
          background-color: white;
          font-size: 14px;
        }
        input:focus {
          outline: 2px solid #dc2626;
          outline-offset: 1px;
        }
        .ligne-utilisateur:hover {
          background: #f9fafb;
        }
      `}</style>

      <EnTete afficherNotifications={false} afficherProfil={false} />
      <div
        style={{
          minHeight: "100vh",
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
            <div
              style={{
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                alignItems: "center",
                gap: 9,
              }}
            >
              <Users size={22} color="#1e293b" />
              <h2
                style={{
                  color: "#1e293b",
                  margin: 0,
                  whiteSpace: "nowrap",
                }}
              >
                Liste des utilisateurs
              </h2>
            </div>
            <div style={{ width: 80 }} />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <StatCard
              titre="Utilisateurs"
              valeur={chargement ? "…" : totalUtilisateurs}
              icone={<Users size={21} color="#2563eb" />}
            />
            <StatCard
              titre="Comptes actifs"
              valeur={chargement ? "…" : utilisateursActifs}
              icone={<UserCheck size={21} color="#16a34a" />}
            />
            <StatCard
              titre="Comptes inactifs"
              valeur={chargement ? "…" : utilisateursInactifs}
              icone={<UserX size={21} color="#dc2626" />}
            />
            <StatCard
              titre="Rôles représentés"
              valeur={chargement ? "…" : nombreRoles}
              icone={<ShieldCheck size={21} color="#7c3aed" />}
            />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                position: "relative",
                flex: 1,
                maxWidth: 460,
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
                placeholder="Rechercher par nom, matricule, email ou rôle..."
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "10px 12px 10px 36px",
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                }}
              />
            </div>
          </div>
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
                  <th style={thStyle}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {chargement ? (
                  <tr>
                    <td colSpan={5} style={emptyStyle}>
                      Chargement...
                    </td>
                  </tr>
                ) : utilisateursFiltres.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={emptyStyle}>
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
                          borderBottom: "1px solid #f3f4f6",
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
                                backgroundColor: couleurAvatar(u.id),
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
                            u.email
                          ) : (
                            <span
                              style={{
                                color: "#9ca3af",
                                fontSize: 12,
                              }}
                            >
                              Non renseigné
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
                              padding: "5px 10px",
                              borderRadius: 20,
                              fontSize: 12,
                              fontWeight: 600,
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
                            {u.actif ? "Actif" : "Inactif"}
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
    </>
  );
}
function StatCard({
  titre,
  valeur,
  icone,
}: {
  titre: string;
  valeur: number | string;
  icone: React.ReactNode;
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
const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 16px",
  fontSize: 13,
  color: "#6b7280",
  fontWeight: 600,
  whiteSpace: "nowrap",
};
const tdStyle: React.CSSProperties = {
  padding: "12px 16px",
  fontSize: 14,
  color: "#374151",
  verticalAlign: "middle",
};
const emptyStyle: React.CSSProperties = {
  ...tdStyle,
  padding: 32,
  textAlign: "center",
  color: "#6b7280",
};