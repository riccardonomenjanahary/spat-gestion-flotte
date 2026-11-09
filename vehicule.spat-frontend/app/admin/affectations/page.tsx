"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Link2 } from "lucide-react";

type VehicleStatus = "DISPONIBLE" | "EN_MISSION" | "EN_MAINTENANCE" | "HORS_SERVICE";
type DriverStatus = "DISPONIBLE" | "SUR_PLACE" | "EN_DEPLACEMENT" | "INDISPONIBLE";

interface Vehicule {
  id: number;
  immatriculation: string;
  modeleType?: string;
  statut: VehicleStatus;
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
  vehiculeId?: number;
  chauffeurId?: number;
  dateDebut: string;
  dateFin?: string | null;
  statut?: string;
  vehicule?: Vehicule;
  chauffeur?: Chauffeur;
}

export default function AffectationsPage() {
  const router = useRouter();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState("");
  const [formOuvert, setFormOuvert] = useState(false);
  const [recherche, setRecherche] = useState("");

  const [vehiculeId, setVehiculeId] = useState<number | "">("");
  const [chauffeurId, setChauffeurId] = useState<number | "">("");
  const [reservationId, setReservationId] = useState<number | "">("");
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const charger = async () => {
    if (!token) {
      router.replace("/login");
      return;
    }
    if (!API) {
      setErreurChargement("L'API n'est pas configurée.");
      setChargement(false);
      return;
    }

    setChargement(true);
    setErreurChargement("");
    try {
      const [resAff, resVeh, resChauf] = await Promise.all([
        fetch(`${API}/affectations`, { headers }),
        fetch(`${API}/vehicules`, { headers }),
        fetch(`${API}/chauffeurs`, { headers }),
      ]);

      if (!resAff.ok || !resVeh.ok || !resChauf.ok) {
        const responseEnErreur = [resAff, resVeh, resChauf].find((res) => !res.ok);
        throw new Error(`Erreur de chargement depuis la base (HTTP ${responseEnErreur?.status}).`);
      }

      const [aff, veh, chauf] = await Promise.all([
        resAff.json(),
        resVeh.json(),
        resChauf.json(),
      ]);
      if (![aff, veh, chauf].every(Array.isArray)) {
        throw new Error("Format de réponse invalide pour les affectations, véhicules ou chauffeurs.");
      }

      setAffectations(aff as Affectation[]);
      setVehicules(veh as Vehicule[]);
      setChauffeurs(chauf as Chauffeur[]);
    } catch (error) {
      setErreurChargement(error instanceof Error ? error.message : "Impossible de charger les données depuis la base.");
      setAffectations([]);
      setVehicules([]);
      setChauffeurs([]);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    const initialisation = window.setTimeout(() => {
      charger();

    }, 0);
    return () => window.clearTimeout(initialisation);
  }, []);

  const vehiculesDispo = vehicules.filter((v) => v.statut === "DISPONIBLE");
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
    setReservationId("");
    setVehiculeId("");
    setChauffeurId("");
  };

  const handleCreer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehiculeId || !chauffeurId || !reservationId) return;

    setLoadingSubmit(true);
    try {
      if (!API || !token) throw new Error("Session ou API indisponible.");
      const res = await fetch(`${API}/affectations`, {
        method: "POST",
        headers,
        body: JSON.stringify({ vehiculeId, chauffeurId, reservationId }),
      });
      if (!res.ok) {
        const message = await res.text().catch(() => "");
        throw new Error(message || `Erreur HTTP ${res.status}`);
      }

      const vehicule = vehicules.find((v) => v.id === vehiculeId);
      const chauffeur = chauffeurs.find((c) => c.id === chauffeurId);

      toast.success(
        `Affectation : ${chauffeur?.prenom} ${chauffeur?.nom} → ${vehicule?.immatriculation}`
      );
      await charger();
      resetForm();
      setFormOuvert(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de créer l'affectation");
    } finally {
      setLoadingSubmit(false);
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
          type="button"
          className="btn-spat btn-rouge"
          onClick={() => {
            resetForm();
            setFormOuvert(true);
          }}
          style={{
            padding: "10px 20px",
            border: "none",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            transition: "all 150ms ease",
          }}
        >
          <Link2 size={16} />
          Nouvelle affectation
        </button>
      </div>

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
              <label style={labelStyle}>
                Numéro du ticket validé
                <input aria-label="Numéro du ticket validé" type="number" min={1} required
                  value={reservationId} onChange={(e) => setReservationId(e.target.value ? Number(e.target.value) : "")}
                  style={inputStyle} />
              </label>

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
                    {v.immatriculation}{v.modeleType ? ` — ${v.modeleType}` : ""}
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
                  className="btn-spat btn-neutre"
                  onClick={() => setFormOuvert(false)}
                  style={{
                    padding: "11px 18px",
                    border: "none",
                    borderRadius: 10,
                    cursor: "pointer",
                    fontWeight: 700,
                    transition: "all 150ms ease",
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-spat btn-rouge"
                  disabled={!vehiculeId || !chauffeurId || loadingSubmit}
                  style={{
                    padding: "11px 18px",
                    border: "none",
                    borderRadius: 10,
                    cursor:
                      !vehiculeId || !chauffeurId || loadingSubmit ? "not-allowed" : "pointer",
                    fontWeight: 700,
                    transition: "all 150ms ease",
                  }}
                >
                  {loadingSubmit ? "Affectation..." : "Confirmer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
            </tr>
          </thead>
          <tbody>
            {chargement ? (
              <tr>
                <td colSpan={5} style={{ padding: 20, textAlign: "center", color: "#6b7280" }}>
                  Chargement...
                </td>
              </tr>
            ) : erreurChargement ? (
              <tr>
                <td colSpan={5} style={{ padding: 20, textAlign: "center", color: "#b91c1c" }}>
                  {erreurChargement}
                </td>
              </tr>
            ) : affectationsFiltrees.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 20, textAlign: "center", color: "#6b7280" }}>
                  Aucune affectation
                </td>
              </tr>
            ) : (
              affectationsFiltrees.map((a) => {
                const enCours = a.statut === "ACTIVE" || (!a.statut && !a.dateFin);
                return (
                  <tr key={a.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={tdStyle}>
                      <strong>{a.vehicule?.immatriculation || `#${a.vehiculeId ?? "?"}`}</strong>
                      {a.vehicule?.modeleType && (
                        <div style={{ fontSize: 12, color: "#6b7280" }}>
                          {a.vehicule.modeleType}
                        </div>
                      )}
                    </td>
                    <td style={tdStyle}>
                      {a.chauffeur
                        ? `${a.chauffeur.prenom} ${a.chauffeur.nom}`
                        : `#${a.chauffeurId ?? "?"}`}
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
