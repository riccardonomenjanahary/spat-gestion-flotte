interface ControleAvecObservations {
  ficheControle?: string | null;
  observationsMecanicien?: string | null;
}

export function observationsDepuisFiche(maintenance?: ControleAvecObservations | null): string {
  if (maintenance?.ficheControle) {
    try {
      const fiche: unknown = JSON.parse(maintenance.ficheControle);
      if (fiche && typeof fiche === "object" && !Array.isArray(fiche)) {
        const autres = (fiche as { autres?: unknown }).autres;

        return typeof autres === "string" ? autres.trim() : "";
      }
    } catch {

    }
  }
  return maintenance?.observationsMecanicien?.trim() || "";
}
