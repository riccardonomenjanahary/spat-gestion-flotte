interface MissionRetour {
  zoneMission?: string | null;
  modeCreation?: string | null;
  statut: string;
  dateDebut: string;
  dateFin?: string | null;
  dureeEstimeeMinutes?: number | null;
}

export function missionAttendRetour(mission: MissionRetour): boolean {
  if (mission.zoneMission !== "VILLE_TOAMASINA") return false;
  const statut = mission.statut.toUpperCase();
  return ["PLANIFIEE", "EN_COURS", "VALIDEE"].includes(statut)
    || (mission.modeCreation === "ASSISTANT_DIRECTION" && statut === "EN_ATTENTE");
}

export function missionRetourEnRetard(mission: MissionRetour, maintenant: number): boolean {
  if (!missionAttendRetour(mission)) return false;
  const debut = new Date(mission.dateDebut).getTime();
  const duree = mission.dureeEstimeeMinutes;
  const echeance = duree != null && Number.isFinite(duree) && duree > 0
    ? debut + duree * 60_000
    : new Date(mission.dateFin || "").getTime();
  return Number.isFinite(debut) && Number.isFinite(echeance)
    && echeance > debut && maintenant >= echeance;
}
