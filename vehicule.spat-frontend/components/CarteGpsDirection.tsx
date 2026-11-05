"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, Navigation, Clock, X } from "lucide-react";
import type { GpsPosition } from "@/components/FlotteMap";

const FlotteMap = dynamic(() => import("@/components/FlotteMap"), { ssr: false });

interface CarteGpsDirectionProps {

  onClose: () => void;
}

export default function CarteGpsDirection({ onClose }: CarteGpsDirectionProps) {
  const [positions, setPositions] = useState<GpsPosition[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const API = process.env.NEXT_PUBLIC_API_URL || "";

  useEffect(() => {
    const chargerPositions = async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token || !API) return;

      setChargement(true);
      setErreur(null);

      try {
        const res = await fetch(`${API}/gps/positions`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (!res.ok) throw new Error("Impossible de charger les positions GPS");

        const data: unknown = await res.json();
        if (!Array.isArray(data)) throw new Error("Format des positions GPS inattendu.");
        setPositions(data as GpsPosition[]);
      } catch (error) {
        console.error("Erreur chargement GPS:", error);
        setErreur(error instanceof Error ? error.message : "Erreur de chargement");
      } finally {
        setChargement(false);
      }
    };

    chargerPositions();
    const interval = setInterval(chargerPositions, 5000);

    return () => clearInterval(interval);
  }, [API]);

  const formaterDate = (date?: string | null) => {
    if (!date) return "—";
    try {
      const d = new Date(date);
      return d.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return date;
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
    }}>
      <div style={{
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        maxWidth: "1200px",
        width: "100%",
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
      }}>

        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "20px", color: "#1e293b", fontWeight: 700 }}>
              Suivi GPS - Véhicules de votre direction
            </h2>

          </div>
          <button
            onClick={onClose}
            style={{
              padding: "8px",
              border: "none",
              background: "none",
              cursor: "pointer",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={24} color="#64748b" />
          </button>
        </div>

        <div style={{
          flex: 1,
          minHeight: 500,
          overflow: "auto",
          padding: "24px",
          display: "flex",
          gap: "20px",
        }}>

          <div style={{
            width: "320px",
            flexShrink: 0,
          }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "14px", color: "#475569", fontWeight: 600 }}>
              Véhicules ({positions.length})
            </h3>

            {chargement && (
              <div style={{ textAlign: "center", padding: "30px", color: "#64748b", fontSize: "13px" }}>
                Chargement des positions GPS...
              </div>
            )}

            {erreur && (
              <div style={{
                padding: "14px",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                color: "#991b1b",
                fontSize: "13px",
              }}>
                {erreur}
              </div>
            )}

            {!chargement && !erreur && positions.length === 0 && (
              <div style={{ textAlign: "center", padding: "30px", color: "#64748b", fontSize: "13px" }}>
                Aucune position GPS disponible
              </div>
            )}

            {!chargement && positions.map((position) => (
              <div
                key={position.vehiculeId}
                style={{
                  padding: "14px",
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  marginBottom: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <MapPin size={16} color="#3b82f6" />
                  <strong style={{ fontSize: "14px", color: "#1e293b" }}>
                    {position.immatriculation}
                  </strong>
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                  Traceur GPS {position.gpsDeviceId}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#64748b" }}>
                  <Clock size={12} />
                  {formaterDate(position.dateGps)}
                </div>
                {position.vitesse != null && position.vitesse > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#16a34a", marginTop: "4px" }}>
                    <Navigation size={12} />
                    {position.vitesse} km/h
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{
            flex: 1,
            minWidth: 0,
            height: "min(62vh, 640px)",
            minHeight: 340,
            backgroundColor: "#e8edf1",
            borderRadius: "8px",
            overflow: "hidden",
          }}>
            <FlotteMap
              positions={positions}
              height="100%"
              showHeader={false}
              showFullscreenControl
              showMapWhenEmpty
              afficherLieu
              emptyCenter={[-18.1492, 49.4023]}
              emptyMessage="Aucune coordonnée GPS valide pour les véhicules affectés à cette direction."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
