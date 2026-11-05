"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Gauge, MapPin, Route } from "lucide-react";

type Carnet = { id: number; vehicule?: { immatriculation?: string | null; categorie?: string | null } | null; conducteurNom?: string | null; dateSortie: string; dateRetour?: string | null; destination?: string | null; motif?: string | null; kilometrageDepart?: number | null; kilometrageRetour?: number | null; niveauChargeDepart?: number | null; niveauChargeRetour?: number | null; statut: string };

export default function CarnetBordDgal() {
  const API = process.env.NEXT_PUBLIC_API_URL || "";
  const [carnets, setCarnets] = useState<Carnet[]>([]);
  const [erreur, setErreur] = useState("");
  useEffect(() => {
    fetch(`${API}/carnet-bord`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, Accept: "application/json" }, cache: "no-store" })
      .then((res) => res.ok ? res.json() : Promise.reject(new Error("Carnet de bord indisponible.")))
      .then((data) => setCarnets(Array.isArray(data) ? data : []))
      .catch((e) => setErreur(e instanceof Error ? e.message : "Carnet de bord indisponible."));
  }, [API]);
  const enCours = carnets.filter((c) => c.statut === "EN_COURS").length;
  const totalKm = useMemo(() => carnets.reduce((total, c) => total + (c.kilometrageRetour != null && c.kilometrageDepart != null ? c.kilometrageRetour - c.kilometrageDepart : 0), 0), [carnets]);
  return <section style={{ display: "grid", gap: 18 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}><BookOpen size={24} color="#1d4ed8" /><div><h2 style={{ margin: 0, color: "#1e293b" }}>Carnet de bord de la flotte</h2></div></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
      {[{ icon: <BookOpen size={18} />, label: "Entrées enregistrées", value: carnets.length }, { icon: <Route size={18} />, label: "Sorties en cours", value: enCours }, { icon: <Gauge size={18} />, label: "Kilomètres suivis", value: `${totalKm.toLocaleString("fr-FR")} km` }].map((kpi) => <div key={kpi.label} style={{ padding: 16, borderRadius: 12, background: "linear-gradient(135deg,#eff6ff,#fff)", border: "1px solid #bfdbfe", color: "#1e3a5f" }}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 12, color: "#64748b" }}>{kpi.label}</span>{kpi.icon}</div><strong style={{ display: "block", marginTop: 8, fontSize: 24 }}>{kpi.value}</strong></div>)}
    </div>
    {erreur && <div role="alert" style={{ padding: 12, borderRadius: 8, color: "#991b1b", background: "#fef2f2" }}>{erreur}</div>}
    {carnets.length === 0 && !erreur ? <div style={{ padding: 30, textAlign: "center", color: "#64748b", background: "#f8fafc", borderRadius: 12 }}>Aucune entrée de carnet de bord.</div> : <div style={{ display: "grid", gap: 10 }}>{carnets.map((c) => <article key={c.id} style={{ padding: 16, border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", boxShadow: "0 4px 12px rgba(15,23,42,.04)" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><strong style={{ color: "#0f172a" }}>{c.vehicule?.immatriculation || "Véhicule"}</strong><div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>{c.vehicule?.categorie || ""} · {c.conducteurNom || "Conducteur non renseigné"}</div></div><span style={{ padding: "4px 9px", borderRadius: 999, background: c.statut === "EN_COURS" ? "#dcfce7" : "#f1f5f9", color: c.statut === "EN_COURS" ? "#166534" : "#475569", fontSize: 11, fontWeight: 800 }}>{c.statut}</span></div><div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12, color: "#475569", fontSize: 12 }}><span>🕘 {new Date(c.dateSortie).toLocaleString("fr-FR")}</span>{c.dateRetour && <span>→ {new Date(c.dateRetour).toLocaleString("fr-FR")}</span>}<span><MapPin size={13} style={{ verticalAlign: "-2px" }} /> {c.destination || "Destination non renseignée"}</span></div><div style={{ marginTop: 10, color: "#334155", fontSize: 13 }}>{c.motif || "Motif non renseigné"}</div></article>)}</div>}
  </section>;
}
