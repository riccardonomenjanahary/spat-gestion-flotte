"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import EnTete from "@/components/EnTete";

interface TransactionCarburant {
  id: string;
  type?: string | null;
  quantiteLitres?: number | null;
  dateOperation?: string | null;
  prixUnitaire?: number | null;
  montantTotal?: number | null;
  kilometrage?: number | null;
  vehicule?: { id?: number | null; immatriculation?: string | null } | null;
}

export default function StatistiquesConsommationPage() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;
  const [transactions, setTransactions] = useState<TransactionCarburant[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let actif = true;
    const charger = async () => {
      const token = localStorage.getItem("token");
      if (!API || !token) {
        if (!token) router.replace("/login");
        if (actif) {
          setErreur("Configuration API ou session indisponible.");
          setChargement(false);
        }
        return;
      }

      try {
        const response = await fetch(`${API}/carburant`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          cache: "no-store",
        });
        if (response.status === 401) {
          router.replace("/login");
          throw new Error("Session expirée.");
        }
        if (!response.ok) throw new Error(`Impossible de charger le carburant (HTTP ${response.status}).`);
        const body: unknown = await response.json();
        if (!Array.isArray(body)) throw new Error("Réponse carburant invalide : liste attendue.");
        if (actif) {
          setTransactions(body as TransactionCarburant[]);
          setErreur(null);
        }
      } catch (loadError) {
        if (actif) {
          setTransactions([]);
          setErreur(loadError instanceof Error ? loadError.message : "Impossible de charger les données carburant.");
        }
      } finally {
        if (actif) setChargement(false);
      }
    };

    void charger();
    return () => { actif = false; };
  }, [API, router]);

  const statistiques = useMemo(() => {
    const moisCourant = cleMoisLocale(new Date());
    const operationsMois = transactions.filter((t) => String(t.dateOperation || "").slice(0, 7) === moisCourant);
    const litres = operationsMois
      .filter((t) => String(t.type || "").toUpperCase() === "CONSOMMATION")
      .reduce((total, t) => total + Number(t.quantiteLitres || 0), 0);
    const montant = operationsMois.reduce((total, t) => {
      if (t.montantTotal != null) return total + Number(t.montantTotal || 0);
      return total + Number(t.quantiteLitres || 0) * Number(t.prixUnitaire || 0);
    }, 0);

    return { litres, montant, ratio: calculerRatioGlobal(transactions) };
  }, [transactions]);

  return (
    <>
      <EnTete afficherNotifications={false} />
      <div style={{ minHeight: "100vh", backgroundColor: "#f3f4f6", padding: 32 }}>
        <button
          onClick={() => router.push("/admin")}
          style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 14, marginBottom: 20 }}
        >
          ← Retour
        </button>

        <h2 style={{ color: "#1e293b", marginBottom: 8 }}>Suivi de la consommation</h2>

        {erreur && <p role="alert" style={{ color: "#b91c1c", marginBottom: 18 }}>{erreur}</p>}
        {!chargement && !erreur && transactions.length === 0 && (
          <p style={{ color: "#64748b", marginBottom: 18 }}>Aucune opération carburant enregistrée.</p>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
          <CarteStat titre="Carburant consommé ce mois" valeur={chargement ? "Chargement..." : erreur ? "—" : `${formatNombre(statistiques.litres)} L`} />
          <CarteStat titre="Dépenses carburant ce mois" valeur={chargement ? "Chargement..." : erreur ? "—" : `${formatNombre(statistiques.montant)} Ar`} />
          <CarteStat titre="Ratio moyen L/100 km" valeur={chargement ? "Chargement..." : erreur ? "—" : statistiques.ratio == null ? "—" : `${formatNombre(statistiques.ratio)} L/100 km`} />
        </div>
        {!chargement && !erreur && statistiques.ratio == null && transactions.length > 0 && (
          <p style={{ color: "#64748b", fontSize: 13 }}>
            Ratio indisponible : il faut au moins deux relevés kilométriques datés pour un même véhicule.
          </p>
        )}
      </div>
    </>
  );
}

function calculerRatioGlobal(transactions: TransactionCarburant[]): number | null {
  const parVehicule = new Map<number, TransactionCarburant[]>();
  transactions.forEach((transaction) => {
    const id = transaction.vehicule?.id;
    if (id == null || transaction.kilometrage == null || !transaction.dateOperation) return;
    const operations = parVehicule.get(id) || [];
    operations.push(transaction);
    parVehicule.set(id, operations);
  });

  let distanceTotale = 0;
  let litresTotaux = 0;
  parVehicule.forEach((operations) => {
    const points = operations
      .map((operation) => ({ jour: String(operation.dateOperation).slice(0, 10), km: Number(operation.kilometrage) }))
      .filter((point) => /^\d{4}-\d{2}-\d{2}$/.test(point.jour) && Number.isFinite(point.km) && point.km >= 0)
      .sort((a, b) => a.jour.localeCompare(b.jour) || a.km - b.km);
    const debut = points[0];
    const fin = points[points.length - 1];
    if (!debut || !fin || debut.jour >= fin.jour || fin.km <= debut.km) return;

    const litres = operations.reduce((total, operation) => {
      const jour = String(operation.dateOperation || "").slice(0, 10);
      const quantite = Number(operation.quantiteLitres || 0);
      if (String(operation.type || "").toUpperCase() !== "CONSOMMATION" || jour <= debut.jour || jour > fin.jour || !Number.isFinite(quantite) || quantite <= 0) return total;
      return total + quantite;
    }, 0);
    if (litres > 0) {
      distanceTotale += fin.km - debut.km;
      litresTotaux += litres;
    }
  });

  return distanceTotale > 0 && litresTotaux > 0 ? litresTotaux / distanceTotale * 100 : null;
}

function cleMoisLocale(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatNombre(valeur: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(Number(valeur || 0));
}

function CarteStat({ titre, valeur }: { titre: string; valeur: string }) {
  return (
    <div style={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20 }}>
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>{titre}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color: "#1e293b" }}>{valeur}</div>
    </div>
  );
}
