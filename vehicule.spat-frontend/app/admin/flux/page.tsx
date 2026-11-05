"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FluxPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/statistiques/flux-temps-reel");
  }, [router]);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f3f4f6", color: "#64748b" }}>
      Ouverture du suivi GPS en temps réel…
    </main>
  );
}
