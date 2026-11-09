"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Building2, Check, Save, Search } from "lucide-react";
import EnTete from "@/components/EnTete";

interface Direction {
  id: number;
  code: string;
  nom: string;
  actif?: boolean;
}

interface Vehicule {
  id: number;
  immatriculation: string;
  categorie?: string | null;
  modeleType?: string | null;
  statut?: string | null;
  affectation?: string | null;
  directions?: Direction[] | null;
}

export default function DirectionsPage() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [brouillons, setBrouillons] = useState<Record<number, number[]>>({});
  const [recherche, setRecherche] = useState("");
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);
  const [enregistrements, setEnregistrements] = useState<number[]>([]);
  const [role, setRole] = useState("");

  useEffect(() => {
    const initialisation = window.setTimeout(() => {
      setRole(localStorage.getItem("role") || "");

    }, 0);
    return () => window.clearTimeout(initialisation);
  }, []);

  useEffect(() => {
    let nettoyer: (() => void) | undefined;
    const initialisation = window.setTimeout(() => {
      nettoyer = (() => {
        const token = localStorage.getItem("token");
        if (!API || !token) {
          if (API) setErreurChargement("Session indisponible.");
          else setErreurChargement("NEXT_PUBLIC_API_URL n'est pas configurée.");
          if (!token) router.replace("/login");
          else toast.error("NEXT_PUBLIC_API_URL n'est pas configurée");
          setChargement(false);
          return;
        }
        let actif = true;
        setErreurChargement(null);

        const chargerDirections = fetch(`${API}/directions`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, cache: "no-store" })
          .then(async (response) => {
            if (!response.ok) throw new Error("Impossible de charger les directions.");
            const data: unknown = await response.json();
            if (!Array.isArray(data)) throw new Error("Format de réponse directions invalide.");
            return data as Direction[];
          });

        const chargerVehicules = fetch(`${API}/vehicules`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, cache: "no-store" })
          .then(async (response) => {
            if (response.status === 401) {
              router.replace("/login");
              throw new Error("SESSION");
            }
            if (!response.ok) throw new Error("Impossible de charger les véhicules.");
            const data: unknown = await response.json();
            if (!Array.isArray(data)) throw new Error("Format de réponse véhicules invalide.");
            return data as Vehicule[];
          });

        Promise.all([chargerVehicules, chargerDirections])
          .then(([liste, listeDirections]) => {
            if (!actif) return;
            const donnees = Array.isArray(liste) ? liste : [];
            const referentiel = Array.isArray(listeDirections) ? listeDirections : [];
            setVehicules(donnees);
            setDirections(referentiel);
            setBrouillons(Object.fromEntries(donnees.map((vehicule) => [vehicule.id, directionsDuVehicule(vehicule, referentiel)])));
          })
          .catch((erreur: Error) => {
            if (actif) {
              setVehicules([]);
              setBrouillons({});
              setErreurChargement(erreur.message || "Impossible de charger les affectations.");
            }
            if (actif && erreur.message !== "SESSION") toast.error(erreur.message || "Impossible de charger les affectations.");
          })
          .finally(() => { if (actif) setChargement(false); });
        return () => { actif = false; };

      })();
    }, 0);
    return () => {
      window.clearTimeout(initialisation);
      nettoyer?.();
    };
  }, [API, router]);

  const lectureSeule = role !== "ADMIN" && role !== "SUPER_ADMIN";
  const vehiculesFiltres = useMemo(() => {
    const terme = recherche.trim().toLocaleLowerCase("fr-FR");
    if (!terme) return vehicules;
    return vehicules.filter((vehicule) => [vehicule.immatriculation, vehicule.modeleType, vehicule.categorie, vehicule.affectation]
      .some((valeur) => String(valeur || "").toLocaleLowerCase("fr-FR").includes(terme)));
  }, [vehicules, recherche]);
  const totalAffectations = Object.values(brouillons).reduce((total, ids) => total + ids.length, 0);

  const basculerDirection = (vehiculeId: number, directionId: number, coche: boolean) => {
    setBrouillons((precedents) => {
      const actuels = precedents[vehiculeId] || [];
      if (coche && actuels.length >= 5) {
        toast.error("Cinq directions au maximum par véhicule.");
        return precedents;
      }
      const suivants = coche
        ? [...actuels, directionId]
        : actuels.filter((id) => id !== directionId);
      return { ...precedents, [vehiculeId]: suivants };
    });
  };

  const enregistrer = async (vehicule: Vehicule) => {
    const token = localStorage.getItem("token");
    if (!API || !token) {
      if (!token) router.replace("/login");
      return;
    }
    const directionIds = brouillons[vehicule.id] || [];
    if (directionIds.length > 5) {
      toast.error("Cinq directions au maximum par véhicule.");
      return;
    }
    setEnregistrements((actuels) => [...actuels, vehicule.id]);
    try {
      const response = await fetch(`${API}/vehicules/${vehicule.id}/directions`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ directionIds }),
      });
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Impossible d'enregistrer les directions.");
      }
      const actualise = await response.json() as Vehicule;
      setVehicules((precedents) => precedents.map((item) => item.id === vehicule.id ? actualise : item));
      setBrouillons((precedents) => ({ ...precedents, [vehicule.id]: directionIds }));
      toast.success(`Affectation enregistrée pour ${vehicule.immatriculation}.`);
    } catch (erreur) {
      toast.error(erreur instanceof Error ? erreur.message : "Impossible d'enregistrer les directions.");
    } finally {
      setEnregistrements((actuels) => actuels.filter((id) => id !== vehicule.id));
    }
  };

  return (
    <>
      <EnTete afficherNotifications={false} />
      <main style={{ minHeight: "100vh", padding: "28px clamp(16px, 4vw, 42px)", background: "#f3f4f6" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto" }}>
          <button type="button" onClick={() => router.push("/admin")} style={retourStyle}><ArrowLeft size={17} /> Retour à l&apos;administration</button>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, margin: "18px 0 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={iconeStyle}><Building2 size={22} /></span>
              <div>
                <h1 style={{ margin: 0, color: "#0f172a", fontSize: 24 }}>Affectation des véhicules</h1>

              </div>
            </div>
            <div style={compteurStyle}><strong>{vehicules.length}</strong><span>véhicules · {totalAffectations} affectations</span></div>
          </header>
          {erreurChargement && <div role="alert" style={{ marginBottom: 16, padding: 12, border: "1px solid #fecaca", borderRadius: 8, background: "#fef2f2", color: "#991b1b" }}>Affectations non chargées : {erreurChargement}.</div>}

          <section style={carteStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, color: "#1e293b", fontSize: 18 }}>Tableau des affectations</h2>
                {lectureSeule && <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: 13 }}>Consultation uniquement.</p>}
              </div>
              <label style={rechercheStyle}><Search size={17} color="#64748b" /><input value={recherche} onChange={(event) => setRecherche(event.target.value)} placeholder="Rechercher un véhicule..." style={{ border: 0, outline: 0, width: 230, background: "transparent" }} /></label>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead><tr>
                  <th style={{ ...thStyle, minWidth: 280 }}>Véhicule</th>
                  <th style={{ ...thStyle, minWidth: 170 }}>Statut</th>
                  <th style={{ ...thStyle, minWidth: 560 }}>Directions (5 maximum)</th>
                  <th style={{ ...thStyle, width: 145 }}>Action</th>
                </tr></thead>
                <tbody>
                  {chargement ? <tr><td colSpan={4} style={videStyle}>Chargement des véhicules…</td></tr>
                    : vehiculesFiltres.length === 0 ? <tr><td colSpan={4} style={videStyle}>Aucun véhicule trouvé.</td></tr>
                      : vehiculesFiltres.map((vehicule) => {
                        const selection = brouillons[vehicule.id] || [];
                        const actuel = directionsDuVehicule(vehicule, directions);
                        const estMoto = /moto/i.test(vehicule.categorie || "");
                        const modifie = selection.length !== actuel.length || selection.some((id) => !actuel.includes(id));
                        const sauvegarde = enregistrements.includes(vehicule.id);
                        return <tr key={vehicule.id}>
                          <td style={tdStyle}>
                            <strong style={{ display: "block", color: "#0f172a" }}>{vehicule.immatriculation || `Véhicule #${vehicule.id}`}</strong>
                            <span style={{ color: "#64748b", fontSize: 13 }}>{[vehicule.categorie, vehicule.modeleType].filter(Boolean).join(" · ") || "—"}</span>
                          </td>
                          <td style={tdStyle}><span style={statutPill}>{vehicule.statut || "Non précisé"}</span></td>
                          <td style={tdStyle}>
                            <div style={grilleDirections}>
                              {directions.map((direction) => {
                                const checked = selection.includes(direction.id);
                                const bloque = lectureSeule || (!checked && selection.length >= 5) || sauvegarde
                                  || (estMoto && !checked && (selection.length >= 1 || direction.id === 1));
                                return <label key={direction.id} title={direction.nom} style={{ ...optionDirection, opacity: bloque && !checked ? 0.55 : 1, cursor: bloque ? "not-allowed" : "pointer" }}>
                                  <input type="checkbox" checked={checked} disabled={bloque} onChange={(event) => basculerDirection(vehicule.id, direction.id, event.target.checked)} />
                                  <span><strong>{direction.code}</strong><small>{direction.nom}</small></span>
                                </label>;
                              })}
                            </div>
                            <div style={{ marginTop: 7, color: selection.length >= 5 ? "#b45309" : "#64748b", fontSize: 12 }}>
                              {estMoto ? `${selection.length}/1 direction sélectionnée · hors Direction Générale` : `${selection.length}/5 directions sélectionnées · aucune affectation est autorisée`}
                            </div>
                          </td>
                          <td style={tdStyle}>
                            {!lectureSeule && <button type="button" disabled={!modifie || sauvegarde} onClick={() => enregistrer(vehicule)} style={{ ...enregistrerStyle, opacity: !modifie || sauvegarde ? 0.55 : 1, cursor: !modifie || sauvegarde ? "not-allowed" : "pointer" }}>
                              {sauvegarde ? <><span className="spinner" /> Enregistrement</> : <><Save size={15} /> Enregistrer</>}
                            </button>}
                            {!modifie && !sauvegarde && <span style={{ color: "#16a34a", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}><Check size={15} /> À jour</span>}
                          </td>
                        </tr>;
                      })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } } .spinner { width: 14px; height: 14px; border: 2px solid #cbd5e1; border-top-color: #1d4ed8; border-radius: 50%; animation: spin .8s linear infinite; }`}</style>
    </>
  );
}

function normaliser(texte: string) {
  return texte.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
}

function directionsDuVehicule(vehicule: Vehicule, referentiel: Direction[]): number[] {

  if (vehicule.directions && vehicule.directions.length > 0) {
    return vehicule.directions.map((direction): number => direction.id);
  }

  const normalisee = normaliser(vehicule.affectation || "");
  if (!normalisee || normalisee === "AUCUNE DIRECTION") return [];
  return referentiel
    .filter((direction) => normalisee.split(" ").includes(normaliser(direction.code)))
    .map((direction): number => direction.id)
    .slice(0, 5);
}

const retourStyle: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, padding: 0, border: 0, background: "transparent", color: "#475569", cursor: "pointer", fontWeight: 600 };
const iconeStyle: CSSProperties = { display: "grid", placeItems: "center", width: 46, height: 46, borderRadius: 12, color: "#1d4ed8", background: "#dbeafe" };
const compteurStyle: CSSProperties = { display: "grid", gap: 2, padding: "10px 16px", border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff", color: "#64748b", fontSize: 12 };
const carteStyle: CSSProperties = { padding: 20, border: "1px solid #e2e8f0", borderRadius: 14, background: "#fff", boxShadow: "0 8px 24px rgba(15,23,42,.05)" };
const rechercheStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: 9, background: "#fff" };
const tableStyle: CSSProperties = { width: "100%", borderCollapse: "collapse", textAlign: "left" };
const thStyle: CSSProperties = { padding: "12px 14px", color: "#475569", background: "#f8fafc", fontSize: 12, textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" };
const tdStyle: CSSProperties = { padding: "14px", verticalAlign: "top", borderBottom: "1px solid #eef2f7" };
const videStyle: CSSProperties = { padding: 40, textAlign: "center", color: "#64748b" };
const statutPill: CSSProperties = { display: "inline-block", padding: "5px 9px", borderRadius: 20, background: "#f1f5f9", color: "#475569", fontSize: 12, fontWeight: 700 };
const grilleDirections: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(5, minmax(115px, 1fr))", gap: 7 };
const optionDirection: CSSProperties = { display: "flex", alignItems: "flex-start", gap: 7, minWidth: 0, padding: "7px 8px", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", color: "#334155", fontSize: 12 };
const enregistrerStyle: CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "8px 10px", border: "1px solid #bfdbfe", borderRadius: 8, background: "#eff6ff", color: "#1d4ed8", fontWeight: 700 };
