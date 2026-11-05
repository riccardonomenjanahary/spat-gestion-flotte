"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Printer, Search } from "lucide-react";

interface FicheControleProps {
  depart: boolean;
  arrive: boolean;
  disabled?: boolean;
  onChange?: (data: FicheControleData) => void;
  initialData?: FicheControleData;
}

interface Chauffeur {
  chauffeurId: number;
  matricule?: string | null;
  nom?: string | null;
  prenom?: string | null;
  telephone?: string | null;
  email?: string | null;
  numeroPermis?: string | null;
  affectationService?: string | null;
  statutChauffeur?: string | null;
}

export interface FicheControleData {

  vehiculeId?: string;
  chauffeurId?: string;
  chauffeurNom?: string;
  verificateur?: string;
  dateDepart?: string;
  heureDepart?: string;
  dateArrivee?: string;
  heureArrivee?: string;
  destination?: string;
  compteurKmDepart?: string;
  compteurKmArrivee?: string;
  carburantDepart?: string;
  carburantArrivee?: string;

  exterieur: SectionControle;
  equipementSecurite: SectionControle;
  operationMoteur: SectionControle;
  niveauFluides: SectionControle;
 TrainAvantArriere: SectionControle;
  eclairageElectrique: SectionControle;
  circuitClimatisation: SectionControle;

  autres?: string;
}

interface SectionControle {
  items: { [key: string]: ItemControle };
}

interface ItemControle {
  depart: boolean;
  arrive: boolean;
  commentaires: string;
}

const sections = {
  exterieur: {
    titre: "EXTERIEUR",
    items: [
      "Carrosserie (rayures, bosses)",
      "Pneus (usure, pression)",
      "Roue de secours",
      "Cric et clé de roue",
      "Rétroviseurs",
      "Vitres",
      "Portes",
      "Capot",
      "Essuie-glaces",
      "Feux avant",
      "Feux arrière",
      "Clignotants",
      "Plaques d'immatriculation",
    ],
  },
  equipementSecurite: {
    titre: "EQUIPEMENT DE SECURITE",
    items: [
      "Ceintures de sécurité",
      "Airbags",
      "Triangle de signalisation",
      "Gilet de sécurité",
      "Extincteur",
      "Trousse de secours",
      "Feux de détresse",
      "Antiblocage (ABS)",
      "Contrôle de stabilité (ESP)",
    ],
  },
  operationMoteur: {
    titre: "OPERATION DU MOTEUR",
    items: [
      "Démarrage moteur",
      "Régime au ralenti",
      "Bruits anormaux",
      "Fumée d'échappement",
      "Vibrations",
      "Accélération",
      "Frein moteur",
      "Boîte de vitesses",
      "Embrayage",
    ],
  },
  niveauFluides: {
    titre: "NIVEAU DES FLUIDES",
    items: [
      "Huile moteur",
      "Liquide de refroidissement",
      "Liquide de frein",
      "Liquide de direction assistée",
      "Lave-glaces",
      "Carburant",
      "Batterie",
    ],
  },
  TrainAvantArriere: {
    titre: "TRAIN AVANT ET ARRIERE",
    items: [
      "Freins (plaquettes, disques)",
      "Suspension",
      "Amortisseurs",
      "Rotules",
      "Cardans",
      "Différentiel",
      "Transmission",
      "Barres stabilisatrices",
    ],
  },
  eclairageElectrique: {
    titre: "ÉCLAIRAGE / SYSTÈME ÉLÉCTRIQUE",
    items: [
      "Phares (code/plein phare)",
      "Feux de position",
      "Feux de stop",
      "Feux de recul",
      "Feux antibrouillard",
      "Plafonnier",
      "Autoradio / Électronique",
      "Batterie / Alternateur",
      "Prises 12V",
      "Instrumentation (tableau de bord)",
    ],
  },
  circuitClimatisation: {
    titre: "CIRCUIT DE CLIMATISATION",
    items: [
      "Climatisation",
      "Chauffage",
      "Ventilation",
      "Désembuage",
      "Filtre habitacle",
      "Fuites de gaz",
    ],
  },
};

export default function FicheControleVehicule({
  depart,
  arrive,
  disabled = false,
  onChange,
  initialData,
}: FicheControleProps) {
  const [data, setData] = useState<FicheControleData>(
    initialData || {
      exterieur: { items: initItems(sections.exterieur.items) },
      equipementSecurite: { items: initItems(sections.equipementSecurite.items) },
      operationMoteur: { items: initItems(sections.operationMoteur.items) },
      niveauFluides: { items: initItems(sections.niveauFluides.items) },
      TrainAvantArriere: { items: initItems(sections.TrainAvantArriere.items) },
      eclairageElectrique: { items: initItems(sections.eclairageElectrique.items) },
      circuitClimatisation: { items: initItems(sections.circuitClimatisation.items) },
    }
  );

  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [chargementChauffeurs, setChargementChauffeurs] = useState(true);
  const [rechercheChauffeur, setRechercheChauffeur] = useState("");
  const [menuChauffeurOuvert, setMenuChauffeurOuvert] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL || "";
  const [chargementKilometrage, setChargementKilometrage] = useState(false);
  const [infoKilometrage, setInfoKilometrage] = useState<string>("");

  useEffect(() => {
    const chargerChauffeurs = async () => {
      if (!API) {
        setChargementChauffeurs(false);
        return;
      }

      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) {
        setChargementChauffeurs(false);
        return;
      }

      try {
        const res = await fetch(`${API}/chauffeurs`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (!res.ok) {
          throw new Error("Impossible de charger les chauffeurs.");
        }

        const data: unknown = await res.json();
        if (!Array.isArray(data)) throw new Error("Format de réponse invalide.");

        const liste = (data as Record<string, unknown>[]).map((brut) => {
          const identifiant =
            (brut["chauffeurId"] as number | undefined)
            ?? (brut["id"] as number | undefined)
            ?? Number(brut["chauffeurId"]);
          return {
            ...(brut as unknown as Chauffeur),
            chauffeurId: identifiant,
          } as Chauffeur;
        }).filter((chauffeur) => Number.isFinite(chauffeur.chauffeurId));

        setChauffeurs(liste);
      } catch (error) {
        console.error("Erreur chargement chauffeurs:", error);
        setChauffeurs([]);
      } finally {
        setChargementChauffeurs(false);
      }
    };

    chargerChauffeurs();
  }, [API]);

  useEffect(() => {
    let actif = true;
    const chargerDernierKilometrage = async () => {
      if (!data.vehiculeId || !API || disabled) return;

      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) return;

      setChargementKilometrage(true);
      setInfoKilometrage("");

      try {
        const res = await fetch(`${API}/carnet-bord/vehicule/${data.vehiculeId}/dernier-kilometrage`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (!res.ok) {
          throw new Error("Impossible de récupérer le kilométrage");
        }

        const result = await res.json() as {
          estMotoElectrique?: boolean;
          dernierKilometrage?: number | null;
          source?: string;
          message?: string;
          dateReference?: string;
          equipeeGPS?: boolean;
        };
        if (!actif) return;

        if (result.estMotoElectrique) {
          setInfoKilometrage("Moto électrique : pas de kilométrage");
        } else if (result.dernierKilometrage != null) {
          const newData = {
            ...data,
            compteurKmDepart: String(result.dernierKilometrage),
          };
          setData(newData);
          onChange?.(newData);

          const sourceTexte = result.equipeeGPS
            ? "GPS"
            : result.source === "MANUEL"
              ? "dernier trajet"
              : "trajet en cours";
          setInfoKilometrage(`Auto-rempli depuis ${sourceTexte}: ${result.dernierKilometrage} km`);
        } else {
          setInfoKilometrage(result.message || "Aucun historique disponible — saisie manuelle requise");
        }
      } catch (error) {
        if (!actif) return;
        console.error("Erreur chargement kilométrage:", error);
        setInfoKilometrage("Erreur lors du chargement — saisie manuelle requise");
      } finally {
        if (actif) setChargementKilometrage(false);
      }
    };

    void chargerDernierKilometrage();
    return () => { actif = false; };
  }, [data.vehiculeId, API, disabled]);

  const conteneurRechercheRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fermerAuClicExterieur = (evenement: MouseEvent) => {
      if (
        conteneurRechercheRef.current &&
        !conteneurRechercheRef.current.contains(evenement.target as Node)
      ) {
        setMenuChauffeurOuvert(false);
      }
    };
    document.addEventListener("mousedown", fermerAuClicExterieur);
    return () => document.removeEventListener("mousedown", fermerAuClicExterieur);
  }, []);

  const normaliserTexte = (texte: string | null | undefined) =>
    (texte || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const chauffeursFiltres = useMemo(() => {
    const terme = normaliserTexte(rechercheChauffeur);
    if (!terme) return chauffeurs;
    return chauffeurs.filter((chauffeur) => {
      const nom = normaliserTexte(chauffeur.nom);
      const prenom = normaliserTexte(chauffeur.prenom);
      const nomComplet = `${nom} ${prenom}`;
      const matricule = normaliserTexte(chauffeur.matricule);
      return (
        nom.includes(terme) ||
        prenom.includes(terme) ||
        nomComplet.includes(terme) ||
        matricule.includes(terme)
      );
    });
  }, [chauffeurs, rechercheChauffeur]);

  const selectionnerChauffeur = (chauffeur: Chauffeur) => {
    const nomComplet = `${chauffeur.nom || ""} ${chauffeur.prenom || ""}`.trim();
    const newData = {
      ...data,
      chauffeurId: String(chauffeur.chauffeurId),
      chauffeurNom: nomComplet,
    };
    setData(newData);
    onChange?.(newData);
    setRechercheChauffeur(nomComplet);
    setMenuChauffeurOuvert(false);
  };

  useEffect(() => {
    if (initialData?.chauffeurId && !initialData.chauffeurNom && chauffeurs.length > 0) {
      const chauffeur = chauffeurs.find(c => String(c.chauffeurId) === initialData.chauffeurId);
      if (chauffeur) {
        setData(prev => ({
          ...prev,
          chauffeurNom: `${chauffeur.nom} ${chauffeur.prenom}`,
        }));
      }
    }
  }, [initialData, chauffeurs]);

  const updateItem = (
    section: "exterieur" | "equipementSecurite" | "operationMoteur" | "niveauFluides" | "TrainAvantArriere" | "eclairageElectrique" | "circuitClimatisation",
    itemKey: string,
    field: "depart" | "arrive" | "commentaires",
    value: boolean | string
  ) => {
    const sectionActuelle = data[section];
    const newData = {
      ...data,
      [section]: {
        ...sectionActuelle,
        items: {
          ...sectionActuelle.items,
          [itemKey]: {
            ...(sectionActuelle.items[itemKey] ?? { depart: false, arrive: false, commentaires: "" }),
            [field]: value,
          },
        },
      },
    };
    setData(newData);
    onChange?.(newData);
  };

  const updateInfo = (field: keyof FicheControleData, value: string) => {
    const newData = { ...data, [field]: value };
    setData(newData);
    onChange?.(newData);
  };

  const imprimerPDF = () => {
    window.print();
  };

  return (
    <div className="fiche-controle-printable" style={{
      border: "1px solid #e2e8f0",
      borderRadius: 12,
      backgroundColor: "#ffffff",
      padding: 24,
      boxShadow: "0 2px 8px rgba(15, 23, 42, 0.03)",
    }}>
      <h2 style={{
        fontSize: 18,
        fontWeight: 700,
        color: "#111827",
        marginBottom: 20,
        borderBottom: "2px solid #e2e8f0",
        paddingBottom: 12,
      }}>
        FICHE DE CONTRÔLE VÉHICULE EN MISSION
      </h2>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 12,
        marginBottom: 24,
        padding: 16,
        backgroundColor: "#f8fafc",
        borderRadius: 8,
      }}>
        <div style={{ gridColumn: "1 / -1" }} ref={conteneurRechercheRef}>
          <label style={{
            display: "block",
            fontSize: 12,
            fontWeight: 600,
            color: "#475569",
            marginBottom: 8,
          }}>
            Chauffeur *
          </label>
          <div style={{ position: "relative" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              border: `1px solid ${menuChauffeurOuvert ? "#1d4ed8" : "#d1d5db"}`,
              borderRadius: 6,
              padding: "0 10px",
              backgroundColor: "#ffffff",
            }}>
              <Search size={15} color="#64748b" />
              <input
                type="text"
                value={rechercheChauffeur || data.chauffeurNom || ""}
                onChange={(e) => {
                  const valeur = e.target.value;
                  setRechercheChauffeur(valeur);
                  setMenuChauffeurOuvert(true);

                  if (!valeur.trim()) {
                    const newData = { ...data, chauffeurId: "", chauffeurNom: "" };
                    setData(newData);
                    onChange?.(newData);
                  }
                }}
                onFocus={() => {
                  if (!disabled && !chargementChauffeurs) {
                    setMenuChauffeurOuvert(true);
                  }
                }}
                placeholder="Rechercher un chauffeur par nom, prénom ou matricule…"
                disabled={disabled || chargementChauffeurs}
                style={{
                  width: "100%",
                  padding: "10px 0",
                  border: "none",
                  outline: "none",
                  fontSize: 13,
                  backgroundColor: "transparent",
                }}
              />
              {chargementChauffeurs && (
                <span style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>
                  Chargement…
                </span>
              )}
            </div>
            {menuChauffeurOuvert && !disabled && !chargementChauffeurs && (
              <div style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                maxHeight: 300,
                overflowY: "auto",
                backgroundColor: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                marginTop: 4,
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                zIndex: 1000,
              }}>
                {chauffeursFiltres.length === 0 ? (
                  <div style={{ padding: 12, color: "#64748b", fontSize: 13 }}>
                    {chauffeurs.length === 0
                      ? "Aucun chauffeur disponible."
                      : "Aucun chauffeur ne correspond à cette recherche."}
                  </div>
                ) : (
                  chauffeursFiltres.map((chauffeur) => (
                    <label
                      key={chauffeur.chauffeurId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        cursor: "pointer",
                        borderBottom: "1px solid #f1f5f9",
                        backgroundColor: data.chauffeurId === String(chauffeur.chauffeurId) ? "#eff6ff" : "transparent",
                      }}
                      onClick={() => selectionnerChauffeur(chauffeur)}
                    >
                      <input
                        type="radio"
                        name="chauffeur-fiche-controle"
                        value={String(chauffeur.chauffeurId)}
                        checked={data.chauffeurId === String(chauffeur.chauffeurId)}
                        onChange={() => selectionnerChauffeur(chauffeur)}
                        disabled={disabled}
                        style={{ width: 18, height: 18, cursor: "pointer" }}
                      />
                      <div style={{ fontSize: 13, color: "#334155" }}>
                        <strong>{chauffeur.nom} {chauffeur.prenom}</strong>
                        {chauffeur.matricule && (
                          <span style={{ color: "#64748b", fontSize: 12, marginLeft: 6 }}>
                            ({chauffeur.matricule})
                          </span>
                        )}
                        {chauffeur.affectationService && (
                          <span style={{ color: "#94a3b8", fontSize: 12, marginLeft: 6 }}>
                            · {chauffeur.affectationService}
                          </span>
                        )}
                      </div>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
        <div>
          <label style={{
            display: "block",
            fontSize: 12,
            fontWeight: 600,
            color: "#475569",
            marginBottom: 4,
          }}>
            Destination
          </label>
          <input
            type="text"
            value={data.destination || ""}
            onChange={(e) => updateInfo("destination", e.target.value)}
            disabled={disabled}
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 13,
            }}
          />
        </div>
        <div>
          <label style={{
            display: "block",
            fontSize: 12,
            fontWeight: 600,
            color: "#475569",
            marginBottom: 4,
          }}>
            Date de départ
          </label>
          <input
            type="date"
            value={data.dateDepart || ""}
            onChange={(e) => updateInfo("dateDepart", e.target.value)}
            disabled={disabled}
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 13,
            }}
          />
        </div>
        <div>
          <label style={{
            display: "block",
            fontSize: 12,
            fontWeight: 600,
            color: "#475569",
            marginBottom: 4,
          }}>
            Heure de départ
          </label>
          <input
            type="time"
            value={data.heureDepart || ""}
            onChange={(e) => updateInfo("heureDepart", e.target.value)}
            disabled={disabled}
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 13,
            }}
          />
        </div>
        <div>
          <label style={{
            display: "block",
            fontSize: 12,
            fontWeight: 600,
            color: "#475569",
            marginBottom: 4,
          }}>
            Compteur km départ *
          </label>
          <input
            type="text"
            value={data.compteurKmDepart || ""}
            onChange={(e) => updateInfo("compteurKmDepart", e.target.value)}
            disabled={disabled || chargementKilometrage}
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 13,
            }}
          />
          {chargementKilometrage && (
            <span style={{ fontSize: 11, color: "#64748b", marginTop: 4, display: "block" }}>
              Chargement du dernier kilométrage...
            </span>
          )}
          {!chargementKilometrage && infoKilometrage && (
            <span style={{
              fontSize: 11,
              color: infoKilometrage.includes("Auto-rempli") ? "#16a34a" : "#64748b",
              marginTop: 4,
              display: "block",
              fontStyle: "italic"
            }}>
              {infoKilometrage}
            </span>
          )}
        </div>
        <div style={{ display: arrive ? undefined : "none" }}>
          <label style={{
            display: "block",
            fontSize: 12,
            fontWeight: 600,
            color: "#475569",
            marginBottom: 4,
          }}>
            Compteur km arrivée
          </label>
          <input
            type="text"
            value={data.compteurKmArrivee || ""}
            onChange={(e) => updateInfo("compteurKmArrivee", e.target.value)}
            disabled={disabled}
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 13,
            }}
          />
        </div>
        <div>
          <label style={{
            display: "block",
            fontSize: 12,
            fontWeight: 600,
            color: "#475569",
            marginBottom: 4,
          }}>
            Carburant départ *
          </label>
          <input
            type="text"
            value={data.carburantDepart || ""}
            onChange={(e) => updateInfo("carburantDepart", e.target.value)}
            disabled={disabled}
            placeholder="Ex: 3/4, 50L, 80%"
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 13,
            }}
          />
          <span style={{ fontSize: 11, color: "#64748b", marginTop: 4, display: "block" }}>
            Niveau de carburant avant le départ
          </span>
        </div>
        <div style={{ display: arrive ? undefined : "none" }}>
          <label style={{
            display: "block",
            fontSize: 12,
            fontWeight: 600,
            color: "#475569",
            marginBottom: 4,
          }}>
            Carburant arrivée
          </label>
          <input
            type="text"
            value={data.carburantArrivee || ""}
            onChange={(e) => updateInfo("carburantArrivee", e.target.value)}
            disabled={disabled}
            placeholder="Ex: 1/4, 15L, 25%"
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 13,
            }}
          />
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={imprimerPDF}
          disabled={disabled}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            backgroundColor: "#1d4ed8",
            color: "#ffffff",
            border: "none",
            borderRadius: 8,
            cursor: disabled ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: 600,
            opacity: disabled ? 0.65 : 1,
          }}
        >
          <Printer size={16} />
          Imprimer PDF
        </button>
      </div>

      {Object.entries(sections).map(([key, section]) => (
        <SectionControleComponent
          key={key}
          titre={section.titre}
          items={section.items}
          data={data[key as keyof FicheControleData] as SectionControle}
          depart={depart}
          arrive={arrive}
          disabled={disabled}
          onUpdate={(itemKey, field, value) =>
            updateItem(
              key as "exterieur" | "equipementSecurite" | "operationMoteur" | "niveauFluides" | "TrainAvantArriere" | "eclairageElectrique" | "circuitClimatisation",
              itemKey,
              field,
              value
            )
          }
        />
      ))}

      <div style={{ marginTop: 20 }}>
        <label style={{
          display: "block",
          fontSize: 13,
          fontWeight: 600,
          color: "#475569",
          marginBottom: 8,
        }}>
          Observations
        </label>
        <textarea
          value={data.autres || ""}
          onChange={(e) => updateInfo("autres", e.target.value)}
          disabled={disabled}
          rows={3}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            fontSize: 13,
            resize: "vertical",
          }}
          placeholder="Saisir l'avis et les observations du mécanicien..."
        />
      </div>
    </div>
  );
}

function SectionControleComponent({
  titre,
  items,
  data,
  depart,
  arrive,
  disabled,
  onUpdate,
}: {
  titre: string;
  items: string[];
  data: SectionControle;
  depart: boolean;
  arrive: boolean;
  disabled: boolean;
  onUpdate: (itemKey: string, field: "depart" | "arrive" | "commentaires", value: boolean | string) => void;
}) {
  return (
    <div style={{
      marginBottom: 20,
      border: "1px solid #e2e8f0",
      borderRadius: 8,
      overflow: "hidden",
    }}>
      <div style={{
        backgroundColor: "#f1f5f9",
        padding: "10px 14px",
        fontSize: 13,
        fontWeight: 700,
        color: "#334155",
        borderBottom: "1px solid #e2e8f0",
      }}>
        {titre}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ backgroundColor: "#ffffff" }}>
            <th style={{
              padding: "10px 12px",
              textAlign: "left",
              fontSize: 11,
              fontWeight: 600,
              color: "#475569",
              borderBottom: "1px solid #e2e8f0",
              width: "40%",
            }}>
              Élément
            </th>
            {depart && (
              <th style={{
                padding: "10px 12px",
                textAlign: "center",
                fontSize: 11,
                fontWeight: 600,
                color: "#475569",
                borderBottom: "1px solid #e2e8f0",
                width: "15%",
              }}>
                DÉPART
              </th>
            )}
            {arrive && (
              <th style={{
                padding: "10px 12px",
                textAlign: "center",
                fontSize: 11,
                fontWeight: 600,
                color: "#475569",
                borderBottom: "1px solid #e2e8f0",
                width: "15%",
              }}>
                ARRIVÉE
              </th>
            )}
            <th style={{
              padding: "10px 12px",
              textAlign: "left",
              fontSize: 11,
              fontWeight: 600,
              color: "#475569",
              borderBottom: "1px solid #e2e8f0",
              width: "30%",
            }}>
              COMMENTAIRES
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item} style={{ backgroundColor: "#ffffff" }}>
              <td style={{
                padding: "10px 12px",
                fontSize: 12,
                color: "#334155",
                borderBottom: "1px solid #f1f5f9",
              }}>
                {item}
              </td>
              {depart && (
                <td style={{
                  padding: "10px 12px",
                  textAlign: "center",
                  borderBottom: "1px solid #f1f5f9",
                }}>
                  <input
                    type="checkbox"
                    checked={data.items[item]?.depart || false}
                    onChange={(e) => onUpdate(item, "depart", e.target.checked)}
                    disabled={disabled}
                    style={{ width: 18, height: 18, cursor: disabled ? "not-allowed" : "pointer" }}
                  />
                </td>
              )}
              {arrive && (
                <td style={{
                  padding: "10px 12px",
                  textAlign: "center",
                  borderBottom: "1px solid #f1f5f9",
                }}>
                  <input
                    type="checkbox"
                    checked={data.items[item]?.arrive || false}
                    onChange={(e) => onUpdate(item, "arrive", e.target.checked)}
                    disabled={disabled}
                    style={{ width: 18, height: 18, cursor: disabled ? "not-allowed" : "pointer" }}
                  />
                </td>
              )}
              <td style={{
                padding: "10px 12px",
                borderBottom: "1px solid #f1f5f9",
              }}>
                <input
                  type="text"
                  value={data.items[item]?.commentaires || ""}
                  onChange={(e) => onUpdate(item, "commentaires", e.target.value)}
                  disabled={disabled}
                  placeholder="Commentaires..."
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    border: "1px solid #d1d5db",
                    borderRadius: 4,
                    fontSize: 11,
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function initItems(items: string[]): { [key: string]: ItemControle } {
  const result: { [key: string]: ItemControle } = {};
  items.forEach((item) => {
    result[item] = { depart: false, arrive: false, commentaires: "" };
  });
  return result;
}
