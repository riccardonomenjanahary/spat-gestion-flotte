"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { type Role } from "@/app/lib/roles";

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

  // Permet d'utiliser soit :
  // role="SUPER_ADMIN"
  // soit :
  // roles={["ADMIN", "DIRECTEUR_DFP"]}
  const rolesAutorises: Role[] = roles ?? (role ? [role] : []);

  const rolesKey = rolesAutorises.join(",");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const roleUtilisateur = localStorage.getItem("role") as Role | null;

    console.log("RoleGuard →", {
      rolesAutorises,
      roleUtilisateur,
      tokenPresent: !!token,
    });

    // ==============================
    // PAS DE TOKEN
    // ==============================

    if (!token) {
      setAutorise(false);
      setVerification(false);

      router.replace("/login");
      return;
    }

    // ==============================
    // AUCUN ROLE CONFIGURE
    // ==============================

    if (rolesAutorises.length === 0) {
      console.error(
        "RoleGuard : aucun rôle autorisé n'a été configuré."
      );

      setAutorise(false);
      setVerification(false);

      router.replace("/non-autorise");
      return;
    }

    // ==============================
    // ROLE NON AUTORISE
    // ==============================

    if (
      !roleUtilisateur ||
      !rolesAutorises.includes(roleUtilisateur)
    ) {
      setAutorise(false);
      setVerification(false);

      router.replace("/non-autorise");
      return;
    }

    // ==============================
    // UTILISATEUR AUTORISE
    // ==============================

    setAutorise(true);
    setVerification(false);
  }, [router, rolesKey]);

  // ==============================
  // CHARGEMENT
  // ==============================

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

  // ==============================
  // NON AUTORISE
  // ==============================

  if (!autorise) {
    return null;
  }

  // ==============================
  // AUTORISE
  // ==============================

  return <>{children}</>;
}