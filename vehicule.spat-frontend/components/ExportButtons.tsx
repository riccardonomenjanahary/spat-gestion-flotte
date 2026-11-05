"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { FileDown, FileText } from "lucide-react";
import { toast } from "sonner";

import {
  exportCsv,
  exportExcel,
  exportPdf,
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
  afficherExcel?: boolean;
  afficherPdf?: boolean;
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
  afficherExcel = true,
  afficherPdf = true,
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

  const telechargerExcel = () => {
    if (!verifierDonnees()) return;
    try {
      exportExcel(config);
      toast.success("Export Excel généré.");
    } catch (error) {
      console.error("Erreur export Excel :", error);
      toast.error("Impossible de générer le fichier Excel.");
    }
  };

  return (
    <div style={containerStyle}>
      {afficherPdf && (
        <button
          type="button"
          className="btn-spat btn-jaune"
          onClick={telechargerPdf}
          disabled={pdfEnCours}
          style={{ ...buttonStyle, opacity: pdfEnCours ? 0.6 : 1, cursor: pdfEnCours ? "wait" : "pointer" }}
          title="Télécharger le rapport PDF"
        >
          <FileText size={16} />
          {pdfEnCours ? "PDF..." : "PDF"}
        </button>
      )}

      {afficherCsv && (
        <button type="button" className="btn-spat btn-orange" onClick={telechargerCsv} style={buttonStyle} title="Exporter au format CSV">
          <FileDown size={16} />
          CSV
        </button>
      )}

      {afficherExcel && (
        <button type="button" className="btn-spat btn-vert" onClick={telechargerExcel} style={buttonStyle} title="Exporter au format Excel">
          <FileDown size={16} />
          Excel
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
  minHeight: 38,
  padding: "8px 16px",
  borderRadius: 10,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
  border: "none",
  transition: "all 150ms ease",
};

