"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Chauffeur {
  id: number;
  matricule?: string;
  nom: string;
  prenom?: string;
  affectationService?: string;
  statut: string;
}

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

export default function ChauffeursPage() {
  const router = useRouter();

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

  const API = process.env.NEXT_PUBLIC_API_URL;

  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [chargement, setChargement] = useState(true);

  const [formOuvert, setFormOuvert] = useState(false);
  const [recherche, setRecherche] = useState("");

  const [enEdition, setEnEdition] =
    useState<Chauffeur | null>(null);

  const [matricule, setMatricule] = useState("");
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [affectationService, setAffectationService] =
    useState("");
  const [statut, setStatut] = useState("DISPONIBLE");

  // =========================================================
  // ROLE / LECTURE SEULE (DIRECTEUR_DFP)
  // =========================================================

  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setRole(localStorage.getItem("role"));
  }, []);

  const lectureSeule = role === "DIRECTEUR_DFP";

  // =========================================================
  // CHARGER LES CHAUFFEURS
  // =========================================================

  const charger = async () => {
    setChargement(true);

    try {
      const res = await fetch(`${API}/chauffeurs`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error();
      }

      const data = await res.json();

      setChauffeurs(
        Array.isArray(data)
          ? data
          : data.content || []
      );
    } catch {
      toast.error(
        "Impossible de charger les chauffeurs"
      );

      setChauffeurs([]);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    charger();
  }, []);

  // =========================================================
  // REINITIALISER LE FORMULAIRE
  // =========================================================

  const resetForm = () => {
    setMatricule("");
    setNom("");
    setPrenom("");
    setAffectationService("");
    setStatut("DISPONIBLE");
    setEnEdition(null);
  };

  // =========================================================
  // OUVRIR CREATION
  // =========================================================

  const ouvrirCreation = () => {
    if (lectureSeule) return;
    resetForm();
    setFormOuvert(true);
  };

  // =========================================================
  // OUVRIR MODIFICATION
  // =========================================================

  const ouvrirEdition = (c: Chauffeur) => {
    if (lectureSeule) return;

    setEnEdition(c);

    setMatricule(c.matricule || "");
    setNom(c.nom || "");
    setPrenom(c.prenom || "");
    setAffectationService(
      c.affectationService || ""
    );
    setStatut(
      c.statut || "DISPONIBLE"
    );

    setFormOuvert(true);
  };

  // =========================================================
  // CREER / MODIFIER
  // =========================================================

  const handleSoumettre = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (lectureSeule) return;

    const body = {
      matricule,
      nom,
      prenom,
      affectationService,
      statut,
    };

    const url = enEdition
      ? `${API}/chauffeurs/${enEdition.id}`
      : `${API}/chauffeurs`;

    try {
      const res = await fetch(url, {
        method: enEdition
          ? "PUT"
          : "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify(body),
      });

      if (!res.ok) {
        toast.error(
          enEdition
            ? "Erreur lors de la modification"
            : "Erreur lors de la création"
        );

        return;
      }

      toast.success(
        enEdition
          ? "Chauffeur modifié"
          : "Chauffeur ajouté"
      );

      setFormOuvert(false);

      resetForm();

      await charger();
    } catch {
      toast.error(
        "Impossible de contacter le serveur"
      );
    }
  };

  // =========================================================
  // SUPPRIMER
  // =========================================================

  const handleSupprimer = (
    id: number
  ) => {
    if (lectureSeule) return;

    toast(
      "Supprimer ce chauffeur ?",
      {
        description:
          "Cette action est définitive.",

        duration: 8000,

        action: {
          label: "Supprimer",

          onClick: async () => {
            try {
              const res = await fetch(
                `${API}/chauffeurs/${id}`,
                {
                  method: "DELETE",

                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                  },
                }
              );

              if (!res.ok) {
                toast.error(
                  "Échec de la suppression",
                  {
                    description:
                      "Impossible de supprimer ce chauffeur.",
                  }
                );

                return;
              }

              toast.success(
                "Chauffeur supprimé",
                {
                  description:
                    "Le chauffeur a été supprimé avec succès.",
                }
              );

              await charger();
            } catch {
              toast.error(
                "Erreur de connexion",
                {
                  description:
                    "Impossible de contacter le serveur.",
                }
              );
            }
          },
        },

        cancel: {
          label: "Annuler",

          onClick: () => {
            toast.dismiss();
          },
        },
      }
    );
  };

  // =========================================================
  // RECHERCHE
  // =========================================================

  const filtres =
    chauffeurs.filter((c) => {
      const t =
        recherche.toLowerCase();

      return [
        c.matricule,
        c.nom,
        c.prenom,
        c.affectationService,
        c.statut,
      ]
        .filter(Boolean)
        .some((v) =>
          String(v)
            .toLowerCase()
            .includes(t)
        );
    });

  // =========================================================
  // BADGE STATUT
  // =========================================================

  const badgeStatut = (
    s: string
  ) => {
    const map: Record<
      string,
      {
        bg: string;
        color: string;
        label: string;
      }
    > = {
      DISPONIBLE: {
        bg: "#dcfce7",
        color: "#166534",
        label: "Disponible",
      },

      SUR_PLACE: {
        bg: "#e0e7ff",
        color: "#3730a3",
        label: "Sur place",
      },

      EN_MISSION: {
        bg: "#dbeafe",
        color: "#1e40af",
        label: "En mission",
      },

      EN_DEPLACEMENT: {
        bg: "#dbeafe",
        color: "#1e40af",
        label: "En déplacement",
      },

      INDISPONIBLE: {
        bg: "#f3f4f6",
        color: "#4b5563",
        label: "Indisponible",
      },

      ABSENT: {
        bg: "#f3f4f6",
        color: "#4b5563",
        label: "Absent",
      },
    };

    const st =
      map[s] || {
        bg: "#f3f4f6",
        color: "#374151",
        label: s,
      };

    return (
      <span
        style={{
          padding: "2px 10px",
          borderRadius: 12,
          fontSize: 12,
          backgroundColor: st.bg,
          color: st.color,
        }}
      >
        {st.label}
      </span>
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f3f4f6",
        padding: 32,
      }}
    >
      {/* ================= HEADER ================= */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
          position: "relative",
        }}
      >
        <button
          onClick={() =>
            router.push("/admin")
          }
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
            transform:
              "translateX(-50%)",
          }}
        >
          Gestion des chauffeurs
        </h2>

        {!lectureSeule && (
          <button
            onClick={ouvrirCreation}
            style={{
              padding: "10px 20px",
              backgroundColor: "#dc2626",
              color: "white",
              border: "none",
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + Ajouter un chauffeur
          </button>
        )}
      </div>

      {/* ================= FORMULAIRE ================= */}

      {formOuvert && !lectureSeule && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor:
              "rgba(15, 23, 42, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 12,
              width: "100%",
              maxWidth: 640,
              padding: 28,
              boxShadow:
                "0 12px 40px rgba(0,0,0,0.25)",
            }}
          >
            <h3
              style={{
                margin: "0 0 20px",
                color: "#111827",
                fontSize: 20,
              }}
            >
              {enEdition
                ? "Modifier le chauffeur"
                : "Ajouter un chauffeur"}
            </h3>

            <form
              onSubmit={
                handleSoumettre
              }
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: 14,
              }}
            >

              {/* MATRICULE */}

              <div>
                <label
                  style={labelStyle}
                >
                  Matricule
                </label>

                <input
                  value={matricule}
                  onChange={(e) =>
                    setMatricule(
                      e.target.value
                    )
                  }
                  required
                  style={inputStyle}
                />
              </div>

              {/* NOM */}

              <div>
                <label
                  style={labelStyle}
                >
                  Nom
                </label>

                <input
                  value={nom}
                  onChange={(e) =>
                    setNom(
                      e.target.value
                    )
                  }
                  required
                  style={inputStyle}
                />
              </div>

              {/* PRENOM */}

              <div>
                <label
                  style={labelStyle}
                >
                  Prénom
                </label>

                <input
                  value={prenom}
                  onChange={(e) =>
                    setPrenom(
                      e.target.value
                    )
                  }
                  style={inputStyle}
                />
              </div>

              {/* AFFECTATION */}

              <div>
                <label
                  style={labelStyle}
                >
                  Affectation
                </label>

                <input
                  value={
                    affectationService
                  }
                  onChange={(e) =>
                    setAffectationService(
                      e.target.value
                    )
                  }
                  required
                  placeholder="Garage, Ambulance..."
                  style={inputStyle}
                />
              </div>

              {/* STATUT */}

              <div>
                <label
                  style={labelStyle}
                >
                  Statut
                </label>

                <select
                  value={statut}
                  onChange={(e) =>
                    setStatut(
                      e.target.value
                    )
                  }
                  style={inputStyle}
                >
                  <option value="DISPONIBLE">
                    Disponible
                  </option>

                  <option value="SUR_PLACE">
                    Sur place
                  </option>

                  <option value="EN_MISSION">
                    En mission
                  </option>

                  <option value="EN_DEPLACEMENT">
                    En déplacement
                  </option>

                  <option value="INDISPONIBLE">
                    Indisponible
                  </option>

                  <option value="ABSENT">
                    Absent
                  </option>
                </select>
              </div>

              {/* BOUTONS */}

              <div
                style={{
                  gridColumn:
                    "1 / -1",
                  display: "flex",
                  justifyContent:
                    "flex-end",
                  gap: 10,
                  marginTop: 8,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setFormOuvert(
                      false
                    );

                    resetForm();
                  }}
                  style={{
                    padding:
                      "10px 16px",
                    backgroundColor:
                      "#e5e7eb",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  style={{
                    padding:
                      "10px 16px",
                    backgroundColor:
                      "#dc2626",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  {enEdition
                    ? "Enregistrer"
                    : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= RECHERCHE ================= */}

      <div
        style={{
          marginBottom: 16,
          maxWidth: 420,
        }}
      >
        <input
          type="text"
          value={recherche}
          onChange={(e) =>
            setRecherche(
              e.target.value
            )
          }
          placeholder="Rechercher par matricule, nom ou affectation..."
          style={{
            width: "100%",
            padding: "10px 12px",
            border:
              "1px solid #111827",
            borderRadius: 8,
            fontSize: 14,
            outline: "none",
          }}
        />
      </div>

      {/* ================= TABLE ================= */}

      <div
        style={{
          backgroundColor: "white",
          border:
            "1px solid #e5e7eb",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse:
              "collapse",
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor:
                  "#f9fafb",
                borderBottom:
                  "1px solid #e5e7eb",
              }}
            >
              <th style={th}>
                Matricule
              </th>

              <th style={th}>
                Nom
              </th>

              <th style={th}>
                Prénom
              </th>

              <th style={th}>
                Affectation
              </th>

              <th style={th}>
                Statut
              </th>

              <th style={th}>
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {chargement ? (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: 20,
                    textAlign:
                      "center",
                    color:
                      "#6b7280",
                  }}
                >
                  Chargement...
                </td>
              </tr>
            ) : filtres.length ===
              0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: 20,
                    textAlign:
                      "center",
                    color:
                      "#6b7280",
                  }}
                >
                  Aucun chauffeur
                </td>
              </tr>
            ) : (
              filtres.map((c) => (
                <tr
                  key={c.id}
                  style={{
                    borderBottom:
                      "1px solid #f3f4f6",
                  }}
                >
                  <td style={td}>
                    {c.matricule ||
                      "—"}
                  </td>

                  <td style={td}>
                    {c.nom}
                  </td>

                  <td style={td}>
                    {c.prenom ||
                      "—"}
                  </td>

                  <td style={td}>
                    {c.affectationService ||
                      "—"}
                  </td>

                  <td style={td}>
                    {badgeStatut(
                      c.statut
                    )}
                  </td>

                  <td style={td}>
                    {!lectureSeule && (
                      <div
                        style={{
                          display:
                            "flex",
                          gap: 8,
                        }}
                      >
                        <button
                          onClick={() =>
                            ouvrirEdition(c)
                          }
                          style={btnIcon(
                            "#eff6ff",
                            "#2563eb",
                            "#bfdbfe"
                          )}
                          title="Modifier"
                        >
                          <IconEdit />
                        </button>

                        <button
                          onClick={() =>
                            handleSupprimer(
                              c.id
                            )
                          }
                          style={btnIcon(
                            "#fef2f2",
                            "#dc2626",
                            "#fecaca"
                          )}
                          title="Supprimer"
                        >
                          <IconTrash />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
  fontWeight: 600,
  marginBottom: 6,
  color: "#374151",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "2px solid #111827",
  borderRadius: 8,
  fontSize: 14,
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 16px",
  fontSize: 13,
  color: "#6b7280",
  fontWeight: 600,
};

const td: React.CSSProperties = {
  padding: "12px 16px",
  fontSize: 14,
  color: "#374151",
};

const btnIcon = (
  bg: string,
  color: string,
  border: string
): React.CSSProperties => ({
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