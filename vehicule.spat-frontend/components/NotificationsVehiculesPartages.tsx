"use client";

import { useEffect, useState } from "react";
import { MapPin, Clock, X, AlertCircle } from "lucide-react";

interface MissionActive {
  missionId: number;
  vehiculeImmatriculation: string;
  vehiculeId: number;
  dateDebut: string;
  dateFin: string | null;
  destination: string;
  statut: string;
  directionUtilisatrice: string;
  enCours: boolean;
  libreLe: string | null;
  message: string;
}

export default function NotificationsVehiculesPartages() {
  const [missionsActives, setMissionsActives] = useState<MissionActive[]>([]);
  const [notificationsVues, setNotificationsVues] = useState<Set<number>>(new Set());
  const [afficher, setAfficher] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL || "";

  useEffect(() => {
    const chargerMissionsActives = async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token || !API) return;

      try {
        const res = await fetch(`${API}/reservations/vehicules-partages/missions-actives`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (!res.ok) return;

        const data = (await res.json()) as MissionActive[];
        setMissionsActives(data);

        const nouvellesMissions = data.filter(m => !notificationsVues.has(m.missionId));
        if (nouvellesMissions.length > 0) {
          setAfficher(true);
        }
      } catch (error) {
        console.error("Erreur chargement missions actives:", error);
      }
    };

    chargerMissionsActives();
    const interval = setInterval(chargerMissionsActives, 60000);

    return () => clearInterval(interval);
  }, [API, notificationsVues]);

  const marquerCommeLu = (missionId: number) => {
    setNotificationsVues(prev => new Set([...prev, missionId]));
  };

  const fermer = () => {

    missionsActives.forEach(m => marquerCommeLu(m.missionId));
    setAfficher(false);
  };

  const formaterDate = (dateStr: string | null) => {
    if (!dateStr) return "Non définie";
    try {
      const date = new Date(dateStr);
      return date.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const missionsNonVues = missionsActives.filter(m => !notificationsVues.has(m.missionId));

  if (!afficher || missionsNonVues.length === 0) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: "20px",
      right: "20px",
      zIndex: 9998,
      maxWidth: "420px",
      width: "100%",
    }}>
      <div style={{
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)",
        border: "1px solid #e2e8f0",
        overflow: "hidden",
      }}>

        <div style={{
          padding: "16px 20px",
          backgroundColor: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertCircle size={20} color="#f59e0b" />
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>
              Véhicules partagés en mission
            </h3>
          </div>
          <button
            onClick={fermer}
            style={{
              padding: "4px",
              border: "none",
              background: "none",
              cursor: "pointer",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} color="#64748b" />
          </button>
        </div>

        <div style={{
          maxHeight: "400px",
          overflowY: "auto",
        }}>
          {missionsNonVues.map((mission) => (
            <div
              key={mission.missionId}
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              <div style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                marginBottom: "10px",
              }}>
                <div style={{
                  padding: "8px",
                  backgroundColor: mission.enCours ? "#fef3c7" : "#dbeafe",
                  borderRadius: "8px",
                  flexShrink: 0,
                }}>
                  <MapPin size={18} color={mission.enCours ? "#f59e0b" : "#3b82f6"} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#1e293b",
                    marginBottom: "4px",
                  }}>
                    {mission.vehiculeImmatriculation}
                  </div>
                  <div style={{
                    fontSize: "13px",
                    color: "#64748b",
                    marginBottom: "8px",
                  }}>
                    {mission.message}
                  </div>
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    fontSize: "12px",
                    color: "#94a3b8",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <MapPin size={12} />
                      {mission.destination || "Destination non précisée"}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Clock size={12} />
                      Libre le : {formaterDate(mission.libreLe)}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => marquerCommeLu(mission.missionId)}
                style={{
                  padding: "6px 12px",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#64748b",
                  backgroundColor: "#f1f5f9",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                Marquer comme lu
              </button>
            </div>
          ))}
        </div>

        <div style={{
          padding: "12px 20px",
          backgroundColor: "#f8fafc",
          borderTop: "1px solid #e2e8f0",
          textAlign: "center",
        }}>
          <button
            onClick={fermer}
            style={{
              padding: "8px 16px",
              fontSize: "12px",
              fontWeight: 600,
              color: "#475569",
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Tout fermer
          </button>
        </div>
      </div>
    </div>
  );
}
