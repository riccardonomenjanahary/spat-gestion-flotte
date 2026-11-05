"use client";

import { useEffect } from "react";
import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface SlideInPanelProps {
  open: boolean;
  eyebrow?: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export default function SlideInPanel({ open, eyebrow, title, onClose, children }: SlideInPanelProps) {
  useEffect(() => {
    if (!open) return;
    const overflowInitial = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = overflowInitial;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div style={backdropStyle} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-label={title} style={panelStyle}>
        <header style={headerStyle}>
          <div>
            {eyebrow && <div style={eyebrowStyle}>{eyebrow}</div>}
            <h2 style={titleStyle}>{title}</h2>
          </div>
          <button type="button" aria-label="Fermer" onClick={onClose} style={closeButtonStyle}><X size={19} /></button>
        </header>
        <div style={contentStyle}>{children}</div>
      </section>
    </div>,
    document.body
  );
}

const backdropStyle: CSSProperties = { position: "fixed", inset: 0, zIndex: 1450, display: "flex", justifyContent: "center", alignItems: "flex-start", overflowY: "auto", padding: "24px 16px", background: "rgba(15, 23, 42, .42)", animation: "slideInBackdrop .18s ease-out" };
const panelStyle: CSSProperties = { width: "min(760px, 100%)", maxHeight: "calc(100vh - 48px)", display: "flex", flexDirection: "column", margin: "0 auto", background: "#fff", borderRadius: 14, boxShadow: "0 24px 60px rgba(15, 23, 42, .24)", animation: "slideInTopPanel .45s cubic-bezier(.2,.8,.2,1)" };
const headerStyle: CSSProperties = { flex: "0 0 auto", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "20px 22px", borderBottom: "1px solid #e2e8f0" };
const eyebrowStyle: CSSProperties = { fontSize: 12, fontWeight: 700, letterSpacing: ".08em", color: "#2563eb", textTransform: "uppercase" };
const titleStyle: CSSProperties = { margin: "5px 0 0", color: "#0f172a", fontSize: 20 };
const closeButtonStyle: CSSProperties = { width: 38, height: 38, flex: "0 0 auto", display: "grid", placeItems: "center", border: "1px solid #e2e8f0", borderRadius: 9, background: "#fff", color: "#334155", cursor: "pointer" };
const contentStyle: CSSProperties = { flex: 1, overflowY: "auto", padding: 22 };
