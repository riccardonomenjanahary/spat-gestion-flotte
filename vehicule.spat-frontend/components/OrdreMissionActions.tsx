"use client";

import { useState } from "react";
import { Download, Mail } from "lucide-react";
import { toast } from "sonner";

interface MissionOrdre {
  id: number;
  statut?: string | null;
  dateDebut?: string | null;
  dateFin?: string | null;
  motif?: string | null;
  zoneMission?: string | null;
  pointDepart?: string | null;
  destination?: string | null;
  observations?: string | null;
  demandeurNom?: string | null;
  demandeurPrenom?: string | null;
  demandeurMatricule?: string | null;
  demandeurEntite?: string | null;
  demandeur?: { nomComplet?: string | null; email?: string | null } | null;
  vehicule?: { immatriculation?: string | null } | null;
  chauffeur?: { nom?: string | null; prenom?: string | null } | null;
}

const API = process.env.NEXT_PUBLIC_API_URL;

function dateFr(valeur?: string | null) {
  if (!valeur) return "—";
  const date = new Date(valeur);
  return Number.isNaN(date.getTime()) ? valeur : date.toLocaleString("fr-FR");
}

function nomDemandeur(mission: MissionOrdre) {
  return [mission.demandeurPrenom, mission.demandeurNom].filter(Boolean).join(" ")
    || mission.demandeur?.nomComplet
    || mission.demandeurMatricule
    || "Demandeur";
}

function dateHeureLocalePdf(valeur?: string | null) {
  if (!valeur) return "—";
  const date = new Date(valeur);
  return Number.isNaN(date.getTime()) ? valeur : date.toLocaleDateString("fr-FR");
}

function nombreJours(mission: MissionOrdre) {
  if (!mission.dateDebut || !mission.dateFin) return "—";
  const debut = new Date(mission.dateDebut).getTime();
  const fin = new Date(mission.dateFin).getTime();
  if (!Number.isFinite(debut) || !Number.isFinite(fin) || fin <= debut) return "—";
  return String(Math.max(1, Math.ceil((fin - debut) / 86400000)));
}

async function chargerLogoDataUrl() {
  try {
    let response = await fetch("/logo.png");
    if (!response.ok) response = await fetch("/Logo.png");
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string | null>((resolve) => {
      const lecteur = new FileReader();
      lecteur.onloadend = () => resolve(typeof lecteur.result === "string" ? lecteur.result : null);
      lecteur.onerror = () => resolve(null);
      lecteur.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function creerPdf(mission: MissionOrdre) {
  const nomFichier = `ordre-mission-${mission.id}.pdf`;
  const [{ jsPDF }, logo] = await Promise.all([import("jspdf"), chargerLogoDataUrl()]);
  return (() => {
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const largeur = 210;
    const marge = 20;
    pdf.setDrawColor(80, 80, 80);
    pdf.rect(8, 8, 194, 281);
    if (logo) {
      try { pdf.addImage(logo, "PNG", marge, 13, 24, 24); } catch {                      }
    }
    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text("SOCIETE DU PORT A GESTION AUTONOME", largeur / 2, 17, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.text("DE TOAMASINA", largeur / 2, 23, { align: "center" });
    pdf.text("B.P 492", largeur / 2, 29, { align: "center" });
    pdf.setFont("helvetica", "bold");
    pdf.text("DEMANDE D'ORDRE DE MISSION", largeur / 2, 41, { align: "center" });

    const forfaitaire = mission.observations?.match(/Forfaitaire\s*:\s*(oui|non)/i)?.[1] || "—";
    const lignes = [
      ["NOM", mission.demandeurNom || nomDemandeur(mission).split(" ").slice(1).join(" ") || "—"],
      ["PRENOM", mission.demandeurPrenom || nomDemandeur(mission).split(" ")[0] || "—"],
      ["FONCTION", "—"],
      ["N° MATRICULE", mission.demandeurMatricule || "—"],
      ["DIRECTION", mission.demandeurEntite || "—"],
      ["LIEU DE PLACEMENT", mission.destination || "—"],
      ["DUREE", `${nombreJours(mission)} jour(s)`],
      ["MOTIF VOYAGE", mission.motif || "—"],
      ["MOYEN DE DEPLACEMENT", mission.vehicule?.immatriculation ? `Voiture SPAT — ${mission.vehicule.immatriculation}` : "Voiture SPAT"],
      ["DATE DE DEPART", dateHeureLocalePdf(mission.dateDebut)],
    ];
    let y = 56;
    lignes.forEach(([label, valeur]) => {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text(label, marge, y);
      pdf.text(":", 67, y);
      pdf.setFont("helvetica", "normal");
      const texte = pdf.splitTextToSize(valeur, 118);
      pdf.text(texte, 72, y);
      y += Math.max(7, texte.length * 5);
    });
    y += 2;
    pdf.setFont("helvetica", "bold");
    pdf.text("OPTION SOUHAITEE POUR L'HEBERGEMENT", marge, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(`- Indemnité forfaitaire : ${forfaitaire}`, marge, y + 8);
    pdf.text("Toamasina,", 153, 245);
    pdf.text(`Le ${new Date().toLocaleDateString("fr-FR")}`, 153, 253);
    pdf.setFont("helvetica", "bold");
    pdf.text("LE DEMANDEUR", marge, 252);
    pdf.text("LE DIRECTEUR", 140, 268);
    pdf.setFont("helvetica", "normal");
    pdf.text("Signature :", marge, 266);
    pdf.line(42, 266, 95, 266);
    return { pdf, nomFichier };
  })();
}

interface Props {
  mission: MissionOrdre;
  afficherTelechargement?: boolean;
  afficherEnvoiEmail?: boolean;
  destinataireEmail?: string | null;
  onEnvoye?: () => void;
}

export default function OrdreMissionActions({
  mission,
  afficherTelechargement = true,
  afficherEnvoiEmail = true,
  destinataireEmail,
  onEnvoye,
}: Props) {
  const [chargement, setChargement] = useState<"telechargement" | "email" | null>(null);

  const telecharger = async () => {
    setChargement("telechargement");
    try {
      const { pdf, nomFichier } = await creerPdf(mission);
      pdf.save(nomFichier);
      toast.success("Ordre de mission téléchargé.");
    } catch (error) {
      console.error(error);
      toast.error("Impossible de générer l'ordre de mission.");
    } finally {
      setChargement(null);
    }
  };

  const envoyerEmail = async () => {
    const email = destinataireEmail !== undefined
      ? destinataireEmail?.trim()
      : mission.demandeur?.email?.trim();
    if (!email) {
      toast.error("Aucune adresse email n'est renseignée pour le demandeur.");
      return;
    }
    if (!API) {
      toast.error("API de l'application non configurée.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Session expirée.");
      return;
    }
    setChargement("email");
    try {
      const { pdf, nomFichier } = await creerPdf(mission);
      const dataUri = String(pdf.output("datauristring"));
      const pdfBase64 = dataUri.substring(dataUri.indexOf(",") + 1);
      const response = await fetch(`${API}/reservations/${mission.id}/ordre-mission/email`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ pdfBase64, nomFichier }),
      });
      const message = await response.text().catch(() => "");
      if (!response.ok) throw new Error(message || "Envoi email impossible.");
      toast.success(`Ordre de mission envoyé à ${email}.`);
      onEnvoye?.();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Impossible d'envoyer l'ordre de mission.");
    } finally {
      setChargement(null);
    }
  };

  if (!["VALIDEE_N1", "VALIDEE", "PLANIFIEE", "CLOTUREE"].includes(String(mission.statut || "").toUpperCase())) {
    return null;
  }

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18, padding: 14, border: "1px solid #bfdbfe", borderRadius: 10, background: "#eff6ff" }}>
      <strong style={{ width: "100%", color: "#1e3a8a", fontSize: 13 }}>Ordre de mission</strong>
      {afficherTelechargement && (
        <button type="button" className="btn-spat btn-bleu" onClick={telecharger} disabled={chargement !== null}>
          <Download size={15} /> {chargement === "telechargement" ? "Génération…" : "Télécharger l’OM"}
        </button>
      )}
      {afficherEnvoiEmail && (
        <button type="button" className="btn-spat btn-vert" onClick={envoyerEmail} disabled={chargement !== null || !(destinataireEmail !== undefined ? destinataireEmail : mission.demandeur?.email)}>
          <Mail size={15} /> {chargement === "email" ? "Envoi…" : "Envoyer l’OM au demandeur"}
        </button>
      )}
      {afficherEnvoiEmail && !(destinataireEmail !== undefined ? destinataireEmail : mission.demandeur?.email) && <span style={{ width: "100%", color: "#92400e", fontSize: 12 }}>Aucune adresse email pour le demandeur.</span>}
    </div>
  );
}
