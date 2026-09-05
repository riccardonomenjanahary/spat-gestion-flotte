"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Users, RefreshCw } from "lucide-react";

type VehicleStatus = "DISPONIBLE" | "EN_MISSION" | "EN_MAINTENANCE" | "HORS_SERVICE";
type DriverStatus = "DISPONIBLE" | "SUR_PLACE" | "EN_DEPLACEMENT" | "INDISPONIBLE";

interface Vehicle {
  id: number;
  immatriculation: string;
  marque: string;
  modele: string;
  status: VehicleStatus;
  kilometrageActuel?: number;
}

interface Driver {
  id: number;
  nom: string;
  prenom: string;
  telephone?: string;
  statut: DriverStatus;
}

interface Assignment {
  id: number;
  vehiculeId: number;
  chauffeurId: number;
  chauffeur?: Driver;
}

export default function DispatchPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [profilMenuOuvert, setProfilMenuOuvert] = useState(false);
  const [accesOk, setAccesOk] = useState(false);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<number | "">("");
  const [loadingAssign, setLoadingAssign] = useState(false);
  const [loadingTerminer, setLoadingTerminer] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    setEmail(localStorage.getItem("email") || "");

    if (!token) {
      router.replace("/login");
      return;
    }
    if (role !== "DISPATCHER" && role !== "ADMIN") {
      if (role === "EMPLOYE") router.replace("/employe/reservations");
      else if (role === "CONDUCTEUR") router.replace("/conducteur/missions");
      else if (role === "ADMIN") router.replace("/admin");
      else router.replace("/login");
      return;
    }
    setAccesOk(true);

    setVehicles([
      { id: 1, immatriculation: "AB-123-CD", marque: "Renault", modele: "Master", status: "DISPONIBLE", kilometrageActuel: 45230 },
      { id: 2, immatriculation: "EF-456-GH", marque: "Peugeot", modele: "Partner", status: "EN_MISSION", kilometrageActuel: 78900 },
      { id: 3, immatriculation: "IJ-789-KL", marque: "Citroën", modele: "Jumpy", status: "EN_MAINTENANCE", kilometrageActuel: 120500 },
      { id: 4, immatriculation: "MN-012-OP", marque: "Ford", modele: "Transit", status: "DISPONIBLE", kilometrageActuel: 33400 },
    ]);
    setDrivers([
      { id: 1, nom: "Dupont", prenom: "Jean", telephone: "06 12 34 56 78", statut: "DISPONIBLE" },
      { id: 2, nom: "Martin", prenom: "Sophie", telephone: "06 98 76 54 32", statut: "EN_DEPLACEMENT" },
      { id: 3, nom: "Bernard", prenom: "Paul", statut: "SUR_PLACE" },
      { id: 4, nom: "Leroy", prenom: "Alice", telephone: "06 11 22 33 44", statut: "DISPONIBLE" },
    ]);
    setAssignments([
      {
        id: 1,
        vehiculeId: 2,
        chauffeurId: 2,
        chauffeur: { id: 2, nom: "Martin", prenom: "Sophie", statut: "EN_DEPLACEMENT" },
      },
    ]);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("email");
    toast.success("Déconnexion réussie");
    router.push("/login");
  };

  const stats = {
    total: vehicles.length,
    disponibles: vehicles.filter((v) => v.status === "DISPONIBLE").length,
    enMission: vehicles.filter((v) => v.status === "EN_MISSION").length,
    enMaintenance: vehicles.filter((v) => v.status === "EN_MAINTENANCE").length,
  };

  const filteredVehicles = vehicles.filter((v) => {
    const matchStatus = statusFilter === "ALL" || v.status === statusFilter;
    const matchSearch =
      v.immatriculation.toLowerCase().includes(search.toLowerCase()) ||
      `${v.marque} ${v.modele}`.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const getAssignment = (vehiculeId: number) =>
    assignments.find((a) => a.vehiculeId === vehiculeId);

  const handleAssign = async () => {
    if (!selectedVehicle || !selectedDriverId) return;
    if (selectedVehicle.status !== "DISPONIBLE") {
      toast.error("Seuls les véhicules disponibles peuvent être affectés");
      return;
    }

    setLoadingAssign(true);
    try {
      const driver = drivers.find((d) => d.id === selectedDriverId);
      if (!driver) throw new Error("Chauffeur introuvable");

      setAssignments((prev) => [
        ...prev.filter(
          (a) => a.vehiculeId !== selectedVehicle.id && a.chauffeurId !== selectedDriverId
        ),
        {
          id: Date.now(),
          vehiculeId: selectedVehicle.id,
          chauffeurId: selectedDriverId as number,
          chauffeur: { ...driver, statut: "EN_DEPLACEMENT" },
        },
      ]);

      setVehicles((prev) =>
        prev.map((v) =>
          v.id === selectedVehicle.id ? { ...v, status: "EN_MISSION" } : v
        )
      );

      setDrivers((prev) =>
        prev.map((d) =>
          d.id === selectedDriverId ? { ...d, statut: "EN_DEPLACEMENT" } : d
        )
      );

      toast.success(
        `Affectation réussie : ${driver.prenom} ${driver.nom} → ${selectedVehicle.immatriculation}`
      );
      setSelectedVehicle(null);
      setSelectedDriverId("");
    } catch (err) {
      console.error(err);
      toast.error("Impossible de créer l'affectation");
    } finally {
      setLoadingAssign(false);
    }
  };

  const handleTerminer = async (vehiculeId: number) => {
    const assign = getAssignment(vehiculeId);
    if (!assign) {
      toast.error("Aucune affectation trouvée");
      return;
    }

    setLoadingTerminer(vehiculeId);
    try {
      setAssignments((prev) => prev.filter((a) => a.vehiculeId !== vehiculeId));
      setVehicles((prev) =>
        prev.map((v) => (v.id === vehiculeId ? { ...v, status: "DISPONIBLE" } : v))
      );
      setDrivers((prev) =>
        prev.map((d) =>
          d.id === assign.chauffeurId ? { ...d, statut: "DISPONIBLE" } : d
        )
      );
      toast.success("Mission terminée — véhicule et chauffeur disponibles");
    } catch {
      toast.error("Impossible de terminer la mission");
    } finally {
      setLoadingTerminer(null);
    }
  };

  const statusColor = (status: VehicleStatus | DriverStatus) => {
    const map: Record<string, { bg: string; text: string }> = {
      DISPONIBLE: { bg: "#dcfce7", text: "#166534" },
      EN_MISSION: { bg: "#dbeafe", text: "#1e40af" },
      EN_MAINTENANCE: { bg: "#fef3c7", text: "#92400e" },
      HORS_SERVICE: { bg: "#fee2e2", text: "#991b1b" },
      SUR_PLACE: { bg: "#e0e7ff", text: "#3730a3" },
      EN_DEPLACEMENT: { bg: "#dbeafe", text: "#1e40af" },
      INDISPONIBLE: { bg: "#f3f4f6", text: "#4b5563" },
    };
    return map[status] || { bg: "#f3f4f6", text: "#4b5563" };
  };

  if (!accesOk) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6b7280",
        }}
      >
        Vérification de l&apos;accès...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#f3f4f6",
      }}
    >
      <div
        style={{
          height: 90,
          backgroundColor: "#1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img
            src="/Logo.png"
            alt="Logo"
            style={{ width: 70, height: 70, objectFit: "contain" }}
          />
          <div>
            <div style={{ color: "white", fontWeight: 700, fontSize: 18 }}>Dispatch</div>
            <div style={{ color: "#94a3b8", fontSize: 12 }}>
              Pilotage flotte en temps réel
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flex: 1,
            justifyContent: "center",
          }}
        >
          <button type="button" onClick={() => router.push("/dispatch")} style={navHeaderBtn}>
            Missions
          </button>
          <button
            type="button"
            onClick={() => router.push("/dispatcher/reservations")}
            style={navHeaderBtn}
          >
            Réservations
          </button>
        </div>

        <div style={{ position: "relative" }}>
          <button
            onClick={() => setProfilMenuOuvert((v) => !v)}
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
                alt="Avatar"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <div style={{ textAlign: "left", lineHeight: 1.2 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{email || "Dispatcher"}</div>
              <div style={{ fontSize: 11, color: "#cbd5e1" }}>Dispatcher</div>
            </div>
          </button>

          {profilMenuOuvert && (
            <div
              style={{
                position: "absolute",
                top: 52,
                right: 0,
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                minWidth: 200,
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
                <div style={{ fontWeight: 700 }}>{email || "Dispatcher"}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Dispatcher</div>
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
      </div>

      <div style={{ flex: 1, padding: 32 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <div>
            <h2 style={{ color: "#1e293b", margin: 0 }}>
              Dispatch – Pilotage en temps réel
            </h2>
            <p style={{ color: "#6b7280", marginTop: 6, fontSize: 15 }}>
              Visibilité sur les véhicules et affectation des chauffeurs. Les demandes
              employés se gèrent dans Réservations.
            </p>
          </div>
          <button
            onClick={() => toast.info("Données rafraîchies")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 14,
              color: "#374151",
            }}
          >
            <RefreshCw size={16} />
            Actualiser
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
            marginBottom: 28,
            marginTop: 24,
          }}
        >
          <StatCard titre="Total véhicules" valeur={String(stats.total)} />
          <StatCard titre="Disponibles" valeur={String(stats.disponibles)} accent="#16a34a" />
          <StatCard titre="En mission" valeur={String(stats.enMission)} accent="#2563eb" />
          <StatCard
            titre="En maintenance"
            valeur={String(stats.enMaintenance)}
            accent="#d97706"
          />
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 20,
            alignItems: "center",
          }}
        >
          {(["ALL", "DISPONIBLE", "EN_MISSION", "EN_MAINTENANCE", "HORS_SERVICE"] as const).map(
            (s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  border: statusFilter === s ? "none" : "1px solid #e5e7eb",
                  backgroundColor: statusFilter === s ? "#1e293b" : "white",
                  color: statusFilter === s ? "white" : "#374151",
                  fontSize: 13,
                  cursor: "pointer",
                  fontWeight: statusFilter === s ? 600 : 400,
                }}
              >
                {s === "ALL" ? "Tous" : s.replace(/_/g, " ")}
              </button>
            )
          )}
          <input
            type="text"
            placeholder="Rechercher immatriculation ou modèle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              marginLeft: "auto",
              padding: "8px 12px",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              fontSize: 14,
              width: 260,
              outline: "none",
              color: "#111827",
            }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}>
          <div>
            <h3 style={{ color: "#1e293b", marginBottom: 14, fontSize: 16 }}>
              Véhicules ({filteredVehicles.length})
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 14,
              }}
            >
              {filteredVehicles.map((v) => {
                const assign = getAssignment(v.id);
                const colors = statusColor(v.status);
                return (
                  <div
                    key={v.id}
                    style={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      padding: 16,
                      borderTop: "4px solid #ea580c",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 15 }}>
                          {v.immatriculation}
                        </div>
                        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                          {v.marque} {v.modele}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: 999,
                          backgroundColor: colors.bg,
                          color: colors.text,
                        }}
                      >
                        {v.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    {assign?.chauffeur && (
                      <div style={{ marginTop: 10, fontSize: 13, color: "#4b5563" }}>
                        <Users
                          size={13}
                          style={{
                            display: "inline",
                            marginRight: 4,
                            verticalAlign: "middle",
                          }}
                        />
                        {assign.chauffeur.prenom} {assign.chauffeur.nom}
                      </div>
                    )}

                    {v.kilometrageActuel !== undefined && (
                      <div style={{ marginTop: 6, fontSize: 12, color: "#9ca3af" }}>
                        {v.kilometrageActuel.toLocaleString()} km
                      </div>
                    )}

                    {v.status === "DISPONIBLE" && (
                      <button
                        onClick={() => {
                          setSelectedVehicle(v);
                          setSelectedDriverId("");
                        }}
                        style={{
                          marginTop: 14,
                          width: "100%",
                          padding: "8px 0",
                          backgroundColor: "#1e293b",
                          color: "white",
                          border: "none",
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Affecter un chauffeur
                      </button>
                    )}

                    {v.status === "EN_MISSION" && (
                      <button
                        onClick={() => handleTerminer(v.id)}
                        disabled={loadingTerminer === v.id}
                        style={{
                          marginTop: 14,
                          width: "100%",
                          padding: "8px 0",
                          backgroundColor: "#d97706",
                          color: "white",
                          border: "none",
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: loadingTerminer === v.id ? "not-allowed" : "pointer",
                          opacity: loadingTerminer === v.id ? 0.7 : 1,
                        }}
                      >
                        {loadingTerminer === v.id ? "Clôture..." : "Terminer la mission"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h3 style={{ color: "#1e293b", marginBottom: 14, fontSize: 16 }}>
              Chauffeurs ({drivers.length})
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {drivers.map((d) => {
                const colors = statusColor(d.statut);
                return (
                  <div
                    key={d.id}
                    style={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      padding: "12px 14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: "#1e293b", fontSize: 14 }}>
                        {d.prenom} {d.nom}
                      </div>
                      {d.telephone && (
                        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                          {d.telephone}
                        </div>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: 999,
                        backgroundColor: colors.bg,
                        color: colors.text,
                      }}
                    >
                      {d.statut.replace(/_/g, " ")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          padding: "12px 20px",
          fontSize: 12,
          color: "#6b7280",
          backgroundColor: "white",
          borderTop: "1px solid #e5e7eb",
        }}
      >
        Copyright © 2026 SPAT. Tous droits réservés.
      </div>

      {selectedVehicle && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 16,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 10,
              width: "100%",
              maxWidth: 420,
              padding: 24,
              boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
            }}
          >
            <h3 style={{ margin: 0, color: "#111827", fontSize: 18 }}>
              Affecter un chauffeur
            </h3>
            <p style={{ marginTop: 6, color: "#374151", fontSize: 14 }}>
              Véhicule :{" "}
              <strong style={{ color: "#111827" }}>{selectedVehicle.immatriculation}</strong> (
              {selectedVehicle.marque} {selectedVehicle.modele})
            </p>

            <div style={{ marginTop: 18 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#111827",
                  marginBottom: 6,
                }}
              >
                Chauffeur disponible
              </label>
              <select
                value={selectedDriverId}
                onChange={(e) =>
                  setSelectedDriverId(e.target.value ? Number(e.target.value) : "")
                }
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  color: "#111827",
                  backgroundColor: "#ffffff",
                }}
              >
                <option value="" style={{ color: "#111827" }}>
                  Sélectionner un chauffeur
                </option>
                {drivers
                  .filter((d) => d.statut === "DISPONIBLE" || d.statut === "SUR_PLACE")
                  .map((d) => (
                    <option key={d.id} value={d.id} style={{ color: "#111827" }}>
                      {d.prenom} {d.nom}
                    </option>
                  ))}
              </select>
            </div>

            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}
            >
              <button
                onClick={() => setSelectedVehicle(null)}
                style={{
                  padding: "9px 16px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  backgroundColor: "white",
                  cursor: "pointer",
                  fontSize: 14,
                  color: "#111827",
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedDriverId || loadingAssign}
                style={{
                  padding: "9px 16px",
                  border: "none",
                  borderRadius: 8,
                  backgroundColor:
                    !selectedDriverId || loadingAssign ? "#94a3b8" : "#1e293b",
                  color: "white",
                  cursor:
                    !selectedDriverId || loadingAssign ? "not-allowed" : "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {loadingAssign ? "Affectation..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const navHeaderBtn: React.CSSProperties = {
  background: "rgba(255,255,255,0.1)",
  border: "1px solid rgba(255,255,255,0.2)",
  color: "white",
  cursor: "pointer",
  fontSize: 13,
  padding: "6px 12px",
  borderRadius: 6,
};

function StatCard({
  titre,
  valeur,
  accent,
}: {
  titre: string;
  valeur: string;
  accent?: string;
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
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>{titre}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent || "#1e293b" }}>{valeur}</div>
    </div>
  );
}