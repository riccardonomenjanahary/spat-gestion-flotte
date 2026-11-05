"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowLeft, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import RoleGuard from "@/components/RoleGuard";
import EnTete from "@/components/EnTete";
import { ROLES } from "@/app/lib/roles";

interface Personnel {
  matricule: string;
  nom: string;
  prenom: string;
  direction: string;
  poste: string;
  categorie: string;
  email?: string | null;
  supprime?: boolean;
}

interface UtilisateurAvecEmail {
  matricule: string;
  email?: string | null;
}

function ListePersonnelsPage() {
  const router = useRouter();
  const api = process.env.NEXT_PUBLIC_API_URL;
  const [recherche, setRecherche] = useState("");
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [personnels, setPersonnels] = useState<Personnel[]>([]);
  const [chargementPersonnels, setChargementPersonnels] = useState(true);
  const [erreurChargement, setErreurChargement] = useState(false);
  const [modifications, setModifications] = useState<Record<string, Personnel>>({});
  const [edition, setEdition] = useState<Personnel | null>(null);
  const [suppression, setSuppression] = useState<Personnel | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    Promise.resolve().then(() => {
      if (!token || !api) throw new Error("Connexion au répertoire indisponible.");
      return Promise.all([
      fetch("/data/personnels.json", { cache: "force-cache" }),
      fetch(`${api}/admin/personnels`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
      }),
      ]);
    })
      .then(async ([response, corrections]) => {
        if (!response.ok) throw new Error("Fichier du répertoire introuvable.");
        if (!corrections.ok) throw new Error("Corrections du répertoire indisponibles.");
        const data: unknown = await response.json();
        const changements: unknown = await corrections.json();
        if (!Array.isArray(data) || !Array.isArray(changements)) throw new Error("Format du répertoire invalide.");
        setModifications(Object.fromEntries((changements as Personnel[]).map((personnel) => [personnel.matricule, personnel])));
        return data as Personnel[];
      })
      .then(setPersonnels)
      .catch(() => setErreurChargement(true))
      .finally(() => setChargementPersonnels(false));
  }, [api]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    if (!api) return;

    fetch(`${api}/admin/utilisateurs`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Impossible de charger les emails des comptes.");
        const data: unknown = await response.json();
        if (!Array.isArray(data)) throw new Error("Format de réponse comptes utilisateurs invalide.");
        return data as UtilisateurAvecEmail[];
      })
      .then((utilisateurs) => {
        const correspondances: Record<string, string> = {};
        utilisateurs.forEach((utilisateur) => {
          if (utilisateur.email) {
            correspondances[String(utilisateur.matricule).trim()] = utilisateur.email;
          }
        });
        setEmails(correspondances);
      })
      .catch(() => toast.error("Les emails des comptes ne sont pas disponibles pour le moment."));
  }, [api, router]);

  const terme = recherche.trim().toLocaleLowerCase("fr");
  const emailPourPersonnel = (personnel: Personnel) => modifications[personnel.matricule]
    ? personnel.email || "" : emails[personnel.matricule] || personnel.email || "";
  const repertoire = useMemo(() => personnels
    .map((personnel) => modifications[personnel.matricule] || personnel)
    .filter((personnel) => !personnel.supprime), [personnels, modifications]);
  const personnelsFiltres = useMemo(() => {
    if (!terme) return repertoire;
    return repertoire.filter((personnel) => {
      const email = modifications[personnel.matricule] ? personnel.email || "" : emails[personnel.matricule] || personnel.email || "";
      return [personnel.matricule, personnel.nom, personnel.prenom, email, personnel.poste]
        .some((valeur) => valeur.toLocaleLowerCase("fr").includes(terme));
    });
  }, [emails, repertoire, modifications, terme]);

  const enregistrer = async (personnel: Personnel, supprimer = false) => {
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/login"); return; }
    if (!api || enregistrement) return;
    setEnregistrement(true);
    try {
      const response = await fetch(`${api}/admin/personnels/${encodeURIComponent(personnel.matricule)}`, {
        method: supprimer ? "DELETE" : "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        ...(supprimer ? {} : { body: JSON.stringify(personnel) }),
      });
      if (!response.ok) throw new Error("Enregistrement impossible. Veuillez réessayer.");
      const resultat: Personnel = supprimer ? { ...personnel, supprime: true } : await response.json();
      setModifications((precedentes) => ({ ...precedentes, [personnel.matricule]: resultat }));
      setEdition(null);
      setSuppression(null);
      toast.success(supprimer ? "Personnel supprimé du répertoire." : "Personnel modifié.");
    } catch {
      toast.error("Enregistrement impossible. Veuillez réessayer.");
    } finally {
      setEnregistrement(false);
    }
  };

  return (
    <>
      <EnTete />
      <main style={{ minHeight: "calc(100vh - 72px)", background: "#f8fafc", padding: "28px 20px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 22 }}>
            <button
              type="button"
              onClick={() => router.push("/super-admin/utilisateurs")}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: 9, background: "white", color: "#334155", fontWeight: 700, cursor: "pointer" }}
            >
              <ArrowLeft size={17} /> Retour aux utilisateurs
            </button>
            <div style={{ color: "#64748b", fontSize: 14, fontWeight: 600 }}>
              {chargementPersonnels ? "Chargement du répertoire..." : `${personnelsFiltres.length} / ${repertoire.length} personnels`}
            </div>
          </div>

          <section style={{ border: "1px solid #e2e8f0", borderRadius: 14, background: "white", boxShadow: "0 8px 24px rgba(15,23,42,.05)", overflow: "hidden" }}>
            <div style={{ padding: "22px 24px", borderBottom: "1px solid #e2e8f0" }}>
              <h1 style={{ margin: "0 0 6px", color: "#172033", fontSize: 24 }}>Liste des personnels</h1>

              <div style={{ position: "relative", maxWidth: 520, marginTop: 18 }}>
                <Search size={17} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
                <input
                  value={recherche}
                  onChange={(event) => setRecherche(event.target.value)}
                  placeholder="Rechercher par matricule, nom, prénom, email ou poste..."
                  style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px 11px 38px", border: "1px solid #cbd5e1", borderRadius: 9, color: "#172033", outlineColor: "#2563eb" }}
                />
              </div>
            </div>

            <div style={{ maxHeight: "calc(100vh - 300px)", minHeight: 360, overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 1, background: "#f1f5f9", color: "#334155" }}>
                  <tr>
                    {['Num. matricule', 'Nom', 'Prénom', 'Email', 'Poste', 'Actions'].map((titre) => (
                      <th key={titre} style={{ padding: "13px 16px", borderBottom: "1px solid #cbd5e1", fontSize: 12, textTransform: "uppercase", letterSpacing: ".04em", whiteSpace: "nowrap" }}>{titre}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chargementPersonnels ? (
                    <tr><td colSpan={6} style={{ padding: 28, color: "#64748b", textAlign: "center" }}>Chargement des personnels...</td></tr>
                  ) : erreurChargement ? (
                    <tr><td colSpan={6} style={{ padding: 28, color: "#b91c1c", textAlign: "center" }}>Le répertoire n&apos;a pas pu être chargé. Veuillez recharger la page.</td></tr>
                  ) : personnelsFiltres.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: 28, color: "#64748b", textAlign: "center" }}>Aucun personnel trouvé.</td></tr>
                  ) : personnelsFiltres.map((personnel) => (
                    <tr key={personnel.matricule} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 16px", color: "#0f172a", fontWeight: 700, whiteSpace: "nowrap" }}>{personnel.matricule}</td>
                      <td style={{ padding: "12px 16px", color: "#334155" }}>{personnel.nom || "—"}</td>
                      <td style={{ padding: "12px 16px", color: "#334155" }}>{personnel.prenom || "—"}</td>
                      <td style={{ padding: "12px 16px", color: emailPourPersonnel(personnel) ? "#334155" : "#94a3b8" }}>{emailPourPersonnel(personnel) || "—"}</td>
                      <td style={{ padding: "12px 16px", color: "#334155" }}>{personnel.poste || "—"}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button type="button" title="Modifier" aria-label={`Modifier ${personnel.nom} ${personnel.prenom}`}
                            onClick={() => setEdition({ ...personnel, email: emailPourPersonnel(personnel) })}
                            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 8, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#2563eb", cursor: "pointer" }}>
                            <Pencil size={16} />
                          </button>
                          <button type="button" title="Supprimer" aria-label={`Supprimer ${personnel.nom} ${personnel.prenom}`}
                            onClick={() => setSuppression(personnel)}
                            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", cursor: "pointer" }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
      {(edition || suppression) && (
        <dialog ref={(dialog) => { if (dialog && !dialog.open) dialog.showModal(); }} aria-modal="true" aria-labelledby="personnel-dialog-title"
          onCancel={(event) => { event.preventDefault(); if (!enregistrement) { setEdition(null); setSuppression(null); } }}
          style={{ position: "fixed", inset: 0, margin: 0, width: "100%", height: "100%", maxWidth: "none", maxHeight: "none", boxSizing: "border-box", zIndex: 50, border: 0, padding: 20, background: "rgba(15,23,42,.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <form onSubmit={(event) => { event.preventDefault(); if (edition) void enregistrer(edition); else if (suppression) void enregistrer(suppression, true); }}
            style={{ width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto", borderRadius: 14, padding: 24, background: "white", color: "#172033" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <h2 id="personnel-dialog-title" style={{ fontSize: 20, margin: 0 }}>{edition ? "Modifier le personnel" : "Supprimer le personnel"}</h2>
              <button type="button" disabled={enregistrement} aria-label="Fermer" onClick={() => { setEdition(null); setSuppression(null); }} style={{ border: 0, background: "transparent", cursor: "pointer", color: "#64748b" }}><X size={20} /></button>
            </div>
            {edition ? (
              <>
                <p style={{ color: "#64748b", marginTop: 12 }}>Matricule : {edition.matricule}</p>
                {([
                  ["nom", "Nom"], ["prenom", "Prénom"], ["email", "Email"],
                  ["poste", "Poste"], ["direction", "Direction"], ["categorie", "Catégorie"],
                ] as const).map(([champ, libelle]) => (
                  <label key={champ} style={{ display: "block", marginTop: 12, fontSize: 14, fontWeight: 600 }}>
                    {libelle}
                    <input autoFocus={champ === "nom"} type={champ === "email" ? "email" : "text"} required={champ === "nom"} maxLength={255}
                      disabled={enregistrement} value={edition[champ] || ""} onChange={(event) => setEdition({ ...edition, [champ]: event.target.value })}
                      style={{ display: "block", boxSizing: "border-box", width: "100%", padding: "10px 12px", marginTop: 5, border: "1px solid #cbd5e1", borderRadius: 8 }} />
                  </label>
                ))}
              </>
            ) : <p style={{ marginTop: 20 }}>Supprimer {suppression?.nom} {suppression?.prenom} ({suppression?.matricule}) du répertoire ? Son compte utilisateur sera conservé.</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
              <button type="button" disabled={enregistrement} onClick={() => { setEdition(null); setSuppression(null); }} style={{ padding: "10px 16px", border: "1px solid #cbd5e1", borderRadius: 8, background: "white", cursor: "pointer" }}>Annuler</button>
              <button type="submit" disabled={enregistrement || (!!edition && !edition.nom.trim())} style={{ padding: "10px 16px", border: 0, borderRadius: 8, background: edition ? "#2563eb" : "#dc2626", color: "white", cursor: enregistrement ? "wait" : "pointer", opacity: enregistrement ? .6 : 1 }}>
                {enregistrement ? "Enregistrement..." : edition ? "Enregistrer" : "Supprimer"}
              </button>
            </div>
          </form>
        </dialog>
      )}
    </>
  );
}

export default function SuperAdminPersonnelsPage() {
  return (
    <RoleGuard role={ROLES.SUPER_ADMIN}>
      <ListePersonnelsPage />
    </RoleGuard>
  );
}
