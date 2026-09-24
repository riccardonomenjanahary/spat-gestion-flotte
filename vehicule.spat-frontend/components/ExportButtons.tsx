"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { FileDown, FileText, Printer } from "lucide-react";
import { toast } from "sonner";

import {
  exportCsv,
  exportPdf,
  imprimerTableau,
  type ExportColumn,
} from "@/app/lib/exportUtils";

interface ExportButtonsProps<T> {
  titre: string;
  nomFichier: string;
  colonnes: ExportColumn<T>[];
  donnees: T[];
  sousTitre?: string;
  orientation?: "portrait" | "landscape";
  logoUrl?: string;
  afficherCsv?: boolean;
  afficherPdf?: boolean;
  afficherImpression?: boolean;
}

export default function ExportButtons<T>({
  titre,
  nomFichier,
  colonnes,
  donnees,
  sousTitre,
  orientation = "landscape",
  logoUrl = "/logo.png",
  afficherCsv = true,
  afficherPdf = true,
  afficherImpression = true,
}: ExportButtonsProps<T>) {
  const [pdfEnCours, setPdfEnCours] = useState(false);

  const config = { titre, nomFichier, colonnes, donnees, sousTitre, orientation, logoUrl };

  const verifierDonnees = () => {
    if (!donnees || donnees.length === 0) {
      toast.error("Aucune donnée à exporter.");
      return false;
    }
    return true;
  };

  const telechargerCsv = () => {
    if (!verifierDonnees()) return;
    try {
      exportCsv(config);
      toast.success("Export CSV généré.");
    } catch (error) {
      console.error("Erreur export CSV :", error);
      toast.error("Impossible de générer le CSV.");
    }
  };

  const telechargerPdf = async () => {
    if (!verifierDonnees()) return;
    setPdfEnCours(true);
    try {
      await exportPdf(config);
      toast.success("Export PDF généré.");
    } catch (error) {
      console.error("Erreur export PDF :", error);
      toast.error("Impossible de générer le PDF.");
    } finally {
      setPdfEnCours(false);
    }
  };

  const imprimer = () => {
    if (!verifierDonnees()) return;
    try {
      imprimerTableau(config);
    } catch (error) {
      console.error("Erreur impression :", error);
      toast.error(error instanceof Error ? error.message : "Impossible d'ouvrir l'impression.");
    }
  };

  return (
    <div style={containerStyle}>
      {afficherPdf && (
        <button
          type="button"
          onClick={telechargerPdf}
          disabled={pdfEnCours}
          style={{ ...buttonStyle, ...pdfButtonStyle, opacity: pdfEnCours ? 0.6 : 1, cursor: pdfEnCours ? "wait" : "pointer" }}
          title="Télécharger le rapport PDF"
        >
          <FileText size={16} />
          {pdfEnCours ? "PDF..." : "PDF"}
        </button>
      )}

      {afficherCsv && (
        <button type="button" onClick={telechargerCsv} style={{ ...buttonStyle, ...csvButtonStyle }} title="Exporter au format CSV">
          <FileDown size={16} />
          CSV
        </button>
      )}

      {afficherImpression && (
        <button type="button" onClick={imprimer} style={{ ...buttonStyle, ...printButtonStyle }} title="Imprimer ou enregistrer en PDF">
          <Printer size={16} />
          Imprimer
        </button>
      )}
    </div>
  );
}

const containerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 8,
  flexWrap: "wrap",
};

const buttonStyle: CSSProperties = {
  minHeight: 36,
  padding: "8px 14px",
  borderRadius: 8,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const pdfButtonStyle: CSSProperties = {
  backgroundColor: "#dc2626",
  color: "#ffffff",
  border: "1px solid #dc2626",
};

const csvButtonStyle: CSSProperties = {
  backgroundColor: "#2563eb",
  color: "#ffffff",
  border: "1px solid #2563eb",
};

const printButtonStyle: CSSProperties = {
  backgroundColor: "#16a34a",
  color: "#ffffff",
  border: "1px solid #16a34a",
};
