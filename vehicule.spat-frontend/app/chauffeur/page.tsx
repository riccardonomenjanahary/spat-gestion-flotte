"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Car,
  Fuel,
  MapPin,
  RefreshCw,
  Route,
  Send,
  UserRound,
  Wrench,
} from "lucide-react";

import RoleGuard from "@/components/RoleGuard";
import EnTete from "@/components/EnTete";
import { ROLES } from "@/app/lib/roles";

interface Vehicule {
  id: number;
  immatriculation: string;
  modeleType?: string | null;
  categorie?: string | null;
  statut?: string | null;
}

interface Chauffeur {
  id: number;
  matricule: string;
  nom?: string | null;
  prenom?: string | null;
  telephone?: string | null;
  email?: string | null;
  numeroPermis?: string | null;
  affectationService?: string | null;
  statut?: string | null;
}

interface Reservation {
  id: number;
  vehicule?: Vehicule | null;
  chauffeur?: Chauffeur | null;

  dateDebut: string;
  dateFin: string;

  motif: string;
  statut: string;

  destination?: string | null;
  pointDepart?: string | null;

  demandeurNom?: string | null;
  demandeurPrenom?: string | null;
  demandeurEntite?: string | null;

  nombrePassagers?: number | null;
}

interface TransactionCarburant {
  id: string;
  vehicule?: Vehicule | null;
  reservation?: Reservation | null;
  chauffeur?: Chauffeur | null;

  type: string;
  quantiteLitres: number;
  dateOperation: string;

  prixUnitaire?: number | null;
  montantTotal?: number | null;
  kilometrage?: number | null;

  station?: string | null;
  mission?: string | null;
  justificatif?: string | null;
  observation?: string | null;
}

/**
 Signalement technique créé par un chauffeur.
 
  Il ne s'agit PAS d'une planification administrative d'entretien.
  Le chauffeur signale une anomalie constatée sur un véhicule qui lui
  a été affecté. Le mécanicien DID reçoit ensuite le signalement pour
  diagnostic et avis technique.
 */
interface SignalementEntretien {
  id: string | number;
  vehicule?: Vehicule | null;
  reservation?: Reservation | null;

  typeProbleme?: string | null;
  descriptionSignalement?: string | null;
  niveauUrgence?: string | null;
  kilometrageSignale?: number | null;

  statut?: string | null;
  dateSignalement?: string | null;
  dateCreation?: string | null;
}

interface AlerteEntretienPeriodique {
  id?: number | null;
  vehicule?: Vehicule | null;
  kilometrageDernierEntretien?: number | null;
  prochaineEcheanceKm?: number | null;
  dernierKilometrageConnu?: number | null;
  kilometresRestants?: number | null;
  entretienPeriodiqueOuvert?: boolean | null;
  kilometrageDeclenchement?: number | null;
  dateDeclenchement?: string | null;
  statut?: string | null;
  intervalleKm?: number | null;
}

type Onglet =
  | "TICKETS"
  | "DECLARER"
  | "ENTRETIEN";

export default function ChauffeurPage() {
  return (
    <RoleGuard role={ROLES.CHAUFFEUR}>
      <ChauffeurContent />
    </RoleGuard>
  );
}

function ChauffeurContent() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [onglet, setOnglet] = useState<Onglet>("TICKETS");
  const [ticketDetailsOuvert, setTicketDetailsOuvert] = useState<number | null>(null);

  const [profil, setProfil] = useState<Chauffeur | null>(null);
  const [missions, setMissions] = useState<Reservation[]>([]);
  const [consommations, setConsommations] = useState<TransactionCarburant[]>(
    []
  );

  const [signalements, setSignalements] = useState<SignalementEntretien[]>([]);
  const [alertesPeriodiques, setAlertesPeriodiques] =
    useState<AlerteEntretienPeriodique[]>([]);

  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [envoiSignalement, setEnvoiSignalement] = useState(false);
  const [clotureEnCoursId, setClotureEnCoursId] = useState<number | null>(null);

  const [reservationId, setReservationId] = useState("");
  const [quantite, setQuantite] = useState("");
  const [dateOperation, setDateOperation] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [kilometrage, setKilometrage] = useState("");
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [station, setStation] = useState("");
  const [justificatif, setJustificatif] = useState("");
  const [observation, setObservation] = useState("");


  // SIGNALEMENT ENTRETIEN PAR LE CHAUFFEUR - TICKET
 

  const [signalementReservationId, setSignalementReservationId] =
    useState("");
  const [signalementTypeProbleme, setSignalementTypeProbleme] =
    useState("");
  const [signalementDescription, setSignalementDescription] =
    useState("");
  const [signalementNiveau, setSignalementNiveau] =
    useState<"NORMAL" | "IMPORTANT" | "URGENT">("NORMAL");
  const [signalementKilometrage, setSignalementKilometrage] =
    useState("");

  const getToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  };

  const lireErreur = async (res: Response) => {
    const texte = await res.text();
    if (!texte) return "Une erreur est survenue.";

    // Ne pas afficher dans une notification utilisateur la requête SQL
    // ou la trace interne renvoyée par le backend en cas d'erreur 500.
    let message = texte;
    try {
      const json = JSON.parse(texte);
      message = typeof json.message === "string" ? json.message : texte;
    } catch {
      // Une réponse texte simple peut être un message métier valide.
    }
    if (res.status >= 500 || /could not execute statement|org\.postgresql|maintenance_statut_check/i.test(message)) {
      return "Erreur d'enregistrement côté serveur. Vérifiez les journaux du backend et la base de données.";
    }
    return message.slice(0, 350);
  };

  const charger = async () => {
    if (!API) {
      toast.error("NEXT_PUBLIC_API_URL n'est pas configurée.");
      setChargement(false);
      return;
    }

    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    setChargement(true);

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      };

      const [profilRes, missionsRes, consommationsRes] = await Promise.all([
        fetch(`${API}/chauffeur/profil`, { headers }),
        fetch(`${API}/chauffeur/tickets`, { headers }),
        fetch(`${API}/chauffeur/consommations`, { headers }),
      ]);

      const responses = [profilRes, missionsRes, consommationsRes];

      if (responses.some((res) => res.status === 401)) {
        toast.error("Votre session a expiré.");
        router.replace("/login");
        return;
      }

      if (responses.some((res) => res.status === 403)) {
        toast.error("Accès réservé au profil Chauffeur.");
        return;
      }

      if (!profilRes.ok) {
        throw new Error(await lireErreur(profilRes));
      }

      if (!missionsRes.ok) {
        throw new Error(await lireErreur(missionsRes));
      }

      if (!consommationsRes.ok) {
        throw new Error(await lireErreur(consommationsRes));
      }

      setProfil(await profilRes.json());
      setMissions(await missionsRes.json());
      setConsommations(await consommationsRes.json());

      /*
        Le module Signalement entretien est chargé séparément.
        Tant que le nouvel endpoint backend n'est pas encore créé,
        son absence ne doit pas bloquer l'espace Chauffeur.
       */
      try {
        const signalementsRes = await fetch(
          `${API}/chauffeur/signalements-entretien`,
          { headers, cache: "no-store" }
        );

        if (signalementsRes.ok) {
          const data = await signalementsRes.json();
          setSignalements(Array.isArray(data) ? data : []);
        } else {
          setSignalements([]);
        }
      } catch (errorSignalement) {
        console.warn(
          "Module signalement entretien chauffeur indisponible :",
          errorSignalement
        );
        setSignalements([]);
      }

      /*
       * L'entretien périodique est complètement séparé de la
       * demande d'entretien manuelle.
       *
       * Cette liste contient uniquement les alertes automatiques
       * des véhicules affectés au chauffeur ayant atteint le seuil
       * périodique de 5 000 km.
       */
      try {
        const alertesRes = await fetch(
          `${API}/chauffeur/alertes-entretien-periodique`,
          { headers, cache: "no-store" }
        );

        if (alertesRes.ok) {
          const data = await alertesRes.json();
          setAlertesPeriodiques(Array.isArray(data) ? data : []);
        } else {
          setAlertesPeriodiques([]);
        }
      } catch (errorAlerte) {
        console.warn(
          "Alertes entretien périodique indisponibles :",
          errorAlerte
        );
        setAlertesPeriodiques([]);
      }
    } catch (error) {
      console.error("Erreur espace chauffeur :", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de charger l'espace chauffeur."
      );
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    charger();
  }, []);

  // Une clôture est enregistrée par le serveur pour la mission du chauffeur connecté.
  // Le frontend n'invente pas un statut local et ne crée aucune notification lui-même.
  const cloturerMission = async (mission: Reservation) => {
    if (clotureEnCoursId !== null) return;
    if (String(mission.statut || "").toUpperCase() !== "VALIDEE" || !mission.vehicule) {
      toast.error("Seule une mission validée et affectée peut être clôturée.");
      return;
    }
    if (!window.confirm(`Confirmer la fin de la mission TKT-${String(mission.id).padStart(5, "0")} ? Cette action est définitive.`)) return;
    if (!API) {
      toast.error("NEXT_PUBLIC_API_URL n'est pas configurée.");
      return;
    }
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setClotureEnCoursId(mission.id);
    try {
      const res = await fetch(`${API}/chauffeur/tickets/${mission.id}/cloturer`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      if (!res.ok) {
        // Il faut ajouter l'endpoint au backend avant d'activer cette fonction.
        toast.error(
          res.status === 404
            ? "Clôture indisponible : vérifiez l'endpoint serveur ou l'affectation de ce ticket."
            : await lireErreur(res)
        );
        return;
      }
      toast.success("Mission clôturée. L'Agent Flotte est informé.");
      setTicketDetailsOuvert(null);
      await charger();
    } catch (error) {
      console.error("Erreur clôture mission chauffeur :", error);
      toast.error("Impossible de contacter le serveur pour clôturer la mission.");
    } finally {
      setClotureEnCoursId(null);
    }
  };

  const missionsValidees = useMemo(
    () =>
      missions.filter(
        (mission) =>
          String(mission.statut || "").toUpperCase() === "VALIDEE" &&
          mission.vehicule
      ),
    [missions]
  );

  const missionsAVenir = useMemo(() => {
    const maintenant = Date.now();

    return missionsValidees.filter(
      (mission) => new Date(mission.dateFin).getTime() >= maintenant
    );
  }, [missionsValidees]);

  const missionSelectionnee = useMemo(
    () =>
      missionsValidees.find(
        (mission) => String(mission.id) === reservationId
      ) || null,
    [missionsValidees, reservationId]
  );

  const missionSignalementSelectionnee = useMemo(
    () =>
      missions
        .filter((mission) => mission.vehicule)
        .find(
          (mission) =>
            String(mission.id) === signalementReservationId
        ) || null,
    [missions, signalementReservationId]
  );

  const missionsAvecVehicule = useMemo(
    () =>
      missions.filter(
        (ticket) =>
          Boolean(ticket.vehicule) &&
          String(ticket.statut || "").toUpperCase() === "VALIDEE"
      ),
    [missions]
  );

  const totalLitres = useMemo(
    () =>
      consommations.reduce(
        (total, consommation) =>
          total + Number(consommation.quantiteLitres || 0),
        0
      ),
    [consommations]
  );

  const resetForm = () => {
    setReservationId("");
    setQuantite("");
    setDateOperation(new Date().toISOString().slice(0, 10));
    setKilometrage("");
    setPrixUnitaire("");
    setStation("");
    setJustificatif("");
    setObservation("");
  };

  const soumettreConsommation = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!API) {
      toast.error("NEXT_PUBLIC_API_URL n'est pas configurée.");
      return;
    }

    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    if (!reservationId) {
      toast.error("Veuillez sélectionner un ticket.");
      return;
    }

    const valeurQuantite = Number(quantite);

    if (!Number.isFinite(valeurQuantite) || valeurQuantite <= 0) {
      toast.error("La quantité doit être supérieure à 0.");
      return;
    }

    if (!dateOperation) {
      toast.error("La date de consommation est obligatoire.");
      return;
    }

    if (!justificatif.trim()) {
      toast.error("La référence du justificatif est obligatoire.");
      return;
    }

    const valeurKm = kilometrage ? Number(kilometrage) : null;
    const valeurPrix = prixUnitaire ? Number(prixUnitaire) : null;

    if (
      valeurKm === null ||
      !Number.isFinite(valeurKm) ||
      valeurKm < 0
    ) {
      toast.error("Le dernier kilométrage compteur est obligatoire.");
      return;
    }

    if (
      valeurPrix !== null &&
      (!Number.isFinite(valeurPrix) || valeurPrix < 0)
    ) {
      toast.error("Le prix unitaire est invalide.");
      return;
    }

    setEnvoi(true);

    try {
      const res = await fetch(`${API}/chauffeur/consommations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reservationId: Number(reservationId),
          quantiteLitres: valeurQuantite,
          dateOperation,
          prixUnitaire: valeurPrix,
          kilometrage: valeurKm,
          station: station.trim() || null,
          justificatif: justificatif.trim(),
          observation: observation.trim() || null,
        }),
      });

      if (res.status === 401) {
        toast.error("Votre session a expiré.");
        router.replace("/login");
        return;
      }

      if (res.status === 403) {
        toast.error(await lireErreur(res));
        return;
      }

      if (!res.ok) {
        toast.error(await lireErreur(res));
        return;
      }

      toast.success("Consommation enregistrée et transmise au Service Logistique.");

      resetForm();
      setOnglet("DECLARER");

      await charger();
    } catch (error) {
      console.error(error);
      toast.error("Impossible de contacter le serveur.");
    } finally {
      setEnvoi(false);
    }
  };


  
  // SIGNALEMENT D'UN BESOIN D'ENTRETIEN LIE A UN TICKET
  

  const resetSignalementForm = () => {
    setSignalementReservationId("");
    setSignalementTypeProbleme("");
    setSignalementDescription("");
    setSignalementNiveau("NORMAL");
    setSignalementKilometrage("");
  };

  const soumettreSignalementEntretien = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!API) {
      toast.error("NEXT_PUBLIC_API_URL n'est pas configurée.");
      return;
    }

    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    if (!signalementReservationId) {
      toast.error("Veuillez sélectionner le ticket et le véhicule concernés.");
      return;
    }

    if (!missionSignalementSelectionnee?.vehicule) {
      toast.error("Aucun véhicule n'est associé à ce ticket.");
      return;
    }

    if (!signalementTypeProbleme) {
      toast.error("Veuillez sélectionner le type de problème.");
      return;
    }

    if (!signalementDescription.trim()) {
      toast.error("Veuillez décrire l'anomalie constatée.");
      return;
    }

    const valeurKm = signalementKilometrage.trim()
      ? Number(signalementKilometrage)
      : null;

    if (
      valeurKm !== null &&
      (!Number.isFinite(valeurKm) || valeurKm < 0)
    ) {
      toast.error("Le kilométrage renseigné est invalide.");
      return;
    }

    setEnvoiSignalement(true);

    try {
      const res = await fetch(
        `${API}/chauffeur/signalements-entretien`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            reservationId: Number(signalementReservationId),
            vehiculeId: missionSignalementSelectionnee.vehicule.id,
            typeProbleme: signalementTypeProbleme,
            descriptionSignalement: signalementDescription.trim(),
            niveauUrgence: signalementNiveau,
            kilometrageSignale: valeurKm,
          }),
        }
      );

      if (res.status === 401) {
        toast.error("Votre session a expiré.");
        router.replace("/login");
        return;
      }

      if (res.status === 403) {
        toast.error(await lireErreur(res));
        return;
      }

      if (!res.ok) {
        toast.error(await lireErreur(res));
        return;
      }

      toast.success(
        "Demande d’entretien envoyée au Chef du Service Logistique pour validation."
      );

      resetSignalementForm();

      const nouveauSignalement = await res.json().catch(() => null);

      if (nouveauSignalement) {
        setSignalements((anciens) => [
          nouveauSignalement as SignalementEntretien,
          ...anciens,
        ]);
      }
    } catch (error) {
      console.error("Erreur signalement entretien :", error);
      toast.error("Impossible de contacter le serveur.");
    } finally {
      setEnvoiSignalement(false);
    }
  };

  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        .chauffeur-grid-kpi {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .chauffeur-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        @media (max-width: 850px) {
          .chauffeur-grid-kpi {
            grid-template-columns: 1fr;
          }

          .chauffeur-form-grid {
            grid-template-columns: 1fr;
          }

          .chauffeur-header {
            align-items: flex-start !important;
            flex-direction: column;
          }

          .chauffeur-tabs {
            width: 100%;
            overflow-x: auto;
          }
        }
      `}</style>

      <EnTete/>

      <main style={pageStyle}>
        <div style={containerStyle}>
          <header className="chauffeur-header" style={headerStyle}>
            <div>
              <h1 style={{margin: 0, fontSize: 22, color: "#172033", fontWeight: 700}}>
                Espace Chauffeur
              </h1>

              
            </div>

            <button
              type="button"
              onClick={charger}
              disabled={chargement}
              style={refreshButton}
            >
              <RefreshCw size={16} />
              Actualiser
            </button>
          </header>

          {profil && (
            <section style={profilCard}>
              <div style={profilIcon}>
                <UserRound size={24} />
              </div>

              <div>
                <strong style={{ color: "#111827", fontSize: 16 }}>
                  {nomChauffeur(profil)}
                </strong>

                <div style={profilDetails}>
                  Matricule : {profil.matricule}
                  {profil.affectationService
                    ? ` • ${profil.affectationService}`
                    : ""}
                  {profil.numeroPermis
                    ? ` • Permis : ${profil.numeroPermis}`
                    : ""}
                </div>
              </div>
            </section>
          )}

          {alertesPeriodiques.length > 0 && (
            <section
              style={{
                ...cardStyle,
                marginBottom: 20,
                border: "1px solid #f59e0b",
              }}
            >
              <div style={cardHeaderStyle}>
                <div>
                  <h2
                    style={{
                      ...cardTitleStyle,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <AlertTriangle size={18} />
                    Notification entretien périodique
                  </h2>

                  <div style={secondaireStyle}>
                    Alerte automatique générée lorsque le véhicule atteint
                    l&apos;échéance des 5 000 km. Aucune demande manuelle
                    n&apos;est nécessaire.
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: "0 20px 20px",
                  display: "grid",
                  gap: 10,
                }}
              >
                {alertesPeriodiques.map((alerte, index) => (
                  <div
                    key={`${alerte.vehicule?.id ?? "vehicule"}-${index}`}
                    style={{
                      border: "1px solid #fde68a",
                      borderRadius: 10,
                      padding: 12,
                      backgroundColor: "#fffbeb",
                    }}
                  >
                    <strong style={{ color: "#92400e" }}>
                      {alerte.vehicule?.immatriculation ||
                        "Véhicule non renseigné"}{" "}
                      — entretien périodique à effectuer
                    </strong>

                    <div
                      style={{
                        ...secondaireStyle,
                        marginTop: 5,
                        color: "#92400e",
                      }}
                    >
                      Dernier kilométrage :{" "}
                      {alerte.dernierKilometrageConnu != null
                        ? `${formatNombre(
                            alerte.dernierKilometrageConnu
                          )} km`
                        : "—"}
                      {" • "}
                      Échéance :{" "}
                      {alerte.prochaineEcheanceKm != null
                        ? `${formatNombre(
                            alerte.prochaineEcheanceKm
                          )} km`
                        : "—"}
                    </div>

                    <div
                      style={{
                        ...secondaireStyle,
                        marginTop: 5,
                        color: "#92400e",
                      }}
                    >
                      Le dossier a été transmis automatiquement au mécanicien DID
                      et au Chef du Service Logistique.
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="chauffeur-grid-kpi" style={{ marginBottom: 20 }}>
            <Kpi
              label="Tickets affectés"
              valeur={missions.length}
              icon={<Route size={20} />}
            />

            <Kpi
              label="Tickets validés à venir"
              valeur={missionsAVenir.length}
              icon={<CalendarDays size={20} />}
            />

            <Kpi
              label="Consommation déclarée"
              valeur={`${formatNombre(totalLitres)} L`}
              icon={<Fuel size={20} />}
            />

            <Kpi
              label="Demandes d’entretien"
              valeur={signalements.length}
              icon={<Wrench size={20} />}
            />
          </section>

          <nav aria-label="Rubriques de l'espace Chauffeur" className="chauffeur-tabs" style={tabsStyle}>
            <TabButton
              couleur="BLEU"
              actif={onglet === "TICKETS"}
              onClick={() => setOnglet("TICKETS")}
            >
              Mes tickets
            </TabButton>

            <TabButton
              couleur="VERT"
              actif={onglet === "DECLARER"}
              onClick={() => setOnglet("DECLARER")}
            >
              Déclarer une consommation
            </TabButton>

            <TabButton
              couleur="ROUGE"
              actif={onglet === "ENTRETIEN"}
              onClick={() => setOnglet("ENTRETIEN")}
            >
              Demande d&apos;entretien
            </TabButton>
          </nav>

          {chargement ? (
            <section style={cardStyle}>
              <div style={emptyStyle}>Chargement...</div>
            </section>
          ) : onglet === "TICKETS" ? (
            <section style={cardStyle}>
              <div style={cardHeaderStyle}>
                <div>
                  <h2 style={cardTitleStyle}>Mes tickets</h2>
                  
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Ticket</th>
                      <th style={thStyle}>Période</th>
                      <th style={thStyle}>Trajet</th>
                      <th style={thStyle}>Véhicule</th>
                      <th style={thStyle}>Statut</th>
                      <th style={thStyle}>Détails</th>
                    </tr>
                  </thead>

                  <tbody>
                    {missions.map((mission) => (
                      <Fragment key={mission.id}><tr>
                        <td style={tdStyle}>
                          <strong style={{ color: "#111827" }}>
                            TKT-{String(mission.id).padStart(5, "0")}
                          </strong>
                          <div style={secondaireStyle}>{mission.motif}</div>
                        </td>

                        <td style={tdStyle}>
                          {formatDateHeure(mission.dateDebut)}
                          <div style={secondaireStyle}>
                            au {formatDateHeure(mission.dateFin)}
                          </div>
                        </td>

                        <td style={tdStyle}>
                          <div style={inlineStyle}>
                            <MapPin size={14} />
                            {mission.pointDepart || "—"}
                          </div>
                          <div style={secondaireStyle}>
                            → {mission.destination || "—"}
                          </div>
                        </td>

                        <td style={tdStyle}>
                          {mission.vehicule ? (
                            <>
                              <strong>{mission.vehicule.immatriculation}</strong>
                              <div style={secondaireStyle}>
                                {mission.vehicule.modeleType ||
                                  mission.vehicule.categorie ||
                                  ""}
                              </div>
                            </>
                          ) : (
                            "Non affecté"
                          )}
                        </td>

                        <td style={tdStyle}>
                          <Statut statut={mission.statut} />
                        </td>
                        <td style={tdStyle}>
                          <button type="button" style={primaryButton} onClick={() => setTicketDetailsOuvert(old => old === mission.id ? null : mission.id)}>
                            {ticketDetailsOuvert === mission.id ? "Fermer" : "Détails"}
                          </button>
                        </td>
                      </tr>
                      {ticketDetailsOuvert === mission.id && <tr><td colSpan={6} style={tdStyle}>
                        <div className="chauffeur-form-grid" style={{padding: 12, background: "white", border:"1px solid #d1d5db", borderRadius: 8}}>
                          {[["Ticket", `TKT-${String(mission.id).padStart(5,"0")}`], ["Objet", mission.motif || "—"], ["Demandeur", [mission.demandeurPrenom,mission.demandeurNom].filter(Boolean).join(" ") || "—"], ["Entité", mission.demandeurEntite || "—"], ["Date de début",formatDateHeure(mission.dateDebut)], ["Date de fin",formatDateHeure(mission.dateFin)], ["Point de départ",mission.pointDepart || "—"], ["Destination",mission.destination || "—"], ["Véhicule",mission.vehicule?.immatriculation || "—"], ["Passagers",String(mission.nombrePassagers ?? "—")]].map(([label,value]) =>
                            <div key={label} style={{border: "1px solid #e5e7eb", padding: 10, borderRadius: 7}}><div style={secondaireStyle}>{label}</div><strong>{value}</strong></div>
                          )}
                        </div>
                        {String(mission.statut || "").toUpperCase() === "VALIDEE" && mission.vehicule && (
                          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                            <button
                              type="button"
                              onClick={() => cloturerMission(mission)}
                              disabled={clotureEnCoursId !== null}
                              style={{
                                ...primaryButton,
                                backgroundColor: "#16a34a",
                                opacity: clotureEnCoursId !== null ? 0.65 : 1,
                                cursor: clotureEnCoursId !== null ? "not-allowed" : "pointer",
                              }}
                            >
                              <CheckCircle2 size={16} />
                              {clotureEnCoursId === mission.id ? "Clôture en cours…" : "Clôturer la mission"}
                            </button>
                          </div>
                        )}
                        {String(mission.statut || "").toUpperCase() === "CLOTUREE" && (
                          <p style={{ color: "#166534", fontSize: 12, fontWeight: 700, margin: "12px 0 0" }}>
                            Mission clôturée : aucune nouvelle clôture possible.
                          </p>
                        )}
                      </td></tr>}
                      </Fragment>
                    ))}

                    {missions.length === 0 && (
                      <tr>
                        <td colSpan={6} style={emptyStyle}>
                          Aucun ticket ne vous est actuellement affecté.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ) : onglet === "DECLARER" ? (
            <>
            <section style={cardStyle}>
              <div style={cardHeaderStyle}>
                <div>
                  <h2 style={cardTitleStyle}>
                    Déclarer une consommation carburant
                  </h2>
                  
                </div>
              </div>

              {missionsValidees.length === 0 ? (
                <div style={emptyStyle}>
                  Aucun ticket validé n'est disponible pour une déclaration
                  de consommation.
                </div>
              ) : (
                <form onSubmit={soumettreConsommation}>
                  <div className="chauffeur-form-grid">
                    <Champ label="Ticket *">
                      <select
                        value={reservationId}
                        onChange={(e) => {
                          const valeur = e.target.value;
                          setReservationId(valeur);

                          const mission = missionsValidees.find(
                            (item) => String(item.id) === valeur
                          );

                          if (mission) {
                            setDateOperation(
                              mission.dateDebut.slice(0, 10)
                            );
                          }
                        }}
                        style={inputStyle}
                        required
                      >
                        <option value="">Sélectionner un ticket</option>

                        {missionsValidees.map((mission) => (
                          <option key={mission.id} value={mission.id}>
                            TKT-{String(mission.id).padStart(5, "0")} —{" "}
                            {mission.destination || mission.motif} —{" "}
                            {mission.vehicule?.immatriculation}
                          </option>
                        ))}
                      </select>
                    </Champ>

                    <Champ label="Véhicule">
                      <div style={readOnlyStyle}>
                        {missionSelectionnee?.vehicule
                          ? `${missionSelectionnee.vehicule.immatriculation}${
                              missionSelectionnee.vehicule.modeleType
                                ? ` — ${missionSelectionnee.vehicule.modeleType}`
                                : ""
                            }`
                          : "Sélectionnez d'abord un ticket"}
                      </div>
                    </Champ>

                    <Champ label="Quantité consommée (L) *">
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={quantite}
                        onChange={(e) => setQuantite(e.target.value)}
                        style={inputStyle}
                        required
                      />
                    </Champ>

                    <Champ label="Date de consommation *">
                      <input
                        type="date"
                        value={dateOperation}
                        onChange={(e) => setDateOperation(e.target.value)}
                        min={missionSelectionnee?.dateDebut?.slice(0, 10)}
                        max={missionSelectionnee?.dateFin?.slice(0, 10)}
                        style={inputStyle}
                        required
                      />
                    </Champ>

                    <Champ label="Dernier kilométrage *">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={kilometrage}
                        onChange={(e) => setKilometrage(e.target.value)}
                        style={inputStyle}
                        placeholder="Ex. 67141"
                        required
                      />
                      
                    </Champ>

                   

                    <Champ label="Prix unitaire (Ar/L)">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={prixUnitaire}
                        onChange={(e) => setPrixUnitaire(e.target.value)}
                        style={inputStyle}
                        placeholder="Ex. 4900"
                      />
                    </Champ>

                    <Champ label="Montant">
                      <div style={readOnlyStyle}>
                        {quantite &&
                        prixUnitaire &&
                        Number(quantite) > 0 &&
                        Number(prixUnitaire) >= 0
                          ? `${formatNombre(
                              Number(quantite) * Number(prixUnitaire)
                            )} Ar`
                          : "—"}
                      </div>
                    </Champ>

                    {/* Référence obligatoire pour l'enregistrement dans le backend. */}
                    <Champ label="Référence du justificatif *">
                      <input
                        type="text"
                        value={justificatif}
                        onChange={(e) => setJustificatif(e.target.value)}
                        style={inputStyle}
                        placeholder="N° de facture ou du ticket de carburant"
                        required
                      />
                    </Champ>

                    

                    
                  </div>

                  <div style={formActions}>
                    <button
                      type="submit"
                      disabled={envoi}
                      style={{
                        ...primaryButton,
                        backgroundColor: "#16a34a",
                        opacity: envoi ? 0.65 : 1,
                      }}
                    >
                      <Fuel size={16} />
                      {envoi
                        ? "Enregistrement..."
                        : "Enregistrer"}
                    </button>
                  </div>
                </form>
              )}
            </section>
            <div>
                  <h2 style={{ ...cardTitleStyle, color: "#000000" }}>Mes consommations</h2>
                 
                </div>
            {/* Historique accessible directement sous la déclaration. */}
            <section style={{ ...cardStyle, marginTop: 18 }}>

              {/* Liste sur fond blanc : pas d'en-tête noir ou vide. */}

              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Ticket</th>
                      <th style={thStyle}>Véhicule</th>
                      <th style={thStyle}>Quantité</th>
                      <th style={thStyle}>Dernier kilométrage</th>
                      <th style={thStyle}>Justificatif</th>
                    </tr>
                  </thead>

                  <tbody>
                    {consommations.map((consommation) => (
                      <tr key={consommation.id}>
                        <td style={tdStyle}>
                          {formatDate(consommation.dateOperation)}
                        </td>

                        <td style={tdStyle}>
                          {consommation.reservation
                            ? `TKT-${String(
                                consommation.reservation.id
                              ).padStart(5, "0")}`
                            : consommation.mission || "—"}
                        </td>

                        <td style={tdStyle}>
                          {consommation.vehicule?.immatriculation || "—"}
                        </td>

                        <td style={tdStyle}>
                          <strong>
                            {formatNombre(consommation.quantiteLitres)} L
                          </strong>
                        </td>

                        <td style={tdStyle}>
                          {consommation.kilometrage != null
                            ? `${formatNombre(consommation.kilometrage)} km`
                            : "—"}
                        </td>

                        <td style={tdStyle}>
                          {consommation.justificatif || "—"}
                        </td>
                      </tr>
                    ))}

                    {consommations.length === 0 && (
                      <tr>
                        <td colSpan={6} style={emptyStyle}>
                          Aucune consommation déclarée.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
          ) : (
            <section style={cardStyle}>
              <div style={cardHeaderStyle}>
                <div>
                  <h2 style={cardTitleStyle}>
                    Signaler une anomalie constatée
                  </h2>
                  
                </div>
              </div>

              

              {missionsAvecVehicule.length === 0 ? (
                <div style={emptyStyle}>
                  Aucun véhicule affecté à vos tickets ne peut actuellement
                  faire l&apos;objet d&apos;un signalement.
                </div>
              ) : (
                <form
                  onSubmit={soumettreSignalementEntretien}
                  style={{ padding: "0 20px 20px" }}
                >
                  <div className="chauffeur-form-grid">
                    <Champ label="Ticket / véhicule concerné *">
                      <select
                        value={signalementReservationId}
                        onChange={(e) =>
                          setSignalementReservationId(e.target.value)
                        }
                        style={inputStyle}
                        required
                      >
                        <option value="">
                          Sélectionner le ticket concerné
                        </option>

                        {missionsAvecVehicule.map((mission) => (
                          <option key={mission.id} value={mission.id}>
                            TKT-{String(mission.id).padStart(5, "0")} —{" "}
                            {mission.vehicule?.immatriculation} —{" "}
                            {mission.destination || mission.motif}
                          </option>
                        ))}
                      </select>
                    </Champ>

                    <Champ label="Véhicule">
                      <div style={readOnlyStyle}>
                        {missionSignalementSelectionnee?.vehicule
                          ? `${
                              missionSignalementSelectionnee.vehicule
                                .immatriculation
                            }${
                              missionSignalementSelectionnee.vehicule.modeleType
                                ? ` — ${missionSignalementSelectionnee.vehicule.modeleType}`
                                : ""
                            }`
                          : "Sélectionnez d'abord un ticket"}
                      </div>
                    </Champ>

                    <Champ label="Type de problème *">
                      <select
                        value={signalementTypeProbleme}
                        onChange={(e) =>
                          setSignalementTypeProbleme(e.target.value)
                        }
                        style={inputStyle}
                        required
                      >
                        <option value="">Sélectionner</option>
                        <option value="FREINAGE">Freinage</option>
                        <option value="PNEUMATIQUES">Pneumatiques</option>
                        <option value="MOTEUR">Moteur</option>
                        <option value="ELECTRIQUE">Électrique / batterie</option>
                        <option value="DIRECTION_SUSPENSION">
                          Direction / suspension
                        </option>
                        <option value="CARROSSERIE">Carrosserie</option>
                        <option value="AUTRE">Autre</option>
                      </select>
                    </Champ>

                    <Champ label="Niveau constaté *">
                      <select
                        value={signalementNiveau}
                        onChange={(e) =>
                          setSignalementNiveau(
                            e.target.value as
                              | "NORMAL"
                              | "IMPORTANT"
                              | "URGENT"
                          )
                        }
                        style={inputStyle}
                        required
                      >
                        <option value="NORMAL">Normal</option>
                        <option value="IMPORTANT">Important</option>
                        <option value="URGENT">Urgent</option>
                      </select>
                    </Champ>

                    <Champ label="Kilométrage constaté">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={signalementKilometrage}
                        onChange={(e) =>
                          setSignalementKilometrage(e.target.value)
                        }
                        style={inputStyle}
                        placeholder="Ex. 68 245"
                      />
                    </Champ>

                    <div style={{ gridColumn: "1 / -1" }}>
                      <Champ label="Anomalie constatée *">
                        <textarea
                          value={signalementDescription}
                          onChange={(e) =>
                            setSignalementDescription(e.target.value)
                          }
                          rows={5}
                          placeholder="Décrivez précisément le problème : bruit, voyant, fuite, vibration, freinage anormal..."
                          style={{
                            ...inputStyle,
                            minHeight: 110,
                            resize: "vertical",
                            fontFamily: "inherit",
                          }}
                          required
                        />
                      </Champ>
                    </div>
                  </div>

                  <div style={formActions}>
                    <button
                      type="submit"
                      disabled={envoiSignalement}
                      style={{
                        ...primaryButton,
                        opacity: envoiSignalement ? 0.65 : 1,
                      }}
                    >
                      <Send size={16} />
                      {envoiSignalement
                        ? "Transmission..."
                        : "Envoyer la demande d’entretien"}
                    </button>
                  </div>
                </form>
              )}

              <div style={historiqueSignalementsStyle}>
                <h3 style={{ ...cardTitleStyle, fontSize: 15 }}>
                  Mes demandes d&apos;entretien
                </h3>

                {signalements.length === 0 ? (
                  <div style={{ ...emptyStyle, padding: "20px 0 4px" }}>
                    Aucune demande d’entretien enregistrée depuis votre espace.
                  </div>
                ) : (
                  <div style={{ overflowX: "auto", marginTop: 12 }}>
                    <table style={{ ...tableStyle, minWidth: 820 }}>
                      <thead>
                        <tr>
                          <th style={thStyle}>Date</th>
                          <th style={thStyle}>Véhicule</th>
                          <th style={thStyle}>Ticket</th>
                          <th style={thStyle}>Problème</th>
                          <th style={thStyle}>Niveau</th>
                          <th style={thStyle}>Statut</th>
                        </tr>
                      </thead>

                      <tbody>
                        {signalements.map((signalement) => (
                          <tr key={String(signalement.id)}>
                            <td style={tdStyle}>
                              {formatDateHeure(
                                signalement.dateSignalement ||
                                  signalement.dateCreation ||
                                  ""
                              )}
                            </td>

                            <td style={tdStyle}>
                              <strong>
                                {signalement.vehicule?.immatriculation || "—"}
                              </strong>
                            </td>

                            <td style={tdStyle}>
                              {signalement.reservation
                                ? `TKT-${String(
                                    signalement.reservation.id
                                  ).padStart(5, "0")}`
                                : "—"}
                            </td>

                            <td style={tdStyle}>
                              {libelleTypeProbleme(
                                signalement.typeProbleme
                              )}
                              {signalement.descriptionSignalement && (
                                <div style={secondaireStyle}>
                                  {signalement.descriptionSignalement}
                                </div>
                              )}
                            </td>

                            <td style={tdStyle}>
                              <NiveauSignalement
                                niveau={signalement.niveauUrgence}
                              />
                            </td>

                            <td style={tdStyle}>
                              <StatutSignalement
                                statut={signalement.statut}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}

function Kpi({
  label,
  valeur,
  icon,
}: {
  label: string;
  valeur: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div style={kpiStyle}>
      <div style={kpiIconStyle}>{icon}</div>

      <div>
        <div style={kpiLabelStyle}>{label}</div>
        <div style={kpiValueStyle}>{valeur}</div>
      </div>
    </div>
  );
}

function TabButton({
  actif,
  couleur = "BLEU",
  onClick,
  children,
}: {
  actif: boolean;
  couleur?: "BLEU" | "VERT" | "ROUGE";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const accent = couleur === "VERT" ? "#16a34a" : couleur === "ROUGE" ? "#dc2626" : "#2563eb";
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...tabButtonStyle,
        color: "#ffffff",
        backgroundColor: accent,
        border: `1px solid ${accent}`,
        opacity: actif ? 1 : 0.88,
        boxShadow: actif ? "0 0 0 2px #ffffff inset, 0 3px 9px rgba(15,23,42,.12)" : "0 2px 5px rgba(15,23,42,.06)",
      }}
    >
      {children}
    </button>
  );
}

function Champ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "block" }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  );
}

function Statut({ statut }: { statut: string }) {
  const valeur = String(statut || "").toUpperCase();

  const map: Record<
    string,
    { label: string; bg: string; color: string }
  > = {
    EN_ATTENTE_AVIS_DID: {
      label: "Avis DID attendu",
      bg: "#fef3c7",
      color: "#92400e",
    },
    VALIDEE_N1: {
      label: "Validée niveau 1",
      bg: "#dbeafe",
      color: "#1d4ed8",
    },
    VALIDEE: {
      label: "Validée",
      bg: "#dcfce7",
      color: "#166534",
    },
    CLOTUREE: {
      label: "Clôturée",
      bg: "#dcfce7",
      color: "#166534",
    },
    REFUSEE: {
      label: "Refusée",
      bg: "#fee2e2",
      color: "#991b1b",
    },
  };

  const item = map[valeur] || {
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
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {item.label}
    </span>
  );
}


function NiveauSignalement({
  niveau,
}: {
  niveau?: string | null;
}) {
  const valeur = String(niveau || "NORMAL").toUpperCase();

  const style =
    valeur === "URGENT"
      ? {
          label: "Urgent",
          bg: "#fee2e2",
          color: "#991b1b",
        }
      : valeur === "IMPORTANT"
        ? {
            label: "Important",
            bg: "#ffedd5",
            color: "#9a3412",
          }
        : {
            label: "Normal",
            bg: "#e0f2fe",
            color: "#075985",
          };

  return (
    <span
      style={{
        display: "inline-flex",
        padding: "4px 9px",
        borderRadius: 999,
        backgroundColor: style.bg,
        color: style.color,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {style.label}
    </span>
  );
}

function StatutSignalement({
  statut,
}: {
  statut?: string | null;
}) {
  const valeur = String(statut || "EN_ATTENTE_DID").toUpperCase();

  const map: Record<
    string,
    { label: string; bg: string; color: string }
  > = {
    EN_ATTENTE_VALIDATION_ENTRETIEN: {
      label: "En attente du chef",
      bg: "#f1f5f9",
      color: "#334155",
    },
    ENTRETIEN_AUTORISE: {
      label: "Entretien autorisé",
      bg: "#f1f5f9",
      color: "#334155",
    },
    ENTRETIEN_TERMINE: {
      label: "Entretien terminé",
      bg: "#f1f5f9",
      color: "#334155",
    },
    REFUSEE: {
      label: "Demande refusée",
      bg: "#f1f5f9",
      color: "#334155",
    },
    EN_ATTENTE_DID: {
      label: "En attente DID",
      bg: "#fef3c7",
      color: "#92400e",
    },
    EN_COURS_DIAGNOSTIC: {
      label: "Diagnostic en cours",
      bg: "#dbeafe",
      color: "#1d4ed8",
    },
    AVIS_DID_RENDU: {
      label: "Avis DID rendu",
      bg: "#dcfce7",
      color: "#166534",
    },
    CLOTURE: {
      label: "Clôturé",
      bg: "#f1f5f9",
      color: "#475569",
    },
    CLOTUREE: {
      label: "Clôturé",
      bg: "#f1f5f9",
      color: "#475569",
    },
  };

  const item =
    map[valeur] || {
      label: statut || "En attente DID",
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
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {item.label}
    </span>
  );
}

function libelleTypeProbleme(type?: string | null) {
  const valeur = String(type || "").toUpperCase();

  const map: Record<string, string> = {
    FREINAGE: "Freinage",
    PNEUMATIQUES: "Pneumatiques",
    MOTEUR: "Moteur",
    ELECTRIQUE: "Électrique / batterie",
    DIRECTION_SUSPENSION: "Direction / suspension",
    CARROSSERIE: "Carrosserie",
    AUTRE: "Autre",
  };

  return map[valeur] || type || "—";
}

function nomChauffeur(chauffeur: Chauffeur) {
  const nom = `${chauffeur.prenom || ""} ${
    chauffeur.nom || ""
  }`.trim();

  return nom || chauffeur.matricule;
}

function formatDateHeure(valeur: string) {
  if (!valeur) return "—";

  const date = new Date(valeur);

  if (Number.isNaN(date.getTime())) {
    return valeur;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatDate(valeur: string) {
  if (!valeur) return "—";

  const date = new Date(`${valeur}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return valeur;
  }

  return new Intl.DateTimeFormat("fr-FR").format(date);
}

function formatNombre(valeur: number) {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
  }).format(Number(valeur || 0));
}

const topBarStyle: CSSProperties = {
  width: "100%",
  backgroundColor: "#ffffff",
  borderBottom: "1px solid #e2e8f0",
  boxShadow: "0 1px 4px rgba(15,23,42,0.08)",
};

const topBarInnerStyle: CSSProperties = {
  maxWidth: 1250,
  minHeight: 72,
  margin: "0 auto",
  padding: "8px 18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
};

const logoStyle: CSSProperties = {
  display: "block",
  width: "auto",
  height: 52,
  maxWidth: 190,
  objectFit: "contain",
};

const logoutButtonStyle: CSSProperties = {
  width: 44,
  height: 44,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 5,
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  backgroundColor: "#ffffff",
  cursor: "pointer",
};

const logoutIconStyle: CSSProperties = {
  display: "block",
  width: 30,
  height: 30,
  objectFit: "contain",
};


const signalementInfoStyle: CSSProperties = {
  margin: "18px 20px",
  padding: 14,
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  border: "1px solid #fde68a",
  borderRadius: 9,
  backgroundColor: "#fffbeb",
  color: "#92400e",
  fontSize: 12,
  lineHeight: 1.5,
};

const historiqueSignalementsStyle: CSSProperties = {
  margin: "0 20px 20px",
  paddingTop: 18,
  borderTop: "1px solid #e2e8f0",
};

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  backgroundColor: "#f3f4f6",
  padding: "28px 18px",
};

const containerStyle: CSSProperties = {
  maxWidth: 1250,
  margin: "0 auto",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 18,
};

const surTitreStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 1.2,
  color: "#64748b",
};

const titreStyle: CSSProperties = {
  margin: "4px 0 5px",
  color: "#172033",
  fontSize: 28,
};

const sousTitreStyle: CSSProperties = {
  margin: 0,
  color: "#64748b",
  fontSize: 14,
};

const refreshButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  border: "1px solid #2563eb",
  backgroundColor: "#2563eb",
  color: "#ffffff",
  borderRadius: 8,
  padding: "9px 13px",
  cursor: "pointer",
  fontWeight: 700,
};

const profilCard: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: 16,
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  marginBottom: 16,
};

const profilIcon: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: "50%",
  backgroundColor: "#e0f2fe",
  color: "#0369a1",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const profilDetails: CSSProperties = {
  marginTop: 4,
  color: "#64748b",
  fontSize: 12,
};

const kpiStyle: CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  padding: 16,
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const kpiIconStyle: CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 9,
  backgroundColor: "#eff6ff",
  color: "#1d4ed8",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const kpiLabelStyle: CSSProperties = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 700,
};

const kpiValueStyle: CSSProperties = {
  color: "#111827",
  fontSize: 22,
  fontWeight: 800,
  marginTop: 2,
};

const tabsStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 12,
  marginBottom: 20,
};

const tabButtonStyle: CSSProperties = {
  border: "1px solid #2563eb",
  borderRadius: 8,
  padding: "11px 16px",
  cursor: "pointer",
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const cardStyle: CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  overflow: "hidden",
};

const cardHeaderStyle: CSSProperties = {
  padding: "18px 20px",
  borderBottom: "1px solid #e2e8f0",
};

const cardTitleStyle: CSSProperties = {
  margin: 0,
  color: "#111827",
  fontSize: 18,
};

const cardSubtitleStyle: CSSProperties = {
  margin: "5px 0 0",
  color: "#64748b",
  fontSize: 12,
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 780,
};

const thStyle: CSSProperties = {
  padding: "11px 14px",
  textAlign: "left",
  backgroundColor: "#ffffff",
  color: "#334155",
  fontSize: 11,
  fontWeight: 800,
  borderBottom: "1px solid #e2e8f0",
  whiteSpace: "nowrap",
};

const tdStyle: CSSProperties = {
  padding: "12px 14px",
  color: "#334155",
  fontSize: 13,
  borderBottom: "1px solid #f1f5f9",
  verticalAlign: "top",
};

const secondaireStyle: CSSProperties = {
  marginTop: 3,
  color: "#64748b",
  fontSize: 11,
};

const inlineStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 5,
};

const emptyStyle: CSSProperties = {
  padding: 30,
  textAlign: "center",
  color: "#64748b",
  fontSize: 13,
};

const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: 6,
  color: "#374151",
  fontSize: 12,
  fontWeight: 700,
};

const inputStyle: CSSProperties = {
  width: "100%",
  border: "1px solid #94a3b8",
  borderRadius: 8,
  backgroundColor: "#ffffff",
  color: "#111827",
  padding: "10px 11px",
  fontSize: 13,
};

const aideChampStyle: CSSProperties = {
  marginTop: 5,
  color: "#64748b",
  fontSize: 10.5,
  lineHeight: 1.4,
};

const readOnlyStyle: CSSProperties = {
  ...inputStyle,
  minHeight: 39,
  backgroundColor: "#f8fafc",
  color: "#475569",
};

const formActions: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  padding: "18px 0 0",
};

const primaryButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  border: "none",
  borderRadius: 8,
  backgroundColor: "#2563eb",
  color: "#ffffff",
  padding: "10px 16px",
  cursor: "pointer",
  fontWeight: 800,
};
