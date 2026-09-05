"use client";

import { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import EnTete from "@/components/EnTete";
import { ROLES } from "@/app/lib/roles";
import { toast } from "sonner";
import { Wrench, Send } from "lucide-react";

interface Vehicule {
  id: number;
  immatriculation: string;
  marque?: string;
  modele?: string;
}

interface Maintenance {
  id: string;
  vehicule: Vehicule;
  natureIntervention: string;
  statut: string;
  avisTexte?: string;
  dateCreation: string;
}

export default function MecanicienDidPage() {
  return (
    <RoleGuard role={ROLES.MECANICIEN_DID}>
      <MecanicienDidContent />
    </RoleGuard>
  );
}

function MecanicienDidContent() {
  const [dossiers, setDossiers] = useState<Maintenance[]>([]);
  const [chargement, setChargement] = useState(true);
  const [avisEnCours, setAvisEnCours] = useState<Record<string, string>>({});
  const [envoiEnCours, setEnvoiEnCours] = useState<string | null>(null);

  const charger = async () => {
    const token = localStorage.getItem("token");
    setChargement(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/maintenances/en-attente-avis`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDossiers(data);
    } catch {
      toast.error("Impossible de charger les dossiers d'entretien");
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    charger();
  }, []);

  const soumettreAvis = async (id: string) => {
    const avisTexte = avisEnCours[id]?.trim();
    if (!avisTexte) {
      toast.error("Saisissez votre avis technique avant de le soumettre");
      return;
    }

    const token = localStorage.getItem("token");
    setEnvoiEnCours(id);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/maintenances/${id}/avis`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ avisTexte }),
      });

      if (!res.ok) {
        toast.error("Erreur lors de l'envoi de l'avis");
        return;
      }

      toast.success("Avis technique enregistré");
      setAvisEnCours((prev) => {
        const copie = { ...prev };
        delete copie[id];
        return copie;
      });
      charger();
    } catch {
      toast.error("Impossible de contacter le serveur");
    } finally {
      setEnvoiEnCours(null);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f3f4f6" }}>
      <EnTete />
      <div style={{ padding: 32 }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Wrench size={22} color="#92400e" />
          <h2 style={{ margin: 0, fontSize: 21, color: "#1e293b" }}>Dossiers en attente d'avis technique</h2>
        </div>
        <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 24 }}>
          Selon la règle RG-02 : aucune intervention ne peut être planifiée tant que votre avis n'est pas enregistré.
        </p>

        {chargement ? (
          <p style={{ color: "#6b7280" }}>Chargement...</p>
        ) : dossiers.length === 0 ? (
          <div
            style={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: 40,
              textAlign: "center",
              color: "#6b7280",
            }}
          >
            Aucun dossier en attente d'avis pour le moment.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {dossiers.map((d) => (
              <div
                key={d.id}
                style={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  padding: 20,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: "#111827" }}>
                      {d.vehicule.immatriculation} — {d.vehicule.marque || "—"} {d.vehicule.modele || ""}
                    </div>
                    <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{d.natureIntervention}</div>
                  </div>
                  <span
                    style={{
                      alignSelf: "flex-start",
                      padding: "3px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                      backgroundColor: "#fef3c7",
                      color: "#92400e",
                      whiteSpace: "nowrap",
                    }}
                  >
                    En attente d'avis
                  </span>
                </div>

                <textarea
                  placeholder="Votre avis technique sur cette intervention..."
                  value={avisEnCours[d.id] || ""}
                  onChange={(e) =>
                    setAvisEnCours((prev) => ({ ...prev, [d.id]: e.target.value }))
                  }
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "2px solid #111827",
                    borderRadius: 8,
                    fontSize: 14,
                    color: "#111827",
                    backgroundColor: "#ffffff",
                    marginBottom: 10,
                    resize: "vertical",
                  }}
                />

                <button
                  onClick={() => soumettreAvis(d.id)}
                  disabled={envoiEnCours === d.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "9px 16px",
                    backgroundColor: "#dc2626",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: envoiEnCours === d.id ? "default" : "pointer",
                    opacity: envoiEnCours === d.id ? 0.6 : 1,
                  }}
                >
                  <Send size={15} />
                  {envoiEnCours === d.id ? "Envoi..." : "Soumettre l'avis"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}