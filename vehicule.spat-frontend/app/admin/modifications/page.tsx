"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ClipboardList, RefreshCw } from "lucide-react";
import EnTete from "@/components/EnTete";

interface Modification {
  id: number;
  acteurMatricule: string;
  acteurRole: string;
  methode: string;
  chemin: string;
  statutHttp: number;
  dateAction: string;
}

interface PageModifications {
  content?: Modification[];
  totalPages?: number;
  totalElements?: number;
}

const API = process.env.NEXT_PUBLIC_API_URL;
const TAILLE_PAGE = 50;

export default function ModificationsAdminPage() {
  const router = useRouter();
  const [modifications, setModifications] = useState<Modification[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  const charger = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!API || !token) {
      if (!token) router.replace("/login");
      setErreur("Configuration API ou session indisponible.");
      setChargement(false);
      return;
    }

    setChargement(true);
    setErreur("");
    try {
      const response = await fetch(
        `${API}/admin/modifications?page=${page}&taille=${TAILLE_PAGE}`,
        {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          cache: "no-store",
        },
      );
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data: unknown = await response.json();
      if (!data || typeof data !== "object" || !("content" in data) || !Array.isArray(data.content)) {
        throw new Error("Format de réponse du journal invalide.");
      }
      const pageData = data as PageModifications;
      setModifications(pageData.content || []);
      setTotalPages(Number(pageData.totalPages || 0));
      setTotalElements(Number(pageData.totalElements || 0));
    } catch (cause) {
      setModifications([]);
      setTotalPages(0);
      setTotalElements(0);
      const message = cause instanceof Error ? cause.message : "Erreur inconnue";
      setErreur(`Impossible de charger le journal des modifications (${message}).`);
      toast.error("Impossible de charger le journal des modifications.");
    } finally {
      setChargement(false);
    }
  }, [page, router]);

  useEffect(() => {
    const initialisation = window.setTimeout(() => {
      void charger();

    }, 0);
    return () => window.clearTimeout(initialisation);
  }, [charger]);

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6" }}>
      <EnTete afficherNotifications={false} />
      <main style={{ maxWidth: 1440, margin: "0 auto", padding: 28 }}>
        <button
          type="button"
          onClick={() => router.push("/admin")}
          style={boutonRetour}
        >
          <ArrowLeft size={17} /> Retour à l’administration
        </button>

        <section style={carte}>
          <div style={enteteCarte}>
            <div style={iconeTitre}>
              <ClipboardList size={21} />
              <div>
                <h1 style={{ margin: 0, fontSize: 22, color: "#0f172a" }}>
                  Journal des modifications
                </h1>

              </div>
            </div>
            <button type="button" onClick={() => void charger()} disabled={chargement} style={boutonActualiser}>
              <RefreshCw size={16} className={chargement ? "rotation" : undefined} /> Actualiser
            </button>
          </div>

          {erreur && <p role="alert" style={{ color: "#b91c1c", padding: "0 20px" }}>{erreur}</p>}

          <div style={{ overflowX: "auto" }}>
            <table style={tableau}>
              <thead>
                <tr>
                  <th style={th}>Date et heure</th>
                  <th style={th}>Auteur</th>
                  <th style={th}>Rôle</th>
                  <th style={th}>Action</th>
                  <th style={th}>Ressource</th>
                  <th style={th}>Résultat</th>
                </tr>
              </thead>
              <tbody>
                {chargement ? (
                  <tr><td colSpan={6} style={celluleVide}>Chargement du journal…</td></tr>
                ) : modifications.length === 0 ? (
                  <tr><td colSpan={6} style={celluleVide}>Aucune modification enregistrée pour le moment.</td></tr>
                ) : modifications.map((item) => (
                  <tr key={item.id}>
                    <td style={td}>{formaterDate(item.dateAction)}</td>
                    <td style={td}><strong>{item.acteurMatricule}</strong></td>
                    <td style={td}>{libelleRole(item.acteurRole)}</td>
                    <td style={td}><span style={badgeAction}>{libelleAction(item.methode)}</span></td>
                    <td style={td}><code style={cheminStyle}>{item.chemin}</code></td>
                    <td style={td}>
                      <span style={{ ...badgeStatut, background: item.statutHttp >= 200 && item.statutHttp < 300 ? "#dcfce7" : "#fee2e2", color: item.statutHttp >= 200 && item.statutHttp < 300 ? "#166534" : "#991b1b" }}>
                        HTTP {item.statutHttp}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer style={piedCarte}>
            <span>{totalElements.toLocaleString("fr-FR")} action(s) enregistrée(s)</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button type="button" onClick={() => setPage((courant) => Math.max(0, courant - 1))} disabled={page === 0 || chargement} style={boutonPage}>
                Précédent
              </button>
              <span>Page {totalPages === 0 ? 0 : page + 1} / {totalPages}</span>
              <button type="button" onClick={() => setPage((courant) => courant + 1)} disabled={page + 1 >= totalPages || chargement} style={boutonPage}>
                Suivant
              </button>
            </div>
          </footer>
        </section>
      </main>
      <style jsx>{`
        .rotation { animation: rotation .8s linear infinite; }
        @keyframes rotation { to { transform: rotate(360deg); } }
        @media (max-width: 700px) {
          main { padding: 16px !important; }
          section { border-radius: 10px !important; }
        }
      `}</style>
    </div>
  );
}

function formaterDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Indian/Antananarivo",
  }).format(date);
}

function libelleAction(methode: string) {
  switch (methode.toUpperCase()) {
    case "POST": return "Création / action";
    case "PUT":
    case "PATCH": return "Modification";
    case "DELETE": return "Suppression";
    default: return methode;
  }
}

function libelleRole(role: string) {
  return role === "CO_ADMIN" ? "Co-admin" : role.replaceAll("_", " ");
}

const carte = { overflow: "hidden", border: "1px solid #e2e8f0", borderRadius: 14, background: "white", boxShadow: "0 8px 24px rgba(15,23,42,.05)" } as const;
const enteteCarte = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: 20, borderBottom: "1px solid #e2e8f0" } as const;
const iconeTitre = { display: "flex", alignItems: "center", gap: 12, color: "#1d4ed8" } as const;
const boutonRetour = { display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 18, border: 0, background: "transparent", color: "#334155", cursor: "pointer", fontWeight: 600 } as const;
const boutonActualiser = { display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: 8, background: "white", color: "#334155", cursor: "pointer", fontWeight: 600 } as const;
const tableau = { width: "100%", borderCollapse: "collapse" as const, textAlign: "left" as const, minWidth: 900 };
const th = { padding: "12px 16px", background: "#f8fafc", color: "#475569", fontSize: 12, textTransform: "uppercase" as const, letterSpacing: ".04em", whiteSpace: "nowrap" as const };
const td = { padding: "13px 16px", borderTop: "1px solid #f1f5f9", color: "#334155", fontSize: 13, verticalAlign: "top" as const };
const celluleVide = { padding: 36, textAlign: "center" as const, color: "#64748b" };
const piedCarte = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 16, borderTop: "1px solid #e2e8f0", color: "#64748b", fontSize: 13 } as const;
const badgeAction = { display: "inline-flex", padding: "4px 8px", borderRadius: 999, background: "#eff6ff", color: "#1d4ed8", fontWeight: 700, whiteSpace: "nowrap" as const };
const badgeStatut = { display: "inline-flex", padding: "4px 8px", borderRadius: 999, fontWeight: 700, whiteSpace: "nowrap" as const };
const cheminStyle = { whiteSpace: "normal" as const, overflowWrap: "anywhere" as const, color: "#475569" };
const boutonPage = { padding: "7px 10px", border: "1px solid #cbd5e1", borderRadius: 7, background: "white", color: "#334155", cursor: "pointer" } as const;
