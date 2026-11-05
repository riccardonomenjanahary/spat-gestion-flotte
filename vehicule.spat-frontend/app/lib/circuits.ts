export function releveAssistante(mission: { vehicule?: { categorie?: string | null } | null }): boolean {
  const categorie = mission.vehicule?.categorie?.trim().toLowerCase();
  return categorie === "moto électrique" || categorie === "voiture de service mutualisée";
}
