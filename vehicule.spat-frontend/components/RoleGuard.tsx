"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { estRoleMasque, type Role } from "@/app/lib/roles";

export default function RoleGuard({
  role,
  roles,
  children,
}: {
  role?: Role;
  roles?: Role[];
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [autorise, setAutorise] = useState(false);
  const [verification, setVerification] = useState(true);

  const rolesAutorises: Role[] = roles ?? (role ? [role] : []);

  const rolesKey = rolesAutorises.join(",");

  useEffect(() => {
    const initialisation = window.setTimeout(() => {
      const token = localStorage.getItem("token");
      const roleUtilisateur = localStorage.getItem("role") as Role | null;



      if (!token) {
        setAutorise(false);
        setVerification(false);

        router.replace("/login");
        return;
      }

      if (rolesAutorises.length === 0) {
        console.error(
          "RoleGuard : aucun rôle autorisé n'a été configuré."
        );

        setAutorise(false);
        setVerification(false);

        router.replace("/non-autorise");
        return;
      }

      if (
        !roleUtilisateur ||
        estRoleMasque(roleUtilisateur) ||
        !rolesAutorises.includes(roleUtilisateur)
      ) {
        setAutorise(false);
        setVerification(false);

        router.replace("/non-autorise");
        return;
      }

      setAutorise(true);
      setVerification(false);

    }, 0);
    return () => window.clearTimeout(initialisation);
  }, [router, rolesKey]);

  if (verification) {
    return (
      <div
        style={{
          textAlign: "center",
          marginTop: 100,
        }}
      >
        Vérification en cours...
      </div>
    );
  }

  if (!autorise) {
    return null;
  }

  return <>{children}</>;
}
