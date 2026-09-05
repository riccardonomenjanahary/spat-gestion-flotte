"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const MissionCard = dynamic(() => import("@/components/MissionCard"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 220,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#6b7280",
        backgroundColor: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
      }}
    >
      Chargement...
    </div>
  ),
});

interface Vehicule {
  id: number;
  immatriculation: string;
  modele?: string;
  statut: string;
  latitude?: number;
  longitude?: number;
  dernierePositionLe?: string;
}

interface Chauffeur {
  id: number;
  nom: string;
  prenom: string;
  telephone?: string;
  statut: string;
}

interface Mission {
  id: number;
  vehiculeId: number;
  chauffeurId: number;
  dateDebut: string;
  dateFin?: string | null;
  vehicule?: Vehicule;
  chauffeur?: Chauffeur;
}

type Filtre = "TOUTES" | "EN_COURS" | "TERMINEE";

const ANTANANARIVO = { lat: -18.8792, lng: 47.5079 };

export default function MissionsPage() {
  const router = useRouter();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [missions, setMissions] = useState<Mission[]>([]);
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [chargement, setChargement] = useState(true);
  const [filtre, setFiltre] = useState<Filtre>("EN_COURS");
  const [recherche, setRecherche] = useState("");
  const [formOuvert, setFormOuvert] = useState(false);
  const [vehiculeId, setVehiculeId] = useState<number | "">("");
  const [chauffeurId, setChauffeurId] = useState<number | "">("");
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [simulationEnCours, setSimulationEnCours] = useState(false);

  // =========================================================
  // ROLE / LECTURE SEULE (DIRECTEUR_DFP)
  // =========================================================

  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setRole(localStorage.getItem("role"));
  }, []);

  const lectureSeule = role === "DIRECTEUR_DFP";

  const authHeaders = { Authorization: `Bearer ${token}` };
  const jsonHeaders = { ...authHeaders, "Content-Type": "application/json" };

  const charger = useCallback(async () => {
    try {
      const [resM, resV, resC] = await Promise.all([
        fetch(`${API}/affectations`, { headers: authHeaders }),
        fetch(`${API}/vehicules`, { headers: authHeaders }),
        fetch(`${API}/chauffeurs`, { headers: authHeaders }),
      ]);

      if (resM.ok) {
        const data = await resM.json();
        setMissions(Array.isArray(data) ? data : data.content || []);
      } else {
        setMissions([]);
      }

      if (resV.ok) {
        const data = await resV.json();
        setVehicules(Array.isArray(data) ? data : data.content || []);
      }

      if (resC.ok) {
        const data = await resC.json();
        setChauffeurs(Array.isArray(data) ? data : data.content || []);
      }
    } catch {
      toast.error("Erreur réseau lors du chargement");
    } finally {
      setChargement(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    charger();
    const interval = setInterval(charger, 10000);
    return () => clearInterval(interval);
  }, [charger]);

  const vehiculesDispo = vehicules.filter((v) => v.statut === "DISPONIBLE");
  const chauffeursDispo = chauffeurs.filter(
    (c) => c.statut === "DISPONIBLE" || c.statut === "SUR_PLACE"
  );
  const vehiculesEnMission = vehicules.filter((v) => v.statut === "EN_MISSION");

  // Enrichit chaque mission avec les objets véhicule/chauffeur complets (positions incluses)
  const missionsEnrichies: Mission[] = missions.map((m) => ({
    ...m,
    vehicule: vehicules.find((v) => v.id === m.vehiculeId) || m.vehicule,
    chauffeur: chauffeurs.find((c) => c.id === m.chauffeurId) || m.chauffeur,
  }));

  const missionsFiltrees = missionsEnrichies.filter((m) => {
    const enCours = !m.dateFin;
    if (filtre === "EN_COURS" && !enCours) return false;
    if (filtre === "TERMINEE" && enCours) return false;

    const terme = recherche.toLowerCase();
    const immat = m.vehicule?.immatriculation || "";
    const nom = `${m.chauffeur?.prenom || ""} ${m.chauffeur?.nom || ""}`;
    return immat.toLowerCase().includes(terme) || nom.toLowerCase().includes(terme);
  });

  const handleCreer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lectureSeule) return;
    if (!vehiculeId || !chauffeurId) return;
    setLoadingSubmit(true);

    try {
      const res = await fetch(`${API}/affectations`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ vehiculeId, chauffeurId }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        toast.error(msg || "Erreur lors de la création de la mission");
        return;
      }

      toast.success("Mission démarrée");
      setFormOuvert(false);
      setVehiculeId("");
      setChauffeurId("");
      await charger();
    } catch {
      toast.error("Impossible de contacter le serveur");
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleTerminer = (m: Mission) => {
    if (lectureSeule) return;

    toast("Terminer cette mission ?", {
      description: "Le véhicule et le chauffeur repasseront disponibles.",
      action: {
        label: "Terminer",
        onClick: async () => {
          try {
            const res = await fetch(`${API}/affectations/${m.id}/terminer`, {
              method: "PATCH",
              headers: authHeaders,
            });
            if (!res.ok) {
              toast.error("Erreur lors de la clôture");
              return;
            }
            toast.success("Mission terminée");
            await charger();
          } catch {
            toast.error("Impossible de contacter le serveur");
          }
        },
      },
    });
  };

  const handleSimulerPositions = async () => {
    if (lectureSeule) return;

    if (vehiculesEnMission.length === 0) {
      toast.error("Aucun véhicule en mission à simuler");
      return;
    }

    setSimulationEnCours(true);
    try {
      await Promise.all(
        vehiculesEnMission.map((v) => {
          const latitude = ANTANANARIVO.lat + (Math.random() - 0.5) * 0.08;
          const longitude = ANTANANARIVO.lng + (Math.random() - 0.5) * 0.08;
          return fetch(`${API}/vehicules/${v.id}/position`, {
            method: "PUT",
            headers: jsonHeaders,
            body: JSON.stringify({ latitude, longitude }),
          });
        })
      );
      toast.success("Positions simulées mises à jour");
      await charger();
    } catch {
      toast.error("Erreur lors de la simulation");
    } finally {
      setSimulationEnCours(false);
    }
  };

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
          style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 14 }}
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
          Gestion des flux en temps réel
        </h2>
        {!lectureSeule && (
          <button
            onClick={() => {
              setVehiculeId("");
              setChauffeurId("");
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
            }}
          >
            + Nouvelle mission
          </button>
        )}
      </div>

      {/* Statuts véhicules — 4 cartes */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <StatCard titre="Total véhicules" valeur={vehicules.length} />
        <StatCard titre="Disponibles" valeur={vehiculesDispo.length} accent="#16a34a" />
        <StatCard titre="En mission" valeur={vehiculesEnMission.length} accent="#2563eb" />
        <StatCard
          titre="En maintenance"
          valeur={vehicules.filter((v) => v.statut === "MAINTENANCE").length}
          accent="#d97706"
        />
      </div>

      {/* Filtres + bouton simulation */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16, alignItems: "center" }}>
        {(["EN_COURS", "TERMINEE", "TOUTES"] as Filtre[]).map((f) => (
          <button
            key={f}
            onClick={() => setFiltre(f)}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              border: filtre === f ? "none" : "1px solid #e5e7eb",
              backgroundColor: filtre === f ? "#1e293b" : "white",
              color: filtre === f ? "white" : "#374151",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: filtre === f ? 600 : 400,
            }}
          >
            {f === "EN_COURS" ? "En cours" : f === "TERMINEE" ? "Terminées" : "Toutes"}
          </button>
        ))}
        <input
          type="text"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher immatriculation ou chauffeur..."
          style={{
            padding: "8px 12px",
            border: "1px solid #111827",
            borderRadius: 8,
            fontSize: 14,
            width: 260,
            outline: "none",
          }}
        />
        {!lectureSeule && (
          <button
            onClick={handleSimulerPositions}
            disabled={simulationEnCours}
            style={{
              marginLeft: "auto",
              padding: "8px 14px",
              backgroundColor: "#e5e7eb",
              color: "#374151",
              border: "none",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: simulationEnCours ? "not-allowed" : "pointer",
            }}
            title="Génère des positions aléatoires pour les véhicules en mission — données de test uniquement"
          >
            {simulationEnCours ? "Simulation..." : "Simuler les positions (test)"}
          </button>
        )}
      </div>

      {/* Modal nouvelle mission */}
      {formOuvert && !lectureSeule && (
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
              maxWidth: 440,
              padding: 28,
              boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
            }}
          >
            <h3 style={{ margin: "0 0 16px", color: "#111827", fontSize: 18 }}>Nouvelle mission</h3>
            <form onSubmit={handleCreer} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Véhicule disponible
                </label>
                <select
                  value={vehiculeId}
                  onChange={(e) => setVehiculeId(e.target.value ? Number(e.target.value) : "")}
                  required
                  style={{ width: "100%", padding: "10px 12px", border: "2px solid #111827", borderRadius: 8 }}
                >
                  <option value="">Sélectionner</option>
                  {vehiculesDispo.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.immatriculation} {v.modele ? `— ${v.modele}` : ""}
                    </option>
                  ))}
                </select>
                {vehiculesDispo.length === 0 && (
                  <p style={{ fontSize: 12, color: "#dc2626", marginTop: 4 }}>Aucun véhicule disponible</p>
                )}
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Chauffeur disponible
                </label>
                <select
                  value={chauffeurId}
                  onChange={(e) => setChauffeurId(e.target.value ? Number(e.target.value) : "")}
                  required
                  style={{ width: "100%", padding: "10px 12px", border: "2px solid #111827", borderRadius: 8 }}
                >
                  <option value="">Sélectionner</option>
                  {chauffeursDispo.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.prenom} {c.nom}
                    </option>
                  ))}
                </select>
                {chauffeursDispo.length === 0 && (
                  <p style={{ fontSize: 12, color: "#dc2626", marginTop: 4 }}>Aucun chauffeur disponible</p>
                )}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setFormOuvert(false)}
                  style={{
                    padding: "10px 16px",
                    backgroundColor: "#e5e7eb",
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
                  disabled={loadingSubmit || !vehiculeId || !chauffeurId}
                  style={{
                    padding: "10px 16px",
                    backgroundColor: loadingSubmit || !vehiculeId || !chauffeurId ? "#94a3b8" : "#dc2626",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    cursor: loadingSubmit || !vehiculeId || !chauffeurId ? "not-allowed" : "pointer",
                    fontWeight: 600,
                  }}
                >
                  {loadingSubmit ? "Création..." : "Démarrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Missions : une carte par mission, infos + GPS */}
      {chargement ? (
        <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Chargement...</div>
      ) : missionsFiltrees.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            color: "#9ca3af",
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
          }}
        >
          Aucune mission
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {missionsFiltrees.map((m) => (
            <MissionCard
              key={m.id}
              mission={m}
              onTerminer={lectureSeule ? undefined : handleTerminer}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ titre, valeur, accent }: { titre: string; valeur: number; accent?: string }) {
  return (
    <div style={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20 }}>
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>{titre}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent || "#1e293b" }}>{valeur}</div>
    </div>
  );
}