"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [autorise, setAutorise] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    console.log("AdminLayout →", {
      token: !!token,
      role,
    });

    // Aucun token = utilisateur non connecté
    if (!token) {
      router.replace("/login");
      return;
    }

    // Rôles autorisés dans l'espace admin
    const rolesAutorises = ["ADMIN", "DIRECTEUR_DFP"];

    if (!role || !rolesAutorises.includes(role)) {
      router.replace("/non-autorise");
      return;
    }

    setAutorise(true);
  }, [router]);

  if (!autorise) {
    return (
      <div style={{ textAlign: "center", marginTop: 100 }}>
        Vérification en cours...
      </div>
    );
  }

  return <>{children}</>;
}