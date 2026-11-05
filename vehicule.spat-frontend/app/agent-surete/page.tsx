"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import RoleGuard from "@/components/RoleGuard";
import EnTete from "@/components/EnTete";
import FicheDeBordSurete from "@/components/FicheDeBordSurete";
import SuiviGpsSurete from "@/components/SuiviGpsSurete";
import { ROLES } from "@/app/lib/roles";

type Onglet = "fiche" | "gps";

function AgentSuretePage() {
  const [onglet, setOnglet] = useState<Onglet>("fiche");

  const styleOnglet = (actif: boolean): CSSProperties => ({
    padding: "10px 18px",
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    background: actif ? "#1e3a5f" : "#e2e8f0",
    color: actif ? "white" : "#334155",
  });

  return (
    <>
      <EnTete afficherSignalement={false} />
      <main style={{ maxWidth: 1500, width: "calc(100% - 32px)", margin: "24px auto", padding: 24, boxSizing: "border-box" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
          <button type="button" style={styleOnglet(onglet === "fiche")} onClick={() => setOnglet("fiche")}>
            Fiche de bord journalière
          </button>
          <button type="button" style={styleOnglet(onglet === "gps")} onClick={() => setOnglet("gps")}>
            Suivi GPS
          </button>
        </div>
        {onglet === "fiche" ? <FicheDeBordSurete /> : <SuiviGpsSurete />}
      </main>
    </>
  );
}

export default function Page() {
  return (
    <RoleGuard role={ROLES.AGENT_SURETE}>
      <AgentSuretePage />
    </RoleGuard>
  );
}
