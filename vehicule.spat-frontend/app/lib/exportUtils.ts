// src/app/lib/exportUtils.ts

export type ExportAlign = "left" | "center" | "right";

export interface ExportColumn<T> {
  header: string;
  key?: keyof T;
  value?: (row: T) => unknown;
  align?: ExportAlign;
}

export interface ExportConfig<T> {
  titre: string;
  nomFichier: string;
  colonnes: ExportColumn<T>[];
  donnees: T[];
  sousTitre?: string;
  orientation?: "portrait" | "landscape";
  logoUrl?: string;
}

function valeurColonne<T>(ligne: T, colonne: ExportColumn<T>): unknown {
  if (colonne.value) return colonne.value(ligne);
  if (colonne.key !== undefined) return ligne[colonne.key];
  return "";
}

function texteExport(valeur: unknown): string {
  if (valeur === null || valeur === undefined) return "";
  if (typeof valeur === "boolean") return valeur ? "Oui" : "Non";
  if (valeur instanceof Date) return valeur.toLocaleString("fr-FR");
  if (typeof valeur === "object") {
    try { return JSON.stringify(valeur); } catch { return String(valeur); }
  }
  return String(valeur);
}

function nettoyerNomFichier(nom: string): string {
  return nom.trim().replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-").replace(/\s+/g, "_");
}

function datePourNomFichier(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function dateHeureFr(): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date());
}

function echapperCsv(valeur: string): string {
  const normalisee = valeur.replace(/\r?\n/g, " ");
  if (normalisee.includes(";") || normalisee.includes('"')) {
    return `"${normalisee.replace(/"/g, '""')}"`;
  }
  return normalisee;
}

function echapperHtml(valeur: unknown): string {
  return texteExport(valeur)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function imageVersDataUrl(url: string): Promise<string | null> {
  try {
    const reponse = await fetch(url);
    if (!reponse.ok) return null;
    const blob = await reponse.blob();
    return await new Promise<string>((resolve, reject) => {
      const lecteur = new FileReader();
      lecteur.onloadend = () => typeof lecteur.result === "string" ? resolve(lecteur.result) : reject(new Error("Logo illisible"));
      lecteur.onerror = () => reject(lecteur.error);
      lecteur.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function exportCsv<T>({ titre, nomFichier, colonnes, donnees }: ExportConfig<T>): void {
  if (typeof window === "undefined") return;
  const lignes: string[] = [];
  lignes.push(colonnes.map(c => echapperCsv(c.header)).join(";"));
  donnees.forEach(ligne => {
    lignes.push(colonnes.map(c => echapperCsv(texteExport(valeurColonne(ligne, c)))).join(";"));
  });
  const contenu = "\uFEFF" + lignes.join("\r\n");
  const blob = new Blob([contenu], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = `${nettoyerNomFichier(nomFichier || titre)}_${datePourNomFichier()}.csv`;
  document.body.appendChild(lien);
  lien.click();
  document.body.removeChild(lien);
  URL.revokeObjectURL(url);
}

export async function exportPdf<T>({
  titre,
  nomFichier,
  colonnes,
  donnees,
  sousTitre,
  orientation = "landscape",
  logoUrl = "/logo.png",
}: ExportConfig<T>): Promise<void> {
  if (typeof window === "undefined") return;

  const jsPdfModule = await import("jspdf");
  const autoTableModule = await import("jspdf-autotable");
  const JsPDF = jsPdfModule.jsPDF;
  const doc = new JsPDF({ orientation, unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  let y = 12;

  const logo = await imageVersDataUrl(logoUrl);
  if (logo) {
    try { doc.addImage(logo, "PNG", margin, y, 30, 14); } catch {}
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Portail Numérique de Gestion de la Flotte", pageWidth / 2, y + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Société du Port à Gestion Autonome de Toamasina (SPAT)", pageWidth / 2, y + 10, { align: "center" });

  y += 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(titre, margin, y);
  y += 6;

  if (sousTitre) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(sousTitre, margin, y);
    y += 5;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Généré le ${dateHeureFr()}`, margin, y);
  y += 5;

  const head = [colonnes.map(c => c.header)];
  const body = donnees.map(ligne => colonnes.map(c => texteExport(valeurColonne(ligne, c))));
  const columnStyles: Record<number, any> = {};
  colonnes.forEach((c, i) => { if (c.align) columnStyles[i] = { halign: c.align }; });

  const tableOptions = {
    startY: y,
    head,
    body,
    theme: "grid" as const,
    styles: { font: "helvetica", fontSize: 7.5, cellPadding: 2, overflow: "linebreak" as const, valign: "middle" as const },
    headStyles: { fontStyle: "bold" },
    columnStyles,
    margin: { left: margin, right: margin, bottom: 14 },
    didDrawPage: () => {
      const page = doc.getNumberOfPages();
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(`SPAT - ${titre}`, margin, doc.internal.pageSize.getHeight() - 6);
      doc.text(`Page ${page}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 6, { align: "right" });
    },
  };

  const autoTableFn = (doc as any).autoTable || (autoTableModule as any).default || (autoTableModule as any).autoTable || autoTableModule;
  if (typeof (doc as any).autoTable === "function") {
    (doc as any).autoTable(tableOptions);
  } else if (typeof autoTableFn === "function") {
    autoTableFn(doc, tableOptions);
  } else {
    throw new Error("jspdf-autotable n'est pas disponible.");
  }

  // --- Cadre officiel de signatures pour impression papier SPAT ---
  const finalY = (doc as any).lastAutoTable?.finalY || y + 30;
  const pageHeight = doc.internal.pageSize.getHeight();
  const boxHeight = 26;
  const spaceNeeded = boxHeight + 14;

  let currentY = finalY + 6;
  if (currentY + spaceNeeded > pageHeight - 12) {
    doc.addPage();
    currentY = 16;
  }

  const numBoxes = 4;
  const gap = 3;
  const boxWidth = (pageWidth - 2 * margin - (numBoxes - 1) * gap) / numBoxes;
  const titles = [
    "1. Le Demandeur / Agent",
    "2. Le Chauffeur",
    "3. Chef Service Logistique",
    "4. Visa Direction (DFP / DG)"
  ];

  titles.forEach((titreBox, i) => {
    const x = margin + i * (boxWidth + gap);
    // Fond et cadre
    doc.setDrawColor(148, 163, 184);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, currentY, boxWidth, boxHeight, 1.5, 1.5, "FD");

    // En-tête de la boîte
    doc.setFillColor(226, 232, 240);
    doc.rect(x, currentY, boxWidth, 5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);
    doc.text(titreBox, x + 1.5, currentY + 3.8);

    // Lignes pour signature manuelle
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Date : ____/____/202__", x + 1.5, currentY + 9);
    doc.text("Signature & Cachet :", x + 1.5, currentY + 14);
  });

  doc.save(`${nettoyerNomFichier(nomFichier || titre)}_${datePourNomFichier()}.pdf`);
}

export function imprimerTableau<T>({
  titre,
  colonnes,
  donnees,
  sousTitre,
  logoUrl = "/logo.png",
}: ExportConfig<T>): void {
  if (typeof window === "undefined") return;

  const fenetre = window.open("", "_blank", "width=1200,height=800");
  if (!fenetre) throw new Error("Le navigateur a bloqué la fenêtre d'impression.");

  const entetes = colonnes.map(c => `<th>${echapperHtml(c.header)}</th>`).join("");
  const lignes = donnees.map(ligne => {
    const cellules = colonnes.map(c => `<td style="text-align:${c.align || "left"}">${echapperHtml(valeurColonne(ligne, c))}</td>`).join("");
    return `<tr>${cellules}</tr>`;
  }).join("");

  const sousTitreHtml = sousTitre ? `<div class="subtitle">${echapperHtml(sousTitre)}</div>` : "";

  fenetre.document.write(`<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/><title>${echapperHtml(titre)}</title>
<style>
@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#111827;background:#fff}.header{display:flex;align-items:center;gap:18px;border-bottom:2px solid #1e3a5f;padding-bottom:8px;margin-bottom:12px}.logo{width:90px;max-height:50px;object-fit:contain}.organization{flex:1;text-align:center}.organization-title{font-size:16px;font-weight:700;margin-bottom:2px}.organization-subtitle{font-size:11px;color:#475569}h1{margin:0 0 4px;font-size:17px;color:#172033}.subtitle{color:#475569;font-size:11px;margin-bottom:4px}.generated{color:#64748b;font-size:10px;margin-bottom:10px}table{width:100%;border-collapse:collapse;margin-bottom:14px}th,td{border:1px solid #cbd5e1;padding:5px 6px;vertical-align:top;font-size:8.5px;word-break:break-word}th{background:#f1f5f9;font-weight:700;text-align:left;color:#0f172a}tr{break-inside:avoid}
.signatures-section{margin-top:16px;break-inside:avoid;page-break-inside:avoid}
.sig-title{font-size:11px;font-weight:700;color:#1e293b;text-transform:uppercase;margin-bottom:8px;letter-spacing:0.5px}
.sig-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.sig-box{border:1.5px solid #94a3b8;border-radius:6px;background:#f8fafc;overflow:hidden;min-height:95px;display:flex;flex-direction:column}
.sig-header{background:#e2e8f0;padding:5px 8px;font-size:10px;font-weight:700;color:#1e293b;border-bottom:1px solid #cbd5e1}
.sig-body{padding:8px;font-size:9px;color:#475569;flex:1;display:flex;flex-direction:column;justifyContent:space-between}
.sig-field{margin-bottom:6px}
.sig-stamp{font-size:8.5px;color:#64748b;margin-top:auto;padding-top:10px}
.footer{margin-top:14px;padding-top:6px;border-top:1px solid #e2e8f0;color:#64748b;font-size:8.5px;display:flex;justify-content:space-between}
</style></head><body>
<div class="header"><img src="${echapperHtml(logoUrl)}" alt="SPAT" class="logo"/><div class="organization"><div class="organization-title">Portail Numérique de Gestion de la Flotte</div><div class="organization-subtitle">Société du Port à Gestion Autonome de Toamasina (SPAT)</div></div></div>
<h1>${echapperHtml(titre)}</h1>${sousTitreHtml}<div class="generated">Document officiel imprimé le ${echapperHtml(dateHeureFr())}</div>
<table><thead><tr>${entetes}</tr></thead><tbody>${lignes}</tbody></table>

<div class="signatures-section">
  <div class="sig-title">Visas et Signatures officielles pour validation sur papier :</div>
  <div class="sig-grid">
    <div class="sig-box">
      <div class="sig-header">1. Le Demandeur / Agent</div>
      <div class="sig-body">
        <div class="sig-field">Date : .........................</div>
        <div class="sig-field">Nom : ...........................</div>
        <div class="sig-stamp">Signature &amp; Cachet :</div>
      </div>
    </div>
    <div class="sig-box">
      <div class="sig-header">2. Le Chauffeur</div>
      <div class="sig-body">
        <div class="sig-field">Date : .........................</div>
        <div class="sig-field">Nom : ...........................</div>
        <div class="sig-stamp">Signature :</div>
      </div>
    </div>
    <div class="sig-box">
      <div class="sig-header">3. Chef Service Logistique</div>
      <div class="sig-body">
        <div class="sig-field">Date : .........................</div>
        <div class="sig-field">Avis : [ ] Favorable &nbsp; [ ] Référé</div>
        <div class="sig-stamp">Signature &amp; Cachet :</div>
      </div>
    </div>
    <div class="sig-box">
      <div class="sig-header">4. Direction DFP / DG</div>
      <div class="sig-body">
        <div class="sig-field">Date : .........................</div>
        <div class="sig-field">Visa &amp; Décision :</div>
        <div class="sig-stamp">Signature &amp; Cachet :</div>
      </div>
    </div>
  </div>
</div>

<div class="footer">
  <span>SPAT - Société du Port à Gestion Autonome de Toamasina</span>
  <span>Portail Numérique de Gestion de la Flotte</span>
</div>
<script>window.addEventListener('load',function(){setTimeout(function(){window.print()},250)})</script>
</body></html>`);
  fenetre.document.close();
}

export function formatDateExport(valeur?: string | Date | null): string {
  if (!valeur) return "—";
  const date = valeur instanceof Date ? valeur : new Date(valeur);
  if (Number.isNaN(date.getTime())) return String(valeur);
  return new Intl.DateTimeFormat("fr-FR").format(date);
}

export function formatDateHeureExport(valeur?: string | Date | null): string {
  if (!valeur) return "—";
  const date = valeur instanceof Date ? valeur : new Date(valeur);
  if (Number.isNaN(date.getTime())) return String(valeur);
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

export function formatMontantExport(valeur?: number | null, devise = "Ar"): string {
  if (valeur === null || valeur === undefined || !Number.isFinite(Number(valeur))) return "—";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(Number(valeur))} ${devise}`;
}

export function formatNombreExport(valeur?: number | null, suffixe = ""): string {
  if (valeur === null || valeur === undefined || !Number.isFinite(Number(valeur))) return "—";
  const nombre = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(Number(valeur));
  return suffixe ? `${nombre} ${suffixe}` : nombre;
}
