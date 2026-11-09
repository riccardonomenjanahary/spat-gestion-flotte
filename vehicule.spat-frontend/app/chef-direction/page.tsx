
"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import EnTete from "@/components/EnTete";
import IncidentSignalementButton from "@/components/IncidentSignalementButton";
import RoleGuard from "@/components/RoleGuard";
import CreationMissionHorsVille from "@/components/CreationMissionHorsVille";
import { HabilitationsMotoValidation } from "@/components/HabilitationMoto";
import AvisIndisponibiliteButton from "@/components/AvisIndisponibiliteButton";
import { ROLES } from "@/app/lib/roles";
import { exportCsv, formatDateHeureExport } from "@/app/lib/exportUtils";

import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  History,
  Map as MapIcon,
  Pencil,
  Plus,
  Search,
  X,
  XCircle,
} from "lucide-react";

import CarteGpsDirection from "@/components/CarteGpsDirection";
import NotificationsVehiculesPartages from "@/components/NotificationsVehiculesPartages";

type TypeDemande = "PLANIFIEE" | "TARDIVE" | "URGENTE";
type Mobilisabilite = "FLEXIBLE" | "VERROUILLEE";
type ZoneMission = "VILLE_TOAMASINA" | "HORS_TOAMASINA";

interface VehiculeResume {
  id: number;
  immatriculation?: string | null;
  marque?: string | null;
  modele?: string | null;
  modeleType?: string | null;
  categorie?: string | null;
  typeVehicule?: string | null;
  affectation?: string | null;
  statut?: string | null;
}

interface ChauffeurResume {
  id: number;
  matricule?: string | null;
  nom?: string | null;
  prenom?: string | null;
  telephone?: string | null;
  statut?: string | null;
}

interface Reservation {
  id: number;
  dateDebut: string;
  dateFin: string;
  motif: string;
  demandeUrgente: boolean;
  motifUrgence?: string | null;
  typeDemande?: TypeDemande | null;
  horsDelai24h?: boolean | null;
  mobilisabilite?: Mobilisabilite | null;
  zoneMission?: ZoneMission | null;
  statut: string;
  dateCreation: string;

  demandeur?: {
    nomComplet?: string | null;
    matricule?: string | null;
    role?: string | null;
    email?: string | null;
  } | null;

  demandeurNom?: string | null;
  demandeurPrenom?: string | null;
  demandeurMatricule?: string | null;
  demandeurEntite?: string | null;
  demandeurTelephone?: string | null;

  destination?: string | null;
  pointDepart?: string | null;
  nombrePassagers?: number | null;
  listePassagers?: string | null;

  typeVehiculeSouhaite?: string | null;
  besoinChauffeur?: boolean | null;
  observations?: string | null;

  vehicule?: VehiculeResume | null;
  chauffeur?: ChauffeurResume | null;
}

const statutStyle: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  EN_ATTENTE: {
    bg: "#fef3c7",
    text: "#92400e",
    label: "Prévue",
  },
  EN_ATTENTE_AVIS_DID: {
    bg: "#e0f2fe",
    text: "#075985",
    label: "Avis DID",
  },
  VALIDEE_N1: {
    bg: "#ede9fe",
    text: "#6d28d9",
    label: "Planifiée",
  },
  VALIDEE: {
    bg: "#dcfce7",
    text: "#166534",
    label: "Planifiée",
  },
  REFUSEE: {
    bg: "#fee2e2",
    text: "#991b1b",
    label: "Refusée",
  },
};

export default function ChefDirectionPage() {
  return (
    <RoleGuard roles={[ROLES.CHEF_DIRECTION, ROLES.AGENT_PAR_INTERIM_CHEF]}>
      <ChefDirectionContent />
    </RoleGuard>
  );
}

function ChefDirectionContent() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);
  const [missionSelectionnee, setMissionSelectionnee] = useState<Reservation | null>(null);
  const [historiqueOuvert, setHistoriqueOuvert] = useState(false);
  const [dateCalendrier, setDateCalendrier] = useState(() => new Date());

  const [modalOuverte, setModalOuverte] = useState(false);

  const [carteGpsOuverte, setCarteGpsOuverte] = useState(false);


  const getToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  };

  const chargerDonnees = async () => {
    const token = getToken();

    if (!API) {
      setErreurChargement("NEXT_PUBLIC_API_URL n'est pas configurée.");
      toast.error("NEXT_PUBLIC_API_URL n'est pas configurée");
      setChargement(false);
      return;
    }

    if (!token) {
      router.replace("/login");
      return;
    }

    setChargement(true);
    setErreurChargement(null);

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      };

      const res = await fetch(`${API}/reservations`, { method: "GET", headers, cache: "no-store" });

      if (res.status === 401) {
        toast.error("Votre session a expiré");
        router.replace("/login");
        return;
      }

      if (res.status === 403) {
        toast.error(
          "Vous n'avez pas l'autorisation d'accéder à ces données."
        );
        return;
      }

      if (!res.ok) {
        throw new Error(
          (await lireErreur(res)) || "Impossible de charger les tickets"
        );
      }

      const data: unknown = await res.json();
      if (!Array.isArray(data)) throw new Error("Format de réponse missions invalide.");
      setReservations(data as Reservation[]);

    } catch (error) {
      setReservations([]);
      setErreurChargement(error instanceof Error ? error.message : "Missions indisponibles.");
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de charger les données"
      );
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void chargerDonnees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ouvrirModal = () => setModalOuverte(true);

  const totalDemandes = reservations.length;

  const enAttente = reservations.filter(
    (r) => r.statut === "EN_ATTENTE"
  ).length;

  const validees = reservations.filter(
    (r) => r.statut === "VALIDEE"
  ).length;

  const refusees = reservations.filter(
    (r) => r.statut === "REFUSEE"
  ).length;

  const missionsCalendrier = useMemo(
    () => reservations,
    [reservations]
  );
  const missionsParJourCalendrier = useMemo(() => {
    const parJour = new Map<string, Reservation[]>();
    missionsCalendrier.forEach((mission) => {
      const dateDebut = new Date(mission.dateDebut);
      if (Number.isNaN(dateDebut.getTime())) return;
      const cle = cleJourCalendrier(dateDebut);
      const missions = parJour.get(cle);
      if (missions) missions.push(mission);
      else parJour.set(cle, [mission]);
    });
    return parJour;
  }, [missionsCalendrier]);

  const historiqueDuMois = useMemo(
    () => reservations
      .filter((mission) => mission.statut === "CLOTUREE" && missionDansMois(mission, dateCalendrier))
      .sort((a, b) => new Date(b.dateDebut).getTime() - new Date(a.dateDebut).getTime()),
    [reservations, dateCalendrier]
  );

  const exporterHistoriqueDuMois = () => {
    exportCsv({
      titre: "Historique des missions clôturées",
      nomFichier: `historique_missions_${titreCalendrier}`,
      sousTitre: titreCalendrier,
      donnees: historiqueDuMois,
      colonnes: [
        { header: "Ticket", value: (mission) => `TKT-${String(mission.id).padStart(5, "0")}` },
        { header: "Demandeur", value: (mission) => [mission.demandeurPrenom, mission.demandeurNom].filter(Boolean).join(" ") || mission.demandeur?.nomComplet || "—" },
        { header: "Entité", value: (mission) => mission.demandeurEntite || "—" },
        { header: "Motif", value: (mission) => mission.motif || "—" },
        { header: "Date de départ", value: (mission) => formatDateHeureExport(mission.dateDebut) },
        { header: "Retour prévu", value: (mission) => formatDateHeureExport(mission.dateFin) },
        { header: "Point de départ", value: (mission) => mission.pointDepart || "—" },
        { header: "Destination", value: (mission) => mission.destination || "—" },
        { header: "Véhicule demandé", value: (mission) => mission.typeVehiculeSouhaite || "—" },
        { header: "Passagers", key: "listePassagers" },
      ],
    });
    toast.success("Historique exporté au format CSV.");
  };

  const joursCalendrier = useMemo(
    () => obtenirJoursCalendrier(dateCalendrier),
    [dateCalendrier]
  );

  const titreCalendrier = dateCalendrier.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });


  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
        }

        input,
        textarea,
        select {
          color: #111827;
          background-color: #ffffff;
          font-family: inherit;
          font-size: 14px;
        }

        input:focus,
        textarea:focus,
        select:focus {
          outline: 2px solid #dc2626;
          outline-offset: 1px;
          border-color: #dc2626 !important;
        }

        textarea {
          resize: vertical;
        }

        button {
          font-family: inherit;
        }

        .ligne-demande {
          transition: background-color 0.18s ease;
        }

        .ligne-demande:hover {
          background-color: #f8fafc !important;
        }

        .bouton-vert:hover:not(:disabled) {
          background-color: #15803d !important;
        }

        .bouton-bleu:hover:not(:disabled) {
          background-color: #1d4ed8 !important;
        }

        .bouton-rouge:hover:not(:disabled) {
          background-color: #b91c1c !important;
        }

        @media (max-width: 950px) {
          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .form-grid {
            grid-template-columns: 1fr !important;
          }

          .passager-ligne {
            grid-template-columns: 1fr !important;
          }

        }

        @media (max-width: 600px) {
          .page-container {
            padding: 18px !important;
          }

          .stats-grid {
            grid-template-columns: 1fr !important;
          }

          .header-page {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .header-page .bouton-nouvelle {
            justify-content: center !important;
          }

          .modal-container {
            padding: 0 !important;
            align-items: flex-end !important;
          }

          .modal-content {
            max-height: 95vh !important;
            border-radius: 14px 14px 0 0 !important;
          }
        }
      `}</style>

      <EnTete afficherNotifications={false} />
      <div style={{ display: "flex", justifyContent: "flex-end", margin: "12px 24px 0" }}><IncidentSignalementButton role={ROLES.CHEF_DIRECTION} /></div>
      {erreurChargement && <div role="alert" style={{ margin: "12px 24px", padding: 12, background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 8 }}>La liste des missions n’a pas été synchronisée : {erreurChargement}.</div>}

      <div
        className="page-container"
        style={{
          minHeight: "calc(100vh - 66px)",
          backgroundColor: "#f3f4f6",
          padding: 32,
        }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>

          <div
            className="header-page"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 20,
              marginBottom: 24,
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#172033",
                }}
              >
                Chef de Direction
              </h1>

            </div>
            <AvisIndisponibiliteButton />
            <HabilitationsMotoValidation />

          </div>

          <div
            className="stats-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <StatCard
              titre="Tickets de ma direction"
              valeur={chargement ? "…" : totalDemandes}
              icone={<FileText size={21} color="#2563eb" />}
            />

            <StatCard
              titre="En attente"
              valeur={chargement ? "…" : enAttente}
              icone={<Clock3 size={21} color="#d97706" />}
            />

            <StatCard
              titre="Validés"
              valeur={chargement ? "…" : validees}
              icone={<CheckCircle2 size={21} color="#16a34a" />}
            />

            <StatCard
              titre="Refusés"
              valeur={chargement ? "…" : refusees}
              icone={<XCircle size={21} color="#dc2626" />}
            />
          </div>

          <section aria-label="Calendrier des missions de la direction" style={{ ...rechercheCardStyle, marginBottom: 24 }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <h2 style={{ margin: 0, fontSize: 18, color: "#111827" }}>Calendrier des missions</h2>
                <button
                  type="button"
                  className="btn-spat btn-rouge bouton-nouvelle"
                  onClick={ouvrirModal}
                >
                  <Plus size={18} />
                  Nouvelle mission
                </button>
                <button
                  type="button"
                  onClick={() => setHistoriqueOuvert(true)}
                  aria-label={`Voir l'historique des missions de ${titreCalendrier}`}
                  style={boutonSecondaire}
                >
                  <History size={17} />
                  Historique du mois ({historiqueDuMois.length})
                </button>
                <button
                  type="button"
                  className="btn-spat btn-vert"
                  onClick={() => setCarteGpsOuverte(true)}
                  style={{
                    ...boutonSecondaire,
                    backgroundColor: "#16a34a",
                    color: "#ffffff",
                  }}
                  title="Suivre les véhicules mutualisés équipés GPS"
                >
                  <MapIcon size={17} />
                  Carte GPS
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <button type="button" aria-label="Mois précédent" title="Mois précédent"
                  onClick={() => setDateCalendrier((date) => decalerDateCalendrier(date, -1))}
                  style={boutonNavigationCalendrier}><ChevronLeft size={19} /></button>
                <strong style={{ minWidth: 180, textAlign: "center", color: "#334155", textTransform: "capitalize" }}>{titreCalendrier}</strong>
                <button type="button" aria-label="Mois suivant" title="Mois suivant"
                  onClick={() => setDateCalendrier((date) => decalerDateCalendrier(date, 1))}
                  style={boutonNavigationCalendrier}><ChevronRight size={19} /></button>
              </div>
            </div>
            <div style={{ width: "100%", padding: "4px 0 12px" }}>
              <article style={{ display: "grid", gridTemplateColumns: "minmax(180px, 23%) minmax(0, 1fr)", width: "100%", minHeight: 410, overflow: "hidden", border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", boxShadow: "0 12px 30px rgba(15, 23, 42, 0.12)" }}>
                <div style={{ position: "relative", overflow: "hidden", background: "#fff", color: "#111827", minHeight: 410 }}>
                  <div style={{ position: "absolute", inset: 0, background: "#fff", clipPath: "polygon(0 60%, 100% 44%, 100% 100%, 0 100%)" }} />
                  <div style={{ position: "absolute", top: -36, left: -35, width: 205, height: 205, borderRadius: "50%", background: "#fff", boxShadow: "12px 15px 0 rgba(15,23,42,.04)" }} />
                  <span style={{ position: "absolute", top: 45, left: 22, fontSize: 74, lineHeight: 1, fontWeight: 800, letterSpacing: -4, color: "#111827" }}>{String(dateCalendrier.getMonth() + 1).padStart(2, "0")}</span>
                </div>
                <div style={{ minWidth: 0, padding: "28px clamp(18px, 5vw, 64px) 22px", display: "flex", flexDirection: "column" }}>
                  <div style={{ textAlign: "right", lineHeight: 1, marginBottom: 22 }}>
                    <strong style={{ display: "block", color: "#111827", fontSize: 38, lineHeight: 1, fontWeight: 800 }}>{dateCalendrier.getFullYear()}</strong>
                    <span style={{ display: "block", marginTop: 7, color: "#1e293b", fontSize: 15, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" }}>{dateCalendrier.toLocaleDateString("fr-FR", { month: "long" })}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 5, textAlign: "center" }}>
                    {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((jour) => <span key={jour} style={{ color: "#64748b", fontSize: 11, fontWeight: 800, paddingBottom: 7 }}>{jour}</span>)}
                    {joursCalendrier.map(({ date, dansPeriode }) => {
                      const missionsDuJour = dansPeriode ? missionsParJourCalendrier.get(cleJourCalendrier(date)) || [] : [];
                      const maintenant = new Date();
                      const estAujourdhui = dansPeriode
                        && date.getFullYear() === maintenant.getFullYear()
                        && date.getMonth() === maintenant.getMonth()
                        && date.getDate() === maintenant.getDate();
                      return <div key={date.toISOString()} style={{ minHeight: 54, padding: "5px 4px", border: missionsDuJour.length ? "1px solid #cbd5e1" : "1px solid transparent", borderRadius: 6, background: "#fff", color: !dansPeriode ? "#cbd5e1" : "#334155", overflow: "visible" }}>
                        <strong style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 12, lineHeight: "16px", color: estAujourdhui ? "#111827" : undefined, fontWeight: estAujourdhui ? 900 : undefined }}>
                          {dansPeriode ? date.getDate() : ""}
                          {missionsDuJour.length > 0 && <span aria-label="Mission prévue" style={{ width: 5, height: 5, flex: "0 0 auto", borderRadius: "50%", background: "#64748b" }} />}
                        </strong>
                        <div style={{ display: "grid", gap: 5, marginTop: 5 }}>
                          {missionsDuJour.map((mission) => {
                            const typeVehicule = mission.typeVehiculeSouhaite === "MOTO" ? "🏍️" : mission.typeVehiculeSouhaite === "VOITURE" ? "🚗" : "";
                            return <button key={mission.id} type="button" title={`TKT-${String(mission.id).padStart(5, "0")} · ${formatHeure(mission.dateDebut)} — détails`}
                              onClick={() => setMissionSelectionnee(mission)}
                              style={{ display: "block", width: "100%", overflow: "hidden", border: "1px solid #e2e8f0", borderRadius: 4, padding: "4px 3px", background: "#fff", color: "#374151", fontSize: 13, fontWeight: 700, lineHeight: 1.25, textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}>
                              {`${typeVehicule} ${formatHeure(mission.dateDebut)}`}
                            </button>;
                          })}
                        </div>
                      </div>;
                    })}
                  </div>
                </div>
              </article>
            </div>
          </section>
        </div>
      </div>

      {missionSelectionnee && (
        <div
          className="modal-container"
          onMouseDown={() => setMissionSelectionnee(null)}
          style={modalOverlayStyle}
        >
          <div
            className="modal-content"
            onMouseDown={(e) => e.stopPropagation()}
            style={{ ...modalContentStyle, maxWidth: 700 }}
          >
            <div style={modalHeaderStyle}>
              <div style={iconeTexteStyle}>
                <div style={modalIconStyle}>
                  <FileText size={21} color="#dc2626" />
                </div>
                <h3 style={modalTitleStyle}>
                  Détails de la mission TKT-{String(missionSelectionnee.id).padStart(5, "0")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMissionSelectionnee(null)}
                aria-label="Fermer"
                style={closeButtonStyle}
              >
                <X size={19} color="#4b5563" />
              </button>
            </div>
            <div style={{ padding: 22 }}>
              <div style={{ display: "grid", gap: 16 }}>
                <div>
                  <strong style={{ display: "block", color: "#64748b", fontSize: 12, marginBottom: 4 }}>Objet</strong>
                  <div style={{ color: "#111827", fontSize: 14 }}>{missionSelectionnee.motif}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
                  <div>
                    <strong style={{ display: "block", color: "#64748b", fontSize: 12, marginBottom: 4 }}>Départ</strong>
                    <div style={{ color: "#111827", fontSize: 14 }}>{formatDateHeure(missionSelectionnee.dateDebut)}</div>
                  </div>
                  <div>
                    <strong style={{ display: "block", color: "#64748b", fontSize: 12, marginBottom: 4 }}>Retour</strong>
                    <div style={{ color: "#111827", fontSize: 14 }}>{formatDateHeure(missionSelectionnee.dateFin)}</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
                  <div>
                    <strong style={{ display: "block", color: "#64748b", fontSize: 12, marginBottom: 4 }}>Point de départ</strong>
                    <div style={{ color: "#111827", fontSize: 14 }}>{missionSelectionnee.pointDepart || "—"}</div>
                  </div>
                  <div>
                    <strong style={{ display: "block", color: "#64748b", fontSize: 12, marginBottom: 4 }}>Destination</strong>
                    <div style={{ color: "#111827", fontSize: 14 }}>{missionSelectionnee.destination || "—"}</div>
                  </div>
                </div>
                <div>
                  <strong style={{ display: "block", color: "#64748b", fontSize: 12, marginBottom: 4 }}>Bénéficiaire</strong>
                  <div style={{ color: "#111827", fontSize: 14 }}>
                    {missionSelectionnee.demandeurNom} {missionSelectionnee.demandeurPrenom}
                  </div>
                </div>
                <div>
                  <strong style={{ display: "block", color: "#64748b", fontSize: 12, marginBottom: 4 }}>Statut</strong>
                  <div>
                    <span style={{
                      backgroundColor: statutStyle[missionSelectionnee.statut]?.bg || "#f3f4f6",
                      color: statutStyle[missionSelectionnee.statut]?.text || "#374151",
                      padding: "6px 11px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 700,
                    }}>
                      {statutStyle[missionSelectionnee.statut]?.label || missionSelectionnee.statut}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div style={modalFooterStyle}>
              <button
                type="button"
                onClick={() => setMissionSelectionnee(null)}
                style={boutonBleu}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {historiqueOuvert && (
        <div
          className="modal-container"
          onMouseDown={() => setHistoriqueOuvert(false)}
          style={modalOverlayStyle}
        >
          <div
            className="modal-content"
            onMouseDown={(e) => e.stopPropagation()}
            style={{ ...modalContentStyle, maxWidth: 800 }}
          >
            <div style={modalHeaderStyle}>
              <div style={iconeTexteStyle}>
                <div style={modalIconStyle}>
                  <History size={21} color="#dc2626" />
                </div>
                <div>
                  <h3 style={modalTitleStyle}>Historique du mois</h3>
                  <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: 14, textTransform: "capitalize" }}>
                    {titreCalendrier} · {historiqueDuMois.length} mission{historiqueDuMois.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={exporterHistoriqueDuMois}
                disabled={historiqueDuMois.length === 0}
                className="btn-spat btn-orange"
                style={{ marginRight: 8, opacity: historiqueDuMois.length ? 1 : 0.5 }}
                title="Exporter l'historique du mois en CSV"
              >
                <Download size={16} /> Exporter CSV
              </button>
              <button
                type="button"
                onClick={() => setHistoriqueOuvert(false)}
                aria-label="Fermer"
                style={closeButtonStyle}
              >
                <X size={19} color="#4b5563" />
              </button>
            </div>
            <div style={{ padding: 22, maxHeight: "60vh", overflowY: "auto" }}>
              {historiqueDuMois.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
                  <History size={40} style={{ margin: "0 auto 16px" }} />
                  <p>Aucune mission clôturée ce mois-ci</p>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {historiqueDuMois.map((mission) => (
                    <div
                      key={mission.id}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        padding: 16,
                        background: "#fff",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                        <strong style={{ color: "#111827", fontSize: 14 }}>
                          TKT-{String(mission.id).padStart(5, "0")}
                        </strong>
                        <span style={{
                          backgroundColor: "#dcfce7",
                          color: "#166534",
                          padding: "4px 8px",
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                        }}>
                          Clôturée
                        </span>
                      </div>
                      <div style={{ color: "#374151", fontSize: 13, marginBottom: 8 }}>{mission.motif}</div>
                      <div style={{ color: "#64748b", fontSize: 12 }}>
                        {formatDateHeure(mission.dateDebut)} → {formatDateHeure(mission.dateFin)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={modalFooterStyle}>
              <button
                type="button"
                onClick={() => setHistoriqueOuvert(false)}
                style={boutonBleu}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOuverte && <CreationMissionHorsVille
        onClose={() => setModalOuverte(false)}
        onCreated={async (mission) => {
          if (mission?.dateDebut) {
            const date = new Date(mission.dateDebut);
            setDateCalendrier(new Date(date.getFullYear(), date.getMonth(), 1));
          }
          await chargerDonnees();
        }}
      />}

      {carteGpsOuverte && (
        <CarteGpsDirection
          onClose={() => setCarteGpsOuverte(false)}
        />
      )}

      <NotificationsVehiculesPartages />
    </>
  );
}

function StatCard({
  titre,
  valeur,
  icone,
}: {
  titre: string;
  valeur: number | string;
  icone: ReactNode;
}) {
  return (
    <div style={statCardStyle}>
      <div style={statCardHeaderStyle}>
        <span style={statCardLabelStyle}>{titre}</span>
        <div style={statCardIconStyle}>{icone}</div>
      </div>

      <div style={statCardValueStyle}>{valeur}</div>
    </div>
  );
}

function BadgeEtatOperationnel({
  libelle,
}: {
  libelle: string;
}) {
  const style =
    libelle === "Flexible"
      ? { bg: "#e0f2fe", color: "#075985" }
      : libelle === "Urgente"
        ? { bg: "#fee2e2", color: "#991b1b" }
        : { bg: "#dcfce7", color: "#166534" };

  return (
    <span
      style={{
        display: "inline-flex",
        padding: "5px 10px",
        borderRadius: 20,
        backgroundColor: style.bg,
        color: style.color,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {libelle}
    </span>
  );
}

function obtenirTypeDemande(
  reservation: Reservation
): TypeDemande {
  if (
    reservation.typeDemande === "PLANIFIEE" ||
    reservation.typeDemande === "TARDIVE" ||
    reservation.typeDemande === "URGENTE"
  ) {
    return reservation.typeDemande;
  }

  if (reservation.demandeUrgente) return "URGENTE";
  if (reservation.horsDelai24h) return "TARDIVE";

  return "PLANIFIEE";
}

function obtenirStyleTypeDemande(type: TypeDemande) {
  switch (type) {
    case "URGENTE":
      return {
        bg: "#fee2e2",
        text: "#991b1b",
        label: "Urgente",
      };

    case "TARDIVE":
      return {
        bg: "#fef3c7",
        text: "#92400e",
        label: "Tardive",
      };

    default:
      return {
        bg: "#e0f2fe",
        text: "#075985",
        label: "Planifiée",
      };
  }
}

function libelleZoneMission(
  zone?: ZoneMission | null
) {
  if (zone === "VILLE_TOAMASINA") return "Toamasina";
  if (zone === "HORS_TOAMASINA") return "Hors Toamasina";
  return "—";
}

function libelleEtatOperationnel(
  reservation: Reservation
) {
  if (reservation.demandeUrgente) return "Urgente";

  if (
    String(reservation.mobilisabilite || "").toUpperCase() ===
    "FLEXIBLE"
  ) {
    return "Flexible";
  }

  return "Planifiée";
}

function normaliserRecherche(
  valeur?: string | number | null
) {
  return String(valeur ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatDateHeure(
  valeur?: string | null
) {
  if (!valeur) return "—";

  const date = new Date(valeur);

  if (Number.isNaN(date.getTime())) return valeur;

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

async function lireErreur(res: Response) {
  try {
    const contentType = res.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      const data = await res.json();

      if (typeof data === "string") return data;

      return data?.message || data?.error || JSON.stringify(data);
    }

    return await res.text();
  } catch {
    return "";
  }
}

function obtenirJoursCalendrier(date: Date) {
  const premier = new Date(date.getFullYear(), date.getMonth(), 1);
  premier.setDate(premier.getDate() - ((premier.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, index) => {
    const jour = new Date(premier);
    jour.setDate(premier.getDate() + index);
    return { date: jour, dansPeriode: jour.getMonth() === date.getMonth() };
  });
}

function decalerDateCalendrier(date: Date, pas: number) {
  const suivante = new Date(date);
  suivante.setDate(1);
  suivante.setMonth(suivante.getMonth() + pas);
  return suivante;
}

function cleJourCalendrier(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function missionDansMois(mission: Reservation, mois: Date) {
  const debut = new Date(mission.dateDebut);
  return Number.isFinite(debut.getTime())
    && debut.getFullYear() === mois.getFullYear()
    && debut.getMonth() === mois.getMonth();
}

function formatHeure(valeur?: string | null) {
  if (!valeur) return "—";
  const date = new Date(valeur);
  if (Number.isNaN(date.getTime())) return valeur;
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
};

const boutonBase: CSSProperties = {
  border: "none",
  borderRadius: 10,
  color: "#ffffff",
  padding: "11px 18px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 13,
  transition: "all 150ms ease",
};

const boutonBleu: CSSProperties = {
  ...boutonBase,
  backgroundColor: "#1d4ed8",
};

const boutonRouge: CSSProperties = {
  ...boutonBase,
  backgroundColor: "#bc1019",
};

const boutonNavigationCalendrier: CSSProperties = {
  width: 38,
  height: 38,
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  background: "#fff",
  color: "#475569",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 14,
  transition: "all 150ms ease",
};

const boutonSecondaire: CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  background: "#fff",
  color: "#475569",
  padding: "9px 14px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 13,
  transition: "all 150ms ease",
};

const rechercheCardStyle: CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 16,
  marginBottom: 20,
  boxShadow: "0 2px 5px rgba(0,0,0,0.03)",
};

const rechercheTitreStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 10,
  color: "#1e293b",
  fontWeight: 700,
  fontSize: 14,
};

const boutonEffacerRecherche: CSSProperties = {
  position: "absolute",
  right: 7,
  top: "50%",
  transform: "translateY(-50%)",
  width: 30,
  height: 30,
  border: "none",
  borderRadius: 7,
  backgroundColor: "#f3f4f6",
  color: "#6b7280",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const resultatRechercheStyle: CSSProperties = {
  marginTop: 9,
  color: "#6b7280",
  fontSize: 12,
};

const listeBoxStyle: CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #cbd5e1",
  borderRadius: 16,
  overflow: "hidden",
  boxShadow: "0 10px 28px rgba(15,23,42,0.06)",
};

const listeHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: 12,
  marginBottom: 12,
  color: "#111827",
};

const listeTitreStyle: CSSProperties = {
  margin: 0,
  color: "#111827",
  fontSize: 18,
  fontWeight: 700,
};

const tableContainerStyle: CSSProperties = {
  backgroundColor: "#ffffff",
  overflowX: "auto",
};

const theadRowStyle: CSSProperties = {
  backgroundColor: "#ffffff",
  borderBottom: "1px solid #e2e8f0",
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "15px 14px",
  fontSize: 12,
  color: "#334155",
  backgroundColor: "#ffffff",
  borderBottom: "1px solid #e2e8f0",
  fontWeight: 800,
  whiteSpace: "nowrap",
  letterSpacing: 0.2,
  textTransform: "uppercase",
};

const tdStyle: CSSProperties = {
  padding: "16px 14px",
  fontSize: 13,
  color: "#374151",
  verticalAlign: "middle",
  borderBottom: "1px solid #eef2f7",
};

const emptyStyle: CSSProperties = {
  ...tdStyle,
  padding: 42,
  textAlign: "center",
  color: "#6b7280",
};

const emptyContentStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 10,
};

const boutonLien: CSSProperties = {
  border: "none",
  background: "none",
  color: "#dc2626",
  cursor: "pointer",
  fontWeight: 600,
};

const texteSecondaireStyle: CSSProperties = {
  marginTop: 4,
  color: "#9ca3af",
  fontSize: 11,
};

const ticketCellStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const missionCellStyle: CSSProperties = {
  display: "grid",
  gap: 4,
};

const iconeTexteStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 7,
};

const modalOverlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  backgroundColor: "rgba(15, 23, 42, 0.58)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const modalContentStyle: CSSProperties = {
  width: "100%",
  maxWidth: 960,
  maxHeight: "92vh",
  overflowY: "auto",
  backgroundColor: "#ffffff",
  borderRadius: 12,
  boxShadow: "0 24px 70px rgba(0,0,0,0.28)",
};

const modalHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  padding: "18px 22px",
  borderBottom: "1px solid #e5e7eb",
  position: "sticky",
  top: 0,
  backgroundColor: "#ffffff",
  zIndex: 10,
};

const modalIconStyle: CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 9,
  backgroundColor: "#fee2e2",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const modalTitleStyle: CSSProperties = {
  margin: 0,
  color: "#1e293b",
  fontSize: 18,
};

const closeButtonStyle: CSSProperties = {
  width: 36,
  height: 36,
  border: "none",
  backgroundColor: "#f3f4f6",
  borderRadius: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const modalFooterStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  padding: "16px 22px",
  borderTop: "1px solid #e5e7eb",
  backgroundColor: "#f9fafb",
  position: "sticky",
  bottom: 0,
  zIndex: 10,
};

const statCardStyle: CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 18,
  boxShadow: "0 2px 5px rgba(0,0,0,0.03)",
};

const statCardHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 10,
};

const statCardLabelStyle: CSSProperties = {
  color: "#6b7280",
  fontSize: 13,
  fontWeight: 500,
};

const statCardIconStyle: CSSProperties = {
  width: 36,
  height: 36,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#f9fafb",
  borderRadius: 8,
};

const statCardValueStyle: CSSProperties = {
  color: "#1e293b",
  fontSize: 28,
  lineHeight: 1,
  fontWeight: 700,
};

const warningJauneStyle: CSSProperties = {
  marginTop: 14,
  border: "1px solid #fde68a",
  backgroundColor: "#fffbeb",
  borderRadius: 9,
  padding: 15,
  color: "#92400e",
};

const warningRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
};

const warningTextStyle: CSSProperties = {
  margin: "4px 0 10px",
  fontSize: 12,
  lineHeight: 1.5,
  color: "#92400e",
};
