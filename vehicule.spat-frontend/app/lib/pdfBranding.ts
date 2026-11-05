import type { jsPDF as JsPDF } from "jspdf";

async function logoDataUrl(): Promise<string | null> {
  try {
    let response = await fetch("/logo.png");
    if (!response.ok) response = await fetch("/Logo.png");
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function ajouterEnteteSpatPdf(doc: JsPDF, titre: string, paysage = false) {
  const largeur = doc.internal.pageSize.getWidth();
  const hauteur = doc.internal.pageSize.getHeight();
  const logo = await logoDataUrl();
  doc.setDrawColor(80, 80, 80);
  doc.rect(8, 8, largeur - 16, hauteur - 16);
  if (logo) {
    try { doc.addImage(logo, "PNG", 14, 12, paysage ? 18 : 22, paysage ? 18 : 22); } catch {                       }
  }
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(paysage ? 10 : 11);
  doc.text("SOCIETE DU PORT A GESTION AUTONOME", largeur / 2, 16, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text("DE TOAMASINA", largeur / 2, 22, { align: "center" });
  doc.text("B.P 492", largeur / 2, 28, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.text(titre, largeur / 2, 38, { align: "center" });
  return 48;
}
