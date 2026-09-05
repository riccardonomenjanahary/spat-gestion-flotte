"use client";

import {
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
  AlertTriangle,
  Car,
  CheckCircle2,
  Clock,
  ClipboardList,
  Fuel,
  MapPin,
  Navigation,
  PlusCircle,
  RefreshCw,
  Route,
  ShieldCheck,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";

// =========================================================
// TYPES
// =========================================================

interface Vehicule {
  id: number;
  immatriculation: string;

  // Compatibilité avec les différentes versions du modèle
  marque?: string | null;
  modele?: string | null;

  categorie?: string | null;
  modeleType?: string | null;
  typeVehicule?: string | null;

  annee?: number | null;
  affectation?: string | null;

  statut: string;
}

interface Chauffeur {
  id: number;
  matricule?: string | null;
  nom?: string | null;
  prenom?: string | null;
  telephone?: string | null;
  email?: string | null;
  statut?: string | null;
}

interface Demandeur {
  id?: number;
  nom?: string | null;
  prenom?: string | null;
  nomComplet?: string | null;
  numMatricule?: string | null;
  matricule?: string | null;
  email?: string | null;
}

interface Reservation {
  id: number;

  vehicule?: Vehicule | null;
  chauffeur?: Chauffeur | null;
  demandeur?: Demandeur | null;

  dateDebut: string;
  dateFin: string;

  motif: string;

  demandeUrgente: boolean;
  motifUrgence?: string | null;

  statut: string;
  dateCreation: string;

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

  dateValidationN1?: string | null;
  dateValidationN2?: string | null;
}

interface TransactionCarburant {
  id: string;

  vehicule?: Vehicule | null;

  type: "DOTATION" | "CONSOMMATION" | string;

  quantiteLitres: number;
  dateOperation: string;

  justificatif?: string | null;
}

interface Maintenance {
  id: string;

  vehicule?: Vehicule | null;

  natureIntervention: string;
  statut: string;

  avisTexte?: string | null;
  avisDate?: string | null;

  dateCreation?: string | null;
  dateCloture?: string | null;
}

interface Assurance {
  id: string | number;

  vehicule?: Vehicule | null;

  numeroPolice?: string | null;

  dateExpiration?: string | null;
  dateEcheance?: string | null;
  dateFin?: string | null;

  statut?: string | null;
}

interface Sinistre {
  id: string | number;

  vehicule?: Vehicule | null;

  dateSinistre?: string | null;
  date?: string | null;

  conducteur?: string | null;

  circonstance?: string | null;
  description?: string | null;

  statut?: string | null;
}

type Onglet =
  | "SUIVI"
  | "DEMANDES"
  | "CARBURANT"
  | "ENTRETIEN"
  | "ASSURANCES";

// =========================================================
// PAGE
// =========================================================

export default function AgentFlottePage() {
  return (
    <RoleGuard role={ROLES.AGENT_FLOTTE}>
      <AgentFlotteContent />
    </RoleGuard>
  );
}

// =========================================================
// CONTENU
// =========================================================

function AgentFlotteContent() {
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [onglet, setOnglet] = useState<Onglet>("SUIVI");

  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [transactions, setTransactions] =
    useState<TransactionCarburant[]>([]);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [assurances, setAssurances] = useState<Assurance[]>([]);
  const [sinistres, setSinistres] = useState<Sinistre[]>([]);

  const [chargement, setChargement] = useState(true);

  // =========================================================
  // CARBURANT
  // =========================================================

  const [carbVehiculeId, setCarbVehiculeId] = useState("");

  const [carbType, setCarbType] =
    useState<"DOTATION" | "CONSOMMATION">("CONSOMMATION");

  const [carbQuantite, setCarbQuantite] = useState("");

  const [carbDate, setCarbDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

  const [carbJustificatif, setCarbJustificatif] = useState("");

  const [envoiCarburant, setEnvoiCarburant] = useState(false);

  // =========================================================
  // ENTRETIEN
  // =========================================================

  const [entVehiculeId, setEntVehiculeId] = useState("");
  const [entNature, setEntNature] = useState("");
  const [envoiEntretien, setEnvoiEntretien] = useState(false);

  // =========================================================
  // ASSURANCE
  // =========================================================

  const [assVehiculeId, setAssVehiculeId] = useState("");
  const [assNumeroPolice, setAssNumeroPolice] = useState("");
  const [assDateExpiration, setAssDateExpiration] = useState("");
  const [envoiAssurance, setEnvoiAssurance] = useState(false);

  // =========================================================
  // SINISTRE
  // =========================================================

  const [sinVehiculeId, setSinVehiculeId] = useState("");

  const [sinDate, setSinDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

  const [sinConducteur, setSinConducteur] = useState("");
  const [sinCirconstance, setSinCirconstance] = useState("");

  const [envoiSinistre, setEnvoiSinistre] = useState(false);

  // =========================================================
  // TOKEN
  // =========================================================

  const getToken = () => {
    if (typeof window === "undefined") return null;

    return localStorage.getItem("token");
  };

  // =========================================================
  // FETCH
  // =========================================================

  const fetchListe = async <T,>(
    url: string,
    token: string
  ): Promise<T[]> => {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const message = await res.text().catch(() => "");

      throw new Error(
        `${res.status} ${message}`.trim()
      );
    }

    const data = await res.json();

    return Array.isArray(data) ? data : [];
  };

  const fetchOptionnel = async <T,>(
    url: string,
    token: string
  ): Promise<T[]> => {
    try {
      return await fetchListe<T>(url, token);
    } catch (error) {
      console.warn(
        "Module non disponible :",
        url,
        error
      );

      return [];
    }
  };

  // =========================================================
  // CHARGEMENT
  // =========================================================

  const charger = async () => {
    if (!API) {
      toast.error(
        "NEXT_PUBLIC_API_URL n'est pas configurée."
      );

      setChargement(false);
      return;
    }

    const token = getToken();

    if (!token) {
      toast.error(
        "Session expirée. Veuillez vous reconnecter."
      );

      setChargement(false);
      return;
    }

    setChargement(true);

    try {
      /*
       * Données principales réellement présentes
       * dans le système.
       */
      const [v, r, c, m] = await Promise.all([
        fetchListe<Vehicule>(
          `${API}/vehicules`,
          token
        ),

        fetchListe<Reservation>(
          `${API}/reservations`,
          token
        ),

        fetchListe<TransactionCarburant>(
          `${API}/carburant`,
          token
        ),

        fetchListe<Maintenance>(
          `${API}/maintenances`,
          token
        ),
      ]);

      setVehicules(v);
      setReservations(r);
      setTransactions(c);
      setMaintenances(m);

      /*
       * Ces deux modules restent optionnels
       * pour éviter de bloquer toute la page
       * s'ils ne sont pas disponibles.
       */
      const [a, s] = await Promise.all([
        fetchOptionnel<Assurance>(
          `${API}/assurances`,
          token
        ),

        fetchOptionnel<Sinistre>(
          `${API}/sinistres`,
          token
        ),
      ]);

      setAssurances(a);
      setSinistres(s);
    } catch (error) {
      console.error(
        "Erreur chargement Agent Flotte :",
        error
      );

      toast.error(
        "Impossible de charger les données de la flotte."
      );
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    charger();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =========================================================
  // MISSIONS ACTIVES
  // =========================================================

  const missionsActives = useMemo(() => {
    const maintenant = Date.now();

    return reservations.filter((reservation) => {
      if (
        reservation.statut !== "VALIDEE" ||
        !reservation.vehicule
      ) {
        return false;
      }

      const debut =
        new Date(reservation.dateDebut).getTime();

      const fin =
        new Date(reservation.dateFin).getTime();

      return (
        Number.isFinite(debut) &&
        Number.isFinite(fin) &&
        maintenant >= debut &&
        maintenant <= fin
      );
    });
  }, [reservations]);

  // =========================================================
  // MAP MISSIONS PAR VEHICULE
  // =========================================================

  const missionParVehicule = useMemo(() => {
    const map = new Map<number, Reservation>();

    missionsActives.forEach((mission) => {
      if (mission.vehicule?.id) {
        map.set(
          mission.vehicule.id,
          mission
        );
      }
    });

    return map;
  }, [missionsActives]);

  // =========================================================
  // PROCHAINE MISSION
  // =========================================================

  const prochaineMissionParVehicule = useMemo(() => {
    const maintenant = Date.now();

    const map = new Map<number, Reservation>();

    reservations
      .filter(
        (r) =>
          r.statut === "VALIDEE" &&
          r.vehicule &&
          new Date(r.dateDebut).getTime() > maintenant
      )
      .sort(
        (a, b) =>
          new Date(a.dateDebut).getTime() -
          new Date(b.dateDebut).getTime()
      )
      .forEach((r) => {
        const id = r.vehicule!.id;

        if (!map.has(id)) {
          map.set(id, r);
        }
      });

    return map;
  }, [reservations]);

  // =========================================================
  // STATISTIQUES
  // =========================================================

  const disponibles = vehicules.filter(
    (v) => v.statut === "DISPONIBLE"
  ).length;

  const maintenance = vehicules.filter(
    (v) =>
      v.statut === "MAINTENANCE" ||
      v.statut === "EN_MAINTENANCE"
  ).length;

  const demandesEnAttente = reservations.filter(
    (r) => r.statut === "EN_ATTENTE"
  ).length;

  const demandesUrgentes = reservations.filter(
    (r) =>
      r.demandeUrgente &&
      r.statut !== "REFUSEE"
  ).length;

  const entretienAttenteDID = maintenances.filter(
    (m) =>
      m.statut === "EN_ATTENTE_AVIS_DID"
  ).length;

  const justificatifsManquants =
    transactions.filter(
      (t) =>
        t.type === "CONSOMMATION" &&
        !t.justificatif?.trim()
    ).length;

  const assurancesJ15 = assurances.filter((a) => {
    const date =
      a.dateExpiration ||
      a.dateEcheance ||
      a.dateFin;

    if (!date) return false;

    const maintenant = new Date();

    const expiration = new Date(date);

    const difference =
      expiration.getTime() -
      maintenant.getTime();

    const jours =
      difference /
      (1000 * 60 * 60 * 24);

    return jours >= 0 && jours <= 15;
  }).length;

  const nombreAlertes =
    demandesUrgentes +
    entretienAttenteDID +
    justificatifsManquants +
    assurancesJ15;

  // =========================================================
  // CARBURANT
  // =========================================================

  const soumettreCarburant = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !carbVehiculeId ||
      !carbQuantite ||
      !carbDate
    ) {
      toast.error(
        "Véhicule, quantité et date sont obligatoires."
      );

      return;
    }

    if (!API) return;

    const token = getToken();

    if (!token) return;

    setEnvoiCarburant(true);

    try {
      const res = await fetch(
        `${API}/carburant`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            vehiculeId:
              Number(carbVehiculeId),

            type: carbType,

            quantiteLitres:
              Number(carbQuantite),

            dateOperation:
              carbDate,

            justificatif:
              carbJustificatif || null,
          }),
        }
      );

      if (!res.ok) {
        const message =
          await res.text().catch(() => "");

        throw new Error(
          message ||
            "Erreur lors de l'enregistrement."
        );
      }

      toast.success(
        carbType === "DOTATION"
          ? "Dotation enregistrée."
          : "Consommation enregistrée."
      );

      setCarbVehiculeId("");
      setCarbQuantite("");
      setCarbJustificatif("");

      await charger();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer."
      );
    } finally {
      setEnvoiCarburant(false);
    }
  };

  // =========================================================
  // ENTRETIEN
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

    if (!API) return;

    const token = getToken();

    if (!token) return;

    setEnvoiEntretien(true);

    try {
      const res = await fetch(
        `${API}/maintenances`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            vehicule: {
              id: Number(entVehiculeId),
            },

            natureIntervention:
              entNature.trim(),
          }),
        }
      );

      if (!res.ok) {
        const message =
          await res.text().catch(() => "");

        throw new Error(
          message ||
            "Erreur lors de la création."
        );
      }

      toast.success(
        "Demande d'entretien créée. Avis DID requis avant planification."
      );

      setEntVehiculeId("");
      setEntNature("");

      await charger();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de créer la demande."
      );
    } finally {
      setEnvoiEntretien(false);
    }
  };

  // =========================================================
  // ASSURANCE
  // =========================================================

  const soumettreAssurance = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !assVehiculeId ||
      !assNumeroPolice ||
      !assDateExpiration
    ) {
      toast.error(
        "Tous les champs obligatoires doivent être renseignés."
      );

      return;
    }

    if (!API) return;

    const token = getToken();

    if (!token) return;

    setEnvoiAssurance(true);

    try {
      const res = await fetch(
        `${API}/assurances`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            vehicule: {
              id: Number(assVehiculeId),
            },

            numeroPolice:
              assNumeroPolice.trim(),

            dateExpiration:
              assDateExpiration,
          }),
        }
      );

      if (!res.ok) {
        const message =
          await res.text().catch(() => "");

        throw new Error(
          message ||
            "Erreur lors de l'enregistrement."
        );
      }

      toast.success(
        "Assurance enregistrée."
      );

      setAssVehiculeId("");
      setAssNumeroPolice("");
      setAssDateExpiration("");

      await charger();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer l'assurance."
      );
    } finally {
      setEnvoiAssurance(false);
    }
  };

  // =========================================================
  // SINISTRE
  // =========================================================

  const soumettreSinistre = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !sinVehiculeId ||
      !sinDate ||
      !sinConducteur.trim()
    ) {
      toast.error(
        "Véhicule, date et conducteur sont obligatoires."
      );

      return;
    }

    if (!API) return;

    const token = getToken();

    if (!token) return;

    setEnvoiSinistre(true);

    try {
      const res = await fetch(
        `${API}/sinistres`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            vehicule: {
              id: Number(sinVehiculeId),
            },

            dateSinistre: sinDate,

            conducteur:
              sinConducteur.trim(),

            circonstance:
              sinCirconstance.trim(),
          }),
        }
      );

      if (!res.ok) {
        const message =
          await res.text().catch(() => "");

        throw new Error(
          message ||
            "Erreur lors de la déclaration."
        );
      }

      toast.success(
        "Sinistre déclaré."
      );

      setSinVehiculeId("");
      setSinConducteur("");
      setSinCirconstance("");

      await charger();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de déclarer le sinistre."
      );
    } finally {
      setEnvoiSinistre(false);
    }
  };

  // =========================================================
  // CHARGEMENT
  // =========================================================

  if (chargement) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#f3f4f6",
        }}
      >
        <EnTete />

        <div
          style={{
            padding: 50,
            textAlign: "center",
            color: "#64748b",
          }}
        >
          Chargement des données de la flotte...
        </div>
      </div>
    );
  }

  // =========================================================
  // INTERFACE
  // =========================================================

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f3f4f6",
      }}
    >
      <EnTete />

      <div
        style={{
          padding: 28,
          maxWidth: 1500,
          margin: "0 auto",
        }}
      >
        {/* ================================================ */}
        {/* TITRE */}
        {/* ================================================ */}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 20,
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                color: "#1e293b",
                fontSize: 25,
              }}
            >
              Pilotage opérationnel de la flotte
            </h1>

            <p
              style={{
                margin: "6px 0 0",
                color: "#64748b",
                fontSize: 14,
              }}
            >
              Suivi quotidien des véhicules,
              missions, consommations,
              entretiens et échéances.
            </p>
          </div>

          <button
            type="button"
            onClick={charger}
            style={refreshButton}
          >
            <RefreshCw size={16} />
            Actualiser
          </button>
        </div>

        {/* ================================================ */}
        {/* KPI */}
        {/* ================================================ */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 14,
            marginBottom: 22,
          }}
        >
          <Kpi
            icon={<Car size={20} />}
            titre="Parc total"
            valeur={vehicules.length}
          />

          <Kpi
            icon={<Route size={20} />}
            titre="En mission"
            valeur={missionsActives.length}
          />

          <Kpi
            icon={<CheckCircle2 size={20} />}
            titre="Disponibles"
            valeur={disponibles}
          />

          <Kpi
            icon={<Wrench size={20} />}
            titre="Maintenance"
            valeur={maintenance}
          />

          <Kpi
            icon={<ClipboardList size={20} />}
            titre="Demandes à traiter"
            valeur={demandesEnAttente}
          />

          <Kpi
            icon={<AlertTriangle size={20} />}
            titre="Alertes"
            valeur={nombreAlertes}
            alerte={nombreAlertes > 0}
          />
        </div>

        {/* ================================================ */}
        {/* ALERTES METIER */}
        {/* ================================================ */}

        {nombreAlertes > 0 && (
          <div
            style={{
              backgroundColor: "#fff",
              border: "1px solid #fed7aa",
              borderLeft: "4px solid #f97316",
              borderRadius: 10,
              padding: 16,
              marginBottom: 22,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <AlertTriangle
                size={18}
                color="#ea580c"
              />

              <strong
                style={{
                  color: "#9a3412",
                }}
              >
                Points nécessitant une attention
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              {demandesUrgentes > 0 && (
                <AlertChip>
                  {demandesUrgentes} demande(s)
                  urgente(s)
                </AlertChip>
              )}

              {entretienAttenteDID > 0 && (
                <AlertChip>
                  {entretienAttenteDID} entretien(s)
                  en attente d&apos;avis DID
                </AlertChip>
              )}

              {assurancesJ15 > 0 && (
                <AlertChip>
                  {assurancesJ15} assurance(s)
                  à échéance sous 15 jours
                </AlertChip>
              )}

              {justificatifsManquants > 0 && (
                <AlertChip>
                  {justificatifsManquants} justificatif(s)
                  carburant manquant(s)
                </AlertChip>
              )}
            </div>
          </div>
        )}

        {/* ================================================ */}
        {/* ONGLETS */}
        {/* ================================================ */}

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 7,
            marginBottom: 22,
          }}
        >
          <OngletButton
            actif={onglet === "SUIVI"}
            onClick={() => setOnglet("SUIVI")}
            icon={<Navigation size={16} />}
          >
            Suivi flotte
          </OngletButton>

          <OngletButton
            actif={onglet === "DEMANDES"}
            onClick={() => setOnglet("DEMANDES")}
            icon={<ClipboardList size={16} />}
          >
            Demandes / Missions
          </OngletButton>

          <OngletButton
            actif={onglet === "CARBURANT"}
            onClick={() => setOnglet("CARBURANT")}
            icon={<Fuel size={16} />}
          >
            Carburant
          </OngletButton>

          <OngletButton
            actif={onglet === "ENTRETIEN"}
            onClick={() => setOnglet("ENTRETIEN")}
            icon={<Wrench size={16} />}
          >
            Entretien
          </OngletButton>

          <OngletButton
            actif={onglet === "ASSURANCES"}
            onClick={() => setOnglet("ASSURANCES")}
            icon={<ShieldCheck size={16} />}
          >
            Assurances / Sinistres
          </OngletButton>
        </div>

        {/* ================================================ */}
        {/* SUIVI DES VEHICULES */}
        {/* ================================================ */}

        {onglet === "SUIVI" && (
          <section>
            <SectionTitre
              titre="Suivi des véhicules"
              sousTitre="Les informations de mission proviennent de la base SPAT. La partie GPS sera branchée ultérieurement au prestataire."
            />

            {vehicules.length === 0 ? (
              <BlocVide texte="Aucun véhicule enregistré." />
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 18,
                }}
              >
                {vehicules.map((vehicule) => (
                  <VehiculeSuiviCard
                    key={vehicule.id}
                    vehicule={vehicule}
                    mission={
                      missionParVehicule.get(
                        vehicule.id
                      ) || null
                    }
                    prochaineMission={
                      prochaineMissionParVehicule.get(
                        vehicule.id
                      ) || null
                    }
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ================================================ */}
        {/* DEMANDES / MISSIONS */}
        {/* ================================================ */}

        {onglet === "DEMANDES" && (
          <section>
            <SectionTitre
              titre="Demandes et missions"
              sousTitre="Consultation opérationnelle et traçabilité des demandes de véhicule."
            />

            {reservations.length === 0 ? (
              <BlocVide texte="Aucune demande enregistrée." />
            ) : (
              <div style={tableCard}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: 1100,
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor: "#f8fafc",
                      }}
                    >
                      <Th>Créée le</Th>
                      <Th>Bénéficiaire</Th>
                      <Th>Mission</Th>
                      <Th>Trajet</Th>
                      <Th>Véhicule</Th>
                      <Th>Chauffeur</Th>
                      <Th>Période</Th>
                      <Th>Statut</Th>
                    </tr>
                  </thead>

                  <tbody>
                    {reservations.map((r) => (
                      <tr key={r.id}>
                        <Td>
                          {formaterDate(
                            r.dateCreation
                          )}
                        </Td>

                        <Td>
                          <strong>
                            {nomBeneficiaire(r)}
                          </strong>

                          {r.demandeurMatricule && (
                            <div style={smallMuted}>
                              {r.demandeurMatricule}
                            </div>
                          )}
                        </Td>

                        <Td>
                          {r.motif || "—"}

                          {r.demandeUrgente && (
                            <div
                              style={{
                                marginTop: 4,
                                color: "#dc2626",
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              URGENTE
                            </div>
                          )}
                        </Td>

                        <Td>
                          <div>
                            {r.pointDepart || "—"}
                          </div>

                          <div style={smallMuted}>
                            →
                            {" "}
                            {r.destination || "—"}
                          </div>
                        </Td>

                        <Td>
                          {r.vehicule
                            ? libelleVehicule(
                                r.vehicule
                              )
                            : "Non affecté"}
                        </Td>

                        <Td>
                          {r.chauffeur
                            ? nomChauffeur(
                                r.chauffeur
                              )
                            : r.besoinChauffeur
                            ? "Non affecté"
                            : "Sans chauffeur"}
                        </Td>

                        <Td>
                          <div>
                            {formaterDate(
                              r.dateDebut
                            )}
                          </div>

                          <div style={smallMuted}>
                            au{" "}
                            {formaterDate(
                              r.dateFin
                            )}
                          </div>
                        </Td>

                        <Td>
                          <StatutReservation
                            statut={r.statut}
                          />
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ================================================ */}
        {/* CARBURANT */}
        {/* ================================================ */}

        {onglet === "CARBURANT" && (
          <section>
            <SectionTitre
              titre="Suivi du carburant"
              sousTitre="Dotations, consommations et justificatifs par véhicule."
            />

            <div style={twoColumns}>
              <Card>
                <CardTitre
                  icon={
                    <Fuel
                      size={18}
                      color="#0369a1"
                    />
                  }
                >
                  Nouvelle saisie
                </CardTitre>

                <div style={infoApi}>
                  <span>
                    Solde carte carburant
                  </span>

                  <strong>
                    Donnée prestataire pas encore disponible
                  </strong>
                </div>

                <form
                  onSubmit={soumettreCarburant}
                  style={formStyle}
                >
                  <Champ label="Véhicule">
                    <select
                      value={carbVehiculeId}
                      onChange={(e) =>
                        setCarbVehiculeId(
                          e.target.value
                        )
                      }
                      style={inputStyle}
                      required
                    >
                      <option value="">
                        Sélectionner
                      </option>

                      {vehicules.map((v) => (
                        <option
                          key={v.id}
                          value={v.id}
                        >
                          {libelleVehicule(v)}
                        </option>
                      ))}
                    </select>
                  </Champ>

                  <div style={twoInputColumns}>
                    <Champ label="Type">
                      <select
                        value={carbType}
                        onChange={(e) =>
                          setCarbType(
                            e.target.value as
                              | "DOTATION"
                              | "CONSOMMATION"
                          )
                        }
                        style={inputStyle}
                      >
                        <option value="CONSOMMATION">
                          Consommation
                        </option>

                        <option value="DOTATION">
                          Dotation
                        </option>
                      </select>
                    </Champ>

                    <Champ label="Quantité (L)">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={carbQuantite}
                        onChange={(e) =>
                          setCarbQuantite(
                            e.target.value
                          )
                        }
                        style={inputStyle}
                        required
                      />
                    </Champ>
                  </div>

                  <Champ label="Date">
                    <input
                      type="date"
                      value={carbDate}
                      onChange={(e) =>
                        setCarbDate(
                          e.target.value
                        )
                      }
                      style={inputStyle}
                      required
                    />
                  </Champ>

                  <Champ label="Justificatif">
                    <input
                      type="text"
                      value={carbJustificatif}
                      onChange={(e) =>
                        setCarbJustificatif(
                          e.target.value
                        )
                      }
                      placeholder="Référence facture / ticket"
                      style={inputStyle}
                    />
                  </Champ>

                  <ActionButton
                    disabled={envoiCarburant}
                  >
                    <PlusCircle size={15} />

                    {envoiCarburant
                      ? "Enregistrement..."
                      : "Enregistrer"}
                  </ActionButton>
                </form>
              </Card>

              <Card>
                <CardTitre
                  icon={<ClipboardList size={18} />}
                >
                  Dernières opérations
                </CardTitre>

                {transactions.length === 0 ? (
                  <BlocVide
                    texte="Aucune transaction."
                    compact
                  />
                ) : (
                  <div style={scrollList}>
                    {transactions.map((t) => (
                      <ListeLigne
                        key={t.id}
                        gauche={
                          <>
                            <strong>
                              {t.vehicule
                                ?.immatriculation ||
                                "—"}
                            </strong>

                            <div style={smallMuted}>
                              {t.type ===
                              "DOTATION"
                                ? "Dotation"
                                : "Consommation"}{" "}
                              •{" "}
                              {formaterDateSimple(
                                t.dateOperation
                              )}
                            </div>
                          </>
                        }
                        droite={
                          <>
                            <strong>
                              {Number(
                                t.quantiteLitres
                              ).toLocaleString(
                                "fr-FR"
                              )}{" "}
                              L
                            </strong>

                            {!t.justificatif &&
                              t.type ===
                                "CONSOMMATION" && (
                                <div
                                  style={{
                                    color:
                                      "#dc2626",
                                    fontSize: 10,
                                  }}
                                >
                                  Justificatif absent
                                </div>
                              )}
                          </>
                        }
                      />
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </section>
        )}

        {/* ================================================ */}
        {/* ENTRETIEN */}
        {/* ================================================ */}

        {onglet === "ENTRETIEN" && (
          <section>
            <SectionTitre
              titre="Entretiens"
              sousTitre="Création et suivi des interventions avec avis préalable du mécanicien diagnostiqueur DID."
            />

            <div style={twoColumns}>
              <Card>
                <CardTitre
                  icon={
                    <Wrench
                      size={18}
                      color="#92400e"
                    />
                  }
                >
                  Nouvelle demande
                </CardTitre>

                <form
                  onSubmit={soumettreEntretien}
                  style={formStyle}
                >
                  <Champ label="Véhicule">
                    <select
                      value={entVehiculeId}
                      onChange={(e) =>
                        setEntVehiculeId(
                          e.target.value
                        )
                      }
                      style={inputStyle}
                      required
                    >
                      <option value="">
                        Sélectionner
                      </option>

                      {vehicules.map((v) => (
                        <option
                          key={v.id}
                          value={v.id}
                        >
                          {libelleVehicule(v)}
                        </option>
                      ))}
                    </select>
                  </Champ>

                  <Champ label="Nature de l'intervention">
                    <textarea
                      value={entNature}
                      onChange={(e) =>
                        setEntNature(
                          e.target.value
                        )
                      }
                      rows={4}
                      placeholder="Ex : vidange, freinage, carrosserie..."
                      style={{
                        ...inputStyle,
                        resize: "vertical",
                      }}
                      required
                    />
                  </Champ>

                  <div style={businessRuleBox}>
                    La planification reste
                    bloquée tant que l&apos;avis
                    technique du mécanicien DID
                    n&apos;est pas enregistré.
                  </div>

                  <ActionButton
                    disabled={envoiEntretien}
                  >
                    <PlusCircle size={15} />

                    {envoiEntretien
                      ? "Création..."
                      : "Créer la demande"}
                  </ActionButton>
                </form>
              </Card>

              <Card>
                <CardTitre
                  icon={<Wrench size={18} />}
                >
                  Dossiers d&apos;entretien
                </CardTitre>

                {maintenances.length === 0 ? (
                  <BlocVide
                    texte="Aucun entretien."
                    compact
                  />
                ) : (
                  <div style={scrollList}>
                    {maintenances.map((m) => (
                      <ListeLigne
                        key={m.id}
                        gauche={
                          <>
                            <strong>
                              {m.vehicule
                                ?.immatriculation ||
                                "—"}
                            </strong>

                            <div style={smallMuted}>
                              {m.natureIntervention}
                            </div>

                            {m.avisTexte && (
                              <div
                                style={{
                                  marginTop: 4,
                                  fontSize: 11,
                                  color: "#64748b",
                                }}
                              >
                                Avis DID :{" "}
                                {m.avisTexte}
                              </div>
                            )}
                          </>
                        }
                        droite={
                          <StatutMaintenance
                            statut={m.statut}
                          />
                        }
                      />
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </section>
        )}

        {/* ================================================ */}
        {/* ASSURANCES ET SINISTRES */}
        {/* ================================================ */}

        {onglet === "ASSURANCES" && (
          <section>
            <SectionTitre
              titre="Assurances et sinistres"
              sousTitre="Centralisation des polices, échéances et déclarations de sinistre."
            />

            <div style={twoColumns}>
              <Card>
                <CardTitre
                  icon={
                    <ShieldCheck
                      size={18}
                      color="#5b21b6"
                    />
                  }
                >
                  Assurance véhicule
                </CardTitre>

                <form
                  onSubmit={soumettreAssurance}
                  style={formStyle}
                >
                  <Champ label="Véhicule">
                    <select
                      value={assVehiculeId}
                      onChange={(e) =>
                        setAssVehiculeId(
                          e.target.value
                        )
                      }
                      style={inputStyle}
                      required
                    >
                      <option value="">
                        Sélectionner
                      </option>

                      {vehicules.map((v) => (
                        <option
                          key={v.id}
                          value={v.id}
                        >
                          {libelleVehicule(v)}
                        </option>
                      ))}
                    </select>
                  </Champ>

                  <Champ label="Numéro de police">
                    <input
                      value={assNumeroPolice}
                      onChange={(e) =>
                        setAssNumeroPolice(
                          e.target.value
                        )
                      }
                      style={inputStyle}
                      required
                    />
                  </Champ>

                  <Champ label="Date d'expiration">
                    <input
                      type="date"
                      value={assDateExpiration}
                      onChange={(e) =>
                        setAssDateExpiration(
                          e.target.value
                        )
                      }
                      style={inputStyle}
                      required
                    />
                  </Champ>

                  <ActionButton
                    disabled={envoiAssurance}
                  >
                    <PlusCircle size={15} />

                    {envoiAssurance
                      ? "Enregistrement..."
                      : "Enregistrer"}
                  </ActionButton>
                </form>

                {assurances.length > 0 && (
                  <div
                    style={{
                      marginTop: 20,
                    }}
                  >
                    {assurances.map((a) => {
                      const expiration =
                        a.dateExpiration ||
                        a.dateEcheance ||
                        a.dateFin;

                      return (
                        <ListeLigne
                          key={String(a.id)}
                          gauche={
                            <>
                              <strong>
                                {a.vehicule
                                  ?.immatriculation ||
                                  "—"}
                              </strong>

                              <div
                                style={
                                  smallMuted
                                }
                              >
                                Police :{" "}
                                {a.numeroPolice ||
                                  "—"}
                              </div>
                            </>
                          }
                          droite={
                            expiration
                              ? formaterDateSimple(
                                  expiration
                                )
                              : "—"
                          }
                        />
                      );
                    })}
                  </div>
                )}
              </Card>

              <Card>
                <CardTitre
                  icon={
                    <AlertTriangle
                      size={18}
                      color="#dc2626"
                    />
                  }
                >
                  Déclaration de sinistre
                </CardTitre>

                <form
                  onSubmit={soumettreSinistre}
                  style={formStyle}
                >
                  <Champ label="Véhicule">
                    <select
                      value={sinVehiculeId}
                      onChange={(e) =>
                        setSinVehiculeId(
                          e.target.value
                        )
                      }
                      style={inputStyle}
                      required
                    >
                      <option value="">
                        Sélectionner
                      </option>

                      {vehicules.map((v) => (
                        <option
                          key={v.id}
                          value={v.id}
                        >
                          {libelleVehicule(v)}
                        </option>
                      ))}
                    </select>
                  </Champ>

                  <div style={twoInputColumns}>
                    <Champ label="Date">
                      <input
                        type="date"
                        value={sinDate}
                        onChange={(e) =>
                          setSinDate(
                            e.target.value
                          )
                        }
                        style={inputStyle}
                        required
                      />
                    </Champ>

                    <Champ label="Conducteur">
                      <input
                        value={sinConducteur}
                        onChange={(e) =>
                          setSinConducteur(
                            e.target.value
                          )
                        }
                        style={inputStyle}
                        required
                      />
                    </Champ>
                  </div>

                  <Champ label="Circonstances">
                    <textarea
                      value={sinCirconstance}
                      onChange={(e) =>
                        setSinCirconstance(
                          e.target.value
                        )
                      }
                      rows={4}
                      style={{
                        ...inputStyle,
                        resize: "vertical",
                      }}
                    />
                  </Champ>

                  <ActionButton
                    disabled={envoiSinistre}
                  >
                    <PlusCircle size={15} />

                    {envoiSinistre
                      ? "Déclaration..."
                      : "Déclarer le sinistre"}
                  </ActionButton>
                </form>

                {sinistres.length > 0 && (
                  <div
                    style={{
                      marginTop: 20,
                    }}
                  >
                    {sinistres.map((s) => (
                      <ListeLigne
                        key={String(s.id)}
                        gauche={
                          <>
                            <strong>
                              {s.vehicule
                                ?.immatriculation ||
                                "—"}
                            </strong>

                            <div style={smallMuted}>
                              {s.conducteur ||
                                "Conducteur non renseigné"}
                            </div>
                          </>
                        }
                        droite={formaterDateSimple(
                          s.dateSinistre ||
                            s.date
                        )}
                      />
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// =========================================================
// VEHICULE + MISSION + GPS
// =========================================================

function VehiculeSuiviCard({
  vehicule,
  mission,
  prochaineMission,
}: {
  vehicule: Vehicule;
  mission: Reservation | null;
  prochaineMission: Reservation | null;
}) {
  const estEnMission = Boolean(mission);

  return (
    <article
      style={{
        backgroundColor: "white",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow:
          "0 2px 8px rgba(15,23,42,0.04)",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          padding: "13px 18px",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}
        >
          <Car
            size={20}
            color="#334155"
          />

          <strong
            style={{
              color: "#0f172a",
            }}
          >
            {vehicule.immatriculation}
          </strong>

          <span
            style={{
              color: "#64748b",
              fontSize: 13,
            }}
          >
            {nomModeleVehicule(vehicule)}
          </span>
        </div>

        <StatutVehicule
          statut={
            estEnMission
              ? "EN_MISSION"
              : vehicule.statut
          }
        />
      </div>

      {/* DEUX COLONNES */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(0, 1fr) minmax(360px, .9fr)",
        }}
        className="vehicule-suivi-grid"
      >
        {/* INFORMATIONS */}

        <div
          style={{
            padding: 20,
            borderRight: "1px solid #e2e8f0",
          }}
        >
          {mission ? (
            <>
              <h3 style={cardSubTitle}>
                Mission en cours
              </h3>

              <InfoMission
                icon={<ClipboardList size={16} />}
                label="Objet"
                value={mission.motif || "—"}
              />

              <InfoMission
                icon={<UserRound size={16} />}
                label="Chauffeur"
                value={
                  mission.chauffeur
                    ? nomChauffeur(
                        mission.chauffeur
                      )
                    : mission.besoinChauffeur
                    ? "Non affecté"
                    : "Mission sans chauffeur"
                }
              />

              <InfoMission
                icon={<Users size={16} />}
                label="Bénéficiaire"
                value={nomBeneficiaire(
                  mission
                )}
              />

              <InfoMission
                icon={<MapPin size={16} />}
                label="Trajet"
                value={`${mission.pointDepart || "—"} → ${
                  mission.destination || "—"
                }`}
              />

              <InfoMission
                icon={<Clock size={16} />}
                label="Départ"
                value={formaterDate(
                  mission.dateDebut
                )}
              />

              <InfoMission
                icon={<Clock size={16} />}
                label="Retour prévu"
                value={formaterDate(
                  mission.dateFin
                )}
              />

              <InfoMission
                icon={<Users size={16} />}
                label="Passagers"
                value={
                  mission.nombrePassagers != null
                    ? String(
                        mission.nombrePassagers
                      )
                    : "—"
                }
              />
            </>
          ) : (
            <>
              <h3 style={cardSubTitle}>
                Situation actuelle
              </h3>

              <InfoMission
                icon={<Car size={16} />}
                label="Catégorie"
                value={
                  vehicule.categorie ||
                  vehicule.typeVehicule ||
                  "—"
                }
              />

              <InfoMission
                icon={<Navigation size={16} />}
                label="Affectation"
                value={
                  vehicule.affectation || "—"
                }
              />

              <InfoMission
                icon={<CheckCircle2 size={16} />}
                label="Statut"
                value={formatStatutVehicule(
                  vehicule.statut
                )}
              />

              <div
                style={{
                  marginTop: 18,
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: 14,
                  color: "#475569",
                  fontSize: 13,
                }}
              >
                Aucune mission active pour ce
                véhicule actuellement.
              </div>

              {prochaineMission && (
                <div
                  style={{
                    marginTop: 12,
                    backgroundColor: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: 8,
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "#1d4ed8",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    Prochaine mission
                  </div>

                  <strong
                    style={{
                      color: "#1e3a8a",
                      fontSize: 13,
                    }}
                  >
                    {prochaineMission.motif}
                  </strong>

                  <div
                    style={{
                      marginTop: 4,
                      color: "#475569",
                      fontSize: 12,
                    }}
                  >
                    {formaterDate(
                      prochaineMission.dateDebut
                    )}
                    {" — "}
                    {prochaineMission.destination ||
                      "Destination non renseignée"}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* GPS */}

        <div
          style={{
            minHeight: 310,
            backgroundColor: "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 430,
              minHeight: 220,
              border: "2px dashed #cbd5e1",
              borderRadius: 12,
              backgroundColor: "white",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: 24,
            }}
          >
            <MapPin
              size={36}
              color="#94a3b8"
            />

            <strong
              style={{
                marginTop: 12,
                color: "#475569",
                fontSize: 15,
              }}
            >
              Donnée GPS pas encore disponible
            </strong>

            <p
              style={{
                maxWidth: 320,
                margin: "7px 0 0",
                color: "#94a3b8",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              La carte et la position en temps
              réel seront affichées ici dès que
              l&apos;API du prestataire GPS sera
              disponible.
            </p>

            <div
              style={{
                marginTop: 15,
                padding: "6px 11px",
                borderRadius: 999,
                backgroundColor: "#f1f5f9",
                color: "#64748b",
                fontSize: 11,
              }}
            >
              Véhicule :{" "}
              {vehicule.immatriculation}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 850px) {
          .vehicule-suivi-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </article>
  );
}

// =========================================================
// COMPOSANTS UI
// =========================================================

function Kpi({
  icon,
  titre,
  valeur,
  alerte = false,
}: {
  icon: ReactNode;
  titre: string;
  valeur: number | string;
  alerte?: boolean;
}) {
  return (
    <div
      style={{
        backgroundColor: "white",
        border: alerte
          ? "1px solid #fed7aa"
          : "1px solid #e2e8f0",
        borderRadius: 10,
        padding: 17,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          color: alerte
            ? "#ea580c"
            : "#64748b",
        }}
      >
        <span
          style={{
            fontSize: 12,
          }}
        >
          {titre}
        </span>

        {icon}
      </div>

      <div
        style={{
          marginTop: 7,
          fontSize: 27,
          fontWeight: 700,
          color: "#0f172a",
        }}
      >
        {valeur}
      </div>
    </div>
  );
}

function SectionTitre({
  titre,
  sousTitre,
}: {
  titre: string;
  sousTitre?: string;
}) {
  return (
    <div
      style={{
        marginBottom: 16,
      }}
    >
      <h2
        style={{
          margin: 0,
          color: "#1e293b",
          fontSize: 19,
        }}
      >
        {titre}
      </h2>

      {sousTitre && (
        <p
          style={{
            margin: "5px 0 0",
            color: "#64748b",
            fontSize: 13,
          }}
        >
          {sousTitre}
        </p>
      )}
    </div>
  );
}

function OngletButton({
  actif,
  onClick,
  icon,
  children,
}: {
  actif: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        border: actif
          ? "1px solid #1e293b"
          : "1px solid #d1d5db",
        backgroundColor: actif
          ? "#1e293b"
          : "white",
        color: actif
          ? "white"
          : "#475569",
        borderRadius: 8,
        padding: "9px 13px",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 600,
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
        backgroundColor: "white",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: 20,
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
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 17,
      }}
    >
      {icon}

      <h3
        style={{
          margin: 0,
          color: "#111827",
          fontSize: 15,
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
      <label style={labelStyle}>
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
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        padding: "10px 14px",
        border: "none",
        borderRadius: 8,
        backgroundColor: "#dc2626",
        color: "white",
        fontSize: 13,
        fontWeight: 600,
        cursor: disabled
          ? "not-allowed"
          : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

function BlocVide({
  texte,
  compact = false,
}: {
  texte: string;
  compact?: boolean;
}) {
  return (
    <div
      style={{
        backgroundColor: "white",
        border: "1px dashed #cbd5e1",
        borderRadius: 9,
        padding: compact ? 18 : 30,
        color: "#94a3b8",
        textAlign: "center",
        fontSize: 13,
      }}
    >
      {texte}
    </div>
  );
}

function AlertChip({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <span
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        backgroundColor: "#fff7ed",
        color: "#c2410c",
        border: "1px solid #fed7aa",
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}

function InfoMission({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "22px 115px minmax(0, 1fr)",
        gap: 7,
        alignItems: "start",
        marginBottom: 11,
        fontSize: 13,
      }}
    >
      <span
        style={{
          color: "#64748b",
        }}
      >
        {icon}
      </span>

      <span
        style={{
          color: "#64748b",
        }}
      >
        {label}
      </span>

      <strong
        style={{
          color: "#1e293b",
          fontWeight: 600,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function ListeLigne({
  gauche,
  droite,
}: {
  gauche: ReactNode;
  droite: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 15,
        alignItems: "center",
        borderBottom: "1px solid #f1f5f9",
        padding: "10px 0",
        color: "#334155",
        fontSize: 12,
      }}
    >
      <div>{gauche}</div>

      <div
        style={{
          textAlign: "right",
        }}
      >
        {droite}
      </div>
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
        padding: "11px 12px",
        textAlign: "left",
        borderBottom: "1px solid #e2e8f0",
        color: "#475569",
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
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
        padding: "11px 12px",
        borderBottom: "1px solid #f1f5f9",
        color: "#334155",
        fontSize: 12,
        verticalAlign: "top",
      }}
    >
      {children}
    </td>
  );
}

// =========================================================
// BADGES
// =========================================================

function StatutVehicule({
  statut,
}: {
  statut: string;
}) {
  const valeur =
    String(statut || "").toUpperCase();

  let bg = "#f1f5f9";
  let color = "#475569";

  if (valeur === "DISPONIBLE") {
    bg = "#dcfce7";
    color = "#166534";
  }

  if (valeur === "EN_MISSION") {
    bg = "#dbeafe";
    color = "#1d4ed8";
  }

  if (
    valeur === "MAINTENANCE" ||
    valeur === "EN_MAINTENANCE"
  ) {
    bg = "#fef3c7";
    color = "#92400e";
  }

  if (
    valeur === "HORS_SERVICE" ||
    valeur === "REFORME"
  ) {
    bg = "#fee2e2";
    color = "#991b1b";
  }

  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        backgroundColor: bg,
        color,
        fontSize: 10,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {formatStatutVehicule(valeur)}
    </span>
  );
}

function StatutReservation({
  statut,
}: {
  statut: string;
}) {
  const map: Record<
    string,
    {
      label: string;
      bg: string;
      color: string;
    }
  > = {
    EN_ATTENTE: {
      label: "En attente N1",
      bg: "#fef3c7",
      color: "#92400e",
    },

    VALIDEE_N1: {
      label: "Validée N1",
      bg: "#dbeafe",
      color: "#1d4ed8",
    },

    VALIDEE: {
      label: "Validée",
      bg: "#dcfce7",
      color: "#166534",
    },

    REFUSEE: {
      label: "Refusée",
      bg: "#fee2e2",
      color: "#991b1b",
    },
  };

  const item =
    map[statut] || {
      label: statut || "—",
      bg: "#f1f5f9",
      color: "#475569",
    };

  return (
    <span
      style={{
        display: "inline-flex",
        padding: "4px 9px",
        borderRadius: 999,
        backgroundColor: item.bg,
        color: item.color,
        fontSize: 10,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {item.label}
    </span>
  );
}

function StatutMaintenance({
  statut,
}: {
  statut: string;
}) {
  const map: Record<
    string,
    {
      label: string;
      bg: string;
      color: string;
    }
  > = {
    EN_ATTENTE_AVIS_DID: {
      label: "Avis DID attendu",
      bg: "#fef3c7",
      color: "#92400e",
    },

    PLANIFIEE: {
      label: "Planifiée",
      bg: "#dbeafe",
      color: "#1d4ed8",
    },

    EN_COURS: {
      label: "En cours",
      bg: "#e0f2fe",
      color: "#0369a1",
    },

    CLOTUREE: {
      label: "Clôturée",
      bg: "#dcfce7",
      color: "#166534",
    },
  };

  const item =
    map[statut] || {
      label: statut,
      bg: "#f1f5f9",
      color: "#475569",
    };

  return (
    <span
      style={{
        padding: "4px 9px",
        borderRadius: 999,
        backgroundColor: item.bg,
        color: item.color,
        fontSize: 10,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {item.label}
    </span>
  );
}

// =========================================================
// HELPERS
// =========================================================

function nomBeneficiaire(
  reservation: Reservation
) {
  const nom = `${
    reservation.demandeurPrenom || ""
  } ${
    reservation.demandeurNom || ""
  }`.trim();

  if (nom) {
    return nom;
  }

  return nomDemandeur(
    reservation.demandeur
  );
}

function nomDemandeur(
  demandeur?: Demandeur | null
) {
  if (!demandeur) return "—";

  if (demandeur.nomComplet?.trim()) {
    return demandeur.nomComplet.trim();
  }

  const nom = `${
    demandeur.prenom || ""
  } ${
    demandeur.nom || ""
  }`.trim();

  return (
    nom ||
    demandeur.numMatricule ||
    demandeur.matricule ||
    demandeur.email ||
    "—"
  );
}

function nomChauffeur(
  chauffeur?: Chauffeur | null
) {
  if (!chauffeur) return "—";

  const nom = `${
    chauffeur.prenom || ""
  } ${
    chauffeur.nom || ""
  }`.trim();

  if (nom && chauffeur.matricule) {
    return `${nom} — ${chauffeur.matricule}`;
  }

  return (
    nom ||
    chauffeur.matricule ||
    `Chauffeur #${chauffeur.id}`
  );
}

function nomModeleVehicule(
  vehicule: Vehicule
) {
  const valeurs = [
    vehicule.marque,
    vehicule.modele,
    vehicule.modeleType,
  ]
    .map((v) => v?.trim())
    .filter(Boolean);

  const uniques = [
    ...new Set(valeurs),
  ];

  return (
    uniques.join(" ") ||
    vehicule.categorie ||
    "Véhicule"
  );
}

function libelleVehicule(
  vehicule: Vehicule
) {
  const modele =
    nomModeleVehicule(vehicule);

  if (
    !modele ||
    modele === "Véhicule"
  ) {
    return vehicule.immatriculation;
  }

  return `${vehicule.immatriculation} — ${modele}`;
}

function formatStatutVehicule(
  statut: string
) {
  const map: Record<string, string> = {
    DISPONIBLE: "Disponible",
    EN_MISSION: "En mission",
    MAINTENANCE: "Maintenance",
    EN_MAINTENANCE: "Maintenance",
    HORS_SERVICE: "Hors service",
    TRANSFERE: "Transféré",
    REFORME: "Réformé",
  };

  return (
    map[
      String(statut || "").toUpperCase()
    ] ||
    statut ||
    "—"
  );
}

function formaterDate(
  valeur?: string | null
) {
  if (!valeur) return "—";

  const date = new Date(valeur);

  if (
    Number.isNaN(date.getTime())
  ) {
    return valeur;
  }

  return date.toLocaleString(
    "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function formaterDateSimple(
  valeur?: string | null
) {
  if (!valeur) return "—";

  const date = new Date(valeur);

  if (
    Number.isNaN(date.getTime())
  ) {
    return valeur;
  }

  return date.toLocaleDateString(
    "fr-FR"
  );
}

// =========================================================
// STYLES
// =========================================================

const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: 5,
  color: "#374151",
  fontSize: 12,
  fontWeight: 600,
};

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 11px",
  border: "1px solid #d1d5db",
  borderRadius: 7,
  backgroundColor: "white",
  color: "#111827",
  fontSize: 13,
};

const formStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const twoColumns: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(420px, 1fr))",
  gap: 20,
};

const twoInputColumns: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const tableCard: CSSProperties = {
  backgroundColor: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  overflowX: "auto",
};

const scrollList: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  maxHeight: 500,
  overflowY: "auto",
};

const smallMuted: CSSProperties = {
  marginTop: 3,
  color: "#94a3b8",
  fontSize: 10,
};

const cardSubTitle: CSSProperties = {
  margin: "0 0 17px",
  color: "#334155",
  fontSize: 14,
};

const infoApi: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 3,
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  padding: 12,
  marginBottom: 15,
  color: "#64748b",
  fontSize: 11,
};

const businessRuleBox: CSSProperties = {
  backgroundColor: "#fffbeb",
  border: "1px solid #fde68a",
  borderRadius: 7,
  padding: 10,
  color: "#92400e",
  fontSize: 11,
  lineHeight: 1.5,
};

const refreshButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "9px 13px",
  backgroundColor: "white",
  color: "#334155",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
};