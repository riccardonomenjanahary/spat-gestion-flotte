"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Search, UserRound } from "lucide-react";

export interface PersonnelSelection {
  matricule: string;
  nom: string;
  prenom: string;
  direction: string;
  poste: string;
  categorie: string;
  email?: string | null;
}

interface PersonnelAutocompleteProps {
  onSelect: (personnel: PersonnelSelection) => void;
  onClear?: () => void;
  emailsParMatricule?: Record<string, string>;
  label?: string;
  placeholder?: string;
  style?: CSSProperties;
  afficherFiltresRecherche?: boolean;
}

type ChampRecherche = "tous" | "nom" | "prenom" | "matricule" | "email";

const normaliser = (valeur: string) =>
  valeur
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .trim();

let chargementPersonnels: Promise<PersonnelSelection[]> | null = null;

function chargerPersonnels(): Promise<PersonnelSelection[]> {
  if (!chargementPersonnels) {
    chargementPersonnels = fetch("/data/personnels.json", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Répertoire indisponible");
        return response.json() as Promise<PersonnelSelection[]>;
      })
      .catch((error) => {
        chargementPersonnels = null;
        throw error;
      });
  }
  return chargementPersonnels;
}

export default function PersonnelAutocomplete({
  onSelect,
  onClear,
  emailsParMatricule,
  label = "Personnel",
  placeholder = "Tapez un nom, matricule ou poste...",
  style,
  afficherFiltresRecherche = false,
}: PersonnelAutocompleteProps) {
  const id = useId();
  const [personnels, setPersonnels] = useState<PersonnelSelection[]>([]);
  const [recherche, setRecherche] = useState("");
  const [selection, setSelection] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [indisponible, setIndisponible] = useState(false);
  const [champRecherche, setChampRecherche] = useState<ChampRecherche>("tous");

  const emailPourPersonnel = (personnel: PersonnelSelection) =>
    emailsParMatricule?.[personnel.matricule.trim()]?.trim() || personnel.email?.trim() || "";

  useEffect(() => {
    let actif = true;
    chargerPersonnels()
      .then((donnees) => {
        if (actif) setPersonnels(donnees);
      })
      .catch(() => {
        if (actif) setIndisponible(true);
      })
      .finally(() => {
        if (actif) setChargement(false);
      });
    return () => {
      actif = false;
    };
  }, []);

  const resultats = useMemo(() => {
    const terme = normaliser(recherche);
    if (!terme) return [];
    return personnels.filter((personnel) => {
      const email = emailPourPersonnel(personnel);
      if (afficherFiltresRecherche) {
        const valeurs = champRecherche === "tous"
          ? [personnel.nom, personnel.prenom, personnel.matricule, email]
          : [champRecherche === "email" ? email : personnel[champRecherche]];
        return valeurs.some((valeur) => normaliser(valeur || "").includes(terme));
      }
      return [personnel.matricule, personnel.nom, personnel.prenom, personnel.direction, personnel.poste, personnel.categorie, email]
        .some((valeur) => normaliser(valeur || "").includes(terme));
    });
  }, [afficherFiltresRecherche, champRecherche, emailsParMatricule, personnels, recherche]);

  const choisir = (personnel: PersonnelSelection) => {
    setSelection(personnel.matricule);
    setRecherche(`${personnel.prenom} ${personnel.nom}`.trim());
    setOuvert(false);
    onSelect({
      ...personnel,
      email: emailPourPersonnel(personnel),
    });
  };

  return (
    <div style={{ position: "relative", ...style }}>
      <label
        htmlFor={`${id}-search`}
        style={{ display: "block", marginBottom: 6, color: "#475569", fontSize: 12, fontWeight: 700 }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <Search
          size={16}
          aria-hidden="true"
          style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#64748b" }}
        />
        <input
          id={`${id}-search`}
          type="search"
          value={recherche}
          onFocus={() => setOuvert(true)}
          onChange={(event) => {
            setRecherche(event.target.value);
            setSelection("");
            onClear?.();
            setOuvert(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOuvert(false);
          }}
          placeholder={placeholder}
          autoComplete="off"
          aria-controls={`${id}-results`}
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px 10px 36px", border: "1px solid #cbd5e1", borderRadius: 8, color: "#0f172a", outlineColor: "#2563eb" }}
        />
      </div>
      {afficherFiltresRecherche && (
        <div role="radiogroup" aria-label="Rechercher le personnel par" style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
          {([
            ["tous", "Tous les champs"],
            ["nom", "Nom"],
            ["prenom", "Prénom"],
            ["matricule", "Matricule"],
            ["email", "Email"],
          ] as const).map(([valeur, libelle]) => (
            <label key={valeur} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#475569", fontSize: 12, cursor: "pointer" }}>
              <input
                type="radio"
                name={`${id}-champ-recherche`}
                value={valeur}
                checked={champRecherche === valeur}
                onChange={() => setChampRecherche(valeur)}
                style={{ width: 14, height: 14, margin: 0, padding: 0, border: 0, background: "transparent", appearance: "auto", accentColor: "#2563eb" }}
              />
              {libelle}
            </label>
          ))}
        </div>
      )}
      {ouvert && recherche.trim() && (
        <div
          id={`${id}-results`}
          role="radiogroup"
          aria-label="Résultats du personnel"
          style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 30, marginTop: 5, minWidth: "min(460px, calc(100vw - 40px))", maxWidth: "calc(100vw - 40px)", maxHeight: 260, overflowY: "auto", padding: 5, border: "1px solid #cbd5e1", borderRadius: 10, background: "white", boxShadow: "0 12px 24px rgba(15,23,42,.16)" }}
        >
          {resultats.length ? resultats.map((personnel) => (
            <label
              key={`${personnel.matricule}-${personnel.nom}`}
              style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "9px 8px", borderRadius: 7, cursor: "pointer", background: selection === personnel.matricule ? "#eff6ff" : "white" }}
            >
              <input
                type="radio"
                name={`${id}-personnel`}
                checked={selection === personnel.matricule}
                onChange={() => choisir(personnel)}
                aria-label={`Sélectionner ${personnel.prenom} ${personnel.nom}, matricule ${personnel.matricule}`}
                style={{ width: 14, height: 14, marginTop: 2, padding: 0, border: 0, background: "transparent", appearance: "auto", accentColor: "#2563eb", flexShrink: 0 }}
              />
              <UserRound size={15} aria-hidden="true" style={{ marginTop: 2, color: "#64748b", flexShrink: 0 }} />
              <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
                <strong style={{ color: "#0f172a", fontSize: 13 }}>{personnel.prenom} {personnel.nom}</strong>
                <span style={{ color: "#64748b", fontSize: 11 }}>
                  Matricule {personnel.matricule} · {personnel.poste || personnel.direction || "Poste non renseigné"}
                </span>
                {emailPourPersonnel(personnel) && (
                  <span style={{ color: "#2563eb", fontSize: 11 }}>
                    {emailPourPersonnel(personnel)}
                  </span>
                )}
              </span>
            </label>
          )) : (
            <div style={{ padding: 12, color: "#64748b", fontSize: 12 }}>
              {chargement ? "Chargement du personnel..." : indisponible ? "Répertoire du personnel indisponible." : "Aucun personnel correspondant."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
