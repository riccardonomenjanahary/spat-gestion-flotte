"use client";

import { useEffect, useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Car, MapPin, RefreshCw, Send, UserRound, Users, X } from "lucide-react";
import PersonnelAutocomplete from "@/components/PersonnelAutocomplete";
import SlideInSelect from "@/app/components/SlideInSelect";

interface VehiculeCreation { id: number; immatriculation: string; disponible: boolean; raison?: string | null; }
interface ChauffeurCreation { id: number; nom?: string; prenom?: string; matricule?: string; }

type ZoneMission = "VILLE_TOAMASINA" | "HORS_TOAMASINA";
export interface MissionHorsVilleCreee {
  id: number;
  dateDebut: string;
  statut?: string;
  vehicule?: { immatriculation?: string | null } | null;
}

interface FormulaireReservation {
  zoneMission: ZoneMission | "";
  typeVehicule: "VOITURE" | "";
  nomBeneficiaire: string;
  dateDebut: string;
  dateFin: string;
  motif: string;
  motifUrgence: string;
  demandeurNom: string;
  demandeurPrenom: string;
  demandeurMatricule: string;
  demandeurEntite: string;
  demandeurTelephone: string;
  destination: string;
  pointDepart: string;
  nombrePassagers: string;
  listePassagers: string;
  observations: string;
  forfaitaire: string;
  dureeEstimeeMinutes: string;
}

const formulaireInitial: FormulaireReservation = {
  zoneMission: "HORS_TOAMASINA",

  typeVehicule: "VOITURE",
  nomBeneficiaire: "",
  dateDebut: "",
  dateFin: "",
  motif: "",
  motifUrgence: "",
  demandeurNom: "",
  demandeurPrenom: "",
  demandeurMatricule: "",
  demandeurEntite: "",
  demandeurTelephone: "",
  destination: "",
  pointDepart: "",
  nombrePassagers: "1",
  listePassagers: "",
  observations: "",
  forfaitaire: "oui",
  dureeEstimeeMinutes: "1440",
};


export default function CreationMissionHorsVille({ onClose, onCreated, choisirRessources = false }: {
  onClose: () => void;
  onCreated: (mission: MissionHorsVilleCreee | null) => void | Promise<void>;
  choisirRessources?: boolean;
}) {
  const API = process.env.NEXT_PUBLIC_API_URL;
  const router = useRouter();
  const [formulaire, setFormulaire] = useState<FormulaireReservation>(formulaireInitial);
  const [envoi, setEnvoi] = useState(false);
  const [revisionDisponibilites, setRevisionDisponibilites] = useState(0);
  const [vehicules, setVehicules] = useState<{ cle: string; data: VehiculeCreation[]; erreur?: string }>({ cle: "", data: [] });
  const [chauffeurs, setChauffeurs] = useState<{ cle: string; data: ChauffeurCreation[]; erreur?: string }>({ cle: "", data: [] });
  const [ressources, setRessources] = useState({ periode: "", vehiculeId: "", chauffeurId: "" });
  const periode = `${formulaire.dateDebut}|${formulaire.dateFin}`;
  const periodeValide = Boolean(formulaire.dateDebut && formulaire.dateFin
    && new Date(formulaire.dateFin).getTime() > new Date(formulaire.dateDebut).getTime());
  const cleDisponibilites = `${periode}|${revisionDisponibilites}`;
  const vehiculeId = ressources.periode === periode ? ressources.vehiculeId : "";
  const chauffeurId = ressources.periode === periode ? ressources.chauffeurId : "";
  const cleChauffeurs = `${cleDisponibilites}|${vehiculeId}`;
  const vehiculesMission = vehicules.cle === cleDisponibilites ? vehicules.data : [];
  const chauffeursDisponibles = chauffeurs.cle === cleChauffeurs ? chauffeurs.data : [];
  const ressourcesValides = vehiculesMission.some((v) => String(v.id) === vehiculeId && v.disponible)
    && chauffeursDisponibles.some((c) => String(c.id) === chauffeurId);

  useEffect(() => {
    if (!choisirRessources || !API || !periodeValide) return;
    const abort = new AbortController();
    const params = new URLSearchParams({ dateDebut: convertirDatePourApi(formulaire.dateDebut), dateFin: convertirDatePourApi(formulaire.dateFin) });
    fetch(`${API}/reservations/disponibilites-vehicules?${params}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, signal: abort.signal, cache: "no-store",
    }).then(async (response) => {
      if (!response.ok) throw new Error((await lireErreur(response)) || "Impossible de vérifier les véhicules.");
      const data: unknown = await response.json();
      if (!Array.isArray(data)) throw new Error("Réponse véhicules invalide.");
      const missions = (data as VehiculeCreation[]).filter((v) => /^(0?1614|0?1615)WWA$/.test(v.immatriculation.replace(/[^A-Za-z0-9]/g, "").toUpperCase()));
      if (!abort.signal.aborted) setVehicules({ cle: cleDisponibilites, data: missions });
    }).catch((error: unknown) => {
      if (!abort.signal.aborted) setVehicules({ cle: cleDisponibilites, data: [], erreur: error instanceof Error ? error.message : "Vérification impossible." });
    });
    return () => abort.abort();
  }, [API, choisirRessources, periodeValide, formulaire.dateDebut, formulaire.dateFin, cleDisponibilites]);

  useEffect(() => {
    if (!choisirRessources || !API || !periodeValide || !vehiculeId) return;
    const abort = new AbortController();
    const params = new URLSearchParams({ dateDebut: convertirDatePourApi(formulaire.dateDebut), dateFin: convertirDatePourApi(formulaire.dateFin), manuel: "true" });
    fetch(`${API}/vehicules/${vehiculeId}/chauffeurs-compatibles?${params}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, signal: abort.signal, cache: "no-store",
    }).then(async (response) => {
      if (!response.ok) throw new Error((await lireErreur(response)) || "Impossible de vérifier les chauffeurs.");
      const data: unknown = await response.json();
      if (!Array.isArray(data)) throw new Error("Réponse chauffeurs invalide.");
      if (!abort.signal.aborted) setChauffeurs({ cle: cleChauffeurs, data: data as ChauffeurCreation[] });
    }).catch((error: unknown) => {
      if (!abort.signal.aborted) setChauffeurs({ cle: cleChauffeurs, data: [], erreur: error instanceof Error ? error.message : "Vérification impossible." });
    });
    return () => abort.abort();
  }, [API, choisirRessources, periodeValide, formulaire.dateDebut, formulaire.dateFin, vehiculeId, cleChauffeurs]);
  const getToken = () => localStorage.getItem("token");
  const fermerModal = () => { if (!envoi) onClose(); };

  useEffect(() => {
    const ancienOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const fermer = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !envoi && document.querySelectorAll('[role="dialog"][aria-modal="true"]').length === 1) onClose();
    };
    window.addEventListener("keydown", fermer);
    return () => {
      document.body.style.overflow = ancienOverflow;
      window.removeEventListener("keydown", fermer);
    };
  }, [envoi, onClose]);

  const modifierChamp = <K extends keyof FormulaireReservation,>(
    champ: K,
    valeur: FormulaireReservation[K]
  ) => {
    setFormulaire((ancien) => ({
      ...ancien,
      [champ]: valeur,
    }));
  };

  const modifierNombrePassagers = (valeur: string) => {
    const nombre = Math.max(1, Number.parseInt(valeur || "1", 10) || 1);
    const existants = formulaire.listePassagers.split("\n").map((nom) => nom.trim());
    setFormulaire((ancien) => ({
      ...ancien,
      nombrePassagers: valeur,
      listePassagers: Array.from({ length: nombre }, (_, index) => existants[index] || "").join("\n"),
    }));
  };

  const lignesPassagers = useMemo(() => {
    const nombre = Math.max(1, Number.parseInt(formulaire.nombrePassagers || "1", 10) || 1);
    const existants = formulaire.listePassagers.split("\n").map((nom) => nom.trim());
    return Array.from({ length: nombre }, (_, index) => existants[index] || "");
  }, [formulaire.nombrePassagers, formulaire.listePassagers]);

  const modifierNomPassager = (index: number, valeur: string) => {
    const copie = [...lignesPassagers];
    copie[index] = valeur;
    modifierChamp("listePassagers", copie.join("\n"));
  };

  const envoyerDemande = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (envoi) return;
    if (choisirRessources && !ressourcesValides) {
      toast.error("Veuillez sélectionner un véhicule et un chauffeur disponibles pour cette période.");
      return;
    }

    const token = getToken();

    if (!API) {
      toast.error("NEXT_PUBLIC_API_URL n'est pas configurée");
      return;
    }

    if (!token) {
      router.replace("/login");
      return;
    }

    if (!formulaire.dateDebut || !formulaire.dateFin) {
      toast.error(
        "Veuillez renseigner la date de départ et la date de retour"
      );
      return;
    }

    const debut = new Date(formulaire.dateDebut);
    const fin = new Date(formulaire.dateFin);

    if (
      Number.isNaN(debut.getTime()) ||
      Number.isNaN(fin.getTime())
    ) {
      toast.error("Les dates renseignées sont invalides");
      return;
    }

    if (debut < new Date()) {
      toast.error("La date de départ ne peut pas être dans le passé");
      return;
    }

    if (fin <= debut) {
      toast.error("La date de retour doit être après la date de départ");
      return;
    }

    if (!formulaire.motif.trim()) {
      toast.error("L'objet de la mission est obligatoire");
      return;
    }

    if (!formulaire.demandeurNom.trim()) {
      toast.error("Le nom du bénéficiaire est obligatoire");
      return;
    }

    if (!formulaire.demandeurPrenom.trim()) {
      toast.error("Le prénom du bénéficiaire est obligatoire");
      return;
    }

    if (!formulaire.demandeurEntite.trim()) {
      toast.error(
        "La Direction / Département / Service est obligatoire"
      );
      return;
    }

    if (!formulaire.destination.trim()) {
      toast.error("La destination est obligatoire");
      return;
    }

    const dureeEstimeeMinutes = Number(formulaire.dureeEstimeeMinutes);
    if (!Number.isInteger(dureeEstimeeMinutes) || dureeEstimeeMinutes < 1440) {
      toast.error("La durée de la mission doit être d'au moins un jour.");
      return;
    }

    const nombrePassagers = Number(formulaire.nombrePassagers);

    if (
      !Number.isInteger(nombrePassagers) ||
      nombrePassagers <= 0
    ) {
      toast.error("Le nombre de passagers doit être supérieur à 0");
      return;
    }

    const passagersSaisis = lignesPassagers.map((nom) => nom.trim());

    const body = {
      vehiculeId: choisirRessources ? Number(vehiculeId) : null,
      chauffeurId: choisirRessources ? Number(chauffeurId) : null,
      zoneMission: "HORS_TOAMASINA",
      dureeEstimeeMinutes,
      dateDebut: convertirDatePourApi(formulaire.dateDebut),
      dateFin: convertirDatePourApi(formulaire.dateFin),
      motif: formulaire.motif.trim(),

      demandeUrgente: false,

      motifUrgence: null,

      demandeurNom: formulaire.demandeurNom.trim(),
      demandeurPrenom: formulaire.demandeurPrenom.trim(),
      demandeurMatricule: formulaire.demandeurMatricule.trim() || null,
      demandeurEntite: formulaire.demandeurEntite.trim(),
      demandeurTelephone: formulaire.demandeurTelephone.trim() || null,

      destination: formulaire.destination.trim(),
      pointDepart: "SPAT Toamasina",
      nombrePassagers,

      listePassagers: passagersSaisis.every(p => !p)
        ? `${formulaire.demandeurPrenom.trim()} ${formulaire.demandeurNom.trim()}`
        : passagersSaisis.filter(p => p).join("\n"),

      typeVehiculeSouhaite: formulaire.typeVehicule,
      besoinChauffeur: true,

      observations: `Forfaitaire: ${formulaire.forfaitaire}${formulaire.observations.trim() ? ` · ${formulaire.observations.trim()}` : ""}`,
    };

    setEnvoi(true);

    

    try {
      const res = await fetch(`${API}/reservations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });

      

      if (res.status === 401) {
        toast.error("Votre session a expiré");
        router.replace("/login");
        return;
      }

      if (res.status === 403) {
        toast.error(
          "Vous n'avez pas l'autorisation de créer ce ticket."
        );
        return;
      }

      if (!res.ok) {
        const erreur = await lireErreur(res);
        console.error("Erreur serveur:", erreur);
        toast.error(erreur || "Impossible d'enregistrer la mission");
        return;
      }

      const creee = (await res.json().catch(() => null)) as
        | MissionHorsVilleCreee
        | null;

      const ticket = creee?.id
        ? `TKT-${String(creee.id).padStart(5, "0")}`
        : "Le ticket";

      toast.success(choisirRessources ? `${ticket} créé avec le véhicule et le chauffeur sélectionnés.` : `${ticket} créé.`);

      onClose();

      await onCreated(creee);
    } catch {
      toast.error("Erreur de communication avec le serveur");
    } finally {
      setEnvoi(false);
    }
  };

  return (

        <div
          className="modal-container"
          onMouseDown={fermerModal}
          style={modalOverlayStyle}
        >
          <form
            className="modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="creation-mission-hors-ville"
            onSubmit={envoyerDemande}
            onMouseDown={(event) => event.stopPropagation()}
            style={{ ...modalContentStyle, maxWidth: 1100 }}
          >
            <div style={modalHeaderStyle}>
              <div style={iconeTexteStyle}>
                <div style={modalIconStyle}>
                  <Car size={21} color="#dc2626" />
                </div>

                <h3 id="creation-mission-hors-ville" style={modalTitleStyle}>Nouvelle mission hors ville</h3>
              </div>

              <button
                type="button"
                onClick={fermerModal}
                disabled={envoi}
                aria-label="Fermer"
                style={{
                  ...closeButtonStyle,
                  cursor: envoi ? "not-allowed" : "pointer",
                  opacity: envoi ? 0.5 : 1,
                }}
              >
                <X size={19} color="#4b5563" />
              </button>
            </div>

            <div style={{ padding: 22 }}>

              {formulaire.typeVehicule && (
                <BlocFormulaire
                  numero="1"
                  titre="Bénéficiaire de la mission"
                  icone={<UserRound size={18} color="#2563eb" />}
                >
                  <div className="form-grid" style={gridDeuxColonnes}>
                    <PersonnelAutocomplete
                      label="Demandeur"
                      style={{ gridColumn: "1 / -1" }}
                      onSelect={(personnel) => {
                        setFormulaire((ancien) => ({
                          ...ancien,
                          demandeurNom: personnel.nom,
                          demandeurPrenom: personnel.prenom,
                          demandeurMatricule: personnel.matricule,
                          demandeurEntite: personnel.direction || personnel.poste,
                        }));
                      }}
                    />
                    <div style={{ gridColumn: "1 / -1" }}>
                      <Champ
                        label="Direction / Département / Service"
                        obligatoire
                      >
                        <input
                          value={formulaire.demandeurEntite}
                          onChange={(e) =>
                            modifierChamp(
                              "demandeurEntite",
                              e.target.value
                            )
                          }
                          placeholder="Ex. Direction Financière et de la Performance"
                          style={inputStyle}
                        />
                      </Champ>
                    </div>
                  </div>
                </BlocFormulaire>
              )}

              <BlocFormulaire
                numero={formulaire.typeVehicule ? "2" : "1"}
                titre="Informations sur la mission"
                icone={<MapPin size={18} color="#16a34a" />}
              >
                <div className="form-grid" style={gridDeuxColonnes}>
                  <Champ label="Zone de mission" obligatoire>
                    <div style={readOnlyStyle}>
                      Hors ville de Toamasina
                    </div>
                  </Champ>

                  <Champ label="État opérationnel">
                    <div style={readOnlyStyle}>
                      PLANIFIEE
                    </div>
                  </Champ>
                </div>

                <div style={{ marginTop: 16 }}>
                  <Champ label="Objet de la mission" obligatoire>
                    <textarea
                      value={formulaire.motif}
                      onChange={(e) =>
                        modifierChamp("motif", e.target.value)
                      }
                      rows={3}
                      placeholder="Décrivez brièvement l'objet de la mission..."
                      style={textareaStyle}
                    />
                  </Champ>
                </div>

                <div
                  className="form-grid"
                  style={{
                    ...gridDeuxColonnes,
                    marginTop: 16,
                  }}
                >
                  <Champ label="Lieu de placement" obligatoire>
                    <input
                      value={formulaire.destination}
                      onChange={(e) =>
                        modifierChamp(
                          "destination",
                          e.target.value
                        )
                      }
                      placeholder="Ex. Antananarivo"
                      style={inputStyle}
                    />
                  </Champ>

                  <Champ label="Nombre de jours" obligatoire>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={Math.max(1, Math.ceil(Number(formulaire.dureeEstimeeMinutes || 1440) / 1440))}
                      onChange={(e) => {
                        const jours = Math.max(1, Number(e.target.value) || 1);
                        modifierChamp("dureeEstimeeMinutes", String(jours * 1440));
                        if (formulaire.dateDebut) {
                          const fin = new Date(formulaire.dateDebut);
                          fin.setMinutes(fin.getMinutes() + jours * 1440);
                          modifierChamp("dateFin", dateHeureLocale(fin));
                        }
                      }}
                      style={inputStyle}
                    />
                  </Champ>

                  <Champ label="Forfaitaire" obligatoire>
                    <select value={formulaire.forfaitaire} onChange={(e) => modifierChamp("forfaitaire", e.target.value)} style={inputStyle}>
                      <option value="oui">Oui</option>
                      <option value="non">Non</option>
                    </select>
                  </Champ>

                  <Champ
                    label="Date et heure de départ"
                    obligatoire
                  >
                    <input
                      type="datetime-local"
                      value={formulaire.dateDebut}
                      onChange={(e) => {
                        modifierChamp("dateDebut", e.target.value);
                        if (e.target.value) {
                          const fin = new Date(e.target.value);
                          fin.setMinutes(fin.getMinutes() + Math.max(1440, Number(formulaire.dureeEstimeeMinutes) || 1440));
                          modifierChamp("dateFin", dateHeureLocale(fin));
                        }
                      }}
                      style={inputStyle}
                    />
                  </Champ>

                  <Champ
                    label="Date et heure de retour prévues"
                    obligatoire
                  >
                    <input
                      type="datetime-local"
                      value={formulaire.dateFin}
                      onChange={(e) =>
                        modifierChamp(
                          "dateFin",
                          e.target.value
                        )
                      }
                      style={inputStyle}
                    />
                  </Champ>
                </div>

              </BlocFormulaire>

              <BlocFormulaire
                numero={formulaire.typeVehicule ? "3" : "2"}
                titre="Passagers et contraintes"
                icone={<Users size={18} color="#7c3aed" />}
              >
                <div style={{ marginTop: 16 }}>
                  <Champ label="Nombre de passagers" obligatoire>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={formulaire.nombrePassagers}
                      onChange={(e) =>
                        modifierNombrePassagers(e.target.value)
                      }
                      style={inputStyle}
                    />
                  </Champ>
                </div>

                <div style={{ marginTop: 16 }}>
                  <Champ label="Liste des passagers">
                    <div style={{ display: "grid", gap: 10 }}>
                      {lignesPassagers.map((nom, index) => (
                        <div
                          key={`passager-${index}`}
                          className="passager-ligne"
                          style={{
                            display: "grid",
                            gridTemplateColumns: "110px minmax(0, 1fr)",
                            gap: 10,
                            alignItems: "center",
                          }}
                        >
                          <span style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>
                            Passager {index + 1}
                          </span>
                          <PersonnelAutocomplete
                            label={`Passager ${index + 1}`}
                            placeholder="Rechercher par nom, matricule ou poste..."
                            onSelect={(personnel) =>
                              modifierNomPassager(
                                index,
                                `${personnel.prenom} ${personnel.nom}`.trim(),
                              )
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </Champ>
                </div>

                <div style={{ marginTop: 16 }}>
                  <Champ label="Observations / justification hors horaires, week-end ou jour férié">
                    <textarea
                      value={formulaire.observations}
                      onChange={(e) => modifierChamp("observations", e.target.value)}
                      rows={3}
                      placeholder="Observations liées à la mission"
                      style={textareaStyle}
                    />
                  </Champ>
                </div>

              </BlocFormulaire>
            </div>

            {choisirRessources && <div style={{ padding: "0 22px 22px" }}>
              <BlocFormulaire numero="4" titre="Choisir le véhicule" icone={<Car size={18} color="#2563eb" />}>
                <button type="button" onClick={() => setRevisionDisponibilites((ancien) => ancien + 1)} disabled={!periodeValide || envoi} style={{ ...boutonBleu, marginBottom: 16 }}>
                  <RefreshCw size={14} /> Re-vérifier
                </button>
                {!periodeValide ? <p>Renseignez les dates de départ et de retour pour vérifier les disponibilités.</p> : <>
                  {vehicules.cle === cleDisponibilites && vehicules.erreur && <p role="alert" style={{ color: "#b91c1c" }}>{vehicules.erreur}</p>}
                  {chauffeurs.cle === cleChauffeurs && chauffeurs.erreur && <p role="alert" style={{ color: "#b91c1c" }}>{chauffeurs.erreur}</p>}
                  <div className="form-grid" style={gridDeuxColonnes}>
                    <SlideInSelect label="Véhicule proposé" title="Choisir un véhicule disponible" value={vehiculeId}
                      onChange={(valeur) => setRessources({ periode, vehiculeId: valeur, chauffeurId: "" })}
                      loading={vehicules.cle !== cleDisponibilites} disabled={envoi || vehicules.cle !== cleDisponibilites}
                      options={vehiculesMission.map((v) => ({ value: String(v.id), label: v.immatriculation, detail: v.disponible ? "Disponible sur la période" : v.raison || "Indisponible", disabled: !v.disponible }))}
                      placeholder="Sélectionner un véhicule" emptyMessage="Aucun véhicule de mission disponible." />
                    <SlideInSelect label="Chauffeur affecté" title="Choisir un chauffeur disponible" value={chauffeurId}
                      onChange={(valeur) => setRessources({ periode, vehiculeId, chauffeurId: valeur })}
                      loading={Boolean(vehiculeId && chauffeurs.cle !== cleChauffeurs)} disabled={envoi || !vehiculeId || chauffeurs.cle !== cleChauffeurs}
                      options={chauffeursDisponibles.map((c) => ({ value: String(c.id), label: [c.prenom, c.nom].filter(Boolean).join(" ") || c.matricule || `Chauffeur ${c.id}`, detail: c.matricule }))}
                      placeholder={vehiculeId ? "Sélectionner un chauffeur" : "Choisissez d'abord un véhicule"} emptyMessage="Aucun chauffeur disponible pour cette période." />
                  </div>
                </>}
              </BlocFormulaire>
            </div>}
            <div style={modalFooterStyle}>
              <button
                type="button"
                className="bouton-bleu"
                onClick={fermerModal}
                disabled={envoi}
                style={{
                  ...boutonBleu,
                  opacity: envoi ? 0.6 : 1,
                }}
              >
                Annuler
              </button>

              <button
                type="submit"
                className="bouton-vert"
                disabled={envoi || (choisirRessources && !ressourcesValides)}
                style={{
                  ...boutonVert,
                  opacity: envoi ? 0.7 : 1,
                  cursor: envoi ? "not-allowed" : "pointer",
                }}
              >
                {envoi ? (
                  <>
                    <RefreshCw size={17} />
                    Transmission...
                  </>
                ) : (
                  <>
                    <Send size={17} />
                    Créer le ticket
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
  );
}

function BlocFormulaire({
  numero,
  titre,
  icone,
  children,
}: {
  numero: string;
  titre: string;
  icone: ReactNode;
  children: ReactNode;
}) {
  return (
    <section style={blocStyle}>
      <div style={blocHeaderStyle}>
        <div style={numeroStyle}>{numero}</div>
        {icone}
        <h4 style={blocTitleStyle}>{titre}</h4>
      </div>

      <div style={{ padding: 17 }}>{children}</div>
    </section>
  );
}

function Champ({
  label,
  obligatoire = false,
  interactif = false,
  children,
}: {
  label: string;
  obligatoire?: boolean;
  interactif?: boolean;
  children: ReactNode;
}) {
  const titre = (
    <div style={champLabelStyle}>
      {label}
      {obligatoire && <span style={{ color: "#dc2626", marginLeft: 3 }}>*</span>}
    </div>
  );
  return interactif
    ? <div style={{ display: "block" }} role="group" aria-label={label}>{titre}{children}</div>
    : <label style={{ display: "block" }}>{titre}{children}</label>;
}

function convertirDatePourApi(valeur: string) {
  if (!valeur) return valeur;

  if (valeur.length === 16) {
    return `${valeur}:00`;
  }

  return valeur;
}

function dateHeureLocale(date: Date) {
  const decalee = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return decalee.toISOString().slice(0, 16);
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


const gridDeuxColonnes: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 16,
};
const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
};
const readOnlyStyle: CSSProperties = {
  ...inputStyle,
  backgroundColor: "#f8fafc",
  color: "#475569",
};
const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: 82,
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
const boutonVert: CSSProperties = {
  ...boutonBase,
  backgroundColor: "#15803d",
};
const boutonBleu: CSSProperties = {
  ...boutonBase,
  backgroundColor: "#1d4ed8",
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
const blocStyle: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  marginBottom: 18,
  overflow: "visible",
};
const blocHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  backgroundColor: "#f9fafb",
  padding: "13px 16px",
  borderBottom: "1px solid #e5e7eb",
  borderTopLeftRadius: 10,
  borderTopRightRadius: 10,
};
const numeroStyle: CSSProperties = {
  width: 27,
  height: 27,
  borderRadius: "50%",
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#374151",
  fontWeight: 700,
  fontSize: 12,
};
const blocTitleStyle: CSSProperties = {
  margin: 0,
  color: "#1e293b",
  fontSize: 15,
};
const champLabelStyle: CSSProperties = {
  marginBottom: 6,
  color: "#374151",
  fontSize: 13,
  fontWeight: 600,
};
