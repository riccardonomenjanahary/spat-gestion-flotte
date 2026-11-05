"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { accueilPourRole } from "@/app/lib/roles";

export default function DispatchPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token) {
      router.replace("/login");
      return;
    }

    router.replace(accueilPourRole(role));
  }, [router]);

  return <p style={{ padding: 32, color: "#475569" }}>Redirection vers votre espace…</p>;
}
