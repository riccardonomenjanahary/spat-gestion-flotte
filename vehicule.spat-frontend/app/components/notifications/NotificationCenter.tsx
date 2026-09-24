"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  Info,
  X,
} from "lucide-react";

type FiltreNotification = "TOUTES" | "NON_LUES";

interface NotificationSpat {
  id: number;
  type?: string | null;
  niveau?: string | null;
  titre: string;
  message: string;
  lien?: string | null;
  reservationId?: number | null;
  maintenanceId?: number | null;
  vehiculeId?: number | null;
  lu?: boolean | null;
  dateCreation?: string | null;
  dateLecture?: string | null;
}

type NotificationCenterProps = {
  pollMs?: number;
};

export default function NotificationCenter({
  pollMs = 15000,
}: NotificationCenterProps) {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;
  const conteneurRef = useRef<HTMLDivElement | null>(null);

  const [ouvert, setOuvert] = useState(false);
  const [filtre, setFiltre] = useState<FiltreNotification>("TOUTES");
  const [notifications, setNotifications] = useState<NotificationSpat[]>([]);
  const [chargement, setChargement] = useState(false);

  const getToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  };

  const chargerNotifications = useCallback(async () => {
    if (!API) return;

    const token = getToken();
    if (!token) return;

    try {
      setChargement(true);

      const res = await fetch(`${API}/notifications/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (!res.ok) {
        console.warn("Impossible de charger les notifications :", res.status);
        return;
      }

      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.warn("Erreur chargement notifications :", error);
    } finally {
      setChargement(false);
    }
  }, [API]);

  useEffect(() => {
    chargerNotifications();

    const timer = window.setInterval(
      chargerNotifications,
      Math.max(5000, pollMs)
    );

    return () => window.clearInterval(timer);
  }, [chargerNotifications, pollMs]);

  useEffect(() => {
    const fermerSiExterieur = (event: MouseEvent) => {
      if (
        conteneurRef.current &&
        !conteneurRef.current.contains(event.target as Node)
      ) {
        setOuvert(false);
      }
    };

    document.addEventListener("mousedown", fermerSiExterieur);
    return () => document.removeEventListener("mousedown", fermerSiExterieur);
  }, []);

  const nonLues = useMemo(
    () => notifications.filter((notification) => !Boolean(notification.lu)),
    [notifications]
  );

  const compteurNonLues = nonLues.length;

  const notificationsAffichees = useMemo(() => {
    return filtre === "NON_LUES" ? nonLues : notifications;
  }, [filtre, nonLues, notifications]);

  const marquerCommeLue = async (
    notification: NotificationSpat,
    ouvrirLien = false
  ) => {
    if (!API) return;

    const token = getToken();
    if (!token) return;

    setNotifications((ancien) =>
      ancien.map((item) =>
        item.id === notification.id
          ? { ...item, lu: true, dateLecture: new Date().toISOString() }
          : item
      )
    );

    try {
      const res = await fetch(`${API}/notifications/${notification.id}/lu`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        await chargerNotifications();
      }
    } catch (error) {
      console.warn("Impossible de marquer la notification comme lue :", error);
      await chargerNotifications();
    }

    if (ouvrirLien && notification.lien) {
      setOuvert(false);

      if (
        notification.lien.startsWith("http://") ||
        notification.lien.startsWith("https://")
      ) {
        window.location.href = notification.lien;
        return;
      }

      router.push(notification.lien);
    }
  };

  const toutLire = async () => {
    if (!API || compteurNonLues === 0) return;

    const token = getToken();
    if (!token) return;

    setNotifications((ancien) =>
      ancien.map((item) => ({
        ...item,
        lu: true,
        dateLecture: item.dateLecture || new Date().toISOString(),
      }))
    );

    try {
      const res = await fetch(`${API}/notifications/tout-lire`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        await chargerNotifications();
      }
    } catch (error) {
      console.warn("Impossible de tout marquer comme lu :", error);
      await chargerNotifications();
    }
  };

  return (
    <>
      <style jsx global>{`
        @keyframes spatNotifBadgePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }

        /*
         * Sonnerie réaliste de cloche (balancement pendulaire)
         * lorsqu'il existe au moins une notification non lue.
         */
        @keyframes spatNotifBellRing {
          0%, 100% { transform: rotate(0deg); }
          12% { transform: rotate(26deg); }
          24% { transform: rotate(-24deg); }
          36% { transform: rotate(20deg); }
          48% { transform: rotate(-16deg); }
          60% { transform: rotate(10deg); }
          72% { transform: rotate(-6deg); }
          84% { transform: rotate(2deg); }
        }

        @keyframes spatNotifButtonGlow {
          0%, 100% {
            box-shadow: 0 1px 2px rgba(15,23,42,0.03);
          }
          50% {
            box-shadow:
              0 0 0 4px rgba(220,38,38,0.12),
              0 4px 16px rgba(220,38,38,0.18);
          }
        }

        @keyframes spatNotifPanelIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes spatNotifItemIn {
          from { opacity: 0; transform: translateX(8px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .spat-notification-panel {
          animation: spatNotifPanelIn 180ms ease-out both;
        }

        .spat-notification-item {
          animation: spatNotifItemIn 220ms ease-out both;
        }

        .spat-notification-badge {
          animation: spatNotifBadgePulse 1.7s ease-in-out infinite;
        }

        .spat-notification-bell-heartbeat {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #dc2626;
          transform-origin: 50% 0%;
          animation: spatNotifBellRing 1.2s ease-in-out infinite;
        }

        .spat-notification-bell-heartbeat svg {
          transform-origin: 50% 0%;
        }

        .spat-notification-button-alert {
          border-color: #dc2626 !important;
          background: #fff7f7 !important;
          color: #dc2626 !important;
          animation: spatNotifButtonGlow 1.45s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .spat-notification-panel,
          .spat-notification-item,
          .spat-notification-badge,
          .spat-notification-bell-heartbeat,
          .spat-notification-button-alert {
            animation: none !important;
          }
        }

        @media (max-width: 700px) {
          .spat-notification-panel {
            position: fixed !important;
            top: 72px !important;
            left: 10px !important;
            right: 10px !important;
            width: auto !important;
            max-height: calc(100vh - 84px) !important;
          }
        }
      `}</style>

      <div ref={conteneurRef} style={conteneurStyle}>
        <button
          type="button"
          onClick={() => setOuvert((ancien) => !ancien)}
          aria-label={
            compteurNonLues > 0
              ? `Notifications — ${compteurNonLues} non lue${compteurNonLues > 1 ? "s" : ""}`
              : "Notifications"
          }
          aria-expanded={ouvert}
          title={
            compteurNonLues > 0
              ? `${compteurNonLues} notification${compteurNonLues > 1 ? "s" : ""} non lue${compteurNonLues > 1 ? "s" : ""}`
              : "Notifications"
          }
          className={
            compteurNonLues > 0
              ? "spat-notification-button-alert"
              : undefined
          }
          style={{
            ...boutonClocheStyle,
            borderColor: "#dc2626",
            color: "#dc2626",
          }}
        >
          <span
            className={
              compteurNonLues > 0
                ? "spat-notification-bell-heartbeat"
                : undefined
            }
          >
            <Bell size={22} />
          </span>

          {compteurNonLues > 0 && (
            <span className="spat-notification-badge" style={badgeStyle}>
              {compteurNonLues > 99 ? "99+" : compteurNonLues}
            </span>
          )}
        </button>

        {ouvert && (
          <div className="spat-notification-panel" style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div style={headerGaucheStyle}>
                <div style={grandeIconeStyle}>
                  <Bell size={21} />
                </div>

                <div>
                  <div style={titreStyle}>Notifications</div>
                  <div style={sousTitreStyle}>
                    {compteurNonLues} alerte{compteurNonLues > 1 ? "s" : ""} non lue
                    {compteurNonLues > 1 ? "s" : ""}
                  </div>
                </div>
              </div>

              <div style={headerActionsStyle}>
                <button
                  type="button"
                  onClick={toutLire}
                  disabled={compteurNonLues === 0}
                  style={{
                    ...toutLireStyle,
                    opacity: compteurNonLues === 0 ? 0.45 : 1,
                    cursor: compteurNonLues === 0 ? "default" : "pointer",
                  }}
                >
                  <CheckCheck size={17} />
                  Tout lire
                </button>

                <button
                  type="button"
                  onClick={() => setOuvert(false)}
                  aria-label="Fermer"
                  title="Fermer"
                  style={fermerStyle}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div style={filtresStyle}>
              <FiltreBouton
                actif={filtre === "TOUTES"}
                onClick={() => setFiltre("TOUTES")}
              >
                Toutes
              </FiltreBouton>

              <FiltreBouton
                actif={filtre === "NON_LUES"}
                onClick={() => setFiltre("NON_LUES")}
              >
                Non lues
                {compteurNonLues > 0 && (
                  <span style={petitBadgeStyle}>{compteurNonLues}</span>
                )}
              </FiltreBouton>
            </div>

            <div style={listeStyle}>
              {chargement && notifications.length === 0 ? (
                <div style={videStyle}>Chargement...</div>
              ) : notificationsAffichees.length === 0 ? (
                <div style={videStyle}>
                  <Bell size={28} style={{ marginBottom: 8, opacity: 0.45 }} />
                  <strong>Aucune notification</strong>
                  <span>Vous êtes à jour.</span>
                </div>
              ) : (
                notificationsAffichees.map((notification, index) => {
                  const theme = themePourNiveau(notification.niveau);

                  return (
                    <div
                      key={notification.id}
                      className="spat-notification-item"
                      style={{
                        ...notificationStyle,
                        backgroundColor: notification.lu ? "#ffffff" : "#f8fbff",
                        animationDelay: `${Math.min(index * 35, 180)}ms`,
                      }}
                    >
                      {!notification.lu && (
                        <span
                          style={{
                            ...pointNonLuStyle,
                            backgroundColor: theme.accent,
                          }}
                        />
                      )}

                      <div
                        style={{
                          ...iconeNotificationStyle,
                          backgroundColor: theme.bg,
                          color: theme.accent,
                          borderColor: theme.border,
                        }}
                      >
                        {iconePourNiveau(notification.niveau)}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={typeStyle}>{libelleType(notification.type)}</div>

                        <div style={ligneTitreStyle}>
                          <strong style={titreNotificationStyle}>
                            {notification.titre}
                          </strong>
                          <span style={dateStyle}>
                            {formatTempsRelatif(notification.dateCreation)}
                          </span>
                        </div>

                        <p style={messageStyle}>{notification.message}</p>

                        <div style={actionsNotificationStyle}>
                          {notification.lien ? (
                            <button
                              type="button"
                              onClick={() => marquerCommeLue(notification, true)}
                              style={consulterStyle}
                            >
                              Consulter
                              <ChevronRight size={16} />
                            </button>
                          ) : (
                            <span />
                          )}

                          {!notification.lu && (
                            <button
                              type="button"
                              onClick={() => marquerCommeLue(notification, false)}
                              title="Marquer comme lue"
                              aria-label="Marquer comme lue"
                              style={actionIconeStyle}
                            >
                              <Check size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={footerStyle}>
              <span>Centre de notifications SPAT</span>
              <button
                type="button"
                onClick={chargerNotifications}
                style={actualiserStyle}
              >
                Actualiser
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function FiltreBouton({
  actif,
  onClick,
  children,
}: {
  actif: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...filtreBoutonStyle,
        backgroundColor: actif ? "#dc2626" : "#ffffff",
        color: actif ? "#ffffff" : "#475569",
        borderColor: actif ? "#dc2626" : "#dbe4f0",
      }}
    >
      {children}
    </button>
  );
}

function themePourNiveau(niveau?: string | null) {
  switch (String(niveau || "INFO").toUpperCase()) {
    case "URGENT":
      return { accent: "#dc2626", border: "#fecaca", bg: "#fef2f2" };
    case "IMPORTANT":
      return { accent: "#d97706", border: "#fde68a", bg: "#fffbeb" };
    case "SUCCES":
      return { accent: "#16a34a", border: "#bbf7d0", bg: "#f0fdf4" };
    default:
      return { accent: "#dc2626", border: "#fecaca", bg: "#fef2f2" };
  }
}

function iconePourNiveau(niveau?: string | null) {
  switch (String(niveau || "INFO").toUpperCase()) {
    case "URGENT":
    case "IMPORTANT":
      return <AlertTriangle size={18} />;
    case "SUCCES":
      return <CheckCircle2 size={18} />;
    default:
      return <Info size={18} />;
  }
}

function libelleType(type?: string | null) {
  if (!type) return "SYSTÈME";
  return type.replaceAll("_", " ").trim().toUpperCase();
}

function formatTempsRelatif(date?: string | null) {
  if (!date) return "";

  const valeur = new Date(date);
  if (Number.isNaN(valeur.getTime())) return "";

  const diff = Date.now() - valeur.getTime();
  const minutes = Math.max(0, Math.floor(diff / (1000 * 60)));

  if (minutes < 1) return "À l’instant";
  if (minutes < 60) return `Il y a ${minutes} min`;

  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `Il y a ${heures} h`;

  const jours = Math.floor(heures / 24);
  if (jours < 7) return `Il y a ${jours} j`;

  return valeur.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const conteneurStyle: CSSProperties = {
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
};

const boutonClocheStyle: CSSProperties = {
  position: "relative",
  width: 48,
  height: 48,
  border: "2px solid #dc2626",
  borderRadius: 14,
  backgroundColor: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "all 160ms ease",
  boxShadow: "0 0 0 1px rgba(220,38,38,0.08), 0 2px 6px rgba(15,23,42,0.05)",
};

const badgeStyle: CSSProperties = {
  position: "absolute",
  top: -7,
  right: -6,
  minWidth: 23,
  height: 23,
  padding: "0 6px",
  borderRadius: 999,
  backgroundColor: "#dc2626",
  color: "#ffffff",
  border: "2px solid #ffffff",
  fontSize: 12,
  fontWeight: 800,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1,
};

const panelStyle: CSSProperties = {
  position: "absolute",
  top: 58,
  right: 0,
  zIndex: 5000,
  width: 605,
  maxWidth: "calc(100vw - 30px)",
  maxHeight: 680,
  backgroundColor: "#ffffff",
  border: "1px solid #dfe7f1",
  borderRadius: 18,
  overflow: "hidden",
  boxShadow: "0 22px 70px rgba(15,23,42,0.18)",
};

const panelHeaderStyle: CSSProperties = {
  minHeight: 100,
  padding: "18px 20px",
  borderBottom: "1px solid #e8eef5",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
};

const headerGaucheStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
};

const grandeIconeStyle: CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 13,
  backgroundColor: "#fef2f2",
  color: "#dc2626",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const titreStyle: CSSProperties = {
  color: "#172033",
  fontSize: 21,
  fontWeight: 800,
};

const sousTitreStyle: CSSProperties = {
  marginTop: 4,
  color: "#71809a",
  fontSize: 13,
};

const headerActionsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const toutLireStyle: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#dc2626",
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 13,
  fontWeight: 700,
};

const fermerStyle: CSSProperties = {
  width: 34,
  height: 34,
  border: "none",
  borderRadius: 8,
  backgroundColor: "transparent",
  color: "#94a3b8",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const filtresStyle: CSSProperties = {
  padding: "13px 16px",
  borderBottom: "1px solid #edf2f7",
  backgroundColor: "#fbfdff",
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const filtreBoutonStyle: CSSProperties = {
  minHeight: 36,
  padding: "7px 16px",
  border: "1px solid #dbe4f0",
  borderRadius: 11,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
  transition: "all 150ms ease",
};

const petitBadgeStyle: CSSProperties = {
  minWidth: 23,
  height: 23,
  padding: "0 6px",
  borderRadius: 999,
  backgroundColor: "#ffe3e8",
  color: "#dc526d",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  fontWeight: 800,
};

const listeStyle: CSSProperties = {
  maxHeight: 470,
  overflowY: "auto",
};

const notificationStyle: CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "flex-start",
  gap: 14,
  padding: "18px 18px",
  borderBottom: "1px solid #edf2f7",
  transition: "background-color 150ms ease",
};

const pointNonLuStyle: CSSProperties = {
  position: "absolute",
  left: 0,
  top: 30,
  width: 5,
  height: 5,
  borderRadius: "50%",
};

const iconeNotificationStyle: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 13,
  border: "1px solid #fecaca",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const typeStyle: CSSProperties = {
  color: "#94a3b8",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.04em",
  marginBottom: 5,
};

const ligneTitreStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
};

const titreNotificationStyle: CSSProperties = {
  color: "#172033",
  fontSize: 14,
  lineHeight: 1.35,
};

const dateStyle: CSSProperties = {
  color: "#94a3b8",
  fontSize: 11,
  whiteSpace: "nowrap",
};

const messageStyle: CSSProperties = {
  margin: "5px 0 0",
  color: "#71809a",
  fontSize: 12.5,
  lineHeight: 1.55,
  whiteSpace: "pre-line",
};

const actionsNotificationStyle: CSSProperties = {
  marginTop: 9,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
};

const consulterStyle: CSSProperties = {
  padding: 0,
  border: "none",
  background: "transparent",
  color: "#dc2626",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
  textDecoration: "underline",
  textUnderlineOffset: "2px",
};

const actionIconeStyle: CSSProperties = {
  width: 30,
  height: 30,
  border: "none",
  borderRadius: 8,
  backgroundColor: "transparent",
  color: "#8ea0ba",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const videStyle: CSSProperties = {
  minHeight: 190,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  color: "#94a3b8",
  fontSize: 13,
  padding: 24,
};

const footerStyle: CSSProperties = {
  minHeight: 54,
  padding: "12px 18px",
  borderTop: "1px solid #e8eef5",
  backgroundColor: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  color: "#64748b",
  fontSize: 12,
  fontWeight: 600,
};

const actualiserStyle: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#dc2626",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
};
