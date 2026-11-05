"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Search, UserRound } from "lucide-react";

export interface PersonneSelectionSurete {
  nomComplet: string;
  matricule: string;
  telephone: string;
  poste: string;
  direction: string;
  estPersonnel: boolean;
  estChauffeur: boolean;
}

interface PersonnelChauffeurAutocompleteProps {
  label: string;
  placeholder?: string;
  onSelect: (personne: PersonneSelectionSurete) => void;
  style?: CSSProperties;
  inclureChauffeurs?: boolean;
  valeurInitiale?: string;
}

interface Personnel {
  matricule?: string | number | null;
  nom?: string | null;
  prenom?: string | null;
  direction?: string | null;
  poste?: string | null;
}

interface Chauffeur {
  matricule?: string | null;
  nom?: string | null;
  prenom?: string | null;
  telephone?: string | null;
  affectationService?: string | null;
  statut?: string | null;
}

type PersonneAvecId = PersonneSelectionSurete & { id: string };

const normaliser = (valeur: string) => valeur
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("fr")
  .trim();

export default function PersonnelChauffeurAutocomplete({
  label,
  placeholder = "Tapez un nom, prénom ou matricule…",
  onSelect,
  style,
  inclureChauffeurs = true,
  valeurInitiale = "",
}: PersonnelChauffeurAutocompleteProps) {
  const api = process.env.NEXT_PUBLIC_API_URL;
  const [personnes, setPersonnes] = useState<PersonneAvecId[]>([]);
  const [recherche, setRecherche] = useState(valeurInitiale);
  const [selectionId, setSelectionId] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    let actif = true;
    const charger = async () => {
      const [personnelsResultat, chauffeursResultat] = await Promise.allSettled([
        fetch("/data/personnels.json", { cache: "no-store" }).then(async (response) => {
          if (!response.ok) throw new Error("Répertoire du personnel indisponible.");
          const data: unknown = await response.json();
          if (!Array.isArray(data)) throw new Error("Format du répertoire personnel invalide.");
          return data as Personnel[];
        }),
        (async () => {
          if (!inclureChauffeurs) return [] as Chauffeur[];
          if (!api) throw new Error("API chauffeurs non configurée.");
          const token = localStorage.getItem("token");
          if (!token) throw new Error("Session indisponible pour charger les chauffeurs.");
          const response = await fetch(`${api}/chauffeurs`, {
            headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
            cache: "no-store",
          });
          if (!response.ok) throw new Error(`Impossible de charger les chauffeurs (HTTP ${response.status}).`);
          const data: unknown = await response.json();
          if (!Array.isArray(data)) throw new Error("Format de la liste des chauffeurs invalide.");
          return data as Chauffeur[];
        })(),
      ]);

      const parCle = new Map<string, PersonneSelectionSurete>();
      if (personnelsResultat.status === "fulfilled") {
        personnelsResultat.value.forEach((personnel) => {
          const matricule = String(personnel.matricule ?? "").trim();
          const nom = String(personnel.nom ?? "").trim();
          const prenom = String(personnel.prenom ?? "").trim();
          if (!matricule && !nom && !prenom) return;
          const cle = matricule ? `m:${normaliser(matricule)}` : `n:${normaliser(`${prenom} ${nom}`)}`;
          parCle.set(cle, {
            nomComplet: `${prenom} ${nom}`.trim(),
            matricule,
            telephone: "",
            poste: String(personnel.poste ?? "").trim(),
            direction: String(personnel.direction ?? "").trim(),
            estPersonnel: true,
            estChauffeur: false,
          });
        });
      }
      if (chauffeursResultat.status === "fulfilled") {
        chauffeursResultat.value.forEach((chauffeur) => {
          const matricule = String(chauffeur.matricule ?? "").trim();
          const nom = String(chauffeur.nom ?? "").trim();
          const prenom = String(chauffeur.prenom ?? "").trim();
          if (!matricule && !nom && !prenom) return;
          const cle = matricule ? `m:${normaliser(matricule)}` : `n:${normaliser(`${prenom} ${nom}`)}`;
          const ancien = parCle.get(cle);
          parCle.set(cle, {
            nomComplet: `${prenom} ${nom}`.trim() || ancien?.nomComplet || "",
            matricule: matricule || ancien?.matricule || "",
            telephone: String(chauffeur.telephone ?? "").trim() || ancien?.telephone || "",
            poste: String(chauffeur.affectationService ?? "").trim() || ancien?.poste || "",
            direction: ancien?.direction || "",
            estPersonnel: Boolean(ancien?.estPersonnel),
            estChauffeur: true,
          });
        });
      }

      if (!actif) return;
      setPersonnes(Array.from(parCle.entries()).map(([id, personne]) => ({ ...personne, id })));
      if (personnelsResultat.status === "rejected" && chauffeursResultat.status === "rejected") {
        setErreur("Les listes du personnel et des chauffeurs sont indisponibles.");
      } else if (personnelsResultat.status === "rejected") {
        setErreur("Le répertoire du personnel est indisponible; seuls les chauffeurs seront proposés.");
      } else if (chauffeursResultat.status === "rejected") {
        setErreur("La liste des chauffeurs est indisponible; seuls les personnels seront proposés.");
      }
      setChargement(false);
    };
    void charger();
    return () => { actif = false; };
  }, [api, inclureChauffeurs]);

  const resultats = useMemo(() => {
    const terme = normaliser(recherche);
    if (!terme) return [];
    return personnes.filter((personne) => (inclureChauffeurs || personne.estPersonnel) && [
      personne.nomComplet,
      personne.matricule,
      personne.telephone,
      personne.poste,
      personne.direction,
      personne.estChauffeur ? "chauffeur" : "personnel",
    ].some((valeur) => normaliser(valeur).includes(terme)));
  }, [inclureChauffeurs, personnes, recherche]);

  const choisir = (personne: PersonneAvecId) => {
    setSelectionId(personne.id);
    setRecherche(personne.nomComplet);
    setOuvert(false);
    onSelect(personne);
  };

  const selection = personnes.find((personne) => personne.id === selectionId);

  return (
    <div style={{ position: "relative", ...style }}>
      <label style={{ display: "block", marginBottom: 6, color: "#475569", fontSize: 13, fontWeight: 700 }}>{label}</label>
      <div style={{ position: "relative" }}>
        <Search size={16} aria-hidden="true" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
        <input
          type="search"
          value={recherche}
          onFocus={() => setOuvert(true)}
          onChange={(event) => { setRecherche(event.target.value); setSelectionId(""); setOuvert(true); }}
          onKeyDown={(event) => { if (event.key === "Escape") setOuvert(false); }}
          placeholder={placeholder}
          autoComplete="off"
          aria-label={label}
          style={{ ...inputStyle, paddingLeft: 36 }}
        />
      </div>
      {selection && !ouvert && (
        <div style={{ marginTop: 6, color: "#475569", fontSize: 12 }}>
          {selection.estChauffeur ? "Chauffeur" : "Personnel"}{selection.matricule ? ` · Matricule ${selection.matricule}` : ""}
          {selection.telephone ? ` · ${selection.telephone}` : ""}
        </div>
      )}
      {ouvert && recherche.trim() && (
        <div role="radiogroup" aria-label={`Résultats : ${label}`} style={resultsStyle}>
          {resultats.length ? resultats.map((personne) => (
            <label key={personne.id} style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "9px 8px", borderRadius: 7, cursor: "pointer", background: selectionId === personne.id ? "#eff6ff" : "white" }}>
              <input type="radio" name={`choix-${label.replace(/\s+/g, "-")}`} checked={selectionId === personne.id} onChange={() => choisir(personne)} style={{ width: 15, height: 15, margin: "2px 0 0", accentColor: "#2563eb", flexShrink: 0 }} />
              <UserRound size={15} aria-hidden="true" style={{ marginTop: 2, color: "#64748b", flexShrink: 0 }} />
              <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
                <strong style={{ color: "#0f172a", fontSize: 13 }}>{personne.nomComplet || "Nom non renseigné"}</strong>
                <span style={{ color: "#64748b", fontSize: 11 }}>
                  {personne.estChauffeur ? "Chauffeur" : "Personnel"}{personne.matricule ? ` · Matricule ${personne.matricule}` : ""}{personne.poste ? ` · ${personne.poste}` : ""}
                </span>
                {personne.telephone && <span style={{ color: "#2563eb", fontSize: 11 }}>{personne.telephone}</span>}
              </span>
            </label>
          )) : (
            <div style={{ padding: 12, color: "#64748b", fontSize: 12 }}>
              {chargement ? "Chargement du personnel et des chauffeurs…" : erreur || "Aucune personne correspondante."}
            </div>
          )}
        </div>
      )}
      {erreur && <p role="status" style={{ margin: "5px 0 0", color: "#64748b", fontSize: 11 }}>{erreur}</p>}
    </div>
  );
}

const inputStyle: CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, color: "#0f172a", outlineColor: "#2563eb" };
const resultsStyle: CSSProperties = { position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, marginTop: 5, maxHeight: 280, overflowY: "auto", padding: 5, border: "1px solid #cbd5e1", borderRadius: 10, background: "white", boxShadow: "0 12px 24px rgba(15,23,42,.16)" };
