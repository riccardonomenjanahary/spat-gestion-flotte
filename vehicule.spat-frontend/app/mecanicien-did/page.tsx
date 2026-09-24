"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import RoleGuard from "@/components/RoleGuard";
import EnTete from "@/components/EnTete";
import { ROLES } from "@/app/lib/roles";
import { toast } from "sonner";

import {
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Download,
  Eye,
  PlusCircle,
  RefreshCw,
  Search,
  Send,
  Wrench,
  X,
  XCircle,
} from "lucide-react";

// =========================================================
// TYPES
// =========================================================

interface Vehicule {
  id: number;
  immatriculation: string;
  marque?: string | null;
  modele?: string | null;
  categorie?: string | null;
  modeleType?: string | null;
  typeVehicule?: string | null;
  annee?: number | null;
  affectation?: string | null;
  statut?: string | null;
}

interface Maintenance {
  id: string;

  vehicule?: Vehicule | null;

  reservationId?: number | null;
  reservation?: {
    id: number;
    dateCreation?: string | null;
    dateDebut?: string | null;
    dateFin?: string | null;
    motif?: string | null;
    pointDepart?: string | null;
    destination?: string | null;
    nombrePassagers?: number | null;
    listePassagers?: string | null;
    observations?: string | null;
    statut?: string | null;
    demandeurNom?: string | null;
    demandeurPrenom?: string | null;
    demandeurMatricule?: string | null;
    demandeurEntite?: string | null;
    demandeurTelephone?: string | null;
    demandeur?: {
      nom?: string | null;
      prenom?: string | null;
      matricule?: string | null;
      numMatricule?: string | null;
      telephone?: string | null;
    } | null;
  } | null;

  natureIntervention: string;
  origineDemande?: string | null;
  demandeurEntretien?: string | null;
  dateDecisionEntretien?: string | null;
  motifRefusEntretien?: string | null;
  compteRenduEntretien?: string | null;
  mecanicienEntretien?: string | null;
  statut: string;

  diagnosticVisuel?: string | null;
  observationsMecanicien?: string | null;
  piecesNecessaires?: string | null;

  // Compatibilité avec les deux variantes actuellement rencontrées.
  decisionDID?: string | null;
  decisiondid?: string | null;

  mecanicienEmail?: string | null;

  dateAvisDID?: string | null;
  dateAvisdid?: string | null;

  avisTexte?: string | null;
  avisAuteurEmail?: string | null;
  avisDate?: string | null;

  priorite?: string | null;
  prestataire?: string | null;
  dateIntervention?: string | null;

  dateCreation?: string | null;
  dateCloture?: string | null;
}

interface AvisEnCours {
  diagnosticVisuel: string;
  observationsMecanicien: string;
  piecesNecessaires: string;
  decision: string;
}

type OngletMecanicien =
  | "AVIS"
  | "ENTRETIENS";

// =========================================================
// API
// =========================================================

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8080/api";

// =========================================================
// PAGE
// =========================================================

export default function MecanicienDidPage() {
  return (
    <RoleGuard role={ROLES.MECANICIEN_DID}>
      <MecanicienDidContent />
    </RoleGuard>
  );
}

// =========================================================
// CONTENU
// =========================================================

function MecanicienDidContent() {
  const [onglet, setOnglet] =
    useState<OngletMecanicien>("AVIS");

  const [vehicules, setVehicules] =
    useState<Vehicule[]>([]);

  const [dossiers, setDossiers] =
    useState<Maintenance[]>([]);

  const [dossiersEnAttente, setDossiersEnAttente] =
    useState<Maintenance[]>([]);

  const [chargement, setChargement] =
    useState(true);

  const [actualisation, setActualisation] =
    useState(false);

  const [avisEnCours, setAvisEnCours] =
    useState<Record<string, AvisEnCours>>({});

  const [envoiEnCours, setEnvoiEnCours] =
    useState<string | null>(null);

  // =========================================================
  // CREATION ENTRETIEN
  // =========================================================

  const [entVehiculeId, setEntVehiculeId] =
    useState("");

  const [entNature, setEntNature] =
    useState("");

  const [envoiEntretien, setEnvoiEntretien] =
    useState(false);
  const [entretienOuvert, setEntretienOuvert] = useState<string | null>(null);
  const [comptesRendus, setComptesRendus] = useState<Record<string, string>>({});
  const [terminerEnCours, setTerminerEnCours] = useState<string | null>(null);

  // =========================================================
  // FILTRES / DETAIL
  // =========================================================

  const [entRecherche, setEntRecherche] =
    useState("");

  const [entFiltreStatut, setEntFiltreStatut] =
    useState("ACTIFS");

  const [entFiltreVehicule, setEntFiltreVehicule] =
    useState("");

  const [entDossierOuvert, setEntDossierOuvert] =
    useState<string | null>(null);

  const [ticketOuvertId, setTicketOuvertId] =
    useState<number | null>(null);

  const [filtreTickets, setFiltreTickets] =
    useState<"A_TRAITER" | "TRANSMIS">("A_TRAITER");

  // =========================================================
  // TOKEN
  // =========================================================

  const getToken = () => {
    if (typeof window === "undefined") {
      return null;
    }

    return localStorage.getItem("token");
  };

  // =========================================================
  // FETCH GENERIQUE
  // =========================================================

  const fetchListe = useCallback(
    async <T,>(
      url: string,
      token: string
    ): Promise<T[]> => {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (!res.ok) {
        const message =
          await res.text().catch(() => "");

        throw new Error(
          message ||
            `Erreur HTTP ${res.status}`
        );
      }

      const data: unknown =
        await res.json();

      return Array.isArray(data)
        ? (data as T[])
        : [];
    },
    []
  );

  // =========================================================
  // CHARGEMENT COMPLET
  // =========================================================

  const charger = useCallback(
    async (silencieux = false) => {
      const token = getToken();

      if (!token) {
        toast.error(
          "Session expirée. Veuillez vous reconnecter."
        );
        return;
      }

      if (!silencieux) {
        setChargement(true);
      } else {
        setActualisation(true);
      }

      try {
        const [
          toutesMaintenances,
          enAttente,
          listeVehicules,
        ] = await Promise.all([
          fetchListe<Maintenance>(
            `${API}/maintenances`,
            token
          ),

          fetchListe<Maintenance>(
            `${API}/maintenances/en-attente-avis`,
            token
          ),

          fetchListe<Vehicule>(
            `${API}/vehicules`,
            token
          ),
        ]);

        setDossiers(
          toutesMaintenances
        );

        setDossiersEnAttente(
          enAttente
        );

        setVehicules(
          listeVehicules
        );
      } catch (error) {
        console.error(
          "Erreur chargement entretiens DID :",
          error
        );

        if (!silencieux) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Impossible de charger les dossiers d'entretien."
          );
        }
      } finally {
        setChargement(false);
        setActualisation(false);
      }
    },
    [fetchListe]
  );

  // =========================================================
  // PREMIER CHARGEMENT
  // =========================================================

  useEffect(() => {
    charger(false);
  }, [charger]);

  // =========================================================
  // ACTUALISATION AUTOMATIQUE
  // =========================================================

  useEffect(() => {
    const interval =
      window.setInterval(() => {
        charger(true);
      }, 10000);

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [charger]);

  // =========================================================
  // AVIS EN COURS
  // =========================================================

  const obtenirAvis = (
    id: string
  ): AvisEnCours => {
    return (
      avisEnCours[id] || {
        diagnosticVisuel: "",
        observationsMecanicien: "",
        piecesNecessaires: "",
        decision: "",
      }
    );
  };

  const modifierAvis = (
    id: string,
    champ: keyof AvisEnCours,
    valeur: string
  ) => {
    setAvisEnCours(
      (ancien) => ({
        ...ancien,

        [id]: {
          ...(
            ancien[id] || {
              diagnosticVisuel: "",
              observationsMecanicien: "",
              piecesNecessaires: "",
              decision: "",
            }
          ),

          [champ]: valeur,
        },
      })
    );
  };

  // =========================================================
  // SOUMISSION AVIS DID
  // =========================================================

  const soumettreAvis = async (
    maintenance: Maintenance
  ) => {
    const avis =
      obtenirAvis(
        maintenance.id
      );

    if (
      !avis.diagnosticVisuel.trim()
    ) {
      toast.error(
        "Le diagnostic visuel est obligatoire."
      );
      return;
    }

    if (
      !avis.observationsMecanicien.trim()
    ) {
      toast.error(
        "Les observations du mécanicien sont obligatoires."
      );
      return;
    }

    if (
      !avis.piecesNecessaires.trim()
    ) {
      toast.error(
        "Veuillez indiquer les pièces ou actions nécessaires."
      );
      return;
    }

    if (
      avis.decision !== "FAVORABLE" &&
      avis.decision !== "DEFAVORABLE"
    ) {
      toast.error(
        "Veuillez sélectionner une décision DID."
      );
      return;
    }

    const token =
      getToken();

    if (!token) {
      toast.error(
        "Session expirée. Veuillez vous reconnecter."
      );
      return;
    }

    setEnvoiEnCours(
      maintenance.id
    );

    try {
      const res = await fetch(
        `${API}/maintenances/${maintenance.id}/avis-did`,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,

            Accept:
              "application/json",
          },

          body:
            JSON.stringify({
              diagnosticVisuel:
                avis.diagnosticVisuel.trim(),

              observationsMecanicien:
                avis.observationsMecanicien.trim(),

              piecesNecessaires:
                avis.piecesNecessaires.trim(),

              decision:
                avis.decision,
            }),
        }
      );

      if (!res.ok) {
        const message =
          await res.text().catch(
            () => ""
          );

        throw new Error(
          message ||
            `Erreur HTTP ${res.status}`
        );
      }

      const resultat =
        (await res.json()) as Maintenance;

      setAvisEnCours(
        (ancien) => {
          const copie = {
            ...ancien,
          };

          delete copie[
            maintenance.id
          ];

          return copie;
        }
      );

      const decision =
        resultat.decisionDID ||
        resultat.decisiondid ||
        avis.decision;

      if (
        decision === "FAVORABLE"
      ) {
        toast.success(
          "Avis DID favorable enregistré. Le dossier peut poursuivre le processus de validation."
        );
      } else {
        toast.success(
          "Avis DID défavorable enregistré."
        );
      }

      await charger(true);
    } catch (error) {
      console.error(
        "Erreur envoi avis DID :",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer l'avis DID."
      );
    } finally {
      setEnvoiEnCours(
        null
      );
    }
  };

  // =========================================================
  // CREATION D'UN ENTRETIEN AUTONOME
  // =========================================================

  const soumettreEntretien = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !entVehiculeId ||
      !entNature.trim()
    ) {
      toast.error(
        "Véhicule et nature de l'intervention sont obligatoires."
      );
      return;
    }

    const token =
      getToken();

    if (!token) {
      toast.error(
        "Session expirée. Veuillez vous reconnecter."
      );
      return;
    }

    setEnvoiEntretien(
      true
    );

    try {
      const res = await fetch(
        `${API}/maintenances/demandes-entretien`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,

            Accept:
              "application/json",
          },

          body:
            JSON.stringify({
              vehiculeId:
                Number(entVehiculeId),

              natureIntervention:
                entNature.trim(),
            }),
        }
      );

      if (!res.ok) {
        const message =
          await res.text().catch(
            () => ""
          );

        throw new Error(
          message ||
            `Erreur lors de la création (${res.status}).`
        );
      }

      toast.success(
        "Demande transmise au Chef du Service Logistique pour validation."
      );

      setEntVehiculeId("");
      setEntNature("");

      await charger(true);
    } catch (error) {
      console.error(
        "Erreur entretien :",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de créer la demande."
      );
    } finally {
      setEnvoiEntretien(
        false
      );
    }
  };

  const terminerDemandeEntretien = async (m: Maintenance) => {
    const token = getToken();
    const compteRendu = (comptesRendus[m.id] ?? "").trim();
    if (!compteRendu) { toast.error("Renseignez le compte rendu de l'entretien."); return; }
    if (!token || terminerEnCours) return;
    setTerminerEnCours(m.id);
    try {
      const res = await fetch(`${API}/maintenances/${m.id}/terminer-entretien`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ compteRendu }),
      });
      if (!res.ok) throw new Error(await res.text() || `Erreur HTTP ${res.status}`);
      toast.success("Entretien terminé. Le Chef du Service Logistique a été informé.");
      setEntretienOuvert(null);
      setComptesRendus(old => ({...old, [m.id]: ""}));
      await charger(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de terminer l'entretien.");
    } finally {
      setTerminerEnCours(null);
    }
  };

  const demandesEntretien = dossiers
    .filter(m => m.origineDemande === "MECANICIEN_DID" ||
      (m.origineDemande === "CHAUFFEUR" &&
       (m.statut === "ENTRETIEN_AUTORISE" || m.statut === "ENTRETIEN_TERMINE")))
    .sort((a,b) => String(b.dateCreation ?? "").localeCompare(String(a.dateCreation ?? "")));

  // =========================================================
  // FILTRES
  // =========================================================

  const maintenancesFiltrees =
    useMemo(() => {
      const recherche =
        entRecherche
          .trim()
          .toLowerCase();

      return dossiers
        .filter((m) => (m.reservationId ?? m.reservation?.id) == null)
        .filter((m) => {
          if (m.origineDemande) return false; // affiché dans la rubrique dédiée ci-dessous
          const statut =
            String(
              m.statut || ""
            ).toUpperCase();

          if (
            entFiltreStatut ===
              "ACTIFS" &&
            statut === "CLOTUREE"
          ) {
            return false;
          }

          if (
            entFiltreStatut !==
              "TOUS" &&
            entFiltreStatut !==
              "ACTIFS" &&
            statut !==
              entFiltreStatut
          ) {
            return false;
          }

          if (
            entFiltreVehicule &&
            String(
              m.vehicule?.id ??
                ""
            ) !==
              entFiltreVehicule
          ) {
            return false;
          }

          const reservationLiee =
            m.reservationId ??
            m.reservation?.id ??
            null;

          if (reservationLiee != null) {
            return false;
          }

          if (recherche) {
            const texte = [
              m.vehicule
                ?.immatriculation,
              m.vehicule?.marque,
              m.vehicule?.modele,
              m.vehicule
                ?.modeleType,
              m.natureIntervention,
              m.statut,
              m.avisTexte,
              m.avisAuteurEmail,
              m.mecanicienEmail,
              m.diagnosticVisuel,
              m.observationsMecanicien,
              m.piecesNecessaires,
              m.prestataire,
              m.priorite,
              m.decisionDID,
              m.decisiondid,

              reservationLiee !=
              null
                ? `TKT-${String(reservationLiee).padStart(5, "0")}`
                : "entretien autonome",
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            if (
              !texte.includes(
                recherche
              )
            ) {
              return false;
            }
          }

          return true;
        })
        .slice()
        .sort((a, b) =>
          String(
            b.dateCreation || ""
          ).localeCompare(
            String(
              a.dateCreation || ""
            )
          )
        );
    }, [
      dossiers,
      entRecherche,
      entFiltreStatut,
      entFiltreVehicule,
    ]);

  // Un ticket peut posséder plusieurs contrôles successifs, mais ne doit
  // apparaître qu'une fois dans la liste. Le plus récent détermine son état.
  const ticketsDid = useMemo(() => {
    const groupes = new Map<number, Maintenance[]>();
    dossiers.forEach((m) => {
      if (m.origineDemande) return; // Demandes d'entretien != contrôles DID avant ticket
      const ticketId = m.reservationId ?? m.reservation?.id;
      if (ticketId == null) return;
      const anciens = groupes.get(ticketId) ?? [];
      anciens.push(m);
      groupes.set(ticketId, anciens);
    });

    const enAttenteIds = new Set(dossiersEnAttente.map((m) => String(m.id)));
    return [...groupes.entries()].map(([ticketId, controles]) => {
      controles.sort((a, b) =>
        String(b.dateCreation ?? "").localeCompare(String(a.dateCreation ?? "")) ||
        String(b.id).localeCompare(String(a.id))
      );
      const actuel = controles[0];
      const decision = decisionControleDID(actuel);
      const transmis = Boolean(decision || actuel.dateAvisDID ||
        actuel.dateAvisdid || actuel.avisTexte?.trim());
      const aTraiter = !transmis && (
        enAttenteIds.has(String(actuel.id)) ||
        String(actuel.statut).toUpperCase() === "EN_ATTENTE_AVIS_DID"
      );
      return {ticketId, actuel, controles, aTraiter, transmis};
    }).sort((a, b) =>
      String(b.actuel.dateCreation ?? "").localeCompare(String(a.actuel.dateCreation ?? "")) ||
      b.ticketId - a.ticketId
    );
  }, [dossiers, dossiersEnAttente]);

  const ticketsVisibles = ticketsDid.filter((t) =>
    filtreTickets === "A_TRAITER" ? t.aTraiter : t.transmis
  );

  const maintenanceSelectionnee =
    useMemo(
      () =>
        dossiers.find(
          (m) =>
            String(m.id) ===
            entDossierOuvert
        ) || null,
      [
        dossiers,
        entDossierOuvert,
      ]
    );

  // =========================================================
  // EXPORT CSV
  // =========================================================

  const exporterEntretiens =
    () => {
      const lignes = [
        [
          "ID",
          "Véhicule",
          "Nature",
          "Origine",
          "Demande liée",
          "Statut",
          "Avis DID",
          "Auteur avis DID",
          "Diagnostic visuel",
          "Observations mécanicien",
          "Pièces nécessaires",
          "Décision DID",
          "Priorité",
          "Prestataire",
          "Création",
          "Date intervention",
          "Clôture",
          "Délai de traitement (jours)",
        ],

        ...maintenancesFiltrees.map(
          (m) => {
            const reservationLiee =
              m.reservationId ??
              m.reservation?.id ??
              null;

            return [
              String(m.id),

              m.vehicule
                ?.immatriculation ||
                "—",

              travauxDemandesLisibles(m.natureIntervention),

              reservationLiee != null
                ? "Contrôle / dossier lié à une mission"
                : "Entretien autonome",

              reservationLiee != null
                ? `DMD-${String(
                    reservationLiee
                  ).padStart(
                    5,
                    "0"
                  )}`
                : "—",

              statutEntretienAffiche(
                m
              ),

              m.avisTexte?.trim() ||
                "En attente",

              m.avisAuteurEmail ||
                m.mecanicienEmail ||
                "—",

              m.diagnosticVisuel ||
                "—",

              m.observationsMecanicien ||
                "—",

              m.piecesNecessaires ||
                "—",

              m.decisionDID ||
                m.decisiondid ||
                "—",

              m.priorite || "—",
              m.prestataire || "—",

              formaterDate(
                m.dateCreation
              ),

              formaterDate(
                m.dateIntervention
              ),

              formaterDate(
                m.dateCloture
              ),

              dureeEntretienJours(
                m
              ) ?? "—",
            ].map(String);
          }
        ),
      ];

      const contenu =
        lignes
          .map((ligne) =>
            ligne
              .map(
                (cellule) =>
                  `"${String(
                    cellule
                  ).replace(
                    /"/g,
                    '""'
                  )}"`
              )
              .join(";")
          )
          .join("\n");

      const blob =
        new Blob(
          [
            "\uFEFF" +
              contenu,
          ],
          {
            type:
              "text/csv;charset=utf-8;",
          }
        );

      const url =
        URL.createObjectURL(
          blob
        );

      const lien =
        document.createElement(
          "a"
        );

      lien.href =
        url;

      lien.download =
        `entretiens_${new Date()
          .toISOString()
          .slice(0, 10)}.csv`;

      lien.click();

      URL.revokeObjectURL(
        url
      );

      toast.success(
        "Export des dossiers d'entretien généré."
      );
    };

  // =========================================================
  // CHARGEMENT
  // =========================================================

  if (chargement) {
    return (
      <div
        style={{
          minHeight:
            "100vh",

          backgroundColor:
            "#f3f4f6",
        }}
      >
        <EnTete/>

        <div
          style={{
            padding: 50,
            textAlign:
              "center",
            color:
              "#64748b",
          }}
        >
          Chargement des dossiers
          d&apos;entretien...
        </div>
      </div>
    );
  }

  // =========================================================
  // RENDU
  // =========================================================

  return (
    <div
      style={{
        minHeight:
          "100vh",

        backgroundColor:
          "#f3f4f6",
      }}
    >
      <EnTete/>

      <main
        style={{
          padding: 28,
        }}
      >
        <div
          style={{
            maxWidth: 1250,
            margin: "0 auto",
          }}
        >
          <h1 style={{margin: "0 0 16px", color: "#111827", fontSize: 22}}>
            {onglet === "ENTRETIENS" ? "Dossiers d'entretien"
              : filtreTickets === "TRANSMIS" ? "Avis DID transmis" : "Tickets à contrôler"}
          </h1>

          {/* Indicateurs synthétiques dans le style blanc de l'espace Logistique. */}
          <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(205px, 1fr))",
            gap: 14, marginBottom: 22}}>
            {[
              {titre: "Tickets à contrôler", valeur: ticketsDid.filter(t => t.aTraiter).length,
                couleur: "#2563eb"},
              {titre: "Avis transmis", valeur: ticketsDid.filter(t => t.transmis).length,
                couleur: "#16a34a"},
              {titre: "Entretiens à effectuer", valeur: demandesEntretien.filter(m => m.statut === "ENTRETIEN_AUTORISE").length,
                couleur: "#dc2626"},
            ].map(kpi => (
              <div key={kpi.titre} style={{background: "#ffffff", border: "1px solid #e2e8f0",
                borderRadius: 11, padding: 16, boxShadow: "0 2px 8px rgba(15,23,42,.03)"}}>
                <div style={{fontSize: 13, color: "#475569", fontWeight: 600}}>{kpi.titre}</div>
                <div style={{fontSize: 25, fontWeight: 800, color: "#0f172a", marginTop: 8}}>{kpi.valeur}</div>
                <div style={{height: 3, width: 32, background: kpi.couleur, borderRadius: 3, marginTop: 10}} />
              </div>
            ))}
          </div>

          {/* Trois vues distinctes et toujours accessibles. */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 12, marginBottom: 22, padding: 12,
            backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12,
          }}>
            <nav aria-label="Sections du mécanicien DID"
              style={{display: "flex", flex: 1, alignItems: "center", flexWrap: "wrap", gap: 9}}>
              <OngletButton couleur="BLEU" actif={onglet === "AVIS" && filtreTickets === "A_TRAITER"}
                onClick={() => {setOnglet("AVIS"); setFiltreTickets("A_TRAITER"); setTicketOuvertId(null);}}
                icon={<ClipboardCheck size={16} />}>
                Tickets à contrôler ({ticketsDid.filter((t) => t.aTraiter).length})
              </OngletButton>
              <OngletButton couleur="VERT" actif={onglet === "AVIS" && filtreTickets === "TRANSMIS"}
                onClick={() => {setOnglet("AVIS"); setFiltreTickets("TRANSMIS"); setTicketOuvertId(null);}}
                icon={<CheckCircle2 size={16} />}>
                Avis transmis ({ticketsDid.filter((t) => t.transmis).length})
              </OngletButton>
              <OngletButton couleur="ROUGE" actif={onglet === "ENTRETIENS"}
                onClick={() => {setOnglet("ENTRETIENS"); setTicketOuvertId(null);}}
                icon={<Wrench size={16} />}>
                Dossiers d'entretien
              </OngletButton>
            </nav>

            <button type="button" onClick={() => charger(false)}
              disabled={actualisation}
              style={{...boutonSecondaire, height: 40, boxSizing: "border-box", whiteSpace: "nowrap"}}>
              <RefreshCw size={15} /> Actualiser
            </button>
          </div>

          {onglet === "AVIS" && (
            <section>
              {ticketsVisibles.length === 0 ? (
                <BlocVide texte={filtreTickets === "A_TRAITER"
                  ? "Aucun ticket en attente d'avis DID."
                  : "Aucun avis DID transmis."} />
              ) : (
                <div style={{display: "grid", gap: 12}}>
                  {ticketsVisibles.map(({ticketId, actuel, controles, aTraiter}) => (
                    <CarteTicketDID
                      key={ticketId}
                      ticketId={ticketId}
                      actuel={actuel}
                      controles={controles}
                      aTraiter={aTraiter}
                      ouvert={ticketOuvertId === ticketId}
                      onBasculer={() => setTicketOuvertId((id) => id === ticketId ? null : ticketId)}
                      avis={obtenirAvis(actuel.id)}
                      envoi={envoiEnCours === actuel.id}
                      onModifier={(champ, valeur) => modifierAvis(actuel.id, champ, valeur)}
                      onSoumettre={() => soumettreAvis(actuel)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* =============================================== */}
          {/* ONGLET ENTRETIENS */}
          {/* =============================================== */}

          {onglet ===
            "ENTRETIENS" && (
            <section>
              <Card>
                <CardTitre icon={<Wrench size={18}/>}>Demandes d'entretien</CardTitre>
                {demandesEntretien.length === 0 ? <BlocVide texte="Aucune demande d'entretien." /> : (
                  <div style={{display:"grid", gap: 10}}>
                    {demandesEntretien.map(m => {
                      const ouvert = entretienOuvert === m.id;
                      const idTicket = m.reservationId ?? m.reservation?.id;
                      return (
                        <div key={m.id} style={{border: "1px solid #d1d5db", backgroundColor: "white", borderRadius: 8, padding: 12}}>
                          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap: 12}}>
                            <div style={{display:"grid", gap: 4, color:"#111827"}}>
                              <strong>{idTicket != null ? `TKT-${String(idTicket).padStart(5,"0")}` : `Entretien — ${m.vehicule?.immatriculation ?? "—"}`}</strong>
                              
                              <span>État : {m.statut === "EN_ATTENTE_VALIDATION_ENTRETIEN" ? "En attente du chef" : m.statut === "ENTRETIEN_AUTORISE" ? "Entretien autorisé" : m.statut === "ENTRETIEN_TERMINE" ? "Entretien terminé" : m.statut === "REFUSEE" ? "Demande refusée" : m.statut}</span>
                            </div>
                            <button type="button" style={{...boutonSecondaire, backgroundColor:"#2563eb", color:"white", border:"none"}}
                              onClick={() => setEntretienOuvert(ouvert ? null : m.id)}>{ouvert ? "Fermer" : "Détails"}</button>
                          </div>
                          {ouvert && <div style={{marginTop: 12, display: "grid", gap: 10, color: "#111827"}}>
                            <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap: 8}}>
                              {[["Provenance", m.origineDemande === "CHAUFFEUR" ? "Chauffeur" : "Mécanicien DID"], ["Demandeur",m.demandeurEntretien ?? "—"], ["Ticket",idTicket != null ? `TKT-${String(idTicket).padStart(5,"0")}` : "Sans ticket"], ["Véhicule", m.vehicule?.immatriculation ?? "—"]].map(([label,value]) => <div key={label} style={{border:"1px solid #e5e7eb", borderRadius: 7, padding: 9}}><div style={{fontSize: 11, color: "#475569"}}>{label}</div><strong>{value}</strong></div>)}
                            </div>
                            <div style={{whiteSpace:"pre-wrap", border:"1px solid #e5e7eb", padding: 10, borderRadius: 7}}><strong>Travaux demandés</strong><div>{travauxDemandesLisibles(m.natureIntervention)}</div></div>
                            {m.motifRefusEntretien && <div>Motif du refus : {m.motifRefusEntretien}</div>}
                            {m.compteRenduEntretien && <div style={{whiteSpace:"pre-wrap", border:"1px solid #e5e7eb", padding: 10, borderRadius: 7}}><strong>Compte rendu</strong><div>{m.compteRenduEntretien}</div></div>}
                            {m.statut === "ENTRETIEN_AUTORISE" && <div style={{display:"grid", gap: 8}}>
                              <label htmlFor={`compte-rendu-${m.id}`}>Compte rendu de l'entretien *</label>
                              <textarea id={`compte-rendu-${m.id}`} rows={4} style={inputStyle} value={comptesRendus[m.id] ?? ""}
                                onChange={e => setComptesRendus(old => ({...old, [m.id]: e.target.value}))}/>
                              <button type="button" disabled={terminerEnCours !== null} style={{...boutonSecondaire, backgroundColor:"#16a34a", color:"white", border:"none", width:"fit-content"}}
                                onClick={() => terminerDemandeEntretien(m)}>Entretien terminé</button>
                            </div>}
                          </div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
              <div style={{height: 14}} />

              {/* =========================================== */}
              {/* NOUVEL ENTRETIEN */}
              {/* =========================================== */}

              <div
                style={{
                  width: "100%",
                  maxWidth: 680,
                  margin: "0 auto 18px",
                }}
              >
                <Card>
                  <CardTitre
                    icon={
                      <Wrench
                        size={18}
                        color="#92400e"
                      />
                    }
                  >
                    Nouvelle demande d’entretien
                  </CardTitre>

                 

                  <form
                    onSubmit={
                      soumettreEntretien
                    }
                    style={{
                      display:
                        "grid",
                      gap: 12,
                    }}
                  >
                    <Champ label="Véhicule *">
                      <select
                        value={
                          entVehiculeId
                        }
                        onChange={(
                          e
                        ) =>
                          setEntVehiculeId(
                            e.target
                              .value
                          )
                        }
                        style={
                          inputStyle
                        }
                        required
                      >
                        <option value="">
                          Sélectionner un
                          véhicule
                        </option>

                        {vehicules.map(
                          (v) => (
                            <option
                              key={
                                v.id
                              }
                              value={
                                v.id
                              }
                            >
                              {libelleVehicule(
                                v
                              )}
                            </option>
                          )
                        )}
                      </select>
                    </Champ>

                    <Champ label="Nature de l'intervention *">
                      <textarea
                        value={
                          entNature
                        }
                        onChange={(
                          e
                        ) =>
                          setEntNature(
                            e.target
                              .value
                          )
                        }
                        rows={4}
                        placeholder="Ex. vidange, freinage, remise en état, carrosserie, visite technique..."
                        style={{
                          ...inputStyle,
                          resize:
                            "vertical",
                        }}
                        required
                      />
                    </Champ>

                   

                    <ActionButton
                      disabled={
                        envoiEntretien
                      }
                    >
                      <PlusCircle
                        size={15}
                      />

                      {envoiEntretien
                        ? "Création..."
                        : "Envoyer la demande au chef"}
                    </ActionButton>
                  </form>
                </Card>
              </div>

              {/* =========================================== */}
              {/* DOSSIERS */}
              {/* =========================================== */}

              <Card>
                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "center",
                    gap: 12,
                    flexWrap:
                      "wrap",
                    marginBottom:
                      14,
                  }}
                >
                  <CardTitre
                    icon={
                      <ClipboardList
                        size={18}
                      />
                    }
                  >
                    Dossiers
                    d&apos;entretien
                  </CardTitre>

                  <button
                    type="button"
                    onClick={
                      exporterEntretiens
                    }
                    style={
                      boutonSecondaire
                    }
                  >
                    <Download
                      size={15}
                    />

                    Exporter CSV
                  </button>
                </div>

                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "minmax(220px, 2fr) repeat(2, minmax(150px, 1fr))",
                    gap: 9,
                    marginBottom:
                      15,
                  }}
                >
                  <div
                    style={
                      rechercheStyle
                    }
                  >
                    <Search
                      size={15}
                    />

                    <input
                      value={
                        entRecherche
                      }
                      onChange={(
                        e
                      ) =>
                        setEntRecherche(
                          e.target
                            .value
                        )
                      }
                      placeholder="Véhicule, intervention, avis DID, prestataire..."
                      style={
                        rechercheInputStyle
                      }
                    />
                  </div>

                  <select
                    value={
                      entFiltreStatut
                    }
                    onChange={(
                      e
                    ) =>
                      setEntFiltreStatut(
                        e.target
                          .value
                      )
                    }
                    style={
                      inputStyle
                    }
                  >
                    <option value="ACTIFS">
                      Dossiers actifs
                    </option>

                    <option value="EN_ATTENTE_AVIS_DID">
                      En attente avis DID
                    </option>

                    <option value="PLANIFIEE">
                      Planifiés
                    </option>

                    <option value="EN_COURS">
                      En cours
                    </option>

                    <option value="CLOTUREE">
                      Clôturés
                    </option>

                    <option value="TOUS">
                      Tous les statuts
                    </option>
                  </select>

                  <select
                    value={
                      entFiltreVehicule
                    }
                    onChange={(
                      e
                    ) =>
                      setEntFiltreVehicule(
                        e.target
                          .value
                      )
                    }
                    style={
                      inputStyle
                    }
                  >
                    <option value="">
                      Tous les véhicules
                    </option>

                    {vehicules.map(
                      (v) => (
                        <option
                          key={
                            v.id
                          }
                          value={
                            v.id
                          }
                        >
                          {
                            v.immatriculation
                          }
                        </option>
                      )
                    )}
                  </select>


                </div>

                {maintenancesFiltrees.length ===
                0 ? (
                  <BlocVide
                    texte="Aucun dossier d'entretien ne correspond aux filtres."
                  />
                ) : (
                  <div
                    style={
                      tableCardStyle
                    }
                  >
                    <table
                      style={{
                        width:
                          "100%",
                        borderCollapse:
                          "collapse",
                        minWidth:
                          1260,
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            backgroundColor:
                              "#111827",
                          }}
                        >
                          <Th>
                            Créée le
                          </Th>

                          <Th>
                            Véhicule
                          </Th>

                          <Th>
                            Nature
                          </Th>

                          <Th>
                            Origine
                          </Th>

                          <Th>
                            Avis DID
                          </Th>

                          <Th>
                            Intervention
                          </Th>

                          <Th>
                            Statut
                          </Th>

                          <Th>
                            Prochaine étape
                          </Th>

                          <Th>
                            Dossier
                          </Th>
                        </tr>
                      </thead>

                      <tbody>
                        {maintenancesFiltrees.map(
                          (m) => {
                            const reservationLiee =
                              m.reservationId ??
                              m
                                .reservation
                                ?.id ??
                              null;

                            return (
                              <tr
                                key={
                                  m.id
                                }
                              >
                                <Td>
                                  {formaterDate(
                                    m.dateCreation
                                  )}
                                </Td>

                                <Td>
                                  <strong>
                                    {m
                                      .vehicule
                                      ?.immatriculation ||
                                      "—"}
                                  </strong>

                                  <div
                                    style={
                                      smallMuted
                                    }
                                  >
                                    {m.vehicule
                                      ? nomModeleVehicule(
                                          m.vehicule
                                        )
                                      : ""}
                                  </div>
                                </Td>

                                <Td>
                                  <strong>
                                    {travauxDemandesLisibles(m.natureIntervention)}
                                  </strong>

                                  {m.priorite && (
                                    <div
                                      style={{
                                        ...smallMuted,
                                        color:
                                          "#92400e",
                                      }}
                                    >
                                      Priorité :{" "}
                                      {
                                        m.priorite
                                      }
                                    </div>
                                  )}
                                </Td>

                                <Td>
                                  {reservationLiee !=
                                  null ? (
                                    <>
                                      Contrôle avant
                                      mission

                                      <div
                                        style={
                                          smallMuted
                                        }
                                      >
                                        DMD-
                                        {String(
                                          reservationLiee
                                        ).padStart(
                                          5,
                                          "0"
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    "Entretien autonome"
                                  )}
                                </Td>

                                <Td>
                                  {m.avisTexte?.trim() ? (
                                    <>
                                      <span
                                        style={{
                                          color:
                                            "#166534",
                                          fontWeight:
                                            700,
                                          fontSize:
                                            11,
                                        }}
                                      >
                                        ✓ Avis reçu
                                      </span>

                                      <div
                                        style={{
                                          ...smallMuted,
                                          maxWidth:
                                            220,
                                        }}
                                      >
                                        {
                                          m.avisTexte
                                        }
                                      </div>
                                    </>
                                  ) : (
                                    <span
                                      style={{
                                        color:
                                          "#92400e",
                                        fontSize:
                                          11,
                                        fontWeight:
                                          700,
                                      }}
                                    >
                                      En attente
                                    </span>
                                  )}
                                </Td>

                                <Td>
                                  {m.dateIntervention
                                    ? formaterDate(
                                        m.dateIntervention
                                      )
                                    : "—"}

                                  {m.prestataire && (
                                    <div
                                      style={
                                        smallMuted
                                      }
                                    >
                                      {
                                        m.prestataire
                                      }
                                    </div>
                                  )}
                                </Td>

                                <Td>
                                  <StatutMaintenance
                                    statut={
                                      m.statut
                                    }
                                    avisRecu={Boolean(
                                      m.avisTexte?.trim()
                                    )}
                                  />
                                </Td>

                                <Td>
                                  <span
                                    style={{
                                      fontSize:
                                        11,
                                      color:
                                        "#475569",
                                    }}
                                  >
                                    {prochaineEtapeMaintenance(
                                      m
                                    )}
                                  </span>
                                </Td>

                                <Td>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEntDossierOuvert(
                                        String(
                                          m.id
                                        )
                                      )
                                    }
                                    style={{
                                      ...boutonSecondaire,
                                      padding:
                                        "7px 10px",
                                      fontSize:
                                        11,
                                    }}
                                  >
                                    <Eye
                                      size={14}
                                    />

                                    Voir
                                  </button>
                                </Td>
                              </tr>
                            );
                          }
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {maintenanceSelectionnee && (
                <div
                  style={{
                    marginTop:
                      18,
                  }}
                >
                  <DossierEntretienDetail
                    maintenance={
                      maintenanceSelectionnee
                    }
                    onFermer={() =>
                      setEntDossierOuvert(
                        null
                      )
                    }
                  />
                </div>
              )}
            </section>
          )}


        </div>
      </main>
    </div>
  );
}

// =========================================================
// TICKET COMPACT / DETAILS / FORMULAIRE DID
// =========================================================

function travauxDemandesLisibles(valeur?: string | null): string {
  const nettoye = String(valeur ?? "")
    .replace(/^\s*\[SIGNALEMENT_CHAUFFEUR\]\s*/i, "")
    .trim();
  return nettoye || "—";
}

function decisionControleDID(m: Maintenance): string {
  return String(m.decisionDID ?? m.decisiondid ?? "").trim().toUpperCase();
}

function referenceTicket(id: number): string {
  return `TKT-${String(id).padStart(5, "0")}`;
}

const boiteTicketStyle: CSSProperties = {
  padding: "11px 12px", border: "1px solid #e2e8f0", borderRadius: 8,
  minWidth: 0, backgroundColor: "white",
};

function InfoTicket({titre, valeur}: {titre: string; valeur?: string | number | null}) {
  return <div style={boiteTicketStyle}>
    <div style={{fontSize: 10, color: "#64748b", textTransform: "uppercase", marginBottom: 5}}>{titre}</div>
    <div style={{fontSize: 13, color: "#111827", fontWeight: 600, overflowWrap: "anywhere"}}>
      {valeur === 0 ? 0 : valeur || "—"}
    </div>
  </div>;
}

function CarteTicketDID({ticketId, actuel, controles, aTraiter, ouvert, onBasculer,
  avis, envoi, onModifier, onSoumettre}: {
  ticketId: number;
  actuel: Maintenance;
  controles: Maintenance[];
  aTraiter: boolean;
  ouvert: boolean;
  onBasculer: () => void;
  avis: AvisEnCours;
  envoi: boolean;
  onModifier: (champ: keyof AvisEnCours, valeur: string) => void;
  onSoumettre: () => void;
}) {
  const r = actuel.reservation ?? controles.find((m) => m.reservation)?.reservation;
  const decision = decisionControleDID(actuel);
  const statut = aTraiter ? "En attente d'avis DID"
    : decision === "FAVORABLE" ? "Avis DID favorable transmis"
    : decision === "DEFAVORABLE" || decision === "DÉFAVORABLE"
      ? "Avis DID défavorable transmis" : "Avis DID transmis";
  const nomDemandeur = [r?.demandeurNom ?? r?.demandeur?.nom,
    r?.demandeurPrenom ?? r?.demandeur?.prenom].filter(Boolean).join(" ");

  return <article style={{border: "1px solid #cbd5e1", borderRadius: 11,
    overflow: "hidden", backgroundColor: "white"}}>
    {/* En-tête toujours blanc ; l'état reste indiqué par son badge. */}
    <div style={{padding: 18, backgroundColor: "#ffffff", color: "#111827"}}>
      <div style={{display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, flexWrap: "wrap"}}>
        <strong style={{fontSize: 17, color: "#111827"}}>
          Ticket {referenceTicket(ticketId)}
        </strong>
        <span style={{fontSize: 12, color: aTraiter ? "#1d4ed8" : "#166534", fontWeight: 600,
          backgroundColor: aTraiter ? "#eff6ff" : "#f0fdf4",
          border: aTraiter ? "1px solid #bfdbfe" : "1px solid #bbf7d0",
          borderRadius: 999, padding: "5px 10px"}}>
          {statut}
        </span>
      </div>
      <div style={{fontSize: 13, color: "#334155", marginTop: 10}}>
        Véhicule : <strong>{libelleVehicule(actuel.vehicule)}</strong>
      </div>
      <div style={{display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, flexWrap: "wrap", marginTop: 13}}>
        <span style={{fontSize: 12, color: "#64748b"}}>
          Demande reçue le {formaterDate(actuel.dateCreation)}
        </span>
        <button type="button" onClick={onBasculer} aria-expanded={ouvert}
          aria-controls={`ticket-did-${ticketId}`}
          style={{...boutonSecondaire, backgroundColor: "#2563eb", borderColor: "#2563eb", color: "white"}}>
          <Eye size={14} /> {ouvert ? "Masquer les détails" : "Détails"}
        </button>
      </div>
    </div>

    {ouvert && <div id={`ticket-did-${ticketId}`}
      style={{padding: 18, borderTop: "1px solid #e2e8f0", backgroundColor: "white", color: "#111827"}}>
      <h3 style={{fontSize: 14, color: "#111827", margin: "0 0 12px"}}>Informations du demandeur</h3>
      <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
        gap: 10, marginBottom: 18}}>
        <InfoTicket titre="Nom" valeur={nomDemandeur} />
        <InfoTicket titre="Matricule" valeur={r?.demandeurMatricule ??
          r?.demandeur?.matricule ?? r?.demandeur?.numMatricule} />
        <InfoTicket titre="Entité" valeur={r?.demandeurEntite} />
        <InfoTicket titre="Téléphone" valeur={r?.demandeurTelephone ?? r?.demandeur?.telephone} />
      </div>
      <h3 style={{fontSize: 14, color: "#111827", margin: "0 0 12px"}}>Informations du ticket</h3>
      <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
        gap: 10, marginBottom: 18}}>
        <InfoTicket titre="Objet" valeur={r?.motif} />
        <InfoTicket titre="Départ prévu" valeur={formaterDate(r?.dateDebut)} />
        <InfoTicket titre="Retour prévu" valeur={formaterDate(r?.dateFin)} />
        <InfoTicket titre="Point de départ" valeur={r?.pointDepart} />
        <InfoTicket titre="Destination" valeur={r?.destination} />
        <InfoTicket titre="Passagers" valeur={r?.nombrePassagers} />
        <InfoTicket titre="Liste des passagers" valeur={r?.listePassagers} />
        <InfoTicket titre="Observations" valeur={r?.observations} />
      </div>
      <h3 style={{fontSize: 14, color: "#111827", margin: "0 0 12px"}}>Véhicule à contrôler</h3>
      <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
        gap: 10, marginBottom: 18}}>
        <InfoTicket titre="Véhicule" valeur={libelleVehicule(actuel.vehicule)} />
        <InfoTicket titre="Affectation" valeur={actuel.vehicule?.affectation} />
        <InfoTicket titre="Nature du contrôle" valeur={travauxDemandesLisibles(actuel.natureIntervention)} />
        <InfoTicket titre="Date de demande DID" valeur={formaterDate(actuel.dateCreation)} />
      </div>

      {controles.length > 1 && (
        <section style={{
          marginBottom: 22, padding: 16, border: "1px solid #cbd5e1",
          borderRadius: 10, backgroundColor: "#ffffff", color: "#111827",
        }}>
          <h3 style={{fontSize: 17, fontWeight: 700, color: "#111827", margin: "0 0 14px"}}>
            Historique des contrôles du ticket
          </h3>
          <div style={{display: "grid", gap: 12}}>
            {controles.map((m, index) => {
              const avisHistorique = decisionControleDID(m);
              const decisionLisible = avisHistorique === "FAVORABLE"
                ? "Avis favorable"
                : ["DEFAVORABLE", "DÉFAVORABLE"].includes(avisHistorique)
                  ? "Avis défavorable" : "Avis en attente";
              const dateAvis = m.dateAvisDID ?? m.dateAvisdid ?? m.avisDate;
              const renseignements = [
                {titre: "Diagnostic visuel", valeur: m.diagnosticVisuel},
                {titre: "Observations du mécanicien", valeur: m.observationsMecanicien},
                {titre: "Pièces / actions nécessaires", valeur: m.piecesNecessaires},
              ];
              return (
                <div key={m.id} style={{
                  padding: 16, backgroundColor: "#ffffff", color: "#111827",
                  border: "1px solid #94a3b8", borderRadius: 9,
                }}>
                  <div style={{display: "flex", alignItems: "flex-start",
                    justifyContent: "space-between", gap: 12, flexWrap: "wrap"}}>
                    <div style={{minWidth: 0}}>
                      <div style={{fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 5}}>
                        Contrôle {index + 1}{String(m.id) === String(actuel.id) ? " · Véhicule actuel" : ""}
                      </div>
                      <div style={{fontSize: 16, fontWeight: 700, color: "#111827",
                        overflowWrap: "anywhere"}}>
                        {libelleVehicule(m.vehicule)}
                      </div>
                    </div>
                    <div style={{fontSize: 14, fontWeight: 700, color: "#111827",
                      backgroundColor: "#ffffff", border: "1px solid #64748b",
                      borderRadius: 6, padding: "7px 10px"}}>
                      {decisionLisible}
                    </div>
                  </div>
                  <div style={{fontSize: 13, color: "#334155", marginTop: 10}}>
                    {dateAvis ? "Avis transmis le " : "Contrôle demandé le "}
                    <strong style={{color: "#111827"}}>
                      {formaterDate(dateAvis ?? m.dateCreation)}
                    </strong>
                  </div>
                  {renseignements.some((champ) => champ.valeur?.trim()) && (
                    <div style={{display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 230px), 1fr))",
                      gap: 10, marginTop: 13}}>
                      {renseignements.filter((champ) => champ.valeur?.trim()).map((champ) => (
                        <div key={champ.titre} style={{padding: 12, border: "1px solid #cbd5e1",
                          borderRadius: 7, backgroundColor: "#ffffff", minWidth: 0}}>
                          <div style={{fontSize: 12, fontWeight: 700, color: "#475569",
                            marginBottom: 6}}>{champ.titre}</div>
                          <div style={{fontSize: 14, lineHeight: 1.55, fontWeight: 500,
                            color: "#111827", overflowWrap: "anywhere", whiteSpace: "pre-wrap"}}>
                            {champ.valeur}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {aTraiter ? <section style={{borderTop: "1px solid #e2e8f0", paddingTop: 18}}>
        <h3 style={{fontSize: 15, color: "#111827", margin: "0 0 13px"}}>Avis technique DID</h3>
        <div style={{display: "grid", gap: 12}}>
          <Champ label="Diagnostic visuel *"><textarea rows={3} value={avis.diagnosticVisuel}
            onChange={(e) => onModifier("diagnosticVisuel", e.target.value)}
            style={{...inputStyle, resize: "vertical"}} /></Champ>
          <Champ label="Observations du mécanicien *"><textarea rows={3}
            value={avis.observationsMecanicien}
            onChange={(e) => onModifier("observationsMecanicien", e.target.value)}
            style={{...inputStyle, resize: "vertical"}} /></Champ>
          <Champ label="Pièces ou actions nécessaires *"><textarea rows={3}
            value={avis.piecesNecessaires}
            onChange={(e) => onModifier("piecesNecessaires", e.target.value)}
            style={{...inputStyle, resize: "vertical"}} /></Champ>
          <div><div style={labelStyle}>Décision DID *</div>
            <div style={{display: "flex", gap: 8, flexWrap: "wrap"}}>
              <button type="button" onClick={() => onModifier("decision", "FAVORABLE")}
                aria-pressed={avis.decision === "FAVORABLE"}
                style={{...boutonSecondaire, backgroundColor: "#16a34a",
                  borderColor: "#16a34a", color: "#ffffff",
                  boxShadow: avis.decision === "FAVORABLE" ? "0 0 0 2px #ffffff inset" : "none"}}>
                <CheckCircle2 size={15}/> Favorable
              </button>
              <button type="button" onClick={() => onModifier("decision", "DEFAVORABLE")}
                aria-pressed={avis.decision === "DEFAVORABLE"}
                style={{...boutonSecondaire, backgroundColor: "#dc2626",
                  borderColor: "#dc2626", color: "#ffffff",
                  boxShadow: avis.decision === "DEFAVORABLE" ? "0 0 0 2px #ffffff inset" : "none"}}>
                <XCircle size={15}/> Défavorable
              </button>
            </div>
          </div>
          <div><button type="button" onClick={onSoumettre} disabled={envoi}
            style={{...boutonSecondaire, backgroundColor: "#dc2626", borderColor: "#dc2626",
              color: "white", opacity: envoi ? 0.65 : 1}}>
            <Send size={15} /> {envoi ? "Transmission..." : "Transmettre l'avis DID"}
          </button></div>
        </div>
      </section> : <section style={{borderTop: "1px solid #e2e8f0", paddingTop: 15}}>
        <h3 style={{fontSize: 14, margin: "0 0 10px"}}>Avis DID enregistré</h3>
        <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10}}>
          <InfoTicket titre="Décision" valeur={decision === "FAVORABLE" ? "Favorable"
            : ["DEFAVORABLE", "DÉFAVORABLE"].includes(decision) ? "Défavorable" : "Avis transmis"} />
          <InfoTicket titre="Date de l'avis" valeur={formaterDate(actuel.dateAvisDID ?? actuel.dateAvisdid ?? actuel.avisDate)} />
          <InfoTicket titre="Diagnostic visuel" valeur={actuel.diagnosticVisuel} />
          <InfoTicket titre="Observations" valeur={actuel.observationsMecanicien} />
          <InfoTicket titre="Pièces / actions nécessaires" valeur={actuel.piecesNecessaires} />
          <InfoTicket titre="Mécanicien" valeur={actuel.mecanicienEmail ?? actuel.avisAuteurEmail} />
        </div>
      </section>}
    </div>}
  </article>;
}

// =========================================================
// DETAIL DOSSIER ENTRETIEN
// =========================================================

function DossierEntretienDetail({
  maintenance,
  onFermer,
}: {
  maintenance: Maintenance;
  onFermer: () => void;
}) {
  const reservationLiee =
    maintenance.reservationId ??
    maintenance.reservation?.id ??
    null;

  const duree =
    dureeEntretienJours(
      maintenance
    );

  return (
    <Card>
      <div
        style={{
          display:
            "flex",
          justifyContent:
            "space-between",
          alignItems:
            "flex-start",
          gap: 12,
          flexWrap:
            "wrap",
          marginBottom:
            16,
        }}
      >
        <div>
          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap: 8,
              flexWrap:
                "wrap",
            }}
          >
            <Wrench
              size={18}
            />

            <h3
              style={{
                margin:
                  0,
                color:
                  "#111827",
                fontSize:
                  16,
              }}
            >
              Dossier d&apos;entretien
            </h3>

            <StatutMaintenance
              statut={
                maintenance.statut
              }
              avisRecu={Boolean(
                maintenance.avisTexte?.trim()
              )}
            />
          </div>

          <div
            style={{
              marginTop:
                5,
              color:
                "#64748b",
              fontSize:
                12,
            }}
          >
            {maintenance.vehicule
              ?.immatriculation ||
              "Véhicule non renseigné"}

            {" — "}

            {travauxDemandesLisibles(maintenance.natureIntervention)}
          </div>
        </div>

        <button
          type="button"
          onClick={
            onFermer
          }
          style={{
            ...boutonSecondaire,
            padding:
              "7px 10px",
          }}
        >
          <X
            size={14}
          />

          Fermer
        </button>
      </div>

      <div
        style={{
          display:
            "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10,
          marginBottom:
            16,
        }}
      >
        <DetailInfo
          label="Véhicule"
          value={
            maintenance.vehicule
              ? libelleVehicule(
                  maintenance.vehicule
                )
              : "—"
          }
        />

        <DetailInfo
          label="Origine"
          value={
            reservationLiee != null
              ? `Contrôle lié à DMD-${String(
                  reservationLiee
                ).padStart(
                  5,
                  "0"
                )}`
              : "Entretien autonome"
          }
        />

        <DetailInfo
          label="Priorité"
          value={
            maintenance.priorite ||
            "—"
          }
        />

        <DetailInfo
          label="Prestataire"
          value={
            maintenance.prestataire ||
            "—"
          }
        />

        <DetailInfo
          label="Date de création"
          value={formaterDate(
            maintenance.dateCreation
          )}
        />

        <DetailInfo
          label="Date intervention"
          value={formaterDate(
            maintenance.dateIntervention
          )}
        />

        <DetailInfo
          label="Date de clôture"
          value={formaterDate(
            maintenance.dateCloture
          )}
        />

        <DetailInfo
          label="Délai de traitement"
          value={
            duree != null
              ? `${duree.toLocaleString(
                  "fr-FR",
                  {
                    maximumFractionDigits:
                      1,
                  }
                )} jour(s)`
              : "—"
          }
        />
      </div>

      <div
        style={{
          display:
            "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 12,
        }}
      >
        <DetailBloc
          titre="Avis du mécanicien DID"
          contenu={
            maintenance.avisTexte?.trim() ||
            "Avis technique en attente."
          }
          meta={
            maintenance.avisTexte?.trim()
              ? [
                  maintenance.avisAuteurEmail ||
                    maintenance.mecanicienEmail,

                  formaterDate(
                    maintenance.avisDate ||
                      maintenance.dateAvisDID ||
                      maintenance.dateAvisdid
                  ),
                ]
                  .filter(Boolean)
                  .join(" • ")
              : undefined
          }
        />

        <DetailBloc
          titre="Diagnostic visuel"
          contenu={
            maintenance.diagnosticVisuel ||
            "—"
          }
        />

        <DetailBloc
          titre="Observations du mécanicien"
          contenu={
            maintenance.observationsMecanicien ||
            "—"
          }
        />

        <DetailBloc
          titre="Pièces nécessaires"
          contenu={
            maintenance.piecesNecessaires ||
            "—"
          }
        />

        <DetailBloc
          titre="Décision / conclusion DID"
          contenu={
            maintenance.decisionDID ||
            maintenance.decisiondid ||
            "—"
          }
        />

        <DetailBloc
          titre="Prochaine étape"
          contenu={prochaineEtapeMaintenance(
            maintenance
          )}
        />
      </div>

      <div
        style={{
          marginTop:
            16,
          paddingTop:
            14,
          borderTop:
            "1px solid #e2e8f0",
        }}
      >
        <strong
          style={{
            color:
              "#334155",
            fontSize:
              12,
          }}
        >
          Chronologie du dossier
        </strong>

        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 9,
            marginTop:
              9,
          }}
        >
          <ChronologieEntretien
            titre="Demande créée"
            date={
              maintenance.dateCreation
            }
            actif={Boolean(
              maintenance.dateCreation
            )}
          />

          <ChronologieEntretien
            titre="Avis DID"
            date={
              maintenance.avisDate ||
              maintenance.dateAvisDID ||
              maintenance.dateAvisdid
            }
            actif={Boolean(
              maintenance.avisTexte?.trim()
            )}
          />

          <ChronologieEntretien
            titre="Intervention"
            date={
              maintenance.dateIntervention
            }
            actif={
              maintenance.statut ===
                "PLANIFIEE" ||
              maintenance.statut ===
                "EN_COURS" ||
              maintenance.statut ===
                "CLOTUREE"
            }
          />

          <ChronologieEntretien
            titre="Clôture"
            date={
              maintenance.dateCloture
            }
            actif={
              String(
                maintenance.statut ||
                  ""
              ).toUpperCase() ===
              "CLOTUREE"
            }
          />
        </div>
      </div>
    </Card>
  );
}

// =========================================================
// COMPOSANTS UI
// =========================================================

function OngletButton({
  actif,
  couleur = "BLEU",
  onClick,
  icon,
  children,
}: {
  actif: boolean;
  couleur?: "BLEU" | "VERT" | "ROUGE";
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  const accent = couleur === "VERT" ? "#16a34a" : couleur === "ROUGE" ? "#dc2626" : "#2563eb";
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      style={{
        display:
          "inline-flex",
        alignItems:
          "center",
        justifyContent: "center",
        height: 40,
        boxSizing: "border-box",
        whiteSpace: "nowrap",
        gap:
          7,
        border: `1px solid ${accent}`,
        backgroundColor: accent,
        color: "#ffffff",
        boxShadow: actif ? "0 0 0 2px #ffffff inset, 0 0 0 1px currentColor" : "none",
        borderRadius:
          8,
        padding:
          "9px 13px",
        cursor:
          "pointer",
        fontSize:
          12,
        fontWeight:
          600,
      }}
    >
      {icon}
      {children}
    </button>
  );
}

function Card({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      style={{
        backgroundColor:
          "white",
        border:
          "1px solid #e2e8f0",
        borderRadius:
          10,
        padding:
          20,
      }}
    >
      {children}
    </div>
  );
}

function CardTitre({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display:
          "flex",
        alignItems:
          "center",
        gap:
          8,
        marginBottom:
          17,
      }}
    >
      {icon}

      <h3
        style={{
          margin:
            0,
          color:
            "#111827",
          fontSize:
            15,
        }}
      >
        {children}
      </h3>
    </div>
  );
}

function Champ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        style={
          labelStyle
        }
      >
        {label}
      </label>

      {children}
    </div>
  );
}

function ActionButton({
  disabled,
  children,
}: {
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={
        disabled
      }
      style={{
        display:
          "inline-flex",
        alignItems:
          "center",
        justifyContent:
          "center",
        gap:
          7,
        padding:
          "10px 14px",
        border:
          "none",
        borderRadius:
          8,
        backgroundColor:
          "#16a34a",
        color:
          "white",
        fontSize:
          13,
        fontWeight:
          600,
        cursor:
          disabled
            ? "not-allowed"
            : "pointer",
        opacity:
          disabled
            ? 0.6
            : 1,
      }}
    >
      {children}
    </button>
  );
}

function BlocVide({
  texte,
  icone,
}: {
  texte: string;
  icone?: ReactNode;
}) {
  return (
    <div
      style={{
        backgroundColor:
          "white",
        border:
          "1px dashed #cbd5e1",
        borderRadius:
          9,
        padding:
          34,
        color:
          "#94a3b8",
        textAlign:
          "center",
        fontSize:
          13,
      }}
    >
      {icone && (
        <div
          style={{
            marginBottom:
              10,
          }}
        >
          {icone}
        </div>
      )}

      {texte}
    </div>
  );
}

function Th({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <th
      style={{
        padding:
          "11px 12px",
        textAlign:
          "left",
        borderBottom:
          "1px solid #e2e8f0",
        backgroundColor:
          "#ffffff",
        color:
          "#334155",
        fontSize:
          11,
        fontWeight:
          700,
        whiteSpace:
          "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <td
      style={{
        padding:
          "11px 12px",
        borderBottom:
          "1px solid #f1f5f9",
        color:
          "#334155",
        fontSize:
          12,
        verticalAlign:
          "top",
      }}
    >
      {children}
    </td>
  );
}

function DetailInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding:
          10,
        border:
          "1px solid #e2e8f0",
        borderRadius:
          8,
        backgroundColor:
          "#f8fafc",
      }}
    >
      <div
        style={{
          color:
            "#94a3b8",
          fontSize:
            10,
          textTransform:
            "uppercase",
          marginBottom:
            4,
        }}
      >
        {label}
      </div>

      <div
        style={{
          color:
            "#334155",
          fontSize:
            12,
          fontWeight:
            600,
          wordBreak:
            "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function DetailBloc({
  titre,
  contenu,
  meta,
}: {
  titre: string;
  contenu: string;
  meta?: string;
}) {
  return (
    <div
      style={{
        padding:
          12,
        border:
          "1px solid #e2e8f0",
        borderRadius:
          8,
        backgroundColor:
          "white",
      }}
    >
      <div
        style={{
          color:
            "#64748b",
          fontSize:
            11,
          fontWeight:
            700,
          marginBottom:
            6,
        }}
      >
        {titre}
      </div>

      <div
        style={{
          color:
            "#334155",
          fontSize:
            12,
          lineHeight:
            1.5,
          whiteSpace:
            "pre-wrap",
        }}
      >
        {contenu}
      </div>

      {meta && (
        <div
          style={{
            marginTop:
              7,
            color:
              "#94a3b8",
            fontSize:
              10,
          }}
        >
          {meta}
        </div>
      )}
    </div>
  );
}

function ChronologieEntretien({
  titre,
  date,
  actif,
}: {
  titre: string;
  date?: string | null;
  actif: boolean;
}) {
  return (
    <div
      style={{
        padding:
          10,
        border:
          actif
            ? "1px solid #bbf7d0"
            : "1px solid #e2e8f0",
        borderRadius:
          8,
        backgroundColor:
          actif
            ? "#f0fdf4"
            : "#f8fafc",
      }}
    >
      <div
        style={{
          fontSize:
            11,
          color:
            actif
              ? "#166534"
              : "#64748b",
          fontWeight:
            700,
        }}
      >
        {titre}
      </div>

      <div
        style={{
          marginTop:
            4,
          color:
            "#64748b",
          fontSize:
            10,
        }}
      >
        {date
          ? formaterDate(
              date
            )
          : actif
            ? "Enregistré"
            : "À venir"}
      </div>
    </div>
  );
}

// =========================================================
// BADGE STATUT
// =========================================================

function StatutMaintenance({
  statut,
  avisRecu = false,
}: {
  statut: string;
  avisRecu?: boolean;
}) {
  const valeur =
    String(
      statut || ""
    ).toUpperCase();

  const statutAffiche =
    valeur ===
      "EN_ATTENTE_AVIS_DID" &&
    avisRecu
      ? "AVIS_DID_RECU"
      : valeur;

  const map: Record<
    string,
    {
      label: string;
      bg: string;
      color: string;
    }
  > = {
    EN_ATTENTE_AVIS_DID: {
      label:
        "Avis DID attendu",
      bg:
        "#fef3c7",
      color:
        "#92400e",
    },

    AVIS_DID_RECU: {
      label:
        "Avis DID reçu",
      bg:
        "#dcfce7",
      color:
        "#166534",
    },

    PLANIFIEE: {
      label:
        "Planifiée",
      bg:
        "#dbeafe",
      color:
        "#1d4ed8",
    },

    EN_COURS: {
      label:
        "En cours",
      bg:
        "#e0f2fe",
      color:
        "#0369a1",
    },

    CLOTUREE: {
      label:
        "Clôturée",
      bg:
        "#dcfce7",
      color:
        "#166534",
    },
  };

  const item =
    map[statutAffiche] || {
      label:
        statut || "—",
      bg:
        "#f1f5f9",
      color:
        "#475569",
    };

  return (
    <span
      style={{
        padding:
          "4px 9px",
        borderRadius:
          999,
        backgroundColor:
          item.bg,
        color:
          item.color,
        fontSize:
          10,
        fontWeight:
          700,
        whiteSpace:
          "nowrap",
      }}
    >
      {item.label}
    </span>
  );
}

// =========================================================
// HELPERS ENTRETIEN
// =========================================================

function statutEntretienAffiche(
  maintenance: Maintenance
) {
  const statut =
    String(
      maintenance.statut ||
        ""
    ).toUpperCase();

  if (
    statut ===
      "EN_ATTENTE_AVIS_DID" &&
    maintenance.avisTexte?.trim()
  ) {
    return "Avis DID reçu";
  }

  const map:
    Record<string, string> = {
    EN_ATTENTE_AVIS_DID:
      "Avis DID attendu",

    PLANIFIEE:
      "Planifiée",

    EN_COURS:
      "En cours",

    CLOTUREE:
      "Clôturée",
  };

  return (
    map[statut] ||
    maintenance.statut ||
    "—"
  );
}

function prochaineEtapeMaintenance(
  maintenance: Maintenance
) {
  const statut =
    String(
      maintenance.statut ||
        ""
    ).toUpperCase();

  if (
    statut ===
    "CLOTUREE"
  ) {
    return "Dossier clôturé";
  }

  if (
    statut ===
    "EN_COURS"
  ) {
    return "Clôturer après intervention";
  }

  if (
    statut ===
    "PLANIFIEE"
  ) {
    return "Exécuter l'intervention";
  }

  if (
    statut ===
      "EN_ATTENTE_AVIS_DID" &&
    maintenance.avisTexte?.trim()
  ) {
    return "Avis DID reçu — attente de planification";
  }

  return "Avis technique DID requis";
}

function dureeEntretienJours(
  maintenance: Maintenance
) {
  if (
    !maintenance.dateCreation ||
    !maintenance.dateCloture
  ) {
    return null;
  }

  const debut =
    new Date(
      maintenance.dateCreation
    ).getTime();

  const fin =
    new Date(
      maintenance.dateCloture
    ).getTime();

  if (
    !Number.isFinite(
      debut
    ) ||
    !Number.isFinite(
      fin
    ) ||
    fin < debut
  ) {
    return null;
  }

  return (
    Math.round(
      (
        (fin - debut) /
        (
          1000 *
          60 *
          60 *
          24
        )
      ) *
        10
    ) / 10
  );
}

function nomModeleVehicule(
  vehicule: Vehicule
) {
  return (
    [
      vehicule.marque,
      vehicule.modele,
      vehicule.modeleType,
    ]
      .filter(Boolean)
      .join(" ") ||
    vehicule.typeVehicule ||
    ""
  );
}

function libelleVehicule(
  vehicule?: Vehicule | null
) {
  if (!vehicule) {
    return "—";
  }

  const details =
    nomModeleVehicule(
      vehicule
    );

  return details
    ? `${vehicule.immatriculation} — ${details}`
    : vehicule.immatriculation;
}

function formaterDate(
  valeur?: string | null
) {
  if (!valeur) {
    return "—";
  }

  const date =
    new Date(
      valeur
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return valeur;
  }

  return date.toLocaleString(
    "fr-FR",
    {
      day:
        "2-digit",
      month:
        "2-digit",
      year:
        "numeric",
      hour:
        "2-digit",
      minute:
        "2-digit",
    }
  );
}

// =========================================================
// STYLES
// =========================================================

const labelStyle:
  CSSProperties = {
  display:
    "block",

  marginBottom:
    5,

  color:
    "#475569",

  fontSize:
    11,

  fontWeight:
    600,
};

const inputStyle:
  CSSProperties = {
  width:
    "100%",

  padding:
    "10px 11px",

  border:
    "1px solid #d1d5db",

  borderRadius:
    7,

  backgroundColor:
    "white",

  color:
    "#111827",

  fontSize:
    12,

  boxSizing:
    "border-box",
};

const boutonSecondaire: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  padding: "9px 13px",
  backgroundColor: "#2563eb",
  color: "#ffffff",
  border: "1px solid #2563eb",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
};

const regleCompacteStyle:
  CSSProperties = {
  padding:
    10,

  borderRadius:
    7,

  backgroundColor:
    "#fff7ed",

  border:
    "1px solid #fed7aa",

  color:
    "#9a3412",

  fontSize:
    11,

  lineHeight:
    1.5,
};

const infoBoxStyle:
  CSSProperties = {
  display:
    "grid",

  gap:
    4,

  marginBottom:
    14,

  padding:
    11,

  border:
    "1px solid #bfdbfe",

  backgroundColor:
    "#eff6ff",

  borderRadius:
    8,

  color:
    "#1e40af",

  fontSize:
    11,

  lineHeight:
    1.45,
};

const etapeCircuitStyle:
  CSSProperties = {
  display:
    "grid",

  gridTemplateColumns:
    "30px minmax(0, 1fr)",

  gap:
    10,

  alignItems:
    "start",

  padding:
    10,

  border:
    "1px solid #e2e8f0",

  borderRadius:
    8,

  backgroundColor:
    "#f8fafc",
};

const numeroEtapeStyle:
  CSSProperties = {
  width:
    28,

  height:
    28,

  borderRadius:
    999,

  backgroundColor:
    "#e0e7ff",

  color:
    "#3730a3",

  display:
    "inline-flex",

  alignItems:
    "center",

  justifyContent:
    "center",

  fontSize:
    11,

  fontWeight:
    800,
};

const rechercheStyle:
  CSSProperties = {
  height:
    38,

  display:
    "flex",

  alignItems:
    "center",

  gap:
    8,

  padding:
    "0 10px",

  boxSizing:
    "border-box",

  border:
    "1px solid #d1d5db",

  borderRadius:
    7,

  backgroundColor:
    "white",

  color:
    "#64748b",
};

const rechercheInputStyle:
  CSSProperties = {
  flex:
    1,

  minWidth:
    0,

  border:
    0,

  outline:
    0,

  backgroundColor:
    "transparent",

  fontSize:
    12,
};

const tableCardStyle:
  CSSProperties = {
  border:
    "1px solid #e2e8f0",

  borderRadius:
    8,

  overflowX:
    "auto",
};

const smallMuted:
  CSSProperties = {
  marginTop:
    3,

  color:
    "#94a3b8",

  fontSize:
    10,

  lineHeight:
    1.35,
};
