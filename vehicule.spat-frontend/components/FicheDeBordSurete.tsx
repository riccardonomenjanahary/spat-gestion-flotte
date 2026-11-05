"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { jsPDF as JsPDF } from "jspdf";
import type { UserOptions } from "jspdf-autotable";
import { toast } from "sonner";
import { Eye, FileDown, Trash2 } from "lucide-react";
import PersonnelChauffeurAutocomplete from "@/components/PersonnelChauffeurAutocomplete";
import type { GpsPosition } from "@/components/FlotteMap";

const KEY_ARCHIVES = "fiches-bord-surete-v2";
const KEY_EN_COURS = "fiche-bord-surete-en-cours";
const MIN_LIGNES_PDF = 8;
const CARBURANT = ["Plein", "¾", "½", "¼", "Réserve"];
const CONTROLE = ["RAS", "Anomalie"];
const PROPRETE = ["Bonne", "Moyenne", "Sale"];
const TYPES_INCIDENT = ["Panne", "Accident", "Incident de sûreté", "Autre"];
const SERVICES_ALERTES = ["Pompiers", "Police / Gendarmerie", "Capitainerie", "Direction", "Service médical", "Autre"];

type Mission = "PATROUILLE" | "URGENCE";
const LIBELLE_MISSION: Record<Mission, string> = { PATROUILLE: "Patrouille", URGENCE: "Urgence" };

type Etat = { heure: string; km: string; carburant: string; carrosserie: string; feux: string; proprete: string };

type Trajet = {
  chauffeur: string;
  chauffeurMatricule?: string;
  depart: string;
  lieuDepart: string;
  destination: string;
  arrivee: string;
  kmDepart: string;
  kmArrivee: string;
  motif: string;
  enregistre: boolean;
  enregistreLe: string;
};

type Urgence = {
  statut: "" | "EN_COURS" | "CLOTUREE";
  motif: string;
  declencheeLe: string;
  clotureeLe: string;
  lieu: string;
  description: string;
  mesures: string;
  services: string[];
  bilan: string;
};

type Fiche = {
  id: string;
  mission: Mission;
  debut: string;
  cloturee: boolean;
  clotureeLe: string;
  agent: string;
  matricule: string;
  immatriculation: string;
  urgence: Urgence;
  depart: Etat;
  retour: Etat;
  trajets: Trajet[];
  carburant: { plein: string; quantite: string; montant: string; bon: string; lieu: string };
  incident: { types: string[]; detail: string; heureLieu: string; mesures: string };
};
type ProfilAgent = { nomComplet: string; matricule: string };
type CarnetHistorique = {
  dateSortie: string;
  dateRetour?: string | null;
  destination?: string | null;
  motif?: string | null;
  conducteurNom?: string | null;
  conducteurMatricule?: string | null;
  kilometrageDepart?: number | null;
  kilometrageRetour?: number | null;
  vehiculeId?: number | null;
  vehicule?: { id?: number | null; immatriculation?: string | null } | null;
};
type GpsHistoriquePoint = { dateGps?: string | null; odometreKm?: number | null };

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function maintenantLocal(d: Date = new Date()) {
  const x = new Date(d.getTime());
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 16);
}

function finMission(debut: string) {
  if (!debut) return "";
  const d = new Date(debut);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + 1);
  return maintenantLocal(d);
}

const minutesEntre = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);

function dureeTxt(min: number) {
  if (!Number.isFinite(min) || min < 0) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, "0")} min` : `${m} min`;
}

const num = (s: string) => {
  const n = parseFloat((s || "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

function kmParcourus(t: Trajet): number | null {
  const a = num(t.kmDepart);
  const b = num(t.kmArrivee);
  return a !== null && b !== null && b >= a ? b - a : null;
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const fmtDate = (d: string) => d.split("-").reverse().join("/");
const normaliserImmatriculation = (valeur?: string | null) =>
  String(valeur || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const dateLocaleDuJour = () => maintenantLocal().slice(0, 10);

function datesInclusives(debut: string, fin: string) {
  const dates: string[] = [];
  const courant = new Date(`${debut}T12:00:00`);
  const dernier = new Date(`${fin}T12:00:00`);
  if (!Number.isFinite(courant.getTime()) || !Number.isFinite(dernier.getTime()) || dernier < courant) return dates;
  while (courant <= dernier && dates.length <= 3) {
    dates.push(`${courant.getFullYear()}-${String(courant.getMonth() + 1).padStart(2, "0")}-${String(courant.getDate()).padStart(2, "0")}`);
    courant.setDate(courant.getDate() + 1);
  }
  return dates;
}

const fmtDT = (s: string) => (s ? `${s.slice(8, 10)}/${s.slice(5, 7)} ${s.slice(11, 13)}h${s.slice(14, 16)}` : "");

const fmtDTLong = (s: string) => (s ? `${fmtDate(s.slice(0, 10))} ${s.slice(11, 13)}h${s.slice(14, 16)}` : "");
const heureTxt = (h: string) => (h ? h.replace(":", "h") : "____h____");

function recapParChauffeur(trajets: Trajet[]) {
  const map = new Map<string, { nom: string; numeros: number[]; km: number }>();
  trajets.forEach((t, i) => {
    const nom = t.chauffeur.trim();
    if (!nom) return;
    const cle = nom.toLowerCase();
    const e = map.get(cle) ?? { nom, numeros: [], km: 0 };
    e.numeros.push(i + 1);
    e.km += kmParcourus(t) ?? 0;
    map.set(cle, e);
  });
  return Array.from(map.values());
}

function lireArchivesMap(): Record<string, Fiche> {
  try {
    return JSON.parse(localStorage.getItem(KEY_ARCHIVES) || "{}");
  } catch {
    return {};
  }
}

function listerArchives(): Fiche[] {
  return Object.values(lireArchivesMap()).sort((a, b) => b.clotureeLe.localeCompare(a.clotureeLe));
}

function lireEnCours(): Fiche | null {
  try {
    const s = localStorage.getItem(KEY_EN_COURS);
    return s ? (JSON.parse(s) as Fiche) : null;
  } catch {
    return null;
  }
}

function ecrireEnCours(f: Fiche | null) {
  try {
    if (f) localStorage.setItem(KEY_EN_COURS, JSON.stringify(f));
    else localStorage.removeItem(KEY_EN_COURS);
  } catch {

  }
}

const etatVide = (): Etat => ({ heure: "", km: "", carburant: "", carrosserie: "", feux: "", proprete: "" });

const trajetVide = (depart = ""): Trajet => ({
  chauffeur: "", chauffeurMatricule: "", depart, lieuDepart: "", destination: "", arrivee: "",
  kmDepart: "", kmArrivee: "", motif: "", enregistre: false, enregistreLe: "",
});

const urgenceVide = (): Urgence => ({
  statut: "", motif: "", declencheeLe: "", clotureeLe: "",
  lieu: "", description: "", mesures: "", services: [], bilan: "",
});

const nouvelleFiche = (mission: Mission): Fiche => ({
  id: uid(),
  mission,
  debut: "",
  cloturee: false,
  clotureeLe: "",
  agent: "",
  matricule: "",
  immatriculation: "1205 TCA",
  urgence: urgenceVide(),
  depart: etatVide(),
  retour: etatVide(),
  trajets: [trajetVide()],
  carburant: { plein: "", quantite: "", montant: "", bon: "", lieu: "" },
  incident: { types: [], detail: "", heureLieu: "", mesures: "" },
});

const basculer = (liste: string[], valeur: string) =>
  liste.includes(valeur) ? liste.filter((v) => v !== valeur) : [...liste, valeur];

function validerTrajet(t: Trajet, i: number, f: Fiche): string | null {
  const n = `Trajet ${i + 1}`;
  if (!f.debut) return "Renseignez d'abord le début de la mission (section 1).";
  if (!t.chauffeur.trim()) return `${n} : le chauffeur est obligatoire.`;
  if (!t.depart || !t.arrivee) return `${n} : renseignez la date/heure de départ et d'arrivée.`;
  if (!t.lieuDepart.trim() || !t.destination.trim()) return `${n} : renseignez le lieu de départ et la destination.`;
  if (t.arrivee < t.depart) return `${n} : l'arrivée est antérieure au départ.`;
  const fin = finMission(f.debut);
  if (t.depart < f.debut || t.arrivee > fin)
    return `${n} : le trajet doit rester dans la mission de 24 h (du ${fmtDTLong(f.debut)} au ${fmtDTLong(fin)}).`;
  const a = num(t.kmDepart);
  const b = num(t.kmArrivee);
  if (a === null || b === null) return `${n} : renseignez les kilométrages de départ et d'arrivée.`;
  if (b < a) return `${n} : le km d'arrivée est inférieur au km de départ.`;
  return null;
}

function validerCloture(f: Fiche): string | null {
  if (f.mission === "URGENCE") {
    if (f.urgence.statut !== "CLOTUREE") return "L'urgence doit être clôturée avant l'enregistrement du bilan.";
    if (!f.urgence.bilan.trim()) return "Le bilan de l'urgence est obligatoire.";
    return null;
  }
  if (!f.agent.trim()) return "Le nom de l'agent de sûreté est obligatoire.";
  if (!f.matricule.trim()) return "Le matricule est obligatoire.";
  if (!f.immatriculation.trim()) return "L'immatriculation est obligatoire.";

  const kd = num(f.depart.km);
  const kr = num(f.retour.km);
  if (kd === null || kr === null) return "Renseignez le kilométrage de départ et de retour (section 2).";
  if (kr < kd) return "Le kilométrage de retour est inférieur à celui du départ.";

  const nonEnregistre = f.trajets.findIndex((t) => !t.enregistre && (t.destination.trim() || t.arrivee || t.kmArrivee));
  if (nonEnregistre >= 0)
    return `Le trajet ${nonEnregistre + 1} n'est pas enregistré : cliquez sur « Enregistrer le trajet » ou retirez-le.`;
  if (!f.trajets.some((t) => t.enregistre)) return "Enregistrez au moins un trajet avant de clôturer la mission.";
  return null;
}

type DocAvecTable = JsPDF & { lastAutoTable?: { finalY: number } };

async function genererPdf(f: Fiche, enBlob = false): Promise<Blob | null> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" }) as DocAvecTable;
  const pageWidth = doc.internal.pageSize.getWidth();
  const blue: [number, number, number] = [30, 58, 95];
  const pale: [number, number, number] = [241, 245, 249];
  const margin = 8;
  const gap = 6;
  const columnWidth = (pageWidth - margin * 2 - gap) / 2;
  const leftX = margin;
  const rightX = margin + columnWidth + gap;
  const fin = finMission(f.debut);

  const text = (value: string | null | undefined, x: number, y: number, width: number, maxLines = 1) => {
    const contenu = String(value || "—");
    const lines = doc.splitTextToSize(contenu, width).slice(0, maxLines);
    doc.text(lines.length ? lines : ["—"], x, y, { maxWidth: width });
  };
  const titreSection = (titre: string, x: number, y: number, width: number) => {
    doc.setFillColor(...blue);
    doc.roundedRect(x, y, width, 6, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(titre, x + 2, y + 4.1);
    return y + 7;
  };
  const ligne = (label: string, value: string, x: number, y: number, width: number, labelWidth: number, height = 5) => {
    doc.setDrawColor(203, 213, 225);
    doc.rect(x, y, width, height);
    doc.setFillColor(...pale);
    doc.rect(x, y, labelWidth, height, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(51, 65, 85);
    text(label, x + 1, y + 3.2, labelWidth - 2);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    text(value, x + labelWidth + 1, y + 3.2, width - labelWidth - 2, Math.max(1, Math.floor(height / 3)));
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...blue);
  doc.text("FICHE DE BORD JOURNALIÈRE - VÉHICULE", pageWidth / 2, 8, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(80);
  doc.text("Service Sûreté", pageWidth / 2, 12, { align: "center" });

  if (f.mission === "URGENCE") {
    let emergencyY = titreSection("URGENCE", margin, 18, pageWidth - margin * 2);
    ligne("Motif", f.urgence.motif, margin, emergencyY, pageWidth - margin * 2, 35, 9);
    emergencyY += 11;
    ligne("Déclenchée / clôturée", `${fmtDTLong(f.urgence.declencheeLe)} / ${fmtDTLong(f.urgence.clotureeLe)}`, margin, emergencyY, pageWidth - margin * 2, 42, 8);
    emergencyY += 12;

    let reportY = titreSection("COMPTE RENDU DE L'URGENCE", leftX, emergencyY, columnWidth);
    ligne("Lieu", f.urgence.lieu, leftX, reportY, columnWidth, 28, 8);
    reportY += 10;
    ligne("Description des faits", f.urgence.description, leftX, reportY, columnWidth, 38, 26);
    reportY += 29;
    ligne("Mesures prises", f.urgence.mesures, leftX, reportY, columnWidth, 30, 24);
    reportY += 27;
    ligne("Services alertés", f.urgence.services.join(", "), leftX, reportY, columnWidth, 30, 12);

    const bilanY = titreSection("BILAN", rightX, emergencyY, columnWidth);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(rightX, bilanY, columnWidth, 85, 1, 1);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    const bilanLines = doc.splitTextToSize(f.urgence.bilan || "", columnWidth - 8);
    doc.text(bilanLines.slice(0, 18), rightX + 4, bilanY + 6);

    const signatureY = 158;
    doc.setDrawColor(148, 163, 184);
    doc.roundedRect(margin, signatureY, pageWidth - margin * 2, 25, 1.5, 1.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...blue);
    doc.text("SIGNATURES", margin + 3, signatureY + 5);
    const signatureWidth = (pageWidth - margin * 2) / 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text("Agent de sûreté : __________________________", margin + 3, signatureY + 11);
    doc.text("Date et signature :", margin + 3, signatureY + 18);
    doc.text("Responsable : __________________________", margin + signatureWidth + 3, signatureY + 11);
    doc.text("Date et signature :", margin + signatureWidth + 3, signatureY + 18);

    const urgenceImmatriculation = f.immatriculation.trim().replace(/\s+/g, "-") || "vehicule";
    if (enBlob) return doc.output("blob");
    doc.save(`fiche-urgence_${urgenceImmatriculation}_${f.debut.slice(0, 10) || "mission"}.pdf`);
    return null;
  }

  let yLeft = titreSection("IDENTIFICATION", leftX, 16, columnWidth);
  ligne("Mission", LIBELLE_MISSION[f.mission], leftX, yLeft, columnWidth, 30);
  ligne("Début / fin", `${fmtDTLong(f.debut)} — ${fmtDTLong(fin)}`, leftX, yLeft + 5, columnWidth, 30);
  ligne("Agent", f.agent, leftX, yLeft + 10, columnWidth, 30);
  ligne("Matricule / plaque", `${f.matricule} / ${f.immatriculation}`, leftX, yLeft + 15, columnWidth, 30);

  yLeft = titreSection("ÉTAT DU VÉHICULE", leftX, 45, columnWidth);
  const checkRows: Array<[string, string, string]> = [
    ["Contrôle", "Départ", "Retour"],
    ["Heure", heureTxt(f.depart.heure), heureTxt(f.retour.heure)],
    ["Kilométrage", f.depart.km ? `${f.depart.km} km` : "—", f.retour.km ? `${f.retour.km} km` : "—"],
    ["Carburant", f.depart.carburant || "—", f.retour.carburant || "—"],
    ["Carrosserie / pneus", f.depart.carrosserie || "—", f.retour.carrosserie || "—"],
    ["Feux / radio", f.depart.feux || "—", f.retour.feux || "—"],
    ["Propreté", f.depart.proprete || "—", f.retour.proprete || "—"],
  ];
  const checkHeight = 5;
  const checkLabelWidth = 43;
  const valueWidth = (columnWidth - checkLabelWidth) / 2;
  checkRows.forEach((row, index) => {
    const yy = yLeft + index * checkHeight;
    doc.setDrawColor(203, 213, 225);
    doc.rect(leftX, yy, columnWidth, checkHeight);
    doc.setFillColor(...pale);
    doc.rect(leftX, yy, checkLabelWidth, checkHeight, "F");
    doc.setFont("helvetica", index === 0 ? "bold" : "normal");
    doc.setFontSize(5.8);
    doc.setTextColor(51, 65, 85);
    text(row[0], leftX + 1, yy + 3.2, checkLabelWidth - 2);
    [row[1], row[2]].forEach((value, col) => {
      const xx = leftX + checkLabelWidth + col * valueWidth;
      doc.line(xx, yy, xx, yy + checkHeight);
      doc.setTextColor(15, 23, 42);
      text(value, xx + 1, yy + 3.2, valueWidth - 2);
    });
  });

  yLeft = titreSection("CARBURANT", leftX, 88, columnWidth);
  ligne("Plein / quantité", `${f.carburant.plein || "—"} / ${f.carburant.quantite || "—"} L`, leftX, yLeft, columnWidth, 32);
  ligne("Montant / bon", `${f.carburant.montant || "—"} Ar / ${f.carburant.bon || "—"}`, leftX, yLeft + 5, columnWidth, 32);
  ligne("Lieu", f.carburant.lieu, leftX, yLeft + 10, columnWidth, 32);

  const incidentTitleY = titreSection("INCIDENTS ET OBSERVATIONS", leftX, 114, columnWidth);
  ligne("Types", f.incident.types.join(", "), leftX, incidentTitleY, columnWidth, 25, 6);
  ligne("Détail", f.incident.detail, leftX, incidentTitleY + 6, columnWidth, 25, 8);
  ligne("Heure / lieu", f.incident.heureLieu, leftX, incidentTitleY + 14, columnWidth, 25, 6);
  ligne("Mesures", f.incident.mesures, leftX, incidentTitleY + 20, columnWidth, 25, 8);

  const tripRowHeight = 6;
  const tripColumns = [0.035, 0.13, 0.09, 0.11, 0.11, 0.09, 0.06, 0.06, 0.07, 0.245]
    .map((ratio) => columnWidth * ratio);
  const tripHeaders = ["N°", "Chauffeur", "Départ", "Origine", "Destination", "Arrivée", "Km d.", "Km a.", "Km", "Motif"];
  const dessinerEnteteTrajets = (x0: number, y0: number) => {
    let x = x0;
    tripHeaders.forEach((header, index) => {
      doc.setFillColor(...pale);
      doc.setDrawColor(203, 213, 225);
      doc.rect(x, y0, tripColumns[index], tripRowHeight, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.3);
      doc.setTextColor(51, 65, 85);
      text(header, x + 0.6, y0 + 3.7, tripColumns[index] - 1.2);
      x += tripColumns[index];
    });
  };
  const tracerTrajet = (trajet: Trajet, numero: number, y0: number) => {
    const km = kmParcourus(trajet);
    const values = [String(numero), trajet.chauffeurMatricule ? `${trajet.chauffeur} ${trajet.chauffeurMatricule}` : trajet.chauffeur, fmtDT(trajet.depart), trajet.lieuDepart, trajet.destination, fmtDT(trajet.arrivee), trajet.kmDepart, trajet.kmArrivee, km === null ? "—" : fmt(km), trajet.motif];
    let x = rightX;
    values.forEach((value, column) => {
      doc.setDrawColor(203, 213, 225);
      doc.rect(x, y0, tripColumns[column], tripRowHeight);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.1);
      doc.setTextColor(15, 23, 42);
      text(value, x + 0.6, y0 + 3.7, tripColumns[column] - 1.2);
      x += tripColumns[column];
    });
  };

  // Nombre de trajets illimité : le tableau est prolongé sur des pages supplémentaires.
  let yTrajets = titreSection("TRAJETS", rightX, 16, columnWidth);
  dessinerEnteteTrajets(rightX, yTrajets);
  let capacitePage = Math.max(1, Math.floor((166 - yTrajets) / tripRowHeight));
  let rangee = 0;
  for (let index = 0; index < f.trajets.length; index++) {
    if (rangee >= capacitePage) {
      doc.addPage();
      yTrajets = titreSection("TRAJETS (suite)", rightX, 14, columnWidth);
      dessinerEnteteTrajets(rightX, yTrajets);
      capacitePage = Math.max(1, Math.floor((200 - yTrajets) / tripRowHeight));
      rangee = 0;
    }
    tracerTrajet(f.trajets[index], index + 1, yTrajets + tripRowHeight * (rangee + 1));
    rangee += 1;
  }
  const totalKm = f.trajets.reduce((total, trajet) => total + (kmParcourus(trajet) ?? 0), 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(30, 58, 95);
  doc.text(`Total parcouru : ${totalKm > 0 ? `${fmt(totalKm)} km` : "—"}`, rightX, yTrajets + tripRowHeight * (rangee + 1) + 3.5);

  const signatureY = 174;
  doc.setDrawColor(148, 163, 184);
  doc.roundedRect(margin, signatureY, pageWidth - margin * 2, 24, 1.5, 1.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...blue);
  doc.text("SIGNATURES", margin + 3, signatureY + 5);
  const signatureWidth = (pageWidth - margin * 2) / 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Agent de sûreté : ${f.agent || "________________________"}`, margin + 3, signatureY + 10);
  doc.text("Date et signature :", margin + 3, signatureY + 16);
  doc.text("Chef de service / responsable :", margin + signatureWidth + 3, signatureY + 10);
  doc.text("Date et signature :", margin + signatureWidth + 3, signatureY + 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(100);
  doc.text("Fiche de bord journalière — Service Sûreté", margin, 204);

  const immatriculation = f.immatriculation.trim().replace(/\s+/g, "-") || "vehicule";
  if (enBlob) return doc.output("blob");
  doc.save(`fiche-de-bord_${immatriculation}_${f.debut.slice(0, 10) || "mission"}.pdf`);
  return null;
}

async function transmettreFicheServeur(f: Fiche) {
  const API = process.env.NEXT_PUBLIC_API_URL || "";
  const token = localStorage.getItem("token");
  if (!API || !token) return;
  try {
    const blob = await genererPdf(f, true);
    if (!blob) return;
    const immatriculation = f.immatriculation.trim().replace(/\s+/g, "-") || "vehicule";
    const prefixe = f.mission === "URGENCE" ? "fiche-urgence" : "fiche-de-bord";
    const nom = `${prefixe}_${immatriculation}_${f.debut.slice(0, 10) || "mission"}.pdf`;
    const formulaire = new FormData();
    formulaire.append("fichier", new File([blob], nom, { type: "application/pdf" }));
    formulaire.append("mission", f.mission);
    formulaire.append("immatriculation", f.immatriculation.trim());
    formulaire.append("debut", f.debut);
    formulaire.append("clotureeLe", f.clotureeLe);
    const res = await fetch(`${API}/fiches-surete`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formulaire,
    });
    if (!res.ok) throw new Error(await res.text().catch(() => ""));
    toast.success("PDF de la fiche transmis au Chef DGAL.");
  } catch (err) {
    console.error(err);
    toast.error("Fiche archivée, mais le PDF n'a pas pu être transmis au Chef DGAL.");
  }
}

const champStyle: CSSProperties = {
  padding: "8px 10px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 400,
  width: "100%",
  boxSizing: "border-box",
  background: "white",
};
const grille: CSSProperties = { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" };
const carte: CSSProperties = {
  background: "white",
  padding: 20,
  borderRadius: 12,
  display: "grid",
  gap: 14,
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};
const sousCarte: CSSProperties = { border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, display: "grid", gap: 12 };
const bouton = (couleur: string, desactive = false): CSSProperties => ({
  background: couleur,
  color: "white",
  border: "none",
  borderRadius: 8,
  padding: "10px 18px",
  fontSize: 14,
  fontWeight: 600,
  cursor: desactive ? "not-allowed" : "pointer",
  opacity: desactive ? 0.6 : 1,
});
const petitBouton = (couleur: string): CSSProperties => ({ ...bouton(couleur), padding: "4px 10px", fontSize: 12 });
const archiveIconeStyle = (fond: string, couleur: string): CSSProperties => ({
  width: 36,
  height: 36,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  border: `1px solid ${couleur}33`,
  borderRadius: 8,
  background: fond,
  color: couleur,
  cursor: "pointer",
});
const choixMission = (couleur: string): CSSProperties => ({
  background: couleur,
  color: "white",
  border: "none",
  borderRadius: 14,
  padding: 24,
  textAlign: "left",
  cursor: "pointer",
  display: "grid",
  gap: 6,
});

function Champ({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 4, fontSize: 13, fontWeight: 600, color: "#334155" }}>
      {label}
      {children}
    </label>
  );
}

function Choix({ valeur, options, onChange }: { valeur: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <select style={champStyle} value={valeur} onChange={(e) => onChange(e.target.value)}>
      <option value="">—</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

function Section({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section style={carte}>
      <h2 style={{ margin: 0, fontSize: 17, color: "#1e3a5f" }}>{titre}</h2>
      {children}
    </section>
  );
}

function useMaintenant() {
  const [t, setT] = useState("");
  useEffect(() => {
    const tick = () => setT(maintenantLocal());
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);
  return t;
}

function TrajetCarte(props: {
  t: Trajet;
  i: number;
  vehiculeId: number | null;
  min: string;
  max: string;
  peutRetirer: boolean;
  onChange: (cle: keyof Trajet, valeur: string) => void;
  onGpsKilometrage: (cle: "kmDepart" | "kmArrivee", valeur: string, depart: string, arrivee: string) => void;
  onSave: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { t, i, vehiculeId, min, max, peutRetirer, onChange, onGpsKilometrage, onSave, onEdit, onRemove } = props;
  const [chargementGps, setChargementGps] = useState(false);
  const [infoGps, setInfoGps] = useState("");
  const k = kmParcourus(t);

  useEffect(() => {
    if (t.enregistre || !vehiculeId || !t.depart || !t.arrivee) {
      setInfoGps("");
      return;
    }
    const debutMs = new Date(t.depart).getTime();
    const finMs = new Date(t.arrivee).getTime();
    if (!Number.isFinite(debutMs) || !Number.isFinite(finMs) || finMs < debutMs) {
      setInfoGps("");
      return;
    }
    const dates = datesInclusives(t.depart.slice(0, 10), t.arrivee.slice(0, 10));
    if (dates.length === 0 || dates.length > 3) {
      setInfoGps("La période saisie est trop longue pour une recherche GPS automatique.");
      return;
    }

    const controller = new AbortController();
    const delai = window.setTimeout(async () => {
      const token = localStorage.getItem("token");
      const API = process.env.NEXT_PUBLIC_API_URL || "";
      if (!token || !API) return;
      setChargementGps(true);
      setInfoGps("Recherche des relevés GPS sur cette période…");
      try {
        const historiques = await Promise.all(dates.map(async (date) => {
          const query = new URLSearchParams({ vehiculeId: String(vehiculeId), date });
          const response = await fetch(`${API}/gps/historique?${query}`, {
            headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
            cache: "no-store",
            signal: controller.signal,
          });
          if (!response.ok) throw new Error("Historique GPS indisponible.");
          const data = await response.json() as { positions?: GpsHistoriquePoint[] };
          return Array.isArray(data.positions) ? data.positions : [];
        }));
        if (controller.signal.aborted) return;

        const relevés = historiques.flat().flatMap((point) => {
          const instant = point.dateGps ? new Date(point.dateGps).getTime() : Number.NaN;
          const kilometrage = Number(point.odometreKm);
          return Number.isFinite(instant) && Number.isFinite(kilometrage) && kilometrage >= 0
            ? [{ instant, kilometrage }]
            : [];
        });
        const proche = (instantCible: number) => relevés
          .map((point) => ({ ...point, ecart: Math.abs(point.instant - instantCible) }))
          .filter((point) => point.ecart <= 30 * 60_000)
          .sort((a, b) => a.ecart - b.ecart)[0];
        const kmDepartGps = proche(debutMs);
        const kmArriveeGps = proche(finMs);

        if (kmDepartGps) onGpsKilometrage("kmDepart", fmt(kmDepartGps.kilometrage), t.depart, t.arrivee);
        if (kmArriveeGps) onGpsKilometrage("kmArrivee", fmt(kmArriveeGps.kilometrage), t.depart, t.arrivee);

        const synchronises = [kmDepartGps, kmArriveeGps].filter(Boolean).length;
        setInfoGps(synchronises
          ? `Kilométrage synchronisé depuis ${synchronises} relevé(s) GPS proche(s) des heures saisies.`
          : relevés.length
            ? "Relevés GPS trouvés, mais aucun relevé compteur assez proche des heures du trajet."
            : "Aucun relevé GPS avec compteur kilométrique sur cette période.");
      } catch (error) {
        if (!controller.signal.aborted) {
          setInfoGps(error instanceof Error ? error.message : "Historique GPS indisponible.");
        }
      } finally {
        if (!controller.signal.aborted) setChargementGps(false);
      }
    }, 450);

    return () => {
      window.clearTimeout(delai);
      controller.abort();
    };
  }, [vehiculeId, t.depart, t.arrivee, t.enregistre, onGpsKilometrage]);

  if (t.enregistre) {
    return (
      <div style={{ ...sousCarte, borderColor: "#86efac", background: "#f0fdf4" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <strong>Trajet {i + 1} · enregistré ✔</strong>
          <button type="button" onClick={onEdit} style={petitBouton("#475569")}>Modifier</button>
        </div>
        <div style={{ fontSize: 14, display: "grid", gap: 2 }}>
          <span><span>Chauffeur :</span> {t.chauffeur}{t.chauffeurMatricule ? ` · Matricule ${t.chauffeurMatricule}` : ""}</span>
          <span>{fmtDT(t.depart)} → {fmtDT(t.arrivee)} · {t.lieuDepart} → {t.destination}</span>
          <span>{t.kmDepart} → {t.kmArrivee} km{k !== null ? ` (${fmt(k)} km parcourus)` : ""}</span>
          {t.motif && <span>Motif : {t.motif}</span>}
        </div>
      </div>
    );
  }

  return (
    <div style={sousCarte}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <strong>Trajet {i + 1}</strong>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, background: "#eff6ff", color: "#1e3a5f", padding: "2px 10px", borderRadius: 999 }}>
            {k === null ? "— km" : `${fmt(k)} km`}
          </span>
          {peutRetirer && (
            <button type="button" onClick={onRemove} style={petitBouton("#dc2626")}>Retirer</button>
          )}
        </span>
      </div>
      <div style={grille}>
        <PersonnelChauffeurAutocomplete
          key={`${i}-${t.chauffeurMatricule || t.chauffeur}`}
          label="Chauffeur"
          placeholder="Rechercher par nom, prénom ou matricule…"
          valeurInitiale={t.chauffeurMatricule || t.chauffeur}
          onSelect={(personne) => {
            onChange("chauffeur", personne.nomComplet);
            onChange("chauffeurMatricule", personne.matricule);
          }}
        />
        <Champ label="Départ">
          <input type="datetime-local" min={min} max={max} style={champStyle} value={t.depart} onChange={(e) => onChange("depart", e.target.value)} />
        </Champ>
        <Champ label="Lieu de départ">
          <input style={champStyle} value={t.lieuDepart} onChange={(e) => onChange("lieuDepart", e.target.value)} />
        </Champ>
        <Champ label="Destination">
          <input style={champStyle} value={t.destination} onChange={(e) => onChange("destination", e.target.value)} />
        </Champ>
        <Champ label="Arrivée">
          <input type="datetime-local" min={min} max={max} style={champStyle} value={t.arrivee} onChange={(e) => onChange("arrivee", e.target.value)} />
        </Champ>
        <Champ label="Km départ">
          <input type="number" inputMode="decimal" min={0} style={champStyle} value={t.kmDepart} onChange={(e) => onChange("kmDepart", e.target.value)} />
        </Champ>
        <Champ label="Km arrivée">
          <input type="number" inputMode="decimal" min={0} style={champStyle} value={t.kmArrivee} onChange={(e) => onChange("kmArrivee", e.target.value)} />
        </Champ>
        <Champ label="Motif / mission">
          <input style={champStyle} value={t.motif} onChange={(e) => onChange("motif", e.target.value)} />
        </Champ>
      </div>
      {(chargementGps || infoGps) && (
        <p role="status" style={{ margin: 0, color: chargementGps ? "#475569" : "#64748b", fontSize: 12 }}>
          {infoGps}
        </p>
      )}
      <div>
        <button type="button" onClick={onSave} style={bouton("#16a34a")}>Enregistrer le trajet</button>
      </div>
    </div>
  );
}

export default function FicheDeBordSurete() {
  const [fiche, setFiche] = useState<Fiche | null>(null);
  const [pret, setPret] = useState(false);
  const [archives, setArchives] = useState<Fiche[]>([]);
  const [pdfEnCoursId, setPdfEnCoursId] = useState<string | null>(null);
  const [profilAgent, setProfilAgent] = useState<ProfilAgent>({ nomComplet: "", matricule: "" });
  const [trajetsHistorique, setTrajetsHistorique] = useState<CarnetHistorique[]>([]);
  const [vehiculeSureteId, setVehiculeSureteId] = useState<number | null>(null);
  const [immatriculationSurete, setImmatriculationSurete] = useState("1205 TCA");
  const [kilometrageInitial, setKilometrageInitial] = useState("");
  const [sourceKilometrageInitial, setSourceKilometrageInitial] = useState("");
  const maintenant = useMaintenant();

  useEffect(() => {
    const ficheEnCours = lireEnCours();
    if (ficheEnCours?.debut && ficheEnCours.debut.endsWith("T07:00")) {

      ficheEnCours.debut = "";
      ecrireEnCours(ficheEnCours);
    }
    setFiche(ficheEnCours);
    setArchives(listerArchives());
    setPret(true);
    const API = process.env.NEXT_PUBLIC_API_URL || "";
    const headers = { Authorization: `Bearer ${localStorage.getItem("token")}`, Accept: "application/json" };
    if (!API) return;
    Promise.all([
      fetch(`${API}/fiches-surete/profil`, { headers }).then((res) => res.ok ? res.json() : null).catch(() => null),
      fetch(`${API}/carnet-bord`, { headers, cache: "no-store" }).then((res) => res.ok ? res.json() : []).catch(() => []),
      fetch(`${API}/gps/positions`, { headers, cache: "no-store" }).then((res) => res.ok ? res.json() : []).catch(() => []),
    ]).then(([profil, carnetsData, positionsData]) => {
      const carnets = Array.isArray(carnetsData) ? carnetsData as CarnetHistorique[] : [];
      const positions = Array.isArray(positionsData) ? positionsData as GpsPosition[] : [];
      const immatNormalisee = normaliserImmatriculation("1205 TCA");
      const positionSurete = positions.find((position) => normaliserImmatriculation(position.immatriculation) === immatNormalisee);
      const carnetSurete = carnets.find((carnet) => normaliserImmatriculation(carnet.vehicule?.immatriculation) === immatNormalisee);
      const vehiculeId = positionSurete?.vehiculeId ?? carnetSurete?.vehiculeId ?? carnetSurete?.vehicule?.id ?? null;
      const carnetsSurete = carnets.filter((carnet) =>
        vehiculeId != null
          ? Number(carnet.vehiculeId ?? carnet.vehicule?.id) === vehiculeId
          : normaliserImmatriculation(carnet.vehicule?.immatriculation) === immatNormalisee
      );
      const aujourdHui = dateLocaleDuJour();
      const trajetsDuJour = carnetsSurete
        .filter((carnet) => String(carnet.dateSortie || "").slice(0, 10) === aujourdHui)
        .sort((a, b) => String(a.dateSortie).localeCompare(String(b.dateSortie)));
      const dernierCarnetAvecRetour = [...carnetsSurete]
        .sort((a, b) => String(b.dateRetour || b.dateSortie).localeCompare(String(a.dateRetour || a.dateSortie)))
        .find((carnet) => carnet.kilometrageRetour != null);
      const carnetEnCours = [...carnetsSurete]
        .sort((a, b) => String(b.dateSortie).localeCompare(String(a.dateSortie)))
        .find((carnet) => carnet.dateRetour == null && carnet.kilometrageDepart != null);
      const kmGPS = positionSurete?.odometreKm;
      const kmReference = kmGPS != null && Number.isFinite(kmGPS)
        ? String(kmGPS)
        : dernierCarnetAvecRetour?.kilometrageRetour != null
          ? String(dernierCarnetAvecRetour.kilometrageRetour)
          : carnetEnCours?.kilometrageDepart != null
            ? String(carnetEnCours.kilometrageDepart)
            : "";
      const sourceKm = kmGPS != null && Number.isFinite(kmGPS)
        ? "GPS en temps réel"
        : dernierCarnetAvecRetour?.kilometrageRetour != null
          ? "dernier retour du carnet de bord"
          : carnetEnCours?.kilometrageDepart != null
            ? "départ du carnet en cours"
            : "aucun relevé disponible";

      setVehiculeSureteId(vehiculeId);
      setImmatriculationSurete(positionSurete?.immatriculation || carnetSurete?.vehicule?.immatriculation || "1205 TCA");
      setKilometrageInitial(kmReference);
      setSourceKilometrageInitial(sourceKm);
      setTrajetsHistorique(trajetsDuJour);

      if (profil?.nomComplet) {
        const profilCharge = { nomComplet: profil.nomComplet, matricule: profil.matricule || "" };
        setProfilAgent(profilCharge);
      }
      setFiche((actuelle) => actuelle ? {
        ...actuelle,
        agent: actuelle.agent || profil?.nomComplet || "",
        matricule: actuelle.matricule || profil?.matricule || "",
        immatriculation: positionSurete?.immatriculation || carnetSurete?.vehicule?.immatriculation || actuelle.immatriculation,
        depart: { ...actuelle.depart, km: actuelle.depart.km || kmReference },
        trajets: actuelle.trajets.map((trajet, index) => index === 0 && !trajet.kmDepart
          ? { ...trajet, kmDepart: kmReference }
          : trajet),
      } : actuelle);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (pret && fiche && !fiche.cloturee) ecrireEnCours(fiche);
  }, [fiche, pret]);

  const modifier = (fn: (f: Fiche) => Fiche) => setFiche((f) => (f ? fn(f) : f));

  const maj = <K extends keyof Fiche>(cle: K, valeur: Fiche[K]) => modifier((f) => ({ ...f, [cle]: valeur }));

  const majEtat = (phase: "depart" | "retour", cle: keyof Etat, valeur: string) =>
    modifier((f) => ({ ...f, [phase]: { ...f[phase], [cle]: valeur } }));

  const majUrgence = <K extends keyof Urgence>(cle: K, valeur: Urgence[K]) =>
    modifier((f) => ({ ...f, urgence: { ...f.urgence, [cle]: valeur } }));

  const majTrajet = (i: number, cle: keyof Trajet, valeur: string) =>
    modifier((f) => ({ ...f, trajets: f.trajets.map((t, k) => (k === i ? { ...t, [cle]: valeur } : t)) }));

  // Mémorise la dernière valeur proposée par le GPS par champ, afin de pouvoir
  // la resynchroniser quand la période du trajet change sans écraser une saisie manuelle.
  const suggestionsGps = useRef<Record<string, string>>({});

  const appliquerKilometrageGps = useCallback((
    index: number,
    cle: "kmDepart" | "kmArrivee",
    valeur: string,
    departDemande: string,
    arriveeDemandee: string
  ) => {
    const cleSuggestion = `${index}:${cle}`;
    setFiche((actuelle) => {
      if (!actuelle || actuelle.cloturee) return actuelle;
      const trajet = actuelle.trajets[index];
      if (!trajet || trajet.enregistre || trajet.depart !== departDemande || trajet.arrivee !== arriveeDemandee) {
        return actuelle;
      }
      const valeurActuelle = trajet[cle].trim();
      const derniereSuggestion = suggestionsGps.current[cleSuggestion];
      // Ne jamais écraser une valeur saisie manuellement ; seule une valeur vide
      // ou issue d'une précédente synchronisation GPS peut être remplacée.
      if (valeurActuelle && valeurActuelle !== derniereSuggestion) return actuelle;
      suggestionsGps.current[cleSuggestion] = valeur;
      return {
        ...actuelle,
        trajets: actuelle.trajets.map((item, i) => i === index ? { ...item, [cle]: valeur } : item),
      };
    });
  }, []);

  const majCarburant = (cle: keyof Fiche["carburant"], valeur: string) =>
    modifier((f) => ({ ...f, carburant: { ...f.carburant, [cle]: valeur } }));

  const majIncident = (cle: "detail" | "heureLieu" | "mesures", valeur: string) =>
    modifier((f) => ({ ...f, incident: { ...f.incident, [cle]: valeur } }));

  function demarrer(mission: Mission) {
    const nouvelle = nouvelleFiche(mission);
    nouvelle.agent = profilAgent.nomComplet;
    nouvelle.matricule = profilAgent.matricule;
    nouvelle.immatriculation = immatriculationSurete;
    if (mission === "PATROUILLE" && kilometrageInitial) {
      nouvelle.depart.km = kilometrageInitial;
      nouvelle.trajets[0].kmDepart = kilometrageInitial;
    }
    if (trajetsHistorique.length > 0) {
      nouvelle.trajets = trajetsHistorique.map((t) => ({
        ...trajetVide(t.dateSortie),
        chauffeur: t.conducteurNom || profilAgent.nomComplet,
        chauffeurMatricule: t.conducteurMatricule || profilAgent.matricule,
        depart: t.dateSortie,
        arrivee: t.dateRetour || "",
        lieuDepart: "SPAT Toamasina",
        destination: t.destination || "",
        kmDepart: t.kilometrageDepart == null ? "" : String(t.kilometrageDepart),
        kmArrivee: t.kilometrageRetour == null ? "" : String(t.kilometrageRetour),
        motif: t.motif || "",
        enregistre: Boolean(t.dateRetour && t.kilometrageRetour != null),
        enregistreLe: t.dateRetour || "",
      }));
      const premier = trajetsHistorique[0];
      const dernier = trajetsHistorique[trajetsHistorique.length - 1];
      nouvelle.depart.km = premier.kilometrageDepart == null ? kilometrageInitial : String(premier.kilometrageDepart);
      nouvelle.retour.km = dernier.kilometrageRetour == null ? "" : String(dernier.kilometrageRetour);
    }
    setFiche(nouvelle);
  }

  function declencherUrgence() {
    if (!fiche?.urgence.motif.trim()) return toast.error("Le motif de l'urgence est obligatoire.");
    modifier((f) => ({ ...f, urgence: { ...f.urgence, statut: "EN_COURS", declencheeLe: maintenantLocal() } }));
    toast.success("Urgence déclenchée et enregistrée.");
  }

  function cloturerUrgence() {
    modifier((f) => ({ ...f, urgence: { ...f.urgence, statut: "CLOTUREE", clotureeLe: maintenantLocal() } }));
    toast.success("Urgence clôturée : complétez maintenant la fiche.");
  }

  function ajouterTrajet() {
    modifier((f) => {
      const dernier = f.trajets[f.trajets.length - 1];
      const t = trajetVide(dernier?.arrivee || "");
      t.chauffeur = dernier?.chauffeur ?? "";
      t.lieuDepart = dernier?.destination ?? "";
      t.kmDepart = dernier?.kmArrivee ?? "";
      return { ...f, trajets: [...f.trajets, t] };
    });
  }

  function retirerTrajet(i: number) {
    modifier((f) => ({ ...f, trajets: f.trajets.filter((_, k) => k !== i) }));
  }

  function enregistrerTrajet(i: number) {
    if (!fiche) return;
    const erreur = validerTrajet(fiche.trajets[i], i, fiche);
    if (erreur) return toast.error(erreur);
    const now = maintenantLocal();
    modifier((f) => ({
      ...f,
      trajets: f.trajets.map((t, k) => (k === i ? { ...t, enregistre: true, enregistreLe: now } : t)),
    }));
    toast.success(`Enregistrement confirmé : le trajet ${i + 1} est enregistré.`);
  }

  function rouvrirTrajet(i: number) {
    modifier((f) => ({
      ...f,
      trajets: f.trajets.map((t, k) => (k === i ? { ...t, enregistre: false, enregistreLe: "" } : t)),
    }));
  }

  function cloturerMission() {
    if (!fiche) return;
    const erreur = validerCloture(fiche);
    if (erreur) return toast.error(erreur);
    if (!window.confirm("Clôturer la mission et enregistrer la fiche de bord finale ? Elle ne sera plus modifiable.")) return;

    const finale: Fiche = {
      ...fiche,
      trajets: fiche.trajets.filter((t) => t.enregistre),
      cloturee: true,
      clotureeLe: maintenantLocal(),
    };
    try {
      const tout = lireArchivesMap();
      tout[finale.id] = finale;
      localStorage.setItem(KEY_ARCHIVES, JSON.stringify(tout));
    } catch {
      return toast.error("Enregistrement final impossible (stockage du navigateur plein ou bloqué).");
    }
    ecrireEnCours(null);
    setArchives(listerArchives());
    setFiche(finale);
    toast.success("Enregistrement confirmé : la fiche de bord est archivée.");
    void transmettreFicheServeur(finale);
  }

  function fermerFiche() {
    setFiche(lireEnCours());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function telechargerPdf(f: Fiche) {
    setPdfEnCoursId(f.id);
    try {
      await genererPdf(f);
      toast.success("PDF généré : imprimez-le pour les signatures manuelles.");
    } catch (err) {
      console.error(err);
      toast.error("Génération du PDF impossible.");
    } finally {
      setPdfEnCoursId(null);
    }
  }

  function voirArchive(a: Fiche) {
    setFiche(a);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function supprimerArchive(a: Fiche) {
    if (!window.confirm("Supprimer cette fiche enregistrée ?")) return;
    const tout = lireArchivesMap();
    delete tout[a.id];
    localStorage.setItem(KEY_ARCHIVES, JSON.stringify(tout));
    setArchives(listerArchives());
    toast.success("Fiche supprimée des archives.");
  }

  if (!pret) return <p style={{ textAlign: "center", color: "#64748b" }}>Chargement…</p>;

  const blocArchives =
    archives.length > 0 ? (
      <Section titre="Fiches de bord enregistrées">
        <div style={{ display: "grid", gap: 8 }}>
          {archives.map((a) => (
            <div key={a.id} style={{ ...sousCarte, gridTemplateColumns: "1fr auto", alignItems: "center" }}>
              <div style={{ fontSize: 14 }}>
                <strong>{LIBELLE_MISSION[a.mission]}</strong> · {fmtDTLong(a.debut)} → {fmtDTLong(finMission(a.debut))} · {a.immatriculation}
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  {a.trajets.length} trajet(s) · {recapParChauffeur(a.trajets).length} chauffeur(s) · clôturée le {fmtDTLong(a.clotureeLe)}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => voirArchive(a)} style={archiveIconeStyle("#eff6ff", "#2563eb")} title="Voir la fiche" aria-label="Voir la fiche">
                  <Eye size={16} />
                </button>
                <button type="button" onClick={() => void telechargerPdf(a)} disabled={pdfEnCoursId === a.id} style={archiveIconeStyle("#eff6ff", "#1e3a5f")} title="Télécharger le PDF" aria-label="Télécharger le PDF">
                  <FileDown size={16} />
                </button>
                <button type="button" onClick={() => supprimerArchive(a)} style={archiveIconeStyle("#fef2f2", "#dc2626")} title="Supprimer la fiche" aria-label="Supprimer la fiche">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>
    ) : null;

  if (!fiche) {
    return (
      <div style={{ display: "grid", gap: 18 }}>
        <Section titre="Choisissez la mission">
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            <button type="button" onClick={() => demarrer("PATROUILLE")} style={choixMission("#1e3a5f")}>
              <span style={{ fontSize: 22, fontWeight: 700 }}>Patrouille</span>
            </button>
            <button type="button" onClick={() => demarrer("URGENCE")} style={choixMission("#dc2626")}>
              <span style={{ fontSize: 22, fontWeight: 700 }}>Urgence</span>
            </button>
          </div>
        </Section>
        {blocArchives}
      </div>
    );
  }

  const fin = finMission(fiche.debut);
    const u = fiche.urgence;
  const afficherFiche = fiche.mission === "PATROUILLE" || u.statut === "CLOTUREE";
  const totalKm = fiche.trajets.reduce((s, t) => s + (kmParcourus(t) ?? 0), 0);
  const recap = recapParChauffeur(fiche.trajets.filter((t) => t.enregistre));

  return (
    <div style={{ display: "grid", gap: 18 }}>

      {fiche.mission === "URGENCE" && (
        <section style={{ ...carte, border: "2px solid #dc2626" }}>
          <h2 style={{ margin: 0, fontSize: 17, color: "#b91c1c" }}>Urgence</h2>
          <Champ label="Motif de l'urgence">
            <textarea
              rows={3}
              style={champStyle}
              placeholder="Décrivez brièvement la situation"
              value={u.motif}
              disabled={u.statut === "CLOTUREE" || fiche.cloturee}
              onChange={(e) => majUrgence("motif", e.target.value)}
            />
          </Champ>
          {u.statut === "" && (
            <div>
              <button type="button" onClick={declencherUrgence} style={bouton("#dc2626")}>Déclencher l'urgence</button>
            </div>
          )}
          {u.statut === "EN_COURS" && (
            <>
              <p style={{ margin: 0, fontSize: 14, color: "#b91c1c", fontWeight: 600 }}>
                Urgence en cours depuis {fmtDTLong(u.declencheeLe)}
                {maintenant ? ` (${dureeTxt(minutesEntre(u.declencheeLe, maintenant))})` : ""}
              </p>
              <div>
                <button type="button" onClick={cloturerUrgence} style={bouton("#16a34a")}>Clôturer l'urgence</button>
              </div>
            </>
          )}
          {u.statut === "CLOTUREE" && (
            <>
              <p style={{ margin: 0, fontSize: 14, color: "#475569" }}>
                Urgence clôturée le {fmtDTLong(u.clotureeLe)}.
              </p>
              <Champ label="Lieu de l'urgence">
                <input style={champStyle} value={u.lieu} onChange={(e) => majUrgence("lieu", e.target.value)} />
              </Champ>
              <Champ label="Description des faits">
                <textarea rows={3} style={champStyle} value={u.description} onChange={(e) => majUrgence("description", e.target.value)} />
              </Champ>
              <Champ label="Mesures prises">
                <textarea rows={3} style={champStyle} value={u.mesures} onChange={(e) => majUrgence("mesures", e.target.value)} />
              </Champ>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>Services alertés</div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {SERVICES_ALERTES.map((service) => (
                    <label key={service} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 14 }}>
                      <input type="checkbox" checked={u.services.includes(service)} disabled={fiche.cloturee} onChange={() => majUrgence("services", basculer(u.services, service))} />
                      {service}
                    </label>
                  ))}
                </div>
              </div>
              <Champ label="Bilan de l'urgence">
                <textarea rows={5} style={champStyle} value={u.bilan} disabled={fiche.cloturee} onChange={(e) => majUrgence("bilan", e.target.value)} />
              </Champ>
            </>
          )}
        </section>
      )}

      {fiche.mission === "PATROUILLE" && afficherFiche && (
        <fieldset disabled={fiche.cloturee} style={{ border: "none", padding: 0, margin: 0, minWidth: 0 }}>
          <div style={{ display: "grid", gap: 18 }}>

            <Section titre="1. Identification">
              <div style={grille}>
                <Champ label="Début de la mission">
                  <input type="datetime-local" style={champStyle} value={fiche.debut} onChange={(e) => maj("debut", e.target.value)} />
                </Champ>
                <Champ label="Fin prévue">
                  <input readOnly style={{ ...champStyle, background: "#f1f5f9" }} value={fin ? fmtDTLong(fin) : ""} />
                </Champ>
                <Champ label="Agent de sûreté">
                  <input
                    readOnly
                    style={{ ...champStyle, background: "#f1f5f9", fontWeight: 700 }}
                    value={fiche.agent || profilAgent.nomComplet || "Chargement du profil…"}
                  />
                </Champ>
                <Champ label="Immatriculation">
                  <input style={champStyle} value={fiche.immatriculation} onChange={(e) => maj("immatriculation", e.target.value)} />
                </Champ>
              </div>
            </Section>

            <Section titre="2. État du véhicule">
              <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
                {(["depart", "retour"] as const).map((phase) => (
                  <div key={phase} style={sousCarte}>
                    <h3 style={{ margin: 0, fontSize: 15 }}>{phase === "depart" ? "Départ (début de mission)" : "Retour (fin de mission)"}</h3>
                    <div style={grille}>
                      <Champ label="Heure">
                        <input type="time" style={champStyle} value={fiche[phase].heure} onChange={(e) => majEtat(phase, "heure", e.target.value)} />
                      </Champ>
                      <Champ label="Kilométrage compteur">
                        <input type="number" inputMode="decimal" min={0} style={champStyle} value={fiche[phase].km} onChange={(e) => majEtat(phase, "km", e.target.value)} />
                      </Champ>
                      {phase === "depart" && !fiche[phase].km && sourceKilometrageInitial && (
                        <p role="status" style={{ gridColumn: "1 / -1", margin: 0, color: "#64748b", fontSize: 12 }}>
                          {kilometrageInitial
                            ? `Dernier kilométrage connu : ${kilometrageInitial} km (${sourceKilometrageInitial}).`
                            : `Aucun kilométrage de référence disponible (${sourceKilometrageInitial}).`}
                        </p>
                      )}
                      <Champ label="Niveau de carburant">
                        <Choix valeur={fiche[phase].carburant} options={CARBURANT} onChange={(v) => majEtat(phase, "carburant", v)} />
                      </Champ>
                      <Champ label="Carrosserie / pneus">
                        <Choix valeur={fiche[phase].carrosserie} options={CONTROLE} onChange={(v) => majEtat(phase, "carrosserie", v)} />
                      </Champ>
                      <Champ label="Feux / gyrophare / radio">
                        <Choix valeur={fiche[phase].feux} options={CONTROLE} onChange={(v) => majEtat(phase, "feux", v)} />
                      </Champ>
                      <Champ label="Propreté">
                        <Choix valeur={fiche[phase].proprete} options={PROPRETE} onChange={(v) => majEtat(phase, "proprete", v)} />
                      </Champ>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section titre="3. Trajets de la mission (chaque trajet s'enregistre séparément)">
              {fiche.trajets.map((t, i) => (
                <TrajetCarte
                  key={i}
                  t={t}
                  i={i}
                  vehiculeId={vehiculeSureteId}
                  min={fiche.debut}
                  max={fin}
                  peutRetirer={fiche.trajets.length > 1}
                  onChange={(cle, valeur) => majTrajet(i, cle, valeur)}
                  onGpsKilometrage={(cle, valeur, depart, arrivee) => appliquerKilometrageGps(i, cle, valeur, depart, arrivee)}
                  onSave={() => enregistrerTrajet(i)}
                  onEdit={() => rouvrirTrajet(i)}
                  onRemove={() => retirerTrajet(i)}
                />
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <button type="button" onClick={ajouterTrajet} style={bouton("#475569")}>+ Ajouter un trajet</button>
                <strong>Total parcouru : {totalKm > 0 ? `${fmt(totalKm)} km` : "—"}</strong>
              </div>
              {recap.length > 0 && (
                <div style={{ ...sousCarte, background: "#f8fafc" }}>
                  <strong style={{ fontSize: 14 }}>Récapitulatif par chauffeur</strong>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, display: "grid", gap: 2 }}>
                    {recap.map((r) => (
                      <li key={r.nom}>
                        <strong>{r.nom}</strong> : trajet{r.numeros.length > 1 ? "s" : ""} {r.numeros.join(", ")}
                        {r.km > 0 ? ` · ${fmt(r.km)} km` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Section>

            <Section titre="4. Carburant">
              <div style={grille}>
                <Champ label="Plein effectué">
                  <Choix valeur={fiche.carburant.plein} options={["Oui", "Non"]} onChange={(v) => majCarburant("plein", v)} />
                </Champ>
                <Champ label="Quantité">
                  <input type="number" inputMode="decimal" min={0} style={champStyle} value={fiche.carburant.quantite} onChange={(e) => majCarburant("quantite", e.target.value)} />
                </Champ>
                <Champ label="Montant">
                  <input type="number" inputMode="decimal" min={0} style={champStyle} value={fiche.carburant.montant} onChange={(e) => majCarburant("montant", e.target.value)} />
                </Champ>
                <Champ label="N° bon / facture">
                  <input style={champStyle} value={fiche.carburant.bon} onChange={(e) => majCarburant("bon", e.target.value)} />
                </Champ>
                <Champ label="Lieu">
                  <input style={champStyle} value={fiche.carburant.lieu} onChange={(e) => majCarburant("lieu", e.target.value)} />
                </Champ>
              </div>
            </Section>

            <Section titre="5. Incidents, anomalies ou observations">
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {TYPES_INCIDENT.map((type) => (
                  <label key={type} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={fiche.incident.types.includes(type)}
                      onChange={() => modifier((f) => ({ ...f, incident: { ...f.incident, types: basculer(f.incident.types, type) } }))}
                    />
                    {type}
                  </label>
                ))}
              </div>
              <Champ label="Détail">
                <textarea rows={3} style={champStyle} value={fiche.incident.detail} onChange={(e) => majIncident("detail", e.target.value)} />
              </Champ>
              <div style={grille}>
                <Champ label="Heure et lieu">
                  <input style={champStyle} value={fiche.incident.heureLieu} onChange={(e) => majIncident("heureLieu", e.target.value)} />
                </Champ>
                <Champ label="Mesures prises">
                  <input style={champStyle} value={fiche.incident.mesures} onChange={(e) => majIncident("mesures", e.target.value)} />
                </Champ>
              </div>
            </Section>

          </div>
        </fieldset>
      )}

      {afficherFiche && (
        <div
          style={{
            position: "sticky", bottom: 0, background: "white", borderTop: "1px solid #e2e8f0",
            padding: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", borderRadius: 12,
          }}
        >
          {fiche.cloturee ? (
            <button type="button" onClick={fermerFiche} style={bouton("#64748b")}>Fermer la fiche</button>
          ) : (
            <>
              <button type="button" onClick={cloturerMission} style={bouton("#16a34a")}>
                Clôturer la mission
              </button>
            </>
          )}
        </div>
      )}

      {blocArchives}
    </div>
  );
}
