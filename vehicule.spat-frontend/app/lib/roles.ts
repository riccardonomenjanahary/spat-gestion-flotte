export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  CO_ADMIN: "CO_ADMIN",
  DIRECTEUR_DFP: "DIRECTEUR_DFP",
  CHEF_SERVICE_LOGISTIQUE: "CHEF_SERVICE_LOGISTIQUE",
  CHEF_DIRECTION: "CHEF_DIRECTION",
  ASSISTANT_DIRECTION: "ASSISTANT_DIRECTION",
  AGENT_PAR_INTERIM_ASSISTANT: "AGENT_PAR_INTERIM_ASSISTANT",
  AGENT_PAR_INTERIM_CHEF: "AGENT_PAR_INTERIM_CHEF",
  CHEF_DGAL: "CHEF_DGAL",
  MECANICIEN_DID: "MECANICIEN_DID",
  CHEF_ATELIER: "CHEF_ATELIER",
  DIRECTION_GENERALE: "DIRECTION_GENERALE",
  CONTROLE_GESTION: "CONTROLE_GESTION",
  AGENT_FLOTTE: "AGENT_FLOTTE",
  AGENT_SURETE: "AGENT_SURETE",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export function accueilPourRole(role: string | null | undefined): string {
  const routes: Record<Role, string> = {
    SUPER_ADMIN: "/super-admin", ADMIN: "/admin", CO_ADMIN: "/admin", DIRECTEUR_DFP: "/admin",
    CHEF_SERVICE_LOGISTIQUE: "/chef-service-logistique", CHEF_DIRECTION: "/chef-direction",
    ASSISTANT_DIRECTION: "/assistant-direction", CHEF_DGAL: "/chef-dgal", MECANICIEN_DID: "/mecanicien-did",
    CHEF_ATELIER: "/mecanicien-did", DIRECTION_GENERALE: "/admin", CONTROLE_GESTION: "/admin",
    AGENT_PAR_INTERIM_ASSISTANT: "/assistant-direction",
    AGENT_PAR_INTERIM_CHEF: "/chef-direction",
    AGENT_FLOTTE: "/agent-flotte",
    AGENT_SURETE: "/agent-surete",
  };
  return role && Object.prototype.hasOwnProperty.call(routes, role) ? routes[role as Role] : "/non-autorise";
}

const ROLES_LECTURE_SEULE: Role[] = [ROLES.DIRECTEUR_DFP, ROLES.CO_ADMIN, ROLES.DIRECTION_GENERALE, ROLES.CONTROLE_GESTION];

export function estLectureSeule(role: string | null): boolean {
  return ROLES_LECTURE_SEULE.includes(role as Role);
}
