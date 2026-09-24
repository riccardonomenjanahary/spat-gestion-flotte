/**
 * Générateur commun des rapports imprimables / PDF de SPAT.
 * Ce fichier n'appelle aucune API : chaque page lui fournit uniquement les
 * données que l'acteur est déjà autorisé à consulter.
 * Logo : /public/logo.png, identique à celui de EnTete.tsx.
 */

export type ChampRapport = { libelle: string; valeur: string | number | null | undefined };
export type SectionTableauRapport = {
  titre: string;
  colonnes: string[];
  lignes: Array<Array<string | number | null | undefined>>;
};
export type RapportSpat = {
  titre: string;
  sousTitre?: string;
  reference?: string;
  nomFichier: string;
  orientation?: "portrait" | "landscape";
  champsEntete?: ChampRapport[];
  indicateurs?: ChampRapport[];
  sections?: SectionTableauRapport[];
  note?: string;
  signatures?: Array<{ fonction: string; nom?: string }>;
};

const valeur = (donnee: string | number | null | undefined): string =>
  donnee === null || donnee === undefined || String(donnee).trim() === "" ? "—" : String(donnee);

const echapper = (texte: string): string => texte
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const safe = (texte: string | number | null | undefined): string => echapper(valeur(texte));
const dateGeneration = (): string => new Date().toLocaleString("fr-FR", {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
});

function documentImpression(rapport: RapportSpat, date: string): string {
  const logo = new URL("/logo.png", window.location.origin).href;
  const champs = [
    ...(rapport.reference ? [{ libelle: "Référence", valeur: rapport.reference }] : []),
    ...(rapport.champsEntete ?? []),
    { libelle: "Édité le", valeur: date },
  ];
  const grille = (lignes: ChampRapport[]) => lignes.map((c) =>
    `<div class="champ"><span class="champ-titre">${safe(c.libelle)}</span><strong>${safe(c.valeur)}</strong></div>`
  ).join("");
  const sections = (rapport.sections ?? []).map((s) => {
    if (!s.colonnes.length) return "";
    const entetes = s.colonnes.map((c) => `<th scope="col">${safe(c)}</th>`).join("");
    const contenu = s.lignes.length
      ? s.lignes.map((l) => `<tr>${s.colonnes.map((_, index) => `<td>${safe(l[index])}</td>`).join("")}</tr>`).join("")
      : `<tr><td colspan="${s.colonnes.length}" class="vide">Aucune donnée pour cette rubrique.</td></tr>`;
    return `<section><h2>${safe(s.titre)}</h2><table><thead><tr>${entetes}</tr></thead><tbody>${contenu}</tbody></table></section>`;
  }).join("");
  const signaturesDefaut: Array<{ fonction: string; nom?: string }> = [
    { fonction: "1. Le Demandeur / Agent" },
    { fonction: "2. Le Chauffeur" },
    { fonction: "3. Chef Service Logistique" },
    { fonction: "4. Direction DFP / DG" }
  ];
  const listeSignatures = (rapport.signatures && rapport.signatures.length > 0) ? rapport.signatures : signaturesDefaut;
  const signatures = `<div class="signatures">${listeSignatures.map((s) =>
    `<div class="sig-card"><strong>${safe(s.fonction)}</strong><div class="signature-nom">${s.nom ? safe(s.nom) : ""}</div><div class="sig-space"><small>Date : ____/____/202__</small><br/><small>Signature &amp; Cachet</small></div></div>`
  ).join("")}</div>`;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"/>
  <title>${safe(rapport.titre)} - SPAT</title>
  <style>
    @page { size: ${rapport.orientation === "landscape" ? "A4 landscape" : "A4 portrait"}; margin: 14mm; }
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin:0; padding:0; background:#fff; color:#111827; font: 10pt Arial, Helvetica, sans-serif; }
    .rapport { width:100%; }
    header { display:flex; align-items:center; gap:14px; padding-bottom:11px; border-bottom:2px solid #111827; margin-bottom:14px; }
    .logo { width:58px; height:58px; object-fit:contain; }
    .institution { font-size:9pt; font-weight:700; letter-spacing:.04em; margin:0 0 3px; }
    h1 { font-size:14pt; text-align:left; margin:0 0 4px; text-transform:uppercase; line-height:1.3; }
    .sous-titre { font-size:9pt; color:#4b5563; }
    .metadonnees { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:7px 17px; margin:12px 0 14px; }
    .champ { font-size:9pt; overflow-wrap:anywhere; } .champ-titre { display:inline-block; margin-right:7px; color:#374151; }
    .champ-titre::after { content:":"; }
    .indicateurs { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:7px; margin-bottom:15px; }
    .indicateurs .champ { padding:8px 10px; border:1px solid #d1d5db; border-radius:4px; }
    .indicateurs .champ-titre { display:block; font-size:8pt; margin-bottom:5px; }
    .indicateurs strong { display:block; font-size:12pt; }
    h2 { font-size:10pt; margin:15px 0 7px; text-transform:uppercase; }
    section { break-inside:auto; page-break-inside:auto; }
    table { border-collapse:collapse; table-layout:fixed; width:100%; font-size:8pt; }
    thead { display:table-header-group; } tr { break-inside:avoid; page-break-inside:avoid; }
    th,td { border:1px solid #6b7280; padding:5px 6px; vertical-align:top; overflow-wrap:anywhere; white-space:pre-line; }
    th { background:#111827 !important; color:#fff !important; text-align:left; print-color-adjust:exact; -webkit-print-color-adjust:exact; }
    .vide { color:#6b7280; text-align:center; }
    .note { margin-top:12px; font-size:9pt; white-space:pre-line; }
    .signatures { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; margin-top:25px; }
    .signatures>div { min-height:65px; break-inside:avoid; page-break-inside:avoid; }
    .signature-nom { margin-top:18px; } small { color:#6b7280; font-size:8pt; }
    footer { border-top:1px solid #d1d5db; color:#6b7280; font-size:7pt; padding-top:6px; margin-top:18px; }
  </style></head><body><div class="rapport">
    <header><img class="logo" src="${echapper(logo)}" alt="Logo SPAT"/><div>
      <p class="institution">SPAT — GESTION DU PARC AUTOMOBILE</p>
      <h1>${safe(rapport.titre)}</h1>
      ${rapport.sousTitre ? `<div class="sous-titre">${safe(rapport.sousTitre)}</div>` : ""}
    </div></header>
    <div class="metadonnees">${grille(champs)}</div>
    ${(rapport.indicateurs ?? []).length ? `<div class="indicateurs">${grille(rapport.indicateurs!)}</div>` : ""}
    ${sections}
    ${rapport.note ? `<p class="note">${safe(rapport.note)}</p>` : ""}
    ${signatures}
    <footer>SPAT — Document généré automatiquement à partir des données affichées dans l'application.</footer>
  </div></body></html>`;
}

/** Imprime uniquement le rapport dans un iframe isolé, jamais l'interface Next.js. */
export async function imprimerRapportSpat(rapport: RapportSpat): Promise<void> {
  if (typeof window === "undefined") return;
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", `Impression : ${rapport.titre}`);
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none";
  const fini = new Promise<void>((resolve, reject) => {
    let termine = false;
    const nettoyer = () => { if (!termine) { termine = true; iframe.remove(); resolve(); } };
    iframe.onload = () => {
      const fenetre = iframe.contentWindow;
      if (!fenetre) { iframe.remove(); reject(new Error("Le document d'impression n'a pas pu être ouvert.")); return; }
      const lancer = async () => {
        try {
          const images = Array.from(iframe.contentDocument?.images ?? []);
          await Promise.all(images.map((image) => image.complete ? Promise.resolve() : new Promise<void>((done) => {
            image.addEventListener("load", () => done(), { once: true });
            image.addEventListener("error", () => done(), { once: true });
          })));
          fenetre.addEventListener("afterprint", nettoyer, { once: true });
          fenetre.focus();
          fenetre.print();
          // Certains navigateurs ne déclenchent pas afterprint pour les iframes.
          window.setTimeout(nettoyer, 60000);
        } catch (erreur) { iframe.remove(); reject(erreur); }
      };
      void lancer();
    };
    iframe.onerror = () => { iframe.remove(); reject(new Error("Impossible de créer le rapport imprimable.")); };
  });
  iframe.srcdoc = documentImpression(rapport, dateGeneration());
  document.body.appendChild(iframe);
  return fini;
}

async function chargerLogo(): Promise<string | null> {
  try {
    const image = new Image();
    image.src = "/logo.png";
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(image.naturalWidth, 1);
    canvas.height = Math.max(image.naturalHeight, 1);
    const contexte = canvas.getContext("2d");
    if (!contexte) return null;
    contexte.drawImage(image, 0, 0);
    return canvas.toDataURL("image/png");
  } catch { return null; }
}

/** Téléchargement PDF véritable et direct, sans déclencher la boîte d'impression. */
export async function telechargerRapportPdfSpat(rapport: RapportSpat): Promise<void> {
  if (typeof window === "undefined") return;
  // Import à la demande : pas de dépendance PDF chargée lors de la navigation.
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"), import("jspdf-autotable"),
  ]);
  const pdf = new jsPDF({
    orientation: rapport.orientation ?? "portrait", unit: "mm", format: "a4", compress: true,
  });
  const largeur = pdf.internal.pageSize.getWidth();
  const hauteur = pdf.internal.pageSize.getHeight();
  const marge = 14;
  const logo = await chargerLogo();
  const date = dateGeneration();
  const titre = valeur(rapport.titre);
  let y = 0;

  const teteSuite = () => {
    if (logo) pdf.addImage(logo, "PNG", marge, 9, 12, 12);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(17, 24, 39);
    pdf.text("SPAT — GESTION DU PARC AUTOMOBILE", logo ? marge + 15 : marge, 15);
    pdf.setDrawColor(17, 24, 39); pdf.line(marge, 23, largeur - marge, 23);
  };
  teteSuite();
  y = 29;
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(13);
  const lignesTitre = pdf.splitTextToSize(titre.toUpperCase(), largeur - 2 * marge) as string[];
  pdf.text(lignesTitre, marge, y); y += lignesTitre.length * 6 + 1;
  if (rapport.sousTitre) {
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(80, 80, 80);
    const st = pdf.splitTextToSize(rapport.sousTitre, largeur - 2 * marge) as string[];
    pdf.text(st, marge, y); y += st.length * 4.5 + 2;
  }
  pdf.setTextColor(17, 24, 39);
  pdf.setDrawColor(190, 190, 190); pdf.line(marge, y, largeur - marge, y); y += 6;

  const ajouterPage = () => { pdf.addPage(); teteSuite(); y = 30; };
  const texte = (brut: string, corps = 9, gras = false, retrait = 0) => {
    const largeurTexte = largeur - marge * 2 - retrait;
    pdf.setFont("helvetica", gras ? "bold" : "normal"); pdf.setFontSize(corps);
    const lignes = pdf.splitTextToSize(brut, largeurTexte) as string[];
    const tailleBloc = lignes.length * (corps * 0.42 + 1) + 2;
    if (y + tailleBloc > hauteur - 22) ajouterPage();
    pdf.text(lignes, marge + retrait, y); y += tailleBloc;
  };
  if (rapport.reference) texte(`Référence : ${rapport.reference}`, 9, true);
  for (const champ of rapport.champsEntete ?? []) texte(`${champ.libelle} : ${valeur(champ.valeur)}`, 9);
  texte(`Édité le : ${date}`, 9);

  if ((rapport.indicateurs ?? []).length) {
    y += 2;
    autoTable(pdf, {
      head: [["INDICATEUR", "VALEUR"]],
      body: rapport.indicateurs!.map((k) => [k.libelle, valeur(k.valeur)]),
      startY: y, margin: { left: marge, right: marge, top: 30, bottom: 22 },
      theme: "grid", styles: { font: "helvetica", fontSize: 9, cellPadding: 2.8 },
      headStyles: { fillColor: [17, 24, 39], textColor: 255 },
      didDrawPage: (donnees) => { if (donnees.pageNumber > 1) teteSuite(); },
    });
    y = (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
    y += 5;
  }

  for (const section of rapport.sections ?? []) {
    if (!section.colonnes.length) continue;
    if (y + 16 > hauteur - 22) ajouterPage();
    texte(section.titre.toUpperCase(), 10, true); y += 1;
    autoTable(pdf, {
      head: [section.colonnes],
      body: section.lignes.length
        ? section.lignes.map((ligne) => section.colonnes.map((_, i) => valeur(ligne[i])))
        : [["Aucune donnée pour cette rubrique.", ...section.colonnes.slice(1).map(() => "")]],
      startY: y, margin: { left: marge, right: marge, top: 30, bottom: 22 },
      theme: "grid", styles: { font: "helvetica", fontSize: 8, cellPadding: 2.4, overflow: "linebreak" },
      headStyles: { fillColor: [17, 24, 39], textColor: 255, fontStyle: "bold" },
      didDrawPage: (donnees) => { if (donnees.pageNumber > 1) teteSuite(); },
    });
    y = (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
    y += 7;
  }
  const signaturesAExporter = (rapport.signatures && rapport.signatures.length > 0)
    ? rapport.signatures
    : [
        { fonction: "1. Le Demandeur / Agent" },
        { fonction: "2. Le Chauffeur" },
        { fonction: "3. Chef Service Logistique" },
        { fonction: "4. Visa Direction (DFP / DG)" }
      ];

  if (y + 35 > hauteur - 22) ajouterPage();
  const colonnes = signaturesAExporter.length;
  signaturesAExporter.forEach((signature, index) => {
    const colWidth = (largeur - marge * 2) / colonnes;
    const x = marge + index * colWidth;
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(8);
    pdf.text(signature.fonction, x, y, { maxWidth: colWidth - 4 });
    if (signature.nom) {
      pdf.setFont("helvetica", "normal"); pdf.text(signature.nom, x, y + 10, { maxWidth: colWidth - 4 });
    }
    pdf.setDrawColor(140, 140, 140);
    pdf.line(x, y + 18, x + Math.min(55, colWidth - 6), y + 18);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.5);
    pdf.text("Date : ____/____/202__", x, y + 23);
    pdf.text("Signature & Cachet", x, y + 28);
  });
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page);
    pdf.setDrawColor(209, 213, 219); pdf.line(marge, hauteur - 15, largeur - marge, hauteur - 15);
    pdf.setTextColor(107, 114, 128); pdf.setFontSize(7); pdf.setFont("helvetica", "normal");
    pdf.text("SPAT — Rapport généré automatiquement", marge, hauteur - 10);
    pdf.text(`${page} / ${pages}`, largeur - marge, hauteur - 10, { align: "right" });
  }
  const nom = rapport.nomFichier.replace(/[^a-z0-9_-]/gi, "_").replace(/_+/g, "_").slice(0, 90) || "rapport_spat";
  pdf.save(`${nom}.pdf`);
}
