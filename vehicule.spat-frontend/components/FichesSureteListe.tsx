"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, Eye } from "lucide-react";

interface FicheSurete {
  id: number;
  mission?: string | null;
  immatriculation?: string | null;
  debut?: string | null;
  clotureeLe?: string | null;
  nomFichier: string;
  deposeParNom?: string | null;
  dateDepot: string;
}

function formaterDate(valeur?: string | null) {
  if (!valeur) return "—";
  const date = new Date(valeur);
  if (Number.isNaN(date.getTime())) return valeur;
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const boutonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#334155",
  fontSize: 12,
  cursor: "pointer",
};

export default function FichesSureteListe() {
  const API = process.env.NEXT_PUBLIC_API_URL || "";
  const [fiches, setFiches] = useState<FicheSurete[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ficheSelectionnee, setFicheSelectionnee] = useState<FicheSurete | null>(null);

  useEffect(() => {
    let actif = true;
    const charger = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`${API}/fiches-surete`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`${res.status}`);
        const data: unknown = await res.json();
        if (actif) setFiches(Array.isArray(data) ? (data as FicheSurete[]) : []);
      } catch {
        if (actif) setErreur("Impossible de charger les fiches de bord sûreté.");
      } finally {
        if (actif) setChargement(false);
      }
    };
    void charger();
    return () => {
      actif = false;
    };
  }, [API]);

  const telecharger = async (fiche: FicheSurete) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/fiches-surete/${fiche.id}/contenu`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const url = URL.createObjectURL(await res.blob());
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = fiche.nomFichier || "fiche-surete.pdf";
      lien.rel = "noopener";
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      toast.error("Ouverture du PDF impossible.");
    }
  };

  if (chargement) {
    return <div style={{ padding: 16, color: "#64748b", fontSize: 13 }}>Chargement des fiches...</div>;
  }
  if (erreur) {
    return <div role="alert" style={{ padding: 16, color: "#b91c1c", fontSize: 13 }}>{erreur}</div>;
  }
  if (fiches.length === 0) {
    return <div style={{ padding: 16, color: "#64748b", fontSize: 13 }}>Aucune intervention sûreté clôturée pour le moment.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {fiches.map((fiche) => (
        <div
          key={fiche.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            padding: "10px 12px",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            background: "#fff",
          }}
        >
          <span
            style={{
              padding: "3px 8px",
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              background: fiche.mission === "URGENCE" ? "#fef2f2" : "#eff6ff",
              color: fiche.mission === "URGENCE" ? "#b91c1c" : "#1d4ed8",
            }}
          >
            {fiche.mission === "URGENCE" ? "Urgence" : "Patrouille"}
          </span>
          <div style={{ flex: 1, minWidth: 220, display: "grid", gap: 2 }}>
            <strong style={{ fontSize: 13, color: "#111827" }}>
              {fiche.immatriculation || "Véhicule non renseigné"} — clôturée le {formaterDate(fiche.clotureeLe || fiche.dateDepot)}
            </strong>
            <span style={{ fontSize: 11, color: "#64748b" }}>
              Début : {formaterDate(fiche.debut)}
              {fiche.deposeParNom ? ` · Agent : ${fiche.deposeParNom}` : ""}
            </span>
          </div>
          <button type="button" style={boutonStyle} onClick={() => setFicheSelectionnee(fiche)}>
            <Eye size={13} /> Voir
          </button>
          <button type="button" style={boutonStyle} onClick={() => void telecharger(fiche)}>
            <Download size={13} /> Télécharger
          </button>
        </div>
      ))}
      {ficheSelectionnee && (
        <div role="dialog" aria-modal="true" aria-labelledby="fiche-surete-details-title" style={{ position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", padding: 20, background: "rgba(15,23,42,.52)" }}>
          <div style={{ width: "min(520px, 100%)", borderRadius: 14, background: "#fff", padding: 22, boxShadow: "0 24px 60px rgba(15,23,42,.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
              <h2 id="fiche-surete-details-title" style={{ margin: 0, fontSize: 19, color: "#0f172a" }}>Détails de la fiche sûreté</h2>
              <button type="button" onClick={() => setFicheSelectionnee(null)} aria-label="Fermer" style={{ border: 0, background: "transparent", color: "#64748b", fontSize: 24, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ display: "grid", gap: 9, marginTop: 18, color: "#334155", fontSize: 13 }}>
              <div><span>Type :</span> {ficheSelectionnee.mission === "URGENCE" ? "Urgence" : "Patrouille"}</div>
              <div><span>Véhicule :</span> {ficheSelectionnee.immatriculation || "—"}</div>
              <div><span>Début :</span> {formaterDate(ficheSelectionnee.debut)}</div>
              <div><span>Clôturée le :</span> {formaterDate(ficheSelectionnee.clotureeLe || ficheSelectionnee.dateDepot)}</div>
              <div><span>Déposée par :</span> {ficheSelectionnee.deposeParNom || "—"}</div>
              <div><span>Fichier :</span> {ficheSelectionnee.nomFichier || "—"}</div>
            </div>
            <button type="button" onClick={() => setFicheSelectionnee(null)} style={{ ...boutonStyle, marginTop: 20, width: "100%", justifyContent: "center" }}>Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
}
