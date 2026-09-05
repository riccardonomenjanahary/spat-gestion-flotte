"use client";

import { useRouter } from "next/navigation";

export default function StatistiquesAideDecisionPage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f3f4f6", padding: 32 }}>
      <button
        onClick={() => router.push("/admin")}
        style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 14, marginBottom: 20 }}
      >
        ← Retour au tableau de bord
      </button>

      <h2 style={{ color: "#1e293b", marginBottom: 8 }}>Aide à la décision</h2>
      <p style={{ color: "#6b7280", marginBottom: 24, fontSize: 15 }}>
        Coûts opérationnels, maintenance, rapports hebdomadaires.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <CarteStat titre="Coût opérationnel" valeur="—" />
        <CarteStat titre="Maintenances en attente" valeur="—" />
        <CarteStat titre="Dernier rapport hebdo" valeur="—" />
      </div>

      <div
        style={{
          backgroundColor: "white",
          border: "1px dashed #d1d5db",
          borderRadius: 8,
          padding: 32,
          textAlign: "center",
          color: "#9ca3af",
        }}
      >
        Les modules maintenance et rapports ne sont pas encore créés côté backend.
      </div>
    </div>
  );
}

function CarteStat({ titre, valeur }: { titre: string; valeur: string }) {
  return (
    <div style={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20 }}>
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>{titre}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color: "#1e293b" }}>{valeur}</div>
    </div>
  );
}
