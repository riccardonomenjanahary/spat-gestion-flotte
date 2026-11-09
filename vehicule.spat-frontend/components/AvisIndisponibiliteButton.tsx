"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { CalendarOff, Send, X } from "lucide-react";
import { toast } from "sonner";

export default function AvisIndisponibiliteButton() {
  const api = process.env.NEXT_PUBLIC_API_URL;
  const [pret, setPret] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  const [dateDebut, setDateDebut] = useState(aujourdhui());
  const [dateFin, setDateFin] = useState(aujourdhui());
  const [motif, setMotif] = useState("");
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    const initialisation = window.setTimeout(() => {
      setPret(true);

    }, 0);
    return () => window.clearTimeout(initialisation);
  }, []);

  async function transmettre(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = localStorage.getItem("token");
    if (!api || !token) {
      toast.error(!api ? "NEXT_PUBLIC_API_URL n'est pas configurée." : "Session expirée.");
      return;
    }
    setEnvoi(true);
    try {
      const response = await fetch(`${api}/indisponibilites`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ dateDebut, dateFin, motif: motif.trim() }),
      });
      const texte = await response.text();
      let donnees: { message?: string; notificationsCreees?: number; superAdminsNotifies?: number } = {};
      try { donnees = JSON.parse(texte); } catch { donnees = { message: texte }; }
      if (!response.ok) throw new Error(donnees.message || "L'avis n'a pas pu être transmis.");
      toast.success(donnees.message || "Avis transmis.", {
        description: [
          donnees.notificationsCreees
            ? `${donnees.notificationsCreees} responsable(s) de votre Direction notifié(s).`
            : "Aucun autre responsable actif n'a été notifié.",
          donnees.superAdminsNotifies
            ? "Le Super Admin a été notifié (popup et email) pour créer le compte par intérim."
            : null,
        ].filter(Boolean).join(" "),
      });
      setOuvert(false);
      setMotif("");
      setDateDebut(aujourdhui());
      setDateFin(aujourdhui());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur de communication avec le serveur.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <>
      {pret && createPortal(
        <button
          className="avis-indisponibilite-trigger"
          type="button"
          onClick={() => setOuvert(true)}
          title="Signaler une indisponibilité"
          aria-label="Avis d'indisponibilité"
          aria-haspopup="dialog"
          style={{ position: "fixed", right: 24, bottom: 24, zIndex: 2147483000, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9, minHeight: 54, padding: "14px 20px", border: "2px solid #ffffff", borderRadius: 999, background: "#b91c1c", color: "#ffffff", boxShadow: "0 8px 28px rgba(127,29,29,.45)", fontFamily: "Arial, sans-serif", fontSize: 15, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}
        >
          <CalendarOff size={19} aria-hidden="true" /> Avis d&apos;indisponibilité
        </button>,
        document.body
      )}
      {ouvert && (
        <div
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget && !envoi) setOuvert(false); }}
          style={{ position: "fixed", inset: 0, zIndex: 1200, display: "grid", placeItems: "center", padding: 18, background: "rgba(15,23,42,.55)" }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="avis-indisponibilite-titre"
            onSubmit={transmettre}
            style={{ width: "min(500px, 100%)", display: "grid", gap: 16, padding: 22, borderRadius: 14, background: "white", boxShadow: "0 20px 60px rgba(15,23,42,.25)" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <h2 id="avis-indisponibilite-titre" style={{ margin: 0, color: "#172033", fontSize: 20 }}>Avis d&apos;indisponibilité</h2>

              </div>
              <button type="button" aria-label="Fermer" onClick={() => setOuvert(false)} disabled={envoi} style={{ border: 0, background: "transparent", cursor: "pointer", padding: 4 }}><X size={20} /></button>
            </div>
            <label style={labelStyle}>Du <input type="date" value={dateDebut} min={aujourdhui()} onChange={(event) => setDateDebut(event.target.value)} required style={inputStyle} /></label>
            <label style={labelStyle}>Au <input type="date" value={dateFin} min={dateDebut || aujourdhui()} onChange={(event) => setDateFin(event.target.value)} required style={inputStyle} /></label>
            <label style={labelStyle}>Motif<textarea value={motif} onChange={(event) => setMotif(event.target.value)} required maxLength={1000} rows={4} placeholder="Précisez le motif de votre indisponibilité" style={{ ...inputStyle, resize: "vertical" }} /></label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 9 }}>
              <button type="button" onClick={() => setOuvert(false)} disabled={envoi} style={buttonStyle}>Annuler</button>
              <button type="submit" disabled={envoi} style={{ ...buttonStyle, background: "#1d4ed8", color: "white" }}><Send size={15} />{envoi ? "Transmission…" : "Transmettre l'avis"}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function aujourdhui() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const labelStyle = { display: "grid", gap: 6, color: "#334155", fontSize: 13, fontWeight: 700 } as const;
const inputStyle = { width: "100%", boxSizing: "border-box" as const, padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, color: "#0f172a", font: "inherit" };
const buttonStyle = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px 13px", border: "1px solid #cbd5e1", borderRadius: 8, background: "white", color: "#334155", fontWeight: 700, cursor: "pointer" } as const;
