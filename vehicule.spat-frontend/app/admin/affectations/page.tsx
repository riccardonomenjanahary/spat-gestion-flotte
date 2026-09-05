"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, Link2 } from "lucide-react";

type VehicleStatus = "DISPONIBLE" | "EN_MISSION" | "EN_MAINTENANCE" | "HORS_SERVICE";
type DriverStatus = "DISPONIBLE" | "SUR_PLACE" | "EN_DEPLACEMENT" | "INDISPONIBLE";

interface Vehicule {
  id: number;
  immatriculation: string;
  marque?: string;
  modele?: string;
  status: VehicleStatus;
}

interface Chauffeur {
  id: number;
  nom: string;
  prenom: string;
  telephone?: string;
  statut: DriverStatus;
}

interface Affectation {
  id: number;
  vehiculeId: number;
  chauffeurId: number;
  dateDebut: string;
  dateFin?: string | null;
  vehicule?: Vehicule;
  chauffeur?: Chauffeur;
}

export default function AffectationsPage() {
  const router = useRouter();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [chargement, setChargement] = useState(true);
  const [formOuvert, setFormOuvert] = useState(false);
  const [recherche, setRecherche] = useState("");

  // Formulaire
  const [vehiculeId, setVehiculeId] = useState<number | "">("");
  const [chauffeurId, setChauffeurId] = useState<number | "">("");
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const charger = async () => {
    setChargement(true);
    try {
      const [resAff, resVeh, resChauf] = await Promise.all([
        fetch(`${API}/api/affectations`, { headers }),
        fetch(`${API}/api/vehicules`, { headers }),
        fetch(`${API}/api/chauffeurs`, { headers }),
      ]);

      if (!resAff.ok || !resVeh.ok || !resChauf.ok) throw new Error();

      const [aff, veh, chauf] = await Promise.all([
        resAff.json(),
        resVeh.json(),
        resChauf.json(),
      ]);

      setAffectations(aff);
      setVehicules(veh);
      setChauffeurs(chauf);
    } catch {
      // Fallback mock pour tester sans backend
      setVehicules([
        { id: 1, immatriculation: "AB-123-CD", marque: "Renault", modele: "Master", status: "DISPONIBLE" },
        { id: 2, immatriculation: "EF-456-GH", marque: "Peugeot", modele: "Partner", status: "EN_MISSION" },
        { id: 3, immatriculation: "IJ-789-KL", marque: "Citroën", modele: "Jumpy", status: "DISPONIBLE" },
      ]);
      setChauffeurs([
        { id: 1, nom: "Dupont", prenom: "Jean", telephone: "06 12 34 56 78", statut: "DISPONIBLE" },
        { id: 2, nom: "Martin", prenom: "Sophie", statut: "EN_DEPLACEMENT" },
        { id: 3, nom: "Bernard", prenom: "Paul", statut: "SUR_PLACE" },
      ]);
      setAffectations([
        {
          id: 1,
          vehiculeId: 2,
          chauffeurId: 2,
          dateDebut: new Date().toISOString(),
          dateFin: null,
          vehicule: { id: 2, immatriculation: "EF-456-GH", marque: "Peugeot", modele: "Partner", status: "EN_MISSION" },
          chauffeur: { id: 2, nom: "Martin", prenom: "Sophie", statut: "EN_DEPLACEMENT" },
        },
      ]);
      toast.info("Mode démo (API non joignable)");
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    charger();
  }, []);

  const vehiculesDispo = vehicules.filter((v) => v.status === "DISPONIBLE");
  const chauffeursDispo = chauffeurs.filter(
    (c) => c.statut === "DISPONIBLE" || c.statut === "SUR_PLACE"
  );

  const affectationsFiltrees = affectations.filter((a) => {
    const terme = recherche.toLowerCase();
    const immat = a.vehicule?.immatriculation || "";
    const nom = `${a.chauffeur?.prenom || ""} ${a.chauffeur?.nom || ""}`;
    return immat.toLowerCase().includes(terme) || nom.toLowerCase().includes(terme);
  });

  const resetForm = () => {
    setVehiculeId("");
    setChauffeurId("");
  };

  const handleCreer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehiculeId || !chauffeurId) return;

    setLoadingSubmit(true);
    try {
      // ----- API réelle (décommenter quand backend prêt) -----
      // const res = await fetch(`${API}/api/affectations`, {
      //   method: "POST",
      //   headers,
      //   body: JSON.stringify({ vehiculeId, chauffeurId }),
      // });
      // if (!res.ok) throw new Error();

      // ----- Mise à jour locale (démo) -----
      const vehicule = vehicules.find((v) => v.id === vehiculeId)!;
      const chauffeur = chauffeurs.find((c) => c.id === chauffeurId)!;

      setAffectations((prev) => [
        ...prev.filter((a) => a.vehiculeId !== vehiculeId && a.dateFin == null),
        {
          id: Date.now(),
          vehiculeId: vehiculeId as number,
          chauffeurId: chauffeurId as number,
          dateDebut: new Date().toISOString(),
          dateFin: null,
          vehicule: { ...vehicule, status: "EN_MISSION" },
          chauffeur: { ...chauffeur, statut: "EN_DEPLACEMENT" },
        },
      ]);

      setVehicules((prev) =>
        prev.map((v) => (v.id === vehiculeId ? { ...v, status: "EN_MISSION" } : v))
      );
      setChauffeurs((prev) =>
        prev.map((c) =>
          c.id === chauffeurId ? { ...c, statut: "EN_DEPLACEMENT" } : c
        )
      );

      toast.success(
        `Affectation : ${chauffeur.prenom} ${chauffeur.nom} → ${vehicule.immatriculation}`
      );
      resetForm();
      setFormOuvert(false);
    } catch {
      toast.error("Impossible de créer l'affectation");
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleTerminer = async (aff: Affectation) => {
    if (!confirm("Terminer cette mission ? Le véhicule et le chauffeur repasseront disponibles."))
      return;

    try {
      // const res = await fetch(`${API}/api/affectations/${aff.id}/terminer`, {
      //   method: "PATCH",
      //   headers,
      // });
      // if (!res.ok) throw new Error();

      setAffectations((prev) =>
        prev.map((a) =>
          a.id === aff.id ? { ...a, dateFin: new Date().toISOString() } : a
        )
      );
      setVehicules((prev) =>
        prev.map((v) =>
          v.id === aff.vehiculeId ? { ...v, status: "DISPONIBLE" } : v
        )
      );
      setChauffeurs((prev) =>
        prev.map((c) =>
          c.id === aff.chauffeurId ? { ...c, statut: "DISPONIBLE" } : c
        )
      );

      toast.success("Mission terminée");
    } catch {
      toast.error("Erreur lors de la clôture");
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f3f4f6", padding: 32 }}>
      {/* Header */}
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
          }}
        >
          Affectations chauffeur ↔ véhicule
        </h2>

        <button
          onClick={() => {
            resetForm();
            setFormOuvert(true);
          }}
          style={{
            padding: "10px 20px",
            backgroundColor: "#dc2626",
            color: "white",
            border: "none",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Link2 size={16} />
          Nouvelle affectation
        </button>
      </div>

      {/* Modal création */}
      {formOuvert && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
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
              maxWidth: 480,
              padding: 28,
              boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <h3 style={{ margin: 0, color: "#111827", fontSize: 20 }}>
                Nouvelle affectation
              </h3>
              <button
                type="button"
                onClick={() => setFormOuvert(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 22,
                  cursor: "pointer",
                  color: "#6b7280",
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreer} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Véhicule disponible</label>
                <select
                  value={vehiculeId}
                  onChange={(e) => setVehiculeId(e.target.value ? Number(e.target.value) : "")}
                  required
                  style={inputStyle}
                >
                  <option value="">Sélectionner un véhicule</option>
                  {vehiculesDispo.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.immatriculation} — {v.marque} {v.modele}
                    </option>
                  ))}
                </select>
                {vehiculesDispo.length === 0 && (
                  <p style={{ fontSize: 12, color: "#dc2626", marginTop: 6 }}>
                    Aucun véhicule disponible
                  </p>
                )}
              </div>

              <div>
                <label style={labelStyle}>Chauffeur disponible</label>
                <select
                  value={chauffeurId}
                  onChange={(e) => setChauffeurId(e.target.value ? Number(e.target.value) : "")}
                  required
                  style={inputStyle}
                >
                  <option value="">Sélectionner un chauffeur</option>
                  {chauffeursDispo.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.prenom} {c.nom}
                      {c.telephone ? ` (${c.telephone})` : ""}
                    </option>
                  ))}
                </select>
                {chauffeursDispo.length === 0 && (
                  <p style={{ fontSize: 12, color: "#dc2626", marginTop: 6 }}>
                    Aucun chauffeur disponible
                  </p>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setFormOuvert(false)}
                  style={{
                    padding: "10px 16px",
                    backgroundColor: "#e5e7eb",
                    color: "#374151",
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
                  disabled={!vehiculeId || !chauffeurId || loadingSubmit}
                  style={{
                    padding: "10px 16px",
                    backgroundColor:
                      !vehiculeId || !chauffeurId || loadingSubmit ? "#94a3b8" : "#dc2626",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    cursor:
                      !vehiculeId || !chauffeurId || loadingSubmit ? "not-allowed" : "pointer",
                    fontWeight: 600,
                  }}
                >
                  {loadingSubmit ? "Affectation..." : "Confirmer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recherche */}
      <div style={{ marginBottom: 16, maxWidth: 420 }}>
        <input
          type="text"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher immatriculation ou chauffeur..."
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid #111827",
            borderRadius: 8,
            fontSize: 14,
            color: "#111827",
            backgroundColor: "#fff",
            outline: "none",
          }}
        />
      </div>

      {/* Tableau */}
      <div
        style={{
          backgroundColor: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
              <th style={thStyle}>Véhicule</th>
              <th style={thStyle}>Chauffeur</th>
              <th style={thStyle}>Début</th>
              <th style={thStyle}>Fin</th>
              <th style={thStyle}>Statut</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {chargement ? (
              <tr>
                <td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#6b7280" }}>
                  Chargement...
                </td>
              </tr>
            ) : affectationsFiltrees.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#6b7280" }}>
                  Aucune affectation
                </td>
              </tr>
            ) : (
              affectationsFiltrees.map((a) => {
                const enCours = !a.dateFin;
                return (
                  <tr key={a.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={tdStyle}>
                      <strong>{a.vehicule?.immatriculation || `#${a.vehiculeId}`}</strong>
                      {a.vehicule?.marque && (
                        <div style={{ fontSize: 12, color: "#6b7280" }}>
                          {a.vehicule.marque} {a.vehicule.modele}
                        </div>
                      )}
                    </td>
                    <td style={tdStyle}>
                      {a.chauffeur
                        ? `${a.chauffeur.prenom} ${a.chauffeur.nom}`
                        : `#${a.chauffeurId}`}
                    </td>
                    <td style={tdStyle}>{formatDate(a.dateDebut)}</td>
                    <td style={tdStyle}>{a.dateFin ? formatDate(a.dateFin) : "—"}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          padding: "2px 10px",
                          borderRadius: 12,
                          fontSize: 12,
                          backgroundColor: enCours ? "#dbeafe" : "#f3f4f6",
                          color: enCours ? "#1e40af" : "#4b5563",
                        }}
                      >
                        {enCours ? "En cours" : "Terminée"}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {enCours && (
                        <button
                          onClick={() => handleTerminer(a)}
                          style={{
                            padding: "6px 12px",
                            backgroundColor: "#1e293b",
                            color: "white",
                            border: "none",
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Terminer
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  color: "#374151",
  marginBottom: 6,
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  border: "2px solid #111827",
  borderRadius: 8,
  width: "100%",
  fontSize: 14,
  color: "#111827",
  backgroundColor: "#ffffff",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 16px",
  fontSize: 13,
  color: "#6b7280",
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: "12px 16px",
  fontSize: 14,
  color: "#374151",
};