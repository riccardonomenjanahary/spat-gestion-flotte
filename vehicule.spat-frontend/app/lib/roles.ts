export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  DIRECTEUR_DFP: "DIRECTEUR_DFP",
  CHEF_SERVICE_LOGISTIQUE: "CHEF_SERVICE_LOGISTIQUE",
  CHEF_DIRECTION: "CHEF_DIRECTION",
  CHEF_DGAL: "CHEF_DGAL",
  MECANICIEN_DID: "MECANICIEN_DID",
  AGENT_FLOTTE: "AGENT_FLOTTE",
  CHAUFFEUR: "CHAUFFEUR",
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];
// Rôles qui n'ont accès qu'en lecture sur l'espace admin
const ROLES_LECTURE_SEULE: Role[] = [ROLES.DIRECTEUR_DFP];

export function estLectureSeule(role: string | null): boolean {
  return ROLES_LECTURE_SEULE.includes(role as Role);
}