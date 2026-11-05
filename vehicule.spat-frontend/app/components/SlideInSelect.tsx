"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";

export interface SlideInSelectOption {
  value: string;
  label: string;
  detail?: string;
  disabled?: boolean;
}

interface SlideInSelectProps {
  label: string;
  title: string;
  value: string;
  options: SlideInSelectOption[];
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
  emptyMessage?: string;
}

export default function SlideInSelect({
  label,
  title,
  value,
  options,
  onChange,
  placeholder,
  disabled = false,
  loading = false,
  emptyMessage = "Aucun élément disponible.",
}: SlideInSelectProps) {
  const [ouvert, setOuvert] = useState(false);
  const [recherche, setRecherche] = useState("");
  const choix = options.find((option) => option.value === value);
  const optionsFiltrees = useMemo(() => {
    const terme = recherche.trim().toLocaleLowerCase("fr");
    if (!terme) return options;
    return options.filter((option) => `${option.label} ${option.detail || ""}`.toLocaleLowerCase("fr").includes(terme));
  }, [options, recherche]);

  useEffect(() => {
    if (!ouvert) return;
    const overflowInitial = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const fermerAvecEchap = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOuvert(false);
    };
    window.addEventListener("keydown", fermerAvecEchap);
    return () => {
      document.body.style.overflow = overflowInitial;
      window.removeEventListener("keydown", fermerAvecEchap);
    };
  }, [ouvert]);

  const fermer = () => {
    setOuvert(false);
    setRecherche("");
  };
  const panneau = ouvert && typeof document !== "undefined"
    ? createPortal(
        <div style={backdropStyle} onMouseDown={(event) => { if (event.target === event.currentTarget) fermer(); }}>
          <section role="dialog" aria-modal="true" aria-label={title} style={panelStyle}>
            <header style={headerStyle}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", color: "#2563eb", textTransform: "uppercase" }}>{label}</div>
                <h2 style={{ margin: "5px 0 0", color: "#0f172a", fontSize: 20 }}>{title}</h2>
              </div>
              <button type="button" aria-label="Fermer" onClick={fermer} style={closeButtonStyle}><X size={19} /></button>
            </header>

            <label style={searchStyle}>
              <Search size={17} color="#64748b" />
              <input
                autoFocus
                value={recherche}
                onChange={(event) => setRecherche(event.target.value)}
                placeholder="Rechercher…"
                style={searchInputStyle}
              />
            </label>

            <div style={listStyle}>
              {loading ? (
                <p style={emptyStyle}>Chargement des choix…</p>
              ) : optionsFiltrees.length ? optionsFiltrees.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  disabled={option.disabled}
                  onClick={() => { onChange(option.value); fermer(); }}
                  style={optionStyle(option.value === value, Boolean(option.disabled))}
                >
                  <span style={{ minWidth: 0, display: "grid", gap: 4, textAlign: "left" }}>
                    <strong>{option.label}</strong>
                    {option.detail && <span style={{ color: "#64748b", fontSize: 12 }}>{option.detail}</span>}
                  </span>
                  {option.disabled && <span style={{ color: "#b91c1c", fontSize: 12 }}>Indisponible</span>}
                </button>
              )) : (
                <p style={emptyStyle}>{recherche ? "Aucun résultat pour cette recherche." : emptyMessage}</p>
              )}
            </div>
          </section>
        </div>,
        document.body
      )
    : null;

  return (
    <div role="group" aria-label={label}>
      <button
        type="button"
        aria-label={`${label}: ${choix?.label || placeholder}`}
        aria-haspopup="dialog"
        aria-expanded={ouvert}
        disabled={disabled}
        onClick={() => setOuvert(true)}
        style={buttonStyle(disabled)}
      >
        <span style={{ display: "grid", gap: 3, minWidth: 0, textAlign: "left" }}>
          <span style={{ color: choix ? "#0f172a" : "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {loading ? "Chargement des choix…" : choix?.label || placeholder}
          </span>
          {choix?.detail && <span style={{ color: "#64748b", fontSize: 12 }}>{choix.detail}</span>}
        </span>
        <span aria-hidden="true" style={{ color: "#64748b", fontSize: 18 }}>›</span>
      </button>

      {panneau}
    </div>
  );
}

const buttonStyle = (disabled: boolean): CSSProperties => ({
  width: "100%", minHeight: 44, padding: "9px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
  border: "1px solid #cbd5e1", borderRadius: 8, background: disabled ? "#f1f5f9" : "#fff", color: "#0f172a", cursor: disabled ? "not-allowed" : "pointer", font: "inherit", opacity: disabled ? .72 : 1,
});

const backdropStyle: CSSProperties = {
  position: "fixed", inset: 0, zIndex: 1400, display: "flex", justifyContent: "flex-end", background: "rgba(15, 23, 42, .42)", animation: "slideInBackdrop .18s ease-out",
};

const panelStyle: CSSProperties = {
  width: "min(440px, 100vw)", height: "100%", display: "flex", flexDirection: "column", padding: 22, background: "#fff", boxShadow: "-16px 0 40px rgba(15, 23, 42, .18)", animation: "slideInRightPanel .24s cubic-bezier(.2,.8,.2,1)",
};

const headerStyle: CSSProperties = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, paddingBottom: 18, borderBottom: "1px solid #e2e8f0" };
const closeButtonStyle: CSSProperties = { width: 38, height: 38, display: "grid", placeItems: "center", border: "1px solid #e2e8f0", borderRadius: 9, background: "#fff", color: "#334155", cursor: "pointer" };
const searchStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 9, margin: "17px 0 12px", padding: "0 12px", minHeight: 42, border: "1px solid #cbd5e1", borderRadius: 8 };
const searchInputStyle: CSSProperties = { width: "100%", border: 0, outline: 0, background: "transparent", font: "inherit", color: "#0f172a" };
const listStyle: CSSProperties = { flex: 1, overflowY: "auto", display: "grid", alignContent: "start", gap: 8, padding: "2px 2px 18px" };
const emptyStyle: CSSProperties = { padding: "20px 12px", color: "#64748b", fontSize: 14, textAlign: "center" };
const optionStyle = (selected: boolean, disabled: boolean): CSSProperties => ({
  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "13px 12px", border: `1px solid ${selected ? "#93c5fd" : "#e2e8f0"}`, borderRadius: 9, background: selected ? "#eff6ff" : disabled ? "#f8fafc" : "#fff", color: disabled ? "#94a3b8" : "#0f172a", textAlign: "left", font: "inherit", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .72 : 1,
});
