"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, CheckCircle2, XCircle, Download, UploadCloud, Loader2, Pencil } from "lucide-react";

export interface JustificatifItem {
  id: number;
  type: string;
  libelle?: string | null;
  nomFichier: string;
  tailleOctets: number;
  contentType: string;
  vehiculeId?: number | null;
  vehiculeImmatriculation?: string | null;
  reservationId?: number | null;
  reservationMotif?: string | null;
  transactionCarburantId?: string | null;
  deposeParId?: number | null;
  deposeParNom?: string | null;
  deposeParEmail?: string | null;
  dateDepot: string;
  valide: boolean;
  valideParNom?: string | null;
  dateValidation?: string | null;
  commentaireValidation?: string | null;
}

export type CibleJustificatifs =
  | { kind: "vehicule"; id: number | string }
  | { kind: "reservation"; id: number | string }
  | { kind: "transaction"; id: string };

const LABELS_TYPES: Record<string, string> = {
  ORDRE_MISSION: "Ordre de mission signé",
  RECU_CARBURANT: "Reçu carburant",
  CARTE_GRISE: "Carte grise",
  VISITE_TECHNIQUE: "Visite technique",
  ASSURANCE: "Assurance",
  AUTRE: "Autre",
};

function formaterTaille(octets: number) {
  if (!octets && octets !== 0) return "";
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(0)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

function formaterDate(valeur?: string | null) {
  if (!valeur) return "";
  const date = new Date(valeur);
  if (Number.isNaN(date.getTime())) return valeur;
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function cheminListe(cible: CibleJustificatifs) {
  switch (cible.kind) {
    case "vehicule":
      return `/justificatifs/vehicules/${cible.id}`;
    case "reservation":
      return `/justificatifs/reservations/${cible.id}`;
    case "transaction":
      return `/justificatifs/transactions/${cible.id}`;
  }
}

function cheminDepot(cible: CibleJustificatifs) {
  return cheminListe(cible);
}

interface Props {
  cible: CibleJustificatifs;
  typesAutorises?: string[];
  typeParDefaut?: string;
  peutValider?: boolean;
  titre?: string;
}

export default function JustificatifsSection({
  cible,
  typesAutorises,
  typeParDefaut,
  peutValider = false,
  titre = "Justificatifs",
}: Props) {
  const API = process.env.NEXT_PUBLIC_API_URL || "";

  const [elements, setElements] = useState<JustificatifItem[]>([]);
  const [chargement, setChargement] = useState(true);

  const [typeChoisi, setTypeChoisi] = useState<string>(
    typeParDefaut || typesAutorises?.[0] || "AUTRE"
  );
  const [libelle, setLibelle] = useState("");
  const [fichier, setFichier] = useState<File | null>(null);
  const [depotEnCours, setDepotEnCours] = useState(false);

  const [commentaires, setCommentaires] = useState<Record<number, string>>({});
  const [validationEnCours, setValidationEnCours] = useState<number | null>(null);

  const inputFichier = useRef<HTMLInputElement | null>(null);
  const inputRemplacement = useRef<HTMLInputElement | null>(null);
  const remplacementId = useRef<number | null>(null);

  const typesPossibles = typesAutorises && typesAutorises.length > 0
    ? typesAutorises
    : Object.keys(LABELS_TYPES);

  const charger = useCallback(async () => {
    if (!API) {
      setChargement(false);
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      setChargement(false);
      return;
    }

    try {
      const res = await fetch(`${API}${cheminListe(cible)}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });

      if (!res.ok) throw new Error("Chargement impossible.");

      const data: unknown = await res.json();
      setElements(Array.isArray(data) ? (data as JustificatifItem[]) : []);
    } catch {
      setElements([]);
    } finally {
      setChargement(false);
    }
  }, [API, cible]);

  useEffect(() => {
    const initialisation = window.setTimeout(() => {
      setChargement(true);
      charger();

    }, 0);
    return () => window.clearTimeout(initialisation);
  }, [charger]);

  const deposer = async () => {
    if (!fichier) {
      toast.error("Veuillez choisir un fichier (PDF, JPG ou PNG).");
      return;
    }
    if (typeChoisi === "AUTRE" && !libelle.trim()) {
      toast.error("Veuillez préciser le type de justificatif.");
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;

    setDepotEnCours(true);

    try {
      const formulaire = new FormData();
      formulaire.append("type", typeChoisi);
      if (libelle.trim()) formulaire.append("libelle", libelle.trim());
      formulaire.append("fichier", fichier);

      const res = await fetch(`${API}${cheminDepot(cible)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formulaire,
      });

      if (!res.ok) {
        const texte = await res.text().catch(() => "");
        throw new Error(texte || "Dépôt refusé.");
      }

      toast.success("Justificatif déposé.");
      setFichier(null);
      setLibelle("");
      if (inputFichier.current) inputFichier.current.value = "";
      await charger();
    } catch (erreur) {
      toast.error(
        erreur instanceof Error && erreur.message
          ? erreur.message.slice(0, 200)
          : "Erreur lors du dépôt."
      );
    } finally {
      setDepotEnCours(false);
    }
  };

  const telecharger = async (element: JustificatifItem) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;

    try {
      const res = await fetch(`${API}/justificatifs/${element.id}/contenu`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error();

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = element.nomFichier || "justificatif";
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Téléchargement impossible.");
    }
  };

  const valider = async (element: JustificatifItem, accepte: boolean) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;

    setValidationEnCours(element.id);

    try {
      const res = await fetch(`${API}/justificatifs/${element.id}/validation`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          valide: accepte,
          commentaire: commentaires[element.id]?.trim() || "",
        }),
      });

      if (!res.ok) throw new Error();

      toast.success(accepte ? "Justificatif validé." : "Justificatif rejeté.");
      await charger();
    } catch {
      toast.error("Validation impossible.");
    } finally {
      setValidationEnCours(null);
    }
  };

  const remplacer = async (nouveauFichier: File | null) => {
    const id = remplacementId.current;
    remplacementId.current = null;
    if (inputRemplacement.current) inputRemplacement.current.value = "";
    if (!nouveauFichier || id === null) return;

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;

    setValidationEnCours(id);

    try {
      const formulaire = new FormData();
      formulaire.append("fichier", nouveauFichier);

      const res = await fetch(`${API}/justificatifs/${id}/fichier`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formulaire,
      });

      if (!res.ok) {
        const texte = await res.text().catch(() => "");
        throw new Error(texte || "Modification refusée.");
      }

      toast.success("Document remplacé : la nouvelle version doit être validée.");
      await charger();
    } catch (erreur) {
      toast.error(
        erreur instanceof Error && erreur.message
          ? erreur.message.slice(0, 200)
          : "Modification impossible."
      );
    } finally {
      setValidationEnCours(null);
    }
  };

  const encadreStyle: React.CSSProperties = {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    background: "#fff",
    padding: 16,
  };

  return (
    <div style={encadreStyle}>
      <input
        ref={inputRemplacement}
        type="file"
        hidden
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        onChange={(e) => remplacer(e.target.files?.[0] || null)}
      />
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 14,
        paddingBottom: 10,
        borderBottom: "1px solid #e2e8f0",
      }}>
        <FileText size={16} color="#1d4ed8" />
        <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>
          {titre}
        </span>
        <span style={{ fontSize: 12, color: "#64748b" }}>
          ({elements.length})
        </span>
      </div>

      <div style={{
        display: "grid",
        gap: 8,
        padding: 12,
        background: "#f8fafc",
        borderRadius: 8,
        marginBottom: 14,
      }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select
            value={typeChoisi}
            onChange={(e) => setTypeChoisi(e.target.value)}
            style={{
              padding: "8px 10px",
              border: "1px solid #cbd5e1",
              borderRadius: 6,
              fontSize: 13,
              background: "#fff",
              color: "#334155",
              flex: "0 0 auto",
            }}
          >
            {typesPossibles.map((type) => (
              <option key={type} value={type}>
                {LABELS_TYPES[type] || type}
              </option>
            ))}
          </select>

          <input
            ref={inputFichier}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            onChange={(e) => setFichier(e.target.files?.[0] || null)}
            style={{
              flex: 1,
              minWidth: 200,
              fontSize: 12,
              color: "#475569",
              padding: "6px",
              border: "1px dashed #cbd5e1",
              borderRadius: 6,
              background: "#fff",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            value={libelle}
            onChange={(e) => setLibelle(e.target.value)}
            placeholder={typeChoisi === "AUTRE"
              ? "Précisez le justificatif"
              : "Libellé (facultatif) — ex : Ordre de mission signé du 21/10"}
            required={typeChoisi === "AUTRE"}
            style={{
              flex: 1,
              minWidth: 200,
              padding: "8px 10px",
              border: "1px solid #cbd5e1",
              borderRadius: 6,
              fontSize: 13,
            }}
          />

          <button
            type="button"
            onClick={deposer}
            disabled={depotEnCours}
            className="btn-spat btn-bleu"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              width: "fit-content",
              opacity: depotEnCours ? 0.65 : 1,
            }}
          >
            {depotEnCours
              ? <Loader2 size={14} className="animate-spin" />
              : <UploadCloud size={14} />}
            {depotEnCours ? "Dépôt..." : "Déposer"}
          </button>
        </div>

        <div style={{ fontSize: 11, color: "#94a3b8" }}>
          PDF, JPG ou PNG — 15 Mo maximum.
        </div>
      </div>

      {chargement ? (
        <div style={{ padding: 16, textAlign: "center", color: "#64748b", fontSize: 13 }}>
          Chargement...
        </div>
      ) : elements.length === 0 ? (
        <div style={{ padding: 16, textAlign: "center", color: "#64748b", fontSize: 13 }}>
          Aucun justificatif déposé pour le moment.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {elements.map((element) => (
            <div
              key={element.id}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "10px 12px",
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                background: element.valide ? "#f0fdf4" : "#fff",
              }}
            >
              <div style={{ flex: 1, minWidth: 0, display: "grid", gap: 4 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{
                    display: "inline-block",
                    padding: "3px 8px",
                    borderRadius: 20,
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    fontSize: 11,
                    fontWeight: 700,
                  }}>
                    {LABELS_TYPES[element.type] || element.type}
                  </span>

                  {element.valide ? (
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#15803d",
                    }}>
                      <CheckCircle2 size={13} /> Validé
                      {element.valideParNom ? ` par ${element.valideParNom}` : ""}
                    </span>
                  ) : (
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#b45309",
                    }}>
                      <XCircle size={13} /> En attente de validation
                    </span>
                  )}
                </div>

                <div style={{ fontSize: 13, color: "#111827", fontWeight: 600, wordBreak: "break-all" }}>
                  {element.libelle || element.nomFichier}
                </div>

                <div style={{ fontSize: 11, color: "#64748b" }}>
                  {element.nomFichier} — {formaterTaille(element.tailleOctets)} — déposé le{" "}
                  {formaterDate(element.dateDepot)}
                  {element.deposeParNom ? ` par ${element.deposeParNom}` : ""}
                </div>

                {element.commentaireValidation ? (
                  <div style={{ fontSize: 11, color: "#475569", fontStyle: "italic" }}>
                    {element.commentaireValidation}
                  </div>
                ) : null}
              </div>

              <div style={{
                display: "grid",
                gap: 6,
                justifyContent: "flex-end",
                flexShrink: 0,
              }}>
                <button
                  type="button"
                  onClick={() => telecharger(element)}
                  title="Télécharger"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    color: "#334155",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  <Download size={13} /> Télécharger
                </button>

                {peutValider ? (
                  <button
                    type="button"
                    onClick={() => {
                      remplacementId.current = element.id;
                      inputRemplacement.current?.click();
                    }}
                    disabled={validationEnCours === element.id}
                    title="Remplacer ce document par une nouvelle version"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: "1px solid #93c5fd",
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <Pencil size={13} /> Modifier
                  </button>
                ) : null}

                {peutValider && !element.valide ? (
                  <>
                    <input
                      type="text"
                      value={commentaires[element.id] || ""}
                      onChange={(e) =>
                        setCommentaires((precedent) => ({
                          ...precedent,
                          [element.id]: e.target.value,
                        }))
                      }
                      placeholder="Commentaire..."
                      style={{
                        width: 150,
                        padding: "6px 8px",
                        border: "1px solid #cbd5e1",
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => valider(element, true)}
                      disabled={validationEnCours === element.id}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: 0,
                        background: "#16a34a",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      <CheckCircle2 size={13} /> Valider
                    </button>
                    <button
                      type="button"
                      onClick={() => valider(element, false)}
                      disabled={validationEnCours === element.id}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: 0,
                        background: "#dc2626",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      <XCircle size={13} /> Rejeter
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
