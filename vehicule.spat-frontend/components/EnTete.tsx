"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { User, LogOut } from "lucide-react";

function decoderToken(token: string): { role?: string; matricule?: string } {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return { role: payload.role, matricule: payload.sub };
  } catch {
    return {};
  }
}

export default function EnTete() {
  const router = useRouter();
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [profilOuvert, setProfilOuvert] = useState(false);
  const [infos, setInfos] = useState<{ role?: string; matricule?: string }>({});
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) setInfos(decoderToken(token));
  }, []);

  useEffect(() => {
    function gererClicExterieur(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOuvert(false);
      }
    }
    document.addEventListener("mousedown", gererClicExterieur);
    return () => document.removeEventListener("mousedown", gererClicExterieur);
  }, []);

  const deconnexion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    router.push("/login");
  };

  return (
    <>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 32px",
          backgroundColor: "white",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <Image
          src="/logo.png"
          alt="SPAT"
          width={120}
          height={40}
          style={{ objectFit: "contain", height: 40, width: "auto" }}
        />

        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOuvert((v) => !v)}
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "1px solid #e5e7eb",
              padding: 0,
              cursor: "pointer",
              overflow: "hidden",
              backgroundColor: "#f3f4f6",
            }}
            aria-label="Menu profil"
          >
            <Image
              src="/icon.png"
              alt="Profil"
              width={40}
              height={40}
              style={{ objectFit: "cover", width: 40, height: 40 }}
            />
          </button>

          {menuOuvert && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 48,
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                minWidth: 190,
                overflow: "hidden",
                zIndex: 100,
              }}
            >
              <button
                onClick={() => {
                  setProfilOuvert(true);
                  setMenuOuvert(false);
                }}
                style={itemStyle}
              >
                <User size={16} />
                Infos profil
              </button>
              <button onClick={deconnexion} style={{ ...itemStyle, color: "#dc2626" }}>
                <LogOut size={16} />
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </header>

      {profilOuvert && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div style={{ backgroundColor: "white", borderRadius: 12, padding: 28, width: 340 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 18, color: "#111827" }}>Mon profil</h3>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 6px" }}>
              Matricule : <strong style={{ color: "#111827" }}>{infos.matricule || "—"}</strong>
            </p>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px" }}>
              Rôle : <strong style={{ color: "#111827" }}>{infos.role || "—"}</strong>
            </p>
            <button
              onClick={() => setProfilOuvert(false)}
              style={{
                width: "100%",
                padding: "10px 16px",
                backgroundColor: "#111827",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const itemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: "10px 14px",
  border: "none",
  background: "none",
  textAlign: "left",
  fontSize: 13,
  cursor: "pointer",
  color: "#374151",
};