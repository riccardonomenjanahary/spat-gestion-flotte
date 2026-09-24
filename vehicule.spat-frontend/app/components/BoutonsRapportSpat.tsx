"use client";

import { useState, type CSSProperties } from "react";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";
import {
  imprimerRapportSpat,
  telechargerRapportPdfSpat,
  type RapportSpat,
} from "@/app/lib/spatRapports";

type Props = {
  preparerRapport: () => RapportSpat;
  style?: CSSProperties;
};

/** Le même contenu alimente l'impression ET le téléchargement direct PDF. */
export default function BoutonsRapportSpat({ preparerRapport, style }: Props) {
  const [enCours, setEnCours] = useState<"imprimer" | "pdf" | null>(null);
  const action = async (mode: "imprimer" | "pdf") => {
    if (enCours) return;
    setEnCours(mode);
    try {
      const rapport = preparerRapport();
      if (mode === "imprimer") await imprimerRapportSpat(rapport);
      else await telechargerRapportPdfSpat(rapport);
    } catch (erreur) {
      console.error("Génération du rapport SPAT impossible :", erreur);
      toast.error(erreur instanceof Error ? erreur.message : "Impossible de générer le rapport.");
    } finally { setEnCours(null); }
  };
  const pdfStyle: CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
    padding: "9px 14px", borderRadius: 8, border: "1px solid #dc2626",
    background: "#dc2626", color: "#ffffff", fontSize: 13, fontWeight: 700,
    cursor: enCours ? "wait" : "pointer", opacity: enCours ? 0.65 : 1,
  };
  const printStyle: CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
    padding: "9px 14px", borderRadius: 8, border: "1px solid #2563eb",
    background: "#2563eb", color: "#ffffff", fontSize: 13, fontWeight: 700,
    cursor: enCours ? "wait" : "pointer", opacity: enCours ? 0.65 : 1,
  };
  return (
    <div style={{ display: "inline-flex", flexWrap: "wrap", gap: 8, ...style }}>
      <button type="button" disabled={enCours !== null} style={pdfStyle}
        onClick={() => { void action("pdf"); }}>
        <Download size={15} /> {enCours === "pdf" ? "Création du PDF…" : "Télécharger PDF"}
      </button>
      <button type="button" disabled={enCours !== null} style={printStyle}
        onClick={() => { void action("imprimer"); }}>
        <Printer size={15} /> {enCours === "imprimer" ? "Préparation…" : "Imprimer"}
      </button>
    </div>
  );
}
