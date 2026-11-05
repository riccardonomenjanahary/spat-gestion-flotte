"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";

interface NotificationPopupItem {
  id: number;
  type?: string | null;
  niveau?: string | null;
  titre?: string | null;
  message?: string | null;
  lien?: string | null;
  lu?: boolean | null;
}

export default function NotificationPopup() {
  const router = useRouter();
  const pathname = usePathname();
  const API = process.env.NEXT_PUBLIC_API_URL;
  const [notifications, setNotifications] = useState<NotificationPopupItem[]>([]);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !API) return;
    const globalWindow = window as Window & { __spatPopupNotifications?: boolean };
    if (globalWindow.__spatPopupNotifications) return;
    globalWindow.__spatPopupNotifications = true;
    mountedRef.current = true;
    let actif = true;
    let enCours = false;
    const charger = async () => {
      if (enCours) return;
      const token = localStorage.getItem("token");
      if (!token) return;
      enCours = true;
      try {
        const response = await fetch(`${API}/notifications/me?nonLuesUniquement=true`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          cache: "no-store",
        });
        if (!response.ok) return;
        const data: unknown = await response.json();
        if (actif && Array.isArray(data)) {
          const notificationsRecues = data as NotificationPopupItem[];

          const nouvelles = pathname === "/mecanicien-did"
            ? notificationsRecues.filter((notification) => String(notification.type || "").toUpperCase() !== "AVIS_DID")
            : notificationsRecues;

          setNotifications((anciennes) => {
            const anciennesPertinentes = pathname === "/mecanicien-did"
              ? anciennes.filter((notification) => String(notification.type || "").toUpperCase() !== "AVIS_DID")
              : anciennes;
            const parId = new Map(anciennesPertinentes.map((notification) => [notification.id, notification]));
            nouvelles.forEach((notification) => parId.set(notification.id, notification));
            return [...parId.values()];
          });
        }
      } catch {

      } finally {
        enCours = false;
      }
    };
    void charger();
    const timer = window.setInterval(() => { void charger(); }, 8000);
    return () => {
      actif = false;
      window.clearInterval(timer);
      if (mountedRef.current) delete globalWindow.__spatPopupNotifications;
    };
  }, [API, pathname]);

  const fermer = async (notification: NotificationPopupItem, ouvrir = false) => {
    const token = localStorage.getItem("token");
    setNotifications((ancien) => ancien.filter((item) => item.id !== notification.id));
    if (API && token) {
      await fetch(`${API}/notifications/${notification.id}/lu`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      }).catch(() => undefined);
    }
    if (ouvrir && notification.lien) {
      if (/^https?:\/\//i.test(notification.lien)) window.location.href = notification.lien;
      else router.push(notification.lien);
    }
  };

  if (!notifications.length) return null;

  const notification = notifications[0];

  return (
    <div aria-live="polite" style={{ position: "fixed", top: 82, right: 20, zIndex: 2000, width: "min(430px, calc(100vw - 32px))", pointerEvents: "none" }}>
      <article key={notification.id} style={{ pointerEvents: "auto", padding: 15, borderRadius: 12, border: "1px solid #bfdbfe", borderLeft: "4px solid #2563eb", background: "#ffffff", boxShadow: "0 12px 30px rgba(15,23,42,.18)", animation: "spat-notification-descente .28s ease-out" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, minWidth: 0 }}>
              <Bell size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ display: "block", color: "#0f172a", fontSize: 14 }}>{notification.titre || "Nouvelle notification"}</strong>
                <p style={{ margin: "6px 0 0", color: "#334155", fontSize: 13, lineHeight: 1.45 }}>{notification.message || "Une nouvelle action nécessite votre attention."}</p>
              </div>
            </div>
            <button type="button" onClick={() => void fermer(notification)} aria-label="Fermer la notification" style={{ border: 0, background: "transparent", color: "#64748b", cursor: "pointer", padding: 2 }}><X size={16} /></button>
          </div>
          {notification.lien && <button type="button" onClick={() => void fermer(notification, true)} style={{ marginTop: 10, border: 0, borderRadius: 7, padding: "7px 10px", background: "#eff6ff", color: "#1d4ed8", fontWeight: 700, cursor: "pointer" }}>Ouvrir</button>}
        </article>
      <style>{`@keyframes spat-notification-descente { from { opacity: 0; transform: translateY(-18px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
