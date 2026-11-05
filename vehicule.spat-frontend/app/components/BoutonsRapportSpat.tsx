"use client";

import { useState, type CSSProperties } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import {
  telechargerRapportPdfSpat,
  type RapportSpat,
} from "@/app/lib/spatRapports";

type Props = {
  preparerRapport: () => RapportSpat;
  style?: CSSProperties;
};

export default function BoutonsRapportSpat({ preparerRapport, style }: Props) {
  const [enCours, setEnCours] = useState(false);
  const telechargerPdf = async () => {
    if (enCours) return;
    setEnCours(true);
    try {
      const rapport = preparerRapport();
      await telechargerRapportPdfSpat(rapport);
    } catch (erreur) {
      console.error("Génération du rapport SPAT impossible :", erreur);
      toast.error(erreur instanceof Error ? erreur.message : "Impossible de générer le rapport.");
    } finally { setEnCours(false); }
  };
  return (
    <div style={{ display: "inline-flex", flexWrap: "wrap", gap: 8, ...style }}>
      <button type="button" className="btn-spat btn-jaune" disabled={enCours}
        style={{ cursor: enCours ? "wait" : "pointer" }}
        onClick={() => { void telechargerPdf(); }}>
        <Download size={15} /> {enCours ? "Création du PDF…" : "Télécharger PDF"}
      </button>
    </div>
  );
}
